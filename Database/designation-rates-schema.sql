-- =====================================================
-- Designation Rates Table Schema
-- =====================================================
-- This table stores hourly rates for different job designations
-- Created: 2025-01-12
-- =====================================================

-- Create designation_rates table
CREATE TABLE IF NOT EXISTS designation_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  designation TEXT NOT NULL UNIQUE,
  hourly_rate DECIMAL(10, 2) NOT NULL CHECK (hourly_rate >= 0),
  overtime_hourly_rate DECIMAL(10, 2) CHECK (overtime_hourly_rate >= 0),
  off_day_hourly_rate DECIMAL(10, 2) CHECK (off_day_hourly_rate >= 0),
  authority TEXT DEFAULT 'General Authority',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_designation_rates_designation ON designation_rates(designation);
CREATE INDEX IF NOT EXISTS idx_designation_rates_authority ON designation_rates(authority);
CREATE INDEX IF NOT EXISTS idx_designation_rates_created_by ON designation_rates(created_by);
CREATE INDEX IF NOT EXISTS idx_designation_rates_updated_by ON designation_rates(updated_by);

-- Add comments for documentation
COMMENT ON TABLE designation_rates IS 'Stores hourly rates for different job designations';
COMMENT ON COLUMN designation_rates.designation IS 'Job title or designation name';
COMMENT ON COLUMN designation_rates.hourly_rate IS 'Standard hourly rate';
COMMENT ON COLUMN designation_rates.overtime_hourly_rate IS 'Hourly rate for overtime work';
COMMENT ON COLUMN designation_rates.off_day_hourly_rate IS 'Hourly rate for work on off days';
COMMENT ON COLUMN designation_rates.authority IS 'Authority or organization name (e.g., General Authority)';

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_designation_rates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_designation_rates_updated_at ON designation_rates;
CREATE TRIGGER trigger_update_designation_rates_updated_at
    BEFORE UPDATE ON designation_rates
    FOR EACH ROW
    EXECUTE FUNCTION update_designation_rates_updated_at();

-- Enable Row Level Security
ALTER TABLE designation_rates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Policy for SELECT: Allow authenticated users to read
CREATE POLICY "Allow authenticated users to read designation_rates"
    ON designation_rates
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy for INSERT: Allow authenticated users to insert
CREATE POLICY "Allow authenticated users to insert designation_rates"
    ON designation_rates
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy for UPDATE: Allow authenticated users to update
CREATE POLICY "Allow authenticated users to update designation_rates"
    ON designation_rates
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy for DELETE: Allow authenticated users to delete
CREATE POLICY "Allow authenticated users to delete designation_rates"
    ON designation_rates
    FOR DELETE
    TO authenticated
    USING (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON designation_rates TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Insert sample data (optional)
INSERT INTO designation_rates (designation, hourly_rate, overtime_hourly_rate, off_day_hourly_rate, authority) VALUES
  ('Project Manager', 31.25, NULL, NULL, 'General Authority'),
  ('Foreman', 19.23, NULL, NULL, 'General Authority'),
  ('Surveyor', 14.42, NULL, NULL, 'General Authority'),
  ('Safety Officer', 12.02, NULL, NULL, 'General Authority'),
  ('Rig Operator', 19.23, NULL, NULL, 'General Authority'),
  ('Crane Operator', 14.42, NULL, NULL, 'General Authority'),
  ('Anchor Operator', 14.42, NULL, NULL, 'General Authority'),
  ('Vibro Operator', 12.02, NULL, NULL, 'General Authority'),
  ('Rigger', 12.02, NULL, NULL, 'General Authority'),
  ('Welder', 12.02, NULL, NULL, 'General Authority'),
  ('Blacksmith', 12.02, NULL, NULL, 'General Authority'),
  ('Mechanic', 14.42, NULL, NULL, 'General Authority'),
  ('Electrician', 14.42, NULL, NULL, 'General Authority'),
  ('Carpenter', 12.02, NULL, NULL, 'General Authority'),
  ('Labor', 8.65, NULL, NULL, 'General Authority'),
  ('Steel Fixer Foreman', 15.38, NULL, NULL, 'General Authority'),
  ('Steel Fixer', 12.02, NULL, NULL, 'General Authority'),
  ('ASSISTANT SURVEYOR', 9.00, NULL, NULL, 'General Authority'),
  ('PUMP OPERATOR', 14.50, NULL, NULL, 'General Authority'),
  ('ASSISTANT ENGINEER', 24.00, NULL, NULL, 'General Authority'),
  ('HIAB DRIVER', 14.50, NULL, NULL, 'General Authority'),
  ('OFFICE BOY', 7.50, NULL, NULL, 'General Authority')
ON CONFLICT (designation) DO NOTHING;

-- =====================================================
-- Success Message
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Successfully created designation_rates table!';
    RAISE NOTICE '✅ Sample data inserted (22 designations)';
    RAISE NOTICE '✅ RLS policies and permissions configured';
END $$;

