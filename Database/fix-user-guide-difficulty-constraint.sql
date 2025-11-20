-- Fix user_guides difficulty_level constraint to allow NULL
-- The current constraint only allows 'beginner', 'intermediate', 'advanced'
-- But it should also allow NULL for optional difficulty level

-- Drop the existing constraint
ALTER TABLE user_guides 
DROP CONSTRAINT IF EXISTS user_guides_difficulty_level_check;

-- Recreate the constraint to allow NULL
ALTER TABLE user_guides 
ADD CONSTRAINT user_guides_difficulty_level_check 
CHECK (difficulty_level IS NULL OR difficulty_level IN ('beginner', 'intermediate', 'advanced'));

-- Verify the constraint
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'user_guides'::regclass
  AND conname = 'user_guides_difficulty_level_check';


