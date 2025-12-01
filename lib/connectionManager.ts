/**
 * Connection Manager - Ultimate Solution
 * 
 * This utility provides the ultimate solution for connection issues
 */

import { getSupabaseClient } from './supabaseConnectionManager'

/**
 * Connection manager class
 */
class ConnectionManager {
  private static instance: ConnectionManager
  private isManaging = false
  private manageInterval: NodeJS.Timeout | null = null
  private lastSuccessfulQuery: number = Date.now()
  private consecutiveFailures = 0
  
  static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager()
    }
    return ConnectionManager.instance
  }
  
  /**
   * Start connection management
   */
  start() {
    if (this.isManaging) return
    
    this.isManaging = true
    console.log('🔧 Starting connection management...')
    
    // Manage connection every 10 seconds
    this.manageInterval = setInterval(async () => {
      await this.manageConnection()
    }, 10000) // Every 10 seconds
  }
  
  /**
   * Stop connection management
   */
  stop() {
    if (this.manageInterval) {
      clearInterval(this.manageInterval)
      this.manageInterval = null
    }
    this.isManaging = false
    console.log('🔧 Stopped connection management')
  }
  
  /**
   * Manage the connection
   */
  private async manageConnection() {
    try {
      const supabase = getSupabaseClient()
      
      // Send a lightweight query to manage connection
      await supabase
        .from('projects')
        .select('count')
        .limit(1)
        .single()
      
      this.lastSuccessfulQuery = Date.now()
      this.consecutiveFailures = 0
      console.log('🔧 Connection managed successfully')
    } catch (error) {
      this.consecutiveFailures++
      console.warn(`⚠️ Connection management failed (${this.consecutiveFailures} consecutive failures):`, error)
      
      // If too many consecutive failures, try to reconnect
      if (this.consecutiveFailures >= 3) {
        console.warn('⚠️ Too many consecutive failures, attempting to reconnect...')
        
        // Try to reconnect
        const { reconnectSupabase } = await import('./supabaseConnectionManager')
        await reconnectSupabase()
        
        // Reset failure count
        this.consecutiveFailures = 0
      }
    }
  }
  
  /**
   * Get connection status
   */
  getStatus() {
    return {
      isManaging: this.isManaging,
      lastSuccessfulQuery: this.lastSuccessfulQuery,
      timeSinceLastSuccess: Date.now() - this.lastSuccessfulQuery,
      consecutiveFailures: this.consecutiveFailures
    }
  }
}

// Export singleton instance
export const connectionManager = ConnectionManager.getInstance()

/**
 * Execute query with connection management
 */
export async function executeWithManagement<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>
): Promise<{ data: T | null; error: any }> {
  try {
    return await queryFn()
  } catch (error: any) {
    // If it's a connection error, try to reconnect and retry
    if (error.message?.includes('connection') || error.message?.includes('network')) {
      console.log('🔄 Connection error detected, attempting to reconnect...')
      
      const { reconnectSupabase } = await import('./supabaseConnectionManager')
      const reconnected = await reconnectSupabase()
      
      if (reconnected) {
        console.log('✅ Reconnected successfully, retrying query...')
        return await queryFn()
      }
    }
    
    return { data: null, error }
  }
}

/**
 * Auto-start connection management when module loads
 */
if (typeof window !== 'undefined') {
  connectionManager.start()
}
