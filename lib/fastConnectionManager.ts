/**
 * Fast Connection Manager - مدير اتصال سريع ومحسن
 * 
 * نظام محسن للاتصال مع Supabase مع تحسينات الأداء
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

// ✅ Fast connection configuration
const FAST_CONFIG = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Disable for performance
    flowType: 'pkce' as const
  },
  global: {
    headers: {
      'Connection': 'keep-alive',
      'Keep-Alive': 'timeout=300, max=100',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    }
  },
  realtime: {
    params: {
      eventsPerSecond: 1, // Reduced for performance
    },
  },
  db: {
    schema: 'public'
  }
}

// ✅ Connection pool for multiple clients
class FastConnectionPool {
  private clients: Map<string, SupabaseClient> = new Map()
  private maxClients = 3
  private clientTimeout = 60000 // 1 minute

  getClient(key: string = 'default'): SupabaseClient {
    if (this.clients.has(key)) {
      return this.clients.get(key)!
    }

    if (this.clients.size >= this.maxClients) {
      // Remove oldest client
      const oldestKey = this.clients.keys().next().value
      if (oldestKey) {
        this.clients.delete(oldestKey)
      }
    }

    const client = this.createClient()
    this.clients.set(key, client)

    // Auto-cleanup
    setTimeout(() => {
      this.clients.delete(key)
    }, this.clientTimeout)

    return client
  }

  private createClient(): SupabaseClient<any, "public", "public"> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials')
    }

    return createClient(supabaseUrl, supabaseKey, FAST_CONFIG) as SupabaseClient<any, "public", "public">
  }

  clear(): void {
    this.clients.clear()
  }
}

const connectionPool = new FastConnectionPool()

// ✅ Fast query executor with optimizations
export class FastQueryExecutor {
  private static instance: FastQueryExecutor
  private queryCache = new Map<string, { data: any; timestamp: number }>()
  private cacheTTL = 30000 // 30 seconds
  private maxCacheSize = 50

  static getInstance(): FastQueryExecutor {
    if (!FastQueryExecutor.instance) {
      FastQueryExecutor.instance = new FastQueryExecutor()
    }
    return FastQueryExecutor.instance
  }

  /**
   * Execute query with fast caching
   */
  async execute<T>(
    queryKey: string,
    queryFn: (client: SupabaseClient) => Promise<{ data: T | null; error: any }>,
    options: { cache?: boolean; timeout?: number } = {}
  ): Promise<{ data: T | null; error: any }> {
    const { cache = true, timeout = 10000 } = options

    // ✅ Check cache first
    if (cache) {
      const cached = this.queryCache.get(queryKey)
      if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
        console.log(`🚀 Cache hit: ${queryKey}`)
        return { data: cached.data, error: null }
      }
    }

    // ✅ Execute query with timeout
    try {
      const client = connectionPool.getClient()
      
      const result = await Promise.race([
        queryFn(client),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout')), timeout)
        )
      ])

      // ✅ Cache successful results
      if (cache && result.data && !result.error) {
        this.setCache(queryKey, result.data)
      }

      return result

    } catch (error: any) {
      console.warn(`⚠️ Query failed: ${queryKey}`, error.message)
      return { data: null, error }
    }
  }

  /**
   * Batch execute multiple queries
   */
  async batchExecute<T>(
    queries: Array<{
      key: string
      query: (client: SupabaseClient) => Promise<{ data: T | null; error: any }>
    }>
  ): Promise<Array<{ data: T | null; error: any }>> {
    const client = connectionPool.getClient()
    
    return Promise.allSettled(
      queries.map(async ({ key, query }) => {
        try {
          return await query(client)
        } catch (error: any) {
          console.warn(`⚠️ Batch query failed: ${key}`, error.message)
          return { data: null, error }
        }
      })
    ).then(results => 
      results.map(result => 
        result.status === 'fulfilled' ? result.value : { data: null, error: new Error('Query failed') }
      )
    )
  }

  /**
   * Fast data loading with pagination
   */
  async loadData<T>(
    tableName: string,
    page: number = 0,
    pageSize: number = 25,
    orderBy: string = 'created_at',
    orderDirection: 'asc' | 'desc' = 'desc'
  ): Promise<{ data: T[]; totalCount: number; hasMore: boolean }> {
    const queryKey = `load_${tableName}_${page}_${pageSize}_${orderBy}_${orderDirection}`
    
    const result = await this.execute(
      queryKey,
      async (client) => {
        const { data, error, count } = await client
          .from(tableName)
          .select('*', { count: 'exact' })
          .range(page * pageSize, (page + 1) * pageSize - 1)
          .order(orderBy, { ascending: orderDirection === 'asc' })

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
      { cache: true, timeout: 8000 }
    )

    return result.data || { data: [], totalCount: 0, hasMore: false }
  }

  /**
   * Fast search with indexing
   */
  async searchData<T>(
    tableName: string,
    searchTerm: string,
    searchColumns: string[],
    limit: number = 20
  ): Promise<{ data: T[]; totalCount: number }> {
    const queryKey = `search_${tableName}_${searchTerm}_${searchColumns.join('_')}_${limit}`
    
    const result = await this.execute(
      queryKey,
      async (client) => {
        // Build search query
        let query = client.from(tableName).select('*', { count: 'exact' })
        
        if (searchTerm) {
          const searchConditions = searchColumns.map(column => 
            `${column}.ilike.%${searchTerm}%`
          )
          query = query.or(searchConditions.join(','))
        }
        
        const { data, error, count } = await query.limit(limit)

        if (error) throw error

        return {
          data: {
            data: data || [],
            totalCount: count || 0
          },
          error: null
        }
      },
      { cache: true, timeout: 5000 }
    )

    return result.data || { data: [], totalCount: 0 }
  }

  /**
   * Set cache with size management
   */
  private setCache(key: string, data: any): void {
    // Remove oldest entries if cache is full
    if (this.queryCache.size >= this.maxCacheSize) {
      const oldestKey = this.queryCache.keys().next().value
      if (oldestKey) {
        this.queryCache.delete(oldestKey)
      }
    }

    this.queryCache.set(key, {
      data,
      timestamp: Date.now()
    })
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.queryCache.clear()
    console.log('🧹 Fast query cache cleared')
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.queryCache.size,
      maxSize: this.maxCacheSize,
      ttl: this.cacheTTL
    }
  }
}

// ✅ Export singleton instances
export const fastQueryExecutor = FastQueryExecutor.getInstance()

// ✅ Fast connection manager
export class FastConnectionManager {
  private static instance: FastConnectionManager
  private isInitialized = false
  private healthCheckInterval: NodeJS.Timeout | null = null

  static getInstance(): FastConnectionManager {
    if (!FastConnectionManager.instance) {
      FastConnectionManager.instance = new FastConnectionManager()
    }
    return FastConnectionManager.instance
  }

  /**
   * Initialize fast connection
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    console.log('🚀 Initializing fast connection...')
    
    try {
      // Test connection
      const client = connectionPool.getClient()
      const { data, error } = await client.auth.getSession()
      
      if (error) {
        console.warn('⚠️ Initial connection test failed:', error.message)
      } else {
        console.log('✅ Fast connection initialized successfully')
        this.isInitialized = true
        
        // Start health check
        this.startHealthCheck()
      }
    } catch (error: any) {
      console.error('❌ Fast connection initialization failed:', error.message)
    }
  }

  /**
   * Start health check
   */
  private startHealthCheck(): void {
    if (this.healthCheckInterval) return

    this.healthCheckInterval = setInterval(async () => {
      try {
        const client = connectionPool.getClient()
        const { data, error } = await client.auth.getSession()
        
        if (error) {
          console.warn('⚠️ Health check failed:', error.message)
        } else {
          console.log('✅ Connection health check passed')
        }
      } catch (error: any) {
        console.warn('⚠️ Health check error:', error.message)
      }
    }, 60000) // Every minute
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      poolSize: connectionPool['clients'].size,
      cacheStats: fastQueryExecutor.getCacheStats()
    }
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
    }
    
    connectionPool.clear()
    fastQueryExecutor.clearCache()
    this.isInitialized = false
    
    console.log('🧹 Fast connection cleaned up')
  }
}

// ✅ Export singleton
export const fastConnectionManager = FastConnectionManager.getInstance()

// ✅ Auto-initialize
if (typeof window !== 'undefined') {
  fastConnectionManager.initialize()
}
