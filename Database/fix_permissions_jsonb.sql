-- Alternative fix: Keep permissions as JSONB type
-- This script converts TEXT[] to JSONB format

-- First, let's check the current structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('permissions', 'custom_permissions_enabled');

-- Add custom permissions enabled flag if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS custom_permissions_enabled BOOLEAN DEFAULT FALSE;

-- Update existing users to have default permissions based on their role (as JSONB)
UPDATE users 
SET 
  permissions = CASE 
    WHEN role = 'admin' THEN '[]'::jsonb -- Admin gets all permissions (empty array means all)
    WHEN role = 'manager' THEN '[
      "projects.view", "projects.create", "projects.edit", "projects.delete", "projects.export",
      "boq.view", "boq.create", "boq.edit", "boq.delete", "boq.approve", "boq.export",
      "kpi.view", "kpi.create", "kpi.edit", "kpi.delete", "kpi.export",
      "reports.view", "reports.daily", "reports.weekly", "reports.monthly", "reports.financial", "reports.export", "reports.print",
      "settings.view", "settings.company", "settings.divisions", "settings.project_types", "settings.currencies", "settings.activities", "settings.holidays", "settings.holidays.view", "settings.holidays.create", "settings.holidays.edit", "settings.holidays.delete",
      "system.export", "system.backup",
      "database.view", "database.export", "database.backup"
    ]'::jsonb
    WHEN role = 'engineer' THEN '[
      "projects.view", "projects.create", "projects.edit", "projects.export",
      "boq.view", "boq.create", "boq.edit", "boq.export",
      "kpi.view", "kpi.create", "kpi.edit", "kpi.export",
      "reports.view", "reports.daily", "reports.weekly", "reports.monthly", "reports.export", "reports.print"
    ]'::jsonb
    WHEN role = 'viewer' THEN '[
      "projects.view",
      "boq.view",
      "kpi.view",
      "reports.view", "reports.daily", "reports.weekly", "reports.monthly"
    ]'::jsonb
    ELSE '[]'::jsonb
  END,
  custom_permissions_enabled = FALSE,
  updated_at = NOW()
WHERE permissions IS NULL OR jsonb_array_length(permissions) = 0;

-- Create index for better performance on permissions queries (JSONB)
CREATE INDEX IF NOT EXISTS idx_users_permissions_gin ON users USING GIN (permissions);
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

