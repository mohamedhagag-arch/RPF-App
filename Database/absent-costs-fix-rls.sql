-- ============================================================
-- Absent Costs Table - Fix RLS Policies
-- إصلاح سياسات RLS لجدول absent_costs
-- Run this script in Supabase SQL Editor if you're getting
-- "permission denied for table absent_costs" errors
-- ============================================================

-- Step 1: Grant schema usage (CRITICAL - often missing!)
GRANT USAGE ON SCHEMA public TO authenticated;

-- Step 2: Grant ALL table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.absent_costs TO authenticated;

-- Step 3: Enable Row Level Security
ALTER TABLE public.absent_costs ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop ALL existing policies (complete cleanup)
DROP POLICY IF EXISTS "auth_all_absent_costs" ON public.absent_costs;
DROP POLICY IF EXISTS "Users can view absent_costs" ON public.absent_costs;
DROP POLICY IF EXISTS "Users can insert absent_costs" ON public.absent_costs;
DROP POLICY IF EXISTS "Users can update absent_costs" ON public.absent_costs;
DROP POLICY IF EXISTS "Users can delete absent_costs" ON public.absent_costs;
DROP POLICY IF EXISTS "absent_costs_select_all" ON public.absent_costs;
DROP POLICY IF EXISTS "absent_costs_insert_all" ON public.absent_costs;
DROP POLICY IF EXISTS "absent_costs_update_all" ON public.absent_costs;
DROP POLICY IF EXISTS "absent_costs_delete_all" ON public.absent_costs;

-- Step 5: Create comprehensive RLS policies
-- Policy 1: ALL authenticated users can SELECT (read)
CREATE POLICY "absent_costs_select_all"
  ON public.absent_costs
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy 2: ALL authenticated users can INSERT
CREATE POLICY "absent_costs_insert_all"
  ON public.absent_costs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy 3: ALL authenticated users can UPDATE
CREATE POLICY "absent_costs_update_all"
  ON public.absent_costs
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy 4: ALL authenticated users can DELETE
CREATE POLICY "absent_costs_delete_all"
  ON public.absent_costs
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================
-- Verification Queries
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
  cmd
FROM pg_policies
WHERE tablename = 'absent_costs';

-- ============================================================
-- ✅ Absent Costs RLS Fix Complete!
-- ============================================================
-- The table now has:
-- ✅ Schema usage granted
-- ✅ Table permissions granted
-- ✅ RLS enabled
-- ✅ Comprehensive policies for all CRUD operations
-- ============================================================
