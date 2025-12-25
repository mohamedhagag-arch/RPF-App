-- ============================================================
-- Fix System Settings RLS Policies
-- إصلاح سياسات RLS لجدول system_settings
-- ============================================================

-- Drop ALL existing policies on system_settings (comprehensive cleanup)
-- حذف جميع السياسات الموجودة على system_settings
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'system_settings' 
        AND schemaname = 'public'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON system_settings', r.policyname);
    END LOOP;
END $$;

-- Create new policies that use public.users table instead of auth.users
-- سياسات جديدة تستخدم جدول users في public schema

-- Anyone can read public system settings
CREATE POLICY "Anyone can read public system settings" ON system_settings
    FOR SELECT USING (is_public = true);

-- Authenticated users can read private system settings if they are admin or manager
CREATE POLICY "Admins and managers can read private system settings" ON system_settings
    FOR SELECT USING (
        is_public = true
        OR
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'manager')
        )
    );

-- Admins and managers can modify system settings
CREATE POLICY "Admins and managers can modify system settings" ON system_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'manager')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'manager')
        )
    );

-- ============================================================
-- Alternative: Create a function with SECURITY DEFINER
-- بديل: إنشاء دالة مع SECURITY DEFINER
-- ============================================================

-- Function to set system setting (bypasses RLS)
CREATE OR REPLACE FUNCTION set_system_setting_safe(
    p_setting_key TEXT,
    p_setting_value JSONB,
    p_setting_type TEXT DEFAULT 'string',
    p_description TEXT DEFAULT NULL,
    p_category TEXT DEFAULT 'general',
    p_is_public BOOLEAN DEFAULT false
)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID;
    v_user_role TEXT;
BEGIN
    -- Get current user ID
    v_user_id := auth.uid();
    
    -- Check if user is admin or manager
    SELECT role INTO v_user_role
    FROM public.users
    WHERE id = v_user_id;
    
    IF v_user_role NOT IN ('admin', 'manager') THEN
        RAISE EXCEPTION 'Only admins and managers can modify system settings';
    END IF;
    
    -- Upsert the setting
    INSERT INTO system_settings (
        setting_key,
        setting_value,
        setting_type,
        description,
        category,
        is_public,
        updated_by,
        updated_at
    ) VALUES (
        p_setting_key,
        p_setting_value,
        p_setting_type,
        p_description,
        p_category,
        p_is_public,
        v_user_id,
        NOW()
    )
    ON CONFLICT (setting_key) DO UPDATE SET
        setting_value = EXCLUDED.setting_value,
        setting_type = EXCLUDED.setting_type,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        is_public = EXCLUDED.is_public,
        updated_by = v_user_id,
        updated_at = NOW();
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION set_system_setting_safe TO authenticated;

-- Add comment
COMMENT ON FUNCTION set_system_setting_safe IS 'Safely set system settings with permission check using public.users table';

-- ============================================================
-- Function to get system setting (bypasses RLS)
-- دالة للحصول على إعدادات النظام (تتجاوز RLS)
-- ============================================================

CREATE OR REPLACE FUNCTION get_system_setting_safe(p_setting_key TEXT)
RETURNS JSONB AS $$
DECLARE
    v_setting_value JSONB;
    v_user_role TEXT;
    v_is_public BOOLEAN;
BEGIN
    -- Get user role
    SELECT role INTO v_user_role
    FROM public.users
    WHERE id = auth.uid();
    
    -- Get setting and is_public flag
    SELECT setting_value, is_public INTO v_setting_value, v_is_public
    FROM system_settings
    WHERE setting_key = p_setting_key;
    
    -- If setting doesn't exist, return null
    IF v_setting_value IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- If public, anyone can read
    IF v_is_public = true THEN
        RETURN v_setting_value;
    END IF;
    
    -- If private, only admins and managers can read
    IF v_user_role NOT IN ('admin', 'manager') THEN
        RAISE EXCEPTION 'Only admins and managers can read private system settings';
    END IF;
    
    RETURN v_setting_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_system_setting_safe TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_system_setting_safe IS 'Safely get system settings with permission check using public.users table';

