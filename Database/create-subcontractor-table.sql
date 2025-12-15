-- =====================================================
-- Create Subcontractor Table
-- إنشاء جدول المقاولين من الباطن
-- =====================================================

-- Create subcontractor table
CREATE TABLE IF NOT EXISTS subcontractor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE,
    project_code TEXT,
    activity TEXT,
    category TEXT,
    subcon_name TEXT NOT NULL,
    unit TEXT,
    qtty NUMERIC(15,2),
    rate NUMERIC(15,2),
    cost NUMERIC(15,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_subcontractor_project_code ON subcontractor(project_code);
CREATE INDEX IF NOT EXISTS idx_subcontractor_category ON subcontractor(category);
CREATE INDEX IF NOT EXISTS idx_subcontractor_subcon_name ON subcontractor(subcon_name);
CREATE INDEX IF NOT EXISTS idx_subcontractor_date ON subcontractor(date DESC);
CREATE INDEX IF NOT EXISTS idx_subcontractor_created_at ON subcontractor(created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE subcontractor IS 'جدول المقاولين من الباطن - Subcontractor Database';
COMMENT ON COLUMN subcontractor.id IS 'المعرف الفريد للمقاول من الباطن';
COMMENT ON COLUMN subcontractor.date IS 'التاريخ';
COMMENT ON COLUMN subcontractor.project_code IS 'رمز المشروع';
COMMENT ON COLUMN subcontractor.activity IS 'النشاط';
COMMENT ON COLUMN subcontractor.category IS 'الفئة';
COMMENT ON COLUMN subcontractor.subcon_name IS 'اسم المقاول من الباطن';
COMMENT ON COLUMN subcontractor.unit IS 'الوحدة';
COMMENT ON COLUMN subcontractor.qtty IS 'الكمية';
COMMENT ON COLUMN subcontractor.rate IS 'السعر/المعدل';
COMMENT ON COLUMN subcontractor.cost IS 'التكلفة';

-- Disable RLS for subcontractor (similar to other cost control tables)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'subcontractor' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON subcontractor';
    END LOOP;
END $$;

ALTER TABLE subcontractor DISABLE ROW LEVEL SECURITY;

-- Grant permissions explicitly
GRANT ALL ON TABLE subcontractor TO authenticated;
GRANT ALL ON TABLE subcontractor TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_subcontractor_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_subcontractor_updated_at ON subcontractor;
CREATE TRIGGER trigger_update_subcontractor_updated_at
    BEFORE UPDATE ON subcontractor
    FOR EACH ROW
    EXECUTE FUNCTION update_subcontractor_updated_at();

-- Verify table was created
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'subcontractor'
ORDER BY ordinal_position;

