/**
 * KPI Data Cache
 * 
 * Simple in-memory cache for KPI data to reduce database queries
 * and improve performance
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
}

class KPICache {
  private cache: Map<string, CacheEntry<any>>
  private ttl: number // Time to live in milliseconds

  constructor(ttl: number = 30000) { // Default 30 seconds
    this.cache = new Map()
    this.ttl = ttl
  }

  /**
   * Get data from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }

    // Check if entry is expired
    const now = Date.now()
    if (now - entry.timestamp > this.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  /**
   * Set data in cache
   */
  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })
  }

  /**
   * Clear specific key from cache
   */
  delete(key: string): void {
    this.cache.delete(key)
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now()
    const expiredKeys: string[] = []

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > this.ttl) {
        expiredKeys.push(key)
      }
    })

    expiredKeys.forEach(key => this.cache.delete(key))
  }
}

// Create singleton instance
export const kpiCache = new KPICache(30000) // 30 seconds TTL

// Auto cleanup every minute
if (typeof window !== 'undefined') {
  setInterval(() => {
    kpiCache.cleanup()
  }, 60000)
}

/**
 * Generate cache key for KPI data
 */
export function generateKPICacheKey(projectCode: string, activityName?: string): string {
  if (activityName) {
    return `kpi:${projectCode}:${activityName}`
  }
  return `kpi:${projectCode}`
}

/**
 * Generate cache key for project analytics
 */
export function generateAnalyticsCacheKey(projectId: string): string {
  return `analytics:${projectId}`
}

/**
 * Invalidate cache for a specific project
 */
export function invalidateProjectCache(projectCode: string): void {
  // Delete all keys that start with the project code
  const keysToDelete: string[] = []
  
  // This is not efficient for large caches, but works for our use case
  // In production, you might want to use a more sophisticated cache invalidation strategy
  kpiCache.clear() // For now, just clear all cache
}
