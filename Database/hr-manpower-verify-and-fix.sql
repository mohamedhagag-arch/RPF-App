-- ============================================================
-- HR Manpower - Verify and Fix Permissions
-- التحقق من وإصلاح صلاحيات HR Manpower
-- ============================================================
-- 
-- Run this if policies exist but you still get permission errors
-- شغّل هذا إذا كانت السياسات موجودة لكن لا تزال تواجه أخطاء الصلاحيات
--
-- ============================================================

-- Step 1: Verify table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'hr_manpower'
  ) THEN
    RAISE EXCEPTION 'Table hr_manpower does not exist. Please run hr-manpower-complete-setup.sql first.';
  ELSE
    RAISE NOTICE '✅ Table hr_manpower exists';
  END IF;
END $$;

-- Step 2: Verify RLS is enabled
DO $$
DECLARE
  rls_enabled BOOLEAN;
BEGIN
  SELECT rowsecurity INTO rls_enabled
  FROM pg_tables 
  WHERE schemaname = 'public' AND tablename = 'hr_manpower';
  
  IF NOT rls_enabled THEN
    RAISE NOTICE '⚠️ RLS is disabled, enabling now...';
    ALTER TABLE public.hr_manpower ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE '✅ RLS enabled';
  ELSE
    RAISE NOTICE '✅ RLS is enabled';
  END IF;
END $$;

-- Step 3: Grant schema usage (CRITICAL - often missing!)
DO $$
BEGIN
  GRANT USAGE ON SCHEMA public TO authenticated;
  RAISE NOTICE '✅ Schema usage granted';
END $$;

-- Step 4: Grant ALL table permissions (ensure they exist)
DO $$
BEGIN
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.hr_manpower TO authenticated;
  RAISE NOTICE '✅ Table permissions granted';
END $$;

-- Step 5: Verify policies exist
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE schemaname = 'public' AND tablename = 'hr_manpower';
  
  IF policy_count = 0 THEN
    RAISE NOTICE '⚠️ No policies found, creating default policy...';
    CREATE POLICY "hr_manpower_all_authenticated"
      ON public.hr_manpower
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
    RAISE NOTICE '✅ Default policy created';
  ELSE
    RAISE NOTICE '✅ Found % policies', policy_count;
  END IF;
END $$;

-- Step 6: Final verification
DO $$
DECLARE
  has_schema_usage BOOLEAN;
  has_table_perms BOOLEAN;
  has_policies BOOLEAN;
BEGIN
  -- Check schema usage
  SELECT EXISTS (
    SELECT 1 FROM information_schema.usage_privileges
    WHERE grantee = 'authenticated' 
    AND object_schema = 'public'
    AND object_type = 'SCHEMA'
  ) INTO has_schema_usage;
  
  -- Check table permissions
  SELECT EXISTS (
    SELECT 1 FROM information_schema.role_table_grants
    WHERE grantee = 'authenticated'
    AND table_schema = 'public'
    AND table_name = 'hr_manpower'
  ) INTO has_table_perms;
  
  -- Check policies
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'hr_manpower'
  ) INTO has_policies;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Verification Results:';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Schema Usage: %', CASE WHEN has_schema_usage THEN '✅ GRANTED' ELSE '❌ MISSING' END;
  RAISE NOTICE 'Table Permissions: %', CASE WHEN has_table_perms THEN '✅ GRANTED' ELSE '❌ MISSING' END;
  RAISE NOTICE 'RLS Policies: %', CASE WHEN has_policies THEN '✅ EXISTS' ELSE '❌ MISSING' END;
  RAISE NOTICE '========================================';
  
  IF has_schema_usage AND has_table_perms AND has_policies THEN
    RAISE NOTICE '✅ All permissions are correctly configured!';
    RAISE NOTICE 'Try accessing the HR Manpower page now.';
  ELSE
    RAISE WARNING '⚠️ Some permissions are missing. Please check the output above.';
  END IF;
END $$;

