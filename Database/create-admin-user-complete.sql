-- ============================================================
-- Create Admin User in Database - إنشاء مستخدم Admin كامل
-- ============================================================
-- هذا السكريبت ينشئ المستخدم في جدول users مع صلاحيات admin

-- ⚠️ IMPORTANT: قبل تشغيل هذا السكريبت:
-- 1. تأكد من أنك قمت بتشغيل PRODUCTION_SCHEMA_COMPLETE.sql أولاً
-- 2. تأكد من أنك قمت بإنشاء المستخدم في Supabase Auth
-- 3. استبدل USER_ID بالـ ID الفعلي من Auth Users

-- ============================================================
-- Step 1: Get Auth User ID
-- ============================================================
-- اذهب إلى: Authentication → Users في Supabase Dashboard
-- انسخ User ID للمستخدم: mohamed.hagag@rabatpfc.com
-- استبدل 'YOUR_USER_ID_HERE' بالـ ID الفعلي

-- ============================================================
-- Step 2: Insert User in users table
-- ============================================================

-- احذف المستخدم القديم إن وجد (تنظيف)
DELETE FROM public.users 
WHERE email = 'mohamed.hagag@rabatpfc.com';

-- أنشئ المستخدم الجديد
-- ⚠️ استبدل 'YOUR_USER_ID_HERE' بالـ ID الفعلي من Authentication → Users
INSERT INTO public.users (
  id,
  email,
  full_name,
  role,
  division,
  is_active,
  custom_permissions_enabled,
  permissions,
  created_at,
  updated_at
)
VALUES (
  'YOUR_USER_ID_HERE',  -- ⚠️ استبدل هذا بالـ ID الفعلي!
  'mohamed.hagag@rabatpfc.com',
  'Mohamed Ahmed',
  'admin',
  'Technical Office',
  true,
  false,
  ARRAY[]::text[],
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  is_active = true,
  updated_at = NOW();

-- ============================================================
-- Step 3: Verify the user
-- ============================================================
SELECT 
  id,
  email,
  full_name,
  role,
  division,
  is_active,
  custom_permissions_enabled,
  created_at,
  updated_at
FROM public.users
WHERE email = 'mohamed.hagag@rabatpfc.com';

-- ============================================================
-- Expected Result:
-- - يجب أن ترى صف واحد
-- - role يجب أن يكون 'admin'
-- - is_active يجب أن يكون true
-- ============================================================

-- ============================================================
-- إذا نجح: سجل خروج ودخول في التطبيق
-- ============================================================

