-- =====================================================
-- FIX PROCUREMENT TABLES ACCESS - FINAL SOLUTION
-- إصلاح وصول جداول المشتريات - الحل النهائي
-- =====================================================

-- ============================================
-- STEP 1: Drop ALL policies for vendors
-- ============================================
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'vendors' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON vendors';
    END LOOP;
END $$;

-- ============================================
-- STEP 2: Drop ALL policies for procurement_items
-- ============================================
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'procurement_items' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON procurement_items';
    END LOOP;
END $$;

-- ============================================
-- STEP 3: Disable RLS for both tables
-- ============================================
ALTER TABLE IF EXISTS vendors DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS procurement_items DISABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 4: Grant permissions explicitly
-- ============================================
-- Grant all permissions to authenticated role
GRANT ALL ON TABLE vendors TO authenticated;
GRANT ALL ON TABLE procurement_items TO authenticated;

-- Grant usage on schema (if needed)
GRANT USAGE ON SCHEMA public TO authenticated;

-- ============================================
-- STEP 5: Verify RLS is disabled
-- ============================================
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('vendors', 'procurement_items')
ORDER BY tablename;

-- ============================================
-- STEP 6: Test access (should work now)
-- ============================================
-- Test SELECT
SELECT COUNT(*) as vendors_count FROM vendors;
SELECT COUNT(*) as items_count FROM procurement_items;
