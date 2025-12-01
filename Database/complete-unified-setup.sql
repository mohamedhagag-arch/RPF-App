-- ============================================================
-- 🎯 COMPLETE UNIFIED SYSTEM SETUP
-- ============================================================
-- This script sets up the complete unified system:
-- 1. Adds missing columns
-- 2. Creates safe functions
-- 3. Restores deleted project types
-- 4. Verifies everything
-- ============================================================

-- ============================================================
-- STEP 1: ADD MISSING COLUMNS
-- ============================================================

-- Add usage_count column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'project_type_activities' 
        AND column_name = 'usage_count'
    ) THEN
        ALTER TABLE project_type_activities ADD COLUMN usage_count INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Added usage_count column';
    ELSE
        RAISE NOTICE '✅ usage_count column already exists';
    END IF;
END $$;

-- Add typical_duration column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'project_type_activities' 
        AND column_name = 'typical_duration'
    ) THEN
        ALTER TABLE project_type_activities ADD COLUMN typical_duration INTEGER;
        RAISE NOTICE '✅ Added typical_duration column';
    ELSE
        RAISE NOTICE '✅ typical_duration column already exists';
    END IF;
END $$;

-- Add division column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'project_type_activities' 
        AND column_name = 'division'
    ) THEN
        ALTER TABLE project_type_activities ADD COLUMN division TEXT;
        RAISE NOTICE '✅ Added division column';
    ELSE
        RAISE NOTICE '✅ division column already exists';
    END IF;
END $$;

-- Report
SELECT '✅ All columns added/verified' as status;

-- ============================================================
-- STEP 2: RESTORE DELETED PROJECT TYPES
-- ============================================================

-- Find and restore project types that have activities but are deleted
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
    is_active = true,
    usage_count = EXCLUDED.usage_count,
    description = CASE 
        WHEN project_types.description LIKE '%Restored%' OR project_types.description LIKE '%Auto-created%'
        THEN EXCLUDED.description
        ELSE project_types.description
    END,
    updated_at = NOW();

-- Report
SELECT 
    '✅ Restored/Updated Project Types' as status,
    COUNT(*) as count
FROM project_types
WHERE description LIKE '%Restored%';

-- ============================================================
-- STEP 3: UPDATE USAGE COUNTS
-- ============================================================

-- Update usage_count in project_types based on actual activities
UPDATE project_types pt
SET usage_count = (
    SELECT COUNT(*)
    FROM project_type_activities pta
    WHERE pta.project_type = pt.name
    AND pta.is_active = true
),
updated_at = NOW()
WHERE is_active = true;

SELECT '✅ Updated usage counts in project_types' as status;

-- ============================================================
-- STEP 4: CREATE SAFE DELETE FUNCTION
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

SELECT '✅ Created safe_delete_project_type function' as status;

-- ============================================================
-- STEP 5: CREATE ENABLE FUNCTION
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

SELECT '✅ Created enable_project_type function' as status;

-- ============================================================
-- STEP 6: CREATE INCREMENT USAGE FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION increment_activity_usage_unified(
    p_project_type TEXT,
    p_activity_name TEXT
)
RETURNS VOID AS $$
BEGIN
    UPDATE project_type_activities 
    SET usage_count = COALESCE(usage_count, 0) + 1,
        updated_at = NOW()
    WHERE project_type = p_project_type 
    AND activity_name = p_activity_name;
END;
$$ LANGUAGE plpgsql;

SELECT '✅ Created increment_activity_usage_unified function' as status;

-- ============================================================
-- STEP 7: CREATE STATS FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION get_unified_activity_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_activities', (
            SELECT COUNT(*) 
            FROM project_type_activities 
            WHERE is_active = true
        ),
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
                    'usage_count', COALESCE(usage_count, 0)
                )
            )
            FROM (
                SELECT activity_name, project_type, COALESCE(usage_count, 0) as usage_count
                FROM project_type_activities
                WHERE is_active = true
                ORDER BY COALESCE(usage_count, 0) DESC
                LIMIT 10
            ) top
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT '✅ Created get_unified_activity_stats function' as status;

-- ============================================================
-- STEP 8: VERIFICATION
-- ============================================================

-- Check columns exist
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'project_type_activities'
AND column_name IN ('usage_count', 'typical_duration', 'division')
ORDER BY column_name;

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

-- Test functions
SELECT '🧪 Testing Functions...' as test_header;

-- Test stats function
SELECT 
    '📊 Stats Function Test' as test,
    get_unified_activity_stats() as result;

-- ============================================================
-- ✅ SETUP COMPLETE!
-- ============================================================

SELECT 
    '🎉 COMPLETE UNIFIED SYSTEM SETUP SUCCESSFUL! 🎉' as status,
    (SELECT COUNT(*) FROM project_types WHERE is_active = true) as active_types,
    (SELECT COUNT(*) FROM project_type_activities WHERE is_active = true) as active_activities,
    (SELECT COUNT(DISTINCT category) FROM project_type_activities WHERE category IS NOT NULL) as categories;

-- ============================================================
-- 💡 USAGE EXAMPLES
-- ============================================================

SELECT '💡 Function Usage Examples' as help_header;

SELECT 
    '
    -- Safe delete a project type:
    SELECT safe_delete_project_type(''Infrastructure'');
    
    -- Re-enable a disabled project type:
    SELECT enable_project_type(''Infrastructure'');
    
    -- Increment activity usage:
    SELECT increment_activity_usage_unified(''Infrastructure'', ''Bored Piling'');
    
    -- Get statistics:
    SELECT get_unified_activity_stats();
    
    -- View all project types with activities:
    SELECT pt.name, COUNT(pta.id) as activities
    FROM project_types pt
    LEFT JOIN project_type_activities pta ON pta.project_type = pt.name
    GROUP BY pt.name
    ORDER BY activities DESC;
    ' as examples;
