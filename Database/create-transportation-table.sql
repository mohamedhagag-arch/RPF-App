-- =====================================================
-- Create Transportation Table
-- إنشاء جدول النقل
-- =====================================================

-- Create transportation table if it doesn't exist
CREATE TABLE IF NOT EXISTS transportation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add columns if they don't exist (safe for existing tables)
DO $$ 
BEGIN
    -- Add date if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'transportation' AND column_name = 'date'
    ) THEN
        ALTER TABLE transportation ADD COLUMN date DATE;
    END IF;

    -- Add type if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'transportation' AND column_name = 'type'
    ) THEN
        ALTER TABLE transportation ADD COLUMN type TEXT;
    END IF;

    -- Add category if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'transportation' AND column_name = 'category'
    ) THEN
        ALTER TABLE transportation ADD COLUMN category TEXT;
    END IF;

    -- Add nos if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'transportation' AND column_name = 'nos'
    ) THEN
        ALTER TABLE transportation ADD COLUMN nos NUMERIC(15,2);
    END IF;

    -- Add length_m if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'transportation' AND column_name = 'length_m'
    ) THEN
        ALTER TABLE transportation ADD COLUMN length_m NUMERIC(15,2);
    END IF;

    -- Add items if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'transportation' AND column_name = 'items'
    ) THEN
        ALTER TABLE transportation ADD COLUMN items TEXT;
    END IF;

    -- Add project_code_from if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'transportation' AND column_name = 'project_code_from'
    ) THEN
        ALTER TABLE transportation ADD COLUMN project_code_from TEXT;
    END IF;

    -- Add project_code_to if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'transportation' AND column_name = 'project_code_to'
    ) THEN
        ALTER TABLE transportation ADD COLUMN project_code_to TEXT;
    END IF;

    -- Add rate if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'transportation' AND column_name = 'rate'
    ) THEN
        ALTER TABLE transportation ADD COLUMN rate NUMERIC(15,2);
    END IF;

    -- Add waiting_rate if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'transportation' AND column_name = 'waiting_rate'
    ) THEN
        ALTER TABLE transportation ADD COLUMN waiting_rate NUMERIC(15,2);
    END IF;

    -- Add cost if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'transportation' AND column_name = 'cost'
    ) THEN
        ALTER TABLE transportation ADD COLUMN cost NUMERIC(15,2);
    END IF;

    -- Add comment if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'transportation' AND column_name = 'comment'
    ) THEN
        ALTER TABLE transportation ADD COLUMN comment TEXT;
    END IF;

    -- Add confirmed if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'transportation' AND column_name = 'confirmed'
    ) THEN
        ALTER TABLE transportation ADD COLUMN confirmed BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_transportation_project_code_from ON transportation(project_code_from);
CREATE INDEX IF NOT EXISTS idx_transportation_project_code_to ON transportation(project_code_to);
CREATE INDEX IF NOT EXISTS idx_transportation_category ON transportation(category);
CREATE INDEX IF NOT EXISTS idx_transportation_type ON transportation(type);
CREATE INDEX IF NOT EXISTS idx_transportation_date ON transportation(date DESC);
CREATE INDEX IF NOT EXISTS idx_transportation_created_at ON transportation(created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE transportation IS 'جدول النقل - Transportation Database';
COMMENT ON COLUMN transportation.id IS 'المعرف الفريد لسجل النقل';
COMMENT ON COLUMN transportation.date IS 'التاريخ';
COMMENT ON COLUMN transportation.type IS 'النوع';
COMMENT ON COLUMN transportation.category IS 'الفئة';
COMMENT ON COLUMN transportation.nos IS 'العدد';
COMMENT ON COLUMN transportation.length_m IS 'الطول (متر)';
COMMENT ON COLUMN transportation.items IS 'العناصر';
COMMENT ON COLUMN transportation.project_code_from IS 'رمز المشروع (من)';
COMMENT ON COLUMN transportation.project_code_to IS 'رمز المشروع (إلى)';
COMMENT ON COLUMN transportation.rate IS 'السعر';
COMMENT ON COLUMN transportation.waiting_rate IS 'سعر الانتظار';
COMMENT ON COLUMN transportation.cost IS 'التكلفة';
COMMENT ON COLUMN transportation.comment IS 'تعليق';
COMMENT ON COLUMN transportation.confirmed IS 'مؤكد';

-- Disable RLS for transportation (similar to other cost control tables)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'transportation' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON transportation';
    END LOOP;
END $$;

ALTER TABLE transportation DISABLE ROW LEVEL SECURITY;

-- Grant permissions explicitly
GRANT ALL ON TABLE transportation TO authenticated;
GRANT ALL ON TABLE transportation TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_transportation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_transportation_updated_at ON transportation;
CREATE TRIGGER trigger_update_transportation_updated_at
    BEFORE UPDATE ON transportation
    FOR EACH ROW
    EXECUTE FUNCTION update_transportation_updated_at();

-- Verify table was created
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'transportation'
ORDER BY ordinal_position;
