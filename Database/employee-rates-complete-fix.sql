-- ============================================================
-- Employee Rates Table - Complete Setup with RLS
-- إعداد كامل لجدول employee_rates مع RLS
-- Run this script in Supabase SQL Editor
-- ============================================================

-- Step 1: Grant schema usage (CRITICAL!)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Step 2: Grant ALL table permissions to authenticated users
GRANT ALL PRIVILEGES ON TABLE public.employee_rates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.employee_rates TO authenticated;

-- Step 3: Grant permissions to anon (as fallback)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.employee_rates TO anon;

-- Step 4: Ensure RLS is enabled
ALTER TABLE public.employee_rates ENABLE ROW LEVEL SECURITY;

-- Step 5: Drop ALL existing policies (complete cleanup)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'employee_rates') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.employee_rates';
    END LOOP;
END $$;

-- Step 6: Create comprehensive RLS policies for authenticated
-- Policy 1: ALL authenticated users can SELECT (read)
CREATE POLICY "employee_rates_select_all"
  ON public.employee_rates
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy 2: ALL authenticated users can INSERT
CREATE POLICY "employee_rates_insert_all"
  ON public.employee_rates
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy 3: ALL authenticated users can UPDATE
CREATE POLICY "employee_rates_update_all"
  ON public.employee_rates
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy 4: ALL authenticated users can DELETE
CREATE POLICY "employee_rates_delete_all"
  ON public.employee_rates
  FOR DELETE
  TO authenticated
  USING (true);

-- Step 7: Create policies for anon (as fallback)
CREATE POLICY "employee_rates_anon_all"
  ON public.employee_rates
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
  AND table_name = 'employee_rates'
  AND grantee IN ('authenticated', 'anon');

-- Check RLS
SELECT 
  'RLS Status' as check_type,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'employee_rates';

-- Check policies
SELECT 
  'Policies' as check_type,
  policyname,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'employee_rates';

-- ============================================================
-- Success Message
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Employee Rates RLS policies created successfully!';
  RAISE NOTICE '🔐 RLS enabled with full access for authenticated users';
END $$;
