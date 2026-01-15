-- ============================================================
-- Absent Costs Table - Complete Fix
-- إصلاح شامل لجدول absent_costs
-- Run this script in Supabase SQL Editor
-- ============================================================

-- Step 1: Grant schema usage (CRITICAL!)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Step 2: Grant ALL table permissions to authenticated users
GRANT ALL PRIVILEGES ON TABLE public.absent_costs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.absent_costs TO authenticated;

-- Step 3: Ensure RLS is enabled
ALTER TABLE public.absent_costs ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop ALL existing policies (complete cleanup)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'absent_costs') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.absent_costs';
    END LOOP;
END $$;

-- Step 5: Create comprehensive RLS policies
-- Policy 1: ALL authenticated users can SELECT (read)
CREATE POLICY "absent_costs_select_all"
  ON public.absent_costs
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy 2: ALL authenticated users can INSERT
CREATE POLICY "absent_costs_insert_all"
  ON public.absent_costs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy 3: ALL authenticated users can UPDATE
CREATE POLICY "absent_costs_update_all"
  ON public.absent_costs
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy 4: ALL authenticated users can DELETE
CREATE POLICY "absent_costs_delete_all"
  ON public.absent_costs
  FOR DELETE
  TO authenticated
  USING (true);

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
  AND table_name = 'absent_costs'
  AND grantee = 'authenticated';

-- Check RLS
SELECT 
  'RLS Status' as check_type,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'absent_costs';

-- Check policies
SELECT 
  'Policies' as check_type,
  policyname,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'absent_costs';

-- ============================================================
-- ✅ Complete Fix Applied!
-- ============================================================
