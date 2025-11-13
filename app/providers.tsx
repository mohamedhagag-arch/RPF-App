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
  checkSession: (forceCheck?: boolean) => Promise<void> // ✅ Add session check function
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  appUser: null,
  loading: true,
  signOut: async () => {},
  refreshUserProfile: async () => {},
  checkSession: async (_forceCheck?: boolean) => {} // ✅ Add session check function
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

  // ✅ FIXED: Function to manually check session (for tab focus/visibility)
  const checkSessionManually = async (forceCheck: boolean = false) => {
    if (!mounted.current) return
    
    try {
      console.log('🔄 AuthProvider: Manually checking session...', { forceCheck, hasUser: !!user })
      
      // ✅ FIXED: If we already have a user, don't check again unnecessarily
      if (user && !forceCheck) {
        console.log('✅ AuthProvider: User already set, skipping manual check')
        if (mounted.current) {
          setLoading(false)
        }
        return
      }
      
      // ✅ IMPROVED: Try getSession first, then refreshSession if needed
      let session = null
      let { data: { session: currentSession }, error } = await supabase.auth.getSession()
      
      if (!error && currentSession?.user) {
        session = currentSession
      } else if (error) {
        console.log('⚠️ AuthProvider: Manual session check error, trying refresh...', error.message)
        
        // ✅ If getSession fails, try refreshSession
        try {
          const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession()
          
          if (!refreshError && refreshedSession?.user) {
            console.log('✅ AuthProvider: Session refreshed during manual check')
            session = refreshedSession
          } else if (refreshError) {
            console.log('⚠️ AuthProvider: Session refresh also failed:', refreshError.message)
            if (forceCheck && mounted.current) {
              setLoading(false)
            }
            return
          }
        } catch (refreshErr) {
          console.log('❌ AuthProvider: Error during refresh in manual check:', refreshErr)
          if (forceCheck && mounted.current) {
            setLoading(false)
          }
          return
        }
      }
      
      if (session?.user) {
        // Only update if different or if we don't have a user
        if (!user || user.id !== session.user.id) {
          console.log('✅ AuthProvider: Session found on manual check:', session.user.email)
          setUser(session.user)
          setLoading(false)
          
          // Fetch profile only if we don't have it
          if (!appUser || appUser.id !== session.user.id) {
            ;(async () => {
              try {
                const { data: profile, error } = await supabase
                  .from('users')
                  .select('*')
                  .eq('id', session.user.id)
                  .single()
                
                if (!error && profile && mounted.current) {
                  console.log('✅ AuthProvider: Profile loaded on manual check')
                  setAppUser(profile)
                }
              } catch (error) {
                console.log('❌ AuthProvider: Error fetching profile on manual check:', error)
              }
            })()
          } else {
            setLoading(false)
          }
        } else {
          // User already matches, just ensure loading is false
          if (mounted.current) {
            setLoading(false)
          }
        }
      } else {
        // No session - only update if we currently have a user
        if (user) {
          console.log('⚠️ AuthProvider: Session lost on manual check')
          setUser(null)
          setAppUser(null)
        }
        if (forceCheck && mounted.current) {
          setLoading(false)
        }
      }
    } catch (error) {
      console.log('❌ AuthProvider: Error in manual session check:', error)
      if (forceCheck && mounted.current) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    mounted.current = true

    // تجنب التهيئة المتعددة
    if (initialized.current) {
      return
    }
    initialized.current = true

    // ✅ CRITICAL: Set up auth state change listener FIRST (before anything else)
    // This ensures we catch SIGNED_IN events that happen early
    console.log('🔧 AuthProvider: Setting up onAuthStateChange listener FIRST...')
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔔 AuthProvider: onAuthStateChange triggered!', event, session?.user?.email || 'no user')
        
        if (!mounted.current) {
          console.log('⚠️ AuthProvider: Component not mounted, ignoring event')
          return
        }
        
        console.log('🔄 AuthProvider: Auth state changed:', event, session?.user?.email)
        
        // ✅ CRITICAL FIX: Handle SIGNED_IN event FIRST - this is the key event!
        if (event === 'SIGNED_IN') {
          console.log('🎯 AuthProvider: SIGNED_IN handler triggered!', {
            hasSession: !!session,
            hasUser: !!user,
            sessionUserId: session?.user?.id,
            currentUserId: user?.id
          })
          
          if (session?.user) {
            console.log('✅ AuthProvider: SIGNED_IN event received with session:', session.user.email)
            setUser(session.user)
            setLoading(false) // ✅ CRITICAL: Set loading to false immediately
            
            // Fetch profile
            ;(async () => {
              try {
                const { data: profile, error } = await supabase
                  .from('users')
                  .select('*')
                  .eq('id', session.user.id)
                  .single()
                
                if (!error && profile && mounted.current) {
                  console.log('✅ AuthProvider: User profile loaded from SIGNED_IN')
                  setAppUser(profile)
                } else if (error) {
                  console.log('⚠️ AuthProvider: Profile error:', error.message)
                }
              } catch (error) {
                console.log('❌ AuthProvider: Error fetching profile from SIGNED_IN:', error)
              }
            })()
          } else {
            // SIGNED_IN but no session in event - try to get it manually
            console.log('⚠️ AuthProvider: SIGNED_IN event but no session in event, fetching...')
            setTimeout(async () => {
              try {
                const { data: { session: fetchedSession }, error } = await supabase.auth.getSession()
                console.log('🔍 AuthProvider: Fetched session after SIGNED_IN:', {
                  hasSession: !!fetchedSession,
                  hasError: !!error,
                  error: error?.message
                })
                
                if (!error && fetchedSession?.user && mounted.current) {
                  console.log('✅ AuthProvider: Session fetched after SIGNED_IN:', fetchedSession.user.email)
                  setUser(fetchedSession.user)
                  setLoading(false)
                  
                  // Fetch profile
                  const { data: profile, error: profileError } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', fetchedSession.user.id)
                    .single()
                  
                  if (!profileError && profile && mounted.current) {
                    console.log('✅ AuthProvider: Profile loaded after SIGNED_IN fetch')
                    setAppUser(profile)
                  }
                } else if (error) {
                  console.log('❌ AuthProvider: Error fetching session:', error.message)
                  setLoading(false) // Still set loading to false
                }
              } catch (error) {
                console.log('❌ AuthProvider: Error fetching session after SIGNED_IN:', error)
                setLoading(false) // Still set loading to false
              }
            }, 100)
          }
          
          // ✅ CRITICAL: Always set loading to false for SIGNED_IN
          setLoading(false)
          return // Don't process further
        }

        // ✅ FIXED: Handle INITIAL_SESSION event - this confirms/updates session state
        if (event === 'INITIAL_SESSION') {
          console.log('✅ AuthProvider: INITIAL_SESSION event received', {
            hasSession: !!session?.user,
            currentUser: !!user,
            tabVisible: !document.hidden
          })
          
          // Only update if we don't already have a user, or if session changed
          if (session?.user) {
            // Update user if different or if we don't have one
            if (!user || user.id !== session.user.id) {
              console.log('✅ AuthProvider: Updating user from INITIAL_SESSION:', session.user.email)
              setUser(session.user)
              setLoading(false)
              
              // Fetch profile if we don't have it yet
              if (!appUser || appUser.id !== session.user.id) {
                ;(async () => {
                  try {
                    const { data: profile, error } = await supabase
                      .from('users')
                      .select('*')
                      .eq('id', session.user.id)
                      .single()
                    
                    if (!error && profile && mounted.current) {
                      console.log('✅ AuthProvider: User profile loaded from INITIAL_SESSION')
                      setAppUser(profile)
                    }
                  } catch (error) {
                    console.log('❌ AuthProvider: Error fetching profile:', error)
                  }
                })()
              }
            } else {
              // User already set, just ensure loading is false
              if (mounted.current) {
                setLoading(false)
              }
            }
          } else {
            // No session - only update if we currently have a user
            if (user) {
              console.log('⚠️ AuthProvider: Session lost in INITIAL_SESSION')
              setUser(null)
              setAppUser(null)
            }
            // Always set loading to false
            if (mounted.current) {
              setLoading(false)
            }
          }
          return // Don't process further for INITIAL_SESSION
        }
        
        // Handle other events (SIGNED_OUT, TOKEN_REFRESHED, etc.)
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    const initializeAuth = async () => {
      try {
        console.log('🔄 AuthProvider: Initializing authentication...')
        
        // ✅ CRITICAL FIX: Check session IMMEDIATELY (don't wait for events)
        // This ensures the page loads even if INITIAL_SESSION doesn't fire
        try {
          // ✅ IMPROVED: Try getSession first, then refreshSession if needed
          let session = null
          let { data: { session: currentSession }, error } = await supabase.auth.getSession()
          
          if (!error && currentSession?.user) {
            session = currentSession
            console.log('✅ AuthProvider: Session found immediately:', session.user.email)
          } else if (error) {
            console.log('⚠️ AuthProvider: Session check error, trying refresh...', error.message)
            
            // ✅ If getSession fails, try refreshSession
            try {
              const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession()
              
              if (!refreshError && refreshedSession?.user) {
                console.log('✅ AuthProvider: Session refreshed during initialization')
                session = refreshedSession
              } else if (refreshError) {
                console.log('⚠️ AuthProvider: Session refresh also failed:', refreshError.message)
              }
            } catch (refreshErr) {
              console.log('❌ AuthProvider: Error during refresh in initialization:', refreshErr)
            }
          }
          
          if (session?.user) {
            console.log('✅ AuthProvider: Session found/refreshed:', session.user.email)
            setUser(session.user)
            setLoading(false) // ✅ CRITICAL: Set loading to false IMMEDIATELY
            
            // Fetch profile asynchronously (don't block)
            ;(async () => {
              try {
                const { data: profile, error } = await supabase
                  .from('users')
                  .select('*')
                  .eq('id', session.user.id)
                  .single()
                
                if (!error && profile && mounted.current) {
                  console.log('✅ AuthProvider: User profile loaded')
                  setAppUser(profile)
                }
              } catch (error) {
                console.log('❌ AuthProvider: Error fetching profile:', error)
              }
            })()
          } else {
            console.log('ℹ️ AuthProvider: No session found after all attempts')
            if (mounted.current) {
              setUser(null)
              setAppUser(null)
              setLoading(false) // ✅ CRITICAL: Set loading to false even if no session
            }
          }
        } catch (error) {
          console.log('❌ AuthProvider: Error checking session:', error)
          if (mounted.current) {
            setLoading(false)
          }
        }
        
        console.log('✅ AuthProvider: Session check complete, listening for auth changes...')
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
      
      // ✅ CRITICAL: Auto-retry session recovery if no user after delays
      // This ensures the page loads even if initial check fails
      // Use multiple retries to handle different scenarios
      const autoRetryTimeout1 = setTimeout(() => {
        if (mounted.current) {
          // Check current state (not closure)
          checkSessionManually(true)
        }
      }, 800) // First retry after 0.8 seconds
      
      const autoRetryTimeout2 = setTimeout(() => {
        if (mounted.current) {
          checkSessionManually(true)
        }
      }, 2000) // Second retry after 2 seconds
      
      const autoRetryTimeout3 = setTimeout(() => {
        if (mounted.current) {
          checkSessionManually(true)
        }
      }, 4000) // Third retry after 4 seconds
      
      return () => {
        clearTimeout(autoRetryTimeout1)
        clearTimeout(autoRetryTimeout2)
        clearTimeout(autoRetryTimeout3)
      }
    }

    // ✅ FIXED: Listen for visibility changes (tab focus/blur)
    const handleVisibilityChange = () => {
      if (!document.hidden && mounted.current) {
        console.log('🔄 AuthProvider: Tab became visible, checking session...')
        // Small delay to ensure tab is fully active
        setTimeout(() => {
          checkSessionManually()
        }, 100)
      }
    }

    // ✅ FIXED: Listen for window focus (switching back to tab)
    const handleFocus = () => {
      if (mounted.current) {
        console.log('🔄 AuthProvider: Window focused, checking session...')
        setTimeout(() => {
          checkSessionManually()
        }, 100)
      }
    }

    if (typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange)
      window.addEventListener('focus', handleFocus)
    }

    // Cleanup function
    return () => {
      mounted.current = false
      subscription.unsubscribe()
      // Clean up auth persistence manager
      authPersistenceManager.destroy()
      // Clean up session persistence manager
      sessionPersistenceManager.destroy()
      if (typeof window !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        window.removeEventListener('focus', handleFocus)
      }
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
    <AuthContext.Provider value={{ user, appUser, loading, signOut, refreshUserProfile, checkSession: checkSessionManually }}>
      <SessionManager />
      {children}
    </AuthContext.Provider>
  )
}
