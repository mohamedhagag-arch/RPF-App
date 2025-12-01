-- ============================================================
-- Final Calculation Update - Using Correct Column Names
-- This script updates calculations using the actual column names
-- ============================================================

-- ============================================================
-- PART 1: Update BOQ Activities calculations
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
-- PART 2: Show results
-- ============================================================

-- Show sample of updated data
SELECT 
    "Project Code",
    "Activity",
    "Total Value",
    "Planned Units",
    "Actual Units",
    "Rate",
    "Activity Progress %",
    "Earned Value"
FROM "Planning Database - BOQ Rates"
WHERE "Rate" > 0
LIMIT 10;

-- ============================================================
-- PART 3: Success message
-- ============================================================

SELECT 'Final calculation update completed successfully!' as status;
