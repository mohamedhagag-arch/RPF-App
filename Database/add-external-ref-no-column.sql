-- ============================================================
-- Add "External Ref no." column to BOQ items table
-- Commercial Section - BOQ Items Table
-- ============================================================
-- Run this script in Supabase SQL Editor
-- ============================================================

-- Step 1: Add the "External Ref no." column
-- ============================================================
ALTER TABLE public."BOQ items"
  ADD COLUMN IF NOT EXISTS "External Ref no." TEXT NOT NULL DEFAULT '';

-- Step 2: Update existing rows to have empty string (already handled by DEFAULT)
-- ============================================================
-- No update needed as DEFAULT '' handles existing rows

-- Step 3: Add comment for the new column
-- ============================================================
COMMENT ON COLUMN public."BOQ items"."External Ref no." IS 'External reference number for BOQ items';

-- Step 4: Create index for External Ref no. if needed (optional, for search performance)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_boq_items_external_ref_no ON public."BOQ items" ("External Ref no.");

-- ============================================================
-- ✅ Migration Complete!
-- ============================================================
-- The table now has:
-- ✅ "External Ref no." column added (TEXT, NOT NULL, DEFAULT '')
-- ✅ Index created for search performance
-- ============================================================
