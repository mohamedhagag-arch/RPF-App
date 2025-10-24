/**
 * Connection Stabilizer
 * 
 * This utility stabilizes Supabase connections to prevent disconnection issues
 */

import { getSupabaseClient } from './supabaseConnectionManager'

/**
 * Connection stabilizer class
 */
class ConnectionStabilizer {
  private static instance: ConnectionStabilizer
  private isStabilizing = false
  private stabilizationInterval: NodeJS.Timeout | null = null
  
  static getInstance(): ConnectionStabilizer {
    if (!ConnectionStabilizer.instance) {
      ConnectionStabilizer.instance = new ConnectionStabilizer()
    }
    return ConnectionStabilizer.instance
  }
  
  /**
   * Start connection stabilization
   */
  start() {
    if (this.isStabilizing) return
    
    this.isStabilizing = true
    console.log('🔧 Starting connection stabilization...')
    
    // Stabilize connection every 15 seconds
    this.stabilizationInterval = setInterval(async () => {
      try {
        await this.stabilizeConnection()
      } catch (error) {
        console.warn('⚠️ Connection stabilization failed:', error)
      }
    }, 15000) // Every 15 seconds
  }
  
  /**
   * Stop connection stabilization
   */
  stop() {
    if (this.stabilizationInterval) {
      clearInterval(this.stabilizationInterval)
      this.stabilizationInterval = null
    }
    this.isStabilizing = false
    console.log('🔧 Stopped connection stabilization')
  }
  
  /**
   * Stabilize the connection
   */
  private async stabilizeConnection() {
    try {
      const supabase = getSupabaseClient()
      
      // Send a lightweight query to stabilize connection
      await supabase
        .from('projects')
        .select('count')
        .limit(1)
        .single()
      
      console.log('🔧 Connection stabilized')
    } catch (error) {
      console.warn('⚠️ Connection stabilization failed:', error)
      // Try to reconnect
      const { reconnectSupabase } = await import('./supabaseConnectionManager')
      await reconnectSupabase()
    }
  }
  
  /**
   * Check if stabilization is running
   */
  isRunning(): boolean {
    return this.isStabilizing
  }
}

// Export singleton instance
export const connectionStabilizer = ConnectionStabilizer.getInstance()

/**
 * Connection health checker
 */
export async function checkConnectionHealth(): Promise<boolean> {
  try {
    const supabase = getSupabaseClient()
    
    // Send a lightweight query to check connection
    const { data, error } = await supabase
      .from('projects')
      .select('count')
      .limit(1)
      .single()
    
    if (error && error.code !== 'PGRST116') {
      console.warn('⚠️ Connection health check failed:', error)
      return false
    }
    
    return true
  } catch (error) {
    console.warn('⚠️ Connection health check error:', error)
    return false
  }
}

/**
 * Connection recovery with exponential backoff
 */
export async function recoverConnection(maxRetries: number = 3): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Connection recovery attempt ${attempt}/${maxRetries}`)
      
      // Wait with exponential backoff
      const delay = Math.pow(2, attempt - 1) * 1000
      await new Promise(resolve => setTimeout(resolve, delay))
      
      // Try to reconnect
      const { reconnectSupabase } = await import('./supabaseConnectionManager')
      const success = await reconnectSupabase()
      
      if (success) {
        console.log('✅ Connection recovered successfully')
        return true
      }
    } catch (error) {
      console.warn(`⚠️ Connection recovery attempt ${attempt} failed:`, error)
    }
  }
  
  console.error('❌ Connection recovery failed after all attempts')
  return false
}

/**
 * Connection monitor with automatic recovery
 */
export class ConnectionMonitor {
  private static instance: ConnectionMonitor
  private monitorInterval: NodeJS.Timeout | null = null
  private isMonitoring = false
  
  static getInstance(): ConnectionMonitor {
    if (!ConnectionMonitor.instance) {
      ConnectionMonitor.instance = new ConnectionMonitor()
    }
    return ConnectionMonitor.instance
  }
  
  start() {
    if (this.isMonitoring) return
    
    this.isMonitoring = true
    console.log('🔍 Starting connection monitoring...')
    
    // Monitor connection every 10 seconds
    this.monitorInterval = setInterval(async () => {
      try {
        const isHealthy = await checkConnectionHealth()
        
        if (!isHealthy) {
          console.warn('⚠️ Connection unhealthy, attempting recovery...')
          await recoverConnection()
        }
      } catch (error) {
        console.error('❌ Connection monitoring error:', error)
      }
    }, 10000) // Every 10 seconds
  }
  
  stop() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval)
      this.monitorInterval = null
    }
    this.isMonitoring = false
    console.log('🔍 Stopped connection monitoring')
  }
  
  isRunning(): boolean {
    return this.isMonitoring
  }
}

// Export singleton instance
export const connectionMonitor = ConnectionMonitor.getInstance()

/**
 * Auto-start connection stabilization when module loads
 */
if (typeof window !== 'undefined') {
  connectionStabilizer.start()
  connectionMonitor.start()
}
