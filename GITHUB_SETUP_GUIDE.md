# 🚀 دليل رفع المشروع على GitHub

## 📋 **الخطوات المطلوبة:**

### **1️⃣ إنشاء Repository على GitHub**

1. **اذهب إلى GitHub.com**
2. **اضغط على "New repository" (الزر الأخضر)**
3. **املأ البيانات:**
   - **Repository name:** `rabat-mvp`
   - **Description:** `🏗️ Rabat MVP - Project Management System with BOQ, KPI tracking, and advanced reporting`
   - **Visibility:** `Public` أو `Private` (حسب تفضيلك)
   - **❌ لا تضع علامة على "Add a README file"** (لأننا لدينا واحد بالفعل)
   - **❌ لا تضع علامة على "Add .gitignore"** (لأننا لدينا واحد بالفعل)
4. **اضغط "Create repository"**

---

### **2️⃣ ربط المشروع المحلي بـ GitHub**

بعد إنشاء الـ repository، ستظهر لك تعليمات. استخدم هذه الأوامر:

```bash
# إضافة remote origin
git remote add origin https://github.com/YOUR_USERNAME/rabat-mvp.git

# تغيير اسم الفرع إلى main (اختياري)
git branch -M main

# رفع المشروع
git push -u origin main
```

---

### **3️⃣ الأوامر الكاملة للتنفيذ:**

```bash
# 1. إضافة remote origin (استبدل YOUR_USERNAME باسمك)
git remote add origin https://github.com/YOUR_USERNAME/rabat-mvp.git

# 2. تغيير اسم الفرع إلى main
git branch -M main

# 3. رفع المشروع
git push -u origin main
```

---

## 🔧 **إعدادات إضافية (اختيارية):**

### **إضافة معلومات المطور:**
```bash
git config user.name "Eng. Mohamed"
git config user.email "admin@rabat.com"
```

### **إضافة GitHub Pages (للعرض المباشر):**
1. اذهب إلى Settings في الـ repository
2. ابحث عن "Pages" في القائمة الجانبية
3. اختر "Deploy from a branch"
4. اختر "main" branch
5. اضغط "Save"

---

## 📊 **معلومات المشروع:**

### **✨ المميزات الرئيسية:**
- 🏗️ **Project Management** - إدارة المشاريع الشاملة
- 📋 **BOQ Management** - إدارة قوائم الكميات
- 📈 **KPI Tracking** - تتبع مؤشرات الأداء
- 📊 **Advanced Reporting** - تقارير متقدمة (6 أنواع)
- 🔍 **Smart Search** - بحث ذكي
- 👥 **User Management** - إدارة المستخدمين
- 📤 **Import/Export** - استيراد وتصدير البيانات

### **🛠️ التقنيات المستخدمة:**
- **Next.js 14** - React framework
- **TypeScript** - Type-safe development
- **Supabase** - Backend-as-a-Service
- **Tailwind CSS** - Utility-first CSS
- **PostgreSQL** - Database

### **🔧 المشاكل المحلولة:**
- ✅ **"Syncing..." Issues** - مشاكل التزامن محلولة
- ✅ **Performance Optimization** - تحسين الأداء
- ✅ **Data Management** - إدارة البيانات المحسّنة
- ✅ **Real-time Sync** - مزامنة فورية بين BOQ و KPI

---

## 🎯 **بعد الرفع:**

### **1️⃣ تحديث README.md:**
- استبدل `your-username` باسمك الحقيقي
- أضف رابط الـ repository
- حدث معلومات الاتصال

### **2️⃣ إضافة Topics/Tags:**
في صفحة الـ repository، أضف هذه الـ tags:
```
nextjs, typescript, supabase, project-management, boq, kpi, construction, dashboard, reporting, tailwindcss
```

### **3️⃣ إضافة License:**
- اذهب إلى Settings → General
- ابحث عن "License"
- اختر "MIT License" أو "Apache License 2.0"

---

## 🚀 **الخطوات التالية:**

### **1️⃣ Deploy على Vercel:**
```bash
# تثبيت Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### **2️⃣ إعداد Environment Variables:**
في Vercel Dashboard:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### **3️⃣ إعداد Database:**
- أنشئ Supabase project
- استورد الـ SQL files من مجلد `Database/`
- فعّل Row Level Security (RLS)

---

## 📞 **الدعم:**

إذا واجهت أي مشاكل:
- افتح Issue في GitHub
- تواصل مع: admin@rabat.com
- راجع الوثائق في `/docs`

---

**🎊 مبروك! مشروعك جاهز للرفع على GitHub!** 🚀✨
