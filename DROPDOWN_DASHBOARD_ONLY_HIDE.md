# 🎯 إخفاء شريط المستخدم فقط في صفحة Dashboard

## 🎯 المطلوب
شريط المستخدم يختفي عند الـ scroll فقط في صفحة Dashboard، أما في باقي الصفحات فيبقى ظاهر.

## ✅ الحل المطبق

### 1. **إضافة Prop للتحكم في الإخفاء**
```typescript
// components/ui/UserDropdown.tsx
interface UserDropdownProps {
  userName: string
  userRole: string
  onProfileClick: () => void
  onSettingsClick: () => void
  onSignOut: () => void
  hideOnScroll?: boolean // New prop to control scroll hiding
}
```

### 2. **تطبيق الـ Prop في الـ Component**
```typescript
export function UserDropdown({ 
  userName, 
  userRole, 
  onProfileClick, 
  onSettingsClick, 
  onSignOut,
  hideOnScroll = false // Default to false
}: UserDropdownProps) {
```

### 3. **شرط إضافة Scroll Listener**
```typescript
// Handle scroll to hide/show user button (only if hideOnScroll is true)
useEffect(() => {
  if (!hideOnScroll) return // Don't add scroll listener if hideOnScroll is false

  function handleScroll() {
    const currentScrollY = window.scrollY
    const isScrolled = currentScrollY > 50 // Hide after 50px scroll
    
    setScrollState(prev => ({
      isScrolled,
      lastScrollY: currentScrollY
    }))

    // Close dropdown when scrolling
    if (isOpen) {
      setIsOpen(false)
    }
  }

  window.addEventListener('scroll', handleScroll, { passive: true })
  return () => {
    window.removeEventListener('scroll', handleScroll)
  }
}, [isOpen, hideOnScroll])
```

### 4. **شرط تطبيق الـ CSS Classes**
```typescript
<div className={cn(
  "relative z-[99999] dropdown-container inline-block",
  hideOnScroll && scrollState.isScrolled ? "hidden" : "visible"
)} ref={dropdownRef}>
```

### 5. **تمرير الـ Prop من الـ Layout**
```typescript
// app/(authenticated)/layout.tsx
// Check if current page is dashboard
const isDashboardPage = pathname === '/dashboard'

<UserDropdown
  userName={appUser?.full_name || user?.email || 'User'}
  userRole={appUser?.role || 'viewer'}
  onProfileClick={handleProfileClick}
  onSettingsClick={handleSettingsClick}
  onSignOut={handleSignOut}
  hideOnScroll={isDashboardPage} // Only hide on scroll in dashboard page
/>
```

## 🎨 المزايا

### 1. **تحكم دقيق في السلوك**
- شريط المستخدم يختفي فقط في Dashboard
- يبقى ظاهر في جميع الصفحات الأخرى
- لا توجد تأثيرات غير مرغوبة

### 2. **أداء محسن**
- Scroll listener يُضاف فقط عند الحاجة
- لا توجد listeners غير ضرورية في الصفحات الأخرى
- تحسين الأداء العام

### 3. **مرونة في الاستخدام**
- يمكن التحكم في السلوك حسب الصفحة
- إمكانية إضافة المزيد من الصفحات لاحقاً
- سهولة الصيانة والتطوير

## 🧪 السلوك المتوقع

### ✅ في صفحة Dashboard:
- شريط المستخدم يختفي عند الـ scroll
- يظهر مرة أخرى عند العودة للأعلى
- القائمة المنسدلة تُغلق عند الـ scroll

### ✅ في باقي الصفحات (Projects, BOQ, KPI, etc.):
- شريط المستخدم يبقى ظاهر دائماً
- لا يختفي عند الـ scroll
- يعمل بشكل طبيعي

## 🔄 الملفات المحدثة

1. **components/ui/UserDropdown.tsx**
   - إضافة `hideOnScroll` prop
   - شرط إضافة scroll listener
   - شرط تطبيق CSS classes

2. **app/(authenticated)/layout.tsx**
   - إضافة `isDashboardPage` check
   - تمرير `hideOnScroll` prop

## 🎯 الاختبار

### في صفحة Dashboard:
1. افتح صفحة Dashboard
2. شريط المستخدم مرئي
3. ابدأ في الـ scroll لأسفل
4. لاحظ أن شريط المستخدم يختفي تدريجياً
5. عند العودة للأعلى، يظهر مرة أخرى

### في باقي الصفحات:
1. افتح أي صفحة أخرى (Projects, BOQ, KPI, etc.)
2. شريط المستخدم مرئي
3. ابدأ في الـ scroll لأسفل
4. لاحظ أن شريط المستخدم يبقى ظاهر
5. لا يختفي عند الـ scroll

## 🚀 الضمان

هذا الحل يضمن:
- **إخفاء شريط المستخدم فقط في Dashboard**
- **بقاء شريط المستخدم ظاهر في باقي الصفحات**
- **أداء محسن** (لا توجد listeners غير ضرورية)
- **مرونة في الاستخدام**

---

**تاريخ الإصلاح:** 2025-01-27  
**الحالة:** ✅ مكتمل  
**الاختبار:** ✅ جاهز للاختبار

## 🎉 الحل المثالي!

الآن شريط المستخدم يختفي عند الـ scroll فقط في صفحة Dashboard، ويبقى ظاهر في باقي الصفحات! 🚀
