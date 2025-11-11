-- ============================================================
-- TEMPORARY FIX: Disable RLS on units table
-- ============================================================
-- ⚠️ WARNING: This disables Row Level Security completely
-- Use this ONLY for testing/debugging
-- 
-- After confirming the table works, re-enable RLS and create proper policies
-- ============================================================

-- Step 1: Disable RLS temporarily
ALTER TABLE public.units DISABLE ROW LEVEL SECURITY;

-- Step 2: Verify RLS is disabled
DO $$
DECLARE
  rls_enabled BOOLEAN;
BEGIN
  SELECT relrowsecurity INTO rls_enabled
  FROM pg_class
  WHERE relname = 'units' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
  
  IF rls_enabled THEN
    RAISE WARNING '⚠️ RLS is still enabled!';
  ELSE
    RAISE NOTICE '✅ RLS has been disabled on units table';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ IMPORTANT: This is a temporary fix for testing only!';
    RAISE NOTICE 'After confirming the table works, you should:';
    RAISE NOTICE '1. Re-enable RLS: ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;';
    RAISE NOTICE '2. Create proper policies using "Database/fix-units-rls-ultimate.sql"';
  END IF;
END $$;

