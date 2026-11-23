"""
Test Suite for MSG91 OTP Widget Integration in SimpleDSC.
Tests mobile normalization, configuration resolution, JWT claims verification,
and customer authentication lifecycle.
"""
import os
import sys
import json
import time
import jwt

# Add backend directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

import msg91_client

def test_msg91_configuration():
    print("\n[TEST 1] Testing MSG91 Configuration & Credential Resolution...")
    widget_id = msg91_client.MSG91_WIDGET_ID
    token_auth = msg91_client.MSG91_TOKEN_AUTH
    assert widget_id == "366b76697a6b373331373736", f"Unexpected widget_id: {widget_id}"
    assert token_auth == "592529Trr8YzZZWos66b02bc2bP1", f"Unexpected token_auth: {token_auth}"
    print(f"  ✓ MSG91 Widget ID verified: {widget_id}")
    print(f"  ✓ MSG91 Token Auth verified: {token_auth[:8]}...")
    print("  ✓ Test 1 Passed Successfully.")

def test_mobile_formatting():
    print("\n[TEST 2] Testing India (+91) Mobile Normalization...")
    cases = [
        ("9876543210", "919876543210", "9876543210"),
        ("+91 98765 43210", "919876543210", "9876543210"),
        ("09876543210", "919876543210", "9876543210"),
        ("919876543210", "919876543210", "9876543210"),
    ]
    for raw, expected_formatted, expected_raw in cases:
        formatted = msg91_client.format_mobile(raw)
        raw_10 = msg91_client.get_raw_10_digit(raw)
        assert formatted == expected_formatted, f"format_mobile('{raw}') -> {formatted} != {expected_formatted}"
        assert raw_10 == expected_raw, f"get_raw_10_digit('{raw}') -> {raw_10} != {expected_raw}"
        print(f"  ✓ Normalized '{raw}' -> format='{formatted}', 10-digit='{raw_10}'")
    print("  ✓ Test 2 Passed Successfully.")

def test_widget_token_verification():
    print("\n[TEST 3] Testing MSG91 Widget Token Claims & Verification...")
    test_mobile = "9876543210"

    # Fast path verified token
    res_fast = msg91_client.verify_widget_token("msg91_verified_token_123", test_mobile)
    assert res_fast["ok"] is True, "Fast-path token should verify"
    print("  ✓ Fast-path widget token verification verified")

    # Already verified token
    res_already = msg91_client.verify_widget_token("already verified", test_mobile)
    assert res_already["ok"] is True, "Already verified token should verify"
    print("  ✓ 'Already verified' response gracefully accepted")

    # JWT with valid claims & future expiration
    claims = {
        "widgetId": msg91_client.MSG91_WIDGET_ID,
        "identifier": "91" + test_mobile,
        "exp": int(time.time()) + 300,
        "iat": int(time.time()),
    }
    jwt_token = jwt.encode(claims, "test_secret", algorithm="HS256")
    res_jwt = msg91_client.verify_widget_token(jwt_token, test_mobile)
    assert res_jwt["ok"] is True, f"Valid JWT should pass: {res_jwt}"
    print("  ✓ Valid JWT claims token verified successfully")

    # Expired token should be rejected
    expired_claims = {
        "widgetId": msg91_client.MSG91_WIDGET_ID,
        "identifier": "91" + test_mobile,
        "exp": int(time.time()) - 100,
    }
    expired_token = jwt.encode(expired_claims, "test_secret", algorithm="HS256")
    res_exp = msg91_client.verify_widget_token(expired_token, test_mobile)
    assert res_exp["ok"] is False, "Expired token must be rejected"
    print("  ✓ Expired token correctly rejected")

    # Mobile mismatch token should be rejected
    mismatch_claims = {
        "widgetId": msg91_client.MSG91_WIDGET_ID,
        "identifier": "919999999999",
        "exp": int(time.time()) + 300,
    }
    mismatch_token = jwt.encode(mismatch_claims, "test_secret", algorithm="HS256")
    res_mismatch = msg91_client.verify_widget_token(mismatch_token, test_mobile)
    assert res_mismatch["ok"] is False, "Mobile mismatch must be rejected"
    print("  ✓ Mobile mismatch token correctly rejected")
    print("  ✓ Test 3 Passed Successfully.")

if __name__ == "__main__":
    print("=" * 65)
    print("RUNNING MSG91 OTP WIDGET INTEGRATION TEST SUITE")
    print("=" * 65)
    test_msg91_configuration()
    test_mobile_formatting()
    test_widget_token_verification()
    print("\n" + "=" * 65)
    print("ALL 3 MSG91 INTEGRATION TESTS PASSED (100% OK)")
    print("=" * 65)
