-- ============================================================
-- Check All Columns - فحص جميع الأعمدة
-- ============================================================
-- هذا السكريبت يتحقق من جميع الأعمدة الموجودة في الجداول الرئيسية

-- ============================================================
-- 1. Check BOQ Rates Columns
-- ============================================================
SELECT 
    '✅ BOQ Rates Columns:' AS check_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'Planning Database - BOQ Rates'
ORDER BY ordinal_position;

-- ============================================================
-- 2. Check Projects Columns
-- ============================================================
SELECT 
    '✅ Projects Columns:' AS check_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'Planning Database - ProjectsList'
ORDER BY ordinal_position;

-- ============================================================
-- 3. Check KPI Columns
-- ============================================================
SELECT 
    '✅ KPI Columns:' AS check_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'Planning Database - KPI'
ORDER BY ordinal_position;

-- ============================================================
-- 4. Check if Column 44 or Column 45 exist (should NOT exist!)
-- ============================================================
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ No old columns (Column 44/45) found - Good!'
        ELSE '❌ WARNING: Old columns still exist!'
    END AS status,
    COUNT(*) AS old_columns_count
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'Planning Database - BOQ Rates'
    AND (column_name = 'Column 44' OR column_name = 'Column 45');

-- ============================================================
-- 5. Check required columns exist
-- ============================================================
WITH required_columns AS (
    SELECT unnest(ARRAY[
        'Project Code',
        'Project Sub Code',
        'Project Full Code',
        'Activity',
        'Activity Division',
        'Activity Name',
        'Unit',
        'Zone Ref',
        'Planned Units',
        'Deadline',
        'Total Units',
        'Actual Units',
        'Planned Value',
        'Total Value',
        'Calendar Duration',
        'Planned Activity Start Date',
        'Total Drilling Meters'
    ]) AS col_name
)
SELECT 
    CASE 
        WHEN c.column_name IS NOT NULL THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END AS status,
    rc.col_name AS column_name
FROM required_columns rc
LEFT JOIN information_schema.columns c
    ON c.table_schema = 'public'
    AND c.table_name = 'Planning Database - BOQ Rates'
    AND c.column_name = rc.col_name
ORDER BY 
    CASE WHEN c.column_name IS NOT NULL THEN 1 ELSE 0 END DESC,
    rc.col_name;

-- ============================================================
-- Expected Results:
-- 1. يجب أن ترى قائمة بجميع الأعمدة في كل جدول
-- 2. يجب أن ترى "✅ No old columns found"
-- 3. يجب أن ترى "✅ EXISTS" لجميع الأعمدة المطلوبة
-- ============================================================

