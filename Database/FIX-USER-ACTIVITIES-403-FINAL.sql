-- ============================================================
-- Fix user_activities 403 Forbidden Error - FINAL FIX
-- إصلاح خطأ 403 Forbidden لجدول user_activities - الحل النهائي
-- ============================================================
-- 
-- هذا الـ script يصلح مشكلة 403 عند محاولة قراءة الأنشطة
-- ويسمح لجميع المستخدمين المسجلين بقراءة الأنشطة النشطة لأي مستخدم
-- (لأغراض عرض المستخدمين النشطين)
--
-- ============================================================

-- Step 1: Drop ALL existing policies
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT schemaname, tablename, policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'user_activities'
  ) LOOP
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
      RAISE NOTICE 'Dropped policy: % on %.%', r.policyname, r.schemaname, r.tablename;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error dropping policy %: %', r.policyname, SQLERRM;
    END;
  END LOOP;
END $$;

-- Step 2: Ensure RLS is enabled
ALTER TABLE IF EXISTS public.user_activities ENABLE ROW LEVEL SECURITY;

-- Step 3: Create permissive policies

-- Policy 1: All authenticated users can view active activities (for online users indicator)
-- This allows filtering by user_email, is_active, and created_at together
-- This is needed for the ActiveUsersIndicator component to show who is online
CREATE POLICY "All users can view active activities"
  ON public.user_activities
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND created_at >= NOW() - INTERVAL '10 minutes'
    -- This policy allows viewing ANY user's active activities
    -- as long as they are active and recent (within 10 minutes)
    -- This is safe because it only shows current activity, not historical data
  );

-- Policy 2: Users can view their own activities (all activities, not just active)
CREATE POLICY "Users can view own activities"
  ON public.user_activities
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Policy 3: Admins can view all activities (unrestricted)
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

-- Policy 4: Anyone authenticated can insert activities
CREATE POLICY "Authenticated users can log activities"
  ON public.user_activities
  FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

-- Step 4: Grant explicit permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT ON public.user_activities TO authenticated;

-- Step 5: Also grant to anon role (if needed for public access)
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.user_activities TO anon;

-- Step 6: Verify policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  roles,
  qual
FROM pg_policies
WHERE tablename = 'user_activities'
ORDER BY policyname;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ user_activities permissions fixed successfully!';
  RAISE NOTICE 'All authenticated users can now:';
  RAISE NOTICE '  - View active activities of ANY user (last 10 minutes) - for online users indicator';
  RAISE NOTICE '  - View their own activities (all time)';
  RAISE NOTICE '  - Insert new activities';
  RAISE NOTICE 'Admins can view all activities (unrestricted)';
END $$;

