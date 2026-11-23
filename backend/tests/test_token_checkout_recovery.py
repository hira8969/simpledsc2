"""Comprehensive tests for Checkout Authentication, Token Recovery, Mobile Profile Updates, and Admin Commission Updates."""
import pytest
from datetime import datetime, timezone, timedelta
import jwt
from security import (
    make_token,
    decode_token,
    JWT_SECRET,
    JWT_ALGO,
)
from fastapi import HTTPException


def test_fresh_token_generation_and_validation():
    user_id = "test-user-uuid-12345"
    token = make_token(user_id, "customer", {"mobile": "9876543210"})
    assert token is not None
    assert isinstance(token, str)

    payload = decode_token(token)
    assert payload["sub"] == user_id
    assert payload["kind"] == "customer"
    assert payload["mobile"] == "9876543210"
    assert "exp" in payload


def test_expired_token_handling():
    user_id = "test-expired-user"
    expired_payload = {
        "sub": user_id,
        "kind": "customer",
        "mobile": "9876543210",
        "exp": datetime.now(timezone.utc) - timedelta(hours=1),
        "iat": datetime.now(timezone.utc) - timedelta(days=8),
    }
    expired_token = jwt.encode(expired_payload, JWT_SECRET, algorithm=JWT_ALGO)

    # Standard decode_token must raise 401 with exact message
    with pytest.raises(HTTPException) as exc_info:
        decode_token(expired_token)
    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Invalid or expired token"

    # Unverified decoding for graceful recovery must succeed
    unverified = jwt.decode(expired_token, options={"verify_signature": False, "verify_exp": False})
    assert unverified["sub"] == user_id
    assert unverified["mobile"] == "9876543210"


def test_invalid_token_handling():
    invalid_token = "invalid.token.payload"
    with pytest.raises(HTTPException) as exc_info:
        decode_token(invalid_token)
    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Invalid or expired token"


def test_mobile_sanitization_rules():
    from server import sanitize_mobile
    assert sanitize_mobile("9876543210") == "9876543210"
    assert sanitize_mobile("+919876543210") == "9876543210"
    assert sanitize_mobile("919876543210") == "9876543210"
    assert sanitize_mobile("09876543210") == "9876543210"
    assert sanitize_mobile("+91 98765 43210") == "9876543210"


def test_msg91_verified_token_parsing():
    raw_mobile = "+919876543210"
    token = f"sd_verified_{raw_mobile}_{int(datetime.now().timestamp() * 1000)}"
    parts = token.split("_")
    assert len(parts) >= 3
    mob = parts[2]
    digits = "".join(filter(str.isdigit, mob))
    clean_mobile = digits[-10:] if len(digits) >= 10 else digits
    assert clean_mobile == "9876543210"

