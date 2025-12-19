-- =====================================================
-- Machine Daily Rate History Table Schema
-- Complete SQL Script with All Permissions
-- =====================================================
-- This table stores historical daily rates for machines with time periods
-- Each machine can have multiple rate periods over time
-- Daily rate is stored directly (not calculated from hourly rate)
-- Created: 2025-01-XX
-- =====================================================

-- =====================================================
-- STEP 1: Create machine_daily_rate_history table
-- =====================================================

CREATE TABLE IF NOT EXISTS machine_daily_rate_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES machine_list(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- Name/description for this rate period (e.g., "Q1 2025 Rate", "Mid-Year Update")
  daily_rate DECIMAL(10, 2) NOT NULL CHECK (daily_rate >= 0), -- Daily rate for this period
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

CREATE INDEX IF NOT EXISTS idx_machine_daily_rate_history_machine_id ON machine_daily_rate_history(machine_id);
CREATE INDEX IF NOT EXISTS idx_machine_daily_rate_history_start_date ON machine_daily_rate_history(start_date);
CREATE INDEX IF NOT EXISTS idx_machine_daily_rate_history_end_date ON machine_daily_rate_history(end_date);
CREATE INDEX IF NOT EXISTS idx_machine_daily_rate_history_is_active ON machine_daily_rate_history(is_active);
CREATE INDEX IF NOT EXISTS idx_machine_daily_rate_history_created_by ON machine_daily_rate_history(created_by);
CREATE INDEX IF NOT EXISTS idx_machine_daily_rate_history_machine_active ON machine_daily_rate_history(machine_id, is_active) WHERE is_active = true;

-- =====================================================
-- STEP 3: Add Comments for Documentation
-- =====================================================

COMMENT ON TABLE machine_daily_rate_history IS 'Stores historical daily rates for machines with time periods';
COMMENT ON COLUMN machine_daily_rate_history.machine_id IS 'Reference to the machine';
COMMENT ON COLUMN machine_daily_rate_history.name IS 'Name/description for this rate period (e.g., "Q1 2025 Rate", "Mid-Year Update")';
COMMENT ON COLUMN machine_daily_rate_history.daily_rate IS 'Daily rate for this period';
COMMENT ON COLUMN machine_daily_rate_history.start_date IS 'Start date of this rate period';
COMMENT ON COLUMN machine_daily_rate_history.end_date IS 'End date of this rate period (NULL means current active rate)';
COMMENT ON COLUMN machine_daily_rate_history.is_active IS 'Whether this is the currently active rate';

-- =====================================================
-- STEP 4: Create Trigger to Auto-update updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_machine_daily_rate_history_updated_at()
RETURNS TRIGGER AS $trigger$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$trigger$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_machine_daily_rate_history_updated_at ON machine_daily_rate_history;
CREATE TRIGGER trigger_update_machine_daily_rate_history_updated_at
    BEFORE UPDATE ON machine_daily_rate_history
    FOR EACH ROW
    EXECUTE FUNCTION update_machine_daily_rate_history_updated_at();

-- =====================================================
-- STEP 5: Create Trigger to Ensure Only One Active Rate Per Machine
-- =====================================================

CREATE OR REPLACE FUNCTION ensure_single_active_machine_rate()
RETURNS TRIGGER AS $trigger$
BEGIN
    -- If setting a rate as active, deactivate all other rates for this machine
    IF NEW.is_active = true THEN
        UPDATE machine_daily_rate_history
        SET is_active = false
        WHERE machine_id = NEW.machine_id
        AND id != NEW.id;
    END IF;
    RETURN NEW;
END;
$trigger$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ensure_single_active_machine_rate ON machine_daily_rate_history;
CREATE TRIGGER trigger_ensure_single_active_machine_rate
    BEFORE INSERT OR UPDATE ON machine_daily_rate_history
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_active_machine_rate();

-- =====================================================
-- STEP 6: Enable Row Level Security
-- =====================================================

ALTER TABLE machine_daily_rate_history ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 7: Create RLS Policies
-- =====================================================

-- Policy for SELECT: Allow authenticated users to read
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'machine_daily_rate_history'
        AND policyname = 'Allow authenticated users to read machine_daily_rate_history'
    ) THEN
        CREATE POLICY "Allow authenticated users to read machine_daily_rate_history"
            ON machine_daily_rate_history
            FOR SELECT
            TO authenticated
            USING (true);
        RAISE NOTICE '✅ Created SELECT policy for machine_daily_rate_history';
    ELSE
        RAISE NOTICE '✅ SELECT policy already exists for machine_daily_rate_history';
    END IF;
END $$;

-- Policy for INSERT: Allow authenticated users to insert
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'machine_daily_rate_history'
        AND policyname = 'Allow authenticated users to insert machine_daily_rate_history'
    ) THEN
        CREATE POLICY "Allow authenticated users to insert machine_daily_rate_history"
            ON machine_daily_rate_history
            FOR INSERT
            TO authenticated
            WITH CHECK (true);
        RAISE NOTICE '✅ Created INSERT policy for machine_daily_rate_history';
    ELSE
        RAISE NOTICE '✅ INSERT policy already exists for machine_daily_rate_history';
    END IF;
END $$;

-- Policy for UPDATE: Allow authenticated users to update
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'machine_daily_rate_history'
        AND policyname = 'Allow authenticated users to update machine_daily_rate_history'
    ) THEN
        CREATE POLICY "Allow authenticated users to update machine_daily_rate_history"
            ON machine_daily_rate_history
            FOR UPDATE
            TO authenticated
            USING (true)
            WITH CHECK (true);
        RAISE NOTICE '✅ Created UPDATE policy for machine_daily_rate_history';
    ELSE
        RAISE NOTICE '✅ UPDATE policy already exists for machine_daily_rate_history';
    END IF;
END $$;

-- Policy for DELETE: Allow authenticated users to delete
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'machine_daily_rate_history'
        AND policyname = 'Allow authenticated users to delete machine_daily_rate_history'
    ) THEN
        CREATE POLICY "Allow authenticated users to delete machine_daily_rate_history"
            ON machine_daily_rate_history
            FOR DELETE
            TO authenticated
            USING (true);
        RAISE NOTICE '✅ Created DELETE policy for machine_daily_rate_history';
    ELSE
        RAISE NOTICE '✅ DELETE policy already exists for machine_daily_rate_history';
    END IF;
END $$;

-- =====================================================
-- STEP 8: Grant Permissions
-- =====================================================

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON machine_daily_rate_history TO authenticated;

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
    RAISE NOTICE '✅ Successfully created machine_daily_rate_history table!';
    RAISE NOTICE '✅ Trigger ensures only one active rate per machine';
    RAISE NOTICE '✅ All permissions and policies configured';
    RAISE NOTICE '✅ Indexes created for better performance';
    RAISE NOTICE '====================================================';
END $$;

