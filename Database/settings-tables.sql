-- 🛠️ Settings Tables for Supabase
-- نظام شامل للإعدادات مع قاعدة البيانات

-- 1. System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    setting_key TEXT UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    setting_type TEXT NOT NULL DEFAULT 'string', -- string, number, boolean, json
    description TEXT,
    category TEXT NOT NULL DEFAULT 'general', -- general, security, notifications, backup, ui
    is_public BOOLEAN DEFAULT false, -- يمكن لجميع المستخدمين رؤيتها
    requires_restart BOOLEAN DEFAULT false, -- يحتاج إعادة تشغيل التطبيق
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- 2. User Preferences Table
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    preference_key TEXT NOT NULL,
    preference_value JSONB NOT NULL,
    preference_type TEXT NOT NULL DEFAULT 'string',
    category TEXT NOT NULL DEFAULT 'personal', -- personal, ui, notifications, privacy
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, preference_key)
);

-- 3. Notification Settings Table
CREATE TABLE IF NOT EXISTS notification_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL, -- email, push, in_app, sms
    notification_category TEXT NOT NULL, -- project_updates, kpi_alerts, system_messages, security
    is_enabled BOOLEAN DEFAULT true,
    frequency TEXT DEFAULT 'immediate', -- immediate, daily, weekly, never
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    quiet_days INTEGER[] DEFAULT '{}', -- Array of day numbers (0=Sunday, 6=Saturday)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, notification_type, notification_category)
);

-- 4. Security Settings Table
CREATE TABLE IF NOT EXISTS security_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    setting_key TEXT UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    risk_level TEXT DEFAULT 'low', -- low, medium, high, critical
    requires_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- 5. Backup Settings Table
CREATE TABLE IF NOT EXISTS backup_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    backup_type TEXT NOT NULL, -- full, incremental, selective
    frequency TEXT NOT NULL, -- daily, weekly, monthly, manual
    retention_days INTEGER DEFAULT 30,
    include_files BOOLEAN DEFAULT true,
    include_database BOOLEAN DEFAULT true,
    compression BOOLEAN DEFAULT true,
    encryption BOOLEAN DEFAULT false,
    storage_location TEXT DEFAULT 'local', -- local, cloud, external
    last_backup_at TIMESTAMP WITH TIME ZONE,
    next_backup_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- 6. Audit Log Table for Settings Changes
CREATE TABLE IF NOT EXISTS settings_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL, -- create, update, delete, export, import
    table_name TEXT NOT NULL,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_category ON user_preferences(category);
CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON notification_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_security_settings_key ON security_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_backup_settings_active ON backup_settings(is_active);
CREATE INDEX IF NOT EXISTS idx_settings_audit_log_user_id ON settings_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_settings_audit_log_created_at ON settings_audit_log(created_at);

-- Row Level Security (RLS) Policies

-- System Settings
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read public system settings
CREATE POLICY "Anyone can read public system settings" ON system_settings
    FOR SELECT USING (is_public = true);

-- Only admins can read private system settings
CREATE POLICY "Admins can read private system settings" ON system_settings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Only admins can modify system settings
CREATE POLICY "Admins can modify system settings" ON system_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- User Preferences
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only access their own preferences
CREATE POLICY "Users can manage their own preferences" ON user_preferences
    FOR ALL USING (auth.uid() = user_id);

-- Notification Settings
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- Users can only access their own notification settings
CREATE POLICY "Users can manage their own notification settings" ON notification_settings
    FOR ALL USING (auth.uid() = user_id);

-- Security Settings
ALTER TABLE security_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can access security settings
CREATE POLICY "Admins can manage security settings" ON security_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Backup Settings
ALTER TABLE backup_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can access backup settings
CREATE POLICY "Admins can manage backup settings" ON backup_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Settings Audit Log
ALTER TABLE settings_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit log
CREATE POLICY "Admins can read audit log" ON settings_audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, category, is_public) VALUES
('app_name', '"AlRabat RPF"', 'string', 'Application Name', 'general', true),
('app_version', '"1.0.0"', 'string', 'Application Version', 'general', true),
('company_name', '"AlRabat RPF"', 'string', 'Company Name', 'general', true),
('company_slogan', '"Masters of Foundation Construction"', 'string', 'Company Slogan', 'general', true),
('default_language', '"en"', 'string', 'Default Language', 'general', true),
('default_timezone', '"UTC"', 'string', 'Default Timezone', 'general', true),
('session_timeout', '30', 'number', 'Session Timeout in minutes', 'security', false),
('max_login_attempts', '5', 'number', 'Maximum login attempts before lockout', 'security', false),
('password_min_length', '8', 'number', 'Minimum password length', 'security', false),
('auto_save_interval', '30', 'number', 'Auto-save interval in seconds', 'ui', false),
('max_file_size_mb', '10', 'number', 'Maximum file upload size in MB', 'general', false),
('enable_notifications', 'true', 'boolean', 'Enable system notifications', 'notifications', true),
('enable_email_notifications', 'true', 'boolean', 'Enable email notifications', 'notifications', true),
('enable_push_notifications', 'false', 'boolean', 'Enable push notifications', 'notifications', true),
('backup_auto_enabled', 'true', 'boolean', 'Enable automatic backups', 'backup', false),
('backup_frequency', '"daily"', 'string', 'Backup frequency', 'backup', false),
('backup_retention_days', '30', 'number', 'Backup retention period in days', 'backup', false),
('theme_mode', '"system"', 'string', 'Default theme mode (light/dark/system)', 'ui', true),
('sidebar_collapsed', 'false', 'boolean', 'Default sidebar state', 'ui', true),
('dashboard_refresh_interval', '60', 'number', 'Dashboard refresh interval in seconds', 'ui', false)
ON CONFLICT (setting_key) DO NOTHING;

-- Note: User preferences will be created automatically when users first access settings
-- No default records needed as they are created per user

-- Note: Notification settings will be created automatically when users first access settings
-- No default records needed as they are created per user

-- Insert default security settings
INSERT INTO security_settings (setting_key, setting_value, description, risk_level, requires_admin) VALUES
('enable_2fa', 'false', 'Enable Two-Factor Authentication', 'high', false),
('session_timeout_minutes', '30', 'Session timeout in minutes', 'medium', false),
('max_login_attempts', '5', 'Maximum login attempts before lockout', 'high', false),
('lockout_duration_minutes', '15', 'Account lockout duration in minutes', 'high', false),
('password_min_length', '8', 'Minimum password length', 'medium', false),
('password_require_special_chars', 'true', 'Require special characters in password', 'medium', false),
('enable_login_notifications', 'true', 'Send notifications for login attempts', 'low', false),
('enable_session_monitoring', 'true', 'Monitor active sessions', 'medium', false),
('auto_logout_inactive', 'true', 'Auto logout inactive users', 'medium', false),
('enable_audit_logging', 'true', 'Enable audit logging', 'low', false)
ON CONFLICT (setting_key) DO NOTHING;

-- Insert default backup settings
INSERT INTO backup_settings (backup_type, frequency, retention_days, include_files, include_database, compression, encryption, storage_location, is_active) VALUES
('full', 'daily', 30, true, true, true, false, 'local', true),
('incremental', 'weekly', 90, true, true, true, false, 'local', true),
('selective', 'monthly', 365, false, true, true, false, 'local', true)
ON CONFLICT DO NOTHING;

-- Create functions for settings management

-- Function to get system setting
CREATE OR REPLACE FUNCTION get_system_setting(setting_key TEXT)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT setting_value INTO result
    FROM system_settings
    WHERE setting_key = $1;
    
    RETURN COALESCE(result, 'null'::JSONB);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to set system setting
CREATE OR REPLACE FUNCTION set_system_setting(setting_key TEXT, setting_value JSONB, setting_type TEXT DEFAULT 'string', description TEXT DEFAULT NULL, category TEXT DEFAULT 'general', is_public BOOLEAN DEFAULT false)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO system_settings (setting_key, setting_value, setting_type, description, category, is_public, updated_by)
    VALUES ($1, $2, $3, $4, $5, $6, auth.uid())
    ON CONFLICT (setting_key) 
    DO UPDATE SET 
        setting_value = EXCLUDED.setting_value,
        setting_type = EXCLUDED.setting_type,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        is_public = EXCLUDED.is_public,
        updated_at = NOW(),
        updated_by = auth.uid();
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user preference
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

-- Function to set user preference
CREATE OR REPLACE FUNCTION set_user_preference(preference_key TEXT, preference_value JSONB, preference_type TEXT DEFAULT 'string', category TEXT DEFAULT 'personal', user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO user_preferences (user_id, preference_key, preference_value, preference_type, category)
    VALUES ($5, $1, $2, $3, $4)
    ON CONFLICT (user_id, preference_key) 
    DO UPDATE SET 
        preference_value = EXCLUDED.preference_value,
        preference_type = EXCLUDED.preference_type,
        category = EXCLUDED.category,
        updated_at = NOW();
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to initialize default settings for a new user
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

-- Function to log settings changes
CREATE OR REPLACE FUNCTION log_settings_change(action TEXT, table_name TEXT, record_id UUID, old_values JSONB DEFAULT NULL, new_values JSONB DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
    INSERT INTO settings_audit_log (user_id, action, table_name, record_id, old_values, new_values, ip_address)
    VALUES (auth.uid(), $1, $2, $3, $4, $5, inet_client_addr());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for audit logging
CREATE OR REPLACE FUNCTION trigger_settings_audit()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM log_settings_change('INSERT', TG_TABLE_NAME, NEW.id, NULL, row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM log_settings_change('UPDATE', TG_TABLE_NAME, NEW.id, row_to_json(OLD), row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM log_settings_change('DELETE', TG_TABLE_NAME, OLD.id, row_to_json(OLD), NULL);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers
CREATE TRIGGER system_settings_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION trigger_settings_audit();

CREATE TRIGGER user_preferences_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION trigger_settings_audit();

CREATE TRIGGER notification_settings_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON notification_settings
    FOR EACH ROW EXECUTE FUNCTION trigger_settings_audit();

CREATE TRIGGER security_settings_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON security_settings
    FOR EACH ROW EXECUTE FUNCTION trigger_settings_audit();

CREATE TRIGGER backup_settings_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON backup_settings
    FOR EACH ROW EXECUTE FUNCTION trigger_settings_audit();
