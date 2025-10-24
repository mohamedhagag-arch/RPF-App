-- Test if users can see each other's data
-- This will help identify if RLS policies are blocking cross-user visibility

-- First, check what user we're running as
SELECT 
  current_user as current_db_user,
  session_user as session_user,
  current_setting('request.jwt.claims', true) as jwt_claims;

-- Test 1: Can we see the updated user's data?
SELECT 
  'Test 1: Can see updated user data' as test_name,
  COUNT(*) as user_count,
  MAX(array_length(permissions, 1)) as max_permissions,
  MAX(updated_at) as latest_update
FROM users 
WHERE email = 'hajeta4728@aupvs.com';

-- Test 2: Can we see all users?
SELECT 
  'Test 2: Can see all users' as test_name,
  COUNT(*) as total_users,
  COUNT(CASE WHEN updated_at > created_at THEN 1 END) as updated_users,
  COUNT(CASE WHEN updated_at = created_at THEN 1 END) as never_updated_users
FROM users;

-- Test 3: Check specific permission counts for all users
SELECT 
  email,
  role,
  array_length(permissions, 1) as permission_count,
  updated_at,
  CASE 
    WHEN updated_at > created_at THEN 'Updated'
    WHEN updated_at = created_at THEN 'Never Updated'
    ELSE 'Unknown'
  END as status
FROM users 
ORDER BY updated_at DESC;

-- Test 4: Check if RLS is affecting visibility
-- This will show if different users see different data
SELECT 
  'RLS Test' as test_type,
  COUNT(*) as visible_users,
  COUNT(CASE WHEN email = 'hajeta4728@aupvs.com' THEN 1 END) as can_see_target_user,
  COUNT(CASE WHEN email = 'admin@rabat.com' THEN 1 END) as can_see_admin_user
FROM users;

-- Test 5: Check the exact permissions for the updated user
SELECT 
  email,
  permissions,
  array_length(permissions, 1) as permission_count,
  custom_permissions_enabled,
  updated_at
FROM users 
WHERE email = 'hajeta4728@aupvs.com';

