-- ============================================================
-- Fix Attendance RLS - Simple and Direct Solution
-- إصلاح RLS لجداول Attendance - حل بسيط ومباشر
-- ============================================================
-- Run this script in Supabase SQL Editor
-- نفذ هذا الملف في Supabase SQL Editor
-- ============================================================

-- ============================================================
-- Step 1: Drop ALL existing policies
-- ============================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Drop policies for attendance_employees
  FOR r IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'attendance_employees'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.attendance_employees', r.policyname);
  END LOOP;

  -- Drop policies for attendance_records
  FOR r IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'attendance_records'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.attendance_records', r.policyname);
  END LOOP;

  -- Drop policies for attendance_locations
  FOR r IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'attendance_locations'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.attendance_locations', r.policyname);
  END LOOP;

  -- Drop policies for attendance_settings
  FOR r IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'attendance_settings'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.attendance_settings', r.policyname);
  END LOOP;
END $$;

-- ============================================================
-- Step 2: Ensure RLS is enabled
-- ============================================================
ALTER TABLE public.attendance_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Step 3: Create Simple Policies - Allow ALL authenticated users
-- ============================================================

-- ATTENDANCE_EMPLOYEES: Allow all authenticated users to read, admins to modify
CREATE POLICY "attendance_employees_select"
  ON public.attendance_employees
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "attendance_employees_insert"
  ON public.attendance_employees
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "attendance_employees_update"
  ON public.attendance_employees
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "attendance_employees_delete"
  ON public.attendance_employees
  FOR DELETE
  TO authenticated
  USING (true);

-- ATTENDANCE_RECORDS: Allow all authenticated users full access
CREATE POLICY "attendance_records_select"
  ON public.attendance_records
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "attendance_records_insert"
  ON public.attendance_records
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "attendance_records_update"
  ON public.attendance_records
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "attendance_records_delete"
  ON public.attendance_records
  FOR DELETE
  TO authenticated
  USING (true);

-- ATTENDANCE_LOCATIONS: Allow all authenticated users full access
CREATE POLICY "attendance_locations_select"
  ON public.attendance_locations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "attendance_locations_insert"
  ON public.attendance_locations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "attendance_locations_update"
  ON public.attendance_locations
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "attendance_locations_delete"
  ON public.attendance_locations
  FOR DELETE
  TO authenticated
  USING (true);

-- ATTENDANCE_SETTINGS: Allow all authenticated users full access
CREATE POLICY "attendance_settings_select"
  ON public.attendance_settings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "attendance_settings_insert"
  ON public.attendance_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "attendance_settings_update"
  ON public.attendance_settings
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "attendance_settings_delete"
  ON public.attendance_settings
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================
-- Verification Query
-- ============================================================
-- Run this to verify policies are created:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd
-- FROM pg_policies 
-- WHERE tablename LIKE 'attendance%'
-- ORDER BY tablename, policyname;

-- ============================================================
-- IMPORTANT NOTES
-- ============================================================
-- 
-- This script gives FULL access to ALL authenticated users.
-- For production, you may want to restrict UPDATE/DELETE to admins only.
-- 
-- After running:
-- 1. Refresh your browser (F5)
-- 2. Clear browser cache if needed
-- 3. Check if you're logged in (401 means not authenticated)
-- 
-- ============================================================

