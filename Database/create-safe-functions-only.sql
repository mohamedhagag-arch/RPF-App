-- ============================================================
-- 🔧 CREATE SAFE FUNCTIONS ONLY
-- ============================================================
-- This script creates only the safe delete and enable functions
-- without modifying the database structure
-- ============================================================

-- ============================================================
-- FUNCTION 1: SAFE DELETE PROJECT TYPE
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

-- Test
SELECT '✅ Created safe_delete_project_type function' as status;

-- ============================================================
-- FUNCTION 2: ENABLE PROJECT TYPE
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
    WHERE project_type = p_project_type_name;
    
    -- Get count
    SELECT COUNT(*) INTO activity_count
    FROM project_type_activities
    WHERE project_type = p_project_type_name
    AND is_active = true;
    
    result := json_build_object(
        'success', true,
        'message', 'Project type and activities re-enabled',
        'project_type', p_project_type_name,
        'activities_enabled', activity_count
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test
SELECT '✅ Created enable_project_type function' as status;

-- ============================================================
-- FUNCTION 3: GET ACTIVITY STATS
-- ============================================================

CREATE OR REPLACE FUNCTION get_unified_activity_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_activities', (SELECT COUNT(*) FROM project_type_activities WHERE is_active = true),
        'by_project_type', (
            SELECT json_object_agg(project_type, activity_count)
            FROM (
                SELECT project_type, COUNT(*) as activity_count
                FROM project_type_activities
                WHERE is_active = true
                GROUP BY project_type
            ) pt
        ),
        'by_category', (
            SELECT json_object_agg(category, activity_count)
            FROM (
                SELECT category, COUNT(*) as activity_count
                FROM project_type_activities
                WHERE is_active = true AND category IS NOT NULL
                GROUP BY category
            ) cat
        ),
        'most_used', (
            SELECT json_agg(
                json_build_object(
                    'activity_name', activity_name,
                    'project_type', project_type,
                    'usage_count', usage_count
                )
            )
            FROM (
                SELECT activity_name, project_type, usage_count
                FROM project_type_activities
                WHERE is_active = true
                ORDER BY usage_count DESC
                LIMIT 10
            ) top
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test
SELECT '✅ Created get_unified_activity_stats function' as status;

-- ============================================================
-- VERIFICATION
-- ============================================================

-- Test safe_delete_project_type (dry run - just check structure)
SELECT 
    '📋 safe_delete_project_type function is ready' as info,
    'Usage: SELECT safe_delete_project_type(''ProjectTypeName'')' as example;

-- Test enable_project_type (dry run - just check structure)
SELECT 
    '📋 enable_project_type function is ready' as info,
    'Usage: SELECT enable_project_type(''ProjectTypeName'')' as example;

-- Test get_unified_activity_stats
SELECT 
    '📋 get_unified_activity_stats function is ready' as info,
    'Usage: SELECT get_unified_activity_stats()' as example;

-- Show current stats
SELECT get_unified_activity_stats() as current_stats;

-- ============================================================
-- ✅ FUNCTIONS CREATED SUCCESSFULLY!
-- ============================================================

SELECT 
    '🎉 ALL SAFE FUNCTIONS CREATED SUCCESSFULLY! 🎉' as status,
    (SELECT COUNT(*) FROM project_types WHERE is_active = true) as active_types,
    (SELECT COUNT(*) FROM project_type_activities WHERE is_active = true) as active_activities;
