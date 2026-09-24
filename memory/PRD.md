# SimplDSC — Product Requirements & Build Log

## Original Problem Statement
Build a production-ready full-stack Digital Signature Certificate (DSC) platform "SimplDSC™" (tagline "Digital Signatures, Made Simple."). Public marketing site + customer portal (mobile OTP) + admin/staff portal covering the full DSC lifecycle: browse products, DSC Finder, purchase, document upload, Razorpay payment, order tracking, issued DSCs & expiry, renewals, invoices, support tickets, notifications. Admin manages customers, products, orders, payments, documents, DSC issuance, expiry reminders, renewals, certifying authorities, coupons, leads, tickets, staff roles, audit logs, analytics, SEO. Global restrictions: NO maps, NO social icons. Brand: navy/violet/lavender, premium fintech look, real DSC USB token photos.

## Architecture
- **Frontend**: React 19 (CRA + craco), Tailwind, shadcn/ui, react-router, sonner. `@` alias -> src.
- **Backend**: FastAPI (`server.py` public+customer, `admin_routes.py` admin+webhook, `core.py` db/ids/helpers, `security.py` auth, `seed.py` seed data). All routes under `/api`.
- **DB**: MongoDB, uuid string `id` fields (no raw ObjectId in responses). Collections: users, products, partner_cas, orders, order_status_history, documents, payments, invoices, dscs, dsc_expiry_reminders, renewals, refunds, support_tickets, notifications, partnership_applications, contact_enquiries, faqs, coupons, admin_users, audit_logs, sequence_counters, website_settings, otp_sessions, webhook_events, admin_login_attempts.
- **IDs**: SimplDSC `SPLDSC-YEAR-Q-NNNNNN` (resets to 157535 per year+quarter, atomic counter). Order `SD-YEAR-NNNNNN`, Invoice `INV-YEAR-NNNNNN`, Ticket `TKT-YEAR-NNNNNN`.

## Integrations
- **Customer auth**: Firebase Phone Auth chosen; implemented as DEV-simulated OTP (backend returns devOtp) with server-side verify + JWT session. Swap to Firebase by adding REACT_APP_FIREBASE_* keys.
- **Payments**: Razorpay MOCK mode (order create + server-side signature verify + webhook w/ idempotency). Add RAZORPAY_KEY_ID/SECRET/WEBHOOK_SECRET to go live.
- **Email/WhatsApp**: scaffolded (in-app notifications live; external send gated on config).
- **Analytics**: GA4 event wrapper (no-op until REACT_APP_GA_MEASUREMENT_ID set).

## Personas
- Customer (individual/business) buying & managing DSCs.
- Super Admin, Staff, Document Verification Staff, Order Staff (role-gated server-side).

## Implemented (2026-09-24)
- Public site: Home, Products (+detail, category filter), Use Cases, Pricing, About, Resources, Contact, Partner, Agent, FAQs, Terms/Privacy/Refund. DSC Finder wizard. No maps / no social icons.
- Customer: OTP login + profile, purchase flow (details→docs→review→coupon→mock Razorpay→success), dashboard (overview, orders + timeline + doc upload/re-upload, DSCs + renew, invoices + printable, support tickets, profile, notifications).
- Admin: dashboard stats + revenue + 15-day expiry widget, orders (filter/search/detail with verify/reject docs, assign CA, status/workflow, issue DSC, shipping, refund), customers, document inbox, DSC mgmt + expiry dashboard (15/30/60/expired/renewing) + reminders + renewals, catalog (products/CAs/FAQs/coupons CRUD), leads (partnership/contact/tickets), system (analytics/staff/audit/SEO settings), global search, CSV export.
- Auto 15-day expiry reminder job (background loop + manual trigger), idempotent per (dscId+expiryDate).
- Security: JWT, bcrypt, role gating, admin login rate-limit/lockout, OTP rate-limit, private doc storage (base64 in Mongo, admin-auth access only), tenant isolation.

## Status
- Backend regression suite: 33/33 pass (`pytest /app/backend/tests/backend_test.py`).
- Frontend E2E: all critical flows verified by testing agent.

## Backlog / Remaining
- **P1**: Real Firebase Phone Auth (keys), Real Razorpay (keys), object storage for documents (move off base64/Mongo).
- **P1**: Persisted DSC status transition to "Expiring Soon" (currently computed on read).
- **P2**: Live email (Resend) + WhatsApp sends, GA4 live wiring, sitemap.xml/robots.txt generation, per-page SEO meta injection, structured data (Product/Organization/Breadcrumb).
- **P2**: Coupon per-customer count filter by paid orders; admin CAPTCHA; FastAPI lifespan migration; tighten CORS for prod; unified OTP error message.
- **P3**: Product/CA logo image uploads, WhatsApp templates, admin analytics GA panel.

## Credentials
See /app/memory/test_credentials.md. Admin: admin@simpldsc.in / Simpl@DSC#Admin2026Kx7q. Owner: imamitk17@gmail.com. Customer: any mobile (devOtp returned by send-otp).
