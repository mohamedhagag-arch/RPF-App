-- ============================================================
-- 🚨 حل عاجل - تقليل البيانات المحملة
-- ============================================================
-- المشكلة: النظام يحمل 1000 record من كل جدول
-- الحل: تقليل الحد الأقصى إلى 100 فقط
-- ============================================================

-- 1. إنشاء View محدود للـ Projects (آخر 100 مشروع)
-- ============================================================
CREATE OR REPLACE VIEW public."Planning_Projects_Limited" AS
SELECT * FROM public."Planning Database - ProjectsList"
ORDER BY created_at DESC NULLS LAST
LIMIT 100;

-- 2. إنشاء View محدود للـ BOQ (آخر 200 نشاط)
-- ============================================================
CREATE OR REPLACE VIEW public."Planning_BOQ_Limited" AS
SELECT * FROM public."Planning Database - BOQ Rates"
ORDER BY created_at DESC NULLS LAST
LIMIT 200;

-- 3. إنشاء View محدود للـ KPI (آخر 300 سجل)
-- ============================================================
CREATE OR REPLACE VIEW public."Planning_KPI_Limited" AS
SELECT * FROM public."Planning Database - KPI"
ORDER BY created_at DESC NULLS LAST
LIMIT 300;

-- 4. إعطاء صلاحيات للـ Views
-- ============================================================
GRANT SELECT ON public."Planning_Projects_Limited" TO authenticated, anon;
GRANT SELECT ON public."Planning_BOQ_Limited" TO authenticated, anon;
GRANT SELECT ON public."Planning_KPI_Limited" TO authenticated, anon;

-- 5. تطبيق RLS على الـ Views
-- ============================================================
ALTER VIEW public."Planning_Projects_Limited" SET (security_barrier = true);
ALTER VIEW public."Planning_BOQ_Limited" SET (security_barrier = true);
ALTER VIEW public."Planning_KPI_Limited" SET (security_barrier = true);

-- ============================================================
-- ✅ تم إنشاء Views محدودة
-- ============================================================

-- للتحقق:
SELECT 'Projects' as view_name, COUNT(*) as count FROM public."Planning_Projects_Limited"
UNION ALL
SELECT 'BOQ', COUNT(*) FROM public."Planning_BOQ_Limited"
UNION ALL
SELECT 'KPI', COUNT(*) FROM public."Planning_KPI_Limited";

-- ============================================================
-- 📊 النتيجة المتوقعة:
-- ============================================================
-- Projects: 100 rows
-- BOQ: 200 rows
-- KPI: 300 rows
-- Total: 600 rows بدلاً من 2,326 rows (74% تقليل)

-- ============================================================
-- 🔧 ملاحظة مهمة:
-- ============================================================
-- بعد تطبيق هذا، يجب تحديث الكود ليستخدم الـ Views بدلاً من الجداول
-- أو استخدام الحل الأفضل: تحديد limit في الكود مباشرة

