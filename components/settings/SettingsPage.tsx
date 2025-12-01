'use client'

import { useState, useEffect } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
import { useSmartLoading } from '@/lib/smartLoadingManager'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  Settings, 
  User, 
  Users,
  Bell, 
  Shield, 
  Save,
  Eye,
  EyeOff,
  Globe,
  Palette,
  BellOff,
  Building2,
  Briefcase,
  DollarSign,
  Target,
} from 'lucide-react'
import { DivisionsManager } from './DivisionsManager'
import { ProjectTypesManager } from './ProjectTypesManager'
import { CurrenciesManager } from './CurrenciesManager'
import { SystemSettingsManager } from './SystemSettingsManager'
import { UserPreferencesManager } from './UserPreferencesManager'
import { NotificationSettingsManager } from './NotificationSettingsManager'
import { KPINotificationSettings } from './KPINotificationSettings'
import { ProfileManager } from './ProfileManager'
import { DepartmentsJobTitlesManager } from './DepartmentsJobTitlesManager'
import { ProjectTypeActivitiesManager } from './ProjectTypeActivitiesManager'
import { UnifiedProjectTypesManager } from './UnifiedProjectTypesManager'
import { ActiveUsersManager } from './ActiveUsersManager'

interface SettingsPageProps {
  userRole?: string
}

export function SettingsPage({ userRole = 'viewer' }: SettingsPageProps) {
  const guard = usePermissionGuard()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // ✅ Smart loading for settings
  const { startSmartLoading, stopSmartLoading } = useSmartLoading('settings')
  
  // Handle query parameter for active-users tab
  useEffect(() => {
    const tab = searchParams?.get('tab')
    if (tab === 'active-users') {
      setActiveTab('active-users')
    }
  }, [searchParams])
  
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

  // إعادة حساب علامات التبويب عند تغيير الصلاحيات
  useEffect(() => {
    console.log('🔍 SettingsPage: User permissions changed, recalculating tabs')
    console.log('🔍 Current user role:', userRole)
    console.log('🔍 Available tabs:', filteredTabs.map(t => t.id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRole])

  const fetchUserProfile = async () => {
    try {
      startSmartLoading(setLoading)
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
      stopSmartLoading(setLoading)
    }
  }

  const handleProfileUpdate = async () => {
    try {
      startSmartLoading(setLoading)
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
      stopSmartLoading(setLoading)
    }
  }


  const tabs = [
    { id: 'profile', label: 'Profile', icon: User, roles: ['admin', 'manager', 'engineer', 'viewer'], permission: 'users.view' },
    { id: 'preferences', label: 'Preferences', icon: Settings, roles: ['admin', 'manager', 'engineer', 'viewer'], permission: 'users.view' },
    { id: 'notifications', label: 'Notifications', icon: Bell, roles: ['admin', 'manager', 'engineer', 'viewer'], permission: 'users.view' },
    { id: 'kpi-notifications', label: 'KPI Notifications', icon: Target, roles: ['admin', 'manager', 'planner'], permission: 'settings.manage' },
    { id: 'appearance', label: 'Appearance', icon: Palette, roles: ['admin', 'manager', 'engineer', 'viewer'], permission: 'users.view' },
    { id: 'active-users', label: 'Active Users', icon: Users, roles: ['admin', 'manager'], permission: 'users.view' },
    { id: 'system', label: 'System Settings', icon: Shield, roles: ['admin'], permission: 'settings.manage' },
    { id: 'departments-titles', label: 'Departments & Titles', icon: Building2, roles: ['admin', 'manager'], permission: 'settings.divisions' },
    { id: 'divisions', label: 'Divisions', icon: Building2, roles: ['admin', 'manager'], permission: 'settings.divisions' },
    { id: 'unified-project-types', label: 'Project Scope & Activities', icon: Briefcase, roles: ['admin', 'manager'], permission: 'settings.project_types' },
    { id: 'currencies', label: 'Currencies', icon: DollarSign, roles: ['admin', 'manager'], permission: 'settings.currencies' },
    { id: 'security', label: 'Security', icon: Shield, roles: ['admin', 'manager'], permission: 'users.manage' }
  ]

  // تصفية علامات التبويب بناءً على الصلاحيات الفعلية
  const filteredTabs = tabs.filter(tab => {
    // إذا كانت العلامة للأدوار الأساسية، تحقق من الدور
    if (['profile', 'preferences', 'notifications', 'appearance'].includes(tab.id)) {
      return tab.roles.includes(userRole)
    }
    // إذا كانت العلامة للإعدادات المتقدمة، تحقق من الصلاحية
    // KPI Notifications يحتاج settings.manage أو أن يكون المستخدم admin/manager/planner
    if (tab.id === 'kpi-notifications') {
      return guard.hasAccess('settings.manage') || 
             ['admin', 'manager', 'planner'].includes(userRole || '')
    }
    return guard.hasAccess(tab.permission)
  })

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileManager />

      case 'preferences':
        return <UserPreferencesManager />

      case 'active-users':
        if (!guard.hasAccess('users.view') && !['admin', 'manager'].includes(userRole || '')) {
          return (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Access Denied</h3>
              <p className="text-gray-500 dark:text-gray-400">You don't have permission to view active users.</p>
            </div>
          )
        }
        return <ActiveUsersManager />

      case 'system':
        if (!guard.hasAccess('settings.manage')) {
          return (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Access Denied</h3>
              <p className="text-gray-600 dark:text-gray-400">You don't have permission to access system settings.</p>
            </div>
          )
        }
        return <SystemSettingsManager />

      case 'departments-titles':
        if (!guard.hasAccess('settings.divisions')) {
          return (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Access Denied</h3>
              <p className="text-gray-600 dark:text-gray-400">You don't have permission to manage departments and job titles.</p>
            </div>
          )
        }
        return <DepartmentsJobTitlesManager />


      case 'notifications':
        return <NotificationSettingsManager />
      
      case 'kpi-notifications':
        // Allow access for admin, manager, planner, or users with settings.manage permission
        const canAccessKPINotifications = 
          guard.hasAccess('settings.manage') || 
          ['admin', 'manager', 'planner'].includes(userRole || '') ||
          guard.isAdmin()
        
        if (!canAccessKPINotifications) {
          return (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Access Denied</h3>
              <p className="text-gray-600 dark:text-gray-400">You don't have permission to manage KPI notification settings.</p>
            </div>
          )
        }
        return <KPINotificationSettings />

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

      case 'divisions':
        if (!guard.hasAccess('settings.divisions')) {
          return (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Access Denied</h3>
              <p className="text-gray-600 dark:text-gray-400">You don't have permission to access divisions management.</p>
            </div>
          )
        }
        return <DivisionsManager />

      case 'unified-project-types':
        if (!guard.hasAccess('settings.project_types')) {
          return (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Access Denied</h3>
              <p className="text-gray-600 dark:text-gray-400">You don't have permission to access project scope management.</p>
            </div>
          )
        }
        return <UnifiedProjectTypesManager />

      case 'project-types':
        if (!guard.hasAccess('settings.project_types')) {
          return (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Access Denied</h3>
              <p className="text-gray-600 dark:text-gray-400">You don't have permission to access project scope management.</p>
            </div>
          )
        }
        return <ProjectTypesManager />

      case 'project-activities':
        if (!guard.hasAccess('settings.activities')) {
          return (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Access Denied</h3>
              <p className="text-gray-600 dark:text-gray-400">You don't have permission to access project activities management.</p>
            </div>
          )
        }
        return <ProjectTypeActivitiesManager />

      case 'currencies':
        if (!guard.hasAccess('settings.currencies')) {
          return (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Access Denied</h3>
              <p className="text-gray-600 dark:text-gray-400">You don't have permission to access currencies management.</p>
            </div>
          )
        }
        return <CurrenciesManager />

      case 'security':
        if (!guard.hasAccess('users.manage')) {
          return (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Access Denied</h3>
              <p className="text-gray-600 dark:text-gray-400">You don't have permission to access security settings.</p>
            </div>
          )
        }
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
