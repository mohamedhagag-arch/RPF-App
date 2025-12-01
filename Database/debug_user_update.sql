-- Debug user update issue
-- Check what's happening with the user data

-- Check the current state of the specific user
SELECT 
  id,
  email,
  full_name,
  first_name,
  last_name,
  role,
  permissions,
  array_length(permissions, 1) as permission_count,
  custom_permissions_enabled,
  created_at,
  updated_at,
  is_active
FROM users 
WHERE email = 'hajeta4728@aupvs.com';

-- Check if there are any recent updates to this user
SELECT 
  email,
  permissions,
  array_length(permissions, 1) as permission_count,
  updated_at,
  created_at,
  EXTRACT(EPOCH FROM (updated_at - created_at)) as seconds_between_create_update
FROM users 
WHERE email = 'hajeta4728@aupvs.com';

-- Check all users and their update patterns
SELECT 
  email,
  role,
  array_length(permissions, 1) as permission_count,
  updated_at,
  created_at,
  CASE 
    WHEN updated_at = created_at THEN 'Never Updated'
    WHEN updated_at > created_at THEN 'Has Been Updated'
    ELSE 'Unknown'
  END as update_status
FROM users 
ORDER BY updated_at DESC;

-- Check if there are any RLS policies that might be blocking updates
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'users';

-- Check user permissions for updates
SELECT 
  has_table_privilege('users', 'UPDATE') as can_update_users,
  has_table_privilege('users', 'SELECT') as can_select_users,
  current_user as current_db_user;

