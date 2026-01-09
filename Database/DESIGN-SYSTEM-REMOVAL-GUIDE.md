# دليل حذف نظام Design بالكامل
# Design System Complete Removal Guide

## ⚠️ تحذير: هذا سيمسح كل بيانات نظام Design نهائياً!

## خطوات الحذف:

### 1. حذف من قاعدة البيانات:
شغّل هذا الملف في Supabase SQL Editor:
```
Database/design-system-cleanup.sql
```

هذا الملف سيقوم بـ:
- حذف جميع RLS Policies
- حذف جميع Indexes
- حذف جميع Triggers
- حذف جميع الجداول: design_projects, design_calculations, design_drawings, design_reports

### 2. حذف الملفات من المشروع:

#### ملفات قاعدة البيانات (اختياري - يمكن الاحتفاظ بها كمرجع):
- `Database/design-system-schema.sql`
- `Database/design-system-rls.sql`
- `Database/design-system-cleanup.sql` (هذا الملف)

#### مجلدات وملفات الكود:
- `app/(authenticated)/design/` (المجلد بالكامل)
  - `app/(authenticated)/design/page.tsx`
  - `app/(authenticated)/design/calculations/`
  - `app/(authenticated)/design/drawings/`
  - `app/(authenticated)/design/reports/`

- `components/design/` (المجلد بالكامل)
  - `components/design/DesignManagement.tsx`
  - `components/design/DesignProjectForm.tsx`

### 3. التحقق من الكود (إذا كان هناك إشارات متبقية):

تحقق من هذه الملفات وأزل أي إشارات لـ design:
- `components/dashboard/ModernSidebar.tsx` - أزل أي menu items لـ Design
- `app/(authenticated)/layout.tsx` - أزل أي routes لـ design
- `lib/permissionsSystem.ts` - أزل أي permissions لـ design (يبدو أنها محذوفة بالفعل)

### 4. بعد الحذف:
1. شغّل `design-system-cleanup.sql` في Supabase
2. احذف المجلدات والملفات المذكورة أعلاه
3. حدّث المتصفح (F5)
4. تحقق من عدم وجود أخطاء في Console

---

## ملاحظات:
- ملفات `designation-rates` و `IDCardDesigner` **لا يجب حذفها** - هذه مختلفة عن نظام Design
- احتفظ بنسخة احتياطية قبل الحذف إذا كنت تريد استرجاع البيانات لاحقاً


