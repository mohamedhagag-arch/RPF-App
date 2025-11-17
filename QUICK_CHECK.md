# ✅ فحص سريع: التحقق من إعدادات Backup

## 🚀 طريقة سريعة للتحقق

### 1. تشغيل Script التحقق

```bash
npm run verify:backup
```

هذا سيفحص:
- ✅ وجود ملف `.env.local`
- ✅ جميع Environment Variables المطلوبة
- ✅ الحزم المطلوبة (form-data)
- ✅ API routes
- ✅ Library files
- ✅ Vercel configuration
- ✅ Google Drive authentication (إذا كان Refresh Token موجود)

---

## 📋 Checklist يدوي

### ✅ Environment Variables

افتح `.env.local` وتأكد من وجود:

```env
GOOGLE_DRIVE_CLIENT_ID=your-client-id
GOOGLE_DRIVE_CLIENT_SECRET=your-client-secret
GOOGLE_DRIVE_REFRESH_TOKEN=your-refresh-token
```

### ✅ Packages

```bash
npm install
```

تأكد من تثبيت `form-data`

### ✅ API Routes

تأكد من وجود:
- `app/api/backup/google-drive/route.ts`
- `app/api/cron/daily-backup/route.ts`
- `app/api/test-backup/route.ts`

### ✅ Library Files

تأكد من وجود:
- `lib/googleDriveBackup.ts`
- `lib/backupManager.ts`

### ✅ Vercel Config

تأكد من وجود `vercel.json` مع cron job:
```json
{
  "crons": [
    {
      "path": "/api/cron/daily-backup",
      "schedule": "0 2 * * *"
    }
  ]
}
```

---

## 🧪 اختبار سريع

### الطريقة 1: Script
```bash
npm run test:backup
```

### الطريقة 2: API Endpoint
```bash
npm run dev
# ثم: POST http://localhost:3000/api/test-backup
```

### الطريقة 3: من الواجهة
1. `npm run dev`
2. Settings → Database Management → Auto Backup
3. اضغط "Trigger Manual Backup to Google Drive"

---

## ✅ النتيجة المتوقعة

إذا كان كل شيء صحيح، يجب أن ترى:
- ✅ Backup created successfully
- ✅ Uploaded to Google Drive
- ✅ File URL في Google Drive

---

## 🔍 إذا واجهت مشاكل

1. **شغّل التحقق:**
   ```bash
   npm run verify:backup
   ```

2. **تحقق من الأخطاء** في النتيجة

3. **راجع الدليل:**
   - `GUIDE_GET_REFRESH_TOKEN.md` - للحصول على Refresh Token
   - `LOCAL_BACKUP_TEST.md` - للاختبار المحلي


