-- ============================================================
-- Complete Companies Table Creation Script
-- سكريبت كامل لإنشاء جدول Companies مع إصلاح جميع المشاكل
-- ============================================================

-- Step 1: Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS public."Planning Database - Companies" (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "Company Name" TEXT NOT NULL,
    "Company Type" TEXT NOT NULL CHECK ("Company Type" IN ('Client', 'Consultant', 'Contractor', 'First Party', 'Individual')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Ensure unique company names per type
    UNIQUE ("Company Name", "Company Type")
);

-- Step 2: Drop ALL existing policies (to start fresh)
DROP POLICY IF EXISTS "Users can view companies" ON public."Planning Database - Companies";
DROP POLICY IF EXISTS "Admins and managers can insert companies" ON public."Planning Database - Companies";
DROP POLICY IF EXISTS "Admins and managers can update companies" ON public."Planning Database - Companies";
DROP POLICY IF EXISTS "Admins can delete companies" ON public."Planning Database - Companies";
DROP POLICY IF EXISTS "Users can insert companies" ON public."Planning Database - Companies";
DROP POLICY IF EXISTS "Users can update companies" ON public."Planning Database - Companies";
DROP POLICY IF EXISTS "Users can delete companies" ON public."Planning Database - Companies";

-- Step 3: Disable RLS temporarily, then re-enable with correct policies
ALTER TABLE public."Planning Database - Companies" DISABLE ROW LEVEL SECURITY;

-- Step 4: Re-enable RLS
ALTER TABLE public."Planning Database - Companies" ENABLE ROW LEVEL SECURITY;

-- Step 5: Create policies with explicit role specification
-- Policy: All authenticated users can view companies
CREATE POLICY "Users can view companies" 
ON public."Planning Database - Companies"
FOR SELECT
TO authenticated
USING (true);

-- Policy: All authenticated users can insert companies
CREATE POLICY "Users can insert companies" 
ON public."Planning Database - Companies"
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: All authenticated users can update companies
CREATE POLICY "Users can update companies" 
ON public."Planning Database - Companies"
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy: All authenticated users can delete companies
CREATE POLICY "Users can delete companies" 
ON public."Planning Database - Companies"
FOR DELETE
TO authenticated
USING (true);

-- Step 6: Grant explicit permissions (if needed)
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Planning Database - Companies" TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Step 7: Create or replace functions
CREATE OR REPLACE FUNCTION update_companies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updated_at" = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_companies_created_by()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."created_by" IS NULL THEN
        NEW."created_by" = auth.uid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create or replace triggers
DROP TRIGGER IF EXISTS trigger_update_companies_updated_at ON public."Planning Database - Companies";
CREATE TRIGGER trigger_update_companies_updated_at
    BEFORE UPDATE ON public."Planning Database - Companies"
    FOR EACH ROW
    EXECUTE FUNCTION update_companies_updated_at();

DROP TRIGGER IF EXISTS trigger_set_companies_created_by ON public."Planning Database - Companies";
CREATE TRIGGER trigger_set_companies_created_by
    BEFORE INSERT ON public."Planning Database - Companies"
    FOR EACH ROW
    EXECUTE FUNCTION set_companies_created_by();

-- Step 9: Create indexes
CREATE INDEX IF NOT EXISTS idx_companies_type ON public."Planning Database - Companies"("Company Type");
CREATE INDEX IF NOT EXISTS idx_companies_name ON public."Planning Database - Companies"("Company Name");

-- Step 10: Verify table and policies
SELECT 
    'Table exists' as status,
    COUNT(*) as row_count
FROM public."Planning Database - Companies";

SELECT 
    policyname,
    cmd,
    roles
FROM pg_policies 
WHERE schemaname = 'public' 
    AND tablename = 'Planning Database - Companies'
ORDER BY policyname;

-- Success message
SELECT '✅ Companies table created and configured successfully!' as status;


