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
  Info,
  Wrench
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
  const [showMaintenanceConfirm, setShowMaintenanceConfirm] = useState(false)
  const [pendingMaintenanceValue, setPendingMaintenanceValue] = useState<boolean | null>(null)
  const [maintenanceStatus, setMaintenanceStatus] = useState<boolean>(false)

  const categories = [
    { id: 'general', name: 'General', icon: Settings, color: 'blue' },
    { id: 'security', name: 'Security', icon: Shield, color: 'red' },
    { id: 'maintenance', name: 'Maintenance Mode', icon: Wrench, color: 'orange' },
    { id: 'notifications', name: 'Notifications', icon: Bell, color: 'green' },
    { id: 'ui', name: 'User Interface', icon: Palette, color: 'purple' },
    { id: 'backup', name: 'Backup & Restore', icon: Database, color: 'orange' },
    { id: 'performance', name: 'Performance', icon: Clock, color: 'cyan' }
  ]

  useEffect(() => {
    const loadSettingsWithInit = async () => {
      // Initialize maintenance settings first if they don't exist
      if (activeCategory === 'maintenance') {
        await initializeMaintenanceSettings()
      }
      // Then load settings
      await loadSettings()
    }
    
    loadSettingsWithInit()
  }, [activeCategory])

  const initializeMaintenanceSettings = async () => {
    try {
      // Check if maintenance settings exist
      const existingSettings = await settingsManager.getAllSystemSettings('maintenance')
      console.log('🔍 Existing maintenance settings:', existingSettings)
      
      if (existingSettings.length === 0) {
        console.log('📝 Initializing maintenance settings...')
        
        // Initialize default maintenance settings one by one to ensure they're saved
        // IMPORTANT: maintenance_mode_enabled must be public so middleware can read it without auth
        const result1 = await settingsManager.setSystemSetting(
          'maintenance_mode_enabled',
          false,
          'boolean',
          'Enable maintenance mode - When enabled, the site will be closed for all users except admin',
          'maintenance',
          true // Make it public so middleware can read it
        )
        console.log('✅ Setting 1 saved:', result1)
        
        const result2 = await settingsManager.setSystemSetting(
          'maintenance_message',
          'We are performing maintenance on the site. We apologize for the inconvenience and will be back soon.',
          'string',
          'Maintenance message displayed to users',
          'maintenance',
          true
        )
        console.log('✅ Setting 2 saved:', result2)
        
        const result3 = await settingsManager.setSystemSetting(
          'maintenance_estimated_time',
          '30 minutes',
          'string',
          'Estimated time for maintenance completion',
          'maintenance',
          true
        )
        console.log('✅ Setting 3 saved:', result3)
        
        // Check if all settings were saved successfully
        if (!result1 || !result2 || !result3) {
          throw new Error('Some settings failed to save')
        }
        
        // Clear cache to force reload
        settingsManager.clearCache()
        
        // Wait a bit for database to update
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Verify settings were saved
        const verifySettings = await settingsManager.getAllSystemSettings('maintenance')
        console.log('✅ Verified settings after save:', verifySettings)
        
        if (verifySettings.length === 0) {
          throw new Error('Settings were not saved properly')
        }
        
        console.log('✅ Maintenance settings initialized successfully')
        return true
      } else {
        console.log('ℹ️ Maintenance settings already exist')
        return false
      }
    } catch (error: any) {
      console.error('❌ Error initializing maintenance settings:', error)
      setError(`Failed to initialize: ${error.message || 'Unknown error'}`)
      return false
    }
  }

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
        
        // Track maintenance mode status
        if (setting.setting_key === 'maintenance_mode_enabled') {
          // Extract boolean value for status tracking
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
    // Special handling for maintenance mode - show confirmation when enabling
    if (key === 'maintenance_mode_enabled') {
      if (value === true) {
        setPendingMaintenanceValue(true)
        setShowMaintenanceConfirm(true)
        return
      } else {
        // When disabling, update status immediately
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
        // Update status immediately for visual feedback
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

      // Convert Map entries to Array to avoid iteration error
      for (const [key, value] of Array.from(editedSettings.entries())) {
        const originalSetting = settings.find(s => s.setting_key === key)
        if (originalSetting && originalSetting.setting_value !== value) {
          // IMPORTANT: maintenance_mode_enabled must always be public for middleware to read it
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
        // Check if maintenance mode was changed
        const maintenanceChanged = editedSettings.get('maintenance_mode_enabled') !== undefined
        const maintenanceEnabled = editedSettings.get('maintenance_mode_enabled')
        
        if (maintenanceChanged && activeCategory === 'maintenance') {
          // Update maintenance status immediately
          setMaintenanceStatus(maintenanceEnabled || false)
          
          if (maintenanceEnabled) {
            setSuccess('✅ تم تفعيل وضع الصيانة بنجاح! الموقع مغلق الآن لجميع المستخدمين باستثناء الأدمن.')
          } else {
            setSuccess('✅ تم إلغاء تفعيل وضع الصيانة بنجاح! الموقع متاح الآن لجميع المستخدمين.')
          }
          setTimeout(() => setSuccess(''), 5000)
        } else {
          setSuccess('تم حفظ الإعدادات بنجاح')
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
    if (key.includes('maintenance')) return Wrench
    if (key.includes('password') || key.includes('secret') || key.includes('key')) return Lock
    if (key.includes('timeout') || key.includes('interval')) return Clock
    if (key.includes('size') || key.includes('limit')) return HardDrive
    if (key.includes('theme') || key.includes('ui')) return Palette
    if (key.includes('notification')) return Bell
    if (key.includes('security') || key.includes('login')) return Shield
    return Settings
  }

  const getSettingColor = (key: string) => {
    if (key.includes('maintenance')) return 'text-orange-500'
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
        // Special styling for maintenance mode toggle
        const isMaintenanceMode = setting.setting_key === 'maintenance_mode_enabled'
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
                  ? isMaintenanceMode 
                    ? 'peer-checked:bg-orange-500 dark:peer-checked:bg-orange-600 peer-focus:ring-orange-300' 
                    : 'peer-checked:bg-blue-600 dark:peer-checked:bg-blue-600 peer-focus:ring-blue-300'
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
                  <CheckCircle className={`h-5 w-5 ${isMaintenanceMode ? 'text-orange-500' : 'text-green-500'}`} />
                  <span className={`text-sm font-semibold ${isMaintenanceMode ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>
                    {isMaintenanceMode ? 'وضع الصيانة مفعّل' : 'مفعّل'}
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-gray-400" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {isMaintenanceMode ? 'وضع الصيانة معطّل' : 'معطّل'}
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

      {/* Maintenance Mode Status Banner */}
      {activeCategory === 'maintenance' && (() => {
        const maintenanceEnabled = editedSettings.get('maintenance_mode_enabled') || false
        if (maintenanceEnabled) {
          return (
            <Alert variant="warning" className="border-orange-500 bg-orange-50 dark:bg-orange-900/20">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-1">
                    ⚠️ وضع الصيانة مفعّل حالياً
                  </h3>
                  <p className="text-sm text-orange-800 dark:text-orange-200">
                    الموقع مغلق حالياً لجميع المستخدمين باستثناء الأدمن. سيتم عرض صفحة الصيانة لجميع المستخدمين الآخرين.
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
                  ⚠️ تأكيد تفعيل وضع الصيانة
                </h3>
                <p className="text-sm text-orange-800 dark:text-orange-200 mb-4">
                  عند تفعيل وضع الصيانة، سيتم إغلاق الموقع لجميع المستخدمين باستثناء الأدمن. 
                  سيتم توجيه جميع المستخدمين الآخرين إلى صفحة الصيانة.
                </p>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="primary"
                    onClick={() => confirmMaintenanceMode(true)}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    نعم، فعّل وضع الصيانة
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => confirmMaintenanceMode(false)}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    إلغاء
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Alert>
      )}

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => {
          const Icon = category.icon
          const isMaintenanceTab = category.id === 'maintenance'
          const showMaintenanceBadge = isMaintenanceTab && maintenanceStatus
          
          return (
            <Button
              key={category.id}
              variant={activeCategory === category.id ? 'primary' : 'outline'}
              onClick={() => setActiveCategory(category.id)}
              className={`flex items-center space-x-2 relative ${
                showMaintenanceBadge ? 'border-orange-500 border-2' : ''
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{category.name}</span>
              {showMaintenanceBadge && (
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-orange-500 rounded-full border-2 border-white dark:border-gray-800 animate-pulse" title="وضع الصيانة مفعّل"></span>
              )}
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
                  {activeCategory === 'maintenance' && (
                    <div className="space-y-2">
                      <Button
                        onClick={async () => {
                          try {
                            setLoading(true)
                            setError('')
                            setSuccess('')
                            
                            console.log('🔄 Starting initialization...')
                            const initialized = await initializeMaintenanceSettings()
                            
                            if (initialized) {
                              console.log('✅ Initialization successful, reloading settings...')
                              setSuccess('Maintenance settings initialized successfully!')
                              
                              // Clear cache and wait a bit longer
                              settingsManager.clearCache()
                              await new Promise(resolve => setTimeout(resolve, 800))
                              
                              // Force reload with fresh data
                              await loadSettings()
                              
                              // Double check after reload
                              const verifyAfterReload = await settingsManager.getAllSystemSettings('maintenance')
                              console.log('🔍 Settings after reload:', verifyAfterReload)
                              
                              if (verifyAfterReload.length > 0) {
                                setSuccess('Maintenance settings initialized and loaded successfully!')
                              } else {
                                setError('Settings were saved but could not be loaded. Please refresh the page.')
                              }
                              
                              setTimeout(() => setSuccess(''), 5000)
                            } else {
                              // Settings already exist, just reload
                              console.log('ℹ️ Settings already exist, reloading...')
                              await loadSettings()
                              setSuccess('Settings already exist. Reloaded successfully!')
                              setTimeout(() => setSuccess(''), 3000)
                            }
                          } catch (error: any) {
                            console.error('❌ Initialization error:', error)
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
                      <p className="text-xs text-gray-400 mt-2">
                        Click to create default maintenance mode settings if they don't exist.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                settings.map((setting) => {
                  const Icon = getSettingIcon(setting.setting_key)
                  const iconColor = getSettingColor(setting.setting_key)
                  const isMaintenanceMode = setting.setting_key === 'maintenance_mode_enabled'
                  const maintenanceEnabled = editedSettings.get('maintenance_mode_enabled') || false
                  
                  return (
                    <div 
                      key={setting.id} 
                      className={`
                        border-b border-gray-200 dark:border-gray-700 pb-4 last:border-b-0
                        ${isMaintenanceMode && maintenanceEnabled ? 'bg-orange-50 dark:bg-orange-900/10 rounded-lg p-4 border-orange-200 dark:border-orange-800' : ''}
                        transition-colors duration-200
                      `}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Icon className={`h-5 w-5 ${iconColor} ${isMaintenanceMode && maintenanceEnabled ? 'text-orange-600 dark:text-orange-400' : ''}`} />
                            <h3 className={`text-sm font-medium ${isMaintenanceMode && maintenanceEnabled ? 'text-orange-900 dark:text-orange-100' : 'text-gray-900 dark:text-white'}`}>
                              {setting.setting_key === 'maintenance_mode_enabled' 
                                ? 'تفعيل وضع الصيانة' 
                                : setting.setting_key === 'maintenance_message'
                                ? 'رسالة الصيانة'
                                : setting.setting_key === 'maintenance_estimated_time'
                                ? 'الوقت المتوقع للصيانة'
                                : setting.setting_key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                              }
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
