-- ============================================================
-- HR Manpower - Quick Fix (Simplest Solution)
-- إصلاح سريع لجدول HR Manpower
-- ============================================================
-- 
-- Run this in Supabase SQL Editor if you're getting 401/403 errors
-- شغّل هذا في Supabase SQL Editor إذا كنت تواجه أخطاء 401/403
--
-- ============================================================

-- Step 1: Ensure table exists
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

-- Step 2: Drop all existing policies
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
  END LOOP;
END $$;

-- Step 3: Disable RLS temporarily
ALTER TABLE public.hr_manpower DISABLE ROW LEVEL SECURITY;

-- Step 4: Grant ALL permissions to authenticated role
GRANT ALL ON public.hr_manpower TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Step 5: Re-enable RLS
ALTER TABLE public.hr_manpower ENABLE ROW LEVEL SECURITY;

-- Step 6: Create SIMPLE policies (allow everything for authenticated users)
CREATE POLICY "hr_manpower_all_authenticated"
  ON public.hr_manpower
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Step 7: Verify
DO $$
BEGIN
  RAISE NOTICE '✅ Quick fix applied successfully!';
  RAISE NOTICE '✅ Table: hr_manpower';
  RAISE NOTICE '✅ Permissions: GRANTED';
  RAISE NOTICE '✅ Policy: hr_manpower_all_authenticated';
  RAISE NOTICE '';
  RAISE NOTICE 'Try accessing the HR Manpower page now.';
END $$;

