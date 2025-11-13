-- ============================================================
-- ✅ Add Project Sub Code Column to Projects Table
-- ============================================================
-- This script adds the "Project Sub Code" column to the
-- "Planning Database - ProjectsList" table in Supabase
-- ============================================================

-- Add Project Sub Code column if it doesn't exist
DO $$ 
BEGIN
    -- Check if column already exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'Planning Database - ProjectsList'
        AND column_name = 'Project Sub Code'
    ) THEN
        -- Add the column
        ALTER TABLE public."Planning Database - ProjectsList" 
        ADD COLUMN "Project Sub Code" TEXT;
        
        RAISE NOTICE '✅ Successfully added "Project Sub Code" column';
    ELSE
        RAISE NOTICE '✅ "Project Sub Code" column already exists';
    END IF;
END $$;

-- Also try with hyphenated name (Project Sub-Code)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'Planning Database - ProjectsList'
        AND column_name = 'Project Sub-Code'
    ) THEN
        ALTER TABLE public."Planning Database - ProjectsList" 
        ADD COLUMN "Project Sub-Code" TEXT;
        
        RAISE NOTICE '✅ Successfully added "Project Sub-Code" column';
    ELSE
        RAISE NOTICE '✅ "Project Sub-Code" column already exists';
    END IF;
END $$;

-- Verify the column was added
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public'
AND table_name = 'Planning Database - ProjectsList'
AND (column_name = 'Project Sub Code' OR column_name = 'Project Sub-Code')
ORDER BY column_name;

-- Success message
SELECT '✅ Project Sub Code column(s) added successfully!' as status;

