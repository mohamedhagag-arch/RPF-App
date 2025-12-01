-- ============================================================
-- ✅ Fix Project Duration Trigger to Preserve User-Entered Values
-- ============================================================
-- This script modifies the trigger to give priority to user-entered values
-- ============================================================

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS trigger_calculate_project_duration ON "Planning Database - ProjectsList";
DROP FUNCTION IF EXISTS calculate_project_duration();

-- Create improved function that preserves user-entered duration
CREATE OR REPLACE FUNCTION calculate_project_duration()
RETURNS TRIGGER AS $$
BEGIN
    -- ✅ PRIORITY 1: If user already set Project Duration, ALWAYS keep it (don't override)
    -- CRITICAL: Check if duration is explicitly set (not NULL and > 0)
    -- This ensures user-entered values are NEVER overridden by date calculations
    IF NEW."Project Duration" IS NOT NULL AND NEW."Project Duration" > 0 THEN
        -- User entered a value - keep it! Don't calculate from dates
        -- This prevents the trigger from overriding user input
        RETURN NEW;
    END IF;
    
    -- ✅ PRIORITY 2: Calculate from dates only if duration is not set
    IF NEW."Project Start Date" IS NOT NULL AND NEW."Project Completion Date" IS NOT NULL THEN
        -- Calculate duration in days (including both start and end days)
        NEW."Project Duration" := (NEW."Project Completion Date" - NEW."Project Start Date")::INTEGER + 1;
    ELSIF NEW."Project Start Date" IS NOT NULL AND NEW."Project Completion Date" IS NULL THEN
        -- If only start date exists, calculate from start date to today
        NEW."Project Duration" := (CURRENT_DATE - NEW."Project Start Date")::INTEGER + 1;
        -- If duration is negative (future date), set to 0
        IF NEW."Project Duration" < 0 THEN
            NEW."Project Duration" := 0;
        END IF;
    ELSIF NEW."Project Start Date" IS NULL AND NEW."Project Completion Date" IS NOT NULL THEN
        -- If only completion date exists, set duration to NULL (can't calculate without start)
        NEW."Project Duration" := NULL;
    ELSE
        -- If no dates, keep duration as NULL (or whatever was sent)
        -- Don't override if user sent a value
        IF NEW."Project Duration" IS NULL THEN
            NEW."Project Duration" := NULL;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER trigger_calculate_project_duration
    BEFORE INSERT OR UPDATE ON "Planning Database - ProjectsList"
    FOR EACH ROW
    EXECUTE FUNCTION calculate_project_duration();

-- Success message
SELECT '✅ Project Duration trigger fixed to preserve user-entered values!' as status;

