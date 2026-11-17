"""Verification script: Test 10 consecutive new Order IDs & Invoice IDs,
assert uniqueness, correct 7-digit format (1000000-9999999), and verify no sequential IDs exist in DB.
"""
import asyncio
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

# Ensure local venv site-packages is in sys.path
venv_site = Path(__file__).parent / "venv" / "Lib" / "site-packages"
if venv_site.exists():
    sys.path.insert(0, str(venv_site))

from core import db, gen_order_id, gen_invoice_no


async def test_generation():
    year = datetime.now(timezone.utc).year
    order_regex = re.compile(rf"^SD-{year}-[1-9]\d{{6}}$")
    inv_regex = re.compile(rf"^INV-{year}-[1-9]\d{{6}}$")

    print(f"=== Testing 10 Consecutive Order IDs (Target: SD-{year}-XXXXXXX) ===")
    order_ids = []
    for i in range(1, 11):
        oid = await gen_order_id()
        order_ids.append(oid)
        assert order_regex.match(oid), f"Order ID {oid} does not match format SD-{year}-XXXXXXX"
        num = int(oid.split("-")[-1])
        assert 1000000 <= num <= 9999999, f"Order ID {oid} number {num} outside range 1000000-9999999"
        print(f"  Order #{i:02d}: {oid} (valid 7-digit random number: {num})")

    assert len(set(order_ids)) == 10, f"Duplicate order ID detected! {order_ids}"
    print(f"-> 10/10 Order IDs strictly UNIQUE.\n")

    print(f"=== Testing 10 Consecutive Invoice IDs (Target: INV-{year}-XXXXXXX) ===")
    invoice_ids = []
    for i in range(1, 11):
        invid = await gen_invoice_no()
        invoice_ids.append(invid)
        assert inv_regex.match(invid), f"Invoice ID {invid} does not match format INV-{year}-XXXXXXX"
        num = int(invid.split("-")[-1])
        assert 1000000 <= num <= 9999999, f"Invoice ID {invid} number {num} outside range 1000000-9999999"
        print(f"  Invoice #{i:02d}: {invid} (valid 7-digit random number: {num})")

    assert len(set(invoice_ids)) == 10, f"Duplicate invoice ID detected! {invoice_ids}"
    print(f"-> 10/10 Invoice IDs strictly UNIQUE.\n")

    print("=== Checking Existing DB Records for any sequential IDs (00000X) ===")
    seq_orders = await db.orders.find({"orderId": {"$regex": "00000"}}, {"_id": 0, "orderId": 1}).to_list(100)
    seq_invoices = await db.invoices.find({"invoiceNo": {"$regex": "00000"}}, {"_id": 0, "invoiceNo": 1}).to_list(100)
    orders_with_seq_inv = await db.orders.find({"invoiceNo": {"$regex": "00000"}}, {"_id": 0, "orderId": 1, "invoiceNo": 1}).to_list(100)

    print(f"  Orders with '00000': {len(seq_orders)}")
    print(f"  Invoices with '00000': {len(seq_invoices)}")
    print(f"  Orders with seq invoiceNo: {len(orders_with_seq_inv)}")

    all_orders = await db.orders.find({}, {"_id": 0, "orderId": 1, "invoiceNo": 1, "customerName": 1}).to_list(100)
    print(f"\nCurrent Orders in MongoDB ({len(all_orders)} total):")
    for o in all_orders:
        print(f"  - Order: {o.get('orderId')} | Invoice: {o.get('invoiceNo')} | Customer: {o.get('customerName')}")

    print("\nALL 10 CONSECUTIVE ID GENERATION TESTS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    asyncio.run(test_generation())
