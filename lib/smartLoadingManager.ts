/**
 * Smart Loading Manager - مدير التحميل الذكي
 * 
 * هذا الملف يدير التحميل بطريقة ذكية لتجنب timeout
 */

import { useRef, useEffect } from 'react'

// ✅ تتبع الاستعلامات البطيئة
let slowQueries = new Set<string>()

/**
 * Hook لإدارة التحميل الذكي
 */
export function useSmartLoading(tabName: string) {
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)
  
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current)
      }
    }
  }, [])
  
  /**
   * بدء التحميل مع timeout ذكي
   */
  const startSmartLoading = (setLoading: (loading: boolean) => void) => {
    setLoading(true)
    
    // تنظيف timeout السابق
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current)
    }
    
    // timeout ذكي بناءً على التاب
    const timeout = getSmartTimeout(tabName)
    
    loadingTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        console.log(`⚠️ Tab ${tabName}: Smart timeout after ${timeout/1000}s`)
        setLoading(false)
        slowQueries.add(tabName)
      }
    }, timeout)
  }
  
  /**
   * إيقاف التحميل الذكي
   */
  const stopSmartLoading = (setLoading: (loading: boolean) => void) => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current)
      loadingTimeoutRef.current = null
    }
    
    // إزالة من الاستعلامات البطيئة إذا اكتمل بنجاح
    if (slowQueries.has(tabName)) {
      slowQueries.delete(tabName)
      console.log(`✅ Tab ${tabName}: Query completed successfully`)
    }
    
    setLoading(false)
  }
  
  return {
    startSmartLoading,
    stopSmartLoading,
    isMounted: () => isMountedRef.current
  }
}

/**
 * الحصول على timeout ذكي بناءً على التاب
 */
function getSmartTimeout(tabName: string): number {
  // إذا كان التاب معروف بالبطء، أعطيه وقت أكثر
  if (slowQueries.has(tabName)) {
    return 30000 // 30 ثانية للاستعلامات البطيئة
  }
  
  // timeout عادي حسب نوع التاب
  switch (tabName) {
    case 'projects':
      return 20000 // 20 ثانية للمشاريع
    case 'boq':
      return 25000 // 25 ثانية للـ BOQ (أكبر)
    case 'kpi':
      return 20000 // 20 ثانية للـ KPI
    default:
      return 15000 // 15 ثانية افتراضي
  }
}

/**
 * الحصول على إحصائيات التحميل
 */
export function getLoadingStats() {
  return {
    slowQueriesCount: slowQueries.size,
    slowQueriesList: Array.from(slowQueries),
    isSlowQuery: (tabName: string) => slowQueries.has(tabName)
  }
}

/**
 * إعادة تعيين الإحصائيات
 */
export function resetLoadingStats() {
  slowQueries.clear()
  console.log('🔄 Loading stats reset')
}
