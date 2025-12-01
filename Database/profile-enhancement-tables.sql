-- 👤 Profile Enhancement Tables
-- تحسين جداول الملف الشخصي

-- 1. Departments Table (الأقسام)
CREATE TABLE IF NOT EXISTS departments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name_en TEXT NOT NULL UNIQUE,
    name_ar TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- 2. Job Titles Table (المسميات الوظيفية)
CREATE TABLE IF NOT EXISTS job_titles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title_en TEXT NOT NULL UNIQUE,
    title_ar TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- 3. Update Users Table (تحديث جدول المستخدمين)
-- Add new columns to users table if they don't exist
DO $$ 
BEGIN
    -- First Name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'first_name') THEN
        ALTER TABLE users ADD COLUMN first_name TEXT;
    END IF;

    -- Last Name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'last_name') THEN
        ALTER TABLE users ADD COLUMN last_name TEXT;
    END IF;

    -- Department (reference to departments table)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'department_id') THEN
        ALTER TABLE users ADD COLUMN department_id UUID REFERENCES departments(id);
    END IF;

    -- Job Title (reference to job_titles table)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'job_title_id') THEN
        ALTER TABLE users ADD COLUMN job_title_id UUID REFERENCES job_titles(id);
    END IF;

    -- Phone 1
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'phone_1') THEN
        ALTER TABLE users ADD COLUMN phone_1 TEXT;
    END IF;

    -- Phone 2
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'phone_2') THEN
        ALTER TABLE users ADD COLUMN phone_2 TEXT;
    END IF;

    -- About/Bio
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'about') THEN
        ALTER TABLE users ADD COLUMN about TEXT;
    END IF;

    -- Profile Picture URL
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'profile_picture_url') THEN
        ALTER TABLE users ADD COLUMN profile_picture_url TEXT;
    END IF;
END $$;

-- 4. Create Indexes
CREATE INDEX IF NOT EXISTS idx_departments_active ON departments(is_active);
CREATE INDEX IF NOT EXISTS idx_departments_order ON departments(display_order);
CREATE INDEX IF NOT EXISTS idx_job_titles_active ON job_titles(is_active);
CREATE INDEX IF NOT EXISTS idx_job_titles_order ON job_titles(display_order);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department_id);
CREATE INDEX IF NOT EXISTS idx_users_job_title ON users(job_title_id);

-- 5. Row Level Security (RLS)

-- Departments
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- Everyone can read active departments
CREATE POLICY "Anyone can read active departments" ON departments
    FOR SELECT USING (is_active = true);

-- Only admins can manage departments
CREATE POLICY "Admins can manage departments" ON departments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Job Titles
ALTER TABLE job_titles ENABLE ROW LEVEL SECURITY;

-- Everyone can read active job titles
CREATE POLICY "Anyone can read active job titles" ON job_titles
    FOR SELECT USING (is_active = true);

-- Only admins can manage job titles
CREATE POLICY "Admins can manage job titles" ON job_titles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- 6. Insert Default Departments (Enhanced)
INSERT INTO departments (name_en, name_ar, description, display_order, is_active) VALUES
('Executive Management', 'الإدارة التنفيذية', 'Top-level management and strategic planning', 1, true),
('Project Management', 'إدارة المشاريع', 'Project planning, execution, and monitoring', 2, true),
('Engineering', 'الهندسة', 'Technical engineering and design', 3, true),
('Construction', 'الإنشاءات', 'Construction operations and site management', 4, true),
('Quality Control', 'مراقبة الجودة', 'Quality assurance and control', 5, true),
('Safety & Security', 'السلامة والأمن', 'Safety protocols and security management', 6, true),
('Finance & Accounting', 'المالية والمحاسبة', 'Financial management and accounting', 7, true),
('Human Resources', 'الموارد البشرية', 'HR management and employee relations', 8, true),
('Procurement', 'المشتريات', 'Procurement and supply chain management', 9, true),
('IT & Systems', 'تقنية المعلومات', 'Information technology and systems', 10, true),
('Administration', 'الإدارة العامة', 'General administration and support', 11, true),
('Legal & Compliance', 'الشؤون القانونية', 'Legal affairs and compliance', 12, true)
ON CONFLICT (name_en) DO NOTHING;

-- 7. Insert Default Job Titles
INSERT INTO job_titles (title_en, title_ar, description, display_order) VALUES
('Project Manager', 'مدير مشروع', 'Project Manager', 1),
('Site Engineer', 'مهندس موقع', 'Site Engineer', 2),
('Senior Engineer', 'مهندس أول', 'Senior Engineer', 3),
('Engineer', 'مهندس', 'Engineer', 4),
('Assistant Engineer', 'مهندس مساعد', 'Assistant Engineer', 5),
('Supervisor', 'مشرف', 'Supervisor', 6),
('Foreman', 'رئيس عمال', 'Foreman', 7),
('QC Inspector', 'مفتش جودة', 'Quality Control Inspector', 8),
('Safety Officer', 'مسؤول السلامة', 'Safety Officer', 9),
('Technical Office Engineer', 'مهندس مكتب فني', 'Technical Office Engineer', 10),
('Planning Engineer', 'مهندس تخطيط', 'Planning Engineer', 11),
('Quantity Surveyor', 'مهندس كميات', 'Quantity Surveyor', 12),
('Procurement Officer', 'مسؤول مشتريات', 'Procurement Officer', 13),
('HR Manager', 'مدير الموارد البشرية', 'Human Resources Manager', 14),
('Finance Manager', 'مدير مالي', 'Finance Manager', 15),
('Administrator', 'إداري', 'Administrator', 16),
('Executive', 'تنفيذي', 'Executive', 17)
ON CONFLICT (title_en) DO NOTHING;

-- 8. Create Functions

-- Function to get department name with fallback
CREATE OR REPLACE FUNCTION get_department_name(dept_id UUID, language TEXT DEFAULT 'en')
RETURNS TEXT AS $$
DECLARE
    dept_name TEXT;
BEGIN
    IF language = 'ar' THEN
        SELECT name_ar INTO dept_name FROM departments WHERE id = dept_id;
    ELSE
        SELECT name_en INTO dept_name FROM departments WHERE id = dept_id;
    END IF;
    
    RETURN COALESCE(dept_name, 'Not Assigned');
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get job title with fallback
CREATE OR REPLACE FUNCTION get_job_title(title_id UUID, language TEXT DEFAULT 'en')
RETURNS TEXT AS $$
DECLARE
    title_name TEXT;
BEGIN
    IF language = 'ar' THEN
        SELECT title_ar INTO title_name FROM job_titles WHERE id = title_id;
    ELSE
        SELECT title_en INTO title_name FROM job_titles WHERE id = title_id;
    END IF;
    
    RETURN COALESCE(title_name, 'Not Assigned');
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get user full name
CREATE OR REPLACE FUNCTION get_user_full_name(user_id UUID)
RETURNS TEXT AS $$
DECLARE
    first_n TEXT;
    last_n TEXT;
    full_n TEXT;
BEGIN
    SELECT first_name, last_name INTO first_n, last_n 
    FROM users 
    WHERE id = user_id;
    
    IF first_n IS NOT NULL AND last_n IS NOT NULL THEN
        full_n := first_n || ' ' || last_n;
    ELSIF first_n IS NOT NULL THEN
        full_n := first_n;
    ELSIF last_n IS NOT NULL THEN
        full_n := last_n;
    ELSE
        SELECT full_name INTO full_n FROM users WHERE id = user_id;
    END IF;
    
    RETURN COALESCE(full_n, 'Unknown User');
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to update user profile
CREATE OR REPLACE FUNCTION update_user_profile(
    user_id UUID,
    p_first_name TEXT DEFAULT NULL,
    p_last_name TEXT DEFAULT NULL,
    p_department_id UUID DEFAULT NULL,
    p_job_title_id UUID DEFAULT NULL,
    p_phone_1 TEXT DEFAULT NULL,
    p_phone_2 TEXT DEFAULT NULL,
    p_about TEXT DEFAULT NULL,
    p_profile_picture_url TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE users SET
        first_name = COALESCE(p_first_name, first_name),
        last_name = COALESCE(p_last_name, last_name),
        full_name = COALESCE(p_first_name, first_name) || ' ' || COALESCE(p_last_name, last_name),
        department_id = COALESCE(p_department_id, department_id),
        job_title_id = COALESCE(p_job_title_id, job_title_id),
        phone_1 = COALESCE(p_phone_1, phone_1),
        phone_2 = COALESCE(p_phone_2, phone_2),
        about = COALESCE(p_about, about),
        profile_picture_url = COALESCE(p_profile_picture_url, profile_picture_url),
        updated_at = NOW()
    WHERE id = user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create View for User Profiles with Complete Info
CREATE OR REPLACE VIEW user_profiles_complete AS
SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.full_name,
    u.role,
    u.phone_1,
    u.phone_2,
    u.about,
    u.profile_picture_url,
    u.is_active,
    d.id as department_id,
    d.name_en as department_name_en,
    d.name_ar as department_name_ar,
    jt.id as job_title_id,
    jt.title_en as job_title_en,
    jt.title_ar as job_title_ar,
    u.created_at,
    u.updated_at
FROM users u
LEFT JOIN departments d ON u.department_id = d.id
LEFT JOIN job_titles jt ON u.job_title_id = jt.id;

-- 10. Grant Permissions
GRANT SELECT ON departments TO authenticated;
GRANT SELECT ON job_titles TO authenticated;
GRANT SELECT ON user_profiles_complete TO authenticated;
GRANT EXECUTE ON FUNCTION get_department_name TO authenticated;
GRANT EXECUTE ON FUNCTION get_job_title TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_full_name TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_profile TO authenticated;

-- 11. Create Triggers for Updated At
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_departments_updated_at
    BEFORE UPDATE ON departments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_titles_updated_at
    BEFORE UPDATE ON job_titles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 12. Add Comments
COMMENT ON TABLE departments IS 'Departments/Divisions in the organization';
COMMENT ON TABLE job_titles IS 'Job titles/positions in the organization';
COMMENT ON COLUMN users.first_name IS 'User first name';
COMMENT ON COLUMN users.last_name IS 'User last name';
COMMENT ON COLUMN users.department_id IS 'Reference to departments table';
COMMENT ON COLUMN users.job_title_id IS 'Reference to job_titles table';
COMMENT ON COLUMN users.phone_1 IS 'Primary phone number';
COMMENT ON COLUMN users.phone_2 IS 'Secondary phone number';
COMMENT ON COLUMN users.about IS 'User bio/description';
COMMENT ON COLUMN users.profile_picture_url IS 'URL to profile picture';

-- Success message
SELECT 'Profile enhancement tables created successfully!' as message;
