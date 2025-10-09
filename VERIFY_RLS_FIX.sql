-- ============================================================
-- 🔍 التحقق من نجاح تطبيق RLS Fix
-- ============================================================

-- 1. التحقق من الـ policies الجديدة
-- ============================================================
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename LIKE 'Planning%'
ORDER BY tablename, policyname;

-- النتيجة المتوقعة:
-- ✅ auth_all_projects على ProjectsList
-- ✅ auth_all_boq على BOQ Rates
-- ✅ auth_all_kpi على KPI

-- ============================================================

-- 2. التحقق من حالة RLS
-- ============================================================
SELECT 
  schemaname, 
  tablename, 
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'Planning%';

-- النتيجة المتوقعة:
-- ✅ rowsecurity = true لكل الجداول

-- ============================================================

-- 3. التحقق من الـ indexes
-- ============================================================
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename LIKE 'Planning%'
ORDER BY tablename, indexname;

-- النتيجة المتوقعة:
-- ✅ indexes على Project Code, created_at, etc.

-- ============================================================

-- 4. اختبار أداء الاستعلامات
-- ============================================================

-- اختبار Projects
EXPLAIN ANALYZE 
SELECT * FROM public."Planning Database - ProjectsList" 
LIMIT 100;

-- اختبار BOQ
EXPLAIN ANALYZE 
SELECT * FROM public."Planning Database - BOQ Rates" 
LIMIT 100;

-- اختبار KPI
EXPLAIN ANALYZE 
SELECT * FROM public."Planning Database - KPI" 
LIMIT 100;

-- النتيجة المتوقعة:
-- ✅ Execution Time: < 100ms
-- ✅ Planning Time: < 10ms

-- ============================================================
-- 📊 تفسير النتائج:
-- ============================================================
-- إذا كانت النتائج:
-- ✅ 3 policies موجودة (واحدة لكل جدول) → ممتاز!
-- ✅ RLS enabled على كل الجداول → ممتاز!
-- ✅ Execution Time < 100ms → الأداء ممتاز!
-- ❌ أي أخطاء → راجع RLS_PERFORMANCE_ISSUE_SOLUTION.md

