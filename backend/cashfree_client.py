"""Cashfree Payment Gateway Integration (v2023-08-01) for SimpleDSC.
Handles order creation, status verification, and webhook signature validation.
Supports both Sandbox and Production environments, with local mock fallback.
"""
import base64
import hashlib
import hmac
import json
import logging
import os
import uuid

try:
    import requests
except ImportError:
    requests = None
    import urllib.error
    import urllib.request

logger = logging.getLogger("simpldsc.cashfree")

CASHFREE_APP_ID = os.environ.get("CASHFREE_APP_ID", "").strip()
CASHFREE_SECRET_KEY = os.environ.get("CASHFREE_SECRET_KEY", "").strip()
CASHFREE_ENV = os.environ.get("CASHFREE_ENV", "SANDBOX").strip().upper()
CF_ENV = CASHFREE_ENV
CASHFREE_API_VERSION = "2023-08-01"

# Determine live / configured status
IS_CONFIGURED = bool(CASHFREE_APP_ID and CASHFREE_SECRET_KEY)
IS_PRODUCTION = CASHFREE_ENV == "PRODUCTION"

BASE_URL = (
    "https://api.cashfree.com/pg"
    if IS_PRODUCTION
    else "https://sandbox.cashfree.com/pg"
)


def is_live() -> bool:
    app_id = os.environ.get("CASHFREE_APP_ID", "").strip() or CASHFREE_APP_ID
    secret = os.environ.get("CASHFREE_SECRET_KEY", "").strip() or CASHFREE_SECRET_KEY
    return bool(app_id and secret)


def _http_request(method: str, url: str, headers: dict, data_dict: dict = None, timeout: int = 30):
    if requests is not None:
        if method.upper() == "POST":
            resp = requests.post(url, json=data_dict, headers=headers, timeout=timeout)
        else:
            resp = requests.get(url, headers=headers, timeout=timeout)
        try:
            return resp.status_code, resp.json(), resp.text
        except Exception:
            return resp.status_code, {}, resp.text
    else:
        req_data = json.dumps(data_dict).encode("utf-8") if data_dict is not None else None
        req = urllib.request.Request(url, data=req_data, headers=headers, method=method.upper())
        try:
            with urllib.request.urlopen(req, timeout=timeout) as response:
                body = response.read().decode("utf-8")
                try:
                    return response.status, json.loads(body), body
                except Exception:
                    return response.status, {}, body
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8")
            try:
                return e.code, json.loads(err_body), err_body
            except Exception:
                return e.code, {}, err_body


def get_headers() -> dict:
    return {
        "x-client-id": CASHFREE_APP_ID,
        "x-client-secret": CASHFREE_SECRET_KEY,
        "x-api-version": CASHFREE_API_VERSION,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


def create_order(
    order_id: str,
    amount: float,
    customer_id: str,
    customer_name: str = None,
    customer_email: str = None,
    customer_phone: str = None,
    return_url: str = None,
    notify_url: str = None,
    order_note: str = None,
) -> dict:
    """Create a Cashfree payment order and return payment_session_id."""
    clean_phone = "".join(filter(str.isdigit, customer_phone or ""))
    if len(clean_phone) > 10:
        clean_phone = clean_phone[-10:]
    elif len(clean_phone) < 10:
        clean_phone = "9999999999"

    clean_email = customer_email or "customer@simpldsc.com"
    clean_name = customer_name or "SimpleDSC Customer"
    clean_amount = round(float(amount), 2)

    if not is_live():
        # Mock mode for testing without active Cashfree keys
        mock_session_id = f"session_mock_{uuid.uuid4().hex}"
        logger.info(f"[CASHFREE MOCK] Created mock order {order_id} session {mock_session_id}")
        return {
            "cf_order_id": f"cf_mock_{order_id}",
            "order_id": order_id,
            "order_status": "ACTIVE",
            "payment_session_id": mock_session_id,
            "order_amount": clean_amount,
            "order_currency": "INR",
            "mock": True,
            "environment": CASHFREE_ENV,
        }

    payload = {
        "order_id": order_id,
        "order_amount": clean_amount,
        "order_currency": "INR",
        "customer_details": {
            "customer_id": customer_id or str(uuid.uuid4()),
            "customer_name": clean_name[:100],
            "customer_email": clean_email,
            "customer_phone": clean_phone,
        },
        "order_meta": {
            "return_url": return_url or f"https://www.simpldsc.com/dashboard?order_id={order_id}",
        },
        "order_note": (order_note or f"SimpleDSC Order {order_id}")[:200],
    }
    if notify_url:
        payload["order_meta"]["notify_url"] = notify_url

    try:
        url = f"{BASE_URL}/orders"
        status_code, data, raw_text = _http_request("POST", url, get_headers(), payload, timeout=30)
        if status_code not in (200, 201):
            error_msg = data.get("message") or raw_text
            logger.error(f"Cashfree create order error {status_code}: {error_msg}")
            raise RuntimeError(f"Cashfree Error: {error_msg}")

        return {
            "cf_order_id": data.get("cf_order_id"),
            "order_id": data.get("order_id", order_id),
            "order_status": data.get("order_status", "ACTIVE"),
            "payment_session_id": data.get("payment_session_id"),
            "order_amount": data.get("order_amount", clean_amount),
            "order_currency": data.get("order_currency", "INR"),
            "mock": False,
            "environment": CASHFREE_ENV,
        }
    except Exception as e:
        logger.error(f"Failed to connect to Cashfree: {e}")
        raise RuntimeError(f"Failed to communicate with Cashfree: {e}")


def get_order(order_id: str) -> dict:
    """Fetch order status from Cashfree."""
    if not is_live():
        return {
            "order_id": order_id,
            "order_status": "PAID",
            "mock": True,
        }

    url = f"{BASE_URL}/orders/{order_id}"
    status_code, data, raw_text = _http_request("GET", url, get_headers(), timeout=30)
    if status_code != 200:
        logger.error(f"Cashfree get order error {status_code}: {raw_text}")
        raise RuntimeError(f"Could not retrieve order from Cashfree: {raw_text}")
    return data


def get_order_payments(order_id: str) -> list:
    """Fetch all payments for a Cashfree order."""
    if not is_live():
        return [
            {
                "cf_payment_id": f"cf_pay_mock_{uuid.uuid4().hex[:12]}",
                "order_id": order_id,
                "payment_status": "SUCCESS",
                "payment_amount": 0.0,
                "payment_currency": "INR",
                "payment_method": {"upi": {"channel": "mock"}},
                "payment_time": None,
                "mock": True,
            }
        ]

    url = f"{BASE_URL}/orders/{order_id}/payments"
    status_code, data, raw_text = _http_request("GET", url, get_headers(), timeout=30)
    if status_code != 200:
        logger.error(f"Cashfree get payments error {status_code}: {raw_text}")
        return []
    return data if isinstance(data, list) else []


def verify_webhook_signature(signature: str, timestamp: str, raw_body: bytes) -> bool:
    """Verify Cashfree webhook signature using HMAC SHA256 of timestamp + raw_body."""
    secret = os.environ.get("CASHFREE_SECRET_KEY", "").strip() or CASHFREE_SECRET_KEY
    if not secret:
        # If in mock mode without secret, accept mock signatures
        return signature.startswith("mock_sig_") if signature else False

    if not signature or not timestamp or not raw_body:
        return False

    try:
        body_bytes = raw_body if isinstance(raw_body, bytes) else str(raw_body).encode("utf-8")
        data_to_sign = str(timestamp).encode("utf-8") + body_bytes
        generated_signature = base64.b64encode(
            hmac.new(
                secret.encode("utf-8"),
                data_to_sign,
                hashlib.sha256,
            ).digest()
        ).decode("utf-8")
        return hmac.compare_digest(generated_signature, signature)
    except Exception as e:
        logger.error(f"Cashfree signature verification exception: {e}")
        return False
