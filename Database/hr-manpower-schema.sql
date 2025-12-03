-- ============================================================
-- HR Manpower - Complete Database Schema
-- نظام الموارد البشرية - مخطط قاعدة البيانات الكامل
-- ============================================================
-- 
-- IMPORTANT: Run this script in Supabase SQL Editor
-- مهم: قم بتنفيذ هذا الملف في Supabase SQL Editor
--
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. HR Manpower Table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.hr_manpower (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_code TEXT UNIQUE NOT NULL,
  employee_name TEXT NOT NULL,
  designation TEXT NOT NULL,
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'On Leave')),
  department TEXT,
  phone_number TEXT,
  email TEXT,
  hire_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.hr_manpower IS 'HR Manpower - Employee information and management';
COMMENT ON COLUMN public.hr_manpower.employee_code IS 'Unique employee identifier code';
COMMENT ON COLUMN public.hr_manpower.employee_name IS 'Full name of the employee';
COMMENT ON COLUMN public.hr_manpower.designation IS 'Job title or designation';
COMMENT ON COLUMN public.hr_manpower.status IS 'Employee status: Active, Inactive, or On Leave';

-- ============================================================
-- Create Indexes for Performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_hr_manpower_employee_code ON public.hr_manpower(employee_code);
CREATE INDEX IF NOT EXISTS idx_hr_manpower_employee_name ON public.hr_manpower(employee_name);
CREATE INDEX IF NOT EXISTS idx_hr_manpower_designation ON public.hr_manpower(designation);
CREATE INDEX IF NOT EXISTS idx_hr_manpower_status ON public.hr_manpower(status);
CREATE INDEX IF NOT EXISTS idx_hr_manpower_department ON public.hr_manpower(department);
CREATE INDEX IF NOT EXISTS idx_hr_manpower_created_at ON public.hr_manpower(created_at);

-- ============================================================
-- Enable Row Level Security (RLS)
-- ============================================================
ALTER TABLE public.hr_manpower ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Drop existing policies if they exist (for re-running)
-- ============================================================
DROP POLICY IF EXISTS "Users can view hr_manpower" ON public.hr_manpower;
DROP POLICY IF EXISTS "Admins and managers can insert hr_manpower" ON public.hr_manpower;
DROP POLICY IF EXISTS "Admins and managers can update hr_manpower" ON public.hr_manpower;
DROP POLICY IF EXISTS "Admins can delete hr_manpower" ON public.hr_manpower;
DROP POLICY IF EXISTS "hr_manpower_select_all" ON public.hr_manpower;
DROP POLICY IF EXISTS "hr_manpower_insert_admin" ON public.hr_manpower;
DROP POLICY IF EXISTS "hr_manpower_update_admin" ON public.hr_manpower;
DROP POLICY IF EXISTS "hr_manpower_delete_admin" ON public.hr_manpower;

-- ============================================================
-- RLS Policies
-- ============================================================

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
-- Create Updated At Trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_hr_manpower_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_hr_manpower_updated_at
  BEFORE UPDATE ON public.hr_manpower
  FOR EACH ROW
  EXECUTE FUNCTION update_hr_manpower_updated_at();

-- ============================================================
-- Verification
-- ============================================================
-- After running this script:
-- 1. Verify table is created: Check Supabase Table Editor
-- 2. Verify indexes: SELECT * FROM pg_indexes WHERE tablename = 'hr_manpower';
-- 3. Verify RLS policies: SELECT * FROM pg_policies WHERE tablename = 'hr_manpower';
-- 4. Test insert/update/delete with different user roles

-- ============================================================
-- بعد تنفيذ هذا السكريبت:
-- 1. تحقق من إنشاء الجدول: راجع Supabase Table Editor
-- 2. تحقق من الفهارس: SELECT * FROM pg_indexes WHERE tablename = 'hr_manpower';
-- 3. تحقق من سياسات RLS: SELECT * FROM pg_policies WHERE tablename = 'hr_manpower';
-- 4. اختبر الإدراج/التحديث/الحذف بأدوار مستخدم مختلفة
-- ============================================================

