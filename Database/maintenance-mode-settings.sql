-- 🛠️ Maintenance Mode Settings

-- Insert default maintenance settings if they don't exist
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, category, is_public, requires_restart)
VALUES 
  (
    'maintenance_mode_enabled',
    'false'::jsonb,
    'boolean',
    'Enable maintenance mode - When enabled, the site will be closed for all users except admin',
    'maintenance',
    true, -- Must be public so middleware can read it without authentication
    false
  ),
  (
    'maintenance_message',
    '"We are performing maintenance on the site. We apologize for the inconvenience and will be back soon."'::jsonb,
    'string',
    'Maintenance message displayed to users',
    'maintenance',
    true,
    false
  ),
  (
    'maintenance_estimated_time',
    '"30 minutes"'::jsonb,
    'string',
    'Estimated time for maintenance completion',
    'maintenance',
    true,
    false
  )
ON CONFLICT (setting_key) DO NOTHING;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);
