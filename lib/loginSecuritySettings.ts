'use client'

import { settingsManager } from './settingsManager'

export interface LoginSecuritySettings {
  // Rate Limiting
  enableRateLimiting: boolean
  rateLimitCooldownSeconds: number // Cooldown duration in seconds
  enableLocalRateLimiting: boolean
  localRateLimitSeconds: number // Minimum time between attempts
  
  // Multiple Submission Protection
  enableMultipleSubmissionProtection: boolean
  
  // Retry Logic
  enableRetryLogic: boolean
  maxRetries: number
  enableExponentialBackoff: boolean
  
  // OTP Login
  enableOTPLogin: boolean
  otpCooldownSeconds: number
  
  // Google OAuth
  enableGoogleOAuth: boolean
  
  // Email Validation
  enableCompanyEmailValidation: boolean
  allowedEmailDomains: string[] // Array of allowed domains
  
  // Password Validation
  enablePasswordValidation: boolean
  passwordMinLength: number
  passwordRequireUppercase: boolean
  passwordRequireLowercase: boolean
  passwordRequireNumbers: boolean
  passwordRequireSpecialChars: boolean
  
  // Features
  enableSignUp: boolean
  enableForgotPassword: boolean
  enableShowPasswordToggle: boolean
  
  // Session
  sessionTimeoutMinutes: number
  enableSessionMonitoring: boolean
}

export const DEFAULT_LOGIN_SECURITY_SETTINGS: LoginSecuritySettings = {
  enableRateLimiting: true,
  rateLimitCooldownSeconds: 120, // 2 minutes
  enableLocalRateLimiting: true,
  localRateLimitSeconds: 2, // 2 seconds
  
  enableMultipleSubmissionProtection: true,
  
  enableRetryLogic: true,
  maxRetries: 2,
  enableExponentialBackoff: true,
  
  enableOTPLogin: true,
  otpCooldownSeconds: 60,
  
  enableGoogleOAuth: true,
  
  enableCompanyEmailValidation: true,
  allowedEmailDomains: ['@rabatpfc.com'],
  
  enablePasswordValidation: true,
  passwordMinLength: 6,
  passwordRequireUppercase: false,
  passwordRequireLowercase: false,
  passwordRequireNumbers: false,
  passwordRequireSpecialChars: false,
  
  enableSignUp: true,
  enableForgotPassword: true,
  enableShowPasswordToggle: true,
  
  sessionTimeoutMinutes: 30,
  enableSessionMonitoring: true,
}

class LoginSecuritySettingsManager {
  private cache: LoginSecuritySettings | null = null
  private cacheTimestamp: number = 0
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
  private readonly SETTINGS_KEY = 'login_security_settings'

  /**
   * Get all login security settings
   */
  async getSettings(forceReload: boolean = false): Promise<LoginSecuritySettings> {
    const now = Date.now()
    
    // Check cache (unless force reload)
    if (!forceReload && this.cache && (now - this.cacheTimestamp) < this.CACHE_DURATION) {
      return this.cache
    }

    try {
      // Try to get from database (force reload if requested)
      const settingsJson = await settingsManager.getSystemSetting(this.SETTINGS_KEY, forceReload)
      
      if (settingsJson) {
        const settings = settingsJson as LoginSecuritySettings
        // Merge with defaults to ensure all fields exist
        const mergedSettings = { ...DEFAULT_LOGIN_SECURITY_SETTINGS, ...settings }
        this.cache = mergedSettings
        this.cacheTimestamp = now
        console.log('📥 Loaded settings from database:', mergedSettings)
        return this.cache
      }
    } catch (error) {
      console.error('Error loading login security settings:', error)
    }

    // Return defaults if not found
    console.log('⚠️ No settings found in database, using defaults')
    this.cache = DEFAULT_LOGIN_SECURITY_SETTINGS
    this.cacheTimestamp = now
    return this.cache
  }

  /**
   * Save login security settings
   */
  async saveSettings(settings: Partial<LoginSecuritySettings> | LoginSecuritySettings): Promise<boolean> {
    try {
      // Always merge with defaults first to ensure all fields exist
      // Then merge with provided settings (whether complete or partial)
      const currentSettings = await this.getSettings(true) // Force reload to get latest
      
      const updatedSettings: LoginSecuritySettings = {
        ...DEFAULT_LOGIN_SECURITY_SETTINGS, // Start with defaults
        ...currentSettings, // Then current (from DB)
        ...settings // Finally override with new settings
      }

      console.log('💾 Saving login security settings:', {
        provided: settings,
        current: currentSettings,
        final: updatedSettings
      })

      // Clear cache before saving to ensure fresh data
      this.clearCache()
      settingsManager.clearCacheEntry(`system_${this.SETTINGS_KEY}`)

      // Save to database
      const success = await settingsManager.setSystemSetting(
        this.SETTINGS_KEY,
        updatedSettings,
        'json',
        'Login security settings including rate limiting, OTP, OAuth, and validation rules',
        'security',
        false // Not public
      )

      if (success) {
        console.log('✅ Settings saved successfully, clearing cache and reloading...')
        
        // Clear all caches
        this.clearCache()
        settingsManager.clearCacheEntry(`system_${this.SETTINGS_KEY}`)
        
        // Wait a bit to ensure database is updated
        await new Promise(resolve => setTimeout(resolve, 200))
        
        // Reload from database to verify (force reload)
        const verifySettings = await this.getSettings(true)
        console.log('✅ Verified settings after save:', verifySettings)
        
        // Compare to ensure they match
        const settingsMatch = JSON.stringify(updatedSettings) === JSON.stringify(verifySettings)
        if (!settingsMatch) {
          console.warn('⚠️ Settings mismatch after save!', {
            saved: updatedSettings,
            loaded: verifySettings
          })
        } else {
          console.log('✅ Settings verified and match!')
        }
        
        // Update cache with verified settings
        this.cache = verifySettings
        this.cacheTimestamp = Date.now()
        
        // Dispatch event to notify components
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('loginSecuritySettingsUpdated'))
        }
        
        return true
      } else {
        console.error('❌ Failed to save settings')
        return false
      }
    } catch (error) {
      console.error('Error saving login security settings:', error)
      return false
    }
  }

  /**
   * Reset to default settings
   */
  async resetToDefaults(): Promise<boolean> {
    return this.saveSettings(DEFAULT_LOGIN_SECURITY_SETTINGS)
  }

  /**
   * Get a specific setting value
   */
  async getSetting<K extends keyof LoginSecuritySettings>(
    key: K
  ): Promise<LoginSecuritySettings[K]> {
    const settings = await this.getSettings()
    return settings[key]
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache = null
    this.cacheTimestamp = 0
  }

  /**
   * Initialize default settings in database if they don't exist
   */
  async initializeDefaults(): Promise<boolean> {
    try {
      const existing = await settingsManager.getSystemSetting(this.SETTINGS_KEY)
      if (!existing) {
        return await this.saveSettings(DEFAULT_LOGIN_SECURITY_SETTINGS)
      }
      return true
    } catch (error) {
      console.error('Error initializing default login security settings:', error)
      return false
    }
  }
}

// Create singleton instance
export const loginSecuritySettingsManager = new LoginSecuritySettingsManager()

