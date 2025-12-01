-- Create user activities tracking table
-- This table tracks all user actions across the application

CREATE TABLE IF NOT EXISTS public.user_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT,
    user_name TEXT,
    action_type TEXT NOT NULL, -- 'view', 'create', 'update', 'delete', 'export', 'import', 'approve', 'reject', etc.
    entity_type TEXT, -- 'kpi', 'boq', 'project', 'settings', 'user_guide', etc.
    entity_id TEXT, -- ID of the affected entity
    page_path TEXT, -- Current page path
    page_title TEXT, -- Page title/name
    description TEXT, -- Detailed description of the action
    metadata JSONB, -- Additional data (old values, new values, filters, etc.)
    ip_address TEXT,
    user_agent TEXT,
    session_id TEXT,
    current_page TEXT, -- Current page the user is on
    is_active BOOLEAN DEFAULT true, -- Whether user is currently active
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON public.user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_user_email ON public.user_activities(user_email);
CREATE INDEX IF NOT EXISTS idx_user_activities_action_type ON public.user_activities(action_type);
CREATE INDEX IF NOT EXISTS idx_user_activities_entity_type ON public.user_activities(entity_type);
CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON public.user_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activities_page_path ON public.user_activities(page_path);
CREATE INDEX IF NOT EXISTS idx_user_activities_session_id ON public.user_activities(session_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_is_active ON public.user_activities(is_active);

-- Enable Row Level Security
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Only admins can view all activities
CREATE POLICY "Admins can view all activities"
    ON public.user_activities
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Users can view their own activities
CREATE POLICY "Users can view their own activities"
    ON public.user_activities
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR user_email = auth.email()
    );

-- Anyone authenticated can insert activities (for tracking)
CREATE POLICY "Authenticated users can log activities"
    ON public.user_activities
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Grant permissions
GRANT SELECT, INSERT ON public.user_activities TO authenticated;
GRANT SELECT ON public.user_activities TO anon;

-- Create function to automatically set user info
CREATE OR REPLACE FUNCTION public.set_user_activity_info()
RETURNS TRIGGER AS $$
BEGIN
    -- Set user info if not provided
    IF NEW.user_id IS NULL THEN
        NEW.user_id := auth.uid();
    END IF;
    
    IF NEW.user_email IS NULL THEN
        NEW.user_email := auth.email();
    END IF;
    
    -- Try to get user name from users table
    IF NEW.user_name IS NULL THEN
        SELECT full_name INTO NEW.user_name
        FROM public.users
        WHERE id = NEW.user_id OR email = NEW.user_email
        LIMIT 1;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_set_user_activity_info ON public.user_activities;
CREATE TRIGGER trigger_set_user_activity_info
    BEFORE INSERT ON public.user_activities
    FOR EACH ROW
    EXECUTE FUNCTION public.set_user_activity_info();

-- Add comment
COMMENT ON TABLE public.user_activities IS 'Tracks all user activities across the application for analytics and auditing purposes';

