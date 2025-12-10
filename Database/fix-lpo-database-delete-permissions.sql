-- =====================================================
-- Fix LPO Database Delete Permissions
-- إصلاح صلاحيات حذف جدول قاعدة بيانات أوامر التوريد
-- =====================================================

-- Step 1: Drop ALL existing policies for lpo_database
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'lpo_database' 
        AND schemaname = 'public'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON lpo_database';
    END LOOP;
END $$;

-- Step 2: Disable RLS for lpo_database
ALTER TABLE IF EXISTS lpo_database DISABLE ROW LEVEL SECURITY;

-- Step 3: Grant ALL permissions to authenticated role
GRANT ALL ON TABLE lpo_database TO authenticated;

-- Step 4: Grant usage on schema (if needed)
GRANT USAGE ON SCHEMA public TO authenticated;

-- Step 5: Verify RLS is disabled and permissions are granted
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'lpo_database';

-- Step 6: Verify permissions
SELECT 
    grantee,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
AND table_name = 'lpo_database'
AND grantee = 'authenticated';

