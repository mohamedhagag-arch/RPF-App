-- Verify user permissions in database
-- Check if the permissions were actually saved

-- Check the specific user's current state
SELECT 
  id,
  email,
  full_name,
  role,
  permissions,
  array_length(permissions, 1) as permission_count,
  custom_permissions_enabled,
  created_at,
  updated_at
FROM users 
WHERE email = 'hajeta4728@aupvs.com';

-- Check all users with their permission counts
SELECT 
  email,
  role,
  array_length(permissions, 1) as permission_count,
  custom_permissions_enabled,
  updated_at
FROM users 
ORDER BY updated_at DESC
LIMIT 10;

-- Check if there are any users with null or empty permissions
SELECT 
  email,
  role,
  permissions,
  custom_permissions_enabled,
  updated_at
FROM users 
WHERE permissions IS NULL 
   OR array_length(permissions, 1) IS NULL 
   OR array_length(permissions, 1) = 0;

-- Check the most recently updated users
SELECT 
  email,
  role,
  array_length(permissions, 1) as permission_count,
  updated_at
FROM users 
WHERE updated_at >= NOW() - INTERVAL '1 hour'
ORDER BY updated_at DESC;

