"""Seed data: admins, products, certifying authorities, FAQs, settings, coupons."""
import os
from core import db, new_id, now_iso
from security import hash_password

TOK_HERO = "/img/hero-tokens.png"
TOK_CLASS3 = "/img/epass2003-token.png"
TOK_DGFT = "/img/mtoken-blue.png"
TOK_ETENDER = "/img/proxkey-token.png"
TOK_SIGNER = "/img/innait-token.png"
TOK_ORG = "/img/blue-token.png"
TOK_MCA = "/img/mtoken-purple.png"


CATEGORIES = ["Class 2 DSC", "Class 3 DSC", "DGFT DSC", "eTender DSC", "MCA DSC", "Document Signer DSC"]

PRODUCTS = [
    {
        "name": "Class 3 Individual DSC", "category": "Class 3 DSC", "slug": "class-3-dsc",
        "description": "India's most trusted Class 3 Digital Signature Certificate. Pre-loaded on a certified high-security USB crypto token for ITR filing, MCA-21, GST portal, trademark filings, and digital PDF signing.",
        "price": 1999, "validity": "1 Year", "imageUrl": "/img/epass2003-token.png",
        "isPopular": True, "rating": 5.0, "badgeText": "Most Popular",
        "features": ["FIPS 140-2 Level 3 Cryptographic USB Token", "CCA Govt of India Approved & Legally Valid", "Paperless Aadhaar & PAN eKYC in 15 Minutes", "Valid for Income Tax, GST, MCA & ROC Filings", "Instant Video Verification & Free Cloud Backup"],
        "requiredDocuments": ["PAN Card", "Aadhaar Card", "Photograph", "Address Proof"], "sortOrder": 1,
        "purposeTags": ["individual", "business", "document_signing"],
    },
    {
        "name": "Class 3 eTender DSC", "category": "eTender DSC", "slug": "etender-dsc",
        "description": "High-security combo Digital Signature Certificate engineered for government e-tendering. Includes Signing and Encryption certificates on a Watchdata PROXKey USB dongle for GeM, CPPP, defense, and PSU bids.",
        "price": 2499, "validity": "1 Year", "imageUrl": "/img/proxkey-token.png",
        "isPopular": False, "rating": 4.9, "badgeText": "eProcurement Ready",
        "features": ["Dual Certificate: Class 3 Signing + Encryption", "Watchdata PROXKey FIPS 140-2 Crypto Dongle", "100% Compatible with GeM, CPPP & IREPS Railways", "State Tender Portals & Defense Procurement Ready", "Dedicated Technical Setup & Priority Support"],
        "requiredDocuments": ["PAN Card", "Aadhaar Card", "Organization / Firm Proof", "Authorization Letter"], "sortOrder": 2,
        "purposeTags": ["government", "business"],
    },
    {
        "name": "DGFT Digital Signature (Import / Export)", "category": "DGFT DSC", "slug": "dgft-dsc",
        "description": "Specially configured Digital Signature for Indian exporters and importers. Pre-mapped with your IEC code on a certified mToken crypto key for quick DGFT licensing and ICEGATE customs clearance.",
        "price": 2499, "validity": "1 Year", "imageUrl": "/img/mtoken-blue.png",
        "isPopular": False, "rating": 4.8, "badgeText": "ICEGATE Ready",
        "features": ["Pre-embedded Import Export Code (IEC) Mapping", "High-Speed mToken CryptoID USB Dongle", "Seamless DGFT Portal Licensing & Schemes", "ICEGATE Customs Online Filing & Bill of Entry", "Export Duty Drawback & EPCG Compliance"],
        "requiredDocuments": ["Director / Partner PAN", "Aadhaar Card", "IEC Certificate / DGFT Profile", "Company PAN & Proof"], "sortOrder": 3,
        "purposeTags": ["import_export", "business"],
    },
    {
        "name": "MCA / ROC Director DSC", "category": "MCA DSC", "slug": "mca-dsc",
        "description": "Designed specifically for Company Directors and Partners. Seamlessly submit ROC annual returns, DIR-3 KYC, DIN approvals, and SPICe+ incorporation forms on the Ministry of Corporate Affairs portal.",
        "price": 1999, "validity": "1 Year", "imageUrl": "/img/mtoken-purple.png",
        "isPopular": False, "rating": 4.9, "badgeText": "Director Essential",
        "features": ["Class 3 Signing Certificate for MCA-21 Portal", "Compact Purple mToken FIPS Certified USB Key", "DIN (Director Identification Number) Mapping", "SPICe+ Company & LLP Incorporation Ready", "DIR-3 KYC & Annual ROC Compliance Forms"],
        "requiredDocuments": ["Director PAN", "Aadhaar Card", "Photograph", "Company CIN / LLPIN (if applicable)"], "sortOrder": 4,
        "purposeTags": ["business", "individual"],
    },
    {
        "name": "Document Signer Certificate (Bulk / Automated)", "category": "Document Signer DSC", "slug": "document-signer-dsc",
        "description": "Heavy-duty organizational certificate for automated, high-volume digital signing. Integrates directly with ERPs, invoicing pipelines, and accounting software for tamper-proof corporate document signing.",
        "price": 3999, "validity": "1 Year", "imageUrl": "/img/innait-token.png",
        "isPopular": False, "rating": 5.0, "badgeText": "Enterprise Ready",
        "features": ["Automated Bulk PDF & Invoicing Signatures", "Innait Precision Heavy-Duty Hardware Crypto Module", "ERP & API Server Integration Support (SAP / Tally)", "Legally Binding Organization Identity Verification", "Automated GST e-Invoice & Payroll Signing"],
        "requiredDocuments": ["Company Certificate of Incorporation", "Board Resolution", "Signatory Identity Proof", "GST Certificate"], "sortOrder": 5,
        "purposeTags": ["business", "document_signing"],
    },
    {
        "name": "Class 3 Organization DSC (Signing + Token)", "category": "Class 2 DSC", "slug": "class-2-dsc",
        "description": "Authenticates both the individual representative and the company name. Includes a premium blue cryptographic USB token, ideal for corporate banking, GST return signing, and legal compliance.",
        "price": 1799, "validity": "1 Year", "imageUrl": "/img/blue-token.png",
        "isPopular": False, "rating": 4.8, "badgeText": "Corporate Authorized",
        "features": ["Organization Named Digital Signature Certificate", "Blue High-Speed Crypto USB Token with Cap", "Authorized Signatory Verification & Branding", "Government Portals & E-filing Compatible", "1 & 2 Year Validity Options Available"],
        "requiredDocuments": ["Authorized Signatory PAN & Aadhaar", "Company Registration Proof", "Authorization Letter", "Photograph"], "sortOrder": 6,
        "purposeTags": ["individual", "business", "document_signing"],
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
                "phone": "7992999947, 7992777799", "email": "support@simpldsc.in",
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
