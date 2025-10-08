'use client'

import { useEffect } from 'react'
import { checkConnection, getConnectionInfo } from '@/lib/simpleConnectionManager'

// إعلان TypeScript للـ window object
declare global {
  interface Window {
    __connectionMonitorActive?: boolean
  }
}

/**
 * Simple Connection Monitor Component
 * 
 * Uses the simple connection manager to prevent "Syncing..." issues
 * Minimal monitoring without complex intervals
 */
export function ConnectionMonitor() {
  useEffect(() => {
    // تجنب تشغيل متعدد
    if (window.__connectionMonitorActive) {
      return
    }
    
    window.__connectionMonitorActive = true
    console.log('🔍 Simple Connection Monitor: Starting...')
    
    // Initial connection check
    checkConnection()
    
    // Simple periodic check every 5 minutes (much less frequent)
    const checkInterval = setInterval(async () => {
      const isConnected = await checkConnection()
      const info = getConnectionInfo()
      
      console.log('📊 Connection Status:', {
        isConnected,
        isInitialized: info.isInitialized,
        hasClient: info.hasClient
      })
    }, 5 * 60 * 1000) // كل 5 دقائق بدلاً من كل دقيقة
    
    return () => {
      console.log('🔍 Simple Connection Monitor: Cleanup')
      clearInterval(checkInterval)
      window.__connectionMonitorActive = false
    }
  }, [])

  // This component doesn't render anything visible
  return null
}

export default ConnectionMonitor
