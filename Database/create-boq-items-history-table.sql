-- ============================================================
-- ✅ Create BOQ Items History Table for Change Tracking
-- This script creates a history table to track ALL changes to BOQ items
-- ============================================================

-- Create BOQ Items History Table
CREATE TABLE IF NOT EXISTS boq_items_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boq_item_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  changed_by TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  old_values JSONB,
  new_values JSONB,
  changes_summary TEXT
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_boq_items_history_boq_item_id ON boq_items_history(boq_item_id);
CREATE INDEX IF NOT EXISTS idx_boq_items_history_changed_at ON boq_items_history(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_boq_items_history_changed_by ON boq_items_history(changed_by);

-- Add comments
COMMENT ON TABLE boq_items_history IS 'History log for all BOQ items changes';
COMMENT ON COLUMN boq_items_history.boq_item_id IS 'ID of the BOQ item record';
COMMENT ON COLUMN boq_items_history.action IS 'Type of action: INSERT, UPDATE, or DELETE';
COMMENT ON COLUMN boq_items_history.changed_by IS 'Email or ID of user who made the change';
COMMENT ON COLUMN boq_items_history.old_values IS 'Previous values before change (JSON)';
COMMENT ON COLUMN boq_items_history.new_values IS 'New values after change (JSON)';

-- ============================================================
-- Function to log BOQ Items changes
-- ============================================================
CREATE OR REPLACE FUNCTION log_boq_items_change()
RETURNS TRIGGER AS $$
DECLARE
  changed_by_value TEXT;
BEGIN
  -- Get changed_by from NEW record or use current user
  changed_by_value := COALESCE(
    NEW."updated_by",
    NEW."created_by",
    current_setting('app.user_email', true),
    'System'
  );
  
  BEGIN
    IF TG_OP = 'INSERT' THEN
      INSERT INTO boq_items_history (boq_item_id, action, changed_by, new_values)
      VALUES (NEW.id, 'INSERT', changed_by_value, row_to_json(NEW));
      RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
      INSERT INTO boq_items_history (boq_item_id, action, changed_by, old_values, new_values)
      VALUES (NEW.id, 'UPDATE', changed_by_value, row_to_json(OLD), row_to_json(NEW));
      RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
      INSERT INTO boq_items_history (boq_item_id, action, changed_by, old_values)
      VALUES (OLD.id, 'DELETE', COALESCE(OLD."updated_by", OLD."created_by", 'System'), row_to_json(OLD));
      RETURN OLD;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the main operation
    RAISE WARNING 'Failed to log BOQ items audit: %', SQLERRM;
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
-- Create Trigger
-- ============================================================
DROP TRIGGER IF EXISTS trigger_log_boq_items_change ON public."BOQ items";
CREATE TRIGGER trigger_log_boq_items_change
  AFTER INSERT OR UPDATE OR DELETE ON public."BOQ items"
  FOR EACH ROW
  EXECUTE FUNCTION log_boq_items_change();

-- ============================================================
-- Grant Permissions
-- ============================================================
GRANT ALL ON TABLE boq_items_history TO postgres, authenticated, service_role;
GRANT SELECT ON TABLE boq_items_history TO anon;

-- ============================================================
-- Enable Row Level Security (RLS)
-- ============================================================
ALTER TABLE boq_items_history ENABLE ROW LEVEL SECURITY;

-- Create RLS Policy for authenticated users
DROP POLICY IF EXISTS "auth_all_boq_items_history" ON boq_items_history;
CREATE POLICY "auth_all_boq_items_history" ON boq_items_history
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
