-- =====================================================
-- Protect Company Settings from Deletion (Simplified)
-- حماية إعدادات الشركة من الحذف (مبسط)
-- =====================================================
-- هذا السكريبت يحمي بيانات company_settings من الحذف
-- ويعمل مع البنية الفعلية للجدول (بدون created_by/updated_by)

-- ============================================
-- STEP 1: منع حذف جميع السجلات (حماية من TRUNCATE)
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
-- STEP 2: تحديث RLS Policies لمنع الحذف غير المقصود
-- ============================================
-- إزالة سياسة الحذف القديمة
DROP POLICY IF EXISTS "Admins can delete company settings" ON company_settings;

-- لا ننشئ سياسة DELETE جديدة - هذا يعني أنه لا يمكن لأحد حذف السجلات من خلال RLS

-- ============================================
-- STEP 3: تحديث دالة update_company_settings لضمان وجود سجل دائماً
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
    has_created_by BOOLEAN;
    has_updated_by BOOLEAN;
    has_company_logo_url BOOLEAN;
    has_logo_url BOOLEAN;
    logo_column_name TEXT;
BEGIN
    -- التحقق من صلاحيات المستخدم
    SELECT role INTO user_role
    FROM users
    WHERE id = auth.uid();
    
    IF user_role != 'admin' THEN
        RAISE EXCEPTION 'Only admins can update company settings';
    END IF;
    
    -- التحقق من وجود الأعمدة
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'company_settings' AND column_name = 'created_by'
    ) INTO has_created_by;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'company_settings' AND column_name = 'updated_by'
    ) INTO has_updated_by;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'company_settings' AND column_name = 'company_logo_url'
    ) INTO has_company_logo_url;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'company_settings' AND column_name = 'logo_url'
    ) INTO has_logo_url;
    
    -- تحديد اسم عمود اللوجو
    IF has_company_logo_url THEN
        logo_column_name := 'company_logo_url';
    ELSIF has_logo_url THEN
        logo_column_name := 'logo_url';
    ELSE
        logo_column_name := NULL;
    END IF;
    
    -- التحقق من وجود سجلات
    SELECT COUNT(*) INTO settings_count FROM company_settings;
    
    -- الحصول على آخر سجل
    SELECT id INTO current_id
    FROM company_settings 
    ORDER BY updated_at DESC 
    LIMIT 1;
    
    -- إذا كان هناك سجل، قم بالتحديث
    IF current_id IS NOT NULL THEN
        IF has_created_by AND has_updated_by THEN
            -- البنية مع created_by و updated_by
            IF logo_column_name = 'company_logo_url' THEN
                UPDATE company_settings 
                SET 
                    company_name = p_company_name,
                    company_slogan = p_company_slogan,
                    company_logo_url = COALESCE(p_company_logo_url, company_logo_url),
                    updated_by = auth.uid(),
                    updated_at = NOW()
                WHERE id = current_id;
            ELSIF logo_column_name = 'logo_url' THEN
                UPDATE company_settings 
                SET 
                    company_name = p_company_name,
                    company_slogan = p_company_slogan,
                    logo_url = COALESCE(p_company_logo_url, logo_url),
                    updated_by = auth.uid(),
                    updated_at = NOW()
                WHERE id = current_id;
            ELSE
                UPDATE company_settings 
                SET 
                    company_name = p_company_name,
                    company_slogan = p_company_slogan,
                    updated_by = auth.uid(),
                    updated_at = NOW()
                WHERE id = current_id;
            END IF;
        ELSE
            -- البنية بدون created_by و updated_by (البنية الفعلية)
            IF logo_column_name = 'company_logo_url' THEN
                UPDATE company_settings 
                SET 
                    company_name = p_company_name,
                    company_slogan = p_company_slogan,
                    company_logo_url = COALESCE(p_company_logo_url, company_logo_url),
                    updated_at = NOW()
                WHERE id = current_id;
            ELSIF logo_column_name = 'logo_url' THEN
                UPDATE company_settings 
                SET 
                    company_name = p_company_name,
                    company_slogan = p_company_slogan,
                    logo_url = COALESCE(p_company_logo_url, logo_url),
                    updated_at = NOW()
                WHERE id = current_id;
            ELSE
                UPDATE company_settings 
                SET 
                    company_name = p_company_name,
                    company_slogan = p_company_slogan,
                    updated_at = NOW()
                WHERE id = current_id;
            END IF;
        END IF;
    ELSE
        -- إذا لم يكن هناك سجل، قم بإنشاء واحد جديد
        IF has_created_by AND has_updated_by THEN
            IF logo_column_name = 'company_logo_url' THEN
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
            ELSIF logo_column_name = 'logo_url' THEN
                INSERT INTO company_settings (
                    company_name, 
                    company_slogan, 
                    logo_url,
                    created_by,
                    updated_by
                ) VALUES (
                    p_company_name,
                    p_company_slogan,
                    p_company_logo_url,
                    auth.uid(),
                    auth.uid()
                );
            ELSE
                INSERT INTO company_settings (
                    company_name, 
                    company_slogan,
                    created_by,
                    updated_by
                ) VALUES (
                    p_company_name,
                    p_company_slogan,
                    auth.uid(),
                    auth.uid()
                );
            END IF;
        ELSE
            IF logo_column_name = 'company_logo_url' THEN
                INSERT INTO company_settings (
                    company_name, 
                    company_slogan, 
                    company_logo_url
                ) VALUES (
                    p_company_name,
                    p_company_slogan,
                    p_company_logo_url
                );
            ELSIF logo_column_name = 'logo_url' THEN
                INSERT INTO company_settings (
                    company_name, 
                    company_slogan, 
                    logo_url
                ) VALUES (
                    p_company_name,
                    p_company_slogan,
                    p_company_logo_url
                );
            ELSE
                INSERT INTO company_settings (
                    company_name, 
                    company_slogan
                ) VALUES (
                    p_company_name,
                    p_company_slogan
                );
            END IF;
        END IF;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 4: تحديث دالة get_company_settings لتعمل مع البنية الفعلية
-- ============================================
CREATE OR REPLACE FUNCTION get_company_settings()
RETURNS TABLE (
    company_name TEXT,
    company_slogan TEXT,
    company_logo_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    has_company_logo_url BOOLEAN;
    has_logo_url BOOLEAN;
BEGIN
    -- التحقق من وجود الأعمدة
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'company_settings' AND column_name = 'company_logo_url'
    ) INTO has_company_logo_url;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'company_settings' AND column_name = 'logo_url'
    ) INTO has_logo_url;
    
    -- إرجاع البيانات حسب الأعمدة الموجودة
    IF has_company_logo_url THEN
        RETURN QUERY
        SELECT 
            cs.company_name,
            cs.company_slogan,
            cs.company_logo_url,
            cs.updated_at
        FROM company_settings cs
        ORDER BY cs.updated_at DESC
        LIMIT 1;
    ELSIF has_logo_url THEN
        RETURN QUERY
        SELECT 
            cs.company_name,
            cs.company_slogan,
            cs.logo_url as company_logo_url,
            cs.updated_at
        FROM company_settings cs
        ORDER BY cs.updated_at DESC
        LIMIT 1;
    ELSE
        RETURN QUERY
        SELECT 
            cs.company_name,
            cs.company_slogan,
            NULL::TEXT as company_logo_url,
            cs.updated_at
        FROM company_settings cs
        ORDER BY cs.updated_at DESC
        LIMIT 1;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 5: إنشاء سجل افتراضي إذا لم يكن موجوداً
-- ============================================
DO $$
DECLARE
    settings_count INTEGER;
    has_created_by BOOLEAN;
    has_updated_by BOOLEAN;
    has_company_logo_url BOOLEAN;
    has_logo_url BOOLEAN;
    logo_column_name TEXT;
BEGIN
    -- التحقق من وجود أعمدة
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'company_settings' AND column_name = 'created_by'
    ) INTO has_created_by;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'company_settings' AND column_name = 'updated_by'
    ) INTO has_updated_by;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'company_settings' AND column_name = 'company_logo_url'
    ) INTO has_company_logo_url;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'company_settings' AND column_name = 'logo_url'
    ) INTO has_logo_url;
    
    -- تحديد اسم عمود اللوجو
    IF has_company_logo_url THEN
        logo_column_name := 'company_logo_url';
    ELSIF has_logo_url THEN
        logo_column_name := 'logo_url';
    ELSE
        logo_column_name := NULL;
    END IF;
    
    SELECT COUNT(*) INTO settings_count FROM company_settings;
    
    IF settings_count = 0 THEN
        IF has_created_by AND has_updated_by THEN
            IF logo_column_name = 'company_logo_url' THEN
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
            ELSIF logo_column_name = 'logo_url' THEN
                INSERT INTO company_settings (
                    company_name,
                    company_slogan,
                    logo_url,
                    created_at,
                    updated_at
                ) VALUES (
                    'AlRabat RPF',
                    'Masters of Foundation Construction',
                    NULL,
                    NOW(),
                    NOW()
                );
            ELSE
                INSERT INTO company_settings (
                    company_name,
                    company_slogan,
                    created_at,
                    updated_at
                ) VALUES (
                    'AlRabat RPF',
                    'Masters of Foundation Construction',
                    NOW(),
                    NOW()
                );
            END IF;
        ELSE
            IF logo_column_name = 'company_logo_url' THEN
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
            ELSIF logo_column_name = 'logo_url' THEN
                INSERT INTO company_settings (
                    company_name,
                    company_slogan,
                    logo_url,
                    created_at,
                    updated_at
                ) VALUES (
                    'AlRabat RPF',
                    'Masters of Foundation Construction',
                    NULL,
                    NOW(),
                    NOW()
                );
            ELSE
                INSERT INTO company_settings (
                    company_name,
                    company_slogan,
                    created_at,
                    updated_at
                ) VALUES (
                    'AlRabat RPF',
                    'Masters of Foundation Construction',
                    NOW(),
                    NOW()
                );
            END IF;
        END IF;
        
        RAISE NOTICE 'Default company settings record created.';
    ELSE
        RAISE NOTICE 'Company settings records already exist: %', settings_count;
    END IF;
END $$;

-- ============================================
-- STEP 6: التحقق من البيانات الحالية
-- ============================================
-- التحقق من الأعمدة الموجودة أولاً
DO $$
DECLARE
    has_company_logo_url BOOLEAN;
    has_logo_url BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'company_settings' AND column_name = 'company_logo_url'
    ) INTO has_company_logo_url;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'company_settings' AND column_name = 'logo_url'
    ) INTO has_logo_url;
    
    IF has_company_logo_url THEN
        RAISE NOTICE 'Table has company_logo_url column';
    ELSIF has_logo_url THEN
        RAISE NOTICE 'Table has logo_url column';
    ELSE
        RAISE NOTICE 'Table has no logo column';
    END IF;
END $$;

-- عرض البيانات (باستخدام دالة get_company_settings التي تتعامل مع البنية الفعلية)
SELECT * FROM get_company_settings();

-- ============================================
-- STEP 7: اختبار الدالة
-- ============================================
SELECT * FROM get_company_settings();

-- ============================================
-- ملاحظات مهمة:
-- ============================================
-- 1. تم منع حذف آخر سجل في company_settings (Trigger)
-- 2. تم إزالة سياسة DELETE من RLS (لا يمكن لأحد حذف السجلات)
-- 3. تم تحديث دالة update_company_settings لضمان وجود سجل دائماً
-- 4. الدالة تعمل مع البنية الفعلية للجدول (مع أو بدون created_by/updated_by)
-- 5. الدالة تعمل مع company_logo_url أو logo_url (حسب البنية الفعلية)

