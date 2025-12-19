-- =====================================================
-- Create Hired Manpower Table
-- إنشاء جدول القوى العاملة المستأجرة
-- =====================================================

-- Create hired_manpower table
CREATE TABLE IF NOT EXISTS hired_manpower (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE,
    project_code TEXT,
    designation TEXT,
    total_number NUMERIC(10,2),
    total_hrs NUMERIC(15,2),
    rate NUMERIC(15,2),
    cost NUMERIC(15,2),
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_hired_manpower_project_code ON hired_manpower(project_code);
CREATE INDEX IF NOT EXISTS idx_hired_manpower_designation ON hired_manpower(designation);
CREATE INDEX IF NOT EXISTS idx_hired_manpower_date ON hired_manpower(date DESC);
CREATE INDEX IF NOT EXISTS idx_hired_manpower_created_at ON hired_manpower(created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE hired_manpower IS 'جدول القوى العاملة المستأجرة - Hired Manpower Database';
COMMENT ON COLUMN hired_manpower.id IS 'المعرف الفريد لسجل القوى العاملة المستأجرة';
COMMENT ON COLUMN hired_manpower.date IS 'التاريخ';
COMMENT ON COLUMN hired_manpower.project_code IS 'رمز المشروع';
COMMENT ON COLUMN hired_manpower.designation IS 'التخصص/المنصب';
COMMENT ON COLUMN hired_manpower.total_number IS 'العدد الإجمالي';
COMMENT ON COLUMN hired_manpower.total_hrs IS 'إجمالي الساعات';
COMMENT ON COLUMN hired_manpower.rate IS 'المعدل/السعر';
COMMENT ON COLUMN hired_manpower.cost IS 'التكلفة';
COMMENT ON COLUMN hired_manpower.note IS 'ملاحظات';

-- Disable RLS for hired_manpower (similar to other cost control tables)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'hired_manpower' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON hired_manpower';
    END LOOP;
END $$;

ALTER TABLE hired_manpower DISABLE ROW LEVEL SECURITY;

-- Grant permissions explicitly
GRANT ALL ON TABLE hired_manpower TO authenticated;
GRANT ALL ON TABLE hired_manpower TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_hired_manpower_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_hired_manpower_updated_at ON hired_manpower;
CREATE TRIGGER trigger_update_hired_manpower_updated_at
    BEFORE UPDATE ON hired_manpower
    FOR EACH ROW
    EXECUTE FUNCTION update_hired_manpower_updated_at();

-- Verify table was created
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'hired_manpower'
ORDER BY ordinal_position;

