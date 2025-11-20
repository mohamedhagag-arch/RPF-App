-- ============================================================
-- ✅ Add RLS Policies for Audit Log Tables
-- This script adds read-only RLS policies for audit log tables
-- Only admins can view audit logs
-- ============================================================

-- ============================================================
-- 1. Enable RLS on Audit Log Tables (for SELECT only)
-- ============================================================

-- Enable RLS for SELECT operations
ALTER TABLE boq_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. Grant SELECT Permission
-- ============================================================

GRANT SELECT ON boq_audit_log TO authenticated;
GRANT SELECT ON projects_audit_log TO authenticated;
GRANT SELECT ON kpi_audit_log TO authenticated;

-- ============================================================
-- 3. Create RLS Policies (Admin Only)
-- ============================================================

-- Policy: Only admins can view BOQ audit logs
DROP POLICY IF EXISTS "Admins can view BOQ audit logs" ON boq_audit_log;
CREATE POLICY "Admins can view BOQ audit logs"
  ON boq_audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role = 'admin'
    )
  );

-- Policy: Only admins can view Projects audit logs
DROP POLICY IF EXISTS "Admins can view Projects audit logs" ON projects_audit_log;
CREATE POLICY "Admins can view Projects audit logs"
  ON projects_audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role = 'admin'
    )
  );

-- Policy: Only admins can view KPI audit logs
DROP POLICY IF EXISTS "Admins can view KPI audit logs" ON kpi_audit_log;
CREATE POLICY "Admins can view KPI audit logs"
  ON kpi_audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role = 'admin'
    )
  );

-- ============================================================
-- 4. Note: INSERT operations are handled by triggers with SECURITY DEFINER
-- No RLS policy needed for INSERT as triggers bypass RLS
-- ============================================================

-- ============================================================
-- ✅ Script completed successfully!
-- ============================================================

-- Verify policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('boq_audit_log', 'projects_audit_log', 'kpi_audit_log')
ORDER BY tablename, policyname;

