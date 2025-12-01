# 🔐 دليل تفصيلي: الحصول على Google Drive Refresh Token

## 📋 نظرة عامة

Refresh Token هو رمز دائم يسمح للنظام بتحديث Access Token تلقائياً. Access Token ينتهي بعد ساعة واحدة، لكن Refresh Token دائم (إلا إذا ألغيت الصلاحيات).

---

## 🎯 الخطوات التفصيلية

### الخطوة 1: إنشاء Google Cloud Project

1. اذهب إلى [Google Cloud Console](https://console.cloud.google.com)
2. اضغط على قائمة المشاريع في الأعلى
3. اضغط "New Project" أو اختر مشروع موجود
4. أدخل اسم المشروع (مثلاً: "RPF Backup")
5. اضغط "Create"

---

### الخطوة 2: تفعيل Google Drive API

1. من القائمة الجانبية، اختر **APIs & Services** → **Library**
2. في شريط البحث، اكتب: `Google Drive API`
3. اضغط على "Google Drive API" من النتائج
4. اضغط زر **Enable** (تفعيل)
5. انتظر حتى يظهر "API enabled"

---

### الخطوة 3: إنشاء OAuth 2.0 Credentials

1. من القائمة الجانبية، اختر **APIs & Services** → **Credentials**
2. اضغط على زر **+ CREATE CREDENTIALS** في الأعلى
3. اختر **OAuth client ID**

#### إذا طُلب منك إعداد OAuth consent screen أولاً:

1. اختر **External** (للتطبيقات الخارجية)
2. اضغط **CREATE**
3. املأ المعلومات:
   - **App name**: RPF Backup (أو أي اسم)
   - **User support email**: بريدك الإلكتروني
   - **Developer contact information**: بريدك الإلكتروني
4. اضغط **SAVE AND CONTINUE**
5. في **Scopes**، اضغط **ADD OR REMOVE SCOPES**
6. ابحث عن `https://www.googleapis.com/auth/drive.file`
7. حدده واضغط **UPDATE**
8. اضغط **SAVE AND CONTINUE**
9. في **Test users**، أضف بريدك الإلكتروني
10. اضغط **SAVE AND CONTINUE**
11. اضغط **BACK TO DASHBOARD**






http://localhost:3000/api/auth/google/callback?code=4/0Ab32j929vxXDB0J4UYpqLRWHznXbZvy73M5xz_JfTTevbmFoieXTlcRVF6tstPNSJKgU5g&scope=https://www.googleapis.com/auth/drive.file


4/0Ab32j929vxXDB0J4UYpqLRWHznXbZvy73M5xz_JfTTevbmFoieXTlcRVF6tstPNSJKgU5g




#### بعد إعداد OAuth consent screen:

1. من **Credentials**، اضغط **+ CREATE CREDENTIALS** → **OAuth client ID**
2. اختر **Application type**: **Web application**
3. أدخل **Name**: RPF Backup Client (أو أي اسم)
4. في **Authorized redirect URIs**، اضغط **+ ADD URI**
5. أضف هذا الرابط:
   ```
   http://localhost:3000/api/auth/google/callback
   ```
6. (اختياري) أضف رابط الإنتاج أيضاً:
   ```
   https://your-domain.com/api/auth/google/callback
   ```
7. اضغط **CREATE**
8. **مهم جداً**: انسخ **Client ID** و **Client Secret** واحفظهما في مكان آمن
   - ستحتاجهما في الخطوات التالية

---

### الخطوة 4: الحصول على Authorization Code

#### الطريقة الأولى: استخدام الرابط مباشرة

1. افتح هذا الرابط في المتصفح (استبدل `YOUR_CLIENT_ID` بالـ Client ID الذي حصلت عليه):

```
https://accounts.google.com/o/oauth2/v2/auth?client_id=YOUR_CLIENT_ID&redirect_uri=http://localhost:3000/api/auth/google/callback&response_type=code&scope=https://www.googleapis.com/auth/drive.file&access_type=offline&prompt=consent
```

**مثال:**
```
https://accounts.google.com/o/oauth2/v2/auth?client_id=123456789-abcdefghijklmnop.apps.googleusercontent.com&redirect_uri=http://localhost:3000/api/auth/google/callback&response_type=code&scope=https://www.googleapis.com/auth/drive.file&access_type=offline&prompt=consent
```

2. سجّل الدخول بحساب Google الخاص بك
3. ستظهر لك شاشة الموافقة على الصلاحيات:
   - اقرأ الصلاحيات المطلوبة
   - اضغط **Allow** (السماح)
4. بعد الموافقة، سيتم توجيهك إلى:
   ```
   http://localhost:3000/api/auth/google/callback?code=4/0Ab32j929vxXDB0J4UYpqLRWHznXbZvy73M5xz_JfTTevbmFoieXTlcRVF6tstPNSJKgU5g&scope=https://www.googleapis.com/auth/drive.file
   ```
5. **انسخ الكود** من الرابط (الجزء بعد `code=`):
   ```
   4/0Ab32j929vxXDB0J4UYpqLRWHznXbZvy73M5xz_JfTTevbmFoieXTlcRVF6tstPNSJKgU5g
   ```

#### الطريقة الثانية: استخدام Script

```bash
npm run get:gdrive-token
```

اتبع التعليمات في Terminal.

---

### الخطوة 5: استبدال Authorization Code بـ Refresh Token

الآن لديك:
- ✅ Authorization Code (من الخطوة السابقة)
- ✅ Client ID
- ✅ Client Secret

#### الطريقة الأولى: استخدام curl (Terminal)

افتح Terminal واكتب هذا الأمر (استبدل القيم):

```bash
curl -X POST https://oauth2.googleapis.com/token \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "code=AUTHORIZATION_CODE_FROM_STEP_4" \
  -d "redirect_uri=http://localhost:3000/api/auth/google/callback" \
  -d "grant_type=authorization_code"
```

**مثال حقيقي:**
```bash
curl -X POST https://oauth2.googleapis.com/token \
  -d "client_id=123456789-abcdefghijklmnop.apps.googleusercontent.com" \
  -d "client_secret=GOCSPX-abcdefghijklmnopqrstuvwxyz" \
  -d "code=4/0Ab32j929vxXDB0J4UYpqLRWHznXbZvy73M5xz_JfTTevbmFoieXTlcRVF6tstPNSJKgU5g" \
  -d "redirect_uri=http://localhost:3000/api/auth/google/callback" \
  -d "grant_type=authorization_code"
```

#### الطريقة الثانية: استخدام Postman

1. افتح Postman
2. اختر **POST**
3. أدخل URL: `https://oauth2.googleapis.com/token`
4. اذهب إلى **Body** → **x-www-form-urlencoded**
5. أضف هذه الحقول:

| Key | Value |
|-----|-------|
| `client_id` | YOUR_CLIENT_ID |
| `client_secret` | YOUR_CLIENT_SECRET |
| `code` | AUTHORIZATION_CODE |
| `redirect_uri` | `http://localhost:3000/api/auth/google/callback` |
| `grant_type` | `authorization_code` |

6. اضغط **Send**

#### الطريقة الثالثة: استخدام PowerShell (Windows)

```powershell
$body = @{
    client_id = "YOUR_CLIENT_ID"
    client_secret = "YOUR_CLIENT_SECRET"
    code = "AUTHORIZATION_CODE"
    redirect_uri = "http://localhost:3000/api/auth/google/callback"
    grant_type = "authorization_code"
}

$response = Invoke-RestMethod -Uri "https://oauth2.googleapis.com/token" -Method Post -Body $body
$response | ConvertTo-Json
```

---

### الخطوة 6: استخراج Refresh Token من الرد

بعد تنفيذ الأمر، ستحصل على رد JSON مثل هذا:

```json
{
  "access_token": "ya29.a0AfH6SMC...",
  "expires_in": 3599,
  "refresh_token": "1//04abcdefghijklmnopqrstuvwxyz...",
  "scope": "https://www.googleapis.com/auth/drive.file",
  "token_type": "Bearer"
}
```

**مهم جداً**: انسخ قيمة `refresh_token` واحفظها في مكان آمن!

---

### الخطوة 7: إضافة Tokens إلى .env.local

1. أنشئ ملف `.env.local` في جذر المشروع (إذا لم يكن موجوداً)
2. أضف هذه المتغيرات:

```env
# Google Drive OAuth Credentials
GOOGLE_DRIVE_CLIENT_ID=your-client-id-here
GOOGLE_DRIVE_CLIENT_SECRET=your-client-secret-here
GOOGLE_DRIVE_REFRESH_TOKEN=your-refresh-token-here

# Optional: Specific folder ID for backups
GOOGLE_DRIVE_FOLDER_ID=

# Optional: For cron job authentication
CRON_SECRET=any-random-secret-key-here
```

**مثال:**
```env
GOOGLE_DRIVE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
GOOGLE_DRIVE_CLIENT_SECRET=GOCSPX-abcdefghijklmnopqrstuvwxyz
GOOGLE_DRIVE_REFRESH_TOKEN=1//04abcdefghijklmnopqrstuvwxyz...
GOOGLE_DRIVE_FOLDER_ID=
CRON_SECRET=my-super-secret-key-12345
```

---

## ✅ التحقق من أن كل شيء يعمل

### اختبار سريع:

1. شغّل المشروع:
   ```bash
   npm run dev
   ```

2. اذهب إلى:
   ```
   http://localhost:3000/api/test-backup
   ```
   أو استخدم Postman: `POST http://localhost:3000/api/test-backup`

3. يجب أن ترى رداً مثل:
   ```json
   {
     "success": true,
     "message": "Backup created and uploaded successfully",
     "backup": {
       "timestamp": "2024-01-15T10:30:00.000Z",
       "totalTables": 8,
       "totalRows": 1234
     },
     "googleDrive": {
       "success": true,
       "fileId": "1abcdefghijklmnopqrstuvwxyz",
       "fileUrl": "https://drive.google.com/file/d/1abcdefghijklmnopqrstuvwxyz/view"
     }
   }
   ```

4. اذهب إلى [Google Drive](https://drive.google.com) وتحقق من وجود الملف!

---

## 🔍 استكشاف الأخطاء الشائعة

### خطأ: "invalid_grant"

**السبب**: Authorization Code منتهي الصلاحية (ينتهي بعد بضع دقائق)

**الحل**: 
- احصل على authorization code جديد من الخطوة 4
- استخدمه فوراً (خلال دقيقة أو دقيقتين)

### خطأ: "redirect_uri_mismatch"

**السبب**: Redirect URI في الطلب لا يطابق الموجود في Google Cloud Console

**الحل**:
- تأكد من أن Redirect URI في Google Cloud Console هو بالضبط:
  ```
  http://localhost:3000/api/auth/google/callback
  ```
- تأكد من عدم وجود مسافات أو أحرف إضافية

### خطأ: "invalid_client"

**السبب**: Client ID أو Client Secret خاطئ

**الحل**:
- تحقق من أنك نسخت Client ID و Client Secret بشكل صحيح
- تأكد من عدم وجود مسافات إضافية

### خطأ: "access_denied"

**السبب**: لم توافق على الصلاحيات

**الحل**:
- تأكد من الضغط على "Allow" في شاشة الموافقة
- تأكد من إضافة `prompt=consent` في رابط Authorization

---

## 📝 ملاحظات مهمة

1. **Refresh Token دائم**: بمجرد الحصول عليه، يمكنك استخدامه دائماً (إلا إذا ألغيت الصلاحيات)

2. **Access Token مؤقت**: Access Token ينتهي بعد ساعة واحدة، لكن النظام يحدّثه تلقائياً باستخدام Refresh Token

3. **الصلاحيات**: Scope `https://www.googleapis.com/auth/drive.file` يسمح فقط بإنشاء وتعديل الملفات التي أنشأها التطبيق (آمن)

4. **الاختبار**: جرب أولاً محلياً قبل الرفع على Vercel

5. **الأمان**: لا تشارك Client Secret أو Refresh Token مع أحد!

---

## 🎉 مبروك!

إذا وصلت إلى هنا، فأنت الآن لديك:
- ✅ Google Cloud Project
- ✅ Google Drive API مفعّل
- ✅ OAuth 2.0 Credentials
- ✅ Refresh Token
- ✅ كل شيء جاهز للنسخ الاحتياطي التلقائي!

يمكنك الآن تجربة النسخ الاحتياطي باستخدام أي من الطرق المذكورة في `LOCAL_BACKUP_TEST.md`


