-- Check KPI Notifications Setup
-- التحقق من إعداد إشعارات KPI

-- 1. Check if tables exist
SELECT 
    CASE 
        WHEN EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'kpi_notifications') 
        THEN '✅ Table kpi_notifications exists'
        ELSE '❌ Table kpi_notifications does NOT exist'
    END as kpi_notifications_table,
    CASE 
        WHEN EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'kpi_notification_settings') 
        THEN '✅ Table kpi_notification_settings exists'
        ELSE '❌ Table kpi_notification_settings does NOT exist'
    END as kpi_notification_settings_table;

-- 2. Check RLS status
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('kpi_notifications', 'kpi_notification_settings');

-- 3. Count notifications
SELECT 
    COUNT(*) as total_notifications,
    COUNT(*) FILTER (WHERE is_read = false) as unread_notifications,
    COUNT(*) FILTER (WHERE is_read = true) as read_notifications
FROM kpi_notifications;

-- 4. Check notification settings
SELECT 
    COUNT(*) as total_settings,
    COUNT(*) FILTER (WHERE can_receive_notifications = true) as users_can_receive,
    COUNT(*) FILTER (WHERE can_approve_kpis = true) as users_can_approve
FROM kpi_notification_settings;

-- 5. List users who can receive notifications
SELECT 
    ups.user_id,
    upc.full_name,
    upc.email,
    upc.role,
    upc.department_name_en,
    ups.can_receive_notifications,
    ups.can_approve_kpis
FROM kpi_notification_settings ups
LEFT JOIN user_profiles_complete upc ON ups.user_id = upc.id
ORDER BY ups.can_receive_notifications DESC, upc.full_name;

-- 6. Check recent notifications (last 10)
SELECT 
    id,
    notification_type,
    title,
    message,
    is_read,
    created_at,
    recipient_id
FROM kpi_notifications
ORDER BY created_at DESC
LIMIT 10;

-- 7. Check if there are any KPIs that need approval (Actual KPIs without approval)
SELECT 
    COUNT(*) as pending_kpis_count
FROM "Planning Database - KPI"
WHERE "Input Type" = 'Actual'
AND (
    "Approval Status" IS NULL 
    OR "Approval Status" = '' 
    OR LOWER("Approval Status") != 'approved'
);

