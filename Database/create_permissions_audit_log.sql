/**
 * إنشاء نظام Audit Log للصلاحيات
 * Create Permissions Audit Log System
 * 
 * الهدف: تسجيل جميع التغييرات على صلاحيات المستخدمين لأغراض الأمان والمراجعة
 */

-- ====================================================================
-- 1. إنشاء جدول Audit Log
-- ====================================================================

CREATE TABLE IF NOT EXISTS permissions_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- معلومات المستخدم المستهدف
  target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_user_email TEXT NOT NULL,
  target_user_name TEXT,
  
  -- معلومات المستخدم الذي أجرى التغيير
  changed_by_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  changed_by_email TEXT NOT NULL,
  changed_by_name TEXT,
  
  -- نوع التغيير
  change_type TEXT NOT NULL CHECK (change_type IN (
    'permissions_updated',    -- تحديث الصلاحيات
    'role_changed',          -- تغيير الدور
    'mode_toggled',          -- تفعيل/تعطيل الصلاحيات المخصصة
    'user_created',          -- إنشاء مستخدم جديد
    'user_activated',        -- تفعيل مستخدم
    'user_deactivated'       -- تعطيل مستخدم
  )),
  
  -- البيانات القديمة
  old_permissions TEXT[],
  old_role TEXT,
  old_custom_permissions_enabled BOOLEAN,
  old_is_active BOOLEAN,
  
  -- البيانات الجديدة
  new_permissions TEXT[],
  new_role TEXT,
  new_custom_permissions_enabled BOOLEAN,
  new_is_active BOOLEAN,
  
  -- معلومات إضافية
  changes_summary JSONB,  -- ملخص التغييرات بصيغة JSON
  reason TEXT,            -- سبب التغيير (اختياري)
  
  -- معلومات الجلسة
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  
  -- التوقيت
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- فهرسة
  CONSTRAINT valid_user_ids CHECK (target_user_id != changed_by_id OR change_type = 'user_created')
);

-- ====================================================================
-- 2. إنشاء Indexes لتحسين الأداء
-- ====================================================================

-- فهرس للبحث السريع بالمستخدم المستهدف
CREATE INDEX IF NOT EXISTS idx_audit_target_user 
ON permissions_audit_log(target_user_id, created_at DESC);

-- فهرس للبحث بالمستخدم الذي أجرى التغيير
CREATE INDEX IF NOT EXISTS idx_audit_changed_by 
ON permissions_audit_log(changed_by_id, created_at DESC);

-- فهرس لنوع التغيير
CREATE INDEX IF NOT EXISTS idx_audit_change_type 
ON permissions_audit_log(change_type, created_at DESC);

-- فهرس للتاريخ
CREATE INDEX IF NOT EXISTS idx_audit_created_at 
ON permissions_audit_log(created_at DESC);

-- فهرس مركب للاستعلامات الشائعة
CREATE INDEX IF NOT EXISTS idx_audit_user_type_date 
ON permissions_audit_log(target_user_id, change_type, created_at DESC);

-- ====================================================================
-- 3. تفعيل Row Level Security
-- ====================================================================

ALTER TABLE permissions_audit_log ENABLE ROW LEVEL SECURITY;

-- فقط Admin والمستخدمين الذين لديهم صلاحية system.audit يمكنهم عرض Audit Log
CREATE POLICY "Only admins and auditors can view audit log" ON permissions_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND (
        role = 'admin' 
        OR 'system.audit' = ANY(permissions)
      )
    )
  );

-- لا يمكن تعديل أو حذف سجلات Audit Log (للحماية)
CREATE POLICY "Audit log is immutable" ON permissions_audit_log
  FOR UPDATE USING (false);

CREATE POLICY "Audit log cannot be deleted" ON permissions_audit_log
  FOR DELETE USING (false);

-- يمكن إضافة سجلات جديدة فقط من خلال Trigger أو Admin
CREATE POLICY "Only system can insert audit log" ON permissions_audit_log
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- ====================================================================
-- 4. دالة لحساب ملخص التغييرات
-- ====================================================================

CREATE OR REPLACE FUNCTION calculate_permission_changes(
  old_perms TEXT[],
  new_perms TEXT[]
)
RETURNS JSONB AS $$
DECLARE
  added TEXT[];
  removed TEXT[];
  unchanged INTEGER;
BEGIN
  -- الصلاحيات المضافة
  added := ARRAY(
    SELECT unnest(new_perms)
    EXCEPT
    SELECT unnest(old_perms)
  );
  
  -- الصلاحيات المحذوفة
  removed := ARRAY(
    SELECT unnest(old_perms)
    EXCEPT
    SELECT unnest(new_perms)
  );
  
  -- الصلاحيات غير المتغيرة
  unchanged := (
    SELECT COUNT(*)
    FROM unnest(old_perms) AS perm
    WHERE perm = ANY(new_perms)
  );
  
  RETURN jsonb_build_object(
    'added', added,
    'removed', removed,
    'added_count', array_length(added, 1),
    'removed_count', array_length(removed, 1),
    'unchanged_count', unchanged,
    'total_old', array_length(old_perms, 1),
    'total_new', array_length(new_perms, 1)
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ====================================================================
-- 5. دالة لتسجيل تغيير الصلاحيات
-- ====================================================================

CREATE OR REPLACE FUNCTION log_permission_change()
RETURNS TRIGGER AS $$
DECLARE
  change_type_val TEXT;
  changed_by_user RECORD;
  changes_summary_val JSONB;
BEGIN
  -- جلب معلومات المستخدم الذي أجرى التغيير
  SELECT id, email, full_name 
  INTO changed_by_user
  FROM users 
  WHERE id = auth.uid();
  
  -- إذا لم يتم العثور على المستخدم الذي أجرى التغيير، استخدم معلومات افتراضية
  IF changed_by_user.id IS NULL THEN
    changed_by_user.id := auth.uid();
    changed_by_user.email := 'system';
    changed_by_user.full_name := 'System';
  END IF;
  
  -- تحديد نوع التغيير
  IF TG_OP = 'INSERT' THEN
    change_type_val := 'user_created';
  ELSIF OLD.role IS DISTINCT FROM NEW.role THEN
    change_type_val := 'role_changed';
  ELSIF OLD.custom_permissions_enabled IS DISTINCT FROM NEW.custom_permissions_enabled THEN
    change_type_val := 'mode_toggled';
  ELSIF OLD.is_active IS DISTINCT FROM NEW.is_active THEN
    IF NEW.is_active THEN
      change_type_val := 'user_activated';
    ELSE
      change_type_val := 'user_deactivated';
    END IF;
  ELSIF OLD.permissions IS DISTINCT FROM NEW.permissions THEN
    change_type_val := 'permissions_updated';
  ELSE
    -- لا يوجد تغيير جوهري، لا حاجة للتسجيل
    RETURN NEW;
  END IF;
  
  -- حساب ملخص التغييرات للصلاحيات
  IF TG_OP = 'UPDATE' AND OLD.permissions IS DISTINCT FROM NEW.permissions THEN
    changes_summary_val := calculate_permission_changes(
      COALESCE(OLD.permissions, ARRAY[]::TEXT[]),
      COALESCE(NEW.permissions, ARRAY[]::TEXT[])
    );
  ELSIF TG_OP = 'INSERT' AND NEW.permissions IS NOT NULL THEN
    changes_summary_val := calculate_permission_changes(
      ARRAY[]::TEXT[],
      COALESCE(NEW.permissions, ARRAY[]::TEXT[])
    );
  END IF;
  
  -- إدراج سجل في Audit Log
  INSERT INTO permissions_audit_log (
    target_user_id,
    target_user_email,
    target_user_name,
    changed_by_id,
    changed_by_email,
    changed_by_name,
    change_type,
    old_permissions,
    old_role,
    old_custom_permissions_enabled,
    old_is_active,
    new_permissions,
    new_role,
    new_custom_permissions_enabled,
    new_is_active,
    changes_summary,
    ip_address,
    user_agent
  ) VALUES (
    NEW.id,
    NEW.email,
    NEW.full_name,
    changed_by_user.id,
    changed_by_user.email,
    changed_by_user.full_name,
    change_type_val,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.permissions END,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.role END,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.custom_permissions_enabled END,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.is_active END,
    NEW.permissions,
    NEW.role,
    NEW.custom_permissions_enabled,
    NEW.is_active,
    changes_summary_val,
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- 6. إنشاء Trigger على جدول users
-- ====================================================================

DROP TRIGGER IF EXISTS users_audit_trigger ON users;

CREATE TRIGGER users_audit_trigger
  AFTER INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION log_permission_change();

-- ====================================================================
-- 7. Views مفيدة للاستعلامات
-- ====================================================================

-- View لعرض آخر التغييرات
CREATE OR REPLACE VIEW recent_permission_changes AS
SELECT 
  a.id,
  a.target_user_email,
  a.target_user_name,
  a.changed_by_email,
  a.changed_by_name,
  a.change_type,
  a.changes_summary,
  a.created_at,
  -- حساب عدد الصلاحيات المضافة والمحذوفة
  COALESCE((a.changes_summary->>'added_count')::INTEGER, 0) as added_count,
  COALESCE((a.changes_summary->>'removed_count')::INTEGER, 0) as removed_count
FROM permissions_audit_log a
ORDER BY a.created_at DESC
LIMIT 100;

-- View لإحصائيات التغييرات
CREATE OR REPLACE VIEW permission_changes_stats AS
SELECT 
  change_type,
  COUNT(*) as total_changes,
  COUNT(DISTINCT target_user_id) as affected_users,
  COUNT(DISTINCT changed_by_id) as users_who_changed,
  MIN(created_at) as first_change,
  MAX(created_at) as last_change
FROM permissions_audit_log
GROUP BY change_type;

-- View لنشاط المستخدمين
CREATE OR REPLACE VIEW user_permission_activity AS
SELECT 
  u.id,
  u.email,
  u.full_name,
  u.role,
  COUNT(DISTINCT a.id) as total_changes,
  MAX(a.created_at) as last_change,
  array_agg(DISTINCT a.change_type) as change_types
FROM users u
LEFT JOIN permissions_audit_log a ON u.id = a.target_user_id
GROUP BY u.id, u.email, u.full_name, u.role;

-- ====================================================================
-- 8. دوال مساعدة للاستعلام
-- ====================================================================

-- دالة للحصول على سجل التغييرات لمستخدم معين
CREATE OR REPLACE FUNCTION get_user_audit_history(user_id_param UUID, limit_param INTEGER DEFAULT 50)
RETURNS TABLE (
  id UUID,
  change_type TEXT,
  changed_by_email TEXT,
  old_role TEXT,
  new_role TEXT,
  permissions_added TEXT[],
  permissions_removed TEXT[],
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.change_type,
    a.changed_by_email,
    a.old_role,
    a.new_role,
    COALESCE(
      (a.changes_summary->'added')::TEXT[]::TEXT[],
      ARRAY[]::TEXT[]
    ) as permissions_added,
    COALESCE(
      (a.changes_summary->'removed')::TEXT[]::TEXT[],
      ARRAY[]::TEXT[]
    ) as permissions_removed,
    a.created_at
  FROM permissions_audit_log a
  WHERE a.target_user_id = user_id_param
  ORDER BY a.created_at DESC
  LIMIT limit_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- 9. التحقق من النجاح
-- ====================================================================

-- عرض معلومات الجدول
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'permissions_audit_log'
ORDER BY ordinal_position;

-- عرض Indexes
SELECT 
  indexname, 
  indexdef
FROM pg_indexes
WHERE tablename = 'permissions_audit_log';

-- عرض Triggers
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'users_audit_trigger';

-- ====================================================================
-- 10. أمثلة على الاستخدام
-- ====================================================================

-- عرض آخر 10 تغييرات
-- SELECT * FROM recent_permission_changes LIMIT 10;

-- عرض إحصائيات التغييرات
-- SELECT * FROM permission_changes_stats;

-- عرض سجل تغييرات لمستخدم معين
-- SELECT * FROM get_user_audit_history('USER_ID_HERE', 20);

-- البحث عن تغييرات معينة
-- SELECT * FROM permissions_audit_log 
-- WHERE change_type = 'permissions_updated' 
-- AND created_at > NOW() - INTERVAL '7 days';

-- ====================================================================
-- ملاحظات مهمة
-- ====================================================================

-- 1. Audit Log محمي من التعديل والحذف
-- 2. فقط Admin والمستخدمين الذين لديهم system.audit يمكنهم القراءة
-- 3. التسجيل تلقائي عند أي تغيير في الصلاحيات
-- 4. يتم حفظ IP address و User agent تلقائياً
-- 5. يتم حساب ملخص التغييرات تلقائياً

COMMIT;
