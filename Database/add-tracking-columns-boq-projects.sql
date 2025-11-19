-- ============================================================
-- ✅ Add created_by and updated_by columns to BOQ and Projects tables
-- This script adds tracking columns for who created and updated records
-- ============================================================

DO $$ 
BEGIN
    -- ============================================================
    -- 1. BOQ Table: "Planning Database - BOQ Rates"
    -- ============================================================
    
    -- Check and add "created_by" column to BOQ
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Planning Database - BOQ Rates' 
        AND column_name = 'created_by'
    ) THEN
        ALTER TABLE public."Planning Database - BOQ Rates"
        ADD COLUMN "created_by" TEXT;
        
        COMMENT ON COLUMN public."Planning Database - BOQ Rates"."created_by" IS 'Email or ID of the user who created the BOQ activity';
        
        RAISE NOTICE '✅ Added "created_by" column to BOQ table';
    ELSE
        RAISE NOTICE '✅ "created_by" column already exists in BOQ table';
    END IF;

    -- Check and add "updated_by" column to BOQ
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Planning Database - BOQ Rates' 
        AND column_name = 'updated_by'
    ) THEN
        ALTER TABLE public."Planning Database - BOQ Rates"
        ADD COLUMN "updated_by" TEXT;
        
        COMMENT ON COLUMN public."Planning Database - BOQ Rates"."updated_by" IS 'Email or ID of the user who last updated the BOQ activity';
        
        RAISE NOTICE '✅ Added "updated_by" column to BOQ table';
    ELSE
        RAISE NOTICE '✅ "updated_by" column already exists in BOQ table';
    END IF;

    -- ============================================================
    -- 2. Projects Table: "Planning Database - ProjectsList"
    -- ============================================================
    
    -- Check and add "created_by" column to Projects
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Planning Database - ProjectsList' 
        AND column_name = 'created_by'
    ) THEN
        ALTER TABLE public."Planning Database - ProjectsList"
        ADD COLUMN "created_by" TEXT;
        
        COMMENT ON COLUMN public."Planning Database - ProjectsList"."created_by" IS 'Email or ID of the user who created the project';
        
        RAISE NOTICE '✅ Added "created_by" column to Projects table';
    ELSE
        RAISE NOTICE '✅ "created_by" column already exists in Projects table';
    END IF;

    -- Check and add "updated_by" column to Projects
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Planning Database - ProjectsList' 
        AND column_name = 'updated_by'
    ) THEN
        ALTER TABLE public."Planning Database - ProjectsList"
        ADD COLUMN "updated_by" TEXT;
        
        COMMENT ON COLUMN public."Planning Database - ProjectsList"."updated_by" IS 'Email or ID of the user who last updated the project';
        
        RAISE NOTICE '✅ Added "updated_by" column to Projects table';
    ELSE
        RAISE NOTICE '✅ "updated_by" column already exists in Projects table';
    END IF;

    RAISE NOTICE '✅ All tracking columns checked and ready for BOQ and Projects!';
END $$;

-- ============================================================
-- Verify the columns exist
-- ============================================================

-- Verify BOQ columns
SELECT 
    'BOQ' as table_name,
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'Planning Database - BOQ Rates' 
AND column_name IN ('created_by', 'updated_by')
ORDER BY column_name;

-- Verify Projects columns
SELECT 
    'Projects' as table_name,
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'Planning Database - ProjectsList' 
AND column_name IN ('created_by', 'updated_by')
ORDER BY column_name;

-- ============================================================
-- ✅ Script completed successfully!
-- ============================================================

