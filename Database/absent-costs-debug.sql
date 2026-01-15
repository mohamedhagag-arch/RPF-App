-- ============================================================
-- Absent Costs - Debug Permissions
-- التحقق من المشكلة بالضبط
-- ============================================================

-- 1. Check current user role
SELECT current_user, session_user;

-- 2. Check if authenticated role has permissions
SELECT 
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.table_privileges
WHERE table_schema = 'public' 
  AND table_name = 'absent_costs'
  AND grantee IN ('authenticated', 'anon', 'public');

-- 3. Check schema permissions
SELECT 
  grantee,
  privilege_type
FROM information_schema.usage_privileges
WHERE object_schema = 'public' 
  AND grantee IN ('authenticated', 'anon', 'public');

-- 4. Check RLS policies
SELECT 
  policyname,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'absent_costs';

-- 5. Try to grant to anon as well (temporary fix)
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.absent_costs TO anon;

-- 6. Create policy for anon (if needed)
DROP POLICY IF EXISTS "absent_costs_anon_all" ON public.absent_costs;
CREATE POLICY "absent_costs_anon_all"
  ON public.absent_costs
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
