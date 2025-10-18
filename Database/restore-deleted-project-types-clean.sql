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
-- STEP 3: ADD MISSING COLUMNS TO project_type_activities
-- ============================================================

DO $$ 
BEGIN
    -- Add typical_duration if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'project_type_activities' 
        AND column_name = 'typical_duration'
    ) THEN
        ALTER TABLE project_type_activities ADD COLUMN typical_duration INTEGER;
        RAISE NOTICE '✅ Added typical_duration column';
    END IF;

    -- Add division if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'project_type_activities' 
        AND column_name = 'division'
    ) THEN
        ALTER TABLE project_type_activities ADD COLUMN division TEXT;
        RAISE NOTICE '✅ Added division column';
    END IF;

    -- Add usage_count if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'project_type_activities' 
        AND column_name = 'usage_count'
    ) THEN
        ALTER TABLE project_type_activities ADD COLUMN usage_count INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Added usage_count column';
    END IF;
END $$;

-- Add comments
COMMENT ON COLUMN project_type_activities.typical_duration IS 'Typical duration for this activity in days';
COMMENT ON COLUMN project_type_activities.division IS 'Division responsible for this activity (legacy field)';
COMMENT ON COLUMN project_type_activities.usage_count IS 'Number of times this activity has been used';

-- ============================================================
-- STEP 4: FIX FOREIGN KEY CONSTRAINT BEHAVIOR
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
ALTER TABLE project_type_activities
ADD CONSTRAINT fk_project_type 
FOREIGN KEY (project_type) 
REFERENCES project_types(name) 
ON UPDATE CASCADE
ON DELETE RESTRICT;

COMMENT ON CONSTRAINT fk_project_type ON project_type_activities IS 
'Foreign key to project_types - prevents deletion of project types that have activities';

-- Report
SELECT '✅ Added new foreign key constraint' as status;

-- ============================================================
-- STEP 5: CREATE SAFE DELETE FUNCTION
-- ============================================================

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

-- Report
SELECT '✅ Created safe_delete_project_type function' as status;

-- ============================================================
-- STEP 6: CREATE FUNCTION TO RE-ENABLE PROJECT TYPE
-- ============================================================

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

-- Report
SELECT '✅ Created enable_project_type function' as status;

-- ============================================================
-- STEP 7: CREATE TRIGGER TO PREVENT ACCIDENTAL DELETION
-- ============================================================

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

-- Report
SELECT '✅ Created deletion prevention trigger' as status;

-- ============================================================
-- STEP 8: UPDATE project_types.usage_count
-- ============================================================

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
-- STEP 9: VERIFICATION
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
    pt.is_active as active,
    COUNT(pta.id) as activities,
    pt.description
FROM project_types pt
LEFT JOIN project_type_activities pta ON pta.project_type = pt.name AND pta.is_active = true
GROUP BY pt.id, pt.name, pt.code, pt.is_active, pt.description
ORDER BY activities DESC;

-- ============================================================
-- ✅ RESTORATION AND FIX COMPLETE!
-- ============================================================

SELECT 
    '🎉 PROJECT TYPES RESTORED AND DELETE BEHAVIOR FIXED! 🎉' as status,
    (SELECT COUNT(*) FROM project_types WHERE is_active = true) as active_types,
    (SELECT COUNT(*) FROM project_type_activities WHERE is_active = true) as total_activities,
    (SELECT COUNT(*) FROM project_types WHERE description LIKE '%Restored%') as restored_types;
