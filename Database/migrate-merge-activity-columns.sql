-- ============================================================
-- Migration: Merge "Activity" and "Activity Name" into "Activity Description" Column in BOQ Rates Table
-- ============================================================
-- This script merges the "Activity" and "Activity Name" columns into "Activity Description"
-- Strategy: Prefer "Activity" if present, otherwise use "Activity Name", default to empty string
-- Then removes both old columns
-- ============================================================

-- Step 1: Create backup table
CREATE TABLE IF NOT EXISTS public."Planning Database - BOQ Rates_backup_activity_merge" AS
SELECT * FROM public."Planning Database - BOQ Rates";

-- Step 2: Add "Activity Description" column if it doesn't exist
ALTER TABLE public."Planning Database - BOQ Rates"
ADD COLUMN IF NOT EXISTS "Activity Description" TEXT;

-- Step 3: Update "Activity Description" column with merged data
-- Priority: Activity > Activity Name > empty string
UPDATE public."Planning Database - BOQ Rates"
SET "Activity Description" = CASE
  -- If Activity exists and is not empty, use it
  WHEN "Activity" IS NOT NULL 
       AND TRIM("Activity") != '' 
  THEN TRIM("Activity")
  -- Otherwise, use Activity Name if it exists and is not empty
  WHEN "Activity Name" IS NOT NULL 
       AND TRIM("Activity Name") != '' 
  THEN TRIM("Activity Name")
  -- Default to empty string if both are empty
  ELSE ''
END
WHERE "Activity Description" IS NULL 
   OR TRIM("Activity Description") = '';

-- Step 4: Ensure all records have Activity Description (set to empty string if both were empty)
UPDATE public."Planning Database - BOQ Rates"
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
  FROM public."Planning Database - BOQ Rates";
  
  SELECT COUNT(*) INTO empty_count
  FROM public."Planning Database - BOQ Rates"
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
  COUNT(CASE WHEN "Activity" IS NOT NULL AND TRIM("Activity") != '' THEN 1 END) as records_with_activity_column,
  COUNT(CASE WHEN "Activity Name" IS NOT NULL AND TRIM("Activity Name") != '' THEN 1 END) as records_with_activity_name_column
FROM public."Planning Database - BOQ Rates";

-- Step 7: Drop dependent views that reference the old columns
-- This must be done before dropping the columns
DROP VIEW IF EXISTS public.boq_activities_complete CASCADE;
DROP VIEW IF EXISTS public.boq_activities_with_calculations CASCADE;

-- Step 8: Drop the old columns
ALTER TABLE public."Planning Database - BOQ Rates"
DROP COLUMN IF EXISTS "Activity";

ALTER TABLE public."Planning Database - BOQ Rates"
DROP COLUMN IF EXISTS "Activity Name";

-- Step 9: Recreate boq_activities_complete view with "Activity Description" instead of "Activity"
-- Note: "Zone Ref" was already merged into "Zone Number" in a previous migration
CREATE OR REPLACE VIEW public.boq_activities_complete AS
SELECT 
    id,
    "Project Code",
    "Project Sub Code",
    "Project Full Code",
    "Activity Description", -- ✅ Updated to use merged column (from Activity and Activity Name)
    "Activity Division",
    "Unit",
    "Zone Number", -- ✅ Updated to use merged column (Zone Ref was merged into Zone Number)
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
FROM public."Planning Database - BOQ Rates"
ORDER BY "Project Code", "Activity Description"; -- ✅ Updated to use merged column

-- Step 10: Grant permissions on the recreated view
GRANT SELECT ON public.boq_activities_complete TO authenticated;

-- ============================================================
-- Migration Complete
-- ============================================================
-- All "Activity" and "Activity Name" column data has been merged into "Activity Description"
-- Priority: Activity > Activity Name > empty string
-- Both old columns have been removed
-- ============================================================
