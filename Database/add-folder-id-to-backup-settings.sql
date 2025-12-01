-- Migration: Add folder_id column to backup_settings table
-- Date: 2024
-- Description: Adds folder_id column to store Google Drive folder ID for backups

-- Method 1: Simple ALTER TABLE (if column doesn't exist, will show error - ignore it)
-- Run this command in Supabase SQL Editor:
ALTER TABLE backup_settings ADD COLUMN IF NOT EXISTS folder_id TEXT;

-- Add comment to the column
COMMENT ON COLUMN backup_settings.folder_id IS 'Google Drive folder ID for storing backups (optional)';

-- Method 2: Safe version with error handling (if Method 1 doesn't work)
-- Uncomment and use this if Method 1 shows an error:
/*
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'backup_settings' 
        AND column_name = 'folder_id'
    ) THEN
        ALTER TABLE public.backup_settings 
        ADD COLUMN folder_id TEXT;
        
        RAISE NOTICE 'Column folder_id added to backup_settings table';
    ELSE
        RAISE NOTICE 'Column folder_id already exists in backup_settings table';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error adding column: %', SQLERRM;
END $$;
*/

