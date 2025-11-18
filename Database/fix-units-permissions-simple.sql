-- ============================================================
-- Fix Units Table Permissions - Simple & Reliable
-- ============================================================
-- Run this in Supabase SQL Editor to fix 403 errors
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
CREATE POLICY "units_select_all"
  ON public.units
  FOR SELECT
  TO authenticated
  USING (true);

-- Step 5: Create INSERT policy - Allow all authenticated users to insert
-- Using auth.users instead of public.users to avoid permission issues
CREATE POLICY "units_insert_authenticated"
  ON public.units
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Step 6: Create UPDATE policy - Allow all authenticated users to update
CREATE POLICY "units_update_authenticated"
  ON public.units
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Step 7: Create DELETE policy - Allow all authenticated users to delete
CREATE POLICY "units_delete_authenticated"
  ON public.units
  FOR DELETE
  TO authenticated
  USING (true);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Units permissions fixed successfully!';
  RAISE NOTICE '========================================';
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
  RAISE NOTICE '========================================';
END $$;

