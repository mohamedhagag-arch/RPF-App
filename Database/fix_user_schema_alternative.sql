-- Alternative fix: Update the code to use full_name instead of first_name/last_name
-- This script ensures the users table has the required structure

-- Check current structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY column_name;

-- Ensure full_name column exists (it should already exist)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Ensure all other required columns exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'viewer';

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS division TEXT;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS permissions TEXT[] DEFAULT NULL;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS custom_permissions_enabled BOOLEAN DEFAULT FALSE;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users (is_active);
CREATE INDEX IF NOT EXISTS idx_users_permissions ON users USING GIN (permissions);

-- Verify the final structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY column_name;

-- Show sample data
SELECT 
  id,
  email,
  full_name,
  role,
  permissions,
  array_length(permissions, 1) as permission_count,
  is_active,
  created_at,
  updated_at
FROM users 
LIMIT 5;

