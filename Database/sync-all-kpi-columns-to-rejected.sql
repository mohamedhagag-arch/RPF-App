-- ============================================================
-- Sync ALL columns from Planning Database - KPI to kpi_rejected
-- This script ensures kpi_rejected has all columns that exist
-- in the main KPI table, preventing "column not found" errors
-- ============================================================

DO $$ 
DECLARE
    main_kpi_column RECORD;
    column_exists BOOLEAN;
    columns_added INTEGER := 0;
    columns_skipped INTEGER := 0;
BEGIN
    RAISE NOTICE '🔄 Starting column sync from Planning Database - KPI to kpi_rejected...';
    RAISE NOTICE '============================================================';
    
    -- Loop through all columns in the main KPI table
    FOR main_kpi_column IN 
        SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'Planning Database - KPI'
        AND column_name NOT IN ('id') -- Skip id, it's auto-generated
        ORDER BY ordinal_position
    LOOP
        -- Check if column exists in kpi_rejected table
        SELECT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'kpi_rejected' 
            AND column_name = main_kpi_column.column_name
        ) INTO column_exists;
        
        -- If column doesn't exist in rejected table, add it
        IF NOT column_exists THEN
            -- Build ALTER TABLE statement dynamically
            EXECUTE format(
                'ALTER TABLE public.kpi_rejected ADD COLUMN %I %s',
                main_kpi_column.column_name,
                main_kpi_column.data_type
            );
            
            -- Set default if exists
            IF main_kpi_column.column_default IS NOT NULL THEN
                EXECUTE format(
                    'ALTER TABLE public.kpi_rejected ALTER COLUMN %I SET DEFAULT %s',
                    main_kpi_column.column_name,
                    main_kpi_column.column_default
                );
            END IF;
            
            -- Set nullable if needed
            IF main_kpi_column.is_nullable = 'NO' THEN
                EXECUTE format(
                    'ALTER TABLE public.kpi_rejected ALTER COLUMN %I SET NOT NULL',
                    main_kpi_column.column_name
                );
            END IF;
            
            columns_added := columns_added + 1;
            RAISE NOTICE '✅ Added column: % (Type: %)', main_kpi_column.column_name, main_kpi_column.data_type;
        ELSE
            columns_skipped := columns_skipped + 1;
            RAISE NOTICE 'ℹ️  Column already exists: %', main_kpi_column.column_name;
        END IF;
    END LOOP;
    
    RAISE NOTICE '============================================================';
    RAISE NOTICE '✅ Sync complete!';
    RAISE NOTICE '   Columns added: %', columns_added;
    RAISE NOTICE '   Columns skipped (already exist): %', columns_skipped;
    RAISE NOTICE '============================================================';
END $$;

-- ============================================================
-- Create indexes for commonly used columns (if they don't exist)
-- ============================================================

-- Index for Activity Division (if column exists)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'kpi_rejected' 
        AND column_name = 'Activity Division'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_kpi_rejected_activity_division 
          ON public.kpi_rejected("Activity Division");
        RAISE NOTICE '✅ Created index for Activity Division';
    END IF;
END $$;

-- Index for Zone Number (if column exists)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'kpi_rejected' 
        AND column_name = 'Zone Number'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_kpi_rejected_zone_number 
          ON public.kpi_rejected("Zone Number");
        RAISE NOTICE '✅ Created index for Zone Number';
    END IF;
END $$;

-- Index for Activity Timing (if column exists)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'kpi_rejected' 
        AND column_name = 'Activity Timing'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_kpi_rejected_activity_timing 
          ON public.kpi_rejected("Activity Timing");
        RAISE NOTICE '✅ Created index for Activity Timing';
    END IF;
END $$;

-- ============================================================
-- Verify: Show all columns in kpi_rejected table
-- ============================================================

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public'
AND table_name = 'kpi_rejected'
ORDER BY ordinal_position;

-- ============================================================
-- Compare: Show columns in main KPI table for reference
-- ============================================================

SELECT 
    'Main KPI Table Columns:' as info,
    COUNT(*) as total_columns
FROM information_schema.columns 
WHERE table_schema = 'public'
AND table_name = 'Planning Database - KPI'
AND column_name != 'id'

UNION ALL

SELECT 
    'Rejected KPI Table Columns:' as info,
    COUNT(*) as total_columns
FROM information_schema.columns 
WHERE table_schema = 'public'
AND table_name = 'kpi_rejected'
AND column_name NOT IN ('Rejection Reason', 'Rejected By', 'Rejected Date', 'Original KPI ID');

-- Success message
SELECT '✅ All columns from Planning Database - KPI have been synced to kpi_rejected table!' as status;

