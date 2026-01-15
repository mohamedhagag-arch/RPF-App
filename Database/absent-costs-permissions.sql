-- ============================================================
-- Absent Costs Table - Permissions & RLS Policies
-- إضافة الصلاحيات وسياسات RLS لجدول absent_costs
-- Run this script in Supabase SQL Editor.
-- ============================================================

-- ============================================================
-- Step 1: Grant Permissions
-- ============================================================
GRANT ALL ON TABLE public.absent_costs TO postgres, authenticated, service_role;
GRANT SELECT ON TABLE public.absent_costs TO anon;

-- ============================================================
-- Step 2: Enable Row Level Security (RLS)
-- ============================================================
ALTER TABLE public.absent_costs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Step 3: Create RLS Policies
-- ============================================================
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "auth_all_absent_costs" ON public.absent_costs;

-- Create policy for authenticated users (allow all operations)
CREATE POLICY "auth_all_absent_costs" ON public.absent_costs
  FOR ALL TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- ============================================================
-- Step 4: Verify Permissions
-- ============================================================
-- Check if RLS is enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'absent_costs';

-- Check policies
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
WHERE tablename = 'absent_costs';

-- ============================================================
-- ✅ Absent Costs Permissions Setup Complete!
-- ============================================================
-- The table now has:
-- ✅ Permissions granted to authenticated users
-- ✅ RLS enabled with permissive policy for authenticated users
-- ✅ All CRUD operations allowed for authenticated users
-- ============================================================
