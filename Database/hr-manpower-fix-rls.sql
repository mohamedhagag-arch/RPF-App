-- ============================================================
-- HR Manpower - Fix RLS Policies
-- إصلاح سياسات RLS لجدول HR Manpower
-- ============================================================
-- 
-- IMPORTANT: Run this script in Supabase SQL Editor if you're getting
-- "permission denied for table hr_manpower" errors
-- 
-- مهم: قم بتنفيذ هذا السكريبت في Supabase SQL Editor إذا كنت تواجه
-- أخطاء "permission denied for table hr_manpower"
--
-- ============================================================

-- Step 1: Disable RLS temporarily to reset everything
ALTER TABLE IF EXISTS public.hr_manpower DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies (complete cleanup)
DROP POLICY IF EXISTS "Users can view hr_manpower" ON public.hr_manpower;
DROP POLICY IF EXISTS "Admins and managers can insert hr_manpower" ON public.hr_manpower;
DROP POLICY IF EXISTS "Admins and managers can update hr_manpower" ON public.hr_manpower;
DROP POLICY IF EXISTS "Admins can delete hr_manpower" ON public.hr_manpower;
DROP POLICY IF EXISTS "hr_manpower_select_all" ON public.hr_manpower;
DROP POLICY IF EXISTS "hr_manpower_insert_admin" ON public.hr_manpower;
DROP POLICY IF EXISTS "hr_manpower_update_admin" ON public.hr_manpower;
DROP POLICY IF EXISTS "hr_manpower_delete_admin" ON public.hr_manpower;

-- Step 3: Re-enable RLS
ALTER TABLE IF EXISTS public.hr_manpower ENABLE ROW LEVEL SECURITY;

-- Step 3.1: Grant table-level permissions (IMPORTANT!)
-- This ensures authenticated users have basic access to the table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hr_manpower TO authenticated;

-- Step 4: Create policies with fallback for auth.users
-- This allows access even if user is not yet in public.users table

-- Policy: All authenticated users can view HR Manpower
CREATE POLICY "hr_manpower_select_all"
  ON public.hr_manpower
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Admins and managers can insert HR Manpower
-- Fallback: Allow if user exists in auth.users (for initial setup)
CREATE POLICY "hr_manpower_insert_admin"
  ON public.hr_manpower
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
    OR
    -- Fallback: Allow if user exists in auth.users (for initial setup)
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
    )
  );

-- Policy: Admins and managers can update HR Manpower
-- Fallback: Allow if user exists in auth.users (for initial setup)
CREATE POLICY "hr_manpower_update_admin"
  ON public.hr_manpower
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
    OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
    OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
    )
  );

-- Policy: Only admins can delete HR Manpower
-- Fallback: Allow if user exists in auth.users (for initial setup)
CREATE POLICY "hr_manpower_delete_admin"
  ON public.hr_manpower
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
    )
  );

-- ============================================================
-- Verification Queries
-- ============================================================
-- Run these queries to verify the setup:

-- 1. Check if table exists
-- SELECT EXISTS (
--   SELECT FROM information_schema.tables 
--   WHERE table_schema = 'public' 
--   AND table_name = 'hr_manpower'
-- );

-- 2. Check RLS is enabled
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename = 'hr_manpower';

-- 3. Check policies
-- SELECT * FROM pg_policies 
-- WHERE tablename = 'hr_manpower';

-- 4. Test current user
-- SELECT auth.uid() as current_user_id;

-- ============================================================
-- بعد تنفيذ هذا السكريبت:
-- 1. تحقق من أن الجدول موجود: استخدم الاستعلام الأول أعلاه
-- 2. تحقق من تفعيل RLS: استخدم الاستعلام الثاني
-- 3. تحقق من السياسات: استخدم الاستعلام الثالث
-- 4. اختبر الوصول: حاول فتح صفحة HR Manpower مرة أخرى
-- ============================================================

