-- =====================================================
-- Create Other Cost Table
-- إنشاء جدول التكاليف الأخرى
-- =====================================================

-- Create other_cost table
CREATE TABLE IF NOT EXISTS other_cost (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE,
    project_code TEXT,
    category TEXT,
    reference TEXT,
    unit TEXT,
    qtty NUMERIC(15,2),
    rate NUMERIC(15,2),
    cost NUMERIC(15,2),
    join_text TEXT,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_other_cost_project_code ON other_cost(project_code);
CREATE INDEX IF NOT EXISTS idx_other_cost_category ON other_cost(category);
CREATE INDEX IF NOT EXISTS idx_other_cost_reference ON other_cost(reference);
CREATE INDEX IF NOT EXISTS idx_other_cost_date ON other_cost(date);

-- Add comments to columns
COMMENT ON TABLE other_cost IS 'Table for storing other cost records';
COMMENT ON COLUMN other_cost.date IS 'Date of the cost record';
COMMENT ON COLUMN other_cost.project_code IS 'Project code associated with the cost';
COMMENT ON COLUMN other_cost.category IS 'Category of the cost';
COMMENT ON COLUMN other_cost.reference IS 'Reference information';
COMMENT ON COLUMN other_cost.unit IS 'Unit of measurement';
COMMENT ON COLUMN other_cost.qtty IS 'Quantity';
COMMENT ON COLUMN other_cost.rate IS 'Rate per unit';
COMMENT ON COLUMN other_cost.cost IS 'Total cost';
COMMENT ON COLUMN other_cost.join_text IS 'Join text information';
COMMENT ON COLUMN other_cost.note IS 'Additional notes';

-- Disable RLS (Row Level Security) for this table
ALTER TABLE other_cost DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON other_cost TO authenticated;
GRANT ALL ON other_cost TO service_role;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_other_cost_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_other_cost_updated_at
    BEFORE UPDATE ON other_cost
    FOR EACH ROW
    EXECUTE FUNCTION update_other_cost_updated_at();

