-- =====================================================
-- Add Daily Rate Columns to designation_rates Table
-- =====================================================
-- This script adds columns for daily rate with time period
-- Daily rate is automatically calculated from hourly_rate * 8
-- Created: 2025-01-12
-- =====================================================

-- Add daily rate columns to designation_rates table
ALTER TABLE designation_rates
ADD COLUMN IF NOT EXISTS daily_rate_name TEXT, -- Name/description for this rate period (e.g., "Q1 2025 Rate", "Mid-Year Update")
ADD COLUMN IF NOT EXISTS daily_rate_start_date DATE, -- Start date of this rate period
ADD COLUMN IF NOT EXISTS daily_rate_end_date DATE, -- End date of this rate period (NULL means ongoing)
ADD COLUMN IF NOT EXISTS daily_rate DECIMAL(10, 2) GENERATED ALWAYS AS (hourly_rate * 8) STORED; -- Auto-calculated daily rate (8 hours)

-- Add constraint to ensure valid date range
ALTER TABLE designation_rates
DROP CONSTRAINT IF EXISTS valid_daily_rate_date_range;

ALTER TABLE designation_rates
ADD CONSTRAINT valid_daily_rate_date_range 
CHECK (daily_rate_end_date IS NULL OR daily_rate_end_date >= daily_rate_start_date);

-- Add comments for documentation
COMMENT ON COLUMN designation_rates.daily_rate_name IS 'Name/description for this daily rate period';
COMMENT ON COLUMN designation_rates.daily_rate_start_date IS 'Start date of this daily rate period';
COMMENT ON COLUMN designation_rates.daily_rate_end_date IS 'End date of this daily rate period (NULL means ongoing)';
COMMENT ON COLUMN designation_rates.daily_rate IS 'Auto-calculated daily rate (hourly_rate * 8)';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_designation_rates_daily_rate_start_date ON designation_rates(daily_rate_start_date);
CREATE INDEX IF NOT EXISTS idx_designation_rates_daily_rate_end_date ON designation_rates(daily_rate_end_date);

-- =====================================================
-- Success Message
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Successfully added daily rate columns to designation_rates table!';
    RAISE NOTICE '✅ Daily rate is auto-calculated from hourly_rate * 8';
END $$;

