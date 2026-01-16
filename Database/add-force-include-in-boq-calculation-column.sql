-- ============================================================
-- Add "Force Include in BOQ Calculation" column
-- Commercial Section - Contract Variations Table
-- ============================================================
-- Run this script in Supabase SQL Editor
-- ============================================================

-- Step 1: Add the new "Force Include in BOQ Calculation" column
-- ============================================================
ALTER TABLE public."Contract Variations"
  ADD COLUMN IF NOT EXISTS "Force Include in BOQ Calculation" BOOLEAN DEFAULT false;

-- Step 2: Add comment for the new column
-- ============================================================
COMMENT ON COLUMN public."Contract Variations"."Force Include in BOQ Calculation" IS 'When enabled, includes this variation in BOQ calculations even if status is not Approved. Default: false';

-- Step 3: Create index for better query performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_contract_variations_force_include ON public."Contract Variations" ("Force Include in BOQ Calculation");

-- Step 4: Set default value for existing rows (should already be false, but ensuring it)
-- ============================================================
UPDATE public."Contract Variations"
SET "Force Include in BOQ Calculation" = false
WHERE "Force Include in BOQ Calculation" IS NULL;

-- ============================================================
-- ✅ Migration Complete!
-- ============================================================
-- The table now has:
-- ✅ "Force Include in BOQ Calculation" column added (default: false)
-- ✅ Index created for better query performance
-- ============================================================
