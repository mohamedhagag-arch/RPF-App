'use client'

import { useState, useEffect } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
import { useAuth } from '@/app/providers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  UserWithPermissions, 
  getUserPermissions, 
  generatePermissionsReport,
  getRoleDescription 
} from '@/lib/permissionsSystem'
import {
  User,
  Mail,
  Building,
  Shield,
  Calendar,
  Clock,
  Key,
  Edit,
  Save,
  X,
  CheckCircle,
  Lock,
  Eye,
  EyeOff,
  Activity,
  BarChart3,
  FileText,
  Settings
} from 'lucide-react'

export function UserProfile() {
  const guard = usePermissionGuard()
  const { user: authUser, appUser, refreshUserProfile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const [activityStats, setActivityStats] = useState<any>(null)
  
  // Password change
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  
  // Form data
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    full_name: '',
    division: '',
    phone: '',
    position: ''
  })

  const supabase = getSupabaseClient()

  useEffect(() => {
    loadUserProfile()
  }, [authUser])

  // Add refresh capability
  useEffect(() => {
    const handleFocus = () => {
      // Reload profile when window gains focus (user comes back to tab)
      loadUserProfile()
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  const loadUserProfile = async () => {
    try {
      setLoading(true)
      console.log('🔄 UserProfile: Loading user profile...')
      
      if (!authUser?.id) {
        setError('No authenticated user')
        return
      }

      // Load user data
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (userError) throw userError

      console.log('📥 UserProfile: Loaded user data:', user)
      console.log('🔍 UserProfile: User permissions:', (user as any).permissions)
      console.log('📊 UserProfile: User permissions length:', (user as any).permissions?.length)
      console.log('🔍 UserProfile: User custom_enabled:', (user as any).custom_permissions_enabled)
      console.log('🔍 UserProfile: User updated_at:', (user as any).updated_at)

      setUserData(user)
      setFormData({
        first_name: (user as any).first_name || '',
        last_name: (user as any).last_name || '',
        full_name: (user as any).full_name || '',
        division: (user as any).division || '',
        phone: (user as any).phone || '',
        position: (user as any).position || ''
      })

      // Load activity statistics
      await loadActivityStats(authUser.id)

      // Refresh global user profile to ensure consistency
      await refreshUserProfile()
      
    } catch (error: any) {
      console.error('Error loading profile:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const loadActivityStats = async (userId: string) => {
    try {
      // Get user's created projects
      const { data: projects } = await supabase
        .from('Planning Database - ProjectsList')
        .select('*', { count: 'exact', head: true })
        .eq('Created By User', userData?.email || appUser?.email)

      // Get user's created activities
      const { data: activities } = await supabase
        .from('Planning Database - BOQ Rates')
        .select('*', { count: 'exact', head: true })

      // Get user's KPI entries
      const { data: kpis } = await supabase
        .from('Planning Database - KPI')
        .select('*', { count: 'exact', head: true })
        .eq('Recorded By', userData?.email || appUser?.email)

      setActivityStats({
        projectsCreated: projects?.length || 0,
        activitiesCreated: activities?.length || 0,
        kpisRecorded: kpis?.length || 0,
        lastActivity: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error loading activity stats:', error)
    }
  }

  const handleUpdateProfile = async () => {
    try {
      setSaving(true)
      setError('')
      setSuccess('')

      const { error: updateError } = await (supabase as any)
        .from('users')
        .update({
          full_name: formData.full_name,
          division: formData.division,
          phone: formData.phone,
          position: formData.position,
          updated_at: new Date().toISOString()
        })
        .eq('id', authUser?.id)

      if (updateError) throw updateError

      setSuccess('Profile updated successfully!')
      setEditMode(false)
      await loadUserProfile()
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    try {
      setError('')
      setSuccess('')

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setError('New passwords do not match')
        return
      }

      if (passwordData.newPassword.length < 6) {
        setError('Password must be at least 6 characters')
        return
      }

      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      })

      if (error) throw error

      setSuccess('Password changed successfully!')
      setShowPasswordChange(false)
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      setError(error.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!userData) {
    return (
      <Alert variant="error">
        Unable to load user profile
      </Alert>
    )
  }

  const userWithPerms = userData as UserWithPermissions
  const permissions = getUserPermissions(userWithPerms)
  const permissionsReport = generatePermissionsReport(userWithPerms)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Profile</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your personal information and preferences</p>
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Profile Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
                {!editMode ? (
                  <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => {
                      setEditMode(false)
                      setFormData({
                        first_name: (userData as any).first_name || '',
                        last_name: (userData as any).last_name || '',
                        full_name: userData.full_name || '',
                        division: userData.division || '',
                        phone: (userData as any).phone || '',
                        position: (userData as any).position || ''
                      })
                    }}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleUpdateProfile} disabled={saving}>
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* First Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    First Name
                  </label>
                  {editMode ? (
                    <Input
                      value={formData.first_name}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        first_name: e.target.value,
                        full_name: `${e.target.value} ${formData.last_name}`.trim()
                      }))}
                      placeholder="Enter your first name"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white font-medium">{userData.first_name || userData.full_name?.split(' ')[0]}</p>
                  )}
                </div>

                {/* Last Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Last Name
                  </label>
                  {editMode ? (
                    <Input
                      value={formData.last_name}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        last_name: e.target.value,
                        full_name: `${formData.first_name} ${e.target.value}`.trim()
                      }))}
                      placeholder="Enter your last name"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white font-medium">{userData.last_name || userData.full_name?.split(' ').slice(1).join(' ')}</p>
                  )}
                </div>

                {/* Email (Read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email Address
                  </label>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Mail className="h-4 w-4" />
                    <span>{userData.email}</span>
                    <span className="text-xs text-gray-500">(cannot be changed)</span>
                  </div>
                </div>

                {/* Division */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Division
                  </label>
                  {editMode ? (
                    <Input
                      value={formData.division}
                      onChange={(e) => setFormData(prev => ({ ...prev, division: e.target.value }))}
                      placeholder="Enter your division"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-900 dark:text-white">{userData.division || 'Not specified'}</span>
                    </div>
                  )}
                </div>

                {/* Position */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Position/Title
                  </label>
                  {editMode ? (
                    <Input
                      value={formData.position}
                      onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                      placeholder="e.g., Senior Engineer, Project Manager"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white">{(userData as any).position || 'Not specified'}</p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone Number
                  </label>
                  {editMode ? (
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+971 50 xxx xxxx"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white">{(userData as any).phone || 'Not specified'}</p>
                  )}
                </div>

                {/* Role (Read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Role & Permissions
                  </label>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      userData.role === 'admin' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' :
                      userData.role === 'manager' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' :
                      userData.role === 'engineer' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-300'
                    }`}>
                      <Shield className="h-4 w-4 mr-1" />
                      {userData.role.charAt(0).toUpperCase() + userData.role.slice(1)}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {permissions.length} permissions
                    </span>
                    {userWithPerms.custom_permissions_enabled && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300">
                        <Key className="h-3 w-3 mr-1" />
                        Custom
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {getRoleDescription(userData.role)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Security Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!showPasswordChange ? (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Keep your account secure by using a strong password
                  </p>
                  <Button variant="outline" onClick={() => setShowPasswordChange(true)}>
                    <Key className="h-4 w-4 mr-2" />
                    Change Password
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      New Password
                    </label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                        placeholder="Enter new password (min 6 characters)"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Confirm New Password
                    </label>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="Confirm new password"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button variant="outline" onClick={() => {
                      setShowPasswordChange(false)
                      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
                    }}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button onClick={handleChangePassword}>
                      <Save className="h-4 w-4 mr-2" />
                      Update Password
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* My Permissions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                My Permissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Permissions by Category */}
                {Object.entries(permissionsReport.permissionsByCategory).map(([category, perms]) => (
                  <div key={category} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 dark:text-white capitalize mb-3 flex items-center gap-2">
                      {category === 'projects' && <FileText className="h-4 w-4 text-blue-600" />}
                      {category === 'boq' && <BarChart3 className="h-4 w-4 text-green-600" />}
                      {category === 'kpi' && <Activity className="h-4 w-4 text-purple-600" />}
                      {category === 'reports' && <FileText className="h-4 w-4 text-orange-600" />}
                      {category === 'users' && <User className="h-4 w-4 text-red-600" />}
                      {category === 'settings' && <Settings className="h-4 w-4 text-indigo-600" />}
                      {category === 'system' && <Lock className="h-4 w-4 text-gray-600" />}
                      {category} ({perms.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {perms.map(perm => (
                        <div key={perm.id} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{perm.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{perm.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {userWithPerms.custom_permissions_enabled && (
                <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg">
                  <div className="flex items-center gap-2 text-orange-800 dark:text-orange-300">
                    <Key className="h-4 w-4" />
                    <span className="font-semibold">Custom Permissions Active</span>
                  </div>
                  <p className="text-sm text-orange-700 dark:text-orange-400 mt-1">
                    Your permissions have been customized by an administrator
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Stats & Info */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5" />
                Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Projects</span>
                </div>
                <span className="text-xl font-bold text-blue-600">{activityStats?.projectsCreated || 0}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Activities</span>
                </div>
                <span className="text-xl font-bold text-green-600">{activityStats?.activitiesCreated || 0}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">KPI Records</span>
                </div>
                <span className="text-xl font-bold text-purple-600">{activityStats?.kpisRecorded || 0}</span>
              </div>
            </CardContent>
          </Card>

          {/* Account Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Account Created</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {new Date(userData.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Last Updated</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {new Date(userData.updated_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>

              {(userData as any).last_login && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Last Login</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {new Date((userData as any).last_login).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              )}

              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Account Status</p>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  (userData as any).is_active !== false
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                }`}>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  {(userData as any).is_active !== false ? 'Active' : 'Inactive'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Permissions Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5" />
                Permissions Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total Permissions</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {permissionsReport.totalPermissions}
                  </span>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">By Category:</p>
                  {Object.entries(permissionsReport.permissionsByCategory).map(([category, perms]) => (
                    <div key={category} className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 dark:text-gray-400 capitalize">{category}</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{perms.length}</span>
                    </div>
                  ))}
                </div>

                {permissionsReport.customPermissionsEnabled && (
                  <>
                    {permissionsReport.extraFromRole.length > 0 && (
                      <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded">
                        <p className="text-xs font-semibold text-green-800 dark:text-green-300">
                          +{permissionsReport.extraFromRole.length} Extra Permissions
                        </p>
                        <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                          Beyond your role defaults
                        </p>
                      </div>
                    )}
                    {permissionsReport.missingFromRole.length > 0 && (
                      <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded">
                        <p className="text-xs font-semibold text-red-800 dark:text-red-300">
                          -{permissionsReport.missingFromRole.length} Restricted Permissions
                        </p>
                        <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                          Removed from your role defaults
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// Default export for compatibility
export default UserProfile
