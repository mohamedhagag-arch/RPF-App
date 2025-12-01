-- KPI Notifications Table
-- جدول لإشعارات KPI

CREATE TABLE IF NOT EXISTS kpi_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    kpi_id UUID,
    recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL DEFAULT 'kpi_created', -- kpi_created, kpi_approved, kpi_rejected
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id), -- من أنشأ KPI
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB -- معلومات إضافية عن KPI
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_kpi_notifications_recipient ON kpi_notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_kpi_notifications_kpi_id ON kpi_notifications(kpi_id);
CREATE INDEX IF NOT EXISTS idx_kpi_notifications_is_read ON kpi_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_kpi_notifications_created_at ON kpi_notifications(created_at DESC);

-- KPI Notification Settings Table
-- جدول لإعدادات إشعارات KPI (من يحصل على الإشعارات)
CREATE TABLE IF NOT EXISTS kpi_notification_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    department TEXT, -- مثل "Planning" أو NULL لجميع الأقسام
    role TEXT, -- مثل "planner", "manager" أو NULL لجميع الأدوار
    can_receive_notifications BOOLEAN DEFAULT true,
    can_approve_kpis BOOLEAN DEFAULT false, -- من يمكنه تأكيد KPIs
    notification_methods TEXT[] DEFAULT ARRAY['in_app'], -- ['in_app', 'email', 'sms']
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, department, role)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_kpi_notification_settings_user ON kpi_notification_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_kpi_notification_settings_department ON kpi_notification_settings(department);
CREATE INDEX IF NOT EXISTS idx_kpi_notification_settings_role ON kpi_notification_settings(role);

COMMENT ON TABLE kpi_notifications IS 'إشعارات KPI للمستخدمين';
COMMENT ON TABLE kpi_notification_settings IS 'إعدادات إشعارات KPI - من يحصل على الإشعارات ومن يمكنه الموافقة';

