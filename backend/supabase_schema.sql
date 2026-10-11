-- SimplDSC Supabase / PostgreSQL Database Schema
-- Run this in Supabase SQL Editor to initialize all tables.

-- 1. Sequence Counters (Atomic sequence generator with random step >= 500)
CREATE TABLE IF NOT EXISTS sequence_counters (
    id VARCHAR(100) PRIMARY KEY,
    current_val BIGINT NOT NULL DEFAULT 105225,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Users (Customers)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mobile VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255),
    email VARCHAR(255),
    simpl_dsc_id VARCHAR(100),
    year INT,
    quarter VARCHAR(10),
    sequence_number BIGINT,
    profile_completed BOOLEAN DEFAULT FALSE,
    profile JSONB DEFAULT '{}'::jsonb,
    billing JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_mobile ON users(mobile);
CREATE INDEX IF NOT EXISTS idx_users_simpl_dsc_id ON users(simpl_dsc_id);

-- 3. Agents
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    business VARCHAR(255),
    mobile VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255),
    password VARCHAR(255) NOT NULL,
    city VARCHAR(100),
    state VARCHAR(100),
    commission_rate NUMERIC(5, 2) DEFAULT 15.00,
    total_earned NUMERIC(12, 2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'Active',
    payout_upi VARCHAR(255),
    payout_bank JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agents_code ON agents(agent_code);
CREATE INDEX IF NOT EXISTS idx_agents_mobile ON agents(mobile);

-- 4. Admin Users
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Products
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    user_type VARCHAR(100),
    validity VARCHAR(50),
    base_price NUMERIC(10, 2) NOT NULL,
    professional_fee NUMERIC(10, 2) DEFAULT 0.00,
    total_price NUMERIC(10, 2) NOT NULL,
    popular BOOLEAN DEFAULT FALSE,
    features JSONB DEFAULT '[]'::jsonb,
    required_documents JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Orders
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id VARCHAR(100) UNIQUE NOT NULL,
    simpl_dsc_id VARCHAR(100),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    product_id VARCHAR(100),
    product_name VARCHAR(255),
    product_category VARCHAR(100),
    customer_name VARCHAR(255),
    mobile VARCHAR(20),
    email VARCHAR(255),
    amount NUMERIC(10, 2) DEFAULT 0.00,
    discount NUMERIC(10, 2) DEFAULT 0.00,
    gst NUMERIC(10, 2) DEFAULT 0.00,
    professional_fee NUMERIC(10, 2) DEFAULT 0.00,
    total_amount NUMERIC(10, 2) DEFAULT 0.00,
    currency VARCHAR(10) DEFAULT 'INR',
    agent_code VARCHAR(100),
    agent_id UUID,
    agent_name VARCHAR(255),
    agent_commission NUMERIC(10, 2) DEFAULT 0.00,
    payment_status VARCHAR(50) DEFAULT 'Payment Pending',
    document_status VARCHAR(50) DEFAULT 'Pending',
    order_status VARCHAR(50) DEFAULT 'Documents Pending',
    workflow_stage VARCHAR(100) DEFAULT 'Application Created',
    invoice_no VARCHAR(100),
    required_documents JSONB DEFAULT '[]'::jsonb,
    applicant JSONB DEFAULT '{}'::jsonb,
    shipping JSONB DEFAULT '{}'::jsonb,
    dsc_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_orders_order_id ON orders(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_agent_code ON orders(agent_code);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);

-- 7. Invoices
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_no VARCHAR(100) UNIQUE NOT NULL,
    order_id VARCHAR(100),
    user_id UUID,
    simpl_dsc_id VARCHAR(100),
    amount NUMERIC(10, 2) DEFAULT 0.00,
    discount NUMERIC(10, 2) DEFAULT 0.00,
    gst NUMERIC(10, 2) DEFAULT 0.00,
    professional_fee NUMERIC(10, 2) DEFAULT 0.00,
    total_amount NUMERIC(10, 2) DEFAULT 0.00,
    product_name VARCHAR(255),
    customer_name VARCHAR(255),
    billing JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(50) DEFAULT 'Pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Documents
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id VARCHAR(100) NOT NULL,
    user_id UUID,
    simpl_dsc_id VARCHAR(100),
    document_type VARCHAR(100) NOT NULL,
    file_name VARCHAR(255),
    content_type VARCHAR(100),
    data TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    uploaded_by VARCHAR(255),
    verification_status VARCHAR(50) DEFAULT 'Uploaded',
    rejection_reason TEXT,
    verified_by VARCHAR(255),
    verified_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_documents_order_id ON documents(order_id);

-- 9. DSCs (Issued Certificates)
CREATE TABLE IF NOT EXISTS dscs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    simpl_dsc_id VARCHAR(100),
    dsc_type VARCHAR(100),
    certificate_number VARCHAR(100),
    issued_date TIMESTAMPTZ,
    expiry_date TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Support Tickets
CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id VARCHAR(100) UNIQUE NOT NULL,
    user_id UUID,
    simpl_dsc_id VARCHAR(100),
    subject VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Open',
    priority VARCHAR(50) DEFAULT 'Normal',
    messages JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Partner CAs
CREATE TABLE IF NOT EXISTS partner_cas (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100),
    logo VARCHAR(255),
    rating NUMERIC(3, 1),
    description TEXT,
    active BOOLEAN DEFAULT TRUE
);

-- 12. Partnership Applications
CREATE TABLE IF NOT EXISTS partnership_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID,
    agent_code VARCHAR(100),
    name VARCHAR(255),
    business VARCHAR(255),
    mobile VARCHAR(20),
    email VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    business_type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Coupons
CREATE TABLE IF NOT EXISTS coupons (
    id VARCHAR(100) PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    discount_percent NUMERIC(5, 2) DEFAULT 0.00,
    max_discount NUMERIC(10, 2),
    min_order_amount NUMERIC(10, 2) DEFAULT 0.00,
    active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. FAQs
CREATE TABLE IF NOT EXISTS faqs (
    id VARCHAR(100) PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category VARCHAR(100),
    sort_order INT DEFAULT 0
);

-- 15. Website Settings
CREATE TABLE IF NOT EXISTS website_settings (
    id VARCHAR(100) PRIMARY KEY DEFAULT 'default',
    title VARCHAR(255),
    description TEXT,
    keywords TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_type VARCHAR(50),
    recipient_id VARCHAR(100),
    type VARCHAR(100),
    title VARCHAR(255),
    message TEXT,
    related_entity VARCHAR(100),
    related_entity_id VARCHAR(100),
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id VARCHAR(100),
    actor_email VARCHAR(255),
    role VARCHAR(50),
    action VARCHAR(100),
    entity VARCHAR(100),
    entity_id VARCHAR(100),
    old_value JSONB,
    new_value JSONB,
    ip VARCHAR(50),
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 18. OTP Sessions
CREATE TABLE IF NOT EXISTS otp_sessions (
    id VARCHAR(100) PRIMARY KEY,
    mobile VARCHAR(20) NOT NULL,
    otp_hash VARCHAR(255),
    dev_otp VARCHAR(10),
    verified BOOLEAN DEFAULT FALSE,
    attempts INT DEFAULT 0,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. Order Status History
CREATE TABLE IF NOT EXISTS order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id VARCHAR(100) NOT NULL,
    old_status VARCHAR(100),
    new_status VARCHAR(100),
    changed_by VARCHAR(255),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

-- 20. Admin Login Attempts
CREATE TABLE IF NOT EXISTS admin_login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255),
    ok BOOLEAN DEFAULT FALSE,
    ip VARCHAR(50),
    at TIMESTAMPTZ DEFAULT NOW()
);
