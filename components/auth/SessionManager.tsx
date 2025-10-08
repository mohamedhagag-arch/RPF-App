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
          console.log('✅ Session found:', session.user.email)
          console.log('📊 Session details:', {
            expires_at: session.expires_at,
            expires_in: session.expires_in,
            access_token: session.access_token ? 'Present' : 'Missing',
            refresh_token: session.refresh_token ? 'Present' : 'Missing'
          })
        } else {
          console.log('⚠️ No active session found')
          // لا نقوم بإعادة توجيه فورية هنا - نترك للمستخدم اختيار تسجيل الدخول
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
        console.log('🔄 Auth state changed:', event, session?.user?.email)
        
        if (event === 'SIGNED_OUT') {
          console.log('🚪 User signed out - redirecting to login')
          window.location.href = '/'
        } else if (event === 'SIGNED_IN' && session) {
          console.log('✅ User signed in successfully:', session.user.email)
          console.log('📊 Session details:', {
            expires_at: session.expires_at,
            expires_in: session.expires_in,
            access_token: session.access_token ? 'Present' : 'Missing',
            refresh_token: session.refresh_token ? 'Present' : 'Missing'
          })
        } else if (event === 'INITIAL_SESSION' && !session) {
          console.log('⚠️ No initial session found - user needs to login')
          // لا نقوم بإعادة توجيه فورية - نترك للمستخدم اختيار تسجيل الدخول
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
