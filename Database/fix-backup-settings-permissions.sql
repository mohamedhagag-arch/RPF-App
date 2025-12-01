-- Fix backup_settings table permissions
-- Makes created_by and updated_by nullable to avoid foreign key permission issues

-- Step 1: Add folder_id column if it doesn't exist
ALTER TABLE backup_settings 
ADD COLUMN IF NOT EXISTS folder_id TEXT;

-- Step 2: Make created_by and updated_by nullable (if they aren't already)
-- This allows inserts without requiring auth.users access
ALTER TABLE backup_settings 
ALTER COLUMN created_by DROP NOT NULL;

ALTER TABLE backup_settings 
ALTER COLUMN updated_by DROP NOT NULL;

-- Step 3: Add comment
COMMENT ON COLUMN backup_settings.folder_id IS 'Google Drive folder ID for storing backups (optional)';

