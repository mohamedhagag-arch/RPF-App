-- ============================================================
-- ⚠️ تعطيل RLS مؤقتاً للاختبار - Disable RLS Temporarily
-- ============================================================
-- استخدم هذا فقط للاختبار لتحديد إذا كان RLS هو المشكلة
-- ============================================================

-- 1. تعطيل RLS على الجداول
-- ============================================================
ALTER TABLE public."Planning Database - ProjectsList" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."Planning Database - BOQ Rates" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."Planning Database - KPI" DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- ✅ تم تعطيل RLS مؤقتاً
-- ============================================================
-- اختبر الموقع الآن:
-- 1. افتح الموقع
-- 2. تحقق من عدم وجود قطع اتصال
-- 3. راقب الأداء

-- ⚠️ تحذير: لا تترك RLS معطل في الإنتاج!
-- ============================================================

-- للتحقق من حالة RLS:
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'Planning%';

-- ============================================================
-- 🔄 لإعادة تفعيل RLS بعد الاختبار:
-- ============================================================
-- ALTER TABLE public."Planning Database - ProjectsList" ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public."Planning Database - BOQ Rates" ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public."Planning Database - KPI" ENABLE ROW LEVEL SECURITY;

