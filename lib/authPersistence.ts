'use client'

/**
 * @deprecated This manager is deprecated. Use professionalSessionManager from '@/lib/professionalSessionManager' instead.
 * This file is kept for backward compatibility but will be removed in a future version.
 */

import { getSupabaseClient } from '@/lib/simpleConnectionManager'

export class AuthPersistenceManager {
  private static instance: AuthPersistenceManager
  private supabase = getSupabaseClient()
  private refreshInterval: NodeJS.Timeout | null = null
  private isInitialized = false

  static getInstance(): AuthPersistenceManager {
    if (!AuthPersistenceManager.instance) {
      AuthPersistenceManager.instance = new AuthPersistenceManager()
    }
    return AuthPersistenceManager.instance
  }

  async initialize() {
    if (this.isInitialized) return
    
    this.isInitialized = true
    console.log('🔄 AuthPersistenceManager: Initializing...')
    
    // Check for existing session with delay for new tabs
    setTimeout(async () => {
      await this.checkAndRefreshSession()
    }, 1000) // Wait 1 second for new tabs to initialize
    
    // Set up periodic session refresh
    this.setupPeriodicRefresh()
    
    // Set up visibility change handler
    this.setupVisibilityChangeHandler()
    
    // Set up storage event listener for cross-tab communication
    this.setupStorageListener()
  }

  private async checkAndRefreshSession() {
    try {
      const { data: { session }, error } = await this.supabase.auth.getSession()
      
      if (error) {
        console.log('⚠️ AuthPersistenceManager: Session check error:', error.message)
        return
      }

      if (session) {
        const isExpired = session.expires_at ? new Date(session.expires_at * 1000) < new Date() : false
        
        console.log('📊 AuthPersistenceManager: Session status:', {
          hasSession: true,
          userEmail: session.user.email,
          expiresAt: session.expires_at,
          isExpired,
          timeUntilExpiry: session.expires_at ? 
            Math.round((session.expires_at * 1000 - Date.now()) / 1000 / 60) : 0
        })

        // If session is close to expiry, refresh it
        if (isExpired || (session.expires_at && (session.expires_at * 1000 - Date.now()) < 5 * 60 * 1000)) {
          console.log('🔄 AuthPersistenceManager: Session close to expiry, refreshing...')
          await this.refreshSession()
        }
      } else {
        console.log('⚠️ AuthPersistenceManager: No active session found')
      }
    } catch (error) {
      console.log('❌ AuthPersistenceManager: Error checking session:', error)
    }
  }

  private async refreshSession() {
    try {
      const { data: { session }, error } = await this.supabase.auth.refreshSession()
      
      if (error) {
        console.log('⚠️ AuthPersistenceManager: Session refresh error:', error.message)
      } else if (session) {
        console.log('✅ AuthPersistenceManager: Session refreshed successfully')
      }
    } catch (error) {
      console.log('❌ AuthPersistenceManager: Error refreshing session:', error)
    }
  }

  private setupPeriodicRefresh() {
    // Refresh session every 10 minutes
    this.refreshInterval = setInterval(async () => {
      console.log('🔄 AuthPersistenceManager: Periodic session check...')
      await this.checkAndRefreshSession()
    }, 10 * 60 * 1000) // 10 minutes
  }

  private setupVisibilityChangeHandler() {
    if (typeof window === 'undefined') return

    document.addEventListener('visibilitychange', async () => {
      if (!document.hidden) {
        console.log('🔄 AuthPersistenceManager: Page became visible, checking session...')
        await this.checkAndRefreshSession()
      }
    })

    // Also check when window gains focus
    window.addEventListener('focus', async () => {
      console.log('🔄 AuthPersistenceManager: Window focused, checking session...')
      await this.checkAndRefreshSession()
    })
  }

  private setupStorageListener() {
    if (typeof window === 'undefined') return

    // Listen for storage events from other tabs
    window.addEventListener('storage', async (event) => {
      if (event.key === 'supabase.auth.token') {
        console.log('🔄 AuthPersistenceManager: Auth token updated from another tab')
        await this.checkAndRefreshSession()
      }
    })

    // Also listen for custom auth events
    window.addEventListener('authStateChanged', async () => {
      console.log('🔄 AuthPersistenceManager: Auth state changed event received')
      await this.checkAndRefreshSession()
    })
  }

  destroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval)
      this.refreshInterval = null
    }
    this.isInitialized = false
  }
}

// Export singleton instance
export const authPersistenceManager = AuthPersistenceManager.getInstance()
