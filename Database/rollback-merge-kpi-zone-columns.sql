-- ============================================================
-- Rollback: Restore "Zone" Column in KPI Table
-- ============================================================
-- This script restores the "Zone" column from backup and reverses the merge
-- WARNING: This will lose any data that was only in "Zone Number" after the merge
-- ============================================================

-- Step 1: Check if backup table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'Planning Database - KPI_backup_zone_merge'
  ) THEN
    RAISE EXCEPTION 'Backup table "Planning Database - KPI_backup_zone_merge" does not exist. Cannot rollback.';
  END IF;
END $$;

-- Step 2: Add "Zone" column back if it doesn't exist
ALTER TABLE public."Planning Database - KPI"
ADD COLUMN IF NOT EXISTS "Zone" TEXT;

-- Step 3: Restore "Zone" column from backup
UPDATE public."Planning Database - KPI" kpi
SET "Zone" = backup."Zone"
FROM public."Planning Database - KPI_backup_zone_merge" backup
WHERE kpi.id = backup.id
  AND backup."Zone" IS NOT NULL
  AND TRIM(backup."Zone") != '';

-- Step 4: Verify rollback
DO $$
DECLARE
  restored_count INTEGER;
  total_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO restored_count
  FROM public."Planning Database - KPI"
  WHERE "Zone" IS NOT NULL AND TRIM("Zone") != '';
  
  SELECT COUNT(*) INTO total_count
  FROM public."Planning Database - KPI";
  
  RAISE NOTICE 'Rollback complete: Restored Zone column for % out of % records', restored_count, total_count;
END $$;

-- Step 5: Display summary statistics
SELECT 
  COUNT(*) as total_records,
  COUNT(CASE WHEN "Zone" IS NOT NULL AND TRIM("Zone") != '' THEN 1 END) as records_with_zone,
  COUNT(CASE WHEN "Zone Number" IS NOT NULL AND TRIM("Zone Number") != '' AND TRIM("Zone Number") != '0' THEN 1 END) as records_with_zone_number
FROM public."Planning Database - KPI";

-- ============================================================
-- Rollback Complete
-- ============================================================
-- The "Zone" column has been restored from backup
-- Note: "Zone Number" column remains unchanged
-- You may need to manually reconcile data if needed
-- ============================================================
