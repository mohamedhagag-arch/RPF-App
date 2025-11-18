'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/app/providers'
import { settingsManager, UserPreference, DEFAULT_USER_PREFERENCES } from '@/lib/settingsManager'
import { ModernCard } from '@/components/ui/ModernCard'
import { ModernButton } from '@/components/ui/ModernButton'
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
  Monitor,
  Layout,
  Grid3x3,
  List,
  Calendar,
  Bell,
  BellOff,
  Maximize2,
  Minimize2,
  Type,
  Image,
  BarChart3,
  FileText,
  Shield,
  Download,
  Upload
} from 'lucide-react'

interface UserPreferencesManagerProps {
  onClose?: () => void
}

interface PreferenceDefinition {
  key: string
  label: string
  description: string
  category: 'personal' | 'ui' | 'notifications' | 'privacy' | 'performance'
  type: 'string' | 'number' | 'boolean' | 'select'
  icon: any
  options?: { value: any; label: string }[]
  min?: number
  max?: number
  step?: number
  default: any
}

const PREFERENCE_DEFINITIONS: PreferenceDefinition[] = [
  // Personal Preferences
  {
    key: 'language',
    label: 'Language',
    description: 'Select your preferred language for the interface',
    category: 'personal',
    type: 'select',
    icon: Globe,
    options: [
      { value: 'en', label: 'English' },
      { value: 'ar', label: 'العربية' },
      { value: 'fr', label: 'Français' },
      { value: 'es', label: 'Español' }
    ],
    default: 'en'
  },
  {
    key: 'timezone',
    label: 'Timezone',
    description: 'Set your timezone for accurate date and time display',
    category: 'personal',
    type: 'select',
    icon: Clock,
    options: [
      { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
      { value: 'America/New_York', label: 'Eastern Time (ET)' },
      { value: 'America/Chicago', label: 'Central Time (CT)' },
      { value: 'America/Denver', label: 'Mountain Time (MT)' },
      { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
      { value: 'Europe/London', label: 'London (GMT)' },
      { value: 'Europe/Paris', label: 'Paris (CET)' },
      { value: 'Asia/Dubai', label: 'Dubai (GST)' },
      { value: 'Asia/Riyadh', label: 'Riyadh (AST)' },
      { value: 'Asia/Cairo', label: 'Cairo (EET)' },
      { value: 'Africa/Cairo', label: 'Cairo (EET)' }
    ],
    default: 'UTC'
  },
  {
    key: 'date_format',
    label: 'Date Format',
    description: 'Choose how dates are displayed throughout the application',
    category: 'personal',
    type: 'select',
    icon: Calendar,
    options: [
      { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2024-12-25)' },
      { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (12/25/2024)' },
      { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (25/12/2024)' },
      { value: 'DD-MM-YYYY', label: 'DD-MM-YYYY (25-12-2024)' },
      { value: 'MMMM DD, YYYY', label: 'December 25, 2024' }
    ],
    default: 'YYYY-MM-DD'
  },
  {
    key: 'time_format',
    label: 'Time Format',
    description: 'Choose between 12-hour or 24-hour time format',
    category: 'personal',
    type: 'select',
    icon: Clock,
    options: [
      { value: '12h', label: '12-hour (3:45 PM)' },
      { value: '24h', label: '24-hour (15:45)' }
    ],
    default: '12h'
  },

  // UI Preferences
  {
    key: 'theme_mode',
    label: 'Theme Mode',
    description: 'Choose your preferred color theme',
    category: 'ui',
    type: 'select',
    icon: Palette,
    options: [
      { value: 'light', label: 'Light' },
      { value: 'dark', label: 'Dark' },
      { value: 'system', label: 'System Default' }
    ],
    default: 'system'
  },
  {
    key: 'sidebar_collapsed',
    label: 'Sidebar Collapsed',
    description: 'Start with sidebar collapsed by default',
    category: 'ui',
    type: 'boolean',
    icon: Layout,
    default: false
  },
  {
    key: 'compact_mode',
    label: 'Compact Mode',
    description: 'Use a more compact layout with less spacing',
    category: 'ui',
    type: 'boolean',
    icon: Minimize2,
    default: false
  },
  {
    key: 'items_per_page',
    label: 'Items Per Page',
    description: 'Number of items to display per page in lists and tables',
    category: 'ui',
    type: 'number',
    icon: List,
    min: 10,
    max: 100,
    step: 10,
    default: 25
  },
  {
    key: 'dashboard_view',
    label: 'Dashboard View',
    description: 'Default view style for the dashboard',
    category: 'ui',
    type: 'select',
    icon: BarChart3,
    options: [
      { value: 'grid', label: 'Grid View' },
      { value: 'list', label: 'List View' },
      { value: 'compact', label: 'Compact View' }
    ],
    default: 'grid'
  },
  {
    key: 'show_tooltips',
    label: 'Show Tooltips',
    description: 'Display helpful tooltips when hovering over elements',
    category: 'ui',
    type: 'boolean',
    icon: Info,
    default: true
  },
  {
    key: 'enable_animations',
    label: 'Enable Animations',
    description: 'Enable smooth animations and transitions',
    category: 'ui',
    type: 'boolean',
    icon: Zap,
    default: true
  },
  {
    key: 'font_size',
    label: 'Font Size',
    description: 'Adjust the base font size for better readability',
    category: 'ui',
    type: 'select',
    icon: Type,
    options: [
      { value: 'small', label: 'Small' },
      { value: 'medium', label: 'Medium' },
      { value: 'large', label: 'Large' },
      { value: 'xlarge', label: 'Extra Large' }
    ],
    default: 'medium'
  },

  // Notifications
  {
    key: 'enable_sounds',
    label: 'Enable Sounds',
    description: 'Play sound effects for notifications and actions',
    category: 'notifications',
    type: 'boolean',
    icon: Volume2,
    default: true
  },
  {
    key: 'notification_position',
    label: 'Notification Position',
    description: 'Where to display notification toasts',
    category: 'notifications',
    type: 'select',
    icon: Bell,
    options: [
      { value: 'top-right', label: 'Top Right' },
      { value: 'top-left', label: 'Top Left' },
      { value: 'bottom-right', label: 'Bottom Right' },
      { value: 'bottom-left', label: 'Bottom Left' },
      { value: 'top-center', label: 'Top Center' },
      { value: 'bottom-center', label: 'Bottom Center' }
    ],
    default: 'top-right'
  },
  {
    key: 'notification_duration',
    label: 'Notification Duration',
    description: 'How long notifications stay visible (in seconds)',
    category: 'notifications',
    type: 'number',
    icon: Clock,
    min: 2,
    max: 30,
    step: 1,
    default: 5
  },

  // Privacy & Performance
  {
    key: 'auto_save_interval',
    label: 'Auto-save Interval',
    description: 'How often to automatically save your work (in seconds)',
    category: 'performance',
    type: 'number',
    icon: Save,
    min: 5,
    max: 300,
    step: 5,
    default: 30
  },
  {
    key: 'dashboard_refresh_interval',
    label: 'Dashboard Refresh Interval',
    description: 'How often to refresh dashboard data (in seconds)',
    category: 'performance',
    type: 'number',
    icon: RefreshCw,
    min: 10,
    max: 300,
    step: 10,
    default: 60
  },
  {
    key: 'enable_analytics',
    label: 'Enable Analytics',
    description: 'Allow collection of usage analytics to improve the application',
    category: 'privacy',
    type: 'boolean',
    icon: BarChart3,
    default: true
  },
  {
    key: 'show_profile_picture',
    label: 'Show Profile Picture',
    description: 'Display your profile picture in the header and throughout the app',
    category: 'privacy',
    type: 'boolean',
    icon: User,
    default: true
  }
]

export function UserPreferencesManager({ onClose }: UserPreferencesManagerProps) {
  const { appUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [preferences, setPreferences] = useState<UserPreference[]>([])
  const [editedPreferences, setEditedPreferences] = useState<Map<string, any>>(new Map())
  const [activeCategory, setActiveCategory] = useState<string>('all')

  const categories = [
    { id: 'all', name: 'All Preferences', icon: Settings, color: 'gray' },
    { id: 'personal', name: 'Personal', icon: User, color: 'blue' },
    { id: 'ui', name: 'Interface', icon: Palette, color: 'purple' },
    { id: 'notifications', name: 'Notifications', icon: Bell, color: 'green' },
    { id: 'privacy', name: 'Privacy & Security', icon: Shield, color: 'red' },
    { id: 'performance', name: 'Performance', icon: Zap, color: 'orange' }
  ]

  useEffect(() => {
    loadPreferences()
  }, [])

  const loadPreferences = async () => {
    try {
      setLoading(true)
      setError('')
      
      // Initialize user settings if needed
      const { data: { user } } = await (await import('@/lib/simpleConnectionManager')).getSupabaseClient().auth.getUser()
      if (user) {
        await settingsManager.initializeUserSettings(user.id)
      }
      
      const data = await settingsManager.getAllUserPreferences()
      
      // Ensure all default preferences exist
      const existingKeys = new Set(data.map(p => p.preference_key))
      const missingPreferences: UserPreference[] = []
      
      for (const def of PREFERENCE_DEFINITIONS) {
        if (!existingKeys.has(def.key)) {
          // Create missing preference with default value
          await settingsManager.setUserPreference(
            def.key,
            def.default,
            def.type === 'number' ? 'number' : def.type === 'boolean' ? 'boolean' : 'string',
            def.category
          )
          missingPreferences.push({
            id: `temp-${def.key}`,
            user_id: user?.id || '',
            preference_key: def.key,
            preference_value: def.default,
            preference_type: def.type === 'number' ? 'number' : def.type === 'boolean' ? 'boolean' : 'string',
            category: def.category,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        }
      }
      
      // Reload after creating missing preferences
      const allData = await settingsManager.getAllUserPreferences()
      setPreferences(allData)
      
      // Initialize edited preferences map
      const editedMap = new Map()
      allData.forEach(pref => {
        editedMap.set(pref.preference_key, pref.preference_value)
      })
      
      // Add defaults for any missing preferences
      PREFERENCE_DEFINITIONS.forEach(def => {
        if (!editedMap.has(def.key)) {
          editedMap.set(def.key, def.default)
        }
      })
      
      setEditedPreferences(editedMap)
      
    } catch (error: any) {
      setError('Failed to load preferences: ' + (error.message || 'Unknown error'))
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

      // Convert Map entries to Array to avoid iteration error
      for (const [key, value] of Array.from(editedPreferences.entries())) {
        const originalPreference = preferences.find(p => p.preference_key === key)
        const def = PREFERENCE_DEFINITIONS.find(d => d.key === key)
        
        if (!def) continue
        
        const currentValue = originalPreference?.preference_value ?? def.default
        
        if (JSON.stringify(currentValue) !== JSON.stringify(value)) {
          promises.push(
            settingsManager.setUserPreference(
              key,
              value,
              def.type === 'number' ? 'number' : def.type === 'boolean' ? 'boolean' : 'string',
              def.category
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
        setSuccess('Preferences saved successfully!')
        setTimeout(() => setSuccess(''), 3000)
        await loadPreferences()
        
        // Reload page to apply theme changes
        if (editedPreferences.has('theme_mode')) {
          setTimeout(() => {
            window.location.reload()
          }, 1500)
        }
      } else {
        setError(`Failed to save ${failed} preference(s)`)
      }
      
    } catch (error: any) {
      setError('Failed to save preferences: ' + (error.message || 'Unknown error'))
      console.error('Error saving preferences:', error)
    } finally {
      setSaving(false)
    }
  }

  const resetPreferences = async () => {
    if (!confirm('Are you sure you want to reset all preferences to default values? This action cannot be undone.')) return

    try {
      setSaving(true)
      setError('')
      
      const promises = PREFERENCE_DEFINITIONS.map(def => 
        settingsManager.setUserPreference(
          def.key,
          def.default,
          def.type === 'number' ? 'number' : def.type === 'boolean' ? 'boolean' : 'string',
          def.category
        )
      )

      await Promise.all(promises)
      setSuccess('All preferences reset to defaults')
      setTimeout(() => setSuccess(''), 3000)
      await loadPreferences()
      
    } catch (error: any) {
      setError('Failed to reset preferences: ' + (error.message || 'Unknown error'))
      console.error('Error resetting preferences:', error)
    } finally {
      setSaving(false)
    }
  }

  const exportPreferences = async () => {
    try {
      const exportData = {
        preferences: Array.from(editedPreferences.entries()).map(([key, value]) => ({
          key,
          value,
          definition: PREFERENCE_DEFINITIONS.find(d => d.key === key)
        })),
        exported_at: new Date().toISOString(),
        exported_by: appUser?.email || 'unknown'
      }

      const dataStr = JSON.stringify(exportData, null, 2)
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
      
      const exportFileDefaultName = `user-preferences-${new Date().toISOString().split('T')[0]}.json`
      
      const linkElement = document.createElement('a')
      linkElement.setAttribute('href', dataUri)
      linkElement.setAttribute('download', exportFileDefaultName)
      linkElement.click()

      setSuccess('Preferences exported successfully')
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      setError('Failed to export preferences')
      console.error('Error exporting preferences:', error)
    }
  }

  const importPreferences = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setSaving(true)
      setError('')
      
      const text = await file.text()
      const importData = JSON.parse(text)

      if (!importData.preferences || !Array.isArray(importData.preferences)) {
        throw new Error('Invalid preferences file format')
      }

      const promises = importData.preferences.map((pref: any) => {
        const def = PREFERENCE_DEFINITIONS.find(d => d.key === pref.key)
        if (!def) return Promise.resolve(false)
        
        return settingsManager.setUserPreference(
          pref.key,
          pref.value,
          def.type === 'number' ? 'number' : def.type === 'boolean' ? 'boolean' : 'string',
          def.category
        )
      })

      await Promise.all(promises)
      setSuccess('Preferences imported successfully')
      setTimeout(() => setSuccess(''), 3000)
      await loadPreferences()
      
    } catch (error: any) {
      setError('Failed to import preferences: ' + (error.message || 'Unknown error'))
    } finally {
      setSaving(false)
      event.target.value = ''
    }
  }

  const hasChanges = () => {
    for (const [key, value] of Array.from(editedPreferences.entries())) {
      const originalPreference = preferences.find(p => p.preference_key === key)
      const def = PREFERENCE_DEFINITIONS.find(d => d.key === key)
      const currentValue = originalPreference?.preference_value ?? def?.default
      
      if (JSON.stringify(currentValue) !== JSON.stringify(value)) {
        return true
      }
    }
    return false
  }

  const renderPreferenceInput = (def: PreferenceDefinition) => {
    const value = editedPreferences.get(def.key) ?? def.default

    switch (def.type) {
      case 'boolean':
        return (
          <div className="flex items-center space-x-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={value || false}
                onChange={(e) => handlePreferenceChange(def.key, e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 dark:peer-checked:bg-blue-600"></div>
            </label>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {value ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        )

      case 'select':
        return (
          <select
            value={value || def.default}
            onChange={(e) => {
              const newValue = def.type === 'number' ? Number(e.target.value) : e.target.value
              handlePreferenceChange(def.key, newValue)
            }}
            className="w-full max-w-md px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            {def.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )

      case 'number':
        return (
          <div className="flex items-center space-x-3">
            <Input
              type="number"
              value={value ?? def.default}
              onChange={(e) => handlePreferenceChange(def.key, Number(e.target.value))}
              min={def.min}
              max={def.max}
              step={def.step}
              className="w-32"
            />
            {def.key.includes('interval') && (
              <span className="text-sm text-gray-500">seconds</span>
            )}
            {def.key.includes('duration') && (
              <span className="text-sm text-gray-500">seconds</span>
            )}
          </div>
        )

      default:
        return (
          <Input
            type="text"
            value={value || def.default || ''}
            onChange={(e) => handlePreferenceChange(def.key, e.target.value)}
            className="max-w-md"
          />
        )
    }
  }

  const filteredDefinitions = activeCategory === 'all' 
    ? PREFERENCE_DEFINITIONS 
    : PREFERENCE_DEFINITIONS.filter(d => d.category === activeCategory)

  const groupedDefinitions = categories.reduce((acc, category) => {
    if (category.id === 'all') return acc
    acc[category.id] = PREFERENCE_DEFINITIONS.filter(d => d.category === category.id)
    return acc
  }, {} as Record<string, PreferenceDefinition[]>)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Settings className="h-6 w-6 text-blue-600" />
            User Preferences
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Customize your personal experience and application settings
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <ModernButton
            variant="outline"
            size="sm"
            onClick={loadPreferences}
            disabled={loading}
            icon={<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </ModernButton>
          {onClose && (
            <ModernButton variant="outline" size="sm" onClick={onClose}>
              Close
            </ModernButton>
          )}
        </div>
      </div>

      {/* User Info Card */}
      <ModernCard className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <User className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {appUser?.full_name || appUser?.first_name && appUser?.last_name 
                  ? `${appUser.first_name} ${appUser.last_name}` 
                  : 'User'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {appUser?.email || 'user@example.com'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ModernButton
              variant="outline"
              size="sm"
              onClick={exportPreferences}
              icon={<Download className="h-4 w-4" />}
            >
              Export
            </ModernButton>
            <input
              type="file"
              accept=".json"
              onChange={importPreferences}
              className="hidden"
              id="import-preferences"
            />
            <ModernButton
              variant="outline"
              size="sm"
              icon={<Upload className="h-4 w-4" />}
              onClick={() => document.getElementById('import-preferences')?.click()}
            >
              Import
            </ModernButton>
          </div>
        </div>
      </ModernCard>

      {/* Alerts */}
      {error && (
        <Alert variant="error">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError('')} className="text-red-600 hover:text-red-700">
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        </Alert>
      )}
      
      {success && (
        <Alert variant="success">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span>{success}</span>
            </div>
            <button onClick={() => setSuccess('')} className="text-green-600 hover:text-green-700">
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        </Alert>
      )}

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {categories.map((category) => {
          const Icon = category.icon
          const isActive = activeCategory === category.id
          const count = category.id === 'all' 
            ? PREFERENCE_DEFINITIONS.length 
            : groupedDefinitions[category.id]?.length || 0
          
          return (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{category.name}</span>
              {count > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  isActive 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Preferences Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="space-y-4">
          {filteredDefinitions.length === 0 ? (
            <ModernCard>
              <div className="text-center py-12 text-gray-500">
                <Settings className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No preferences found in this category</p>
              </div>
            </ModernCard>
          ) : (
            filteredDefinitions.map((def) => {
              const Icon = def.icon
              const value = editedPreferences.get(def.key) ?? def.default
              const originalPreference = preferences.find(p => p.preference_key === def.key)
              const originalValue = originalPreference?.preference_value ?? def.default
              const hasChanged = JSON.stringify(value) !== JSON.stringify(originalValue)
              
              return (
                <ModernCard 
                  key={def.key}
                  className={hasChanged ? 'border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/10' : ''}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-lg ${
                          def.category === 'personal' ? 'bg-blue-100 dark:bg-blue-900/30' :
                          def.category === 'ui' ? 'bg-purple-100 dark:bg-purple-900/30' :
                          def.category === 'notifications' ? 'bg-green-100 dark:bg-green-900/30' :
                          def.category === 'privacy' ? 'bg-red-100 dark:bg-red-900/30' :
                          'bg-orange-100 dark:bg-orange-900/30'
                        }`}>
                          <Icon className={`h-5 w-5 ${
                            def.category === 'personal' ? 'text-blue-600 dark:text-blue-400' :
                            def.category === 'ui' ? 'text-purple-600 dark:text-purple-400' :
                            def.category === 'notifications' ? 'text-green-600 dark:text-green-400' :
                            def.category === 'privacy' ? 'text-red-600 dark:text-red-400' :
                            'text-orange-600 dark:text-orange-400'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            {def.label}
                            {hasChanged && (
                              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full">
                                Changed
                              </span>
                            )}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {def.description}
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        {renderPreferenceInput(def)}
                      </div>
                    </div>
                  </div>
                </ModernCard>
              )
            })
          )}
        </div>
      )}

      {/* Actions Footer */}
      {filteredDefinitions.length > 0 && (
        <ModernCard className="sticky bottom-0 bg-white dark:bg-gray-800 border-t-2 border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <ModernButton
                variant="outline"
                onClick={resetPreferences}
                disabled={saving || loading}
                icon={<RefreshCw className="h-4 w-4" />}
              >
                Reset to Defaults
              </ModernButton>
              {hasChanges() && (
                <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
                  <Info className="h-4 w-4" />
                  <span>You have unsaved changes</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <ModernButton
                onClick={savePreferences}
                disabled={saving || !hasChanges()}
                variant="primary"
                icon={saving ? <LoadingSpinner size="sm" /> : <Save className="h-4 w-4" />}
              >
                {saving ? 'Saving...' : 'Save Preferences'}
              </ModernButton>
            </div>
          </div>
        </ModernCard>
      )}
    </div>
  )
}
