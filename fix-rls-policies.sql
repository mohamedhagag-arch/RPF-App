-- ============================================
-- 🔧 Fix RLS Policies for project_type_activities
-- ============================================

-- 1. تفعيل RLS على الجدول
ALTER TABLE project_type_activities ENABLE ROW LEVEL SECURITY;

-- 2. حذف السياسات القديمة إذا وجدت
DROP POLICY IF EXISTS "Allow authenticated users to view project type activities" ON project_type_activities;
DROP POLICY IF EXISTS "Admins and Managers can manage project type activities" ON project_type_activities;

-- 3. إنشاء سياسة للقراءة (جميع المستخدمين المسجلين)
CREATE POLICY "Allow authenticated users to view project type activities" 
ON project_type_activities
FOR SELECT 
USING (auth.role() = 'authenticated');

-- 4. إنشاء سياسة للإدارة (المديرين فقط)
CREATE POLICY "Admins and Managers can manage project type activities" 
ON project_type_activities
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('admin', 'manager')
    )
);

-- 5. إنشاء سياسة للإدراج (المديرين فقط)
CREATE POLICY "Admins and Managers can insert project type activities" 
ON project_type_activities
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('admin', 'manager')
    )
);

-- 6. إنشاء سياسة للتحديث (المديرين فقط)
CREATE POLICY "Admins and Managers can update project type activities" 
ON project_type_activities
FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('admin', 'manager')
    )
);

-- 7. إنشاء سياسة للحذف (المديرين فقط)
CREATE POLICY "Admins and Managers can delete project type activities" 
ON project_type_activities
FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('admin', 'manager')
    )
);

-- 8. التحقق من البيانات
SELECT 
    project_type,
    COUNT(*) as activity_count,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_count
FROM project_type_activities 
GROUP BY project_type 
ORDER BY project_type;
