-- ============================================================
-- Migration: Change Contract Variations Item Description from UUID[] to UUID
-- ============================================================
-- This script migrates the "Item Description" column from an array of UUIDs
-- to a single UUID, keeping only the first item from existing arrays.
-- Run this script in Supabase SQL Editor
-- ============================================================

BEGIN;

-- Step 1: Add a new temporary column for single UUID
ALTER TABLE public."Contract Variations"
ADD COLUMN IF NOT EXISTS "Item Description Single" UUID;

-- Step 2: Migrate existing data - extract first UUID from array (or NULL if empty)
UPDATE public."Contract Variations"
SET "Item Description Single" = 
  CASE 
    WHEN "Item Description" IS NULL OR array_length("Item Description", 1) IS NULL THEN NULL
    WHEN array_length("Item Description", 1) > 0 THEN "Item Description"[1]
    ELSE NULL
  END;

-- Step 3: Drop the old array column
ALTER TABLE public."Contract Variations"
DROP COLUMN IF EXISTS "Item Description";

-- Step 4: Rename the new column to the original name
ALTER TABLE public."Contract Variations"
RENAME COLUMN "Item Description Single" TO "Item Description";

-- Step 5: Update column comment
COMMENT ON COLUMN public."Contract Variations"."Item Description" IS 'Single UUID reference to BOQ items table';

-- Step 6: Add foreign key constraint if needed (optional, for data integrity)
-- Note: This assumes BOQ items table exists and has an id column
-- ALTER TABLE public."Contract Variations"
-- ADD CONSTRAINT fk_contract_variations_boq_item 
-- FOREIGN KEY ("Item Description") 
-- REFERENCES public."BOQ items"(id) 
-- ON DELETE SET NULL;

COMMIT;

-- Verification query (run after migration to check results)
-- SELECT 
--   id,
--   "Auto Generated Unique Reference Number",
--   "Item Description",
--   CASE 
--     WHEN "Item Description" IS NULL THEN 'No BOQ item'
--     ELSE 'Has BOQ item'
--   END as status
-- FROM public."Contract Variations"
-- LIMIT 10;

