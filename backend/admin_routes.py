"""Admin + staff routes and Razorpay webhook."""
import os
import io
import csv
import hmac
import hashlib
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response
from pydantic import BaseModel, EmailStr

from core import db, new_id, now_iso, clean, audit, notify, gen_invoice_no
from security import (hash_password, verify_password, make_token,
                      get_current_admin, require_roles, client_ip)

admin_router = APIRouter()

RZP_WEBHOOK = os.environ.get("RAZORPAY_WEBHOOK_SECRET", "")


class AdminLoginReq(BaseModel):
    email: EmailStr
    password: str


# ---------- AUTH ----------
@admin_router.post("/admin/login")
async def admin_login(payload: AdminLoginReq, request: Request):
    ip = client_ip(request)
    email = payload.email.lower().strip()
    # brute-force lockout: 5 fails / 15 min
    since = (datetime.now(timezone.utc) - timedelta(minutes=15)).isoformat()
    fails = await db.admin_login_attempts.count_documents({"email": email, "ok": False, "at": {"$gt": since}})
    if fails >= 5:
        raise HTTPException(429, "Account temporarily locked. Try again later.")
    admin = await db.admin_users.find_one({"email": email})
    ok = admin and admin.get("active", True) and verify_password(payload.password, admin["passwordHash"])
    await db.admin_login_attempts.insert_one({"email": email, "ok": bool(ok), "ip": ip, "at": now_iso()})
    if not ok:
        raise HTTPException(401, "Invalid credentials")
    token = make_token(admin["id"], "admin", {"role": admin["role"]})
    a = clean(admin); a.pop("passwordHash", None)
    return {"token": token, "admin": a}

@admin_router.get("/admin/me")
async def admin_me(admin: dict = Depends(get_current_admin)):
    admin.pop("passwordHash", None)
    return {"admin": admin}


# ---------- DASHBOARD ----------
@admin_router.get("/admin/dashboard")
async def dashboard(admin: dict = Depends(get_current_admin)):
    async def c(coll, q):
        return await db[coll].count_documents(q)
    revenue_docs = await db.payments.find({"status": "Successful"}, {"_id": 0, "amount": 1}).to_list(100000)
    revenue = round(sum(p["amount"] for p in revenue_docs), 2)
    now = datetime.now(timezone.utc)
    d15 = (now + timedelta(days=15)).isoformat()
    expiring = await db.dscs.count_documents({"status": {"$in": ["Active", "Expiring Soon"]}, "expiryDate": {"$lte": d15, "$gte": now.isoformat()}})
    stats = {
        "totalCustomers": await c("users", {}),
        "totalOrders": await c("orders", {}),
        "pendingOrders": await c("orders", {"orderStatus": {"$nin": ["Completed", "Cancelled", "Refunded"]}}),
        "paymentPending": await c("orders", {"paymentStatus": "Payment Pending"}),
        "documentsPending": await c("orders", {"orderStatus": {"$in": ["Documents Pending", "Documents Received"]}}),
        "underVerification": await c("orders", {"orderStatus": "Under Verification"}),
        "documentsRejected": await c("orders", {"orderStatus": {"$in": ["Documents Rejected", "Re-upload Required"]}}),
        "dscProcessing": await c("orders", {"orderStatus": "DSC Processing"}),
        "dscReady": await c("orders", {"orderStatus": "DSC Ready"}),
        "completedOrders": await c("orders", {"orderStatus": "Completed"}),
        "expiringDscs": expiring,
        "renewalPending": await c("renewals", {"status": {"$nin": ["Renewed", "Rejected"]}}),
        "partnershipLeads": await c("partnership_applications", {}),
        "contactEnquiries": await c("contact_enquiries", {}),
        "supportTickets": await c("support_tickets", {"status": {"$in": ["Open", "Pending"]}}),
        "totalRevenue": revenue,
    }
    return stats


# ---------- CUSTOMERS ----------
@admin_router.get("/admin/customers")
async def admin_customers(search: str = "", admin: dict = Depends(get_current_admin)):
    q = {}
    if search:
        q = {"$or": [{"name": {"$regex": search, "$options": "i"}},
                     {"mobile": {"$regex": search}}, {"email": {"$regex": search, "$options": "i"}},
                     {"simplDscId": {"$regex": search, "$options": "i"}}]}
    users = await db.users.find(q, {"_id": 0}).sort("createdAt", -1).to_list(1000)
    for u in users:
        u["orderCount"] = await db.orders.count_documents({"userId": u["id"]})
        pays = await db.payments.find({"userId": u["id"], "status": "Successful"}, {"_id": 0, "amount": 1}).to_list(1000)
        u["totalPurchase"] = round(sum(p["amount"] for p in pays), 2)
    return users

@admin_router.get("/admin/customers/{user_id}")
async def admin_customer_detail(user_id: str, admin: dict = Depends(get_current_admin)):
    u = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not u:
        raise HTTPException(404, "Customer not found")
    return {
        "customer": u,
        "orders": await db.orders.find({"userId": user_id}, {"_id": 0}).to_list(500),
        "dscs": await db.dscs.find({"userId": user_id}, {"_id": 0}).to_list(200),
        "renewals": await db.renewals.find({"userId": user_id}, {"_id": 0}).to_list(200),
        "tickets": await db.support_tickets.find({"userId": user_id}, {"_id": 0}).to_list(200),
        "invoices": await db.invoices.find({"userId": user_id}, {"_id": 0}).to_list(200),
    }


# ---------- ORDERS ----------
@admin_router.get("/admin/orders")
async def admin_orders(search: str = "", orderStatus: str = "", paymentStatus: str = "",
                       documentStatus: str = "", admin: dict = Depends(get_current_admin)):
    q = {}
    if orderStatus:
        q["orderStatus"] = orderStatus
    if paymentStatus:
        q["paymentStatus"] = paymentStatus
    if documentStatus:
        q["documentStatus"] = documentStatus
    if search:
        q["$or"] = [{"orderId": {"$regex": search, "$options": "i"}},
                    {"simplDscId": {"$regex": search, "$options": "i"}},
                    {"customerName": {"$regex": search, "$options": "i"}},
                    {"mobile": {"$regex": search}}, {"email": {"$regex": search, "$options": "i"}}]
    return await db.orders.find(q, {"_id": 0}).sort("createdAt", -1).to_list(1000)

@admin_router.get("/admin/orders/{order_id}")
async def admin_order_detail(order_id: str, admin: dict = Depends(get_current_admin)):
    order = await db.orders.find_one({"orderId": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(404, "Order not found")
    user = await db.users.find_one({"id": order["userId"]}, {"_id": 0})
    history = await db.order_status_history.find({"orderId": order_id}, {"_id": 0}).sort("timestamp", 1).to_list(200)
    docs = await db.documents.find({"orderId": order_id}, {"_id": 0, "data": 0}).to_list(100)
    dsc = await db.dscs.find_one({"orderId": order_id}, {"_id": 0})
    cas = await db.partner_cas.find({"active": True}, {"_id": 0}).to_list(100)
    return {"order": order, "customer": user, "history": history, "documents": docs, "dsc": dsc, "cas": cas}

@admin_router.put("/admin/orders/{order_id}/status")
async def update_order_status(order_id: str, payload: dict, request: Request,
                              admin: dict = Depends(require_roles("order_staff", "staff"))):
    order = await db.orders.find_one({"orderId": order_id})
    if not order:
        raise HTTPException(404, "Order not found")
    new_status = payload.get("orderStatus")
    stage = payload.get("workflowStage")
    updates = {"updatedAt": now_iso()}
    if new_status:
        updates["orderStatus"] = new_status
    if stage:
        updates["workflowStage"] = stage
    await db.orders.update_one({"orderId": order_id}, {"$set": updates})
    await db.order_status_history.insert_one({"id": new_id(), "orderId": order_id,
        "oldStatus": order.get("orderStatus"), "newStatus": new_status or stage,
        "changedBy": admin["email"], "timestamp": now_iso(), "notes": payload.get("notes")})
    await audit(admin, "order_status_changed", "order", order_id, order.get("orderStatus"), new_status, client_ip(request))
    await notify("customer", order["userId"], "order_update", "Order Updated",
                 f"Your order {order_id} status: {new_status or stage}.", "order", order_id)
    return {"ok": True}

@admin_router.put("/admin/orders/{order_id}/ca")
async def assign_ca(order_id: str, payload: dict, request: Request,
                    admin: dict = Depends(require_roles("order_staff", "staff"))):
    order = await db.orders.find_one({"orderId": order_id})
    if not order:
        raise HTTPException(404, "Order not found")
    await db.orders.update_one({"orderId": order_id}, {"$set": {"caId": payload.get("caId"), "updatedAt": now_iso()}})
    await audit(admin, "ca_changed", "order", order_id, order.get("caId"), payload.get("caId"), client_ip(request))
    return {"ok": True}

@admin_router.put("/admin/orders/{order_id}/shipping")
async def update_shipping(order_id: str, payload: dict, request: Request,
                          admin: dict = Depends(require_roles("order_staff", "staff"))):
    order = await db.orders.find_one({"orderId": order_id})
    if not order:
        raise HTTPException(404, "Order not found")
    shipping = {**order.get("shipping", {}), **payload}
    await db.orders.update_one({"orderId": order_id}, {"$set": {"shipping": shipping, "updatedAt": now_iso()}})
    await audit(admin, "shipping_updated", "order", order_id, None, payload.get("deliveryStatus"), client_ip(request))
    await notify("customer", order["userId"], "shipping_update", "Shipping Update",
                 f"Delivery status for order {order_id}: {payload.get('deliveryStatus', 'updated')}.", "order", order_id)
    return {"ok": True}

@admin_router.post("/admin/orders/{order_id}/issue-dsc")
async def issue_dsc(order_id: str, payload: dict, request: Request,
                    admin: dict = Depends(require_roles("order_staff", "staff"))):
    order = await db.orders.find_one({"orderId": order_id})
    if not order:
        raise HTTPException(404, "Order not found")
    dsc = {"id": new_id(), "userId": order["userId"], "simplDscId": order["simplDscId"],
           "orderId": order_id, "productId": order["productId"], "caId": payload.get("caId") or order.get("caId"),
           "dscType": payload.get("dscType") or order["productCategory"],
           "certificateNumber": payload.get("certificateNumber"),
           "issuedDate": payload.get("issuedDate"), "expiryDate": payload.get("expiryDate"),
           "status": "Active", "renewalStatus": None, "createdAt": now_iso(), "updatedAt": now_iso()}
    await db.dscs.insert_one(dsc)
    await db.orders.update_one({"orderId": order_id}, {"$set": {
        "orderStatus": "DSC Ready", "workflowStage": "DSC Issued", "dscId": dsc["id"], "updatedAt": now_iso()}})
    await db.order_status_history.insert_one({"id": new_id(), "orderId": order_id,
        "oldStatus": order.get("orderStatus"), "newStatus": "DSC Ready", "changedBy": admin["email"],
        "timestamp": now_iso(), "notes": "DSC issued"})
    await audit(admin, "dsc_issued", "dsc", dsc["id"], None, dsc["certificateNumber"], client_ip(request))
    await notify("customer", order["userId"], "dsc_ready", "DSC Ready",
                 f"Your DSC for order {order_id} has been issued.", "dsc", dsc["id"])
    return {"dsc": clean(dsc)}


@admin_router.post("/admin/orders/{order_id}/manual-invoice")
async def manual_invoice(order_id: str, request: Request, admin: dict = Depends(require_roles("order_staff", "staff"))):
    order = await db.orders.find_one({"orderId": order_id})
    if not order:
        raise HTTPException(404, "Order not found")
    if order.get("invoiceNo"):
        return {"invoiceNo": order["invoiceNo"], "existing": True}
    inv_no = await gen_invoice_no()
    user = await db.users.find_one({"id": order["userId"]})
    invoice = {"id": new_id(), "invoiceNo": inv_no, "orderId": order["orderId"], "userId": order["userId"],
               "simplDscId": order["simplDscId"], "amount": order.get("amount", order["totalAmount"]),
               "discount": order.get("discount", 0), "gst": order.get("gst", 0),
               "professionalFee": order.get("professionalFee", order["totalAmount"]),
               "totalAmount": order["totalAmount"], "productName": order["productName"],
               "customerName": order.get("customerName"), "billing": (user or {}).get("billing", {}),
               "status": "Manual", "createdAt": now_iso()}
    await db.invoices.insert_one(invoice)
    await db.orders.update_one({"orderId": order_id}, {"$set": {"invoiceNo": inv_no, "updatedAt": now_iso()}})
    await audit(admin, "manual_invoice_created", "order", order_id, None, inv_no, client_ip(request))
    return {"invoiceNo": inv_no}


# ---------- DOCUMENTS INBOX ----------
@admin_router.get("/admin/documents")
async def admin_documents(status: str = "", admin: dict = Depends(require_roles("doc_staff", "staff"))):
    q = {}
    if status:
        q["verificationStatus"] = status
    docs = await db.documents.find(q, {"_id": 0, "data": 0}).sort("uploadedAt", -1).to_list(1000)
    return docs

@admin_router.get("/admin/documents/{doc_id}/file")
async def admin_document_file(doc_id: str, admin: dict = Depends(require_roles("doc_staff", "staff"))):
    import base64
    d = await db.documents.find_one({"id": doc_id})
    if not d:
        raise HTTPException(404, "Document not found")
    return Response(content=base64.b64decode(d["data"]), media_type=d["contentType"])

@admin_router.put("/admin/documents/{doc_id}/verify")
async def verify_document(doc_id: str, payload: dict, request: Request,
                          admin: dict = Depends(require_roles("doc_staff", "staff"))):
    d = await db.documents.find_one({"id": doc_id})
    if not d:
        raise HTTPException(404, "Document not found")
    action = payload.get("action")  # verify | reject
    if action == "verify":
        new_status = "Verified"
    elif action == "reject":
        new_status = "Rejected"
    else:
        raise HTTPException(400, "Invalid action")
    await db.documents.update_one({"id": doc_id}, {"$set": {
        "verificationStatus": new_status, "rejectionReason": payload.get("reason"),
        "verifiedBy": admin["email"], "verifiedAt": now_iso()}})
    order = await db.orders.find_one({"orderId": d["orderId"]})
    await audit(admin, "document_" + action, "document", doc_id, d.get("verificationStatus"), new_status, client_ip(request))
    if new_status == "Rejected":
        await db.orders.update_one({"orderId": d["orderId"]}, {"$set": {
            "orderStatus": "Re-upload Required", "documentStatus": "Rejected", "updatedAt": now_iso()}})
        await notify("customer", d["userId"], "documents_rejected", "Document Rejected",
                     f"Your {d['documentType']} was rejected: {payload.get('reason', 'Please re-upload.')}", "order", d["orderId"])
    else:
        # if all docs verified, mark order verified
        all_docs = await db.documents.find({"orderId": d["orderId"]}, {"_id": 0}).to_list(100)
        reqd = order.get("requiredDocuments", []) if order else []
        verified_types = [x["documentType"] for x in all_docs if x["verificationStatus"] == "Verified"]
        if reqd and all(t in verified_types for t in reqd):
            await db.orders.update_one({"orderId": d["orderId"]}, {"$set": {
                "orderStatus": "Documents Verified", "documentStatus": "Verified",
                "workflowStage": "CA Submission", "updatedAt": now_iso()}})
            await notify("customer", d["userId"], "documents_verified", "Documents Verified",
                         f"All documents for order {d['orderId']} are verified.", "order", d["orderId"])
    return {"ok": True}


# ---------- PRODUCTS ----------
@admin_router.get("/admin/products")
async def admin_products(admin: dict = Depends(get_current_admin)):
    return await db.products.find({}, {"_id": 0}).sort("sortOrder", 1).to_list(500)

@admin_router.post("/admin/products")
async def create_product(payload: dict, request: Request, admin: dict = Depends(require_roles("staff"))):
    p = {"id": new_id(), "active": True, "issuingCAs": [], "purposeTags": [], "features": [],
         "requiredDocuments": [], "sortOrder": 99, "seo": {}, **payload,
         "createdAt": now_iso(), "updatedAt": now_iso()}
    await db.products.insert_one(p)
    await audit(admin, "product_created", "product", p["id"], None, p.get("name"), client_ip(request))
    return {"product": clean(p)}

@admin_router.put("/admin/products/{pid}")
async def update_product(pid: str, payload: dict, request: Request, admin: dict = Depends(require_roles("staff"))):
    old = await db.products.find_one({"id": pid})
    if not old:
        raise HTTPException(404, "Product not found")
    payload["updatedAt"] = now_iso()
    await db.products.update_one({"id": pid}, {"$set": payload})
    if "price" in payload and payload["price"] != old.get("price"):
        await audit(admin, "product_price_changed", "product", pid, old.get("price"), payload["price"], client_ip(request))
    return {"product": clean(await db.products.find_one({"id": pid}))}

@admin_router.delete("/admin/products/{pid}")
async def delete_product(pid: str, request: Request, admin: dict = Depends(require_roles("staff"))):
    await db.products.delete_one({"id": pid})
    await audit(admin, "product_deleted", "product", pid, None, None, client_ip(request))
    return {"ok": True}


# ---------- CAs ----------
@admin_router.get("/admin/cas")
async def admin_cas(admin: dict = Depends(get_current_admin)):
    return await db.partner_cas.find({}, {"_id": 0}).sort("displayOrder", 1).to_list(200)

@admin_router.post("/admin/cas")
async def create_ca(payload: dict, admin: dict = Depends(require_roles("staff"))):
    ca = {"id": new_id(), "name": payload.get("name"), "logoUrl": payload.get("logoUrl", ""),
          "websiteUrl": payload.get("websiteUrl", ""), "displayOrder": payload.get("displayOrder", 99),
          "active": True, "createdAt": now_iso()}
    await db.partner_cas.insert_one(ca)
    return {"ca": clean(ca)}

@admin_router.put("/admin/cas/{cid}")
async def update_ca(cid: str, payload: dict, admin: dict = Depends(require_roles("staff"))):
    await db.partner_cas.update_one({"id": cid}, {"$set": payload})
    return {"ca": clean(await db.partner_cas.find_one({"id": cid}))}

@admin_router.delete("/admin/cas/{cid}")
async def delete_ca(cid: str, admin: dict = Depends(require_roles("staff"))):
    await db.partner_cas.delete_one({"id": cid})
    return {"ok": True}


# ---------- FAQs ----------
@admin_router.get("/admin/faqs")
async def admin_faqs(admin: dict = Depends(get_current_admin)):
    return await db.faqs.find({}, {"_id": 0}).sort("sortOrder", 1).to_list(500)

@admin_router.post("/admin/faqs")
async def create_faq(payload: dict, admin: dict = Depends(require_roles("staff"))):
    f = {"id": new_id(), "question": payload.get("question"), "answer": payload.get("answer"),
         "active": True, "sortOrder": payload.get("sortOrder", 99), "createdAt": now_iso()}
    await db.faqs.insert_one(f)
    return {"faq": clean(f)}

@admin_router.put("/admin/faqs/{fid}")
async def update_faq(fid: str, payload: dict, admin: dict = Depends(require_roles("staff"))):
    await db.faqs.update_one({"id": fid}, {"$set": payload})
    return {"faq": clean(await db.faqs.find_one({"id": fid}))}

@admin_router.delete("/admin/faqs/{fid}")
async def delete_faq(fid: str, admin: dict = Depends(require_roles("staff"))):
    await db.faqs.delete_one({"id": fid})
    return {"ok": True}


# ---------- COUPONS ----------
@admin_router.get("/admin/coupons")
async def admin_coupons(admin: dict = Depends(get_current_admin)):
    return await db.coupons.find({}, {"_id": 0}).sort("createdAt", -1).to_list(500)

@admin_router.post("/admin/coupons")
async def create_coupon(payload: dict, admin: dict = Depends(require_roles("staff"))):
    c = {"id": new_id(), "code": payload["code"].upper(), "discountType": payload.get("discountType", "percentage"),
         "value": payload.get("value", 0), "startDate": payload.get("startDate"), "endDate": payload.get("endDate"),
         "usageLimit": payload.get("usageLimit"), "perCustomerLimit": payload.get("perCustomerLimit", 1),
         "productRestriction": payload.get("productRestriction", []), "minOrderValue": payload.get("minOrderValue", 0),
         "active": payload.get("active", True), "usedCount": 0, "createdAt": now_iso()}
    await db.coupons.insert_one(c)
    return {"coupon": clean(c)}

@admin_router.put("/admin/coupons/{cid}")
async def update_coupon(cid: str, payload: dict, admin: dict = Depends(require_roles("staff"))):
    if "code" in payload:
        payload["code"] = payload["code"].upper()
    await db.coupons.update_one({"id": cid}, {"$set": payload})
    return {"coupon": clean(await db.coupons.find_one({"id": cid}))}

@admin_router.delete("/admin/coupons/{cid}")
async def delete_coupon(cid: str, admin: dict = Depends(require_roles("staff"))):
    await db.coupons.delete_one({"id": cid})
    return {"ok": True}


# ---------- LEADS / ENQUIRIES ----------
@admin_router.get("/admin/partnership-leads")
async def partnership_leads(admin: dict = Depends(get_current_admin)):
    return await db.partnership_applications.find({}, {"_id": 0}).sort("createdAt", -1).to_list(1000)

@admin_router.put("/admin/partnership-leads/{lid}")
async def update_lead(lid: str, payload: dict, admin: dict = Depends(get_current_admin)):
    await db.partnership_applications.update_one({"id": lid}, {"$set": payload})
    return {"ok": True}

@admin_router.get("/admin/contact-enquiries")
async def contact_enquiries(admin: dict = Depends(get_current_admin)):
    return await db.contact_enquiries.find({}, {"_id": 0}).sort("createdAt", -1).to_list(1000)

@admin_router.put("/admin/contact-enquiries/{eid}")
async def update_enquiry(eid: str, payload: dict, admin: dict = Depends(get_current_admin)):
    await db.contact_enquiries.update_one({"id": eid}, {"$set": payload})
    return {"ok": True}


# ---------- TICKETS ----------
@admin_router.get("/admin/tickets")
async def admin_tickets(status: str = "", admin: dict = Depends(get_current_admin)):
    q = {"status": status} if status else {}
    return await db.support_tickets.find(q, {"_id": 0}).sort("createdAt", -1).to_list(1000)

@admin_router.put("/admin/tickets/{tid}")
async def update_ticket(tid: str, payload: dict, admin: dict = Depends(get_current_admin)):
    t = await db.support_tickets.find_one({"ticketId": tid})
    if not t:
        raise HTTPException(404, "Ticket not found")
    updates = {"updatedAt": now_iso()}
    if "status" in payload:
        updates["status"] = payload["status"]
    if "assignedStaff" in payload:
        updates["assignedStaff"] = payload["assignedStaff"]
    if payload.get("reply"):
        reply = {"by": admin["email"], "message": payload["reply"], "internal": payload.get("internal", False), "at": now_iso()}
        await db.support_tickets.update_one({"ticketId": tid}, {"$push": {"replies": reply}})
        if not payload.get("internal"):
            await notify("customer", t["userId"], "ticket_reply", "Support Reply",
                         f"You have a reply on ticket {tid}.", "ticket", tid)
    await db.support_tickets.update_one({"ticketId": tid}, {"$set": updates})
    return {"ticket": clean(await db.support_tickets.find_one({"ticketId": tid}))}


# ---------- DSC MANAGEMENT ----------
@admin_router.get("/admin/dscs")
async def admin_dscs(search: str = "", status: str = "", admin: dict = Depends(get_current_admin)):
    q = {}
    if status:
        q["status"] = status
    if search:
        q["$or"] = [{"simplDscId": {"$regex": search, "$options": "i"}},
                    {"certificateNumber": {"$regex": search, "$options": "i"}},
                    {"orderId": {"$regex": search, "$options": "i"}},
                    {"dscType": {"$regex": search, "$options": "i"}}]
    return await db.dscs.find(q, {"_id": 0}).sort("createdAt", -1).to_list(2000)

@admin_router.get("/admin/expiry-dashboard")
async def expiry_dashboard(admin: dict = Depends(get_current_admin)):
    now = datetime.now(timezone.utc)
    def rng(days):
        return {"expiryDate": {"$gte": now.isoformat(), "$lte": (now + timedelta(days=days)).isoformat()}}
    active = {"status": {"$in": ["Active", "Expiring Soon"]}}
    return {
        "in15": await db.dscs.find({**active, **rng(15)}, {"_id": 0}).to_list(500),
        "in30": await db.dscs.find({**active, **rng(30)}, {"_id": 0}).to_list(500),
        "in60": await db.dscs.find({**active, **rng(60)}, {"_id": 0}).to_list(500),
        "expired": await db.dscs.find({"expiryDate": {"$lt": now.isoformat()}, "status": {"$ne": "Renewal in Progress"}}, {"_id": 0}).to_list(500),
        "renewing": await db.dscs.find({"renewalStatus": {"$nin": [None, "Renewed"]}}, {"_id": 0}).to_list(500),
    }

@admin_router.get("/admin/expiry-reminders")
async def expiry_reminders(admin: dict = Depends(get_current_admin)):
    return await db.dsc_expiry_reminders.find({}, {"_id": 0}).sort("reminderDate", -1).to_list(1000)

@admin_router.put("/admin/expiry-reminders/{rid}")
async def handle_reminder(rid: str, payload: dict, admin: dict = Depends(get_current_admin)):
    await db.dsc_expiry_reminders.update_one({"id": rid}, {"$set": {
        "status": payload.get("status", "Handled"), "notes": payload.get("notes"),
        "assignedStaff": admin["email"], "handledAt": now_iso()}})
    return {"ok": True}

@admin_router.post("/admin/run-expiry-check")
async def run_expiry_now(admin: dict = Depends(require_roles("staff"))):
    from server import run_expiry_check
    created = await run_expiry_check()
    return {"created": created}

@admin_router.get("/admin/renewals")
async def admin_renewals(admin: dict = Depends(get_current_admin)):
    return await db.renewals.find({}, {"_id": 0}).sort("createdAt", -1).to_list(1000)

@admin_router.put("/admin/renewals/{rid}")
async def process_renewal(rid: str, payload: dict, request: Request, admin: dict = Depends(require_roles("staff"))):
    r = await db.renewals.find_one({"id": rid})
    if not r:
        raise HTTPException(404, "Renewal not found")
    status = payload.get("status")
    updates = {"status": status, "updatedAt": now_iso()}
    if status == "Renewed":
        updates["newIssueDate"] = payload.get("newIssueDate")
        updates["newExpiryDate"] = payload.get("newExpiryDate")
        # create new DSC record preserving history
        old = await db.dscs.find_one({"id": r["dscId"]}, {"_id": 0})
        if old:
            new_dsc = {**old, "id": new_id(), "issuedDate": payload.get("newIssueDate"),
                       "expiryDate": payload.get("newExpiryDate"), "status": "Active", "renewalStatus": None,
                       "certificateNumber": payload.get("certificateNumber") or old.get("certificateNumber"),
                       "renewedFrom": old["id"], "createdAt": now_iso(), "updatedAt": now_iso()}
            await db.dscs.insert_one(new_dsc)
            await db.dscs.update_one({"id": r["dscId"]}, {"$set": {"status": "Expired", "renewalStatus": "Renewed"}})
        await notify("customer", r["userId"], "renewal_completed", "Renewal Completed",
                     "Your DSC has been renewed.", "dsc", r["dscId"])
    await db.renewals.update_one({"id": rid}, {"$set": updates})
    await audit(admin, "renewal_processed", "renewal", rid, r.get("status"), status, client_ip(request))
    return {"ok": True}


# ---------- REFUNDS ----------
@admin_router.post("/admin/orders/{order_id}/refund")
async def process_refund(order_id: str, payload: dict, request: Request, admin: dict = Depends(require_roles("staff"))):
    order = await db.orders.find_one({"orderId": order_id})
    if not order:
        raise HTTPException(404, "Order not found")
    refund = {"id": new_id(), "orderId": order_id, "userId": order["userId"], "amount": order["totalAmount"],
              "status": "Refunded", "reason": payload.get("reason"), "processedBy": admin["email"], "createdAt": now_iso()}
    await db.refunds.insert_one(refund)
    await db.orders.update_one({"orderId": order_id}, {"$set": {
        "orderStatus": "Refunded", "paymentStatus": "Refunded", "updatedAt": now_iso()}})
    await audit(admin, "payment_refunded", "order", order_id, order.get("paymentStatus"), "Refunded", client_ip(request))
    await notify("customer", order["userId"], "refund", "Refund Processed",
                 f"Refund processed for order {order_id}.", "order", order_id)
    return {"refund": clean(refund)}

@admin_router.get("/admin/refunds")
async def admin_refunds(admin: dict = Depends(get_current_admin)):
    return await db.refunds.find({}, {"_id": 0}).sort("createdAt", -1).to_list(1000)


# ---------- PAYMENTS / RECONCILIATION ----------
@admin_router.get("/admin/payments")
async def admin_payments(admin: dict = Depends(get_current_admin)):
    return await db.payments.find({}, {"_id": 0, "razorpaySignature": 0}).sort("createdAt", -1).to_list(2000)


# ---------- STAFF (super admin) ----------
@admin_router.get("/admin/staff")
async def list_staff(admin: dict = Depends(require_roles())):
    staff = await db.admin_users.find({}, {"_id": 0, "passwordHash": 0}).to_list(200)
    return staff

@admin_router.post("/admin/staff")
async def create_staff(payload: dict, request: Request, admin: dict = Depends(require_roles())):
    if await db.admin_users.find_one({"email": payload["email"].lower()}):
        raise HTTPException(400, "Email already exists")
    s = {"id": new_id(), "email": payload["email"].lower(), "name": payload.get("name"),
         "role": payload.get("role", "staff"), "passwordHash": hash_password(payload["password"]),
         "active": True, "createdAt": now_iso()}
    await db.admin_users.insert_one(s)
    await audit(admin, "staff_created", "admin_user", s["id"], None, s["role"], client_ip(request))
    s = clean(s); s.pop("passwordHash", None)
    return {"staff": s}

@admin_router.put("/admin/staff/{sid}")
async def update_staff(sid: str, payload: dict, admin: dict = Depends(require_roles())):
    updates = {}
    for k in ["name", "role", "active"]:
        if k in payload:
            updates[k] = payload[k]
    if payload.get("password"):
        updates["passwordHash"] = hash_password(payload["password"])
    await db.admin_users.update_one({"id": sid}, {"$set": updates})
    return {"ok": True}


# ---------- AUDIT LOGS (super admin) ----------
@admin_router.get("/admin/audit-logs")
async def audit_logs(admin: dict = Depends(require_roles())):
    return await db.audit_logs.find({}, {"_id": 0}).sort("timestamp", -1).to_list(2000)


# ---------- SEO SETTINGS ----------
@admin_router.get("/admin/settings")
async def get_admin_settings(admin: dict = Depends(get_current_admin)):
    return clean(await db.website_settings.find_one({"_id": "singleton"}))

@admin_router.put("/admin/settings")
async def update_admin_settings(payload: dict, admin: dict = Depends(require_roles("staff"))):
    await db.website_settings.update_one({"_id": "singleton"}, {"$set": {**payload, "updatedAt": now_iso()}})
    return clean(await db.website_settings.find_one({"_id": "singleton"}))


# ---------- ANALYTICS ----------
@admin_router.get("/admin/analytics")
async def analytics(admin: dict = Depends(get_current_admin)):
    orders = await db.orders.find({}, {"_id": 0}).to_list(100000)
    paid = [o for o in orders if o["paymentStatus"] == "Payment Successful"]
    revenue = round(sum(o["totalAmount"] for o in paid), 2)
    by_product = {}
    for o in paid:
        by_product[o["productName"]] = by_product.get(o["productName"], 0) + 1
    top = sorted(by_product.items(), key=lambda x: -x[1])[:6]
    conv = round(len(paid) / len(orders) * 100, 1) if orders else 0
    return {
        "source": "internal",
        "totalOrders": len(orders), "paidOrders": len(paid), "revenue": revenue,
        "conversionRate": conv, "failedPayments": len([o for o in orders if o["paymentStatus"] == "Failed"]),
        "topProducts": [{"name": n, "count": c} for n, c in top],
        "partnershipLeads": await db.partnership_applications.count_documents({}),
        "contactEnquiries": await db.contact_enquiries.count_documents({}),
    }


# ---------- EXPORT ----------
@admin_router.get("/admin/export/{entity}")
async def export_csv(entity: str, admin: dict = Depends(get_current_admin)):
    coll_map = {"customers": ("users", ["simplDscId", "name", "mobile", "email", "createdAt"]),
                "orders": ("orders", ["orderId", "simplDscId", "customerName", "mobile", "productName", "totalAmount", "paymentStatus", "orderStatus", "createdAt"]),
                "payments": ("payments", ["orderId", "razorpayPaymentId", "amount", "status", "createdAt"]),
                "dscs": ("dscs", ["simplDscId", "dscType", "certificateNumber", "issuedDate", "expiryDate", "status"]),
                "leads": ("partnership_applications", ["name", "business", "mobile", "email", "city", "state", "status", "createdAt"]),
                "enquiries": ("contact_enquiries", ["name", "email", "phone", "status", "createdAt"]),
                "tickets": ("support_tickets", ["ticketId", "category", "subject", "status", "createdAt"])}
    if entity not in coll_map:
        raise HTTPException(404, "Unknown export")
    coll, cols = coll_map[entity]
    rows = await db[coll].find({}, {"_id": 0}).to_list(100000)
    buf = io.StringIO()
    w = csv.DictWriter(buf, fieldnames=cols, extrasaction="ignore")
    w.writeheader()
    for r in rows:
        w.writerow({c: r.get(c, "") for c in cols})
    return Response(content=buf.getvalue(), media_type="text/csv",
                    headers={"Content-Disposition": f"attachment; filename={entity}.csv"})


# ---------- GLOBAL SEARCH ----------
@admin_router.get("/admin/search")
async def global_search(q: str, admin: dict = Depends(get_current_admin)):
    rx = {"$regex": q, "$options": "i"}
    return {
        "customers": await db.users.find({"$or": [{"name": rx}, {"mobile": rx}, {"email": rx}, {"simplDscId": rx}]}, {"_id": 0}).to_list(20),
        "orders": await db.orders.find({"$or": [{"orderId": rx}, {"simplDscId": rx}, {"customerName": rx}, {"mobile": rx}]}, {"_id": 0}).to_list(20),
        "dscs": await db.dscs.find({"$or": [{"simplDscId": rx}, {"certificateNumber": rx}]}, {"_id": 0}).to_list(20),
        "tickets": await db.support_tickets.find({"ticketId": rx}, {"_id": 0}).to_list(20),
    }


# ---------- STAFF NOTIFICATIONS ----------
@admin_router.get("/admin/notifications")
async def staff_notifications(admin: dict = Depends(get_current_admin)):
    return await db.notifications.find({"recipientType": "staff"}, {"_id": 0}).sort("createdAt", -1).to_list(200)


# ---------- RAZORPAY WEBHOOK ----------
@admin_router.post("/webhooks/razorpay")
async def razorpay_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")
    if RZP_WEBHOOK:
        expected = hmac.new(RZP_WEBHOOK.encode(), body, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, signature):
            raise HTTPException(400, "Invalid webhook signature")
    import json
    payload = json.loads(body.decode() or "{}")
    event = payload.get("event")
    event_id = request.headers.get("X-Razorpay-Event-Id", new_id())
    # idempotency
    if await db.webhook_events.find_one({"eventId": event_id}):
        return {"status": "duplicate"}
    await db.webhook_events.insert_one({"eventId": event_id, "event": event, "at": now_iso()})
    return {"status": "processed", "event": event}
