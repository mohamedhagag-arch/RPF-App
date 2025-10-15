'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/app/providers'
import { settingsManager, UserPreference } from '@/lib/settingsManager'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import {
  User,
  Save,
  RefreshCw,
  Palette,
  Globe,
  Clock,
  Eye,
  Volume2,
  VolumeX,
  Zap,
  Settings,
  CheckCircle,
  XCircle,
  Info,
  Moon,
  Sun,
  Monitor
} from 'lucide-react'

interface UserPreferencesManagerProps {
  onClose?: () => void
}

export function UserPreferencesManager({ onClose }: UserPreferencesManagerProps) {
  const { appUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [preferences, setPreferences] = useState<UserPreference[]>([])
  const [editedPreferences, setEditedPreferences] = useState<Map<string, any>>(new Map())

  const categories = [
    { id: 'personal', name: 'Personal', icon: User, color: 'blue' },
    { id: 'ui', name: 'Interface', icon: Palette, color: 'purple' },
    { id: 'notifications', name: 'Notifications', icon: Globe, color: 'green' },
    { id: 'privacy', name: 'Privacy', icon: Eye, color: 'red' }
  ]

  useEffect(() => {
    loadPreferences()
  }, [])

  const loadPreferences = async () => {
    try {
      setLoading(true)
      setError('')
      
      const data = await settingsManager.getAllUserPreferences()
      setPreferences(data)
      
      // Initialize edited preferences map
      const editedMap = new Map()
      data.forEach(pref => {
        editedMap.set(pref.preference_key, pref.preference_value)
      })
      setEditedPreferences(editedMap)
      
    } catch (error: any) {
      setError('Failed to load preferences')
      console.error('Error loading preferences:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePreferenceChange = (key: string, value: any) => {
    setEditedPreferences(prev => {
      const newMap = new Map(prev)
      newMap.set(key, value)
      return newMap
    })
  }

  const savePreferences = async () => {
    try {
      setSaving(true)
      setError('')
      
      let hasChanges = false
      const promises = []

      for (const [key, value] of editedPreferences.entries()) {
        const originalPreference = preferences.find(p => p.preference_key === key)
        if (originalPreference && originalPreference.preference_value !== value) {
          promises.push(
            settingsManager.setUserPreference(
              key,
              value,
              originalPreference.preference_type,
              originalPreference.category
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
        setSuccess('Preferences saved successfully')
        setTimeout(() => setSuccess(''), 3000)
        await loadPreferences()
      } else {
        setError(`Failed to save ${failed} preference(s)`)
      }
      
    } catch (error: any) {
      setError('Failed to save preferences')
      console.error('Error saving preferences:', error)
    } finally {
      setSaving(false)
    }
  }

  const resetPreferences = async () => {
    if (!confirm('Are you sure you want to reset all preferences to default values?')) return

    try {
      setSaving(true)
      setError('')
      
      const promises = preferences.map(pref => 
        settingsManager.setUserPreference(
          pref.preference_key,
          pref.preference_value,
          pref.preference_type,
          pref.category
        )
      )

      await Promise.all(promises)
      setSuccess('Preferences reset to defaults')
      setTimeout(() => setSuccess(''), 3000)
      await loadPreferences()
      
    } catch (error: any) {
      setError('Failed to reset preferences')
      console.error('Error resetting preferences:', error)
    } finally {
      setSaving(false)
    }
  }

  const getPreferenceIcon = (key: string) => {
    if (key.includes('theme')) return Palette
    if (key.includes('language')) return Globe
    if (key.includes('timezone')) return Clock
    if (key.includes('sound')) return Volume2
    if (key.includes('animation')) return Zap
    if (key.includes('sidebar')) return Settings
    if (key.includes('tooltip')) return Info
    return User
  }

  const getPreferenceColor = (key: string) => {
    if (key.includes('theme')) return 'text-purple-500'
    if (key.includes('language')) return 'text-blue-500'
    if (key.includes('timezone')) return 'text-green-500'
    if (key.includes('sound')) return 'text-yellow-500'
    if (key.includes('animation')) return 'text-cyan-500'
    if (key.includes('sidebar')) return 'text-gray-500'
    if (key.includes('tooltip')) return 'text-orange-500'
    return 'text-gray-500'
  }

  const hasChanges = () => {
    for (const [key, value] of editedPreferences.entries()) {
      const originalPreference = preferences.find(p => p.preference_key === key)
      if (originalPreference && originalPreference.preference_value !== value) {
        return true
      }
    }
    return false
  }

  const renderPreferenceInput = (preference: UserPreference) => {
    const value = editedPreferences.get(preference.preference_key)

    switch (preference.preference_key) {
      case 'theme_mode':
        return (
          <div className="flex items-center space-x-2">
            <Button
              variant={value === 'light' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => handlePreferenceChange('theme_mode', 'light')}
              className="flex items-center space-x-1"
            >
              <Sun className="h-4 w-4" />
              <span>Light</span>
            </Button>
            <Button
              variant={value === 'dark' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => handlePreferenceChange('theme_mode', 'dark')}
              className="flex items-center space-x-1"
            >
              <Moon className="h-4 w-4" />
              <span>Dark</span>
            </Button>
            <Button
              variant={value === 'system' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => handlePreferenceChange('theme_mode', 'system')}
              className="flex items-center space-x-1"
            >
              <Monitor className="h-4 w-4" />
              <span>System</span>
            </Button>
          </div>
        )

      case 'language':
        return (
          <select
            value={value || 'en'}
            onChange={(e) => handlePreferenceChange('language', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="en">English</option>
            <option value="ar">العربية</option>
            <option value="fr">Français</option>
            <option value="es">Español</option>
          </select>
        )

      case 'timezone':
        return (
          <select
            value={value || 'UTC'}
            onChange={(e) => handlePreferenceChange('timezone', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="UTC">UTC</option>
            <option value="America/New_York">Eastern Time</option>
            <option value="America/Chicago">Central Time</option>
            <option value="America/Denver">Mountain Time</option>
            <option value="America/Los_Angeles">Pacific Time</option>
            <option value="Europe/London">London</option>
            <option value="Europe/Paris">Paris</option>
            <option value="Asia/Dubai">Dubai</option>
            <option value="Asia/Riyadh">Riyadh</option>
          </select>
        )

      case 'enable_sounds':
        return (
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => handlePreferenceChange('enable_sounds', e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
            <span className="text-sm text-gray-600 flex items-center">
              {value ? <Volume2 className="h-4 w-4 mr-1" /> : <VolumeX className="h-4 w-4 mr-1" />}
              {value ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        )

      default:
        if (preference.preference_type === 'boolean') {
          return (
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={value || false}
                onChange={(e) => handlePreferenceChange(preference.preference_key, e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
              />
              <span className="text-sm text-gray-600">
                {value ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          )
        }

        return (
          <Input
            type="text"
            value={value || ''}
            onChange={(e) => handlePreferenceChange(preference.preference_key, e.target.value)}
            className="max-w-md"
          />
        )
    }
  }

  const groupedPreferences = categories.reduce((acc, category) => {
    acc[category.id] = preferences.filter(p => p.category === category.id)
    return acc
  }, {} as Record<string, UserPreference[]>)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">User Preferences</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Customize your personal experience and interface preferences
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={loadPreferences}
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
            <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">
              {appUser?.full_name || 'User'}
            </h3>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              {appUser?.email || 'user@example.com'}
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

      {/* Preferences Content */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="space-y-6">
          {categories.map((category) => {
            const categoryPreferences = groupedPreferences[category.id]
            const Icon = category.icon
            
            if (categoryPreferences.length === 0) return null

            return (
              <Card key={category.id}>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Icon className="h-5 w-5" />
                    <span>{category.name}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {categoryPreferences.map((preference) => {
                      const PrefIcon = getPreferenceIcon(preference.preference_key)
                      const iconColor = getPreferenceColor(preference.preference_key)
                      
                      return (
                        <div key={preference.id} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-b-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <PrefIcon className={`h-4 w-4 ${iconColor}`} />
                                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                                  {preference.preference_key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </h3>
                              </div>
                              
                              <div className="max-w-md">
                                {renderPreferenceInput(preference)}
                              </div>
                            </div>
                          </div>
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
      {preferences.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={resetPreferences}
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
              onClick={savePreferences}
              disabled={saving || !hasChanges()}
            >
              {saving ? (
                <LoadingSpinner size="sm" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Preferences
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
