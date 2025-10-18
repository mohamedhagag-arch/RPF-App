# 🔍 تشخيص مشكلة اختيار أكثر من مشروع في BOQ

## 🎯 **المشكلة:**

عند اختيار أكثر من مشروع في BOQ، لا تظهر بيانات جميع المشاريع المختارة، بل تظهر بيانات مشروع واحد فقط.

## 🔍 **التشخيص المفصل:**

### **الخطوة 1: افتح Console (F12)**

### **الخطوة 2: اختر مشروعين أو أكثر في BOQ**

**سترى هذه الرسائل:**

```javascript
🔍 Projects change detected: {
  oldSelectedProjects: [],
  newProjectCodes: ["P5040", "P5041"],
  length: 2
}
🔄 Loading activities for 2 project(s): ["P5040", "P5041"]
🔄 Calling fetchData with projects: ["P5040", "P5041"]
🔍 BOQ Filter Debug: {
  selectedProjects: ["P5040", "P5041"],
  selectedProjectsLength: 2,
  selectedActivities: [],
  selectedTypes: [],
  selectedStatuses: []
}
🔍 Filtering by projects: ["P5040", "P5041"]
🔍 Project codes to filter: ["P5040", "P5041"]
🔍 Multiple projects selected: YES
🔍 Projects list: P5040, P5041
✅ Project filter applied to query
✅ Will show activities for 2 project(s)
```

### **الخطوة 3: تحقق من النتائج**

**سترى هذه الرسائل:**

```javascript
🔍 Query result: {
  dataLength: 10,
  count: 25,
  error: "no",
  errorMessage: "none",
  selectedProjects: ["P5040", "P5041"],
  multipleProjects: true
}
🔍 Projects found in results: ["P5040", "P5041"]
🔍 Expected projects: ["P5040", "P5041"]
🔍 All expected projects found: true
✅ Successfully loaded 10 activities
```

---

## 🚨 **المشاكل المحتملة:**

### **المشكلة 1: selectedProjects فارغ**

إذا رأيت:
```javascript
🔍 Projects change detected: {
  oldSelectedProjects: [],
  newProjectCodes: ["P5040", "P5041"],
  length: 2
}
🔍 BOQ Filter Debug: {
  selectedProjects: [],
  selectedProjectsLength: 0,
  ...
}
```

**السبب:** `selectedProjects` لا يتم تحديثه بشكل صحيح

**الحل:** تأكد من أن `setSelectedProjects(projectCodes)` يعمل

### **المشكلة 2: Project Codes غير متطابقة**

إذا رأيت:
```javascript
🔍 Projects found in results: ["P5040"]
🔍 Expected projects: ["P5040", "P5041"]
🔍 All expected projects found: false
```

**السبب:** `P5041` غير موجود في قاعدة البيانات

**الحل:** تحقق من وجود `P5041` في قاعدة البيانات

### **المشكلة 3: لا توجد بيانات للمشاريع المختارة**

إذا رأيت:
```javascript
🔍 Query result: {
  dataLength: 0,
  count: 0,
  error: "no"
}
```

**السبب:** لا توجد أنشطة للمشاريع المختارة

**الحل:** تحقق من وجود أنشطة لهذه المشاريع

---

## 🛠️ **الحلول:**

### **الحل 1: تحقق من قاعدة البيانات**

1. اذهب لـ **Database Management**
2. اختر جدول **BOQ Activities**
3. ابحث عن `Project Code = P5040` و `Project Code = P5041`
4. تحقق من وجود البيانات

### **الحل 2: مسح الفلاتر وإعادة المحاولة**

1. انقر **"Clear All"** في الفلاتر
2. اختر المشاريع مرة أخرى
3. انتظر تحميل البيانات

### **الحل 3: إعادة تحميل الصفحة**

```
اضغط F5 أو Ctrl+R
```

### **الحل 4: مسح localStorage**

```javascript
// في Console (F12):
localStorage.clear()
```

ثم أعد تحميل الصفحة.

---

## 📊 **النتيجة المتوقعة:**

### **عند اختيار مشروعين:**

```javascript
🔍 Projects change detected: {
  oldSelectedProjects: [],
  newProjectCodes: ["P5040", "P5041"],
  length: 2
}
🔄 Loading activities for 2 project(s): ["P5040", "P5041"]
🔍 Multiple projects selected: YES
🔍 Projects list: P5040, P5041
✅ Project filter applied to query
✅ Will show activities for 2 project(s)
🔍 Query result: {
  dataLength: 15,
  count: 25,
  error: "no"
}
🔍 Projects found in results: ["P5040", "P5041"]
🔍 Expected projects: ["P5040", "P5041"]
🔍 All expected projects found: true
✅ Successfully loaded 15 activities
```

**وستظهر أنشطة من كلا المشروعين!**

---

## 🔍 **تشخيص متقدم:**

### **تحقق من Project Codes في قاعدة البيانات:**

```sql
-- في Database Management:
SELECT "Project Code", COUNT(*) 
FROM "Planning Database - BOQ Rates" 
WHERE "Project Code" IN ('P5040', 'P5041')
GROUP BY "Project Code"
```

### **تحقق من وجود أنشطة للمشاريع:**

```sql
SELECT "Project Code", "Activity Name", COUNT(*) 
FROM "Planning Database - BOQ Rates" 
WHERE "Project Code" IN ('P5040', 'P5041')
GROUP BY "Project Code", "Activity Name"
```

### **تحقق من جميع Project Codes:**

```sql
SELECT DISTINCT "Project Code" 
FROM "Planning Database - BOQ Rates" 
WHERE "Project Code" IN ('P5040', 'P5041')
ORDER BY "Project Code"
```

---

## 📝 **ملاحظات مهمة:**

### **لماذا يظهر مشروع واحد فقط؟**
- إما أن المشاريع الأخرى لا تحتوي على أنشطة
- أو أن `Project Code` غير متطابق
- أو أن هناك مشكلة في الفلترة

### **لماذا لا تظهر جميع الأنشطة؟**
- النظام يستخدم pagination (2 items per page)
- قد تحتاج للتنقل بين الصفحات
- أو زيادة `itemsPerPage`

### **لماذا يظهر "0 activities"؟**
- إما أن المشاريع المختارة لا تحتوي على أنشطة
- أو أن `Project Code` غير متطابق
- أو أن هناك مشكلة في الاتصال

---

## 🎯 **النتيجة النهائية:**

بعد التشخيص، ستجد:

1. **إذا كانت البيانات موجودة:** ستظهر أنشطة من جميع المشاريع المختارة
2. **إذا لم تكن موجودة:** ستظهر رسالة واضحة عن السبب
3. **إذا كانت هناك مشكلة في الاتصال:** ستظهر رسالة خطأ واضحة

---

**تم الإصلاح:** October 16, 2025
**الحالة:** 🔧 جاهز للتشخيص المفصل!

🎉 **استخدم Console لتشخيص المشكلة بدقة!**

