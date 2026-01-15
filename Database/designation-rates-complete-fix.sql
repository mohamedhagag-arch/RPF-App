-- ============================================================
-- Designation Rates Table - Complete Fix
-- إصلاح شامل لجدول designation_rates
-- Run this script in Supabase SQL Editor
-- ============================================================

-- Step 1: Grant schema usage (CRITICAL!)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Step 2: Grant ALL table permissions to authenticated users
GRANT ALL PRIVILEGES ON TABLE public.designation_rates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.designation_rates TO authenticated;

-- Step 3: Grant permissions to anon (as fallback)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.designation_rates TO anon;

-- Step 4: Ensure RLS is enabled
ALTER TABLE public.designation_rates ENABLE ROW LEVEL SECURITY;

-- Step 5: Drop ALL existing policies (complete cleanup)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'designation_rates') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.designation_rates';
    END LOOP;
END $$;

-- Step 6: Create comprehensive RLS policies for authenticated
-- Policy 1: ALL authenticated users can SELECT (read)
CREATE POLICY "designation_rates_select_all"
  ON public.designation_rates
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy 2: ALL authenticated users can INSERT
CREATE POLICY "designation_rates_insert_all"
  ON public.designation_rates
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy 3: ALL authenticated users can UPDATE
CREATE POLICY "designation_rates_update_all"
  ON public.designation_rates
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy 4: ALL authenticated users can DELETE
CREATE POLICY "designation_rates_delete_all"
  ON public.designation_rates
  FOR DELETE
  TO authenticated
  USING (true);

-- Step 7: Create policies for anon (as fallback)
CREATE POLICY "designation_rates_anon_all"
  ON public.designation_rates
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- Verification
-- ============================================================
-- Check permissions
SELECT 
  'Table Permissions' as check_type,
  grantee,
  privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public' 
  AND table_name = 'designation_rates'
  AND grantee IN ('authenticated', 'anon');

-- Check RLS
SELECT 
  'RLS Status' as check_type,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'designation_rates';

-- Check policies
SELECT 
  'Policies' as check_type,
  policyname,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'designation_rates';

-- ============================================================
-- ✅ Complete Fix Applied!
-- ============================================================
