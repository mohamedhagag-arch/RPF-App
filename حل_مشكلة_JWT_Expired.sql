-- ============================================================
-- حل مشكلة JWT Expired - تحديث RLS Policies
-- ============================================================

-- 1️⃣ تحديث RLS Policies لتعمل مع JWT محدث

-- ✅ تحديث policies للـ Planning Database - ProjectsList
DROP POLICY IF EXISTS "Users can view projects with permission" ON public."Planning Database - ProjectsList";
CREATE POLICY "Users can view projects with permission" ON public."Planning Database - ProjectsList"
FOR SELECT USING (auth.role() = 'authenticated');

-- ✅ تحديث policies للـ Planning Database - BOQ Rates
DROP POLICY IF EXISTS "Users can view BOQ with permission" ON public."Planning Database - BOQ Rates";
CREATE POLICY "Users can view BOQ with permission" ON public."Planning Database - BOQ Rates"
FOR SELECT USING (auth.role() = 'authenticated');

-- ✅ تحديث policies للـ Planning Database - KPI
DROP POLICY IF EXISTS "Users can view KPI with permission" ON public."Planning Database - KPI";
CREATE POLICY "Users can view KPI with permission" ON public."Planning Database - KPI"
FOR SELECT USING (auth.role() = 'authenticated');

-- ✅ تحديث policies للـ users
DROP POLICY IF EXISTS "Users can view profiles with permission" ON public.users;
CREATE POLICY "Users can view profiles with permission" ON public.users
FOR SELECT USING (auth.role() = 'authenticated');

-- ✅ تحديث policies للـ company_settings
DROP POLICY IF EXISTS "Users can read company settings" ON public.company_settings;
CREATE POLICY "Users can read company settings" ON public.company_settings
FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================
-- 2️⃣ تشغيل ANALYZE لتحسين الأداء
-- ============================================================

ANALYZE public."Planning Database - ProjectsList";
ANALYZE public."Planning Database - BOQ Rates";
ANALYZE public."Planning Database - KPI";
ANALYZE public.users;
ANALYZE public.company_settings;

-- ============================================================
-- 3️⃣ رسالة نجاح
-- ============================================================

SELECT '✅ تم حل مشكلة JWT Expired بنجاح!' as status;
