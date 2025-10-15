-- 🔧 Fix Foreign Key Constraint Issues
-- إصلاح مشاكل قيود المفاتيح الخارجية

-- This script fixes the foreign key constraint issues by removing the problematic default inserts
-- and ensuring proper user initialization

-- 1. First, let's drop any existing problematic records
DELETE FROM user_preferences WHERE user_id = '00000000-0000-0000-0000-000000000000';
DELETE FROM notification_settings WHERE user_id = '00000000-0000-0000-0000-000000000000';

-- 2. Create the initialization function if it doesn't exist
CREATE OR REPLACE FUNCTION initialize_user_default_settings(target_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    -- Insert default user preferences
    INSERT INTO user_preferences (user_id, preference_key, preference_value, preference_type, category) VALUES
    (target_user_id, 'theme_mode', '"system"', 'string', 'ui'),
    (target_user_id, 'language', '"en"', 'string', 'personal'),
    (target_user_id, 'timezone', '"UTC"', 'string', 'personal'),
    (target_user_id, 'sidebar_collapsed', 'false', 'boolean', 'ui'),
    (target_user_id, 'compact_mode', 'false', 'boolean', 'ui'),
    (target_user_id, 'show_tooltips', 'true', 'boolean', 'ui'),
    (target_user_id, 'enable_sounds', 'true', 'boolean', 'personal'),
    (target_user_id, 'enable_animations', 'true', 'boolean', 'ui')
    ON CONFLICT (user_id, preference_key) DO NOTHING;

    -- Insert default notification settings
    INSERT INTO notification_settings (user_id, notification_type, notification_category, is_enabled, frequency) VALUES
    (target_user_id, 'email', 'project_updates', true, 'immediate'),
    (target_user_id, 'email', 'kpi_alerts', true, 'immediate'),
    (target_user_id, 'email', 'system_messages', true, 'immediate'),
    (target_user_id, 'email', 'security', true, 'immediate'),
    (target_user_id, 'in_app', 'project_updates', true, 'immediate'),
    (target_user_id, 'in_app', 'kpi_alerts', true, 'immediate'),
    (target_user_id, 'in_app', 'system_messages', true, 'immediate'),
    (target_user_id, 'in_app', 'security', true, 'immediate')
    ON CONFLICT (user_id, notification_type, notification_category) DO NOTHING;

    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Grant necessary permissions
GRANT EXECUTE ON FUNCTION initialize_user_default_settings TO authenticated;

-- 4. Create a trigger to automatically initialize settings for new users
CREATE OR REPLACE FUNCTION trigger_initialize_user_settings()
RETURNS TRIGGER AS $$
BEGIN
    -- Initialize default settings when a new user is created
    PERFORM initialize_user_default_settings(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create trigger on auth.users table (if accessible)
-- Note: This might not work depending on Supabase configuration
-- CREATE TRIGGER initialize_user_settings_trigger
--     AFTER INSERT ON auth.users
--     FOR EACH ROW
--     EXECUTE FUNCTION trigger_initialize_user_settings();

-- 6. Alternative: Create a function to initialize settings for existing users
CREATE OR REPLACE FUNCTION initialize_all_existing_users()
RETURNS INTEGER AS $$
DECLARE
    user_record RECORD;
    initialized_count INTEGER := 0;
BEGIN
    -- Loop through all existing users and initialize their settings
    FOR user_record IN 
        SELECT id FROM auth.users 
        WHERE id NOT IN (
            SELECT DISTINCT user_id FROM user_preferences
        )
    LOOP
        IF initialize_user_default_settings(user_record.id) THEN
            initialized_count := initialized_count + 1;
        END IF;
    END LOOP;
    
    RETURN initialized_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Grant permissions for the initialization function
GRANT EXECUTE ON FUNCTION initialize_all_existing_users TO authenticated;

-- 8. Create a function to check if user has settings initialized
CREATE OR REPLACE FUNCTION user_has_settings(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
DECLARE
    preference_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO preference_count 
    FROM user_preferences 
    WHERE user_id = $1;
    
    RETURN preference_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Grant permissions
GRANT EXECUTE ON FUNCTION user_has_settings TO authenticated;

-- 10. Create a safe function to get or initialize user preferences
CREATE OR REPLACE FUNCTION get_or_initialize_user_preference(
    preference_key TEXT, 
    default_value JSONB, 
    preference_type TEXT DEFAULT 'string',
    category TEXT DEFAULT 'personal',
    user_id UUID DEFAULT auth.uid()
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    -- Check if user has any settings initialized
    IF NOT user_has_settings(user_id) THEN
        -- Initialize all default settings for this user
        PERFORM initialize_user_default_settings(user_id);
    END IF;
    
    -- Get the specific preference
    SELECT preference_value INTO result
    FROM user_preferences
    WHERE user_id = $5 AND preference_key = $1;
    
    -- Return the preference value or default if not found
    RETURN COALESCE(result, default_value);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Grant permissions
GRANT EXECUTE ON FUNCTION get_or_initialize_user_preference TO authenticated;

-- 12. Create a safe function to get or initialize notification settings
CREATE OR REPLACE FUNCTION get_or_initialize_notification_setting(
    notification_type TEXT,
    notification_category TEXT,
    default_enabled BOOLEAN DEFAULT true,
    default_frequency TEXT DEFAULT 'immediate',
    user_id UUID DEFAULT auth.uid()
)
RETURNS notification_settings AS $$
DECLARE
    result notification_settings;
BEGIN
    -- Check if user has any settings initialized
    IF NOT user_has_settings(user_id) THEN
        -- Initialize all default settings for this user
        PERFORM initialize_user_default_settings(user_id);
    END IF;
    
    -- Get the specific notification setting
    SELECT * INTO result
    FROM notification_settings
    WHERE user_id = $5 AND notification_type = $1 AND notification_category = $2;
    
    -- Return the setting or create a default one if not found
    IF result IS NULL THEN
        INSERT INTO notification_settings (user_id, notification_type, notification_category, is_enabled, frequency)
        VALUES ($5, $1, $2, $3, $4)
        ON CONFLICT (user_id, notification_type, notification_category) DO NOTHING;
        
        SELECT * INTO result
        FROM notification_settings
        WHERE user_id = $5 AND notification_type = $1 AND notification_category = $2;
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Grant permissions
GRANT EXECUTE ON FUNCTION get_or_initialize_notification_setting TO authenticated;

-- 14. Update the existing functions to use the safe versions
CREATE OR REPLACE FUNCTION get_user_preference(preference_key TEXT, user_id UUID DEFAULT auth.uid())
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT preference_value INTO result
    FROM user_preferences
    WHERE user_id = $2 AND preference_key = $1;
    
    RETURN COALESCE(result, 'null'::JSONB);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. Create a comprehensive initialization check function
CREATE OR REPLACE FUNCTION ensure_user_settings_initialized(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user has any preferences
    IF NOT EXISTS (SELECT 1 FROM user_preferences WHERE user_id = $1) THEN
        -- Initialize default preferences
        PERFORM initialize_user_default_settings($1);
        RETURN TRUE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 16. Grant permissions
GRANT EXECUTE ON FUNCTION ensure_user_settings_initialized TO authenticated;

-- 17. Create a view for easy access to user settings
CREATE OR REPLACE VIEW user_settings_summary AS
SELECT 
    u.id as user_id,
    u.email,
    u.raw_user_meta_data->>'full_name' as full_name,
    COUNT(DISTINCT up.id) as preference_count,
    COUNT(DISTINCT ns.id) as notification_count,
    CASE 
        WHEN COUNT(DISTINCT up.id) > 0 THEN 'Initialized'
        ELSE 'Not Initialized'
    END as settings_status
FROM auth.users u
LEFT JOIN user_preferences up ON u.id = up.user_id
LEFT JOIN notification_settings ns ON u.id = ns.user_id
GROUP BY u.id, u.email, u.raw_user_meta_data->>'full_name';

-- 18. Grant permissions for the view
GRANT SELECT ON user_settings_summary TO authenticated;

-- 19. Create an index to improve performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id_key ON user_preferences(user_id, preference_key);
CREATE INDEX IF NOT EXISTS idx_notification_settings_user_type ON notification_settings(user_id, notification_type, notification_category);

-- 20. Add comments for documentation
COMMENT ON FUNCTION initialize_user_default_settings IS 'Initializes default user preferences and notification settings for a new user';
COMMENT ON FUNCTION user_has_settings IS 'Checks if a user has any preferences initialized';
COMMENT ON FUNCTION get_or_initialize_user_preference IS 'Gets user preference or initializes default settings if none exist';
COMMENT ON FUNCTION ensure_user_settings_initialized IS 'Ensures user settings are initialized, creates defaults if needed';
COMMENT ON VIEW user_settings_summary IS 'Summary view of user settings initialization status';

-- Success message
SELECT 'Settings foreign key constraints fixed successfully!' as message;
