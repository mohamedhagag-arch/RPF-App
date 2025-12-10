# 🔐 إعداد Google OAuth مع Supabase

## ❌ المشكلة: redirect_uri_mismatch

عند محاولة تسجيل الدخول عبر Google، يظهر خطأ `Error 400: redirect_uri_mismatch`.

## ✅ الحل: إضافة Redirect URIs الصحيحة

### الخطوة 1: الحصول على Supabase Project URL

1. افتح [Supabase Dashboard](https://app.supabase.com)
2. اختر مشروعك
3. اذهب إلى **Project Settings** → **API**
4. انسخ **Project URL** (مثال: `https://qhnoyvdltetyfctphzys.supabase.co`)

### الخطوة 2: إضافة Redirect URIs في Google Cloud Console

1. اذهب إلى [Google Cloud Console](https://console.cloud.google.com)
2. اختر مشروعك
3. اذهب إلى **APIs & Services** → **Credentials**
4. افتح **OAuth 2.0 Client ID** المستخدم مع Supabase (ليس Google Drive)
5. في **Authorized redirect URIs**، اضغط **+ ADD URI**
6. أضف هذه الـ URIs:

#### للتطوير المحلي (Local Development):
```
http://localhost:3000/auth/callback
```

#### لـ Supabase OAuth (مهم جداً):
```
https://qhnoyvdltetyfctphzys.supabase.co/auth/v1/callback
```

**ملاحظة:** استبدل `qhnoyvdltetyfctphzys` بـ project reference الخاص بك من Supabase.

#### للإنتاج (Production - اختياري):
```
https://your-domain.com/auth/callback
```

7. اضغط **SAVE**

### الخطوة 3: إضافة Redirect URLs في Supabase Dashboard

**مهم:** Callback URL في Supabase (`https://qhnoyvdltetyfctphzys.supabase.co/auth/v1/callback`) هو للتدفق الداخلي ولا يمكن تغييره. لكن يمكنك إضافة Redirect URLs إضافية لتوجيه المستخدم بعد المعالجة.

1. في Supabase Dashboard، اذهب إلى **Authentication** → **URL Configuration**
2. في قسم **Redirect URLs**، اضغط **+ Add URL**
3. أضف هذه الـ URLs:
   ```
   http://localhost:3000/auth/callback
   https://your-domain.com/auth/callback
   ```
4. اضغط **Save**

**ملاحظة:** 
- Callback URL (`https://qhnoyvdltetyfctphzys.supabase.co/auth/v1/callback`) يظهر في إعدادات Google Provider لكنه للتدفق الداخلي فقط
- Redirect URLs التي تضيفها هنا هي التي سيتم توجيه المستخدم إليها بعد نجاح OAuth

### الخطوة 4: تغيير اسم الموقع في شاشة موافقة Google

**المشكلة:** يظهر اسم Supabase (`qhnoyvdltetyfctphzys.supabase.co`) في شاشة موافقة Google بدلاً من اسم موقعك.

**الحل:** يجب إعداد Branding في Google Auth Platform:

1. اذهب إلى [Google Cloud Console](https://console.cloud.google.com)
2. اختر مشروعك **RPF App**
3. من القائمة الجانبية اليسرى، اذهب إلى **Google Auth Platform** → **Branding**
   - (إذا لم ترَ "Google Auth Platform"، اذهب إلى **APIs & Services** → **OAuth consent screen**)
4. في صفحة **Branding**، املأ المعلومات:
   - **App name**: `AlRabat RPF` (أو اسم موقعك المفضل)
   - **App logo**: (اختياري) اضغط **Upload** لرفع شعار الموقع
   - **Support email**: بريدك الإلكتروني (مثل: `mohamed.hagag@rabatpfc.com`)
   - **Application home page**: `https://your-domain.com` (رابط موقعك الفعلي)
   - **Application privacy policy link**: (اختياري) رابط سياسة الخصوصية
   - **Application terms of service link**: (اختياري) رابط شروط الخدمة
   - **Authorized domains**: 
     - **مهم جداً:** لا تحذف `qhnoyvdltetyfctphzys.supabase.co` لأنه مطلوب لـ Supabase OAuth callback
     - اضغط **+ Add domain** وأضف نطاق موقعك (مثل: `rabat-rpf.vercel.app`)
     - يجب أن يكون لديك نطاقين:
       1. `qhnoyvdltetyfctphzys.supabase.co` (لا تحذفه - مطلوب)
       2. `rabat-rpf.vercel.app` (أو نطاق موقعك)
5. اضغط **SAVE** في الأسفل

6. بعد حفظ Branding، اذهب إلى **Audience**:
   - اختر **External** (للتطبيقات الخارجية)
   - اضغط **SAVE**

7. في **Scopes**، تأكد من وجود:
   - `email`
   - `profile`  
   - `openid`
   - إذا لم تكن موجودة، اضغط **ADD OR REMOVE SCOPES** وأضفها

8. في **Test users** (إذا كان في وضع Testing):
   - اضغط **+ ADD USERS**
   - أضف الإيميلات المسموح بها (مثل: `mohamed.hagag@rabatpfc.com`)
   - اضغط **ADD**
   - اضغط **SAVE**

**ملاحظة مهمة جداً:** 
- إذا كان OAuth consent screen في وضع "Testing"، سيظهر فقط للمستخدمين المضافة في Test users
- لنشر التطبيق للجميع، يجب إرسال طلب للتحقق من Google (للتطبيقات العامة)
- **بعد التعديل، قد يستغرق 5-10 دقائق حتى تظهر التغييرات في شاشة الموافقة**
- **Application home page** هو الذي سيظهر في شاشة الموافقة النهائية بدلاً من Supabase URL

**⚠️ ملاحظة حول ظهور Supabase URL:**
- **في شاشة اختيار الحساب:** Google قد يعرض `qhnoyvdltetyfctphzys.supabase.co` لأن هذا هو النطاق الذي يتم إعادة التوجيه إليه أولاً (Supabase callback)
- **في شاشة الموافقة النهائية:** يجب أن يظهر اسم موقعك (`AlRabat RPF`) ورابط موقعك (`rabat-rpf.vercel.app`) بناءً على إعدادات Branding
- **هذا سلوك طبيعي مع Supabase** لأنه يستخدم نطاقه الخاص كـ redirect_uri في طلب OAuth
- **لإخفاء Supabase URL تماماً:** ستحتاج إلى استخدام Custom Domain في Supabase (ميزة مدفوعة)

**إذا استمر ظهور Supabase URL في شاشة الموافقة:**
  1. تأكد من حفظ جميع التغييرات في Branding (App name و Application home page)
  2. تأكد من أن OAuth consent screen تم التحقق منه (Verified) وليس في وضع Testing
  3. امسح cookies و cache المتصفح
  4. جرب في نافذة خاصة (Incognito)
  5. انتظر 15-20 دقيقة ثم جرّب مرة أخرى
  6. تأكد من أن Application home page يحتوي على رابط صحيح (مثل: `https://rabat-rpf.vercel.app`)

### الخطوة 5: إعداد Site URL في Supabase (اختياري)

1. في Supabase Dashboard، اذهب إلى **Project Settings** → **General**
2. في قسم **Site URL**، أضف رابط موقعك:
   ```
   https://your-domain.com
   ```
   أو للتطوير المحلي:
   ```
   http://localhost:3000
   ```
3. اضغط **Save**

### الخطوة 6: اختبار

1. أعد تحميل الصفحة
2. جرب تسجيل الدخول عبر Google مرة أخرى
3. يجب أن يظهر اسم موقعك بدلاً من Supabase URL

---

## 📋 ملخص Redirect URIs المطلوبة

### في Google Cloud Console (OAuth 2.0 Client ID):
- ✅ `http://localhost:3000/auth/callback` (للتطوير)
- ✅ `https://<your-supabase-project>.supabase.co/auth/v1/callback` (لـ Supabase)
- ✅ `https://your-domain.com/auth/callback` (للإنتاج)

### في Supabase Dashboard (Authentication → Providers → Google):
- ✅ `http://localhost:3000/auth/callback` (للتطوير)
- ✅ `https://your-domain.com/auth/callback` (للإنتاج)

---

## 🔍 استكشاف الأخطاء

### إذا استمر الخطأ:

1. **تحقق من Project Reference:**
   - تأكد من أنك استخدمت project reference الصحيح من Supabase
   - يمكنك العثور عليه في Supabase Dashboard → Project Settings → API

2. **تحقق من Client ID:**
   - تأكد من أن Client ID في Supabase Dashboard يطابق Client ID في Google Cloud Console

3. **انتظر قليلاً:**
   - قد تستغرق التغييرات في Google Cloud Console بضع دقائق لتطبق

4. **امسح الكاش:**
   - امسح cookies و cache المتصفح
   - جرب في نافذة خاصة (Incognito)

---

## 📞 الدعم

إذا استمرت المشكلة، تحقق من:
- [Supabase OAuth Documentation](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)

