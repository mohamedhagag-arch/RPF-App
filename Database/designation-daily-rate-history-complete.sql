-- =====================================================
-- Designation Daily Rate History Table Schema
-- Complete SQL Script with All Permissions
-- =====================================================
-- This table stores historical daily rates for designations with time periods
-- Each designation can have multiple rate periods over time
-- Daily rate is automatically calculated from hourly_rate * 8
-- Created: 2025-01-12
-- =====================================================

-- =====================================================
-- STEP 1: Create designation_daily_rate_history table
-- =====================================================

CREATE TABLE IF NOT EXISTS designation_daily_rate_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  designation_id UUID NOT NULL REFERENCES designation_rates(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- Name/description for this rate period (e.g., "Q1 2025 Rate", "Mid-Year Update")
  hourly_rate DECIMAL(10, 2) NOT NULL CHECK (hourly_rate >= 0), -- Hourly rate for this period
  daily_rate DECIMAL(10, 2) GENERATED ALWAYS AS (hourly_rate * 8) STORED, -- Auto-calculated daily rate (8 hours)
  start_date DATE NOT NULL, -- Start date of this rate period
  end_date DATE, -- End date of this rate period (NULL means it's the current active rate)
  is_active BOOLEAN DEFAULT false, -- Whether this is the currently active rate
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT valid_date_range CHECK (end_date IS NULL OR end_date >= start_date)
);

-- =====================================================
-- STEP 2: Create Indexes for Better Performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_daily_rate_history_designation_id ON designation_daily_rate_history(designation_id);
CREATE INDEX IF NOT EXISTS idx_daily_rate_history_start_date ON designation_daily_rate_history(start_date);
CREATE INDEX IF NOT EXISTS idx_daily_rate_history_end_date ON designation_daily_rate_history(end_date);
CREATE INDEX IF NOT EXISTS idx_daily_rate_history_is_active ON designation_daily_rate_history(is_active);
CREATE INDEX IF NOT EXISTS idx_daily_rate_history_created_by ON designation_daily_rate_history(created_by);
CREATE INDEX IF NOT EXISTS idx_daily_rate_history_designation_active ON designation_daily_rate_history(designation_id, is_active) WHERE is_active = true;

-- =====================================================
-- STEP 3: Add Comments for Documentation
-- =====================================================

COMMENT ON TABLE designation_daily_rate_history IS 'Stores historical daily rates for designations with time periods';
COMMENT ON COLUMN designation_daily_rate_history.designation_id IS 'Reference to the designation rate';
COMMENT ON COLUMN designation_daily_rate_history.name IS 'Name/description for this rate period (e.g., "Q1 2025 Rate", "Mid-Year Update")';
COMMENT ON COLUMN designation_daily_rate_history.hourly_rate IS 'Hourly rate for this period';
COMMENT ON COLUMN designation_daily_rate_history.daily_rate IS 'Auto-calculated daily rate (hourly_rate * 8 hours)';
COMMENT ON COLUMN designation_daily_rate_history.start_date IS 'Start date of this rate period';
COMMENT ON COLUMN designation_daily_rate_history.end_date IS 'End date of this rate period (NULL means current active rate)';
COMMENT ON COLUMN designation_daily_rate_history.is_active IS 'Whether this is the currently active rate';

-- =====================================================
-- STEP 4: Create Trigger to Auto-update updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_daily_rate_history_updated_at()
RETURNS TRIGGER AS $trigger$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$trigger$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_daily_rate_history_updated_at ON designation_daily_rate_history;
CREATE TRIGGER trigger_update_daily_rate_history_updated_at
    BEFORE UPDATE ON designation_daily_rate_history
    FOR EACH ROW
    EXECUTE FUNCTION update_daily_rate_history_updated_at();

-- =====================================================
-- STEP 5: Create Trigger to Ensure Only One Active Rate Per Designation
-- =====================================================

CREATE OR REPLACE FUNCTION ensure_single_active_rate()
RETURNS TRIGGER AS $trigger$
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
$trigger$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ensure_single_active_rate ON designation_daily_rate_history;
CREATE TRIGGER trigger_ensure_single_active_rate
    BEFORE INSERT OR UPDATE ON designation_daily_rate_history
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_active_rate();

-- =====================================================
-- STEP 6: Enable Row Level Security
-- =====================================================

ALTER TABLE designation_daily_rate_history ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 7: Create RLS Policies
-- =====================================================

-- Policy for SELECT: Allow authenticated users to read
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'designation_daily_rate_history'
        AND policyname = 'Allow authenticated users to read daily_rate_history'
    ) THEN
        CREATE POLICY "Allow authenticated users to read daily_rate_history"
            ON designation_daily_rate_history
            FOR SELECT
            TO authenticated
            USING (true);
        RAISE NOTICE '✅ Created SELECT policy for designation_daily_rate_history';
    ELSE
        RAISE NOTICE '✅ SELECT policy already exists for designation_daily_rate_history';
    END IF;
END $$;

-- Policy for INSERT: Allow authenticated users to insert
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'designation_daily_rate_history'
        AND policyname = 'Allow authenticated users to insert daily_rate_history'
    ) THEN
        CREATE POLICY "Allow authenticated users to insert daily_rate_history"
            ON designation_daily_rate_history
            FOR INSERT
            TO authenticated
            WITH CHECK (true);
        RAISE NOTICE '✅ Created INSERT policy for designation_daily_rate_history';
    ELSE
        RAISE NOTICE '✅ INSERT policy already exists for designation_daily_rate_history';
    END IF;
END $$;

-- Policy for UPDATE: Allow authenticated users to update
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'designation_daily_rate_history'
        AND policyname = 'Allow authenticated users to update daily_rate_history'
    ) THEN
        CREATE POLICY "Allow authenticated users to update daily_rate_history"
            ON designation_daily_rate_history
            FOR UPDATE
            TO authenticated
            USING (true)
            WITH CHECK (true);
        RAISE NOTICE '✅ Created UPDATE policy for designation_daily_rate_history';
    ELSE
        RAISE NOTICE '✅ UPDATE policy already exists for designation_daily_rate_history';
    END IF;
END $$;

-- Policy for DELETE: Allow authenticated users to delete
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'designation_daily_rate_history'
        AND policyname = 'Allow authenticated users to delete daily_rate_history'
    ) THEN
        CREATE POLICY "Allow authenticated users to delete daily_rate_history"
            ON designation_daily_rate_history
            FOR DELETE
            TO authenticated
            USING (true);
        RAISE NOTICE '✅ Created DELETE policy for designation_daily_rate_history';
    ELSE
        RAISE NOTICE '✅ DELETE policy already exists for designation_daily_rate_history';
    END IF;
END $$;

-- =====================================================
-- STEP 8: Grant Permissions
-- =====================================================

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON designation_daily_rate_history TO authenticated;

-- Grant schema usage (if not already granted)
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant sequence permissions (for UUID generation)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant permissions on future sequences
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
GRANT USAGE, SELECT ON SEQUENCES TO authenticated;

-- =====================================================
-- STEP 9: Success Message
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '====================================================';
    RAISE NOTICE '✅ Successfully created designation_daily_rate_history table!';
    RAISE NOTICE '✅ Daily rate is auto-calculated from hourly_rate * 8';
    RAISE NOTICE '✅ Trigger ensures only one active rate per designation';
    RAISE NOTICE '✅ All permissions and policies configured';
    RAISE NOTICE '✅ Indexes created for better performance';
    RAISE NOTICE '====================================================';
END $$;

-- =====================================================
-- VERIFICATION QUERIES (Optional - Run to verify)
-- =====================================================

-- Uncomment to verify the changes:
/*
-- Check table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'designation_daily_rate_history'
ORDER BY ordinal_position;

-- Check constraints
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public' 
AND table_name = 'designation_daily_rate_history';

-- Check indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
AND tablename = 'designation_daily_rate_history';

-- Check RLS policies
SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'designation_daily_rate_history';

-- Check triggers
SELECT tgname, tgtype, tgenabled
FROM pg_trigger
WHERE tgrelid = 'designation_daily_rate_history'::regclass;
*/

