'use client'

import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { getStableSupabaseClient } from '@/lib/stableConnection'
import { User } from '@supabase/supabase-js'
import { User as AppUser } from '@/lib/supabase'
import { SessionManager } from '@/components/auth/SessionManager'
import { authPersistenceManager } from '@/lib/authPersistence'
import { sessionPersistenceManager } from '@/lib/sessionPersistence'

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
        console.log('🔄 AuthProvider: Initializing authentication...')
        
        // Check if we're in a reload scenario by looking at multiple indicators
        const isReload = typeof window !== 'undefined' && (
          window.performance?.navigation?.type === 1 || 
          sessionStorage.getItem('auth_reload_check') === 'true' ||
          document.referrer === window.location.href ||
          (window.performance?.getEntriesByType('navigation')[0] as any)?.type === 'reload' ||
          window.location.href.includes('localhost:3000') || // Allow localhost reloads
          window.location.href.includes('127.0.0.1') // Allow localhost reloads
        )
        
        if (isReload) {
          console.log('🔄 AuthProvider: Detected page reload, waiting for session recovery...')
          // Set reload flag in sessionStorage to help with detection
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('auth_reload_check', 'true')
          }
          // Wait longer for session to recover on reload
          await new Promise(resolve => setTimeout(resolve, 3000))
        } else {
          // For new tabs, wait a bit for storage to sync
          if (typeof window !== 'undefined') {
            await new Promise(resolve => setTimeout(resolve, 500))
          }
        }
        
        // First try to get session with retry mechanism
        let session = null
        let retries = isReload ? 15 : 5 // Increased retries for better session recovery
        
        while (retries > 0) {
          try {
            const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession()
            
            if (sessionError) {
              console.log('⚠️ AuthProvider: Session error:', sessionError.message)
              retries--
              if (retries > 0) {
                await new Promise(resolve => setTimeout(resolve, isReload ? 1000 : 2000))
                continue
              }
            } else {
              session = currentSession
              break
            }
          } catch (error) {
            console.log('⚠️ AuthProvider: Session fetch error:', error)
            retries--
            if (retries > 0) {
              await new Promise(resolve => setTimeout(resolve, isReload ? 1000 : 2000))
              continue
            }
          }
        }
        
        console.log('📊 AuthProvider: Session status:', {
          hasSession: !!session,
          userEmail: session?.user?.email,
          expiresAt: session?.expires_at,
          isExpired: session?.expires_at ? new Date(session.expires_at * 1000) < new Date() : false,
          isReload,
          timeUntilExpiry: session?.expires_at ? Math.floor((session.expires_at * 1000 - Date.now()) / 1000 / 60) : 0
        })
        
        if (mounted.current) {
          setUser(session?.user ?? null)
          
          // Only try to fetch profile if user exists and session is valid
          if (session?.user && session.expires_at && new Date(session.expires_at * 1000) > new Date()) {
            console.log('✅ AuthProvider: Valid session found, fetching user profile...')
            try {
              const { data: profile, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', session.user.id)
                .single()
              
              if (error) {
                console.log('⚠️ AuthProvider: User profile not found:', error.message)
                setAppUser(null)
              } else {
                console.log('✅ AuthProvider: User profile loaded successfully')
                setAppUser(profile)
              }
            } catch (error) {
              console.log('❌ AuthProvider: Error fetching user profile:', error)
              setAppUser(null)
            }
          } else if (session?.user && session.expires_at && new Date(session.expires_at * 1000) <= new Date()) {
            console.log('⚠️ AuthProvider: Session expired, attempting to refresh...')
            try {
              const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
              if (refreshError) {
                console.log('❌ AuthProvider: Session refresh failed:', refreshError.message)
                setAppUser(null)
              } else if (refreshData.session) {
                console.log('✅ AuthProvider: Session refreshed successfully')
                setUser(refreshData.session.user)
                // Try to fetch profile with refreshed session
                try {
                  const { data: profile, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', refreshData.session.user.id)
                    .single()
                  
                  if (error) {
                    console.log('⚠️ AuthProvider: User profile not found after refresh:', error.message)
                    setAppUser(null)
                  } else {
                    console.log('✅ AuthProvider: User profile loaded after refresh')
                    setAppUser(profile)
                  }
                } catch (error) {
                  console.log('❌ AuthProvider: Error fetching user profile after refresh:', error)
                  setAppUser(null)
                }
              }
            } catch (error) {
              console.log('❌ AuthProvider: Error refreshing session:', error)
              setAppUser(null)
            }
          } else {
            console.log('⚠️ AuthProvider: No valid session - but not redirecting immediately')
            setAppUser(null)
          }
          
          setLoading(false)
          
          // Clear reload flag after successful initialization
          if (typeof window !== 'undefined' && isReload) {
            sessionStorage.removeItem('auth_reload_check')
          }
        }
      } catch (error) {
        console.log('❌ AuthProvider: Error initializing auth:', error)
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
      // Initialize auth persistence manager
      authPersistenceManager.initialize()
      // Initialize session persistence manager
      sessionPersistenceManager.initialize()
      initialized.current = true
    }

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted.current) return
        
        console.log('🔄 AuthProvider: Auth state changed:', event, session?.user?.email)
        console.log('📊 AuthProvider: Session details:', {
          event,
          hasSession: !!session,
          userEmail: session?.user?.email,
          expiresAt: session?.expires_at,
          isExpired: session?.expires_at ? new Date(session.expires_at * 1000) < new Date() : false
        })
        
        // ✅ CRITICAL FIX: Handle INITIAL_SESSION event specially
        // INITIAL_SESSION may have session but it might need refresh or has missing expires_at
        if (event === 'INITIAL_SESSION') {
          if (session?.user) {
            // We have a user - always try to fetch profile first
            setUser(session.user) // Set user immediately
            
            // Check if session is valid
            const hasExpiresAt = !!session.expires_at
            const isExpired = hasExpiresAt && session.expires_at ? new Date(session.expires_at * 1000) < new Date() : false
            
            if (isExpired) {
              console.log('⚠️ AuthProvider: INITIAL_SESSION expired, attempting refresh...')
              try {
                // Try to refresh the session
                const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
                
                if (refreshError) {
                  console.log('⚠️ AuthProvider: Session refresh failed, but trying profile fetch anyway:', refreshError.message)
                  // Don't clear appUser - try to fetch profile with current session
                } else if (refreshData?.session) {
                  console.log('✅ AuthProvider: Session refreshed on INITIAL_SESSION')
                  session = refreshData.session
                  setUser(session.user)
                } else {
                  // No refresh available, but we have user - proceed with profile fetch
                  console.log('⚠️ AuthProvider: INITIAL_SESSION has user but no refresh available - proceeding anyway')
                }
              } catch (error) {
                console.log('❌ AuthProvider: Error during INITIAL_SESSION refresh, proceeding anyway:', error)
              }
            } else if (!hasExpiresAt) {
              // Session has no expires_at - might be valid, try profile fetch
              console.log('⚠️ AuthProvider: INITIAL_SESSION has user but no expires_at - trying profile fetch anyway')
            } else {
              // Session is valid
              console.log('✅ AuthProvider: INITIAL_SESSION has valid session')
            }
            
            // ✅ CRITICAL: Always try to fetch profile if we have a user
            // This ensures we don't lose the user profile even if session has issues
            try {
              const { data: profile, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', session.user.id)
                .single()
              
              if (error) {
                console.log('⚠️ AuthProvider: User profile not found:', error.message)
                // Don't clear appUser immediately - might be temporary
              } else {
                console.log('✅ AuthProvider: User profile loaded successfully')
                setAppUser(profile)
              }
            } catch (error) {
              console.log('❌ AuthProvider: Error fetching user profile:', error)
              // Don't clear appUser - might be network issue
            }
          } else {
            // No user in INITIAL_SESSION - this is normal for logged-out users
            console.log('ℹ️ AuthProvider: INITIAL_SESSION has no user (user not logged in)')
            setUser(null)
            setAppUser(null)
          }
          setLoading(false)
          return // Don't process further for INITIAL_SESSION
        }
        
        // Handle other events (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, etc.)
        setUser(session?.user ?? null)
        
        // Only process if session is valid and not expired
        if (session?.user && session.expires_at && new Date(session.expires_at * 1000) > new Date()) {
          console.log('✅ AuthProvider: Valid session, fetching profile...')
          try {
            const { data: profile, error } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single()
            
            if (error) {
              console.log('⚠️ AuthProvider: User profile not found:', error.message)
              setAppUser(null)
            } else {
              console.log('✅ AuthProvider: User profile loaded successfully')
              setAppUser(profile)
            }
          } catch (error) {
            console.log('❌ AuthProvider: Error fetching user profile:', error)
            setAppUser(null)
          }
        } else if (session?.user && session.expires_at && new Date(session.expires_at * 1000) <= new Date()) {
          // Session expired - try to refresh
          console.log('⚠️ AuthProvider: Session expired, attempting refresh...')
          try {
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
            if (refreshError) {
              console.log('❌ AuthProvider: Session refresh failed:', refreshError.message)
              setAppUser(null)
            } else if (refreshData?.session) {
              console.log('✅ AuthProvider: Session refreshed successfully')
              setUser(refreshData.session.user)
              // Fetch profile with refreshed session
              try {
                const { data: profile, error } = await supabase
                  .from('users')
                  .select('*')
                  .eq('id', refreshData.session.user.id)
                  .single()
                
                if (error) {
                  console.log('⚠️ AuthProvider: User profile not found after refresh:', error.message)
                  setAppUser(null)
                } else {
                  console.log('✅ AuthProvider: User profile loaded after refresh')
                  setAppUser(profile)
                }
              } catch (error) {
                console.log('❌ AuthProvider: Error fetching user profile after refresh:', error)
                setAppUser(null)
              }
            }
          } catch (error) {
            console.log('❌ AuthProvider: Error refreshing session:', error)
            setAppUser(null)
          }
        } else if (!session?.user) {
          // No session at all - user is logged out
          console.log('ℹ️ AuthProvider: No session - user is logged out')
          setAppUser(null)
        } else {
          // Session exists but no expires_at or other issue
          console.log('⚠️ AuthProvider: Session exists but has issues - trying profile fetch anyway')
          if (session.user) {
            try {
              const { data: profile, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', session.user.id)
                .single()
              
              if (!error && profile) {
                console.log('✅ AuthProvider: Profile fetched successfully despite session issues')
                setAppUser(profile)
              } else {
                console.log('⚠️ AuthProvider: Could not fetch profile')
                setAppUser(null)
              }
            } catch (error) {
              console.log('❌ AuthProvider: Error fetching profile:', error)
              setAppUser(null)
            }
          }
        }
        
        setLoading(false)
      }
    )

    return () => {
      mounted.current = false
      subscription.unsubscribe()
      // Clean up auth persistence manager
      authPersistenceManager.destroy()
      // Clean up session persistence manager
      sessionPersistenceManager.destroy()
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
