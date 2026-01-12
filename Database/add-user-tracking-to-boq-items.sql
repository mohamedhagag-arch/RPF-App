-- ============================================================
-- Add User Tracking Columns to BOQ Items Table
-- ============================================================
-- This script adds created_by and updated_by columns to track who created and updated BOQ items
-- ============================================================

-- Add created_by and updated_by columns
ALTER TABLE public."BOQ items"
ADD COLUMN IF NOT EXISTS created_by TEXT,
ADD COLUMN IF NOT EXISTS updated_by TEXT;

-- Add comments
COMMENT ON COLUMN public."BOQ items".created_by IS 'User ID or email who created this BOQ item';
COMMENT ON COLUMN public."BOQ items".updated_by IS 'User ID or email who last updated this BOQ item';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_boq_items_created_by ON public."BOQ items"(created_by);
CREATE INDEX IF NOT EXISTS idx_boq_items_updated_by ON public."BOQ items"(updated_by);
