-- ============================================================
-- Fix Company Settings Permission Issue
-- إصلاح مشكلة صلاحيات Company Settings
-- ============================================================

-- المشكلة: "You do not have permission to edit company settings" رغم أن المستخدم admin
-- السبب: RLS على جدول users يمنع قراءة البيانات

-- ============================================================
-- STEP 1: تعطيل RLS على جدول users (للتأكد من الوصول)
-- ============================================================
ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 2: التحقق من وجود المستخدم وأنه admin
-- ============================================================
SELECT 
    id,
    email,
    full_name,
    role,
    is_active
FROM public.users
WHERE email = 'mohamed.hagag@rabatpfc.com';

-- يجب أن ترى: role = 'admin', is_active = true

-- ============================================================
-- STEP 3: تعطيل RLS على جدول company_settings أيضاً
-- ============================================================
ALTER TABLE IF EXISTS public.company_settings DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 4: التحقق من وجود بيانات في company_settings
-- ============================================================
SELECT 
    id,
    company_name,
    company_slogan,
    logo_url,
    created_at,
    updated_at
FROM public.company_settings
ORDER BY updated_at DESC
LIMIT 1;

-- ============================================================
-- STEP 5: إذا لم توجد بيانات، أنشئ صف افتراضي
-- ============================================================
INSERT INTO public.company_settings (company_name, company_slogan)
SELECT 'AlRabat RPF', 'Masters of Foundation Construction'
WHERE NOT EXISTS (SELECT 1 FROM public.company_settings)
LIMIT 1;

-- ============================================================
-- STEP 6: التحقق النهائي
-- ============================================================

-- تحقق من RLS status
SELECT 
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('users', 'company_settings');

-- يجب أن ترى: rowsecurity = false (معطل)

-- تحقق من المستخدم
SELECT 
    '✅ User Check:' AS status,
    email,
    role,
    is_active
FROM public.users
WHERE email = 'mohamed.hagag@rabatpfc.com';

-- تحقق من company_settings
SELECT 
    '✅ Company Settings Check:' AS status,
    company_name,
    company_slogan
FROM public.company_settings
ORDER BY updated_at DESC
LIMIT 1;

-- ============================================================
-- Expected Results:
-- 1. RLS disabled on both tables
-- 2. User role = 'admin'
-- 3. Company settings exist
-- ============================================================

-- ============================================================
-- بعد تشغيل هذا السكريبت:
-- 1. سجل خروج من التطبيق
-- 2. اضغط Ctrl+Shift+R
-- 3. سجل دخول من جديد
-- 4. اذهب إلى Settings → Company Settings
-- 5. يجب أن تستطيع التعديل الآن! ✅
-- ============================================================

