#!/usr/bin/env python3
"""
Comprehensive Cashfree Payment Gateway Integration Tests.
Tests credential parsing, order creation payload format, webhook HMAC SHA-256 verification,
and server-side order status validation.
"""
import os
import sys
import json
import uuid
import base64
import hmac
import hashlib

# Add backend directory to sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
sys.path.insert(0, backend_dir)

import cashfree_client

def test_credentials_and_urls():
    print("[TEST 1] Testing Credentials & Environment URL Resolution...")
    
    # 1. Test Sandbox Mode
    os.environ["CASHFREE_ENV"] = "SANDBOX"
    os.environ["CASHFREE_APP_ID"] = "TEST_APP_12345"
    os.environ["CASHFREE_SECRET_KEY"] = "TEST_SECRET_67890"
    
    app_id, secret, env = cashfree_client.get_credentials()
    assert app_id == "TEST_APP_12345", f"Expected TEST_APP_12345, got {app_id}"
    assert secret == "TEST_SECRET_67890", f"Expected TEST_SECRET_67890, got {secret}"
    assert env == "SANDBOX", f"Expected SANDBOX, got {env}"
    
    base_url = cashfree_client.get_base_url()
    assert base_url == "https://sandbox.cashfree.com/pg", f"Expected sandbox URL, got {base_url}"
    print(f"  ✓ Sandbox Base URL: {base_url}")
    
    headers = cashfree_client.get_headers()
    assert headers["x-client-id"] == "TEST_APP_12345"
    assert headers["x-client-secret"] == "TEST_SECRET_67890"
    assert headers["x-api-version"] == "2023-08-01"
    print(f"  ✓ Headers: x-client-id, x-client-secret, x-api-version={headers['x-api-version']}")

    # 2. Test Production Mode
    os.environ["CASHFREE_ENV"] = "PRODUCTION"
    prod_url = cashfree_client.get_base_url()
    assert prod_url == "https://api.cashfree.com/pg", f"Expected production URL, got {prod_url}"
    print(f"  ✓ Production Base URL: {prod_url}")
    
    # Reset back to SANDBOX
    os.environ["CASHFREE_ENV"] = "SANDBOX"
    print("  ✓ Test 1 Passed Successfully.\n")

def test_create_order_mock_and_payload():
    print("[TEST 2] Testing Order Creation & Session ID Generation...")
    order_id = f"SPLDSC-TEST-{uuid.uuid4().hex[:6]}"
    
    # Temporarily clear keys to test mock fallback safety
    old_app = os.environ.pop("CASHFREE_APP_ID", "")
    old_sec = os.environ.pop("CASHFREE_SECRET_KEY", "")
    
    res = cashfree_client.create_order(
        order_id=order_id,
        amount=1999.00,
        customer_id="usr_test_123",
        customer_name="Test Customer",
        customer_email="test@simpldsc.com",
        customer_phone="9876543210",
        order_note="Test DSC Order"
    )
    
    assert res["order_id"] == order_id
    assert res["order_amount"] == 1999.00
    assert "payment_session_id" in res
    assert res["payment_session_id"].startswith("session_mock_")
    print(f"  ✓ Safe Dev Mock Order generated: order_id={res['order_id']}, session_id={res['payment_session_id'][:20]}...")

    # Restore keys
    os.environ["CASHFREE_APP_ID"] = old_app
    os.environ["CASHFREE_SECRET_KEY"] = old_sec
    print("  ✓ Test 2 Passed Successfully.\n")

def test_webhook_signature_verification():
    print("[TEST 3] Testing Cashfree Webhook HMAC SHA-256 Signature Verification...")
    test_secret = "cf_test_secret_key_abcdef123456"
    os.environ["CASHFREE_SECRET_KEY"] = test_secret
    
    timestamp = "1700000000"
    raw_payload = json.dumps({
        "type": "PAYMENT_SUCCESS_WEBHOOK",
        "data": {
            "order": {"order_id": "SPLDSC-2026-O-123456", "order_amount": 1999.00},
            "payment": {"cf_payment_id": "cf_pay_998877", "payment_status": "SUCCESS"}
        }
    }).encode("utf-8")
    
    # Compute genuine signature according to Cashfree specification:
    # signature = Base64( HMAC_SHA256( secret, timestamp + raw_body ) )
    data_to_sign = timestamp.encode("utf-8") + raw_payload
    valid_sig = base64.b64encode(
        hmac.new(test_secret.encode("utf-8"), data_to_sign, hashlib.sha256).digest()
    ).decode("utf-8")
    
    # Verify with genuine signature
    is_valid = cashfree_client.verify_webhook_signature(valid_sig, timestamp, raw_payload)
    assert is_valid is True, "Valid signature failed verification!"
    print(f"  ✓ Valid Webhook Signature verified successfully (HMAC-SHA256 Match)")

    # Verify with tampered/invalid signature
    invalid_sig = valid_sig[:-4] + "XXXX"
    is_invalid = cashfree_client.verify_webhook_signature(invalid_sig, timestamp, raw_payload)
    assert is_invalid is False, "Invalid signature was incorrectly accepted!"
    print(f"  ✓ Tampered Webhook Signature correctly rejected")
    
    # Verify with tampered payload (change order id)
    tampered_payload = raw_payload.replace(b"SPLDSC-2026-O-123456", b"SPLDSC-2026-O-999999")
    assert tampered_payload != raw_payload, "Tampered payload was identical to raw payload"
    is_tampered_invalid = cashfree_client.verify_webhook_signature(valid_sig, timestamp, tampered_payload)
    assert is_tampered_invalid is False, "Tampered payload was incorrectly accepted!"
    print(f"  ✓ Tampered Payload correctly rejected")
    print("  ✓ Test 3 Passed Successfully.\n")

def test_client_get_order():
    print("[TEST 4] Testing Cashfree Get Order & Status Handling...")
    order_id = "SPLDSC-2026-O-TEST"
    
    # In mock mode
    os.environ["CASHFREE_APP_ID"] = ""
    os.environ["CASHFREE_SECRET_KEY"] = ""
    order_info = cashfree_client.get_order(order_id)
    assert order_info["order_id"] == order_id
    assert order_info["order_status"] == "PAID"
    print(f"  ✓ Get Order mock handler returns order_status={order_info['order_status']}")

    payments = cashfree_client.get_order_payments(order_id)
    assert len(payments) > 0
    assert payments[0]["payment_status"] == "SUCCESS"
    print(f"  ✓ Get Order Payments mock handler returns payment_status={payments[0]['payment_status']}")
    print("  ✓ Test 4 Passed Successfully.\n")

if __name__ == "__main__":
    print("=" * 65)
    print("RUNNING CASHFREE PAYMENT GATEWAY INTEGRATION TEST SUITE")
    print("=" * 65)
    try:
        test_credentials_and_urls()
        test_create_order_mock_and_payload()
        test_webhook_signature_verification()
        test_client_get_order()
        print("=" * 65)
        print("ALL 4 CASHFREE INTEGRATION TESTS PASSED (100% OK)")
        print("=" * 65)
    except AssertionError as err:
        print(f"\n[FAIL] Test assertion error: {err}")
        sys.exit(1)
    except Exception as e:
        print(f"\n[FAIL] Unexpected error: {e}")
        sys.exit(1)
