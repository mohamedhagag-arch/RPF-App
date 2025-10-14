-- ============================================================
-- Fix Existing Users Custom Permissions Flag
-- إصلاح علامة الصلاحيات المخصصة للمستخدمين الحاليين
-- ============================================================

-- المشكلة: بعض المستخدمين لديهم permissions لكن custom_permissions_enabled = false
-- الحل: تفعيل custom_permissions_enabled لأي مستخدم لديه permissions

-- ============================================================
-- STEP 1: التحقق من المشكلة
-- ============================================================

-- عرض المستخدمين الذين لديهم permissions لكن custom_permissions_enabled = false
SELECT 
    '⚠️ Users with permissions but custom mode OFF:' AS status,
    email,
    role,
    array_length(permissions, 1) AS permissions_count,
    custom_permissions_enabled
FROM public.users
WHERE permissions IS NOT NULL 
    AND array_length(permissions, 1) > 0
    AND custom_permissions_enabled = false;

-- ============================================================
-- STEP 2: الإصلاح التلقائي
-- ============================================================

-- تفعيل custom_permissions_enabled لأي مستخدم لديه permissions
UPDATE public.users
SET 
    custom_permissions_enabled = true,
    updated_at = NOW()
WHERE permissions IS NOT NULL 
    AND array_length(permissions, 1) > 0
    AND custom_permissions_enabled = false;

-- ============================================================
-- STEP 3: التحقق من النتيجة
-- ============================================================

-- عرض المستخدمين مع الصلاحيات المخصصة
SELECT 
    '✅ Users with Custom Permissions:' AS status,
    email,
    role,
    array_length(permissions, 1) AS permissions_count,
    custom_permissions_enabled
FROM public.users
WHERE custom_permissions_enabled = true
ORDER BY email;

-- ============================================================
-- STEP 4: عرض جميع المستخدمين
-- ============================================================

SELECT 
    '📊 All Users Summary:' AS status,
    email,
    role,
    CASE 
        WHEN custom_permissions_enabled THEN 'CUSTOM'
        ELSE 'ROLE DEFAULT'
    END AS permissions_mode,
    COALESCE(array_length(permissions, 1), 0) AS permissions_count,
    is_active
FROM public.users
ORDER BY email;

-- ============================================================
-- Expected Result:
-- 1. جميع المستخدمين الذين لديهم permissions → custom_permissions_enabled = true
-- 2. المستخدمون بدون permissions → custom_permissions_enabled = false
-- ============================================================

-- ============================================================
-- بعد تشغيل هذا السكريبت:
-- 1. سجل خروج من التطبيق
-- 2. سجل دخول بأي مستخدم له صلاحيات مخصصة
-- 3. يجب أن تطبق الصلاحيات المخصصة الآن! ✅
-- ============================================================

