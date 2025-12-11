-- Add Current User to KPI Notifications
-- إضافة المستخدم الحالي إلى إشعارات KPI

-- This script will add the current user (or specific users) to kpi_notification_settings
-- هذا السكريبت سيزيد المستخدم الحالي (أو مستخدمين محددين) إلى kpi_notification_settings

-- Option 1: Add specific user by email
-- الخيار 1: إضافة مستخدم محدد بالبريد الإلكتروني
INSERT INTO kpi_notification_settings (user_id, department, role, can_receive_notifications, can_approve_kpis, notification_methods)
SELECT 
    upc.id as user_id,
    upc.department_name_en as department,
    upc.role,
    true as can_receive_notifications,
    CASE 
        WHEN upc.role IN ('planner', 'manager', 'admin') THEN true
        ELSE false
    END as can_approve_kpis,
    ARRAY['in_app']::TEXT[] as notification_methods
FROM user_profiles_complete upc
WHERE upc.email = 'mohamed.hagag@rabatpfc.com'  -- Replace with your email
AND NOT EXISTS (
    SELECT 1 FROM kpi_notification_settings kns 
    WHERE kns.user_id = upc.id
)
ON CONFLICT (user_id, department, role) DO NOTHING;

-- Option 2: Add all admins and managers
-- الخيار 2: إضافة جميع الأدمن والمانجرز
INSERT INTO kpi_notification_settings (user_id, department, role, can_receive_notifications, can_approve_kpis, notification_methods)
SELECT 
    upc.id as user_id,
    upc.department_name_en as department,
    upc.role,
    true as can_receive_notifications,
    true as can_approve_kpis,
    ARRAY['in_app']::TEXT[] as notification_methods
FROM user_profiles_complete upc
WHERE upc.role IN ('admin', 'manager', 'planner')
AND NOT EXISTS (
    SELECT 1 FROM kpi_notification_settings kns 
    WHERE kns.user_id = upc.id
)
ON CONFLICT (user_id, department, role) DO NOTHING;

-- Verify: Show all users who can receive notifications
SELECT 
    upc.id,
    upc.email,
    upc.full_name,
    upc.role,
    upc.department_name_en,
    kns.can_receive_notifications,
    kns.can_approve_kpis
FROM kpi_notification_settings kns
JOIN user_profiles_complete upc ON kns.user_id = upc.id
WHERE kns.can_receive_notifications = true
ORDER BY upc.email;

