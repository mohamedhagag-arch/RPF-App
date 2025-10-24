-- Verify that the user changes are actually saved in the database
-- This will show the current state from the database perspective

-- Check the specific user that was updated
SELECT 
  id,
  email,
  full_name,
  role,
  permissions,
  array_length(permissions, 1) as permission_count,
  custom_permissions_enabled,
  created_at,
  updated_at,
  EXTRACT(EPOCH FROM (updated_at - created_at)) as seconds_between_create_update
FROM users 
WHERE email = 'hajeta4728@aupvs.com';

-- Check all users and their recent updates
SELECT 
  email,
  role,
  permissions,
  array_length(permissions, 1) as permission_count,
  updated_at,
  created_at,
  CASE 
    WHEN updated_at = created_at THEN 'Never Updated'
    WHEN updated_at > created_at THEN 'Has Been Updated'
    ELSE 'Unknown'
  END as update_status,
  EXTRACT(EPOCH FROM (updated_at - created_at)) as seconds_since_creation
FROM users 
ORDER BY updated_at DESC;

-- Check if there are any RLS policies affecting data visibility
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

-- Check current database user and permissions
SELECT 
  current_user as current_db_user,
  session_user as session_user,
  has_table_privilege('users', 'SELECT') as can_select_users,
  has_table_privilege('users', 'UPDATE') as can_update_users;

