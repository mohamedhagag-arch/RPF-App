'use client'

import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
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
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const profileLoadingRef = useRef<Set<string>>(new Set()) // Prevent duplicate profile loads

  // Function to refresh user profile data (with deduplication)
  const refreshUserProfile = useCallback(async () => {
    if (!user?.id) return
    
    // Prevent duplicate loads
    if (profileLoadingRef.current.has(user.id)) {
      return
    }
    
    profileLoadingRef.current.add(user.id)
    
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
    } finally {
      profileLoadingRef.current.delete(user.id)
    }
  }, [user?.id, supabase])

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
  }, [refreshUserProfile])

  // Session check function
  const checkSession = useCallback(async (forceCheck: boolean = false) => {
    if (!mounted.current) return
    
    try {
      const session = await professionalSessionManager.checkSession(forceCheck)
      
      if (session?.user && mounted.current) {
        setUser(session.user)
        setLoading(false)
        
        // Fetch profile if needed (with deduplication)
        if ((!appUser || appUser.id !== session.user.id) && !profileLoadingRef.current.has(session.user.id)) {
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
  }, [appUser, refreshUserProfile])

  // Initialize session manager and subscribe to changes
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    mounted.current = true
    console.log('🔧 Providers: Initializing with professional session manager...')

    // Initialize session manager (non-blocking)
    professionalSessionManager.initialize().catch(err => {
      console.warn('⚠️ Providers: Session manager init error:', err)
    })

    // Subscribe to session state changes
    const unsubscribe = professionalSessionManager.subscribe(async (state: SessionState) => {
      if (!mounted.current) return

      // ✅ محسّن: تحديث loading state بشكل ذكي مع offline support
      const shouldBeLoading = state.isLoading || (state.isRecovering && !state.isOffline)
      
      if (shouldBeLoading) {
        setLoading(true)
        
        // Clear existing timeout
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current)
        }
        
        // Force loading to false after max time (safety net)
        loadingTimeoutRef.current = setTimeout(() => {
          if (mounted.current) {
            console.warn('⚠️ Providers: Force stopping loading after timeout')
            setLoading(false)
          }
        }, 2000) // 2 seconds max (محسّن)
      } else {
        // Clear timeout if loading stopped
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current)
          loadingTimeoutRef.current = null
        }
        setLoading(false)
      }

      // Update user from session
      if (state.user) {
        // Only update if user changed (prevent unnecessary re-renders)
        if (!user || user.id !== state.user.id) {
          setUser(state.user)
        }
        
        // Fetch profile if we don't have it or if user changed (with deduplication)
        if ((!appUser || appUser.id !== state.user.id) && !profileLoadingRef.current.has(state.user.id)) {
          profileLoadingRef.current.add(state.user.id)
          
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
          } finally {
            profileLoadingRef.current.delete(state.user.id)
          }
        }
      } else {
        // No user - clear state
        setUser(null)
        setAppUser(null)
      }
    })

    // Initial session check (non-blocking, with timeout)
    // Use cached session immediately if available (optimistic)
    const initialState = professionalSessionManager.getState()
    if (initialState.session && initialState.user) {
      setUser(initialState.user)
      setLoading(false)
      // Load profile in background
      if (!profileLoadingRef.current.has(initialState.user.id)) {
        refreshUserProfile()
      }
    } else {
      professionalSessionManager.checkSession(false).then(() => {
        // Force loading to false after max 2 seconds
        setTimeout(() => {
          if (mounted.current) {
            setLoading(false)
          }
        }, 2000)
      }).catch(err => {
        console.warn('⚠️ Providers: Initial session check error:', err)
        if (mounted.current) {
          setLoading(false)
        }
      })
    }

    // Cleanup
    return () => {
      mounted.current = false
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current)
      }
      unsubscribe()
    }
  }, []) // Empty deps - run only once

  const signOut = useCallback(async () => {
    await professionalSessionManager.signOut()
    setUser(null)
    setAppUser(null)
    setLoading(false)
  }, [])

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
