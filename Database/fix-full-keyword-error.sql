-- 🔧 Fix "full" Keyword Error
-- إصلاح خطأ الكلمة المحجوزة "full"

-- Drop and recreate the function with correct variable names
DROP FUNCTION IF EXISTS get_user_full_name(UUID);

-- Function to get user full name (with fixed variable names)
CREATE OR REPLACE FUNCTION get_user_full_name(user_id UUID)
RETURNS TEXT AS $$
DECLARE
    first_n TEXT;
    last_n TEXT;
    full_n TEXT;
BEGIN
    SELECT first_name, last_name INTO first_n, last_n 
    FROM users 
    WHERE id = user_id;
    
    IF first_n IS NOT NULL AND last_n IS NOT NULL THEN
        full_n := first_n || ' ' || last_n;
    ELSIF first_n IS NOT NULL THEN
        full_n := first_n;
    ELSIF last_n IS NOT NULL THEN
        full_n := last_n;
    ELSE
        SELECT full_name INTO full_n FROM users WHERE id = user_id;
    END IF;
    
    RETURN COALESCE(full_n, 'Unknown User');
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_full_name TO authenticated;

-- Test the function
SELECT 'Function get_user_full_name fixed successfully!' as message;

-- You can test it with:
-- SELECT get_user_full_name('your-user-id-here');
