-- ============================================================
-- ✅ Add Project Start Date, Completion Date, and Duration Columns
-- ============================================================
-- This script adds date fields to the Projects table
-- ============================================================

-- Add Project Start Date column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'Planning Database - ProjectsList'
        AND column_name = 'Project Start Date'
    ) THEN
        ALTER TABLE "Planning Database - ProjectsList" 
        ADD COLUMN "Project Start Date" DATE;
        
        RAISE NOTICE '✅ Successfully added "Project Start Date" column';
    ELSE
        RAISE NOTICE '✅ "Project Start Date" column already exists';
    END IF;
END $$;

-- Add Project Completion Date column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'Planning Database - ProjectsList'
        AND column_name = 'Project Completion Date'
    ) THEN
        ALTER TABLE "Planning Database - ProjectsList" 
        ADD COLUMN "Project Completion Date" DATE;
        
        RAISE NOTICE '✅ Successfully added "Project Completion Date" column';
    ELSE
        RAISE NOTICE '✅ "Project Completion Date" column already exists';
    END IF;
END $$;

-- Add Project Duration column if it doesn't exist (calculated field)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'Planning Database - ProjectsList'
        AND column_name = 'Project Duration'
    ) THEN
        ALTER TABLE "Planning Database - ProjectsList" 
        ADD COLUMN "Project Duration" INTEGER;
        
        RAISE NOTICE '✅ Successfully added "Project Duration" column';
    ELSE
        RAISE NOTICE '✅ "Project Duration" column already exists';
    END IF;
END $$;

-- Create function to calculate duration automatically
CREATE OR REPLACE FUNCTION calculate_project_duration()
RETURNS TRIGGER AS $$
BEGIN
    -- ✅ Always calculate duration if both dates exist (even if duration is already set)
    IF NEW."Project Start Date" IS NOT NULL AND NEW."Project Completion Date" IS NOT NULL THEN
        -- Calculate duration in days (including both start and end days)
        -- ✅ FIX: Use direct date subtraction which returns INTEGER (days)
        NEW."Project Duration" := (NEW."Project Completion Date" - NEW."Project Start Date")::INTEGER + 1;
    ELSIF NEW."Project Start Date" IS NOT NULL AND NEW."Project Completion Date" IS NULL THEN
        -- If only start date exists, calculate from start date to today
        -- ✅ FIX: Use direct date subtraction which returns INTEGER (days)
        NEW."Project Duration" := (CURRENT_DATE - NEW."Project Start Date")::INTEGER + 1;
        -- If duration is negative (future date), set to 0
        IF NEW."Project Duration" < 0 THEN
            NEW."Project Duration" := 0;
        END IF;
    ELSIF NEW."Project Start Date" IS NULL AND NEW."Project Completion Date" IS NOT NULL THEN
        -- If only completion date exists, set duration to NULL (can't calculate without start)
        NEW."Project Duration" := NULL;
    ELSE
        -- If no dates, set duration to NULL
        NEW."Project Duration" := NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-calculate duration
DROP TRIGGER IF EXISTS trigger_calculate_project_duration ON "Planning Database - ProjectsList";
CREATE TRIGGER trigger_calculate_project_duration
    BEFORE INSERT OR UPDATE ON "Planning Database - ProjectsList"
    FOR EACH ROW
    EXECUTE FUNCTION calculate_project_duration();

-- Verify the columns were added
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'Planning Database - ProjectsList'
AND column_name IN ('Project Start Date', 'Project Completion Date', 'Project Duration')
ORDER BY column_name;

-- Success message
SELECT '✅ Project dates columns added successfully!' as status;

