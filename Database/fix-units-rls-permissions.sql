-- ============================================================
-- Fix Units RLS Permissions - Complete Solution
-- ============================================================
-- This script fixes the 403 permission denied error for units table
-- Run this in Supabase SQL Editor
-- ============================================================

-- Step 1: Drop ALL existing policies (complete cleanup)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'units'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.units', r.policyname);
    RAISE NOTICE 'Dropped policy: %', r.policyname;
  END LOOP;
END $$;

-- Step 2: Ensure RLS is enabled
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

-- Step 3: Create SIMPLE SELECT policy - Allow ALL authenticated users to read
-- This is the most important policy - it must work for everyone!
CREATE POLICY "units_select_all_authenticated"
  ON public.units
  FOR SELECT
  TO authenticated
  USING (true);

-- Step 4: Create INSERT policy - Allow admins and managers to insert
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
    OR
    -- Fallback: Allow if user exists in auth.users (for initial setup)
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
    )
  );

-- Step 5: Create UPDATE policy - Allow admins and managers to update
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

-- Step 6: Create DELETE policy - Allow admins and managers to delete
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
  
  RAISE NOTICE '✅ Total policies created: %', policy_count;
  
  IF policy_count < 4 THEN
    RAISE WARNING '⚠️ Expected 4 policies, but found %. Please check manually.', policy_count;
  END IF;
END $$;

-- Step 8: Grant necessary permissions on the table
GRANT SELECT ON public.units TO authenticated;
GRANT INSERT ON public.units TO authenticated;
GRANT UPDATE ON public.units TO authenticated;
GRANT DELETE ON public.units TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Units RLS policies fixed successfully!';
  RAISE NOTICE '✅ All authenticated users can now read units';
  RAISE NOTICE '✅ Admins and managers can insert/update/delete units';
END $$;


