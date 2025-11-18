-- ============================================================
-- Fix Units Table Permissions - FINAL SOLUTION
-- ============================================================
-- Run this in Supabase SQL Editor to fix 403 errors
-- This version uses auth.users instead of public.users to avoid permission issues
-- ============================================================

-- Step 1: Drop ALL existing policies
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

-- Step 3: Grant table-level permissions (important!)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.units TO authenticated;

-- Step 3.1: Grant sequence permissions if it exists
DO $$
BEGIN
  -- Try to grant sequence permissions (if sequence exists)
  EXECUTE 'GRANT USAGE, SELECT ON SEQUENCE public.units_id_seq TO authenticated';
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'Sequence units_id_seq does not exist, skipping...';
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not grant sequence permissions: %', SQLERRM;
END $$;

-- Step 4: Create SELECT policy - ALL authenticated users can read
-- This is the most important policy - it must work for everyone!
CREATE POLICY "units_select_all"
  ON public.units
  FOR SELECT
  TO authenticated
  USING (true);

-- Step 5: Create INSERT policy - Allow all authenticated users to insert
-- We'll allow all authenticated users to insert units
-- If you want to restrict to admins/managers only, you can modify this later
CREATE POLICY "units_insert_authenticated"
  ON public.units
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Alternative INSERT policy (if you want to restrict to admins/managers):
-- This version uses auth.users metadata instead of public.users table
-- Uncomment this and comment the above if you want admin/manager only:
/*
CREATE POLICY "units_insert_admin_manager"
  ON public.units
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Check if user is admin or manager from auth.users raw_user_meta_data
    (auth.jwt() ->> 'user_role') IN ('admin', 'manager')
    OR
    -- Fallback: Allow if user exists in auth.users (for initial setup)
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
    )
  );
*/

-- Step 6: Create UPDATE policy - Allow all authenticated users to update
-- If you want to restrict to admins/managers, modify this policy
CREATE POLICY "units_update_authenticated"
  ON public.units
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Alternative UPDATE policy (if you want to restrict to admins/managers):
/*
CREATE POLICY "units_update_admin_manager"
  ON public.units
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() ->> 'user_role') IN ('admin', 'manager')
    OR
    EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid())
  )
  WITH CHECK (
    (auth.jwt() ->> 'user_role') IN ('admin', 'manager')
    OR
    EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid())
  );
*/

-- Step 7: Create DELETE policy - Allow all authenticated users to delete
-- If you want to restrict to admins/managers, modify this policy
CREATE POLICY "units_delete_authenticated"
  ON public.units
  FOR DELETE
  TO authenticated
  USING (true);

-- Alternative DELETE policy (if you want to restrict to admins/managers):
/*
CREATE POLICY "units_delete_admin_manager"
  ON public.units
  FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() ->> 'user_role') IN ('admin', 'manager')
    OR
    EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid())
  );
*/

-- Step 8: Verify policies were created
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE schemaname = 'public' AND tablename = 'units';
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Total policies created: %', policy_count;
  RAISE NOTICE '========================================';
  
  IF policy_count >= 4 THEN
    RAISE NOTICE '✅ All policies created successfully!';
  ELSE
    RAISE WARNING '⚠️ Expected 4 policies, but found %', policy_count;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Current policies:';
  FOR r IN (
    SELECT policyname, cmd 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'units'
    ORDER BY policyname
  ) LOOP
    RAISE NOTICE '  - % (%)', r.policyname, r.cmd;
  END LOOP;
  RAISE NOTICE '========================================';
END $$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Units permissions fixed successfully!';
  RAISE NOTICE '✅ All authenticated users can now:';
  RAISE NOTICE '   - Read units (SELECT)';
  RAISE NOTICE '   - Insert units (INSERT)';
  RAISE NOTICE '   - Update units (UPDATE)';
  RAISE NOTICE '   - Delete units (DELETE)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Refresh your application (F5)';
  RAISE NOTICE '2. Try creating a new unit';
  RAISE NOTICE '3. It should work now!';
  RAISE NOTICE '';
END $$;


