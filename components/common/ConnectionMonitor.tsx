'use client'

import { useEffect } from 'react'
import { checkConnection, getConnectionInfo } from '@/lib/simpleConnectionManager'

/**
 * Simple Connection Monitor Component
 * 
 * Uses the simple connection manager to prevent "Syncing..." issues
 * Minimal monitoring without complex intervals
 */
export function ConnectionMonitor() {
  useEffect(() => {
    console.log('🔍 Simple Connection Monitor: Starting...')
    
    // Initial connection check
    checkConnection()
    
    // Simple periodic check every 60 seconds (less frequent)
    const checkInterval = setInterval(async () => {
      const isConnected = await checkConnection()
      const info = getConnectionInfo()
      
      console.log('📊 Connection Status:', {
        isConnected,
        isInitialized: info.isInitialized,
        hasClient: info.hasClient
      })
    }, 60000) // كل دقيقة بدلاً من كل 30 ثانية
    
    return () => {
      console.log('🔍 Simple Connection Monitor: Cleanup')
      clearInterval(checkInterval)
    }
  }, [])

  // This component doesn't render anything visible
  return null
}

export default ConnectionMonitor
