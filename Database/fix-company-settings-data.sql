-- =====================================================
-- Fix Company Settings Data
-- إصلاح بيانات إعدادات الشركة
-- =====================================================
-- هذا السكريبت يتحقق من وجود بيانات إعدادات الشركة
-- ويعيد إنشائها إذا كانت مفقودة

-- ============================================
-- STEP 1: التحقق من وجود البيانات
-- ============================================
DO $$
DECLARE
    settings_count INTEGER;
    default_name TEXT := 'AlRabat RPF';
    default_slogan TEXT := 'Masters of Foundation Construction';
BEGIN
    -- التحقق من عدد السجلات
    SELECT COUNT(*) INTO settings_count
    FROM company_settings;
    
    RAISE NOTICE 'Current company_settings records: %', settings_count;
    
    -- إذا لم تكن هناك بيانات، قم بإنشاء سجل افتراضي
    IF settings_count = 0 THEN
        RAISE NOTICE 'No company settings found. Creating default settings...';
        
        INSERT INTO company_settings (
            company_name,
            company_slogan,
            company_logo_url,
            created_at,
            updated_at
        ) VALUES (
            default_name,
            default_slogan,
            NULL,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Default company settings created successfully!';
    ELSE
        RAISE NOTICE 'Company settings already exist. Checking for empty values...';
        
        -- التحقق من السجلات الفارغة أو التي تحتوي على قيم افتراضية فقط
        UPDATE company_settings
        SET 
            company_name = COALESCE(NULLIF(TRIM(company_name), ''), default_name),
            company_slogan = COALESCE(NULLIF(TRIM(company_slogan), ''), default_slogan),
            updated_at = NOW()
        WHERE 
            TRIM(company_name) = '' OR 
            company_name IS NULL OR
            TRIM(company_slogan) = '' OR 
            company_slogan IS NULL;
        
        RAISE NOTICE 'Company settings updated if needed.';
    END IF;
END $$;

-- ============================================
-- STEP 2: التحقق من البيانات الحالية
-- ============================================
SELECT 
    id,
    company_name,
    company_slogan,
    company_logo_url,
    created_at,
    updated_at
FROM company_settings
ORDER BY updated_at DESC
LIMIT 5;

-- ============================================
-- STEP 3: التحقق من أن الدالة تعمل بشكل صحيح
-- ============================================
SELECT * FROM get_company_settings();

-- ============================================
-- STEP 4: مسح التخزين المؤقت (اختياري)
-- ============================================
-- إذا كنت تريد مسح التخزين المؤقت في localStorage،
-- يمكنك فتح Console في المتصفح وتشغيل:
-- localStorage.removeItem('company_settings_cache')

