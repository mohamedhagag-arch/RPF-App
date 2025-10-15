'use client'

import { settingsManager } from './settingsManager'
import { useEffect, useState } from 'react'

// Hook for using system settings
export function useSystemSetting(key: string, defaultValue: any = null) {
  const [value, setValue] = useState(defaultValue)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadSetting = async () => {
      try {
        setLoading(true)
        const settingValue = await settingsManager.getSystemSetting(key)
        setValue(settingValue !== null ? settingValue : defaultValue)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load setting')
        setValue(defaultValue)
      } finally {
        setLoading(false)
      }
    }

    loadSetting()
  }, [key, defaultValue])

  const updateSetting = async (newValue: any) => {
    try {
      const success = await settingsManager.setSystemSetting(key, newValue)
      if (success) {
        setValue(newValue)
        return true
      }
      return false
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update setting')
      return false
    }
  }

  return { value, loading, error, updateSetting }
}

// Hook for using user preferences
export function useUserPreference(key: string, defaultValue: any = null) {
  const [value, setValue] = useState(defaultValue)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadPreference = async () => {
      try {
        setLoading(true)
        const preferenceValue = await settingsManager.getUserPreference(key)
        setValue(preferenceValue !== null ? preferenceValue : defaultValue)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load preference')
        setValue(defaultValue)
      } finally {
        setLoading(false)
      }
    }

    loadPreference()
  }, [key, defaultValue])

  const updatePreference = async (newValue: any) => {
    try {
      const success = await settingsManager.setUserPreference(key, newValue)
      if (success) {
        setValue(newValue)
        return true
      }
      return false
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update preference')
      return false
    }
  }

  return { value, loading, error, updatePreference }
}

// Theme management
export function useTheme() {
  const { value: themeMode, updatePreference } = useUserPreference('theme_mode', 'system')
  
  useEffect(() => {
    const applyTheme = () => {
      const root = document.documentElement
      
      if (themeMode === 'dark') {
        root.classList.add('dark')
        root.classList.remove('light')
      } else if (themeMode === 'light') {
        root.classList.add('light')
        root.classList.remove('dark')
      } else {
        // System theme
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        if (prefersDark) {
          root.classList.add('dark')
          root.classList.remove('light')
        } else {
          root.classList.add('light')
          root.classList.remove('dark')
        }
      }
    }

    applyTheme()

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      if (themeMode === 'system') {
        applyTheme()
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [themeMode])

  const setTheme = async (newTheme: 'light' | 'dark' | 'system') => {
    return await updatePreference(newTheme)
  }

  return { themeMode, setTheme }
}

// Language management
export function useLanguage() {
  const { value: language, updatePreference } = useUserPreference('language', 'en')
  
  const setLanguage = async (newLanguage: string) => {
    return await updatePreference(newLanguage)
  }

  return { language, setLanguage }
}

// Sidebar state management
export function useSidebarState() {
  const { value: collapsed, updatePreference } = useUserPreference('sidebar_collapsed', false)
  
  const toggleSidebar = async () => {
    return await updatePreference(!collapsed)
  }

  const setSidebarCollapsed = async (newCollapsed: boolean) => {
    return await updatePreference(newCollapsed)
  }

  return { collapsed, toggleSidebar, setSidebarCollapsed }
}

// Notification settings
export function useNotificationSettings() {
  const [settings, setSettings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true)
        const notificationSettings = await settingsManager.getNotificationSettings()
        setSettings(notificationSettings)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load notification settings')
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [])

  const updateNotificationSetting = async (
    type: string,
    category: string,
    updates: any
  ) => {
    try {
      const success = await settingsManager.updateNotificationSetting(type, category, updates)
      if (success) {
        // Reload settings
        const updatedSettings = await settingsManager.getNotificationSettings()
        setSettings(updatedSettings)
        return true
      }
      return false
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update notification setting')
      return false
    }
  }

  return { settings, loading, error, updateNotificationSetting }
}

// Auto-save settings
export function useAutoSave() {
  const { value: autoSaveInterval, updatePreference } = useUserPreference('auto_save_interval', 30)
  const { value: autoSaveEnabled, updatePreference: updateAutoSaveEnabled } = useUserPreference('auto_save_enabled', true)
  
  const setAutoSaveInterval = async (interval: number) => {
    return await updatePreference(interval)
  }

  const setAutoSaveEnabled = async (enabled: boolean) => {
    return await updatePreference(enabled)
  }

  return {
    autoSaveInterval,
    autoSaveEnabled,
    setAutoSaveInterval,
    setAutoSaveEnabled
  }
}

// Session timeout settings
export function useSessionTimeout() {
  const { value: timeout, updatePreference } = useUserPreference('session_timeout', 30)
  
  const setTimeout = async (newTimeout: number) => {
    return await updatePreference(newTimeout)
  }

  return { timeout, setTimeout }
}

// File upload settings
export function useFileUploadSettings() {
  const { value: maxFileSize, updatePreference } = useUserPreference('max_file_size_mb', 10)
  const { value: allowedTypes, updatePreference: updateAllowedTypes } = useUserPreference('allowed_file_types', ['jpg', 'png', 'pdf', 'doc', 'docx'])
  
  const setMaxFileSize = async (size: number) => {
    return await updatePreference(size)
  }

  const setAllowedTypes = async (types: string[]) => {
    return await updatePreference(types)
  }

  return {
    maxFileSize,
    allowedTypes,
    setMaxFileSize,
    setAllowedTypes
  }
}

// Dashboard settings
export function useDashboardSettings() {
  const { value: refreshInterval, updatePreference } = useUserPreference('dashboard_refresh_interval', 60)
  const { value: compactMode, updatePreference: updateCompactMode } = useUserPreference('compact_mode', false)
  const { value: showTooltips, updatePreference: updateShowTooltips } = useUserPreference('show_tooltips', true)
  
  const setRefreshInterval = async (interval: number) => {
    return await updatePreference(interval)
  }

  const setCompactMode = async (compact: boolean) => {
    return await updatePreference(compact)
  }

  const setShowTooltips = async (show: boolean) => {
    return await updatePreference(show)
  }

  return {
    refreshInterval,
    compactMode,
    showTooltips,
    setRefreshInterval,
    setCompactMode,
    setShowTooltips
  }
}

// Initialize user settings when they first log in
export async function initializeUserSettings(userId: string) {
  try {
    const success = await settingsManager.initializeUserSettings(userId)
    return success
  } catch (error) {
    console.error('Failed to initialize user settings:', error)
    return false
  }
}

// Settings provider component
export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    const initializeSettings = async () => {
      try {
        // Clear cache on app start
        settingsManager.clearCache()
        
        // Initialize default settings if needed
        // This will be called when user first logs in
        setInitialized(true)
      } catch (error) {
        console.error('Failed to initialize settings:', error)
        setInitialized(true) // Continue anyway
      }
    }

    initializeSettings()
  }, [])

  if (!initialized) {
    return null
  }

  return children
}

// Utility functions
export const SettingsUtils = {
  // Get all system settings for admin
  async getSystemSettings() {
    return await settingsManager.getAllSystemSettings()
  },

  // Get all user preferences
  async getUserPreferences() {
    return await settingsManager.getAllUserPreferences()
  },

  // Clear all caches
  clearAllCaches() {
    settingsManager.clearCache()
  },

  // Get cache statistics
  getCacheStats() {
    return settingsManager.getCacheStats()
  },

  // Export settings
  async exportSettings() {
    const [systemSettings, userPreferences] = await Promise.all([
      settingsManager.getAllSystemSettings(),
      settingsManager.getAllUserPreferences()
    ])

    return {
      systemSettings,
      userPreferences,
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    }
  },

  // Import settings
  async importSettings(data: any) {
    try {
      if (data.systemSettings) {
        for (const setting of data.systemSettings) {
          await settingsManager.setSystemSetting(
            setting.setting_key,
            setting.setting_value,
            setting.setting_type,
            setting.description,
            setting.category,
            setting.is_public
          )
        }
      }

      if (data.userPreferences) {
        for (const preference of data.userPreferences) {
          await settingsManager.setUserPreference(
            preference.preference_key,
            preference.preference_value,
            preference.preference_type,
            preference.category
          )
        }
      }

      return true
    } catch (error) {
      console.error('Failed to import settings:', error)
      return false
    }
  }
}
