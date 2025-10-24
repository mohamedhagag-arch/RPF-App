/**
 * Connection Recovery System
 * 
 * This utility provides automatic connection recovery when disconnections occur
 */

import { getSupabaseClient } from './supabaseConnectionManager'

interface RecoveryOptions {
  maxRetries: number
  retryDelay: number
  exponentialBackoff: boolean
}

const DEFAULT_OPTIONS: RecoveryOptions = {
  maxRetries: 3,
  retryDelay: 1000,
  exponentialBackoff: true
}

/**
 * Execute a function with automatic retry and recovery
 */
export async function withRecovery<T>(
  fn: () => Promise<T>,
  options: Partial<RecoveryOptions> = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  let lastError: any
  
  for (let attempt = 1; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error
      
      // Check if it's a connection-related error
      const isConnectionError = 
        error.message?.includes('connection') ||
        error.message?.includes('network') ||
        error.message?.includes('timeout') ||
        error.message?.includes('fetch') ||
        error.code === 'PGRST301' || // Connection timeout
        error.code === 'PGRST302' || // Connection refused
        error.code === 'PGRST303'    // Connection reset
      
      if (isConnectionError && attempt < opts.maxRetries) {
        console.log(`🔄 Connection error detected (attempt ${attempt}/${opts.maxRetries}), retrying...`)
        
        // Calculate delay with exponential backoff
        const delay = opts.exponentialBackoff 
          ? opts.retryDelay * Math.pow(2, attempt - 1)
          : opts.retryDelay
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delay))
        
        // Try to reconnect
        try {
          const { reconnectSupabase } = await import('./supabaseConnectionManager')
          await reconnectSupabase()
        } catch (reconnectError) {
          console.warn('⚠️ Reconnection attempt failed:', reconnectError)
        }
        
        continue
      }
      
      // If not a connection error or max retries reached, throw the error
      throw error
    }
  }
  
  throw lastError
}

/**
 * Wrapper for Supabase queries with automatic recovery
 */
export async function recoverableQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  options?: Partial<RecoveryOptions>
): Promise<{ data: T | null; error: any }> {
  try {
    const result = await withRecovery(queryFn, options)
    return result
  } catch (error: any) {
    return { data: null, error }
  }
}

/**
 * Connection status monitor
 */
export class ConnectionStatusMonitor {
  private static instance: ConnectionStatusMonitor
  private status: 'connected' | 'disconnected' | 'reconnecting' = 'connected'
  private listeners: Array<(status: string) => void> = []
  
  static getInstance(): ConnectionStatusMonitor {
    if (!ConnectionStatusMonitor.instance) {
      ConnectionStatusMonitor.instance = new ConnectionStatusMonitor()
    }
    return ConnectionStatusMonitor.instance
  }
  
  setStatus(status: 'connected' | 'disconnected' | 'reconnecting') {
    if (this.status !== status) {
      this.status = status
      console.log(`🔗 Connection status changed to: ${status}`)
      this.notifyListeners(status)
    }
  }
  
  getStatus(): string {
    return this.status
  }
  
  addListener(listener: (status: string) => void) {
    this.listeners.push(listener)
  }
  
  removeListener(listener: (status: string) => void) {
    this.listeners = this.listeners.filter(l => l !== listener)
  }
  
  private notifyListeners(status: string) {
    this.listeners.forEach(listener => listener(status))
  }
}

// Export singleton instance
export const connectionStatus = ConnectionStatusMonitor.getInstance()

/**
 * Connection health checker with status updates
 */
export async function checkConnectionHealth(): Promise<boolean> {
  try {
    connectionStatus.setStatus('connected')
    
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('projects')
      .select('count')
      .limit(1)
      .single()
    
    if (error && error.code !== 'PGRST116') {
      connectionStatus.setStatus('disconnected')
      return false
    }
    
    connectionStatus.setStatus('connected')
    return true
  } catch (error) {
    connectionStatus.setStatus('disconnected')
    return false
  }
}

/**
 * Automatic reconnection with status updates
 */
export async function autoReconnect(): Promise<boolean> {
  try {
    connectionStatus.setStatus('reconnecting')
    
    const { reconnectSupabase } = await import('./supabaseConnectionManager')
    const success = await reconnectSupabase()
    
    if (success) {
      connectionStatus.setStatus('connected')
    } else {
      connectionStatus.setStatus('disconnected')
    }
    
    return success
  } catch (error) {
    connectionStatus.setStatus('disconnected')
    return false
  }
}
