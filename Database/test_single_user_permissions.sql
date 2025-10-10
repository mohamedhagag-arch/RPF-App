-- Test permissions update on a single user
-- This helps verify the setup works before applying to all users

-- Step 1: Check current state of one user
SELECT 
  id,
  email,
  role,
  permissions,
  custom_permissions_enabled
FROM users 
LIMIT 1;

-- Step 2: Test update on one user (update the WHERE clause with a real user ID)
-- Replace 'YOUR_USER_EMAIL_HERE' with an actual email from your database
UPDATE users 
SET 
  permissions = ARRAY['projects.view', 'projects.create', 'boq.view']::TEXT[],
  custom_permissions_enabled = FALSE,
  updated_at = NOW()
WHERE email = 'YOUR_USER_EMAIL_HERE'
RETURNING id, email, role, permissions, array_length(permissions, 1) as permission_count;

-- Step 3: Verify the update worked
SELECT 
  id,
  email,
  role,
  permissions,
  array_length(permissions, 1) as permission_count,
  custom_permissions_enabled,
  updated_at
FROM users 
WHERE email = 'YOUR_USER_EMAIL_HERE';

-- Step 4: If the above works, you can apply to all users
-- Uncomment the following to apply to all users:

/*
UPDATE users 
SET 
  permissions = CASE 
    WHEN role = 'admin' THEN ARRAY[]::TEXT[]
    WHEN role = 'manager' THEN ARRAY[
      'projects.view', 'projects.create', 'projects.edit', 'projects.delete', 'projects.export',
      'boq.view', 'boq.create', 'boq.edit', 'boq.delete', 'boq.approve', 'boq.export',
      'kpi.view', 'kpi.create', 'kpi.edit', 'kpi.delete', 'kpi.export',
      'reports.view', 'reports.daily', 'reports.weekly', 'reports.monthly', 'reports.financial', 'reports.export', 'reports.print',
      'settings.view', 'settings.company', 'settings.divisions', 'settings.project_types', 'settings.currencies', 'settings.activities', 'settings.holidays',
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
*/

