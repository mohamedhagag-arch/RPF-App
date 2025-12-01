-- ============================================================
-- Fix MANPOWER Table Permissions
-- إصلاح صلاحيات جدول MANPOWER
-- ============================================================

-- التحقق من وجود الجدول
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'CCD - MANPOWER'
  ) THEN
    RAISE EXCEPTION 'Table "CCD - MANPOWER" does not exist. Please run create-manpower-table.sql first.';
  END IF;
END $$;

-- ============================================================
-- PART 1: Drop existing policies
-- ============================================================

DROP POLICY IF EXISTS "Users can view manpower data" ON public."CCD - MANPOWER" CASCADE;
DROP POLICY IF EXISTS "Users can insert manpower data" ON public."CCD - MANPOWER" CASCADE;
DROP POLICY IF EXISTS "Users can update manpower data" ON public."CCD - MANPOWER" CASCADE;
DROP POLICY IF EXISTS "Admins can delete manpower data" ON public."CCD - MANPOWER" CASCADE;
DROP POLICY IF EXISTS "Users can delete manpower data" ON public."CCD - MANPOWER" CASCADE;
DROP POLICY IF EXISTS "Admins can manage manpower data" ON public."CCD - MANPOWER" CASCADE;

-- ============================================================
-- PART 2: Ensure RLS is enabled
-- ============================================================

ALTER TABLE public."CCD - MANPOWER" ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PART 3: Create policies with proper permissions
-- ============================================================

-- Policy: All authenticated users can view MANPOWER data
CREATE POLICY "Users can view manpower data"
  ON public."CCD - MANPOWER"
  FOR SELECT
  TO authenticated
  USING (TRUE);

-- Policy: Authenticated users can insert MANPOWER data
-- ✅ CRITICAL: Must have both USING and WITH CHECK for INSERT
CREATE POLICY "Users can insert manpower data"
  ON public."CCD - MANPOWER"
  FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

-- Policy: Authenticated users can update MANPOWER data
CREATE POLICY "Users can update manpower data"
  ON public."CCD - MANPOWER"
  FOR UPDATE
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

-- Policy: Only admins can delete MANPOWER data
CREATE POLICY "Admins can delete manpower data"
  ON public."CCD - MANPOWER"
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- ============================================================
-- PART 4: Grant table permissions explicitly
-- ============================================================

-- Grant SELECT, INSERT, UPDATE permissions to authenticated role
GRANT SELECT, INSERT, UPDATE ON public."CCD - MANPOWER" TO authenticated;

-- Grant DELETE permission only to admins (via policy, not direct grant)
-- Note: DELETE is controlled by RLS policy only

-- ============================================================
-- PART 5: Verify policies
-- ============================================================

-- Check if policies exist
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
WHERE tablename = 'CCD - MANPOWER'
ORDER BY policyname;

-- ============================================================
-- PART 6: Test permissions (optional - for debugging)
-- ============================================================

-- This will show current user and their permissions
DO $$
DECLARE
  current_user_id UUID;
  current_user_role TEXT;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  current_user_role := (
    SELECT role FROM public.users WHERE id = current_user_id
  );
  
  RAISE NOTICE 'Current user ID: %', current_user_id;
  RAISE NOTICE 'Current user role: %', current_user_role;
  RAISE NOTICE 'Is authenticated: %', (current_user_id IS NOT NULL);
END $$;

-- ============================================================
-- SUCCESS MESSAGE
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE '✅ MANPOWER table permissions fixed successfully!';
  RAISE NOTICE '✅ All authenticated users can now INSERT, UPDATE, and SELECT';
  RAISE NOTICE '✅ Only admins can DELETE';
END $$;
