-- =====================================================
-- Fix Transportation Table - Add Missing Columns
-- إصلاح جدول النقل - إضافة الأعمدة المفقودة
-- =====================================================

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add project_code_from if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'transportation'
        AND column_name = 'project_code_from'
    ) THEN
        ALTER TABLE transportation ADD COLUMN project_code_from TEXT;
        RAISE NOTICE '✅ Added project_code_from column';
    ELSE
        RAISE NOTICE '✅ project_code_from column already exists';
    END IF;

    -- Add project_code_to if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'transportation'
        AND column_name = 'project_code_to'
    ) THEN
        ALTER TABLE transportation ADD COLUMN project_code_to TEXT;
        RAISE NOTICE '✅ Added project_code_to column';
    ELSE
        RAISE NOTICE '✅ project_code_to column already exists';
    END IF;

    -- Add type if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'transportation'
        AND column_name = 'type'
    ) THEN
        ALTER TABLE transportation ADD COLUMN type TEXT;
        RAISE NOTICE '✅ Added type column';
    ELSE
        RAISE NOTICE '✅ type column already exists';
    END IF;

    -- Add category if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'transportation'
        AND column_name = 'category'
    ) THEN
        ALTER TABLE transportation ADD COLUMN category TEXT;
        RAISE NOTICE '✅ Added category column';
    ELSE
        RAISE NOTICE '✅ category column already exists';
    END IF;

    -- Add nos if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'transportation'
        AND column_name = 'nos'
    ) THEN
        ALTER TABLE transportation ADD COLUMN nos NUMERIC(15,2);
        RAISE NOTICE '✅ Added nos column';
    ELSE
        RAISE NOTICE '✅ nos column already exists';
    END IF;

    -- Add length_m if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'transportation'
        AND column_name = 'length_m'
    ) THEN
        ALTER TABLE transportation ADD COLUMN length_m NUMERIC(15,2);
        RAISE NOTICE '✅ Added length_m column';
    ELSE
        RAISE NOTICE '✅ length_m column already exists';
    END IF;

    -- Add items if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'transportation'
        AND column_name = 'items'
    ) THEN
        ALTER TABLE transportation ADD COLUMN items TEXT;
        RAISE NOTICE '✅ Added items column';
    ELSE
        RAISE NOTICE '✅ items column already exists';
    END IF;

    -- Add rate if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'transportation'
        AND column_name = 'rate'
    ) THEN
        ALTER TABLE transportation ADD COLUMN rate NUMERIC(15,2);
        RAISE NOTICE '✅ Added rate column';
    ELSE
        RAISE NOTICE '✅ rate column already exists';
    END IF;

    -- Add waiting_rate if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'transportation'
        AND column_name = 'waiting_rate'
    ) THEN
        ALTER TABLE transportation ADD COLUMN waiting_rate NUMERIC(15,2);
        RAISE NOTICE '✅ Added waiting_rate column';
    ELSE
        RAISE NOTICE '✅ waiting_rate column already exists';
    END IF;

    -- Add cost if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'transportation'
        AND column_name = 'cost'
    ) THEN
        ALTER TABLE transportation ADD COLUMN cost NUMERIC(15,2);
        RAISE NOTICE '✅ Added cost column';
    ELSE
        RAISE NOTICE '✅ cost column already exists';
    END IF;

    -- Add comment if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'transportation'
        AND column_name = 'comment'
    ) THEN
        ALTER TABLE transportation ADD COLUMN comment TEXT;
        RAISE NOTICE '✅ Added comment column';
    ELSE
        RAISE NOTICE '✅ comment column already exists';
    END IF;

    -- Add confirmed if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'transportation'
        AND column_name = 'confirmed'
    ) THEN
        ALTER TABLE transportation ADD COLUMN confirmed BOOLEAN DEFAULT FALSE;
        RAISE NOTICE '✅ Added confirmed column';
    ELSE
        RAISE NOTICE '✅ confirmed column already exists';
    END IF;

    -- Add date if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'transportation'
        AND column_name = 'date'
    ) THEN
        ALTER TABLE transportation ADD COLUMN date DATE;
        RAISE NOTICE '✅ Added date column';
    ELSE
        RAISE NOTICE '✅ date column already exists';
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_transportation_project_code_from ON transportation(project_code_from);
CREATE INDEX IF NOT EXISTS idx_transportation_project_code_to ON transportation(project_code_to);
CREATE INDEX IF NOT EXISTS idx_transportation_category ON transportation(category);
CREATE INDEX IF NOT EXISTS idx_transportation_type ON transportation(type);
CREATE INDEX IF NOT EXISTS idx_transportation_date ON transportation(date DESC);
CREATE INDEX IF NOT EXISTS idx_transportation_created_at ON transportation(created_at DESC);

-- Verify all columns exist
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'transportation'
ORDER BY ordinal_position;

-- Success message
SELECT '✅ Transportation table fixed successfully!' as status;

