-- =====================================================
-- Quick Check and Create Script for Daily Rate History
-- =====================================================
-- Run this script to verify the table exists and create it if needed
-- =====================================================

-- Check if table exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'designation_daily_rate_history'
    ) THEN
        RAISE NOTICE '❌ Table does not exist. Creating it now...';
        
        -- Create the table
        CREATE TABLE designation_daily_rate_history (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          designation_id UUID NOT NULL REFERENCES designation_rates(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          hourly_rate DECIMAL(10, 2) NOT NULL CHECK (hourly_rate >= 0),
          daily_rate DECIMAL(10, 2) GENERATED ALWAYS AS (hourly_rate * 8) STORED,
          start_date DATE NOT NULL,
          end_date DATE,
          is_active BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
          CONSTRAINT valid_date_range CHECK (end_date IS NULL OR end_date >= start_date)
        );

        -- Create indexes
        CREATE INDEX idx_daily_rate_history_designation_id ON designation_daily_rate_history(designation_id);
        CREATE INDEX idx_daily_rate_history_start_date ON designation_daily_rate_history(start_date);
        CREATE INDEX idx_daily_rate_history_end_date ON designation_daily_rate_history(end_date);
        CREATE INDEX idx_daily_rate_history_is_active ON designation_daily_rate_history(is_active);
        CREATE INDEX idx_daily_rate_history_designation_active ON designation_daily_rate_history(designation_id, is_active) WHERE is_active = true;

        -- Enable RLS
        ALTER TABLE designation_daily_rate_history ENABLE ROW LEVEL SECURITY;

        -- Create RLS policies
        CREATE POLICY "Allow authenticated users to read daily_rate_history"
            ON designation_daily_rate_history FOR SELECT TO authenticated USING (true);

        CREATE POLICY "Allow authenticated users to insert daily_rate_history"
            ON designation_daily_rate_history FOR INSERT TO authenticated WITH CHECK (true);

        CREATE POLICY "Allow authenticated users to update daily_rate_history"
            ON designation_daily_rate_history FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

        CREATE POLICY "Allow authenticated users to delete daily_rate_history"
            ON designation_daily_rate_history FOR DELETE TO authenticated USING (true);

        -- Grant permissions
        GRANT SELECT, INSERT, UPDATE, DELETE ON designation_daily_rate_history TO authenticated;

        -- Create trigger function
        CREATE OR REPLACE FUNCTION update_daily_rate_history_updated_at()
        RETURNS TRIGGER AS $trigger$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $trigger$ LANGUAGE plpgsql;

        -- Create trigger
        CREATE TRIGGER trigger_update_daily_rate_history_updated_at
            BEFORE UPDATE ON designation_daily_rate_history
            FOR EACH ROW
            EXECUTE FUNCTION update_daily_rate_history_updated_at();

        -- Create trigger to ensure only one active rate
        CREATE OR REPLACE FUNCTION ensure_single_active_rate()
        RETURNS TRIGGER AS $trigger$
        BEGIN
            IF NEW.is_active = true THEN
                UPDATE designation_daily_rate_history
                SET is_active = false
                WHERE designation_id = NEW.designation_id
                AND id != NEW.id;
            END IF;
            RETURN NEW;
        END;
        $trigger$ LANGUAGE plpgsql;

        CREATE TRIGGER trigger_ensure_single_active_rate
            BEFORE INSERT OR UPDATE ON designation_daily_rate_history
            FOR EACH ROW
            EXECUTE FUNCTION ensure_single_active_rate();

        RAISE NOTICE '✅ Table created successfully!';
    ELSE
        RAISE NOTICE '✅ Table already exists.';
    END IF;
END $$;

-- Verify table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'designation_daily_rate_history'
ORDER BY ordinal_position;

-- Verify RLS is enabled
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
AND tablename = 'designation_daily_rate_history';

-- Verify policies
SELECT 
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'designation_daily_rate_history';

