-- ============================================================
-- Add Permissions Columns to Users Table
-- إضافة أعمدة الصلاحيات لجدول المستخدمين
-- ============================================================

-- 1. إضافة عمود permissions (JSONB لتخزين الصلاحيات المخصصة)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb;

-- 2. إضافة عمود custom_permissions_enabled (للتحكم في استخدام الصلاحيات المخصصة)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS custom_permissions_enabled BOOLEAN DEFAULT FALSE;

-- 3. إضافة عمود is_active (لتفعيل/تعطيل المستخدم)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 4. إضافة عمود last_login (آخر تسجيل دخول)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

-- 5. إنشاء فهارس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_users_is_active ON public.users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_custom_permissions ON public.users(custom_permissions_enabled);

-- 6. إضافة تعليقات للأعمدة
COMMENT ON COLUMN public.users.permissions IS 'صلاحيات مخصصة للمستخدم (JSONB array)';
COMMENT ON COLUMN public.users.custom_permissions_enabled IS 'هل يستخدم المستخدم صلاحيات مخصصة بدلاً من صلاحيات الدور الافتراضية';
COMMENT ON COLUMN public.users.is_active IS 'هل المستخدم نشط ويمكنه تسجيل الدخول';
COMMENT ON COLUMN public.users.last_login IS 'تاريخ ووقت آخر تسجيل دخول';

-- 7. تحديث المستخدمين الموجودين
-- جعل جميع المستخدمين الحاليين نشطين
UPDATE public.users 
SET is_active = TRUE 
WHERE is_active IS NULL;

-- تعيين الصلاحيات الافتراضية للمستخدمين الحاليين بناءً على الدور
UPDATE public.users 
SET permissions = '[]'::jsonb,
    custom_permissions_enabled = FALSE
WHERE permissions IS NULL;

-- 8. دالة لتحديث last_login تلقائياً
CREATE OR REPLACE FUNCTION update_last_login()
RETURNS TRIGGER AS $$
BEGIN
  -- تحديث last_login عند تسجيل دخول جديد
  NEW.last_login = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. دالة للتحقق من صلاحية معينة
CREATE OR REPLACE FUNCTION user_has_permission(
  user_id UUID,
  permission_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  user_record RECORD;
  user_permissions JSONB;
  has_perm BOOLEAN;
BEGIN
  -- الحصول على بيانات المستخدم
  SELECT * INTO user_record FROM public.users WHERE id = user_id;
  
  -- إذا كان admin، لديه جميع الصلاحيات
  IF user_record.role = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  -- إذا كان يستخدم صلاحيات مخصصة
  IF user_record.custom_permissions_enabled AND user_record.permissions IS NOT NULL THEN
    user_permissions = user_record.permissions;
  ELSE
    -- استخدام الصلاحيات الافتراضية للدور
    CASE user_record.role
      WHEN 'manager' THEN
        -- صلاحيات Manager الافتراضية
        user_permissions = '[
          "projects.view", "projects.create", "projects.edit", "projects.delete", "projects.export",
          "boq.view", "boq.create", "boq.edit", "boq.delete", "boq.approve", "boq.export",
          "kpi.view", "kpi.create", "kpi.edit", "kpi.delete", "kpi.export",
          "reports.view", "reports.daily", "reports.weekly", "reports.monthly", "reports.financial", "reports.export", "reports.print",
          "settings.view", "system.export"
        ]'::jsonb;
      WHEN 'engineer' THEN
        -- صلاحيات Engineer الافتراضية
        user_permissions = '[
          "projects.view", "projects.export",
          "boq.view", "boq.create", "boq.edit", "boq.export",
          "kpi.view", "kpi.create", "kpi.edit", "kpi.export",
          "reports.view", "reports.daily", "reports.weekly", "reports.monthly", "reports.export", "reports.print",
          "settings.view"
        ]'::jsonb;
      WHEN 'viewer' THEN
        -- صلاحيات Viewer الافتراضية
        user_permissions = '[
          "projects.view", "boq.view", "kpi.view",
          "reports.view", "reports.daily", "reports.weekly", "reports.monthly",
          "settings.view"
        ]'::jsonb;
      ELSE
        user_permissions = '[]'::jsonb;
    END CASE;
  END IF;
  
  -- التحقق من وجود الصلاحية
  SELECT EXISTS (
    SELECT 1 FROM jsonb_array_elements_text(user_permissions) AS perm
    WHERE perm = permission_id
  ) INTO has_perm;
  
  RETURN has_perm;
END;
$$ LANGUAGE plpgsql;

-- 10. دالة للحصول على عدد الصلاحيات لمستخدم
CREATE OR REPLACE FUNCTION get_user_permissions_count(user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  user_record RECORD;
  perms_count INTEGER;
BEGIN
  SELECT * INTO user_record FROM public.users WHERE id = user_id;
  
  -- Admin لديه جميع الصلاحيات (39 صلاحية)
  IF user_record.role = 'admin' THEN
    RETURN 39;
  END IF;
  
  -- إذا كان يستخدم صلاحيات مخصصة
  IF user_record.custom_permissions_enabled AND user_record.permissions IS NOT NULL THEN
    SELECT jsonb_array_length(user_record.permissions) INTO perms_count;
    RETURN perms_count;
  END IF;
  
  -- صلاحيات الدور الافتراضية
  CASE user_record.role
    WHEN 'manager' THEN RETURN 24;
    WHEN 'engineer' THEN RETURN 16;
    WHEN 'viewer' THEN RETURN 9;
    ELSE RETURN 0;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- 11. رسالة تأكيد
SELECT 'Permissions columns added successfully!' as message,
       'Total users updated: ' || COUNT(*) as users_count
FROM public.users;

-- 12. عرض الأعمدة الجديدة
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('permissions', 'custom_permissions_enabled', 'is_active', 'last_login')
ORDER BY ordinal_position;

