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
        console.log('🔄 SessionManager: Checking for existing session...')
        
        // Check for existing session with retry mechanism
        let session = null
        let retries = 3
        
        while (retries > 0) {
          try {
            const { data: { session: currentSession }, error } = await supabase.auth.getSession()
            
            if (error) {
              console.log('⚠️ SessionManager: Session error:', error.message)
              retries--
              if (retries > 0) {
                await new Promise(resolve => setTimeout(resolve, 1000))
                continue
              }
            } else {
              session = currentSession
              break
            }
          } catch (error) {
            console.log('⚠️ SessionManager: Session fetch error:', error)
            retries--
            if (retries > 0) {
              await new Promise(resolve => setTimeout(resolve, 1000))
              continue
            }
          }
        }
        
        if (session) {
          const isExpired = session.expires_at ? new Date(session.expires_at * 1000) < new Date() : false
          console.log('✅ SessionManager: Session found:', session.user.email)
          console.log('📊 SessionManager: Session details:', {
            expires_at: session.expires_at,
            expires_in: session.expires_in,
            isExpired,
            access_token: session.access_token ? 'Present' : 'Missing',
            refresh_token: session.refresh_token ? 'Present' : 'Missing'
          })
          
          if (isExpired) {
            console.log('⚠️ SessionManager: Session expired, will be refreshed automatically')
          }
        } else {
          console.log('⚠️ SessionManager: No active session found')
        }
      } catch (error) {
        console.log('❌ SessionManager: Error initializing session:', error)
      }
    }

    initializeSession()
    initialized.current = true

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 SessionManager: Auth state changed:', event, session?.user?.email)
        
        const isExpired = session?.expires_at ? new Date(session.expires_at * 1000) < new Date() : false
        
        console.log('📊 SessionManager: Session details:', {
          event,
          hasSession: !!session,
          userEmail: session?.user?.email,
          expiresAt: session?.expires_at,
          isExpired,
          access_token: session?.access_token ? 'Present' : 'Missing',
          refresh_token: session?.refresh_token ? 'Present' : 'Missing'
        })
        
        if (event === 'SIGNED_OUT') {
          console.log('🚪 SessionManager: User signed out - redirecting to login')
          // Clear any reload flags
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('auth_reload_check')
          }
          window.location.href = '/'
        } else if (event === 'SIGNED_IN' && session && !isExpired) {
          console.log('✅ SessionManager: User signed in successfully:', session.user.email)
        } else if (event === 'INITIAL_SESSION') {
          if (session && !isExpired) {
            console.log('✅ SessionManager: Initial session found:', session.user.email)
          } else {
            console.log('⚠️ SessionManager: No valid initial session found')
          }
        } else if (event === 'TOKEN_REFRESHED' && session) {
          console.log('🔄 SessionManager: Token refreshed successfully')
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // supabase is stable, no need in deps

  return null
}
