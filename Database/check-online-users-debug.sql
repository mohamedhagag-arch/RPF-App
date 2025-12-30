-- ============================================================
-- Debug: Check online users and user_activity table
-- للتحقق من المستخدمين النشطين وبيانات الجدول
-- ============================================================

-- 1. Check if table exists and has data
SELECT 
  'Table Status' as check_type,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE is_online = true) as online_count,
  COUNT(*) FILTER (WHERE is_online = false) as offline_count,
  MAX(last_seen) as most_recent_activity
FROM public.user_activity;

-- 2. Check recent activity (last 5 minutes)
SELECT 
  'Recent Activity (Last 5 min)' as check_type,
  ua.user_id,
  u.email,
  u.full_name,
  ua.is_online,
  ua.last_seen,
  NOW() - ua.last_seen as time_ago
FROM public.user_activity ua
LEFT JOIN public.users u ON ua.user_id = u.id
WHERE ua.last_seen >= NOW() - INTERVAL '5 minutes'
ORDER BY ua.last_seen DESC;

-- 3. Test the get_online_users function
SELECT 
  'Function Test' as check_type,
  *
FROM get_online_users();

-- 4. Check if users exist in users table
SELECT 
  'Users Table' as check_type,
  COUNT(*) as total_users
FROM public.users;

-- 5. Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'user_activity';

-- ============================================================
-- Expected Results:
-- 1. Should show records in user_activity table
-- 2. Should show recent activity if users are online
-- 3. Should return online users from function
-- 4. Should show users exist
-- 5. Should show 3 policies for user_activity
-- ============================================================

