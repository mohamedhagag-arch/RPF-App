-- =====================================================
-- Remove Old Transportation Columns
-- حذف الأعمدة القديمة من جدول النقل
-- =====================================================

-- Remove old columns that are no longer needed
DO $$ 
BEGIN
    -- Remove vehicle_type if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'transportation' AND column_name = 'vehicle_type'
    ) THEN
        ALTER TABLE transportation DROP COLUMN vehicle_type;
        RAISE NOTICE '✅ Removed vehicle_type column';
    END IF;

    -- Remove vehicle_number if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'transportation' AND column_name = 'vehicle_number'
    ) THEN
        ALTER TABLE transportation DROP COLUMN vehicle_number;
        RAISE NOTICE '✅ Removed vehicle_number column';
    END IF;

    -- Remove driver_name if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'transportation' AND column_name = 'driver_name'
    ) THEN
        ALTER TABLE transportation DROP COLUMN driver_name;
        RAISE NOTICE '✅ Removed driver_name column';
    END IF;

    -- Remove from_location if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'transportation' AND column_name = 'from_location'
    ) THEN
        ALTER TABLE transportation DROP COLUMN from_location;
        RAISE NOTICE '✅ Removed from_location column';
    END IF;

    -- Remove to_location if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'transportation' AND column_name = 'to_location'
    ) THEN
        ALTER TABLE transportation DROP COLUMN to_location;
        RAISE NOTICE '✅ Removed to_location column';
    END IF;

    -- Remove distance if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'transportation' AND column_name = 'distance'
    ) THEN
        ALTER TABLE transportation DROP COLUMN distance;
        RAISE NOTICE '✅ Removed distance column';
    END IF;

    -- Remove material if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'transportation' AND column_name = 'material'
    ) THEN
        ALTER TABLE transportation DROP COLUMN material;
        RAISE NOTICE '✅ Removed material column';
    END IF;

    -- Remove supplier if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'transportation' AND column_name = 'supplier'
    ) THEN
        ALTER TABLE transportation DROP COLUMN supplier;
        RAISE NOTICE '✅ Removed supplier column';
    END IF;

    -- Remove invoice_review if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'transportation' AND column_name = 'invoice_review'
    ) THEN
        ALTER TABLE transportation DROP COLUMN invoice_review;
        RAISE NOTICE '✅ Removed invoice_review column';
    END IF;

    -- Remove unit if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'transportation' AND column_name = 'unit'
    ) THEN
        ALTER TABLE transportation DROP COLUMN unit;
        RAISE NOTICE '✅ Removed unit column';
    END IF;

    -- Remove qtty if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'transportation' AND column_name = 'qtty'
    ) THEN
        ALTER TABLE transportation DROP COLUMN qtty;
        RAISE NOTICE '✅ Removed qtty column';
    END IF;

    -- Remove join_text if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'transportation' AND column_name = 'join_text'
    ) THEN
        ALTER TABLE transportation DROP COLUMN join_text;
        RAISE NOTICE '✅ Removed join_text column';
    END IF;

    -- Remove project_code if it exists (we use project_code_from and project_code_to instead)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'transportation' AND column_name = 'project_code'
    ) THEN
        ALTER TABLE transportation DROP COLUMN project_code;
        RAISE NOTICE '✅ Removed project_code column (using project_code_from and project_code_to instead)';
    END IF;

    RAISE NOTICE '✅ All old columns removed successfully!';
END $$;

-- Verify current columns
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'transportation'
ORDER BY ordinal_position;

-- Success message
SELECT '✅ Old columns removed successfully! Current columns listed above.' as status;

