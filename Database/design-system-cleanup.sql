-- Cleanup Script for Design System
-- حذف كل ما يتعلق بنظام التصميم من قاعدة البيانات
-- ⚠️ WARNING: This will delete ALL design data permanently!

-- Drop all RLS policies first
DROP POLICY IF EXISTS "design_projects_select_policy" ON design_projects;
DROP POLICY IF EXISTS "design_projects_insert_policy" ON design_projects;
DROP POLICY IF EXISTS "design_projects_update_policy" ON design_projects;
DROP POLICY IF EXISTS "design_projects_delete_policy" ON design_projects;
DROP POLICY IF EXISTS "design_projects_all_policy" ON design_projects;

DROP POLICY IF EXISTS "design_calculations_select_policy" ON design_calculations;
DROP POLICY IF EXISTS "design_calculations_insert_policy" ON design_calculations;
DROP POLICY IF EXISTS "design_calculations_update_policy" ON design_calculations;
DROP POLICY IF EXISTS "design_calculations_delete_policy" ON design_calculations;
DROP POLICY IF EXISTS "design_calculations_all_policy" ON design_calculations;

DROP POLICY IF EXISTS "design_drawings_select_policy" ON design_drawings;
DROP POLICY IF EXISTS "design_drawings_insert_policy" ON design_drawings;
DROP POLICY IF EXISTS "design_drawings_update_policy" ON design_drawings;
DROP POLICY IF EXISTS "design_drawings_delete_policy" ON design_drawings;
DROP POLICY IF EXISTS "design_drawings_all_policy" ON design_drawings;

DROP POLICY IF EXISTS "design_reports_select_policy" ON design_reports;
DROP POLICY IF EXISTS "design_reports_insert_policy" ON design_reports;
DROP POLICY IF EXISTS "design_reports_update_policy" ON design_reports;
DROP POLICY IF EXISTS "design_reports_delete_policy" ON design_reports;
DROP POLICY IF EXISTS "design_reports_all_policy" ON design_reports;

-- Drop any other policies that might exist
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE tablename LIKE 'design_%') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON ' || quote_ident(r.tablename);
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

-- Drop any other indexes on design tables
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT indexname FROM pg_indexes WHERE tablename LIKE 'design_%') 
    LOOP
        EXECUTE 'DROP INDEX IF EXISTS ' || quote_ident(r.indexname);
    END LOOP;
END $$;

-- Drop triggers
DROP TRIGGER IF EXISTS update_design_projects_updated_at ON design_projects;
DROP TRIGGER IF EXISTS update_design_calculations_updated_at ON design_calculations;
DROP TRIGGER IF EXISTS update_design_drawings_updated_at ON design_drawings;
DROP TRIGGER IF EXISTS update_design_reports_updated_at ON design_reports;

-- Drop trigger functions
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Disable RLS on tables before dropping
ALTER TABLE IF EXISTS design_drawings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS design_calculations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS design_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS design_projects DISABLE ROW LEVEL SECURITY;

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

