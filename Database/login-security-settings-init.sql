-- ============================================================
-- Login Security Settings Initialization
-- تهيئة إعدادات أمان تسجيل الدخول
-- ============================================================

-- Insert default login security settings into system_settings table
-- إدراج إعدادات أمان تسجيل الدخول الافتراضية في جدول system_settings

INSERT INTO system_settings (
    setting_key,
    setting_value,
    setting_type,
    description,
    category,
    is_public,
    requires_restart
) VALUES (
    'login_security_settings',
    '{
        "enableRateLimiting": true,
        "rateLimitCooldownSeconds": 120,
        "enableLocalRateLimiting": true,
        "localRateLimitSeconds": 2,
        "enableMultipleSubmissionProtection": true,
        "enableRetryLogic": true,
        "maxRetries": 2,
        "enableExponentialBackoff": true,
        "enableOTPLogin": true,
        "otpCooldownSeconds": 60,
        "enableGoogleOAuth": true,
        "enableCompanyEmailValidation": true,
        "allowedEmailDomains": ["@rabatpfc.com"],
        "enablePasswordValidation": true,
        "passwordMinLength": 6,
        "passwordRequireUppercase": false,
        "passwordRequireLowercase": false,
        "passwordRequireNumbers": false,
        "passwordRequireSpecialChars": false,
        "enableSignUp": true,
        "enableForgotPassword": true,
        "enableShowPasswordToggle": true,
        "sessionTimeoutMinutes": 30,
        "enableSessionMonitoring": true
    }'::jsonb,
    'json',
    'Login security settings including rate limiting, OTP, OAuth, and validation rules',
    'security',
    false,
    false
)
ON CONFLICT (setting_key) DO UPDATE
SET 
    setting_value = EXCLUDED.setting_value,
    updated_at = NOW();

-- Add comment
COMMENT ON COLUMN system_settings.setting_value IS 'JSON value for login_security_settings contains all login security configuration';

-- ============================================================
-- Verification Query
-- استعلام التحقق
-- ============================================================

-- To verify the settings were inserted correctly, run:
-- للتحقق من إدراج الإعدادات بشكل صحيح، قم بتشغيل:

-- SELECT 
--     setting_key,
--     setting_value,
--     setting_type,
--     category,
--     updated_at
-- FROM system_settings
-- WHERE setting_key = 'login_security_settings';

