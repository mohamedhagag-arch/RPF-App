-- ============================================================
-- ✅ Add "KPI Added" Column to Planning Database - ProjectsList
-- ============================================================
-- This script adds the "KPI Added" column which is automatically
-- calculated based on whether the project has KPI Planned records
-- ============================================================

-- Add KPI Added column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'Planning Database - ProjectsList'
        AND column_name = 'KPI Added'
    ) THEN
        ALTER TABLE "public"."Planning Database - ProjectsList" 
        ADD COLUMN "KPI Added" TEXT DEFAULT NULL;
        
        RAISE NOTICE '✅ Successfully added "KPI Added" column';
    ELSE
        RAISE NOTICE '✅ "KPI Added" column already exists';
    END IF;
END $$;

-- Create index for better performance (optional)
CREATE INDEX IF NOT EXISTS idx_projects_kpi_added 
ON "public"."Planning Database - ProjectsList"("KPI Added");

-- Verify the column was added
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public'
AND table_name = 'Planning Database - ProjectsList'
AND column_name = 'KPI Added';

-- Success message
SELECT '✅ "KPI Added" column added successfully!' as status;

-- ============================================================
-- Note: The "KPI Added" field will be automatically updated
-- by the application when:
-- 1. A KPI Planned is created/updated/deleted
-- 2. Project status is updated
-- 3. Data is loaded from the database
-- 
-- Values: 'Yes' (if project has KPI Planned) or 'No' (if not)
-- ============================================================















