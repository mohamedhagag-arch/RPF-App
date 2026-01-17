-- ============================================================
-- Update BOQ Items Reference Number Format
-- Commercial Section - BOQ Items Table
-- ============================================================
-- New Format: BOQ-[Project Full Code]-[External Ref no. or TBD]-[2-digit Year]-[3-digit S/N]
-- Example: BOQ-P4110-P-EXT-123-24-001
-- S/N resets to 001 at the start of each year for each Project Full Code
-- ============================================================
-- Run this script in Supabase SQL Editor
-- ============================================================

-- Step 1: Drop the existing trigger function
-- ============================================================
DROP TRIGGER IF EXISTS trigger_generate_boq_item_ref ON public."BOQ items";
DROP FUNCTION IF EXISTS generate_boq_item_ref();

-- Step 2: Create helper function to get next S/N for Project Full Code + Year combination
-- ============================================================
CREATE OR REPLACE FUNCTION get_next_boq_sequence_number(
  p_project_full_code TEXT,
  p_year TEXT
)
RETURNS INTEGER AS $$
DECLARE
  max_seq INTEGER;
  pattern TEXT;
BEGIN
  -- Build pattern to match existing reference numbers
  -- Pattern: BOQ-[Project Full Code]-[anything]-[Year]-[S/N]
  -- Escape special regex characters in Project Full Code
  pattern := '^BOQ-' || REPLACE(REPLACE(REPLACE(p_project_full_code, '\', '\\'), '-', '\-'), '.', '\.') || '-[^-]+-' || p_year || '-([0-9]+)$';
  
  -- Find the maximum S/N for this Project Full Code + Year combination
  -- Extract S/N from existing reference numbers that match the pattern
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
  FROM public."BOQ items"
  WHERE "Project Full Code" = p_project_full_code
    AND "Auto Generated Unique Reference Number" LIKE ('BOQ-' || p_project_full_code || '-%-' || p_year || '-%');
  
  -- Return next sequence number (increment by 1)
  RETURN max_seq + 1;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create the new trigger function with updated format
-- ============================================================
CREATE OR REPLACE FUNCTION generate_boq_item_ref()
RETURNS TRIGGER AS $$
DECLARE
  project_full_code TEXT;
  external_ref_no TEXT;
  year_part TEXT;
  seq_number INTEGER;
  seq_number_padded TEXT;
  ref_number TEXT;
BEGIN
  -- Only generate if not already provided
  IF NEW."Auto Generated Unique Reference Number" IS NULL OR NEW."Auto Generated Unique Reference Number" = '' THEN
    -- Get Project Full Code (required)
    project_full_code := COALESCE(NEW."Project Full Code", '');
    
    -- Validate Project Full Code is not empty
    IF project_full_code = '' THEN
      RAISE EXCEPTION 'Project Full Code is required to generate reference number';
    END IF;
    
    -- Get External Ref no. or use "TBD" placeholder if empty
    external_ref_no := COALESCE(NULLIF(TRIM(NEW."External Ref no."), ''), 'TBD');
    
    -- Get 2-digit year (e.g., 24, 25)
    year_part := TO_CHAR(COALESCE(NEW.created_at, NOW()), 'YY');
    
    -- Get next sequence number for this Project Full Code + Year combination
    seq_number := get_next_boq_sequence_number(project_full_code, year_part);
    
    -- Pad sequence number to 3 digits (001, 002, etc.)
    seq_number_padded := LPAD(seq_number::TEXT, 3, '0');
    
    -- Build the reference number: BOQ-[Project Full Code]-[External Ref no.]-[Year]-[S/N]
    ref_number := 'BOQ-' || project_full_code || '-' || external_ref_no || '-' || year_part || '-' || seq_number_padded;
    
    -- Set the reference number
    NEW."Auto Generated Unique Reference Number" := ref_number;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Recreate the trigger
-- ============================================================
CREATE TRIGGER trigger_generate_boq_item_ref
  BEFORE INSERT ON public."BOQ items"
  FOR EACH ROW
  EXECUTE FUNCTION generate_boq_item_ref();

-- Step 5: Regenerate reference numbers for existing records
-- ============================================================
-- This will update all existing BOQ items with the new format
-- S/N will be assigned sequentially (001, 002, etc.) for each Project Full Code + Year combination
DO $$
DECLARE
  rec RECORD;
  new_ref_number TEXT;
  project_full_code_val TEXT;
  external_ref_no_val TEXT;
  year_part_val TEXT;
  seq_number_val INTEGER;
  seq_number_padded_val TEXT;
  updated_count INTEGER := 0;
  current_project_year TEXT;
  last_project_year TEXT := '';
  counter INTEGER;
BEGIN
  -- Loop through all existing BOQ items, ordered by Project Full Code, Year, and created_at
  FOR rec IN 
    SELECT 
      id,
      "Project Full Code",
      "External Ref no.",
      created_at,
      "Auto Generated Unique Reference Number"
    FROM public."BOQ items"
    ORDER BY "Project Full Code", TO_CHAR(COALESCE(created_at, NOW()), 'YY'), created_at ASC
  LOOP
    -- Get values
    project_full_code_val := rec."Project Full Code";
    external_ref_no_val := COALESCE(NULLIF(TRIM(rec."External Ref no."), ''), 'TBD');
    year_part_val := TO_CHAR(COALESCE(rec.created_at, NOW()), 'YY');
    
    -- Create key for Project Full Code + Year combination
    current_project_year := project_full_code_val || '|' || year_part_val;
    
    -- Reset counter if this is a new Project Full Code + Year combination
    IF current_project_year != last_project_year THEN
      counter := 0;
      last_project_year := current_project_year;
    END IF;
    
    -- Increment counter for this Project Full Code + Year combination
    counter := counter + 1;
    seq_number_val := counter;
    
    -- Pad sequence number to 3 digits
    seq_number_padded_val := LPAD(seq_number_val::TEXT, 3, '0');
    
    -- Build new reference number
    new_ref_number := 'BOQ-' || project_full_code_val || '-' || external_ref_no_val || '-' || year_part_val || '-' || seq_number_padded_val;
    
    -- Update the record
    UPDATE public."BOQ items"
    SET "Auto Generated Unique Reference Number" = new_ref_number
    WHERE id = rec.id;
    
    updated_count := updated_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Updated % BOQ items with new reference number format', updated_count;
END $$;

-- Step 6: Add comments for documentation
-- ============================================================
COMMENT ON FUNCTION generate_boq_item_ref() IS 'Generates BOQ item reference number in format: BOQ-[Project Full Code]-[External Ref no. or TBD]-[2-digit Year]-[3-digit S/N]. S/N resets to 001 each year per Project Full Code.';
COMMENT ON FUNCTION get_next_boq_sequence_number(TEXT, TEXT) IS 'Gets the next sequence number for a Project Full Code + Year combination. Returns the max existing S/N + 1, or 1 if none exist.';

-- ============================================================
-- ✅ Migration Complete!
-- ============================================================
-- The trigger now generates reference numbers in the format:
-- BOQ-[Project Full Code]-[External Ref no. or TBD]-[2-digit Year]-[3-digit S/N]
-- Example: BOQ-P4110-P-EXT-123-24-001
-- Example with empty External Ref: BOQ-P4110-P-TBD-24-001
-- 
-- S/N resets to 001 at the start of each year for each Project Full Code
-- All existing records have been regenerated with the new format
-- ============================================================
