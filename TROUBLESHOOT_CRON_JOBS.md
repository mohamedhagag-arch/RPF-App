# 🔧 Troubleshooting: Cron Jobs Not Running

## المشكلة: Cron Jobs لا تعمل بعد 3 أيام

### ✅ خطوات التحقق:

#### 1. **التحقق من Vercel Dashboard**
- اذهب إلى Vercel Dashboard → Project → Settings → Cron Jobs
- تأكد من أن Cron Jobs **مفعّلة** (Enabled)
- تحقق من آخر مرة تم فيها استدعاء الـ cron job
- تحقق من الـ Logs للبحث عن أخطاء

#### 2. **التحقق من Environment Variables**
في Vercel Dashboard → Project → Settings → Environment Variables:

```env
GOOGLE_DRIVE_CLIENT_ID=your-client-id
GOOGLE_DRIVE_CLIENT_SECRET=your-client-secret
GOOGLE_DRIVE_REFRESH_TOKEN=your-refresh-token
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
```

#### 3. **التحقق من Database Settings**
في قاعدة البيانات، تحقق من:
```sql
SELECT * FROM backup_settings WHERE storage_location = 'google_drive';
```

تأكد من:
- `is_active = true` ✅
- `frequency` موجود (daily, weekly, etc.) ✅
- `folder_id` موجود (اختياري) ✅

#### 4. **التحقق من Logs في Vercel**
- Vercel Dashboard → Project → Logs
- ابحث عن:
  - `⏰ Backup cron job triggered`
  - `🔄 Starting automated Google Drive backup...`
  - أي أخطاء أو warnings

#### 5. **اختبار يدوي**
جرّب استدعاء الـ cron job يدوياً:
```bash
curl -X GET "https://your-app.vercel.app/api/cron/daily-backup?frequency=daily" \
  -H "X-Cron-Secret: your-cron-secret"
```

أو من Postman/Thunder Client:
- Method: GET
- URL: `https://your-app.vercel.app/api/cron/daily-backup?frequency=daily`
- Headers: `X-Cron-Secret: your-cron-secret`

---

## 🔍 المشاكل الشائعة:

### المشكلة 1: Cron Jobs غير مفعّلة في Vercel
**الحل:**
- Vercel Dashboard → Project → Settings → Cron Jobs
- تأكد من أن Cron Jobs **Enabled**

### المشكلة 2: `is_active = false`
**الحل:**
- افتح Database Management → Auto Backup
- فعّل **"Enable Automatic Backups"**

### المشكلة 3: Frequency Mismatch
**الحل:**
- تأكد من أن `frequency` في قاعدة البيانات يطابق cron job
- على سبيل المثال: إذا كان `frequency = 'daily'`، يجب أن يكون cron job `frequency=daily`

### المشكلة 4: Authentication Failed
**الحل:**
- تحقق من `GOOGLE_DRIVE_REFRESH_TOKEN` في Vercel
- تأكد من أن Token صحيح وغير منتهي

### المشكلة 5: Vercel Cron Jobs لا تدعم Query Parameters
**⚠️ مشكلة محتملة:** Vercel Cron Jobs قد لا تدعم query parameters في `path`

**الحل البديل:** استخدام cron job واحد يتحقق من frequency من قاعدة البيانات

---

## 🛠️ حل بديل: Cron Job واحد

إذا كانت المشكلة في query parameters، يمكننا استخدام cron job واحد:

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-backup",
      "schedule": "0 * * * *"  // كل ساعة
    }
  ]
}
```

ثم في `/api/cron/daily-backup`، نتحقق من frequency من قاعدة البيانات ونقرر إذا كان يجب تنفيذ backup.

---

## 📊 Monitoring

### Vercel Dashboard
- **Logs**: Vercel Dashboard → Project → Logs
- **Cron Jobs**: Vercel Dashboard → Project → Settings → Cron Jobs
- **Deployments**: تحقق من آخر deployment

### Database
```sql
-- تحقق من آخر backup
SELECT last_backup_at, next_backup_at, is_active, frequency 
FROM backup_settings 
WHERE storage_location = 'google_drive';
```

---

## ✅ Checklist

- [ ] Cron Jobs مفعّلة في Vercel Dashboard
- [ ] Environment Variables موجودة في Vercel
- [ ] `is_active = true` في قاعدة البيانات
- [ ] `frequency` موجود في قاعدة البيانات
- [ ] `GOOGLE_DRIVE_REFRESH_TOKEN` صحيح
- [ ] تم اختبار Backup يدوياً
- [ ] لا توجد أخطاء في Vercel Logs

---

## 🚨 إذا استمرت المشكلة

1. **تحقق من Vercel Logs** - ابحث عن أخطاء
2. **اختبر يدوياً** - استدعي `/api/backup/google-drive` يدوياً
3. **تحقق من Database** - تأكد من أن الإعدادات صحيحة
4. **راجع الكود** - تأكد من أن frequency matching يعمل بشكل صحيح












