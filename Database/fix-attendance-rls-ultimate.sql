-- ============================================================
-- Fix Attendance RLS - ULTIMATE SOLUTION
-- إصلاح RLS لجداول Attendance - الحل النهائي المطلق
-- ============================================================
-- 
-- هذا الملف يحل مشاكل 401 و 403 نهائياً
-- This file fixes 401 and 403 errors permanently
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
  END LOOP;

  -- Drop all policies for attendance_records
  FOR r IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'attendance_records'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.attendance_records', r.policyname);
  END LOOP;

  -- Drop all policies for attendance_locations
  FOR r IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'attendance_locations'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.attendance_locations', r.policyname);
  END LOOP;

  -- Drop all policies for attendance_settings
  FOR r IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'attendance_settings'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.attendance_settings', r.policyname);
  END LOOP;
END $$;

-- ============================================================
-- Step 2: Grant permissions to authenticated role
-- ============================================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.attendance_employees TO authenticated;
GRANT ALL ON public.attendance_records TO authenticated;
GRANT ALL ON public.attendance_locations TO authenticated;
GRANT ALL ON public.attendance_settings TO authenticated;

-- ============================================================
-- Step 3: Ensure RLS is enabled
-- ============================================================
ALTER TABLE public.attendance_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Step 4: Create Simple Policies - Allow ALL authenticated users
-- ============================================================

-- ATTENDANCE_EMPLOYEES: Full access for authenticated users
CREATE POLICY "attendance_employees_policy"
  ON public.attendance_employees
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ATTENDANCE_RECORDS: Full access for authenticated users
CREATE POLICY "attendance_records_policy"
  ON public.attendance_records
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ATTENDANCE_LOCATIONS: Full access for authenticated users
CREATE POLICY "attendance_locations_policy"
  ON public.attendance_locations
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ATTENDANCE_SETTINGS: Full access for authenticated users
CREATE POLICY "attendance_settings_policy"
  ON public.attendance_settings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- Verification Queries
-- ============================================================
-- Run these to verify everything is set up correctly:

-- 1. Check policies
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

-- 2. Check RLS status
SELECT 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename LIKE 'attendance%';

-- 3. Check grants
SELECT 
  grantee, 
  table_name, 
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' 
  AND table_name LIKE 'attendance%'
  AND grantee = 'authenticated';

-- ============================================================
-- IMPORTANT NOTES
-- ============================================================
-- 
-- ✅ This script gives FULL access to ALL authenticated users
-- ✅ This is for development - you can restrict later in production
-- 
-- After running:
-- 1. Refresh browser (F5 or Ctrl+Shift+R for hard refresh)
-- 2. Clear browser cache if needed
-- 3. Make sure you're logged in
-- 4. Check browser console for any remaining errors
-- 
-- If you still get 401 errors:
-- - Check Supabase Dashboard > Authentication > Users
-- - Make sure your user is active
-- - Check if session is valid
-- 
-- ============================================================

