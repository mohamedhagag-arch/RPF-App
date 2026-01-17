'use client'

import { useState, useEffect } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { settingsManager, SystemSetting } from '@/lib/settingsManager'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import {
  Settings,
  Save,
  RefreshCw,
  Shield,
  Bell,
  Database,
  Globe,
  Palette,
  Clock,
  HardDrive,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info
} from 'lucide-react'

interface SystemSettingsManagerProps {
  onClose?: () => void
}

export function SystemSettingsManager({ onClose }: SystemSettingsManagerProps) {
  const guard = usePermissionGuard()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeCategory, setActiveCategory] = useState('general')
  const [settings, setSettings] = useState<SystemSetting[]>([])
  const [editedSettings, setEditedSettings] = useState<Map<string, any>>(new Map())
  const [showSensitive, setShowSensitive] = useState<Map<string, boolean>>(new Map())

  const categories = [
    { id: 'general', name: 'General', icon: Settings, color: 'blue' },
    { id: 'security', name: 'Security', icon: Shield, color: 'red' },
    { id: 'notifications', name: 'Notifications', icon: Bell, color: 'green' },
    { id: 'ui', name: 'User Interface', icon: Palette, color: 'purple' },
    { id: 'backup', name: 'Backup & Restore', icon: Database, color: 'orange' },
    { id: 'performance', name: 'Performance', icon: Clock, color: 'cyan' }
  ]

  useEffect(() => {
    loadSettings()
  }, [activeCategory])


  const loadSettings = async () => {
    try {
      setLoading(true)
      setError('')
      
      const data = await settingsManager.getAllSystemSettings(activeCategory)
      console.log('📋 Loaded settings for category:', activeCategory, data)
      
      setSettings(data)
      
      // Initialize edited settings map
      const editedMap = new Map()
      data.forEach(setting => {
        // Handle JSONB values - extract actual value if it's wrapped
        let value = setting.setting_value
        
        // Handle different JSONB formats from Supabase
        if (value !== null && value !== undefined) {
          // If it's a JSONB object, try to extract the actual value
          if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
            // Check if it's a JSONB wrapper with common patterns
            if ('value' in value) {
              value = value.value
            } else if (Object.keys(value).length === 1) {
              // Single key object, might be the value
              const keys = Object.keys(value)
              value = value[keys[0]]
            } else if (setting.setting_type === 'boolean' && typeof value === 'object') {
              // For boolean, check if it's wrapped
              if ('bool' in value) {
                value = value.bool
              } else if ('boolean' in value) {
                value = value.boolean
              }
            } else if (setting.setting_type === 'string' && typeof value === 'object') {
              // For string, check if it's wrapped
              if ('str' in value) {
                value = value.str
              } else if ('string' in value) {
                value = value.string
              } else if ('text' in value) {
                value = value.text
              }
            }
          }
          
          // Convert boolean strings to actual booleans
          if (setting.setting_type === 'boolean') {
            if (value === 'true' || value === true) {
              value = true
            } else if (value === 'false' || value === false) {
              value = false
            }
          }
        }
        
        editedMap.set(setting.setting_key, value)
        console.log(`✅ Setting "${setting.setting_key}":`, value, 'Type:', typeof value, 'Raw:', setting.setting_value)
      })
      setEditedSettings(editedMap)
      
    } catch (error: any) {
      setError('Failed to load settings')
      console.error('Error loading settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSettingChange = (key: string, value: any) => {
    setEditedSettings(prev => {
      const newMap = new Map(prev)
      newMap.set(key, value)
      return newMap
    })
  }

  const saveSettings = async () => {
    try {
      setSaving(true)
      setError('')
      
      let hasChanges = false
      const promises = []

      // Convert Map entries to Array to avoid iteration error
      for (const [key, value] of Array.from(editedSettings.entries())) {
        const originalSetting = settings.find(s => s.setting_key === key)
        if (originalSetting && originalSetting.setting_value !== value) {
          promises.push(
            settingsManager.setSystemSetting(
              key,
              value,
              originalSetting.setting_type,
              originalSetting.description,
              originalSetting.category,
              originalSetting.is_public
            )
          )
          hasChanges = true
        }
      }

      if (!hasChanges) {
        setSuccess('No changes to save')
        setTimeout(() => setSuccess(''), 3000)
        return
      }

      const results = await Promise.all(promises)
      const failed = results.filter(r => !r).length

      if (failed === 0) {
        setSuccess('Settings saved successfully')
        setTimeout(() => setSuccess(''), 3000)
        await loadSettings()
      } else {
        setError(`Failed to save ${failed} setting(s)`)
      }
      
    } catch (error: any) {
      setError('Failed to save settings')
      console.error('Error saving settings:', error)
    } finally {
      setSaving(false)
    }
  }

  const resetSettings = async () => {
    if (!confirm('Are you sure you want to reset all settings to default values?')) return

    try {
      setSaving(true)
      setError('')
      
      const promises = settings.map(setting => 
        settingsManager.setSystemSetting(
          setting.setting_key,
          setting.setting_value,
          setting.setting_type,
          setting.description,
          setting.category,
          setting.is_public
        )
      )

      await Promise.all(promises)
      setSuccess('Settings reset to defaults')
      setTimeout(() => setSuccess(''), 3000)
      await loadSettings()
      
    } catch (error: any) {
      setError('Failed to reset settings')
      console.error('Error resetting settings:', error)
    } finally {
      setSaving(false)
    }
  }

  const toggleSensitive = (key: string) => {
    setShowSensitive(prev => {
      const newMap = new Map(prev)
      newMap.set(key, !newMap.get(key))
      return newMap
    })
  }

  const getSettingIcon = (key: string) => {
    if (key.includes('password') || key.includes('secret') || key.includes('key')) return Lock
    if (key.includes('timeout') || key.includes('interval')) return Clock
    if (key.includes('size') || key.includes('limit')) return HardDrive
    if (key.includes('theme') || key.includes('ui')) return Palette
    if (key.includes('notification')) return Bell
    if (key.includes('security') || key.includes('login')) return Shield
    return Settings
  }

  const getSettingColor = (key: string) => {
    if (key.includes('password') || key.includes('secret') || key.includes('key')) return 'text-red-500'
    if (key.includes('timeout') || key.includes('interval')) return 'text-blue-500'
    if (key.includes('size') || key.includes('limit')) return 'text-green-500'
    if (key.includes('theme') || key.includes('ui')) return 'text-purple-500'
    if (key.includes('notification')) return 'text-yellow-500'
    if (key.includes('security') || key.includes('login')) return 'text-red-500'
    return 'text-gray-500'
  }

  const hasChanges = () => {
    // Convert Map entries to Array to avoid iteration error
    for (const [key, value] of Array.from(editedSettings.entries())) {
      const originalSetting = settings.find(s => s.setting_key === key)
      if (originalSetting && originalSetting.setting_value !== value) {
        return true
      }
    }
    return false
  }

  const renderSettingInput = (setting: SystemSetting) => {
    const value = editedSettings.get(setting.setting_key)
    const isSensitive = setting.setting_key.includes('password') || setting.setting_key.includes('secret')
    const showValue = !isSensitive || showSensitive.get(setting.setting_key)

    switch (setting.setting_type) {
      case 'boolean':
        const isEnabled = value || false
        
        return (
          <div className="flex items-center space-x-4">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(e) => handleSettingChange(setting.setting_key, e.target.checked)}
                className="sr-only peer"
              />
              <div className={`
                w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-opacity-50 rounded-full peer 
                dark:bg-gray-700 transition-all duration-200 ease-in-out
                ${isEnabled 
                  ? 'peer-checked:bg-blue-600 dark:peer-checked:bg-blue-600 peer-focus:ring-blue-300' 
                  : ''
                }
                peer-checked:after:translate-x-full peer-checked:after:border-white 
                after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
                after:bg-white after:border-gray-300 after:border after:rounded-full 
                after:h-6 after:w-6 after:transition-all dark:border-gray-600
                ${isEnabled ? 'shadow-lg' : ''}
              `}></div>
            </label>
            <div className="flex items-center space-x-2">
              {isEnabled ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                    Enabled
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-gray-400" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Disabled
                  </span>
                </>
              )}
            </div>
          </div>
        )

      case 'number':
        return (
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => handleSettingChange(setting.setting_key, Number(e.target.value))}
            className="max-w-32"
            min={0}
          />
        )

      case 'json':
        return (
          <textarea
            value={JSON.stringify(value, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value)
                handleSettingChange(setting.setting_key, parsed)
              } catch (error) {
                // Invalid JSON, but keep the text for editing
                handleSettingChange(setting.setting_key, e.target.value)
              }
            }}
            className="w-full p-2 border border-gray-300 rounded-md text-sm font-mono"
            rows={3}
          />
        )

      default:
        return (
          <div className="flex items-center space-x-2">
            <Input
              type={isSensitive && !showValue ? 'password' : 'text'}
              value={showValue ? (value || '') : '••••••••'}
              onChange={(e) => handleSettingChange(setting.setting_key, e.target.value)}
              className="flex-1"
            />
            {isSensitive && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleSensitive(setting.setting_key)}
              >
                {showValue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            )}
          </div>
        )
    }
  }

  if (!guard.hasAccess('settings.manage')) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-600">
              You don't have permission to manage system settings.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">System Settings</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage system-wide configuration and preferences
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={loadSettings}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="error">
          <XCircle className="h-4 w-4" />
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert variant="success">
          <CheckCircle className="h-4 w-4" />
          {success}
        </Alert>
      )}

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => {
          const Icon = category.icon
          
          return (
            <Button
              key={category.id}
              variant={activeCategory === category.id ? 'primary' : 'outline'}
              onClick={() => setActiveCategory(category.id)}
              className="flex items-center space-x-2"
            >
              <Icon className="h-4 w-4" />
              <span>{category.name}</span>
            </Button>
          )
        })}
      </div>

      {/* Settings Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>{categories.find(c => c.id === activeCategory)?.name} Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <div className="space-y-6">
              {settings.length === 0 ? (
                <div className="text-center py-8">
                  <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">No settings found for this category.</p>
                </div>
              ) : (
                settings.map((setting) => {
                  const Icon = getSettingIcon(setting.setting_key)
                  const iconColor = getSettingColor(setting.setting_key)
                  
                  return (
                    <div 
                      key={setting.id} 
                      className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-b-0 transition-colors duration-200"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Icon className={`h-5 w-5 ${iconColor}`} />
                            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                              {setting.setting_key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </h3>
                            {!setting.is_public && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                <Lock className="h-3 w-3 mr-1" />
                                Private
                              </span>
                            )}
                            {setting.requires_restart && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Requires Restart
                              </span>
                            )}
                          </div>
                          
                          {setting.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                              {setting.description}
                            </p>
                          )}
                          
                          <div className="max-w-md">
                            {renderSettingInput(setting)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      {settings.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={resetSettings}
              disabled={saving}
            >
              Reset to Defaults
            </Button>
          </div>
          
          <div className="flex items-center space-x-2">
            {hasChanges() && (
              <span className="text-sm text-orange-600 flex items-center">
                <Info className="h-4 w-4 mr-1" />
                You have unsaved changes
              </span>
            )}
            <Button
              onClick={saveSettings}
              disabled={saving || !hasChanges()}
            >
              {saving ? (
                <LoadingSpinner size="sm" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
