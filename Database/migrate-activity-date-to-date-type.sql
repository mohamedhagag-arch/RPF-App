-- ============================================================================
-- Migration: Convert "Activity Date" Column from TEXT to DATE Type
-- ============================================================================
-- Description: 
--   - Converts "Activity Date" column from TEXT to DATE type
--   - Handles multiple date formats in existing data
--   - Sets NULL values to '2025-12-31' (default date)
--   - Logs invalid dates that cannot be converted
--   - Creates backup table before migration
--
-- Rollback: See rollback-activity-date-to-date-type.sql
-- ============================================================================

BEGIN;

-- Step 1: Create backup table
CREATE TABLE IF NOT EXISTS "Planning Database - KPI_backup_activity_date" AS
SELECT * FROM public."Planning Database - KPI";

-- Step 2: Create temporary table to log conversion issues
CREATE TEMP TABLE IF NOT EXISTS date_conversion_log (
    id UUID,
    original_value TEXT,
    conversion_status TEXT,
    error_message TEXT
);

-- Step 3: Add temporary column for converted dates
ALTER TABLE public."Planning Database - KPI"
ADD COLUMN IF NOT EXISTS "Activity Date_temp" DATE;

-- Step 4: Convert existing dates to DATE type
-- Handle various date formats and convert to YYYY-MM-DD
DO $$
DECLARE
    rec RECORD;
    converted_date DATE;
    date_str TEXT;
    year_val INTEGER;
    month_val INTEGER;
    day_val INTEGER;
    converted_count INTEGER := 0;
    null_count INTEGER := 0;
    error_count INTEGER := 0;
BEGIN
    -- Loop through all records
    FOR rec IN 
        SELECT id, "Activity Date" as activity_date_val
        FROM public."Planning Database - KPI"
    LOOP
        date_str := TRIM(COALESCE(rec.activity_date_val, ''));
        
        -- Skip empty strings
        IF date_str = '' OR date_str IS NULL THEN
            UPDATE public."Planning Database - KPI"
            SET "Activity Date_temp" = '2025-12-31'::DATE
            WHERE id = rec.id;
            null_count := null_count + 1;
            CONTINUE;
        END IF;
        
        -- Try direct DATE conversion first (handles YYYY-MM-DD, ISO formats)
        BEGIN
            converted_date := date_str::DATE;
            UPDATE public."Planning Database - KPI"
            SET "Activity Date_temp" = converted_date
            WHERE id = rec.id;
            converted_count := converted_count + 1;
        EXCEPTION WHEN OTHERS THEN
            -- Try parsing different formats
            BEGIN
                -- Format 1: MM/DD/YYYY or M/D/YYYY
                IF date_str ~ '^\d{1,2}/\d{1,2}/\d{4}$' THEN
                    SELECT 
                        SPLIT_PART(date_str, '/', 3)::INTEGER,  -- year
                        SPLIT_PART(date_str, '/', 1)::INTEGER,  -- month
                        SPLIT_PART(date_str, '/', 2)::INTEGER   -- day
                    INTO year_val, month_val, day_val;
                    
                    IF month_val BETWEEN 1 AND 12 AND day_val BETWEEN 1 AND 31 AND year_val BETWEEN 1900 AND 2100 THEN
                        converted_date := MAKE_DATE(year_val, month_val, day_val);
                        UPDATE public."Planning Database - KPI"
                        SET "Activity Date_temp" = converted_date
                        WHERE id = rec.id;
                        converted_count := converted_count + 1;
                    ELSE
                        RAISE EXCEPTION 'Invalid date values';
                    END IF;
                -- Format 2: DD/MM/YYYY or D/M/YYYY
                ELSIF date_str ~ '^\d{1,2}/\d{1,2}/\d{4}$' THEN
                    -- Try DD/MM/YYYY if MM/DD/YYYY failed
                    SELECT 
                        SPLIT_PART(date_str, '/', 3)::INTEGER,  -- year
                        SPLIT_PART(date_str, '/', 2)::INTEGER,  -- month
                        SPLIT_PART(date_str, '/', 1)::INTEGER   -- day
                    INTO year_val, month_val, day_val;
                    
                    IF month_val BETWEEN 1 AND 12 AND day_val BETWEEN 1 AND 31 AND year_val BETWEEN 1900 AND 2100 THEN
                        converted_date := MAKE_DATE(year_val, month_val, day_val);
                        UPDATE public."Planning Database - KPI"
                        SET "Activity Date_temp" = converted_date
                        WHERE id = rec.id;
                        converted_count := converted_count + 1;
                    ELSE
                        RAISE EXCEPTION 'Invalid date values';
                    END IF;
                -- Format 3: YYYYMMDD (numeric)
                ELSIF date_str ~ '^\d{8}$' THEN
                    year_val := SUBSTRING(date_str, 1, 4)::INTEGER;
                    month_val := SUBSTRING(date_str, 5, 2)::INTEGER;
                    day_val := SUBSTRING(date_str, 7, 2)::INTEGER;
                    
                    IF month_val BETWEEN 1 AND 12 AND day_val BETWEEN 1 AND 31 AND year_val BETWEEN 1900 AND 2100 THEN
                        converted_date := MAKE_DATE(year_val, month_val, day_val);
                        UPDATE public."Planning Database - KPI"
                        SET "Activity Date_temp" = converted_date
                        WHERE id = rec.id;
                        converted_count := converted_count + 1;
                    ELSE
                        RAISE EXCEPTION 'Invalid date values';
                    END IF;
                ELSE
                    RAISE EXCEPTION 'Unrecognized date format';
                END IF;
            EXCEPTION WHEN OTHERS THEN
                -- Log error and set to default date
                INSERT INTO date_conversion_log (id, original_value, conversion_status, error_message)
                VALUES (rec.id, date_str, 'ERROR', SQLERRM);
                
                UPDATE public."Planning Database - KPI"
                SET "Activity Date_temp" = '2025-12-31'::DATE
                WHERE id = rec.id;
                error_count := error_count + 1;
            END;
        END;
    END LOOP;
    
    -- Log summary
    RAISE NOTICE 'Date conversion summary:';
    RAISE NOTICE '  Successfully converted: %', converted_count;
    RAISE NOTICE '  NULL/Empty set to default: %', null_count;
    RAISE NOTICE '  Errors (set to default): %', error_count;
    
    -- Display errors
    IF error_count > 0 THEN
        RAISE NOTICE 'Records with conversion errors:';
        FOR rec IN SELECT * FROM date_conversion_log WHERE conversion_status = 'ERROR' LIMIT 10
        LOOP
            RAISE NOTICE '  ID: %, Original: %, Error: %', rec.id, rec.original_value, rec.error_message;
        END LOOP;
    END IF;
END $$;

-- Step 5: Drop the old TEXT column
ALTER TABLE public."Planning Database - KPI"
DROP COLUMN IF EXISTS "Activity Date";

-- Step 6: Rename temporary column to final name
ALTER TABLE public."Planning Database - KPI"
RENAME COLUMN "Activity Date_temp" TO "Activity Date";

-- Step 7: Set NOT NULL constraint (with default for any remaining NULLs)
UPDATE public."Planning Database - KPI"
SET "Activity Date" = '2025-12-31'::DATE
WHERE "Activity Date" IS NULL;

ALTER TABLE public."Planning Database - KPI"
ALTER COLUMN "Activity Date" SET NOT NULL,
ALTER COLUMN "Activity Date" SET DEFAULT '2025-12-31'::DATE;

-- Step 8: Create index on Activity Date for better query performance
CREATE INDEX IF NOT EXISTS idx_kpi_activity_date ON public."Planning Database - KPI"("Activity Date");

-- Step 9: Save conversion log to permanent table (optional, for review)
CREATE TABLE IF NOT EXISTS public."date_conversion_log_activity_date" AS
SELECT * FROM date_conversion_log;

COMMIT;

-- ============================================================================
-- Verification Query (run after migration to check results)
-- ============================================================================
-- SELECT 
--     COUNT(*) as total_records,
--     COUNT("Activity Date") as records_with_date,
--     MIN("Activity Date") as earliest_date,
--     MAX("Activity Date") as latest_date,
--     COUNT(CASE WHEN "Activity Date" = '2025-12-31'::DATE THEN 1 END) as default_dates
-- FROM public."Planning Database - KPI";
-- ============================================================================
