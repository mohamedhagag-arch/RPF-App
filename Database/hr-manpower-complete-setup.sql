-- ============================================================
-- HR Manpower - Complete Setup Script
-- إعداد كامل لجدول HR Manpower
-- ============================================================
-- 
-- IMPORTANT: Run this script in Supabase SQL Editor
-- This script will:
-- 1. Create the table if it doesn't exist
-- 2. Set up all indexes
-- 3. Configure RLS policies
-- 4. Grant necessary permissions
--
-- مهم: قم بتنفيذ هذا السكريبت في Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Step 1: Create Table (if it doesn't exist)
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

-- ============================================================
-- Step 2: Create Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_hr_manpower_employee_code ON public.hr_manpower(employee_code);
CREATE INDEX IF NOT EXISTS idx_hr_manpower_employee_name ON public.hr_manpower(employee_name);
CREATE INDEX IF NOT EXISTS idx_hr_manpower_designation ON public.hr_manpower(designation);
CREATE INDEX IF NOT EXISTS idx_hr_manpower_status ON public.hr_manpower(status);
CREATE INDEX IF NOT EXISTS idx_hr_manpower_department ON public.hr_manpower(department);
CREATE INDEX IF NOT EXISTS idx_hr_manpower_created_at ON public.hr_manpower(created_at);

-- ============================================================
-- Step 3: Drop ALL existing policies (complete cleanup)
-- ============================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'hr_manpower'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.hr_manpower', r.policyname);
    RAISE NOTICE 'Dropped policy: %', r.policyname;
  END LOOP;
END $$;

-- ============================================================
-- Step 4: Enable RLS
-- ============================================================
ALTER TABLE public.hr_manpower ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Step 5: Grant table-level permissions (CRITICAL!)
-- ============================================================
-- Grant schema usage first
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hr_manpower TO authenticated;

-- ============================================================
-- Step 6: Create RLS Policies
-- ============================================================

-- Policy 1: ALL authenticated users can SELECT (read)
CREATE POLICY "hr_manpower_select_all"
  ON public.hr_manpower
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy 2: ALL authenticated users can INSERT (for now)
-- You can restrict this later if needed
CREATE POLICY "hr_manpower_insert_authenticated"
  ON public.hr_manpower
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy 3: ALL authenticated users can UPDATE (for now)
-- You can restrict this later if needed
CREATE POLICY "hr_manpower_update_authenticated"
  ON public.hr_manpower
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy 4: ALL authenticated users can DELETE (for now)
-- You can restrict this later if needed
CREATE POLICY "hr_manpower_delete_authenticated"
  ON public.hr_manpower
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================
-- Step 7: Create Updated At Trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_hr_manpower_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_hr_manpower_updated_at ON public.hr_manpower;
CREATE TRIGGER update_hr_manpower_updated_at
  BEFORE UPDATE ON public.hr_manpower
  FOR EACH ROW
  EXECUTE FUNCTION update_hr_manpower_updated_at();

-- ============================================================
-- Verification
-- ============================================================
-- After running this script, verify with these queries:

-- 1. Check table exists
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

-- 3. Check policies exist
-- SELECT policyname, cmd, qual, with_check
-- FROM pg_policies 
-- WHERE tablename = 'hr_manpower';

-- 4. Check grants
-- SELECT grantee, privilege_type
-- FROM information_schema.role_table_grants
-- WHERE table_schema = 'public' 
-- AND table_name = 'hr_manpower'
-- AND grantee = 'authenticated';

-- ============================================================
-- Success Message
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE '✅ HR Manpower table setup completed successfully!';
  RAISE NOTICE '✅ Table created/verified';
  RAISE NOTICE '✅ Indexes created';
  RAISE NOTICE '✅ RLS enabled';
  RAISE NOTICE '✅ Permissions granted';
  RAISE NOTICE '✅ Policies created';
  RAISE NOTICE '';
  RAISE NOTICE 'You can now access the HR Manpower page in your application.';
END $$;

