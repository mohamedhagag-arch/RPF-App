'use client'

import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabaseConnectionManager'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  Settings, 
  User, 
  Bell, 
  Shield, 
  Database, 
  Download, 
  Upload,
  Trash2,
  Save,
  Eye,
  EyeOff,
  Globe,
  Palette,
  BellOff
} from 'lucide-react'

interface SettingsPageProps {
  userRole?: string
}

export function SettingsPage({ userRole = 'viewer' }: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Profile settings
  const [profileData, setProfileData] = useState({
    full_name: '',
    email: '',
    division: '',
    role: '',
    notifications: true,
    email_notifications: true,
    dark_mode: false
  })

  // System settings
  const [systemSettings, setSystemSettings] = useState({
    auto_save: true,
    session_timeout: 30,
    max_file_size: 10,
    backup_frequency: 'daily'
  })

  const supabase = getSupabaseClient()

  useEffect(() => {
    fetchUserProfile()
  }, [])

  const fetchUserProfile = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data: profile } = await (supabase as any)
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profile) {
          setProfileData({
            full_name: profile.full_name || '',
            email: profile.email || user.email || '',
            division: profile.division || '',
            role: profile.role || 'viewer',
            notifications: true,
            email_notifications: true,
            dark_mode: false
          })
        }
      }
    } catch (error: any) {
      setError('Failed to load profile data')
    } finally {
      setLoading(false)
    }
  }

  const handleProfileUpdate = async () => {
    try {
      setLoading(true)
      setError('')
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await (supabase as any)
        .from('users')
        .update({
          full_name: profileData.full_name,
          division: profileData.division,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (error) throw error

      setSuccess('Profile updated successfully')
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleExportData = async () => {
    try {
      setLoading(true)
      setError('')
      
      // Export projects
      const { data: projects } = await supabase
        .from('projects')
        .select('*')

      // Export BOQ activities
      const { data: activities } = await supabase
        .from('boq_activities')
        .select('*')

      // Export KPIs
      const { data: kpis } = await supabase
        .from('kpi_records')
        .select('*')

      const exportData = {
        projects: projects || [],
        activities: activities || [],
        kpis: kpis || [],
        exported_at: new Date().toISOString(),
        exported_by: profileData.email
      }

      const dataStr = JSON.stringify(exportData, null, 2)
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
      
      const exportFileDefaultName = `rabat-mvp-backup-${new Date().toISOString().split('T')[0]}.json`
      
      const linkElement = document.createElement('a')
      linkElement.setAttribute('href', dataUri)
      linkElement.setAttribute('download', exportFileDefaultName)
      linkElement.click()

      setSuccess('Data exported successfully')
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      setError('Failed to export data')
    } finally {
      setLoading(false)
    }
  }

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setLoading(true)
      setError('')
      
      const text = await file.text()
      const data = JSON.parse(text)

      if (!data.projects || !data.activities || !data.kpis) {
        throw new Error('Invalid backup file format')
      }

      // Import projects
      if (data.projects.length > 0) {
        const { error: projectsError } = await supabase
          .from('projects')
          .upsert(data.projects, { onConflict: 'id' })

        if (projectsError) throw projectsError
      }

      // Import activities
      if (data.activities.length > 0) {
        const { error: activitiesError } = await supabase
          .from('boq_activities')
          .upsert(data.activities, { onConflict: 'id' })

        if (activitiesError) throw activitiesError
      }

      // Import KPIs
      if (data.kpis.length > 0) {
        const { error: kpisError } = await supabase
          .from('kpi_records')
          .upsert(data.kpis, { onConflict: 'id' })

        if (kpisError) throw kpisError
      }

      setSuccess('Data imported successfully')
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      setError('Failed to import data: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleClearCache = async () => {
    try {
      setLoading(true)
      // Clear browser cache and localStorage
      localStorage.clear()
      sessionStorage.clear()
      
      setSuccess('Cache cleared successfully')
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      setError('Failed to clear cache')
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User, roles: ['admin', 'manager', 'engineer', 'viewer'] },
    { id: 'notifications', label: 'Notifications', icon: Bell, roles: ['admin', 'manager', 'engineer', 'viewer'] },
    { id: 'appearance', label: 'Appearance', icon: Palette, roles: ['admin', 'manager', 'engineer', 'viewer'] },
    { id: 'data', label: 'Data Management', icon: Database, roles: ['admin', 'manager'] },
    { id: 'security', label: 'Security', icon: Shield, roles: ['admin', 'manager'] }
  ]

  const filteredTabs = tabs.filter(tab => tab.roles.includes(userRole))

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <Input
                  value={profileData.full_name}
                  onChange={(e) => setProfileData(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Enter your full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <Input
                  value={profileData.email}
                  disabled
                  className="bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Division
                </label>
                <Input
                  value={profileData.division}
                  onChange={(e) => setProfileData(prev => ({ ...prev, division: e.target.value }))}
                  placeholder="Enter your division"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <Input
                  value={profileData.role}
                  disabled
                  className="bg-gray-100 capitalize"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleProfileUpdate} disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </div>
        )

      case 'notifications':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Push Notifications</h4>
                  <p className="text-sm text-gray-600">Receive notifications for important updates</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profileData.notifications}
                    onChange={(e) => setProfileData(prev => ({ ...prev, notifications: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Email Notifications</h4>
                  <p className="text-sm text-gray-600">Receive email updates for project changes</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profileData.email_notifications}
                    onChange={(e) => setProfileData(prev => ({ ...prev, email_notifications: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        )

      case 'appearance':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Dark Mode</h4>
                  <p className="text-sm text-gray-600">Switch between light and dark themes</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profileData.dark_mode}
                    onChange={(e) => setProfileData(prev => ({ ...prev, dark_mode: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        )

      case 'data':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Download className="h-5 w-5" />
                    <span>Export Data</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    Download a complete backup of all your data including projects, activities, and KPIs.
                  </p>
                  <Button onClick={handleExportData} disabled={loading} className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Export All Data
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Upload className="h-5 w-5" />
                    <span>Import Data</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    Upload a backup file to restore your data.
                  </p>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportData}
                    className="hidden"
                    id="import-file"
                  />
                  <label htmlFor="import-file">
                    <Button type="button" className="w-full">
                      <Upload className="h-4 w-4 mr-2" />
                      Choose File to Import
                    </Button>
                  </label>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-red-600">
                  <Trash2 className="h-5 w-5" />
                  <span>Clear Cache</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Clear browser cache and temporary data to resolve performance issues.
                </p>
                <Button 
                  variant="outline" 
                  onClick={handleClearCache} 
                  disabled={loading}
                  className="border-red-200 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Cache
                </Button>
              </CardContent>
            </Card>
          </div>
        )

      case 'security':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Account Security</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium">Change Password</h4>
                    <p className="text-sm text-gray-600 mb-2">Update your account password</p>
                    <Button variant="outline">
                      Change Password
                    </Button>
                  </div>
                  <div>
                    <h4 className="font-medium">Two-Factor Authentication</h4>
                    <p className="text-sm text-gray-600 mb-2">Add an extra layer of security</p>
                    <Button variant="outline">
                      Enable 2FA
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )

      default:
        return null
    }
  }

  if (loading && !profileData.email) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Manage your account and application preferences</p>
        </div>
        <div className="flex items-center space-x-2">
          <Settings className="h-6 w-6 text-gray-400" />
        </div>
      </div>

      {error && (
        <Alert variant="error">
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success">
          {success}
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-0">
              <nav className="space-y-1">
                {filteredTabs.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 text-left transition-colors ${
                        activeTab === tab.id
                          ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-500'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="font-medium">{tab.label}</span>
                    </button>
                  )
                })}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-6">
              {renderTabContent()}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
