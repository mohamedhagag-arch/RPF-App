-- ============================================================
-- Correct Column Names Update - Using Actual Column Names
-- This script uses the correct column names from the database
-- ============================================================

-- ============================================================
-- PART 1: Update BOQ Activities calculations with correct column names
-- ============================================================

-- Update Rate calculations
UPDATE "Planning Database - BOQ Rates" 
SET "Rate" = CASE 
    WHEN COALESCE("Planned Units", '0') != '0' AND COALESCE("Planned Units", '0') != '' 
    THEN CAST(REPLACE(COALESCE("Total Value", '0'), ',', '') AS DECIMAL) / CAST(REPLACE(COALESCE("Planned Units", '0'), ',', '') AS DECIMAL)
    ELSE 0 
END
WHERE "Rate" = 0 OR "Rate" IS NULL;

-- Update Activity Progress % calculations
UPDATE "Planning Database - BOQ Rates" 
SET "Activity Progress %" = CASE 
    WHEN COALESCE("Planned Units", '0') != '0' AND COALESCE("Planned Units", '0') != '' 
    THEN (CAST(REPLACE(COALESCE("Actual Units", '0'), ',', '') AS DECIMAL) / CAST(REPLACE(COALESCE("Planned Units", '0'), ',', '') AS DECIMAL)) * 100
    ELSE 0 
END
WHERE "Activity Progress %" = 0 OR "Activity Progress %" IS NULL;

-- Update Earned Value calculations
UPDATE "Planning Database - BOQ Rates" 
SET "Earned Value" = CASE 
    WHEN COALESCE("Planned Units", '0') != '0' AND COALESCE("Planned Units", '0') != '' 
    THEN (CAST(REPLACE(COALESCE("Total Value", '0'), ',', '') AS DECIMAL) / CAST(REPLACE(COALESCE("Planned Units", '0'), ',', '') AS DECIMAL)) * CAST(REPLACE(COALESCE("Actual Units", '0'), ',', '') AS DECIMAL)
    ELSE 0 
END
WHERE "Earned Value" = 0 OR "Earned Value" IS NULL;

-- Update Planned Value
UPDATE "Planning Database - BOQ Rates" 
SET "Planned Value" = CAST(REPLACE(COALESCE("Total Value", '0'), ',', '') AS DECIMAL)
WHERE "Planned Value" = 0 OR "Planned Value" IS NULL;

-- Update Remaining Work Value
UPDATE "Planning Database - BOQ Rates" 
SET "Remaining Work Value" = CASE 
    WHEN COALESCE("Planned Units", '0') != '0' AND COALESCE("Planned Units", '0') != '' 
    THEN (CAST(REPLACE(COALESCE("Total Value", '0'), ',', '') AS DECIMAL) / CAST(REPLACE(COALESCE("Planned Units", '0'), ',', '') AS DECIMAL)) * (CAST(REPLACE(COALESCE("Planned Units", '0'), ',', '') AS DECIMAL) - CAST(REPLACE(COALESCE("Actual Units", '0'), ',', '') AS DECIMAL))
    ELSE 0 
END
WHERE "Remaining Work Value" = 0 OR "Remaining Work Value" IS NULL;

-- ============================================================
-- PART 2: Update Projects calculations (if columns exist)
-- ============================================================

-- Note: Project calculation columns might not exist yet
-- This section will only update if the columns exist

-- ============================================================
-- PART 3: Success message
-- ============================================================

SELECT 'BOQ calculations updated successfully!' as status;
