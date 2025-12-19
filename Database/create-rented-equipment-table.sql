-- =====================================================
-- Create Rented Equipment Table
-- إنشاء جدول المعدات المستأجرة
-- =====================================================

-- Create rented_equipment table
CREATE TABLE IF NOT EXISTS rented_equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE,
    project_code TEXT,
    machine_type TEXT,
    machine_name TEXT,
    hrs NUMERIC(15,2),
    time_sheet_review TEXT,
    rate NUMERIC(15,2),
    cost NUMERIC(15,2),
    supplier TEXT,
    comment TEXT,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_rented_equipment_project_code ON rented_equipment(project_code);
CREATE INDEX IF NOT EXISTS idx_rented_equipment_machine_type ON rented_equipment(machine_type);
CREATE INDEX IF NOT EXISTS idx_rented_equipment_machine_name ON rented_equipment(machine_name);
CREATE INDEX IF NOT EXISTS idx_rented_equipment_supplier ON rented_equipment(supplier);
CREATE INDEX IF NOT EXISTS idx_rented_equipment_date ON rented_equipment(date);
CREATE INDEX IF NOT EXISTS idx_rented_equipment_status ON rented_equipment(status);

-- Add comments to columns
COMMENT ON TABLE rented_equipment IS 'Table for storing rented equipment records';
COMMENT ON COLUMN rented_equipment.date IS 'Date of the equipment rental';
COMMENT ON COLUMN rented_equipment.project_code IS 'Project code associated with the rental';
COMMENT ON COLUMN rented_equipment.machine_type IS 'Type of the rented machine';
COMMENT ON COLUMN rented_equipment.machine_name IS 'Name of the rented machine';
COMMENT ON COLUMN rented_equipment.hrs IS 'Number of hours rented';
COMMENT ON COLUMN rented_equipment.time_sheet_review IS 'Time sheet review information';
COMMENT ON COLUMN rented_equipment.rate IS 'Rental rate per hour';
COMMENT ON COLUMN rented_equipment.cost IS 'Total cost of rental';
COMMENT ON COLUMN rented_equipment.supplier IS 'Supplier of the rented equipment';
COMMENT ON COLUMN rented_equipment.comment IS 'Additional comments';
COMMENT ON COLUMN rented_equipment.status IS 'Status of the rental';

-- Disable RLS (Row Level Security) for this table
ALTER TABLE rented_equipment DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON rented_equipment TO authenticated;
GRANT ALL ON rented_equipment TO service_role;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_rented_equipment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_rented_equipment_updated_at
    BEFORE UPDATE ON rented_equipment
    FOR EACH ROW
    EXECUTE FUNCTION update_rented_equipment_updated_at();

