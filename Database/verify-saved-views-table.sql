-- ============================================================
-- ✅ Verify Saved Views Table - التحقق من جدول Saved Views
-- ============================================================
-- Run this script to verify the saved_views table exists and is configured correctly
-- ============================================================

-- 1. Check if table exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'saved_views'
        ) 
        THEN '✅ Table exists'
        ELSE '❌ Table does NOT exist'
    END as table_status;

-- 2. Check table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'saved_views'
ORDER BY ordinal_position;

-- 3. Check RLS status
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename = 'saved_views'
        ) 
        THEN (
            SELECT relrowsecurity 
            FROM pg_class 
            WHERE relname = 'saved_views'
        )
        ELSE NULL
    END as rls_enabled;

-- 4. Check RLS policies
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'saved_views';

-- 5. Check indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
AND tablename = 'saved_views';

-- 6. Test insert (will only work if RLS allows)
-- This will show if there are any permission issues
DO $$
DECLARE
    test_user_id UUID;
    test_result TEXT;
BEGIN
    -- Get current user ID
    SELECT auth.uid() INTO test_user_id;
    
    IF test_user_id IS NULL THEN
        RAISE NOTICE '⚠️ No authenticated user found. RLS policies may block access.';
    ELSE
        RAISE NOTICE '✅ Authenticated user ID: %', test_user_id;
        
        -- Try to insert a test record (will be rolled back)
        BEGIN
            INSERT INTO public.saved_views (
                user_id,
                table_name,
                view_name,
                columns,
                is_default
            ) VALUES (
                test_user_id,
                'test_table',
                'test_view',
                '[]'::jsonb,
                false
            );
            
            RAISE NOTICE '✅ Test insert successful - RLS policies are working correctly';
            
            -- Rollback the test insert
            ROLLBACK;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '❌ Test insert failed: %', SQLERRM;
            RAISE NOTICE 'This indicates an RLS policy or permission issue.';
        END;
    END IF;
END $$;

-- 7. Count existing views (if any)
SELECT 
    COUNT(*) as total_views,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT table_name) as unique_tables
FROM public.saved_views;

















