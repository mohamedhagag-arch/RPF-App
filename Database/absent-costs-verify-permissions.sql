-- ============================================================
-- Absent Costs - Verify Permissions
-- التحقق من صلاحيات جدول absent_costs
-- ============================================================

-- 1. Check table permissions
SELECT 
  grantee,
  privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public' 
  AND table_name = 'absent_costs'
  AND grantee = 'authenticated';

-- 2. Check schema permissions
SELECT 
  grantee,
  privilege_type
FROM information_schema.usage_privileges
WHERE object_schema = 'public' 
  AND grantee = 'authenticated';

-- 3. Check RLS status
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'absent_costs';

-- 4. Check all policies
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
WHERE tablename = 'absent_costs';

-- 5. If permissions are missing, run this:
-- GRANT USAGE ON SCHEMA public TO authenticated;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON public.absent_costs TO authenticated;
