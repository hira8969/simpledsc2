"""SimplDSC API server."""
import os
import hmac
import hashlib
import logging
import random
import asyncio
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import FastAPI, APIRouter, Depends, HTTPException, Request, UploadFile, File, Form
from fastapi.responses import Response, PlainTextResponse, HTMLResponse, FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field

from core import (db, new_id, now_iso, clean, gen_simpldsc_id, gen_order_id,
                  gen_invoice_no, gen_ticket_id, audit, notify)
from security import (hash_password, verify_password, make_token, get_current_customer,
                      get_current_admin, require_roles, client_ip)
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

# ------- Razorpay (mock-aware) -------
RZP_KEY = os.environ.get("RAZORPAY_KEY_ID", "")
RZP_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "")
RZP_WEBHOOK = os.environ.get("RAZORPAY_WEBHOOK_SECRET", "")
RZP_LIVE = bool(RZP_KEY and RZP_SECRET)
_rzp_client = None
if RZP_LIVE:
    import razorpay
    _rzp_client = razorpay.Client(auth=(RZP_KEY, RZP_SECRET))

ORDER_STATUSES = ["Payment Pending", "Payment Successful", "Documents Pending", "Documents Received",
                  "Under Verification", "Documents Verified", "Documents Rejected", "Re-upload Required",
                  "DSC Processing", "DSC Ready", "Completed", "Cancelled", "Refunded"]


# ================= MODELS =================
class SendOtp(BaseModel):
    mobile: str

class VerifyOtp(BaseModel):
    mobile: str
    otp: str
    sessionId: str

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
    razorpayOrderId: str
    razorpayPaymentId: str
    razorpaySignature: str


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

@api.get("/products/{slug}")
async def get_product(slug: str):
    p = await db.products.find_one({"slug": slug, "active": True}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Product not found")
    return p

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
@api.post("/auth/send-otp")
async def send_otp(payload: SendOtp, request: Request):
    mobile = sanitize_mobile(payload.mobile)
    if not mobile or len(mobile) != 10:
        raise HTTPException(400, "Please provide a valid 10-digit mobile number")
    # rate limit: max 25 per mobile per hour (generous for testing)
    since = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    recent = await db.otp_sessions.count_documents({"mobile": mobile, "createdAt": {"$gt": since}})
    if recent >= 25:
        raise HTTPException(429, "Too many OTP requests. Please try again later.")
    otp = f"{random.randint(0, 999999):06d}"
    session_id = new_id()
    await db.otp_sessions.insert_one({
        "id": session_id, "mobile": mobile, "otp": otp, "attempts": 0,
        "verified": False, "createdAt": now_iso(),
        "expiresAt": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat(),
    })
    logger.info(f"[DEV OTP] mobile={mobile} otp={otp}")
    # dev mode: return otp so flow is testable without external SMS/Firebase
    return {"sessionId": session_id, "devOtp": otp, "devMode": True}

@api.post("/auth/verify-otp")
async def verify_otp(payload: VerifyOtp):
    mobile = sanitize_mobile(payload.mobile)
    otp_code = payload.otp.strip()
    sess = await db.otp_sessions.find_one({"id": payload.sessionId, "mobile": mobile})
    if not sess:
        raise HTTPException(400, "Invalid or expired session. Please request a new OTP.")
    if sess.get("verified"):
        raise HTTPException(400, "OTP already used. Please request a new OTP.")
    if sess["expiresAt"] < now_iso():
        raise HTTPException(400, "OTP expired. Please request a new OTP.")
    if sess.get("attempts", 0) >= 5:
        raise HTTPException(429, "Too many attempts. Please request a new OTP.")
    if otp_code != sess["otp"]:
        await db.otp_sessions.update_one({"id": sess["id"]}, {"$inc": {"attempts": 1}})
        raise HTTPException(400, "Incorrect OTP")
    await db.otp_sessions.update_one({"id": sess["id"]}, {"$set": {"verified": True}})
    return await _login_or_create(mobile)

async def _login_or_create(mobile: str):
    user = await db.users.find_one({"mobile": mobile})
    is_new = False
    if not user:
        is_new = True
        ids = await gen_simpldsc_id()
        user = {"id": new_id(), "mobile": mobile, "name": None, "email": None,
                "profile": {}, "billing": {}, "createdAt": now_iso(), "updatedAt": now_iso(), **ids}
        await db.users.insert_one(user)
        await notify("customer", user["id"], "welcome", "Welcome to SimplDSC",
                     "Your account has been created. Complete your profile to get started.")
    user = clean(user)
    token = make_token(user["id"], "customer")
    return {"token": token, "user": user, "isNew": is_new or not user.get("name")}

@api.post("/auth/complete-profile")
async def complete_profile(payload: CompleteProfile, user: dict = Depends(get_current_customer)):
    await db.users.update_one({"id": user["id"]}, {"$set": {
        "name": payload.name, "email": payload.email, "updatedAt": now_iso()}})
    u = clean(await db.users.find_one({"id": user["id"]}))
    return {"user": u}

@api.get("/auth/me")
async def me(user: dict = Depends(get_current_customer)):
    return {"user": user}

@api.put("/customer/profile")
async def update_profile(payload: dict, user: dict = Depends(get_current_customer)):
    fields = {}
    for k in ["name", "email", "profile", "billing"]:
        if k in payload:
            fields[k] = payload[k]
    fields["updatedAt"] = now_iso()
    await db.users.update_one({"id": user["id"]}, {"$set": fields})
    return {"user": clean(await db.users.find_one({"id": user["id"]}))}


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

@api.post("/orders")
async def create_order(payload: CreateOrderReq, request: Request, user: dict = Depends(get_current_customer)):
    product = await db.products.find_one({"id": payload.productId, "active": True}, {"_id": 0})
    if not product:
        raise HTTPException(404, "Product not found")
    pricing = await _price_order(product, payload.couponCode, user["id"])
    order_id = await gen_order_id()
    amount_paise = int(round(pricing["totalAmount"] * 100))

    # Create Razorpay order (live or mock)
    if RZP_LIVE:
        rzp_order = _rzp_client.order.create({"amount": amount_paise, "currency": "INR",
                                              "receipt": order_id, "payment_capture": 1})
        rzp_order_id = rzp_order["id"]
    else:
        rzp_order_id = f"order_mock_{new_id()[:16]}"

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

    order = {
        "id": new_id(), "orderId": order_id, "simplDscId": user["simplDscId"], "userId": user["id"],
        "productId": product["id"], "productName": product["name"], "productCategory": product["category"],
        "customerName": user.get("name"), "mobile": user["mobile"], "email": user.get("email"),
        **pricing, "currency": "INR",
        **agent_fields,
        "paymentStatus": "Payment Pending", "documentStatus": "Pending", "orderStatus": "Payment Pending",
        "workflowStage": "Application Created",
        "caId": product.get("preferredCA"), "razorpayOrderId": rzp_order_id,
        "requiredDocuments": product.get("requiredDocuments", []),
        "applicant": payload.applicant, "shipping": {**payload.shipping, "deliveryStatus": "Not Dispatched"},
        "dscId": None, "createdAt": now_iso(), "updatedAt": now_iso(),
    }
    await db.orders.insert_one(order)
    await db.order_status_history.insert_one({"id": new_id(), "orderId": order_id, "oldStatus": None,
        "newStatus": "Payment Pending", "changedBy": user.get("name") or user["mobile"], "timestamp": now_iso(), "notes": "Order created"})
    await notify("customer", user["id"], "order_created", "Order Created",
                 f"Your order {order_id} has been created. Complete payment to proceed.", "order", order_id)
    return {"order": clean(order), "razorpay": {"keyId": RZP_KEY, "orderId": rzp_order_id,
            "amount": amount_paise, "currency": "INR", "mock": not RZP_LIVE}}

@api.post("/orders/verify-payment")
async def verify_payment(payload: VerifyPaymentReq, user: dict = Depends(get_current_customer)):
    order = await db.orders.find_one({"orderId": payload.orderId, "userId": user["id"]})
    if not order:
        raise HTTPException(404, "Order not found")
    if order.get("paymentStatus") == "Payment Successful":
        return {"ok": True, "invoiceNo": order.get("invoiceNo")}
    # signature verification
    verified = False
    if RZP_LIVE:
        try:
            _rzp_client.utility.verify_payment_signature({
                "razorpay_order_id": payload.razorpayOrderId,
                "razorpay_payment_id": payload.razorpayPaymentId,
                "razorpay_signature": payload.razorpaySignature})
            verified = True
        except Exception:
            verified = False
    else:
        verified = payload.razorpaySignature.startswith("mock_sig_")
    if not verified:
        await db.orders.update_one({"id": order["id"]}, {"$set": {"paymentStatus": "Failed", "updatedAt": now_iso()}})
        await notify("customer", user["id"], "payment_failed", "Payment Failed",
                     f"Payment for order {order['orderId']} could not be verified.", "order", order["orderId"])
        raise HTTPException(400, "Payment verification failed")

    inv_no = await gen_invoice_no()
    await db.payments.insert_one({
        "id": new_id(), "userId": user["id"], "simplDscId": user["simplDscId"], "orderId": order["orderId"],
        "razorpayOrderId": payload.razorpayOrderId, "razorpayPaymentId": payload.razorpayPaymentId,
        "razorpaySignature": payload.razorpaySignature, "amount": order["totalAmount"], "currency": "INR",
        "status": "Successful", "method": "razorpay", "createdAt": now_iso(), "updatedAt": now_iso()})
    invoice = {"id": new_id(), "invoiceNo": inv_no, "orderId": order["orderId"], "userId": user["id"],
               "simplDscId": user["simplDscId"], "amount": order["amount"], "discount": order["discount"],
               "gst": order["gst"], "professionalFee": order["professionalFee"], "totalAmount": order["totalAmount"],
               "productName": order["productName"], "customerName": user.get("name"),
               "billing": user.get("billing", {}), "status": "Paid", "createdAt": now_iso()}
    await db.invoices.insert_one(invoice)
    await db.orders.update_one({"id": order["id"]}, {"$set": {
        "paymentStatus": "Payment Successful", "orderStatus": "Documents Pending",
        "documentStatus": "Pending", "workflowStage": "Payment Successful",
        "invoiceNo": inv_no, "razorpayPaymentId": payload.razorpayPaymentId, "updatedAt": now_iso()}})
    await db.order_status_history.insert_one({"id": new_id(), "orderId": order["orderId"],
        "oldStatus": "Payment Pending", "newStatus": "Payment Successful",
        "changedBy": "system", "timestamp": now_iso(), "notes": "Payment verified"})
    if order.get("couponCode"):
        await db.coupons.update_one({"code": order["couponCode"]}, {"$inc": {"usedCount": 1}})
    await notify("customer", user["id"], "payment_success", "Payment Successful",
                 f"Payment received for order {order['orderId']}. Please upload your documents.", "order", order["orderId"])
    return {"ok": True, "invoiceNo": inv_no}

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
async def validate_coupon(code: str, productId: str, user: dict = Depends(get_current_customer)):
    product = await db.products.find_one({"id": productId}, {"_id": 0})
    if not product:
        raise HTTPException(404, "Product not found")
    pricing = await _price_order(product, code, user["id"])
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
        if full_path.startswith("api") or full_path in ["docs", "openapi.json", "redoc", "health"]:
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
if cors_origins_raw and cors_origins_raw != '*':
    cors_origins = [o.strip() for o in cors_origins_raw.split(',') if o.strip()]
    allow_regex = None
else:
    # Allow any origin with credentials without triggering browser CORS errors
    cors_origins = []
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
    await db.documents.create_index("orderId")
    await db.dscs.create_index("userId")
    asyncio.create_task(_scheduler())
    logger.info("SimplDSC started. Razorpay live=%s", RZP_LIVE)

@app.on_event("shutdown")
async def on_shutdown():
    from core import client as mongo_client
    mongo_client.close()
