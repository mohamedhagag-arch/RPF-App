/**
 * Global Syncing Fix
 * 
 * This utility provides a global solution for persistent syncing issues
 */

/**
 * Global syncing state manager
 */
class GlobalSyncingManager {
  private static instance: GlobalSyncingManager
  private activeSyncing: Set<string> = new Set()
  private globalTimeout: NodeJS.Timeout | null = null
  
  static getInstance(): GlobalSyncingManager {
    if (!GlobalSyncingManager.instance) {
      GlobalSyncingManager.instance = new GlobalSyncingManager()
    }
    return GlobalSyncingManager.instance
  }
  
  /**
   * Start global syncing monitoring
   */
  startGlobalMonitoring() {
    if (this.globalTimeout) return
    
    console.log('🌍 Starting global syncing monitoring...')
    
    // Check every 5 seconds for stuck syncing
    this.globalTimeout = setInterval(() => {
      if (this.activeSyncing.size > 0) {
        console.log(`⚠️ Global check: ${this.activeSyncing.size} components still syncing`)
        
        // Force stop all syncing after 20 seconds
        setTimeout(() => {
          if (this.activeSyncing.size > 0) {
            console.warn('🛑 Global force stop: Clearing all syncing states')
            this.forceStopAllSyncing()
          }
        }, 20000)
      }
    }, 5000)
  }
  
  /**
   * Stop global syncing monitoring
   */
  stopGlobalMonitoring() {
    if (this.globalTimeout) {
      clearInterval(this.globalTimeout)
      this.globalTimeout = null
      console.log('🌍 Stopped global syncing monitoring')
    }
  }
  
  /**
   * Register syncing component
   */
  registerSyncing(componentId: string) {
    this.activeSyncing.add(componentId)
    console.log(`📝 Registered syncing: ${componentId}`)
  }
  
  /**
   * Unregister syncing component
   */
  unregisterSyncing(componentId: string) {
    this.activeSyncing.delete(componentId)
    console.log(`✅ Unregistered syncing: ${componentId}`)
  }
  
  /**
   * Force stop all syncing
   */
  forceStopAllSyncing() {
    console.log('🛑 Force stopping all syncing components')
    this.activeSyncing.clear()
    
    // Dispatch global event to stop all syncing
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('forceStopSyncing'))
    }
  }
  
  /**
   * Get active syncing count
   */
  getActiveSyncingCount(): number {
    return this.activeSyncing.size
  }
}

// Export singleton
export const globalSyncingManager = GlobalSyncingManager.getInstance()

/**
 * Global syncing fix hook
 */
export function useGlobalSyncingFix(componentId: string) {
  const registerSyncing = () => {
    globalSyncingManager.registerSyncing(componentId)
  }
  
  const unregisterSyncing = () => {
    globalSyncingManager.unregisterSyncing(componentId)
  }
  
  const forceStopSyncing = () => {
    globalSyncingManager.forceStopAllSyncing()
  }
  
  return {
    registerSyncing,
    unregisterSyncing,
    forceStopSyncing
  }
}

/**
 * Auto-start global monitoring
 */
if (typeof window !== 'undefined') {
  globalSyncingManager.startGlobalMonitoring()
}
