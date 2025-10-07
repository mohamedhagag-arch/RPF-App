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
  activeTab: ''
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
    
    // timeout قصير للتحميل (5 ثواني بدلاً من 10)
    loadingTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        console.log(`⚠️ Tab ${tabName}: Loading timeout, forcing stop`)
        // لا نفعل أي شيء هنا، فقط نسجل
      }
    }, 5000)
    
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
    setLoading(true)
    
    // تنظيف timeout السابق
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current)
    }
    
    // timeout قصير للتحميل
    loadingTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        console.log(`⚠️ Tab ${tabName}: Loading timeout, forcing stop`)
        setLoading(false)
      }
    }, 5000)
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
    timeSinceLastNavigation: Date.now() - globalLoadingState.lastNavigation
  }
}

/**
 * إعادة تعيين حالة التنقل
 */
export function resetNavigationState() {
  globalLoadingState = {
    isNavigating: false,
    lastNavigation: Date.now(),
    activeTab: ''
  }
  console.log('🔄 Navigation state reset')
}
