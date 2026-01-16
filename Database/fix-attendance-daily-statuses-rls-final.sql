-- ============================================================
-- Fix Attendance Daily Statuses RLS - FINAL VERSION
-- إصلاح نهائي لسياسات RLS لجدول attendance_daily_statuses
-- Run this script in Supabase SQL Editor.
-- ============================================================

-- ============================================================
-- Step 1: Grant ALL permissions first (before RLS)
-- ============================================================
GRANT ALL ON TABLE public.attendance_daily_statuses TO authenticated;
GRANT ALL ON TABLE public.attendance_daily_statuses TO postgres;
GRANT ALL ON TABLE public.attendance_daily_statuses TO service_role;
GRANT SELECT ON TABLE public.attendance_daily_statuses TO anon;

-- ============================================================
-- Step 2: Disable RLS temporarily
-- ============================================================
ALTER TABLE public.attendance_daily_statuses DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- Step 3: Drop ALL existing policies
-- ============================================================
DROP POLICY IF EXISTS attendance_daily_statuses_select_all ON public.attendance_daily_statuses;
DROP POLICY IF EXISTS attendance_daily_statuses_insert_all ON public.attendance_daily_statuses;
DROP POLICY IF EXISTS attendance_daily_statuses_update_admin ON public.attendance_daily_statuses;
DROP POLICY IF EXISTS attendance_daily_statuses_update_all ON public.attendance_daily_statuses;
DROP POLICY IF EXISTS attendance_daily_statuses_delete_admin ON public.attendance_daily_statuses;
DROP POLICY IF EXISTS attendance_daily_statuses_delete_all ON public.attendance_daily_statuses;

-- Drop any other policies that might exist
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'attendance_daily_statuses') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.attendance_daily_statuses';
    END LOOP;
END $$;

-- ============================================================
-- Step 4: Re-enable RLS
-- ============================================================
ALTER TABLE public.attendance_daily_statuses ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Step 5: Create NEW very simple policies
-- ============================================================
-- SELECT: Allow all authenticated users
CREATE POLICY attendance_daily_statuses_select_all
  ON public.attendance_daily_statuses
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: Allow all authenticated users (WITH CHECK is required)
CREATE POLICY attendance_daily_statuses_insert_all
  ON public.attendance_daily_statuses
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- UPDATE: Allow all authenticated users
CREATE POLICY attendance_daily_statuses_update_all
  ON public.attendance_daily_statuses
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- DELETE: Allow all authenticated users
CREATE POLICY attendance_daily_statuses_delete_all
  ON public.attendance_daily_statuses
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================
-- Step 6: Verify everything
-- ============================================================
-- Check RLS status
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'attendance_daily_statuses';

-- List all policies
SELECT 
  policyname,
  cmd as operation,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'attendance_daily_statuses'
ORDER BY cmd;

-- Check grants
SELECT 
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'attendance_daily_statuses'
  AND table_schema = 'public';

-- ============================================================
-- ✅ Done! All policies are now very simple and should work.
-- ============================================================
-- If you still get authorization errors, try:
-- 1. Check that you're logged in as authenticated user
-- 2. Check browser console for auth.uid() value
-- 3. Verify that auth.users table has your user
-- ============================================================
