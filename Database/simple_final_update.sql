-- ============================================================
-- Simple Final Update - Basic Calculations Only
-- This script performs basic calculations without complex syntax
-- ============================================================

-- ============================================================
-- PART 1: Update Rate calculations
-- ============================================================

UPDATE "Planning Database - BOQ Rates" 
SET "Rate" = CAST(REPLACE(COALESCE("Total Value", '0'), ',', '') AS DECIMAL) / CAST(REPLACE(COALESCE("Planned Units", '0'), ',', '') AS DECIMAL)
WHERE COALESCE("Planned Units", '0') != '0' AND COALESCE("Planned Units", '0') != '' AND COALESCE("Planned Units", '0') != '0';

-- ============================================================
-- PART 2: Update Activity Progress % calculations
-- ============================================================

UPDATE "Planning Database - BOQ Rates" 
SET "Activity Progress %" = (CAST(REPLACE(COALESCE("Actual Units", '0'), ',', '') AS DECIMAL) / CAST(REPLACE(COALESCE("Planned Units", '0'), ',', '') AS DECIMAL)) * 100
WHERE COALESCE("Planned Units", '0') != '0' AND COALESCE("Planned Units", '0') != '' AND COALESCE("Planned Units", '0') != '0';

-- ============================================================
-- PART 3: Update Earned Value calculations
-- ============================================================

UPDATE "Planning Database - BOQ Rates" 
SET "Earned Value" = (CAST(REPLACE(COALESCE("Total Value", '0'), ',', '') AS DECIMAL) / CAST(REPLACE(COALESCE("Planned Units", '0'), ',', '') AS DECIMAL)) * CAST(REPLACE(COALESCE("Actual Units", '0'), ',', '') AS DECIMAL)
WHERE COALESCE("Planned Units", '0') != '0' AND COALESCE("Planned Units", '0') != '' AND COALESCE("Planned Units", '0') != '0';

-- ============================================================
-- PART 4: Update Planned Value
-- ============================================================

UPDATE "Planning Database - BOQ Rates" 
SET "Planned Value" = CAST(REPLACE(COALESCE("Total Value", '0'), ',', '') AS DECIMAL);

-- ============================================================
-- PART 5: Show results
-- ============================================================

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
-- PART 6: Success message
-- ============================================================

SELECT 'Simple final update completed successfully!' as status;
