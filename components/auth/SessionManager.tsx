'use client'

import { useEffect, useRef } from 'react'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'

export function SessionManager() {
  const supabase = getSupabaseClient()
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

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email)
        
        // ✅ Only reload on SIGNED_OUT (not SIGNED_IN to prevent restart loop)
        if (event === 'SIGNED_OUT') {
          window.location.href = '/'
        }
        // SIGNED_IN will be handled by the Providers component
      }
    )

    return () => {
      subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // supabase is stable, no need in deps

  return null
}
