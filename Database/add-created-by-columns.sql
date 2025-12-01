-- ============================================================
-- ✅ Add created_by and updated_by columns to KPI table
-- This script adds tracking columns for who created and updated KPIs
-- ============================================================

DO $$ 
BEGIN
    -- Check and add "created_by" column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Planning Database - KPI' 
        AND column_name = 'created_by'
    ) THEN
        ALTER TABLE public."Planning Database - KPI"
        ADD COLUMN "created_by" TEXT;
        
        COMMENT ON COLUMN public."Planning Database - KPI"."created_by" IS 'Email or ID of the user who created the KPI';
        
        RAISE NOTICE '✅ Added "created_by" column';
    ELSE
        RAISE NOTICE '✅ "created_by" column already exists';
    END IF;

    -- Check and add "updated_by" column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Planning Database - KPI' 
        AND column_name = 'updated_by'
    ) THEN
        ALTER TABLE public."Planning Database - KPI"
        ADD COLUMN "updated_by" TEXT;
        
        COMMENT ON COLUMN public."Planning Database - KPI"."updated_by" IS 'Email or ID of the user who last updated the KPI';
        
        RAISE NOTICE '✅ Added "updated_by" column';
    ELSE
        RAISE NOTICE '✅ "updated_by" column already exists';
    END IF;

    RAISE NOTICE '✅ All tracking columns checked and ready!';
END $$;

-- Verify the columns exist
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'Planning Database - KPI' 
AND column_name IN ('created_by', 'updated_by')
ORDER BY column_name;

-- ============================================================
-- ✅ Script completed successfully!
-- ============================================================

