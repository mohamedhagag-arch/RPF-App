'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  Settings, Save, RefreshCw, Clock, MapPin, Bell, 
  CheckCircle, AlertCircle, Info
} from 'lucide-react'
import { supabase, TABLES } from '@/lib/supabase'

interface SettingItem {
  key: string
  value: string
  description?: string
  type: 'time' | 'number' | 'boolean' | 'text'
  label: string
}

export function AttendanceSettings() {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [settings, setSettings] = useState<Map<string, string>>(new Map())

  const defaultSettings: SettingItem[] = [
    {
      key: 'work_start_time',
      label: 'Work Start Time',
      description: 'Default time when employees should start work',
      type: 'time',
      value: '08:30:00'
    },
    {
      key: 'work_end_time',
      label: 'Work End Time',
      description: 'Default time when employees should end work',
      type: 'time',
      value: '17:00:00'
    },
    {
      key: 'late_allowance_minutes',
      label: 'Late Allowance (Minutes)',
      description: 'Minutes allowed before considered late',
      type: 'number',
      value: '15'
    },
    {
      key: 'early_departure_minutes',
      label: 'Early Departure (Minutes)',
      description: 'Minutes allowed before work end time',
      type: 'number',
      value: '15'
    },
    {
      key: 'location_required',
      label: 'Location Required',
      description: 'Require GPS location for check-in/out',
      type: 'boolean',
      value: 'true'
    },
    {
      key: 'location_radius_meters',
      label: 'Default Location Radius (Meters)',
      description: 'Default radius for location verification',
      type: 'number',
      value: '100'
    },
    {
      key: 'auto_calculate_hours',
      label: 'Auto Calculate Hours',
      description: 'Automatically calculate work duration',
      type: 'boolean',
      value: 'true'
    },
    {
      key: 'notifications_enabled',
      label: 'Notifications Enabled',
      description: 'Enable attendance notifications',
      type: 'boolean',
      value: 'true'
    }
  ]

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      setError('')
      
      const { data, error: fetchError } = await supabase
        .from(TABLES.ATTENDANCE_SETTINGS)
        .select('*')

      if (fetchError) throw fetchError

      const settingsMap = new Map<string, string>()
      
      // Initialize with defaults
      defaultSettings.forEach(setting => {
        settingsMap.set(setting.key, setting.value)
      })

      // Override with database values
      if (data) {
        data.forEach((item: any) => {
          settingsMap.set(item.key, item.value)
        })
      }

      setSettings(settingsMap)
    } catch (err: any) {
      setError('Failed to load settings: ' + err.message)
      console.error('Error fetching settings:', err)
    } finally {
      setLoading(false)
    }
  }

  const updateSetting = (key: string, value: string) => {
    setSettings(prev => {
      const newMap = new Map(prev)
      newMap.set(key, value)
      return newMap
    })
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError('')
      setSuccess('')

      // Prepare settings to save
      const settingsToSave = Array.from(settings.entries()).map(([key, value]) => {
        const settingDef = defaultSettings.find(s => s.key === key)
        return {
          key,
          value,
          description: settingDef?.description || ''
        }
      })

      // Upsert each setting
      for (const setting of settingsToSave) {
        const { error: upsertError } = await supabase
          .from(TABLES.ATTENDANCE_SETTINGS)
          .upsert({
            key: setting.key,
            value: setting.value,
            description: setting.description
          } as any, {
            onConflict: 'key'
          })

        if (upsertError) throw upsertError
      }

      setSuccess('Settings saved successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError('Failed to save settings: ' + err.message)
      console.error('Error saving settings:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    const defaultMap = new Map<string, string>()
    defaultSettings.forEach(setting => {
      defaultMap.set(setting.key, setting.value)
    })
    setSettings(defaultMap)
  }

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <Settings className="h-6 w-6 text-green-500" />
            Attendance Settings
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Configure attendance system settings and preferences
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="error">
          <AlertCircle className="h-4 w-4 mr-2" />
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success">
          <CheckCircle className="h-4 w-4 mr-2" />
          {success}
        </Alert>
      )}

      {/* Settings Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Work Hours Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              Work Hours
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {defaultSettings
              .filter(s => s.key.includes('work_') || s.key.includes('late_') || s.key.includes('early_'))
              .map(setting => (
                <div key={setting.key}>
                  <label className="block text-sm font-medium mb-1">
                    {setting.label}
                  </label>
                  {setting.description && (
                    <p className="text-xs text-gray-500 mb-2">{setting.description}</p>
                  )}
                  {setting.type === 'time' && (
                    <Input
                      type="time"
                      value={settings.get(setting.key) || setting.value}
                      onChange={(e) => updateSetting(setting.key, e.target.value + ':00')}
                      step="1"
                    />
                  )}
                  {setting.type === 'number' && (
                    <Input
                      type="number"
                      value={settings.get(setting.key) || setting.value}
                      onChange={(e) => updateSetting(setting.key, e.target.value)}
                      min="0"
                    />
                  )}
                  {setting.type === 'boolean' && (
                    <select
                      value={settings.get(setting.key) || setting.value}
                      onChange={(e) => updateSetting(setting.key, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                    >
                      <option value="true">Enabled</option>
                      <option value="false">Disabled</option>
                    </select>
                  )}
                </div>
              ))}
          </CardContent>
        </Card>

        {/* Location Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-green-500" />
              Location Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {defaultSettings
              .filter(s => s.key.includes('location_'))
              .map(setting => (
                <div key={setting.key}>
                  <label className="block text-sm font-medium mb-1">
                    {setting.label}
                  </label>
                  {setting.description && (
                    <p className="text-xs text-gray-500 mb-2">{setting.description}</p>
                  )}
                  {setting.type === 'boolean' && (
                    <select
                      value={settings.get(setting.key) || setting.value}
                      onChange={(e) => updateSetting(setting.key, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                    >
                      <option value="true">Enabled</option>
                      <option value="false">Disabled</option>
                    </select>
                  )}
                  {setting.type === 'number' && (
                    <Input
                      type="number"
                      value={settings.get(setting.key) || setting.value}
                      onChange={(e) => updateSetting(setting.key, e.target.value)}
                      min="0"
                    />
                  )}
                </div>
              ))}
          </CardContent>
        </Card>

        {/* System Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-purple-500" />
              System Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {defaultSettings
              .filter(s => s.key.includes('auto_') || s.key.includes('notification'))
              .map(setting => (
                <div key={setting.key}>
                  <label className="block text-sm font-medium mb-1">
                    {setting.label}
                  </label>
                  {setting.description && (
                    <p className="text-xs text-gray-500 mb-2">{setting.description}</p>
                  )}
                  {setting.type === 'boolean' && (
                    <select
                      value={settings.get(setting.key) || setting.value}
                      onChange={(e) => updateSetting(setting.key, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                    >
                      <option value="true">Enabled</option>
                      <option value="false">Disabled</option>
                    </select>
                  )}
                </div>
              ))}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-500" />
              Settings Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <p>
                <strong>Work Start/End Time:</strong> These times are used to determine if an employee is late or leaving early.
              </p>
              <p>
                <strong>Late Allowance:</strong> Employees can arrive within this many minutes after work start time without being marked as late.
              </p>
              <p>
                <strong>Location Required:</strong> When enabled, employees must have GPS location enabled to check in/out.
              </p>
              <p>
                <strong>Auto Calculate Hours:</strong> Automatically calculates work duration when checking out.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

