'use client'

/**
 * Professional Session Manager - نظام إدارة جلسات محسّن بالكامل
 * 
 * ✅ تحسينات شاملة:
 * - Adaptive timeout (يتكيف مع سرعة الاتصال)
 * - Optimistic updates (تحديثات فورية)
 * - Smart cache (cache ذكي مع invalidation)
 * - Better error recovery (استعادة أفضل للأخطاء)
 * - Session persistence (حفظ الجلسة)
 * - Offline support (دعم العمل بدون اتصال)
 */

import { getStableSupabaseClient } from './stableConnection'
import { Session, User } from '@supabase/supabase-js'

interface SessionCache {
  session: Session | null
  user: User | null
  timestamp: number
  isValid: boolean
  expiresAt?: number
}

interface SessionState {
  isLoading: boolean
  isRecovering: boolean
  session: Session | null
  user: User | null
  error: string | null
  isOffline?: boolean
}

class ProfessionalSessionManager {
  private static instance: ProfessionalSessionManager
  private supabase = getStableSupabaseClient()
  private cache: SessionCache | null = null
  private cacheTimeout = 5000 // 5 seconds cache (محسّن)
  private listeners: Set<(state: SessionState) => void> = new Set()
  private currentState: SessionState = {
    isLoading: false,
    isRecovering: false,
    session: null,
    user: null,
    error: null,
    isOffline: false
  }
  private isInitialized = false
  private refreshInterval: NodeJS.Timeout | null = null
  private isChecking = false
  private checkPromise: Promise<Session | null> | null = null
  private maxLoadingTime = 2000 // 2 seconds max (محسّن)
  private adaptiveTimeout = 1000 // يبدأ بـ 1 ثانية ويتكيف
  private lastSuccessfulCheck = 0
  private consecutiveFailures = 0
  private readonly STORAGE_KEY = 'rpf_session_cache'
  private readonly MAX_CACHE_AGE = 5 * 60 * 1000 // 5 minutes

  private constructor() {
    // Load cached session from localStorage on initialization
    this.loadCachedSession()
  }

  static getInstance(): ProfessionalSessionManager {
    if (!ProfessionalSessionManager.instance) {
      ProfessionalSessionManager.instance = new ProfessionalSessionManager()
    }
    return ProfessionalSessionManager.instance
  }

  /**
   * Load cached session from localStorage
   */
  private loadCachedSession(): void {
    if (typeof window === 'undefined') return

    try {
      const cached = localStorage.getItem(this.STORAGE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached)
        const age = Date.now() - parsed.timestamp
        
        // Only use cache if less than 5 minutes old
        if (age < this.MAX_CACHE_AGE && parsed.session) {
          this.cache = {
            session: parsed.session,
            user: parsed.user,
            timestamp: parsed.timestamp,
            isValid: this.isSessionValid(parsed.session),
            expiresAt: parsed.session.expires_at
          }
          
          // Optimistic update: set state immediately from cache
          this.updateStateSync({
            ...this.currentState,
            session: parsed.session,
            user: parsed.user,
            isLoading: false,
            isRecovering: false
          })
          
          console.log('✅ [SessionManager] Loaded cached session')
        } else {
          localStorage.removeItem(this.STORAGE_KEY)
        }
      }
    } catch (error) {
      console.warn('⚠️ [SessionManager] Failed to load cached session:', error)
      localStorage.removeItem(this.STORAGE_KEY)
    }
  }

  /**
   * Save session to localStorage
   */
  private saveCachedSession(session: Session | null, user: User | null): void {
    if (typeof window === 'undefined') return

    try {
      if (session && user) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
          session,
          user,
          timestamp: Date.now()
        }))
      } else {
        localStorage.removeItem(this.STORAGE_KEY)
      }
    } catch (error) {
      console.warn('⚠️ [SessionManager] Failed to save cached session:', error)
    }
  }

  /**
   * Initialize the session manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    this.isInitialized = true
    console.log('🔧 [SessionManager] Initializing...')

    // Set up auth state listener
    this.setupAuthStateListener()

    // Set up automatic session refresh
    this.setupAutoRefresh()

    // Set up offline detection
    this.setupOfflineDetection()

    // Initial session check (non-blocking, with optimistic update)
    if (this.cache?.session) {
      // Use cached session immediately (optimistic)
      this.updateStateSync({
        ...this.currentState,
        session: this.cache.session,
        user: this.cache.user,
        isLoading: false
      })
    }

    // Then verify in background
    this.checkSession(false).catch(err => {
      console.warn('⚠️ [SessionManager] Initial check error:', err)
    })
  }

  /**
   * Set up offline detection
   */
  private setupOfflineDetection(): void {
    if (typeof window === 'undefined') return

    const updateOfflineState = () => {
      const isOffline = !navigator.onLine
      if (this.currentState.isOffline !== isOffline) {
        this.updateStateSync({
          ...this.currentState,
          isOffline
        })
      }
    }

    window.addEventListener('online', updateOfflineState)
    window.addEventListener('offline', updateOfflineState)
    updateOfflineState()
  }

  /**
   * Set up auth state change listener
   */
  private setupAuthStateListener(): void {
    this.supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`🔔 [SessionManager] Auth event: ${event}`, session?.user?.email || 'no user')

      // Clear cache on auth changes
      this.cache = null
      this.consecutiveFailures = 0
      this.adaptiveTimeout = 1000 // Reset timeout

      switch (event) {
        case 'SIGNED_IN':
        case 'TOKEN_REFRESHED':
        case 'INITIAL_SESSION':
          if (session?.user) {
            this.updateCache(session)
            this.saveCachedSession(session, session.user)
            await this.updateState({
              isLoading: false,
              isRecovering: false,
              session,
              user: session.user,
              error: null,
              isOffline: false
            })
            this.lastSuccessfulCheck = Date.now()
          }
          break

        case 'SIGNED_OUT':
          this.cache = null
          this.saveCachedSession(null, null)
          await this.updateState({
            isLoading: false,
            isRecovering: false,
            session: null,
            user: null,
            error: null,
            isOffline: false
          })
          break

        case 'USER_UPDATED':
          if (session?.user) {
            this.updateCache(session)
            this.saveCachedSession(session, session.user)
            await this.updateState({
              ...this.currentState,
              isRecovering: false,
              user: session.user,
              session: session
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
      if (this.currentState.session && !this.isChecking && !this.currentState.isOffline) {
        try {
          const { data, error } = await this.supabase.auth.refreshSession()
          if (error) {
            console.warn('⚠️ [SessionManager] Auto-refresh failed:', error.message)
            this.consecutiveFailures++
          } else if (data.session) {
            console.log('✅ [SessionManager] Session auto-refreshed')
            this.updateCache(data.session)
            this.saveCachedSession(data.session, data.session.user)
            await this.updateState({
              ...this.currentState,
              session: data.session,
              user: data.session.user
            })
            this.lastSuccessfulCheck = Date.now()
            this.consecutiveFailures = 0
            this.adaptiveTimeout = 1000 // Reset timeout
          }
        } catch (error: any) {
          console.warn('⚠️ [SessionManager] Auto-refresh error:', error.message)
          this.consecutiveFailures++
        }
      }
    }, 50 * 60 * 1000) // 50 minutes
  }

  /**
   * Check if refresh token exists (for recovery detection)
   */
  hasRefreshToken(): boolean {
    if (typeof window === 'undefined') return false
    
    try {
      // Check cookies
      const cookies = document.cookie.split(';')
      const hasRefreshTokenInCookies = cookies.some(cookie => 
        cookie.trim().includes('sb-') && cookie.trim().includes('refresh-token')
      )
      
      // Check localStorage (Supabase stores tokens here)
      const keys = Object.keys(localStorage)
      const hasRefreshTokenInStorage = keys.some(key => 
        key.includes('sb-') && key.includes('refresh-token')
      )
      
      return hasRefreshTokenInCookies || hasRefreshTokenInStorage
    } catch {
      return false
    }
  }

  /**
   * Check session with adaptive timeout and optimistic updates
   */
  async checkSession(force = false): Promise<Session | null> {
    // Return cached session if valid and not forced
    if (!force && this.cache && this.isCacheValid()) {
      // Optimistic return - use cache immediately
      return this.cache.session
    }

    // If already checking, return the existing promise
    if (this.isChecking && this.checkPromise && !force) {
      return this.checkPromise
    }

    // Create new check promise
    this.checkPromise = this.performSessionCheck(force)
    return this.checkPromise
  }

  /**
   * Perform the actual session check with adaptive timeout
   */
  private async performSessionCheck(force: boolean): Promise<Session | null> {
    this.isChecking = true

    try {
      // Set loading state only if forced or no cache
      const shouldShowLoading = force || !this.cache
      const hasRefreshToken = this.hasRefreshToken()
      
      // Adaptive timeout: increase if we've had failures, decrease if successful
      const timeout = this.adaptiveTimeout
      
      if (shouldShowLoading) {
        await this.updateState({
          ...this.currentState,
          isLoading: true,
          isRecovering: hasRefreshToken && !this.cache?.session
        })
      }

      // Get session with adaptive timeout
      const sessionPromise = this.supabase.auth.getSession()
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Session check timeout')), timeout)
      )

      let session: Session | null = null
      let error: any = null

      try {
        const startTime = Date.now()
        const result = await Promise.race([sessionPromise, timeoutPromise])
        const duration = Date.now() - startTime
        
        session = (result as any)?.data?.session || null
        error = (result as any)?.error || null

        // Adaptive timeout: adjust based on response time
        if (duration < 300) {
          // Fast response - can reduce timeout slightly
          this.adaptiveTimeout = Math.max(500, this.adaptiveTimeout - 100)
        } else if (duration > 800) {
          // Slow response - increase timeout
          this.adaptiveTimeout = Math.min(2000, this.adaptiveTimeout + 200)
        }

        if (!error && session) {
          this.consecutiveFailures = 0
          this.lastSuccessfulCheck = Date.now()
        }
      } catch (timeoutError: any) {
        // Timeout occurred - try to get cached session or check refresh token
        this.consecutiveFailures++
        
        // Increase timeout for next attempt
        this.adaptiveTimeout = Math.min(2000, this.adaptiveTimeout + 200)
        
        console.warn('⚠️ [SessionManager] Session check timeout, trying recovery...')
        
        if (hasRefreshToken && !this.currentState.isOffline) {
          // Try refresh if we have refresh token
          try {
            const { data: refreshData, error: refreshError } = 
              await this.supabase.auth.refreshSession()
            
            if (!refreshError && refreshData.session) {
              session = refreshData.session
              error = null
              this.consecutiveFailures = 0
              this.adaptiveTimeout = 1000 // Reset timeout
            } else {
              error = refreshError || new Error('Session timeout and refresh failed')
            }
          } catch (refreshErr: any) {
            error = refreshErr
          }
        } else {
          // Use cached session if available and offline
          if (this.cache?.session && this.currentState.isOffline) {
            session = this.cache.session
            error = null
            console.log('✅ [SessionManager] Using cached session (offline)')
          } else {
            error = timeoutError
          }
        }
      }

      if (error) {
        console.warn('⚠️ [SessionManager] Session check error:', error.message)
        
        // If we have cached session, use it
        if (this.cache?.session && !force) {
          session = this.cache.session
          error = null
          console.log('✅ [SessionManager] Using cached session due to error')
        } else {
          // Update state with error
          await this.updateState({
            isLoading: false,
            isRecovering: false,
            session: null,
            user: null,
            error: error.message,
            isOffline: this.currentState.isOffline
          })
          
          // Clear cache on error (only if no cached session)
          this.cache = null
          this.saveCachedSession(null, null)
          return null
        }
      }

      // Update cache and state
      if (session) {
        this.updateCache(session)
        this.saveCachedSession(session, session.user)
      }
      
      await this.updateState({
        isLoading: false,
        isRecovering: false,
        session,
        user: session?.user || null,
        error: null,
        isOffline: this.currentState.isOffline
      })

      return session
    } catch (error: any) {
      console.warn('⚠️ [SessionManager] Session check exception:', error.message)
      
      // Try to use cached session
      if (this.cache?.session && !force) {
        this.updateStateSync({
          ...this.currentState,
          isLoading: false,
          session: this.cache.session,
          user: this.cache.user
        })
        return this.cache.session
      }
      
      await this.updateState({
        isLoading: false,
        isRecovering: false,
        session: null,
        user: null,
        error: error.message,
        isOffline: this.currentState.isOffline
      })
      
      this.cache = null
      return null
    } finally {
      this.isChecking = false
      this.checkPromise = null
      
      // Force loading to false after max time (safety net)
      setTimeout(() => {
        if (this.currentState.isLoading) {
          console.warn('⚠️ [SessionManager] Force stopping loading after timeout')
          this.updateStateSync({
            ...this.currentState,
            isLoading: false
          })
        }
      }, this.maxLoadingTime)
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
      isValid: !!session && this.isSessionValid(session),
      expiresAt: session?.expires_at
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
   * Update state and notify listeners (async)
   */
  private async updateState(newState: SessionState): Promise<void> {
    this.currentState = newState
    
    // Notify all listeners
    this.listeners.forEach(listener => {
      try {
        listener(newState)
      } catch (error) {
        console.warn('⚠️ [SessionManager] Listener error:', error)
      }
    })
  }

  /**
   * Update state synchronously (for optimistic updates)
   */
  private updateStateSync(newState: SessionState): void {
    this.currentState = newState
    
    // Notify all listeners synchronously
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
    try {
      listener(this.currentState)
    } catch (error) {
      console.warn('⚠️ [SessionManager] Initial listener call error:', error)
    }
    
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
    this.saveCachedSession(null, null)
    await this.supabase.auth.signOut()
    await this.updateState({
      isLoading: false,
      isRecovering: false,
      session: null,
      user: null,
      error: null,
      isOffline: false
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
    this.isChecking = false
    this.checkPromise = null
    console.log('🧹 [SessionManager] Cleaned up')
  }
}

// Export singleton instance
export const professionalSessionManager = ProfessionalSessionManager.getInstance()

// Export types
export type { SessionState }
