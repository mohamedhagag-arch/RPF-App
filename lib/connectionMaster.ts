/**
 * Connection Master - The Master Solution
 * 
 * This utility provides the master solution for connection disconnection issues
 */

import { getSupabaseClient } from './supabaseConnectionManager'

/**
 * Master connection checker
 */
export async function masterConnectionCheck(): Promise<boolean> {
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
 * Master connection fix
 */
export async function masterConnectionFix(): Promise<boolean> {
  try {
    console.log('🔧 Master connection fix starting...')
    
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
      console.log('✅ Master connection fix successful')
    } else {
      console.error('❌ Master connection fix failed')
    }
    
    return isFixed
  } catch (error) {
    console.error('❌ Master connection fix error:', error)
    return false
  }
}

/**
 * Execute query with master connection fix
 */
export async function executeWithMasterFix<T>(
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
    console.log('🔄 Query failed, attempting master connection fix...')
    const fixed = await masterConnectionFix()
    
    if (fixed) {
      console.log('✅ Master connection fix successful, retrying query...')
      return await queryFn()
    }
    
    return result
  } catch (error: any) {
    // If exception, try to fix connection and retry
    console.log('🔄 Query exception, attempting master connection fix...')
    const fixed = await masterConnectionFix()
    
    if (fixed) {
      console.log('✅ Master connection fix successful, retrying query...')
      return await queryFn()
    }
    
    return { data: null, error }
  }
}

/**
 * Master connection monitor
 */
export class MasterConnectionMonitor {
  private static instance: MasterConnectionMonitor
  private isMonitoring = false
  private monitorInterval: NodeJS.Timeout | null = null
  
  static getInstance(): MasterConnectionMonitor {
    if (!MasterConnectionMonitor.instance) {
      MasterConnectionMonitor.instance = new MasterConnectionMonitor()
    }
    return MasterConnectionMonitor.instance
  }
  
  start() {
    if (this.isMonitoring) return
    
    this.isMonitoring = true
    console.log('🔍 Starting master connection monitor...')
    
    // Monitor connection every 10 seconds
    this.monitorInterval = setInterval(async () => {
      const isHealthy = await masterConnectionCheck()
      if (!isHealthy) {
        console.warn('⚠️ Connection unhealthy, attempting master fix...')
        await masterConnectionFix()
      }
    }, 10000) // Every 10 seconds
  }
  
  stop() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval)
      this.monitorInterval = null
    }
    this.isMonitoring = false
    console.log('🔍 Stopped master connection monitor')
  }
}

// Export singleton
export const masterConnectionMonitor = MasterConnectionMonitor.getInstance()
