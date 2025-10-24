-- ============================================================
-- COMPLETE CALCULATION SYSTEM FOR RABAT MVP
-- Based on comprehensive understanding of Supabase database structure
-- ============================================================

-- ============================================================
-- PART 1: Database Structure Analysis
-- ============================================================

-- Check existing columns in BOQ Rates table
SELECT 
    column_name, 
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'Planning Database - BOQ Rates'
ORDER BY ordinal_position;

-- ============================================================
-- PART 2: Safe Column Addition (if needed)
-- ============================================================

-- Add calculation columns safely (only if they don't exist)
DO $$ 
BEGIN
    -- Add Rate column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'Planning Database - BOQ Rates' 
                   AND column_name = 'Rate') THEN
        ALTER TABLE "Planning Database - BOQ Rates" 
        ADD COLUMN "Rate" TEXT DEFAULT '0';
    END IF;
    
    -- Add Activity Progress % column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'Planning Database - BOQ Rates' 
                   AND column_name = 'Activity Progress %') THEN
        ALTER TABLE "Planning Database - BOQ Rates" 
        ADD COLUMN "Activity Progress %" TEXT DEFAULT '0';
    END IF;
    
    -- Add Earned Value column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'Planning Database - BOQ Rates' 
                   AND column_name = 'Earned Value') THEN
        ALTER TABLE "Planning Database - BOQ Rates" 
        ADD COLUMN "Earned Value" TEXT DEFAULT '0';
    END IF;
    
    -- Add Planned Value column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'Planning Database - BOQ Rates' 
                   AND column_name = 'Planned Value') THEN
        ALTER TABLE "Planning Database - BOQ Rates" 
        ADD COLUMN "Planned Value" TEXT DEFAULT '0';
    END IF;
    
    -- Add Remaining Work Value column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'Planning Database - BOQ Rates' 
                   AND column_name = 'Remaining Work Value') THEN
        ALTER TABLE "Planning Database - BOQ Rates" 
        ADD COLUMN "Remaining Work Value" TEXT DEFAULT '0';
    END IF;
    
    RAISE NOTICE 'Calculation columns checked/added successfully';
END $$;

-- ============================================================
-- PART 3: Comprehensive Calculation Updates
-- ============================================================

-- Update Rate calculations (Total Value / Planned Units)
UPDATE "Planning Database - BOQ Rates" 
SET "Rate" = CASE 
    WHEN COALESCE("Planned Units", '') != '' 
     AND COALESCE("Planned Units", '0') != '0' 
     AND COALESCE("Total Value", '') != ''
     AND COALESCE("Total Value", '0') != '0'
    THEN CAST(
        CAST(REPLACE(REPLACE(COALESCE("Total Value", '0'), ',', ''), ' ', '') AS DECIMAL) / 
        CAST(REPLACE(REPLACE(COALESCE("Planned Units", '0'), ',', ''), ' ', '') AS DECIMAL)
    AS TEXT)
    ELSE '0'
END
WHERE "Planned Units" IS NOT NULL 
  AND "Planned Units" != '' 
  AND "Planned Units" != '0'
  AND "Total Value" IS NOT NULL 
  AND "Total Value" != '' 
  AND "Total Value" != '0';

-- Update Activity Progress % calculations (Actual Units / Planned Units * 100)
UPDATE "Planning Database - BOQ Rates" 
SET "Activity Progress %" = CASE 
    WHEN COALESCE("Planned Units", '') != '' 
     AND COALESCE("Planned Units", '0') != '0' 
     AND COALESCE("Actual Units", '') != ''
     AND COALESCE("Actual Units", '0') != '0'
    THEN CAST(
        (CAST(REPLACE(REPLACE(COALESCE("Actual Units", '0'), ',', ''), ' ', '') AS DECIMAL) / 
         CAST(REPLACE(REPLACE(COALESCE("Planned Units", '0'), ',', ''), ' ', '') AS DECIMAL)) * 100
    AS TEXT)
    ELSE '0'
END
WHERE "Planned Units" IS NOT NULL 
  AND "Planned Units" != '' 
  AND "Planned Units" != '0'
  AND "Actual Units" IS NOT NULL 
  AND "Actual Units" != '' 
  AND "Actual Units" != '0';

-- Update Earned Value calculations (Rate * Actual Units)
UPDATE "Planning Database - BOQ Rates" 
SET "Earned Value" = CASE 
    WHEN COALESCE("Planned Units", '') != '' 
     AND COALESCE("Planned Units", '0') != '0' 
     AND COALESCE("Actual Units", '') != ''
     AND COALESCE("Actual Units", '0') != '0'
     AND COALESCE("Total Value", '') != ''
     AND COALESCE("Total Value", '0') != '0'
    THEN CAST(
        (CAST(REPLACE(REPLACE(COALESCE("Total Value", '0'), ',', ''), ' ', '') AS DECIMAL) / 
         CAST(REPLACE(REPLACE(COALESCE("Planned Units", '0'), ',', ''), ' ', '') AS DECIMAL)) * 
        CAST(REPLACE(REPLACE(COALESCE("Actual Units", '0'), ',', ''), ' ', '') AS DECIMAL)
    AS TEXT)
    ELSE '0'
END
WHERE "Planned Units" IS NOT NULL 
  AND "Planned Units" != '' 
  AND "Planned Units" != '0'
  AND "Actual Units" IS NOT NULL 
  AND "Actual Units" != '' 
  AND "Actual Units" != '0'
  AND "Total Value" IS NOT NULL 
  AND "Total Value" != '' 
  AND "Total Value" != '0';

-- Update Planned Value (copy Total Value)
UPDATE "Planning Database - BOQ Rates" 
SET "Planned Value" = REPLACE(REPLACE(COALESCE("Total Value", '0'), ',', ''), ' ', '')
WHERE "Total Value" IS NOT NULL 
  AND "Total Value" != '' 
  AND "Total Value" != '0';

-- Update Remaining Work Value (Rate * (Planned Units - Actual Units))
UPDATE "Planning Database - BOQ Rates" 
SET "Remaining Work Value" = CASE 
    WHEN COALESCE("Planned Units", '') != '' 
     AND COALESCE("Planned Units", '0') != '0' 
     AND COALESCE("Actual Units", '') != ''
     AND COALESCE("Total Value", '') != ''
     AND COALESCE("Total Value", '0') != '0'
    THEN CAST(
        (CAST(REPLACE(REPLACE(COALESCE("Total Value", '0'), ',', ''), ' ', '') AS DECIMAL) / 
         CAST(REPLACE(REPLACE(COALESCE("Planned Units", '0'), ',', ''), ' ', '') AS DECIMAL)) * 
        (CAST(REPLACE(REPLACE(COALESCE("Planned Units", '0'), ',', ''), ' ', '') AS DECIMAL) - 
         CAST(REPLACE(REPLACE(COALESCE("Actual Units", '0'), ',', ''), ' ', '') AS DECIMAL))
    AS TEXT)
    ELSE '0'
END
WHERE "Planned Units" IS NOT NULL 
  AND "Planned Units" != '' 
  AND "Planned Units" != '0'
  AND "Actual Units" IS NOT NULL 
  AND "Actual Units" != '' 
  AND "Total Value" IS NOT NULL 
  AND "Total Value" != '' 
  AND "Total Value" != '0';

-- ============================================================
-- PART 4: Project-Level Calculations
-- ============================================================

-- Add project calculation columns if they don't exist
DO $$ 
BEGIN
    -- Add total_planned_value column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'Planning Database - ProjectsList' 
                   AND column_name = 'total_planned_value') THEN
        ALTER TABLE "Planning Database - ProjectsList" 
        ADD COLUMN total_planned_value DECIMAL(15,2) DEFAULT 0;
    END IF;
    
    -- Add total_earned_value column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'Planning Database - ProjectsList' 
                   AND column_name = 'total_earned_value') THEN
        ALTER TABLE "Planning Database - ProjectsList" 
        ADD COLUMN total_earned_value DECIMAL(15,2) DEFAULT 0;
    END IF;
    
    -- Add overall_progress column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'Planning Database - ProjectsList' 
                   AND column_name = 'overall_progress') THEN
        ALTER TABLE "Planning Database - ProjectsList" 
        ADD COLUMN overall_progress DECIMAL(5,2) DEFAULT 0;
    END IF;
    
    RAISE NOTICE 'Project calculation columns checked/added successfully';
END $$;

-- Update project total planned value
UPDATE "Planning Database - ProjectsList" 
SET total_planned_value = (
    SELECT COALESCE(SUM(CAST(REPLACE(REPLACE(COALESCE("Total Value", '0'), ',', ''), ' ', '') AS DECIMAL)), 0)
    FROM "Planning Database - BOQ Rates" 
    WHERE "Project Code" = "Planning Database - ProjectsList"."Project Code"
    AND "Total Value" IS NOT NULL 
    AND "Total Value" != '' 
    AND "Total Value" != '0'
);

-- Update project total earned value
UPDATE "Planning Database - ProjectsList" 
SET total_earned_value = (
    SELECT COALESCE(SUM(CAST(REPLACE(REPLACE(COALESCE("Earned Value", '0'), ',', ''), ' ', '') AS DECIMAL)), 0)
    FROM "Planning Database - BOQ Rates" 
    WHERE "Project Code" = "Planning Database - ProjectsList"."Project Code"
    AND "Earned Value" IS NOT NULL 
    AND "Earned Value" != '' 
    AND "Earned Value" != '0'
);

-- Update project overall progress
UPDATE "Planning Database - ProjectsList" 
SET overall_progress = CASE 
    WHEN total_planned_value > 0 THEN (total_earned_value / total_planned_value) * 100
    ELSE 0 
END;

-- ============================================================
-- PART 5: Create Views for Easy Access
-- ============================================================

-- Create comprehensive view for BOQ activities
CREATE OR REPLACE VIEW boq_activities_complete AS
SELECT 
    id,
    "Project Code",
    "Project Sub Code",
    "Project Full Code",
    "Activity",
    "Activity Division",
    "Unit",
    "Zone Ref",
    "Total Value",
    "Planned Units",
    "Actual Units",
    "Rate",
    "Activity Progress %",
    "Earned Value",
    "Planned Value",
    "Remaining Work Value",
    "Planned Activity Start Date",
    "Deadline",
    created_at,
    updated_at
FROM "Planning Database - BOQ Rates"
ORDER BY "Project Code", "Activity";

-- Create comprehensive view for projects
CREATE OR REPLACE VIEW projects_complete AS
SELECT 
    id,
    "Project Code",
    "Project Sub-Code",
    "Project Name",
    "Project Type",
    "Responsible Division",
    "Project Status",
    "Contract Amount",
    total_planned_value,
    total_earned_value,
    overall_progress,
    created_at,
    updated_at
FROM "Planning Database - ProjectsList"
ORDER BY "Project Code";

-- ============================================================
-- PART 6: Create Indexes for Performance
-- ============================================================

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_boq_project_code ON "Planning Database - BOQ Rates"("Project Code");
CREATE INDEX IF NOT EXISTS idx_boq_rate ON "Planning Database - BOQ Rates"("Rate");
CREATE INDEX IF NOT EXISTS idx_boq_progress ON "Planning Database - BOQ Rates"("Activity Progress %");
CREATE INDEX IF NOT EXISTS idx_boq_earned_value ON "Planning Database - BOQ Rates"("Earned Value");

CREATE INDEX IF NOT EXISTS idx_projects_code ON "Planning Database - ProjectsList"("Project Code");
CREATE INDEX IF NOT EXISTS idx_projects_planned_value ON "Planning Database - ProjectsList"(total_planned_value);
CREATE INDEX IF NOT EXISTS idx_projects_earned_value ON "Planning Database - ProjectsList"(total_earned_value);
CREATE INDEX IF NOT EXISTS idx_projects_progress ON "Planning Database - ProjectsList"(overall_progress);

-- ============================================================
-- PART 7: Grant Permissions
-- ============================================================

-- Grant access to tables
GRANT SELECT, INSERT, UPDATE, DELETE ON "Planning Database - BOQ Rates" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "Planning Database - ProjectsList" TO authenticated;

-- Grant access to views
GRANT SELECT ON boq_activities_complete TO authenticated;
GRANT SELECT ON projects_complete TO authenticated;

-- ============================================================
-- PART 8: Display Results
-- ============================================================

-- Show sample of updated data
SELECT 
    "Project Code",
    "Activity",
    "Total Value",
    "Planned Units",
    "Actual Units",
    "Rate",
    "Activity Progress %",
    "Earned Value"
FROM "Planning Database - BOQ Rates"
WHERE "Rate" != '0' AND "Rate" IS NOT NULL
ORDER BY "Project Code", "Activity"
LIMIT 20;

-- Show project summary
SELECT 
    "Project Code",
    "Project Name",
    "Project Type",
    total_planned_value,
    total_earned_value,
    overall_progress
FROM "Planning Database - ProjectsList"
WHERE total_planned_value > 0
ORDER BY "Project Code"
LIMIT 10;

-- ============================================================
-- PART 9: Success Message
-- ============================================================

SELECT 'Complete calculation system implemented successfully!' as status;
