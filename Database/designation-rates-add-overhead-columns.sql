-- =====================================================
-- Add Overhead Hourly Rate and Total Hourly Rate Columns
-- Complete SQL Script with All Permissions and Security
-- =====================================================
-- This script adds:
-- - overhead_hourly_rate column (default: 5.3)
-- - total_hourly_rate column (calculated: hourly_rate + overhead_hourly_rate)
-- 
-- Features:
-- - Adds overhead_hourly_rate with default value 5.3
-- - Auto-calculates total_hourly_rate (GENERATED COLUMN)
-- - Updates existing records with default overhead rate
-- - Creates indexes for better performance
-- - Ensures all RLS policies are in place
-- 
-- Created: 2025-01-XX
-- =====================================================

-- =====================================================
-- STEP 1: Add Overhead Hourly Rate Column
-- =====================================================

-- Add overhead_hourly_rate column with default value 5.3
ALTER TABLE designation_rates
ADD COLUMN IF NOT EXISTS overhead_hourly_rate DECIMAL(10, 2) DEFAULT 5.3 CHECK (overhead_hourly_rate >= 0);

-- Update existing records that have NULL overhead_hourly_rate to default value 5.3
UPDATE designation_rates
SET overhead_hourly_rate = 5.3
WHERE overhead_hourly_rate IS NULL;

-- =====================================================
-- STEP 2: Add Total Hourly Rate Column (Generated)
-- =====================================================

-- Add total_hourly_rate as a generated column (hourly_rate + overhead_hourly_rate)
ALTER TABLE designation_rates
ADD COLUMN IF NOT EXISTS total_hourly_rate DECIMAL(10, 2) 
GENERATED ALWAYS AS (hourly_rate + COALESCE(overhead_hourly_rate, 5.3)) STORED;

-- =====================================================
-- STEP 3: Add Comments for Documentation
-- =====================================================

COMMENT ON COLUMN designation_rates.overhead_hourly_rate IS 'Overhead hourly rate (default: 5.3, can be changed manually)';
COMMENT ON COLUMN designation_rates.total_hourly_rate IS 'Total hourly rate (auto-calculated: hourly_rate + overhead_hourly_rate)';

-- =====================================================
-- STEP 4: Create Indexes for Better Performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_designation_rates_overhead_hourly_rate ON designation_rates(overhead_hourly_rate);
CREATE INDEX IF NOT EXISTS idx_designation_rates_total_hourly_rate ON designation_rates(total_hourly_rate);

-- =====================================================
-- STEP 5: Verify RLS Policies (Already Exist from Original Schema)
-- =====================================================

-- Check if RLS is enabled (should already be enabled from original schema)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'designation_rates'
        AND rowsecurity = true
    ) THEN
        ALTER TABLE designation_rates ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE '✅ RLS enabled for designation_rates table';
    ELSE
        RAISE NOTICE '✅ RLS already enabled for designation_rates table';
    END IF;
END $$;

-- =====================================================
-- STEP 6: Verify Column Addition
-- =====================================================

-- Verify that columns were added successfully
DO $$
BEGIN
    -- Check overhead_hourly_rate column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'designation_rates' 
        AND column_name = 'overhead_hourly_rate'
    ) THEN
        RAISE NOTICE '✅ overhead_hourly_rate column added successfully';
    ELSE
        RAISE EXCEPTION '❌ Failed to add overhead_hourly_rate column';
    END IF;

    -- Check total_hourly_rate column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'designation_rates' 
        AND column_name = 'total_hourly_rate'
    ) THEN
        RAISE NOTICE '✅ total_hourly_rate column added successfully';
    ELSE
        RAISE EXCEPTION '❌ Failed to add total_hourly_rate column';
    END IF;
END $$;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE '✅ Successfully added overhead_hourly_rate and total_hourly_rate columns';
    RAISE NOTICE '✅ Default overhead_hourly_rate set to 5.3 for all existing records';
    RAISE NOTICE '✅ total_hourly_rate auto-calculated as hourly_rate + overhead_hourly_rate';
    RAISE NOTICE '=====================================================';
END $$;

