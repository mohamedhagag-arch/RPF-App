-- ============================================================
-- 🔧 FIX SAFE DELETE FUNCTION - SIMPLE VERSION
-- ============================================================
-- This script fixes the safe_delete_project_type function to properly
-- handle foreign key constraints by deleting activities first
-- ============================================================

-- ============================================================
-- STEP 1: DROP AND RECREATE SAFE DELETE FUNCTION
-- ============================================================

DROP FUNCTION IF EXISTS safe_delete_project_type(TEXT);

CREATE OR REPLACE FUNCTION safe_delete_project_type(
    p_project_type_name TEXT
)
RETURNS JSON AS $$
DECLARE
    activity_count INTEGER;
    total_activities INTEGER;
    result JSON;
BEGIN
    -- Count ALL activities for this project type (active and inactive)
    SELECT COUNT(*) INTO total_activities
    FROM project_type_activities
    WHERE project_type = p_project_type_name;
    
    -- Count active activities
    SELECT COUNT(*) INTO activity_count
    FROM project_type_activities
    WHERE project_type = p_project_type_name
    AND is_active = true;
    
    -- If has ANY activities, delete them first, then delete project type
    IF total_activities > 0 THEN
        -- Delete ALL activities first (this removes foreign key constraint)
        DELETE FROM project_type_activities
        WHERE project_type = p_project_type_name;
        
        -- Now delete the project type
        DELETE FROM project_types
        WHERE name = p_project_type_name;
        
        result := json_build_object(
            'success', true,
            'action', 'deleted',
            'message', 'Project type and ' || total_activities || ' activities deleted successfully',
            'project_type', p_project_type_name,
            'activities_deleted', total_activities,
            'active_activities_deleted', activity_count
        );
    ELSE
        -- No activities, safe to delete project type directly
        DELETE FROM project_types
        WHERE name = p_project_type_name;
        
        result := json_build_object(
            'success', true,
            'action', 'deleted',
            'message', 'Project type deleted successfully (no activities)',
            'project_type', p_project_type_name,
            'activities_deleted', 0,
            'active_activities_deleted', 0
        );
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- STEP 2: CREATE ALTERNATIVE DISABLE FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION safe_disable_project_type(
    p_project_type_name TEXT
)
RETURNS JSON AS $$
DECLARE
    activity_count INTEGER;
    result JSON;
BEGIN
    -- Count active activities
    SELECT COUNT(*) INTO activity_count
    FROM project_type_activities
    WHERE project_type = p_project_type_name
    AND is_active = true;
    
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
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- STEP 3: ADD COMMENTS
-- ============================================================

COMMENT ON FUNCTION safe_delete_project_type(TEXT) IS 
'Safely deletes a project type and ALL its activities. Use this for complete removal.';

COMMENT ON FUNCTION safe_disable_project_type(TEXT) IS 
'Safely disables a project type and its activities without deletion. Use this to preserve data.';

-- ============================================================
-- STEP 4: TEST FUNCTIONS
-- ============================================================

-- Test the functions exist
SELECT '✅ Created safe_delete_project_type function' as status;
SELECT '✅ Created safe_disable_project_type function' as status;

-- ============================================================
-- COMPLETION MESSAGE
-- ============================================================

SELECT '🎉 Safe delete functions created successfully!' as status,
       'Use safe_delete_project_type() for complete deletion' as note1,
       'Use safe_disable_project_type() to preserve data' as note2;

