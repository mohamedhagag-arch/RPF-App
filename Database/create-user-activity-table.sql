-- ============================================================
-- USER ACTIVITY TABLE SCHEMA
-- جدول لتتبع المستخدمين النشطين (Online Users)
-- ============================================================

-- إنشاء جدول تتبع نشاط المستخدمين
CREATE TABLE IF NOT EXISTS public.user_activity (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  is_online BOOLEAN DEFAULT true NOT NULL,
  session_id TEXT,
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one active session per user
  UNIQUE(user_id)
);

-- إنشاء فهارس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON public.user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_last_seen ON public.user_activity(last_seen);
CREATE INDEX IF NOT EXISTS idx_user_activity_is_online ON public.user_activity(is_online);
CREATE INDEX IF NOT EXISTS idx_user_activity_updated_at ON public.user_activity(updated_at);

-- RLS Policies
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all online users
CREATE POLICY "Users can view all online users" ON public.user_activity
  FOR SELECT USING (true);

-- Policy: Users can update their own activity
CREATE POLICY "Users can update their own activity" ON public.user_activity
  FOR ALL USING (auth.uid() = user_id);

-- Policy: System can insert/update any activity (for API endpoints)
CREATE POLICY "System can manage all activities" ON public.user_activity
  FOR ALL USING (true);

-- Function to update user activity
CREATE OR REPLACE FUNCTION update_user_activity(
  p_user_id UUID,
  p_is_online BOOLEAN DEFAULT true,
  p_session_id TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.user_activity (
    user_id,
    last_seen,
    is_online,
    session_id,
    user_agent,
    ip_address,
    updated_at
  )
  VALUES (
    p_user_id,
    NOW(),
    p_is_online,
    p_session_id,
    p_user_agent,
    p_ip_address,
    NOW()
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    last_seen = NOW(),
    is_online = p_is_online,
    session_id = COALESCE(p_session_id, user_activity.session_id),
    user_agent = COALESCE(p_user_agent, user_activity.user_agent),
    ip_address = COALESCE(p_ip_address, user_activity.ip_address),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark users as offline (older than 2 minutes - real-time)
CREATE OR REPLACE FUNCTION mark_inactive_users_offline()
RETURNS void AS $$
BEGIN
  UPDATE public.user_activity
  SET is_online = false,
      updated_at = NOW()
  WHERE is_online = true
    AND last_seen < NOW() - INTERVAL '2 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get currently online users (real-time - within 2 minutes)
CREATE OR REPLACE FUNCTION get_online_users()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  role TEXT,
  last_seen TIMESTAMP WITH TIME ZONE,
  is_online BOOLEAN
) AS $$
BEGIN
  -- First, mark users inactive if last_seen > 2 minutes
  -- Use table alias to avoid ambiguity with RETURN TABLE column
  UPDATE public.user_activity ua
  SET is_online = false,
      updated_at = NOW()
  WHERE ua.is_online = true
    AND ua.last_seen < NOW() - INTERVAL '2 minutes';
  
  -- Then return active users
  RETURN QUERY
  SELECT 
    ua.user_id,
    u.email::TEXT,
    COALESCE(u.full_name, u.email)::TEXT as full_name,
    COALESCE(u.role, 'viewer')::TEXT as role,
    ua.last_seen,
    ua.is_online
  FROM public.user_activity ua
  LEFT JOIN public.users u ON ua.user_id = u.id
  WHERE ua.is_online = true
    AND ua.last_seen >= NOW() - INTERVAL '2 minutes'
  ORDER BY ua.last_seen DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get users who visited today
CREATE OR REPLACE FUNCTION get_today_users()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  role TEXT,
  last_seen TIMESTAMP WITH TIME ZONE,
  is_online BOOLEAN,
  visit_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ua.user_id,
    u.email::TEXT,
    COALESCE(u.full_name, u.email)::TEXT as full_name,
    COALESCE(u.role, 'viewer')::TEXT as role,
    MAX(ua.last_seen) as last_seen,
    BOOL_OR(ua.is_online) as is_online,
    COUNT(*)::BIGINT as visit_count
  FROM public.user_activity ua
  LEFT JOIN public.users u ON ua.user_id = u.id
  WHERE DATE(ua.last_seen) = CURRENT_DATE
  GROUP BY ua.user_id, u.email, u.full_name, u.role
  ORDER BY MAX(ua.last_seen) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_user_activity_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_activity_updated_at
  BEFORE UPDATE ON public.user_activity
  FOR EACH ROW
  EXECUTE FUNCTION update_user_activity_updated_at();

-- Comments
COMMENT ON TABLE public.user_activity IS 'Tracks user online activity and last seen timestamps';
COMMENT ON COLUMN public.user_activity.last_seen IS 'Last time the user was active';
COMMENT ON COLUMN public.user_activity.is_online IS 'Whether the user is currently online';
COMMENT ON COLUMN public.user_activity.session_id IS 'Unique session identifier';

