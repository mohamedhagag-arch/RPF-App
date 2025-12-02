-- ============================================================
-- FIX ATTENDANCE ACCESS - FINAL SOLUTION
-- إصلاح الوصول لجداول Attendance - الحل النهائي
-- ============================================================
-- 
-- This script will:
-- 1. Drop ALL policies
-- 2. DISABLE RLS completely
-- 3. Grant full permissions
-- 
-- ============================================================

-- Step 1: Drop ALL existing policies
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT schemaname, tablename, policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename IN ('attendance_employees', 'attendance_records', 'attendance_locations', 'attendance_settings')
  ) LOOP
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
      RAISE NOTICE 'Dropped policy: % on %.%', r.policyname, r.schemaname, r.tablename;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error dropping policy %: %', r.policyname, SQLERRM;
    END;
  END LOOP;
END $$;

-- Step 2: DISABLE RLS completely
ALTER TABLE IF EXISTS public.attendance_employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.attendance_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.attendance_locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.attendance_settings DISABLE ROW LEVEL SECURITY;

-- Step 3: Grant full permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON public.attendance_employees TO authenticated;
GRANT ALL PRIVILEGES ON public.attendance_records TO authenticated;
GRANT ALL PRIVILEGES ON public.attendance_locations TO authenticated;
GRANT ALL PRIVILEGES ON public.attendance_settings TO authenticated;

-- Step 4: Also grant to anon role (for testing)
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL PRIVILEGES ON public.attendance_employees TO anon;
GRANT ALL PRIVILEGES ON public.attendance_records TO anon;
GRANT ALL PRIVILEGES ON public.attendance_locations TO anon;
GRANT ALL PRIVILEGES ON public.attendance_settings TO anon;

-- ============================================================
-- Verification Queries
-- ============================================================
-- Run these to verify:

-- 1. Check RLS status (should be false for all)
SELECT 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename LIKE 'attendance%'
ORDER BY tablename;

-- 2. Check grants
SELECT 
  grantee, 
  table_name, 
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' 
  AND table_name LIKE 'attendance%'
  AND grantee IN ('authenticated', 'anon')
ORDER BY table_name, grantee, privilege_type;

-- 3. Check policies (should be empty)
SELECT 
  schemaname, 
  tablename, 
  policyname
FROM pg_policies 
WHERE tablename LIKE 'attendance%'
ORDER BY tablename, policyname;

-- ============================================================
-- IMPORTANT NOTES
-- ============================================================
-- 
-- ✅ RLS is now DISABLED for all attendance tables
-- ✅ Both authenticated and anon roles have FULL access
-- 
-- After running:
-- 1. Refresh browser (Ctrl+Shift+R for hard refresh)
-- 2. Clear browser cache
-- 3. Make sure you're logged in
-- 
-- ⚠️ This is for development only!
-- 
-- ============================================================

