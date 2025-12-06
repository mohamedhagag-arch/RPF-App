-- =====================================================
-- Add Daily Rate Columns to designation_rates Table
-- Complete SQL Script with All Permissions and Security
-- =====================================================
-- This script adds columns for daily rate with time period
-- Daily rate is automatically calculated from hourly_rate * 8
-- 
-- Features:
-- - Adds daily_rate_name, daily_rate_start_date, daily_rate_end_date columns
-- - Auto-calculates daily_rate from hourly_rate * 8 (GENERATED COLUMN)
-- - Creates indexes for better performance
-- - Ensures all RLS policies are in place
-- - Grants all necessary permissions
-- 
-- Created: 2025-01-12
-- =====================================================

-- =====================================================
-- STEP 1: Add Daily Rate Columns
-- =====================================================

-- Add daily rate columns to designation_rates table
ALTER TABLE designation_rates
ADD COLUMN IF NOT EXISTS daily_rate_name TEXT, -- Name/description for this rate period (e.g., "Q1 2025 Rate", "Mid-Year Update")
ADD COLUMN IF NOT EXISTS daily_rate_start_date DATE, -- Start date of this rate period
ADD COLUMN IF NOT EXISTS daily_rate_end_date DATE, -- End date of this rate period (NULL means ongoing)
ADD COLUMN IF NOT EXISTS daily_rate DECIMAL(10, 2) GENERATED ALWAYS AS (hourly_rate * 8) STORED; -- Auto-calculated daily rate (8 hours)

-- =====================================================
-- STEP 2: Add Constraints
-- =====================================================

-- Add constraint to ensure valid date range
ALTER TABLE designation_rates
DROP CONSTRAINT IF EXISTS valid_daily_rate_date_range;

ALTER TABLE designation_rates
ADD CONSTRAINT valid_daily_rate_date_range 
CHECK (daily_rate_end_date IS NULL OR daily_rate_end_date >= daily_rate_start_date);

-- =====================================================
-- STEP 3: Add Comments for Documentation
-- =====================================================

COMMENT ON COLUMN designation_rates.daily_rate_name IS 'Name/description for this daily rate period (e.g., "Q1 2025 Rate", "Mid-Year Update")';
COMMENT ON COLUMN designation_rates.daily_rate_start_date IS 'Start date of this daily rate period';
COMMENT ON COLUMN designation_rates.daily_rate_end_date IS 'End date of this daily rate period (NULL means ongoing)';
COMMENT ON COLUMN designation_rates.daily_rate IS 'Auto-calculated daily rate (hourly_rate * 8 hours)';

-- =====================================================
-- STEP 4: Create Indexes for Better Performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_designation_rates_daily_rate_start_date ON designation_rates(daily_rate_start_date);
CREATE INDEX IF NOT EXISTS idx_designation_rates_daily_rate_end_date ON designation_rates(daily_rate_end_date);
CREATE INDEX IF NOT EXISTS idx_designation_rates_daily_rate_name ON designation_rates(daily_rate_name) WHERE daily_rate_name IS NOT NULL;

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
-- STEP 6: Ensure RLS Policies Exist (Create if Missing)
-- =====================================================

-- Policy for SELECT: Allow authenticated users to read
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'designation_rates'
        AND policyname = 'Allow authenticated users to read designation_rates'
    ) THEN
        CREATE POLICY "Allow authenticated users to read designation_rates"
            ON designation_rates
            FOR SELECT
            TO authenticated
            USING (true);
        RAISE NOTICE '✅ Created SELECT policy for designation_rates';
    ELSE
        RAISE NOTICE '✅ SELECT policy already exists for designation_rates';
    END IF;
END $$;

-- Policy for INSERT: Allow authenticated users to insert
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'designation_rates'
        AND policyname = 'Allow authenticated users to insert designation_rates'
    ) THEN
        CREATE POLICY "Allow authenticated users to insert designation_rates"
            ON designation_rates
            FOR INSERT
            TO authenticated
            WITH CHECK (true);
        RAISE NOTICE '✅ Created INSERT policy for designation_rates';
    ELSE
        RAISE NOTICE '✅ INSERT policy already exists for designation_rates';
    END IF;
END $$;

-- Policy for UPDATE: Allow authenticated users to update
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'designation_rates'
        AND policyname = 'Allow authenticated users to update designation_rates'
    ) THEN
        CREATE POLICY "Allow authenticated users to update designation_rates"
            ON designation_rates
            FOR UPDATE
            TO authenticated
            USING (true)
            WITH CHECK (true);
        RAISE NOTICE '✅ Created UPDATE policy for designation_rates';
    ELSE
        RAISE NOTICE '✅ UPDATE policy already exists for designation_rates';
    END IF;
END $$;

-- Policy for DELETE: Allow authenticated users to delete
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'designation_rates'
        AND policyname = 'Allow authenticated users to delete designation_rates'
    ) THEN
        CREATE POLICY "Allow authenticated users to delete designation_rates"
            ON designation_rates
            FOR DELETE
            TO authenticated
            USING (true);
        RAISE NOTICE '✅ Created DELETE policy for designation_rates';
    ELSE
        RAISE NOTICE '✅ DELETE policy already exists for designation_rates';
    END IF;
END $$;

-- =====================================================
-- STEP 7: Grant Permissions
-- =====================================================

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON designation_rates TO authenticated;

-- Grant schema usage (if not already granted)
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant sequence permissions (for UUID generation)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant permissions on future sequences
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
GRANT USAGE, SELECT ON SEQUENCES TO authenticated;

-- =====================================================
-- STEP 8: Create/Update Trigger Function and Trigger
-- =====================================================

-- Create or replace trigger function (safe to run multiple times)
CREATE OR REPLACE FUNCTION update_designation_rates_updated_at()
RETURNS TRIGGER AS $trigger$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$trigger$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate (to ensure it's properly configured)
DROP TRIGGER IF EXISTS trigger_update_designation_rates_updated_at ON designation_rates;

CREATE TRIGGER trigger_update_designation_rates_updated_at
    BEFORE UPDATE ON designation_rates
    FOR EACH ROW
    EXECUTE FUNCTION update_designation_rates_updated_at();

-- =====================================================
-- STEP 9: Success Message
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '====================================================';
    RAISE NOTICE '✅ Successfully added daily rate columns to designation_rates table!';
    RAISE NOTICE '✅ Daily rate is auto-calculated from hourly_rate * 8';
    RAISE NOTICE '✅ All permissions and policies configured';
    RAISE NOTICE '✅ Indexes created for better performance';
    RAISE NOTICE '====================================================';
END $$;

-- =====================================================
-- VERIFICATION QUERIES (Optional - Run to verify)
-- =====================================================

-- Uncomment to verify the changes:
/*
-- Check columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'designation_rates'
AND column_name IN ('daily_rate_name', 'daily_rate_start_date', 'daily_rate_end_date', 'daily_rate')
ORDER BY ordinal_position;

-- Check constraints
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public' 
AND table_name = 'designation_rates'
AND constraint_name LIKE '%daily_rate%';

-- Check indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
AND tablename = 'designation_rates'
AND indexname LIKE '%daily_rate%';

-- Check RLS policies
SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'designation_rates';
*/

