/**
 * Connection Heartbeat
 * 
 * This utility sends periodic heartbeats to keep the connection alive
 */

import { getSupabaseClient } from './supabaseConnectionManager'

/**
 * Connection heartbeat class
 */
class ConnectionHeartbeat {
  private static instance: ConnectionHeartbeat
  private isBeating = false
  private heartbeatInterval: NodeJS.Timeout | null = null
  private lastHeartbeat: number = 0
  
  static getInstance(): ConnectionHeartbeat {
    if (!ConnectionHeartbeat.instance) {
      ConnectionHeartbeat.instance = new ConnectionHeartbeat()
    }
    return ConnectionHeartbeat.instance
  }
  
  /**
   * Start heartbeat
   */
  start() {
    if (this.isBeating) return
    
    this.isBeating = true
    console.log('💓 Starting connection heartbeat...')
    
    // Send heartbeat every 20 seconds
    this.heartbeatInterval = setInterval(async () => {
      await this.sendHeartbeat()
    }, 20000) // Every 20 seconds
  }
  
  /**
   * Stop heartbeat
   */
  stop() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
    this.isBeating = false
    console.log('💓 Stopped connection heartbeat')
  }
  
  /**
   * Send heartbeat
   */
  private async sendHeartbeat() {
    try {
      const supabase = getSupabaseClient()
      
      // Send a lightweight query as heartbeat
      await supabase
        .from('projects')
        .select('count')
        .limit(1)
        .single()
      
      this.lastHeartbeat = Date.now()
      console.log('💓 Heartbeat sent successfully')
    } catch (error) {
      console.warn('⚠️ Heartbeat failed:', error)
      
      // If heartbeat fails, try to reconnect
      const { reconnectSupabase } = await import('./supabaseConnectionManager')
      await reconnectSupabase()
    }
  }
  
  /**
   * Get time since last heartbeat
   */
  getTimeSinceLastHeartbeat(): number {
    return Date.now() - this.lastHeartbeat
  }
  
  /**
   * Check if heartbeat is running
   */
  isRunning(): boolean {
    return this.isBeating
  }
}

// Export singleton instance
export const connectionHeartbeat = ConnectionHeartbeat.getInstance()

/**
 * Auto-start heartbeat when module loads
 */
if (typeof window !== 'undefined') {
  connectionHeartbeat.start()
}
