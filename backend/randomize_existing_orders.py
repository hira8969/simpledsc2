"""Script to randomize any existing sequential order IDs (e.g. SD-2026-000004 -> SD-2026-1234567)."""
import asyncio
import os
import random
import re
from pathlib import Path
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
    orders = await db.orders.find({}, {"_id": 0, "orderId": 1, "year": 1}).to_list(1000)
    print(f"Total orders found in DB: {len(orders)}")

    # Pattern for sequential IDs like SD-YYYY-00000X or SD-YYYY-0000XX
    seq_pattern = re.compile(r"^SD-(\d{4})-0{3,5}\d+$")

    count = 0
    for o in orders:
        old_id = o.get("orderId")
        if not old_id:
            continue
        # If it matches sequential pattern or has leading zeros
        if seq_pattern.match(old_id) or "00000" in old_id:
            year_match = re.search(r"SD-(\d{4})-", old_id)
            year = year_match.group(1) if year_match else "2026"
            
            # Generate unique random 7-digit ID
            while True:
                rand_num = random.randint(1000000, 9999999)
                new_id = f"SD-{year}-{rand_num}"
                if not await db.orders.find_one({"orderId": new_id}):
                    break

            print(f"Updating order: {old_id} -> {new_id}")
            # Update orders
            await db.orders.update_one({"orderId": old_id}, {"$set": {"orderId": new_id}})
            # Update payments
            await db.payments.update_many({"orderId": old_id}, {"$set": {"orderId": new_id}})
            # Update documents
            await db.documents.update_many({"orderId": old_id}, {"$set": {"orderId": new_id}})
            # Update order_status_history
            await db.order_status_history.update_many({"orderId": old_id}, {"$set": {"orderId": new_id}})
            # Update dscs
            await db.dscs.update_many({"orderId": old_id}, {"$set": {"orderId": new_id}})
            # Update support_tickets
            await db.support_tickets.update_many({"orderId": old_id}, {"$set": {"orderId": new_id}})
            # Update invoices
            await db.invoices.update_many({"orderId": old_id}, {"$set": {"orderId": new_id}})
            # Update audit_logs
            await db.audit_logs.update_many({"entity": "order", "entityId": old_id}, {"$set": {"entityId": new_id}})
            # Update notifications
            await db.notifications.update_many({"relatedEntity": "order", "relatedEntityId": old_id}, {"$set": {"relatedEntityId": new_id}})
            count += 1

    print(f"Successfully migrated {count} sequential order IDs to random 7-digit IDs.")


if __name__ == "__main__":
    asyncio.run(randomize_all())
