-- ============================================================
-- حل مشكلة Smart Timeout - تحسين الأداء النهائي
-- ============================================================

-- 1️⃣ إنشاء فهارس إضافية لتحسين الأداء

-- ✅ فهرس للمشاريع
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public."Planning Database - ProjectsList" (created_at);

-- ✅ فهرس للـ BOQ
CREATE INDEX IF NOT EXISTS idx_boq_created_at ON public."Planning Database - BOQ Rates" (created_at);

-- ✅ فهرس للـ KPI
CREATE INDEX IF NOT EXISTS idx_kpi_created_at ON public."Planning Database - KPI" (created_at);

-- ============================================================
-- 2️⃣ تحديث إحصائيات الجداول
-- ============================================================

ANALYZE public."Planning Database - ProjectsList";
ANALYZE public."Planning Database - BOQ Rates";
ANALYZE public."Planning Database - KPI";

-- ============================================================
-- 3️⃣ رسالة نجاح
-- ============================================================

SELECT '✅ تم تحسين الأداء النهائي بنجاح!' as status;
