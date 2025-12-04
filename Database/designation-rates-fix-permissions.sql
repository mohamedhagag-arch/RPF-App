-- =====================================================
-- Fix Permissions for Designation Rates Table
-- =====================================================
-- This script fixes RLS policies and grants permissions
-- Run this if you get "permission denied" errors
-- =====================================================

-- Step 1: Grant schema usage
GRANT USAGE ON SCHEMA public TO authenticated;

-- Step 2: Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON designation_rates TO authenticated;

-- Step 3: Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow authenticated users to read designation_rates" ON designation_rates;
DROP POLICY IF EXISTS "Allow authenticated users to insert designation_rates" ON designation_rates;
DROP POLICY IF EXISTS "Allow authenticated users to update designation_rates" ON designation_rates;
DROP POLICY IF EXISTS "Allow authenticated users to delete designation_rates" ON designation_rates;

-- Step 4: Recreate RLS policies
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

-- Step 5: Ensure RLS is enabled
ALTER TABLE designation_rates ENABLE ROW LEVEL SECURITY;

-- Step 6: Grant sequence permissions (if using sequences)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- Verification Queries
-- =====================================================

-- Check if permissions were granted
SELECT 
    grantee, 
    privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'designation_rates'
    AND grantee = 'authenticated';

-- Check if policies were created
SELECT 
    policyname, 
    permissive, 
    roles, 
    cmd
FROM pg_policies
WHERE tablename = 'designation_rates';

-- =====================================================
-- Success Message
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Successfully fixed permissions for designation_rates table!';
    RAISE NOTICE '✅ RLS policies recreated';
    RAISE NOTICE '✅ Permissions granted to authenticated users';
END $$;

