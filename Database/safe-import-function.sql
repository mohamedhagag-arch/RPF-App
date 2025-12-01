-- ============================================================
-- 🔧 SAFE IMPORT FUNCTION FOR PROJECT TYPE ACTIVITIES
-- ============================================================
-- This function provides a completely safe way to import activities
-- without any conflict issues by using proper SQL handling
-- ============================================================

-- ============================================================
-- STEP 1: CREATE SAFE IMPORT FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION safe_import_activities(
    activities_data JSONB
)
RETURNS JSONB AS $$
DECLARE
    activity_item JSONB;
    result JSONB := '{"imported": 0, "skipped": 0, "errors": []}'::JSONB;
    imported_count INTEGER := 0;
    skipped_count INTEGER := 0;
    error_messages TEXT[] := ARRAY[]::TEXT[];
    activity_key TEXT;
    existing_record RECORD;
BEGIN
    -- Process each activity individually
    FOR activity_item IN SELECT jsonb_array_elements(activities_data)
    LOOP
        BEGIN
            -- Create unique key for this activity
            activity_key := (activity_item->>'project_type') || '||' || (activity_item->>'activity_name');
            
            -- Check if activity already exists
            SELECT * INTO existing_record
            FROM project_type_activities
            WHERE project_type = activity_item->>'project_type'
            AND activity_name = activity_item->>'activity_name';
            
            IF existing_record.id IS NOT NULL THEN
                -- Activity exists, skip it
                skipped_count := skipped_count + 1;
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
                    activity_item->>'project_type',
                    activity_item->>'activity_name',
                    activity_item->>'activity_name_ar',
                    activity_item->>'description',
                    activity_item->>'default_unit',
                    COALESCE((activity_item->>'estimated_rate')::DECIMAL, 0),
                    activity_item->>'category',
                    COALESCE((activity_item->>'typical_duration')::INTEGER, 0),
                    activity_item->>'division',
                    COALESCE((activity_item->>'display_order')::INTEGER, 0),
                    COALESCE((activity_item->>'is_active')::BOOLEAN, true)
                );
                
                imported_count := imported_count + 1;
            END IF;
            
        EXCEPTION
            WHEN OTHERS THEN
                -- Log error and continue
                error_messages := array_append(error_messages, 
                    'Activity: ' || COALESCE(activity_item->>'project_type', 'Unknown') || 
                    ' - ' || COALESCE(activity_item->>'activity_name', 'Unknown') || 
                    ': ' || SQLERRM
                );
        END;
    END LOOP;
    
    -- Build result JSON
    result := jsonb_build_object(
        'imported', imported_count,
        'skipped', skipped_count,
        'errors', error_messages,
        'total_processed', imported_count + skipped_count + array_length(error_messages, 1)
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- STEP 2: CREATE BATCH IMPORT WITH CONFLICT RESOLUTION
-- ============================================================

CREATE OR REPLACE FUNCTION batch_import_activities_safe(
    activities_data JSONB,
    update_existing BOOLEAN DEFAULT false
)
RETURNS JSONB AS $$
DECLARE
    activity_item JSONB;
    result JSONB := '{"imported": 0, "updated": 0, "skipped": 0, "errors": []}'::JSONB;
    imported_count INTEGER := 0;
    updated_count INTEGER := 0;
    skipped_count INTEGER := 0;
    error_messages TEXT[] := ARRAY[]::TEXT[];
    existing_record RECORD;
BEGIN
    -- Process each activity individually
    FOR activity_item IN SELECT jsonb_array_elements(activities_data)
    LOOP
        BEGIN
            -- Check if activity already exists
            SELECT * INTO existing_record
            FROM project_type_activities
            WHERE project_type = activity_item->>'project_type'
            AND activity_name = activity_item->>'activity_name';
            
            IF existing_record.id IS NOT NULL THEN
                -- Activity exists
                IF update_existing THEN
                    -- Update existing activity
                    UPDATE project_type_activities SET
                        activity_name_ar = COALESCE(activity_item->>'activity_name_ar', activity_name_ar),
                        description = COALESCE(activity_item->>'description', description),
                        default_unit = COALESCE(activity_item->>'default_unit', default_unit),
                        estimated_rate = COALESCE((activity_item->>'estimated_rate')::DECIMAL, estimated_rate),
                        category = COALESCE(activity_item->>'category', category),
                        typical_duration = COALESCE((activity_item->>'typical_duration')::INTEGER, typical_duration),
                        division = COALESCE(activity_item->>'division', division),
                        display_order = COALESCE((activity_item->>'display_order')::INTEGER, display_order),
                        is_active = COALESCE((activity_item->>'is_active')::BOOLEAN, is_active),
                        updated_at = NOW()
                    WHERE id = existing_record.id;
                    
                    updated_count := updated_count + 1;
                ELSE
                    -- Skip existing activity
                    skipped_count := skipped_count + 1;
                END IF;
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
                    activity_item->>'project_type',
                    activity_item->>'activity_name',
                    activity_item->>'activity_name_ar',
                    activity_item->>'description',
                    activity_item->>'default_unit',
                    COALESCE((activity_item->>'estimated_rate')::DECIMAL, 0),
                    activity_item->>'category',
                    COALESCE((activity_item->>'typical_duration')::INTEGER, 0),
                    activity_item->>'division',
                    COALESCE((activity_item->>'display_order')::INTEGER, 0),
                    COALESCE((activity_item->>'is_active')::BOOLEAN, true)
                );
                
                imported_count := imported_count + 1;
            END IF;
            
        EXCEPTION
            WHEN OTHERS THEN
                -- Log error and continue
                error_messages := array_append(error_messages, 
                    'Activity: ' || COALESCE(activity_item->>'project_type', 'Unknown') || 
                    ' - ' || COALESCE(activity_item->>'activity_name', 'Unknown') || 
                    ': ' || SQLERRM
                );
        END;
    END LOOP;
    
    -- Build result JSON
    result := jsonb_build_object(
        'imported', imported_count,
        'updated', updated_count,
        'skipped', skipped_count,
        'errors', error_messages,
        'total_processed', imported_count + updated_count + skipped_count + array_length(error_messages, 1)
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- STEP 3: CREATE CLEANUP FUNCTION FOR DUPLICATES
-- ============================================================

CREATE OR REPLACE FUNCTION cleanup_duplicate_activities_safe()
RETURNS JSONB AS $$
DECLARE
    result JSONB := '{"duplicates_found": 0, "duplicates_removed": 0, "kept_activities": 0}'::JSONB;
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
    
    -- Build result JSON
    result := jsonb_build_object(
        'duplicates_found', duplicate_count,
        'duplicates_removed', removed_count,
        'kept_activities', kept_count
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- STEP 4: CREATE HELPER FUNCTION TO CHECK IMPORT STATUS
-- ============================================================

CREATE OR REPLACE FUNCTION check_import_status()
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    total_records INTEGER;
    unique_combinations INTEGER;
    potential_duplicates INTEGER;
BEGIN
    -- Get statistics
    SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT project_type || '||' || activity_name) as unique_combos
    INTO total_records, unique_combinations
    FROM project_type_activities;
    
    potential_duplicates := total_records - unique_combinations;
    
    -- Build result JSON
    result := jsonb_build_object(
        'total_records', total_records,
        'unique_combinations', unique_combinations,
        'potential_duplicates', potential_duplicates,
        'is_clean', potential_duplicates = 0
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- ✅ SETUP COMPLETE!
-- ============================================================
-- Now you can use these functions:
-- 1. safe_import_activities(activities_json) - Safe import without conflicts
-- 2. batch_import_activities_safe(activities_json, update_existing) - Batch import with options
-- 3. cleanup_duplicate_activities_safe() - Clean up duplicates
-- 4. check_import_status() - Check for potential issues

COMMENT ON FUNCTION safe_import_activities(JSONB) IS 'Safely import activities without any conflict issues';
COMMENT ON FUNCTION batch_import_activities_safe(JSONB, BOOLEAN) IS 'Batch import with conflict resolution options';
COMMENT ON FUNCTION cleanup_duplicate_activities_safe() IS 'Clean up duplicate activities safely';
COMMENT ON FUNCTION check_import_status() IS 'Check import status and potential issues';

