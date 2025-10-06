/**
 * Loading State Manager
 * 
 * This utility ensures loading states are properly managed and never get stuck
 */

/**
 * Loading state manager class
 */
class LoadingStateManager {
  private static instance: LoadingStateManager
  private activeLoaders: Set<string> = new Set()
  private timeoutIds: Map<string, NodeJS.Timeout> = new Map()
  
  static getInstance(): LoadingStateManager {
    if (!LoadingStateManager.instance) {
      LoadingStateManager.instance = new LoadingStateManager()
    }
    return LoadingStateManager.instance
  }
  
  /**
   * Start loading with automatic timeout
   */
  startLoading(loaderId: string, timeoutMs: number = 30000) {
    this.activeLoaders.add(loaderId)
    console.log(`🔄 Loading started: ${loaderId}`)
    
    // Set timeout to force stop loading
    const timeoutId = setTimeout(() => {
      console.warn(`⚠️ Loading timeout for ${loaderId}, forcing stop`)
      this.stopLoading(loaderId)
    }, timeoutMs)
    
    this.timeoutIds.set(loaderId, timeoutId)
  }
  
  /**
   * Stop loading
   */
  stopLoading(loaderId: string) {
    this.activeLoaders.delete(loaderId)
    console.log(`✅ Loading stopped: ${loaderId}`)
    
    // Clear timeout
    const timeoutId = this.timeoutIds.get(loaderId)
    if (timeoutId) {
      clearTimeout(timeoutId)
      this.timeoutIds.delete(loaderId)
    }
  }
  
  /**
   * Check if loading is active
   */
  isLoading(loaderId: string): boolean {
    return this.activeLoaders.has(loaderId)
  }
  
  /**
   * Get all active loaders
   */
  getActiveLoaders(): string[] {
    return Array.from(this.activeLoaders)
  }
  
  /**
   * Force stop all loaders
   */
  stopAllLoaders() {
    console.log('🛑 Force stopping all loaders')
    this.activeLoaders.clear()
    
    // Clear all timeouts
    this.timeoutIds.forEach((timeoutId) => {
      clearTimeout(timeoutId)
    })
    this.timeoutIds.clear()
  }
}

// Export singleton
export const loadingStateManager = LoadingStateManager.getInstance()

/**
 * Safe loading wrapper
 */
export async function withSafeLoading<T>(
  loaderId: string,
  operation: () => Promise<T>,
  timeoutMs: number = 30000
): Promise<T> {
  try {
    loadingStateManager.startLoading(loaderId, timeoutMs)
    const result = await operation()
    return result
  } finally {
    loadingStateManager.stopLoading(loaderId)
  }
}

/**
 * Safe loading state setter
 */
export function createSafeLoadingSetter(loaderId: string) {
  return {
    setLoading: (loading: boolean) => {
      if (loading) {
        loadingStateManager.startLoading(loaderId)
      } else {
        loadingStateManager.stopLoading(loaderId)
      }
    },
    isLoading: () => loadingStateManager.isLoading(loaderId)
  }
}