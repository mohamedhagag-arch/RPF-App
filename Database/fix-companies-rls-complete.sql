-- ============================================================
-- COMPLETE FIX for Companies Table RLS Issues
-- حل شامل لمشاكل RLS في جدول Companies
-- ============================================================
-- Run this script in Supabase SQL Editor
-- شغّل هذا السكريبت في Supabase SQL Editor

-- ============================================================
-- STEP 1: Check if table exists
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'Planning Database - Companies'
    ) THEN
        RAISE NOTICE '⚠️ Table does not exist. Creating it now...';
        
        CREATE TABLE public."Planning Database - Companies" (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            "Company Name" TEXT NOT NULL,
            "Company Type" TEXT NOT NULL CHECK ("Company Type" IN ('Client', 'Consultant', 'Contractor', 'First Party', 'Individual')),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            created_by UUID REFERENCES auth.users(id),
            UNIQUE ("Company Name", "Company Type")
        );
        
        RAISE NOTICE '✅ Table created successfully';
    ELSE
        RAISE NOTICE '✅ Table already exists';
    END IF;
END $$;

-- ============================================================
-- STEP 2: Disable RLS temporarily to reset everything
-- ============================================================
ALTER TABLE public."Planning Database - Companies" DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 3: Drop ALL existing policies (complete cleanup)
-- ============================================================
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'Planning Database - Companies'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public."Planning Database - Companies"';
        RAISE NOTICE 'Dropped policy: %', r.policyname;
    END LOOP;
END $$;

-- ============================================================
-- STEP 4: Grant explicit permissions to authenticated role
-- ============================================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public."Planning Database - Companies" TO authenticated;

-- ============================================================
-- STEP 5: Re-enable RLS with correct policies
-- ============================================================
ALTER TABLE public."Planning Database - Companies" ENABLE ROW LEVEL SECURITY;

-- Policy 1: SELECT - All authenticated users can view
CREATE POLICY "authenticated_select_companies" 
ON public."Planning Database - Companies"
FOR SELECT
TO authenticated
USING (true);

-- Policy 2: INSERT - All authenticated users can insert
CREATE POLICY "authenticated_insert_companies" 
ON public."Planning Database - Companies"
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy 3: UPDATE - All authenticated users can update
CREATE POLICY "authenticated_update_companies" 
ON public."Planning Database - Companies"
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy 4: DELETE - All authenticated users can delete
CREATE POLICY "authenticated_delete_companies" 
ON public."Planning Database - Companies"
FOR DELETE
TO authenticated
USING (true);

-- ============================================================
-- STEP 6: Verify everything is set up correctly
-- ============================================================
DO $$
DECLARE
    policy_count INTEGER;
    rls_enabled BOOLEAN;
BEGIN
    -- Check if RLS is enabled
    SELECT rowsecurity INTO rls_enabled
    FROM pg_tables
    WHERE schemaname = 'public' 
    AND tablename = 'Planning Database - Companies';
    
    -- Count policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public' 
    AND tablename = 'Planning Database - Companies';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Verification Results:';
    RAISE NOTICE 'RLS Enabled: %', rls_enabled;
    RAISE NOTICE 'Policies Count: %', policy_count;
    RAISE NOTICE '========================================';
END $$;

-- ============================================================
-- STEP 7: Show all policies (for verification)
-- ============================================================
SELECT 
    policyname,
    permissive,
    roles,
    cmd as command,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies 
WHERE schemaname = 'public' 
    AND tablename = 'Planning Database - Companies'
ORDER BY policyname;

-- Success message
SELECT '✅ Companies table RLS completely fixed and verified!' as status;


