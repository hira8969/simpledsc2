"""Seed data: admins, products, certifying authorities, FAQs, settings, coupons."""
import os
from core import db, new_id, now_iso
from security import hash_password

TOK_HERO = "https://images.unsplash.com/photo-1587145820098-23e484e69816?crop=entropy&cs=srgb&fm=jpg&q=85&w=800"
TOK_CLASS3 = "https://images.unsplash.com/photo-1551818014-7c8ace9c1b5c?crop=entropy&cs=srgb&fm=jpg&q=85&w=800"
TOK_DGFT = "https://images.pexels.com/photos/10336136/pexels-photo-10336136.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
TOK_ETENDER = "https://images.pexels.com/photos/5474301/pexels-photo-5474301.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
TOK_SIGNER = "https://images.unsplash.com/photo-1477949331575-2763034b5fb5?crop=entropy&cs=srgb&fm=jpg&q=85&w=800"

CATEGORIES = ["Class 2 DSC", "Class 3 DSC", "DGFT DSC", "eTender DSC", "MCA DSC", "Document Signer DSC"]

PRODUCTS = [
    {
        "name": "Class 2 Individual DSC", "category": "Class 2 DSC", "slug": "class-2-dsc",
        "description": "For individuals and small businesses. Ideal for basic e-filing and personal document signing.",
        "price": 1499, "validity": "1 Year", "imageUrl": TOK_HERO,
        "features": ["Aadhaar eKYC", "PAN Verification", "Email Support", "Free Reissuance"],
        "requiredDocuments": ["PAN", "Aadhaar", "Photograph"], "sortOrder": 1,
        "purposeTags": ["individual", "document_signing"],
    },
    {
        "name": "Class 3 Individual DSC", "category": "Class 3 DSC", "slug": "class-3-dsc",
        "description": "For directors, professionals and high-security usage. Legally valid Class 3 signing certificate.",
        "price": 1999, "validity": "1 Year", "imageUrl": TOK_CLASS3,
        "features": ["Aadhaar eKYC", "PAN Verification", "Video Verification", "Priority Support", "Free Reissuance"],
        "requiredDocuments": ["PAN", "Aadhaar", "Photograph", "Address Proof"], "sortOrder": 2,
        "purposeTags": ["individual", "business", "document_signing"],
    },
    {
        "name": "DGFT DSC (Import/Export)", "category": "DGFT DSC", "slug": "dgft-dsc",
        "description": "For import/export (IEC) code and DGFT / ICEGATE foreign trade filings.",
        "price": 1999, "validity": "1 Year", "imageUrl": TOK_DGFT,
        "features": ["Aadhaar eKYC", "IEC Mapping", "DGFT Portal Ready", "Priority Support"],
        "requiredDocuments": ["PAN", "Aadhaar", "IEC Certificate", "Organization Documents"], "sortOrder": 3,
        "purposeTags": ["import_export", "business"],
    },
    {
        "name": "eTender DSC", "category": "eTender DSC", "slug": "etender-dsc",
        "description": "For government tenders, GeM and e-procurement bidding portals.",
        "price": 2499, "validity": "1 Year", "imageUrl": TOK_ETENDER,
        "features": ["Class 3 Signing + Encryption", "GeM Ready", "eProcurement Ready", "Priority Support"],
        "requiredDocuments": ["PAN", "Aadhaar", "Photograph", "Organization Documents"], "sortOrder": 4,
        "purposeTags": ["government", "business"],
    },
    {
        "name": "MCA DSC", "category": "MCA DSC", "slug": "mca-dsc",
        "description": "For company filings (DIN, ROC) and MCA-21 incorporation compliance.",
        "price": 2499, "validity": "1 Year", "imageUrl": TOK_SIGNER,
        "features": ["Class 3 Signing", "MCA-21 Ready", "DIN Mapping", "Priority Support"],
        "requiredDocuments": ["PAN", "Aadhaar", "Photograph", "Company Documents"], "sortOrder": 5,
        "purposeTags": ["business"],
    },
    {
        "name": "Document Signer Certificate", "category": "Document Signer DSC", "slug": "document-signer-dsc",
        "description": "For bulk / automated document signing by organizations.",
        "price": 2999, "validity": "1 Year", "imageUrl": TOK_SIGNER,
        "features": ["Organization Certificate", "Bulk PDF Signing", "API Automation Ready", "Priority Support"],
        "requiredDocuments": ["Organization Documents", "Authorized Signatory PAN", "Authorization Letter"], "sortOrder": 6,
        "purposeTags": ["business", "document_signing"],
    },
]

CAS = [
    "Safescrypt CA", "eMudhra CA", "Capricorn CA", "Verasys (VSign CA)", "PANTSign CA",
    "IDSign CA", "XtraTrust CA", "ProDigiSign CA", "SignX CA", "Care4Sign CA",
]

FAQS = [
    ("What is a DSC?", "A Digital Signature Certificate (DSC) is the electronic equivalent of a physical signature, legally valid under the IT Act 2000, used to sign documents and authenticate identity online."),
    ("Which DSC do I need?", "It depends on your purpose. Use our DSC Finder to get a personalised recommendation based on whether you are an individual, business, exporter or bidding on tenders."),
    ("What documents are required?", "Typically PAN, Aadhaar, a photograph and address proof for individuals. Organizations need additional company documents. Exact requirements are shown per product."),
    ("How long does processing take?", "Most Class 3 DSCs are processed within a few hours to 24 hours after successful eKYC and document verification."),
    ("Can I use DSC for GST?", "Yes. A Class 3 Individual DSC can be used for GST registration and return filing."),
    ("Can I use DSC for MCA?", "Yes. Directors and professionals use Class 3 / MCA DSC for MCA-21 and ROC filings."),
    ("Can I use DSC for Income Tax?", "Yes. DSCs are accepted for Income Tax e-Filing for individuals and organizations."),
    ("Can I use DSC for eTender?", "Yes, our eTender DSC includes signing and encryption for government procurement portals and GeM."),
    ("What happens after document upload?", "Our team verifies your documents. If anything is unclear you will be asked to re-upload. Once verified, the DSC is submitted to the Certifying Authority."),
    ("How do I track my order?", "Log in to your dashboard to see a live timeline of your order from payment to DSC issuance and token dispatch."),
    ("What happens if my document is rejected?", "You will see the rejection reason in your dashboard and can re-upload the corrected document immediately."),
    ("How does Razorpay payment work?", "Payments are processed securely via Razorpay. Your order is only marked paid after server-side verification of the payment signature."),
    ("How can I renew my DSC?", "From the My DSCs section in your dashboard, click Renew on any expiring certificate to start a fast-track renewal."),
]


async def seed_all():
    # Admins
    if not await db.admin_users.find_one({"email": os.environ["ADMIN_EMAIL"]}):
        await db.admin_users.insert_one({
            "id": new_id(), "email": os.environ["ADMIN_EMAIL"],
            "passwordHash": hash_password(os.environ["ADMIN_PASSWORD"]),
            "name": "SimplDSC Admin", "role": "super_admin", "active": True,
            "createdAt": now_iso(),
        })
    if not await db.admin_users.find_one({"email": os.environ["OWNER_EMAIL"]}):
        await db.admin_users.insert_one({
            "id": new_id(), "email": os.environ["OWNER_EMAIL"],
            "passwordHash": hash_password(os.environ["OWNER_PASSWORD"]),
            "name": "Owner", "role": "super_admin", "active": True,
            "createdAt": now_iso(),
        })

    # CAs
    if await db.partner_cas.count_documents({}) == 0:
        for i, name in enumerate(CAS):
            await db.partner_cas.insert_one({
                "id": new_id(), "name": name, "logoUrl": "", "websiteUrl": "",
                "displayOrder": i + 1, "active": True, "createdAt": now_iso(),
            })

    # Products with issuing CA mapping
    if await db.products.count_documents({}) == 0:
        cas = await db.partner_cas.find({}, {"_id": 0}).to_list(100)
        ca_ids = [c["id"] for c in cas]
        for p in PRODUCTS:
            issuing = ca_ids[1:4]  # eMudhra, Capricorn, Verasys as eligible
            await db.products.insert_one({
                "id": new_id(), **p,
                "active": True, "issuingCAs": issuing, "preferredCA": issuing[0],
                "seo": {"title": f"{p['name']} | SimplDSC", "metaDescription": p["description"],
                        "slug": p["slug"], "ogImage": p["imageUrl"], "index": True},
                "createdAt": now_iso(), "updatedAt": now_iso(),
            })

    # FAQs
    if await db.faqs.count_documents({}) == 0:
        for i, (q, a) in enumerate(FAQS):
            await db.faqs.insert_one({
                "id": new_id(), "question": q, "answer": a, "active": True,
                "sortOrder": i + 1, "createdAt": now_iso(),
            })

    # Coupons
    if await db.coupons.count_documents({}) == 0:
        await db.coupons.insert_one({
            "id": new_id(), "code": "WELCOME10", "discountType": "percentage", "value": 10,
            "startDate": None, "endDate": None, "usageLimit": 1000, "perCustomerLimit": 1,
            "productRestriction": [], "minOrderValue": 0, "active": True, "usedCount": 0,
            "createdAt": now_iso(),
        })

    # Website settings
    if not await db.website_settings.find_one({"_id": "singleton"}):
        await db.website_settings.insert_one({
            "_id": "singleton",
            "contact": {
                "address": "Mallick Complex, Plot No. A/69, Kharavela Nagar, Unit 3, Bhubaneswar, Odisha \u2013 751001",
                "phone": "+91 98765 43210", "email": "support@simpldsc.in",
            },
            "seoDefaults": {
                "title": "SimplDSC \u2013 Digital Signatures, Made Simple.",
                "description": "Get your Digital Signature Certificate quickly, securely and conveniently across India.",
                "ogImage": TOK_HERO, "canonicalBase": "https://simpldsc.in",
            },
            "analytics": {"gaMeasurementId": "", "enabled": False},
            "email": {"configured": False},
            "whatsapp": {"configured": False},
            "updatedAt": now_iso(),
        })
