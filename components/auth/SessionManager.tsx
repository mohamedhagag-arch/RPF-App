'use client'

import { useEffect, useRef } from 'react'
import { getSupabaseClient } from '@/lib/supabaseConnectionManager'

export function SessionManager() {
  const supabase = getSupabaseClient() // ✅ Use managed connection
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return

    const initializeSession = async () => {
      try {
        // Check for existing session
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.log('No active session found:', error.message)
          return
        }

        if (session) {
          console.log('Session found:', session.user.email)
        } else {
          console.log('No active session')
        }
      } catch (error) {
        console.log('Error initializing session:', error)
      }
    }

    initializeSession()
    initialized.current = true

    // ✅ DISABLED: Auth state change listener to prevent duplicate events
    // The Providers component already handles auth state changes
    // This prevents duplicate "Auth state changed" messages in console
    
    return () => {
      // No cleanup needed since we're not listening to auth changes
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // supabase is stable, no need in deps

  return null
}
