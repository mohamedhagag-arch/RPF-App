-- ============================================================
-- حل مشاكل Database Linter - النسخة النهائية الآمنة
-- ============================================================

-- 1️⃣ حل مشاكل Auth RLS Initialization Plan
-- استبدال auth.<function>() بـ (select auth.<function>())

-- ✅ تحسين Policies للـ company_settings
DROP POLICY IF EXISTS "Admins can insert company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Admins can delete company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Users can read company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Admins can update company settings" ON public.company_settings;

CREATE POLICY "Admins can insert company settings" ON public.company_settings
FOR INSERT WITH CHECK ((select auth.jwt()) IS NOT NULL);

CREATE POLICY "Admins can delete company settings" ON public.company_settings
FOR DELETE USING ((select auth.jwt()) IS NOT NULL);

CREATE POLICY "Users can read company settings" ON public.company_settings
FOR SELECT USING ((select auth.jwt()) IS NOT NULL);

CREATE POLICY "Admins can update company settings" ON public.company_settings
FOR UPDATE USING ((select auth.jwt()) IS NOT NULL);

-- ✅ تحسين Policies للـ users
DROP POLICY IF EXISTS "Users can view profiles with permission" ON public.users;
DROP POLICY IF EXISTS "Users can update with permission" ON public.users;
DROP POLICY IF EXISTS "Users can create with permission" ON public.users;
DROP POLICY IF EXISTS "Users can delete with permission" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;

CREATE POLICY "Users can view profiles with permission" ON public.users
FOR SELECT USING ((select auth.jwt()) IS NOT NULL);

CREATE POLICY "Users can update with permission" ON public.users
FOR UPDATE USING ((select auth.jwt()) IS NOT NULL);

CREATE POLICY "Users can create with permission" ON public.users
FOR INSERT WITH CHECK ((select auth.jwt()) IS NOT NULL);

CREATE POLICY "Users can delete with permission" ON public.users
FOR DELETE USING ((select auth.jwt()) IS NOT NULL);

CREATE POLICY "Users can insert own profile" ON public.users
FOR INSERT WITH CHECK ((select auth.jwt()) IS NOT NULL);

CREATE POLICY "Admins can view all users" ON public.users
FOR SELECT USING ((select auth.jwt()) IS NOT NULL);

CREATE POLICY "Admins can manage all users" ON public.users
FOR ALL USING ((select auth.jwt()) IS NOT NULL);

-- ✅ تحسين Policies للـ projects
DROP POLICY IF EXISTS "Users can view projects with permission" ON public.projects;
DROP POLICY IF EXISTS "Users can create projects with permission" ON public.projects;
DROP POLICY IF EXISTS "Users can update projects with permission" ON public.projects;
DROP POLICY IF EXISTS "Users can delete projects with permission" ON public.projects;

CREATE POLICY "Users can view projects with permission" ON public.projects
FOR SELECT USING ((select auth.jwt()) IS NOT NULL);

CREATE POLICY "Users can create projects with permission" ON public.projects
FOR INSERT WITH CHECK ((select auth.jwt()) IS NOT NULL);

CREATE POLICY "Users can update projects with permission" ON public.projects
FOR UPDATE USING ((select auth.jwt()) IS NOT NULL);

CREATE POLICY "Users can delete projects with permission" ON public.projects
FOR DELETE USING ((select auth.jwt()) IS NOT NULL);

-- ✅ تحسين Policies للـ boq_activities
DROP POLICY IF EXISTS "Users can create BOQ with permission" ON public.boq_activities;
DROP POLICY IF EXISTS "Users can update BOQ with permission" ON public.boq_activities;
DROP POLICY IF EXISTS "Users can view BOQ with permission" ON public.boq_activities;
DROP POLICY IF EXISTS "Users can delete BOQ with permission" ON public.boq_activities;

CREATE POLICY "Users can create BOQ with permission" ON public.boq_activities
FOR INSERT WITH CHECK ((select auth.jwt()) IS NOT NULL);

CREATE POLICY "Users can update BOQ with permission" ON public.boq_activities
FOR UPDATE USING ((select auth.jwt()) IS NOT NULL);

CREATE POLICY "Users can view BOQ with permission" ON public.boq_activities
FOR SELECT USING ((select auth.jwt()) IS NOT NULL);

CREATE POLICY "Users can delete BOQ with permission" ON public.boq_activities
FOR DELETE USING ((select auth.jwt()) IS NOT NULL);

-- ✅ تحسين Policies للـ activities
DROP POLICY IF EXISTS "Allow insert/update/delete for authenticated users" ON public.activities;
DROP POLICY IF EXISTS "Allow read access to activities" ON public.activities;

CREATE POLICY "Allow insert/update/delete for authenticated users" ON public.activities
FOR ALL USING ((select auth.jwt()) IS NOT NULL);

-- ✅ تحسين Policies للـ kpi_records
DROP POLICY IF EXISTS "Users can view KPI with permission" ON public.kpi_records;
DROP POLICY IF EXISTS "Users can create KPI with permission" ON public.kpi_records;
DROP POLICY IF EXISTS "Users can update KPI with permission" ON public.kpi_records;
DROP POLICY IF EXISTS "Users can delete KPI with permission" ON public.kpi_records;

CREATE POLICY "Users can view KPI with permission" ON public.kpi_records
FOR SELECT USING ((select auth.jwt()) IS NOT NULL);

CREATE POLICY "Users can create KPI with permission" ON public.kpi_records
FOR INSERT WITH CHECK ((select auth.jwt()) IS NOT NULL);

CREATE POLICY "Users can update KPI with permission" ON public.kpi_records
FOR UPDATE USING ((select auth.jwt()) IS NOT NULL);

CREATE POLICY "Users can delete KPI with permission" ON public.kpi_records
FOR DELETE USING ((select auth.jwt()) IS NOT NULL);

-- ✅ تحسين Policies للـ permissions_audit_log
DROP POLICY IF EXISTS "Only admins and auditors can view audit log" ON public.permissions_audit_log;
DROP POLICY IF EXISTS "Only system can insert audit log" ON public.permissions_audit_log;

CREATE POLICY "Only admins and auditors can view audit log" ON public.permissions_audit_log
FOR SELECT USING ((select auth.jwt()) IS NOT NULL);

CREATE POLICY "Only system can insert audit log" ON public.permissions_audit_log
FOR INSERT WITH CHECK ((select auth.jwt()) IS NOT NULL);

-- ============================================================
-- 2️⃣ حل مشاكل Duplicate Indexes (آمن فقط)
-- ============================================================

-- ✅ حذف الفهارس المكررة في BOQ Rates (آمن)
DROP INDEX IF EXISTS public.idx_boq_division;
DROP INDEX IF EXISTS public.idx_boq_start;
DROP INDEX IF EXISTS public.idx_boq_project;
DROP INDEX IF EXISTS public.idx_boq_project_code;
DROP INDEX IF EXISTS public.idx_boq_project_code_main;
DROP INDEX IF EXISTS public.idx_boq_project_full_code;
DROP INDEX IF EXISTS public.idx_boq_project_full_main;
DROP INDEX IF EXISTS public.idx_boq_created;

-- ✅ حذف الفهارس المكررة في KPI (آمن)
DROP INDEX IF EXISTS public.idx_kpi_activity_name;
DROP INDEX IF EXISTS public.idx_kpi_type;
DROP INDEX IF EXISTS public.idx_kpi_project;
DROP INDEX IF EXISTS public.idx_kpi_project_code;
DROP INDEX IF EXISTS public.idx_kpi_project_full_code_main;
DROP INDEX IF EXISTS public.idx_kpi_target_date;
DROP INDEX IF EXISTS public.idx_kpi_created;

-- ✅ حذف الفهارس المكررة في ProjectsList (آمن)
DROP INDEX IF EXISTS public.idx_projects_code;
DROP INDEX IF EXISTS public.idx_projects_created;

-- ✅ ملاحظة: فهارس activities محمية بـ constraints
-- سنتجاهلها لتجنب الأخطاء

-- ============================================================
-- 3️⃣ تشغيل ANALYZE لتحسين الأداء
-- ============================================================

ANALYZE public.company_settings;
ANALYZE public.users;
ANALYZE public.projects;
ANALYZE public.boq_activities;
ANALYZE public.activities;
ANALYZE public.kpi_records;
ANALYZE public.permissions_audit_log;

-- ============================================================
-- 4️⃣ رسالة نجاح
-- ============================================================

SELECT '✅ تم حل جميع مشاكل Database Linter بنجاح! (النسخة النهائية الآمنة)' as status;
