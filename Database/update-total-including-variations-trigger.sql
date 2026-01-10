-- ============================================================
-- Update "Total Including Variations" Trigger
-- Commercial Section - BOQ Items Table
-- ============================================================
-- This trigger ensures that "Total Including Variations" 
-- always equals "Total Value" + "Variations Amount"
-- Run this script in Supabase SQL Editor
-- ============================================================

-- Step 1: Create function to calculate Total Including Variations
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_total_including_variations()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate Total Including Variations = Total Value + Variations Amount
  NEW."Total Including Variations" := COALESCE(NEW."Total Value", 0) + COALESCE(NEW."Variations Amount", 0);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Drop existing trigger if it exists
-- ============================================================
DROP TRIGGER IF EXISTS trigger_calculate_total_including_variations ON public."BOQ items";

-- Step 3: Create trigger to automatically calculate Total Including Variations
-- ============================================================
CREATE TRIGGER trigger_calculate_total_including_variations
  BEFORE INSERT OR UPDATE ON public."BOQ items"
  FOR EACH ROW
  EXECUTE FUNCTION calculate_total_including_variations();

-- Step 4: Update existing rows to ensure they have correct values
-- ============================================================
UPDATE public."BOQ items"
SET "Total Including Variations" = COALESCE("Total Value", 0) + COALESCE("Variations Amount", 0)
WHERE "Total Including Variations" IS NULL 
   OR "Total Including Variations" != (COALESCE("Total Value", 0) + COALESCE("Variations Amount", 0));

-- Step 5: Add comment for documentation
-- ============================================================
COMMENT ON FUNCTION calculate_total_including_variations() IS 
  'Automatically calculates Total Including Variations as Total Value + Variations Amount';

-- ============================================================
-- ✅ Migration Complete!
-- ============================================================
-- The trigger now ensures:
-- ✅ "Total Including Variations" = "Total Value" + "Variations Amount" on INSERT
-- ✅ "Total Including Variations" = "Total Value" + "Variations Amount" on UPDATE
-- ✅ Existing rows have been updated with correct values
-- ============================================================
