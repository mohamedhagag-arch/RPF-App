-- ============================================================
-- DISABLE RLS for attendance_daily_statuses - TEMPORARY FIX
-- تعطيل RLS لجدول attendance_daily_statuses - حل مؤقت
-- Run this script in Supabase SQL Editor.
-- ============================================================

-- ============================================================
-- Step 1: Grant ALL permissions
-- ============================================================
GRANT ALL ON TABLE public.attendance_daily_statuses TO authenticated;
GRANT ALL ON TABLE public.attendance_daily_statuses TO postgres;
GRANT ALL ON TABLE public.attendance_daily_statuses TO service_role;
GRANT SELECT ON TABLE public.attendance_daily_statuses TO anon;

-- ============================================================
-- Step 2: Drop ALL existing policies
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
-- Step 3: DISABLE RLS COMPLETELY (TEMPORARY)
-- ============================================================
ALTER TABLE public.attendance_daily_statuses DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- Step 4: Verify
-- ============================================================
-- Check RLS status (should be false)
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'attendance_daily_statuses';

-- Check grants
SELECT 
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'attendance_daily_statuses'
  AND table_schema = 'public';

-- ============================================================
-- ✅ RLS IS NOW DISABLED - This should fix the issue!
-- ============================================================
-- ⚠️ WARNING: This disables security for this table.
-- Make sure to re-enable RLS later with proper policies.
-- ============================================================
