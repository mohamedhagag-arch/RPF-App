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
  Wrench,
  Save,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  MessageSquare,
  Shield
} from 'lucide-react'

export function MaintenanceModeManager() {
  const guard = usePermissionGuard()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [settings, setSettings] = useState<SystemSetting[]>([])
  const [editedSettings, setEditedSettings] = useState<Map<string, any>>(new Map())
  const [showMaintenanceConfirm, setShowMaintenanceConfirm] = useState(false)
  const [pendingMaintenanceValue, setPendingMaintenanceValue] = useState<boolean | null>(null)
  const [maintenanceStatus, setMaintenanceStatus] = useState<boolean>(false)

  useEffect(() => {
    const loadSettingsWithInit = async () => {
      await initializeMaintenanceSettings()
      await loadSettings()
    }
    
    loadSettingsWithInit()
  }, [])

  const initializeMaintenanceSettings = async () => {
    try {
      const existingSettings = await settingsManager.getAllSystemSettings('maintenance')
      
      if (existingSettings.length === 0) {
        const result1 = await settingsManager.setSystemSetting(
          'maintenance_mode_enabled',
          false,
          'boolean',
          'Enable maintenance mode - When enabled, the site will be closed for all users except admin',
          'maintenance',
          true
        )
        
        const result2 = await settingsManager.setSystemSetting(
          'maintenance_message',
          'We are performing maintenance on the site. We apologize for the inconvenience and will be back soon.',
          'string',
          'Maintenance message displayed to users',
          'maintenance',
          true
        )
        
        const result3 = await settingsManager.setSystemSetting(
          'maintenance_estimated_time',
          '30 minutes',
          'string',
          'Estimated time for maintenance completion',
          'maintenance',
          true
        )
        
        if (!result1 || !result2 || !result3) {
          throw new Error('Some settings failed to save')
        }
        
        settingsManager.clearCache()
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        const verifySettings = await settingsManager.getAllSystemSettings('maintenance')
        if (verifySettings.length === 0) {
          throw new Error('Settings were not saved properly')
        }
        
        return true
      }
      return false
    } catch (error: any) {
      console.error('Error initializing maintenance settings:', error)
      setError(`Failed to initialize: ${error.message || 'Unknown error'}`)
      return false
    }
  }

  const loadSettings = async () => {
    try {
      setLoading(true)
      setError('')
      
      const data = await settingsManager.getAllSystemSettings('maintenance')
      setSettings(data)
      
      const editedMap = new Map()
      data.forEach(setting => {
        let value = setting.setting_value
        
        if (setting.setting_key === 'maintenance_mode_enabled') {
          let boolValue = value
          if (typeof value === 'object' && value !== null) {
            if ('bool' in value) boolValue = value.bool
            else if ('boolean' in value) boolValue = value.boolean
            else if (Object.keys(value).length === 1) {
              boolValue = Object.values(value)[0]
            }
          }
          if (boolValue === 'true' || boolValue === true) {
            setMaintenanceStatus(true)
          } else {
            setMaintenanceStatus(false)
          }
        }
        
        if (value !== null && value !== undefined) {
          if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
            if ('value' in value) {
              value = value.value
            } else if (Object.keys(value).length === 1) {
              const keys = Object.keys(value)
              value = value[keys[0]]
            } else if (setting.setting_type === 'boolean' && typeof value === 'object') {
              if ('bool' in value) {
                value = value.bool
              } else if ('boolean' in value) {
                value = value.boolean
              }
            } else if (setting.setting_type === 'string' && typeof value === 'object') {
              if ('str' in value) {
                value = value.str
              } else if ('string' in value) {
                value = value.string
              } else if ('text' in value) {
                value = value.text
              }
            }
          }
          
          if (setting.setting_type === 'boolean') {
            if (value === 'true' || value === true) {
              value = true
            } else if (value === 'false' || value === false) {
              value = false
            }
          }
        }
        
        editedMap.set(setting.setting_key, value)
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
    if (key === 'maintenance_mode_enabled') {
      if (value === true) {
        setPendingMaintenanceValue(true)
        setShowMaintenanceConfirm(true)
        return
      } else {
        setMaintenanceStatus(false)
      }
    }
    
    setEditedSettings(prev => {
      const newMap = new Map(prev)
      newMap.set(key, value)
      return newMap
    })
  }

  const confirmMaintenanceMode = (confirmed: boolean) => {
    setShowMaintenanceConfirm(false)
    if (confirmed && pendingMaintenanceValue !== null) {
      setEditedSettings(prev => {
        const newMap = new Map(prev)
        newMap.set('maintenance_mode_enabled', pendingMaintenanceValue)
        setMaintenanceStatus(pendingMaintenanceValue)
        return newMap
      })
    }
    setPendingMaintenanceValue(null)
  }

  const saveSettings = async () => {
    try {
      setSaving(true)
      setError('')
      
      let hasChanges = false
      const promises = []

      for (const [key, value] of Array.from(editedSettings.entries())) {
        const originalSetting = settings.find(s => s.setting_key === key)
        if (originalSetting && originalSetting.setting_value !== value) {
          const isPublic = key === 'maintenance_mode_enabled' ? true : originalSetting.is_public
          
          promises.push(
            settingsManager.setSystemSetting(
              key,
              value,
              originalSetting.setting_type,
              originalSetting.description,
              originalSetting.category,
              isPublic
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
        const maintenanceChanged = editedSettings.get('maintenance_mode_enabled') !== undefined
        const maintenanceEnabled = editedSettings.get('maintenance_mode_enabled')
        
        if (maintenanceChanged) {
          setMaintenanceStatus(maintenanceEnabled || false)
          
          if (maintenanceEnabled) {
            setSuccess('✅ Maintenance mode enabled successfully! The site is now closed to all users except admin.')
          } else {
            setSuccess('✅ Maintenance mode disabled successfully! The site is now available to all users.')
          }
          setTimeout(() => setSuccess(''), 5000)
        } else {
          setSuccess('Settings saved successfully')
          setTimeout(() => setSuccess(''), 3000)
        }
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
    if (!confirm('Are you sure you want to reset all maintenance settings to default values?')) return

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

  const renderSettingInput = (setting: SystemSetting) => {
    const value = editedSettings.get(setting.setting_key)

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
                  ? 'peer-checked:bg-orange-500 dark:peer-checked:bg-orange-600 peer-focus:ring-orange-300' 
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
                  <CheckCircle className="h-5 w-5 text-orange-500" />
                  <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                    Maintenance Mode Active
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-gray-400" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Maintenance Mode Inactive
                  </span>
                </>
              )}
            </div>
          </div>
        )

      default:
        if (setting.setting_key === 'maintenance_message') {
          return (
            <textarea
              value={value || ''}
              onChange={(e) => handleSettingChange(setting.setting_key, e.target.value)}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md text-sm resize-y min-h-[100px]"
              rows={4}
              placeholder="Enter maintenance message..."
            />
          )
        }
        return (
          <Input
            type="text"
            value={value || ''}
            onChange={(e) => handleSettingChange(setting.setting_key, e.target.value)}
            className="max-w-md"
            placeholder={setting.description || ''}
          />
        )
    }
  }

  const hasChanges = () => {
    for (const [key, value] of Array.from(editedSettings.entries())) {
      const originalSetting = settings.find(s => s.setting_key === key)
      if (originalSetting && originalSetting.setting_value !== value) {
        return true
      }
    }
    return false
  }

  if (!guard.hasAccess('settings.maintenance_mode') && !guard.hasAccess('settings.manage')) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Access Denied</h3>
            <p className="text-gray-600 dark:text-gray-400">
              You don't have permission to manage maintenance mode settings.
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
            <Wrench className="h-6 w-6 text-orange-500" />
            <span>Maintenance Mode</span>
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Control site maintenance mode and customize the maintenance page
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
        </div>
      </div>

      {/* Maintenance Mode Status Banner */}
      {(() => {
        const maintenanceEnabled = editedSettings.get('maintenance_mode_enabled') || false
        if (maintenanceEnabled) {
          return (
            <Alert variant="warning" className="border-orange-500 bg-orange-50 dark:bg-orange-900/20">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-1">
                    ⚠️ Maintenance Mode is Currently Active
                  </h3>
                  <p className="text-sm text-orange-800 dark:text-orange-200">
                    The site is currently closed to all users except admin. The maintenance page will be displayed to all other users.
                  </p>
                </div>
              </div>
            </Alert>
          )
        }
        return null
      })()}

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

      {/* Maintenance Mode Confirmation Dialog */}
      {showMaintenanceConfirm && (
        <Alert variant="warning" className="border-orange-500 bg-orange-50 dark:bg-orange-900/20">
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">
                  ⚠️ Confirm Enable Maintenance Mode
                </h3>
                <p className="text-sm text-orange-800 dark:text-orange-200 mb-4">
                  When maintenance mode is enabled, the site will be closed for all users except admin. 
                  All other users will be redirected to the maintenance page.
                </p>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="primary"
                    onClick={() => confirmMaintenanceMode(true)}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Yes, Enable Maintenance Mode
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => confirmMaintenanceMode(false)}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Alert>
      )}

      {/* Settings Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Wrench className="h-5 w-5 text-orange-500" />
            <span>Maintenance Mode Settings</span>
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
                  <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">No maintenance settings found.</p>
                  <Button
                    onClick={async () => {
                      try {
                        setLoading(true)
                        setError('')
                        setSuccess('')
                        
                        const initialized = await initializeMaintenanceSettings()
                        
                        if (initialized) {
                          setSuccess('Maintenance settings initialized successfully!')
                          settingsManager.clearCache()
                          await new Promise(resolve => setTimeout(resolve, 800))
                          await loadSettings()
                          setTimeout(() => setSuccess(''), 5000)
                        } else {
                          await loadSettings()
                          setSuccess('Settings already exist. Reloaded successfully!')
                          setTimeout(() => setSuccess(''), 3000)
                        }
                      } catch (error: any) {
                        setError(`Failed to initialize: ${error.message || 'Unknown error'}`)
                      } finally {
                        setLoading(false)
                      }
                    }}
                    variant="primary"
                    disabled={loading}
                  >
                    <Wrench className="h-4 w-4 mr-2" />
                    {loading ? 'Initializing...' : 'Initialize Maintenance Settings'}
                  </Button>
                </div>
              ) : (
                settings.map((setting) => {
                  const maintenanceEnabled = editedSettings.get('maintenance_mode_enabled') || false
                  
                  return (
                    <div 
                      key={setting.id} 
                      className={`
                        border-b border-gray-200 dark:border-gray-700 pb-4 last:border-b-0
                        ${setting.setting_key === 'maintenance_mode_enabled' && maintenanceEnabled ? 'bg-orange-50 dark:bg-orange-900/10 rounded-lg p-4 border-orange-200 dark:border-orange-800' : ''}
                        transition-colors duration-200
                      `}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            {setting.setting_key === 'maintenance_mode_enabled' && (
                              <Wrench className={`h-5 w-5 ${maintenanceEnabled ? 'text-orange-600 dark:text-orange-400' : 'text-gray-500'}`} />
                            )}
                            {setting.setting_key === 'maintenance_message' && (
                              <MessageSquare className="h-5 w-5 text-blue-500" />
                            )}
                            {setting.setting_key === 'maintenance_estimated_time' && (
                              <Clock className="h-5 w-5 text-purple-500" />
                            )}
                            <h3 className={`text-sm font-medium ${setting.setting_key === 'maintenance_mode_enabled' && maintenanceEnabled ? 'text-orange-900 dark:text-orange-100' : 'text-gray-900 dark:text-white'}`}>
                              {setting.setting_key === 'maintenance_mode_enabled' 
                                ? 'Enable Maintenance Mode' 
                                : setting.setting_key === 'maintenance_message'
                                ? 'Maintenance Message'
                                : setting.setting_key === 'maintenance_estimated_time'
                                ? 'Estimated Time for Maintenance Completion'
                                : setting.setting_key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                              }
                            </h3>
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
                <AlertTriangle className="h-4 w-4 mr-1" />
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
