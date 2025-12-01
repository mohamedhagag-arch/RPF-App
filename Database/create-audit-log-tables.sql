-- ============================================================
-- ✅ Create Audit Log Tables for Complete History Tracking
-- This script creates audit log tables to track ALL changes
-- ============================================================

-- ============================================================
-- 1. BOQ Audit Log Table
-- ============================================================

CREATE TABLE IF NOT EXISTS boq_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boq_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  changed_by TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  old_values JSONB,
  new_values JSONB,
  changes_summary TEXT,
  ip_address INET,
  user_agent TEXT
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_boq_audit_log_boq_id ON boq_audit_log(boq_id);
CREATE INDEX IF NOT EXISTS idx_boq_audit_log_changed_at ON boq_audit_log(changed_at);
CREATE INDEX IF NOT EXISTS idx_boq_audit_log_changed_by ON boq_audit_log(changed_by);

-- Add comments
COMMENT ON TABLE boq_audit_log IS 'Audit log for all BOQ activity changes';
COMMENT ON COLUMN boq_audit_log.boq_id IS 'ID of the BOQ activity record';
COMMENT ON COLUMN boq_audit_log.action IS 'Type of action: INSERT, UPDATE, or DELETE';
COMMENT ON COLUMN boq_audit_log.changed_by IS 'Email or ID of user who made the change';
COMMENT ON COLUMN boq_audit_log.old_values IS 'Previous values before change (JSON)';
COMMENT ON COLUMN boq_audit_log.new_values IS 'New values after change (JSON)';

-- ============================================================
-- 2. Projects Audit Log Table
-- ============================================================

CREATE TABLE IF NOT EXISTS projects_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  changed_by TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  old_values JSONB,
  new_values JSONB,
  changes_summary TEXT,
  ip_address INET,
  user_agent TEXT
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_projects_audit_log_project_id ON projects_audit_log(project_id);
CREATE INDEX IF NOT EXISTS idx_projects_audit_log_changed_at ON projects_audit_log(changed_at);
CREATE INDEX IF NOT EXISTS idx_projects_audit_log_changed_by ON projects_audit_log(changed_by);

-- Add comments
COMMENT ON TABLE projects_audit_log IS 'Audit log for all project changes';
COMMENT ON COLUMN projects_audit_log.project_id IS 'ID of the project record';
COMMENT ON COLUMN projects_audit_log.action IS 'Type of action: INSERT, UPDATE, or DELETE';
COMMENT ON COLUMN projects_audit_log.changed_by IS 'Email or ID of user who made the change';
COMMENT ON COLUMN projects_audit_log.old_values IS 'Previous values before change (JSON)';
COMMENT ON COLUMN projects_audit_log.new_values IS 'New values after change (JSON)';

-- ============================================================
-- 3. KPI Audit Log Table (if not exists)
-- ============================================================

CREATE TABLE IF NOT EXISTS kpi_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT')),
  changed_by TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  old_values JSONB,
  new_values JSONB,
  changes_summary TEXT,
  ip_address INET,
  user_agent TEXT
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_kpi_audit_log_kpi_id ON kpi_audit_log(kpi_id);
CREATE INDEX IF NOT EXISTS idx_kpi_audit_log_changed_at ON kpi_audit_log(changed_at);
CREATE INDEX IF NOT EXISTS idx_kpi_audit_log_changed_by ON kpi_audit_log(changed_by);

-- Add comments
COMMENT ON TABLE kpi_audit_log IS 'Audit log for all KPI changes including approvals';
COMMENT ON COLUMN kpi_audit_log.kpi_id IS 'ID of the KPI record';
COMMENT ON COLUMN kpi_audit_log.action IS 'Type of action: INSERT, UPDATE, DELETE, APPROVE, or REJECT';
COMMENT ON COLUMN kpi_audit_log.changed_by IS 'Email or ID of user who made the change';

-- ============================================================
-- 4. Create Trigger Functions for Automatic Audit Logging
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
-- 5. Create Triggers
-- ============================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS boq_audit_trigger ON "Planning Database - BOQ Rates";
DROP TRIGGER IF EXISTS projects_audit_trigger ON "Planning Database - ProjectsList";
DROP TRIGGER IF EXISTS kpi_audit_trigger ON "Planning Database - KPI";

-- Create triggers
CREATE TRIGGER boq_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON "Planning Database - BOQ Rates"
  FOR EACH ROW EXECUTE FUNCTION log_boq_change();

CREATE TRIGGER projects_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON "Planning Database - ProjectsList"
  FOR EACH ROW EXECUTE FUNCTION log_project_change();

CREATE TRIGGER kpi_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON "Planning Database - KPI"
  FOR EACH ROW EXECUTE FUNCTION log_kpi_change();

-- ============================================================
-- ✅ Script completed successfully!
-- ============================================================

-- Verify tables were created
SELECT 
  'boq_audit_log' as table_name,
  COUNT(*) as record_count
FROM boq_audit_log
UNION ALL
SELECT 
  'projects_audit_log' as table_name,
  COUNT(*) as record_count
FROM projects_audit_log
UNION ALL
SELECT 
  'kpi_audit_log' as table_name,
  COUNT(*) as record_count
FROM kpi_audit_log;

