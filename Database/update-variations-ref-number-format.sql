-- ============================================================
-- Update Contract Variations Reference Number Format
-- Commercial Section - Contract Variations Table
-- ============================================================
-- New Format: [Variation Ref no. or VAR]-[BOQ Item Reference no. or NO-BOQ-REF]-[3-digit S/N]
-- Example: EXT-123-BOQ-P4110-P-EXT-123-24-001-001
-- Example with empty Variation Ref: VAR-BOQ-P4110-P-EXT-123-24-001-001
-- Example with missing BOQ Ref: EXT-123-NO-BOQ-REF-001
-- S/N increments for each unique combination of Variation Ref no. + BOQ Item Reference no.
-- ============================================================
-- Run this script in Supabase SQL Editor
-- ============================================================

-- Step 1: Drop the existing trigger functions
-- ============================================================
DROP TRIGGER IF EXISTS trigger_generate_contract_variation_ref ON public."Contract Variations";
DROP TRIGGER IF EXISTS trigger_prefix_variation_ref_no ON public."Contract Variations";
DROP FUNCTION IF EXISTS generate_contract_variation_ref();
DROP FUNCTION IF EXISTS get_next_variation_sequence_number(TEXT, TEXT);
DROP FUNCTION IF EXISTS get_boq_item_ref_number(UUID);
DROP FUNCTION IF EXISTS get_next_variation_seq_for_combo(TEXT, TEXT);
DROP FUNCTION IF EXISTS prefix_variation_ref_no();

-- Step 2: Create helper function to get BOQ Item Reference Number from UUID
-- ============================================================
CREATE OR REPLACE FUNCTION get_boq_item_ref_number(p_item_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  boq_ref_number TEXT;
BEGIN
  -- Get the Auto Generated Unique Reference Number from BOQ items table
  SELECT "Auto Generated Unique Reference Number"
  INTO boq_ref_number
  FROM public."BOQ items"
  WHERE id = p_item_uuid;
  
  -- Return the reference number or NULL if not found
  RETURN boq_ref_number;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create helper function to get next S/N for Variation Ref no. + BOQ Item Reference no. combination
-- ============================================================
CREATE OR REPLACE FUNCTION get_next_variation_seq_for_combo(
  p_variation_ref_no TEXT,
  p_boq_item_ref_number TEXT
)
RETURNS INTEGER AS $$
DECLARE
  max_seq INTEGER;
  pattern TEXT;
  base_pattern TEXT;
BEGIN
  -- Build base pattern: [Variation Ref no.]-[BOQ Item Reference no.]-[S/N]
  base_pattern := REPLACE(REPLACE(REPLACE(p_variation_ref_no, '\', '\\'), '-', '\-'), '.', '\.') || '-' || 
                  REPLACE(REPLACE(REPLACE(p_boq_item_ref_number, '\', '\\'), '-', '\-'), '.', '\.');
  pattern := '^' || base_pattern || '-([0-9]+)$';
  
  -- Find the maximum S/N for this combination
  SELECT COALESCE(MAX(
    CASE 
      WHEN "Auto Generated Unique Reference Number" ~ pattern
      THEN CAST(
        (regexp_match("Auto Generated Unique Reference Number", pattern))[1] AS INTEGER
      )
      ELSE NULL
    END
  ), 0)
  INTO max_seq
  FROM public."Contract Variations"
  WHERE "Auto Generated Unique Reference Number" LIKE (base_pattern || '-%');
  
  -- Return next sequence number (increment by 1)
  RETURN max_seq + 1;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create function to automatically prefix "VAR-" to Variation Ref no.
-- ============================================================
CREATE OR REPLACE FUNCTION prefix_variation_ref_no()
RETURNS TRIGGER AS $$
DECLARE
  trimmed_value TEXT;
BEGIN
  -- Only process if Variation Ref no. is provided
  IF NEW."Variation Ref no." IS NOT NULL AND NEW."Variation Ref no." != '' THEN
    trimmed_value := TRIM(NEW."Variation Ref no.");
    
    -- If value doesn't start with "VAR-", add it
    -- Also handle case where user already typed "VAR-" (strip and re-add to ensure consistency)
    IF NOT (trimmed_value ~ '^VAR-') THEN
      -- Remove any existing "VAR-" prefix (in case user typed "VAR-VAR-EXT-123")
      trimmed_value := REGEXP_REPLACE(trimmed_value, '^VAR-+', '', 'g');
      -- Add "VAR-" prefix
      NEW."Variation Ref no." := 'VAR-' || trimmed_value;
    ELSE
      -- Already has "VAR-" prefix, but clean up any duplicates
      trimmed_value := REGEXP_REPLACE(trimmed_value, '^VAR-+', '', 'g');
      NEW."Variation Ref no." := 'VAR-' || trimmed_value;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger to auto-prefix "VAR-" to Variation Ref no.
-- ============================================================
CREATE TRIGGER trigger_prefix_variation_ref_no
  BEFORE INSERT OR UPDATE ON public."Contract Variations"
  FOR EACH ROW
  EXECUTE FUNCTION prefix_variation_ref_no();

-- Step 6: Create the new trigger function with simplified format
-- ============================================================
CREATE OR REPLACE FUNCTION generate_contract_variation_ref()
RETURNS TRIGGER AS $$
DECLARE
  variation_ref_no TEXT;
  boq_item_ref_number TEXT;
  seq_number INTEGER;
  seq_number_padded TEXT;
  ref_number TEXT;
BEGIN
  -- Only generate if not already provided
  IF NEW."Auto Generated Unique Reference Number" IS NULL OR NEW."Auto Generated Unique Reference Number" = '' THEN
    -- Get Variation Ref no. (already prefixed with "VAR-" by trigger) or use "VAR" placeholder if empty
    variation_ref_no := COALESCE(NULLIF(TRIM(NEW."Variation Ref no."), ''), 'VAR');
    
    -- Get BOQ Item Reference Number from the linked BOQ item
    IF NEW."Item Description" IS NOT NULL THEN
      boq_item_ref_number := get_boq_item_ref_number(NEW."Item Description");
    END IF;
    
    -- Use "NO-BOQ-REF" placeholder if BOQ Item Reference Number is missing
    IF boq_item_ref_number IS NULL OR boq_item_ref_number = '' THEN
      boq_item_ref_number := 'NO-BOQ-REF';
    END IF;
    
    -- Get next sequence number for this combination
    seq_number := get_next_variation_seq_for_combo(variation_ref_no, boq_item_ref_number);
    
    -- Pad sequence number to 3 digits (001, 002, etc.)
    seq_number_padded := LPAD(seq_number::TEXT, 3, '0');
    
    -- Build the reference number: [Variation Ref no.]-[BOQ Item Reference no.]-[S/N]
    ref_number := variation_ref_no || '-' || boq_item_ref_number || '-' || seq_number_padded;
    
    -- Set the reference number
    NEW."Auto Generated Unique Reference Number" := ref_number;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Recreate the trigger for reference number generation
-- ============================================================
-- Note: This trigger runs AFTER prefix_variation_ref_no trigger
CREATE TRIGGER trigger_generate_contract_variation_ref
  BEFORE INSERT ON public."Contract Variations"
  FOR EACH ROW
  EXECUTE FUNCTION generate_contract_variation_ref();

-- Step 8: Update existing Variation Ref no. values to add "VAR-" prefix if missing
-- ============================================================
DO $$
DECLARE
  rec RECORD;
  updated_count INTEGER := 0;
  trimmed_value TEXT;
  new_value TEXT;
BEGIN
  -- Loop through all existing Contract Variations
  FOR rec IN 
    SELECT 
      id,
      "Variation Ref no."
    FROM public."Contract Variations"
    WHERE "Variation Ref no." IS NOT NULL 
      AND "Variation Ref no." != ''
      AND NOT ("Variation Ref no." ~ '^VAR-')
  LOOP
    trimmed_value := TRIM(rec."Variation Ref no.");
    -- Remove any existing "VAR-" prefix (in case of duplicates)
    trimmed_value := REGEXP_REPLACE(trimmed_value, '^VAR-+', '', 'g');
    -- Add "VAR-" prefix
    new_value := 'VAR-' || trimmed_value;
    
    -- Update the record
    UPDATE public."Contract Variations"
    SET "Variation Ref no." = new_value
    WHERE id = rec.id;
    
    updated_count := updated_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Updated % Contract Variations to add VAR- prefix to Variation Ref no.', updated_count;
END $$;

-- Step 9: Regenerate reference numbers for existing records
-- ============================================================
-- This will update all existing Contract Variations with the new format
-- S/N will be assigned sequentially (001, 002, etc.) for each Variation Ref no. + BOQ Item Reference no. combination
DO $$
DECLARE
  rec RECORD;
  new_ref_number TEXT;
  variation_ref_no_val TEXT;
  boq_item_ref_number_val TEXT;
  seq_number_val INTEGER;
  seq_number_padded_val TEXT;
  updated_count INTEGER := 0;
  current_combo TEXT;
  last_combo TEXT := '';
  counter INTEGER;
BEGIN
  -- Loop through all existing Contract Variations, ordered by Variation Ref no., BOQ Item Reference no., and created_at
  FOR rec IN 
    SELECT 
      cv.id,
      cv."Variation Ref no.",
      cv."Item Description",
      cv.created_at,
      cv."Auto Generated Unique Reference Number",
      boq."Auto Generated Unique Reference Number" AS boq_ref_number
    FROM public."Contract Variations" cv
    LEFT JOIN public."BOQ items" boq ON cv."Item Description" = boq.id
    ORDER BY 
      COALESCE(NULLIF(TRIM(cv."Variation Ref no."), ''), 'VAR'),
      COALESCE(NULLIF(boq."Auto Generated Unique Reference Number", ''), 'NO-BOQ-REF'),
      cv.created_at ASC
  LOOP
    -- Get Variation Ref no. (should already have "VAR-" prefix) or use "VAR" placeholder if empty
    variation_ref_no_val := COALESCE(NULLIF(TRIM(rec."Variation Ref no."), ''), 'VAR');
    
    -- Get BOQ Item Reference Number or use "NO-BOQ-REF" placeholder
    boq_item_ref_number_val := COALESCE(NULLIF(rec.boq_ref_number, ''), 'NO-BOQ-REF');
    
    -- Create key for Variation Ref no. + BOQ Item Reference no. combination
    current_combo := variation_ref_no_val || '|' || boq_item_ref_number_val;
    
    -- Reset counter if this is a new combination
    IF current_combo != last_combo THEN
      counter := 0;
      last_combo := current_combo;
    END IF;
    
    -- Increment counter for this combination
    counter := counter + 1;
    seq_number_val := counter;
    
    -- Pad sequence number to 3 digits
    seq_number_padded_val := LPAD(seq_number_val::TEXT, 3, '0');
    
    -- Build new reference number
    new_ref_number := variation_ref_no_val || '-' || boq_item_ref_number_val || '-' || seq_number_padded_val;
    
    -- Update the record
    UPDATE public."Contract Variations"
    SET "Auto Generated Unique Reference Number" = new_ref_number
    WHERE id = rec.id;
    
    updated_count := updated_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Updated % Contract Variations with new reference number format', updated_count;
END $$;

-- Step 10: Add comments for documentation
-- ============================================================
COMMENT ON FUNCTION prefix_variation_ref_no() IS 'Automatically prefixes "VAR-" to Variation Ref no. on INSERT or UPDATE. Strips existing "VAR-" prefix and re-adds it to ensure consistency.';
COMMENT ON FUNCTION generate_contract_variation_ref() IS 'Generates Contract Variation reference number in format: [Variation Ref no. or VAR]-[BOQ Item Reference no. or NO-BOQ-REF]-[3-digit S/N]. S/N increments for each unique combination.';
COMMENT ON FUNCTION get_next_variation_seq_for_combo(TEXT, TEXT) IS 'Gets the next sequence number for a Variation Ref no. + BOQ Item Reference no. combination. Returns the max existing S/N + 1, or 1 if none exist.';
COMMENT ON FUNCTION get_boq_item_ref_number(UUID) IS 'Gets the Auto Generated Unique Reference Number from BOQ items table using the item UUID. Returns NULL if not found.';

-- ============================================================
-- ✅ Migration Complete!
-- ============================================================
-- The trigger now generates reference numbers in the format:
-- [Variation Ref no. or VAR]-[BOQ Item Reference no. or NO-BOQ-REF]-[3-digit S/N]
-- Example: VAR-EXT-123-BOQ-P4110-P-EXT-123-24-001-001
-- Example with empty Variation Ref: VAR-BOQ-P4110-P-EXT-123-24-001-001
-- Example with missing BOQ Ref: VAR-EXT-123-NO-BOQ-REF-001
-- Example with both missing: VAR-NO-BOQ-REF-001
-- 
-- Note: Variation Ref no. is automatically prefixed with "VAR-" by trigger
-- 
-- S/N increments for each unique combination of Variation Ref no. + BOQ Item Reference no.
-- 
-- All existing records have been regenerated with the new format
-- ============================================================
