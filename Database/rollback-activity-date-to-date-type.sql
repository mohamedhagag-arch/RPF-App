-- ============================================================================
-- Rollback: Convert "Activity Date" Column from DATE back to TEXT Type
-- ============================================================================
-- Description: 
--   - Reverts "Activity Date" column from DATE back to TEXT type
--   - Converts DATE values back to YYYY-MM-DD string format
--   - Restores from backup table if needed
--
-- WARNING: Only run this if you need to rollback the migration!
-- ============================================================================

BEGIN;

-- Step 1: Add temporary TEXT column
ALTER TABLE public."Planning Database - KPI"
ADD COLUMN IF NOT EXISTS "Activity Date_temp" TEXT;

-- Step 2: Convert DATE values to TEXT (YYYY-MM-DD format)
UPDATE public."Planning Database - KPI"
SET "Activity Date_temp" = TO_CHAR("Activity Date", 'YYYY-MM-DD')
WHERE "Activity Date" IS NOT NULL;

-- Step 3: Handle NULL values (set to empty string or default)
UPDATE public."Planning Database - KPI"
SET "Activity Date_temp" = ''
WHERE "Activity Date_temp" IS NULL;

-- Step 4: Drop the DATE column
ALTER TABLE public."Planning Database - KPI"
DROP COLUMN IF EXISTS "Activity Date";

-- Step 5: Rename temporary column to final name
ALTER TABLE public."Planning Database - KPI"
RENAME COLUMN "Activity Date_temp" TO "Activity Date";

-- Step 6: Drop the index created for DATE type
DROP INDEX IF EXISTS idx_kpi_activity_date;

-- Step 7: Restore from backup if needed (uncomment if necessary)
-- DROP TABLE IF EXISTS public."Planning Database - KPI";
-- ALTER TABLE public."Planning Database - KPI_backup_activity_date" 
-- RENAME TO "Planning Database - KPI";

COMMIT;

-- ============================================================================
-- Verification Query (run after rollback to check results)
-- ============================================================================
-- SELECT 
--     COUNT(*) as total_records,
--     COUNT("Activity Date") as records_with_date,
--     COUNT(CASE WHEN "Activity Date" = '' THEN 1 END) as empty_dates
-- FROM public."Planning Database - KPI";
-- ============================================================================
