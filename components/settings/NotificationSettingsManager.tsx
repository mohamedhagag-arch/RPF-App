'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/app/providers'
import { settingsManager, NotificationSetting } from '@/lib/settingsManager'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import {
  Bell,
  BellOff,
  Mail,
  Smartphone,
  MessageSquare,
  Save,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  Settings,
  Shield,
  FileText,
  AlertTriangle,
  Info
} from 'lucide-react'

interface NotificationSettingsManagerProps {
  onClose?: () => void
}

export function NotificationSettingsManager({ onClose }: NotificationSettingsManagerProps) {
  const { appUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [notificationSettings, setNotificationSettings] = useState<NotificationSetting[]>([])
  const [editedSettings, setEditedSettings] = useState<Map<string, Partial<NotificationSetting>>>(new Map())

  const notificationTypes = [
    { id: 'email', name: 'Email', icon: Mail, color: 'blue' },
    { id: 'push', name: 'Push', icon: Smartphone, color: 'green' },
    { id: 'in_app', name: 'In-App', icon: MessageSquare, color: 'purple' },
    { id: 'sms', name: 'SMS', icon: MessageSquare, color: 'orange' }
  ]

  const notificationCategories = [
    { id: 'project_updates', name: 'Project Updates', icon: FileText, color: 'blue' },
    { id: 'kpi_alerts', name: 'KPI Alerts', icon: AlertTriangle, color: 'yellow' },
    { id: 'system_messages', name: 'System Messages', icon: Settings, color: 'gray' },
    { id: 'security', name: 'Security', icon: Shield, color: 'red' }
  ]

  const frequencies = [
    { id: 'immediate', name: 'Immediate', icon: Clock },
    { id: 'daily', name: 'Daily', icon: Calendar },
    { id: 'weekly', name: 'Weekly', icon: Calendar },
    { id: 'never', name: 'Never', icon: BellOff }
  ]

  const daysOfWeek = [
    { id: 0, name: 'Sunday' },
    { id: 1, name: 'Monday' },
    { id: 2, name: 'Tuesday' },
    { id: 3, name: 'Wednesday' },
    { id: 4, name: 'Thursday' },
    { id: 5, name: 'Friday' },
    { id: 6, name: 'Saturday' }
  ]

  useEffect(() => {
    loadNotificationSettings()
  }, [])

  const loadNotificationSettings = async () => {
    try {
      setLoading(true)
      setError('')
      
      const data = await settingsManager.getNotificationSettings()
      setNotificationSettings(data)
      
      // Initialize edited settings map
      const editedMap = new Map()
      data.forEach(setting => {
        const key = `${setting.notification_type}_${setting.notification_category}`
        editedMap.set(key, {
          is_enabled: setting.is_enabled,
          frequency: setting.frequency,
          quiet_hours_start: setting.quiet_hours_start,
          quiet_hours_end: setting.quiet_hours_end,
          quiet_days: setting.quiet_days || []
        })
      })
      setEditedSettings(editedMap)
      
    } catch (error: any) {
      setError('Failed to load notification settings')
      console.error('Error loading notification settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSettingChange = (type: string, category: string, field: string, value: any) => {
    const key = `${type}_${category}`
    setEditedSettings(prev => {
      const newMap = new Map(prev)
      const current = newMap.get(key) || {}
      newMap.set(key, { ...current, [field]: value })
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
      for (const [key, changes] of Array.from(editedSettings.entries())) {
        const [type, category] = key.split('_')
        const originalSetting = notificationSettings.find(
          s => s.notification_type === type && s.notification_category === category
        )

        if (originalSetting && Object.keys(changes).some(field => 
          originalSetting[field as keyof NotificationSetting] !== changes[field as keyof NotificationSetting]
        )) {
          promises.push(
            settingsManager.updateNotificationSetting(type, category, changes)
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
        setSuccess('Notification settings saved successfully')
        setTimeout(() => setSuccess(''), 3000)
        await loadNotificationSettings()
      } else {
        setError(`Failed to save ${failed} setting(s)`)
      }
      
    } catch (error: any) {
      setError('Failed to save notification settings')
      console.error('Error saving notification settings:', error)
    } finally {
      setSaving(false)
    }
  }

  const resetSettings = async () => {
    if (!confirm('Are you sure you want to reset all notification settings to default values?')) return

    try {
      setSaving(true)
      setError('')
      
      const promises = []
      for (const type of notificationTypes) {
        for (const category of notificationCategories) {
          promises.push(
            settingsManager.updateNotificationSetting(type.id, category.id, {
              is_enabled: true,
              frequency: 'immediate',
              quiet_hours_start: undefined,
              quiet_hours_end: undefined,
              quiet_days: []
            })
          )
        }
      }

      await Promise.all(promises)
      setSuccess('Notification settings reset to defaults')
      setTimeout(() => setSuccess(''), 3000)
      await loadNotificationSettings()
      
    } catch (error: any) {
      setError('Failed to reset notification settings')
      console.error('Error resetting notification settings:', error)
    } finally {
      setSaving(false)
    }
  }

  const toggleAllNotifications = (enabled: boolean) => {
    const newEditedSettings = new Map()
    for (const type of notificationTypes) {
      for (const category of notificationCategories) {
        const key = `${type.id}_${category.id}`
        const current = editedSettings.get(key) || {}
        newEditedSettings.set(key, { ...current, is_enabled: enabled })
      }
    }
    setEditedSettings(newEditedSettings)
  }

  const getSettingValue = (type: string, category: string, field: string) => {
    const key = `${type}_${category}`
    return editedSettings.get(key)?.[field as keyof NotificationSetting]
  }

  const hasChanges = () => {
    // Convert Map entries to Array to avoid iteration error
    for (const [key, changes] of Array.from(editedSettings.entries())) {
      const [type, category] = key.split('_')
      const originalSetting = notificationSettings.find(
        s => s.notification_type === type && s.notification_category === category
      )

      if (originalSetting && Object.keys(changes).some(field => 
        originalSetting[field as keyof NotificationSetting] !== changes[field as keyof NotificationSetting]
      )) {
        return true
      }
    }
    return false
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Notification Settings</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Configure how and when you receive notifications
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={loadNotificationSettings}
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

      {/* User Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center">
            <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">
              {appUser?.full_name || 'User'}
            </h3>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Configure notification preferences
            </p>
          </div>
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

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Quick Actions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => toggleAllNotifications(true)}
              className="flex items-center space-x-2"
            >
              <Bell className="h-4 w-4" />
              <span>Enable All</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => toggleAllNotifications(false)}
              className="flex items-center space-x-2"
            >
              <BellOff className="h-4 w-4" />
              <span>Disable All</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {notificationTypes.map((type) => {
            const TypeIcon = type.icon
            
            return (
              <Card key={type.id}>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TypeIcon className={`h-5 w-5 text-${type.color}-500`} />
                    <span>{type.name} Notifications</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {notificationCategories.map((category) => {
                      const CategoryIcon = category.icon
                      const isEnabled = (getSettingValue(type.id, category.id, 'is_enabled') as boolean | undefined) ?? true
                      const frequency = (getSettingValue(type.id, category.id, 'frequency') as string | undefined) ?? 'immediate'
                      
                      return (
                        <div key={category.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              <CategoryIcon className={`h-4 w-4 text-${category.color}-500`} />
                              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                                {category.name}
                              </h4>
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={isEnabled}
                                onChange={(e) => handleSettingChange(type.id, category.id, 'is_enabled', e.target.checked)}
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                              />
                              <span className="text-xs text-gray-500">
                                {isEnabled ? 'Enabled' : 'Disabled'}
                              </span>
                            </div>
                          </div>
                          
                          {isEnabled && (
                            <div className="space-y-3">
                              {/* Frequency */}
                              <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Frequency
                                </label>
                                <select
                                  value={frequency}
                                  onChange={(e) => handleSettingChange(type.id, category.id, 'frequency', e.target.value)}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                  {frequencies.map((freq) => {
                                    const FreqIcon = freq.icon
                                    return (
                                      <option key={freq.id} value={freq.id}>
                                        {freq.name}
                                      </option>
                                    )
                                  })}
                                </select>
                              </div>

                              {/* Quiet Hours */}
                              {frequency === 'daily' && (
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                      Start Time
                                    </label>
                                    <input
                                      type="time"
                                      value={getSettingValue(type.id, category.id, 'quiet_hours_start') || ''}
                                      onChange={(e) => handleSettingChange(type.id, category.id, 'quiet_hours_start', e.target.value)}
                                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                      End Time
                                    </label>
                                    <input
                                      type="time"
                                      value={getSettingValue(type.id, category.id, 'quiet_hours_end') || ''}
                                      onChange={(e) => handleSettingChange(type.id, category.id, 'quiet_hours_end', e.target.value)}
                                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                  </div>
                                </div>
                              )}

                              {/* Quiet Days */}
                              {frequency === 'weekly' && (
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Quiet Days
                                  </label>
                                  <div className="flex flex-wrap gap-1">
                                    {daysOfWeek.map((day) => {
                                      const quietDays = getSettingValue(type.id, category.id, 'quiet_days') || []
                                      const isSelected = quietDays.includes(day.id)
                                      
                                      return (
                                        <button
                                          key={day.id}
                                          onClick={() => {
                                            const current = getSettingValue(type.id, category.id, 'quiet_days') || []
                                            const newDays = isSelected
                                              ? current.filter((d: number) => d !== day.id)
                                              : [...current, day.id]
                                            handleSettingChange(type.id, category.id, 'quiet_days', newDays)
                                          }}
                                          className={`px-2 py-1 text-xs rounded ${
                                            isSelected
                                              ? 'bg-red-100 text-red-800 border border-red-200'
                                              : 'bg-gray-100 text-gray-700 border border-gray-200'
                                          }`}
                                        >
                                          {day.name.substring(0, 3)}
                                        </button>
                                      )
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Actions */}
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
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  )
}
