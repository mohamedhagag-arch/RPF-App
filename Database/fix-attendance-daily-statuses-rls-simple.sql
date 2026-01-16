-- ============================================================
-- Fix Attendance Daily Statuses RLS - SIMPLE VERSION
-- إصلاح سياسات RLS لجدول attendance_daily_statuses - نسخة مبسطة
-- Run this script in Supabase SQL Editor.
-- ============================================================

-- ============================================================
-- Step 1: Disable RLS temporarily to drop all policies
-- ============================================================
ALTER TABLE public.attendance_daily_statuses DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- Step 2: Drop ALL existing policies
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
-- Step 3: Re-enable RLS
-- ============================================================
ALTER TABLE public.attendance_daily_statuses ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Step 4: Create NEW simplified policies
-- ============================================================
-- SELECT: Allow all authenticated users to read
CREATE POLICY attendance_daily_statuses_select_all
  ON public.attendance_daily_statuses
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: Allow all authenticated users to insert (WITH CHECK is required)
CREATE POLICY attendance_daily_statuses_insert_all
  ON public.attendance_daily_statuses
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- UPDATE: Allow all authenticated users to update
CREATE POLICY attendance_daily_statuses_update_all
  ON public.attendance_daily_statuses
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- DELETE: Allow all authenticated users to delete (or restrict to admins if needed)
CREATE POLICY attendance_daily_statuses_delete_all
  ON public.attendance_daily_statuses
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================
-- Step 5: Verify everything is correct
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

-- ============================================================
-- ✅ Done! All policies are now simplified and should work.
-- ============================================================
-- Policies created:
-- ✅ SELECT: All authenticated users can read
-- ✅ INSERT: All authenticated users can insert (WITH CHECK (true))
-- ✅ UPDATE: All authenticated users can update
-- ✅ DELETE: All authenticated users can delete
-- ============================================================
