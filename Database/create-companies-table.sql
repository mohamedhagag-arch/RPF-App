-- ============================================================
-- Create Planning Database - Companies Table
-- جدول الشركات (عميل، استشاري، طرف أول، مقاول)
-- ============================================================

-- Create table if it doesn't exist
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

-- Add comments
COMMENT ON TABLE public."Planning Database - Companies" IS 'Stores company information including Clients, Consultants, Contractors, First Parties, and Individuals';
COMMENT ON COLUMN public."Planning Database - Companies"."Company Name" IS 'Name of the company or individual';
COMMENT ON COLUMN public."Planning Database - Companies"."Company Type" IS 'Type of company: Client, Consultant, Contractor, First Party, or Individual';

-- ============================================================
-- Row Level Security (RLS) Policies
-- ============================================================

-- Enable RLS
ALTER TABLE public."Planning Database - Companies" ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can view companies
DROP POLICY IF EXISTS "Users can view companies" ON public."Planning Database - Companies";
CREATE POLICY "Users can view companies" ON public."Planning Database - Companies"
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: All authenticated users can insert companies (can be restricted later)
DROP POLICY IF EXISTS "Users can insert companies" ON public."Planning Database - Companies";
CREATE POLICY "Users can insert companies" ON public."Planning Database - Companies"
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy: All authenticated users can update companies (can be restricted later)
DROP POLICY IF EXISTS "Users can update companies" ON public."Planning Database - Companies";
CREATE POLICY "Users can update companies" ON public."Planning Database - Companies"
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy: All authenticated users can delete companies (can be restricted later)
DROP POLICY IF EXISTS "Users can delete companies" ON public."Planning Database - Companies";
CREATE POLICY "Users can delete companies" ON public."Planning Database - Companies"
    FOR DELETE
    TO authenticated
    USING (true);

-- ============================================================
-- Function to update updated_at timestamp
-- ============================================================

CREATE OR REPLACE FUNCTION update_companies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updated_at" = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_companies_updated_at ON public."Planning Database - Companies";
CREATE TRIGGER trigger_update_companies_updated_at
    BEFORE UPDATE ON public."Planning Database - Companies"
    FOR EACH ROW
    EXECUTE FUNCTION update_companies_updated_at();

-- ============================================================
-- Function to set created_by on insert
-- ============================================================

CREATE OR REPLACE FUNCTION set_companies_created_by()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."created_by" IS NULL THEN
        NEW."created_by" = auth.uid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for created_by
DROP TRIGGER IF EXISTS trigger_set_companies_created_by ON public."Planning Database - Companies";
CREATE TRIGGER trigger_set_companies_created_by
    BEFORE INSERT ON public."Planning Database - Companies"
    FOR EACH ROW
    EXECUTE FUNCTION set_companies_created_by();

-- ============================================================
-- Create indexes for better performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_companies_type ON public."Planning Database - Companies"("Company Type");
CREATE INDEX IF NOT EXISTS idx_companies_name ON public."Planning Database - Companies"("Company Name");

-- ============================================================
-- Verify table structure
-- ============================================================

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'Planning Database - Companies'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Success message
SELECT '✅ Companies table created successfully!' as status;

