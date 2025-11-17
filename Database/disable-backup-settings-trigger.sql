-- Quick Fix: Disable backup_settings audit trigger
-- Use this if you need a quick solution and don't need audit logging for backup_settings

DROP TRIGGER IF EXISTS backup_settings_audit_trigger ON backup_settings;

-- To re-enable later, run:
-- CREATE TRIGGER backup_settings_audit_trigger
--     AFTER INSERT OR UPDATE OR DELETE ON backup_settings
--     FOR EACH ROW EXECUTE FUNCTION trigger_settings_audit();

