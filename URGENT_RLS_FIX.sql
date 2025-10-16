-- ============================================
-- 🚨 URGENT: Fix RLS Policies - Complete Solution
-- ============================================

-- Step 1: Disable RLS temporarily to check data
ALTER TABLE project_type_activities DISABLE ROW LEVEL SECURITY;

-- Step 2: Check if data exists
SELECT COUNT(*) as total_activities FROM project_type_activities;
SELECT project_type, COUNT(*) as count FROM project_type_activities GROUP BY project_type;

-- Step 3: Re-enable RLS
ALTER TABLE project_type_activities ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop all existing policies
DROP POLICY IF EXISTS "Allow authenticated users to view project type activities" ON project_type_activities;
DROP POLICY IF EXISTS "Admins and Managers can manage project type activities" ON project_type_activities;
DROP POLICY IF EXISTS "Admins and Managers can insert project type activities" ON project_type_activities;
DROP POLICY IF EXISTS "Admins and Managers can update project type activities" ON project_type_activities;
DROP POLICY IF EXISTS "Admins and Managers can delete project type activities" ON project_type_activities;

-- Step 5: Create simple policy for all authenticated users
CREATE POLICY "Allow all authenticated users to access project type activities" 
ON project_type_activities
FOR ALL 
USING (auth.role() = 'authenticated');

-- Step 6: Grant permissions to authenticated role
GRANT ALL ON project_type_activities TO authenticated;
GRANT ALL ON project_type_activities TO anon;

-- Step 7: Final check
SELECT 
    'Data Check' as test,
    COUNT(*) as total_activities,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_activities
FROM project_type_activities;
