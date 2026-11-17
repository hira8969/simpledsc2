"""Script to randomize any existing sequential order IDs & invoice numbers (e.g. SD-2026-000004 -> SD-2026-1234567, INV-2026-000001 -> INV-2026-1234568)."""
import asyncio
import os
import random
import re
import sys
from pathlib import Path

# Ensure local venv site-packages is in sys.path
venv_site = Path(__file__).parent / "venv" / "Lib" / "site-packages"
if venv_site.exists():
    sys.path.insert(0, str(venv_site))

import certifi
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ.get('MONGODB_URI') or os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
try:
    client = AsyncIOMotorClient(mongo_url, tlsCAFile=certifi.where())
except Exception:
    client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'test_database')]


async def randomize_all():
    # 1. Randomize Orders
    orders = await db.orders.find({}, {"_id": 0, "orderId": 1, "invoiceNo": 1}).to_list(1000)
    print(f"Total orders found in DB: {len(orders)}")

    seq_order_pattern = re.compile(r"^SD-(\d{4})-0{3,5}\d+$")
    seq_inv_pattern = re.compile(r"^INV-(\d{4})-0{3,5}\d+$")

    order_count = 0
    for o in orders:
        old_id = o.get("orderId")
        if old_id and (seq_order_pattern.match(old_id) or "00000" in old_id):
            year_match = re.search(r"SD-(\d{4})-", old_id)
            year = year_match.group(1) if year_match else "2026"
            
            while True:
                rand_num = random.randint(1000000, 9999999)
                new_id = f"SD-{year}-{rand_num}"
                if not await db.orders.find_one({"orderId": new_id}):
                    break

            print(f"Updating order: {old_id} -> {new_id}")
            await db.orders.update_one({"orderId": old_id}, {"$set": {"orderId": new_id}})
            await db.payments.update_many({"orderId": old_id}, {"$set": {"orderId": new_id}})
            await db.documents.update_many({"orderId": old_id}, {"$set": {"orderId": new_id}})
            await db.order_status_history.update_many({"orderId": old_id}, {"$set": {"orderId": new_id}})
            await db.dscs.update_many({"orderId": old_id}, {"$set": {"orderId": new_id}})
            await db.support_tickets.update_many({"orderId": old_id}, {"$set": {"orderId": new_id}})
            await db.invoices.update_many({"orderId": old_id}, {"$set": {"orderId": new_id}})
            await db.audit_logs.update_many({"entity": "order", "entityId": old_id}, {"$set": {"entityId": new_id}})
            await db.notifications.update_many({"relatedEntity": "order", "relatedEntityId": old_id}, {"$set": {"relatedEntityId": new_id}})
            order_count += 1

    # 2. Randomize Invoices
    inv_count = 0
    invoices = await db.invoices.find({}, {"_id": 0, "invoiceNo": 1}).to_list(1000)
    for inv in invoices:
        old_inv = inv.get("invoiceNo")
        if old_inv and (seq_inv_pattern.match(old_inv) or "00000" in old_inv):
            year_match = re.search(r"INV-(\d{4})-", old_inv)
            year = year_match.group(1) if year_match else "2026"
            while True:
                rand_num = random.randint(1000000, 9999999)
                new_inv = f"INV-{year}-{rand_num}"
                if not await db.invoices.find_one({"invoiceNo": new_inv}) and not await db.orders.find_one({"invoiceNo": new_inv}):
                    break
            print(f"Updating invoice: {old_inv} -> {new_inv}")
            await db.invoices.update_one({"invoiceNo": old_inv}, {"$set": {"invoiceNo": new_inv}})
            await db.orders.update_many({"invoiceNo": old_inv}, {"$set": {"invoiceNo": new_inv}})
            inv_count += 1

    # Check orders with invoiceNo directly
    orders_with_inv = await db.orders.find({"invoiceNo": {"$regex": "00000"}}, {"_id": 0, "orderId": 1, "invoiceNo": 1}).to_list(1000)
    for o in orders_with_inv:
        old_inv = o.get("invoiceNo")
        if old_inv and (seq_inv_pattern.match(old_inv) or "00000" in old_inv):
            year_match = re.search(r"INV-(\d{4})-", old_inv)
            year = year_match.group(1) if year_match else "2026"
            while True:
                rand_num = random.randint(1000000, 9999999)
                new_inv = f"INV-{year}-{rand_num}"
                if not await db.invoices.find_one({"invoiceNo": new_inv}) and not await db.orders.find_one({"invoiceNo": new_inv}):
                    break
            print(f"Updating order invoiceNo: {old_inv} -> {new_inv}")
            await db.orders.update_one({"orderId": o["orderId"]}, {"$set": {"invoiceNo": new_inv}})
            await db.invoices.update_many({"invoiceNo": old_inv}, {"$set": {"invoiceNo": new_inv}})
            inv_count += 1

    print(f"Successfully migrated {order_count} sequential order IDs and {inv_count} invoice numbers to random 7-digit IDs.")


if __name__ == "__main__":
    asyncio.run(randomize_all())
