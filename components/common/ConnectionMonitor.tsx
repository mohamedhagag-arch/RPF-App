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
    
    // Start continuous monitoring
    monitorRef.current = monitorSupabaseHealth()
    
    return () => {
      console.log('🔍 Connection Monitor: Stopping health monitoring')
      if (monitorRef.current) {
        monitorRef.current()
      }
    }
  }, [])

  // This component doesn't render anything visible
  return null
}

export default ConnectionMonitor
