"""SimplDSC comprehensive backend tests."""
import os
import io
import time
import requests
import pytest

BASE = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE:
    # fallback: read from frontend/.env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE = line.split("=", 1)[1].strip()
                break
BASE = BASE.rstrip("/")
API = BASE + "/api"

ADMIN_EMAIL = "admin@simpldsc.in"
ADMIN_PASSWORD = "Simpl@DSC#Admin2026Kx7q"

# Shared session state
_state = {}


# ---------- PUBLIC ----------
def test_root():
    r = requests.get(f"{API}/")
    assert r.status_code == 200
    assert r.json()["service"] == "SimplDSC"


def test_products_list():
    r = requests.get(f"{API}/products")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) >= 6, f"Expected >=6 seeded products, got {len(data)}"
    _state["products"] = data


def test_product_by_slug():
    r = requests.get(f"{API}/products/class-3-dsc")
    assert r.status_code == 200
    assert r.json()["slug"] == "class-3-dsc"


def test_partner_cas():
    r = requests.get(f"{API}/partner-cas")
    assert r.status_code == 200
    assert len(r.json()) >= 10


def test_faqs():
    r = requests.get(f"{API}/faqs")
    assert r.status_code == 200
    assert len(r.json()) >= 13


def test_settings():
    r = requests.get(f"{API}/settings")
    assert r.status_code == 200
    assert "contact" in r.json()


def test_dsc_finder_business():
    r = requests.post(f"{API}/dsc-finder", json={"purpose": "business"})
    assert r.status_code == 200
    data = r.json()
    assert "recommended" in data and len(data["recommended"]) > 0


def test_contact_submit():
    r = requests.post(f"{API}/contact", json={
        "name": "TEST_User", "email": "test@x.com", "phone": "9999999999", "message": "hi"})
    assert r.status_code == 200 and r.json()["ok"] is True


def test_partnership_submit():
    r = requests.post(f"{API}/partnership", json={
        "name": "TEST_Partner", "business": "Test Biz", "mobile": "9999999998",
        "email": "p@x.com", "city": "BBSR", "state": "OD", "businessType": "CA"})
    assert r.status_code == 200


# ---------- OTP AUTH ----------
def test_send_otp_and_verify_new_user():
    mobile = "9" + str(int(time.time()))[-9:]  # unique mobile
    _state["mobile"] = mobile
    r = requests.post(f"{API}/auth/send-otp", json={"mobile": mobile})
    assert r.status_code == 200
    data = r.json()
    assert "sessionId" in data and "devOtp" in data
    sess = data["sessionId"]
    otp = data["devOtp"]

    v = requests.post(f"{API}/auth/verify-otp", json={"mobile": mobile, "otp": otp, "sessionId": sess})
    assert v.status_code == 200, v.text
    body = v.json()
    assert "token" in body and body["isNew"] is True
    assert body["user"]["simplDscId"].startswith("SPLDSC-")
    parts = body["user"]["simplDscId"].split("-")
    assert len(parts) == 4 and int(parts[3]) >= 157535
    _state["token"] = body["token"]
    _state["user"] = body["user"]


def test_complete_profile_and_me():
    tok = _state["token"]
    r = requests.post(f"{API}/auth/complete-profile",
                      json={"name": "TEST User", "email": "testuser@example.com"},
                      headers={"Authorization": f"Bearer {tok}"})
    assert r.status_code == 200
    assert r.json()["user"]["name"] == "TEST User"

    me = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {tok}"})
    assert me.status_code == 200
    assert me.json()["user"]["name"] == "TEST User"


def test_invalid_otp():
    r = requests.post(f"{API}/auth/send-otp", json={"mobile": "9111111111"})
    sess = r.json()["sessionId"]
    v = requests.post(f"{API}/auth/verify-otp", json={"mobile": "9111111111", "otp": "000000", "sessionId": sess})
    # unlikely 000000 == real OTP; if it collides skip
    if v.status_code == 200:
        pytest.skip("random collision")
    assert v.status_code == 400


# ---------- ORDERS + PAYMENT ----------
def _auth():
    return {"Authorization": f"Bearer {_state['token']}"}


def test_coupon_validate():
    prod = _state["products"][0]
    r = requests.get(f"{API}/coupons/validate",
                     params={"code": "WELCOME10", "productId": prod["id"]},
                     headers=_auth())
    assert r.status_code == 200
    p = r.json()
    assert p["discount"] > 0
    assert p["totalAmount"] < p["amount"]


def test_create_order_and_verify_payment():
    prod = _state["products"][1]  # class-3-dsc
    r = requests.post(f"{API}/orders", json={"productId": prod["id"], "couponCode": "WELCOME10",
                                             "applicant": {"fullName": "TEST User"}},
                      headers=_auth())
    assert r.status_code == 200, r.text
    body = r.json()
    order = body["order"]
    assert order["orderId"].startswith("SD-")
    assert body["razorpay"]["mock"] is True
    _state["order"] = order

    # verify payment (mock)
    v = requests.post(f"{API}/orders/verify-payment", json={
        "orderId": order["orderId"], "razorpayOrderId": order["razorpayOrderId"],
        "razorpayPaymentId": "pay_mock_xyz", "razorpaySignature": "mock_sig_test"},
                      headers=_auth())
    assert v.status_code == 200, v.text
    inv = v.json()["invoiceNo"]
    assert inv.startswith("INV-")

    # GET order back to verify persistence
    detail = requests.get(f"{API}/customer/orders/{order['orderId']}", headers=_auth())
    assert detail.status_code == 200
    d = detail.json()["order"]
    assert d["paymentStatus"] == "Payment Successful"
    assert d["orderStatus"] == "Documents Pending"


def test_verify_payment_invalid_sig():
    prod = _state["products"][0]
    r = requests.post(f"{API}/orders", json={"productId": prod["id"]}, headers=_auth())
    order = r.json()["order"]
    v = requests.post(f"{API}/orders/verify-payment", json={
        "orderId": order["orderId"], "razorpayOrderId": order["razorpayOrderId"],
        "razorpayPaymentId": "pay_x", "razorpaySignature": "bad_sig"},
                      headers=_auth())
    assert v.status_code == 400


# ---------- DOCUMENTS ----------
def test_upload_document_pdf():
    order_id = _state["order"]["orderId"]
    files = {"file": ("test.pdf", b"%PDF-1.4 minimal\n", "application/pdf")}
    r = requests.post(f"{API}/customer/orders/{order_id}/documents",
                      data={"documentType": "PAN"}, files=files, headers=_auth())
    assert r.status_code == 200, r.text
    _state["doc_order_id"] = order_id


def test_upload_document_invalid_type():
    order_id = _state["order"]["orderId"]
    files = {"file": ("test.exe", b"MZ", "application/octet-stream")}
    r = requests.post(f"{API}/customer/orders/{order_id}/documents",
                      data={"documentType": "PAN"}, files=files, headers=_auth())
    assert r.status_code == 400


def test_customer_b_cannot_access_customer_a_order():
    # create second customer
    mobile = "8" + str(int(time.time()))[-9:]
    r = requests.post(f"{API}/auth/send-otp", json={"mobile": mobile})
    sess = r.json()["sessionId"]; otp = r.json()["devOtp"]
    v = requests.post(f"{API}/auth/verify-otp", json={"mobile": mobile, "otp": otp, "sessionId": sess})
    tok2 = v.json()["token"]
    r = requests.get(f"{API}/customer/orders/{_state['order']['orderId']}",
                     headers={"Authorization": f"Bearer {tok2}"})
    assert r.status_code == 404


# ---------- ADMIN ----------
def test_admin_login():
    r = requests.post(f"{API}/admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["admin"]["role"] == "super_admin"
    _state["admin_token"] = body["token"]


def _admin_auth():
    return {"Authorization": f"Bearer {_state['admin_token']}"}


def test_admin_dashboard():
    r = requests.get(f"{API}/admin/dashboard", headers=_admin_auth())
    assert r.status_code == 200
    d = r.json()
    for k in ["totalCustomers", "totalOrders", "totalRevenue"]:
        assert k in d


def test_admin_orders_list():
    r = requests.get(f"{API}/admin/orders", headers=_admin_auth())
    assert r.status_code == 200 and len(r.json()) >= 1


def test_admin_order_detail():
    r = requests.get(f"{API}/admin/orders/{_state['order']['orderId']}", headers=_admin_auth())
    assert r.status_code == 200
    d = r.json()
    assert "cas" in d and len(d["cas"]) >= 1


def test_admin_verify_document():
    # find uploaded doc
    r = requests.get(f"{API}/admin/documents", headers=_admin_auth())
    assert r.status_code == 200
    docs = [d for d in r.json() if d["orderId"] == _state["order"]["orderId"]]
    assert docs
    doc_id = docs[0]["id"]
    v = requests.put(f"{API}/admin/documents/{doc_id}/verify", json={"action": "verify"}, headers=_admin_auth())
    assert v.status_code == 200


def test_admin_assign_ca_and_status():
    order_id = _state["order"]["orderId"]
    detail = requests.get(f"{API}/admin/orders/{order_id}", headers=_admin_auth()).json()
    ca_id = detail["cas"][0]["id"]
    r = requests.put(f"{API}/admin/orders/{order_id}/ca", json={"caId": ca_id}, headers=_admin_auth())
    assert r.status_code == 200
    r = requests.put(f"{API}/admin/orders/{order_id}/status",
                     json={"orderStatus": "DSC Processing"}, headers=_admin_auth())
    assert r.status_code == 200


def test_admin_issue_dsc_and_expiry_reminder_idempotent():
    order_id = _state["order"]["orderId"]
    from datetime import datetime, timezone, timedelta
    issued = datetime.now(timezone.utc).isoformat()
    expiry = (datetime.now(timezone.utc) + timedelta(days=10)).isoformat()
    r = requests.post(f"{API}/admin/orders/{order_id}/issue-dsc",
                      json={"dscType": "Class 3", "certificateNumber": "CERT-TEST-1",
                            "issuedDate": issued, "expiryDate": expiry},
                      headers=_admin_auth())
    assert r.status_code == 200, r.text
    _state["dsc_id"] = r.json()["dsc"]["id"]

    # customer dsc list
    dscs = requests.get(f"{API}/customer/dscs", headers=_auth()).json()
    assert any(d["id"] == _state["dsc_id"] for d in dscs)
    assert dscs[0]["computedStatus"] in ("Active", "Expiring Soon")

    # run expiry check twice, expect no duplicates
    c1 = requests.post(f"{API}/admin/run-expiry-check", headers=_admin_auth())
    assert c1.status_code == 200
    created1 = c1.json()["created"]
    c2 = requests.post(f"{API}/admin/run-expiry-check", headers=_admin_auth())
    created2 = c2.json()["created"]
    assert created2 == 0, f"expiry check not idempotent, second run created {created2}"
    assert created1 >= 1


def test_admin_expiry_dashboard():
    r = requests.get(f"{API}/admin/expiry-dashboard", headers=_admin_auth())
    assert r.status_code == 200
    assert "in15" in r.json()


def test_renewal_request():
    r = requests.post(f"{API}/customer/dscs/{_state['dsc_id']}/renew", headers=_auth())
    assert r.status_code == 200
    # second call should fail
    r2 = requests.post(f"{API}/customer/dscs/{_state['dsc_id']}/renew", headers=_auth())
    assert r2.status_code == 400


# ---------- ADMIN CRUD ----------
def test_product_crud():
    r = requests.post(f"{API}/admin/products",
                      json={"name": "TEST_Product", "category": "Class 2 DSC", "slug": "test-product-x",
                            "description": "test", "price": 500, "validity": "1 Year"},
                      headers=_admin_auth())
    assert r.status_code == 200
    pid = r.json()["product"]["id"]
    u = requests.put(f"{API}/admin/products/{pid}", json={"price": 600}, headers=_admin_auth())
    assert u.status_code == 200 and u.json()["product"]["price"] == 600
    d = requests.delete(f"{API}/admin/products/{pid}", headers=_admin_auth())
    assert d.status_code == 200


def test_coupon_create():
    r = requests.post(f"{API}/admin/coupons",
                      json={"code": "TESTCPN", "discountType": "percentage", "value": 5},
                      headers=_admin_auth())
    assert r.status_code == 200
    cid = r.json()["coupon"]["id"]
    requests.delete(f"{API}/admin/coupons/{cid}", headers=_admin_auth())


def test_audit_logs_and_analytics():
    r = requests.get(f"{API}/admin/audit-logs", headers=_admin_auth())
    assert r.status_code == 200 and len(r.json()) >= 1
    a = requests.get(f"{API}/admin/analytics", headers=_admin_auth())
    assert a.status_code == 200 and "revenue" in a.json()


def test_export_orders_csv():
    r = requests.get(f"{API}/admin/export/orders", headers=_admin_auth())
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("text/csv")
    assert "orderId" in r.text


def test_staff_create():
    r = requests.post(f"{API}/admin/staff",
                      json={"email": f"teststaff_{int(time.time())}@x.com", "name": "T",
                            "password": "TestPass123!", "role": "order_staff"},
                      headers=_admin_auth())
    assert r.status_code == 200


# ---------- SUPPORT ----------
def test_ticket_create():
    r = requests.post(f"{API}/customer/tickets",
                      json={"subject": "TEST issue", "message": "hello", "category": "General"},
                      headers=_auth())
    assert r.status_code == 200
    assert r.json()["ticket"]["ticketId"].startswith("TKT-")
