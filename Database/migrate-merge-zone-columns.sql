-- ============================================================
-- Migration: Merge "Zone Ref" into "Zone Number" Column
-- ============================================================
-- This script merges the "Zone Ref" column into "Zone Number" column
-- Strategy: Prefer "Zone Number" if both exist, otherwise use "Zone Ref", default to "0"
-- Then removes the "Zone Ref" column
-- ============================================================

-- Step 1: Update "Zone Number" column with merged data
-- Priority: Zone Number > Zone Ref > "0"
UPDATE public."Planning Database - BOQ Rates"
SET "Zone Number" = CASE
  -- If Zone Number exists and is not empty, keep it
  WHEN "Zone Number" IS NOT NULL AND TRIM("Zone Number") != '' THEN "Zone Number"
  -- Otherwise, use Zone Ref if it exists and is not empty
  WHEN "Zone Ref" IS NOT NULL AND TRIM("Zone Ref") != '' THEN "Zone Ref"
  -- Default to "0" if both are empty
  ELSE '0'
END
WHERE "Zone Number" IS NULL 
   OR TRIM("Zone Number") = ''
   OR ("Zone Ref" IS NOT NULL AND TRIM("Zone Ref") != '' AND ("Zone Number" IS NULL OR TRIM("Zone Number") = ''));

-- Step 2: Ensure all records have a Zone Number (set to "0" if both were empty)
UPDATE public."Planning Database - BOQ Rates"
SET "Zone Number" = '0'
WHERE "Zone Number" IS NULL OR TRIM("Zone Number") = '';

-- Step 3: Update dependent views to use "Zone Number" instead of "Zone Ref"
-- Drop views that depend on "Zone Ref" column (CASCADE will handle all dependencies)
DROP VIEW IF EXISTS public.boq_activities_complete CASCADE;
DROP VIEW IF EXISTS public.boq_activities_optimized CASCADE;

-- Recreate boq_activities_complete view with "Zone Number" instead of "Zone Ref"
CREATE OR REPLACE VIEW public.boq_activities_complete AS
SELECT 
    id,
    "Project Code",
    "Project Sub Code",
    "Project Full Code",
    "Activity",
    "Activity Division",
    "Unit",
    "Zone Number",  -- Updated to use Zone Number instead of Zone Ref
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
ORDER BY "Project Code", "Activity";

-- Grant permissions on the recreated view
GRANT SELECT ON public.boq_activities_complete TO authenticated;

-- Note: If boq_activities_optimized view was used, you may need to recreate it manually
-- with "Zone Number" instead of "Zone Ref" after this migration completes.

-- Step 4: Drop the "Zone Ref" column
ALTER TABLE public."Planning Database - BOQ Rates"
DROP COLUMN IF EXISTS "Zone Ref";

-- Step 5: Verify the migration
-- Check that all records have Zone Number populated
DO $$
DECLARE
  empty_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO empty_count
  FROM public."Planning Database - BOQ Rates"
  WHERE "Zone Number" IS NULL OR TRIM("Zone Number") = '';
  
  IF empty_count > 0 THEN
    RAISE WARNING 'Found % records with empty Zone Number after migration', empty_count;
  ELSE
    RAISE NOTICE 'Migration successful: All records have Zone Number populated';
  END IF;
END $$;

-- Step 6: Display summary statistics
SELECT 
  COUNT(*) as total_records,
  COUNT(DISTINCT "Zone Number") as unique_zones,
  COUNT(CASE WHEN "Zone Number" = '0' THEN 1 END) as records_with_default_zone
FROM public."Planning Database - BOQ Rates";
