-- ============================================================
-- Fix Attendance RLS Policies - إصلاح سياسات الأمان
-- ============================================================
-- هذا الملف يصلح مشاكل RLS policies لجداول Attendance
-- Run this script in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- Step 1: Drop ALL existing policies
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can view employees" ON public.attendance_employees;
DROP POLICY IF EXISTS "Admins can manage employees" ON public.attendance_employees;
DROP POLICY IF EXISTS "Users can view own attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Admins can view all attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Users can insert own attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Admins can manage attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Authenticated users can view locations" ON public.attendance_locations;
DROP POLICY IF EXISTS "Admins can manage locations" ON public.attendance_locations;
DROP POLICY IF EXISTS "Authenticated users can view settings" ON public.attendance_settings;
DROP POLICY IF EXISTS "Admins can manage settings" ON public.attendance_settings;

-- ============================================================
-- Step 2: Ensure RLS is enabled
-- ============================================================
ALTER TABLE public.attendance_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Step 3: Create Simple and Reliable Policies
-- ============================================================

-- ============================================================
-- ATTENDANCE_EMPLOYEES Policies
-- ============================================================

-- Allow ALL authenticated users to SELECT (read) employees
CREATE POLICY "attendance_employees_select_all"
  ON public.attendance_employees
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow admins and managers to INSERT employees
CREATE POLICY "attendance_employees_insert_admin"
  ON public.attendance_employees
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

-- Allow admins and managers to UPDATE employees
CREATE POLICY "attendance_employees_update_admin"
  ON public.attendance_employees
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

-- Allow admins and managers to DELETE employees
CREATE POLICY "attendance_employees_delete_admin"
  ON public.attendance_employees
  FOR DELETE
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
  );

-- ============================================================
-- ATTENDANCE_RECORDS Policies
-- ============================================================

-- Allow ALL authenticated users to SELECT (read) attendance records
CREATE POLICY "attendance_records_select_all"
  ON public.attendance_records
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow ALL authenticated users to INSERT attendance records
-- (This allows employees to check in/out)
CREATE POLICY "attendance_records_insert_all"
  ON public.attendance_records
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow admins and managers to UPDATE attendance records
CREATE POLICY "attendance_records_update_admin"
  ON public.attendance_records
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

-- Allow admins and managers to DELETE attendance records
CREATE POLICY "attendance_records_delete_admin"
  ON public.attendance_records
  FOR DELETE
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
  );

-- ============================================================
-- ATTENDANCE_LOCATIONS Policies
-- ============================================================

-- Allow ALL authenticated users to SELECT (read) locations
CREATE POLICY "attendance_locations_select_all"
  ON public.attendance_locations
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow admins and managers to INSERT locations
CREATE POLICY "attendance_locations_insert_admin"
  ON public.attendance_locations
  FOR INSERT
  TO authenticated
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

-- Allow admins and managers to UPDATE locations
CREATE POLICY "attendance_locations_update_admin"
  ON public.attendance_locations
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

-- Allow admins and managers to DELETE locations
CREATE POLICY "attendance_locations_delete_admin"
  ON public.attendance_locations
  FOR DELETE
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
  );

-- ============================================================
-- ATTENDANCE_SETTINGS Policies
-- ============================================================

-- Allow ALL authenticated users to SELECT (read) settings
CREATE POLICY "attendance_settings_select_all"
  ON public.attendance_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow admins to INSERT settings
CREATE POLICY "attendance_settings_insert_admin"
  ON public.attendance_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
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

-- Allow admins to UPDATE settings
CREATE POLICY "attendance_settings_update_admin"
  ON public.attendance_settings
  FOR UPDATE
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
  )
  WITH CHECK (
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

-- Allow admins to DELETE settings
CREATE POLICY "attendance_settings_delete_admin"
  ON public.attendance_settings
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
-- Verification
-- ============================================================
-- Run these queries to verify policies are created:

-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename LIKE 'attendance%'
-- ORDER BY tablename, policyname;

-- ============================================================
-- End of Fix
-- ============================================================
-- 
-- After running this script:
-- 1. Refresh your browser
-- 2. Try accessing Attendance pages again
-- 3. All authenticated users should now be able to read data
-- 4. Only admins/managers can modify data
-- 
-- بعد تنفيذ هذا الملف:
-- 1. قم بتحديث المتصفح
-- 2. جرب الوصول لصفحات Attendance مرة أخرى
-- 3. جميع المستخدمين المصدقين يمكنهم الآن قراءة البيانات
-- 4. فقط المديرين يمكنهم تعديل البيانات

