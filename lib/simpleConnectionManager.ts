/**
 * Simple Connection Manager - Focused Solution
 * 
 * This utility provides a simple and focused solution for connection issues
 */

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// Simple singleton pattern
let supabaseClient: ReturnType<typeof createClientComponentClient> | null = null

export function getSimpleSupabaseClient() {
  if (!supabaseClient) {
    console.log('🔧 Creating simple Supabase client')
    supabaseClient = createClientComponentClient()
  }
  return supabaseClient
}

export function resetSimpleSupabaseClient() {
  console.log('🔄 Resetting simple Supabase client')
  supabaseClient = null
}

/**
 * Simple connection check
 */
export async function checkSimpleConnection(): Promise<boolean> {
  try {
    const supabase = getSimpleSupabaseClient()
    const { data, error } = await supabase
      .from('projects')
      .select('count')
      .limit(1)
      .single()
    
    return !error || error.code === 'PGRST116'
  } catch (error) {
    console.warn('⚠️ Simple connection check failed:', error)
    return false
  }
}

/**
 * Simple reconnection
 */
export async function reconnectSimple(): Promise<boolean> {
  try {
    console.log('🔄 Simple reconnection starting...')
    
    // Reset client
    resetSimpleSupabaseClient()
    
    // Get new client
    const supabase = getSimpleSupabaseClient()
    
    // Test connection
    const { data, error } = await supabase
      .from('projects')
      .select('count')
      .limit(1)
      .single()
    
    const success = !error || error.code === 'PGRST116'
    
    if (success) {
      console.log('✅ Simple reconnection successful')
    } else {
      console.error('❌ Simple reconnection failed')
    }
    
    return success
  } catch (error) {
    console.error('❌ Simple reconnection error:', error)
    return false
  }
}

/**
 * Simple query wrapper with retry
 */
export async function simpleQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>
): Promise<{ data: T | null; error: any }> {
  try {
    // Try query first
    const result = await queryFn()
    
    // If successful, return
    if (!result.error) {
      return result
    }
    
    // If error, try to reconnect and retry once
    console.log('🔄 Query failed, attempting simple reconnection...')
    const reconnected = await reconnectSimple()
    
    if (reconnected) {
      console.log('✅ Reconnected, retrying query...')
      return await queryFn()
    }
    
    return result
  } catch (error: any) {
    // If exception, try to reconnect and retry once
    console.log('🔄 Query exception, attempting simple reconnection...')
    const reconnected = await reconnectSimple()
    
    if (reconnected) {
      console.log('✅ Reconnected, retrying query...')
      return await queryFn()
    }
    
    return { data: null, error }
  }
}

/**
 * Simple connection monitor
 */
class SimpleConnectionMonitor {
  private static instance: SimpleConnectionMonitor
  private isRunning = false
  private interval: NodeJS.Timeout | null = null
  
  static getInstance(): SimpleConnectionMonitor {
    if (!SimpleConnectionMonitor.instance) {
      SimpleConnectionMonitor.instance = new SimpleConnectionMonitor()
    }
    return SimpleConnectionMonitor.instance
  }
  
  start() {
    if (this.isRunning) return
    
    this.isRunning = true
    console.log('🔍 Starting simple connection monitor...')
    
    // Check connection every 30 seconds
    this.interval = setInterval(async () => {
      const isHealthy = await checkSimpleConnection()
      if (!isHealthy) {
        console.warn('⚠️ Connection unhealthy, attempting simple reconnection...')
        await reconnectSimple()
      }
    }, 30000) // Every 30 seconds
  }
  
  stop() {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
    this.isRunning = false
    console.log('🔍 Stopped simple connection monitor')
  }
}

// Export singleton
export const simpleConnectionMonitor = SimpleConnectionMonitor.getInstance()
