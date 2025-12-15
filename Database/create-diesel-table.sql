-- =====================================================
-- Create Diesel Table
-- إنشاء جدول الديزل
-- =====================================================

-- Create diesel table
CREATE TABLE IF NOT EXISTS diesel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE,
    project_code TEXT,
    rpf_machine_code TEXT,
    gallons_qtty NUMERIC(15,2),
    rented_machines TEXT,
    qtty NUMERIC(15,2),
    category TEXT,
    material TEXT,
    supplier TEXT,
    invoice_review TEXT,
    rate NUMERIC(15,2),
    cost NUMERIC(15,2),
    join_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_diesel_project_code ON diesel(project_code);
CREATE INDEX IF NOT EXISTS idx_diesel_category ON diesel(category);
CREATE INDEX IF NOT EXISTS idx_diesel_rpf_machine_code ON diesel(rpf_machine_code);
CREATE INDEX IF NOT EXISTS idx_diesel_date ON diesel(date DESC);
CREATE INDEX IF NOT EXISTS idx_diesel_created_at ON diesel(created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE diesel IS 'جدول الديزل - Diesel Database';
COMMENT ON COLUMN diesel.id IS 'المعرف الفريد لسجل الديزل';
COMMENT ON COLUMN diesel.date IS 'التاريخ';
COMMENT ON COLUMN diesel.project_code IS 'رمز المشروع';
COMMENT ON COLUMN diesel.rpf_machine_code IS 'رمز آلة RPF';
COMMENT ON COLUMN diesel.gallons_qtty IS 'كمية الجالونات';
COMMENT ON COLUMN diesel.rented_machines IS 'الآلات المستأجرة';
COMMENT ON COLUMN diesel.qtty IS 'الكمية';
COMMENT ON COLUMN diesel.category IS 'الفئة';
COMMENT ON COLUMN diesel.material IS 'المادة';
COMMENT ON COLUMN diesel.supplier IS 'المورد';
COMMENT ON COLUMN diesel.invoice_review IS 'مراجعة الفاتورة';
COMMENT ON COLUMN diesel.rate IS 'السعر/المعدل';
COMMENT ON COLUMN diesel.cost IS 'التكلفة';
COMMENT ON COLUMN diesel.join_text IS 'نص الربط';

-- Disable RLS for diesel (similar to other cost control tables)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'diesel' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON diesel';
    END LOOP;
END $$;

ALTER TABLE diesel DISABLE ROW LEVEL SECURITY;

-- Grant permissions explicitly
GRANT ALL ON TABLE diesel TO authenticated;
GRANT ALL ON TABLE diesel TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_diesel_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_diesel_updated_at ON diesel;
CREATE TRIGGER trigger_update_diesel_updated_at
    BEFORE UPDATE ON diesel
    FOR EACH ROW
    EXECUTE FUNCTION update_diesel_updated_at();

-- Verify table was created
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'diesel'
ORDER BY ordinal_position;

