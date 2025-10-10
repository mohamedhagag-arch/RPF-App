-- Add missing columns to users table
-- This script adds first_name and last_name columns that are missing

-- First, let's check the current structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY column_name;

-- Add first_name column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS first_name TEXT;

-- Add last_name column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Add comment to explain the columns
COMMENT ON COLUMN users.first_name IS 'User first name';
COMMENT ON COLUMN users.last_name IS 'User last name';

-- Update existing users to populate first_name and last_name from full_name
-- This extracts first and last name from the full_name field
UPDATE users 
SET 
  first_name = CASE 
    WHEN full_name IS NOT NULL AND full_name != '' THEN
      CASE 
        WHEN position(' ' in full_name) > 0 THEN
          split_part(full_name, ' ', 1)
        ELSE full_name
      END
    ELSE NULL
  END,
  last_name = CASE 
    WHEN full_name IS NOT NULL AND full_name != '' THEN
      CASE 
        WHEN position(' ' in full_name) > 0 THEN
          substring(full_name from position(' ' in full_name) + 1)
        ELSE NULL
      END
    ELSE NULL
  END,
  updated_at = NOW()
WHERE first_name IS NULL OR last_name IS NULL;

-- Verify the changes
SELECT 
  id,
  email,
  full_name,
  first_name,
  last_name,
  role,
  updated_at
FROM users 
LIMIT 5;

-- Show the final structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY column_name;

