-- 🧪 Test Script: Instant Permissions Update
-- سكريبت اختبار: تحديث الصلاحيات الفوري

-- Step 1: Check current state
SELECT 
  email,
  role,
  custom_permissions_enabled,
  array_length(permissions, 1) as permissions_count,
  permissions,
  updated_at
FROM users
ORDER BY email;

-- Step 2: Test permission update for a specific user
-- Replace 'test@example.com' with actual email
/*
UPDATE users
SET 
  permissions = ARRAY[
    'projects.view',
    'projects.create',
    'projects.edit',
    'boq.view',
    'boq.create',
    'kpi.view',
    'kpi.create'
  ],
  custom_permissions_enabled = true,
  updated_at = NOW()
WHERE email = 'test@example.com'
RETURNING email, permissions, custom_permissions_enabled, updated_at;
*/

-- Step 3: Test role-based permissions
/*
UPDATE users
SET 
  custom_permissions_enabled = false,
  permissions = NULL,
  updated_at = NOW()
WHERE email = 'test@example.com'
RETURNING email, role, custom_permissions_enabled, permissions, updated_at;
*/

-- Step 4: Test specific permission removal
/*
UPDATE users
SET 
  permissions = array_remove(permissions, 'projects.create'),
  updated_at = NOW()
WHERE email = 'test@example.com'
RETURNING email, permissions, updated_at;
*/

-- Step 5: Test specific permission addition
/*
UPDATE users
SET 
  permissions = array_append(permissions, 'users.manage'),
  updated_at = NOW()
WHERE email = 'test@example.com'
RETURNING email, permissions, updated_at;
*/

-- Step 6: Test role change with permissions
/*
UPDATE users
SET 
  role = 'manager',
  permissions = CASE 
    WHEN custom_permissions_enabled = true THEN permissions
    ELSE ARRAY[
      'projects.view', 'projects.create', 'projects.edit', 'projects.delete', 'projects.export',
      'boq.view', 'boq.create', 'boq.edit', 'boq.approve', 'boq.export',
      'kpi.view', 'kpi.create', 'kpi.edit', 'kpi.export',
      'reports.view', 'reports.create', 'reports.export', 'reports.daily', 'reports.weekly', 'reports.monthly',
      'users.view',
      'settings.view', 'settings.holidays.view', 'settings.holidays.create', 'settings.holidays.edit', 'settings.holidays.delete',
      'dashboard.view'
    ]
  END,
  updated_at = NOW()
WHERE email = 'test@example.com'
RETURNING email, role, permissions, custom_permissions_enabled, updated_at;
*/

-- Step 7: Verify permissions are working
/*
SELECT 
  email,
  role,
  custom_permissions_enabled,
  permissions,
  CASE 
    WHEN 'projects.view' = ANY(permissions) THEN '✅ Has projects.view'
    ELSE '❌ Missing projects.view'
  END as projects_view_check,
  CASE 
    WHEN 'projects.create' = ANY(permissions) THEN '✅ Has projects.create'
    ELSE '❌ Missing projects.create'
  END as projects_create_check,
  CASE 
    WHEN 'users.manage' = ANY(permissions) THEN '✅ Has users.manage'
    ELSE '❌ Missing users.manage'
  END as users_manage_check,
  updated_at
FROM users
WHERE email = 'test@example.com';
*/

-- Step 8: Test bulk permission update
/*
UPDATE users
SET 
  permissions = ARRAY(
    SELECT unnest(permissions) 
    EXCEPT 
    SELECT unnest(ARRAY['projects.create', 'projects.edit', 'projects.delete'])
  ),
  updated_at = NOW()
WHERE role = 'viewer'
RETURNING email, role, permissions, updated_at;
*/

-- Step 9: Test restore default permissions
/*
UPDATE users
SET 
  permissions = CASE role
    WHEN 'admin' THEN ARRAY[
      'projects.view', 'projects.create', 'projects.edit', 'projects.delete', 'projects.export',
      'boq.view', 'boq.create', 'boq.edit', 'boq.delete', 'boq.approve', 'boq.export',
      'kpi.view', 'kpi.create', 'kpi.edit', 'kpi.delete', 'kpi.export',
      'reports.view', 'reports.create', 'reports.edit', 'reports.delete', 'reports.export', 'reports.daily', 'reports.weekly', 'reports.monthly', 'reports.custom',
      'users.view', 'users.create', 'users.edit', 'users.delete', 'users.manage_permissions',
      'settings.view', 'settings.edit', 'settings.company', 'settings.holidays.view', 'settings.holidays.create', 'settings.holidays.edit', 'settings.holidays.delete', 'settings.activities',
      'database.view', 'database.backup', 'database.restore', 'database.clear', 'database.templates', 'database.analyze', 'database.cleanup',
      'dashboard.view'
    ]
    WHEN 'manager' THEN ARRAY[
      'projects.view', 'projects.create', 'projects.edit', 'projects.delete', 'projects.export',
      'boq.view', 'boq.create', 'boq.edit', 'boq.approve', 'boq.export',
      'kpi.view', 'kpi.create', 'kpi.edit', 'kpi.export',
      'reports.view', 'reports.create', 'reports.export', 'reports.daily', 'reports.weekly', 'reports.monthly',
      'users.view',
      'settings.view', 'settings.holidays.view', 'settings.holidays.create', 'settings.holidays.edit', 'settings.holidays.delete',
      'dashboard.view'
    ]
    WHEN 'engineer' THEN ARRAY[
      'projects.view', 'projects.create', 'projects.edit',
      'boq.view', 'boq.create', 'boq.edit',
      'kpi.view', 'kpi.create', 'kpi.edit',
      'reports.view', 'reports.daily', 'reports.weekly',
      'settings.view',
      'dashboard.view'
    ]
    ELSE ARRAY[
      'projects.view',
      'boq.view',
      'kpi.view',
      'reports.view', 'reports.daily', 'reports.weekly', 'reports.monthly',
      'settings.view',
      'database.view',
      'dashboard.view'
    ]
  END,
  custom_permissions_enabled = false,
  updated_at = NOW()
WHERE email = 'test@example.com'
RETURNING email, role, permissions, custom_permissions_enabled, updated_at;
*/

-- Step 10: Final verification
SELECT 
  email,
  role,
  custom_permissions_enabled,
  array_length(permissions, 1) as permissions_count,
  permissions,
  updated_at,
  CASE 
    WHEN updated_at > NOW() - INTERVAL '1 minute' THEN '✅ Recently updated'
    ELSE '⚠️ Not recently updated'
  END as update_status
FROM users
ORDER BY updated_at DESC;
