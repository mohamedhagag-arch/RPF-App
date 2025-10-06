/**
 * Connection Guard
 * 
 * This utility guards against connection issues and provides automatic recovery
 */

import { getSupabaseClient } from './supabaseConnectionManager'

/**
 * Connection guard class
 */
class ConnectionGuard {
  private static instance: ConnectionGuard
  private isGuarding = false
  private guardInterval: NodeJS.Timeout | null = null
  private lastSuccessfulQuery: number = Date.now()
  
  static getInstance(): ConnectionGuard {
    if (!ConnectionGuard.instance) {
      ConnectionGuard.instance = new ConnectionGuard()
    }
    return ConnectionGuard.instance
  }
  
  /**
   * Start connection guarding
   */
  start() {
    if (this.isGuarding) return
    
    this.isGuarding = true
    console.log('🛡️ Starting connection guard...')
    
    // Guard connection every 5 seconds
    this.guardInterval = setInterval(async () => {
      try {
        await this.guardConnection()
      } catch (error) {
        console.warn('⚠️ Connection guard failed:', error)
      }
    }, 5000) // Every 5 seconds
  }
  
  /**
   * Stop connection guarding
   */
  stop() {
    if (this.guardInterval) {
      clearInterval(this.guardInterval)
      this.guardInterval = null
    }
    this.isGuarding = false
    console.log('🛡️ Stopped connection guard')
  }
  
  /**
   * Guard the connection
   */
  private async guardConnection() {
    try {
      const supabase = getSupabaseClient()
      
      // Send a lightweight query to guard connection
      await supabase
        .from('projects')
        .select('count')
        .limit(1)
        .single()
      
      this.lastSuccessfulQuery = Date.now()
      console.log('🛡️ Connection guarded successfully')
    } catch (error) {
      console.warn('⚠️ Connection guard failed:', error)
      
      // Check if it's been too long since last successful query
      const timeSinceLastSuccess = Date.now() - this.lastSuccessfulQuery
      if (timeSinceLastSuccess > 30000) { // 30 seconds
        console.warn('⚠️ Connection has been down for too long, attempting recovery...')
        
        // Try to reconnect
        const { reconnectSupabase } = await import('./supabaseConnectionManager')
        await reconnectSupabase()
      }
    }
  }
  
  /**
   * Check if guarding is running
   */
  isRunning(): boolean {
    return this.isGuarding
  }
  
  /**
   * Get time since last successful query
   */
  getTimeSinceLastSuccess(): number {
    return Date.now() - this.lastSuccessfulQuery
  }
}

// Export singleton instance
export const connectionGuard = ConnectionGuard.getInstance()

/**
 * Connection health checker with detailed status
 */
export async function getConnectionStatus(): Promise<{
  isHealthy: boolean
  lastSuccess: number
  timeSinceLastSuccess: number
  error?: string
}> {
  try {
    const supabase = getSupabaseClient()
    
    const startTime = Date.now()
    const { data, error } = await supabase
      .from('projects')
      .select('count')
      .limit(1)
      .single()
    
    const responseTime = Date.now() - startTime
    
    if (error && error.code !== 'PGRST116') {
      return {
        isHealthy: false,
        lastSuccess: connectionGuard.getTimeSinceLastSuccess(),
        timeSinceLastSuccess: connectionGuard.getTimeSinceLastSuccess(),
        error: error.message
      }
    }
    
    return {
      isHealthy: true,
      lastSuccess: Date.now(),
      timeSinceLastSuccess: 0,
      error: undefined
    }
  } catch (error: any) {
    return {
      isHealthy: false,
      lastSuccess: connectionGuard.getTimeSinceLastSuccess(),
      timeSinceLastSuccess: connectionGuard.getTimeSinceLastSuccess(),
      error: error.message
    }
  }
}

/**
 * Connection recovery with detailed logging
 */
export async function recoverConnectionWithLogging(): Promise<boolean> {
  console.log('🔄 Starting connection recovery with detailed logging...')
  
  try {
    // Step 1: Check current status
    const status = await getConnectionStatus()
    console.log('📊 Current connection status:', status)
    
    if (status.isHealthy) {
      console.log('✅ Connection is already healthy')
      return true
    }
    
    // Step 2: Attempt reconnection
    console.log('🔄 Attempting to reconnect...')
    const { reconnectSupabase } = await import('./supabaseConnectionManager')
    const success = await reconnectSupabase()
    
    if (success) {
      console.log('✅ Connection recovered successfully')
      
      // Step 3: Verify recovery
      const newStatus = await getConnectionStatus()
      console.log('📊 New connection status:', newStatus)
      
      return newStatus.isHealthy
    } else {
      console.error('❌ Connection recovery failed')
      return false
    }
  } catch (error) {
    console.error('❌ Connection recovery error:', error)
    return false
  }
}

/**
 * Connection monitor with detailed logging
 */
export class DetailedConnectionMonitor {
  private static instance: DetailedConnectionMonitor
  private monitorInterval: NodeJS.Timeout | null = null
  private isMonitoring = false
  private statusHistory: Array<{ timestamp: number; status: any }> = []
  
  static getInstance(): DetailedConnectionMonitor {
    if (!DetailedConnectionMonitor.instance) {
      DetailedConnectionMonitor.instance = new DetailedConnectionMonitor()
    }
    return DetailedConnectionMonitor.instance
  }
  
  start() {
    if (this.isMonitoring) return
    
    this.isMonitoring = true
    console.log('🔍 Starting detailed connection monitoring...')
    
    // Monitor connection every 10 seconds
    this.monitorInterval = setInterval(async () => {
      try {
        const status = await getConnectionStatus()
        
        // Add to history
        this.statusHistory.push({
          timestamp: Date.now(),
          status
        })
        
        // Keep only last 10 entries
        if (this.statusHistory.length > 10) {
          this.statusHistory = this.statusHistory.slice(-10)
        }
        
        if (!status.isHealthy) {
          console.warn('⚠️ Connection unhealthy, attempting recovery...')
          await recoverConnectionWithLogging()
        }
      } catch (error) {
        console.error('❌ Detailed connection monitoring error:', error)
      }
    }, 10000) // Every 10 seconds
  }
  
  stop() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval)
      this.monitorInterval = null
    }
    this.isMonitoring = false
    console.log('🔍 Stopped detailed connection monitoring')
  }
  
  getStatusHistory() {
    return this.statusHistory
  }
  
  isRunning(): boolean {
    return this.isMonitoring
  }
}

// Export singleton instance
export const detailedConnectionMonitor = DetailedConnectionMonitor.getInstance()

/**
 * Auto-start connection guard when module loads
 */
if (typeof window !== 'undefined') {
  connectionGuard.start()
  detailedConnectionMonitor.start()
}
