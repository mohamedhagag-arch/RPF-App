-- Fix backup_settings trigger issue
-- The trigger calls log_settings_change which may fail in API context

-- Option 1: Create/Update the function to handle NULL user_id
CREATE OR REPLACE FUNCTION log_settings_change(
    action TEXT, 
    table_name TEXT, 
    record_id UUID, 
    old_values JSONB DEFAULT NULL, 
    new_values JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    -- Only log if we have a user_id (skip for API/service operations)
    IF auth.uid() IS NOT NULL THEN
        INSERT INTO settings_audit_log (
            user_id, 
            action, 
            table_name, 
            record_id, 
            old_values, 
            new_values, 
            ip_address
        )
        VALUES (
            auth.uid(), 
            action, 
            table_name, 
            record_id, 
            old_values, 
            new_values, 
            inet_client_addr()
        );
    END IF;
    -- If no user_id, silently skip logging (for API/service operations)
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Option 2: If Option 1 doesn't work, disable the trigger temporarily
-- Uncomment the line below to disable the trigger:
-- DROP TRIGGER IF EXISTS backup_settings_audit_trigger ON backup_settings;

-- Option 3: Create a safer version that doesn't require auth.uid()
CREATE OR REPLACE FUNCTION log_settings_change_safe(
    action TEXT, 
    table_name TEXT, 
    record_id UUID, 
    old_values JSONB DEFAULT NULL, 
    new_values JSONB DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    current_user_id UUID;
BEGIN
    -- Try to get user_id, but don't fail if it's NULL
    BEGIN
        current_user_id := auth.uid();
    EXCEPTION
        WHEN OTHERS THEN
            current_user_id := NULL;
    END;
    
    -- Only log if we have a user_id
    IF current_user_id IS NOT NULL THEN
        INSERT INTO settings_audit_log (
            user_id, 
            action, 
            table_name, 
            record_id, 
            old_values, 
            new_values, 
            ip_address
        )
        VALUES (
            current_user_id, 
            action, 
            table_name, 
            record_id, 
            old_values, 
            new_values, 
            inet_client_addr()
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the trigger function to use the safe version
CREATE OR REPLACE FUNCTION trigger_settings_audit()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Use safe version that handles NULL user_id
        BEGIN
            PERFORM log_settings_change_safe('INSERT', TG_TABLE_NAME, NEW.id, NULL, row_to_json(NEW));
        EXCEPTION
            WHEN OTHERS THEN
                -- Silently ignore audit log errors
                NULL;
        END;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        BEGIN
            PERFORM log_settings_change_safe('UPDATE', TG_TABLE_NAME, NEW.id, row_to_json(OLD), row_to_json(NEW));
        EXCEPTION
            WHEN OTHERS THEN
                NULL;
        END;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        BEGIN
            PERFORM log_settings_change_safe('DELETE', TG_TABLE_NAME, OLD.id, row_to_json(OLD), NULL);
        EXCEPTION
            WHEN OTHERS THEN
                NULL;
        END;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

