-- ============================================
-- 🔧 Fix Job Titles RLS Policies
-- ============================================
-- This script fixes the RLS policies for the job_titles table
-- to allow admins to add, edit, and delete job titles

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read active job titles" ON job_titles;
DROP POLICY IF EXISTS "Admins can manage job titles" ON job_titles;

-- Create new policies with proper permissions

-- 1. Allow everyone to read active job titles
CREATE POLICY "Anyone can read active job titles" ON job_titles
    FOR SELECT USING (is_active = true);

-- 2. Allow authenticated users to read all job titles (for admin management)
CREATE POLICY "Authenticated users can read all job titles" ON job_titles
    FOR SELECT USING (auth.role() = 'authenticated');

-- 3. Allow admins and managers to insert job titles
CREATE POLICY "Admins and managers can insert job titles" ON job_titles
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'manager')
        )
    );

-- 4. Allow admins and managers to update job titles
CREATE POLICY "Admins and managers can update job titles" ON job_titles
    FOR UPDATE USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'manager')
        )
    );

-- 5. Allow admins to delete job titles
CREATE POLICY "Admins can delete job titles" ON job_titles
    FOR DELETE USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Grant necessary permissions
GRANT ALL ON job_titles TO authenticated;
GRANT SELECT ON job_titles TO anon;

-- Log success
SELECT 'Job Titles RLS policies fixed successfully!' AS status;
