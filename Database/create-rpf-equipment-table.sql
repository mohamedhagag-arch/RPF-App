-- =====================================================
-- Create RPF Equipment Table
-- إنشاء جدول معدات RPF
-- =====================================================

-- Create rpf_equipment table
CREATE TABLE IF NOT EXISTS rpf_equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE,
    project_code TEXT,
    activity_type TEXT,
    machine_code TEXT,
    machine_full_name TEXT,
    meters_drilling NUMERIC(15,2),
    working_hrs NUMERIC(15,2),
    idle_taken_hrs NUMERIC(15,2),
    idle_not_taken_hrs NUMERIC(15,2),
    breakdown_hrs NUMERIC(15,2),
    maintenance_hrs NUMERIC(15,2),
    not_in_use_hrs NUMERIC(15,2),
    cost NUMERIC(15,2),
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_rpf_equipment_project_code ON rpf_equipment(project_code);
CREATE INDEX IF NOT EXISTS idx_rpf_equipment_machine_code ON rpf_equipment(machine_code);
CREATE INDEX IF NOT EXISTS idx_rpf_equipment_activity_type ON rpf_equipment(activity_type);
CREATE INDEX IF NOT EXISTS idx_rpf_equipment_date ON rpf_equipment(date DESC);
CREATE INDEX IF NOT EXISTS idx_rpf_equipment_created_at ON rpf_equipment(created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE rpf_equipment IS 'جدول معدات RPF - RPF Equipment Database';
COMMENT ON COLUMN rpf_equipment.id IS 'المعرف الفريد لسجل المعدات';
COMMENT ON COLUMN rpf_equipment.date IS 'التاريخ';
COMMENT ON COLUMN rpf_equipment.project_code IS 'رمز المشروع';
COMMENT ON COLUMN rpf_equipment.activity_type IS 'نوع النشاط';
COMMENT ON COLUMN rpf_equipment.machine_code IS 'رمز الآلة';
COMMENT ON COLUMN rpf_equipment.machine_full_name IS 'اسم الآلة الكامل';
COMMENT ON COLUMN rpf_equipment.meters_drilling IS 'أمتار الحفر (م)';
COMMENT ON COLUMN rpf_equipment.working_hrs IS 'ساعات العمل';
COMMENT ON COLUMN rpf_equipment.idle_taken_hrs IS 'ساعات التوقف المحسوبة';
COMMENT ON COLUMN rpf_equipment.idle_not_taken_hrs IS 'ساعات التوقف غير المحسوبة';
COMMENT ON COLUMN rpf_equipment.breakdown_hrs IS 'ساعات الأعطال';
COMMENT ON COLUMN rpf_equipment.maintenance_hrs IS 'ساعات الصيانة';
COMMENT ON COLUMN rpf_equipment.not_in_use_hrs IS 'ساعات عدم الاستخدام';
COMMENT ON COLUMN rpf_equipment.cost IS 'التكلفة';
COMMENT ON COLUMN rpf_equipment.note IS 'ملاحظات';

-- Disable RLS for rpf_equipment (similar to other cost control tables)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'rpf_equipment' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON rpf_equipment';
    END LOOP;
END $$;

ALTER TABLE rpf_equipment DISABLE ROW LEVEL SECURITY;

-- Grant permissions explicitly
GRANT ALL ON TABLE rpf_equipment TO authenticated;
GRANT ALL ON TABLE rpf_equipment TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_rpf_equipment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_rpf_equipment_updated_at ON rpf_equipment;
CREATE TRIGGER trigger_update_rpf_equipment_updated_at
    BEFORE UPDATE ON rpf_equipment
    FOR EACH ROW
    EXECUTE FUNCTION update_rpf_equipment_updated_at();

-- Verify table was created
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'rpf_equipment'
ORDER BY ordinal_position;

