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

CASHFREE_API_VERSION = "2023-08-01"


def get_credentials():
    app_id = os.environ.get("CASHFREE_APP_ID", "").strip()
    secret_key = os.environ.get("CASHFREE_SECRET_KEY", "").strip()
    env = os.environ.get("CASHFREE_ENV", "SANDBOX").strip().upper()
    return app_id, secret_key, env


def get_base_url() -> str:
    _, _, env = get_credentials()
    return "https://api.cashfree.com/pg" if env == "PRODUCTION" else "https://sandbox.cashfree.com/pg"


def is_live() -> bool:
    app_id, secret_key, _ = get_credentials()
    return bool(app_id and secret_key)


def get_headers() -> dict:
    app_id, secret_key, _ = get_credentials()
    return {
        "x-client-id": app_id,
        "x-client-secret": secret_key,
        "x-api-version": CASHFREE_API_VERSION,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


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
    import re

    clean_oid = re.sub(r"[^a-zA-Z0-9_-]", "-", str(order_id))[:45]
    clean_cid = re.sub(r"[^a-zA-Z0-9_-]", "_", str(customer_id or uuid.uuid4()))[:50]

    raw_phone = "".join(filter(str.isdigit, customer_phone or ""))
    if len(raw_phone) >= 10:
        clean_phone = raw_phone[-10:]
    else:
        clean_phone = "9876543210"

    clean_email = customer_email or "customer@simpldsc.com"
    clean_name = (customer_name or "SimpleDSC Customer")[:100]
    clean_amount = round(float(amount), 2)

    _, _, env = get_credentials()

    if not is_live():
        # Mock mode for testing without active Cashfree keys
        mock_session_id = f"session_mock_{uuid.uuid4().hex}"
        logger.info(f"[CASHFREE MOCK] Created mock order {clean_oid} session {mock_session_id}")
        return {
            "cf_order_id": f"cf_mock_{clean_oid}",
            "order_id": clean_oid,
            "order_status": "ACTIVE",
            "payment_session_id": mock_session_id,
            "order_amount": clean_amount,
            "order_currency": "INR",
            "mock": True,
            "environment": env,
        }

    payload = {
        "order_id": clean_oid,
        "order_amount": clean_amount,
        "order_currency": "INR",
        "customer_details": {
            "customer_id": clean_cid,
            "customer_name": clean_name,
            "customer_email": clean_email,
            "customer_phone": clean_phone,
        },
        "order_meta": {
            "return_url": return_url or f"https://www.simpldsc.com/dashboard?order_id={clean_oid}",
        },
        "order_note": (order_note or f"SimpleDSC Order {clean_oid}")[:200],
    }
    # Cashfree strictly requires notify_url to be HTTPS. Never pass http:// or localhost.
    if notify_url and str(notify_url).startswith("https://"):
        payload["order_meta"]["notify_url"] = str(notify_url)

    try:
        url = f"{get_base_url()}/orders"
        status_code, data, raw_text = _http_request("POST", url, get_headers(), payload, timeout=30)
        if status_code not in (200, 201):
            error_msg = data.get("message") or data.get("sub_code") or raw_text
            logger.error(f"Cashfree create order error {status_code}: {error_msg}")
            raise RuntimeError(f"Cashfree API Error ({status_code}): {error_msg}")

        return {
            "cf_order_id": data.get("cf_order_id"),
            "order_id": data.get("order_id", clean_oid),
            "order_status": data.get("order_status", "ACTIVE"),
            "payment_session_id": data.get("payment_session_id"),
            "order_amount": data.get("order_amount", clean_amount),
            "order_currency": data.get("order_currency", "INR"),
            "mock": False,
            "environment": env,
        }
    except Exception as e:
        logger.error(f"Failed to communicate with Cashfree: {e}")
        raise RuntimeError(f"Cashfree Error: {e}")


def get_order(order_id: str) -> dict:
    """Fetch order status from Cashfree."""
    if not is_live():
        return {
            "order_id": order_id,
            "order_status": "PAID",
            "mock": True,
        }

    url = f"{get_base_url()}/orders/{order_id}"
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

    url = f"{get_base_url()}/orders/{order_id}/payments"
    status_code, data, raw_text = _http_request("GET", url, get_headers(), timeout=30)
    if status_code != 200:
        logger.error(f"Cashfree get payments error {status_code}: {raw_text}")
        return []
    return data if isinstance(data, list) else []


def create_upi_qr(payment_session_id: str, order_id: str, amount: float = 0.0) -> dict:
    """Generate dynamic UPI QR payload for an order via official Cashfree API.
    Never invents or hardcodes any fake UPI ID (e.g. simpldsc@...).
    """
    if not is_live() or not payment_session_id or payment_session_id.startswith("session_mock_"):
        return {
            "qr_string": None,
            "use_hosted_checkout": True,
            "mock": True
        }

    url = f"{get_base_url()}/orders/sessions"
    payload = {
        "payment_session_id": payment_session_id,
        "payment_method": {
            "upi": {
                "channel": "qrcode"
            }
        }
    }
    status_code, data, raw_text = _http_request("POST", url, get_headers(), payload)
    if status_code in (200, 201):
        data_payload = data.get("data", {}).get("payload", {})
        qr_string = data_payload.get("qrcode") or data.get("payload", {}).get("qrcode")
        return {"qr_string": qr_string, "raw": data, "use_hosted_checkout": False, "mock": False}
    else:
        logger.info(f"[Cashfree QR Sessions Response {status_code}]: {raw_text}. Routing through Cashfree Hosted Modal Checkout.")
        return {
            "qr_string": None,
            "use_hosted_checkout": True,
            "mock": False
        }


def create_upi_intent(payment_session_id: str, order_id: str, upi_provider: str = None) -> dict:
    """Generate dynamic UPI app intent payload (GPay, PhonePe, Paytm, universal intent)
    via official Cashfree API v2023-08-01. Never invents synthetic merchant UPI IDs.
    All settlements route to the registered Punjab National Bank (PNB) account of
    TSMTX SOLUTIONS PRIVATE LIMITED.
    """
    if not is_live() or not payment_session_id or payment_session_id.startswith("session_mock_"):
        return {
            "intent_url": None,
            "gpay_url": None,
            "phonepe_url": None,
            "paytm_url": None,
            "use_sdk": True,
            "mock": True
        }

    url = f"{get_base_url()}/orders/sessions"
    payload = {
        "payment_session_id": payment_session_id,
        "payment_method": {
            "upi": {
                "channel": "intent"
            }
        }
    }

    status_code, data, raw_text = _http_request("POST", url, get_headers(), payload)
    if status_code in (200, 201):
        data_payload = data.get("data", {}).get("payload", {})
        intent_url = data_payload.get("intent_url") or data.get("payload", {}).get("intent_url")
        gpay_url = data_payload.get("gpay") or data_payload.get("gpay_link")
        phonepe_url = data_payload.get("phonepe") or data_payload.get("phonepe_link")
        paytm_url = data_payload.get("paytm") or data_payload.get("paytm_link")
        bhim_url = data_payload.get("bhim") or data_payload.get("bhim_link")
        return {
            "intent_url": intent_url,
            "gpay_url": gpay_url,
            "phonepe_url": phonepe_url,
            "paytm_url": paytm_url,
            "bhim_url": bhim_url,
            "raw": data,
            "use_sdk": False,
            "mock": False
        }
    else:
        logger.info(f"[Cashfree Intent Sessions Response {status_code}]: {raw_text}")
        return {
            "intent_url": None,
            "gpay_url": None,
            "phonepe_url": None,
            "paytm_url": None,
            "use_sdk": True,
            "mock": False
        }


def verify_webhook_signature(signature: str, timestamp: str, raw_body: bytes) -> bool:
    """Verify Cashfree webhook signature using HMAC SHA256 of timestamp + raw_body."""
    _, secret, _ = get_credentials()
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
