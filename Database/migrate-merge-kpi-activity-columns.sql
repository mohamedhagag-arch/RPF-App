-- ============================================================
-- Migration: Merge "Activity" and "Activity Name" into "Activity Description" Column in KPI Table
-- ============================================================
-- This script merges the "Activity" and "Activity Name" columns into "Activity Description"
-- Strategy: Prefer "Activity Name" if present, otherwise use "Activity", default to empty string
-- Then removes both old columns
-- ============================================================

-- Step 1: Create backup table
CREATE TABLE IF NOT EXISTS public."Planning Database - KPI_backup_activity_merge" AS
SELECT * FROM public."Planning Database - KPI";

-- Step 2: Add "Activity Description" column if it doesn't exist
ALTER TABLE public."Planning Database - KPI"
ADD COLUMN IF NOT EXISTS "Activity Description" TEXT;

-- Step 3: Update "Activity Description" column with merged data
-- Priority: Activity Name > Activity > empty string
UPDATE public."Planning Database - KPI"
SET "Activity Description" = CASE
  -- If Activity Name exists and is not empty, use it (preferred)
  WHEN "Activity Name" IS NOT NULL 
       AND TRIM("Activity Name") != '' 
  THEN TRIM("Activity Name")
  -- Otherwise, use Activity if it exists and is not empty
  WHEN "Activity" IS NOT NULL 
       AND TRIM("Activity") != '' 
  THEN TRIM("Activity")
  -- Default to empty string if both are empty
  ELSE ''
END
WHERE "Activity Description" IS NULL 
   OR TRIM("Activity Description") = '';

-- Step 4: Ensure all records have Activity Description (set to empty string if both were empty)
UPDATE public."Planning Database - KPI"
SET "Activity Description" = ''
WHERE "Activity Description" IS NULL OR TRIM("Activity Description") = '';

-- Step 5: Verify the migration
-- Check that all records have Activity Description populated
DO $$
DECLARE
  empty_count INTEGER;
  total_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count
  FROM public."Planning Database - KPI";
  
  SELECT COUNT(*) INTO empty_count
  FROM public."Planning Database - KPI"
  WHERE "Activity Description" IS NULL OR TRIM("Activity Description") = '';
  
  IF empty_count > 0 THEN
    RAISE WARNING 'Found % records with empty Activity Description after migration (out of % total)', empty_count, total_count;
  ELSE
    RAISE NOTICE 'Migration successful: All records have Activity Description populated';
  END IF;
END $$;

-- Step 6: Display summary statistics
SELECT 
  COUNT(*) as total_records,
  COUNT(DISTINCT "Activity Description") as unique_activities,
  COUNT(CASE WHEN "Activity Description" = '' THEN 1 END) as records_with_empty_description,
  COUNT(CASE WHEN "Activity Description" != '' THEN 1 END) as records_with_activity_data,
  COUNT(CASE WHEN "Activity Name" IS NOT NULL AND TRIM("Activity Name") != '' THEN 1 END) as records_with_activity_name_column,
  COUNT(CASE WHEN "Activity" IS NOT NULL AND TRIM("Activity") != '' THEN 1 END) as records_with_activity_column
FROM public."Planning Database - KPI";

-- Step 7: Check for dependent views or objects that reference the old columns
-- Note: If there are views that depend on these columns, they need to be dropped and recreated
-- For now, we'll check if any views exist (you may need to add specific view names here)
-- DROP VIEW IF EXISTS public.some_kpi_view CASCADE;

-- Step 8: Drop the old columns
ALTER TABLE public."Planning Database - KPI"
DROP COLUMN IF EXISTS "Activity";

ALTER TABLE public."Planning Database - KPI"
DROP COLUMN IF EXISTS "Activity Name";

-- ============================================================
-- Migration Complete
-- ============================================================
-- All "Activity" and "Activity Name" column data has been merged into "Activity Description"
-- Priority: Activity Name > Activity > empty string
-- Both old columns have been removed
-- ============================================================
