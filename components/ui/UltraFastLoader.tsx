'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useUltraFastLoading } from '@/lib/ultraFastLoading'
import { fastQueryExecutor } from '@/lib/fastConnectionManager'
import { LoadingSpinner } from './LoadingSpinner'

interface UltraFastLoaderProps {
  queryKey: string
  queryFn: () => Promise<{ data: any; error: any }>
  children: (data: any, loading: boolean, error: string | null) => React.ReactNode
  fallback?: React.ReactNode
  preload?: boolean
  cache?: boolean
  timeout?: number
  retries?: number
  debounceMs?: number
}

export function UltraFastLoader({
  queryKey,
  queryFn,
  children,
  fallback,
  preload = true,
  cache = true,
  timeout = 8000,
  retries = 2,
  debounceMs = 300
}: UltraFastLoaderProps) {
  const { data, loading, error, state, retry, refresh } = useUltraFastLoading(
    queryKey,
    queryFn,
    {
      preload,
      cache,
      timeout,
      retries,
      debounceMs
    }
  )

  // ✅ Auto-retry on error
  useEffect(() => {
    if (state === 'error' && retries > 0) {
      const timer = setTimeout(() => {
        retry()
      }, 2000)
      
      return () => clearTimeout(timer)
    }
  }, [state, retries, retry])

  // ✅ Loading state with timeout
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Loading data...
          </p>
        </div>
      </div>
    )
  }

  // ✅ Error state with retry option
  if (state === 'error') {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="mb-4 text-red-500">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
          Failed to load data
        </h3>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          {error || 'An unexpected error occurred'}
        </p>
        <div className="flex gap-2">
          <button
            onClick={retry}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Retry
          </button>
          <button
            onClick={refresh}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Refresh
          </button>
        </div>
      </div>
    )
  }

  // ✅ Success state
  if (state === 'success' && data) {
    return <>{children(data, false, null)}</>
  }

  // ✅ Fallback for no data
  if (fallback) {
    return <>{fallback}</>
  }

  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          No data available
        </p>
      </div>
    </div>
  )
}

// ✅ Batch loader component
interface BatchLoaderProps {
  queries: Array<{
    key: string
    query: () => Promise<{ data: any; error: any }>
  }>
  children: (results: Array<{ data: any; error: string | null }>, loading: boolean, error: string | null) => React.ReactNode
  fallback?: React.ReactNode
}

export function BatchLoader({ queries, children, fallback }: BatchLoaderProps) {
  const [results, setResults] = useState<Array<{ data: any; error: string | null }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const executeBatch = useCallback(async () => {
    if (!isMountedRef.current) return

    setLoading(true)
    setError(null)

    try {
      const batchQueries = queries.map(({ key, query }) => ({
        key,
        query: () => query()
      }))

      const results = await fastQueryExecutor.batchExecute(batchQueries)
      
      if (isMountedRef.current) {
        setResults(results.map(result => ({
          data: result.data,
          error: result.error?.message || null
        })))
      }

    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err.message || 'Batch execution failed')
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [queries])

  useEffect(() => {
    executeBatch()
  }, [executeBatch])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Loading batch data...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="mb-4 text-red-500">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
          Failed to load batch data
        </h3>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          {error}
        </p>
        <button
          onClick={executeBatch}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Retry
        </button>
      </div>
    )
  }

  return <>{children(results, false, null)}</>
}

// ✅ Performance monitor component
export function PerformanceMonitor() {
  const [stats, setStats] = useState<any>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const updateStats = () => {
      const connectionStats = fastQueryExecutor.getCacheStats()
      setStats(connectionStats)
    }

    updateStats()
    const interval = setInterval(updateStats, 5000)

    return () => clearInterval(interval)
  }, [])

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50 p-2 text-xs bg-gray-800 text-white rounded-full hover:bg-gray-700"
        title="Show Performance Stats"
      >
        📊
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 p-4 bg-gray-900 text-white rounded-lg shadow-lg max-w-xs">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">Performance Stats</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white"
        >
          ×
        </button>
      </div>
      
      {stats && (
        <div className="space-y-1 text-xs">
          <div>Cache Size: {stats.size}/{stats.maxSize}</div>
          <div>TTL: {stats.ttl}ms</div>
          <div>Memory: {Math.round((performance as any).memory?.usedJSHeapSize / 1024 / 1024) || 0}MB</div>
        </div>
      )}
      
      <button
        onClick={() => fastQueryExecutor.clearCache()}
        className="mt-2 w-full px-2 py-1 text-xs bg-red-600 rounded hover:bg-red-700"
      >
        Clear Cache
      </button>
    </div>
  )
}
