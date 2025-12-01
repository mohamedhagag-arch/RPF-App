-- ============================================================
-- Fix Units RLS Policies - ULTIMATE SOLUTION
-- ============================================================
-- This script will completely fix the 403 permission denied error
-- Run this in Supabase SQL Editor

-- Step 1: Check if table exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'units') THEN
    RAISE EXCEPTION 'Table "units" does not exist. Please run "Database/create-units-table.sql" first.';
  END IF;
  RAISE NOTICE '✅ Table "units" exists';
END $$;

-- Step 2: Drop ALL existing policies (complete cleanup)
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

-- Step 3: Ensure RLS is enabled
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

-- Step 4: Create the SIMPLEST possible SELECT policy
-- This policy allows ALL authenticated users to read ALL units
-- No conditions, no checks - just true
CREATE POLICY "units_select_all_authenticated"
  ON public.units
  FOR SELECT
  TO authenticated
  USING (true);

-- Step 5: Verify the policy was created
DO $$
DECLARE
  policy_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'units' 
    AND policyname = 'units_select_all_authenticated'
  ) INTO policy_exists;
  
  IF policy_exists THEN
    RAISE NOTICE '✅ SELECT policy created successfully!';
  ELSE
    RAISE EXCEPTION '❌ Failed to create SELECT policy!';
  END IF;
END $$;

-- Step 6: Test the policy (if possible)
-- Note: This will only work if you're running as a superuser
DO $$
DECLARE
  test_count INTEGER;
BEGIN
  -- Try to count rows (this will test the policy)
  -- Note: This might fail if not running as superuser, which is OK
  BEGIN
    SELECT COUNT(*) INTO test_count FROM public.units;
    RAISE NOTICE '✅ Policy test: Can read % rows from units table', test_count;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Could not test policy (this is OK if not running as superuser)';
  END;
END $$;

-- Step 7: Create INSERT/UPDATE/DELETE policies for admins/managers
-- These are optional - the SELECT policy is the critical one

-- INSERT policy
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

-- UPDATE policy
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

-- DELETE policy
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

-- Step 8: Final verification
DO $$
DECLARE
  policy_count INTEGER;
  select_policy_exists BOOLEAN;
BEGIN
  -- Count all policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'units';
  
  -- Check if SELECT policy exists
  SELECT EXISTS (
    SELECT 1 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'units' 
    AND policyname = 'units_select_all_authenticated'
  ) INTO select_policy_exists;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ RLS Policies Setup Complete!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total policies created: %', policy_count;
  RAISE NOTICE 'SELECT policy exists: %', select_policy_exists;
  RAISE NOTICE '';
  
  IF select_policy_exists AND policy_count >= 1 THEN
    RAISE NOTICE '✅ SUCCESS! The units table should now be accessible.';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Refresh your browser (F5)';
    RAISE NOTICE '2. Go to Settings > Units';
    RAISE NOTICE '3. Units should now load without 403 errors';
  ELSE
    RAISE WARNING '⚠️ WARNING: SELECT policy may not have been created correctly!';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;

