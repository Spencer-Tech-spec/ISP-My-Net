-- ================================================================
-- ISP CLOUD SaaS - MULTI-TENANT DATABASE SCHEMA
-- Run this in your Supabase SQL editor
-- ================================================================

-- ================================================================
-- 1. SUBSCRIPTION PLANS (your product tiers)
-- ================================================================
CREATE TABLE IF NOT EXISTS subscription_plans (
    id TEXT PRIMARY KEY,               -- 'starter', 'standard', 'enterprise'
    name TEXT NOT NULL,
    price_monthly INT NOT NULL,        -- In KES
    max_customers INT NOT NULL,        -- -1 = unlimited
    max_staff INT NOT NULL,
    ai_assistant BOOLEAN DEFAULT false,
    sms_limit INT DEFAULT 0,           -- Monthly SMS quota; -1 = unlimited
    analytics BOOLEAN DEFAULT false,
    priority_support BOOLEAN DEFAULT false,
    api_access BOOLEAN DEFAULT false,
    white_labeling BOOLEAN DEFAULT false,
    features JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed the three subscription plans
INSERT INTO subscription_plans (id, name, price_monthly, max_customers, max_staff, ai_assistant, sms_limit, analytics, priority_support, api_access, white_labeling, features)
VALUES
  ('starter',    'Starter',    2000,   100,   3,  false, 100,   false, false, false, false,
   '["Customer Management", "Basic Billing", "M-Pesa Customer Payments", "MikroTik Control", "Staff App Access", "Email Support"]'),
  ('standard',   'Standard',   5000,   500,  10,  true,  1000,  true,  false, false, false,
   '["Everything in Starter", "AI Support Assistant", "SMS Notifications", "Advanced Analytics", "Employee Payroll", "Ticket Management", "Priority Email Support"]'),
  ('enterprise', 'Enterprise', 10000, -1,    50,  true,  -1,    true,  true,  true,  true,
   '["Everything in Standard", "Unlimited Customers", "Priority Phone Support", "API Access", "White Labeling", "Custom Domain", "Dedicated Onboarding"]')
ON CONFLICT (id) DO NOTHING;


-- ================================================================
-- 2. ISP TENANTS (ISP companies that subscribe to your platform)
-- ================================================================
CREATE TABLE IF NOT EXISTS isp_tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,                      -- URL-safe identifier e.g. "alphanet"
    owner_id UUID,                                  -- Supabase auth user ID of the ISP owner
    owner_email TEXT NOT NULL,
    phone TEXT,
    county TEXT,
    country TEXT DEFAULT 'Kenya',

    -- Subscription details
    plan_id TEXT REFERENCES subscription_plans(id) DEFAULT 'starter',
    subscription_status TEXT DEFAULT 'trial'
        CHECK (subscription_status IN ('trial', 'active', 'suspended', 'expired', 'cancelled')),
    trial_ends_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '14 days',
    subscription_ends_at TIMESTAMPTZ,
    subscription_renewed_at TIMESTAMPTZ,

    -- ISP's own M-Pesa config (for billing their customers)
    mpesa_shortcode TEXT,
    mpesa_consumer_key TEXT,
    mpesa_consumer_secret TEXT,
    mpesa_passkey TEXT,
    mpesa_callback_url TEXT,
    mpesa_environment TEXT DEFAULT 'sandbox' CHECK (mpesa_environment IN ('sandbox', 'production')),

    -- Network equipment config
    mikrotik_host TEXT,
    mikrotik_username TEXT,
    mikrotik_password TEXT,
    smartolt_api_url TEXT,
    smartolt_api_key TEXT,

    -- Usage tracking
    customer_count INT DEFAULT 0,
    staff_count INT DEFAULT 0,

    -- Branding
    logo_url TEXT,
    primary_color TEXT DEFAULT '#2563eb',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_isp_tenants_updated_at
    BEFORE UPDATE ON isp_tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ================================================================
-- 3. SAAS PAYMENTS (ISPs paying YOU for subscriptions)
-- ================================================================
CREATE TABLE IF NOT EXISTS saas_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    isp_id UUID NOT NULL REFERENCES isp_tenants(id) ON DELETE CASCADE,
    plan_id TEXT NOT NULL REFERENCES subscription_plans(id),
    amount INT NOT NULL,                -- KES amount paid
    mpesa_receipt TEXT,                 -- M-Pesa receipt number
    checkout_request_id TEXT,           -- For matching STK push callback
    merchant_request_id TEXT,
    phone_number TEXT,                  -- Phone number that paid
    status TEXT DEFAULT 'pending'
        CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ================================================================
-- 4. ADD isp_id TO ALL EXISTING TABLES
-- (Run these one by one if some tables don't exist yet)
-- ================================================================

-- profiles (your ISP's customers & staff)
ALTER TABLE IF EXISTS profiles
    ADD COLUMN IF NOT EXISTS isp_id UUID REFERENCES isp_tenants(id);

-- employees
ALTER TABLE IF EXISTS employees
    ADD COLUMN IF NOT EXISTS isp_id UUID REFERENCES isp_tenants(id);

-- support_tickets
ALTER TABLE IF EXISTS support_tickets
    ADD COLUMN IF NOT EXISTS isp_id UUID REFERENCES isp_tenants(id);

-- mpesa_transactions (customer payments)
ALTER TABLE IF EXISTS mpesa_transactions
    ADD COLUMN IF NOT EXISTS isp_id UUID REFERENCES isp_tenants(id);

-- employee_notifications
ALTER TABLE IF EXISTS employee_notifications
    ADD COLUMN IF NOT EXISTS isp_id UUID REFERENCES isp_tenants(id);

-- payroll_history
ALTER TABLE IF EXISTS payroll_history
    ADD COLUMN IF NOT EXISTS isp_id UUID REFERENCES isp_tenants(id);

-- withdrawal_requests
ALTER TABLE IF EXISTS withdrawal_requests
    ADD COLUMN IF NOT EXISTS isp_id UUID REFERENCES isp_tenants(id);

-- settings (MikroTik/M-Pesa settings per ISP)
ALTER TABLE IF EXISTS settings
    ADD COLUMN IF NOT EXISTS isp_id UUID REFERENCES isp_tenants(id);


-- ================================================================
-- 5. INDEXES FOR PERFORMANCE
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_isp_id ON profiles(isp_id);
CREATE INDEX IF NOT EXISTS idx_employees_isp_id ON employees(isp_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_isp_id ON support_tickets(isp_id);
CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_isp_id ON mpesa_transactions(isp_id);
CREATE INDEX IF NOT EXISTS idx_saas_payments_isp_id ON saas_payments(isp_id);
CREATE INDEX IF NOT EXISTS idx_saas_payments_checkout ON saas_payments(checkout_request_id);
CREATE INDEX IF NOT EXISTS idx_isp_tenants_slug ON isp_tenants(slug);
CREATE INDEX IF NOT EXISTS idx_isp_tenants_owner ON isp_tenants(owner_id);


-- ================================================================
-- 6. ROW LEVEL SECURITY (Data isolation between ISPs)
-- ================================================================

-- Enable RLS
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS mpesa_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS employee_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payroll_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS settings ENABLE ROW LEVEL SECURITY;

-- Note: The service role key bypasses RLS (used in backend).
-- These policies protect against direct Supabase client access.
-- The backend enforces isp_id via middleware (see tenant.py).

-- Policy: Users can only read their own ISP's data
DROP POLICY IF EXISTS "tenant_isolation_profiles" ON profiles;
CREATE POLICY "tenant_isolation_profiles"
    ON profiles FOR ALL
    USING (isp_id = (
        SELECT id FROM isp_tenants
        WHERE owner_id = auth.uid()
    ));


-- ================================================================
-- 7. AUDIT LOG TABLE (tracks all important actions)
-- ================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    isp_id UUID REFERENCES isp_tenants(id),
    actor_id UUID,                      -- User who performed the action
    action_type TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_isp_id ON audit_logs(isp_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);


-- ================================================================
-- 8. ISP STAFF ROLES TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS isp_staff_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    isp_id UUID NOT NULL REFERENCES isp_tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,              -- Supabase auth user ID
    role TEXT NOT NULL
        CHECK (role IN ('owner', 'manager', 'technician', 'cashier')),
    invited_by UUID,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(isp_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_isp_staff_roles_isp ON isp_staff_roles(isp_id);
CREATE INDEX IF NOT EXISTS idx_isp_staff_roles_user ON isp_staff_roles(user_id);


-- ================================================================
-- Done! Next step: Run backend/app/utils/tenant.py middleware.
-- ================================================================
