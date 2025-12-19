'use client'

/**
 * @deprecated This manager is deprecated. Use professionalSessionManager from '@/lib/professionalSessionManager' instead.
 * This file is kept for backward compatibility but will be removed in a future version.
 */

import { getSupabaseClient } from '@/lib/simpleConnectionManager'

export class SessionPersistenceManager {
  private static instance: SessionPersistenceManager
  private supabase = getSupabaseClient()
  private isInitialized = false
  private sessionCheckInterval: NodeJS.Timeout | null = null

  static getInstance(): SessionPersistenceManager {
    if (!SessionPersistenceManager.instance) {
      SessionPersistenceManager.instance = new SessionPersistenceManager()
    }
    return SessionPersistenceManager.instance
  }

  async initialize() {
    if (this.isInitialized) return
    
    this.isInitialized = true
    console.log('🔄 SessionPersistenceManager: Initializing...')
    
    // Set up reload detection
    this.setupReloadDetection()
    
    // Set up session monitoring
    this.setupSessionMonitoring()
    
    // Set up storage sync
    this.setupStorageSync()
  }

  private setupReloadDetection() {
    if (typeof window === 'undefined') return

    // Mark reload in session storage
    const navigationEntry = window.performance?.getEntriesByType('navigation')[0] as any
    const isReload = window.performance?.navigation?.type === 1 ||
                    document.referrer === window.location.href ||
                    navigationEntry?.type === 'reload'
    
    if (isReload) {
      console.log('🔄 SessionPersistenceManager: Reload detected, setting flag...')
      sessionStorage.setItem('auth_reload_check', 'true')
      
      // Clear the flag after a delay
      setTimeout(() => {
        sessionStorage.removeItem('auth_reload_check')
      }, 5000)
    }
  }

  private setupSessionMonitoring() {
    // Monitor session every 30 seconds
    this.sessionCheckInterval = setInterval(async () => {
      try {
        const { data: { session }, error } = await this.supabase.auth.getSession()
        
        if (error) {
          console.log('⚠️ SessionPersistenceManager: Session check error:', error.message)
          return
        }

        if (session) {
          const isExpired = session.expires_at ? new Date(session.expires_at * 1000) < new Date() : false
          
          if (isExpired) {
            console.log('⚠️ SessionPersistenceManager: Session expired, attempting refresh...')
            await this.supabase.auth.refreshSession()
          }
        }
      } catch (error) {
        console.log('❌ SessionPersistenceManager: Error monitoring session:', error)
      }
    }, 30000) // Check every 30 seconds
  }

  private setupStorageSync() {
    if (typeof window === 'undefined') return

    // Listen for storage events from other tabs
    window.addEventListener('storage', async (event) => {
      if (event.key === 'supabase.auth.token') {
        console.log('🔄 SessionPersistenceManager: Auth token updated from another tab')
        // Trigger a session check
        try {
          await this.supabase.auth.getSession()
        } catch (error) {
          console.log('❌ SessionPersistenceManager: Error syncing session:', error)
        }
      }
    })

    // Listen for visibility changes
    document.addEventListener('visibilitychange', async () => {
      if (!document.hidden) {
        console.log('🔄 SessionPersistenceManager: Page became visible, checking session...')
        try {
          await this.supabase.auth.getSession()
        } catch (error) {
          console.log('❌ SessionPersistenceManager: Error checking session on visibility change:', error)
        }
      }
    })
  }

  async checkSession(): Promise<boolean> {
    try {
      const { data: { session }, error } = await this.supabase.auth.getSession()
      
      if (error) {
        console.log('⚠️ SessionPersistenceManager: Session check error:', error.message)
        return false
      }

      if (!session) {
        console.log('⚠️ SessionPersistenceManager: No active session')
        return false
      }

      const isExpired = session.expires_at ? new Date(session.expires_at * 1000) < new Date() : false
      
      if (isExpired) {
        console.log('⚠️ SessionPersistenceManager: Session expired')
        return false
      }

      console.log('✅ SessionPersistenceManager: Valid session found')
      return true
    } catch (error) {
      console.log('❌ SessionPersistenceManager: Error checking session:', error)
      return false
    }
  }

  destroy() {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval)
      this.sessionCheckInterval = null
    }
    this.isInitialized = false
  }
}

// Export singleton instance
export const sessionPersistenceManager = SessionPersistenceManager.getInstance()
