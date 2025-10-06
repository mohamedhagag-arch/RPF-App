'use client'

import { useEffect, useRef } from 'react'
import { checkSupabaseConnection, monitorSupabaseHealth } from '@/lib/supabaseConnectionManager'

/**
 * Connection Monitor Component
 * 
 * Monitors Supabase connection health and prevents "Syncing..." issues
 * by detecting and recovering from connection problems.
 */
export function ConnectionMonitor() {
  const monitorRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    console.log('🔍 Connection Monitor: Starting health monitoring')
    
    // Initial health check
    checkSupabaseConnection()
    
    // Start continuous monitoring with faster intervals
    monitorRef.current = monitorSupabaseHealth()
    
    // Additional connection check every 5 seconds
    const fastCheckInterval = setInterval(async () => {
      const isHealthy = await checkSupabaseConnection()
      if (!isHealthy) {
        console.warn('⚠️ Fast check detected connection issue')
        // Force reconnection
        const { reconnectSupabase } = await import('@/lib/supabaseConnectionManager')
        await reconnectSupabase()
      }
    }, 5000)
    
    return () => {
      console.log('🔍 Connection Monitor: Stopping health monitoring')
      if (monitorRef.current) {
        monitorRef.current()
      }
      clearInterval(fastCheckInterval)
    }
  }, [])

  // This component doesn't render anything visible
  return null
}

export default ConnectionMonitor
