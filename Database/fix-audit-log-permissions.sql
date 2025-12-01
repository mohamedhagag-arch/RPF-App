-- ============================================================
-- ✅ Fix Audit Log Permissions
-- This script fixes permission issues with audit log triggers
-- ============================================================

-- ============================================================
-- 1. Update Functions to Use SECURITY DEFINER and Handle Errors
-- ============================================================

-- Function to log BOQ changes
CREATE OR REPLACE FUNCTION log_boq_change()
RETURNS TRIGGER AS $$
DECLARE
  changed_by_value TEXT;
BEGIN
  -- Get changed_by from NEW record or use current user
  changed_by_value := COALESCE(NEW.updated_by, NEW.created_by, current_setting('app.user_email', true), 'System');
  
  BEGIN
    IF TG_OP = 'INSERT' THEN
      INSERT INTO boq_audit_log (boq_id, action, changed_by, new_values)
      VALUES (NEW.id, 'INSERT', changed_by_value, row_to_json(NEW));
      RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
      INSERT INTO boq_audit_log (boq_id, action, changed_by, old_values, new_values)
      VALUES (NEW.id, 'UPDATE', changed_by_value, row_to_json(OLD), row_to_json(NEW));
      RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
      INSERT INTO boq_audit_log (boq_id, action, changed_by, old_values)
      VALUES (OLD.id, 'DELETE', COALESCE(OLD.updated_by, OLD.created_by, 'System'), row_to_json(OLD));
      RETURN OLD;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the main operation
    RAISE WARNING 'Failed to log BOQ audit: %', SQLERRM;
    -- Return appropriate value to allow main operation to continue
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log Project changes
CREATE OR REPLACE FUNCTION log_project_change()
RETURNS TRIGGER AS $$
DECLARE
  changed_by_value TEXT;
BEGIN
  -- Get changed_by from NEW record or use current user
  changed_by_value := COALESCE(NEW.updated_by, NEW.created_by, current_setting('app.user_email', true), 'System');
  
  BEGIN
    IF TG_OP = 'INSERT' THEN
      INSERT INTO projects_audit_log (project_id, action, changed_by, new_values)
      VALUES (NEW.id, 'INSERT', changed_by_value, row_to_json(NEW));
      RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
      INSERT INTO projects_audit_log (project_id, action, changed_by, old_values, new_values)
      VALUES (NEW.id, 'UPDATE', changed_by_value, row_to_json(OLD), row_to_json(NEW));
      RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
      INSERT INTO projects_audit_log (project_id, action, changed_by, old_values)
      VALUES (OLD.id, 'DELETE', COALESCE(OLD.updated_by, OLD.created_by, 'System'), row_to_json(OLD));
      RETURN OLD;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the main operation
    RAISE WARNING 'Failed to log Project audit: %', SQLERRM;
    -- Return appropriate value to allow main operation to continue
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log KPI changes
CREATE OR REPLACE FUNCTION log_kpi_change()
RETURNS TRIGGER AS $$
DECLARE
  changed_by_value TEXT;
  action_type TEXT;
BEGIN
  -- Get changed_by from NEW record or use current user
  changed_by_value := COALESCE(NEW.updated_by, NEW.created_by, current_setting('app.user_email', true), 'System');
  
  -- Determine action type
  IF TG_OP = 'INSERT' THEN
    action_type := 'INSERT';
  ELSIF TG_OP = 'UPDATE' THEN
    -- Check if this is an approval/rejection
    IF OLD."Approval Status" IS DISTINCT FROM NEW."Approval Status" THEN
      IF NEW."Approval Status" = 'approved' THEN
        action_type := 'APPROVE';
      ELSIF NEW."Approval Status" = 'rejected' THEN
        action_type := 'REJECT';
      ELSE
        action_type := 'UPDATE';
      END IF;
    ELSE
      action_type := 'UPDATE';
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'DELETE';
  END IF;
  
  BEGIN
    IF TG_OP = 'INSERT' THEN
      INSERT INTO kpi_audit_log (kpi_id, action, changed_by, new_values)
      VALUES (NEW.id, action_type, changed_by_value, row_to_json(NEW));
      RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
      INSERT INTO kpi_audit_log (kpi_id, action, changed_by, old_values, new_values)
      VALUES (NEW.id, action_type, changed_by_value, row_to_json(OLD), row_to_json(NEW));
      RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
      INSERT INTO kpi_audit_log (kpi_id, action, changed_by, old_values)
      VALUES (OLD.id, action_type, COALESCE(OLD.updated_by, OLD.created_by, 'System'), row_to_json(OLD));
      RETURN OLD;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the main operation
    RAISE WARNING 'Failed to log KPI audit: %', SQLERRM;
    -- Return appropriate value to allow main operation to continue
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 2. Grant Permissions on Audit Log Tables
-- ============================================================

-- Grant INSERT permission to authenticated users (or service role)
GRANT INSERT ON boq_audit_log TO authenticated;
GRANT INSERT ON projects_audit_log TO authenticated;
GRANT INSERT ON kpi_audit_log TO authenticated;

-- Grant INSERT permission to service_role (for triggers)
GRANT INSERT ON boq_audit_log TO service_role;
GRANT INSERT ON projects_audit_log TO service_role;
GRANT INSERT ON kpi_audit_log TO service_role;

-- ============================================================
-- 3. Disable RLS on Audit Log Tables (if needed)
-- ============================================================

-- Note: Audit log tables should not have RLS enabled
-- as they are system tables that should be accessible to triggers
ALTER TABLE boq_audit_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects_audit_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_audit_log DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- ✅ Script completed successfully!
-- ============================================================

-- Verify functions were updated
SELECT 
  routine_name,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('log_boq_change', 'log_project_change', 'log_kpi_change');

