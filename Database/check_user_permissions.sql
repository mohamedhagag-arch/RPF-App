-- Check specific user permissions in database
-- Replace 'hajeta4728@aupvs.com' with the email you're testing

-- Check the user's current permissions
SELECT 
  id,
  email,
  full_name,
  role,
  permissions,
  array_length(permissions, 1) as permission_count,
  custom_permissions_enabled,
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

-- Check if there are any users with null permissions
SELECT COUNT(*) as users_with_null_permissions
FROM users 
WHERE permissions IS NULL;

-- Check if there are any users with empty permissions
SELECT COUNT(*) as users_with_empty_permissions
FROM users 
WHERE array_length(permissions, 1) IS NULL OR array_length(permissions, 1) = 0;

