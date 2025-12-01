-- Simple Reset Permissions Script
-- This script clears all permissions and sets proper defaults
-- No complex checks, just clean reset

-- Step 1: Clear all existing permissions
UPDATE users 
SET 
  permissions = NULL,
  custom_permissions_enabled = FALSE,
  updated_at = NOW();

-- Step 2: Set proper default permissions based on role
UPDATE users 
SET 
  permissions = CASE 
    WHEN role = 'admin' THEN ARRAY[]::TEXT[]
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

-- Step 3: Verify the results
SELECT 
  id,
  email,
  role,
  array_length(permissions, 1) as permission_count,
  custom_permissions_enabled
FROM users 
ORDER BY role, email;

-- Step 4: Show summary
SELECT 
  role,
  COUNT(*) as user_count,
  ROUND(AVG(array_length(permissions, 1))) as avg_permissions
FROM users 
WHERE permissions IS NOT NULL
GROUP BY role
ORDER BY role;

