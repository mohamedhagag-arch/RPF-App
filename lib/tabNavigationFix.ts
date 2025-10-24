/**
 * Tab Navigation Fix - إصلاح مشكلة التنقل بين التابات
 * 
 * هذا الملف يحل مشكلة "Syncing..." عند التنقل بين التابات
 */

import { useEffect, useRef } from 'react'

// ✅ تتبع حالة التحميل العامة
let globalLoadingState = {
  isNavigating: false,
  lastNavigation: Date.now(),
  activeTab: '',
  loadingTabs: new Set<string>() // تتبع التابات التي تحمل حالياً
}

/**
 * Hook لإصلاح مشكلة التنقل بين التابات
 */
export function useTabNavigationFix(tabName: string) {
  const isMountedRef = useRef(true)
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  useEffect(() => {
    isMountedRef.current = true
    
    // تحديث التاب النشط
    globalLoadingState.activeTab = tabName
    globalLoadingState.lastNavigation = Date.now()
    
    console.log(`🔄 Tab navigation: ${tabName}`)
    
    // تنظيف timeout السابق
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current)
    }
    
    // timeout معقول للتحميل (15 ثانية)
    loadingTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        console.log(`⚠️ Tab ${tabName}: Loading timeout after 15s, this might indicate a slow connection`)
        // لا نفعل أي شيء هنا، فقط نسجل للتحقق
      }
    }, 15000)
    
    return () => {
      isMountedRef.current = false
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current)
        loadingTimeoutRef.current = null
      }
    }
  }, [tabName])
  
  /**
   * إيقاف التحميل بأمان
   */
  const stopLoading = (setLoading: (loading: boolean) => void) => {
    // إزالة التاب من قائمة التحميل
    globalLoadingState.loadingTabs.delete(tabName)
    
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current)
      loadingTimeoutRef.current = null
    }
    setLoading(false)
  }
  
  /**
   * بدء التحميل بأمان
   */
  const startLoading = (setLoading: (loading: boolean) => void) => {
    // إضافة التاب لقائمة التحميل
    globalLoadingState.loadingTabs.add(tabName)
    
    setLoading(true)
    
    // تنظيف timeout السابق
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current)
    }
    
    // timeout معقول للتحميل
    loadingTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        console.log(`⚠️ Tab ${tabName}: Loading timeout after 15s, forcing stop`)
        setLoading(false)
        globalLoadingState.loadingTabs.delete(tabName)
      }
    }, 15000)
  }
  
  return {
    stopLoading,
    startLoading,
    isMounted: () => isMountedRef.current
  }
}

/**
 * الحصول على حالة التنقل العامة
 */
export function getNavigationState() {
  return {
    ...globalLoadingState,
    timeSinceLastNavigation: Date.now() - globalLoadingState.lastNavigation,
    loadingTabsCount: globalLoadingState.loadingTabs.size,
    loadingTabsList: Array.from(globalLoadingState.loadingTabs)
  }
}

/**
 * إعادة تعيين حالة التنقل
 */
export function resetNavigationState() {
  globalLoadingState = {
    isNavigating: false,
    lastNavigation: Date.now(),
    activeTab: '',
    loadingTabs: new Set<string>()
  }
  console.log('🔄 Navigation state reset')
}
