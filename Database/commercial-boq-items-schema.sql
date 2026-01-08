-- ============================================================
-- Commercial Section - BOQ Items Table
-- ============================================================
-- This table stores BOQ (Bill of Quantities) items for the Commercial section
-- Run this script in Supabase SQL Editor to create the table
-- ============================================================

-- Create sequence for unique reference numbers (must be created before table)
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS boq_items_ref_seq START 1;

-- Create BOQ Items Table
-- ============================================================
CREATE TABLE IF NOT EXISTS public."BOQ items" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "Auto Generated Unique Reference Number" TEXT UNIQUE,
  "Project Full Code" TEXT NOT NULL,
  "Project Name" TEXT NOT NULL,
  "Item Description" TEXT NOT NULL,
  "Unit" TEXT,
  "Quantity" INTEGER DEFAULT 0,
  "Rate" NUMERIC(15, 2) DEFAULT 0.00,
  "Total Value" NUMERIC(15, 2) DEFAULT 0.00,
  "Remeasurable?" BOOLEAN DEFAULT FALSE,
  "Planning Assigned Amount" NUMERIC(15, 2) DEFAULT 0.00,
  "Units Variation" NUMERIC(15, 2) DEFAULT 0.00,
  "Variations Amount" NUMERIC(15, 2) DEFAULT 0.00,
  "Total Units" NUMERIC(15, 2) DEFAULT 0.00,
  "Total Including Variations" NUMERIC(15, 2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public."BOQ items" IS 'Commercial BOQ items with project details, quantities, rates, and variations';

-- Create function to auto-generate unique reference number
-- ============================================================
CREATE OR REPLACE FUNCTION generate_boq_item_ref()
RETURNS TRIGGER AS $$
BEGIN
  -- Always generate a new reference number if not provided
  IF NEW."Auto Generated Unique Reference Number" IS NULL OR NEW."Auto Generated Unique Reference Number" = '' THEN
    NEW."Auto Generated Unique Reference Number" := 'BOQ-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('boq_items_ref_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate reference number
-- ============================================================
DROP TRIGGER IF EXISTS trigger_generate_boq_item_ref ON public."BOQ items";
CREATE TRIGGER trigger_generate_boq_item_ref
  BEFORE INSERT ON public."BOQ items"
  FOR EACH ROW
  EXECUTE FUNCTION generate_boq_item_ref();

-- Add NOT NULL constraint to reference number (after trigger is created)
-- ============================================================
ALTER TABLE public."BOQ items" 
  ALTER COLUMN "Auto Generated Unique Reference Number" SET NOT NULL;

-- Create trigger for updated_at timestamp
-- ============================================================
DROP TRIGGER IF EXISTS update_boq_items_updated_at ON public."BOQ items";
CREATE TRIGGER update_boq_items_updated_at BEFORE UPDATE ON public."BOQ items"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
-- ============================================================
ALTER TABLE public."BOQ items" ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
-- ============================================================
-- Allow authenticated users to do everything
DROP POLICY IF EXISTS "auth_all_boq_items" ON public."BOQ items";
CREATE POLICY "auth_all_boq_items" ON public."BOQ items"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create Indexes for Performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_boq_items_ref_number ON public."BOQ items" ("Auto Generated Unique Reference Number");
CREATE INDEX IF NOT EXISTS idx_boq_items_project_full_code ON public."BOQ items" ("Project Full Code");
CREATE INDEX IF NOT EXISTS idx_boq_items_project_name ON public."BOQ items" ("Project Name");
CREATE INDEX IF NOT EXISTS idx_boq_items_created_at ON public."BOQ items" (created_at DESC);

-- Grant Permissions
-- ============================================================
GRANT ALL ON TABLE public."BOQ items" TO postgres, authenticated, service_role;
GRANT SELECT ON TABLE public."BOQ items" TO anon;
GRANT USAGE, SELECT ON SEQUENCE boq_items_ref_seq TO postgres, authenticated, service_role;

-- Analyze table for better performance
-- ============================================================
ANALYZE public."BOQ items";

-- ============================================================
-- ✅ BOQ Items Table Setup Complete!
-- ============================================================
-- The table has been created with:
-- ✅ Auto-generated unique reference numbers
-- ✅ All required columns (Project Full Code, Project Name, Item Description, Unit, Quantity, Rate, Total Value, Remeasurable?, Planning Assigned Amount, Units Variation, Variations Amount, Total Including Variations)
-- ✅ RLS enabled with authenticated user access
-- ✅ Indexes for performance
-- ✅ Auto-update timestamps
-- ============================================================

