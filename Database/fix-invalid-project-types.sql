-- ============================================================
-- 🔧 FIX INVALID PROJECT TYPES IN project_type_activities
-- ============================================================
-- This script fixes the foreign key constraint error by
-- updating invalid project types to valid ones
-- ============================================================

-- ============================================================
-- STEP 1: IDENTIFY INVALID PROJECT TYPES
-- ============================================================

-- Show invalid project types
SELECT 
    '⚠️ Invalid Project Types Found' as warning,
    string_agg(DISTINCT project_type, ', ' ORDER BY project_type) as invalid_types,
    COUNT(DISTINCT project_type) as count
FROM project_type_activities
WHERE project_type NOT IN (SELECT name FROM project_types WHERE is_active = true);

-- Show activities with invalid project types
SELECT 
    project_type,
    COUNT(*) as activity_count
FROM project_type_activities
WHERE project_type NOT IN (SELECT name FROM project_types WHERE is_active = true)
GROUP BY project_type
ORDER BY activity_count DESC;

-- ============================================================
-- STEP 2: ADD MISSING PROJECT TYPES TO project_types TABLE
-- ============================================================

-- Option A: Add missing project types to project_types table
-- This preserves the data structure

INSERT INTO project_types (name, code, description, is_active)
SELECT DISTINCT
    pta.project_type as name,
    UPPER(LEFT(pta.project_type, 3)) as code,
    'Auto-created from existing activities' as description,
    true as is_active
FROM project_type_activities pta
WHERE pta.project_type NOT IN (SELECT name FROM project_types)
ON CONFLICT (name) DO NOTHING;

-- Show what was added
SELECT 
    '✅ Added Missing Project Types' as info,
    string_agg(name, ', ' ORDER BY name) as added_types
FROM project_types
WHERE description = 'Auto-created from existing activities';

-- ============================================================
-- STEP 3: OR UPDATE INVALID TYPES TO VALID ONES
-- ============================================================

-- Option B: Map invalid types to existing valid types
-- Uncomment the mappings you want to apply:

-- Example mappings (adjust based on your data):
/*
UPDATE project_type_activities
SET project_type = 'Infrastructure'
WHERE project_type IN ('Dewatering', 'Piling', 'Shoring', 'Ground Improvement');

UPDATE project_type_activities
SET project_type = 'Building Construction'
WHERE project_type IN ('Construction', 'Building', 'Residential');

UPDATE project_type_activities
SET project_type = 'Marine Works'
WHERE project_type IN ('Marine', 'Waterfront', 'Berth');

UPDATE project_type_activities
SET project_type = 'Road Construction'
WHERE project_type IN ('Road', 'Highway', 'Asphalt');
*/

-- Catch-all: Map any remaining invalid types to 'General Construction'
UPDATE project_type_activities
SET project_type = 'General Construction',
    updated_at = NOW()
WHERE project_type NOT IN (SELECT name FROM project_types WHERE is_active = true)
AND project_type != 'General Construction';

-- ============================================================
-- STEP 4: VERIFY FIX
-- ============================================================

-- Check if any invalid types remain
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ All project types are now valid!'
        ELSE '⚠️ Still have ' || COUNT(*) || ' invalid project types'
    END as status
FROM project_type_activities
WHERE project_type NOT IN (SELECT name FROM project_types WHERE is_active = true);

-- Show current distribution
SELECT 
    '📊 Current Project Types Distribution' as info,
    project_type,
    COUNT(*) as activity_count
FROM project_type_activities
WHERE is_active = true
GROUP BY project_type
ORDER BY activity_count DESC;

-- ============================================================
-- ✅ FIX COMPLETE!
-- ============================================================

SELECT 
    '🎉 INVALID PROJECT TYPES FIXED! 🎉' as status,
    (SELECT COUNT(DISTINCT project_type) FROM project_type_activities) as total_project_types,
    (SELECT COUNT(*) FROM project_type_activities WHERE is_active = true) as total_activities;
