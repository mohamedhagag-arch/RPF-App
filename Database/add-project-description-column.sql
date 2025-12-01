-- ============================================================
-- ✅ Add Project Description Column to Projects Table
-- ============================================================
-- This script adds the "Project Description" column to the
-- "Planning Database - ProjectsList" table in Supabase
-- ============================================================

-- Add Project Description column if it doesn't exist
DO $$ 
BEGIN
    -- Check if column already exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'Planning Database - ProjectsList'
        AND column_name = 'Project Description'
    ) THEN
        -- Add the column
        ALTER TABLE "Planning Database - ProjectsList" 
        ADD COLUMN "Project Description" TEXT;
        
        RAISE NOTICE '✅ Successfully added "Project Description" column';
    ELSE
        RAISE NOTICE '✅ "Project Description" column already exists';
    END IF;
END $$;

-- Verify the column was added
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'Planning Database - ProjectsList'
AND column_name = 'Project Description';

-- Success message
SELECT '✅ Project Description column added successfully!' as status;


