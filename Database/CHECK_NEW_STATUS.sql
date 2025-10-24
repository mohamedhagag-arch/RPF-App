-- ============================================================
-- CHECK NEW STATUS AFTER COMPLETE CALCULATION SYSTEM
-- تحقق من الوضع الجديد بعد تطبيق النظام الشامل
-- ============================================================

-- ============================================================
-- PART 1: Check BOQ Activities Status
-- ============================================================

-- Check calculation columns status
SELECT 
    'BOQ Activities Status' as section,
    COUNT(*) as total_records,
    COUNT(CASE WHEN "Rate" IS NOT NULL AND "Rate" != '' AND "Rate" != '0' THEN 1 END) as with_rate,
    COUNT(CASE WHEN "Activity Progress %" IS NOT NULL AND "Activity Progress %" != '' AND "Activity Progress %" != '0' THEN 1 END) as with_progress,
    COUNT(CASE WHEN "Earned Value" IS NOT NULL AND "Earned Value" != '' AND "Earned Value" != '0' THEN 1 END) as with_earned_value,
    COUNT(CASE WHEN "Planned Value" IS NOT NULL AND "Planned Value" != '' AND "Planned Value" != '0' THEN 1 END) as with_planned_value
FROM "Planning Database - BOQ Rates";

-- ============================================================
-- PART 2: Check Projects Status
-- ============================================================

-- Check project calculation columns status
SELECT 
    'Projects Status' as section,
    COUNT(*) as total_projects,
    COUNT(CASE WHEN total_planned_value IS NOT NULL AND total_planned_value > 0 THEN 1 END) as with_planned_value,
    COUNT(CASE WHEN total_earned_value IS NOT NULL AND total_earned_value > 0 THEN 1 END) as with_earned_value,
    COUNT(CASE WHEN overall_progress IS NOT NULL AND overall_progress > 0 THEN 1 END) as with_progress
FROM "Planning Database - ProjectsList";

-- ============================================================
-- PART 3: Sample Updated Data
-- ============================================================

-- Show sample BOQ activities with calculations
SELECT 
    "Project Code",
    "Activity",
    "Total Value",
    "Planned Units",
    "Actual Units",
    "Rate",
    "Activity Progress %",
    "Earned Value",
    "Planned Value"
FROM "Planning Database - BOQ Rates"
WHERE "Rate" != '0' AND "Rate" IS NOT NULL
ORDER BY "Project Code", "Activity"
LIMIT 15;

-- ============================================================
-- PART 4: Sample Projects with Calculations
-- ============================================================

-- Show sample projects with calculations
SELECT 
    "Project Code",
    "Project Name",
    "Project Type",
    "Responsible Division",
    total_planned_value,
    total_earned_value,
    overall_progress
FROM "Planning Database - ProjectsList"
WHERE total_planned_value > 0
ORDER BY "Project Code"
LIMIT 10;

-- ============================================================
-- PART 5: Data Quality Analysis
-- ============================================================

-- Analyze data quality
SELECT 
    'Data Quality Analysis' as analysis_type,
    COUNT(CASE WHEN "Total Value" IS NOT NULL AND "Total Value" != '' AND "Total Value" != '0' THEN 1 END) as valid_total_value,
    COUNT(CASE WHEN "Planned Units" IS NOT NULL AND "Planned Units" != '' AND "Planned Units" != '0' THEN 1 END) as valid_planned_units,
    COUNT(CASE WHEN "Actual Units" IS NOT NULL AND "Actual Units" != '' AND "Actual Units" != '0' THEN 1 END) as valid_actual_units,
    COUNT(CASE WHEN "Rate" IS NOT NULL AND "Rate" != '' AND "Rate" != '0' THEN 1 END) as calculated_rate,
    COUNT(CASE WHEN "Activity Progress %" IS NOT NULL AND "Activity Progress %" != '' AND "Activity Progress %" != '0' THEN 1 END) as calculated_progress,
    COUNT(CASE WHEN "Earned Value" IS NOT NULL AND "Earned Value" != '' AND "Earned Value" != '0' THEN 1 END) as calculated_earned_value
FROM "Planning Database - BOQ Rates";

-- ============================================================
-- PART 6: Performance Metrics
-- ============================================================

-- Calculate performance metrics
SELECT 
    'Performance Metrics' as metrics_type,
    ROUND(AVG(CAST(REPLACE(REPLACE(COALESCE("Activity Progress %", '0'), ',', ''), ' ', '') AS DECIMAL)), 2) as avg_progress_percentage,
    ROUND(SUM(CAST(REPLACE(REPLACE(COALESCE("Earned Value", '0'), ',', ''), ' ', '') AS DECIMAL)), 2) as total_earned_value,
    ROUND(SUM(CAST(REPLACE(REPLACE(COALESCE("Planned Value", '0'), ',', ''), ' ', '') AS DECIMAL)), 2) as total_planned_value,
    ROUND(SUM(CAST(REPLACE(REPLACE(COALESCE("Earned Value", '0'), ',', ''), ' ', '') AS DECIMAL)) / 
          NULLIF(SUM(CAST(REPLACE(REPLACE(COALESCE("Planned Value", '0'), ',', ''), ' ', '') AS DECIMAL)), 0) * 100, 2) as overall_progress_percentage
FROM "Planning Database - BOQ Rates"
WHERE "Rate" != '0' AND "Rate" IS NOT NULL;

-- ============================================================
-- PART 7: Project-Level Summary
-- ============================================================

-- Show project-level summary
SELECT 
    "Project Code",
    "Project Name",
    "Project Type",
    total_planned_value,
    total_earned_value,
    overall_progress,
    CASE 
        WHEN overall_progress >= 80 THEN 'Excellent'
        WHEN overall_progress >= 60 THEN 'Good'
        WHEN overall_progress >= 40 THEN 'Fair'
        WHEN overall_progress >= 20 THEN 'Poor'
        ELSE 'Very Poor'
    END as performance_status
FROM "Planning Database - ProjectsList"
WHERE total_planned_value > 0
ORDER BY overall_progress DESC;

-- ============================================================
-- PART 8: Check Views Status
-- ============================================================

-- Check if views were created successfully
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name IN ('boq_activities_complete', 'projects_complete')
ORDER BY table_name;

-- ============================================================
-- PART 9: Check Indexes Status
-- ============================================================

-- Check if indexes were created successfully
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('Planning Database - BOQ Rates', 'Planning Database - ProjectsList')
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- ============================================================
-- PART 10: Final Status Summary
-- ============================================================

SELECT 'New status check completed successfully!' as status;
