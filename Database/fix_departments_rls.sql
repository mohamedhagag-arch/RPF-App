-- ============================================
-- 🔧 Fix Departments RLS Policies
-- ============================================
-- This script fixes the RLS policies for the departments table
-- to allow admins to add, edit, and delete departments

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read active departments" ON departments;
DROP POLICY IF EXISTS "Admins can manage departments" ON departments;

-- Create new policies with proper permissions

-- 1. Allow everyone to read active departments
CREATE POLICY "Anyone can read active departments" ON departments
    FOR SELECT USING (is_active = true);

-- 2. Allow authenticated users to read all departments (for admin management)
CREATE POLICY "Authenticated users can read all departments" ON departments
    FOR SELECT USING (auth.role() = 'authenticated');

-- 3. Allow admins and managers to insert departments
CREATE POLICY "Admins and managers can insert departments" ON departments
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'manager')
        )
    );

-- 4. Allow admins and managers to update departments
CREATE POLICY "Admins and managers can update departments" ON departments
    FOR UPDATE USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'manager')
        )
    );

-- 5. Allow admins to delete departments
CREATE POLICY "Admins can delete departments" ON departments
    FOR DELETE USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Grant necessary permissions
GRANT ALL ON departments TO authenticated;
GRANT SELECT ON departments TO anon;

-- Log success
SELECT 'Departments RLS policies fixed successfully!' AS status;
