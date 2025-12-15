-- =====================================================
-- FIX VENDOR CATEGORIES TABLE ACCESS - FINAL SOLUTION
-- إصلاح وصول جدول فئات الموردين - الحل النهائي
-- =====================================================

-- ============================================
-- STEP 1: Drop ALL policies for vendor_categories
-- ============================================
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'vendor_categories' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON vendor_categories';
    END LOOP;
END $$;

-- ============================================
-- STEP 2: Disable RLS for vendor_categories
-- ============================================
ALTER TABLE IF EXISTS vendor_categories DISABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 3: Grant permissions explicitly
-- ============================================
-- Grant all permissions to authenticated role
GRANT ALL ON TABLE vendor_categories TO authenticated;
GRANT ALL ON TABLE vendor_categories TO anon;

-- Grant usage on schema (if needed)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- ============================================
-- STEP 4: Verify RLS is disabled
-- ============================================
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'vendor_categories';

-- ============================================
-- STEP 5: Verify permissions
-- ============================================
SELECT 
    grantee,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
AND table_name = 'vendor_categories'
ORDER BY grantee, privilege_type;

