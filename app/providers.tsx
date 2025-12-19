'use client'

import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { getStableSupabaseClient } from '@/lib/stableConnection'
import { User } from '@supabase/supabase-js'
import { User as AppUser } from '@/lib/supabase'
import { professionalSessionManager } from '@/lib/professionalSessionManager'
import type { SessionState } from '@/lib/professionalSessionManager'

interface AuthContextType {
  user: User | null
  appUser: AppUser | null
  loading: boolean
  signOut: () => Promise<void>
  refreshUserProfile: () => Promise<void>
  checkSession: (forceCheck?: boolean) => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  appUser: null,
  loading: true,
  signOut: async () => {},
  refreshUserProfile: async () => {},
  checkSession: async (_forceCheck?: boolean) => {}
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
  const supabase = getStableSupabaseClient()
  const mounted = useRef(true)
  const initialized = useRef(false)

  // Function to refresh user profile data
  const refreshUserProfile = async () => {
    if (!user?.id) return
    
    try {
      console.log('🔄 Providers: Refreshing user profile...')
      
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (error) {
        console.log('❌ Providers: Error refreshing user profile:', error)
      } else {
        const profileData = profile as any
        const cleanedProfile: AppUser = {
          ...profileData,
          permissions: Array.isArray(profileData.permissions) 
            ? profileData.permissions 
            : []
        }
        
        // Load default role overrides to refresh cache
        try {
          const { clearDefaultRoleOverridesCache } = await import('@/lib/permissionsSystem')
          clearDefaultRoleOverridesCache()
        } catch (err) {
          console.warn('⚠️ Could not clear role overrides cache:', err)
        }
        
        console.log('✅ Providers: User profile refreshed successfully')
        if (mounted.current) {
          setAppUser(cleanedProfile)
        }
      }
    } catch (error) {
      console.log('❌ Providers: Error refreshing user profile:', error)
    }
  }

  // Load default role overrides cache on mount
  useEffect(() => {
    const loadRoleOverridesCache = async () => {
      try {
        const { getUserPermissionsAsync } = await import('@/lib/permissionsSystem')
        await getUserPermissionsAsync({
          id: 'dummy',
          email: 'dummy@example.com',
          full_name: 'Dummy',
          role: 'viewer',
          permissions: [],
          custom_permissions_enabled: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_active: true
        } as any)
      } catch (err) {
        console.warn('⚠️ Could not pre-load role overrides cache:', err)
      }
    }
    
    if (user?.id) {
      loadRoleOverridesCache()
    }
  }, [user?.id])

  // Expose refresh function globally
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).refreshUserProfile = refreshUserProfile
    }
  }, [user?.id])

  // Session check function
  const checkSession = async (forceCheck: boolean = false) => {
    if (!mounted.current) return
    
    try {
      const session = await professionalSessionManager.checkSession(forceCheck)
      
      if (session?.user && mounted.current) {
        setUser(session.user)
        setLoading(false)
        
        // Fetch profile if needed
        if (!appUser || appUser.id !== session.user.id) {
          refreshUserProfile()
        }
      } else if (mounted.current) {
        setUser(null)
        setAppUser(null)
        setLoading(false)
      }
    } catch (error) {
      console.log('❌ Providers: Error checking session:', error)
      if (mounted.current) {
        setLoading(false)
      }
    }
  }

  // Initialize session manager and subscribe to changes
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    mounted.current = true
    console.log('🔧 Providers: Initializing with professional session manager...')

    // Initialize session manager
    professionalSessionManager.initialize()

    // Subscribe to session state changes
    const unsubscribe = professionalSessionManager.subscribe(async (state: SessionState) => {
      if (!mounted.current) return

      console.log('🔔 Providers: Session state changed:', {
        isLoading: state.isLoading,
        isRecovering: state.isRecovering,
        hasUser: !!state.user,
        userEmail: state.user?.email
      })

      // Update loading state (keep loading true if recovering or checking)
      // This prevents premature redirects during session recovery
      setLoading(state.isLoading || state.isRecovering || professionalSessionManager.isRecovering())

      // Update user from session
      if (state.user) {
        setUser(state.user)
        
        // Fetch profile if we don't have it or if user changed
        if (!appUser || appUser.id !== state.user.id) {
          try {
            const { data: profile, error } = await supabase
              .from('users')
              .select('*')
              .eq('id', state.user.id)
              .single()
            
            if (!error && profile && mounted.current) {
              const profileData = profile as any
              const cleanedProfile: AppUser = {
                ...profileData,
                permissions: Array.isArray(profileData.permissions) 
                  ? profileData.permissions 
                  : []
              }
              setAppUser(cleanedProfile)
              console.log('✅ Providers: User profile loaded')
            }
          } catch (error) {
            console.log('❌ Providers: Error fetching profile:', error)
          }
        }
      } else {
        // No user - clear state
        setUser(null)
        setAppUser(null)
      }
    })

    // Initial session check (non-blocking)
    professionalSessionManager.checkSession(false).then(() => {
      // Force loading to false after max 1 second
      setTimeout(() => {
        if (mounted.current) {
          setLoading(false)
        }
      }, 1000)
    })

    // Cleanup
    return () => {
      mounted.current = false
      unsubscribe()
    }
  }, []) // Empty deps - run only once

  const signOut = async () => {
    await professionalSessionManager.signOut()
    setUser(null)
    setAppUser(null)
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      appUser, 
      loading, 
      signOut, 
      refreshUserProfile, 
      checkSession 
    }}>
      {children}
    </AuthContext.Provider>
  )
}
