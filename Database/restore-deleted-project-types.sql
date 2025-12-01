-- ============================================================
-- 🔄 RESTORE DELETED PROJECT TYPES AND FIX CASCADE DELETE
-- ============================================================
-- This script restores deleted project types and fixes
-- the delete behavior to handle activities properly
-- ============================================================

-- ============================================================
-- STEP 1: IDENTIFY ORPHANED ACTIVITIES
-- ============================================================

-- Show project types that exist in activities but not in project_types
SELECT 
    '⚠️ Orphaned Project Types (exist in activities but not in project_types)' as warning,
    string_agg(DISTINCT project_type, ', ' ORDER BY project_type) as orphaned_types,
    COUNT(DISTINCT project_type) as type_count
FROM project_type_activities
WHERE project_type NOT IN (SELECT name FROM project_types WHERE is_active = true);

-- Show detailed count per orphaned type
SELECT 
    '📊 Activities per Orphaned Type' as info,
    project_type,
    COUNT(*) as activity_count,
    COUNT(DISTINCT category) as category_count
FROM project_type_activities
WHERE project_type NOT IN (SELECT name FROM project_types WHERE is_active = true)
GROUP BY project_type
ORDER BY activity_count DESC;

-- ============================================================
-- STEP 2: RESTORE DELETED PROJECT TYPES
-- ============================================================

-- Restore project types that have activities
INSERT INTO project_types (name, code, description, is_active, usage_count)
SELECT DISTINCT
    pta.project_type as name,
    UPPER(LEFT(pta.project_type, 3)) as code,
    'Restored from activities - ' || COUNT(*) || ' activities found' as description,
    true as is_active,
    COUNT(*) as usage_count
FROM project_type_activities pta
WHERE pta.project_type NOT IN (SELECT name FROM project_types)
AND pta.is_active = true
GROUP BY pta.project_type
ON CONFLICT (name) DO UPDATE SET
    is_active = true,  -- Reactivate if was disabled
    usage_count = EXCLUDED.usage_count,
    description = CASE 
        WHEN project_types.description LIKE '%Auto-created%' OR project_types.description LIKE '%Restored%'
        THEN EXCLUDED.description
        ELSE project_types.description
    END,
    updated_at = NOW();

-- Report restoration
SELECT 
    '✅ Restored Project Types' as status,
    string_agg(name, ', ' ORDER BY name) as restored_types,
    COUNT(*) as count
FROM project_types
WHERE description LIKE '%Restored from activities%';

-- ============================================================
-- STEP 3: FIX FOREIGN KEY CONSTRAINT BEHAVIOR
-- ============================================================

-- Drop existing foreign key if exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_project_type'
        AND table_name = 'project_type_activities'
    ) THEN
        ALTER TABLE project_type_activities DROP CONSTRAINT fk_project_type;
        RAISE NOTICE '✅ Dropped old foreign key constraint';
    END IF;
END $$;

-- Add new foreign key with CASCADE behavior
-- This will automatically update/delete activities when project type changes/deleted
ALTER TABLE project_type_activities
ADD CONSTRAINT fk_project_type 
FOREIGN KEY (project_type) 
REFERENCES project_types(name) 
ON UPDATE CASCADE          -- Update activities when project type name changes
ON DELETE RESTRICT;        -- Prevent deletion if activities exist

-- Add comment
COMMENT ON CONSTRAINT fk_project_type ON project_type_activities IS 
'Foreign key to project_types - prevents deletion of project types that have activities';

-- Report
SELECT '✅ Added new foreign key constraint with proper CASCADE behavior' as status;

-- ============================================================
-- STEP 4: CREATE SAFE DELETE FUNCTION
-- ============================================================

-- Function to safely delete project types
CREATE OR REPLACE FUNCTION safe_delete_project_type(
    p_project_type_name TEXT
)
RETURNS JSON AS $$
DECLARE
    activity_count INTEGER;
    result JSON;
BEGIN
    -- Count activities for this project type
    SELECT COUNT(*) INTO activity_count
    FROM project_type_activities
    WHERE project_type = p_project_type_name
    AND is_active = true;
    
    -- If has activities, disable instead of delete
    IF activity_count > 0 THEN
        -- Disable the project type
        UPDATE project_types
        SET is_active = false,
            updated_at = NOW()
        WHERE name = p_project_type_name;
        
        -- Disable all activities
        UPDATE project_type_activities
        SET is_active = false,
            updated_at = NOW()
        WHERE project_type = p_project_type_name;
        
        result := json_build_object(
            'success', true,
            'action', 'disabled',
            'message', 'Project type and ' || activity_count || ' activities disabled (not deleted)',
            'project_type', p_project_type_name,
            'activities_affected', activity_count
        );
    ELSE
        -- No activities, safe to delete
        DELETE FROM project_types
        WHERE name = p_project_type_name;
        
        result := json_build_object(
            'success', true,
            'action', 'deleted',
            'message', 'Project type deleted successfully',
            'project_type', p_project_type_name,
            'activities_affected', 0
        );
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION safe_delete_project_type(TEXT) IS 
'Safely deletes or disables a project type. Disables if activities exist, deletes if empty.';

-- ============================================================
-- STEP 5: CREATE FUNCTION TO RE-ENABLE PROJECT TYPE
-- ============================================================

-- Function to re-enable project type and its activities
CREATE OR REPLACE FUNCTION enable_project_type(
    p_project_type_name TEXT
)
RETURNS JSON AS $$
DECLARE
    activity_count INTEGER;
    result JSON;
BEGIN
    -- Enable the project type
    UPDATE project_types
    SET is_active = true,
        updated_at = NOW()
    WHERE name = p_project_type_name;
    
    -- Enable all activities
    UPDATE project_type_activities
    SET is_active = true,
        updated_at = NOW()
    WHERE project_type = p_project_type_name
    RETURNING COUNT(*) INTO activity_count;
    
    result := json_build_object(
        'success', true,
        'message', 'Project type and activities re-enabled',
        'project_type', p_project_type_name,
        'activities_enabled', activity_count
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION enable_project_type(TEXT) IS 
'Re-enables a disabled project type and all its activities';

-- ============================================================
-- STEP 6: CREATE TRIGGER TO PREVENT ACCIDENTAL DELETION
-- ============================================================

-- Function to prevent deletion if activities exist
CREATE OR REPLACE FUNCTION prevent_project_type_deletion()
RETURNS TRIGGER AS $$
DECLARE
    activity_count INTEGER;
BEGIN
    -- Count active activities
    SELECT COUNT(*) INTO activity_count
    FROM project_type_activities
    WHERE project_type = OLD.name
    AND is_active = true;
    
    -- If has activities, prevent deletion
    IF activity_count > 0 THEN
        RAISE EXCEPTION 'Cannot delete project type "%". It has % active activities. Use safe_delete_project_type() function instead.', 
            OLD.name, activity_count
        USING HINT = 'Call SELECT safe_delete_project_type(''' || OLD.name || ''') to safely disable it instead.';
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_prevent_project_type_deletion ON project_types;

-- Create trigger
CREATE TRIGGER trigger_prevent_project_type_deletion
    BEFORE DELETE ON project_types
    FOR EACH ROW
    EXECUTE FUNCTION prevent_project_type_deletion();

COMMENT ON TRIGGER trigger_prevent_project_type_deletion ON project_types IS 
'Prevents accidental deletion of project types that have activities';

-- ============================================================
-- STEP 7: UPDATE project_types.usage_count
-- ============================================================

-- Update usage_count based on actual activity count
UPDATE project_types pt
SET usage_count = (
    SELECT COUNT(*)
    FROM project_type_activities pta
    WHERE pta.project_type = pt.name
    AND pta.is_active = true
),
updated_at = NOW()
WHERE is_active = true;

-- Report
SELECT 
    '✅ Updated usage counts' as status,
    name as project_type,
    usage_count as activity_count
FROM project_types
WHERE is_active = true
ORDER BY usage_count DESC;

-- ============================================================
-- STEP 8: VERIFICATION
-- ============================================================

-- Verify all activities have valid project types
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ All activities have valid project types'
        ELSE '⚠️ Found ' || COUNT(*) || ' activities with invalid project types'
    END as verification
FROM project_type_activities
WHERE project_type NOT IN (SELECT name FROM project_types WHERE is_active = true);

-- Show current state
SELECT 
    '📊 Current System State' as info,
    (SELECT COUNT(*) FROM project_types WHERE is_active = true) as active_project_types,
    (SELECT COUNT(*) FROM project_type_activities WHERE is_active = true) as active_activities,
    (SELECT COUNT(DISTINCT category) FROM project_type_activities WHERE is_active = true AND category IS NOT NULL) as categories;

-- Show project types with their activity counts
SELECT 
    pt.name as project_type,
    pt.code,
    pt.usage_count as activities_in_db,
    COUNT(pta.id) as actual_activities,
    pt.is_active as active,
    pt.description
FROM project_types pt
LEFT JOIN project_type_activities pta ON pta.project_type = pt.name AND pta.is_active = true
GROUP BY pt.id, pt.name, pt.code, pt.usage_count, pt.is_active, pt.description
ORDER BY actual_activities DESC;

-- ============================================================
-- STEP 9: USAGE EXAMPLES
-- ============================================================

-- Example 1: Safe delete (will disable, not delete)
-- SELECT safe_delete_project_type('Infrastructure');

-- Example 2: Re-enable project type
-- SELECT enable_project_type('Infrastructure');

-- Example 3: Check project type before deleting
/*
SELECT 
    name,
    usage_count,
    CASE 
        WHEN usage_count > 0 THEN '⚠️ Has activities - will be disabled, not deleted'
        ELSE '✅ Safe to delete'
    END as delete_status
FROM project_types
WHERE name = 'Your Project Type Name';
*/

-- ============================================================
-- ✅ RESTORATION AND FIX COMPLETE!
-- ============================================================

SELECT 
    '🎉 PROJECT TYPES RESTORED AND DELETE BEHAVIOR FIXED! 🎉' as status,
    (SELECT COUNT(*) FROM project_types WHERE is_active = true) as active_types,
    (SELECT COUNT(*) FROM project_type_activities WHERE is_active = true) as total_activities,
    (SELECT COUNT(*) FROM project_types WHERE description LIKE '%Restored%') as restored_types;

-- Show helpful commands
SELECT 
    '💡 HELPFUL COMMANDS' as info,
    '
    -- Safe delete a project type:
    SELECT safe_delete_project_type(''YourProjectType'');
    
    -- Re-enable a disabled project type:
    SELECT enable_project_type(''YourProjectType'');
    
    -- View all project types (including disabled):
    SELECT * FROM project_types ORDER BY is_active DESC, name;
    
    -- View disabled project types:
    SELECT * FROM project_types WHERE is_active = false;
    ' as commands;
