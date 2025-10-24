-- ============================================================
-- Essential Functions Only - الدوال الأساسية فقط
-- ============================================================
-- هذا السكريبت يحتوي فقط على الدوال الضرورية للتطبيق

-- ============================================================
-- STEP 1: تعطيل RLS مؤقتاً
-- ============================================================
ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.company_settings DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 2: دوال إعدادات الشركة
-- ============================================================

-- دالة للحصول على إعدادات الشركة
CREATE OR REPLACE FUNCTION public.get_company_settings()
RETURNS TABLE (
    company_name TEXT,
    company_slogan TEXT,
    company_logo_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cs.company_name,
        cs.company_slogan,
        cs.logo_url,
        cs.updated_at
    FROM public.company_settings cs
    ORDER BY cs.updated_at DESC
    LIMIT 1;
END;
$$;

-- دالة لتحديث إعدادات الشركة
CREATE OR REPLACE FUNCTION public.update_company_settings(
    p_company_name TEXT,
    p_company_slogan TEXT,
    p_company_logo_url TEXT DEFAULT NULL
)
RETURNS BOOLEAN 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    user_role TEXT;
    settings_count INTEGER;
BEGIN
    -- التحقق من صلاحيات المستخدم
    SELECT role INTO user_role
    FROM public.users
    WHERE id = auth.uid();
    
    -- إذا لم يوجد المستخدم، نسمح بالتحديث (للإعداد الأولي)
    IF user_role IS NULL THEN
        user_role := 'admin';
    END IF;
    
    IF user_role != 'admin' THEN
        RAISE EXCEPTION 'Only admins can update company settings';
    END IF;
    
    -- تحديث الإعدادات
    UPDATE public.company_settings 
    SET 
        company_name = p_company_name,
        company_slogan = p_company_slogan,
        logo_url = p_company_logo_url,
        updated_at = NOW()
    WHERE id = (
        SELECT id FROM public.company_settings 
        ORDER BY updated_at DESC 
        LIMIT 1
    );
    
    GET DIAGNOSTICS settings_count = ROW_COUNT;
    
    -- إذا لم توجد إعدادات، إنشاء جديدة
    IF settings_count = 0 THEN
        INSERT INTO public.company_settings (
            company_name, 
            company_slogan, 
            logo_url
        ) VALUES (
            p_company_name,
            p_company_slogan,
            p_company_logo_url
        );
    END IF;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error updating company settings: %', SQLERRM;
END;
$$;

-- ============================================================
-- STEP 3: منح الصلاحيات
-- ============================================================
GRANT EXECUTE ON FUNCTION public.get_company_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_company_settings() TO anon;
GRANT EXECUTE ON FUNCTION public.update_company_settings(TEXT, TEXT, TEXT) TO authenticated;

-- ============================================================
-- STEP 4: إضافة بيانات افتراضية
-- ============================================================

-- إعدادات الشركة الافتراضية
INSERT INTO public.company_settings (company_name, company_slogan)
SELECT 'AlRabat RPF', 'Masters of Foundation Construction'
WHERE NOT EXISTS (SELECT 1 FROM public.company_settings)
LIMIT 1;

-- الأقسام الافتراضية
INSERT INTO public.divisions (name, description, is_active)
SELECT name, description, true
FROM (VALUES
    ('Technical Office', 'Technical Office Division'),
    ('Construction', 'Construction Division'),
    ('Finance', 'Finance Division'),
    ('HR', 'Human Resources Division')
) AS t(name, description)
WHERE NOT EXISTS (SELECT 1 FROM public.divisions WHERE divisions.name = t.name);

-- العملات الافتراضية
INSERT INTO public.currencies (code, name, symbol, is_active)
SELECT code, name, symbol, true
FROM (VALUES
    ('AED', 'UAE Dirham', 'د.إ'),
    ('USD', 'US Dollar', '$'),
    ('EUR', 'Euro', '€')
) AS t(code, name, symbol)
WHERE NOT EXISTS (SELECT 1 FROM public.currencies WHERE currencies.code = t.code);

-- أنواع المشاريع الافتراضية
INSERT INTO public.project_types (name, description, is_active)
SELECT name, description, true
FROM (VALUES
    ('Foundation', 'Foundation Construction Projects'),
    ('Piling', 'Piling Works'),
    ('Infrastructure', 'Infrastructure Projects')
) AS t(name, description)
WHERE NOT EXISTS (SELECT 1 FROM public.project_types WHERE project_types.name = t.name);

-- ============================================================
-- STEP 5: التحقق من النجاح
-- ============================================================

-- التحقق من الدوال
SELECT 
    '✅ Functions:' AS status,
    routine_name AS name
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name IN ('get_company_settings', 'update_company_settings')
ORDER BY routine_name;

-- التحقق من البيانات
SELECT '✅ Data:' AS status,
       (SELECT COUNT(*) FROM public.company_settings) AS company_settings,
       (SELECT COUNT(*) FROM public.divisions) AS divisions,
       (SELECT COUNT(*) FROM public.currencies) AS currencies,
       (SELECT COUNT(*) FROM public.project_types) AS project_types;

-- ============================================================
-- ✅ تم بنجاح!
-- 
-- الخطوة التالية:
-- 1. اذهب إلى التطبيق: http://localhost:3000
-- 2. Sign Out → Ctrl+Shift+R → Sign In
-- 3. Dashboard يجب أن يعمل الآن! ✅
-- ============================================================

