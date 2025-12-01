# 🧪 دليل التجربة المحلية للنسخ الاحتياطي على Google Drive

## الخطوات:

### 1. إعداد Environment Variables

أنشئ ملف `.env.local` في جذر المشروع:

```env
# Google Drive OAuth Credentials
GOOGLE_DRIVE_CLIENT_ID=your-client-id-here
GOOGLE_DRIVE_CLIENT_SECRET=your-client-secret-here

# Optional: If you have a refresh token
GOOGLE_DRIVE_REFRESH_TOKEN=your-refresh-token-here

# Optional: Specific folder ID for backups
GOOGLE_DRIVE_FOLDER_ID=your-folder-id-here

# Optional: For cron job authentication
CRON_SECRET=your-secret-key-here
```

### 2. الحصول على Google Drive Credentials

#### أ) إنشاء Google Cloud Project:
1. اذهب إلى [Google Cloud Console](https://console.cloud.google.com)
2. أنشئ مشروع جديد أو اختر مشروع موجود
3. فعّل **Google Drive API**:
   - APIs & Services → Library
   - ابحث عن "Google Drive API"
   - اضغط "Enable"

#### ب) إنشاء OAuth 2.0 Credentials:
1. اذهب إلى APIs & Services → Credentials
2. اضغط "Create Credentials" → "OAuth client ID"
3. اختر "Web application"
4. أضف Authorized redirect URIs:
   - `http://localhost:3000/api/auth/google/callback` (للتجربة المحلية)
   - `https://your-domain.com/api/auth/google/callback` (للإنتاج)
5. احفظ Client ID و Client Secret

### 3. الحصول على Refresh Token

#### الطريقة الأولى: استخدام Script
```bash
npm run get:gdrive-token
```

اتبع التعليمات:
1. افتح الرابط في المتصفح
2. سجّل الدخول ووافق على الصلاحيات
3. انسخ الكود من redirect URL
4. الصقه في Terminal

#### الطريقة الثانية: يدوياً
1. افتح هذا الرابط (استبدل `YOUR_CLIENT_ID`):
```
https://accounts.google.com/o/oauth2/v2/auth?client_id=YOUR_CLIENT_ID&redirect_uri=http://localhost:3000/api/auth/google/callback&response_type=code&scope=https://www.googleapis.com/auth/drive.file&access_type=offline&prompt=consent
```

2. وافق على الصلاحيات
3. انسخ الكود من redirect URL
4. استخدم Postman أو curl لاستبدال الكود بـ tokens:
```bash
curl -X POST https://oauth2.googleapis.com/token \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "code=CODE_FROM_REDIRECT" \
  -d "redirect_uri=http://localhost:3000/api/auth/google/callback" \
  -d "grant_type=authorization_code"
```








مثال على redirect URL بعد الموافقة:
```
http://localhost:3000/api/auth/google/callback?code=4/0Ab32j929vxXDB0J4UYpqLRWHznXbZvy73M5xz_JfTTevbmFoieXTlcRVF6tstPNSJKgU5g&scope=https://www.googleapis.com/auth/drive.file
```

**الكود هنا هو**: `4/0Ab32j929vxXDB0J4UYpqLRWHznXbZvy73M5xz_JfTTevbmFoieXTlcRVF6tstPNSJKgU5g`

استخدم هذا الكود في الخطوة التالية لاستبداله بـ Refresh Token.



5. احفظ `refresh_token` في `.env.local`

**📖 للشرح التفصيلي الكامل، راجع ملف `GUIDE_GET_REFRESH_TOKEN.md`**

### 4. تجربة النسخ الاحتياطي

#### الطريقة الأولى: استخدام Script
```bash
npm run test:backup
```

#### الطريقة الثانية: استخدام API Endpoint (الأسهل)
```bash
# Start dev server
npm run dev

# In another terminal, test the backup
curl -X POST http://localhost:3000/api/test-backup
```

#### الطريقة الثالثة: من واجهة المستخدم
1. شغّل المشروع: `npm run dev`
2. اذهب إلى Settings → Database Management → Auto Backup
3. اضغط "Trigger Manual Backup to Google Drive"

### 5. التحقق من النتيجة

1. اذهب إلى [Google Drive](https://drive.google.com)
2. ابحث عن ملفات باسم `database_backup_YYYY-MM-DD_HHMM.json`
3. تأكد من أن الملف موجود ومحتواه صحيح

## ملاحظات سريعة:

- ✅ **أسهل طريقة للتجربة**: استخدم API endpoint `/api/test-backup` من المتصفح أو Postman
- ✅ **للاختبار السريع**: استخدم واجهة المستخدم في Settings → Database Management → Auto Backup
- ✅ **للاختبار المتقدم**: استخدم script `npm run test:backup`

## استكشاف الأخطاء:

### خطأ: "Missing required environment variables"
- تأكد من وجود `.env.local` في جذر المشروع
- تأكد من أن المتغيرات مكتوبة بشكل صحيح

### خطأ: "Failed to refresh token"
- تأكد من أن `GOOGLE_DRIVE_REFRESH_TOKEN` صحيح
- جرب الحصول على refresh token جديد

### خطأ: "Failed to upload backup"
- تأكد من أن Access Token صالح
- تأكد من أن Google Drive API مفعّل
- تأكد من أن OAuth credentials صحيحة

### خطأ: "Unauthorized"
- تأكد من أن Scope صحيح: `https://www.googleapis.com/auth/drive.file`
- تأكد من أن Redirect URI مطابق تماماً

## ملاحظات:

- ✅ Access Token ينتهي بعد ساعة واحدة
- ✅ Refresh Token دائم (إلا إذا تم إلغاء الصلاحيات)
- ✅ النظام يحدّث Access Token تلقائياً عند الحاجة
- ✅ يمكنك استخدام Folder ID لتخزين النسخ في مجلد محدد

## بعد التجربة المحلية:

بعد التأكد من أن كل شيء يعمل محلياً:

1. أضف نفس Environment Variables في Vercel:
   - Vercel Dashboard → Project → Settings → Environment Variables

2. تأكد من أن Cron Job مفعّل:
   - Vercel Dashboard → Project → Settings → Cron Jobs
   - يجب أن ترى "Daily Backup" مجدول

3. راقب Logs:
   - Vercel Dashboard → Project → Logs
   - ابحث عن "Daily backup cron job triggered"

