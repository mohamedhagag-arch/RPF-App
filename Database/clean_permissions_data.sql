-- Clean and fix existing permissions data
-- This script fixes any malformed permissions data

-- First, let's see what we have
SELECT 
  id,
  email,
  role,
  permissions,
  CASE 
    WHEN permissions IS NULL THEN 'NULL'
    WHEN array_length(permissions, 1) IS NOT NULL THEN 'TEXT_ARRAY'
    ELSE 'UNKNOWN'
  END as current_format,
  array_length(permissions, 1) as permission_count
FROM users 
WHERE permissions IS NOT NULL;

-- Clear all existing permissions to start fresh
UPDATE users 
SET 
  permissions = NULL,
  custom_permissions_enabled = FALSE,
  updated_at = NOW();

-- Now set proper default permissions based on role
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
  updated_at = NOW();

-- Verify the final result
SELECT 
  id,
  email,
  role,
  permissions,
  array_length(permissions, 1) as permission_count,
  custom_permissions_enabled
FROM users 
ORDER BY role, email;

-- Show summary by role
SELECT 
  role,
  COUNT(*) as user_count,
  AVG(array_length(permissions, 1)) as avg_permissions
FROM users 
WHERE permissions IS NOT NULL
GROUP BY role
ORDER BY role;
