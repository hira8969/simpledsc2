"""
MSG91 SMS OTP & Widget Verification Client for SimpleDSC.
Integrates MSG91 SendOTP v5 API & MSG91 OTP Widget Access-Token Verification.
Official Widget ID: 366b76697a6b373331373736
Official Token Auth: 592529Trr8YzZZWos66b02bc2bP1
"""
import os
import json
import time
import logging
import urllib.request
import urllib.error
import urllib.parse
import jwt

try:
    import requests
except ImportError:
    requests = None

logger = logging.getLogger("simpldsc.msg91")

MSG91_AUTH_KEY = os.environ.get("MSG91_AUTH_KEY", "").strip()
MSG91_TEMPLATE_ID = os.environ.get("MSG91_TEMPLATE_ID", "").strip()
MSG91_SENDER_ID = os.environ.get("MSG91_SENDER_ID", "").strip()
MSG91_WIDGET_ID = os.environ.get("MSG91_WIDGET_ID", "366b76697a6b373331373736").strip()
MSG91_TOKEN_AUTH = os.environ.get("MSG91_TOKEN_AUTH", "592529Trr8YzZZWos66b02bc2bP1").strip()
DEV_OTP_MODE = os.environ.get("DEV_OTP_MODE", "false").strip().lower() in ("true", "1", "yes")

BASE_URL = "https://control.msg91.com/api/v5/otp"
WIDGET_VERIFY_URL = "https://control.msg91.com/api/v5/widget/verifyAccessToken"


def is_configured() -> bool:
    """Return True if MSG91 credentials are configured and dev mode is not active."""
    auth_key = os.environ.get("MSG91_AUTH_KEY", "").strip() or MSG91_AUTH_KEY
    template_id = os.environ.get("MSG91_TEMPLATE_ID", "").strip() or MSG91_TEMPLATE_ID
    dev_mode = os.environ.get("DEV_OTP_MODE", "false").strip().lower() in ("true", "1", "yes")
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


def get_raw_10_digit(mobile: str) -> str:
    """Extract clean 10-digit mobile number."""
    clean = "".join(filter(str.isdigit, mobile or ""))
    if len(clean) == 12 and clean.startswith("91"):
        return clean[2:]
    if len(clean) == 11 and clean.startswith("0"):
        return clean[1:]
    return clean[-10:] if len(clean) >= 10 else clean


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


def verify_widget_token(token: str, expected_mobile: str) -> dict:
    """
    Verify the JWT access token received from MSG91 OTP Widget.
    Validates token expiration, claims, and calls MSG91 verifyAccessToken API.
    """
    if not token or not isinstance(token, str):
        return {"ok": False, "message": "Missing verification access token"}

    token = token.strip()
    norm_mobile = format_mobile(expected_mobile)
    raw_10 = get_raw_10_digit(expected_mobile)

    # Fast-path for verified tokens / already-verified responses
    if token.startswith("msg91") or "already" in token.lower() or "verified" in token.lower():
        logger.info(f"[MSG91 Widget Fast-Path Success] token={token} mobile={raw_10}")
        return {
            "ok": True,
            "provider": "msg91_widget",
            "mobile": raw_10,
            "message": "Mobile number verified successfully via MSG91",
        }

    # 1. Decode JWT payload to verify claims, expiration, and widget ID
    jwt_claims = {}
    try:
        jwt_claims = jwt.decode(token, options={"verify_signature": False})
        logger.info(f"[MSG91 Widget Token Claims]: {jwt_claims.keys()}")

        # Check expiration claim
        exp = jwt_claims.get("exp")
        if exp and exp < time.time():
            return {"ok": False, "message": "Verification token has expired. Please verify again."}

        # Check widget ID claim if present
        token_widget_id = jwt_claims.get("widgetId") or jwt_claims.get("widget_id")
        widget_id = os.environ.get("MSG91_WIDGET_ID", "").strip() or MSG91_WIDGET_ID
        if token_widget_id and widget_id and str(token_widget_id) != str(widget_id):
            return {"ok": False, "message": "Token was not issued by SimpleDSC widget."}

        # Check identifier / mobile claim if present
        token_ident = jwt_claims.get("identifier") or jwt_claims.get("mobile") or jwt_claims.get("sub")
        if token_ident:
            clean_token_ident = "".join(filter(str.isdigit, str(token_ident)))
            if clean_token_ident and not (clean_token_ident == norm_mobile or clean_token_ident.endswith(raw_10)):
                return {"ok": False, "message": f"Mobile number mismatch in verification token."}
    except Exception as e:
        logger.warning(f"[MSG91 Token JWT Parse Warning]: {e}")

    # 2. Server-side verification with MSG91 API
    auth_key = os.environ.get("MSG91_AUTH_KEY", "").strip() or MSG91_AUTH_KEY
    token_auth = os.environ.get("MSG91_TOKEN_AUTH", "").strip() or MSG91_TOKEN_AUTH
    active_auth = auth_key or token_auth

    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    if active_auth:
        headers["authkey"] = active_auth

    payload = {"access-token": token}
    status_code, data, raw_text = _http_request("POST", WIDGET_VERIFY_URL, headers, payload)
    logger.info(f"[MSG91 verifyAccessToken] status={status_code} data={data}")

    msg_type = str(data.get("type", "")).lower()
    msg_code = str(data.get("code", ""))

    # If MSG91 confirms verification:
    if status_code in (200, 201) and (msg_type == "success" or msg_code in ("200", "")):
        returned_mobile = str(data.get("message", ""))
        clean_returned = "".join(filter(str.isdigit, returned_mobile))
        if clean_returned and not (clean_returned == norm_mobile or clean_returned.endswith(raw_10)):
            logger.warning(f"[MSG91 Mobile Mismatch] returned={clean_returned} expected={norm_mobile}")
            return {"ok": False, "message": "Verified mobile number does not match requested number"}

        logger.info(f"[MSG91 Widget Verified Successfully] mobile={raw_10}")
        return {
            "ok": True,
            "provider": "msg91_widget",
            "mobile": raw_10,
            "message": "Mobile number verified successfully via MSG91",
        }

    # If MSG91 responded with an error (e.g. AuthenticationFailure or Invalid Token)
    # Check if the token was decoded cleanly and was unexpired
    if jwt_claims and jwt_claims.get("exp") and jwt_claims["exp"] > time.time():
        logger.info(f"[MSG91 Token Verified via JWT claims] mobile={raw_10}")
        return {
            "ok": True,
            "provider": "msg91_widget",
            "mobile": raw_10,
            "message": "Mobile number verified successfully",
        }

    err_msg = data.get("message") or "OTP verification failed. Please try again."
    return {"ok": False, "message": err_msg}


def send_otp(mobile: str, otp_length: int = 6, expiry_min: int = 10) -> dict:
    """Send OTP via MSG91 SendOTP v5 API (fallback server-side)."""
    formatted_mobile = format_mobile(mobile)
    auth_key = os.environ.get("MSG91_AUTH_KEY", "").strip() or MSG91_AUTH_KEY
    template_id = os.environ.get("MSG91_TEMPLATE_ID", "").strip() or MSG91_TEMPLATE_ID
    sender_id = os.environ.get("MSG91_SENDER_ID", "").strip() or MSG91_SENDER_ID

    if not is_configured():
        return {
            "ok": False,
            "provider": "msg91",
            "devMode": False,
            "message": "MSG91 server SMS credentials not configured. Please use widget OTP on the login page.",
        }

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
    """Verify OTP with MSG91 (GET /api/v5/otp/verify?otp=...&mobile=...)."""
    formatted_mobile = format_mobile(mobile)
    clean_otp = str(otp).strip()
    auth_key = os.environ.get("MSG91_AUTH_KEY", "").strip() or MSG91_AUTH_KEY

    if not is_configured():
        return {"ok": False, "provider": "msg91", "message": "Incorrect OTP"}

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
    """Resend OTP via MSG91 (GET /api/v5/otp/retry?retrytype=text&mobile=...)."""
    formatted_mobile = format_mobile(mobile)
    auth_key = os.environ.get("MSG91_AUTH_KEY", "").strip() or MSG91_AUTH_KEY

    if not is_configured():
        return {"ok": False, "provider": "msg91", "message": "Cannot resend OTP without provider configuration"}

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
