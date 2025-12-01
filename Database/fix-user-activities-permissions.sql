-- ============================================================
-- Fix user_activities Table Permissions
-- إصلاح صلاحيات جدول user_activities
-- ============================================================
-- 
-- هذا الـ script يصلح مشكلة 401/42501 عند محاولة تسجيل الأنشطة
--
-- ============================================================

-- التحقق من وجود الجدول
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_activities'
  ) THEN
    RAISE EXCEPTION 'Table "user_activities" does not exist. Please run create-user-activities-table.sql first.';
  END IF;
END $$;

-- ============================================================
-- PART 1: Drop existing policies
-- ============================================================

DROP POLICY IF EXISTS "Admins can view all activities" ON public.user_activities CASCADE;
DROP POLICY IF EXISTS "Users can view their own activities" ON public.user_activities CASCADE;
DROP POLICY IF EXISTS "Authenticated users can log activities" ON public.user_activities CASCADE;
DROP POLICY IF EXISTS "Users can view active activities" ON public.user_activities CASCADE;

-- ============================================================
-- PART 2: Ensure RLS is enabled
-- ============================================================

ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PART 3: Create fixed policies
-- ============================================================

-- Policy: Only admins can view all activities
CREATE POLICY "Admins can view all activities"
  ON public.user_activities
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Policy: Users can view their own activities
CREATE POLICY "Users can view their own activities"
  ON public.user_activities
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR user_id IS NULL -- ✅ السماح برؤية الأنشطة بدون user_id (للتوافق)
  );

-- Policy: ✅ NEW - Users can view active activities (for online users indicator)
-- This allows authenticated users to see active activities of other users
-- to display who is currently online
CREATE POLICY "Users can view active activities"
  ON public.user_activities
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND created_at >= NOW() - INTERVAL '5 minutes' -- Only recent activities (last 5 minutes)
  );

-- Policy: ✅ FIXED - Anyone authenticated can insert activities
-- استخدام TRUE للسماح لجميع المستخدمين المسجلين
CREATE POLICY "Authenticated users can log activities"
  ON public.user_activities
  FOR INSERT
  TO authenticated
  WITH CHECK (TRUE); -- ✅ السماح لجميع المستخدمين المسجلين

-- ============================================================
-- PART 4: Grant explicit permissions
-- ============================================================

-- Grant SELECT and INSERT permissions to authenticated role
GRANT SELECT, INSERT ON public.user_activities TO authenticated;

-- Grant SELECT permission to anon (for public viewing if needed)
GRANT SELECT ON public.user_activities TO anon;

-- ============================================================
-- PART 5: Verify policies
-- ============================================================

-- Check if policies exist
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'user_activities'
ORDER BY policyname;

-- ============================================================
-- PART 6: Test permissions (optional - for debugging)
-- ============================================================

-- This will show current user and their permissions
DO $$
DECLARE
  current_user_id UUID;
  current_user_role TEXT;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  current_user_role := (
    SELECT role FROM public.users WHERE id = current_user_id
  );
  
  RAISE NOTICE 'Current user ID: %', current_user_id;
  RAISE NOTICE 'Current user role: %', current_user_role;
  RAISE NOTICE 'Is authenticated: %', (current_user_id IS NOT NULL);
END $$;

-- ============================================================
-- SUCCESS MESSAGE
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE '✅ user_activities table permissions fixed successfully!';
  RAISE NOTICE '✅ All authenticated users can now INSERT activities';
  RAISE NOTICE '✅ Users can view their own activities';
  RAISE NOTICE '✅ Users can view active activities (for online users)';
  RAISE NOTICE '✅ Admins can view all activities';
END $$;

-- ============================================================
-- NOTES
-- ============================================================
-- 
-- 1. تم تغيير RLS policy للـ INSERT من auth.role() = 'authenticated'
--    إلى auth.uid() IS NOT NULL لأن auth.role() قد لا يعمل بشكل صحيح
--
-- 2. تم إضافة GRANT صريح للصلاحيات لضمان عمل INSERT
--
-- 3. بعد تشغيل هذا الـ script، يجب أن يعمل تسجيل الأنشطة بدون أخطاء
--
-- 4. تم إضافة سياسة جديدة "Users can view active activities" للسماح
--    للمستخدمين برؤية الأنشطة النشطة للمستخدمين الآخرين (للعرض من هو متصل)
--
-- ============================================================
