/**
 * Connection Keep-Alive Manager
 * 
 * This utility maintains persistent connections to prevent disconnection issues
 */

import { getSupabaseClient } from './supabaseConnectionManager'

class ConnectionKeepAlive {
  private static instance: ConnectionKeepAlive
  private keepAliveInterval: NodeJS.Timeout | null = null
  private isActive = false
  
  static getInstance(): ConnectionKeepAlive {
    if (!ConnectionKeepAlive.instance) {
      ConnectionKeepAlive.instance = new ConnectionKeepAlive()
    }
    return ConnectionKeepAlive.instance
  }
  
  start() {
    if (this.isActive) return
    
    this.isActive = true
    console.log('🔄 Starting connection keep-alive...')
    
    // Send a keep-alive ping every 30 seconds
    this.keepAliveInterval = setInterval(async () => {
      try {
        const supabase = getSupabaseClient()
        
        // Send a lightweight query to keep connection alive
        await supabase
          .from('projects')
          .select('count')
          .limit(1)
          .single()
        
        console.log('💓 Keep-alive ping sent')
      } catch (error) {
        console.warn('⚠️ Keep-alive ping failed:', error)
        // Try to reconnect
        const { reconnectSupabase } = await import('./supabaseConnectionManager')
        await reconnectSupabase()
      }
    }, 30000) // Every 30 seconds
  }
  
  stop() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval)
      this.keepAliveInterval = null
    }
    this.isActive = false
    console.log('🔄 Stopped connection keep-alive')
  }
  
  isRunning(): boolean {
    return this.isActive
  }
}

// Export singleton instance
export const connectionKeepAlive = ConnectionKeepAlive.getInstance()

// Auto-start keep-alive when module loads
if (typeof window !== 'undefined') {
  connectionKeepAlive.start()
}
