-- ============================================================
-- Sync kpi_rejected table columns with Planning Database - KPI
-- This script ensures kpi_rejected has exactly the same columns
-- as the main KPI table, plus rejection-specific columns
-- ============================================================

-- ============================================================
-- STEP 1: Add missing columns from main KPI table
-- ============================================================

-- Add columns that exist in main KPI table but might be missing in rejected table
DO $$ 
BEGIN
    -- Add Input Type if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'kpi_rejected' 
        AND column_name = 'Input Type'
    ) THEN
        ALTER TABLE public.kpi_rejected 
        ADD COLUMN "Input Type" TEXT;
        RAISE NOTICE '✅ Added "Input Type" column';
    END IF;

    -- Add Activity Timing if it doesn't exist (from migration)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'kpi_rejected' 
        AND column_name = 'Activity Timing'
    ) THEN
        ALTER TABLE public.kpi_rejected 
        ADD COLUMN "Activity Timing" TEXT;
        RAISE NOTICE '✅ Added "Activity Timing" column';
    END IF;

    -- Add Approval Status if it exists in main KPI table
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'Planning Database - KPI' 
        AND column_name = 'Approval Status'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'kpi_rejected' 
        AND column_name = 'Approval Status'
    ) THEN
        ALTER TABLE public.kpi_rejected 
        ADD COLUMN "Approval Status" TEXT;
        RAISE NOTICE '✅ Added "Approval Status" column';
    END IF;

    -- Add Approved By if it exists in main KPI table
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'Planning Database - KPI' 
        AND column_name = 'Approved By'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'kpi_rejected' 
        AND column_name = 'Approved By'
    ) THEN
        ALTER TABLE public.kpi_rejected 
        ADD COLUMN "Approved By" TEXT;
        RAISE NOTICE '✅ Added "Approved By" column';
    END IF;

    -- Add Approval Date if it exists in main KPI table
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'Planning Database - KPI' 
        AND column_name = 'Approval Date'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'kpi_rejected' 
        AND column_name = 'Approval Date'
    ) THEN
        ALTER TABLE public.kpi_rejected 
        ADD COLUMN "Approval Date" TEXT;
        RAISE NOTICE '✅ Added "Approval Date" column';
    END IF;

    -- Add Activity Division if it exists in main KPI table
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'Planning Database - KPI' 
        AND column_name = 'Activity Division'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'kpi_rejected' 
        AND column_name = 'Activity Division'
    ) THEN
        ALTER TABLE public.kpi_rejected 
        ADD COLUMN "Activity Division" TEXT;
        RAISE NOTICE '✅ Added "Activity Division" column';
    END IF;
END $$;

-- ============================================================
-- STEP 2: Drop columns that don't exist in main KPI table
-- (Keep only: main KPI columns + rejection-specific columns)
-- ============================================================

-- List of columns to DROP (columns that exist in rejected but NOT in main KPI)
-- Main KPI table columns (KEEP THESE):
-- id, Project Full Code, Project Code, Project Sub Code, Activity Name, Activity,
-- Input Type, Quantity, Unit, Section, Zone, Drilled Meters, Value,
-- Target Date, Actual Date, Activity Date, Day, Recorded By, Notes,
-- created_at, updated_at, Activity Timing (from migration)

-- Rejection-specific columns (KEEP THESE):
-- Rejection Reason, Rejected By, Rejected Date, Original KPI ID

DO $$ 
DECLARE
    col_name TEXT;
    columns_to_drop TEXT[] := ARRAY[
        -- BOQ-specific calculated fields
        'Activity Actual Status',
        'Activity Planned Status',
        'Activity Planned Start Date',
        'Activity Planned Completion Date',
        'Activity Delayed?',
        'Activity On Track?',
        'Activity Completed',
        'Activity Scope',
        'Remaining Work Value',
        'Variance Works Value',
        'LookAhead Start Date',
        'LookAhead Activity Completion Date',
        'Remaining LookAhead Duration For Activity Completion',
        
        -- Calculated/progress fields
        'Activity Progress %',
        'Planned Value',
        'Earned Value',
        'Delay %',
        'Planned Progress %',
        'Drilled Meters Planned Progress',
        'Drilled Meters Actual Progress',
        'Remaining Meters',
        'Variance Units',
        'Diffrence',
        'Total Units',
        'Planned Units',
        'Actual Units',
        'Total Value',
        'Productivity Daily Rate',
        'Total Drilling Meters',
        'Planned Activity Start Date',
        'Deadline',
        'Calendar Duration',
        'Reported on Data Date?',
        
        -- Columns not in main KPI table
        'Activity Code',
        'Project Name',
        'Project Full Name',
        'Zone Number',
        'Zone Ref',
        'Zone #',
        'Column 44',
        'Column 45',
        -- Note: Activity Division is kept if it exists in main KPI table
        'Week',
        'Month',
        'Quarter',
        'Area',
        'Block',
        'Chainage',
        'Location',
        'Verified By',
        'Engineer Name',
        'Supervisor Name',
        'Quality Rating',
        'Completion Status',
        'Inspection Status',
        'Test Results',
        'Productivity Rate',
        'Efficiency %',
        'Variance',
        'Variance %',
        'Cumulative Quantity',
        'Cumulative Value',
        'Cost',
        'Budget',
        'Recorded Date',
        'Submission Date',
        'Rate',
        
        -- Metadata columns (keep created_at, updated_at, but remove created_by, updated_by)
        'created_by',
        'updated_by'
        
        -- Note: Approval Status, Approved By, Approval Date are kept if they exist in main KPI table
    ];
BEGIN
    FOREACH col_name IN ARRAY columns_to_drop
    LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'kpi_rejected' 
            AND column_name = col_name
        ) THEN
            EXECUTE format('ALTER TABLE public.kpi_rejected DROP COLUMN IF EXISTS %I', col_name);
            RAISE NOTICE '✅ Dropped column: %', col_name;
        END IF;
    END LOOP;
END $$;

-- ============================================================
-- STEP 3: Verify the final structure
-- ============================================================

-- Show all columns in kpi_rejected table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public'
AND table_name = 'kpi_rejected'
ORDER BY ordinal_position;

-- ============================================================
-- STEP 4: Expected columns in kpi_rejected after sync:
-- ============================================================
-- ✅ Main KPI table columns:
--    - id
--    - Project Full Code
--    - Project Code
--    - Project Sub Code
--    - Activity Name
--    - Activity
--    - Input Type
--    - Quantity
--    - Unit
--    - Section
--    - Zone
--    - Drilled Meters
--    - Value
--    - Target Date
--    - Actual Date
--    - Activity Date
--    - Day
--    - Recorded By
--    - Notes
--    - Activity Timing (if migration was run)
--    - Activity Division (if exists in main KPI table)
--    - Approval Status (if exists in main KPI table)
--    - Approved By (if exists in main KPI table)
--    - Approval Date (if exists in main KPI table)
--    - created_at
--    - updated_at
--
-- ✅ Rejection-specific columns:
--    - Rejection Reason
--    - Rejected By
--    - Rejected Date
--    - Original KPI ID
-- ============================================================

SELECT '✅ kpi_rejected table columns synced with Planning Database - KPI!' as status;

