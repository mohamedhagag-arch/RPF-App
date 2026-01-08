-- Cleanup Script for Design System
-- حذف كل ما يتعلق بنظام التصميم من قاعدة البيانات
-- ⚠️ WARNING: This will delete ALL design data permanently!

-- Drop all RLS policies first (only if tables exist)
DO $$ 
BEGIN
    -- Drop policies for design_projects
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'design_projects') THEN
        DROP POLICY IF EXISTS "design_projects_select_policy" ON design_projects;
        DROP POLICY IF EXISTS "design_projects_insert_policy" ON design_projects;
        DROP POLICY IF EXISTS "design_projects_update_policy" ON design_projects;
        DROP POLICY IF EXISTS "design_projects_delete_policy" ON design_projects;
        DROP POLICY IF EXISTS "design_projects_all_policy" ON design_projects;
    END IF;

    -- Drop policies for design_calculations
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'design_calculations') THEN
        DROP POLICY IF EXISTS "design_calculations_select_policy" ON design_calculations;
        DROP POLICY IF EXISTS "design_calculations_insert_policy" ON design_calculations;
        DROP POLICY IF EXISTS "design_calculations_update_policy" ON design_calculations;
        DROP POLICY IF EXISTS "design_calculations_delete_policy" ON design_calculations;
        DROP POLICY IF EXISTS "design_calculations_all_policy" ON design_calculations;
    END IF;

    -- Drop policies for design_drawings
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'design_drawings') THEN
        DROP POLICY IF EXISTS "design_drawings_select_policy" ON design_drawings;
        DROP POLICY IF EXISTS "design_drawings_insert_policy" ON design_drawings;
        DROP POLICY IF EXISTS "design_drawings_update_policy" ON design_drawings;
        DROP POLICY IF EXISTS "design_drawings_delete_policy" ON design_drawings;
        DROP POLICY IF EXISTS "design_drawings_all_policy" ON design_drawings;
    END IF;

    -- Drop policies for design_reports
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'design_reports') THEN
        DROP POLICY IF EXISTS "design_reports_select_policy" ON design_reports;
        DROP POLICY IF EXISTS "design_reports_insert_policy" ON design_reports;
        DROP POLICY IF EXISTS "design_reports_update_policy" ON design_reports;
        DROP POLICY IF EXISTS "design_reports_delete_policy" ON design_reports;
        DROP POLICY IF EXISTS "design_reports_all_policy" ON design_reports;
    END IF;
END $$;

-- Drop any other policies that might exist
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename LIKE 'design_%'
    ) 
    LOOP
        BEGIN
            EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON ' || quote_ident(r.tablename);
        EXCEPTION WHEN OTHERS THEN
            -- Ignore errors if table doesn't exist
            NULL;
        END;
    END LOOP;
END $$;

-- Drop indexes
DROP INDEX IF EXISTS idx_design_projects_project_id;
DROP INDEX IF EXISTS idx_design_projects_status;
DROP INDEX IF EXISTS idx_design_projects_design_code;
DROP INDEX IF EXISTS idx_design_calculations_project_id;
DROP INDEX IF EXISTS idx_design_calculations_type;
DROP INDEX IF EXISTS idx_design_drawings_project_id;
DROP INDEX IF EXISTS idx_design_drawings_type;
DROP INDEX IF EXISTS idx_design_drawings_calculation_id;
DROP INDEX IF EXISTS idx_design_reports_project_id;
DROP INDEX IF EXISTS idx_design_reports_type;

-- Drop any other indexes on design tables (except primary keys)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT indexname 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename LIKE 'design_%'
        AND indexname NOT LIKE '%_pkey'  -- Skip primary key indexes
    ) 
    LOOP
        BEGIN
            EXECUTE 'DROP INDEX IF EXISTS ' || quote_ident(r.indexname);
        EXCEPTION WHEN OTHERS THEN
            -- Ignore errors
            NULL;
        END;
    END LOOP;
END $$;

-- Drop triggers (only if tables exist)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'design_projects') THEN
        DROP TRIGGER IF EXISTS update_design_projects_updated_at ON design_projects;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'design_calculations') THEN
        DROP TRIGGER IF EXISTS update_design_calculations_updated_at ON design_calculations;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'design_drawings') THEN
        DROP TRIGGER IF EXISTS update_design_drawings_updated_at ON design_drawings;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'design_reports') THEN
        DROP TRIGGER IF EXISTS update_design_reports_updated_at ON design_reports;
    END IF;
END $$;

-- Note: update_updated_at_column() function is used by other tables too
-- so we don't drop it here. Only design-specific triggers are dropped above.

-- Disable RLS on tables before dropping (only if tables exist)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'design_drawings') THEN
        ALTER TABLE design_drawings DISABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'design_calculations') THEN
        ALTER TABLE design_calculations DISABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'design_reports') THEN
        ALTER TABLE design_reports DISABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'design_projects') THEN
        ALTER TABLE design_projects DISABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Drop tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS design_drawings CASCADE;
DROP TABLE IF EXISTS design_calculations CASCADE;
DROP TABLE IF EXISTS design_reports CASCADE;
DROP TABLE IF EXISTS design_projects CASCADE;

-- Verify deletion
DO $$ 
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name LIKE 'design_%';
    
    IF table_count > 0 THEN
        RAISE NOTICE 'Warning: % design tables still exist', table_count;
    ELSE
        RAISE NOTICE 'Success: All design tables have been deleted';
    END IF;
END $$;

-- Cleanup completed
SELECT 'Design system cleanup completed!' AS status;

