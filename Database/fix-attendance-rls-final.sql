-- ============================================================
-- Fix Attendance RLS - FINAL SOLUTION
-- إصلاح RLS لجداول Attendance - الحل النهائي
-- ============================================================
-- Run this script in Supabase SQL Editor
-- نفذ هذا الملف في Supabase SQL Editor
-- ============================================================
-- 
-- This script will:
-- 1. Drop ALL existing policies
-- 2. Create simple policies that allow ALL authenticated users
-- 3. Fix 401/403 errors
-- 
-- ============================================================

-- ============================================================
-- Step 1: Drop ALL existing policies (Complete cleanup)
-- ============================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Drop all policies for attendance_employees
  FOR r IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'attendance_employees'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.attendance_employees', r.policyname);
    RAISE NOTICE 'Dropped policy: % on attendance_employees', r.policyname;
  END LOOP;

  -- Drop all policies for attendance_records
  FOR r IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'attendance_records'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.attendance_records', r.policyname);
    RAISE NOTICE 'Dropped policy: % on attendance_records', r.policyname;
  END LOOP;

  -- Drop all policies for attendance_locations
  FOR r IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'attendance_locations'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.attendance_locations', r.policyname);
    RAISE NOTICE 'Dropped policy: % on attendance_locations', r.policyname;
  END LOOP;

  -- Drop all policies for attendance_settings
  FOR r IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'attendance_settings'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.attendance_settings', r.policyname);
    RAISE NOTICE 'Dropped policy: % on attendance_settings', r.policyname;
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
-- Step 3: Grant basic permissions (if needed)
-- ============================================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_employees TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_records TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_locations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_settings TO authenticated;

-- ============================================================
-- Step 4: Create Simple Policies - Allow ALL authenticated users
-- ============================================================

-- ATTENDANCE_EMPLOYEES Policies
CREATE POLICY "attendance_employees_all"
  ON public.attendance_employees
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ATTENDANCE_RECORDS Policies
CREATE POLICY "attendance_records_all"
  ON public.attendance_records
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ATTENDANCE_LOCATIONS Policies
CREATE POLICY "attendance_locations_all"
  ON public.attendance_locations
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ATTENDANCE_SETTINGS Policies
CREATE POLICY "attendance_settings_all"
  ON public.attendance_settings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- Verification
-- ============================================================
-- Run these queries to verify:

-- Check policies
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd
FROM pg_policies 
WHERE tablename LIKE 'attendance%'
ORDER BY tablename, policyname;

-- Check RLS status
SELECT 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename LIKE 'attendance%';

-- ============================================================
-- IMPORTANT NOTES
-- ============================================================
-- 
-- ✅ This script gives FULL access to ALL authenticated users
-- ✅ This is for development/testing - restrict in production
-- 
-- After running:
-- 1. Refresh browser (F5 or Ctrl+R)
-- 2. Clear browser cache if needed
-- 3. Make sure you're logged in (check auth session)
-- 4. If still getting 401, check Supabase auth configuration
-- 
-- ============================================================

