-- ============================================================
-- Add profile_picture_url to get_online_users function
-- إضافة profile_picture_url إلى دالة get_online_users
-- ============================================================

-- Drop existing function first (to change return type)
DROP FUNCTION IF EXISTS get_online_users();

-- Create updated function with profile_picture_url
CREATE OR REPLACE FUNCTION get_online_users()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  role TEXT,
  last_seen TIMESTAMP WITH TIME ZONE,
  is_online BOOLEAN,
  profile_picture_url TEXT
) AS $$
BEGIN
  -- First, mark users inactive if last_seen > 2 minutes
  -- Use table alias to avoid ambiguity with RETURN TABLE column
  UPDATE public.user_activity ua
  SET is_online = false,
      updated_at = NOW()
  WHERE ua.is_online = true
    AND ua.last_seen < NOW() - INTERVAL '2 minutes';
  
  -- Then return active users with profile picture
  RETURN QUERY
  SELECT 
    ua.user_id,
    u.email::TEXT,
    COALESCE(u.full_name, u.email)::TEXT as full_name,
    COALESCE(u.role, 'viewer')::TEXT as role,
    ua.last_seen,
    ua.is_online,
    u.profile_picture_url::TEXT
  FROM public.user_activity ua
  LEFT JOIN public.users u ON ua.user_id = u.id
  WHERE ua.is_online = true
    AND ua.last_seen >= NOW() - INTERVAL '2 minutes'
  ORDER BY ua.last_seen DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- ✅ Done! Function updated successfully
-- ============================================================

