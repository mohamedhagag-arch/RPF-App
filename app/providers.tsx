'use client'

import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
import { User } from '@supabase/supabase-js'
import { User as AppUser } from '@/lib/supabase'
import { SessionManager } from '@/components/auth/SessionManager'

interface AuthContextType {
  user: User | null
  appUser: AppUser | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  appUser: null,
  loading: true,
  signOut: async () => {},
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
  const supabase = getSupabaseClient() // ✅ Use managed connection
  const initialized = useRef(false)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true

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

    // Always initialize auth on mount
    initializeAuth()

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted.current) return
        
        console.log('Auth state changed:', event, session?.user?.email)
        
        setUser(session?.user ?? null)
        
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
    <AuthContext.Provider value={{ user, appUser, loading, signOut }}>
      <SessionManager />
      {children}
    </AuthContext.Provider>
  )
}
