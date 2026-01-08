-- ============================================================
-- FIX: BOQ Items Project Full Code Duplication
-- ============================================================
-- This script fixes the issue where Project Full Code shows
-- both the code and full code combined (e.g., "P5066-P5066-I2")
-- when it should only show the full code (e.g., "P5066-I2")
-- ============================================================
-- Run this script in Supabase SQL Editor
-- ============================================================

-- Step 1: Show records that need fixing
-- ============================================================
SELECT 
  id,
  "Project Full Code" as current_full_code,
  "Project Name",
  "Item Description"
FROM public."BOQ items"
WHERE "Project Full Code" ~ '^([A-Z0-9]+)-\1-'  -- Pattern: CODE-CODE-SUFFIX
ORDER BY "Project Full Code"
LIMIT 20;

-- Step 2: Fix Project Full Code by removing duplicate project code prefix
-- ============================================================
-- Pattern: If Project Full Code is "P5066-P5066-I2", it should become "P5066-I2"
-- This regex captures the duplicate pattern and fixes it
UPDATE public."BOQ items"
SET 
  "Project Full Code" = REGEXP_REPLACE(
    "Project Full Code",
    '^([A-Z0-9]+)-\1-',  -- Match pattern: CODE-CODE-
    '\1-'                 -- Replace with: CODE-
  ),
  updated_at = NOW()
WHERE "Project Full Code" ~ '^([A-Z0-9]+)-\1-'  -- Only update records matching the pattern
  AND "Project Full Code" != REGEXP_REPLACE(
    "Project Full Code",
    '^([A-Z0-9]+)-\1-',
    '\1-'
  );  -- Only update if the replacement would change the value

-- Step 3: Verify the fix
-- ============================================================
SELECT 
  COUNT(*) as total_records,
  COUNT(CASE WHEN "Project Full Code" ~ '^([A-Z0-9]+)-\1-' THEN 1 END) as records_still_need_fixing,
  COUNT(CASE WHEN "Project Full Code" !~ '^([A-Z0-9]+)-\1-' THEN 1 END) as records_fixed
FROM public."BOQ items";

-- Step 4: Show sample of fixed records
-- ============================================================
SELECT 
  id,
  "Project Full Code" as fixed_full_code,
  "Project Name",
  "Item Description",
  updated_at
FROM public."BOQ items"
WHERE updated_at >= NOW() - INTERVAL '1 minute'  -- Records updated in last minute
ORDER BY updated_at DESC
LIMIT 10;

-- ============================================================
-- ✅ Fix Complete!
-- ============================================================
-- All BOQ items with duplicate Project Full Code have been fixed.
-- The Project Full Code now shows only the full code (e.g., "P5066-I2")
-- instead of the duplicated format (e.g., "P5066-P5066-I2").
-- ============================================================




