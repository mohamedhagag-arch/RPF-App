-- =====================================================
-- Update Daily Rate to Use Total Hourly Rate
-- Complete SQL Script
-- =====================================================
-- This script updates the daily_rate column to be calculated
-- from total_hourly_rate * 8 instead of hourly_rate * 8
-- 
-- IMPORTANT: This script will:
-- 1. Drop the existing daily_rate GENERATED column
-- 2. Recreate it with the new formula: total_hourly_rate * 8
-- 
-- Note: Since daily_rate is a GENERATED column, we cannot
-- modify it directly. We must drop and recreate it.
-- 
-- Created: 2025-01-XX
-- =====================================================

-- =====================================================
-- STEP 1: Check if daily_rate column exists
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'designation_rates' 
        AND column_name = 'daily_rate'
    ) THEN
        RAISE NOTICE '⚠️ daily_rate column does not exist. Creating it with total_hourly_rate formula...';
        
        -- Create daily_rate column with total_hourly_rate formula
        ALTER TABLE designation_rates
        ADD COLUMN daily_rate DECIMAL(10, 2) 
        GENERATED ALWAYS AS (
            (hourly_rate + COALESCE(overhead_hourly_rate, 5.3)) * 8
        ) STORED;
        
        RAISE NOTICE '✅ Created daily_rate column with total_hourly_rate formula';
    ELSE
        RAISE NOTICE '✅ daily_rate column exists. Updating formula...';
        
        -- =====================================================
        -- STEP 2: Drop existing daily_rate column
        -- =====================================================
        
        ALTER TABLE designation_rates
        DROP COLUMN IF EXISTS daily_rate;
        
        RAISE NOTICE '✅ Dropped existing daily_rate column';
        
        -- =====================================================
        -- STEP 3: Recreate daily_rate with new formula
        -- =====================================================
        
        ALTER TABLE designation_rates
        ADD COLUMN daily_rate DECIMAL(10, 2) 
        GENERATED ALWAYS AS (
            (hourly_rate + COALESCE(overhead_hourly_rate, 5.3)) * 8
        ) STORED;
        
        RAISE NOTICE '✅ Recreated daily_rate column with total_hourly_rate formula';
    END IF;
END $$;

-- =====================================================
-- STEP 4: Update Comment for Documentation
-- =====================================================

COMMENT ON COLUMN designation_rates.daily_rate IS 'Auto-calculated daily rate (total_hourly_rate * 8 hours) = (hourly_rate + overhead_hourly_rate) * 8';

-- =====================================================
-- STEP 5: Verify the Update
-- =====================================================

DO $$
DECLARE
    sample_daily_rate DECIMAL(10, 2);
    sample_hourly_rate DECIMAL(10, 2);
    sample_overhead_rate DECIMAL(10, 2);
    expected_daily_rate DECIMAL(10, 2);
BEGIN
    -- Get a sample record
    SELECT 
        daily_rate,
        hourly_rate,
        COALESCE(overhead_hourly_rate, 5.3)
    INTO 
        sample_daily_rate,
        sample_hourly_rate,
        sample_overhead_rate
    FROM designation_rates
    LIMIT 1;
    
    IF sample_daily_rate IS NOT NULL THEN
        -- Calculate expected value
        expected_daily_rate := (sample_hourly_rate + sample_overhead_rate) * 8;
        
        -- Verify calculation (allow small rounding differences)
        IF ABS(sample_daily_rate - expected_daily_rate) < 0.01 THEN
            RAISE NOTICE '✅ Verification successful!';
            RAISE NOTICE '   Sample hourly_rate: %', sample_hourly_rate;
            RAISE NOTICE '   Sample overhead_hourly_rate: %', sample_overhead_rate;
            RAISE NOTICE '   Sample daily_rate: %', sample_daily_rate;
            RAISE NOTICE '   Expected daily_rate: %', expected_daily_rate;
            RAISE NOTICE '   Formula: (hourly_rate + overhead_hourly_rate) * 8';
        ELSE
            RAISE WARNING '⚠️ Verification failed!';
            RAISE WARNING '   Expected: %, Got: %', expected_daily_rate, sample_daily_rate;
        END IF;
    ELSE
        RAISE NOTICE '⚠️ No records found in designation_rates table for verification';
    END IF;
END $$;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE '✅ Successfully updated daily_rate column!';
    RAISE NOTICE '✅ Daily rate now calculated from total_hourly_rate * 8';
    RAISE NOTICE '✅ Formula: (hourly_rate + overhead_hourly_rate) * 8';
    RAISE NOTICE '✅ The column will update automatically when hourly_rate or overhead_hourly_rate changes';
    RAISE NOTICE '=====================================================';
END $$;

