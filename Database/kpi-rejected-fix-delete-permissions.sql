-- ============================================================
-- Fix Delete Permissions for kpi_rejected table
-- Allow authenticated users to delete when restoring KPIs
-- ============================================================
-- This script updates the RLS policy to allow authenticated users
-- to delete rejected KPIs when restoring them to the main table
-- ============================================================

-- Step 1: Drop existing delete policy
DROP POLICY IF EXISTS "kpi_rejected_delete_admin" ON public.kpi_rejected;

-- Step 2: Create new DELETE policy - Allow ALL authenticated users to delete
-- This is needed for the restore functionality
CREATE POLICY "kpi_rejected_delete_authenticated"
  ON public.kpi_rejected
  FOR DELETE
  TO authenticated
  USING (true);

-- Step 3: Ensure table-level permissions are granted
GRANT DELETE ON public.kpi_rejected TO authenticated;

-- ============================================================
-- Note: This allows all authenticated users to delete rejected KPIs
-- This is necessary for the restore functionality to work properly
-- ============================================================

