-- 🔄 Update Script: Add More Departments and Job Titles (Fixed Version)
-- هذا السكريبت يضيف المزيد من الأقسام والمسميات الوظيفية إلى ما هو موجود بالفعل
-- تم إصلاح مشكلة التكرار في title_ar

-- ============================================
-- PART 1: Add Additional Departments
-- ============================================

-- إضافة أقسام إضافية (ستتجاهل ما هو موجود بالفعل)
INSERT INTO departments (name_en, name_ar, description, display_order, is_active) VALUES
('Executive Management', 'الإدارة التنفيذية', 'Top-level management and strategic planning', 1, true),
('Construction', 'الإنشاءات', 'Construction operations and site management', 4, true),
('Legal & Compliance', 'الشؤون القانونية', 'Legal affairs and compliance', 13, true)
ON CONFLICT (name_en) DO NOTHING;

-- ============================================
-- PART 2: Add Additional Job Titles
-- ============================================

-- حذف المسميات المكررة أولاً إذا وجدت
DO $$
BEGIN
    -- لا نحذف، فقط نتجنب الإضافة
END $$;

-- إضافة مسميات وظيفية إضافية بطريقة آمنة
-- نستخدم INSERT مع SELECT للتحقق من عدم وجود title_ar مكرر

-- Executive Level (المستوى التنفيذي)
INSERT INTO job_titles (title_en, title_ar, description, display_order, is_active)
SELECT 'Chief Executive Officer', 'الرئيس التنفيذي', 'Top executive position', 101, true
WHERE NOT EXISTS (SELECT 1 FROM job_titles WHERE title_en = 'Chief Executive Officer' OR title_ar = 'الرئيس التنفيذي');

INSERT INTO job_titles (title_en, title_ar, description, display_order, is_active)
SELECT 'Chief Operating Officer', 'الرئيس التنفيذي للعمليات', 'Operations executive', 102, true
WHERE NOT EXISTS (SELECT 1 FROM job_titles WHERE title_en = 'Chief Operating Officer' OR title_ar = 'الرئيس التنفيذي للعمليات');

INSERT INTO job_titles (title_en, title_ar, description, display_order, is_active)
SELECT 'Chief Financial Officer', 'الرئيس التنفيذي للمالية', 'Financial executive', 103, true
WHERE NOT EXISTS (SELECT 1 FROM job_titles WHERE title_en = 'Chief Financial Officer' OR title_ar = 'الرئيس التنفيذي للمالية');

INSERT INTO job_titles (title_en, title_ar, description, display_order, is_active)
SELECT 'Chief Technology Officer', 'الرئيس التنفيذي للتكنولوجيا', 'Technology executive', 104, true
WHERE NOT EXISTS (SELECT 1 FROM job_titles WHERE title_en = 'Chief Technology Officer' OR title_ar = 'الرئيس التنفيذي للتكنولوجيا');

-- Management Level (مستوى الإدارة)
INSERT INTO job_titles (title_en, title_ar, description, display_order, is_active)
SELECT 'General Manager', 'المدير العام', 'General management position', 105, true
WHERE NOT EXISTS (SELECT 1 FROM job_titles WHERE title_en = 'General Manager' OR title_ar = 'المدير العام');

INSERT INTO job_titles (title_en, title_ar, description, display_order, is_active)
SELECT 'Operations Manager', 'مدير العمليات', 'Operations management', 106, true
WHERE NOT EXISTS (SELECT 1 FROM job_titles WHERE title_en = 'Operations Manager' OR title_ar = 'مدير العمليات');

INSERT INTO job_titles (title_en, title_ar, description, display_order, is_active)
SELECT 'Engineering Manager', 'مدير الهندسة', 'Engineering management', 108, true
WHERE NOT EXISTS (SELECT 1 FROM job_titles WHERE title_en = 'Engineering Manager' OR title_ar = 'مدير الهندسة');

INSERT INTO job_titles (title_en, title_ar, description, display_order, is_active)
SELECT 'Construction Manager', 'مدير الإنشاءات', 'Construction management', 109, true
WHERE NOT EXISTS (SELECT 1 FROM job_titles WHERE title_en = 'Construction Manager' OR title_ar = 'مدير الإنشاءات');

INSERT INTO job_titles (title_en, title_ar, description, display_order, is_active)
SELECT 'Quality Manager', 'مدير الجودة', 'Quality management', 110, true
WHERE NOT EXISTS (SELECT 1 FROM job_titles WHERE title_en = 'Quality Manager' OR title_ar = 'مدير الجودة');

INSERT INTO job_titles (title_en, title_ar, description, display_order, is_active)
SELECT 'Safety Manager', 'مدير السلامة', 'Safety management', 111, true
WHERE NOT EXISTS (SELECT 1 FROM job_titles WHERE title_en = 'Safety Manager' OR title_ar = 'مدير السلامة');

INSERT INTO job_titles (title_en, title_ar, description, display_order, is_active)
SELECT 'IT Manager', 'مدير تقنية المعلومات', 'IT management', 114, true
WHERE NOT EXISTS (SELECT 1 FROM job_titles WHERE title_en = 'IT Manager' OR title_ar = 'مدير تقنية المعلومات');

-- Senior Level (المستوى الأول)
INSERT INTO job_titles (title_en, title_ar, description, display_order, is_active)
SELECT 'Senior Project Manager', 'مدير مشروع أول', 'Senior project management', 118, true
WHERE NOT EXISTS (SELECT 1 FROM job_titles WHERE title_en = 'Senior Project Manager' OR title_ar = 'مدير مشروع أول');

INSERT INTO job_titles (title_en, title_ar, description, display_order, is_active)
SELECT 'Senior Construction Engineer', 'مهندس إنشاءات أول', 'Senior construction engineering', 119, true
WHERE NOT EXISTS (SELECT 1 FROM job_titles WHERE title_en = 'Senior Construction Engineer' OR title_ar = 'مهندس إنشاءات أول');

INSERT INTO job_titles (title_en, title_ar, description, display_order, is_active)
SELECT 'Senior Quality Engineer', 'مهندس جودة أول', 'Senior quality engineering', 120, true
WHERE NOT EXISTS (SELECT 1 FROM job_titles WHERE title_en = 'Senior Quality Engineer' OR title_ar = 'مهندس جودة أول');

INSERT INTO job_titles (title_en, title_ar, description, display_order, is_active)
SELECT 'Senior Safety Engineer', 'مهندس سلامة أول', 'Senior safety engineering', 121, true
WHERE NOT EXISTS (SELECT 1 FROM job_titles WHERE title_en = 'Senior Safety Engineer' OR title_ar = 'مهندس سلامة أول');

INSERT INTO job_titles (title_en, title_ar, description, display_order, is_active)
SELECT 'Senior HR Specialist', 'أخصائي موارد بشرية أول', 'Senior HR position', 122, true
WHERE NOT EXISTS (SELECT 1 FROM job_titles WHERE title_en = 'Senior HR Specialist' OR title_ar = 'أخصائي موارد بشرية أول');

INSERT INTO job_titles (title_en, title_ar, description, display_order, is_active)
SELECT 'Senior IT Specialist', 'أخصائي تقنية معلومات أول', 'Senior IT position', 123, true
WHERE NOT EXISTS (SELECT 1 FROM job_titles WHERE title_en = 'Senior IT Specialist' OR title_ar = 'أخصائي تقنية معلومات أول');

-- Professional Level (المستوى المهني)
INSERT INTO job_titles (title_en, title_ar, description, display_order, is_active)
SELECT 'Project Engineer', 'مهندس مشروع', 'Project engineering', 124, true
WHERE NOT EXISTS (SELECT 1 FROM job_titles WHERE title_en = 'Project Engineer' OR title_ar = 'مهندس مشروع');

INSERT INTO job_titles (title_en, title_ar, description, display_order, is_active)
SELECT 'Civil Engineer', 'مهندس مدني', 'Civil engineering', 125, true
WHERE NOT EXISTS (SELECT 1 FROM job_titles WHERE title_en = 'Civil Engineer' OR title_ar = 'مهندس مدني');

INSERT INTO job_titles (title_en, title_ar, description, display_order, is_active)
SELECT 'Structural Engineer', 'مهندس إنشائي', 'Structural engineering', 126, true
WHERE NOT EXISTS (SELECT 1 FROM job_titles WHERE title_en = 'Structural Engineer' OR title_ar = 'مهندس إنشائي');

INSERT INTO job_titles (title_en, title_ar, description, display_order, is_active)
SELECT 'Electrical Engineer', 'مهندس كهربائي', 'Electrical engineering', 127, true
WHERE NOT EXISTS (SELECT 1 FROM job_titles WHERE title_en = 'Electrical Engineer' OR title_ar = 'مهندس كهربائي');

INSERT INTO job_titles (title_en, title_ar, description, display_order, is_active)
SELECT 'Mechanical Engineer', 'مهندس ميكانيكي', 'Mechanical engineering', 128, true
WHERE NOT EXISTS (SELECT 1 FROM job_titles WHERE title_en = 'Mechanical Engineer' OR title_ar = 'مهندس ميكانيكي');

INSERT INTO job_titles (title_en, title_ar, description, display_order, is_active)
SELECT 'Quality Engineer', 'مهندس جودة', 'Quality engineering', 129, true
WHERE NOT EXISTS (SELECT 1 FROM job_titles WHERE title_en = 'Quality Engineer' OR title_ar = 'مهندس جودة');

INSERT INTO job_titles (title_en, title_ar, description, display_order, is_active)
SELECT 'Safety Engineer', 'مهندس سلامة', 'Safety engineering', 130, true
WHERE NOT EXISTS (SELECT 1 FROM job_titles WHERE title_en = 'Safety Engineer' OR title_ar = 'مهندس سلامة');

INSERT INTO job_titles (title_en, title_ar, description, display_order, is_active)
SELECT 'Cost Engineer', 'مهندس تكلفة', 'Cost engineering', 131, true
WHERE NOT EXISTS (SELECT 1 FROM job_titles WHERE title_en = 'Cost Engineer' OR title_ar = 'مهندس تكلفة');

-- Technical Level (المستوى الفني)
INSERT INTO job_titles (title_en, title_ar, description, display_order, is_active)
SELECT 'Quality Control Inspector', 'مفتش رقابة جودة', 'Quality control inspection', 135, true
WHERE NOT EXISTS (SELECT 1 FROM job_titles WHERE title_en = 'Quality Control Inspector' OR title_ar = 'مفتش رقابة جودة');

INSERT INTO job_titles (title_en, title_ar, description, display_order, is_active)
SELECT 'Safety Inspector', 'مفتش سلامة', 'Safety inspection', 136, true
WHERE NOT EXISTS (SELECT 1 FROM job_titles WHERE title_en = 'Safety Inspector' OR title_ar = 'مفتش سلامة');

INSERT INTO job_titles (title_en, title_ar, description, display_order, is_active)
SELECT 'Surveyor', 'مساح', 'Land surveying', 137, true
WHERE NOT EXISTS (SELECT 1 FROM job_titles WHERE title_en = 'Surveyor' OR title_ar = 'مساح');

INSERT INTO job_titles (title_en, title_ar, description, display_order, is_active)
SELECT 'Drafter', 'رسام فني', 'Technical drawing', 138, true
WHERE NOT EXISTS (SELECT 1 FROM job_titles WHERE title_en = 'Drafter' OR title_ar = 'رسام فني');

INSERT INTO job_titles (title_en, title_ar, description, display_order, is_active)
SELECT 'Technician', 'فني', 'Technical support', 139, true
WHERE NOT EXISTS (SELECT 1 FROM job_titles WHERE title_en = 'Technician' OR title_ar = 'فني');

-- Administrative Level (المستوى الإداري)
INSERT INTO job_titles (title_en, title_ar, description, display_order, is_active)
SELECT 'Project Coordinator', 'منسق مشروع', 'Project coordination', 140, true
WHERE NOT EXISTS (SELECT 1 FROM job_titles WHERE title_en = 'Project Coordinator' OR title_ar = 'منسق مشروع');

INSERT INTO job_titles (title_en, title_ar, description, display_order, is_active)
SELECT 'Administrative Assistant', 'مساعد إداري', 'Administrative support', 141, true
WHERE NOT EXISTS (SELECT 1 FROM job_titles WHERE title_en = 'Administrative Assistant' OR title_ar = 'مساعد إداري');

INSERT INTO job_titles (title_en, title_ar, description, display_order, is_active)
SELECT 'Accountant', 'محاسب', 'Accounting', 142, true
WHERE NOT EXISTS (SELECT 1 FROM job_titles WHERE title_en = 'Accountant' OR title_ar = 'محاسب');

INSERT INTO job_titles (title_en, title_ar, description, display_order, is_active)
SELECT 'HR Specialist', 'أخصائي موارد بشرية', 'Human resources', 143, true
WHERE NOT EXISTS (SELECT 1 FROM job_titles WHERE title_en = 'HR Specialist' OR title_ar = 'أخصائي موارد بشرية');

INSERT INTO job_titles (title_en, title_ar, description, display_order, is_active)
SELECT 'IT Specialist', 'أخصائي تقنية معلومات', 'Information technology', 144, true
WHERE NOT EXISTS (SELECT 1 FROM job_titles WHERE title_en = 'IT Specialist' OR title_ar = 'أخصائي تقنية معلومات');

INSERT INTO job_titles (title_en, title_ar, description, display_order, is_active)
SELECT 'Procurement Specialist', 'أخصائي مشتريات', 'Procurement', 145, true
WHERE NOT EXISTS (SELECT 1 FROM job_titles WHERE title_en = 'Procurement Specialist' OR title_ar = 'أخصائي مشتريات');

INSERT INTO job_titles (title_en, title_ar, description, display_order, is_active)
SELECT 'Legal Advisor', 'مستشار قانوني', 'Legal advice', 146, true
WHERE NOT EXISTS (SELECT 1 FROM job_titles WHERE title_en = 'Legal Advisor' OR title_ar = 'مستشار قانوني');

INSERT INTO job_titles (title_en, title_ar, description, display_order, is_active)
SELECT 'Secretary', 'سكرتير', 'Secretarial support', 147, true
WHERE NOT EXISTS (SELECT 1 FROM job_titles WHERE title_en = 'Secretary' OR title_ar = 'سكرتير');

-- Support Level (مستوى الدعم)
INSERT INTO job_titles (title_en, title_ar, description, display_order, is_active)
SELECT 'Clerk', 'كاتب', 'Clerical work', 148, true
WHERE NOT EXISTS (SELECT 1 FROM job_titles WHERE title_en = 'Clerk' OR title_ar = 'كاتب');

INSERT INTO job_titles (title_en, title_ar, description, display_order, is_active)
SELECT 'Receptionist', 'موظف استقبال', 'Reception duties', 149, true
WHERE NOT EXISTS (SELECT 1 FROM job_titles WHERE title_en = 'Receptionist' OR title_ar = 'موظف استقبال');

INSERT INTO job_titles (title_en, title_ar, description, display_order, is_active)
SELECT 'Driver', 'سائق', 'Driving duties', 150, true
WHERE NOT EXISTS (SELECT 1 FROM job_titles WHERE title_en = 'Driver' OR title_ar = 'سائق');

INSERT INTO job_titles (title_en, title_ar, description, display_order, is_active)
SELECT 'Security Guard', 'حارس أمن', 'Security duties', 151, true
WHERE NOT EXISTS (SELECT 1 FROM job_titles WHERE title_en = 'Security Guard' OR title_ar = 'حارس أمن');

INSERT INTO job_titles (title_en, title_ar, description, display_order, is_active)
SELECT 'Maintenance Worker', 'عامل صيانة', 'Maintenance work', 152, true
WHERE NOT EXISTS (SELECT 1 FROM job_titles WHERE title_en = 'Maintenance Worker' OR title_ar = 'عامل صيانة');

INSERT INTO job_titles (title_en, title_ar, description, display_order, is_active)
SELECT 'Cleaner', 'عامل نظافة', 'Cleaning duties', 153, true
WHERE NOT EXISTS (SELECT 1 FROM job_titles WHERE title_en = 'Cleaner' OR title_ar = 'عامل نظافة');

-- ============================================
-- PART 3: Verification Query
-- ============================================

-- تحقق من عدد الأقسام والمسميات الوظيفية بعد التحديث
DO $$
DECLARE
    dept_count INTEGER;
    title_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO dept_count FROM departments WHERE is_active = true;
    SELECT COUNT(*) INTO title_count FROM job_titles WHERE is_active = true;
    
    RAISE NOTICE '✅ Total Active Departments: %', dept_count;
    RAISE NOTICE '✅ Total Active Job Titles: %', title_count;
    RAISE NOTICE '🎉 Update completed successfully!';
END $$;
