-- Verify permissions column type and structure
-- Run this to check if the permissions column is properly set up as TEXT[]

-- Check the current column structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('permissions', 'custom_permissions_enabled')
ORDER BY column_name;

-- Check sample data to see the format
SELECT 
  id,
  email,
  role,
  permissions,
  custom_permissions_enabled,
  updated_at
FROM users 
LIMIT 3;

-- Test inserting a simple permissions array
-- This should work if the column is properly set up as TEXT[]
-- (Uncomment to test - but be careful!)
/*
UPDATE users 
SET permissions = ARRAY['projects.view', 'projects.create']::TEXT[]
WHERE id = (SELECT id FROM users LIMIT 1)
RETURNING id, email, permissions;
*/

-- Check if there are any existing malformed permissions
SELECT 
  id,
  email,
  role,
  permissions,
  CASE 
    WHEN permissions IS NULL THEN 'NULL'
    WHEN array_length(permissions, 1) IS NOT NULL THEN 'TEXT_ARRAY'
    WHEN array_length(permissions, 1) IS NULL AND permissions IS NOT NULL THEN 'EMPTY_ARRAY'
    ELSE 'UNKNOWN'
  END as detected_format,
  array_length(permissions, 1) as permission_count
FROM users 
WHERE permissions IS NOT NULL
LIMIT 5;
