-- 🔄 User Signup Trigger
-- يقوم بنسخ البيانات من user_metadata إلى جدول users تلقائياً عند إنشاء حساب جديد

-- ============================================
-- PART 1: Create Function to Handle New User
-- ============================================

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

-- ============================================
-- PART 2: Create Trigger
-- ============================================

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger that fires when a new user is created in auth.users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- ============================================
-- PART 3: Grant Permissions
-- ============================================

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION handle_new_user() TO authenticated;

-- ============================================
-- PART 4: Update Function for Profile Updates
-- ============================================

-- Function to sync auth.users metadata with public.users
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

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

-- Create trigger for updates
CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE OF raw_user_meta_data ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION sync_user_metadata();

-- Grant permissions
GRANT EXECUTE ON FUNCTION sync_user_metadata() TO service_role;
GRANT EXECUTE ON FUNCTION sync_user_metadata() TO authenticated;

-- ============================================
-- PART 5: Verification
-- ============================================

-- Test the trigger by showing existing users
DO $$
DECLARE
    user_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM public.users;
    RAISE NOTICE '✅ Trigger created successfully!';
    RAISE NOTICE '📊 Current users in public.users table: %', user_count;
    RAISE NOTICE '🔄 New signups will automatically create user records with profile data';
END $$;
