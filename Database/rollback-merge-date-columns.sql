-- ============================================================
-- Rollback: Restore Actual Date and Target Date Columns
-- ============================================================
-- This script restores "Actual Date" and "Target Date" columns
-- by copying data back from "Activity Date" based on Input Type
-- ============================================================
-- WARNING: This will restore the columns but data may be lost
-- if Activity Date was the only source. Use with caution!
-- ============================================================

BEGIN;

-- ============================================================
-- STEP 1: Re-add Actual Date and Target Date Columns
-- ============================================================

DO $$
BEGIN
  -- Add Actual Date column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Planning Database - KPI' 
    AND column_name = 'Actual Date'
  ) THEN
    ALTER TABLE public."Planning Database - KPI"
    ADD COLUMN "Actual Date" TEXT;
    RAISE NOTICE '✅ Added "Actual Date" column';
  ELSE
    RAISE NOTICE '⚠️ "Actual Date" column already exists';
  END IF;
  
  -- Add Target Date column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Planning Database - KPI' 
    AND column_name = 'Target Date'
  ) THEN
    ALTER TABLE public."Planning Database - KPI"
    ADD COLUMN "Target Date" TEXT;
    RAISE NOTICE '✅ Added "Target Date" column';
  ELSE
    RAISE NOTICE '⚠️ "Target Date" column already exists';
  END IF;
END $$;

-- ============================================================
-- STEP 2: Restore Data from Activity Date
-- ============================================================
-- Copy Activity Date back to Actual Date or Target Date based on Input Type
-- ============================================================

DO $$
DECLARE
  records_updated INTEGER;
BEGIN
  -- For Actual KPIs: Copy Activity Date to Actual Date
  UPDATE public."Planning Database - KPI"
  SET "Actual Date" = "Activity Date"
  WHERE "Input Type" = 'Actual'
    AND ("Activity Date" IS NOT NULL AND "Activity Date" != '' AND TRIM("Activity Date") != '');
  
  GET DIAGNOSTICS records_updated = ROW_COUNT;
  RAISE NOTICE '✅ Restored % Actual KPI records: Copied Activity Date to Actual Date', records_updated;
  
  -- For Planned KPIs: Copy Activity Date to Target Date
  UPDATE public."Planning Database - KPI"
  SET "Target Date" = "Activity Date"
  WHERE "Input Type" = 'Planned'
    AND ("Activity Date" IS NOT NULL AND "Activity Date" != '' AND TRIM("Activity Date") != '');
  
  GET DIAGNOSTICS records_updated = ROW_COUNT;
  RAISE NOTICE '✅ Restored % Planned KPI records: Copied Activity Date to Target Date', records_updated;
  
  -- For records without Input Type: Copy to both (may cause duplication)
  UPDATE public."Planning Database - KPI"
  SET "Actual Date" = "Activity Date",
      "Target Date" = "Activity Date"
  WHERE ("Input Type" IS NULL OR "Input Type" = '')
    AND ("Activity Date" IS NOT NULL AND "Activity Date" != '' AND TRIM("Activity Date") != '');
  
  GET DIAGNOSTICS records_updated = ROW_COUNT;
  RAISE NOTICE '✅ Restored % KPI records without Input Type: Copied Activity Date to both columns', records_updated;
  
END $$;

-- ============================================================
-- STEP 3: Recreate Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_kpi_actual_date 
  ON public."Planning Database - KPI" ("Actual Date");

CREATE INDEX IF NOT EXISTS idx_kpi_target_date 
  ON public."Planning Database - KPI" ("Target Date");

RAISE NOTICE '✅ Recreated indexes on Actual Date and Target Date columns';

-- ============================================================
-- STEP 4: Verify Rollback
-- ============================================================

DO $$
DECLARE
  total_records INTEGER;
  records_with_actual_date INTEGER;
  records_with_target_date INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_records FROM public."Planning Database - KPI";
  SELECT COUNT(*) INTO records_with_actual_date 
    FROM public."Planning Database - KPI" 
    WHERE "Actual Date" IS NOT NULL 
      AND "Actual Date" != '' 
      AND TRIM("Actual Date") != '';
  SELECT COUNT(*) INTO records_with_target_date 
    FROM public."Planning Database - KPI" 
    WHERE "Target Date" IS NOT NULL 
      AND "Target Date" != '' 
      AND TRIM("Target Date") != '';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 Rollback Summary:';
  RAISE NOTICE '   Total KPI Records: %', total_records;
  RAISE NOTICE '   Records with Actual Date: %', records_with_actual_date;
  RAISE NOTICE '   Records with Target Date: %', records_with_target_date;
  RAISE NOTICE '========================================';
END $$;

COMMIT;

-- ============================================================
-- Rollback Complete!
-- ============================================================
-- Columns have been restored. Note that data restoration is based
-- on Input Type, so some records may have data in both columns
-- if Input Type was not specified.
-- ============================================================
