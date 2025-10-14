-- ============================================================
-- Missing Functions and Objects - الدوال والكائنات الناقصة
-- ============================================================
-- هذا السكريبت يضيف جميع الدوال والكائنات الناقصة من قاعدة البيانات
-- شغل هذا السكريبت بعد PRODUCTION_SCHEMA_COMPLETE.sql

-- ============================================================
-- PART 1: Company Settings Functions
-- ============================================================

-- دالة للحصول على إعدادات الشركة الحالية
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
        cs.company_logo_url,
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
    
    IF user_role IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    IF user_role != 'admin' THEN
        RAISE EXCEPTION 'Only admins can update company settings';
    END IF;
    
    -- تحديث الإعدادات
    UPDATE public.company_settings 
    SET 
        company_name = p_company_name,
        company_slogan = p_company_slogan,
        company_logo_url = p_company_logo_url,
        updated_by = auth.uid(),
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
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error updating company settings: %', SQLERRM;
END;
$$;

-- ============================================================
-- PART 2: Helper Functions for Date Calculations
-- ============================================================

-- دالة لحساب أيام العمل بين تاريخين
CREATE OR REPLACE FUNCTION public.calculate_workdays(
    p_start_date DATE,
    p_end_date DATE,
    p_exclude_holidays BOOLEAN DEFAULT TRUE
)
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    workdays INTEGER := 0;
    curr_date DATE;
    day_of_week INTEGER;
    is_holiday BOOLEAN;
BEGIN
    -- Validate input
    IF p_start_date IS NULL OR p_end_date IS NULL THEN
        RETURN 0;
    END IF;
    
    IF p_start_date > p_end_date THEN
        RETURN 0;
    END IF;
    
    curr_date := p_start_date;
    
    WHILE curr_date <= p_end_date LOOP
        -- Get day of week (0 = Sunday, 6 = Saturday)
        day_of_week := EXTRACT(DOW FROM curr_date);
        
        -- Check if it's Friday (5) or Saturday (6) - weekend in UAE
        IF day_of_week NOT IN (5, 6) THEN
            -- Check if it's a holiday
            IF p_exclude_holidays THEN
                SELECT EXISTS (
                    SELECT 1 FROM public.holidays 
                    WHERE date = curr_date 
                    AND is_active = TRUE
                ) INTO is_holiday;
                
                IF NOT is_holiday THEN
                    workdays := workdays + 1;
                END IF;
            ELSE
                workdays := workdays + 1;
            END IF;
        END IF;
        
        curr_date := curr_date + INTERVAL '1 day';
    END LOOP;
    
    RETURN workdays;
END;
$$;

-- ============================================================
-- PART 3: User Management Helper Functions
-- ============================================================

-- دالة للتحقق من صلاحية المستخدم
CREATE OR REPLACE FUNCTION public.check_user_permission(
    p_user_id UUID,
    p_permission TEXT
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    user_role TEXT;
    user_permissions TEXT[];
BEGIN
    -- Get user role and permissions
    SELECT role, permissions INTO user_role, user_permissions
    FROM public.users
    WHERE id = p_user_id;
    
    -- Admin has all permissions
    IF user_role = 'admin' THEN
        RETURN TRUE;
    END IF;
    
    -- Check if user has the specific permission
    IF user_permissions IS NOT NULL AND p_permission = ANY(user_permissions) THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$;

-- ============================================================
-- PART 4: Audit Log Function (if needed)
-- ============================================================

-- دالة لتسجيل التغييرات
CREATE OR REPLACE FUNCTION public.log_audit_event(
    p_table_name TEXT,
    p_record_id UUID,
    p_action TEXT,
    p_changes JSONB DEFAULT NULL
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- يمكن إضافة جدول audit_log لاحقاً
    -- INSERT INTO audit_log (table_name, record_id, action, changes, user_id)
    -- VALUES (p_table_name, p_record_id, p_action, p_changes, auth.uid());
    
    -- للآن، فقط نسجل في console
    RAISE NOTICE 'Audit: % % on % (ID: %)', p_action, p_table_name, p_record_id, auth.uid();
END;
$$;

-- ============================================================
-- PART 5: Grant Permissions
-- ============================================================

-- منح الصلاحيات للدوال
GRANT EXECUTE ON FUNCTION public.get_company_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_company_settings(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_workdays(DATE, DATE, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_permission(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_audit_event(TEXT, UUID, TEXT, JSONB) TO authenticated;

-- ============================================================
-- PART 6: Comments for Documentation
-- ============================================================

COMMENT ON FUNCTION public.get_company_settings() IS 'Get current company settings';
COMMENT ON FUNCTION public.update_company_settings(TEXT, TEXT, TEXT) IS 'Update company settings (admin only)';
COMMENT ON FUNCTION public.calculate_workdays(DATE, DATE, BOOLEAN) IS 'Calculate workdays between two dates excluding weekends and holidays';
COMMENT ON FUNCTION public.check_user_permission(UUID, TEXT) IS 'Check if user has specific permission';
COMMENT ON FUNCTION public.log_audit_event(TEXT, UUID, TEXT, JSONB) IS 'Log audit events for tracking changes';

-- ============================================================
-- Verification Query
-- ============================================================

-- التحقق من أن الدوال تم إنشاؤها بنجاح
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name IN (
        'get_company_settings',
        'update_company_settings',
        'calculate_workdays',
        'check_user_permission',
        'log_audit_event'
    )
ORDER BY routine_name;

-- ============================================================
-- Expected Result:
-- يجب أن ترى 5 دوال:
-- 1. calculate_workdays
-- 2. check_user_permission
-- 3. get_company_settings
-- 4. log_audit_event
-- 5. update_company_settings
-- ============================================================

