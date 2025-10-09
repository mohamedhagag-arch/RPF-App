-- ============================================================
-- 🔧 Fix RLS Performance Issues - تحسين أداء RLS
-- ============================================================
-- هذا الملف يصلح مشاكل الأداء في Row Level Security policies
-- المشكلة: EXISTS subqueries تسبب بطء في كل استعلام
-- الحل: تبسيط الـ policies وإضافة indexes
-- ============================================================

-- 1. إزالة الـ RLS policies القديمة
-- ============================================================
DROP POLICY IF EXISTS "Allow authenticated read" ON public."Planning Database - ProjectsList";
DROP POLICY IF EXISTS "Allow authenticated read" ON public."Planning Database - BOQ Rates";
DROP POLICY IF EXISTS "Allow authenticated read" ON public."Planning Database - KPI";

-- 2. إنشاء policies محسنة (بدون EXISTS subqueries)
-- ============================================================

-- Projects - السماح لكل المستخدمين المسجلين بالقراءة
CREATE POLICY "authenticated_select_projects" 
ON public."Planning Database - ProjectsList"
FOR SELECT 
TO authenticated
USING (true);

-- Projects - السماح بالكتابة للمسجلين فقط
CREATE POLICY "authenticated_insert_projects" 
ON public."Planning Database - ProjectsList"
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "authenticated_update_projects" 
ON public."Planning Database - ProjectsList"
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "authenticated_delete_projects" 
ON public."Planning Database - ProjectsList"
FOR DELETE 
TO authenticated
USING (true);

-- BOQ Activities - السماح لكل المستخدمين المسجلين
CREATE POLICY "authenticated_select_boq" 
ON public."Planning Database - BOQ Rates"
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "authenticated_insert_boq" 
ON public."Planning Database - BOQ Rates"
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "authenticated_update_boq" 
ON public."Planning Database - BOQ Rates"
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "authenticated_delete_boq" 
ON public."Planning Database - BOQ Rates"
FOR DELETE 
TO authenticated
USING (true);

-- KPI Records - السماح لكل المستخدمين المسجلين
CREATE POLICY "authenticated_select_kpi" 
ON public."Planning Database - KPI"
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "authenticated_insert_kpi" 
ON public."Planning Database - KPI"
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "authenticated_update_kpi" 
ON public."Planning Database - KPI"
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "authenticated_delete_kpi" 
ON public."Planning Database - KPI"
FOR DELETE 
TO authenticated
USING (true);

-- 3. إضافة indexes إضافية لتحسين الأداء
-- ============================================================

-- Projects indexes
CREATE INDEX IF NOT EXISTS idx_projects_status 
  ON public."Planning Database - ProjectsList"("Project Status");

CREATE INDEX IF NOT EXISTS idx_projects_created 
  ON public."Planning Database - ProjectsList"(created_at DESC);

-- BOQ Activities indexes
CREATE INDEX IF NOT EXISTS idx_boq_activity_status 
  ON public."Planning Database - BOQ Rates"("Activity Completed");

CREATE INDEX IF NOT EXISTS idx_boq_created 
  ON public."Planning Database - BOQ Rates"(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_boq_project_full 
  ON public."Planning Database - BOQ Rates"("Project Code", "Activity Name");

-- KPI Records indexes
CREATE INDEX IF NOT EXISTS idx_kpi_created 
  ON public."Planning Database - KPI"(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_kpi_project_full_code 
  ON public."Planning Database - KPI"("Project Full Code");

CREATE INDEX IF NOT EXISTS idx_kpi_both_codes 
  ON public."Planning Database - KPI"("Project Code", "Project Full Code");

-- 4. تحليل الجداول لتحديث الإحصائيات
-- ============================================================
ANALYZE public."Planning Database - ProjectsList";
ANALYZE public."Planning Database - BOQ Rates";
ANALYZE public."Planning Database - KPI";

-- 5. تفعيل VACUUM لتنظيف البيانات القديمة
-- ============================================================
-- لاحظ: VACUUM لا يعمل في transaction، يجب تشغيله منفصلاً
-- VACUUM ANALYZE public."Planning Database - ProjectsList";
-- VACUUM ANALYZE public."Planning Database - BOQ Rates";
-- VACUUM ANALYZE public."Planning Database - KPI";

-- ============================================================
-- ✅ تم تحسين RLS Policies بنجاح!
-- ============================================================

-- للتحقق من الـ policies:
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
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

-- ============================================================
-- 📊 ملاحظات مهمة:
-- ============================================================
-- 1. الـ policies الجديدة أبسط وأسرع بكثير
-- 2. لا تستخدم EXISTS subqueries التي تسبب بطء
-- 3. Indexes إضافية لتحسين الأداء
-- 4. ANALYZE لتحديث إحصائيات الجداول
-- 5. يجب تشغيل VACUUM منفصلاً لتنظيف البيانات

-- ============================================================
-- 🔍 للمراقبة والاختبار:
-- ============================================================
-- راقب أداء الاستعلامات:
-- EXPLAIN ANALYZE SELECT * FROM public."Planning Database - KPI" LIMIT 100;
-- EXPLAIN ANALYZE SELECT * FROM public."Planning Database - BOQ Rates" LIMIT 100;
-- EXPLAIN ANALYZE SELECT * FROM public."Planning Database - ProjectsList" LIMIT 100;

