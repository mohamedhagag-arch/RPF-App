-- 🔍 Check and Fix User Signup Trigger
-- للتحقق من وجود Trigger وإصلاح أي مشاكل

-- ============================================
-- PART 1: Check if triggers exist
-- ============================================

-- Check existing triggers
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_name IN ('on_auth_user_created', 'on_auth_user_updated');

-- Check if functions exist
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines
WHERE routine_name IN ('handle_new_user', 'sync_user_metadata');

-- ============================================
-- PART 2: Check current user data
-- ============================================

-- Check auth.users data
SELECT 
    id,
    email,
    raw_user_meta_data->>'first_name' as first_name,
    raw_user_meta_data->>'last_name' as last_name,
    raw_user_meta_data->>'phone' as phone,
    raw_user_meta_data->>'role' as role,
    created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- Check public.users data
SELECT 
    id,
    email,
    first_name,
    last_name,
    full_name,
    phone_1,
    department_id,
    job_title_id,
    role,
    created_at
FROM public.users
ORDER BY created_at DESC
LIMIT 5;

-- ============================================
-- PART 3: Manual sync for existing users
-- ============================================

-- Sync existing auth.users to public.users (if trigger doesn't exist)
INSERT INTO public.users (
    id,
    email,
    first_name,
    last_name,
    full_name,
    phone_1,
    role,
    created_at,
    updated_at
)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'first_name', ''),
    COALESCE(au.raw_user_meta_data->>'last_name', ''),
    COALESCE(
        au.raw_user_meta_data->>'full_name',
        TRIM(COALESCE(au.raw_user_meta_data->>'first_name', '') || ' ' || COALESCE(au.raw_user_meta_data->>'last_name', ''))
    ),
    COALESCE(au.raw_user_meta_data->>'phone', au.raw_user_meta_data->>'phone_1'),
    COALESCE(au.raw_user_meta_data->>'role', 'viewer'),
    au.created_at,
    NOW()
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL  -- Only insert if user doesn't exist in public.users
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(EXCLUDED.first_name, public.users.first_name),
    last_name = COALESCE(EXCLUDED.last_name, public.users.last_name),
    full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
    phone_1 = COALESCE(EXCLUDED.phone_1, public.users.phone_1),
    updated_at = NOW();

-- ============================================
-- PART 4: Create/Recreate triggers if needed
-- ============================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS sync_user_metadata();

-- Create the handle_new_user function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert new user into public.users table with data from auth.users metadata
    INSERT INTO public.users (
        id,
        email,
        first_name,
        last_name,
        full_name,
        phone_1,
        role,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            TRIM(COALESCE(NEW.raw_user_meta_data->>'first_name', '') || ' ' || COALESCE(NEW.raw_user_meta_data->>'last_name', ''))
        ),
        COALESCE(NEW.raw_user_meta_data->>'phone', NEW.raw_user_meta_data->>'phone_1'),
        COALESCE(NEW.raw_user_meta_data->>'role', 'viewer'),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        first_name = COALESCE(EXCLUDED.first_name, public.users.first_name),
        last_name = COALESCE(EXCLUDED.last_name, public.users.last_name),
        full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
        phone_1 = COALESCE(EXCLUDED.phone_1, public.users.phone_1),
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the sync_user_metadata function
CREATE OR REPLACE FUNCTION sync_user_metadata()
RETURNS TRIGGER AS $$
BEGIN
    -- Update public.users when auth.users metadata changes
    UPDATE public.users SET
        first_name = COALESCE(NEW.raw_user_meta_data->>'first_name', first_name),
        last_name = COALESCE(NEW.raw_user_meta_data->>'last_name', last_name),
        full_name = COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            TRIM(COALESCE(NEW.raw_user_meta_data->>'first_name', first_name) || ' ' || COALESCE(NEW.raw_user_meta_data->>'last_name', last_name))
        ),
        phone_1 = COALESCE(NEW.raw_user_meta_data->>'phone', NEW.raw_user_meta_data->>'phone_1', phone_1),
        updated_at = NOW()
    WHERE id = NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE OF raw_user_meta_data ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION sync_user_metadata();

-- Grant permissions
GRANT EXECUTE ON FUNCTION handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION sync_user_metadata() TO service_role;
GRANT EXECUTE ON FUNCTION sync_user_metadata() TO authenticated;

-- ============================================
-- PART 5: Verification
-- ============================================

-- Verify triggers were created
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_name IN ('on_auth_user_created', 'on_auth_user_updated');

-- Final check of user data
SELECT 
    'Auth Users' as source,
    COUNT(*) as count
FROM auth.users
UNION ALL
SELECT 
    'Public Users' as source,
    COUNT(*) as count
FROM public.users;

-- Show sample data
SELECT 
    'Sample Auth Data' as info,
    au.email,
    au.raw_user_meta_data->>'first_name' as first_name,
    au.raw_user_meta_data->>'last_name' as last_name
FROM auth.users au
ORDER BY au.created_at DESC
LIMIT 3
UNION ALL
SELECT 
    'Sample Public Data' as info,
    pu.email,
    pu.first_name,
    pu.last_name
FROM public.users pu
ORDER BY pu.created_at DESC
LIMIT 3;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Trigger check and fix completed successfully!';
    RAISE NOTICE '🔄 New signups will now automatically sync to public.users';
    RAISE NOTICE '📊 Existing users have been synced';
END $$;
