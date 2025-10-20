-- ============================================================
-- Ultra Simple Update - Basic calculations only
-- This script performs the most basic calculations
-- ============================================================

-- ============================================================
-- PART 1: Update Rate (simple division)
-- ============================================================

UPDATE "Planning Database - BOQ Rates" 
SET "Rate" = '0'
WHERE "Rate" IS NULL OR "Rate" = '';

-- Update Rate for valid data
UPDATE "Planning Database - BOQ Rates" 
SET "Rate" = CAST(CAST(REPLACE("Total Value", ',', '') AS DECIMAL) / CAST(REPLACE("Planned Units", ',', '') AS DECIMAL) AS TEXT)
WHERE "Planned Units" IS NOT NULL 
  AND "Planned Units" != '' 
  AND "Planned Units" != '0'
  AND "Total Value" IS NOT NULL 
  AND "Total Value" != '';

-- ============================================================
-- PART 2: Update Activity Progress % (simple percentage)
-- ============================================================

UPDATE "Planning Database - BOQ Rates" 
SET "Activity Progress %" = '0'
WHERE "Activity Progress %" IS NULL OR "Activity Progress %" = '';

-- Update Progress for valid data
UPDATE "Planning Database - BOQ Rates" 
SET "Activity Progress %" = CAST((CAST(REPLACE("Actual Units", ',', '') AS DECIMAL) / CAST(REPLACE("Planned Units", ',', '') AS DECIMAL)) * 100 AS TEXT)
WHERE "Planned Units" IS NOT NULL 
  AND "Planned Units" != '' 
  AND "Planned Units" != '0'
  AND "Actual Units" IS NOT NULL 
  AND "Actual Units" != '';

-- ============================================================
-- PART 3: Update Earned Value (Rate * Actual Units)
-- ============================================================

UPDATE "Planning Database - BOQ Rates" 
SET "Earned Value" = '0'
WHERE "Earned Value" IS NULL OR "Earned Value" = '';

-- Update Earned Value for valid data
UPDATE "Planning Database - BOQ Rates" 
SET "Earned Value" = CAST((CAST(REPLACE("Total Value", ',', '') AS DECIMAL) / CAST(REPLACE("Planned Units", ',', '') AS DECIMAL)) * CAST(REPLACE("Actual Units", ',', '') AS DECIMAL) AS TEXT)
WHERE "Planned Units" IS NOT NULL 
  AND "Planned Units" != '' 
  AND "Planned Units" != '0'
  AND "Actual Units" IS NOT NULL 
  AND "Actual Units" != ''
  AND "Total Value" IS NOT NULL 
  AND "Total Value" != '';

-- ============================================================
-- PART 4: Update Planned Value (copy Total Value)
-- ============================================================

UPDATE "Planning Database - BOQ Rates" 
SET "Planned Value" = "Total Value"
WHERE "Total Value" IS NOT NULL AND "Total Value" != '';

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

SELECT 'Ultra simple update completed successfully!' as status;
