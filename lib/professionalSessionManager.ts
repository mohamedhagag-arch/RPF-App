'use client'

/**
 * Professional Session Manager - نظام إدارة جلسات احترافي
 * 
 * نظام موحد ومنظم لإدارة الجلسات بشكل سلس واحترافي
 * يحل محل الأنظمة المتعددة ويوفر تجربة مستخدم ممتازة
 */

import { getStableSupabaseClient } from './stableConnection'
import { Session, User } from '@supabase/supabase-js'

interface SessionCache {
  session: Session | null
  user: User | null
  timestamp: number
  isValid: boolean
}

interface SessionState {
  isLoading: boolean
  isRecovering: boolean // New: indicates if session recovery is in progress
  session: Session | null
  user: User | null
  error: string | null
}

class ProfessionalSessionManager {
  private static instance: ProfessionalSessionManager
  private supabase = getStableSupabaseClient()
  private cache: SessionCache | null = null
  private cacheTimeout = 5000 // 5 seconds cache
  private listeners: Set<(state: SessionState) => void> = new Set()
  private currentState: SessionState = {
    isLoading: false,
    isRecovering: false,
    session: null,
    user: null,
    error: null
  }
  private isInitialized = false
  private refreshInterval: NodeJS.Timeout | null = null
  private isChecking = false

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): ProfessionalSessionManager {
    if (!ProfessionalSessionManager.instance) {
      ProfessionalSessionManager.instance = new ProfessionalSessionManager()
    }
    return ProfessionalSessionManager.instance
  }

  /**
   * Initialize the session manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    this.isInitialized = true
    console.log('🔧 [SessionManager] Initializing professional session management...')

    // Set up auth state listener
    this.setupAuthStateListener()

    // Set up automatic session refresh
    this.setupAutoRefresh()

    // Initial session check
    await this.checkSession(true)
  }

  /**
   * Set up auth state change listener
   */
  private setupAuthStateListener(): void {
    this.supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`🔔 [SessionManager] Auth event: ${event}`, session?.user?.email || 'no user')

      // Clear cache on auth changes
      this.cache = null

      switch (event) {
        case 'SIGNED_IN':
        case 'TOKEN_REFRESHED':
        case 'INITIAL_SESSION':
          if (session?.user) {
            await this.updateState({
              isLoading: false,
              isRecovering: false,
              session,
              user: session.user,
              error: null
            })
          }
          break

        case 'SIGNED_OUT':
          await this.updateState({
            isLoading: false,
            isRecovering: false,
            session: null,
            user: null,
            error: null
          })
          break

        case 'USER_UPDATED':
          if (session?.user) {
            await this.updateState({
              ...this.currentState,
              isRecovering: false,
              user: session.user
            })
          }
          break
      }
    })
  }

  /**
   * Set up automatic session refresh
   */
  private setupAutoRefresh(): void {
    // Clear existing interval
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval)
    }

    // Refresh session every 50 minutes (before 1 hour expiry)
    this.refreshInterval = setInterval(async () => {
      if (this.currentState.session) {
        try {
          const { data, error } = await this.supabase.auth.refreshSession()
          if (error) {
            console.warn('⚠️ [SessionManager] Auto-refresh failed:', error.message)
          } else if (data.session) {
            console.log('✅ [SessionManager] Session auto-refreshed')
            this.cache = null // Clear cache
          }
        } catch (error: any) {
          console.warn('⚠️ [SessionManager] Auto-refresh error:', error.message)
        }
      }
    }, 50 * 60 * 1000) // 50 minutes
  }

  /**
   * Check if refresh token exists (for recovery detection)
   */
  hasRefreshToken(): boolean {
    if (typeof window === 'undefined') return false
    
    // Check cookies
    const cookies = document.cookie.split(';')
    const hasRefreshTokenInCookies = cookies.some(cookie => 
      cookie.trim().includes('sb-') && cookie.trim().includes('refresh-token')
    )
    
    // Check localStorage (Supabase stores tokens here)
    try {
      const keys = Object.keys(localStorage)
      const hasRefreshTokenInStorage = keys.some(key => 
        key.includes('sb-') && key.includes('refresh-token')
      )
      return hasRefreshTokenInCookies || hasRefreshTokenInStorage
    } catch {
      return hasRefreshTokenInCookies
    }
  }

  /**
   * Check session with caching
   */
  async checkSession(force = false): Promise<Session | null> {
    // Return cached session if valid and not forced
    if (!force && this.cache && this.isCacheValid()) {
      return this.cache.session
    }

    // Prevent concurrent checks
    if (this.isChecking && !force) {
      return this.cache?.session || null
    }

    this.isChecking = true

    try {
      // Set loading and recovering state
      const hasRefreshToken = this.hasRefreshToken()
      await this.updateState({
        ...this.currentState,
        isLoading: force,
        isRecovering: hasRefreshToken && !this.cache?.session // Only recovering if we have refresh token but no session
      })

      // Get session with timeout
      const sessionPromise = this.supabase.auth.getSession()
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Session check timeout')), 3000)
      )

      const { data: { session }, error } = await Promise.race([
        sessionPromise,
        timeoutPromise
      ]) as { data: { session: Session | null }, error: any }

      if (error) {
        console.warn('⚠️ [SessionManager] Session check error:', error.message)
        
        // Try refresh if getSession fails
        try {
          const { data: { session: refreshedSession }, error: refreshError } = 
            await this.supabase.auth.refreshSession()
          
          if (!refreshError && refreshedSession) {
            this.updateCache(refreshedSession)
          await this.updateState({
            isLoading: false,
            isRecovering: false,
            session: refreshedSession,
            user: refreshedSession.user,
            error: null
          })
          return refreshedSession
          }
        } catch (refreshErr: any) {
          console.warn('⚠️ [SessionManager] Refresh also failed:', refreshErr.message)
        }

        await this.updateState({
          isLoading: false,
          isRecovering: false,
          session: null,
          user: null,
          error: error.message
        })
        return null
      }

      // Update cache and state
      this.updateCache(session)
      await this.updateState({
        isLoading: false,
        isRecovering: false,
        session,
        user: session?.user || null,
        error: null
      })

      return session
    } catch (error: any) {
      console.warn('⚠️ [SessionManager] Session check exception:', error.message)
      
      await this.updateState({
        isLoading: false,
        isRecovering: false,
        session: null,
        user: null,
        error: error.message
      })
      return null
    } finally {
      this.isChecking = false
    }
  }

  /**
   * Update cache
   */
  private updateCache(session: Session | null): void {
    this.cache = {
      session,
      user: session?.user || null,
      timestamp: Date.now(),
      isValid: !!session && this.isSessionValid(session)
    }
  }

  /**
   * Check if cache is valid
   */
  private isCacheValid(): boolean {
    if (!this.cache) return false
    const age = Date.now() - this.cache.timestamp
    return age < this.cacheTimeout && this.cache.isValid
  }

  /**
   * Check if session is valid
   */
  private isSessionValid(session: Session): boolean {
    if (!session?.user) return false
    
    // Check expiry
    if (session.expires_at) {
      const expiresAt = new Date(session.expires_at * 1000)
      if (expiresAt < new Date()) {
        return false
      }
    }

    // Check tokens
    if (!session.access_token || !session.refresh_token) {
      return false
    }

    return true
  }

  /**
   * Update state and notify listeners
   */
  private async updateState(newState: SessionState): Promise<void> {
    this.currentState = newState
    this.listeners.forEach(listener => {
      try {
        listener(newState)
      } catch (error) {
        console.warn('⚠️ [SessionManager] Listener error:', error)
      }
    })
  }

  /**
   * Get current state
   */
  getState(): SessionState {
    return { ...this.currentState }
  }

  /**
   * Check if session is currently being recovered
   */
  isRecovering(): boolean {
    return this.currentState.isRecovering || (this.isChecking && this.hasRefreshToken() && !this.cache?.session)
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: SessionState) => void): () => void {
    this.listeners.add(listener)
    
    // Immediately call with current state
    listener(this.currentState)
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Refresh session manually
   */
  async refreshSession(): Promise<Session | null> {
    this.cache = null // Clear cache
    return await this.checkSession(true)
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    this.cache = null
    await this.supabase.auth.signOut()
    await this.updateState({
      isLoading: false,
      isRecovering: false,
      session: null,
      user: null,
      error: null
    })
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval)
      this.refreshInterval = null
    }
    this.listeners.clear()
    this.cache = null
    this.isInitialized = false
    console.log('🧹 [SessionManager] Cleaned up')
  }
}

// Export singleton instance
export const professionalSessionManager = ProfessionalSessionManager.getInstance()

// Export types
export type { SessionState }

