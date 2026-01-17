-- ============================================================
-- Migration: Merge "Zone" into "Zone Number" Column in KPI Table
-- ============================================================
-- This script merges the "Zone" column into "Zone Number" column
-- Strategy: Prefer "Zone Number" if both exist, otherwise extract zone number from "Zone", default to "0"
-- Then removes the "Zone" column
-- ============================================================

-- Step 1: Create backup table
CREATE TABLE IF NOT EXISTS public."Planning Database - KPI_backup_zone_merge" AS
SELECT * FROM public."Planning Database - KPI";

-- Step 2: Function to extract zone number from zone string
-- This function extracts just the numeric zone value from various formats:
-- "P8888-1" -> "1"
-- "Zone 2" -> "2"
-- "P8888 - Zone 3" -> "3"
-- "1" -> "1"
CREATE OR REPLACE FUNCTION extract_zone_number(zone_value TEXT)
RETURNS TEXT AS $$
DECLARE
  result TEXT;
BEGIN
  IF zone_value IS NULL OR TRIM(zone_value) = '' THEN
    RETURN '0';
  END IF;
  
  -- Convert to lowercase for pattern matching
  zone_value := LOWER(TRIM(zone_value));
  
  -- Try to match "zone X" or "zone-X" pattern first (most common)
  IF zone_value ~ 'zone\s*[-_]?\s*(\d+)' THEN
    result := (regexp_match(zone_value, 'zone\s*[-_]?\s*(\d+)'))[1];
    IF result IS NOT NULL THEN
      RETURN result;
    END IF;
  END IF;
  
  -- Try to match standalone number at the end (e.g., "Zone 2", "Area 2")
  IF zone_value ~ '(\d+)\s*$' THEN
    result := (regexp_match(zone_value, '(\d+)\s*$'))[1];
    IF result IS NOT NULL THEN
      RETURN result;
    END IF;
  END IF;
  
  -- Try to extract number after project code pattern (e.g., "p8888-1" -> "1")
  IF zone_value ~ '^[a-z]\d+[-_]\s*(\d+)' THEN
    result := (regexp_match(zone_value, '^[a-z]\d+[-_]\s*(\d+)'))[1];
    IF result IS NOT NULL THEN
      RETURN result;
    END IF;
  END IF;
  
  -- Fallback: extract first number
  IF zone_value ~ '\d+' THEN
    result := (regexp_match(zone_value, '\d+'))[1];
    IF result IS NOT NULL THEN
      RETURN result;
    END IF;
  END IF;
  
  -- If no number found, return "0"
  RETURN '0';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 3: Update "Zone Number" column with merged data
-- Priority: Zone Number > extracted Zone number > "0"
UPDATE public."Planning Database - KPI"
SET "Zone Number" = CASE
  -- If Zone Number exists and is not empty, keep it
  WHEN "Zone Number" IS NOT NULL 
       AND TRIM("Zone Number") != '' 
       AND TRIM("Zone Number") != '0' 
  THEN "Zone Number"
  -- Otherwise, extract zone number from Zone if it exists and is not empty
  WHEN "Zone" IS NOT NULL 
       AND TRIM("Zone") != '' 
       AND TRIM("Zone") != '0'
  THEN extract_zone_number("Zone")
  -- Default to "0" if both are empty
  ELSE '0'
END
WHERE "Zone Number" IS NULL 
   OR TRIM("Zone Number") = ''
   OR TRIM("Zone Number") = '0'
   OR ("Zone" IS NOT NULL 
       AND TRIM("Zone") != '' 
       AND TRIM("Zone") != '0'
       AND ("Zone Number" IS NULL 
            OR TRIM("Zone Number") = '' 
            OR TRIM("Zone Number") = '0'));

-- Step 4: Ensure all records have a Zone Number (set to "0" if both were empty)
UPDATE public."Planning Database - KPI"
SET "Zone Number" = '0'
WHERE "Zone Number" IS NULL OR TRIM("Zone Number") = '';

-- Step 5: Verify the migration
-- Check that all records have Zone Number populated
DO $$
DECLARE
  empty_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO empty_count
  FROM public."Planning Database - KPI"
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
  COUNT(CASE WHEN "Zone Number" = '0' THEN 1 END) as records_with_default_zone,
  COUNT(CASE WHEN "Zone Number" != '0' THEN 1 END) as records_with_zone_data
FROM public."Planning Database - KPI";

-- Step 7: Drop the "Zone" column
ALTER TABLE public."Planning Database - KPI"
DROP COLUMN IF EXISTS "Zone";

-- Step 8: Clean up the helper function (optional, can keep for future use)
-- DROP FUNCTION IF EXISTS extract_zone_number(TEXT);

-- ============================================================
-- Migration Complete
-- ============================================================
-- All "Zone" column data has been merged into "Zone Number"
-- Zone values have been normalized to extract just the zone number
-- Empty zones default to "0"
-- The "Zone" column has been removed
-- ============================================================
