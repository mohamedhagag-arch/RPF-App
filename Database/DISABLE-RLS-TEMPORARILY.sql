-- ============================================================
-- TEMPORARY FIX: Disable RLS for Attendance Tables
-- حل مؤقت: تعطيل RLS لجداول Attendance
-- ============================================================
-- 
-- ⚠️ WARNING: This disables RLS completely for these tables
-- ⚠️ تحذير: هذا يعطل RLS تماماً لهذه الجداول
-- 
-- Use this ONLY for development/testing
-- استخدم هذا فقط للتطوير والاختبار
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
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    RAISE NOTICE 'Dropped policy: % on %.%', r.policyname, r.schemaname, r.tablename;
  END LOOP;
END $$;

-- Step 2: DISABLE RLS completely (TEMPORARY - for development only)
ALTER TABLE public.attendance_employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_settings DISABLE ROW LEVEL SECURITY;

-- Step 3: Grant full permissions to authenticated role
GRANT ALL ON public.attendance_employees TO authenticated;
GRANT ALL ON public.attendance_records TO authenticated;
GRANT ALL ON public.attendance_locations TO authenticated;
GRANT ALL ON public.attendance_settings TO authenticated;

-- ============================================================
-- Verification
-- ============================================================
-- Check RLS status (should be false for all)
SELECT 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename LIKE 'attendance%'
ORDER BY tablename;

-- Check grants
SELECT 
  grantee, 
  table_name, 
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' 
  AND table_name LIKE 'attendance%'
  AND grantee = 'authenticated'
ORDER BY table_name, privilege_type;

-- ============================================================
-- IMPORTANT NOTES
-- ============================================================
-- 
-- ✅ RLS is now DISABLED for these tables
-- ✅ All authenticated users have FULL access
-- 
-- After running:
-- 1. Refresh browser (Ctrl+Shift+R for hard refresh)
-- 2. Make sure you're logged in
-- 3. Clear browser cache if needed
-- 
-- ⚠️ Remember to re-enable RLS in production!
-- 
-- ============================================================

