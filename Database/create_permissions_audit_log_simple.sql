/**
 * نسخة مبسطة من Audit Log (للاختبار السريع)
 * Simplified version of Audit Log (for quick testing)
 * 
 * استخدم هذه النسخة إذا واجهت مشاكل مع النسخة الكاملة
 */

-- ====================================================================
-- 1. إنشاء جدول Audit Log المبسط
-- ====================================================================

CREATE TABLE IF NOT EXISTS permissions_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- معلومات المستخدم المستهدف
  target_user_id UUID NOT NULL,
  target_user_email TEXT NOT NULL,
  
  -- معلومات المستخدم الذي أجرى التغيير
  changed_by_id UUID,
  changed_by_email TEXT,
  
  -- نوع التغيير
  change_type TEXT NOT NULL,
  
  -- البيانات القديمة والجديدة
  old_permissions TEXT[],
  new_permissions TEXT[],
  old_role TEXT,
  new_role TEXT,
  
  -- التوقيت
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- 2. إنشاء Indexes
-- ====================================================================

CREATE INDEX IF NOT EXISTS idx_audit_target_user 
ON permissions_audit_log(target_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_created_at 
ON permissions_audit_log(created_at DESC);

-- ====================================================================
-- 3. تفعيل RLS
-- ====================================================================

ALTER TABLE permissions_audit_log ENABLE ROW LEVEL SECURITY;

-- فقط Admin يمكنه القراءة
CREATE POLICY "Only admins can view audit log" ON permissions_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- ====================================================================
-- 4. دالة مبسطة للتسجيل
-- ====================================================================

CREATE OR REPLACE FUNCTION log_permission_change_simple()
RETURNS TRIGGER AS $$
DECLARE
  change_type_val TEXT;
  changed_by_id_val UUID;
  changed_by_email_val TEXT;
BEGIN
  -- تحديد من أجرى التغيير
  changed_by_id_val := auth.uid();
  SELECT email INTO changed_by_email_val FROM users WHERE id = auth.uid();
  
  -- إذا لم يتم العثور على email، استخدم قيمة افتراضية
  IF changed_by_email_val IS NULL THEN
    changed_by_email_val := 'system';
  END IF;
  
  -- تحديد نوع التغيير
  IF TG_OP = 'INSERT' THEN
    change_type_val := 'user_created';
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.role IS DISTINCT FROM NEW.role THEN
      change_type_val := 'role_changed';
    ELSIF OLD.permissions IS DISTINCT FROM NEW.permissions THEN
      change_type_val := 'permissions_updated';
    ELSIF OLD.is_active IS DISTINCT FROM NEW.is_active THEN
      change_type_val := CASE WHEN NEW.is_active THEN 'user_activated' ELSE 'user_deactivated' END;
    ELSE
      -- لا يوجد تغيير مهم
      RETURN NEW;
    END IF;
  ELSE
    RETURN NEW;
  END IF;
  
  -- إدراج سجل في Audit Log
  BEGIN
    INSERT INTO permissions_audit_log (
      target_user_id,
      target_user_email,
      changed_by_id,
      changed_by_email,
      change_type,
      old_permissions,
      new_permissions,
      old_role,
      new_role
    ) VALUES (
      NEW.id,
      NEW.email,
      changed_by_id_val,
      changed_by_email_val,
      change_type_val,
      CASE WHEN TG_OP = 'UPDATE' THEN OLD.permissions ELSE NULL END,
      NEW.permissions,
      CASE WHEN TG_OP = 'UPDATE' THEN OLD.role ELSE NULL END,
      NEW.role
    );
  EXCEPTION WHEN OTHERS THEN
    -- إذا فشل التسجيل، لا تفشل العملية الأصلية
    RAISE WARNING 'Failed to log permission change: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- 5. إنشاء Trigger
-- ====================================================================

DROP TRIGGER IF EXISTS users_audit_trigger_simple ON users;

CREATE TRIGGER users_audit_trigger_simple
  AFTER INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION log_permission_change_simple();

-- ====================================================================
-- 6. View مبسط
-- ====================================================================

CREATE OR REPLACE VIEW recent_permission_changes_simple AS
SELECT 
  id,
  target_user_email,
  changed_by_email,
  change_type,
  array_length(old_permissions, 1) as old_count,
  array_length(new_permissions, 1) as new_count,
  old_role,
  new_role,
  created_at
FROM permissions_audit_log
ORDER BY created_at DESC
LIMIT 50;

-- ====================================================================
-- 7. التحقق من النجاح
-- ====================================================================

-- عرض معلومات الجدول
SELECT 
  column_name, 
  data_type
FROM information_schema.columns
WHERE table_name = 'permissions_audit_log'
ORDER BY ordinal_position;

-- ====================================================================
-- ملاحظات
-- ====================================================================

-- 1. هذه نسخة مبسطة للاختبار السريع
-- 2. يمكنك استخدام النسخة الكاملة بعد التأكد من عمل هذه النسخة
-- 3. التسجيل يتم تلقائياً عند أي تغيير
-- 4. إذا فشل التسجيل، لن تفشل العملية الأصلية

-- ====================================================================
-- اختبار
-- ====================================================================

-- عرض آخر التغييرات
-- SELECT * FROM recent_permission_changes_simple;

-- عرض جميع السجلات
-- SELECT * FROM permissions_audit_log ORDER BY created_at DESC LIMIT 10;

COMMIT;
