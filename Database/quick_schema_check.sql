-- Quick check for missing columns issue
-- Run this first to see what columns are missing

-- Check if first_name and last_name columns exist
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name IN ('first_name', 'last_name', 'full_name', 'permissions', 'custom_permissions_enabled')
ORDER BY column_name;

-- If columns are missing, you'll see fewer results
-- Expected results should show:
-- first_name, last_name, full_name, permissions, custom_permissions_enabled

-- Also check the specific user data
SELECT 
  id,
  email,
  full_name,
  first_name,
  last_name,
  role,
  permissions,
  custom_permissions_enabled,
  updated_at
FROM users 
WHERE email = 'hajeta4728@aupvs.com';

