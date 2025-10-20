-- ============================================================
-- Check Actual Column Names in Database
-- This script shows the exact column names that exist
-- ============================================================

-- ============================================================
-- PART 1: Check BOQ Rates table columns
-- ============================================================

SELECT 
    column_name, 
    data_type,
    is_nullable,
    column_default,
    CASE 
        WHEN column_name LIKE '%Rate%' OR column_name LIKE '%Progress%' OR column_name LIKE '%Value%'
        THEN 'CALCULATION RELATED'
        ELSE 'REGULAR COLUMN'
    END as column_category
FROM information_schema.columns 
WHERE table_name = 'Planning Database - BOQ Rates'
ORDER BY ordinal_position;

-- ============================================================
-- PART 2: Check Projects table columns
-- ============================================================

SELECT 
    column_name, 
    data_type,
    is_nullable,
    column_default,
    CASE 
        WHEN column_name LIKE '%Progress%' OR column_name LIKE '%Value%' OR column_name LIKE '%Index%'
        THEN 'CALCULATION RELATED'
        ELSE 'REGULAR COLUMN'
    END as column_category
FROM information_schema.columns 
WHERE table_name = 'Planning Database - ProjectsList'
ORDER BY ordinal_position;

-- ============================================================
-- PART 3: Check specific calculation columns
-- ============================================================

-- Check if Rate column exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'Planning Database - BOQ Rates' 
                    AND column_name = 'Rate') 
        THEN 'EXISTS' 
        ELSE 'NOT EXISTS' 
    END as rate_column_status;

-- Check if Activity Progress % column exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'Planning Database - BOQ Rates' 
                    AND column_name = 'Activity Progress %') 
        THEN 'EXISTS' 
        ELSE 'NOT EXISTS' 
    END as activity_progress_column_status;

-- Check if Earned Value column exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'Planning Database - BOQ Rates' 
                    AND column_name = 'Earned Value') 
        THEN 'EXISTS' 
        ELSE 'NOT EXISTS' 
    END as earned_value_column_status;

-- ============================================================
-- PART 4: Show sample data from BOQ Rates
-- ============================================================

SELECT 
    "Project Code",
    "Activity",
    "Total Value",
    "Planned Units",
    "Actual Units",
    "Rate",
    "Activity Progress %",
    "Earned Value"
FROM "Planning Database - BOQ Rates"
LIMIT 5;
