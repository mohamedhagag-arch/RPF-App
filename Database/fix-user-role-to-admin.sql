-- ============================================================
-- Fix User Role - Update to Admin
-- تصحيح دور المستخدم - تحديثه إلى Admin
-- ============================================================

-- Update the user role to admin
UPDATE public.users
SET 
  role = 'admin',
  is_active = true,
  custom_permissions_enabled = false,
  updated_at = NOW()
WHERE email = 'mohamed.hagag@rabatpfc.com';

-- Verify the update
SELECT 
  id,
  email,
  full_name,
  role,
  is_active,
  created_at,
  updated_at
FROM public.users
WHERE email = 'mohamed.hagag@rabatpfc.com';

-- ============================================================
-- Expected Result:
-- role should now be 'admin'
-- ============================================================

