# 🚨 **حل مشكلة Company Settings Error**

## **الخطأ:**
```
Error saving settings: Could not find the function public.update_company_settings(p_company_logo_url, p_company_name, p_company_slogan) in the schema cache
```

## **السبب:**
الـ function `update_company_settings` غير موجودة في قاعدة البيانات الجديدة.

---

## **✅ الحل السريع - 2 دقيقة:**

### **الخطوة 1: افتح Supabase Dashboard**
```
1. اذهب إلى: https://supabase.com/dashboard
2. اختر المشروع: qhnoyvdltetyfctphzys
3. SQL Editor → New Query
```

### **الخطوة 2: انسخ والصق هذا الكود:**

```sql
-- إنشاء دالة تحديث إعدادات الشركة
CREATE OR REPLACE FUNCTION public.update_company_settings(
    p_company_name TEXT,
    p_company_slogan TEXT,
    p_company_logo_url TEXT DEFAULT NULL
)
RETURNS BOOLEAN 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    user_role TEXT;
    settings_count INTEGER;
BEGIN
    -- التحقق من صلاحيات المستخدم
    SELECT role INTO user_role
    FROM public.users
    WHERE id = auth.uid();
    
    IF user_role IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    IF user_role != 'admin' THEN
        RAISE EXCEPTION 'Only admins can update company settings';
    END IF;
    
    -- تحديث الإعدادات
    UPDATE public.company_settings 
    SET 
        company_name = p_company_name,
        company_slogan = p_company_slogan,
        company_logo_url = p_company_logo_url,
        updated_by = auth.uid(),
        updated_at = NOW()
    WHERE id = (
        SELECT id FROM public.company_settings 
        ORDER BY updated_at DESC 
        LIMIT 1
    );
    
    GET DIAGNOSTICS settings_count = ROW_COUNT;
    
    -- إذا لم توجد إعدادات، إنشاء جديدة
    IF settings_count = 0 THEN
        INSERT INTO public.company_settings (
            company_name, 
            company_slogan, 
            company_logo_url,
            created_by,
            updated_by
        ) VALUES (
            p_company_name,
            p_company_slogan,
            p_company_logo_url,
            auth.uid(),
            auth.uid()
        );
    END IF;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error updating company settings: %', SQLERRM;
END;
$$;

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION public.update_company_settings(TEXT, TEXT, TEXT) TO authenticated;

-- إنشاء دالة للحصول على الإعدادات
CREATE OR REPLACE FUNCTION public.get_company_settings()
RETURNS TABLE (
    company_name TEXT,
    company_slogan TEXT,
    company_logo_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cs.company_name,
        cs.company_slogan,
        cs.company_logo_url,
        cs.updated_at
    FROM public.company_settings cs
    ORDER BY cs.updated_at DESC
    LIMIT 1;
END;
$$;

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION public.get_company_settings() TO authenticated;

-- التحقق من أن الدوال تم إنشاؤها
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name IN ('get_company_settings', 'update_company_settings')
ORDER BY routine_name;
```

### **الخطوة 3: تشغيل الكود**
```
1. اضغط "Run" أو F5
2. يجب أن ترى في النتيجة:
   - get_company_settings | FUNCTION
   - update_company_settings | FUNCTION
```

### **الخطوة 4: جرب التحديث مرة أخرى**
```
1. في التطبيق، اذهب إلى: Settings → Company Settings
2. قم بتحديث البيانات
3. احفظ
4. يجب أن يعمل الآن! ✅
```

---

## **🔍 للتحقق من جميع الدوال الناقصة:**

شغل هذا الكود في SQL Editor:

```sql
-- التحقق من جميع الدوال الموجودة
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;
```

---

## **📋 دوال إضافية قد تحتاجها (اختياري):**

إذا أردت إضافة جميع الدوال المساعدة:

```
افتح وشغل: Database/MISSING_FUNCTIONS_AND_OBJECTS.sql
```

هذا الملف يحتوي على:
- ✅ `update_company_settings()` - تحديث إعدادات الشركة
- ✅ `get_company_settings()` - الحصول على إعدادات الشركة
- ✅ `calculate_workdays()` - حساب أيام العمل
- ✅ `check_user_permission()` - التحقق من الصلاحيات
- ✅ `log_audit_event()` - تسجيل التغييرات

---

## **🎯 الخطوات بالترتيب:**

| الخطوة | الإجراء | المكان |
|-------|---------|--------|
| 1 | افتح Supabase Dashboard | https://supabase.com/dashboard |
| 2 | SQL Editor → New Query | qhnoyvdltetyfctphzys |
| 3 | انسخ والصق الكود من أعلاه | - |
| 4 | Run (F5) | - |
| 5 | تحقق من النتيجة | يجب أن ترى الدالتين |
| 6 | جرب Company Settings مرة أخرى | http://localhost:3000/settings |

---

## **✅ Checklist:**

- [ ] فتحت Supabase Dashboard
- [ ] دخلت SQL Editor
- [ ] نسخت ولصقت الكود
- [ ] شغلت الكود (Run/F5)
- [ ] رأيت الدالتين في النتيجة
- [ ] جربت تحديث Company Settings
- [ ] الآن يعمل! ✅

---

## **⚠️ إذا ظهرت أخطاء أخرى:**

احفظ الخطأ وأرسله لي، وسأصلحه فوراً!

الأخطاء الشائعة:
- ❌ `table company_settings does not exist` → شغل `PRODUCTION_SCHEMA_COMPLETE.sql` أولاً
- ❌ `permission denied` → تأكد أنك مسجل دخول كـ admin
- ❌ `user not found` → تأكد أن جدول users به بياناتك

---

**أخبرني بعد تنفيذ الخطوات! 🚀**

