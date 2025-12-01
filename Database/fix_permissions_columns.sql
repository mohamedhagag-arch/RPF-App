-- Fix permissions columns for users table
-- This script handles the case where permissions column already exists as jsonb

-- First, let's check the current structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('permissions', 'custom_permissions_enabled');

-- Drop the existing permissions column if it exists (and is wrong type)
ALTER TABLE users DROP COLUMN IF EXISTS permissions;

-- Add permissions column as TEXT[] (array of text)
ALTER TABLE users 
ADD COLUMN permissions TEXT[] DEFAULT NULL;

-- Add custom permissions enabled flag if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS custom_permissions_enabled BOOLEAN DEFAULT FALSE;

-- Add comment to explain the permissions column
COMMENT ON COLUMN users.permissions IS 'Array of permission IDs for custom user permissions';
COMMENT ON COLUMN users.custom_permissions_enabled IS 'Whether custom permissions are enabled for this user';

-- Update existing users to have default permissions based on their role
UPDATE users 
SET 
  permissions = CASE 
    WHEN role = 'admin' THEN ARRAY[]::TEXT[] -- Admin gets all permissions (empty array means all)
    WHEN role = 'manager' THEN ARRAY[
      'projects.view', 'projects.create', 'projects.edit', 'projects.delete', 'projects.export',
      'boq.view', 'boq.create', 'boq.edit', 'boq.delete', 'boq.approve', 'boq.export',
      'kpi.view', 'kpi.create', 'kpi.edit', 'kpi.delete', 'kpi.export',
      'reports.view', 'reports.daily', 'reports.weekly', 'reports.monthly', 'reports.financial', 'reports.export', 'reports.print',
      'settings.view', 'settings.company', 'settings.divisions', 'settings.project_types', 'settings.currencies', 'settings.activities', 'settings.holidays', 'settings.holidays.view', 'settings.holidays.create', 'settings.holidays.edit', 'settings.holidays.delete',
      'system.export', 'system.backup',
      'database.view', 'database.export', 'database.backup'
    ]
    WHEN role = 'engineer' THEN ARRAY[
      'projects.view', 'projects.create', 'projects.edit', 'projects.export',
      'boq.view', 'boq.create', 'boq.edit', 'boq.export',
      'kpi.view', 'kpi.create', 'kpi.edit', 'kpi.export',
      'reports.view', 'reports.daily', 'reports.weekly', 'reports.monthly', 'reports.export', 'reports.print'
    ]
    WHEN role = 'viewer' THEN ARRAY[
      'projects.view',
      'boq.view',
      'kpi.view',
      'reports.view', 'reports.daily', 'reports.weekly', 'reports.monthly'
    ]
    ELSE ARRAY[]::TEXT[]
  END,
  custom_permissions_enabled = FALSE,
  updated_at = NOW()
WHERE permissions IS NULL OR array_length(permissions, 1) IS NULL;

-- Create index for better performance on permissions queries
CREATE INDEX IF NOT EXISTS idx_users_permissions ON users USING GIN (permissions);
CREATE INDEX IF NOT EXISTS idx_users_custom_permissions ON users (custom_permissions_enabled);

-- Verify the changes
SELECT 
  id, 
  email, 
  role, 
  permissions, 
  custom_permissions_enabled,
  updated_at
FROM users 
LIMIT 5;

-- Show the final structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('permissions', 'custom_permissions_enabled');

