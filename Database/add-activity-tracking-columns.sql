-- Add columns to existing user_activities table for active user tracking
-- Run this if you already have the user_activities table

ALTER TABLE public.user_activities 
ADD COLUMN IF NOT EXISTS current_page TEXT;

ALTER TABLE public.user_activities 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_user_activities_session_id ON public.user_activities(session_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_is_active ON public.user_activities(is_active);

-- Add comment
COMMENT ON COLUMN public.user_activities.current_page IS 'Current page the user is viewing';
COMMENT ON COLUMN public.user_activities.is_active IS 'Whether this activity is from an active user session';

