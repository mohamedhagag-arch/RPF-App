-- Simple Migration: Add folder_id column to backup_settings
-- Copy and paste this into Supabase SQL Editor

ALTER TABLE backup_settings 
ADD COLUMN IF NOT EXISTS folder_id TEXT;

