-- ============================================================
-- QUICK STATUS CHECK
-- تحقق سريع من الوضع الجديد
-- ============================================================

-- ============================================================
-- PART 1: Quick BOQ Status
-- ============================================================

SELECT 
    'BOQ Activities' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN "Rate" != '0' AND "Rate" IS NOT NULL THEN 1 END) as with_rate,
    COUNT(CASE WHEN "Activity Progress %" != '0' AND "Activity Progress %" IS NOT NULL THEN 1 END) as with_progress,
    COUNT(CASE WHEN "Earned Value" != '0' AND "Earned Value" IS NOT NULL THEN 1 END) as with_earned_value
FROM "Planning Database - BOQ Rates";

-- ============================================================
-- PART 2: Quick Projects Status
-- ============================================================

SELECT 
    'Projects' as table_name,
    COUNT(*) as total_projects,
    COUNT(CASE WHEN total_planned_value > 0 THEN 1 END) as with_planned_value,
    COUNT(CASE WHEN total_earned_value > 0 THEN 1 END) as with_earned_value,
    COUNT(CASE WHEN overall_progress > 0 THEN 1 END) as with_progress
FROM "Planning Database - ProjectsList";

-- ============================================================
-- PART 3: Sample Results
-- ============================================================

-- Sample BOQ results
SELECT 
    "Project Code",
    "Activity",
    "Rate",
    "Activity Progress %",
    "Earned Value"
FROM "Planning Database - BOQ Rates"
WHERE "Rate" != '0' AND "Rate" IS NOT NULL
LIMIT 5;

-- Sample Project results
SELECT 
    "Project Code",
    "Project Name",
    total_planned_value,
    total_earned_value,
    overall_progress
FROM "Planning Database - ProjectsList"
WHERE total_planned_value > 0
LIMIT 5;

-- ============================================================
-- PART 4: Success Message
-- ============================================================

SELECT 'Quick status check completed!' as status;
