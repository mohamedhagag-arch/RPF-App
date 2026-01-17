-- Function to get all system settings (bypasses RLS) - FIXED VERSION
-- دالة للحصول على جميع إعدادات النظام (تتجاوز RLS) - نسخة مصححة

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_all_system_settings_safe(TEXT);

CREATE OR REPLACE FUNCTION get_all_system_settings_safe(p_category TEXT DEFAULT NULL)
RETURNS SETOF system_settings AS $$
DECLARE
    v_user_role TEXT;
    v_user_id UUID;
    v_result RECORD;
BEGIN
    -- Get current user ID
    v_user_id := auth.uid();
    
    -- Get user role
    IF v_user_id IS NOT NULL THEN
        SELECT u.role INTO v_user_role
        FROM public.users u
        WHERE u.id = v_user_id;
    END IF;
    
    -- If no user or not admin/manager, return only public settings
    IF v_user_role IS NULL OR v_user_role NOT IN ('admin', 'manager') THEN
        -- Return only public settings using FOR loop
        FOR v_result IN 
            SELECT * FROM system_settings
            WHERE is_public = true
            AND (p_category IS NULL OR category = p_category)
            ORDER BY setting_key
        LOOP
            RETURN NEXT v_result;
        END LOOP;
    ELSE
        -- Admin/Manager can see all settings
        FOR v_result IN 
            SELECT * FROM system_settings
            WHERE (p_category IS NULL OR category = p_category)
            ORDER BY setting_key
        LOOP
            RETURN NEXT v_result;
        END LOOP;
    END IF;
    
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_all_system_settings_safe TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_all_system_settings_safe IS 'Safely get all system settings with permission check - admins/managers see all, others see only public settings';
