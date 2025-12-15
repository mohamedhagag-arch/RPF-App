-- =====================================================
-- Create Material Table
-- إنشاء جدول المواد
-- =====================================================

-- Create material table
CREATE TABLE IF NOT EXISTS material (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    applicant TEXT,
    project_code TEXT,
    material TEXT NOT NULL,
    unit TEXT,
    qtty NUMERIC(15,2),
    category TEXT,
    vendor TEXT,
    rate NUMERIC(15,2),
    cost NUMERIC(15,2),
    comment TEXT,
    join_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_material_project_code ON material(project_code);
CREATE INDEX IF NOT EXISTS idx_material_category ON material(category);
CREATE INDEX IF NOT EXISTS idx_material_vendor ON material(vendor);
CREATE INDEX IF NOT EXISTS idx_material_material ON material(material);
CREATE INDEX IF NOT EXISTS idx_material_created_at ON material(created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE material IS 'جدول المواد - Material Database';
COMMENT ON COLUMN material.id IS 'المعرف الفريد للمادة';
COMMENT ON COLUMN material.applicant IS 'المتقدم/الطلب';
COMMENT ON COLUMN material.project_code IS 'رمز المشروع';
COMMENT ON COLUMN material.material IS 'اسم المادة';
COMMENT ON COLUMN material.unit IS 'الوحدة';
COMMENT ON COLUMN material.qtty IS 'الكمية';
COMMENT ON COLUMN material.category IS 'الفئة';
COMMENT ON COLUMN material.vendor IS 'المورد';
COMMENT ON COLUMN material.rate IS 'السعر/المعدل';
COMMENT ON COLUMN material.cost IS 'التكلفة';
COMMENT ON COLUMN material.comment IS 'ملاحظات';
COMMENT ON COLUMN material.join_text IS 'نص الربط';

-- Disable RLS for material (similar to other procurement tables)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'material' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON material';
    END LOOP;
END $$;

ALTER TABLE material DISABLE ROW LEVEL SECURITY;

-- Grant permissions explicitly
GRANT ALL ON TABLE material TO authenticated;
GRANT ALL ON TABLE material TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_material_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_material_updated_at ON material;
CREATE TRIGGER trigger_update_material_updated_at
    BEFORE UPDATE ON material
    FOR EACH ROW
    EXECUTE FUNCTION update_material_updated_at();

-- Verify table was created
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'material'
ORDER BY ordinal_position;

