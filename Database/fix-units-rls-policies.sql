-- ============================================================
-- Fix Units RLS Policies - Simple and Reliable
-- ============================================================
-- Run this script if you're getting 403 errors when accessing units table

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Allow authenticated users to view active units" ON public.units;
DROP POLICY IF EXISTS "Allow authenticated users to view units" ON public.units;
DROP POLICY IF EXISTS "Allow admins and managers to view all units" ON public.units;
DROP POLICY IF EXISTS "Allow admins and managers to insert units" ON public.units;
DROP POLICY IF EXISTS "Allow admins and managers to update units" ON public.units;
DROP POLICY IF EXISTS "Allow admins and managers to delete units" ON public.units;
DROP POLICY IF EXISTS "Allow service role full access" ON public.units;
DROP POLICY IF EXISTS "Fallback: Allow all authenticated users to view units" ON public.units;

-- ✅ SIMPLE AND RELIABLE: Allow all authenticated users to SELECT (read)
CREATE POLICY "units_select_policy"
  ON public.units
  FOR SELECT
  TO authenticated
  USING (true);

-- ✅ Allow admins and managers to INSERT
CREATE POLICY "units_insert_policy"
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

-- ✅ Allow admins and managers to UPDATE
CREATE POLICY "units_update_policy"
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

-- ✅ Allow admins and managers to DELETE
CREATE POLICY "units_delete_policy"
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

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Units RLS policies fixed successfully!';
  RAISE NOTICE '✅ All authenticated users can now read units';
  RAISE NOTICE '✅ Admins and managers can insert/update/delete units';
END $$;

