-- Function to get maintenance mode status (public, no auth required)
-- دالة للحصول على حالة وضع الصيانة (عامة، لا تحتاج authentication)

CREATE OR REPLACE FUNCTION get_maintenance_mode_status()
RETURNS BOOLEAN AS $$
DECLARE
    v_setting_value JSONB;
    v_result BOOLEAN := false;
BEGIN
    -- Get maintenance mode setting (bypass RLS)
    SELECT setting_value INTO v_setting_value
    FROM system_settings
    WHERE setting_key = 'maintenance_mode_enabled';
    
    -- If setting doesn't exist, return false
    IF v_setting_value IS NULL THEN
        RETURN false;
    END IF;
    
    -- Handle different JSONB formats
    IF v_setting_value::text = 'true' OR v_setting_value::text = '"true"' THEN
        v_result := true;
    ELSIF v_setting_value::text = 'false' OR v_setting_value::text = '"false"' THEN
        v_result := false;
    ELSIF jsonb_typeof(v_setting_value) = 'boolean' THEN
        v_result := v_setting_value::boolean;
    ELSIF jsonb_typeof(v_setting_value) = 'string' THEN
        v_result := v_setting_value::text = '"true"' OR v_setting_value::text = 'true';
    END IF;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to everyone (including anonymous)
GRANT EXECUTE ON FUNCTION get_maintenance_mode_status() TO anon, authenticated;

-- Add comment
COMMENT ON FUNCTION get_maintenance_mode_status IS 'Get maintenance mode status - public function that can be called without authentication';

-- Also update the setting to be public so it can be read directly
UPDATE system_settings 
SET is_public = true 
WHERE setting_key = 'maintenance_mode_enabled';
