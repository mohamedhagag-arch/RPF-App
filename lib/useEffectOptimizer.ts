/**
 * useEffect Optimizer
 * 
 * Provides optimized useEffect hooks that prevent infinite loops
 * and connection issues that cause "Syncing..." problems.
 */

import { useEffect, useRef, useCallback } from 'react'
import { useSupabaseClient } from './useSupabaseClient'
import { useLoadingStateManager } from './loadingStateManager'

/**
 * Optimized useEffect for data fetching that prevents infinite loops
 * and automatically manages loading states
 */
export function useOptimizedDataFetch<T>(
  fetchFunction: (supabase: any) => Promise<T>,
  dependencies: any[] = [],
  options: {
    enabled?: boolean
    onSuccess?: (data: T) => void
    onError?: (error: any) => void
    timeout?: number
  } = {}
) {
  const { enabled = true, onSuccess, onError, timeout = 30000 } = options
  const supabase = useSupabaseClient()
  const loadingManager = useLoadingStateManager({ timeout })
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true

    if (!enabled) return

    const fetchData = async () => {
      try {
        loadingManager.startLoading()
        console.log('🔄 Starting optimized data fetch...')
        
        const data = await fetchFunction(supabase)
        
        if (isMountedRef.current) {
          if (onSuccess) {
            onSuccess(data)
          }
          console.log('✅ Data fetch completed successfully')
        }
      } catch (error) {
        console.error('❌ Data fetch failed:', error)
        if (isMountedRef.current && onError) {
          onError(error)
        }
      } finally {
        if (isMountedRef.current) {
          loadingManager.stopLoading()
        }
      }
    }

    fetchData()

    return () => {
      isMountedRef.current = false
      loadingManager.cleanup()
    }
    // ✅ SAFE DEPENDENCIES: Only include actual dependencies, not supabase
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies)

  return {
    isMounted: () => isMountedRef.current,
    ...loadingManager
  }
}

/**
 * Optimized useEffect for Supabase queries that prevents connection issues
 */
export function useSupabaseQuery<T>(
  queryFunction: (supabase: any) => Promise<{ data: T | null; error: any }>,
  dependencies: any[] = [],
  options: {
    enabled?: boolean
    onSuccess?: (data: T) => void
    onError?: (error: any) => void
  } = {}
) {
  const { enabled = true, onSuccess, onError } = options
  const supabase = useSupabaseClient()
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true

    if (!enabled) return

    const executeQuery = async () => {
      try {
        console.log('🔄 Executing Supabase query...')
        
        const { data, error } = await queryFunction(supabase)
        
        if (error) {
          console.error('❌ Supabase query error:', error)
          if (isMountedRef.current && onError) {
            onError(error)
          }
          return
        }

        if (isMountedRef.current && data && onSuccess) {
          onSuccess(data)
          console.log('✅ Supabase query completed successfully')
        }
      } catch (error) {
        console.error('❌ Supabase query exception:', error)
        if (isMountedRef.current && onError) {
          onError(error)
        }
      }
    }

    executeQuery()

    return () => {
      isMountedRef.current = false
    }
    // ✅ SAFE DEPENDENCIES: Only include actual dependencies, not supabase
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies)

  return {
    isMounted: () => isMountedRef.current
  }
}

export default useOptimizedDataFetch
