-- ============================================
-- 🔧 Fix Currencies Table - Add usage_count Column
-- ============================================
-- This script adds the missing usage_count column to the currencies table

-- Add usage_count column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'currencies' 
        AND column_name = 'usage_count'
    ) THEN
        ALTER TABLE currencies ADD COLUMN usage_count INTEGER DEFAULT 0;
        COMMENT ON COLUMN currencies.usage_count IS 'Number of projects using this currency';
    END IF;
END $$;

-- Create index for usage_count if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_currencies_usage_count ON currencies(usage_count);

-- Update usage_count based on existing projects (if applicable)
-- This assumes there's a currency_code or currency column in the projects table
DO $$
BEGIN
    -- Check if projects table has a currency-related column
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'Planning Database - ProjectsList' 
        AND column_name IN ('currency', 'currency_code')
    ) THEN
        -- Update usage count based on project currency usage
        UPDATE currencies c
        SET usage_count = (
            SELECT COUNT(DISTINCT p.id)
            FROM "Planning Database - ProjectsList" p
            WHERE p.currency = c.code OR p.currency_code = c.code
        );
    END IF;
END $$;

-- Ensure RLS policies are correct
ALTER TABLE currencies ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Anyone can view active currencies" ON currencies;
DROP POLICY IF EXISTS "Authenticated users can add currencies" ON currencies;
DROP POLICY IF EXISTS "Authenticated users can update currencies" ON currencies;
DROP POLICY IF EXISTS "Authenticated users can delete currencies" ON currencies;

-- Create comprehensive RLS policies

-- 1. Allow everyone to read active currencies
CREATE POLICY "Anyone can view active currencies" ON currencies
    FOR SELECT USING (is_active = true);

-- 2. Allow authenticated users to read all currencies
CREATE POLICY "Authenticated users can read all currencies" ON currencies
    FOR SELECT USING (auth.role() = 'authenticated');

-- 3. Allow admins and managers to insert currencies
CREATE POLICY "Admins and managers can insert currencies" ON currencies
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'manager')
        )
    );

-- 4. Allow admins and managers to update currencies
CREATE POLICY "Admins and managers can update currencies" ON currencies
    FOR UPDATE USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'manager')
        )
    );

-- 5. Allow admins to delete currencies
CREATE POLICY "Admins can delete currencies" ON currencies
    FOR DELETE USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Grant necessary permissions
GRANT ALL ON currencies TO authenticated;
GRANT SELECT ON currencies TO anon;

-- Verify the column was added
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'currencies' 
AND column_name = 'usage_count';

-- Log success
SELECT 'Currencies table usage_count column added successfully!' AS status;
