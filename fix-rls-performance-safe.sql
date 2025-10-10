-- ============================================================
-- 🔧 Fix RLS Performance Issues - SAFE VERSION
-- ============================================================
-- نسخة آمنة بدون أعمدة قد لا توجد
-- ============================================================

-- 1. إزالة الـ RLS policies القديمة
-- ============================================================
DROP POLICY IF EXISTS "Allow authenticated read" ON public."Planning Database - ProjectsList";
DROP POLICY IF EXISTS "Allow authenticated read" ON public."Planning Database - BOQ Rates";
DROP POLICY IF EXISTS "Allow authenticated read" ON public."Planning Database - KPI";

-- إزالة أي policies أخرى قديمة
DROP POLICY IF EXISTS "authenticated_select_projects" ON public."Planning Database - ProjectsList";
DROP POLICY IF EXISTS "authenticated_insert_projects" ON public."Planning Database - ProjectsList";
DROP POLICY IF EXISTS "authenticated_update_projects" ON public."Planning Database - ProjectsList";
DROP POLICY IF EXISTS "authenticated_delete_projects" ON public."Planning Database - ProjectsList";
DROP POLICY IF EXISTS "auth_all_projects" ON public."Planning Database - ProjectsList";

DROP POLICY IF EXISTS "authenticated_select_boq" ON public."Planning Database - BOQ Rates";
DROP POLICY IF EXISTS "authenticated_insert_boq" ON public."Planning Database - BOQ Rates";
DROP POLICY IF EXISTS "authenticated_update_boq" ON public."Planning Database - BOQ Rates";
DROP POLICY IF EXISTS "authenticated_delete_boq" ON public."Planning Database - BOQ Rates";
DROP POLICY IF EXISTS "auth_all_boq" ON public."Planning Database - BOQ Rates";

DROP POLICY IF EXISTS "authenticated_select_kpi" ON public."Planning Database - KPI";
DROP POLICY IF EXISTS "authenticated_insert_kpi" ON public."Planning Database - KPI";
DROP POLICY IF EXISTS "authenticated_update_kpi" ON public."Planning Database - KPI";
DROP POLICY IF EXISTS "authenticated_delete_kpi" ON public."Planning Database - KPI";
DROP POLICY IF EXISTS "auth_all_kpi" ON public."Planning Database - KPI";

-- 2. تفعيل RLS على الجداول
-- ============================================================
ALTER TABLE public."Planning Database - ProjectsList" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Planning Database - BOQ Rates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Planning Database - KPI" ENABLE ROW LEVEL SECURITY;

-- 3. إنشاء policies محسنة (بسيطة جداً وسريعة)
-- ============================================================

-- Projects - policy واحدة للجميع العمليات
CREATE POLICY "auth_all_projects" 
ON public."Planning Database - ProjectsList"
FOR ALL 
TO authenticated
USING (true) 
WITH CHECK (true);

-- BOQ Activities - policy واحدة للجميع العمليات
CREATE POLICY "auth_all_boq" 
ON public."Planning Database - BOQ Rates"
FOR ALL 
TO authenticated
USING (true) 
WITH CHECK (true);

-- KPI Records - policy واحدة للجميع العمليات
CREATE POLICY "auth_all_kpi" 
ON public."Planning Database - KPI"
FOR ALL 
TO authenticated
USING (true) 
WITH CHECK (true);

-- 4. إضافة indexes أساسية فقط (بدون أعمدة قد لا توجد)
-- ============================================================

-- Projects indexes - الأساسية فقط
CREATE INDEX IF NOT EXISTS idx_projects_code_main 
  ON public."Planning Database - ProjectsList"("Project Code");

CREATE INDEX IF NOT EXISTS idx_projects_created_main 
  ON public."Planning Database - ProjectsList"(created_at DESC);

-- BOQ Activities indexes - الأساسية فقط
CREATE INDEX IF NOT EXISTS idx_boq_project_code_main 
  ON public."Planning Database - BOQ Rates"("Project Code");

CREATE INDEX IF NOT EXISTS idx_boq_created_main 
  ON public."Planning Database - BOQ Rates"(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_boq_project_full_main 
  ON public."Planning Database - BOQ Rates"("Project Full Code");

-- KPI Records indexes - الأساسية فقط
CREATE INDEX IF NOT EXISTS idx_kpi_project_code_main 
  ON public."Planning Database - KPI"("Project Code");

CREATE INDEX IF NOT EXISTS idx_kpi_created_main 
  ON public."Planning Database - KPI"(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_kpi_project_full_code_main 
  ON public."Planning Database - KPI"("Project Full Code");

-- 5. تحليل الجداول لتحديث الإحصائيات
-- ============================================================
ANALYZE public."Planning Database - ProjectsList";
ANALYZE public."Planning Database - BOQ Rates";
ANALYZE public."Planning Database - KPI";

-- ============================================================
-- ✅ تم تحسين RLS Policies بنجاح!
-- ============================================================

-- للتحقق من الـ policies:
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename LIKE 'Planning%'
ORDER BY tablename, policyname;

-- للتحقق من الـ indexes:
SELECT
    tablename,
    indexname,
    indexdef
FROM
    pg_indexes
WHERE
    schemaname = 'public'
    AND tablename LIKE 'Planning%'
ORDER BY
    tablename,
    indexname;

-- للتحقق من حالة RLS:
SELECT 
  schemaname, 
  tablename, 
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'Planning%';

-- ============================================================
-- 📊 ملاحظات:
-- ============================================================
-- ✅ هذه النسخة آمنة ولا تحتوي على أعمدة قد لا توجد
-- ✅ Policies بسيطة جداً وسريعة (بدون subqueries)
-- ✅ Indexes أساسية فقط
-- ✅ يجب أن تعمل بدون أخطاء

-- ============================================================
-- 🔍 للمراقبة:
-- ============================================================
-- راقب أداء الاستعلامات:
-- EXPLAIN ANALYZE SELECT * FROM public."Planning Database - KPI" LIMIT 100;


