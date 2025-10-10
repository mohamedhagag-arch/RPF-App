-- ✅ Quick Permissions Test
-- اختبار سريع للصلاحيات

-- 1️⃣ Check current permissions for all users
SELECT 
  email,
  role,
  custom_permissions_enabled,
  CASE 
    WHEN permissions IS NULL THEN 'NULL'
    WHEN array_length(permissions, 1) IS NULL THEN 'EMPTY ARRAY'
    ELSE array_length(permissions, 1)::text || ' permissions'
  END as permissions_status,
  permissions
FROM users
ORDER BY email;

-- 2️⃣ Test: Remove projects.view from a specific user (replace email)
-- To test, uncomment and replace with actual email:
/*
UPDATE users
SET 
  permissions = array_remove(permissions, 'projects.view'),
  custom_permissions_enabled = true,
  updated_at = NOW()
WHERE email = 'test@example.com'
RETURNING email, permissions;
*/

-- 3️⃣ Test: Remove multiple permissions
/*
UPDATE users
SET 
  permissions = ARRAY(
    SELECT unnest(permissions) 
    EXCEPT 
    SELECT unnest(ARRAY['projects.view', 'projects.create', 'projects.edit', 'projects.delete'])
  ),
  custom_permissions_enabled = true,
  updated_at = NOW()
WHERE email = 'test@example.com'
RETURNING email, permissions;
*/

-- 4️⃣ Test: Restore default permissions based on role
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
RETURNING email, role, permissions;
*/

