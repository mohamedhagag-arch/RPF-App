-- ============================================================
-- Complete KPI Notifications Setup Script
-- سكريبت شامل لإعداد إشعارات KPI
-- ============================================================

-- Step 1: Create kpi_notifications table
CREATE TABLE IF NOT EXISTS kpi_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    kpi_id UUID,
    recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL DEFAULT 'kpi_created',
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB
);

-- Step 2: Create kpi_notification_settings table
CREATE TABLE IF NOT EXISTS kpi_notification_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    department TEXT,
    role TEXT,
    can_receive_notifications BOOLEAN DEFAULT true,
    can_approve_kpis BOOLEAN DEFAULT false,
    notification_methods TEXT[] DEFAULT ARRAY['in_app'],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, department, role)
);

-- Step 3: Create indexes
CREATE INDEX IF NOT EXISTS idx_kpi_notifications_recipient ON kpi_notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_kpi_notifications_kpi_id ON kpi_notifications(kpi_id);
CREATE INDEX IF NOT EXISTS idx_kpi_notifications_is_read ON kpi_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_kpi_notifications_created_at ON kpi_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kpi_notification_settings_user ON kpi_notification_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_kpi_notification_settings_department ON kpi_notification_settings(department);
CREATE INDEX IF NOT EXISTS idx_kpi_notification_settings_role ON kpi_notification_settings(role);

-- Step 4: Drop all existing RLS policies
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'kpi_notifications') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON kpi_notifications';
    END LOOP;
    
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'kpi_notification_settings') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON kpi_notification_settings';
    END LOOP;
END $$;

-- Step 5: Disable RLS (for now, to ensure notifications work)
ALTER TABLE IF EXISTS kpi_notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS kpi_notification_settings DISABLE ROW LEVEL SECURITY;

-- Step 6: Grant permissions
GRANT ALL ON kpi_notifications TO authenticated;
GRANT ALL ON kpi_notification_settings TO authenticated;

-- Step 7: Auto-setup notification settings for Planning users
-- This will add all Planning department users and managers/planners to notification settings
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
WHERE (
    upc.department_name_en ILIKE '%Planning%' 
    OR upc.role IN ('planner', 'manager', 'admin')
)
AND NOT EXISTS (
    SELECT 1 FROM kpi_notification_settings kns 
    WHERE kns.user_id = upc.id
)
ON CONFLICT (user_id, department, role) DO NOTHING;

-- Step 8: Verify setup
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'KPI Notifications Setup Complete!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
END $$;

-- Show summary
SELECT 
    'kpi_notifications' as table_name,
    COUNT(*) as total_notifications,
    COUNT(*) FILTER (WHERE is_read = false) as unread_count
FROM kpi_notifications
UNION ALL
SELECT 
    'kpi_notification_settings' as table_name,
    COUNT(*) as total_settings,
    COUNT(*) FILTER (WHERE can_receive_notifications = true) as can_receive_count
FROM kpi_notification_settings;

-- Show users who can receive notifications
SELECT 
    upc.full_name,
    upc.email,
    upc.role,
    upc.department_name_en,
    kns.can_receive_notifications,
    kns.can_approve_kpis
FROM kpi_notification_settings kns
JOIN user_profiles_complete upc ON kns.user_id = upc.id
WHERE kns.can_receive_notifications = true
ORDER BY upc.full_name;

