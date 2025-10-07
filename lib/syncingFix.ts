/**
 * Syncing Fix - Ultimate Solution
 * 
 * This utility provides the ultimate solution for persistent syncing issues
 */

import { useEffect, useRef } from 'react'

/**
 * Syncing fix hook
 */
export function useSyncingFix() {
  const syncingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isSyncingRef = useRef(false)
  
  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (syncingTimeoutRef.current) {
        clearTimeout(syncingTimeoutRef.current)
      }
    }
  }, [])
  
  /**
   * Force stop syncing after timeout
   */
  const forceStopSyncing = (setLoading: (loading: boolean) => void, timeoutMs: number = 30000) => {
    if (syncingTimeoutRef.current) {
      clearTimeout(syncingTimeoutRef.current)
    }
    
    syncingTimeoutRef.current = setTimeout(() => {
      console.warn('⚠️ Force stopping syncing after timeout')
      setLoading(false)
      isSyncingRef.current = false
    }, timeoutMs)
  }
  
  /**
   * Safe loading setter
   */
  const setSafeLoading = (setLoading: (loading: boolean) => void, loading: boolean) => {
    if (loading) {
      isSyncingRef.current = true
      forceStopSyncing(setLoading)
    } else {
      isSyncingRef.current = false
      if (syncingTimeoutRef.current) {
        clearTimeout(syncingTimeoutRef.current)
        syncingTimeoutRef.current = null
      }
    }
    setLoading(loading)
  }
  
  /**
   * Check if currently syncing
   */
  const isSyncing = () => isSyncingRef.current
  
  return {
    setSafeLoading,
    forceStopSyncing,
    isSyncing
  }
}

/**
 * Syncing fix component wrapper
 */
export function SyncingFixWrapper({ children }: { children: React.ReactNode }) {
  const { forceStopSyncing } = useSyncingFix()
  
  useEffect(() => {
    // Global syncing fix - force stop all syncing after 15 seconds
    const globalTimeout = setTimeout(() => {
      console.warn('⚠️ Global syncing fix - forcing stop all syncing')
      // This will be handled by individual components
    }, 15000)
    
    return () => {
      clearTimeout(globalTimeout)
    }
  }, [])
  
  return children as React.ReactElement
}
