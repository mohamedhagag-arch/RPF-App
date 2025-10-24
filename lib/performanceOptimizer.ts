/**
 * Performance Optimizer - محسن الأداء الشامل
 * 
 * نظام شامل لتحسين أداء التطبيق وسرعة التحميل
 */

import { getStableSupabaseClient } from './stableConnection'

// ✅ Cache Management
interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // Time to live in milliseconds
}

class PerformanceCache {
  private cache = new Map<string, CacheEntry<any>>()
  private maxSize = 100
  private defaultTTL = 5 * 60 * 1000 // 5 minutes

  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) {
        this.cache.delete(oldestKey)
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    const isExpired = Date.now() - entry.timestamp > entry.ttl
    if (isExpired) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }
}

// ✅ Global cache instance
const performanceCache = new PerformanceCache()

// ✅ Connection Pool Management
class ConnectionPool {
  private connections: Map<string, any> = new Map()
  private maxConnections = 5
  private connectionTimeout = 30000 // 30 seconds

  async getConnection(key: string): Promise<any> {
    if (this.connections.has(key)) {
      return this.connections.get(key)
    }

    if (this.connections.size >= this.maxConnections) {
      // Remove oldest connection
      const oldestKey = this.connections.keys().next().value
      if (oldestKey) {
        this.connections.delete(oldestKey)
      }
    }

    const connection = getStableSupabaseClient()
    this.connections.set(key, connection)

    // Auto-cleanup after timeout
    setTimeout(() => {
      this.connections.delete(key)
    }, this.connectionTimeout)

    return connection
  }

  clear(): void {
    this.connections.clear()
  }
}

const connectionPool = new ConnectionPool()

// ✅ Query Optimization
export interface QueryOptions {
  cache?: boolean
  cacheTTL?: number
  timeout?: number
  retries?: number
  batchSize?: number
}

export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer
  private queryCount = 0
  private slowQueries = new Set<string>()

  static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer()
    }
    return PerformanceOptimizer.instance
  }

  /**
   * Optimized query execution with caching and retry logic
   */
  async executeQuery<T>(
    queryKey: string,
    queryFn: () => Promise<{ data: T | null; error: any }>,
    options: QueryOptions = {}
  ): Promise<{ data: T | null; error: any }> {
    const {
      cache = true,
      cacheTTL = 5 * 60 * 1000, // 5 minutes
      timeout = 15000, // 15 seconds
      retries = 3,
      batchSize = 50
    } = options

    this.queryCount++

    // ✅ Check cache first
    if (cache) {
      const cachedData = performanceCache.get<T>(queryKey)
      if (cachedData) {
        console.log(`🚀 Cache hit for: ${queryKey}`)
        return { data: cachedData, error: null }
      }
    }

    // ✅ Execute query with timeout and retry logic
    const startTime = Date.now()
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`🔍 Executing query: ${queryKey} (attempt ${attempt}/${retries})`)
        
        const result = await Promise.race([
          queryFn(),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Query timeout')), timeout)
          )
        ])

        const duration = Date.now() - startTime
        
        if (result.error) {
          console.warn(`⚠️ Query error (attempt ${attempt}):`, result.error.message)
          
          // Check if it's a connection error
          const isConnectionError = this.isConnectionError(result.error)
          if (isConnectionError && attempt < retries) {
            await this.delay(1000 * attempt) // Exponential backoff
            continue
          }
          
          return result
        }

        // ✅ Cache successful results
        if (cache && result.data) {
          performanceCache.set(queryKey, result.data, cacheTTL)
          console.log(`💾 Cached result for: ${queryKey}`)
        }

        // ✅ Track slow queries
        if (duration > 5000) {
          this.slowQueries.add(queryKey)
          console.warn(`🐌 Slow query detected: ${queryKey} (${duration}ms)`)
        }

        console.log(`✅ Query completed: ${queryKey} (${duration}ms)`)
        return result

      } catch (error: any) {
        console.warn(`⚠️ Query exception (attempt ${attempt}):`, error.message)
        
        if (attempt < retries) {
          await this.delay(1000 * attempt)
          continue
        }
        
        return { data: null, error }
      }
    }

    return { data: null, error: new Error('All query attempts failed') }
  }

  /**
   * Batch data loading with pagination
   */
  async loadDataBatch<T>(
    tableName: string,
    page: number = 0,
    pageSize: number = 50,
    filters: any = {}
  ): Promise<{ data: T[]; totalCount: number; hasMore: boolean }> {
    const queryKey = `batch_${tableName}_${page}_${pageSize}_${JSON.stringify(filters)}`
    
    const result = await this.executeQuery(
      queryKey,
      async () => {
        const client = await connectionPool.getConnection(tableName)
        
        const { data, error, count } = await client
          .from(tableName)
          .select('*', { count: 'exact' })
          .range(page * pageSize, (page + 1) * pageSize - 1)
          .order('created_at', { ascending: false })

        if (error) throw error

        return {
          data: {
            data: data || [],
            totalCount: count || 0,
            hasMore: (page + 1) * pageSize < (count || 0)
          },
          error: null
        }
      },
      {
        cache: true,
        cacheTTL: 2 * 60 * 1000, // 2 minutes for batch data
        timeout: 10000
      }
    )

    return result.data || { data: [], totalCount: 0, hasMore: false }
  }

  /**
   * Preload critical data
   */
  async preloadCriticalData(): Promise<void> {
    console.log('🚀 Preloading critical data...')
    
    const criticalQueries = [
      { key: 'projects_count', query: () => this.getTableCount('Planning Database - ProjectsList') },
      { key: 'activities_count', query: () => this.getTableCount('Planning Database - BOQ Rates') },
      { key: 'kpi_count', query: () => this.getTableCount('Planning Database - KPI') }
    ]

    await Promise.allSettled(
      criticalQueries.map(async ({ key, query }) => {
        try {
          await this.executeQuery(key, query, { cache: true, cacheTTL: 10 * 60 * 1000 })
          console.log(`✅ Preloaded: ${key}`)
        } catch (error) {
          console.warn(`⚠️ Failed to preload: ${key}`, error)
        }
      })
    )
  }

  /**
   * Get table count efficiently
   */
  private async getTableCount(tableName: string): Promise<{ data: number | null; error: any }> {
    const client = await connectionPool.getConnection(tableName)
    
    const { count, error } = await client
      .from(tableName)
      .select('*', { count: 'exact', head: true })

    return { data: count, error }
  }

  /**
   * Check if error is connection-related
   */
  private isConnectionError(error: any): boolean {
    const errorMessage = error.message?.toLowerCase() || ''
    return (
      errorMessage.includes('connection') ||
      errorMessage.includes('network') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('fetch') ||
      errorMessage.includes('econnrefused') ||
      errorMessage.includes('etimedout')
    )
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get performance statistics
   */
  getStats() {
    return {
      queryCount: this.queryCount,
      cacheSize: performanceCache.size(),
      slowQueries: Array.from(this.slowQueries),
      connectionPoolSize: connectionPool['connections'].size
    }
  }

  /**
   * Clear cache and reset statistics
   */
  clearCache(): void {
    performanceCache.clear()
    connectionPool.clear()
    this.queryCount = 0
    this.slowQueries.clear()
    console.log('🧹 Performance cache cleared')
  }
}

// ✅ Export singleton instance
export const performanceOptimizer = PerformanceOptimizer.getInstance()

// ✅ React Hook for performance optimization
export function usePerformanceOptimizer() {
  return {
    executeQuery: performanceOptimizer.executeQuery.bind(performanceOptimizer),
    loadDataBatch: performanceOptimizer.loadDataBatch.bind(performanceOptimizer),
    preloadCriticalData: performanceOptimizer.preloadCriticalData.bind(performanceOptimizer),
    getStats: performanceOptimizer.getStats.bind(performanceOptimizer),
    clearCache: performanceOptimizer.clearCache.bind(performanceOptimizer)
  }
}

// ✅ Auto-preload on module load
if (typeof window !== 'undefined') {
  // Only preload in browser environment
  setTimeout(() => {
    performanceOptimizer.preloadCriticalData()
  }, 1000)
}
