'use client'

import { loginSecuritySettingsManager } from './loginSecuritySettings'
import { getSupabaseClient } from './simpleConnectionManager'

/**
 * Session Timeout Manager
 * يدير انتهاء صلاحية الجلسة بناءً على إعدادات الأمان
 */
class SessionTimeoutManager {
  private timeoutId: NodeJS.Timeout | null = null
  private warningTimeoutId: NodeJS.Timeout | null = null
  private checkIntervalId: NodeJS.Timeout | null = null
  private readonly WARNING_TIME = 5 * 60 * 1000 // 5 minutes before timeout
  private isInitialized = false

  /**
   * Initialize session timeout monitoring
   */
  async initialize() {
    if (this.isInitialized) return
    
    try {
      const settings = await loginSecuritySettingsManager.getSettings()
      
      if (settings.enableSessionMonitoring) {
        this.setupSessionTimeout(settings.sessionTimeoutMinutes)
        this.setupSessionMonitoring()
        this.isInitialized = true
        console.log('✅ Session timeout manager initialized:', {
          timeoutMinutes: settings.sessionTimeoutMinutes,
          monitoringEnabled: settings.enableSessionMonitoring
        })
      }
    } catch (error) {
      console.error('❌ Error initializing session timeout manager:', error)
    }
  }

  /**
   * Setup session timeout
   */
  private setupSessionTimeout(timeoutMinutes: number) {
    // Clear existing timeout
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }
    if (this.warningTimeoutId) {
      clearTimeout(this.warningTimeoutId)
      this.warningTimeoutId = null
    }

    const timeoutMs = timeoutMinutes * 60 * 1000
    const warningTime = timeoutMs - this.WARNING_TIME

    // Show warning before timeout
    if (warningTime > 0) {
      this.warningTimeoutId = setTimeout(() => {
        this.showTimeoutWarning(timeoutMinutes)
      }, warningTime)
    }

    // Logout on timeout
    this.timeoutId = setTimeout(() => {
      this.handleTimeout()
    }, timeoutMs)
  }

  /**
   * Setup session monitoring
   */
  private setupSessionMonitoring() {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId)
    }

    // Check session every minute
    this.checkIntervalId = setInterval(async () => {
      try {
        const supabase = getSupabaseClient()
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error || !session) {
          console.warn('⚠️ Session monitoring: No active session')
          return
        }

        // Check if session is expired
        if (session.expires_at) {
          const expiresAt = new Date(session.expires_at * 1000)
          const now = new Date()
          const timeLeft = expiresAt.getTime() - now.getTime()
          
          if (timeLeft < 0) {
            console.warn('⚠️ Session expired, logging out...')
            await this.handleTimeout()
          } else {
            // Refresh session if close to expiry
            const minutesLeft = Math.floor(timeLeft / 60000)
            if (minutesLeft < 5) {
              console.log('🔄 Refreshing session...')
              await supabase.auth.refreshSession()
            }
          }
        }
      } catch (error) {
        console.error('❌ Error in session monitoring:', error)
      }
    }, 60 * 1000) // Check every minute
  }

  /**
   * Show timeout warning
   */
  private showTimeoutWarning(minutes: number) {
    if (typeof window === 'undefined') return
    
    // Dispatch custom event for UI to handle
    window.dispatchEvent(new CustomEvent('sessionTimeoutWarning', {
      detail: { minutes }
    }))
    
    console.warn(`⚠️ Session will expire in ${minutes} minutes`)
  }

  /**
   * Handle session timeout
   */
  private async handleTimeout() {
    try {
      const supabase = getSupabaseClient()
      await supabase.auth.signOut()
      
      // Dispatch custom event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sessionTimeout'))
        // Redirect to login
        window.location.href = '/'
      }
    } catch (error) {
      console.error('❌ Error handling session timeout:', error)
    }
  }

  /**
   * Reset timeout (call on user activity)
   */
  async resetTimeout() {
    if (!this.isInitialized) return
    
    try {
      const settings = await loginSecuritySettingsManager.getSettings()
      if (settings.enableSessionMonitoring) {
        this.setupSessionTimeout(settings.sessionTimeoutMinutes)
      }
    } catch (error) {
      console.error('❌ Error resetting session timeout:', error)
    }
  }

  /**
   * Reload settings and reinitialize
   */
  async reloadSettings() {
    this.cleanup()
    this.isInitialized = false
    await this.initialize()
  }

  /**
   * Cleanup all timeouts and intervals
   */
  cleanup() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }
    if (this.warningTimeoutId) {
      clearTimeout(this.warningTimeoutId)
      this.warningTimeoutId = null
    }
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId)
      this.checkIntervalId = null
    }
    this.isInitialized = false
  }
}

// Create singleton instance
export const sessionTimeoutManager = new SessionTimeoutManager()

// Auto-initialize on module load (client-side only)
if (typeof window !== 'undefined') {
  // Wait a bit for auth to initialize
  setTimeout(() => {
    sessionTimeoutManager.initialize().catch(err => {
      console.warn('⚠️ Failed to auto-initialize session timeout manager:', err)
    })
  }, 2000)

  // Listen for settings updates
  window.addEventListener('loginSecuritySettingsUpdated', () => {
    sessionTimeoutManager.reloadSettings().catch(err => {
      console.warn('⚠️ Failed to reload session timeout settings:', err)
    })
  })

  // Reset timeout on user activity
  const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart']
  activityEvents.forEach(event => {
    window.addEventListener(event, () => {
      sessionTimeoutManager.resetTimeout()
    }, { passive: true })
  })
}

