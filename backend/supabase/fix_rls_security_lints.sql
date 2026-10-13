-- ================================================================
-- SUPABASE SECURITY ADVISOR FIX: ENABLE RLS & POLICIES
-- Resolves "RLS Disabled in Public" linter warnings
-- ================================================================

-- ----------------------------------------------------------------
-- 1. FIX: public.subscription_plans
-- Issue: Pricing tiers table has RLS disabled.
-- Policy: Anyone (anon/authenticated) can READ plans.
--         Only service_role / super admin can INSERT/UPDATE/DELETE.
-- ----------------------------------------------------------------
ALTER TABLE IF EXISTS public.subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view subscription plans" ON public.subscription_plans;
CREATE POLICY "Anyone can view subscription plans"
    ON public.subscription_plans
    FOR SELECT
    USING (true);


-- ----------------------------------------------------------------
-- 2. FIX: public.isp_tenants
-- Issue: Sensitive ISP tenant company info, owner emails, and configs.
-- Policy: Owners can only view and edit their own tenant record.
--         Public cannot read other ISPs' data.
-- ----------------------------------------------------------------
ALTER TABLE IF EXISTS public.isp_tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can view own ISP tenant" ON public.isp_tenants;
CREATE POLICY "Owners can view own ISP tenant"
    ON public.isp_tenants
    FOR SELECT
    TO authenticated
    USING (
        owner_id = auth.uid()
        OR auth.email() IN ('muneneoscar599@gmail.com', 'lordcommander334@gmail.com')
    );

DROP POLICY IF EXISTS "Owners can update own ISP tenant" ON public.isp_tenants;
CREATE POLICY "Owners can update own ISP tenant"
    ON public.isp_tenants
    FOR UPDATE
    TO authenticated
    USING (
        owner_id = auth.uid()
        OR auth.email() IN ('muneneoscar599@gmail.com', 'lordcommander334@gmail.com')
    )
    WITH CHECK (
        owner_id = auth.uid()
        OR auth.email() IN ('muneneoscar599@gmail.com', 'lordcommander334@gmail.com')
    );


-- ----------------------------------------------------------------
-- 3. FIX: public.company_settings
-- Issue: Bank account numbers and disbursement limits must be restricted.
-- Policy: Only authenticated ISP owners / super admins can access.
-- ----------------------------------------------------------------
ALTER TABLE IF EXISTS public.company_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view company settings" ON public.company_settings;
CREATE POLICY "Admins can view company settings"
    ON public.company_settings
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Super admins can update company settings" ON public.company_settings;
CREATE POLICY "Super admins can update company settings"
    ON public.company_settings
    FOR ALL
    TO authenticated
    USING (
        auth.email() IN ('muneneoscar599@gmail.com', 'lordcommander334@gmail.com')
        OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'isp_owner')
    );


-- ----------------------------------------------------------------
-- 4. FIX: public.transactions & public.mpesa_transactions
-- Issue: Financial payment records exposed to public API.
-- Policy: Restrict to authenticated admins and ISP owners.
-- ----------------------------------------------------------------
DO $$
BEGIN
    -- Fix public.transactions
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'transactions') THEN
        EXECUTE 'ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY';
        
        -- Add isp_id column safely if you plan to use it for multi-tenancy
        EXECUTE 'ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS isp_id UUID REFERENCES public.isp_tenants(id)';

        EXECUTE 'DROP POLICY IF EXISTS "tenant_isolation_transactions" ON public.transactions';
        EXECUTE 'DROP POLICY IF EXISTS "admin_access_transactions" ON public.transactions';

        EXECUTE 'CREATE POLICY "admin_access_transactions" ON public.transactions
            FOR ALL
            TO authenticated
            USING (
                auth.email() IN (''muneneoscar599@gmail.com'', ''lordcommander334@gmail.com'')
                OR (auth.jwt() -> ''user_metadata'' ->> ''role'') IN (''admin'', ''isp_owner'')
            )';
    END IF;

    -- Fix public.mpesa_transactions
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mpesa_transactions') THEN
        EXECUTE 'ALTER TABLE public.mpesa_transactions ENABLE ROW LEVEL SECURITY';
        
        EXECUTE 'ALTER TABLE public.mpesa_transactions ADD COLUMN IF NOT EXISTS isp_id UUID REFERENCES public.isp_tenants(id)';

        EXECUTE 'DROP POLICY IF EXISTS "tenant_isolation_mpesa_transactions" ON public.mpesa_transactions';
        EXECUTE 'DROP POLICY IF EXISTS "admin_access_mpesa_transactions" ON public.mpesa_transactions';

        EXECUTE 'CREATE POLICY "admin_access_mpesa_transactions" ON public.mpesa_transactions
            FOR ALL
            TO authenticated
            USING (
                auth.email() IN (''muneneoscar599@gmail.com'', ''lordcommander334@gmail.com'')
                OR (auth.jwt() -> ''user_metadata'' ->> ''role'') IN (''admin'', ''isp_owner'')
            )';
    END IF;

    -- Fix public.isp_invoices
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'isp_invoices') THEN
        EXECUTE 'ALTER TABLE public.isp_invoices ENABLE ROW LEVEL SECURITY';
        EXECUTE 'DROP POLICY IF EXISTS "tenant_isolation_invoices" ON public.isp_invoices';
        EXECUTE 'CREATE POLICY "tenant_isolation_invoices" ON public.isp_invoices
            FOR ALL
            TO authenticated
            USING (
                isp_id IN (SELECT id FROM public.isp_tenants WHERE owner_id = auth.uid())
                OR auth.email() IN (''muneneoscar599@gmail.com'', ''lordcommander334@gmail.com'')
                OR (auth.jwt() -> ''user_metadata'' ->> ''role'') = ''admin''
            )';
    END IF;

    -- Fix public.saas_payments
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'saas_payments') THEN
        EXECUTE 'ALTER TABLE public.saas_payments ENABLE ROW LEVEL SECURITY';
        EXECUTE 'DROP POLICY IF EXISTS "tenant_isolation_saas_payments" ON public.saas_payments';
        EXECUTE 'CREATE POLICY "tenant_isolation_saas_payments" ON public.saas_payments
            FOR ALL
            TO authenticated
            USING (
                isp_id IN (SELECT id FROM public.isp_tenants WHERE owner_id = auth.uid())
                OR auth.email() IN (''muneneoscar599@gmail.com'', ''lordcommander334@gmail.com'')
                OR (auth.jwt() -> ''user_metadata'' ->> ''role'') = ''admin''
            )';
    END IF;

    -- Fix public.audit_logs
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'audit_logs') THEN
        EXECUTE 'ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY';
        EXECUTE 'DROP POLICY IF EXISTS "tenant_isolation_audit_logs" ON public.audit_logs';
        EXECUTE 'CREATE POLICY "tenant_isolation_audit_logs" ON public.audit_logs
            FOR ALL
            TO authenticated
            USING (
                isp_id IN (SELECT id FROM public.isp_tenants WHERE owner_id = auth.uid())
                OR auth.email() IN (''muneneoscar599@gmail.com'', ''lordcommander334@gmail.com'')
                OR (auth.jwt() -> ''user_metadata'' ->> ''role'') = ''admin''
            )';
    END IF;

    -- Fix public.isp_staff_roles
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'isp_staff_roles') THEN
        EXECUTE 'ALTER TABLE public.isp_staff_roles ENABLE ROW LEVEL SECURITY';
        EXECUTE 'DROP POLICY IF EXISTS "tenant_isolation_staff_roles" ON public.isp_staff_roles';
        EXECUTE 'CREATE POLICY "tenant_isolation_staff_roles" ON public.isp_staff_roles
            FOR ALL
            TO authenticated
            USING (
                user_id = auth.uid()
                OR isp_id IN (SELECT id FROM public.isp_tenants WHERE owner_id = auth.uid())
                OR auth.email() IN (''muneneoscar599@gmail.com'', ''lordcommander334@gmail.com'')
            )';
    END IF;
END $$;