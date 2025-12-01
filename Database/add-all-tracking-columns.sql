-- ============================================================
-- ✅ Complete Script: Add ALL Tracking Columns to KPI Table
-- This script adds created_by, updated_by, and approval columns
-- ============================================================

DO $$ 
BEGIN
    -- 1. Check and add "created_by" column
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

    -- 2. Check and add "updated_by" column
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

    -- 3. Check and add "Approval Status" column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Planning Database - KPI' 
        AND column_name = 'Approval Status'
    ) THEN
        ALTER TABLE public."Planning Database - KPI"
        ADD COLUMN "Approval Status" TEXT;
        
        COMMENT ON COLUMN public."Planning Database - KPI"."Approval Status" IS 'Status of approval: null, pending, approved, or rejected';
        
        RAISE NOTICE '✅ Added "Approval Status" column';
    ELSE
        RAISE NOTICE '✅ "Approval Status" column already exists';
    END IF;

    -- 4. Check and add "Approved By" column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Planning Database - KPI' 
        AND column_name = 'Approved By'
    ) THEN
        ALTER TABLE public."Planning Database - KPI"
        ADD COLUMN "Approved By" TEXT;
        
        COMMENT ON COLUMN public."Planning Database - KPI"."Approved By" IS 'Email or name of the person who approved/rejected the KPI';
        
        RAISE NOTICE '✅ Added "Approved By" column';
    ELSE
        RAISE NOTICE '✅ "Approved By" column already exists';
    END IF;

    -- 5. Check and add "Approval Date" column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Planning Database - KPI' 
        AND column_name = 'Approval Date'
    ) THEN
        ALTER TABLE public."Planning Database - KPI"
        ADD COLUMN "Approval Date" TEXT;
        
        COMMENT ON COLUMN public."Planning Database - KPI"."Approval Date" IS 'Date when the KPI was approved or rejected (format: YYYY-MM-DD)';
        
        RAISE NOTICE '✅ Added "Approval Date" column';
    ELSE
        RAISE NOTICE '✅ "Approval Date" column already exists';
    END IF;

    -- Create indexes for better performance
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'Planning Database - KPI' 
        AND indexname = 'idx_kpi_approval_status'
    ) THEN
        CREATE INDEX idx_kpi_approval_status 
        ON public."Planning Database - KPI"("Approval Status");
        
        RAISE NOTICE '✅ Created index on "Approval Status"';
    ELSE
        RAISE NOTICE '✅ Index on "Approval Status" already exists';
    END IF;

    RAISE NOTICE '✅ All tracking columns checked and ready!';
END $$;

-- Verify all columns exist
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'Planning Database - KPI' 
AND column_name IN ('created_by', 'updated_by', 'Approval Status', 'Approved By', 'Approval Date')
ORDER BY column_name;

-- ============================================================
-- ✅ Script completed successfully!
-- All tracking columns are now available in the KPI table.
-- ============================================================

