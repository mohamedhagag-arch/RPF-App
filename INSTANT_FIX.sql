-- ============================================================
-- ⚡ الحل الفوري - INSTANT FIX
-- ============================================================
-- انسخ والصق هذا الكود كاملاً في Supabase SQL Editor
-- ============================================================

-- 1. حذف أي policies قديمة
DROP POLICY IF EXISTS "Allow authenticated read" ON public."Planning Database - ProjectsList";
DROP POLICY IF EXISTS "Allow authenticated read" ON public."Planning Database - BOQ Rates";
DROP POLICY IF EXISTS "Allow authenticated read" ON public."Planning Database - KPI";
DROP POLICY IF EXISTS "auth_all_projects" ON public."Planning Database - ProjectsList";
DROP POLICY IF EXISTS "auth_all_boq" ON public."Planning Database - BOQ Rates";
DROP POLICY IF EXISTS "auth_all_kpi" ON public."Planning Database - KPI";

-- 2. تفعيل RLS
ALTER TABLE public."Planning Database - ProjectsList" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Planning Database - BOQ Rates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Planning Database - KPI" ENABLE ROW LEVEL SECURITY;

-- 3. إنشاء policies بسيطة وسريعة
CREATE POLICY "auth_all_projects" ON public."Planning Database - ProjectsList"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_all_boq" ON public."Planning Database - BOQ Rates"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_all_kpi" ON public."Planning Database - KPI"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. تحليل الجداول
ANALYZE public."Planning Database - ProjectsList";
ANALYZE public."Planning Database - BOQ Rates";
ANALYZE public."Planning Database - KPI";

-- ============================================================
-- ✅ تم! اختبر الموقع الآن
-- ============================================================

