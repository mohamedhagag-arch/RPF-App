# ⏰ دليل Backup التلقائي

## 📋 نظرة عامة

النظام يدعم **Backup تلقائي يومي** على Google Drive عبر Vercel Cron Jobs.

---

## ⚙️ كيف يعمل

### 1. **الجدولة (Scheduling)**
- يتم جدولة الـ backup في `vercel.json`:
  ```json
  {
    "crons": [{
      "path": "/api/cron/daily-backup",
      "schedule": "0 2 * * *"  // كل يوم الساعة 2:00 AM
    }]
  }
  ```

### 2. **التنفيذ (Execution)**
- Vercel يستدعي `/api/cron/daily-backup` تلقائياً
- الـ cron job يستدعي `/api/backup/google-drive`
- يتم إنشاء backup كامل (جداول + ملفات + إعدادات)
- يتم رفع الـ backup إلى Google Drive

### 3. **التحكم (Control)**
- يمكن تفعيل/تعطيل الـ backup من **Database Management → Auto Backup**
- يمكن تغيير **Frequency** (يومي، أسبوعي، إلخ)
- يمكن تحديد **Retention Days** (عدد الأيام لحفظ النسخ)
- يمكن تحديد **Google Drive Folder ID**

---

## ✅ متطلبات التشغيل

### 1. **Environment Variables**
في `.env.local` (محلي) و Vercel (production):

```env
# Google Drive API
GOOGLE_DRIVE_CLIENT_ID=your-client-id
GOOGLE_DRIVE_CLIENT_SECRET=your-client-secret
GOOGLE_DRIVE_REFRESH_TOKEN=your-refresh-token

# Optional: For cron job authentication
CRON_SECRET=any-random-secret-key

# Optional: App URL (for cron jobs)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### 2. **Database Settings**
- يجب تكوين إعدادات الـ backup في **Database Management → Auto Backup**
- يجب تفعيل **Auto Backup** (`is_active = true`)
- يجب تحديد **Google Drive Folder ID** (اختياري)

### 3. **Vercel Configuration**
- يجب أن يكون `vercel.json` موجود في المشروع
- يجب أن يكون Cron Job مفعّل في Vercel Dashboard

---

## 🔍 التحقق من العمل

### 1. **فحص الإعدادات**
```bash
npm run verify:backup
```

### 2. **اختبار يدوي**
- افتح **Database Management → Auto Backup**
- اضغط **"Trigger Manual Backup to Google Drive"**
- تحقق من ظهور الملف في Google Drive

### 3. **فحص Logs في Vercel**
- Vercel Dashboard → Project → Logs
- ابحث عن: `⏰ Daily backup cron job triggered`
- ابحث عن: `✅ Daily backup completed`

---

## 📅 الجدولة (Schedule)

### التوقيت الحالي
- **الوقت**: 2:00 AM (توقيت UTC)
- **التكرار**: يومي

### تغيير الجدولة
عدّل `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/daily-backup",
    "schedule": "0 2 * * *"  // Cron expression
  }]
}
```

**أمثلة:**
- `"0 2 * * *"` - كل يوم الساعة 2:00 AM
- `"0 0 * * 0"` - كل أسبوع يوم الأحد الساعة 12:00 AM
- `"0 */6 * * *"` - كل 6 ساعات

---

## 🛠️ استكشاف الأخطاء

### المشكلة: Backup لا يعمل تلقائياً

**الحلول:**
1. ✅ تحقق من `is_active = true` في إعدادات الـ backup
2. ✅ تحقق من وجود Environment Variables في Vercel
3. ✅ تحقق من أن Cron Job مفعّل في Vercel Dashboard
4. ✅ تحقق من Logs في Vercel

### المشكلة: "Auto-backup is disabled"

**الحل:**
- افتح **Database Management → Auto Backup**
- فعّل **"Enable Automatic Backups"**

### المشكلة: "Google Drive backup not configured"

**الحل:**
- تأكد من وجود إعدادات في جدول `backup_settings`
- تأكد من وجود `GOOGLE_DRIVE_REFRESH_TOKEN` في Environment Variables

---

## 📊 Monitoring

### Vercel Dashboard
- **Logs**: Vercel Dashboard → Project → Logs
- **Cron Jobs**: Vercel Dashboard → Project → Settings → Cron Jobs

### Database
- **Last Backup**: `backup_settings.last_backup_at`
- **Next Backup**: `backup_settings.next_backup_at`

---

## 🔐 الأمان

### Authentication
- Vercel Cron Jobs تستخدم `x-vercel-signature` header
- يمكن إضافة `CRON_SECRET` للتحقق الإضافي

### Permissions
- الـ backup يستخدم **Service Role Key** للوصول إلى قاعدة البيانات
- Google Drive API يستخدم **OAuth 2.0** مع Refresh Token

---

## 📝 ملاحظات

1. **الوقت**: Vercel Cron Jobs تعمل بتوقيت UTC
2. **الحد الأقصى**: 5 دقائق لكل backup (configurable)
3. **التكرار**: يمكن تغييره من UI (Database Management)
4. **الاحتفاظ**: يمكن تحديد عدد الأيام لحفظ النسخ (Retention Days)

---

## ✅ Checklist قبل الرفع على Vercel

- [ ] Environment Variables موجودة في Vercel
- [ ] `vercel.json` يحتوي على Cron Job configuration
- [ ] إعدادات الـ backup موجودة في قاعدة البيانات
- [ ] `is_active = true` في إعدادات الـ backup
- [ ] Google Drive Folder ID محدد (اختياري)
- [ ] تم اختبار Backup يدوياً

---

## 🎯 الخلاصة

الـ backup التلقائي يعمل بشكل كامل إذا:
1. ✅ Environment Variables موجودة
2. ✅ إعدادات الـ backup موجودة ومفعّلة
3. ✅ Vercel Cron Job مفعّل
4. ✅ Google Drive API يعمل

**كل شيء جاهز! 🚀**

