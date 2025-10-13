-- ============================================================
-- 🔍 تشخيص سريع لمشكلة قطع الاتصال
-- Quick Diagnosis for Connection Issues
-- ============================================================
-- 
-- شغل هذا الملف في Supabase SQL Editor للتحقق من المشكلة
-- Run this in Supabase SQL Editor to diagnose the issue
--
-- ============================================================

-- ============================================================
-- 1️⃣ عدد السجلات في كل جدول
-- ============================================================

SELECT 'Projects Count' as metric, COUNT(*) as value 
FROM public."Planning Database - ProjectsList"
UNION ALL
SELECT 'BOQ Activities Count', COUNT(*) 
FROM public."Planning Database - BOQ Rates"
UNION ALL
SELECT 'KPI Records Count', COUNT(*) 
FROM public."Planning Database - KPI"
UNION ALL
SELECT 'Total Records', 
  (SELECT COUNT(*) FROM public."Planning Database - ProjectsList") +
  (SELECT COUNT(*) FROM public."Planning Database - BOQ Rates") +
  (SELECT COUNT(*) FROM public."Planning Database - KPI");

-- ============================================================
-- 2️⃣ فحص RLS Policies الحالية
-- ============================================================

SELECT 
  tablename as "Table",
  policyname as "Policy Name",
  permissive as "Type",
  roles as "Roles",
  cmd as "Command",
  CASE 
    WHEN qual LIKE '%EXISTS%' THEN '❌ SLOW (has EXISTS)'
    ELSE '✅ FAST'
  END as "Performance"
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename LIKE 'Planning%'
ORDER BY tablename, policyname;

-- ============================================================
-- 3️⃣ فحص الـ Indexes الموجودة
-- ============================================================

SELECT 
  tablename as "Table",
  indexname as "Index Name",
  CASE 
    WHEN indexname LIKE '%created%' THEN '✅ Good'
    WHEN indexname LIKE '%code%' THEN '✅ Good'
    WHEN indexname LIKE '%pkey%' THEN '✅ Primary Key'
    ELSE '⚠️ Other'
  END as "Status"
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename LIKE 'Planning%'
ORDER BY tablename, indexname;

-- ============================================================
-- 4️⃣ اختبار سرعة الاستعلام
-- ============================================================

-- اختبار KPI (الجدول الأكبر):
EXPLAIN ANALYZE 
SELECT * FROM public."Planning Database - KPI" 
LIMIT 100;

-- ملاحظة: راجع الـ "Execution Time" في النتيجة
-- ✅ Good: < 100 ms
-- ⚠️ Slow: 100-1000 ms  
-- ❌ Very Slow: > 1000 ms (مشكلة!)

-- ============================================================
-- 5️⃣ حالة RLS
-- ============================================================

SELECT 
  schemaname as "Schema",
  tablename as "Table",
  CASE 
    WHEN rowsecurity THEN '✅ RLS Enabled'
    ELSE '❌ RLS Disabled'
  END as "RLS Status"
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'Planning%'
ORDER BY tablename;

-- ============================================================
-- 6️⃣ حجم الجداول
-- ============================================================

SELECT 
  tablename as "Table",
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||quote_ident(tablename))) as "Total Size",
  pg_size_pretty(pg_relation_size(schemaname||'.'||quote_ident(tablename))) as "Table Size",
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||quote_ident(tablename)) - 
                 pg_relation_size(schemaname||'.'||quote_ident(tablename))) as "Indexes Size"
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'Planning%'
ORDER BY pg_total_relation_size(schemaname||'.'||quote_ident(tablename)) DESC;

-- ============================================================
-- 7️⃣ آخر تحديث لإحصائيات الجداول
-- ============================================================

SELECT 
  schemaname as "Schema",
  relname as "Table",
  last_analyze as "Last Analyze",
  last_autoanalyze as "Last Auto Analyze",
  CASE 
    WHEN last_analyze IS NULL AND last_autoanalyze IS NULL THEN '❌ Never Analyzed'
    WHEN last_analyze < NOW() - INTERVAL '7 days' THEN '⚠️ Need Update (>7 days)'
    ELSE '✅ Recent'
  END as "Status"
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND relname LIKE 'Planning%'
ORDER BY relname;

-- ============================================================
-- 📊 التشخيص النهائي
-- ============================================================

-- إذا رأيت:
-- 
-- ❌ "SLOW (has EXISTS)" في RLS Policies 
--    → المشكلة في RLS! استخدم INSTANT_CONNECTION_FIX.sql
-- 
-- ❌ Execution Time > 1000 ms 
--    → المشكلة في الأداء! استخدم INSTANT_CONNECTION_FIX.sql
-- 
-- ⚠️ "Never Analyzed" أو "Need Update" 
--    → شغل: ANALYZE public."Planning Database - KPI";
-- 
-- ✅ كل شيء Good + Fast 
--    → المشكلة ليست في RLS، تحقق من Network/Supabase limits
-- 
-- ============================================================

