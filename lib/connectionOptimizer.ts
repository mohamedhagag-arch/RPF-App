/**
 * Connection Optimizer
 * 
 * This utility optimizes Supabase connections to prevent disconnection issues
 */

import { getSupabaseClient } from './supabaseConnectionManager'

// Connection optimization settings
const CONNECTION_SETTINGS = {
  maxRetries: 3,
  retryDelay: 1000,
  timeout: 30000,
  keepAlive: true
}

/**
 * Optimized query function with automatic retry and reconnection
 */
export async function optimizedQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  retries: number = CONNECTION_SETTINGS.maxRetries
): Promise<{ data: T | null; error: any }> {
  try {
    const result = await queryFn()
    
    // If successful, return result
    if (!result.error) {
      return result
    }
    
    // If error and we have retries left, try again
    if (retries > 0 && (result.error.message?.includes('connection') || result.error.message?.includes('network'))) {
      console.log(`🔄 Retrying query (${CONNECTION_SETTINGS.maxRetries - retries + 1}/${CONNECTION_SETTINGS.maxRetries})...`)
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, CONNECTION_SETTINGS.retryDelay))
      
      // Try to reconnect
      const { reconnectSupabase } = await import('./supabaseConnectionManager')
      await reconnectSupabase()
      
      // Retry the query
      return optimizedQuery(queryFn, retries - 1)
    }
    
    return result
  } catch (error: any) {
    // If we have retries left, try again
    if (retries > 0) {
      console.log(`🔄 Retrying query after error (${CONNECTION_SETTINGS.maxRetries - retries + 1}/${CONNECTION_SETTINGS.maxRetries})...`)
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, CONNECTION_SETTINGS.retryDelay))
      
      // Try to reconnect
      const { reconnectSupabase } = await import('./supabaseConnectionManager')
      await reconnectSupabase()
      
      // Retry the query
      return optimizedQuery(queryFn, retries - 1)
    }
    
    return { data: null, error }
  }
}

/**
 * Optimized select query
 */
export async function optimizedSelect<T>(
  table: string,
  select: string = '*',
  filters: Record<string, any> = {},
  options: { limit?: number; order?: string; ascending?: boolean } = {}
): Promise<{ data: T[] | null; error: any }> {
  return optimizedQuery(async () => {
    const supabase = getSupabaseClient()
    let query = (supabase as any).from(table).select(select)
    
    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query = query.eq(key, value)
      }
    })
    
    // Apply options
    if (options.limit) {
      query = query.limit(options.limit)
    }
    
    if (options.order) {
      query = query.order(options.order, { ascending: options.ascending ?? true })
    }
    
    return query
  })
}

/**
 * Optimized insert query
 */
export async function optimizedInsert<T>(
  table: string,
  data: any
): Promise<{ data: T | null; error: any }> {
  return optimizedQuery(async () => {
    const supabase = getSupabaseClient()
    return (supabase as any).from(table).insert([data]).select().single()
  })
}

/**
 * Optimized update query
 */
export async function optimizedUpdate<T>(
  table: string,
  data: any,
  id: string
): Promise<{ data: T | null; error: any }> {
  return optimizedQuery(async () => {
    const supabase = getSupabaseClient()
    return (supabase as any).from(table).update(data).eq('id', id).select().single()
  })
}

/**
 * Optimized delete query
 */
export async function optimizedDelete(
  table: string,
  id: string
): Promise<{ error: any }> {
  return optimizedQuery(async () => {
    const supabase = getSupabaseClient()
    return (supabase as any).from(table).delete().eq('id', id)
  })
}

/**
 * Connection health monitor
 */
export class ConnectionHealthMonitor {
  private static instance: ConnectionHealthMonitor
  private isMonitoring = false
  private checkInterval: NodeJS.Timeout | null = null
  
  static getInstance(): ConnectionHealthMonitor {
    if (!ConnectionHealthMonitor.instance) {
      ConnectionHealthMonitor.instance = new ConnectionHealthMonitor()
    }
    return ConnectionHealthMonitor.instance
  }
  
  startMonitoring() {
    if (this.isMonitoring) return
    
    this.isMonitoring = true
    console.log('🔍 Starting connection health monitoring...')
    
    this.checkInterval = setInterval(async () => {
      try {
        const { checkSupabaseConnection, reconnectSupabase } = await import('./supabaseConnectionManager')
        const isHealthy = await checkSupabaseConnection()
        
        if (!isHealthy) {
          console.warn('⚠️ Connection unhealthy, attempting to reconnect...')
          await reconnectSupabase()
        }
      } catch (error) {
        console.error('❌ Connection health check failed:', error)
      }
    }, 5000) // Check every 5 seconds
  }
  
  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
    this.isMonitoring = false
    console.log('🔍 Stopped connection health monitoring')
  }
}

// Export singleton instance
export const connectionMonitor = ConnectionHealthMonitor.getInstance()
