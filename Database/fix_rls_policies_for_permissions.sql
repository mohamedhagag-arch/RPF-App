/**
 * إصلاح RLS Policies لدعم الصلاحيات المخصصة
 * Fix RLS Policies to support custom permissions
 * 
 * المشكلة: RLS Policies الحالية تفحص فقط الأدوار ولا تفحص الصلاحيات المخصصة
 * الحل: تعديل جميع Policies لتفحص الصلاحيات أيضاً
 */

-- ====================================================================
-- 1. حذف Policies القديمة
-- ====================================================================

-- Users Policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can manage users" ON users;

-- Projects Policies
DROP POLICY IF EXISTS "Authenticated users can view projects" ON projects;
DROP POLICY IF EXISTS "Managers and admins can insert projects" ON projects;
DROP POLICY IF EXISTS "Managers and admins can update projects" ON projects;
DROP POLICY IF EXISTS "Admins can delete projects" ON projects;

-- BOQ Activities Policies
DROP POLICY IF EXISTS "Authenticated users can view BOQ activities" ON boq_activities;
DROP POLICY IF EXISTS "Engineers and above can insert BOQ activities" ON boq_activities;
DROP POLICY IF EXISTS "Engineers and above can update BOQ activities" ON boq_activities;
DROP POLICY IF EXISTS "Managers and admins can delete BOQ activities" ON boq_activities;

-- KPI Records Policies
DROP POLICY IF EXISTS "Authenticated users can view KPI records" ON kpi_records;
DROP POLICY IF EXISTS "Engineers and above can insert KPI records" ON kpi_records;
DROP POLICY IF EXISTS "Engineers and above can update KPI records" ON kpi_records;
DROP POLICY IF EXISTS "Managers and admins can delete KPI records" ON kpi_records;

-- ====================================================================
-- 2. دالة مساعدة للتحقق من الصلاحيات
-- ====================================================================

-- دالة للتحقق من وجود صلاحية معينة
CREATE OR REPLACE FUNCTION has_permission(user_id UUID, permission_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  user_permissions TEXT[];
BEGIN
  -- جلب دور المستخدم والصلاحيات
  SELECT role, permissions INTO user_role, user_permissions
  FROM users
  WHERE id = user_id;
  
  -- Admin دائماً لديه جميع الصلاحيات
  IF user_role = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  -- فحص إذا كانت الصلاحية موجودة في قائمة الصلاحيات
  IF permission_name = ANY(user_permissions) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- 3. Users Policies الجديدة
-- ====================================================================

-- يمكن للمستخدمين عرض ملفهم الشخصي أو المستخدمين الذين لديهم صلاحية users.view
CREATE POLICY "Users can view profiles with permission" ON users
  FOR SELECT USING (
    auth.uid() = id 
    OR has_permission(auth.uid(), 'users.view')
  );

-- يمكن للمستخدمين تحديث ملفهم الشخصي فقط أو المستخدمين الذين لديهم صلاحية users.edit
CREATE POLICY "Users can update with permission" ON users
  FOR UPDATE USING (
    auth.uid() = id 
    OR has_permission(auth.uid(), 'users.edit')
  );

-- يمكن للمستخدمين الذين لديهم صلاحية users.create إنشاء مستخدمين جدد
CREATE POLICY "Users can create with permission" ON users
  FOR INSERT WITH CHECK (
    has_permission(auth.uid(), 'users.create')
  );

-- يمكن للمستخدمين الذين لديهم صلاحية users.delete حذف مستخدمين
CREATE POLICY "Users can delete with permission" ON users
  FOR DELETE USING (
    has_permission(auth.uid(), 'users.delete')
  );

-- ====================================================================
-- 4. Projects Policies الجديدة
-- ====================================================================

-- عرض المشاريع
CREATE POLICY "Users can view projects with permission" ON projects
  FOR SELECT USING (
    auth.role() = 'authenticated' 
    AND has_permission(auth.uid(), 'projects.view')
  );

-- إنشاء مشاريع
CREATE POLICY "Users can create projects with permission" ON projects
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' 
    AND has_permission(auth.uid(), 'projects.create')
  );

-- تعديل مشاريع
CREATE POLICY "Users can update projects with permission" ON projects
  FOR UPDATE USING (
    auth.role() = 'authenticated' 
    AND has_permission(auth.uid(), 'projects.edit')
  );

-- حذف مشاريع
CREATE POLICY "Users can delete projects with permission" ON projects
  FOR DELETE USING (
    auth.role() = 'authenticated' 
    AND has_permission(auth.uid(), 'projects.delete')
  );

-- ====================================================================
-- 5. BOQ Activities Policies الجديدة
-- ====================================================================

-- عرض أنشطة BOQ
CREATE POLICY "Users can view BOQ with permission" ON boq_activities
  FOR SELECT USING (
    auth.role() = 'authenticated' 
    AND has_permission(auth.uid(), 'boq.view')
  );

-- إنشاء أنشطة BOQ
CREATE POLICY "Users can create BOQ with permission" ON boq_activities
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' 
    AND has_permission(auth.uid(), 'boq.create')
  );

-- تعديل أنشطة BOQ
CREATE POLICY "Users can update BOQ with permission" ON boq_activities
  FOR UPDATE USING (
    auth.role() = 'authenticated' 
    AND has_permission(auth.uid(), 'boq.edit')
  );

-- حذف أنشطة BOQ
CREATE POLICY "Users can delete BOQ with permission" ON boq_activities
  FOR DELETE USING (
    auth.role() = 'authenticated' 
    AND has_permission(auth.uid(), 'boq.delete')
  );

-- ====================================================================
-- 6. KPI Records Policies الجديدة
-- ====================================================================

-- عرض سجلات KPI
CREATE POLICY "Users can view KPI with permission" ON kpi_records
  FOR SELECT USING (
    auth.role() = 'authenticated' 
    AND has_permission(auth.uid(), 'kpi.view')
  );

-- إنشاء سجلات KPI
CREATE POLICY "Users can create KPI with permission" ON kpi_records
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' 
    AND has_permission(auth.uid(), 'kpi.create')
  );

-- تعديل سجلات KPI
CREATE POLICY "Users can update KPI with permission" ON kpi_records
  FOR UPDATE USING (
    auth.role() = 'authenticated' 
    AND has_permission(auth.uid(), 'kpi.edit')
  );

-- حذف سجلات KPI
CREATE POLICY "Users can delete KPI with permission" ON kpi_records
  FOR DELETE USING (
    auth.role() = 'authenticated' 
    AND has_permission(auth.uid(), 'kpi.delete')
  );

-- ====================================================================
-- 7. التحقق من النجاح
-- ====================================================================

-- عرض جميع Policies الجديدة
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('users', 'projects', 'boq_activities', 'kpi_records')
ORDER BY tablename, policyname;

-- ====================================================================
-- 8. اختبار الصلاحيات
-- ====================================================================

-- اختبار دالة has_permission
-- استبدل 'USER_ID_HERE' بمعرف المستخدم الفعلي للاختبار
-- SELECT has_permission('USER_ID_HERE', 'projects.create');
-- SELECT has_permission('USER_ID_HERE', 'boq.edit');

-- ====================================================================
-- ملاحظات مهمة
-- ====================================================================

-- 1. تأكد من أن جدول users يحتوي على عمود permissions من نوع TEXT[]
-- 2. تأكد من تفعيل RLS على جميع الجداول
-- 3. Admin دائماً لديه جميع الصلاحيات (تم التعامل معه في الدالة has_permission)
-- 4. الدالة has_permission تعمل بشكل آمن مع SECURITY DEFINER
-- 5. يمكن للمستخدمين دائماً عرض وتحديث ملفهم الشخصي

-- ====================================================================
-- تنظيف
-- ====================================================================

-- لإزالة الدالة (إذا لزم الأمر):
-- DROP FUNCTION IF EXISTS has_permission(UUID, TEXT);

COMMIT;
