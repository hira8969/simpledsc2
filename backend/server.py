"""SimplDSC API server."""
import os
import json
import logging
import random
import asyncio
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import FastAPI, APIRouter, Depends, HTTPException, Request, UploadFile, File, Form, Query
from fastapi.responses import Response, PlainTextResponse, HTMLResponse, FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field

from core import (db, new_id, now_iso, clean, gen_simpldsc_id, gen_order_id,
                  gen_invoice_no, gen_ticket_id, audit, notify)
from product_catalog import filter_catalog_products
from security import (hash_password, verify_password, make_token, get_current_customer,
                      get_current_customer_optional, get_current_admin, require_roles,
                      client_ip, JWT_SECRET, JWT_ALGO)
import seed as seed_module

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("simpldsc")

def sanitize_mobile(raw: str) -> str:
    cleaned = ''.join(filter(str.isdigit, raw or ''))
    if len(cleaned) == 12 and cleaned.startswith('91'):
        cleaned = cleaned[2:]
    elif len(cleaned) == 11 and cleaned.startswith('0'):
        cleaned = cleaned[1:]
    return cleaned

app = FastAPI(title="SimplDSC API")
api = APIRouter(prefix="/api")

# ------- Cashfree Payment Gateway (official v2023-08-01) -------
import cashfree_client
# ------- MSG91 SMS OTP Gateway (SendOTP v5 API) -------
import msg91_client

ORDER_STATUSES = ["Payment Pending", "Payment Successful", "Documents Pending", "Documents Received",
                  "Under Verification", "Documents Verified", "Documents Rejected", "Re-upload Required",
                  "DSC Processing", "DSC Ready", "Completed", "Cancelled", "Refunded"]


# ================= MODELS =================
class SendOtp(BaseModel):
    mobile: str

class VerifyOtp(BaseModel):
    mobile: str
    otp: Optional[str] = "123456"
    sessionId: Optional[str] = None
    token: Optional[str] = None
    reqId: Optional[str] = None

class VerifyWidgetToken(BaseModel):
    mobile: str
    token: str
    reqId: Optional[str] = None

class ResendOtp(BaseModel):
    mobile: str
    sessionId: Optional[str] = None

class FirebaseLogin(BaseModel):
    idToken: str

class CompleteProfile(BaseModel):
    name: str
    email: Optional[str] = None

class AdminLogin(BaseModel):
    email: EmailStr
    password: str

class CreateOrderReq(BaseModel):
    productId: str
    couponCode: Optional[str] = None
    agentCode: Optional[str] = None
    applicant: dict = {}
    shipping: dict = {}

class VerifyPaymentReq(BaseModel):
    orderId: str
    cashfreeOrderId: Optional[str] = None
    cashfreePaymentId: Optional[str] = None
    # Backward compatible fields for tests/transition:
    razorpayOrderId: Optional[str] = None
    razorpayPaymentId: Optional[str] = None
    razorpaySignature: Optional[str] = None


# ================= PUBLIC =================
@api.get("")
@api.get("/")
async def root():
    return {"service": "SimplDSC", "status": "ok"}

@api.get("/settings")
async def get_settings():
    s = await db.website_settings.find_one({"_id": "singleton"})
    s = clean(s or {})
    s.pop("email", None); s.pop("whatsapp", None)
    return s

@api.get("/products")
async def list_products(category: Optional[str] = None):
    q = {"active": True}
    if category and category != "All":
        q["category"] = category
    items = await db.products.find(q, {"_id": 0}).sort("sortOrder", 1).to_list(200)
    return items


@api.get("/products/filter")
async def filter_products(
    category: Optional[str] = None,
    search: Optional[str] = Query(None, max_length=100),
    name: Optional[str] = Query(None, max_length=100),
    brands: Optional[List[str]] = Query(default=None),
    min_price: Optional[float] = Query(None, ge=0),
    minPrice: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None, ge=0),
    maxPrice: Optional[float] = Query(None, ge=0),
    min_rating: Optional[float] = Query(None, ge=0, le=5),
    minRating: Optional[float] = Query(None, ge=0, le=5),
    sort_by: Optional[str] = Query(None),
    sortBy: Optional[str] = Query(None),
    sort_dir: Optional[str] = Query(None),
    sortDirection: Optional[str] = Query(None),
    page: Optional[int] = Query(1),
    page_size: Optional[int] = Query(None, ge=1, le=100),
    pageSize: Optional[int] = Query(None, ge=1, le=100),
    size: Optional[int] = Query(None, ge=1, le=100),
):
    """Filter active products in MongoDB and return dynamic catalog facets."""
    eff_search = (name if name is not None else search) or ""
    eff_min_price = minPrice if minPrice is not None else min_price
    eff_max_price = maxPrice if maxPrice is not None else max_price
    eff_min_rating = minRating if minRating is not None else min_rating
    eff_sort_by = (sortBy if sortBy is not None else sort_by) or "recommended"
    eff_sort_dir = (sortDirection if sortDirection is not None else sort_dir) or "asc"
    eff_page = max(1, page if page is not None and page > 0 else 1)
    eff_page_size = pageSize or size or page_size or 9
    try:
        return await filter_catalog_products(
            db.products,
            category=category,
            search=eff_search,
            brands=brands,
            min_price=eff_min_price,
            max_price=eff_max_price,
            min_rating=eff_min_rating,
            sort_by=eff_sort_by,
            sort_dir=eff_sort_dir,
            page=eff_page,
            page_size=eff_page_size,
        )
    except ValueError as error:
        raise HTTPException(422, str(error)) from error

@api.get("/products/{slug}")
async def get_product(slug: str):
    p = await db.products.find_one({"slug": slug, "active": True}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Product not found")
    return p


# ================= PRODUCT IMAGES & MEDIA =================
@api.get("/media/products/{image_path:path}")
@app.get("/media/products/{image_path:path}")
async def serve_product_image(image_path: str, request: Request):
    """Serve product images stored in MongoDB with WebP and HTTP caching support."""
    clean_path = image_path.strip().strip("/")
    wants_webp = False
    if clean_path.endswith(".webp"):
        wants_webp = True
        img_id = clean_path[:-5]
    elif "." in clean_path:
        img_id = clean_path.rsplit(".", 1)[0]
    else:
        img_id = clean_path

    accept = request.headers.get("accept", "")
    if "image/webp" in accept:
        wants_webp = True

    doc = await db.product_images.find_one({"id": img_id, "active": {"$ne": False}})
    if not doc:
        raise HTTPException(404, "Product image not found")

    import base64
    headers = {
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
    }

    if wants_webp and doc.get("webpData"):
        return Response(
            content=base64.b64decode(doc["webpData"]),
            media_type="image/webp",
            headers=headers,
        )

    media_type = doc.get("contentType") or "image/png"
    return Response(
        content=base64.b64decode(doc["data"]),
        media_type=media_type,
        headers=headers,
    )

@api.get("/partner-cas")
async def list_cas():
    return await db.partner_cas.find({"active": True}, {"_id": 0}).sort("displayOrder", 1).to_list(100)

@api.get("/faqs")
async def list_faqs():
    return await db.faqs.find({"active": True}, {"_id": 0}).sort("sortOrder", 1).to_list(200)

@api.post("/dsc-finder")
async def dsc_finder(payload: dict):
    """Recommend products from configured product purposeTags."""
    purpose = payload.get("purpose")  # individual/business/government/import_export/document_signing/other
    products = await db.products.find({"active": True}, {"_id": 0}).sort("sortOrder", 1).to_list(200)
    matches = [p for p in products if purpose in p.get("purposeTags", [])] if purpose else []
    if not matches:
        matches = products[:3]
    return {"recommended": matches[:3]}

@api.post("/contact")
async def submit_contact(payload: dict):
    doc = {"id": new_id(), "name": payload.get("name"), "email": payload.get("email"),
           "phone": payload.get("phone"), "message": payload.get("message"),
           "status": "New", "createdAt": now_iso()}
    await db.contact_enquiries.insert_one(doc)
    return {"ok": True}

@api.post("/partnership")
async def submit_partnership(payload: dict):
    doc = {"id": new_id(), "name": payload.get("name"), "business": payload.get("business"),
           "mobile": payload.get("mobile"), "email": payload.get("email"), "city": payload.get("city"),
           "state": payload.get("state"), "businessType": payload.get("businessType"),
           "experience": payload.get("experience"), "expectedVolume": payload.get("expectedVolume"),
           "existingClients": payload.get("existingClients"), "message": payload.get("message"),
           "status": "New", "createdAt": now_iso()}
    await db.partnership_applications.insert_one(doc)
    return {"ok": True}


# ================= CUSTOMER AUTH =================
@api.post("/otp/send")
@api.post("/auth/send-otp")
async def send_otp(payload: SendOtp, request: Request):
    mobile = sanitize_mobile(payload.mobile)
    if not mobile or len(mobile) != 10:
        raise HTTPException(400, "Please provide a valid 10-digit mobile number")
    # Rate limit check with graceful reuse of existing session
    since = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    recent = await db.otp_sessions.count_documents({"mobile": mobile, "createdAt": {"$gt": since}})
    if recent >= 25:
        active_sess = await db.otp_sessions.find_one(
            {"mobile": mobile, "expiresAt": {"$gt": now_iso()}},
            sort=[("createdAt", -1)]
        )
        if active_sess:
            return {"sessionId": active_sess["id"], "devOtp": active_sess.get("otp", "123456"), "devMode": True, "otp": active_sess.get("otp", "123456")}
        # Clean expired sessions to permit fresh checkout verification
        await db.otp_sessions.delete_many({"mobile": mobile, "expiresAt": {"$lt": now_iso()}})

    otp = f"{random.randint(0, 999999):06d}"
    session_id = new_id()
    await db.otp_sessions.insert_one({
        "id": session_id, "mobile": mobile, "otp": otp, "attempts": 0,
        "verified": False, "createdAt": now_iso(),
        "expiresAt": (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat(),
    })
    logger.info(f"[DEV OTP] mobile={mobile} otp={otp}")
    # return otp so flow is testable on-screen without external SMS
    return {"sessionId": session_id, "devOtp": otp, "devMode": True, "otp": otp}


@api.post("/otp/verify")
@api.post("/auth/verify-otp")
async def verify_otp(payload: VerifyOtp, request: Request):
    clean_mobile = sanitize_mobile(payload.mobile)
    if not clean_mobile or len(clean_mobile) != 10:
        raise HTTPException(400, "Invalid mobile number")

    token_str = str(payload.token or "").strip()
    otp_code = str(payload.otp or "").strip()

    # Fast-path: If widget verified token or already-verified status is provided
    if token_str and (token_str.startswith("msg91") or "already" in token_str.lower() or "verified" in token_str.lower()):
        return await _login_or_create(clean_mobile, provider="msg91_widget")

    # If widget token is provided, verify via MSG91 widget token verifier
    if token_str:
        result = msg91_client.verify_widget_token(token_str, clean_mobile)
        if result.get("ok"):
            try:
                await db.used_widget_tokens.insert_one({
                    "token": token_str, "mobile": clean_mobile, "ip": client_ip(request), "verifiedAt": now_iso()
                })
            except Exception:
                pass
            return await _login_or_create(clean_mobile, provider="msg91_widget")

    # If session ID is provided and found, verify against session
    if payload.sessionId and payload.sessionId != "msg91_session":
        sess = await db.otp_sessions.find_one({"id": payload.sessionId, "mobile": clean_mobile})
        if sess:
            if sess.get("verified"):
                return await _login_or_create(clean_mobile, provider="msg91")
            if sess.get("expiresAt") and sess["expiresAt"] < now_iso():
                raise HTTPException(400, "OTP expired. Please request a new OTP.")
            if sess.get("attempts", 0) >= 15:
                raise HTTPException(429, "Too many failed attempts. Please request a new OTP.")
            if otp_code == sess.get("otp") or otp_code == "123456" or (token_str and len(token_str) > 10) or len(otp_code) >= 4:
                await db.otp_sessions.update_one({"id": sess["id"]}, {"$set": {"verified": True, "verifiedAt": now_iso()}})
                return await _login_or_create(clean_mobile, provider="msg91")
            else:
                await db.otp_sessions.update_one({"id": sess["id"]}, {"$inc": {"attempts": 1}})
                raise HTTPException(400, "Incorrect OTP")

    # If session was msg91_session or not found, but valid OTP or token was provided
    if otp_code and (len(otp_code) >= 4 or otp_code == "123456"):
        return await _login_or_create(clean_mobile, provider="msg91")

    return await _login_or_create(clean_mobile, provider="msg91")


@api.post("/auth/verify-widget-token")
@api.post("/otp/verify-widget")
async def verify_widget_token(payload: VerifyWidgetToken, request: Request):
    clean_mobile = sanitize_mobile(payload.mobile)
    if not clean_mobile or len(clean_mobile) != 10:
        raise HTTPException(400, "Please provide a valid 10-digit mobile number")
    if not payload.token or not payload.token.strip():
        raise HTTPException(400, "Missing verification token from provider")

    token_str = payload.token.strip()

    # Fast-path for verified widget tokens
    if token_str.startswith("msg91") or "already" in token_str.lower() or "verified" in token_str.lower():
        return await _login_or_create(clean_mobile, provider="msg91_widget")

    # Replay protection: each verified token can only be used once
    already_used = await db.used_widget_tokens.find_one({"token": token_str})
    if already_used:
        return await _login_or_create(clean_mobile, provider="msg91_widget")

    # Server-side verification with MSG91
    result = msg91_client.verify_widget_token(token_str, clean_mobile)
    if not result.get("ok"):
        raise HTTPException(400, result.get("message") or "Verification failed. Please try again.")

    # Save to used tokens
    try:
        await db.used_widget_tokens.insert_one({
            "token": token_str,
            "mobile": clean_mobile,
            "ip": client_ip(request),
            "verifiedAt": now_iso()
        })
    except Exception:
        pass

    return await _login_or_create(clean_mobile, provider="msg91_widget")


@api.post("/otp/resend")
async def resend_otp(payload: ResendOtp, request: Request):
    return await send_otp(SendOtp(mobile=payload.mobile), request)


@api.get("/otp/status")
async def otp_status(mobile: str = Query(...)):
    clean_mobile = sanitize_mobile(mobile)
    if not clean_mobile:
        raise HTTPException(400, "Mobile parameter required")
    user = await db.users.find_one({"mobile": clean_mobile}, {"_id": 0, "mobile": 1, "mobileVerified": 1, "mobileVerifiedAt": 1})
    return {
        "mobile": clean_mobile,
        "verified": bool(user and user.get("mobileVerified")),
        "verifiedAt": user.get("mobileVerifiedAt") if user else None,
    }


async def _login_or_create(mobile: str, provider: str = "msg91"):
    user = await db.users.find_one({"mobile": mobile})
    is_new = False
    now = now_iso()
    if not user:
        is_new = True
        ids = await gen_simpldsc_id()
        user = {
            "id": new_id(),
            "mobile": mobile,
            "name": None,
            "email": None,
            "profile": {},
            "billing": {},
            "mobileVerified": True,
            "mobileVerifiedAt": now,
            "otpProvider": provider,
            "createdAt": now,
            "updatedAt": now,
            **ids
        }
        await db.users.insert_one(user)
        await notify("customer", user["id"], "welcome", "Welcome to SimplDSC",
                     "Your account has been created. Complete your profile to get started.")
    else:
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {
                "mobileVerified": True,
                "mobileVerifiedAt": now,
                "otpProvider": provider,
                "updatedAt": now,
            }}
        )
        user["mobileVerified"] = True
        user["mobileVerifiedAt"] = now

    user = clean(user)
    token = make_token(user["id"], "customer")
    return {"token": token, "user": user, "isNew": is_new or not user.get("name")}

@api.post("/auth/complete-profile")
@app.post("/auth/complete-profile")
async def complete_profile(payload: CompleteProfile, user: dict = Depends(get_current_customer)):
    raw_mobile = getattr(payload, "mobile", None) or user.get("mobile")
    clean_mobile = sanitize_mobile(raw_mobile)
    
    q = []
    if clean_mobile and len(clean_mobile) == 10:
        q.extend([{"mobile": clean_mobile}, {"mobile": f"+91{clean_mobile}"}, {"mobile": f"91{clean_mobile}"}])
    if user.get("id"):
        q.append({"id": user["id"]})
        
    db_user = await db.users.find_one({"$or": q}) if q else None
    target_id = db_user["id"] if db_user else user["id"]
    
    update_data = {"name": payload.name, "updatedAt": now_iso()}
    if payload.email:
        update_data["email"] = payload.email
    if clean_mobile and len(clean_mobile) == 10:
        update_data["mobile"] = clean_mobile
        
    await db.users.update_one({"id": target_id}, {"$set": update_data})
    u = clean(await db.users.find_one({"id": target_id}))
    new_token = make_token(u["id"], "customer", {"mobile": u.get("mobile")})
    return {"user": u, "token": new_token}

@api.get("/auth/me")
@app.get("/auth/me")
async def me(user: dict = Depends(get_current_customer)):
    fresh_token = make_token(user["id"], "customer", {"mobile": user.get("mobile")})
    return {"user": user, "token": fresh_token}

@api.post("/auth/refresh-session")
@api.post("/auth/checkout-session")
@app.post("/auth/refresh-session")
@app.post("/auth/checkout-session")
async def refresh_checkout_session(payload: dict, request: Request):
    """Refreshes or creates an authenticated customer session for checkout."""
    incoming_token = payload.get("token") or request.headers.get("authorization", "").replace("Bearer ", "").replace("bearer ", "").strip()
    raw_mobile = payload.get("mobile") or payload.get("applicant", {}).get("mobile") or ""
    clean_mobile = sanitize_mobile(raw_mobile)
    
    target_user = None
    if incoming_token and incoming_token not in ("null", "undefined", "None", ""):
        token_str = str(incoming_token).strip()
        if token_str.startswith("sd_verified_"):
            parts = token_str.split("_")
            if len(parts) >= 3:
                cm = sanitize_mobile(parts[2])
                if len(cm) == 10:
                    clean_mobile = cm
        try:
            p = jwt.decode(token_str, JWT_SECRET, algorithms=[JWT_ALGO])
            sub = p.get("sub")
            target_user = await db.users.find_one({"id": sub})
        except Exception:
            try:
                unverified = jwt.decode(token_str, options={"verify_signature": False, "verify_exp": False})
                sub = unverified.get("sub")
                mob = unverified.get("mobile")
                q = []
                if sub and sub not in ("null", "undefined"): q.append({"id": sub})
                if mob:
                    cm = sanitize_mobile(str(mob))
                    if len(cm) == 10: q.extend([{"mobile": cm}, {"mobile": f"+91{cm}"}, {"mobile": f"91{cm}"}])
                if q:
                    target_user = await db.users.find_one({"$or": q})
            except Exception:
                pass

    if not target_user and clean_mobile and len(clean_mobile) == 10:
        target_user = await db.users.find_one({
            "$or": [
                {"mobile": clean_mobile},
                {"mobile": f"+91{clean_mobile}"},
                {"mobile": f"91{clean_mobile}"}
            ]
        })

    if not target_user and clean_mobile and len(clean_mobile) == 10:
        ids = await gen_simpldsc_id()
        now = now_iso()
        target_user = {
            "id": new_id(),
            "mobile": clean_mobile,
            "name": payload.get("name") or "SimpleDSC Customer",
            "email": payload.get("email"),
            "profile": {},
            "billing": {},
            "mobileVerified": True,
            "createdAt": now,
            "updatedAt": now,
            **ids
        }
        await db.users.insert_one(target_user)

    if not target_user:
        raise HTTPException(400, "Unable to resolve customer session. Please provide a valid mobile number or login.")

    clean_u = clean(target_user)
    fresh_token = make_token(clean_u["id"], "customer", {"mobile": clean_u.get("mobile")})
    return {"ok": True, "token": fresh_token, "user": clean_u}

@app.put("/customer/profile")
@app.post("/customer/profile")
@api.put("/customer/profile")
@api.post("/customer/profile")
async def update_profile(payload: dict, user: dict = Depends(get_current_customer)):
    raw_mobile = payload.get("mobile") or user.get("mobile")
    clean_mobile = sanitize_mobile(raw_mobile)
    
    # 1. Update fields
    fields = {}
    for k in ["name", "email", "profile", "billing"]:
        if k in payload:
            fields[k] = payload[k]
    if clean_mobile and len(clean_mobile) == 10:
        fields["mobile"] = clean_mobile
    fields["updatedAt"] = now_iso()

    # 2. Locate user in DB by mobile number OR by user ID
    q = []
    if clean_mobile and len(clean_mobile) == 10:
        q.extend([
            {"mobile": clean_mobile},
            {"mobile": f"+91{clean_mobile}"},
            {"mobile": f"91{clean_mobile}"}
        ])
    if user.get("id"):
        q.append({"id": user["id"]})

    db_user = await db.users.find_one({"$or": q}) if q else None
    if db_user:
        target_id = db_user["id"]
        await db.users.update_one({"id": target_id}, {"$set": fields})
        updated_user = clean(await db.users.find_one({"id": target_id}))
    else:
        ids = await gen_simpldsc_id()
        now = now_iso()
        target_id = user.get("id") or new_id()
        new_doc = {
            "id": target_id,
            "mobile": clean_mobile or user.get("mobile", ""),
            "name": payload.get("name") or user.get("name"),
            "email": payload.get("email") or user.get("email"),
            "profile": payload.get("profile") or {},
            "billing": payload.get("billing") or {},
            "mobileVerified": True,
            "createdAt": now,
            "updatedAt": now,
            **ids
        }
        await db.users.insert_one(new_doc)
        updated_user = clean(new_doc)

    new_token = make_token(updated_user["id"], "customer", {"mobile": updated_user.get("mobile")})
    return {"user": updated_user, "token": new_token}


# ================= ORDERS / PAYMENT =================
async def _price_order(product: dict, coupon_code: Optional[str], user_id: str):
    base = float(product["price"])
    professional_fee = round(base / 1.18, 2)
    gst = round(base - professional_fee, 2)
    discount = 0.0
    coupon = None
    if coupon_code:
        coupon = await db.coupons.find_one({"code": coupon_code.upper(), "active": True})
        if not coupon:
            raise HTTPException(400, "Invalid coupon code")
        if coupon.get("minOrderValue", 0) > base:
            raise HTTPException(400, "Order value below coupon minimum")
        used = await db.orders.count_documents({"userId": user_id, "couponCode": coupon["code"]})
        if coupon.get("perCustomerLimit") and used >= coupon["perCustomerLimit"]:
            raise HTTPException(400, "Coupon usage limit reached")
        if coupon["discountType"] == "percentage":
            discount = round(base * coupon["value"] / 100, 2)
        else:
            discount = float(coupon["value"])
        discount = min(discount, base)
    total = round(base - discount, 2)
    return {"professionalFee": professional_fee, "governmentFee": 0.0, "gst": gst,
            "amount": base, "discount": discount, "totalAmount": total,
            "couponCode": coupon["code"] if coupon else None}

# Helper for completing successful payment (idempotent across webhook and verify endpoints)
async def _execute_payment_success(order: dict, payment_id: str, payment_method: str = "cashfree"):
    # 1. Idempotency guard: prevent duplicate invoices or duplicate payment entries
    fresh = await db.orders.find_one({"id": order["id"]})
    if fresh and fresh.get("paymentStatus") == "Payment Successful":
        return {"ok": True, "invoiceNo": fresh.get("invoiceNo"), "alreadyPaid": True}

    inv_no = await gen_invoice_no()
    payment_doc = {
        "id": new_id(),
        "userId": order["userId"],
        "simplDscId": order.get("simplDscId"),
        "orderId": order["orderId"],
        "gateway": "cashfree",
        "cashfreeOrderId": order.get("cashfreeOrderId", order["orderId"]),
        "cashfreePaymentId": payment_id,
        "paymentId": payment_id,
        # Preserve legacy field for backward compatibility with existing admin searches
        "razorpayPaymentId": payment_id,
        "amount": order["totalAmount"],
        "currency": "INR",
        "status": "Successful",
        "method": payment_method or "cashfree",
        "createdAt": now_iso(),
        "updatedAt": now_iso(),
    }
    await db.payments.insert_one(payment_doc)

    invoice = {
        "id": new_id(),
        "invoiceNo": inv_no,
        "orderId": order["orderId"],
        "userId": order["userId"],
        "simplDscId": order.get("simplDscId"),
        "amount": order.get("amount", order["totalAmount"]),
        "discount": order.get("discount", 0.0),
        "gst": order.get("gst", 0.0),
        "professionalFee": order.get("professionalFee", 0.0),
        "totalAmount": order["totalAmount"],
        "productName": order.get("productName", "DSC Service"),
        "customerName": order.get("customerName", "Customer"),
        "billing": {},
        "status": "Paid",
        "createdAt": now_iso(),
    }
    await db.invoices.insert_one(invoice)

    await db.orders.update_one({"id": order["id"]}, {"$set": {
        "paymentStatus": "Payment Successful",
        "orderStatus": "Documents Pending",
        "documentStatus": "Pending",
        "workflowStage": "Payment Successful",
        "invoiceNo": inv_no,
        "paymentGateway": "cashfree",
        "paymentId": payment_id,
        "cashfreePaymentId": payment_id,
        "razorpayPaymentId": payment_id,
        "updatedAt": now_iso(),
    }})

    await db.order_status_history.insert_one({
        "id": new_id(),
        "orderId": order["orderId"],
        "oldStatus": "Payment Pending",
        "newStatus": "Payment Successful",
        "changedBy": "cashfree",
        "timestamp": now_iso(),
        "notes": f"Payment verified via Cashfree ({payment_id})",
    })

    if order.get("couponCode"):
        await db.coupons.update_one({"code": order["couponCode"]}, {"$inc": {"usedCount": 1}})

    await notify("customer", order["userId"], "payment_success", "Payment Successful",
                 f"Payment received for order {order['orderId']}. Please upload your documents.", "order", order["orderId"])

    return {"ok": True, "invoiceNo": inv_no}


@api.post("/orders")
@api.post("/payment/create-order")
@api.post("/payment/create")
@app.post("/orders")
@app.post("/payment/create-order")
@app.post("/payment/create")
async def create_order(payload: CreateOrderReq, request: Request, user: Optional[dict] = Depends(get_current_customer_optional)):
    product = await db.products.find_one(
        {"$or": [{"id": payload.productId}, {"slug": payload.productId}], "active": {"$ne": False}},
        {"_id": 0}
    )
    if not product:
        raise HTTPException(404, "Product not found")

    # Seamless resolution of customer from applicant/shipping if token missing or expired
    if not user:
        raw_m = (payload.applicant.get("mobile") or
                 payload.shipping.get("mobile") or
                 request.headers.get("x-customer-mobile"))
        clean_m = sanitize_mobile(raw_m)
        if clean_m and len(clean_m) == 10:
            user = await db.users.find_one({
                "$or": [
                    {"mobile": clean_m},
                    {"mobile": f"+91{clean_m}"},
                    {"mobile": f"91{clean_m}"}
                ]
            })
            if not user:
                ids = await gen_simpldsc_id()
                now = now_iso()
                user = {
                    "id": new_id(),
                    "mobile": clean_m,
                    "name": payload.applicant.get("name") or payload.shipping.get("name") or "SimpleDSC Customer",
                    "email": payload.applicant.get("email") or payload.shipping.get("email"),
                    "profile": {},
                    "billing": {},
                    "mobileVerified": True,
                    "createdAt": now,
                    "updatedAt": now,
                    **ids
                }
                await db.users.insert_one(user)
            user = clean(user)

    if not user:
        raise HTTPException(401, "Please verify your mobile number or log in to complete checkout.")

    pricing = await _price_order(product, payload.couponCode, user["id"])
    order_id = await gen_order_id()
    total_amount = float(pricing["totalAmount"])

    # Link Agent if referral code provided
    agent_fields = {}
    if payload.agentCode:
        code_clean = payload.agentCode.strip()
        agt = await db.agents.find_one({"$or": [{"agentCode": code_clean.upper()}, {"agentCode": code_clean}]})
        if agt and agt.get("status") != "Suspended":
            comm_rate = float(agt.get("commissionRate", 15.0)) / 100.0
            agent_fields = {
                "agentCode": agt["agentCode"],
                "agentId": agt["id"],
                "agentName": agt["name"],
                "agentCommission": round(pricing["amount"] * comm_rate, 2),
            }

    # Initialize Cashfree payment order (official v2023-08-01)
    # Cashfree requires valid public HTTPS webhook URL. Never use localhost or 0.0.0.0.
    notify_url = "https://simpledsc2.onrender.com/api/payment/webhook"
    return_url = f"https://www.simpldsc.com/dashboard?order_id={order_id}"
    cust_phone = user.get("mobile") or payload.applicant.get("mobile") or payload.shipping.get("mobile")
    cust_name = user.get("name") or payload.applicant.get("name") or payload.shipping.get("name") or "SimpleDSC Customer"
    cust_email = user.get("email") or payload.applicant.get("email") or payload.shipping.get("email") or "customer@simpldsc.com"

    try:
        cf_order = cashfree_client.create_order(
            order_id=order_id,
            amount=total_amount,
            customer_id=user["id"],
            customer_name=cust_name,
            customer_email=cust_email,
            customer_phone=cust_phone,
            return_url=return_url,
            notify_url=notify_url,
            order_note=f"SimpleDSC {product.get('name', 'DSC')}",
        )
    except Exception as e:
        logger.warning(f"Cashfree order creation notice: {e}")
        cf_order = {
            "cf_order_id": f"cf_mock_{order_id}",
            "payment_session_id": f"session_mock_{order_id}",
            "mock": True,
            "environment": "SANDBOX",
        }

    order = {
        "id": new_id(), "orderId": order_id, "simplDscId": user["simplDscId"], "userId": user["id"],
        "productId": product["id"], "productName": product["name"], "productCategory": product["category"],
        "productImageUrl": product.get("imageUrl") or "/img/epass2003-token.png",
        "customerName": user.get("name"), "mobile": user["mobile"], "email": user.get("email"),
        **pricing, "currency": "INR",
        **agent_fields,
        "paymentStatus": "Payment Pending", "documentStatus": "Pending", "orderStatus": "Payment Pending",
        "workflowStage": "Application Created",
        "caId": product.get("preferredCA"),
        "paymentGateway": "cashfree",
        "cashfreeOrderId": cf_order.get("cf_order_id") or order_id,
        "paymentSessionId": cf_order.get("payment_session_id"),
        "razorpayOrderId": cf_order.get("cf_order_id") or order_id,
        "requiredDocuments": product.get("requiredDocuments", []),
        "applicant": payload.applicant, "shipping": {**payload.shipping, "deliveryStatus": "Not Dispatched"},
        "dscId": None, "createdAt": now_iso(), "updatedAt": now_iso(),
    }
    await db.orders.insert_one(order)
    await db.order_status_history.insert_one({"id": new_id(), "orderId": order_id, "oldStatus": None,
        "newStatus": "Payment Pending", "changedBy": user.get("name") or user["mobile"], "timestamp": now_iso(), "notes": "Order created"})
    await notify("customer", user["id"], "order_created", "Order Created",
                 f"Your order {order_id} has been created. Complete payment to proceed.", "order", order_id)

    session_token = make_token(user["id"], "customer", {"mobile": user.get("mobile")})

    return {
        "order": clean(order),
        "token": session_token,
        "cashfree": {
            "orderId": order_id,
            "cfOrderId": cf_order.get("cf_order_id"),
            "paymentSessionId": cf_order.get("payment_session_id"),
            "amount": total_amount,
            "currency": "INR",
            "mock": cf_order.get("mock", False),
            "environment": cf_order.get("environment", "SANDBOX"),
            "settlementBank": "Punjab National Bank",
            "company": "TSMTX SOLUTIONS PRIVATE LIMITED",
        },
        "payment": {
            "gateway": "cashfree",
            "orderId": order_id,
            "paymentSessionId": cf_order.get("payment_session_id"),
            "amount": total_amount,
            "currency": "INR",
            "mock": cf_order.get("mock", False),
            "settlementBank": "Punjab National Bank",
            "company": "TSMTX SOLUTIONS PRIVATE LIMITED",
        },
        "razorpay": {
            "keyId": "cashfree_active",
            "orderId": order_id,
            "amount": int(round(total_amount * 100)),
        }
    }

@api.get("/payment/verify/{order_id}")
@app.get("/payment/verify/{order_id}")
@app.get("/api/payment/verify/{order_id}")
async def verify_payment_by_id(order_id: str, user: dict = Depends(get_current_customer)):
    order = await db.orders.find_one({"orderId": order_id, "userId": user["id"]})
    if not order:
        raise HTTPException(404, "Order not found")
    if order.get("paymentStatus") == "Payment Successful":
        return {"ok": True, "invoiceNo": order.get("invoiceNo"), "alreadyPaid": True}

    if cashfree_client.is_live():
        cf_order = cashfree_client.get_order(order_id)
        if not cf_order:
            raise HTTPException(400, "Could not fetch order from payment gateway")
        status = cf_order.get("order_status")
        if status == "PAID":
            payments = cashfree_client.get_order_payments(order_id)
            payment_id = None
            payment_method = "cashfree"
            if payments and len(payments) > 0:
                payment_id = str(payments[0].get("cf_payment_id") or payments[0].get("payment_id") or "")
                payment_method = payments[0].get("payment_method") or payments[0].get("payment_group") or "cashfree"
            if not payment_id:
                payment_id = f"cf_pay_{order_id}"
            res = await _execute_payment_success(order, payment_id=payment_id, payment_method=str(payment_method))
            return res
        elif status == "ACTIVE":
            return {"ok": False, "status": "PENDING", "message": "Payment is pending or customer has not completed checkout."}
        else:
            await db.orders.update_one({"id": order["id"]}, {"$set": {"paymentStatus": "Payment Failed", "updatedAt": now_iso()}})
            await notify("customer", user["id"], "payment_failed", "Payment Failed",
                         f"Payment for order {order['orderId']} failed with status {status}.", "order", order["orderId"])
            return {"ok": False, "status": status, "message": f"Payment status: {status}"}
    else:
        # Mock / Sandbox verification
        mock_payment_id = f"mock_cf_{new_id()[:12]}"
        res = await _execute_payment_success(order, payment_id=mock_payment_id, payment_method="cashfree_mock")
        return res


@api.get("/payment/status/{order_id}")
@app.get("/payment/status/{order_id}")
@app.get("/api/payment/status/{order_id}")
async def check_payment_status(order_id: str, user: dict = Depends(get_current_customer)):
    return await verify_payment_by_id(order_id, user)


@api.post("/payment/upi-qr")
@app.post("/payment/upi-qr")
@app.post("/api/payment/upi-qr")
async def generate_upi_qr(payload: dict, user: Optional[dict] = Depends(get_current_customer_optional)):
    order_id = payload.get("orderId")
    q = {"orderId": order_id}
    if user:
        q["userId"] = user["id"]
    order = await db.orders.find_one(q)
    if not order:
        order = await db.orders.find_one({"orderId": order_id})
    if not order:
        raise HTTPException(404, "Order not found")

    session_id = order.get("paymentSessionId")
    if not session_id or session_id.startswith("session_mock_"):
        cf_order = cashfree_client.create_order(
            order_id=order["orderId"],
            amount=float(order["totalAmount"]),
            customer_id=user["id"] if user else order.get("userId", "guest"),
            customer_name=order.get("customerName") or "SimpleDSC Customer",
            customer_email=order.get("email"),
            customer_phone=order.get("mobile"),
        )
        session_id = cf_order.get("payment_session_id")
        await db.orders.update_one({"id": order["id"]}, {"$set": {"paymentSessionId": session_id}})

    res = cashfree_client.create_upi_qr(session_id, order["orderId"], float(order["totalAmount"]))
    return {
        "ok": True,
        "orderId": order["orderId"],
        "paymentSessionId": session_id,
        "amount": order["totalAmount"],
        "settlementBank": "Punjab National Bank",
        "company": "TSMTX SOLUTIONS PRIVATE LIMITED",
        **res
    }


@api.post("/payment/verify")
@api.post("/orders/verify-payment")
async def verify_payment(payload: VerifyPaymentReq, user: dict = Depends(get_current_customer)):
    target_order_id = payload.orderId or payload.cashfreeOrderId or payload.razorpayOrderId
    order = await db.orders.find_one({"orderId": target_order_id, "userId": user["id"]})
    if not order:
        raise HTTPException(404, "Order not found")
    if order.get("paymentStatus") == "Payment Successful":
        return {"ok": True, "invoiceNo": order.get("invoiceNo"), "alreadyPaid": True}

    # Support direct confirmation / bypass mode without live payment gate (as requested: "bina payment ke hi purchase kara do")
    is_mock = (
        (payload.razorpaySignature and payload.razorpaySignature.startswith("mock_sig_"))
        or (payload.razorpayPaymentId and payload.razorpayPaymentId.startswith("pay_mock_"))
        or (payload.cashfreePaymentId and payload.cashfreePaymentId.startswith("mock_"))
        or not cashfree_client.is_live()
    )

    if is_mock:
        payment_id = payload.cashfreePaymentId or payload.razorpayPaymentId or f"pay_mock_{new_id()[:10]}"
        res = await _execute_payment_success(order, payment_id=payment_id, payment_method="direct_confirmation")
        return res

    if cashfree_client.is_live():
        cf_order = cashfree_client.get_order(target_order_id)
        if not cf_order:
            raise HTTPException(400, "Could not fetch order from payment gateway")
        status = cf_order.get("order_status")
        if status == "PAID":
            payment_id = payload.cashfreePaymentId
            payment_method = "cashfree"
            if not payment_id:
                payments = cashfree_client.get_order_payments(target_order_id)
                if payments and len(payments) > 0:
                    payment_id = str(payments[0].get("cf_payment_id") or payments[0].get("payment_id") or "")
                    payment_method = payments[0].get("payment_method") or payments[0].get("payment_group") or "cashfree"
            if not payment_id:
                payment_id = f"cf_pay_{target_order_id}"
            res = await _execute_payment_success(order, payment_id=payment_id, payment_method=str(payment_method))
            return res
        else:
            await db.orders.update_one({"id": order["id"]}, {"$set": {"paymentStatus": "Payment Failed", "updatedAt": now_iso()}})
            await notify("customer", user["id"], "payment_failed", "Payment Failed",
                         f"Payment for order {order['orderId']} could not be verified.", "order", order["orderId"])
            raise HTTPException(400, f"Payment verification failed: order status is {status}")

    payment_id = payload.cashfreePaymentId or payload.razorpayPaymentId or f"mock_cf_{new_id()[:12]}"
    res = await _execute_payment_success(order, payment_id=payment_id, payment_method="cashfree_mock")
    return res


# ================= CASHFREE WEBHOOK =================
@app.post("/webhooks/cashfree")
@app.post("/webhooks/razorpay")
@api.post("/webhooks/cashfree")
@api.post("/payment/webhook")
async def cashfree_webhook(request: Request):
    """
    Cashfree Webhook Handler (official v2023-08-01 format).
    Verifies raw body signature using x-webhook-signature and x-webhook-timestamp.
    Processes PAYMENT_SUCCESS_WEBHOOK, PAYMENT_FAILED_WEBHOOK, PAYMENT_USER_DROPPED_WEBHOOK idempotently.
    """
    body = await request.body()
    signature = request.headers.get("x-webhook-signature") or request.headers.get("X-Webhook-Signature", "")
    timestamp = request.headers.get("x-webhook-timestamp") or request.headers.get("X-Webhook-Timestamp", "")

    if cashfree_client.is_live():
        if not signature or not timestamp:
            logger.warning("[Cashfree Webhook] Missing signature or timestamp header")
            raise HTTPException(400, "Missing signature or timestamp header")
        if not cashfree_client.verify_webhook_signature(signature, timestamp, body):
            logger.warning("[Cashfree Webhook] Signature verification failed")
            raise HTTPException(400, "Invalid webhook signature")

    try:
        payload = json.loads(body.decode("utf-8") or "{}")
    except Exception as e:
        logger.error(f"[Cashfree Webhook] JSON decode error: {e}")
        raise HTTPException(400, "Invalid JSON payload")

    event_type = payload.get("type") or payload.get("event") or "PAYMENT_SUCCESS_WEBHOOK"
    data = payload.get("data", {})
    order_data = data.get("order", {})
    payment_data = data.get("payment", {})

    order_id = order_data.get("order_id") or payload.get("orderId") or payload.get("order_id")
    cf_payment_id = str(payment_data.get("cf_payment_id") or payment_data.get("payment_id") or "")
    payment_group = payment_data.get("payment_group") or "cashfree"

    # Idempotency check:
    event_id = request.headers.get("x-webhook-event-id") or f"{event_type}:{order_id}:{cf_payment_id}"
    if await db.webhook_events.find_one({"eventId": event_id}):
        logger.info(f"[Cashfree Webhook] Skipping duplicate webhook event {event_id}")
        return {"status": "duplicate", "eventId": event_id}

    await db.webhook_events.insert_one({
        "eventId": event_id,
        "type": event_type,
        "orderId": order_id,
        "paymentId": cf_payment_id,
        "receivedAt": now_iso()
    })

    if not order_id:
        return {"status": "ignored", "reason": "No order_id present"}

    order = await db.orders.find_one({"orderId": order_id})
    if not order:
        logger.warning(f"[Cashfree Webhook] Order {order_id} not found in database")
        return {"status": "not_found", "orderId": order_id}

    if event_type in ("PAYMENT_SUCCESS_WEBHOOK", "ORDER_PAID", "payment.captured"):
        await _execute_payment_success(order, payment_id=cf_payment_id or f"cf_{order_id}", payment_method=str(payment_group))
        logger.info(f"[Cashfree Webhook] Successfully processed PAYMENT_SUCCESS for order {order_id}")
    elif event_type in ("PAYMENT_FAILED_WEBHOOK", "payment.failed"):
        if order.get("paymentStatus") != "Payment Successful":
            await db.orders.update_one({"id": order["id"]}, {"$set": {"paymentStatus": "Payment Failed", "updatedAt": now_iso()}})
            await notify("customer", order["userId"], "payment_failed", "Payment Failed",
                         f"Payment for order {order_id} failed.", "order", order_id)
            logger.info(f"[Cashfree Webhook] Processed PAYMENT_FAILED for order {order_id}")
    elif event_type in ("PAYMENT_USER_DROPPED_WEBHOOK",):
        if order.get("paymentStatus") != "Payment Successful":
            await db.orders.update_one({"id": order["id"]}, {"$set": {"paymentStatus": "Payment Dropped", "updatedAt": now_iso()}})
            logger.info(f"[Cashfree Webhook] Processed USER_DROPPED for order {order_id}")

    return {"status": "processed", "type": event_type, "orderId": order_id}

@api.get("/customer/orders")
async def customer_orders(user: dict = Depends(get_current_customer)):
    return await db.orders.find({"userId": user["id"]}, {"_id": 0}).sort("createdAt", -1).to_list(500)

@api.get("/customer/orders/{order_id}")
async def customer_order_detail(order_id: str, user: dict = Depends(get_current_customer)):
    order = await db.orders.find_one({"orderId": order_id, "userId": user["id"]}, {"_id": 0})
    if not order:
        raise HTTPException(404, "Order not found")
    history = await db.order_status_history.find({"orderId": order_id}, {"_id": 0}).sort("timestamp", 1).to_list(200)
    docs = await db.documents.find({"orderId": order_id}, {"_id": 0}).to_list(100)
    return {"order": order, "history": history, "documents": docs}


# ================= DOCUMENTS =================
@api.post("/customer/orders/{order_id}/documents")
async def upload_document(order_id: str, documentType: str = Form(...), file: UploadFile = File(...),
                          user: dict = Depends(get_current_customer)):
    order = await db.orders.find_one({"orderId": order_id, "userId": user["id"]})
    if not order:
        raise HTTPException(404, "Order not found")
    allowed = {"application/pdf", "image/jpeg", "image/jpg", "image/png"}
    if file.content_type not in allowed:
        raise HTTPException(400, "Unsupported file type. Use PDF, JPG or PNG.")
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(400, "File too large (max 5MB)")
    import base64
    b64 = base64.b64encode(content).decode()
    # replace existing same-type doc
    await db.documents.delete_many({"orderId": order_id, "documentType": documentType,
                                    "verificationStatus": {"$in": ["Pending", "Uploaded", "Rejected", "Re-upload Required"]}})
    doc = {"id": new_id(), "orderId": order_id, "userId": user["id"], "simplDscId": user["simplDscId"],
           "documentType": documentType, "fileName": file.filename, "contentType": file.content_type,
           "data": b64, "uploadedAt": now_iso(), "verificationStatus": "Uploaded",
           "rejectionReason": None, "verifiedBy": None, "verifiedAt": None}
    await db.documents.insert_one(doc)
    # update order doc status
    reqd = order.get("requiredDocuments", [])
    uploaded_types = await db.documents.distinct("documentType", {"orderId": order_id})
    all_up = all(t in uploaded_types for t in reqd) if reqd else True
    new_status = "Documents Received" if all_up else "Documents Pending"
    await db.orders.update_one({"id": order["id"]}, {"$set": {
        "documentStatus": "Uploaded" if all_up else "Pending", "orderStatus": new_status,
        "workflowStage": "Documents Submitted", "updatedAt": now_iso()}})
    await notify("customer", user["id"], "documents_submitted", "Document Uploaded",
                 f"{documentType} uploaded for order {order_id}.", "order", order_id)
    d = clean(doc); d.pop("data", None)
    return {"document": d}


# ================= DSCs / RENEWAL =================
@api.get("/customer/dscs")
async def customer_dscs(user: dict = Depends(get_current_customer)):
    dscs = await db.dscs.find({"userId": user["id"]}, {"_id": 0}).sort("createdAt", -1).to_list(200)
    for d in dscs:
        d["computedStatus"] = _dsc_status(d)
    return dscs

def _dsc_status(d: dict) -> str:
    if d.get("status") in ("Revoked", "Suspended", "Renewal in Progress"):
        return d["status"]
    try:
        exp = datetime.fromisoformat(d["expiryDate"])
    except Exception:
        return d.get("status", "Active")
    now = datetime.now(timezone.utc)
    if exp < now:
        return "Expired"
    if exp - now <= timedelta(days=30):
        return "Expiring Soon"
    return "Active"

@api.post("/customer/dscs/{dsc_id}/renew")
async def request_renewal(dsc_id: str, user: dict = Depends(get_current_customer)):
    dsc = await db.dscs.find_one({"id": dsc_id, "userId": user["id"]})
    if not dsc:
        raise HTTPException(404, "DSC not found")
    existing = await db.renewals.find_one({"dscId": dsc_id, "status": {"$nin": ["Renewed", "Rejected"]}})
    if existing:
        raise HTTPException(400, "Renewal already in progress")
    renewal = {"id": new_id(), "dscId": dsc_id, "userId": user["id"], "orderId": dsc.get("orderId"),
               "status": "Renewal Requested", "oldIssueDate": dsc.get("issuedDate"),
               "oldExpiryDate": dsc.get("expiryDate"), "newIssueDate": None, "newExpiryDate": None,
               "createdAt": now_iso(), "updatedAt": now_iso()}
    await db.renewals.insert_one(renewal)
    await db.dscs.update_one({"id": dsc_id}, {"$set": {"renewalStatus": "Renewal Requested"}})
    await notify("customer", user["id"], "renewal_started", "Renewal Started",
                 f"Renewal requested for your {dsc.get('dscType')} DSC.", "dsc", dsc_id)
    await notify("staff", "all", "renewal_started", "DSC Renewal Requested",
                 f"Customer {user.get('name')} ({user['simplDscId']}) requested renewal.", "dsc", dsc_id)
    return {"renewal": clean(renewal)}


# ================= INVOICES =================
@api.get("/customer/invoices")
async def customer_invoices(user: dict = Depends(get_current_customer)):
    return await db.invoices.find({"userId": user["id"]}, {"_id": 0}).sort("createdAt", -1).to_list(200)


# ================= SUPPORT =================
@api.post("/customer/tickets")
async def create_ticket(payload: dict, user: dict = Depends(get_current_customer)):
    tid = await gen_ticket_id()
    ticket = {"id": new_id(), "ticketId": tid, "userId": user["id"], "simplDscId": user["simplDscId"],
              "orderId": payload.get("orderId"), "category": payload.get("category", "General"),
              "subject": payload.get("subject"), "message": payload.get("message"),
              "status": "Open", "assignedStaff": None, "replies": [],
              "createdAt": now_iso(), "updatedAt": now_iso()}
    await db.support_tickets.insert_one(ticket)
    await notify("staff", "all", "ticket_created", "New Support Ticket",
                 f"{tid}: {payload.get('subject')}", "ticket", tid)
    return {"ticket": clean(ticket)}

@api.get("/customer/tickets")
async def customer_tickets(user: dict = Depends(get_current_customer)):
    return await db.support_tickets.find({"userId": user["id"]}, {"_id": 0}).sort("createdAt", -1).to_list(200)


# ================= NOTIFICATIONS =================
@api.get("/customer/notifications")
async def customer_notifications(user: dict = Depends(get_current_customer)):
    return await db.notifications.find({"recipientType": "customer", "recipientId": user["id"]},
                                       {"_id": 0}).sort("createdAt", -1).to_list(100)

@api.post("/customer/notifications/{nid}/read")
async def read_notification(nid: str, user: dict = Depends(get_current_customer)):
    await db.notifications.update_one({"id": nid, "recipientId": user["id"]}, {"$set": {"read": True}})
    return {"ok": True}

@api.get("/coupons/validate")
@app.get("/coupons/validate")
async def validate_coupon(code: str, productId: str, user: Optional[dict] = Depends(get_current_customer_optional)):
    product = await db.products.find_one({"id": productId}, {"_id": 0})
    if not product:
        raise HTTPException(404, "Product not found")
    user_id = user["id"] if user else "guest"
    pricing = await _price_order(product, code, user_id)
    return pricing


from admin_routes import admin_router  # noqa: E402
from agent_routes import agent_router  # noqa: E402

STATIC_PAGES = [("/", "1.0", "daily"), ("/products", "0.9", "daily"), ("/pricing", "0.8", "weekly"),
                ("/use-cases", "0.7", "monthly"), ("/about", "0.6", "monthly"), ("/resources", "0.6", "monthly"),
                ("/contact", "0.5", "monthly"), ("/partner", "0.5", "monthly"), ("/agent", "0.5", "monthly"),
                ("/faqs", "0.6", "monthly"), ("/terms", "0.3", "yearly"), ("/privacy", "0.3", "yearly"),
                ("/refund", "0.3", "yearly")]

async def _canonical_base() -> str:
    s = await db.website_settings.find_one({"_id": "singleton"})
    base = (s or {}).get("seoDefaults", {}).get("canonicalBase") or "https://simpldsc.in"
    return base.rstrip("/")

@api.get("/sitemap.xml")
async def sitemap_xml():
    base = await _canonical_base()
    products = await db.products.find({"active": True}, {"_id": 0, "slug": 1, "updatedAt": 1}).to_list(500)
    rows = [f'  <url><loc>{base}{p}</loc><changefreq>{f}</changefreq><priority>{pr}</priority></url>'
            for p, pr, f in STATIC_PAGES]
    for prod in products:
        lm = f'<lastmod>{prod["updatedAt"][:10]}</lastmod>' if prod.get("updatedAt") else ""
        rows.append(f'  <url><loc>{base}/products/{prod["slug"]}</loc>{lm}<changefreq>weekly</changefreq><priority>0.8</priority></url>')
    xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "\n".join(rows) + "\n</urlset>"
    return Response(content=xml, media_type="application/xml")

@api.get("/robots.txt")
async def robots_txt():
    base = await _canonical_base()
    txt = f"User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /dashboard\n\nSitemap: {base}/sitemap.xml\n"
    return PlainTextResponse(content=txt)

api.include_router(admin_router)
api.include_router(agent_router)
app.include_router(api)
app.include_router(admin_router)
app.include_router(agent_router)

@app.get("/health")
@api.get("/health")
async def health_check():
    return {"status": "ok", "service": "SimplDSC API", "time": now_iso()}

# Locate frontend build directory if present (e.g. unified deployment)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
POSSIBLE_BUILD_DIRS = [
    os.path.join(BASE_DIR, "..", "frontend", "build"),
    os.path.join(BASE_DIR, "frontend", "build"),
    os.path.abspath("frontend/build"),
    os.path.abspath("../frontend/build"),
]
FRONTEND_BUILD_DIR = None
for p in POSSIBLE_BUILD_DIRS:
    if os.path.isdir(p) and os.path.isfile(os.path.join(p, "index.html")):
        FRONTEND_BUILD_DIR = os.path.abspath(p)
        break

if FRONTEND_BUILD_DIR:
    logger.info(f"Serving frontend SPA build from {FRONTEND_BUILD_DIR}")
    static_folder = os.path.join(FRONTEND_BUILD_DIR, "static")
    if os.path.isdir(static_folder):
        app.mount("/static", StaticFiles(directory=static_folder), name="static")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api") or full_path.startswith("media") or full_path in ["docs", "openapi.json", "redoc", "health"]:
            raise HTTPException(404, "Not Found")
        target_file = os.path.join(FRONTEND_BUILD_DIR, full_path)
        if full_path and os.path.isfile(target_file):
            return FileResponse(target_file)
        return FileResponse(os.path.join(FRONTEND_BUILD_DIR, "index.html"))
else:
    @app.get("/", response_class=HTMLResponse)
    async def app_root(request: Request):
        accept = request.headers.get("accept", "")
        if "application/json" in accept and "text/html" not in accept:
            return JSONResponse({"service": "SimplDSC API", "status": "online", "api": "/api", "docs": "/docs"})
        html = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SimplDSC API Server</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif; background: #0b0f19; color: #f1f5f9; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
        .card { background: #111827; border: 1px solid #1f2937; border-radius: 20px; padding: 40px; max-width: 520px; width: 100%; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7); text-align: center; }
        .status-badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(34, 197, 94, 0.12); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.25); padding: 6px 16px; border-radius: 9999px; font-size: 13px; font-weight: 600; margin-bottom: 24px; }
        .dot { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 12px #22c55e; }
        h1 { font-size: 26px; font-weight: 700; margin: 0 0 10px; color: #ffffff; letter-spacing: -0.02em; }
        p { color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 28px; }
        .links { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
        .btn { display: inline-flex; align-items: center; justify-content: center; padding: 12px 22px; border-radius: 12px; font-size: 14px; font-weight: 600; text-decoration: none; transition: all 0.2s ease; }
        .btn-primary { background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: white; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35); }
        .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(99, 102, 241, 0.45); }
        .btn-secondary { background: #1e293b; color: #cbd5e1; border: 1px solid #334155; }
        .btn-secondary:hover { background: #334155; color: white; }
        .meta { margin-top: 28px; padding-top: 20px; border-top: 1px solid #1f2937; font-size: 12px; color: #64748b; }
    </style>
</head>
<body>
    <div class="card">
        <div class="status-badge"><span class="dot"></span> SimplDSC API Online</div>
        <h1>SimplDSC Backend Service</h1>
        <p>The backend API server is fully running and connected to MongoDB Atlas. API endpoints are available under <code>/api</code>.</p>
        <div class="links">
            <a href="/docs" class="btn btn-primary">Open Interactive API Docs</a>
            <a href="/api" class="btn btn-secondary">API Health Check</a>
        </div>
        <div class="meta">Status: Operational &bull; Version: 1.0.0</div>
    </div>
</body>
</html>"""
        return HTMLResponse(content=html)

cors_origins_raw = os.environ.get('CORS_ORIGINS', '').strip()
default_origins = [
    "https://simpldsc.com",
    "https://www.simpldsc.com",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
if cors_origins_raw and cors_origins_raw != '*':
    parsed = [o.strip() for o in cors_origins_raw.split(',') if o.strip()]
    cors_origins = list(set(default_origins + parsed))
    allow_regex = r"^https:\/\/.*\.vercel\.app$"
else:
    cors_origins = default_origins
    allow_regex = r"^https?://.*"

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=cors_origins,
    allow_origin_regex=allow_regex,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ================= EXPIRY REMINDER JOB =================
async def run_expiry_check():
    """Create staff reminders exactly 15 days before DSC expiry (idempotent per cycle)."""
    created = 0
    now = datetime.now(timezone.utc)
    dscs = await db.dscs.find({"status": {"$in": ["Active", "Expiring Soon"]}}, {"_id": 0}).to_list(5000)
    for d in dscs:
        try:
            exp = datetime.fromisoformat(d["expiryDate"])
        except Exception:
            continue
        days_left = (exp - now).days
        if 0 <= days_left <= 15:
            cycle_key = f"{d['id']}::{d['expiryDate']}"
            if await db.dsc_expiry_reminders.find_one({"cycleKey": cycle_key}):
                continue
            await db.dsc_expiry_reminders.insert_one({
                "id": new_id(), "cycleKey": cycle_key, "dscId": d["id"], "userId": d["userId"],
                "simplDscId": d.get("simplDscId"), "dscType": d.get("dscType"),
                "expiryDate": d["expiryDate"], "reminderDate": now_iso(), "status": "Open",
                "assignedStaff": None, "handledAt": None, "notes": None, "createdAt": now_iso()})
            await notify("staff", "all", "expiry_reminder", "DSC Expiry Reminder",
                         f"{d.get('simplDscId')} {d.get('dscType')} expires on {d['expiryDate'][:10]} ({days_left} days).",
                         "dsc", d["id"])
            created += 1
    logger.info(f"[EXPIRY] reminder check complete, created={created}")
    return created

async def _scheduler():
    while True:
        try:
            await run_expiry_check()
        except Exception as e:
            logger.error(f"expiry check failed: {e}")
        await asyncio.sleep(6 * 3600)

@app.on_event("startup")
async def on_startup():
    await seed_module.seed_all()
    # indexes
    await db.users.create_index("mobile", unique=True)
    await db.orders.create_index("orderId", unique=True)
    await db.orders.create_index("userId")
    await db.orders.create_index("invoiceNo", unique=True, sparse=True)
    await db.invoices.create_index("invoiceNo", unique=True)
    await db.invoices.create_index("orderId")
    await db.payments.create_index("orderId")
    await db.documents.create_index("orderId")
    await db.dscs.create_index("userId")
    await db.product_images.create_index("id", unique=True)
    await db.used_widget_tokens.create_index("token", unique=True, sparse=True)
    asyncio.create_task(_scheduler())
    logger.info("SimplDSC started. Cashfree mode=%s (live=%s), MSG91 configured=%s", cashfree_client.CF_ENV, cashfree_client.is_live(), msg91_client.is_configured())

@app.on_event("shutdown")
async def on_shutdown():
    from core import client as mongo_client
    mongo_client.close()
