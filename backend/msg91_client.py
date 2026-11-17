"""
MSG91 SMS OTP Verification Client for SimpleDSC.
Integrates MSG91 SendOTP v5 API (https://control.msg91.com/api/v5/otp).
Handles send, verify, and resend operations with rate limiting and local development fallback.
"""
import os
import json
import logging
import urllib.request
import urllib.error
import urllib.parse

try:
    import requests
except ImportError:
    requests = None

logger = logging.getLogger("simpldsc.msg91")

MSG91_AUTH_KEY = os.environ.get("MSG91_AUTH_KEY", "").strip()
MSG91_TEMPLATE_ID = os.environ.get("MSG91_TEMPLATE_ID", "").strip()
MSG91_SENDER_ID = os.environ.get("MSG91_SENDER_ID", "").strip()
DEV_OTP_MODE = os.environ.get("DEV_OTP_MODE", "true").strip().lower() in ("true", "1", "yes")

BASE_URL = "https://control.msg91.com/api/v5/otp"


def is_configured() -> bool:
    """Return True if MSG91 credentials are configured and dev mode is not active."""
    auth_key = os.environ.get("MSG91_AUTH_KEY", "").strip() or MSG91_AUTH_KEY
    template_id = os.environ.get("MSG91_TEMPLATE_ID", "").strip() or MSG91_TEMPLATE_ID
    dev_mode = os.environ.get("DEV_OTP_MODE", "true").strip().lower() in ("true", "1", "yes")
    # If keys are empty or dev_mode is true, skip MSG91 and show OTP on screen
    return bool(auth_key and template_id and not dev_mode)


def format_mobile(mobile: str) -> str:
    """Normalize mobile number into Indian format with country code '91' (e.g. 919876543210)."""
    clean = "".join(filter(str.isdigit, mobile or ""))
    if len(clean) == 12 and clean.startswith("91"):
        return clean
    if len(clean) == 11 and clean.startswith("0"):
        clean = clean[1:]
    if len(clean) == 10:
        return f"91{clean}"
    return clean


def _http_request(method: str, url: str, headers: dict, data_dict: dict = None, timeout: int = 15):
    """Robust HTTP request helper using requests or urllib."""
    if requests is not None:
        try:
            if method.upper() == "POST":
                resp = requests.post(url, json=data_dict, headers=headers, timeout=timeout)
            else:
                resp = requests.get(url, headers=headers, timeout=timeout)
            try:
                return resp.status_code, resp.json(), resp.text
            except Exception:
                return resp.status_code, {}, resp.text
        except requests.RequestException as e:
            logger.error(f"[MSG91 HTTP Error via requests]: {e}")
            return 500, {"type": "error", "message": str(e)}, str(e)
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
        except Exception as e:
            logger.error(f"[MSG91 HTTP Error via urllib]: {e}")
            return 500, {"type": "error", "message": str(e)}, str(e)


def send_otp(mobile: str, otp_length: int = 6, expiry_min: int = 10) -> dict:
    """
    Send OTP via MSG91 SendOTP v5 API.
    If not configured or in dev mode, generates dev mock OTP.
    """
    formatted_mobile = format_mobile(mobile)
    auth_key = os.environ.get("MSG91_AUTH_KEY", "").strip() or MSG91_AUTH_KEY
    template_id = os.environ.get("MSG91_TEMPLATE_ID", "").strip() or MSG91_TEMPLATE_ID
    sender_id = os.environ.get("MSG91_SENDER_ID", "").strip() or MSG91_SENDER_ID

    if not is_configured():
        import random
        dev_otp = f"{random.randint(0, 999999):06d}"
        logger.info(f"[MSG91 DEV MOCK] OTP generated for {formatted_mobile}: {dev_otp}")
        return {
            "ok": True,
            "provider": "mock",
            "devMode": True,
            "devOtp": dev_otp,
            "message": "OTP sent successfully (Development Mode)",
        }

    # Live MSG91 call
    params = {
        "template_id": template_id,
        "mobile": formatted_mobile,
        "authkey": auth_key,
        "otp_length": otp_length,
        "otp_expiry": expiry_min,
    }
    query_string = urllib.parse.urlencode(params)
    url = f"{BASE_URL}?{query_string}"

    headers = {
        "authkey": auth_key,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    payload = {}
    if sender_id:
        payload["sender"] = sender_id

    status_code, data, raw_text = _http_request("POST", url, headers, payload)
    msg_type = data.get("type", "").lower()

    if status_code in (200, 201) and msg_type in ("success", ""):
        logger.info(f"[MSG91] OTP sent successfully to {formatted_mobile[:6]}****")
        return {
            "ok": True,
            "provider": "msg91",
            "devMode": False,
            "message": data.get("message", "OTP sent successfully"),
        }
    else:
        err_msg = data.get("message") or raw_text or "Failed to send OTP via SMS provider"
        logger.error(f"[MSG91 Error {status_code}]: {err_msg}")
        return {
            "ok": False,
            "provider": "msg91",
            "devMode": False,
            "message": err_msg,
        }


def verify_otp(mobile: str, otp: str, session_otp: str = None) -> dict:
    """
    Verify OTP with MSG91 (GET /api/v5/otp/verify?otp=...&mobile=...).
    If dev mode, verifies against session_otp.
    """
    formatted_mobile = format_mobile(mobile)
    clean_otp = str(otp).strip()
    auth_key = os.environ.get("MSG91_AUTH_KEY", "").strip() or MSG91_AUTH_KEY

    if not is_configured():
        if session_otp and clean_otp == str(session_otp).strip():
            return {"ok": True, "provider": "mock", "message": "OTP verified successfully"}
        return {"ok": False, "provider": "mock", "message": "Incorrect OTP"}

    # Live MSG91 Verify
    params = {
        "mobile": formatted_mobile,
        "otp": clean_otp,
    }
    query_string = urllib.parse.urlencode(params)
    url = f"{BASE_URL}/verify?{query_string}"
    headers = {
        "authkey": auth_key,
        "Accept": "application/json",
    }

    status_code, data, raw_text = _http_request("GET", url, headers)
    msg_type = data.get("type", "").lower()

    if status_code == 200 and msg_type == "success":
        logger.info(f"[MSG91] OTP verified successfully for {formatted_mobile[:6]}****")
        return {"ok": True, "provider": "msg91", "message": "OTP verified successfully"}
    else:
        err_msg = data.get("message") or "Incorrect or expired OTP"
        logger.warning(f"[MSG91 Verify Failed]: {err_msg}")
        return {"ok": False, "provider": "msg91", "message": err_msg}


def resend_otp(mobile: str, retry_type: str = "text") -> dict:
    """
    Resend OTP via MSG91 (GET /api/v5/otp/retry?retrytype=text&mobile=...).
    """
    formatted_mobile = format_mobile(mobile)
    auth_key = os.environ.get("MSG91_AUTH_KEY", "").strip() or MSG91_AUTH_KEY

    if not is_configured():
        import random
        dev_otp = f"{random.randint(0, 999999):06d}"
        logger.info(f"[MSG91 DEV MOCK] Resent OTP for {formatted_mobile}: {dev_otp}")
        return {
            "ok": True,
            "provider": "mock",
            "devMode": True,
            "devOtp": dev_otp,
            "message": "OTP resent successfully (Development Mode)",
        }

    params = {
        "mobile": formatted_mobile,
        "retrytype": retry_type,
        "authkey": auth_key,
    }
    query_string = urllib.parse.urlencode(params)
    url = f"{BASE_URL}/retry?{query_string}"
    headers = {
        "authkey": auth_key,
        "Accept": "application/json",
    }

    status_code, data, raw_text = _http_request("GET", url, headers)
    msg_type = data.get("type", "").lower()

    if status_code == 200 and msg_type in ("success", ""):
        return {"ok": True, "provider": "msg91", "message": "OTP resent successfully"}
    else:
        err_msg = data.get("message") or raw_text or "Failed to resend OTP"
        return {"ok": False, "provider": "msg91", "message": err_msg}

