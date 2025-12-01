-- ============================================================
-- Fix Units RLS Policies - FINAL SOLUTION
-- ============================================================
-- This script fixes the 403 permission denied error for units table
-- Run this in Supabase SQL Editor

-- Step 1: Drop ALL existing policies (clean slate)
DROP POLICY IF EXISTS "Allow authenticated users to view active units" ON public.units;
DROP POLICY IF EXISTS "Allow authenticated users to view units" ON public.units;
DROP POLICY IF EXISTS "Allow admins and managers to view all units" ON public.units;
DROP POLICY IF EXISTS "Allow admins and managers to insert units" ON public.units;
DROP POLICY IF EXISTS "Allow admins and managers to update units" ON public.units;
DROP POLICY IF EXISTS "Allow admins and managers to delete units" ON public.units;
DROP POLICY IF EXISTS "Allow service role full access" ON public.units;
DROP POLICY IF EXISTS "Fallback: Allow all authenticated users to view units" ON public.units;
DROP POLICY IF EXISTS "units_select_policy" ON public.units;
DROP POLICY IF EXISTS "units_insert_policy" ON public.units;
DROP POLICY IF EXISTS "units_update_policy" ON public.units;
DROP POLICY IF EXISTS "units_delete_policy" ON public.units;

-- Step 2: Verify RLS is enabled
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

-- Step 3: Create SIMPLE SELECT policy (allows all authenticated users to read)
-- This is the most important policy - it must work!
-- Using the simplest possible policy: USING (true) means ALL authenticated users can read
CREATE POLICY "units_select_all"
  ON public.units
  FOR SELECT
  TO authenticated
  USING (true);

-- Step 4: Create INSERT policy (admins and managers only)
CREATE POLICY "units_insert_admin_manager"
  ON public.units
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND (users.role = 'admin' OR users.role = 'manager')
    )
  );

-- Step 5: Create UPDATE policy (admins and managers only)
CREATE POLICY "units_update_admin_manager"
  ON public.units
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND (users.role = 'admin' OR users.role = 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND (users.role = 'admin' OR users.role = 'manager')
    )
  );

-- Step 6: Create DELETE policy (admins and managers only)
CREATE POLICY "units_delete_admin_manager"
  ON public.units
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND (users.role = 'admin' OR users.role = 'manager')
    )
  );

-- Step 7: Verify policies were created
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'units';
  
  RAISE NOTICE '✅ Created % policies for units table', policy_count;
  
  IF policy_count >= 4 THEN
    RAISE NOTICE '✅ All policies created successfully!';
  ELSE
    RAISE WARNING '⚠️ Expected 4 policies, but found %', policy_count;
  END IF;
END $$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Units RLS Policies Fixed!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ All authenticated users can now READ units';
  RAISE NOTICE '✅ Admins and managers can INSERT/UPDATE/DELETE units';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Refresh the Settings > Units page (F5)';
  RAISE NOTICE '2. Units should now load without 403 errors';
  RAISE NOTICE '========================================';
END $$;

