/**
 * Simple Connection Fix
 * 
 * This utility provides a simple and effective solution for connection issues
 */

import { getSupabaseClient } from './supabaseConnectionManager'

/**
 * Simple connection checker
 */
export async function checkConnection(): Promise<boolean> {
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('projects')
      .select('count')
      .limit(1)
      .single()
    
    return !error || error.code === 'PGRST116'
  } catch (error) {
    return false
  }
}

/**
 * Simple reconnection
 */
export async function reconnect(): Promise<boolean> {
  try {
    // Reset the client
    const { cleanupSupabaseConnections } = await import('./supabaseConnectionManager')
    cleanupSupabaseConnections()
    
    // Get a new client
    const supabase = getSupabaseClient()
    
    // Test the connection
    const { data, error } = await supabase
      .from('projects')
      .select('count')
      .limit(1)
      .single()
    
    return !error || error.code === 'PGRST116'
  } catch (error) {
    return false
  }
}

/**
 * Simple query wrapper with automatic retry
 */
export async function safeQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>
): Promise<{ data: T | null; error: any }> {
  try {
    return await queryFn()
  } catch (error: any) {
    // If it's a connection error, try to reconnect and retry
    if (error.message?.includes('connection') || error.message?.includes('network')) {
      console.log('🔄 Connection error detected, attempting to reconnect...')
      
      const reconnected = await reconnect()
      if (reconnected) {
        console.log('✅ Reconnected successfully, retrying query...')
        return await queryFn()
      }
    }
    
    return { data: null, error }
  }
}

/**
 * Simple connection monitor
 */
export class SimpleConnectionMonitor {
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
    
    this.interval = setInterval(async () => {
      const isHealthy = await checkConnection()
      if (!isHealthy) {
        console.warn('⚠️ Connection unhealthy, attempting to reconnect...')
        await reconnect()
      }
    }, 15000) // Check every 15 seconds
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
