/**
 * Ultimate Connection Fix - The Final Solution
 * 
 * This utility provides the ultimate solution for connection disconnection issues
 */

import { getSupabaseClient } from './supabaseConnectionManager'

/**
 * Ultimate connection checker
 */
export async function ultimateConnectionCheck(): Promise<boolean> {
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
 * Ultimate connection fix
 */
export async function ultimateConnectionFix(): Promise<boolean> {
  try {
    console.log('🔧 Ultimate connection fix starting...')
    
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
      console.log('✅ Ultimate connection fix successful')
    } else {
      console.error('❌ Ultimate connection fix failed')
    }
    
    return isFixed
  } catch (error) {
    console.error('❌ Ultimate connection fix error:', error)
    return false
  }
}

/**
 * Execute query with ultimate connection fix
 */
export async function executeWithUltimateFix<T>(
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
    console.log('🔄 Query failed, attempting ultimate connection fix...')
    const fixed = await ultimateConnectionFix()
    
    if (fixed) {
      console.log('✅ Ultimate connection fix successful, retrying query...')
      return await queryFn()
    }
    
    return result
  } catch (error: any) {
    // If exception, try to fix connection and retry
    console.log('🔄 Query exception, attempting ultimate connection fix...')
    const fixed = await ultimateConnectionFix()
    
    if (fixed) {
      console.log('✅ Ultimate connection fix successful, retrying query...')
      return await queryFn()
    }
    
    return { data: null, error }
  }
}

/**
 * Ultimate connection monitor
 */
export class UltimateConnectionMonitor {
  private static instance: UltimateConnectionMonitor
  private isMonitoring = false
  private monitorInterval: NodeJS.Timeout | null = null
  
  static getInstance(): UltimateConnectionMonitor {
    if (!UltimateConnectionMonitor.instance) {
      UltimateConnectionMonitor.instance = new UltimateConnectionMonitor()
    }
    return UltimateConnectionMonitor.instance
  }
  
  start() {
    if (this.isMonitoring) return
    
    this.isMonitoring = true
    console.log('🔍 Starting ultimate connection monitor...')
    
    // Monitor connection every 15 seconds
    this.monitorInterval = setInterval(async () => {
      const isHealthy = await ultimateConnectionCheck()
      if (!isHealthy) {
        console.warn('⚠️ Connection unhealthy, attempting ultimate fix...')
        await ultimateConnectionFix()
      }
    }, 15000) // Every 15 seconds
  }
  
  stop() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval)
      this.monitorInterval = null
    }
    this.isMonitoring = false
    console.log('🔍 Stopped ultimate connection monitor')
  }
}

// Export singleton
export const ultimateConnectionMonitor = UltimateConnectionMonitor.getInstance()
