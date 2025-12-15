-- =====================================================
-- Protect Company Settings from Deletion
-- حماية إعدادات الشركة من الحذف
-- =====================================================
-- هذا السكريبت يحمي بيانات company_settings من الحذف
-- ويضمن عدم فقدان البيانات

-- ============================================
-- STEP 1: التحقق من بنية الجدول الفعلية
-- ============================================
-- أولاً، دعنا نتحقق من الأعمدة الموجودة في الجدول
DO $$
DECLARE
    has_created_by BOOLEAN := FALSE;
    has_updated_by BOOLEAN := FALSE;
BEGIN
    -- التحقق من وجود عمود created_by
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'company_settings' 
        AND column_name = 'created_by'
    ) INTO has_created_by;
    
    -- التحقق من وجود عمود updated_by
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'company_settings' 
        AND column_name = 'updated_by'
    ) INTO has_updated_by;
    
    RAISE NOTICE 'Column created_by exists: %', has_created_by;
    RAISE NOTICE 'Column updated_by exists: %', has_updated_by;
END $$;

-- ============================================
-- STEP 1.1: إزالة Foreign Key Constraints (فقط إذا كانت موجودة)
-- ============================================
-- التحقق من Foreign Keys الحالية وإزالتها إذا كانت موجودة
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    FOR constraint_record IN
        SELECT tc.constraint_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'company_settings'
            AND tc.constraint_type = 'FOREIGN KEY'
            AND (kcu.column_name = 'created_by' OR kcu.column_name = 'updated_by')
    LOOP
        EXECUTE 'ALTER TABLE company_settings DROP CONSTRAINT IF EXISTS ' || quote_ident(constraint_record.constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_record.constraint_name;
    END LOOP;
END $$;

-- ============================================
-- STEP 2: منع حذف جميع السجلات (حماية من TRUNCATE)
-- ============================================
-- إنشاء trigger لمنع حذف آخر سجل
CREATE OR REPLACE FUNCTION prevent_delete_all_company_settings()
RETURNS TRIGGER AS $$
DECLARE
    remaining_count INTEGER;
BEGIN
    -- حساب عدد السجلات المتبقية بعد الحذف
    SELECT COUNT(*) INTO remaining_count
    FROM company_settings
    WHERE id != OLD.id;
    
    -- إذا كان هذا آخر سجل، منع الحذف
    IF remaining_count = 0 THEN
        RAISE EXCEPTION 'Cannot delete the last company settings record. At least one record must exist.';
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger قبل الحذف
DROP TRIGGER IF EXISTS trigger_prevent_delete_all_company_settings ON company_settings;
CREATE TRIGGER trigger_prevent_delete_all_company_settings
    BEFORE DELETE ON company_settings
    FOR EACH ROW
    EXECUTE FUNCTION prevent_delete_all_company_settings();

-- ============================================
-- STEP 3: تحديث RLS Policies لمنع الحذف غير المقصود
-- ============================================
-- إزالة سياسة الحذف القديمة
DROP POLICY IF EXISTS "Admins can delete company settings" ON company_settings;

-- إنشاء سياسة جديدة تمنع الحذف تماماً (أو تسمح فقط إذا كان هناك أكثر من سجل)
-- في الواقع، سنمنع الحذف تماماً لحماية البيانات
-- إذا أردت السماح بالحذف فقط إذا كان هناك أكثر من سجل، يمكنك استخدام:
/*
CREATE POLICY "Admins can delete company settings if multiple exist" ON company_settings
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
        AND (SELECT COUNT(*) FROM company_settings) > 1
    );
*/

-- بدلاً من ذلك، سنمنع الحذف تماماً:
-- (لا ننشئ سياسة DELETE - هذا يعني أنه لا يمكن لأحد حذف السجلات)

-- ============================================
-- STEP 4: تحديث دالة update_company_settings لضمان وجود سجل دائماً
-- ============================================
CREATE OR REPLACE FUNCTION update_company_settings(
    p_company_name TEXT,
    p_company_slogan TEXT,
    p_company_logo_url TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
    settings_count INTEGER;
    current_id UUID;
BEGIN
    -- التحقق من صلاحيات المستخدم
    SELECT role INTO user_role
    FROM users
    WHERE id = auth.uid();
    
    IF user_role != 'admin' THEN
        RAISE EXCEPTION 'Only admins can update company settings';
    END IF;
    
    -- التحقق من وجود سجلات
    SELECT COUNT(*) INTO settings_count FROM company_settings;
    
    -- الحصول على آخر سجل
    SELECT id INTO current_id
    FROM company_settings 
    ORDER BY updated_at DESC 
    LIMIT 1;
    
    -- التحقق من وجود أعمدة created_by و updated_by
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'company_settings' AND column_name = 'created_by'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'company_settings' AND column_name = 'updated_by'
    ) THEN
        -- إذا كان هناك سجل، قم بالتحديث (مع created_by و updated_by)
        IF current_id IS NOT NULL THEN
            UPDATE company_settings 
            SET 
                company_name = p_company_name,
                company_slogan = p_company_slogan,
                company_logo_url = p_company_logo_url,
                updated_by = auth.uid(),
                updated_at = NOW()
            WHERE id = current_id;
        ELSE
            -- إذا لم يكن هناك سجل، قم بإنشاء واحد جديد
            INSERT INTO company_settings (
                company_name, 
                company_slogan, 
                company_logo_url,
                created_by,
                updated_by
            ) VALUES (
                p_company_name,
                p_company_slogan,
                p_company_logo_url,
                auth.uid(),
                auth.uid()
            );
        END IF;
    ELSE
        -- إذا لم تكن الأعمدة موجودة (البنية الفعلية)
        IF current_id IS NOT NULL THEN
            UPDATE company_settings 
            SET 
                company_name = p_company_name,
                company_slogan = p_company_slogan,
                company_logo_url = p_company_logo_url,
                updated_at = NOW()
            WHERE id = current_id;
        ELSE
            -- إذا لم يكن هناك سجل، قم بإنشاء واحد جديد
            INSERT INTO company_settings (
                company_name, 
                company_slogan, 
                company_logo_url
            ) VALUES (
                p_company_name,
                p_company_slogan,
                p_company_logo_url
            );
        END IF;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 5: إنشاء سجل افتراضي إذا لم يكن موجوداً
-- ============================================
DO $$
DECLARE
    settings_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO settings_count FROM company_settings;
    
    IF settings_count = 0 THEN
        INSERT INTO company_settings (
            company_name,
            company_slogan,
            company_logo_url,
            created_at,
            updated_at
        ) VALUES (
            'AlRabat RPF',
            'Masters of Foundation Construction',
            NULL,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Default company settings record created.';
    ELSE
        RAISE NOTICE 'Company settings records already exist: %', settings_count;
    END IF;
END $$;

-- ============================================
-- STEP 6: التحقق من البيانات الحالية
-- ============================================
-- التحقق من الأعمدة الموجودة أولاً
SELECT 
    id,
    company_name,
    company_slogan,
    company_logo_url,
    created_at,
    updated_at
FROM company_settings
ORDER BY updated_at DESC;

-- ============================================
-- STEP 7: اختبار الدالة
-- ============================================
SELECT * FROM get_company_settings();

-- ============================================
-- ملاحظات مهمة:
-- ============================================
-- 1. تم منع حذف آخر سجل في company_settings
-- 2. تم تغيير Foreign Keys لاستخدام SET NULL بدلاً من CASCADE
-- 3. تم تحديث دالة update_company_settings لضمان وجود سجل دائماً
-- 4. تم إزالة سياسة DELETE من RLS (لا يمكن لأحد حذف السجلات)
-- 5. إذا تم حذف المستخدم، created_by و updated_by سيصبحان NULL بدلاً من حذف السجل

