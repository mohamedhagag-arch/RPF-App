-- ============================================================
-- Fix kpi_rejected trigger to preserve created_by if already set
-- This ensures that when rejecting a KPI, the original creator
-- information is maintained instead of being overwritten with 'System'
-- ============================================================

-- Drop the old trigger function
DROP TRIGGER IF EXISTS kpi_rejected_user_fields ON public.kpi_rejected;
DROP FUNCTION IF EXISTS set_kpi_rejected_user_fields();

-- Create updated trigger function that preserves existing created_by
CREATE OR REPLACE FUNCTION set_kpi_rejected_user_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- ✅ Preserve created_by if it's already set (from original KPI)
    -- Only set to current user if not already provided
    IF NEW.created_by IS NULL OR NEW.created_by = '' OR NEW.created_by = 'System' THEN
      NEW.created_by = COALESCE(
        current_setting('app.user_email', true),
        current_setting('app.user_id', true),
        'System'
      );
    END IF;
    
    -- Set updated_by to created_by if not already set
    IF NEW.updated_by IS NULL OR NEW.updated_by = '' THEN
      NEW.updated_by = NEW.created_by;
    END IF;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- For updates, preserve existing updated_by if set, otherwise use current user
    IF NEW.updated_by IS NULL OR NEW.updated_by = '' OR NEW.updated_by = 'System' THEN
      NEW.updated_by = COALESCE(
        current_setting('app.user_email', true),
        current_setting('app.user_id', true),
        OLD.updated_by,
        'System'
      );
    END IF;
    
    -- Preserve created_by on update (don't change it)
    IF NEW.created_by IS NULL OR NEW.created_by = '' THEN
      NEW.created_by = OLD.created_by;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER kpi_rejected_user_fields
  BEFORE INSERT OR UPDATE ON public.kpi_rejected
  FOR EACH ROW
  EXECUTE FUNCTION set_kpi_rejected_user_fields();

-- Verify the trigger was created
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND event_object_table = 'kpi_rejected'
AND trigger_name = 'kpi_rejected_user_fields';

-- Success message
SELECT '✅ Trigger updated to preserve created_by from original KPI!' as status;

