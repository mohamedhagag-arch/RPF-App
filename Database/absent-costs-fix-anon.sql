-- ============================================================
-- Absent Costs - Fix for ANON role
-- إصلاح المشكلة للـ ANON role
-- ============================================================

-- Step 1: Grant schema usage to anon
GRANT USAGE ON SCHEMA public TO anon;

-- Step 2: Grant table permissions to anon
GRANT SELECT, INSERT, UPDATE, DELETE ON public.absent_costs TO anon;

-- Step 3: Create policy for anon users
DROP POLICY IF EXISTS "absent_costs_anon_all" ON public.absent_costs;
CREATE POLICY "absent_costs_anon_all"
  ON public.absent_costs
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- Verification
-- ============================================================
SELECT 
  'Permissions' as check_type,
  grantee,
  privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public' 
  AND table_name = 'absent_costs'
  AND grantee IN ('authenticated', 'anon');

SELECT 
  'Policies' as check_type,
  policyname,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'absent_costs';
