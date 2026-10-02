"""Core: DB connection, shared helpers, ID sequence generators, audit + notifications."""
import os
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ReturnDocument

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


def quarter_for(dt: datetime) -> str:
    return {1: "A", 2: "A", 3: "A", 4: "B", 5: "B", 6: "B",
            7: "C", 8: "C", 9: "C", 10: "D", 11: "D", 12: "D"}[dt.month]


async def _next_counter(key: str, start: int) -> int:
    """Atomically allocate the next number for `key`, first allocation == `start`."""
    doc = await db.sequence_counters.find_one_and_update(
        {"_id": key},
        {"$inc": {"currentNumber": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    return start - 1 + doc["currentNumber"]


async def gen_simpldsc_id() -> dict:
    """SPLDSC-[YEAR]-[QUARTER]-[6DIGIT] resetting to 157535 each year+quarter."""
    dt = datetime.now(timezone.utc)
    year, q = dt.year, quarter_for(dt)
    key = f"SPLDSC-{year}-{q}"
    num = await _next_counter(key, 157535)
    return {
        "simplDscId": f"SPLDSC-{year}-{q}-{num}",
        "year": year, "quarter": q, "sequenceNumber": num,
    }


async def gen_order_id() -> str:
    year = datetime.now(timezone.utc).year
    num = await _next_counter(f"ORDER-{year}", 1)
    return f"SD-{year}-{num:06d}"


async def gen_invoice_no() -> str:
    year = datetime.now(timezone.utc).year
    num = await _next_counter(f"INV-{year}", 1)
    return f"INV-{year}-{num:06d}"


async def gen_ticket_id() -> str:
    year = datetime.now(timezone.utc).year
    num = await _next_counter(f"TKT-{year}", 1)
    return f"TKT-{year}-{num:06d}"


async def gen_agent_code() -> str:
    num = await _next_counter("AGENT-CODE", 10101)
    return f"AGT-{num}"


def clean(doc: dict) -> dict:
    """Strip Mongo _id for JSON responses."""
    if doc and "_id" in doc:
        doc = {k: v for k, v in doc.items() if k != "_id"}
    return doc


async def audit(actor: dict, action: str, entity: str, entity_id: str,
                old_value=None, new_value=None, ip: str = None):
    await db.audit_logs.insert_one({
        "id": new_id(),
        "actorId": actor.get("id") if actor else None,
        "actorEmail": actor.get("email") if actor else None,
        "role": actor.get("role") if actor else None,
        "action": action,
        "entity": entity,
        "entityId": entity_id,
        "oldValue": old_value,
        "newValue": new_value,
        "ip": ip,
        "timestamp": now_iso(),
    })


async def notify(recipient_type: str, recipient_id: str, ntype: str, title: str,
                 message: str, related_entity: str = None, related_id: str = None):
    await db.notifications.insert_one({
        "id": new_id(),
        "recipientType": recipient_type,  # 'customer' | 'staff'
        "recipientId": recipient_id,
        "type": ntype,
        "title": title,
        "message": message,
        "relatedEntity": related_entity,
        "relatedEntityId": related_id,
        "read": False,
        "createdAt": now_iso(),
    })
