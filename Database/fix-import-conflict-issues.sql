-- ============================================================
-- 🔧 FIX IMPORT CONFLICT ISSUES
-- ============================================================
-- This script fixes the "ON CONFLICT DO UPDATE command cannot affect row a second time" error
-- by improving the import process and handling duplicates better
-- ============================================================

-- ============================================================
-- STEP 1: CREATE SAFE IMPORT FUNCTION FOR PROJECT TYPE ACTIVITIES
-- ============================================================

CREATE OR REPLACE FUNCTION safe_import_project_type_activities(
    p_activities JSONB
)
RETURNS TABLE (
    imported_count INTEGER,
    skipped_count INTEGER,
    error_count INTEGER,
    errors TEXT[]
) AS $$
DECLARE
    activity_record JSONB;
    imported INTEGER := 0;
    skipped INTEGER := 0;
    error_count INTEGER := 0;
    errors TEXT[] := ARRAY[]::TEXT[];
    activity_key TEXT;
    existing_activity RECORD;
BEGIN
    -- Process each activity individually
    FOR activity_record IN SELECT jsonb_array_elements(p_activities)
    LOOP
        BEGIN
            -- Create unique key for duplicate detection
            activity_key := (activity_record->>'project_type') || '||' || (activity_record->>'activity_name');
            
            -- Check if activity already exists
            SELECT * INTO existing_activity
            FROM project_type_activities
            WHERE project_type = activity_record->>'project_type'
            AND activity_name = activity_record->>'activity_name';
            
            IF existing_activity.id IS NOT NULL THEN
                -- Update existing activity
                UPDATE project_type_activities SET
                    activity_name_ar = COALESCE(activity_record->>'activity_name_ar', activity_name_ar),
                    description = COALESCE(activity_record->>'description', description),
                    default_unit = COALESCE(activity_record->>'default_unit', default_unit),
                    estimated_rate = COALESCE((activity_record->>'estimated_rate')::DECIMAL, estimated_rate),
                    category = COALESCE(activity_record->>'category', category),
                    typical_duration = COALESCE((activity_record->>'typical_duration')::INTEGER, typical_duration),
                    division = COALESCE(activity_record->>'division', division),
                    display_order = COALESCE((activity_record->>'display_order')::INTEGER, display_order),
                    is_active = COALESCE((activity_record->>'is_active')::BOOLEAN, is_active),
                    updated_at = NOW()
                WHERE id = existing_activity.id;
                
                imported := imported + 1;
            ELSE
                -- Insert new activity
                INSERT INTO project_type_activities (
                    project_type,
                    activity_name,
                    activity_name_ar,
                    description,
                    default_unit,
                    estimated_rate,
                    category,
                    typical_duration,
                    division,
                    display_order,
                    is_active
                ) VALUES (
                    activity_record->>'project_type',
                    activity_record->>'activity_name',
                    activity_record->>'activity_name_ar',
                    activity_record->>'description',
                    activity_record->>'default_unit',
                    (activity_record->>'estimated_rate')::DECIMAL,
                    activity_record->>'category',
                    (activity_record->>'typical_duration')::INTEGER,
                    activity_record->>'division',
                    (activity_record->>'display_order')::INTEGER,
                    COALESCE((activity_record->>'is_active')::BOOLEAN, true)
                );
                
                imported := imported + 1;
            END IF;
            
        EXCEPTION
            WHEN OTHERS THEN
                error_count := error_count + 1;
                errors := array_append(errors, 
                    'Activity: ' || COALESCE(activity_record->>'project_type', 'Unknown') || 
                    ' - ' || COALESCE(activity_record->>'activity_name', 'Unknown') || 
                    ': ' || SQLERRM
                );
        END;
    END LOOP;
    
    RETURN QUERY SELECT imported, skipped, error_count, errors;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- STEP 2: CREATE BATCH IMPORT FUNCTION WITH DUPLICATE HANDLING
-- ============================================================

CREATE OR REPLACE FUNCTION batch_import_project_type_activities(
    p_activities JSONB,
    p_remove_duplicates BOOLEAN DEFAULT true
)
RETURNS TABLE (
    total_processed INTEGER,
    imported_count INTEGER,
    updated_count INTEGER,
    skipped_count INTEGER,
    error_count INTEGER,
    errors TEXT[]
) AS $$
DECLARE
    activity_record JSONB;
    processed INTEGER := 0;
    imported INTEGER := 0;
    updated INTEGER := 0;
    skipped INTEGER := 0;
    error_count INTEGER := 0;
    errors TEXT[] := ARRAY[]::TEXT[];
    activity_key TEXT;
    seen_keys TEXT[] := ARRAY[]::TEXT[];
    existing_activity RECORD;
BEGIN
    -- Process each activity individually to avoid conflicts
    FOR activity_record IN SELECT jsonb_array_elements(p_activities)
    LOOP
        BEGIN
            processed := processed + 1;
            
            -- Create unique key for duplicate detection
            activity_key := (activity_record->>'project_type') || '||' || (activity_record->>'activity_name');
            
            -- Check for duplicates within the batch if requested
            IF p_remove_duplicates AND activity_key = ANY(seen_keys) THEN
                skipped := skipped + 1;
                CONTINUE;
            END IF;
            
            -- Add to seen keys
            seen_keys := array_append(seen_keys, activity_key);
            
            -- Check if activity already exists in database
            SELECT * INTO existing_activity
            FROM project_type_activities
            WHERE project_type = activity_record->>'project_type'
            AND activity_name = activity_record->>'activity_name';
            
            IF existing_activity.id IS NOT NULL THEN
                -- Update existing activity
                UPDATE project_type_activities SET
                    activity_name_ar = COALESCE(activity_record->>'activity_name_ar', activity_name_ar),
                    description = COALESCE(activity_record->>'description', description),
                    default_unit = COALESCE(activity_record->>'default_unit', default_unit),
                    estimated_rate = COALESCE((activity_record->>'estimated_rate')::DECIMAL, estimated_rate),
                    category = COALESCE(activity_record->>'category', category),
                    typical_duration = COALESCE((activity_record->>'typical_duration')::INTEGER, typical_duration),
                    division = COALESCE(activity_record->>'division', division),
                    display_order = COALESCE((activity_record->>'display_order')::INTEGER, display_order),
                    is_active = COALESCE((activity_record->>'is_active')::BOOLEAN, is_active),
                    updated_at = NOW()
                WHERE id = existing_activity.id;
                
                updated := updated + 1;
            ELSE
                -- Insert new activity
                INSERT INTO project_type_activities (
                    project_type,
                    activity_name,
                    activity_name_ar,
                    description,
                    default_unit,
                    estimated_rate,
                    category,
                    typical_duration,
                    division,
                    display_order,
                    is_active
                ) VALUES (
                    activity_record->>'project_type',
                    activity_record->>'activity_name',
                    activity_record->>'activity_name_ar',
                    activity_record->>'description',
                    activity_record->>'default_unit',
                    (activity_record->>'estimated_rate')::DECIMAL,
                    activity_record->>'category',
                    (activity_record->>'typical_duration')::INTEGER,
                    activity_record->>'division',
                    (activity_record->>'display_order')::INTEGER,
                    COALESCE((activity_record->>'is_active')::BOOLEAN, true)
                );
                
                imported := imported + 1;
            END IF;
            
        EXCEPTION
            WHEN OTHERS THEN
                error_count := error_count + 1;
                errors := array_append(errors, 
                    'Row ' || processed || ': ' || 
                    COALESCE(activity_record->>'project_type', 'Unknown') || 
                    ' - ' || COALESCE(activity_record->>'activity_name', 'Unknown') || 
                    ': ' || SQLERRM
                );
        END;
    END LOOP;
    
    RETURN QUERY SELECT processed, imported, updated, skipped, error_count, errors;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- STEP 3: CREATE CLEANUP FUNCTION FOR DUPLICATE ACTIVITIES
-- ============================================================

CREATE OR REPLACE FUNCTION cleanup_duplicate_activities()
RETURNS TABLE (
    duplicates_found INTEGER,
    duplicates_removed INTEGER,
    kept_activities INTEGER
) AS $$
DECLARE
    duplicate_count INTEGER := 0;
    removed_count INTEGER := 0;
    kept_count INTEGER := 0;
    duplicate_record RECORD;
BEGIN
    -- Find and count duplicates
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT project_type, activity_name, COUNT(*) as cnt
        FROM project_type_activities
        GROUP BY project_type, activity_name
        HAVING COUNT(*) > 1
    ) duplicates;
    
    -- Remove duplicates, keeping the most recent one
    FOR duplicate_record IN 
        SELECT project_type, activity_name, MIN(created_at) as oldest_created
        FROM project_type_activities
        GROUP BY project_type, activity_name
        HAVING COUNT(*) > 1
    LOOP
        DELETE FROM project_type_activities
        WHERE project_type = duplicate_record.project_type
        AND activity_name = duplicate_record.activity_name
        AND created_at = duplicate_record.oldest_created;
        
        removed_count := removed_count + 1;
    END LOOP;
    
    -- Count remaining activities
    SELECT COUNT(*) INTO kept_count FROM project_type_activities;
    
    RETURN QUERY SELECT duplicate_count, removed_count, kept_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- STEP 4: CREATE INDEX FOR BETTER PERFORMANCE
-- ============================================================

-- Create composite index for faster lookups
CREATE INDEX IF NOT EXISTS idx_project_type_activities_lookup 
ON project_type_activities(project_type, activity_name);

-- Create index for duplicate detection
CREATE INDEX IF NOT EXISTS idx_project_type_activities_duplicate_check 
ON project_type_activities(project_type, activity_name, created_at);

-- ============================================================
-- STEP 5: CREATE VIEW FOR IMPORT STATUS
-- ============================================================

CREATE OR REPLACE VIEW v_import_status AS
SELECT 
    'project_type_activities' as table_name,
    COUNT(*) as total_records,
    COUNT(DISTINCT project_type) as unique_project_types,
    COUNT(DISTINCT activity_name) as unique_activities,
    COUNT(DISTINCT project_type || '||' || activity_name) as unique_combinations,
    COUNT(*) - COUNT(DISTINCT project_type || '||' || activity_name) as potential_duplicates
FROM project_type_activities;

-- ============================================================
-- ✅ SETUP COMPLETE!
-- ============================================================
-- The import conflict issues should now be resolved.
-- You can use the new functions:
-- 1. safe_import_project_type_activities() - for safe individual imports
-- 2. batch_import_project_type_activities() - for batch imports with duplicate handling
-- 3. cleanup_duplicate_activities() - to clean up existing duplicates
-- 4. v_import_status - to check for potential duplicates

COMMENT ON FUNCTION safe_import_project_type_activities(JSONB) IS 'Safely import project type activities one by one to avoid conflicts';
COMMENT ON FUNCTION batch_import_project_type_activities(JSONB, BOOLEAN) IS 'Batch import with duplicate handling and conflict resolution';
COMMENT ON FUNCTION cleanup_duplicate_activities() IS 'Remove duplicate activities, keeping the most recent ones';
COMMENT ON VIEW v_import_status IS 'View to check for potential duplicate activities';

