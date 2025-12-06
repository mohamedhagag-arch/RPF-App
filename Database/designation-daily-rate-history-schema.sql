-- =====================================================
-- Designation Daily Rate History Table Schema
-- =====================================================
-- This table stores historical daily rates for designations with time periods
-- Created: 2025-01-12
-- =====================================================

-- Create designation_daily_rate_history table
CREATE TABLE IF NOT EXISTS designation_daily_rate_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  designation_id UUID NOT NULL REFERENCES designation_rates(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- Name/description for this rate period (e.g., "Q1 2025 Rate", "Mid-Year Update")
  daily_rate DECIMAL(10, 2) NOT NULL CHECK (daily_rate >= 0),
  start_date DATE NOT NULL, -- Start date of this rate period
  end_date DATE, -- End date of this rate period (NULL means it's the current active rate)
  is_active BOOLEAN DEFAULT false, -- Whether this is the currently active rate
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT valid_date_range CHECK (end_date IS NULL OR end_date >= start_date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_daily_rate_history_designation_id ON designation_daily_rate_history(designation_id);
CREATE INDEX IF NOT EXISTS idx_daily_rate_history_start_date ON designation_daily_rate_history(start_date);
CREATE INDEX IF NOT EXISTS idx_daily_rate_history_end_date ON designation_daily_rate_history(end_date);
CREATE INDEX IF NOT EXISTS idx_daily_rate_history_is_active ON designation_daily_rate_history(is_active);
CREATE INDEX IF NOT EXISTS idx_daily_rate_history_created_by ON designation_daily_rate_history(created_by);

-- Add comments for documentation
COMMENT ON TABLE designation_daily_rate_history IS 'Stores historical daily rates for designations with time periods';
COMMENT ON COLUMN designation_daily_rate_history.designation_id IS 'Reference to the designation rate';
COMMENT ON COLUMN designation_daily_rate_history.name IS 'Name/description for this rate period';
COMMENT ON COLUMN designation_daily_rate_history.daily_rate IS 'Daily rate for this period';
COMMENT ON COLUMN designation_daily_rate_history.start_date IS 'Start date of this rate period';
COMMENT ON COLUMN designation_daily_rate_history.end_date IS 'End date of this rate period (NULL means current active rate)';
COMMENT ON COLUMN designation_daily_rate_history.is_active IS 'Whether this is the currently active rate';

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_daily_rate_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_daily_rate_history_updated_at ON designation_daily_rate_history;
CREATE TRIGGER trigger_update_daily_rate_history_updated_at
    BEFORE UPDATE ON designation_daily_rate_history
    FOR EACH ROW
    EXECUTE FUNCTION update_daily_rate_history_updated_at();

-- Create trigger to ensure only one active rate per designation
CREATE OR REPLACE FUNCTION ensure_single_active_rate()
RETURNS TRIGGER AS $$
BEGIN
    -- If setting a rate as active, deactivate all other rates for this designation
    IF NEW.is_active = true THEN
        UPDATE designation_daily_rate_history
        SET is_active = false
        WHERE designation_id = NEW.designation_id
        AND id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ensure_single_active_rate ON designation_daily_rate_history;
CREATE TRIGGER trigger_ensure_single_active_rate
    BEFORE INSERT OR UPDATE ON designation_daily_rate_history
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_active_rate();

-- Enable Row Level Security
ALTER TABLE designation_daily_rate_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Policy for SELECT: Allow authenticated users to read
CREATE POLICY "Allow authenticated users to read daily_rate_history"
    ON designation_daily_rate_history
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy for INSERT: Allow authenticated users to insert
CREATE POLICY "Allow authenticated users to insert daily_rate_history"
    ON designation_daily_rate_history
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy for UPDATE: Allow authenticated users to update
CREATE POLICY "Allow authenticated users to update daily_rate_history"
    ON designation_daily_rate_history
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy for DELETE: Allow authenticated users to delete
CREATE POLICY "Allow authenticated users to delete daily_rate_history"
    ON designation_daily_rate_history
    FOR DELETE
    TO authenticated
    USING (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON designation_daily_rate_history TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

