'use client'

import { getSupabaseClient } from './simpleConnectionManager'

export interface SystemSetting {
  id: string
  setting_key: string
  setting_value: any
  setting_type: 'string' | 'number' | 'boolean' | 'json'
  description?: string
  category: string
  is_public: boolean
  requires_restart: boolean
  created_at: string
  updated_at: string
  created_by?: string
  updated_by?: string
}

export interface UserPreference {
  id: string
  user_id: string
  preference_key: string
  preference_value: any
  preference_type: 'string' | 'number' | 'boolean' | 'json'
  category: string
  created_at: string
  updated_at: string
}

export interface NotificationSetting {
  id: string
  user_id: string
  notification_type: 'email' | 'push' | 'in_app' | 'sms'
  notification_category: 'project_updates' | 'kpi_alerts' | 'system_messages' | 'security'
  is_enabled: boolean
  frequency: 'immediate' | 'daily' | 'weekly' | 'never'
  quiet_hours_start?: string
  quiet_hours_end?: string
  quiet_days?: number[]
  created_at: string
  updated_at: string
}

export interface SecuritySetting {
  id: string
  setting_key: string
  setting_value: any
  description?: string
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  requires_admin: boolean
  created_at: string
  updated_at: string
  created_by?: string
  updated_by?: string
}

export interface BackupSetting {
  id: string
  backup_type: 'full' | 'incremental' | 'selective'
  frequency: 'daily' | 'weekly' | 'monthly' | 'manual'
  retention_days: number
  include_files: boolean
  include_database: boolean
  compression: boolean
  encryption: boolean
  storage_location: string
  last_backup_at?: string
  next_backup_at?: string
  is_active: boolean
  created_at: string
  updated_at: string
  created_by?: string
  updated_by?: string
}

export interface AuditLogEntry {
  id: string
  user_id?: string
  action: 'create' | 'update' | 'delete' | 'export' | 'import'
  table_name: string
  record_id?: string
  old_values?: any
  new_values?: any
  ip_address?: string
  user_agent?: string
  created_at: string
}

class SettingsManager {
  private supabase = getSupabaseClient()
  private cache = new Map<string, { data: any; timestamp: number }>()
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

  // System Settings
  async getSystemSetting(key: string, forceReload: boolean = false): Promise<any> {
    const cacheKey = `system_${key}`
    
    // Clear cache if force reload
    if (forceReload) {
      this.cache.delete(cacheKey)
    } else {
      const cached = this.cache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return cached.data
      }
    }

    try {
      // Try using the safe function first (if it exists)
      try {
        const { data: functionResult, error: functionError } = await (this.supabase as any)
          .rpc('get_system_setting_safe', {
            p_setting_key: key
          })

        if (!functionError && functionResult !== null) {
          // Function exists and worked
          const value = functionResult
          if (value !== null && value !== undefined) {
            this.cache.set(cacheKey, { data: value, timestamp: Date.now() })
            console.log(`✅ Loaded system setting "${key}" from database using function:`, value)
          }
          return value
        }
      } catch (funcErr) {
        // Function might not exist, continue to fallback
        console.log('Function get_system_setting_safe not available, using direct query:', funcErr)
      }

      // Fallback to direct query (if function doesn't exist or failed)
      const { data, error } = await this.supabase
        .from('system_settings')
        .select('*')
        .eq('setting_key', key)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error getting system setting:', error)
        return null
      }

      const value = (data as any)?.setting_value
      if (value !== null && value !== undefined) {
        this.cache.set(cacheKey, { data: value, timestamp: Date.now() })
        console.log(`✅ Loaded system setting "${key}" from database:`, value)
      }
      return value
    } catch (error) {
      console.error('Error getting system setting:', error)
      return null
    }
  }

  async setSystemSetting(
    key: string, 
    value: any, 
    type: 'string' | 'number' | 'boolean' | 'json' = 'string',
    description?: string,
    category: string = 'general',
    isPublic: boolean = false
  ): Promise<boolean> {
    try {
      // Try using the safe function first (if it exists)
      try {
        const { data: functionResult, error: functionError } = await (this.supabase as any)
          .rpc('set_system_setting_safe', {
            p_setting_key: key,
            p_setting_value: value,
            p_setting_type: type,
            p_description: description || null,
            p_category: category,
            p_is_public: isPublic
          })

        if (!functionError && functionResult === true) {
          // Function exists and worked
          this.cache.delete(`system_${key}`)
          return true
        }
      } catch (funcErr) {
        // Function might not exist, continue to fallback
        console.log('Function not available, using direct upsert:', funcErr)
      }

      // Fallback to direct upsert (if function doesn't exist or failed)
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      const { error } = await (this.supabase
        .from('system_settings') as any)
        .upsert({
          setting_key: key,
          setting_value: value,
          setting_type: type,
          description,
          category,
          is_public: isPublic,
          updated_by: user.id
        }, {
          onConflict: 'setting_key'
        })

      if (error) {
        console.error('❌ Error in setSystemSetting upsert:', error)
        throw error
      }

      // Clear cache to force reload on next get
      this.cache.delete(`system_${key}`)
      console.log(`✅ Settings saved directly, cache cleared for "${key}"`)
      return true
    } catch (error) {
      console.error('Error setting system setting:', error)
      return false
    }
  }

  async getAllSystemSettings(category?: string): Promise<SystemSetting[]> {
    try {
      let query = this.supabase.from('system_settings').select('*')
      
      if (category) {
        query = query.eq('category', category)
      }

      const { data, error } = await query.order('setting_key')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting all system settings:', error)
      return []
    }
  }

  // User Preferences
  async getUserPreference(key: string, userId?: string): Promise<any> {
    const currentUser = await this.getCurrentUserId()
    const uid = userId || currentUser
    if (!uid) return null

    const cacheKey = `user_${uid}_${key}`
    const cached = this.cache.get(cacheKey)
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data
    }

    try {
      // First ensure user settings are initialized
      await (this.supabase as any).rpc('ensure_user_settings_initialized', { user_id: uid })

      const { data, error } = await this.supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', uid)
        .eq('preference_key', key)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      const value = (data as any)?.preference_value
      this.cache.set(cacheKey, { data: value, timestamp: Date.now() })
      return value
    } catch (error) {
      console.error('Error getting user preference:', error)
      return null
    }
  }

  async setUserPreference(
    key: string, 
    value: any, 
    type: 'string' | 'number' | 'boolean' | 'json' = 'string',
    category: string = 'personal',
    userId?: string
  ): Promise<boolean> {
    const currentUser = await this.getCurrentUserId()
    const uid = userId || currentUser
    if (!uid) return false

    try {
      const { error } = await (this.supabase
        .from('user_preferences') as any)
        .upsert({
          user_id: uid,
          preference_key: key,
          preference_value: value,
          preference_type: type,
          category
        })

      if (error) throw error

      // Clear cache
      this.cache.delete(`user_${uid}_${key}`)
      return true
    } catch (error) {
      console.error('Error setting user preference:', error)
      return false
    }
  }

  async getAllUserPreferences(userId?: string): Promise<UserPreference[]> {
    const currentUser = await this.getCurrentUserId()
    const uid = userId || currentUser
    if (!uid) return []

    try {
      const { data, error } = await this.supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', uid)
        .order('preference_key')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting all user preferences:', error)
      return []
    }
  }

  // Notification Settings
  async getNotificationSettings(userId?: string): Promise<NotificationSetting[]> {
    const currentUser = await this.getCurrentUserId()
    const uid = userId || currentUser
    if (!uid) return []

    try {
      // First ensure user settings are initialized
      await (this.supabase as any).rpc('ensure_user_settings_initialized', { user_id: uid })

      const { data, error } = await this.supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', uid)
        .order('notification_type', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting notification settings:', error)
      return []
    }
  }

  async updateNotificationSetting(
    notificationType: string,
    category: string,
    updates: Partial<NotificationSetting>,
    userId?: string
  ): Promise<boolean> {
    const currentUser = await this.getCurrentUserId()
    const uid = userId || currentUser
    if (!uid) return false

    try {
      const { error } = await (this.supabase
        .from('notification_settings') as any)
        .upsert({
          user_id: uid,
          notification_type: notificationType,
          notification_category: category,
          ...updates
        })

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error updating notification setting:', error)
      return false
    }
  }

  // Security Settings
  async getSecuritySettings(): Promise<SecuritySetting[]> {
    try {
      const { data, error } = await this.supabase
        .from('security_settings')
        .select('*')
        .order('setting_key')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting security settings:', error)
      return []
    }
  }

  async setSecuritySetting(
    key: string,
    value: any,
    description?: string,
    riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low',
    requiresAdmin: boolean = false
  ): Promise<boolean> {
    try {
      const { error } = await (this.supabase
        .from('security_settings') as any)
        .upsert({
          setting_key: key,
          setting_value: value,
          description,
          risk_level: riskLevel,
          requires_admin: requiresAdmin,
          updated_by: (await this.supabase.auth.getUser()).data.user?.id
        })

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error setting security setting:', error)
      return false
    }
  }

  // Backup Settings
  async getBackupSettings(): Promise<BackupSetting[]> {
    try {
      const { data, error } = await this.supabase
        .from('backup_settings')
        .select('*')
        .eq('is_active', true)
        .order('created_at')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting backup settings:', error)
      return []
    }
  }

  async createBackupSetting(setting: Partial<BackupSetting>): Promise<boolean> {
    try {
      const { error } = await (this.supabase
        .from('backup_settings') as any)
        .insert({
          ...setting,
          created_by: (await this.supabase.auth.getUser()).data.user?.id
        })

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error creating backup setting:', error)
      return false
    }
  }

  async updateBackupSetting(id: string, updates: Partial<BackupSetting>): Promise<boolean> {
    try {
      const { error} = await (this.supabase
        .from('backup_settings') as any)
        .update({
          ...updates,
          updated_by: (await this.supabase.auth.getUser()).data.user?.id
        })
        .eq('id', id)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error updating backup setting:', error)
      return false
    }
  }

  // Audit Log
  async getAuditLog(limit: number = 100, offset: number = 0): Promise<AuditLogEntry[]> {
    try {
      const { data, error } = await this.supabase
        .from('settings_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting audit log:', error)
      return []
    }
  }

  // Utility functions
  private async getCurrentUserId(): Promise<string | null> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      return user?.id || null
    } catch (error) {
      console.error('Error getting current user ID:', error)
      return null
    }
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear()
  }

  // Clear specific cache entry
  clearCacheEntry(key: string): void {
    this.cache.delete(key)
  }

  // Get cache statistics
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }

  // Initialize default settings for new user
  async initializeUserSettings(userId: string): Promise<boolean> {
    try {
      const { data, error } = await (this.supabase as any)
        .rpc('initialize_user_default_settings', { target_user_id: userId })

      if (error) throw error
      return data === true
    } catch (error) {
      console.error('Error initializing user settings:', error)
      return false
    }
  }
}

// Create singleton instance
export const settingsManager = new SettingsManager()

// Export default settings
export const DEFAULT_SYSTEM_SETTINGS = {
  app_name: 'AlRabat RPF',
  app_version: '1.0.0',
  company_name: 'AlRabat RPF',
  company_slogan: 'Masters of Foundation Construction',
  default_language: 'en',
  default_timezone: 'UTC',
  session_timeout: 30,
  max_login_attempts: 5,
  password_min_length: 8,
  auto_save_interval: 30,
  max_file_size_mb: 10,
  enable_notifications: true,
  enable_email_notifications: true,
  enable_push_notifications: false,
  backup_auto_enabled: true,
  backup_frequency: 'daily',
  backup_retention_days: 30,
  theme_mode: 'system',
  sidebar_collapsed: false,
  dashboard_refresh_interval: 60
}

export const DEFAULT_USER_PREFERENCES = {
  theme_mode: 'system',
  language: 'en',
  timezone: 'UTC',
  sidebar_collapsed: false,
  compact_mode: false,
  show_tooltips: true,
  enable_sounds: true,
  enable_animations: true
}

export const DEFAULT_NOTIFICATION_SETTINGS = {
  email_project_updates: true,
  email_kpi_alerts: true,
  email_system_messages: true,
  email_security: true,
  in_app_project_updates: true,
  in_app_kpi_alerts: true,
  in_app_system_messages: true,
  in_app_security: true
}
