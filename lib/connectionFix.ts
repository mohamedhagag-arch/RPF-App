/**
 * Connection Fix - Simple and Effective Solution
 * 
 * This utility provides a simple solution for connection disconnection issues
 */

import { getSupabaseClient } from './supabaseConnectionManager'

/**
 * Check if connection is healthy
 */
export async function isConnectionHealthy(): Promise<boolean> {
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
 * Fix connection by reconnecting
 */
export async function fixConnection(): Promise<boolean> {
  try {
    console.log('🔧 Fixing connection...')
    
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
    
    const isFixed = !error || error.code === 'PGRST116'
    
    if (isFixed) {
      console.log('✅ Connection fixed successfully')
    } else {
      console.error('❌ Failed to fix connection')
    }
    
    return isFixed
  } catch (error) {
    console.error('❌ Connection fix error:', error)
    return false
  }
}

/**
 * Execute query with automatic connection fix
 */
export async function executeWithFix<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>
): Promise<{ data: T | null; error: any }> {
  try {
    // Try the query first
    const result = await queryFn()
    
    // If successful, return result
    if (!result.error) {
      return result
    }
    
    // If error, try to fix connection and retry
    console.log('🔄 Query failed, attempting to fix connection...')
    const fixed = await fixConnection()
    
    if (fixed) {
      console.log('✅ Connection fixed, retrying query...')
      return await queryFn()
    }
    
    return result
  } catch (error: any) {
    // If exception, try to fix connection and retry
    console.log('🔄 Query exception, attempting to fix connection...')
    const fixed = await fixConnection()
    
    if (fixed) {
      console.log('✅ Connection fixed, retrying query...')
      return await queryFn()
    }
    
    return { data: null, error }
  }
}

/**
 * Simple connection monitor
 */
export class ConnectionFixMonitor {
  private static instance: ConnectionFixMonitor
  private isMonitoring = false
  private monitorInterval: NodeJS.Timeout | null = null
  
  static getInstance(): ConnectionFixMonitor {
    if (!ConnectionFixMonitor.instance) {
      ConnectionFixMonitor.instance = new ConnectionFixMonitor()
    }
    return ConnectionFixMonitor.instance
  }
  
  start() {
    if (this.isMonitoring) return
    
    this.isMonitoring = true
    console.log('🔍 Starting connection fix monitor...')
    
    // Monitor connection every 30 seconds
    this.monitorInterval = setInterval(async () => {
      const isHealthy = await isConnectionHealthy()
      if (!isHealthy) {
        console.warn('⚠️ Connection unhealthy, attempting to fix...')
        await fixConnection()
      }
    }, 30000) // Every 30 seconds
  }
  
  stop() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval)
      this.monitorInterval = null
    }
    this.isMonitoring = false
    console.log('🔍 Stopped connection fix monitor')
  }
}

// Export singleton
export const connectionFixMonitor = ConnectionFixMonitor.getInstance()
