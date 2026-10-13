-- ================================================================
-- MY NET SAAS: 3% MONTHLY REVENUE BILLING & PAYHERO INTEGRATION
-- ================================================================

-- 1. Add Revenue Sharing and PayHero Fields to isp_tenants
ALTER TABLE IF EXISTS isp_tenants
    ADD COLUMN IF NOT EXISTS revenue_percentage NUMERIC(5,2) DEFAULT 3.00,
    ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS overdue_amount NUMERIC(12,2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS overdue_since TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS grace_period_days INT DEFAULT 5,
    -- Tenant's own PayHero credentials for customer payments
    ADD COLUMN IF NOT EXISTS payhero_api_key TEXT,
    ADD COLUMN IF NOT EXISTS payhero_api_secret TEXT,
    ADD COLUMN IF NOT EXISTS payhero_channel_id TEXT,
    ADD COLUMN IF NOT EXISTS payhero_provider TEXT DEFAULT 'm-pesa',
    ADD COLUMN IF NOT EXISTS preferred_gateway TEXT DEFAULT 'both' CHECK (preferred_gateway IN ('mpesa', 'payhero', 'both'));

-- 2. Create Invoices Table for Platform 3% Commission
CREATE TABLE IF NOT EXISTS isp_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    isp_id UUID NOT NULL REFERENCES isp_tenants(id) ON DELETE CASCADE,
    billing_month TEXT NOT NULL,                     -- e.g. "2026-10"
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    gross_revenue NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    fee_percentage NUMERIC(5,2) NOT NULL DEFAULT 3.00,
    amount_due NUMERIC(12,2) NOT NULL DEFAULT 0.00,  -- 3% of gross_revenue
    amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'paid', 'overdue', 'waived')),
    due_date TIMESTAMPTZ NOT NULL,
    payment_method TEXT,                             -- 'mpesa_daraja', 'payhero'
    payment_reference TEXT,                          -- M-Pesa receipt / PayHero ref
    checkout_request_id TEXT,                        -- For STK push matching
    paid_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_isp_invoices_isp_id ON isp_invoices(isp_id);
CREATE INDEX IF NOT EXISTS idx_isp_invoices_status ON isp_invoices(status);
CREATE INDEX IF NOT EXISTS idx_isp_invoices_billing_month ON isp_invoices(billing_month);
CREATE INDEX IF NOT EXISTS idx_isp_invoices_checkout ON isp_invoices(checkout_request_id);

-- 3. Add Gateway column to customer transactions
ALTER TABLE IF EXISTS mpesa_transactions
    ADD COLUMN IF NOT EXISTS gateway TEXT DEFAULT 'daraja', -- 'daraja', 'payhero'
    ADD COLUMN IF NOT EXISTS payhero_reference TEXT;

-- 4. Enable RLS on Invoices
ALTER TABLE IF EXISTS isp_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_invoices" ON isp_invoices;
CREATE POLICY "tenant_isolation_invoices"
    ON isp_invoices FOR ALL
    USING (isp_id = (
        SELECT id FROM isp_tenants
        WHERE owner_id = auth.uid()
    ));

-- 5. Seed default 3% Revenue Share Subscription Plan
INSERT INTO subscription_plans (id, name, price_monthly, max_customers, max_staff, ai_assistant, sms_limit, analytics, priority_support, api_access, white_labeling, features)
VALUES
  ('revenue_share_3', 'Revenue Share (3%)', 0, -1, -1, true, -1, true, true, true, true,
   '["Pay strictly 3% of collected monthly revenue", "Zero upfront fixed fees", "Unlimited Customers & Staff", "M-Pesa Daraja & PayHero Gateways", "MikroTik & SmartOLT Automation", "Overdue Auto-Lock & Recovery", "24/7 AI Network Operations"]')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  features = EXCLUDED.features;
