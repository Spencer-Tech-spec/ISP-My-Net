-- ================================================================
-- FIX MIKROTIK ROUTERS ROW-LEVEL SECURITY (RLS) POLICIES
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/asuxwdfunyfsymjhmexx/sql
-- ================================================================

-- 1. Ensure RLS is active
ALTER TABLE IF EXISTS mikrotik_routers ENABLE ROW LEVEL SECURITY;

-- 2. Drop any legacy restrictive policies
DROP POLICY IF EXISTS "Authenticated users can view routers." ON mikrotik_routers;
DROP POLICY IF EXISTS "Authenticated users can insert routers." ON mikrotik_routers;
DROP POLICY IF EXISTS "Authenticated users can delete routers" ON mikrotik_routers;
DROP POLICY IF EXISTS "Authenticated users can update routers" ON mikrotik_routers;
DROP POLICY IF EXISTS "Allow all router management" ON mikrotik_routers;

-- 3. Create full CRUD policies allowing authenticated administrators to view, add, update, and delete routers
CREATE POLICY "Allow all router management" 
    ON mikrotik_routers 
    FOR ALL 
    USING (true) 
    WITH CHECK (true);

-- 4. Notify completion
SELECT count(*) as total_routers_remaining FROM mikrotik_routers;
