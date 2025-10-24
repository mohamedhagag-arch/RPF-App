-- ============================================================
-- Text Columns Update - Handle TEXT columns properly
-- This script updates TEXT columns with proper string handling
-- ============================================================

-- ============================================================
-- PART 1: Update Rate calculations (as TEXT)
-- ============================================================

UPDATE "Planning Database - BOQ Rates" 
SET "Rate" = CAST(CAST(REPLACE(COALESCE("Total Value", '0'), ',', '') AS DECIMAL) / CAST(REPLACE(COALESCE("Planned Units", '0'), ',', '') AS DECIMAL) AS TEXT)
WHERE COALESCE("Planned Units", '0') != '0' AND COALESCE("Planned Units", '0') != '' AND COALESCE("Planned Units", '0') != '0';

-- ============================================================
-- PART 2: Update Activity Progress % calculations (as TEXT)
-- ============================================================

UPDATE "Planning Database - BOQ Rates" 
SET "Activity Progress %" = CAST((CAST(REPLACE(COALESCE("Actual Units", '0'), ',', '') AS DECIMAL) / CAST(REPLACE(COALESCE("Planned Units", '0'), ',', '') AS DECIMAL)) * 100 AS TEXT)
WHERE COALESCE("Planned Units", '0') != '0' AND COALESCE("Planned Units", '0') != '' AND COALESCE("Planned Units", '0') != '0';

-- ============================================================
-- PART 3: Update Earned Value calculations (as TEXT)
-- ============================================================

UPDATE "Planning Database - BOQ Rates" 
SET "Earned Value" = CAST((CAST(REPLACE(COALESCE("Total Value", '0'), ',', '') AS DECIMAL) / CAST(REPLACE(COALESCE("Planned Units", '0'), ',', '') AS DECIMAL)) * CAST(REPLACE(COALESCE("Actual Units", '0'), ',', '') AS DECIMAL) AS TEXT)
WHERE COALESCE("Planned Units", '0') != '0' AND COALESCE("Planned Units", '0') != '' AND COALESCE("Planned Units", '0') != '0';

-- ============================================================
-- PART 4: Update Planned Value (as TEXT)
-- ============================================================

UPDATE "Planning Database - BOQ Rates" 
SET "Planned Value" = CAST(REPLACE(COALESCE("Total Value", '0'), ',', '') AS TEXT);

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
WHERE "Rate" != '0' AND "Rate" IS NOT NULL
LIMIT 10;

-- ============================================================
-- PART 6: Success message
-- ============================================================

SELECT 'Text columns update completed successfully!' as status;
