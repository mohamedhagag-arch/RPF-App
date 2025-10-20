/**
 * Ultra Fast Loading - تحميل فائق السرعة
 * 
 * نظام تحميل متقدم مع تحسينات الأداء القصوى
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { fastQueryExecutor } from './fastConnectionManager'

// ✅ Loading states
export type LoadingState = 'idle' | 'loading' | 'success' | 'error'

export interface UltraLoadingOptions {
  preload?: boolean
  cache?: boolean
  timeout?: number
  retries?: number
  batchSize?: number
  debounceMs?: number
}

export interface UltraLoadingResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  state: LoadingState
  retry: () => void
  refresh: () => void
}

// ✅ Ultra fast loading hook
export function useUltraFastLoading<T>(
  queryKey: string,
  queryFn: () => Promise<{ data: T | null; error: any }>,
  options: UltraLoadingOptions = {}
): UltraLoadingResult<T> {
  const {
    preload = true,
    cache = true,
    timeout = 8000,
    retries = 2,
    batchSize = 25,
    debounceMs = 300
  } = options

  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [state, setState] = useState<LoadingState>('idle')
  
  const retryCountRef = useRef(0)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)

  // ✅ Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  // ✅ Execute query with optimizations
  const executeQuery = useCallback(async () => {
    if (!isMountedRef.current) return

    setLoading(true)
    setError(null)
    setState('loading')

    try {
      const result = await fastQueryExecutor.execute(
        queryKey,
        queryFn,
        { cache, timeout }
      )

      if (!isMountedRef.current) return

      if (result.error) {
        throw result.error
      }

      setData(result.data)
      setState('success')
      retryCountRef.current = 0

    } catch (err: any) {
      if (!isMountedRef.current) return

      const errorMessage = err.message || 'Unknown error'
      setError(errorMessage)
      setState('error')

      // Auto-retry logic
      if (retryCountRef.current < retries) {
        retryCountRef.current++
        console.log(`🔄 Auto-retry ${retryCountRef.current}/${retries} for: ${queryKey}`)
        
        setTimeout(() => {
          if (isMountedRef.current) {
            executeQuery()
          }
        }, 1000 * retryCountRef.current) // Exponential backoff
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [queryKey, queryFn, cache, timeout, retries])

  // ✅ Debounced execution
  const debouncedExecute = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      executeQuery()
    }, debounceMs)
  }, [executeQuery, debounceMs])

  // ✅ Retry function
  const retry = useCallback(() => {
    retryCountRef.current = 0
    executeQuery()
  }, [executeQuery])

  // ✅ Refresh function
  const refresh = useCallback(() => {
    fastQueryExecutor.clearCache()
    retry()
  }, [retry])

  // ✅ Auto-execute on mount
  useEffect(() => {
    if (preload) {
      debouncedExecute()
    }
  }, [preload, debouncedExecute])

  return {
    data,
    loading,
    error,
    state,
    retry,
    refresh
  }
}

// ✅ Batch loading hook
export function useBatchLoading<T>(
  queries: Array<{
    key: string
    query: () => Promise<{ data: T | null; error: any }>
  }>,
  options: UltraLoadingOptions = {}
) {
  const [results, setResults] = useState<Array<{ data: T | null; error: string | null }>>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const executeBatch = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const batchQueries = queries.map(({ key, query }) => ({
        key,
        query: () => query()
      }))

      const results = await fastQueryExecutor.batchExecute(batchQueries)
      
      setResults(results.map(result => ({
        data: result.data,
        error: result.error?.message || null
      })))

    } catch (err: any) {
      setError(err.message || 'Batch execution failed')
    } finally {
      setLoading(false)
    }
  }, [queries])

  useEffect(() => {
    executeBatch()
  }, [executeBatch])

  return {
    results,
    loading,
    error,
    retry: executeBatch
  }
}

// ✅ Preloader for critical data
export class CriticalDataPreloader {
  private static instance: CriticalDataPreloader
  private preloadedData = new Map<string, any>()
  private isPreloading = false

  static getInstance(): CriticalDataPreloader {
    if (!CriticalDataPreloader.instance) {
      CriticalDataPreloader.instance = new CriticalDataPreloader()
    }
    return CriticalDataPreloader.instance
  }

  /**
   * Preload critical data on app start
   */
  async preloadCriticalData(): Promise<void> {
    if (this.isPreloading) return

    this.isPreloading = true
    console.log('🚀 Preloading critical data...')

    const criticalQueries = [
      {
        key: 'projects_count',
        query: () => fastQueryExecutor.execute(
          'projects_count',
          async (client) => {
            const { count, error } = await client
              .from('Planning Database - ProjectsList')
              .select('*', { count: 'exact', head: true })
            return { data: count, error }
          },
          { cache: true, timeout: 5000 }
        )
      },
      {
        key: 'activities_count',
        query: () => fastQueryExecutor.execute(
          'activities_count',
          async (client) => {
            const { count, error } = await client
              .from('Planning Database - BOQ Rates')
              .select('*', { count: 'exact', head: true })
            return { data: count, error }
          },
          { cache: true, timeout: 5000 }
        )
      },
      {
        key: 'kpi_count',
        query: () => fastQueryExecutor.execute(
          'kpi_count',
          async (client) => {
            const { count, error } = await client
              .from('Planning Database - KPI')
              .select('*', { count: 'exact', head: true })
            return { data: count, error }
          },
          { cache: true, timeout: 5000 }
        )
      }
    ]

    try {
      await Promise.allSettled(
        criticalQueries.map(async ({ key, query }) => {
          try {
            const result = await query()
            if (result.data) {
              this.preloadedData.set(key, result.data)
              console.log(`✅ Preloaded: ${key} = ${result.data}`)
            }
          } catch (error) {
            console.warn(`⚠️ Failed to preload: ${key}`, error)
          }
        })
      )
    } finally {
      this.isPreloading = false
      console.log('🎉 Critical data preloading completed')
    }
  }

  /**
   * Get preloaded data
   */
  getPreloadedData(key: string): any {
    return this.preloadedData.get(key)
  }

  /**
   * Clear preloaded data
   */
  clearPreloadedData(): void {
    this.preloadedData.clear()
    console.log('🧹 Preloaded data cleared')
  }
}

// ✅ Export singleton
export const criticalDataPreloader = CriticalDataPreloader.getInstance()

// ✅ Auto-preload on module load
if (typeof window !== 'undefined') {
  // Only preload in browser environment
  setTimeout(() => {
    criticalDataPreloader.preloadCriticalData()
  }, 500)
}
