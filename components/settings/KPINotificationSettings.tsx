'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/app/providers'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { usePermissionGuard } from '@/lib/permissionGuard'
import {
  Bell,
  Users,
  CheckCircle,
  XCircle,
  Save,
  RefreshCw,
  Settings,
  Shield,
  Mail,
  MessageSquare
} from 'lucide-react'

interface KPINotificationSetting {
  id?: string
  user_id: string
  department?: string
  role?: string
  can_receive_notifications: boolean
  can_approve_kpis: boolean
  notification_methods: string[]
}

interface User {
  id: string
  email: string
  full_name: string
  role: string
  department_name_en?: string
}

export function KPINotificationSettings() {
  const { appUser } = useAuth()
  const guard = usePermissionGuard()
  const supabase = getSupabaseClient()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [settings, setSettings] = useState<KPINotificationSetting[]>([])
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())

  // ✅ Security Check: Verify user has permission to manage KPI notifications
  const canManageKPINotifications = 
    guard.hasAccess('settings.manage') || 
    ['admin', 'manager', 'planner'].includes(appUser?.role || '') ||
    guard.isAdmin()

  useEffect(() => {
    // Only load data if user has permission
    if (canManageKPINotifications) {
      loadUsers()
      loadSettings()
    }
  }, [canManageKPINotifications])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const { data, error: usersError } = await supabase
        .from('user_profiles_complete')
        .select('id, email, full_name, role, department_name_en')
        .order('full_name', { ascending: true })

      if (usersError) throw usersError
      setUsers(data || [])
    } catch (err: any) {
      console.error('Error loading users:', err)
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const loadSettings = async () => {
    // ✅ Security: Double-check permission before loading
    if (!canManageKPINotifications) {
      return
    }
    
    try {
      const { data, error: settingsError } = await supabase
        .from('kpi_notification_settings')
        .select('*')

      if (settingsError) {
        console.log('⚠️ KPI notification settings table might not exist:', settingsError)
        return
      }

      setSettings(data || [])
      
      // Mark users who have settings as selected
      const userIds = new Set((data || []).map((s: KPINotificationSetting) => s.user_id))
      setSelectedUsers(userIds)
    } catch (err: any) {
      console.error('Error loading settings:', err)
    }
  }

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev)
      if (newSet.has(userId)) {
        newSet.delete(userId)
      } else {
        newSet.add(userId)
      }
      return newSet
    })
  }

  const saveSettings = async () => {
    // ✅ Security: Verify permission before saving
    if (!canManageKPINotifications) {
      setError('Access denied: You do not have permission to save settings')
      return
    }
    
    try {
      setSaving(true)
      setError('')
      setSuccess('')

      // Delete all existing settings first
      if (settings.length > 0) {
        const { error: deleteError } = await supabase
          .from('kpi_notification_settings')
          .delete()
          .in('id', settings.filter(s => s.id).map(s => s.id!))

        if (deleteError) {
          console.error('Error deleting old settings:', deleteError)
        }
      }

      // Create new settings for selected users
      const newSettings: KPINotificationSetting[] = Array.from(selectedUsers).map(userId => {
        const user = users.find(u => u.id === userId)
        return {
          user_id: userId,
          department: user?.department_name_en || undefined,
          role: user?.role || undefined,
          can_receive_notifications: true,
          can_approve_kpis: guard.hasAccess('kpi.approve') || user?.role === 'planner' || user?.role === 'manager' || user?.role === 'admin',
          notification_methods: ['in_app']
        }
      })

      if (newSettings.length > 0) {
        const { error: insertError } = await (supabase
          .from('kpi_notification_settings') as any)
          .insert(newSettings)

        if (insertError) {
          console.error('Error saving settings:', insertError)
          throw insertError
        }
      }

      setSuccess('✅ Settings saved successfully!')
      await loadSettings()
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      console.error('Error saving settings:', err)
      setError(err.message || 'Failed to save settings')
      setTimeout(() => setError(''), 5000)
    } finally {
      setSaving(false)
    }
  }

  const updateUserSetting = async (userId: string, updates: Partial<KPINotificationSetting>) => {
    // ✅ Security: Verify permission before updating
    if (!canManageKPINotifications) {
      setError('Access denied: You do not have permission to update settings')
      return
    }
    
    try {
      const existingSetting = settings.find(s => s.user_id === userId)
      
      if (existingSetting && existingSetting.id) {
        const { error } = await (supabase
          .from('kpi_notification_settings') as any)
          .update(updates)
          .eq('id', existingSetting.id)

        if (error) throw error
      } else {
        const user = users.find(u => u.id === userId)
        const { error } = await (supabase
          .from('kpi_notification_settings') as any)
          .insert({
            user_id: userId,
            department: user?.department_name_en || undefined,
            role: user?.role || undefined,
            can_receive_notifications: true,
            can_approve_kpis: false,
            notification_methods: ['in_app'],
            ...updates
          })

        if (error) throw error
      }

      await loadSettings()
    } catch (err: any) {
      console.error('Error updating user setting:', err)
      setError(err.message || 'Failed to update setting')
    }
  }

  const planningUsers = users.filter(u => 
    u.department_name_en?.toLowerCase().includes('planning') || 
    u.role === 'planner'
  )

  const otherUsers = users.filter(u => 
    !u.department_name_en?.toLowerCase().includes('planning') && 
    u.role !== 'planner'
  )

  // ✅ Security: Show access denied if user doesn't have permission
  if (!canManageKPINotifications) {
    return (
      <div className="text-center py-12">
        <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Access Denied</h3>
        <p className="text-gray-600 dark:text-gray-400">
          You don't have permission to manage KPI notification settings. Please contact your administrator.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            KPI Notification Settings
          </CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Manage who receives notifications when engineers create KPIs and who can approve them
          </p>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="error" className="mb-4">
              {error}
            </Alert>
          )}
          {success && (
            <Alert variant="success" className="mb-4">
              {success}
            </Alert>
          )}

          <div className="space-y-6">
            {/* Planning Department Section */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Planning Department
              </h3>
              <div className="space-y-2">
                {planningUsers.length === 0 ? (
                  <p className="text-sm text-gray-500">No users found in Planning department</p>
                ) : (
                  planningUsers.map(user => {
                    const setting = settings.find(s => s.user_id === user.id)
                    const isSelected = selectedUsers.has(user.id)
                    
                    return (
                      <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3 flex-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleUserSelection(user.id)}
                            className="w-4 h-4"
                          />
                          <div>
                            <div className="font-medium">{user.full_name}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                            <div className="text-xs text-gray-400">
                              {user.role} • {user.department_name_en || 'No department'}
                            </div>
                          </div>
                        </div>
                        {isSelected && setting && (
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={setting.can_receive_notifications}
                                onChange={(e) => updateUserSetting(user.id, { can_receive_notifications: e.target.checked })}
                                className="w-4 h-4"
                              />
                              Receive Notifications
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={setting.can_approve_kpis}
                                onChange={(e) => updateUserSetting(user.id, { can_approve_kpis: e.target.checked })}
                                className="w-4 h-4"
                              />
                              Can Approve KPIs
                            </label>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Other Users Section */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-gray-600" />
                Other Users
              </h3>
              <div className="space-y-2">
                {otherUsers.length === 0 ? (
                  <p className="text-sm text-gray-500">No other users found</p>
                ) : (
                  otherUsers.map(user => {
                    const setting = settings.find(s => s.user_id === user.id)
                    const isSelected = selectedUsers.has(user.id)
                    
                    return (
                      <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3 flex-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleUserSelection(user.id)}
                            className="w-4 h-4"
                          />
                          <div>
                            <div className="font-medium">{user.full_name}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                            <div className="text-xs text-gray-400">
                              {user.role} • {user.department_name_en || 'No department'}
                            </div>
                          </div>
                        </div>
                        {isSelected && setting && (
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={setting.can_receive_notifications}
                                onChange={(e) => updateUserSetting(user.id, { can_receive_notifications: e.target.checked })}
                                className="w-4 h-4"
                              />
                              Receive Notifications
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={setting.can_approve_kpis}
                                onChange={(e) => updateUserSetting(user.id, { can_approve_kpis: e.target.checked })}
                                className="w-4 h-4"
                              />
                              Can Approve KPIs
                            </label>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button
              onClick={saveSettings}
              disabled={saving}
              className="flex items-center gap-2"
            >
              {saving ? (
                <>
                  <LoadingSpinner size="sm" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

