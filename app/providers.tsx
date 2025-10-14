'use client'

import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { getStableSupabaseClient } from '@/lib/stableConnection'
import { User } from '@supabase/supabase-js'
import { User as AppUser } from '@/lib/supabase'
import { SessionManager } from '@/components/auth/SessionManager'

interface AuthContextType {
  user: User | null
  appUser: AppUser | null
  loading: boolean
  signOut: () => Promise<void>
  refreshUserProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  appUser: null,
  loading: true,
  signOut: async () => {},
  refreshUserProfile: async () => {}
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = getStableSupabaseClient() // ✅ Use STABLE connection - حل نهائي
  const initialized = useRef(false)
  const mounted = useRef(true)

  // Function to refresh user profile data
  const refreshUserProfile = async () => {
    if (!user?.id) return
    
    try {
      console.log('🔄 Providers: Refreshing user profile...')
      console.log('👤 Current user ID:', user.id)
      
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (error) {
        console.log('❌ Providers: Error refreshing user profile:', error)
      } else {
        console.log('✅ Providers: User profile refreshed successfully')
        console.log('📊 Providers: New data:', {
          email: (profile as any).email,
          role: (profile as any).role,
          permissions: (profile as any).permissions,
          permissionsLength: (profile as any).permissions?.length,
          customEnabled: (profile as any).custom_permissions_enabled,
          updated_at: (profile as any).updated_at
        })
        setAppUser(profile)
        console.log('✅ Providers: appUser state updated')
      }
    } catch (error) {
      console.log('❌ Providers: Error refreshing user profile:', error)
    }
  }

  // Expose refresh function globally
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).refreshUserProfile = refreshUserProfile
    }
  }, [user?.id])

  useEffect(() => {
    mounted.current = true

    // تجنب التهيئة المتعددة
    if (initialized.current) {
      return
    }
    initialized.current = true

    const initializeAuth = async () => {
      try {
        // First try to get session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.log('No active session found:', sessionError.message)
        }
        
        if (mounted.current) {
          setUser(session?.user ?? null)
          
          // Only try to fetch profile if user exists
          if (session?.user) {
            try {
              const { data: profile, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', session.user.id)
                .single()
              
              if (error) {
                console.log('User profile not found, will be created on first login')
                setAppUser(null)
              } else {
                setAppUser(profile)
              }
            } catch (error) {
              console.log('Error fetching user profile:', error)
              setAppUser(null)
            }
          } else {
            setAppUser(null)
          }
          
          setLoading(false)
        }
      } catch (error) {
        console.log('Error initializing auth:', error)
        if (mounted.current) {
          setUser(null)
          setAppUser(null)
          setLoading(false)
        }
      }
    }

    // Initialize auth only once on mount
    if (!initialized.current) {
      initializeAuth()
      initialized.current = true
    }

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted.current) return
        
        console.log('🔄 Providers: Auth state changed:', event, session?.user?.email)
        
        setUser(session?.user ?? null)
        
        if (session?.user) {
          console.log('✅ Providers: User session valid, fetching profile...')
          try {
            const { data: profile, error } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single()
            
            if (error) {
              console.log('⚠️ Providers: User profile not found, will be created on first login')
              setAppUser(null)
            } else {
              console.log('✅ Providers: User profile loaded successfully')
              setAppUser(profile)
            }
          } catch (error) {
            console.log('❌ Providers: Error fetching user profile:', error)
            setAppUser(null)
          }
        } else {
          console.log('❌ Providers: No user session - clearing app user')
          setAppUser(null)
        }
        
        setLoading(false)
      }
    )

    return () => {
      mounted.current = false
      subscription.unsubscribe()
    }
    // ✅ FIXED: Remove supabase from dependencies to prevent infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Empty dependency array - run only once on mount

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      setAppUser(null)
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <AuthContext.Provider value={{ user, appUser, loading, signOut, refreshUserProfile }}>
      <SessionManager />
      {children}
    </AuthContext.Provider>
  )
}
