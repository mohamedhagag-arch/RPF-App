-- ============================================================
-- Auto Create User on Signup - إنشاء مستخدم تلقائياً عند التسجيل
-- ============================================================
-- هذا الـ Trigger ينشئ المستخدم في جدول users تلقائياً عند التسجيل في Auth

-- ============================================================
-- STEP 1: إنشاء Function لإضافة المستخدم
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- إضافة المستخدم الجديد في جدول users
  INSERT INTO public.users (
    id,
    email,
    full_name,
    role,
    is_active,
    custom_permissions_enabled,
    permissions,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), -- استخدام الاسم من metadata أو email
    'viewer', -- الدور الافتراضي
    true,     -- نشط
    false,    -- صلاحيات مخصصة معطلة
    -- صلاحيات Viewer الصحيحة
    ARRAY[
      'dashboard.view',
      'projects.view',
      'boq.view',
      'kpi.view',
      'reports.view', 'reports.daily', 'reports.weekly', 'reports.monthly',
      'reports.lookahead', 'reports.critical', 'reports.performance',
      'cost_control.view', 'cost_control.manpower.view', 'cost_control.designation_rates.view', 
      'cost_control.machine_list.view', 'cost_control.machinery_day_rates.view', 
      'cost_control.material.view', 'cost_control.subcontractor.view', 'cost_control.diesel.view', 
      'cost_control.transportation.view', 'cost_control.hired_manpower.view', 
      'cost_control.rpf_equipment.view', 'cost_control.rented_equipment.view', 
      'cost_control.other_cost.view',
      'hr.view', 'hr.manpower.view', 'hr.attendance.view', 'hr.attendance.reports.view',
      'procurement.view', 'procurement.vendor_list.view', 'procurement.items_list.view', 
      'procurement.payment_terms.view', 'procurement.lpo.view',
      'settings.view', 'project_types.view', 'activities.view', 'departments.view', 
      'job_titles.view', 'companies.view',
      'directory.view', 'directory.search', 'profile.view',
      'system.search', 'user_guide.view', 'active_users.view',
      'analytics.view', 'performance.view',
      'notifications.view', 'alerts.view', 'integrations.view',
      'workflow.view', 'automation.view', 'security.view', 'compliance.view',
      'database.view'
    ]::TEXT[],
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING; -- تجنب الأخطاء إذا كان المستخدم موجود
  
  RETURN NEW;
END;
$$;

-- ============================================================
-- STEP 2: إنشاء Trigger على auth.users
-- ============================================================

-- حذف الـ Trigger القديم إن وجد
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- إنشاء الـ Trigger الجديد
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- STEP 3: التحقق من الـ Trigger
-- ============================================================

SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'auth'
  AND trigger_name = 'on_auth_user_created';

-- يجب أن ترى: on_auth_user_created | INSERT | users | ...

-- ============================================================
-- STEP 4: اختبار الـ Trigger (اختياري)
-- ============================================================

-- يمكنك اختبار بإنشاء مستخدم جديد من التطبيق
-- بعد التسجيل، تحقق من:

SELECT 
  id,
  email,
  full_name,
  role,
  is_active,
  created_at
FROM public.users
ORDER BY created_at DESC
LIMIT 5;

-- يجب أن ترى المستخدم الجديد تلقائياً! ✅

-- ============================================================
-- STEP 5: إضافة المستخدمين الموجودين في Auth لكن ليسوا في users
-- ============================================================

-- إيجاد المستخدمين في Auth لكن ليسوا في users
INSERT INTO public.users (
  id,
  email,
  full_name,
  role,
  is_active,
  custom_permissions_enabled,
  permissions,
  created_at,
  updated_at
)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email),
  'viewer', -- الدور الافتراضي للمستخدمين الجدد
  true,
  false,
  -- صلاحيات Viewer الصحيحة
  ARRAY[
    'dashboard.view',
    'projects.view',
    'boq.view',
    'kpi.view',
    'reports.view', 'reports.daily', 'reports.weekly', 'reports.monthly',
    'reports.lookahead', 'reports.critical', 'reports.performance',
    'cost_control.view', 'cost_control.manpower.view', 'cost_control.designation_rates.view', 
    'cost_control.machine_list.view', 'cost_control.machinery_day_rates.view', 
    'cost_control.material.view', 'cost_control.subcontractor.view', 'cost_control.diesel.view', 
    'cost_control.transportation.view', 'cost_control.hired_manpower.view', 
    'cost_control.rpf_equipment.view', 'cost_control.rented_equipment.view', 
    'cost_control.other_cost.view',
    'hr.view', 'hr.manpower.view', 'hr.attendance.view', 'hr.attendance.reports.view',
    'procurement.view', 'procurement.vendor_list.view', 'procurement.items_list.view', 
    'procurement.payment_terms.view', 'procurement.lpo.view',
    'settings.view', 'project_types.view', 'activities.view', 'departments.view', 
    'job_titles.view', 'companies.view',
    'directory.view', 'directory.search', 'profile.view',
    'system.search', 'user_guide.view', 'active_users.view',
    'analytics.view', 'performance.view',
    'notifications.view', 'alerts.view', 'integrations.view',
    'workflow.view', 'automation.view', 'security.view', 'compliance.view',
    'database.view'
  ]::TEXT[],
  au.created_at,
  NOW()
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users pu 
  WHERE pu.id = au.id
);

-- التحقق من النتيجة
SELECT 
  '✅ Synced Users:' AS status,
  COUNT(*) AS count
FROM public.users;

-- ============================================================
-- Expected Result:
-- 1. Trigger تم إنشاؤه بنجاح
-- 2. جميع المستخدمين من Auth تمت إضافتهم في users
-- 3. المستخدمين الجدد سيضافون تلقائياً عند التسجيل
-- ============================================================

-- ============================================================
-- Notes:
-- - الـ Trigger يعمل تلقائياً عند إنشاء مستخدم جديد في Auth
-- - الدور الافتراضي: viewer (يمكن تغييره لاحقاً من User Management)
-- - المستخدمين الحاليين في Auth تمت إضافتهم في users
-- ============================================================

