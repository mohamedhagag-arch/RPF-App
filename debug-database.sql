-- Debug Database Structure and Data
-- Run these queries in Supabase SQL Editor to check the data

-- 1. Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_name LIKE '%Planning%'
ORDER BY table_name;

-- 2. Check Projects table columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'Planning Database - ProjectsList'
ORDER BY ordinal_position;

-- 3. Check BOQ Activities table columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'Planning Database - BOQ Rates'
ORDER BY ordinal_position;

-- 4. Check KPI table columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'Planning Database - KPI'
ORDER BY ordinal_position;

-- 5. Check sample data from Projects
SELECT "Project Code", "Project Name", "Project Type", "Responsible Division"
FROM "Planning Database - ProjectsList"
LIMIT 5;

-- 6. Check sample data from BOQ Activities (first check what columns exist)
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'Planning Database - BOQ Rates'
AND column_name LIKE '%Activity%'
ORDER BY column_name;

-- 6b. Check sample data from BOQ Activities (using actual column names)
SELECT "Project Code", "Activity", "Activity Division", "Unit"
FROM "Planning Database - BOQ Rates"
LIMIT 5;

-- 7. Check sample data from KPI (first check what columns exist)
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'Planning Database - KPI'
AND (column_name LIKE '%Activity%' OR column_name LIKE '%Input%' OR column_name LIKE '%Quantity%')
ORDER BY column_name;

-- 7b. Check sample data from KPI (using actual column names)
SELECT "Project Code", "Project Full Code", "Activity", "Input Type", "Quantity"
FROM "Planning Database - KPI"
LIMIT 5;

-- 8. Check specific project data (replace P6060 with actual project code)
SELECT 
    p."Project Code" as project_code,
    p."Project Name" as project_name,
    COUNT(DISTINCT b.id) as activities_count,
    COUNT(DISTINCT k.id) as kpis_count
FROM "Planning Database - ProjectsList" p
LEFT JOIN "Planning Database - BOQ Rates" b ON b."Project Code" = p."Project Code"
LEFT JOIN "Planning Database - KPI" k ON k."Project Code" = p."Project Code"
WHERE p."Project Code" = 'P6060'
GROUP BY p."Project Code", p."Project Name";

-- 9. Check all project codes in each table
SELECT 'Projects' as table_name, "Project Code" as code FROM "Planning Database - ProjectsList"
UNION ALL
SELECT 'BOQ Activities' as table_name, "Project Code" as code FROM "Planning Database - BOQ Rates"
UNION ALL
SELECT 'KPI' as table_name, "Project Code" as code FROM "Planning Database - KPI"
ORDER BY table_name, code;
