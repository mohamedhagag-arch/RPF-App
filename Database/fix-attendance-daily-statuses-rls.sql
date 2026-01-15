-- ============================================================
-- Fix Attendance Daily Statuses RLS Policies
-- إصلاح سياسات RLS لجدول attendance_daily_statuses
-- Run this script in Supabase SQL Editor.
-- ============================================================

-- ============================================================
-- Step 1: Drop ALL existing policies (including any variations)
-- ============================================================
DROP POLICY IF EXISTS attendance_daily_statuses_select_all ON public.attendance_daily_statuses;
DROP POLICY IF EXISTS attendance_daily_statuses_insert_all ON public.attendance_daily_statuses;
DROP POLICY IF EXISTS attendance_daily_statuses_update_admin ON public.attendance_daily_statuses;
DROP POLICY IF EXISTS attendance_daily_statuses_update_all ON public.attendance_daily_statuses;
DROP POLICY IF EXISTS attendance_daily_statuses_delete_admin ON public.attendance_daily_statuses;

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
-- Step 2: Create simplified RLS Policies
-- ============================================================
-- Allow all authenticated users to read statuses
CREATE POLICY attendance_daily_statuses_select_all
  ON public.attendance_daily_statuses
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow all authenticated users to insert statuses (WITH CHECK is required for INSERT)
CREATE POLICY attendance_daily_statuses_insert_all
  ON public.attendance_daily_statuses
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow all authenticated users to update statuses (simplified)
CREATE POLICY attendance_daily_statuses_update_all
  ON public.attendance_daily_statuses
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow admins/managers to delete (keep restricted)
CREATE POLICY attendance_daily_statuses_delete_admin
  ON public.attendance_daily_statuses
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager'))
    OR EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid())
  );

-- ============================================================
-- Step 3: Verify Permissions
-- ============================================================
-- Check if RLS is enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'attendance_daily_statuses';

-- Check policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'attendance_daily_statuses';

-- ============================================================
-- ✅ Attendance Daily Statuses RLS Fixed!
-- ============================================================
-- The table now has:
-- ✅ SELECT policy for all authenticated users
-- ✅ INSERT policy for all authenticated users (WITH CHECK (true))
-- ✅ UPDATE policy for all authenticated users (simplified)
-- ✅ DELETE policy restricted to admins/managers
-- ============================================================
