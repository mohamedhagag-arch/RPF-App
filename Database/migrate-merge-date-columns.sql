-- ============================================================
-- Migration: Merge Actual Date and Target Date into Activity Date
-- ============================================================
-- This script merges "Actual Date" and "Target Date" columns into "Activity Date"
-- and then removes the redundant columns.
-- ============================================================

BEGIN;

-- ============================================================
-- STEP 1: Migrate Data to Activity Date
-- ============================================================
-- Priority: Keep Activity Date if it exists, otherwise copy from Actual Date or Target Date
-- ============================================================

DO $$
DECLARE
  records_updated INTEGER;
BEGIN
  -- Update records where Activity Date is empty/null
  -- For Actual KPIs: Copy from Actual Date
  UPDATE public."Planning Database - KPI"
  SET "Activity Date" = "Actual Date"
  WHERE ("Activity Date" IS NULL OR "Activity Date" = '' OR TRIM("Activity Date") = '')
    AND "Input Type" = 'Actual'
    AND ("Actual Date" IS NOT NULL AND "Actual Date" != '' AND TRIM("Actual Date") != '');
  
  GET DIAGNOSTICS records_updated = ROW_COUNT;
  RAISE NOTICE '✅ Updated % Actual KPI records: Copied Actual Date to Activity Date', records_updated;
  
  -- For Planned KPIs: Copy from Target Date
  UPDATE public."Planning Database - KPI"
  SET "Activity Date" = "Target Date"
  WHERE ("Activity Date" IS NULL OR "Activity Date" = '' OR TRIM("Activity Date") = '')
    AND "Input Type" = 'Planned'
    AND ("Target Date" IS NOT NULL AND "Target Date" != '' AND TRIM("Target Date") != '');
  
  GET DIAGNOSTICS records_updated = ROW_COUNT;
  RAISE NOTICE '✅ Updated % Planned KPI records: Copied Target Date to Activity Date', records_updated;
  
  -- For records without Input Type specified, try both (Actual Date first, then Target Date)
  UPDATE public."Planning Database - KPI"
  SET "Activity Date" = COALESCE(
    NULLIF(TRIM("Actual Date"), ''),
    NULLIF(TRIM("Target Date"), '')
  )
  WHERE ("Activity Date" IS NULL OR "Activity Date" = '' OR TRIM("Activity Date") = '')
    AND ("Input Type" IS NULL OR "Input Type" = '')
    AND (
      ("Actual Date" IS NOT NULL AND "Actual Date" != '' AND TRIM("Actual Date") != '') OR
      ("Target Date" IS NOT NULL AND "Target Date" != '' AND TRIM("Target Date") != '')
    );
  
  GET DIAGNOSTICS records_updated = ROW_COUNT;
  RAISE NOTICE '✅ Updated % KPI records without Input Type: Copied date to Activity Date', records_updated;
  
END $$;

-- ============================================================
-- STEP 2: Drop Indexes on Actual Date and Target Date
-- ============================================================

DO $$
BEGIN
  DROP INDEX IF EXISTS public.idx_kpi_actual_date;
  DROP INDEX IF EXISTS public.idx_kpi_target_date;
  RAISE NOTICE '✅ Dropped indexes on Actual Date and Target Date columns';
END $$;

-- ============================================================
-- STEP 3: Drop Actual Date and Target Date Columns
-- ============================================================

DO $$
BEGIN
  ALTER TABLE public."Planning Database - KPI"
  DROP COLUMN IF EXISTS "Actual Date",
  DROP COLUMN IF EXISTS "Target Date";
  RAISE NOTICE '✅ Dropped Actual Date and Target Date columns from Planning Database - KPI table';
END $$;

-- ============================================================
-- STEP 4: Verify Migration
-- ============================================================

DO $$
DECLARE
  total_records INTEGER;
  records_with_activity_date INTEGER;
  records_without_activity_date INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_records FROM public."Planning Database - KPI";
  SELECT COUNT(*) INTO records_with_activity_date 
    FROM public."Planning Database - KPI" 
    WHERE "Activity Date" IS NOT NULL 
      AND "Activity Date" != '' 
      AND TRIM("Activity Date") != '';
  SELECT COUNT(*) INTO records_without_activity_date 
    FROM public."Planning Database - KPI" 
    WHERE "Activity Date" IS NULL 
      OR "Activity Date" = '' 
      OR TRIM("Activity Date") = '';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 Migration Summary:';
  RAISE NOTICE '   Total KPI Records: %', total_records;
  RAISE NOTICE '   Records with Activity Date: %', records_with_activity_date;
  RAISE NOTICE '   Records without Activity Date: %', records_without_activity_date;
  RAISE NOTICE '========================================';
END $$;

COMMIT;

-- ============================================================
-- Migration Complete!
-- ============================================================
-- All date data has been merged into "Activity Date" column.
-- Use "Activity Date" with "Input Type" filter for queries:
--   - For Actual KPIs: WHERE "Input Type" = 'Actual' AND "Activity Date" = ...
--   - For Planned KPIs: WHERE "Input Type" = 'Planned' AND "Activity Date" = ...
-- ============================================================
