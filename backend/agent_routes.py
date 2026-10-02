"""Agent portal routes for SimplDSC."""
import base64
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Form
from pydantic import BaseModel, EmailStr

from core import (db, new_id, now_iso, clean, gen_order_id, gen_invoice_no,
                  gen_simpldsc_id, gen_agent_code, notify, audit)
from security import (hash_password, verify_password, make_token,
                      get_current_agent, client_ip)

agent_router = APIRouter(prefix="/agent", tags=["agent"])


# ================= SCHEMAS =================
class AgentRegisterReq(BaseModel):
    name: str
    business: Optional[str] = None
    mobile: str
    email: Optional[str] = None
    password: str
    city: Optional[str] = None
    state: Optional[str] = None


class AgentLoginReq(BaseModel):
    identifier: str  # mobile, email, or agentCode
    password: str


class AgentProfileUpdateReq(BaseModel):
    name: Optional[str] = None
    business: Optional[str] = None
    email: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    payoutUpi: Optional[str] = None
    payoutBank: Optional[dict] = None


class AgentClientOrderReq(BaseModel):
    clientName: str
    clientMobile: str
    clientEmail: Optional[str] = None
    productId: str
    applicant: dict = {}
    shipping: dict = {}
    collectPaymentDirectly: bool = True  # Agent has collected fee or SimplDSC online link


# ================= HELPER FOR PROGRESS =================
def compute_workflow_progress(order: dict, doc_count: int = 0) -> dict:
    """
    Computes 5-stage progress:
    1: Application Created / Order Placed
    2: Documents Uploaded
    3: Admin / eKYC Verification
    4: CA Processing & Approval
    5: DSC Ready / Completed
    """
    order_status = order.get("orderStatus", "Payment Pending")
    doc_status = order.get("documentStatus", "Pending")
    workflow_stage = order.get("workflowStage", "Application Created")
    req_docs = order.get("requiredDocuments", [])

    # Defaults
    step = 1
    step_label = "Order Placed"
    percent = 20
    status_tone = "blue"

    if order_status == "Cancelled":
        return {
            "currentStep": 1,
            "stepLabel": "Order Cancelled",
            "percent": 0,
            "statusTone": "rose",
            "isComplete": False,
        }

    if order_status in ["DSC Ready", "Completed"] or workflow_stage in ["DSC Issued", "Delivered"]:
        step = 5
        percent = 100
        step_label = "DSC Completed & Delivered" if order_status == "Completed" else "DSC Ready / Token Issued"
        status_tone = "green"
    elif order_status in ["DSC Processing"] or workflow_stage in ["CA Submission"]:
        step = 4
        percent = 80
        step_label = "Processing with Certifying Authority (CA)"
        status_tone = "purple"
    elif order_status in ["Documents Verified", "Under Verification"] or doc_status == "Verified":
        if order_status == "Documents Verified":
            step = 3
            percent = 65
            step_label = "Documents Verified - Queued for CA Processing"
            status_tone = "emerald"
        else:
            step = 3
            percent = 50
            step_label = "Documents Under Verification by SimplDSC"
            status_tone = "blue"
    elif order_status in ["Documents Received"] or doc_status in ["Uploaded", "Received"] or doc_count > 0:
        step = 2
        percent = 40
        step_label = "Documents Uploaded - Awaiting Verification"
        status_tone = "sky"
    elif order_status == "Re-upload Required" or doc_status == "Rejected":
        step = 2
        percent = 30
        step_label = "Document Rejected - Re-upload Required"
        status_tone = "amber"
    elif order_status == "Payment Pending":
        step = 1
        percent = 10
        step_label = "Payment Pending"
        status_tone = "amber"
    else:
        # Documents Pending
        step = 2
        percent = 20
        step_label = "Waiting for Client to Upload Documents"
        status_tone = "amber"

    return {
        "currentStep": step,
        "stepLabel": step_label,
        "percent": percent,
        "statusTone": status_tone,
        "isComplete": step == 5,
    }


# ================= AGENT AUTH =================
@agent_router.post("/register")
async def agent_register(payload: AgentRegisterReq):
    mobile = payload.mobile.strip()
    if not mobile or len(mobile) < 10:
        raise HTTPException(400, "Valid 10-digit mobile number required")
    if not payload.password or len(payload.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    if not payload.name.strip():
        raise HTTPException(400, "Name is required")

    # Check existing mobile
    existing = await db.agents.find_one({"mobile": mobile})
    if existing:
        raise HTTPException(400, "An agent with this mobile number already exists. Please log in.")

    if payload.email:
        email_clean = payload.email.strip().lower()
        exist_email = await db.agents.find_one({"email": email_clean})
        if exist_email:
            raise HTTPException(400, "An agent with this email already exists. Please log in.")
    else:
        email_clean = None

    agent_code = await gen_agent_code()
    agent_id = new_id()
    doc = {
        "id": agent_id,
        "agentCode": agent_code,
        "name": payload.name.strip(),
        "business": (payload.business or "").strip(),
        "mobile": mobile,
        "email": email_clean,
        "password": hash_password(payload.password),
        "city": (payload.city or "").strip(),
        "state": (payload.state or "").strip(),
        "commissionRate": 15.0,  # 15% standard commission
        "totalEarned": 0.0,
        "status": "Active",
        "payoutUpi": None,
        "payoutBank": {},
        "createdAt": now_iso(),
        "updatedAt": now_iso(),
    }
    await db.agents.insert_one(doc)

    # Sync with partnership applications collection
    await db.partnership_applications.insert_one({
        "id": new_id(),
        "agentId": agent_id,
        "agentCode": agent_code,
        "name": doc["name"],
        "business": doc["business"],
        "mobile": mobile,
        "email": email_clean,
        "city": doc["city"],
        "state": doc["state"],
        "businessType": "Registered DSC Agent",
        "status": "Approved",
        "createdAt": now_iso(),
    })

    token = make_token(agent_id, "agent", {"code": agent_code})
    return {"ok": True, "token": token, "agent": clean(doc)}


@agent_router.post("/login")
async def agent_login(payload: AgentLoginReq):
    ident = payload.identifier.strip()
    if not ident or not payload.password:
        raise HTTPException(400, "Identifier and password required")

    agent = await db.agents.find_one({
        "$or": [
            {"mobile": ident},
            {"email": ident.lower()},
            {"agentCode": ident.upper()},
            {"agentCode": ident},
        ]
    })
    if not agent or not verify_password(payload.password, agent.get("password", "")):
        raise HTTPException(401, "Invalid mobile/code or password")

    if agent.get("status") == "Suspended":
        raise HTTPException(403, "Your agent account has been suspended. Please contact support.")

    token = make_token(agent["id"], "agent", {"code": agent["agentCode"]})
    return {"ok": True, "token": token, "agent": clean(agent)}


@agent_router.get("/me")
async def agent_me(agent: dict = Depends(get_current_agent)):
    # Calculate lifetime stats
    orders = await db.orders.find({"agentCode": agent["agentCode"]}, {"_id": 0}).to_list(1000)
    total_clients = len(orders)
    completed_orders = sum(1 for o in orders if o.get("orderStatus") in ["DSC Ready", "Completed"])
    total_earned = sum(o.get("agentCommission", 0) for o in orders if o.get("orderStatus") in ["DSC Ready", "Completed"])

    clean_agent = clean(agent)
    clean_agent.pop("password", None)
    clean_agent["stats"] = {
        "totalClients": total_clients,
        "completedOrders": completed_orders,
        "totalEarned": total_earned,
    }
    return clean_agent


@agent_router.put("/profile")
async def agent_update_profile(payload: AgentProfileUpdateReq, agent: dict = Depends(get_current_agent)):
    updates = {"updatedAt": now_iso()}
    if payload.name:
        updates["name"] = payload.name.strip()
    if payload.business is not None:
        updates["business"] = payload.business.strip()
    if payload.email is not None:
        updates["email"] = payload.email.strip().lower()
    if payload.city is not None:
        updates["city"] = payload.city.strip()
    if payload.state is not None:
        updates["state"] = payload.state.strip()
    if payload.payoutUpi is not None:
        updates["payoutUpi"] = payload.payoutUpi.strip()
    if payload.payoutBank is not None:
        updates["payoutBank"] = payload.payoutBank

    await db.agents.update_one({"id": agent["id"]}, {"$set": updates})
    updated = await db.agents.find_one({"id": agent["id"]})
    return {"ok": True, "agent": clean(updated)}


# ================= DASHBOARD & STATS =================
@agent_router.get("/dashboard-stats")
async def agent_dashboard_stats(agent: dict = Depends(get_current_agent)):
    agent_code = agent["agentCode"]
    orders = await db.orders.find({"agentCode": agent_code}, {"_id": 0}).to_list(1000)

    total_clients = len(orders)
    completed = 0
    in_progress = 0
    pending_docs = 0
    total_commission = 0.0
    pending_commission = 0.0

    for o in orders:
        status = o.get("orderStatus", "Payment Pending")
        comm = o.get("agentCommission", round(o.get("totalAmount", 0) * (agent.get("commissionRate", 15.0) / 100.0)))
        if status in ["DSC Ready", "Completed"]:
            completed += 1
            total_commission += comm
        elif status in ["Under Verification", "Documents Verified", "DSC Processing", "Documents Received"]:
            in_progress += 1
            pending_commission += comm
        else:
            pending_docs += 1
            pending_commission += comm

    return {
        "agentCode": agent_code,
        "commissionRate": agent.get("commissionRate", 15.0),
        "totalClients": total_clients,
        "completedOrders": completed,
        "inProgressOrders": in_progress,
        "pendingDocsOrders": pending_docs,
        "totalCommissionEarned": round(total_commission, 2),
        "pendingCommission": round(pending_commission, 2),
    }


# ================= CLIENT TRACKING =================
@agent_router.get("/clients")
async def agent_get_clients(
    status: Optional[str] = None,
    search: Optional[str] = None,
    agent: dict = Depends(get_current_agent),
):
    query = {"agentCode": agent["agentCode"]}

    raw_orders = await db.orders.find(query, {"_id": 0}).sort("createdAt", -1).to_list(1000)

    # Gather all doc counts for these orders
    order_ids = [o["orderId"] for o in raw_orders]
    doc_records = await db.documents.find(
        {"orderId": {"$in": order_ids}},
        {"_id": 0, "orderId": 1, "documentType": 1, "verificationStatus": 1}
    ).to_list(2000)

    docs_by_order = {}
    for d in doc_records:
        docs_by_order.setdefault(d["orderId"], []).append(d)

    results = []
    for o in raw_orders:
        o_docs = docs_by_order.get(o["orderId"], [])
        progress = compute_workflow_progress(o, len(o_docs))

        comm = o.get("agentCommission")
        if comm is None:
            comm = round(o.get("totalAmount", 0) * (agent.get("commissionRate", 15.0) / 100.0))

        client_item = {
            "orderId": o["orderId"],
            "clientName": o.get("customerName") or o.get("applicant", {}).get("name") or "Client",
            "mobile": o.get("mobile", "—"),
            "email": o.get("email", "—"),
            "productId": o.get("productId"),
            "productName": o.get("productName", "DSC"),
            "productCategory": o.get("productCategory", "DSC"),
            "totalAmount": o.get("totalAmount", 0),
            "agentCommission": comm,
            "orderStatus": o.get("orderStatus", "Payment Pending"),
            "paymentStatus": o.get("paymentStatus", "Payment Pending"),
            "documentStatus": o.get("documentStatus", "Pending"),
            "workflowStage": o.get("workflowStage", "Application Created"),
            "createdAt": o.get("createdAt"),
            "updatedAt": o.get("updatedAt"),
            "requiredDocuments": o.get("requiredDocuments", []),
            "uploadedDocuments": [
                {"documentType": d["documentType"], "verificationStatus": d.get("verificationStatus", "Uploaded")}
                for d in o_docs
            ],
            "documentsCount": len(o_docs),
            "progress": progress,
        }

        # Filter by status if requested
        if status:
            s_low = status.lower()
            if s_low == "completed" and progress["currentStep"] != 5:
                continue
            elif s_low == "inprogress" and progress["currentStep"] not in [3, 4]:
                continue
            elif s_low == "pending" and progress["currentStep"] not in [1, 2]:
                continue

        # Filter by search
        if search:
            s_q = search.lower().strip()
            name_match = s_q in client_item["clientName"].lower()
            mob_match = s_q in str(client_item["mobile"]).lower()
            oid_match = s_q in client_item["orderId"].lower()
            prod_match = s_q in client_item["productName"].lower()
            if not (name_match or mob_match or oid_match or prod_match):
                continue

        results.append(client_item)

    return results


# ================= DIRECT CLIENT ORDER BY AGENT =================
@agent_router.post("/clients/order")
async def agent_create_client_order(payload: AgentClientOrderReq, agent: dict = Depends(get_current_agent)):
    client_mobile = payload.clientMobile.strip()
    if not client_mobile or len(client_mobile) < 10:
        raise HTTPException(400, "Valid 10-digit client mobile required")
    if not payload.clientName.strip():
        raise HTTPException(400, "Client name is required")

    product = await db.products.find_one({"id": payload.productId, "active": True}, {"_id": 0})
    if not product:
        raise HTTPException(404, "Selected DSC product not found")

    # Ensure user exists for client
    user = await db.users.find_one({"mobile": client_mobile})
    if not user:
        sd_id_doc = await gen_simpldsc_id()
        user_id = new_id()
        user = {
            "id": user_id,
            "simplDscId": sd_id_doc["simplDscId"],
            "mobile": client_mobile,
            "name": payload.clientName.strip(),
            "email": payload.clientEmail.strip().lower() if payload.clientEmail else None,
            "profileCompleted": True,
            "billing": {},
            "createdAt": now_iso(),
            "updatedAt": now_iso(),
        }
        await db.users.insert_one(user)

    order_id = await gen_order_id()
    inv_no = await gen_invoice_no()

    base_amount = float(product.get("basePrice", 1499))
    gst = round(base_amount * 0.18, 2)
    prof_fee = float(product.get("professionalFee", 299))
    total_amount = round(base_amount + gst + prof_fee, 2)

    # Commission calculation (e.g. 15% of base price or configured rate)
    rate = agent.get("commissionRate", 15.0) / 100.0
    commission = round(base_amount * rate, 2)

    order_doc = {
        "id": new_id(),
        "orderId": order_id,
        "simplDscId": user["simplDscId"],
        "userId": user["id"],
        "productId": product["id"],
        "productName": product["name"],
        "productCategory": product["category"],
        "customerName": payload.clientName.strip(),
        "mobile": client_mobile,
        "email": payload.clientEmail or user.get("email"),
        "amount": base_amount,
        "discount": 0.0,
        "gst": gst,
        "professionalFee": prof_fee,
        "totalAmount": total_amount,
        "currency": "INR",
        "agentCode": agent["agentCode"],
        "agentId": agent["id"],
        "agentName": agent["name"],
        "agentCommission": commission,
        "paymentStatus": "Payment Successful" if payload.collectPaymentDirectly else "Payment Pending",
        "documentStatus": "Pending",
        "orderStatus": "Documents Pending",
        "workflowStage": "Documents Submitted" if not payload.collectPaymentDirectly else "Payment Successful",
        "invoiceNo": inv_no,
        "requiredDocuments": product.get("requiredDocuments", ["PAN Card", "Aadhaar Card", "Passport Size Photo"]),
        "applicant": {
            "name": payload.clientName.strip(),
            "mobile": client_mobile,
            "email": payload.clientEmail or "",
            **payload.applicant,
        },
        "shipping": {
            "name": payload.clientName.strip(),
            "mobile": client_mobile,
            "deliveryStatus": "Not Dispatched",
            **payload.shipping,
        },
        "dscId": None,
        "createdAt": now_iso(),
        "updatedAt": now_iso(),
    }
    await db.orders.insert_one(order_doc)

    # Create Invoice
    await db.invoices.insert_one({
        "id": new_id(),
        "invoiceNo": inv_no,
        "orderId": order_id,
        "userId": user["id"],
        "simplDscId": user["simplDscId"],
        "amount": base_amount,
        "discount": 0.0,
        "gst": gst,
        "professionalFee": prof_fee,
        "totalAmount": total_amount,
        "productName": product["name"],
        "customerName": payload.clientName.strip(),
        "billing": user.get("billing", {}),
        "status": "Paid" if payload.collectPaymentDirectly else "Pending",
        "createdAt": now_iso(),
    })

    # Order history log
    await db.order_status_history.insert_one({
        "id": new_id(),
        "orderId": order_id,
        "oldStatus": None,
        "newStatus": "Documents Pending",
        "changedBy": f"Agent {agent['name']} ({agent['agentCode']})",
        "timestamp": now_iso(),
        "notes": "Client order booked directly by DSC Agent",
    })

    await notify(
        "customer",
        user["id"],
        "order_created",
        "DSC Order Initiated by Your Agent",
        f"Your DSC application ({order_id}) has been created by your Agent {agent['name']}. Please upload documents.",
        "order",
        order_id,
    )

    return {
        "ok": True,
        "order": clean(order_doc),
        "message": f"Order {order_id} created successfully for {payload.clientName}!",
    }


# ================= UPLOAD CLIENT DOCUMENTS BY AGENT =================
@agent_router.post("/orders/{order_id}/documents")
async def agent_upload_client_doc(
    order_id: str,
    documentType: str = Form(...),
    file: UploadFile = File(...),
    agent: dict = Depends(get_current_agent),
):
    order = await db.orders.find_one({"orderId": order_id, "agentCode": agent["agentCode"]})
    if not order:
        raise HTTPException(404, "Order not found or not registered under your agent code")

    allowed = {"application/pdf", "image/jpeg", "image/jpg", "image/png"}
    if file.content_type not in allowed:
        raise HTTPException(400, "Unsupported file format. Please upload PDF, JPG, or PNG.")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(400, "File size exceeds 5MB limit")

    b64 = base64.b64encode(content).decode()
    # Delete previous document of same type
    await db.documents.delete_many({
        "orderId": order_id,
        "documentType": documentType,
        "verificationStatus": {"$in": ["Pending", "Uploaded", "Rejected", "Re-upload Required"]},
    })

    doc = {
        "id": new_id(),
        "orderId": order_id,
        "userId": order["userId"],
        "simplDscId": order.get("simplDscId"),
        "documentType": documentType,
        "fileName": file.filename,
        "contentType": file.content_type,
        "data": b64,
        "uploadedAt": now_iso(),
        "uploadedBy": f"Agent {agent['name']} ({agent['agentCode']})",
        "verificationStatus": "Uploaded",
        "rejectionReason": None,
        "verifiedBy": None,
        "verifiedAt": None,
    }
    await db.documents.insert_one(doc)

    reqd = order.get("requiredDocuments", [])
    uploaded_types = await db.documents.distinct("documentType", {"orderId": order_id})
    all_up = all(t in uploaded_types for t in reqd) if reqd else True
    new_status = "Documents Received" if all_up else "Documents Pending"

    await db.orders.update_one(
        {"id": order["id"]},
        {"$set": {
            "documentStatus": "Uploaded" if all_up else "Pending",
            "orderStatus": new_status,
            "workflowStage": "Documents Submitted",
            "updatedAt": now_iso(),
        }},
    )

    clean_d = clean(doc)
    clean_d.pop("data", None)
    return {"ok": True, "document": clean_d}


# ================= ORDER DETAILS FOR AGENT =================
@agent_router.get("/orders/{order_id}")
async def agent_get_order_details(order_id: str, agent: dict = Depends(get_current_agent)):
    order = await db.orders.find_one({"orderId": order_id, "agentCode": agent["agentCode"]}, {"_id": 0})
    if not order:
        raise HTTPException(404, "Order not found")

    docs = await db.documents.find({"orderId": order_id}, {"_id": 0, "data": 0}).to_list(100)
    history = await db.order_status_history.find({"orderId": order_id}, {"_id": 0}).sort("timestamp", -1).to_list(100)
    progress = compute_workflow_progress(order, len(docs))

    return {
        "order": order,
        "documents": docs,
        "history": history,
        "progress": progress,
    }
