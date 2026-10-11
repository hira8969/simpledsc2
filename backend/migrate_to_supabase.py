"""
Migrate data from mongodb_backup.json to Supabase (PostgreSQL).
Usage:
    python migrate_to_supabase.py
Expects SUPABASE_DB_URL or DATABASE_URL in backend/.env
Example:
    DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"
"""
import os
import json
import asyncio
from pathlib import Path
from dotenv import load_dotenv
import asyncpg

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

DB_URL = os.environ.get('SUPABASE_DB_URL') or os.environ.get('DATABASE_URL')

async def main():
    if not DB_URL:
        print("\n[!] ERROR: No SUPABASE_DB_URL or DATABASE_URL found in .env!")
        print("Please add your Supabase connection string to backend/.env:")
        print('DATABASE_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"')
        return

    backup_file = ROOT_DIR / 'mongodb_backup.json'
    if not backup_file.exists():
        print(f"[!] ERROR: Backup file {backup_file} not found!")
        return

    with open(backup_file, 'r', encoding='utf-8') as f:
        backup = json.load(f)

    colls = backup.get("collections", {})
    print(f"Connecting to Supabase PostgreSQL...")
    conn = await asyncpg.connect(DB_URL)
    print("Connected successfully!")

    # 1. Run schema DDL
    schema_file = ROOT_DIR / 'supabase_schema.sql'
    if schema_file.exists():
        print("Applying schema from supabase_schema.sql...")
        schema_sql = schema_file.read_text(encoding='utf-8')
        await conn.execute(schema_sql)
        print("Schema applied successfully!")

    # 2. Sequence counters
    counters = colls.get("sequence_counters", [])
    for c in counters:
        val = c.get("currentVal") or c.get("currentNumber") or 105225
        await conn.execute("""
            INSERT INTO sequence_counters (id, current_val)
            VALUES ($1, $2)
            ON CONFLICT (id) DO UPDATE SET current_val = EXCLUDED.current_val;
        """, c["_id"], int(val))
    print(f"Migrated {len(counters)} sequence counters.")

    # 3. Admin users
    admin_users = colls.get("admin_users", [])
    for a in admin_users:
        await conn.execute("""
            INSERT INTO admin_users (id, email, password_hash, name, role, active, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz)
            ON CONFLICT (email) DO NOTHING;
        """, a["id"], a["email"], a["passwordHash"], a["name"], a.get("role", "admin"), a.get("active", True), a.get("createdAt"))
    print(f"Migrated {len(admin_users)} admin users.")

    # 4. Agents
    agents = colls.get("agents", [])
    for ag in agents:
        await conn.execute("""
            INSERT INTO agents (id, agent_code, name, business, mobile, email, password, city, state, commission_rate, total_earned, status, payout_upi, payout_bank, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15::timestamptz, $16::timestamptz)
            ON CONFLICT (agent_code) DO NOTHING;
        """, ag["id"], ag["agentCode"], ag["name"], ag.get("business"), ag["mobile"], ag.get("email"),
             ag["password"], ag.get("city"), ag.get("state"), float(ag.get("commissionRate", 15.0)),
             float(ag.get("totalEarned", 0.0)), ag.get("status", "Active"), ag.get("payoutUpi"),
             json.dumps(ag.get("payoutBank", {})), ag.get("createdAt"), ag.get("updatedAt"))
    print(f"Migrated {len(agents)} agents.")

    # 5. Users (customers)
    users = colls.get("users", [])
    for u in users:
        await conn.execute("""
            INSERT INTO users (id, mobile, name, email, simpl_dsc_id, year, quarter, sequence_number, profile_completed, profile, billing, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb, $12::timestamptz, $13::timestamptz)
            ON CONFLICT (mobile) DO NOTHING;
        """, u["id"], u["mobile"], u.get("name"), u.get("email"), u.get("simplDscId"),
             u.get("year"), u.get("quarter"), u.get("sequenceNumber"), u.get("profileCompleted", False),
             json.dumps(u.get("profile", {})), json.dumps(u.get("billing", {})), u.get("createdAt"), u.get("updatedAt"))
    print(f"Migrated {len(users)} customers.")

    # 6. Products
    products = colls.get("products", [])
    for p in products:
        await conn.execute("""
            INSERT INTO products (id, name, category, user_type, validity, base_price, professional_fee, total_price, popular, features, required_documents, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb, $12::timestamptz, $13::timestamptz)
            ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, total_price = EXCLUDED.total_price;
        """, p["id"], p["name"], p.get("category"), p.get("userType"), p.get("validity"),
             float(p.get("basePrice", 0)), float(p.get("professionalFee", 0)), float(p.get("totalPrice", 0)),
             p.get("popular", False), json.dumps(p.get("features", [])), json.dumps(p.get("requiredDocuments", [])),
             p.get("createdAt"), p.get("updatedAt"))
    print(f"Migrated {len(products)} products.")

    # 7. FAQs
    faqs = colls.get("faqs", [])
    for fq in faqs:
        await conn.execute("""
            INSERT INTO faqs (id, question, answer, category, sort_order)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (id) DO UPDATE SET answer = EXCLUDED.answer;
        """, fq["id"], fq["question"], fq["answer"], fq.get("category"), fq.get("order", 0))
    print(f"Migrated {len(faqs)} FAQs.")

    # 8. Partner CAs
    partner_cas = colls.get("partner_cas", [])
    for ca in partner_cas:
        await conn.execute("""
            INSERT INTO partner_cas (id, name, code, logo, rating, description, active)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (id) DO NOTHING;
        """, ca["id"], ca["name"], ca.get("code"), ca.get("logo"), float(ca.get("rating", 4.8)), ca.get("description"), ca.get("active", True))
    print(f"Migrated {len(partner_cas)} Partner CAs.")

    # 9. Coupons
    coupons = colls.get("coupons", [])
    for cp in coupons:
        await conn.execute("""
            INSERT INTO coupons (id, code, discount_percent, max_discount, min_order_amount, active, expires_at, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz, $8::timestamptz)
            ON CONFLICT (code) DO NOTHING;
        """, cp["id"], cp["code"], float(cp.get("discountPercent", 0)), float(cp["maxDiscount"]) if cp.get("maxDiscount") else None,
             float(cp.get("minOrderAmount", 0)), cp.get("active", True), cp.get("expiresAt"), cp.get("createdAt"))
    print(f"Migrated {len(coupons)} coupons.")

    # 10. Website Settings
    settings = colls.get("website_settings", [])
    for s in settings:
        await conn.execute("""
            INSERT INTO website_settings (id, title, description, keywords, phone, email, address, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz)
            ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;
        """, s.get("id", "default"), s.get("title"), s.get("description"), s.get("keywords"), s.get("phone"), s.get("email"), s.get("address"), s.get("updatedAt"))
    print(f"Migrated {len(settings)} website settings.")

    # 11. Partnership Applications
    p_apps = colls.get("partnership_applications", [])
    for pa in p_apps:
        await conn.execute("""
            INSERT INTO partnership_applications (id, agent_id, agent_code, name, business, mobile, email, city, state, business_type, status, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::timestamptz)
            ON CONFLICT (id) DO NOTHING;
        """, pa["id"], pa.get("agentId"), pa.get("agentCode"), pa.get("name"), pa.get("business"), pa.get("mobile"), pa.get("email"), pa.get("city"), pa.get("state"), pa.get("businessType"), pa.get("status", "Pending"), pa.get("createdAt"))
    print(f"Migrated {len(p_apps)} partnership applications.")

    # 12. Notifications
    notifs = colls.get("notifications", [])
    for n in notifs:
        await conn.execute("""
            INSERT INTO notifications (id, recipient_type, recipient_id, type, title, message, related_entity, related_entity_id, read, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::timestamptz)
            ON CONFLICT (id) DO NOTHING;
        """, n["id"], n.get("recipientType"), n.get("recipientId"), n.get("type"), n.get("title"), n.get("message"), n.get("relatedEntity"), n.get("relatedEntityId"), n.get("read", False), n.get("createdAt"))
    print(f"Migrated {len(notifs)} notifications.")

    await conn.close()
    print("\n[SUCCESS] All data has been successfully imported to Supabase PostgreSQL!")

if __name__ == '__main__':
    asyncio.run(main())
