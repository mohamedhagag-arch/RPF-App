-- ============================================================
-- Add "Units Variation" column and rename "Variations" to "Variations Amount"
-- Commercial Section - BOQ Items Table
-- ============================================================
-- Run this script in Supabase SQL Editor
-- ============================================================

-- Step 1: Add the new "Units Variation" column
-- ============================================================
ALTER TABLE public."BOQ items"
  ADD COLUMN IF NOT EXISTS "Units Variation" NUMERIC(15, 2) DEFAULT 0.00;

-- Step 2: Rename "Variations" column to "Variations Amount"
-- ============================================================
ALTER TABLE public."BOQ items"
  RENAME COLUMN "Variations" TO "Variations Amount";

-- Step 3: Add comment for the new column
-- ============================================================
COMMENT ON COLUMN public."BOQ items"."Units Variation" IS 'Units variation for BOQ items';
COMMENT ON COLUMN public."BOQ items"."Variations Amount" IS 'Variations amount (renamed from Variations)';

-- Step 4: Create index for Units Variation if needed
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_boq_items_units_variation ON public."BOQ items" ("Units Variation");

-- ============================================================
-- ✅ Migration Complete!
-- ============================================================
-- The table now has:
-- ✅ "Units Variation" column added
-- ✅ "Variations" column renamed to "Variations Amount"
-- ============================================================

