'use client'

/**
 * SessionManager Component
 * 
 * This component is now a lightweight wrapper that initializes
 * the professional session manager. The actual session management
 * is handled by professionalSessionManager.
 */

import { useEffect, useRef } from 'react'
import { professionalSessionManager } from '@/lib/professionalSessionManager'

export function SessionManager() {
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return

    // Initialize the professional session manager
    professionalSessionManager.initialize()
    initialized.current = true

    console.log('✅ SessionManager: Professional session manager initialized')

    // Cleanup on unmount
    return () => {
      // Note: We don't destroy the session manager here because it's a singleton
      // that should persist across component unmounts
    }
  }, [])

  return null
}
