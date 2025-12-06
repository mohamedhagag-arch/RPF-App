-- ============================================
-- Migrate Section values to Zone column
-- ============================================
-- This script transfers all values from the "Section" column to the "Zone" column
-- in the KPI table, but only when Zone is empty or NULL
-- ============================================

-- Step 1: Check current state
SELECT 
    COUNT(*) as total_kpis,
    COUNT("Section") as kpis_with_section,
    COUNT("Zone") as kpis_with_zone,
    COUNT(CASE WHEN "Section" IS NOT NULL AND "Section" != '' AND ("Zone" IS NULL OR "Zone" = '') THEN 1 END) as kpis_to_migrate
FROM "Planning Database - KPI";

-- Step 2: Update Zone from Section (only when Zone is empty/NULL and Section has value)
UPDATE "Planning Database - KPI"
SET "Zone" = "Section"
WHERE 
    ("Zone" IS NULL OR "Zone" = '')
    AND "Section" IS NOT NULL 
    AND "Section" != '';

-- Step 3: Verify the migration
SELECT 
    COUNT(*) as total_kpis,
    COUNT("Section") as kpis_with_section,
    COUNT("Zone") as kpis_with_zone,
    COUNT(CASE WHEN "Section" IS NOT NULL AND "Section" != '' AND "Zone" IS NOT NULL AND "Zone" != '' THEN 1 END) as kpis_with_both
FROM "Planning Database - KPI";

-- Step 4: Show sample of migrated data
SELECT 
    id,
    "Project Code",
    "Activity Name",
    "Input Type",
    "Section" as old_section,
    "Zone" as new_zone,
    "Zone Number"
FROM "Planning Database - KPI"
WHERE 
    "Section" IS NOT NULL 
    AND "Section" != ''
    AND "Zone" IS NOT NULL 
    AND "Zone" != ''
LIMIT 20;

-- ============================================
-- Migration Complete!
-- ============================================
-- All Section values have been copied to Zone column
-- where Zone was empty or NULL
-- ============================================

