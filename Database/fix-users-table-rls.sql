-- ============================================================
-- Fix Users Table RLS - إصلاح سياسات الأمان لجدول users
-- ============================================================
-- هذا السكريبت يصلح RLS policies لجدول users للسماح بالقراءة

-- ============================================================
-- Step 1: Check current RLS status
-- ============================================================
SELECT 
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'users';

-- ============================================================
-- Step 2: Disable RLS temporarily to test
-- ============================================================
-- ⚠️ مؤقت للاختبار فقط!
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- Step 3: Or keep RLS enabled but allow SELECT for authenticated users
-- ============================================================
-- إذا كنت تريد إبقاء RLS مفعل (موصى به):

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
DROP POLICY IF EXISTS "Admins can insert users" ON public.users;
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;
DROP POLICY IF EXISTS "Allow users to read their own data" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated users to read all users" ON public.users;

-- Create simple policy: Allow authenticated users to read all users
CREATE POLICY "Allow authenticated users to read all users"
ON public.users
FOR SELECT
TO authenticated
USING (true);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile"
ON public.users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Allow admins to do everything
CREATE POLICY "Admins can manage all users"
ON public.users
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ============================================================
-- Step 4: Verify policies
-- ============================================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'users';

-- ============================================================
-- Step 5: Test query (as authenticated user)
-- ============================================================
-- يجب أن يعمل هذا بعد تطبيق السياسات:
SELECT 
  id,
  email,
  full_name,
  role,
  is_active
FROM public.users
WHERE email = 'mohamed.hagag@rabatpfc.com';

-- ============================================================
-- Expected Result:
-- - يجب أن ترى صف واحد
-- - role: admin
-- - is_active: true
-- ============================================================

