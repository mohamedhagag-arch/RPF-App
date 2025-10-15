# 🛠️ نظام الإعدادات المتقدم - دليل شامل
# Advanced Settings System - Comprehensive Guide

---

## 🎯 نظرة عامة / Overview

تم إنشاء نظام إعدادات متقدم وشامل يتكامل مع قاعدة البيانات Supabase ويوفر إدارة كاملة لجميع الإعدادات في التطبيق.

A comprehensive and advanced settings system has been created that integrates with Supabase database and provides complete management of all application settings.

---

## 🏗️ البنية التقنية / Technical Architecture

### 1. قاعدة البيانات / Database

#### الجداول الرئيسية / Main Tables:

**`system_settings`** - إعدادات النظام العامة
- `setting_key` - مفتاح الإعداد (فريد)
- `setting_value` - قيمة الإعداد (JSONB)
- `setting_type` - نوع الإعداد (string, number, boolean, json)
- `category` - فئة الإعداد (general, security, notifications, backup, ui)
- `is_public` - هل يمكن لجميع المستخدمين رؤيته
- `requires_restart` - هل يحتاج إعادة تشغيل التطبيق

**`user_preferences`** - تفضيلات المستخدم الشخصية
- `user_id` - معرف المستخدم
- `preference_key` - مفتاح التفضيل
- `preference_value` - قيمة التفضيل
- `category` - فئة التفضيل (personal, ui, notifications, privacy)

**`notification_settings`** - إعدادات الإشعارات
- `user_id` - معرف المستخدم
- `notification_type` - نوع الإشعار (email, push, in_app, sms)
- `notification_category` - فئة الإشعار (project_updates, kpi_alerts, system_messages, security)
- `is_enabled` - هل مفعل
- `frequency` - التكرار (immediate, daily, weekly, never)
- `quiet_hours_start/end` - ساعات الهدوء
- `quiet_days` - أيام الهدوء

**`security_settings`** - إعدادات الأمان
- `setting_key` - مفتاح الإعداد
- `setting_value` - قيمة الإعداد
- `risk_level` - مستوى المخاطر (low, medium, high, critical)
- `requires_admin` - هل يحتاج صلاحيات مدير

**`backup_settings`** - إعدادات النسخ الاحتياطي
- `backup_type` - نوع النسخ (full, incremental, selective)
- `frequency` - التكرار (daily, weekly, monthly, manual)
- `retention_days` - فترة الاحتفاظ بالأيام
- `compression/encryption` - الضغط والتشفير
- `storage_location` - موقع التخزين

**`settings_audit_log`** - سجل مراجعة التغييرات
- `user_id` - المستخدم الذي قام بالتغيير
- `action` - نوع العملية (create, update, delete)
- `table_name` - اسم الجدول
- `old_values/new_values` - القيم القديمة والجديدة

### 2. المكونات / Components

#### `SystemSettingsManager.tsx`
- إدارة إعدادات النظام العامة
- واجهة شاملة مع فئات منظمة
- دعم أنواع مختلفة من الإعدادات
- حماية الإعدادات الحساسة

#### `UserPreferencesManager.tsx`
- إدارة تفضيلات المستخدم الشخصية
- دعم الثيمات والألوان
- إعدادات الواجهة
- تفضيلات اللغة والمنطقة الزمنية

#### `NotificationSettingsManager.tsx`
- إدارة شاملة للإشعارات
- دعم أنواع متعددة من الإشعارات
- ساعات وأيام الهدوء
- تكرار مخصص

#### `SettingsPage.tsx`
- الصفحة الرئيسية للإعدادات
- تبويبات منظمة حسب الصلاحيات
- تكامل مع جميع المكونات

### 3. إدارة الإعدادات / Settings Management

#### `settingsManager.ts`
- فئة مركزية لإدارة الإعدادات
- تخزين مؤقت ذكي
- دوال مساعدة شاملة
- معالجة الأخطاء

#### `settingsIntegration.ts`
- React Hooks للاستخدام السهل
- تكامل مع الواجهة
- إدارة الحالة
- تحديثات تلقائية

---

## 🚀 كيفية الاستخدام / How to Use

### 1. إعداد قاعدة البيانات / Database Setup

```sql
-- تشغيل ملف إنشاء الجداول
\i Database/settings-tables.sql
```

### 2. استخدام Hooks في المكونات / Using Hooks in Components

```tsx
import { useTheme, useLanguage, useSidebarState } from '@/lib/settingsIntegration'

function MyComponent() {
  const { themeMode, setTheme } = useTheme()
  const { language, setLanguage } = useLanguage()
  const { collapsed, toggleSidebar } = useSidebarState()

  return (
    <div>
      <button onClick={() => setTheme('dark')}>Dark Theme</button>
      <button onClick={toggleSidebar}>Toggle Sidebar</button>
    </div>
  )
}
```

### 3. إدارة الإعدادات برمجياً / Programmatic Settings Management

```tsx
import { settingsManager } from '@/lib/settingsManager'

// الحصول على إعداد
const appName = await settingsManager.getSystemSetting('app_name')

// تحديث إعداد
await settingsManager.setSystemSetting('app_name', 'New App Name')

// الحصول على تفضيل مستخدم
const theme = await settingsManager.getUserPreference('theme_mode')

// تحديث تفضيل مستخدم
await settingsManager.setUserPreference('theme_mode', 'dark')
```

### 4. إدارة الإشعارات / Notification Management

```tsx
import { useNotificationSettings } from '@/lib/settingsIntegration'

function NotificationComponent() {
  const { settings, updateNotificationSetting } = useNotificationSettings()

  const handleToggle = async () => {
    await updateNotificationSetting('email', 'project_updates', {
      is_enabled: !isEnabled
    })
  }

  return (
    <button onClick={handleToggle}>
      Toggle Email Notifications
    </button>
  )
}
```

---

## 🔧 الميزات المتقدمة / Advanced Features

### 1. التخزين المؤقت الذكي / Smart Caching
- تخزين مؤقت لمدة 5 دقائق
- إدارة تلقائية للذاكرة
- إحصائيات الاستخدام

### 2. مراجعة التغييرات / Change Auditing
- تسجيل جميع التغييرات
- معلومات المستخدم والوقت
- عنوان IP والمتصفح

### 3. الأمان المتقدم / Advanced Security
- Row Level Security (RLS)
- صلاحيات محددة
- حماية الإعدادات الحساسة

### 4. التصدير والاستيراد / Export/Import
- تصدير جميع الإعدادات
- استيراد من ملفات JSON
- نسخ احتياطية شاملة

---

## 📊 الإعدادات الافتراضية / Default Settings

### إعدادات النظام / System Settings
```json
{
  "app_name": "AlRabat RPF",
  "company_name": "AlRabat RPF",
  "company_slogan": "Masters of Foundation Construction",
  "default_language": "en",
  "default_timezone": "UTC",
  "session_timeout": 30,
  "max_login_attempts": 5,
  "auto_save_interval": 30,
  "max_file_size_mb": 10,
  "theme_mode": "system",
  "enable_notifications": true,
  "backup_frequency": "daily"
}
```

### تفضيلات المستخدم / User Preferences
```json
{
  "theme_mode": "system",
  "language": "en",
  "timezone": "UTC",
  "sidebar_collapsed": false,
  "compact_mode": false,
  "show_tooltips": true,
  "enable_sounds": true,
  "enable_animations": true
}
```

### إعدادات الإشعارات / Notification Settings
```json
{
  "email_project_updates": true,
  "email_kpi_alerts": true,
  "email_system_messages": true,
  "email_security": true,
  "in_app_project_updates": true,
  "in_app_kpi_alerts": true,
  "in_app_system_messages": true,
  "in_app_security": true
}
```

---

## 🔐 الأمان والصلاحيات / Security & Permissions

### صلاحيات القراءة / Read Permissions
- **جميع المستخدمين**: يمكنهم قراءة الإعدادات العامة
- **المديرين فقط**: يمكنهم قراءة الإعدادات الخاصة

### صلاحيات الكتابة / Write Permissions
- **المستخدمون**: يمكنهم تعديل تفضيلاتهم الشخصية فقط
- **المديرون**: يمكنهم تعديل جميع الإعدادات

### حماية البيانات الحساسة / Sensitive Data Protection
- كلمات المرور مشفرة
- إعدادات الأمان محمية
- تسجيل جميع التغييرات

---

## 📈 الأداء والتحسين / Performance & Optimization

### 1. التخزين المؤقت / Caching
- تخزين مؤقت للاستعلامات المتكررة
- انتهاء صلاحية تلقائي
- إدارة ذكية للذاكرة

### 2. الاستعلامات المحسنة / Optimized Queries
- فهارس على المفاتيح المهمة
- استعلامات مجمعة
- تحميل تدريجي

### 3. معالجة الأخطاء / Error Handling
- معالجة شاملة للأخطاء
- رسائل واضحة للمستخدم
- استرداد تلقائي

---

## 🔄 التكامل مع التطبيق / Application Integration

### 1. Provider Pattern
```tsx
import { SettingsProvider } from '@/lib/settingsIntegration'

function App() {
  return (
    <SettingsProvider>
      <YourApp />
    </SettingsProvider>
  )
}
```

### 2. Theme Integration
```tsx
import { useTheme } from '@/lib/settingsIntegration'

function App() {
  const { themeMode } = useTheme()
  
  return (
    <div className={themeMode === 'dark' ? 'dark' : 'light'}>
      <YourApp />
    </div>
  )
}
```

### 3. Notification Integration
```tsx
import { useNotificationSettings } from '@/lib/settingsIntegration'

function NotificationService() {
  const { settings } = useNotificationSettings()
  
  const sendNotification = (type, category, message) => {
    const setting = settings.find(s => 
      s.notification_type === type && 
      s.notification_category === category
    )
    
    if (setting?.is_enabled) {
      // Send notification
    }
  }
}
```

---

## 🛠️ الصيانة والتطوير / Maintenance & Development

### 1. إضافة إعدادات جديدة / Adding New Settings
```tsx
// إضافة إعداد نظام جديد
await settingsManager.setSystemSetting(
  'new_setting_key',
  'default_value',
  'string',
  'Description of the setting',
  'category',
  false
)

// إضافة تفضيل مستخدم جديد
await settingsManager.setUserPreference(
  'new_preference_key',
  'default_value',
  'string',
  'personal'
)
```

### 2. إضافة أنواع إعدادات جديدة / Adding New Setting Types
```tsx
// في settingsManager.ts
const renderSettingInput = (setting: SystemSetting) => {
  switch (setting.setting_type) {
    case 'new_type':
      return <NewTypeInput setting={setting} />
    // ... existing cases
  }
}
```

### 3. إضافة فئات جديدة / Adding New Categories
```tsx
// في SystemSettingsManager.tsx
const categories = [
  // ... existing categories
  { id: 'new_category', name: 'New Category', icon: NewIcon, color: 'purple' }
]
```

---

## 📝 أمثلة عملية / Practical Examples

### 1. إدارة الثيم / Theme Management
```tsx
function ThemeToggle() {
  const { themeMode, setTheme } = useTheme()
  
  return (
    <div className="flex space-x-2">
      <button 
        onClick={() => setTheme('light')}
        className={themeMode === 'light' ? 'active' : ''}
      >
        Light
      </button>
      <button 
        onClick={() => setTheme('dark')}
        className={themeMode === 'dark' ? 'active' : ''}
      >
        Dark
      </button>
      <button 
        onClick={() => setTheme('system')}
        className={themeMode === 'system' ? 'active' : ''}
      >
        System
      </button>
    </div>
  )
}
```

### 2. إدارة الشريط الجانبي / Sidebar Management
```tsx
function SidebarToggle() {
  const { collapsed, toggleSidebar } = useSidebarState()
  
  return (
    <button 
      onClick={toggleSidebar}
      className="p-2 rounded-lg hover:bg-gray-100"
    >
      {collapsed ? <ChevronRight /> : <ChevronLeft />}
    </button>
  )
}
```

### 3. إدارة الإشعارات / Notification Management
```tsx
function NotificationToggle() {
  const { settings, updateNotificationSetting } = useNotificationSettings()
  
  const emailSetting = settings.find(s => 
    s.notification_type === 'email' && 
    s.notification_category === 'project_updates'
  )
  
  const handleToggle = async () => {
    await updateNotificationSetting('email', 'project_updates', {
      is_enabled: !emailSetting?.is_enabled
    })
  }
  
  return (
    <button 
      onClick={handleToggle}
      className={`p-2 rounded-lg ${
        emailSetting?.is_enabled ? 'bg-green-100' : 'bg-gray-100'
      }`}
    >
      {emailSetting?.is_enabled ? <Bell /> : <BellOff />}
    </button>
  )
}
```

---

## 🎉 الخلاصة / Conclusion

تم إنشاء نظام إعدادات شامل ومتقدم يوفر:

✅ **إدارة كاملة** لجميع الإعدادات في التطبيق
✅ **تكامل مع قاعدة البيانات** Supabase
✅ **أمان متقدم** مع صلاحيات محددة
✅ **واجهة سهلة الاستخدام** مع تبويبات منظمة
✅ **تخزين مؤقت ذكي** لتحسين الأداء
✅ **مراجعة التغييرات** مع سجل شامل
✅ **تصدير واستيراد** للإعدادات
✅ **React Hooks** للاستخدام السهل
✅ **دعم متعدد اللغات** والثيمات
✅ **إدارة الإشعارات** المتقدمة

النظام الآن جاهز للاستخدام ويمكن توسيعه بسهولة لإضافة ميزات جديدة!

---

**تم إنشاء نظام إعدادات متقدم واحترافي! 🚀**
