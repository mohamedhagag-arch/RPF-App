-- ============================================================
-- Check Existing Columns in Database
-- Run this first to see what columns already exist
-- ============================================================

-- Check BOQ Rates table columns
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'Planning Database - BOQ Rates'
ORDER BY ordinal_position;

-- Check Projects table columns
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'Planning Database - ProjectsList'
ORDER BY ordinal_position;

-- Check if calculation columns exist in BOQ Rates
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'Planning Database - BOQ Rates' 
                    AND column_name = 'rate') 
        THEN 'EXISTS' 
        ELSE 'NOT EXISTS' 
    END as rate_column_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'Planning Database - BOQ Rates' 
                    AND column_name = 'progress_percentage') 
        THEN 'EXISTS' 
        ELSE 'NOT EXISTS' 
    END as progress_column_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'Planning Database - BOQ Rates' 
                    AND column_name = 'earned_value') 
        THEN 'EXISTS' 
        ELSE 'NOT EXISTS' 
    END as earned_value_column_status;

-- Check if calculation columns exist in Projects
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'Planning Database - ProjectsList' 
                    AND column_name = 'total_planned_value') 
        THEN 'EXISTS' 
        ELSE 'NOT EXISTS' 
    END as total_planned_value_column_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'Planning Database - ProjectsList' 
                    AND column_name = 'overall_progress') 
        THEN 'EXISTS' 
        ELSE 'NOT EXISTS' 
    END as overall_progress_column_status;
