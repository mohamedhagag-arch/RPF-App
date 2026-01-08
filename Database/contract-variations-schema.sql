-- ============================================================
-- Commercial Section - Contract Variations Table
-- ============================================================
-- This table stores Contract Variations for the Commercial section
-- Run this script in Supabase SQL Editor to create the table
-- ============================================================

-- Create sequence for unique reference numbers (must be created before table)
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS contract_variations_ref_seq START 1;

-- Create ENUM type for Variation Status
-- ============================================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'variation_status') THEN
        CREATE TYPE variation_status AS ENUM (
            'Pending',
            'Var Notice Sent',
            'Submitted',
            'Approved',
            'Rejected',
            'Internal Variation'
        );
    END IF;
END $$;

-- Create Contract Variations Table
-- ============================================================
CREATE TABLE IF NOT EXISTS public."Contract Variations" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "Auto Generated Unique Reference Number" TEXT UNIQUE,
  "Project Full Code" TEXT NOT NULL,
  "Project Name" TEXT NOT NULL,
  "Variation Ref no." TEXT,
  "Item Description" UUID[] DEFAULT ARRAY[]::UUID[],
  "Quantity Changes" NUMERIC(15, 2) DEFAULT 0.00,
  "Variation Amount" NUMERIC(15, 2) DEFAULT 0.00,
  "Date of Submission" DATE,
  "Variation Status" variation_status DEFAULT 'Pending',
  "Date of Approval" DATE,
  "Remarks" TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE public."Contract Variations" IS 'Contract variations with project details, BOQ item references, quantities, amounts, and approval status';
COMMENT ON COLUMN public."Contract Variations"."Auto Generated Unique Reference Number" IS 'Auto-generated unique reference number in format VAR-YYYY-XXX';
COMMENT ON COLUMN public."Contract Variations"."Project Full Code" IS 'References Project Sub-Code from Planning Database - ProjectsList';
COMMENT ON COLUMN public."Contract Variations"."Project Name" IS 'Auto-populated from Planning Database - ProjectsList based on Project Full Code';
COMMENT ON COLUMN public."Contract Variations"."Item Description" IS 'Array of UUID references to BOQ items table';
COMMENT ON COLUMN public."Contract Variations"."Quantity Changes" IS 'Quantity changes as a decimal number';
COMMENT ON COLUMN public."Contract Variations"."Variation Amount" IS 'Variation amount in currency (2 decimal places)';
COMMENT ON COLUMN public."Contract Variations"."Variation Status" IS 'Current status of the variation';

-- Create function to auto-generate unique reference number
-- ============================================================
CREATE OR REPLACE FUNCTION generate_contract_variation_ref()
RETURNS TRIGGER AS $$
DECLARE
  current_year TEXT;
  seq_num INTEGER;
BEGIN
  -- Always generate a new reference number if not provided
  IF NEW."Auto Generated Unique Reference Number" IS NULL OR NEW."Auto Generated Unique Reference Number" = '' THEN
    current_year := TO_CHAR(NOW(), 'YYYY');
    seq_num := NEXTVAL('contract_variations_ref_seq');
    NEW."Auto Generated Unique Reference Number" := 'VAR-' || current_year || '-' || LPAD(seq_num::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate reference number
-- ============================================================
DROP TRIGGER IF EXISTS trigger_generate_contract_variation_ref ON public."Contract Variations";
CREATE TRIGGER trigger_generate_contract_variation_ref
  BEFORE INSERT ON public."Contract Variations"
  FOR EACH ROW
  EXECUTE FUNCTION generate_contract_variation_ref();

-- Add NOT NULL constraint to reference number (after trigger is created)
-- ============================================================
ALTER TABLE public."Contract Variations" 
  ALTER COLUMN "Auto Generated Unique Reference Number" SET NOT NULL;

-- Create function to auto-populate Project Name from Project Full Code
-- ============================================================
CREATE OR REPLACE FUNCTION populate_project_name_from_code()
RETURNS TRIGGER AS $$
BEGIN
  -- If Project Name is not provided or empty, try to get it from ProjectsList
  IF NEW."Project Name" IS NULL OR NEW."Project Name" = '' THEN
    SELECT "Project Name" INTO NEW."Project Name"
    FROM public."Planning Database - ProjectsList"
    WHERE "Project Sub-Code" = NEW."Project Full Code"
    LIMIT 1;
    
    -- If still null, set to empty string to avoid NOT NULL constraint violation
    IF NEW."Project Name" IS NULL THEN
      NEW."Project Name" := '';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-populate Project Name
-- ============================================================
DROP TRIGGER IF EXISTS trigger_populate_project_name ON public."Contract Variations";
CREATE TRIGGER trigger_populate_project_name
  BEFORE INSERT OR UPDATE ON public."Contract Variations"
  FOR EACH ROW
  EXECUTE FUNCTION populate_project_name_from_code();

-- Create trigger for updated_at timestamp
-- ============================================================
-- Ensure update_updated_at_column function exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_contract_variations_updated_at 
  BEFORE UPDATE ON public."Contract Variations"
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
-- ============================================================
ALTER TABLE public."Contract Variations" ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
-- ============================================================
-- Allow authenticated users to do everything
CREATE POLICY "auth_all_contract_variations" ON public."Contract Variations"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create Indexes for Performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_contract_variations_ref_number 
  ON public."Contract Variations" ("Auto Generated Unique Reference Number");
CREATE INDEX IF NOT EXISTS idx_contract_variations_project_full_code 
  ON public."Contract Variations" ("Project Full Code");
CREATE INDEX IF NOT EXISTS idx_contract_variations_project_name 
  ON public."Contract Variations" ("Project Name");
CREATE INDEX IF NOT EXISTS idx_contract_variations_status 
  ON public."Contract Variations" ("Variation Status");
CREATE INDEX IF NOT EXISTS idx_contract_variations_created_at 
  ON public."Contract Variations" (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contract_variations_created_by 
  ON public."Contract Variations" (created_by);
CREATE INDEX IF NOT EXISTS idx_contract_variations_item_description 
  ON public."Contract Variations" USING GIN ("Item Description");

-- Grant Permissions
-- ============================================================
GRANT ALL ON TABLE public."Contract Variations" TO postgres, authenticated, service_role;
GRANT SELECT ON TABLE public."Contract Variations" TO anon;
GRANT USAGE, SELECT ON SEQUENCE contract_variations_ref_seq TO postgres, authenticated, service_role;

-- Analyze table for better performance
-- ============================================================
ANALYZE public."Contract Variations";

-- ============================================================
-- ✅ Contract Variations Table Setup Complete!
-- ============================================================
-- The table has been created with:
-- ✅ Auto-generated unique reference numbers (VAR-YYYY-XXX format)
-- ✅ All required columns (Project Full Code, Project Name, Variation Ref no., Item Description array, Quantity Changes, Variation Amount, Date of Submission, Variation Status, Date of Approval, Remarks)
-- ✅ Auto-populated Project Name from ProjectsList table
-- ✅ Enum constraint for Variation Status
-- ✅ RLS enabled with authenticated user access
-- ✅ Indexes for performance (including GIN index for UUID array)
-- ✅ Auto-update timestamps
-- ✅ User tracking (created_by, updated_by)
-- ============================================================

