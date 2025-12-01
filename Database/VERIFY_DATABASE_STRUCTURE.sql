-- ============================================================
-- VERIFY DATABASE STRUCTURE
-- Run this first to understand the current database structure
-- ============================================================

-- ============================================================
-- PART 1: Check Table Existence
-- ============================================================

SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name LIKE '%Planning%'
ORDER BY table_name;

-- ============================================================
-- PART 2: Check BOQ Rates Table Structure
-- ============================================================

SELECT 
    column_name, 
    data_type,
    is_nullable,
    column_default,
    CASE 
        WHEN column_name IN ('Rate', 'Activity Progress %', 'Earned Value', 'Planned Value', 'Remaining Work Value')
        THEN 'CALCULATION COLUMN'
        WHEN column_name IN ('Total Value', 'Planned Units', 'Actual Units')
        THEN 'INPUT COLUMN'
        ELSE 'REGULAR COLUMN'
    END as column_category
FROM information_schema.columns 
WHERE table_name = 'Planning Database - BOQ Rates'
ORDER BY ordinal_position;

-- ============================================================
-- PART 3: Check Projects Table Structure
-- ============================================================

SELECT 
    column_name, 
    data_type,
    is_nullable,
    column_default,
    CASE 
        WHEN column_name IN ('total_planned_value', 'total_earned_value', 'overall_progress')
        THEN 'CALCULATION COLUMN'
        ELSE 'REGULAR COLUMN'
    END as column_category
FROM information_schema.columns 
WHERE table_name = 'Planning Database - ProjectsList'
ORDER BY ordinal_position;

-- ============================================================
-- PART 4: Check Sample Data
-- ============================================================

-- Sample BOQ data
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

-- Sample Project data
SELECT 
    "Project Code",
    "Project Name",
    "Project Type",
    "Responsible Division"
FROM "Planning Database - ProjectsList"
LIMIT 5;

-- ============================================================
-- PART 5: Check Data Quality
-- ============================================================

-- Count records with valid data
SELECT 
    'BOQ Records' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN "Total Value" IS NOT NULL AND "Total Value" != '' THEN 1 END) as with_total_value,
    COUNT(CASE WHEN "Planned Units" IS NOT NULL AND "Planned Units" != '' THEN 1 END) as with_planned_units,
    COUNT(CASE WHEN "Actual Units" IS NOT NULL AND "Actual Units" != '' THEN 1 END) as with_actual_units
FROM "Planning Database - BOQ Rates"

UNION ALL

SELECT 
    'Project Records' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN "Project Code" IS NOT NULL AND "Project Code" != '' THEN 1 END) as with_project_code,
    COUNT(CASE WHEN "Project Name" IS NOT NULL AND "Project Name" != '' THEN 1 END) as with_project_name,
    COUNT(CASE WHEN "Project Type" IS NOT NULL AND "Project Type" != '' THEN 1 END) as with_project_type
FROM "Planning Database - ProjectsList";

-- ============================================================
-- PART 6: Check Calculation Columns Status
-- ============================================================

-- Check if calculation columns exist and have data
SELECT 
    'Rate' as column_name,
    COUNT(CASE WHEN "Rate" IS NOT NULL AND "Rate" != '' AND "Rate" != '0' THEN 1 END) as non_zero_count,
    COUNT(*) as total_count
FROM "Planning Database - BOQ Rates"

UNION ALL

SELECT 
    'Activity Progress %' as column_name,
    COUNT(CASE WHEN "Activity Progress %" IS NOT NULL AND "Activity Progress %" != '' AND "Activity Progress %" != '0' THEN 1 END) as non_zero_count,
    COUNT(*) as total_count
FROM "Planning Database - BOQ Rates"

UNION ALL

SELECT 
    'Earned Value' as column_name,
    COUNT(CASE WHEN "Earned Value" IS NOT NULL AND "Earned Value" != '' AND "Earned Value" != '0' THEN 1 END) as non_zero_count,
    COUNT(*) as total_count
FROM "Planning Database - BOQ Rates";

-- ============================================================
-- PART 7: Success Message
-- ============================================================

SELECT 'Database structure verification completed!' as status;
