-- ============================================================
-- Add "Total Units" column to BOQ items table
-- Commercial Section - BOQ Items Table
-- ============================================================
-- Run this script in Supabase SQL Editor
-- ============================================================

-- Step 1: Add the "Total Units" column
-- ============================================================
ALTER TABLE public."BOQ items"
  ADD COLUMN IF NOT EXISTS "Total Units" NUMERIC(15, 2) DEFAULT 0.00;

-- Step 2: Update existing rows to calculate Total Units = Quantity + Units Variation
-- ============================================================
UPDATE public."BOQ items"
SET "Total Units" = COALESCE("Quantity", 0) + COALESCE("Units Variation", 0)
WHERE "Total Units" IS NULL OR "Total Units" = 0;

-- Step 3: Add comment for the new column
-- ============================================================
COMMENT ON COLUMN public."BOQ items"."Total Units" IS 'Total units calculated as Quantity + Units Variation';

-- Step 4: Create index for Total Units if needed
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_boq_items_total_units ON public."BOQ items" ("Total Units");

-- ============================================================
-- ✅ Migration Complete!
-- ============================================================
-- The table now has:
-- ✅ "Total Units" column added
-- ✅ Existing rows updated with calculated values
-- ============================================================

