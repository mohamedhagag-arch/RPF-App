-- ============================================================
-- Quick Fix: Grant Permissions on boq_items_history Table
-- ============================================================
-- Run this script if you're getting "permission denied" errors
-- ============================================================

-- Grant permissions to authenticated users
GRANT ALL ON TABLE boq_items_history TO postgres, authenticated, service_role;
GRANT SELECT ON TABLE boq_items_history TO anon;

-- Ensure RLS policy exists
DROP POLICY IF EXISTS "auth_all_boq_items_history" ON boq_items_history;
CREATE POLICY "auth_all_boq_items_history" ON boq_items_history
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Verify permissions (this will show current grants)
SELECT 
  grantee, 
  privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'boq_items_history';
