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
import { User } from '@/lib/supabase'
import { EnhancedPermissionsManager } from './EnhancedPermissionsManager'
import { 
  UserWithPermissions,
  getUserPermissions,
  DEFAULT_ROLE_PERMISSIONS,
  getRoleDescription
} from '@/lib/permissionsSystem'
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter,
  Shield,
  UserCheck,
  UserX,
  Mail,
  Calendar,
  Building,
  Lock,
  Eye,
  CheckCircle,
  XCircle,
  Key,
  Crown,
  Settings,
  UserCog
} from 'lucide-react'

interface IntegratedUserManagerProps {
  userRole?: string
}

export function IntegratedUserManager({ userRole = 'viewer' }: IntegratedUserManagerProps) {
  const guard = usePermissionGuard()
  const { appUser, refreshUserProfile } = useAuth()
  const [users, setUsers] = useState<UserWithPermissions[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [managingPermissionsUser, setManagingPermissionsUser] = useState<UserWithPermissions | null>(null)
  const [permissionMode, setPermissionMode] = useState<'role' | 'custom'>('role')

  const supabase = getSupabaseClient()

  useEffect(() => {
    if (userRole === 'admin') {
      fetchUsers()
    }
  }, [userRole])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      console.log('🔄 IntegratedUserManager: Fetching users...')
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Error fetching users:', error)
        throw error
      }

      console.log('📥 IntegratedUserManager: Users fetched:', data?.length)
      setUsers((data || []) as UserWithPermissions[])
    } catch (error: any) {
      console.error('❌ IntegratedUserManager: Error:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEditUser = (user: UserWithPermissions) => {
    setEditingUser(user as User)
    setShowForm(true)
    // تحديد نمط الصلاحيات بناءً على حالة المستخدم
    setPermissionMode(user.custom_permissions_enabled ? 'custom' : 'role')
  }

  const handleSaveUser = async (userData: any) => {
    if (!editingUser) return

    try {
      console.log('💾 IntegratedUserManager: Saving user:', userData)
      
      // تحديث بيانات المستخدم
      const { data, error } = await supabase
        .from('users')
        // @ts-ignore - Supabase type issue
        .update({
          full_name: userData.full_name || `${userData.first_name || ''} ${userData.last_name || ''}`.trim(),
          email: userData.email,
          role: userData.role,
          division: userData.division,
          is_active: userData.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingUser.id)
        .select()

      if (error) throw error

      console.log('✅ IntegratedUserManager: User saved successfully')
      setSuccess('User updated successfully!')
      setShowForm(false)
      setEditingUser(null)
      
      // تحديث قائمة المستخدمين
      await fetchUsers()
      
      // إذا كان المستخدم المحدث هو المستخدم الحالي، حدّث السياق
      if (editingUser.id === appUser?.id) {
        await refreshUserProfile()
      }
    } catch (error: any) {
      console.error('❌ IntegratedUserManager: Save error:', error)
      setError(error.message)
    }
  }

  const handleManagePermissions = (user: UserWithPermissions) => {
    setManagingPermissionsUser(user)
    setPermissionMode(user.custom_permissions_enabled ? 'custom' : 'role')
  }

  const handleUpdatePermissions = async (updatedUser: UserWithPermissions) => {
    if (!managingPermissionsUser) return

    try {
      console.log('🔄 IntegratedUserManager: Updating permissions for:', updatedUser.email)
      console.log('📊 Updated permissions:', updatedUser.permissions)
      console.log('📊 Updated permissions count:', updatedUser.permissions?.length)
      console.log('📊 Custom enabled:', updatedUser.custom_permissions_enabled)
      
      const { data, error } = await supabase
        .from('users')
        // @ts-ignore - Supabase type issue
        .update({
          permissions: updatedUser.permissions,
          custom_permissions_enabled: updatedUser.custom_permissions_enabled,
          updated_at: new Date().toISOString()
        })
        .eq('id', managingPermissionsUser.id)
        .select()

      if (error) throw error

      console.log('✅ IntegratedUserManager: Permissions updated successfully')
      console.log('📊 Database response:', data)
      setSuccess('Permissions updated successfully!')
      
      // تحديث قائمة المستخدمين فوراً
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === managingPermissionsUser.id 
            ? { ...user, permissions: updatedUser.permissions, custom_permissions_enabled: updatedUser.custom_permissions_enabled, updated_at: new Date().toISOString() } as UserWithPermissions
            : user
        )
      )
      
      // تحديث managingPermissionsUser
      setManagingPermissionsUser(updatedUser)
      
      // إذا كان المستخدم المحدث هو المستخدم الحالي، حدّث السياق
      if (managingPermissionsUser.id === appUser?.id) {
        console.log('🔄 Refreshing current user profile...')
        await refreshUserProfile()
      }
      
      // تحديث البيانات من قاعدة البيانات أيضاً للتأكد
      setTimeout(async () => {
        await fetchUsers()
      }, 1000)
      
    } catch (error: any) {
      console.error('❌ IntegratedUserManager: Permission update error:', error)
      setError(error.message)
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      console.log('🔄 IntegratedUserManager: Changing role for user:', userId, 'to:', newRole)
      
      // تحديد نمط الصلاحيات بناءً على الدور الجديد
      const shouldUseCustomPermissions = users.find(u => u.id === userId)?.custom_permissions_enabled || false
      
      const { data, error } = await supabase
        .from('users')
        // @ts-ignore - Supabase type issue
        .update({
          role: newRole,
          // إذا لم تكن الصلاحيات مخصصة، استخدم الصلاحيات الافتراضية للدور الجديد
          permissions: shouldUseCustomPermissions ? undefined : DEFAULT_ROLE_PERMISSIONS[newRole as keyof typeof DEFAULT_ROLE_PERMISSIONS],
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()

      if (error) throw error

      console.log('✅ IntegratedUserManager: Role changed successfully')
      setSuccess(`User role changed to ${newRole}!`)
      
      // تحديث قائمة المستخدمين فوراً
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId 
            ? { 
                ...user, 
                role: newRole as "admin" | "manager" | "engineer" | "viewer", 
                permissions: shouldUseCustomPermissions ? user.permissions : DEFAULT_ROLE_PERMISSIONS[newRole as keyof typeof DEFAULT_ROLE_PERMISSIONS],
                updated_at: new Date().toISOString() 
              } as UserWithPermissions
            : user
        )
      )
      
      // تحديث البيانات من قاعدة البيانات أيضاً للتأكد
      setTimeout(async () => {
        await fetchUsers()
      }, 1000)
    } catch (error: any) {
      console.error('❌ IntegratedUserManager: Role change error:', error)
      setError(error.message)
    }
  }

  const togglePermissionMode = async (userId: string, mode: 'role' | 'custom') => {
    try {
      console.log('🔄 IntegratedUserManager: Toggling permission mode for user:', userId, 'to:', mode)
      
      const user = users.find(u => u.id === userId)
      if (!user) return

      let permissions: string[]
      
      if (mode === 'role') {
        // التبديل إلى نظام الأدوار - استخدم الصلاحيات الافتراضية للدور
        permissions = DEFAULT_ROLE_PERMISSIONS[user.role as keyof typeof DEFAULT_ROLE_PERMISSIONS] || []
      } else {
        // التبديل إلى نظام الصلاحيات المخصصة - احتفظ بالصلاحيات الحالية
        permissions = user.permissions || DEFAULT_ROLE_PERMISSIONS[user.role as keyof typeof DEFAULT_ROLE_PERMISSIONS] || []
      }

      const { data, error } = await supabase
        .from('users')
        // @ts-ignore - Supabase type issue
        .update({
          permissions,
          custom_permissions_enabled: mode === 'custom',
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()

      if (error) throw error

      console.log('✅ IntegratedUserManager: Permission mode changed successfully')
      setSuccess(`Permission mode changed to ${mode}!`)
      
      // تحديث قائمة المستخدمين فوراً
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId 
            ? { ...user, permissions: permissions || [], custom_permissions_enabled: mode === 'custom', updated_at: new Date().toISOString() } as UserWithPermissions
            : user
        )
      )
      
      // تحديث البيانات من قاعدة البيانات أيضاً للتأكد
      setTimeout(async () => {
        await fetchUsers()
      }, 1000)
    } catch (error: any) {
      console.error('❌ IntegratedUserManager: Permission mode change error:', error)
      setError(error.message)
    }
  }

  const getFilteredUsers = () => {
    let filtered = users

    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (selectedRole) {
      filtered = filtered.filter(user => user.role === selectedRole)
    }

    return filtered
  }

  const getPermissionModeBadge = (user: UserWithPermissions) => {
    if (user.custom_permissions_enabled) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
          <Settings className="h-3 w-3 mr-1" />
          Custom
        </span>
      )
    } else {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          <Crown className="h-3 w-3 mr-1" />
          Role-based
        </span>
      )
    }
  }

  const getRoleBadge = (role: string) => {
    const colors = {
      admin: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      manager: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      engineer: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      viewer: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colors[role as keyof typeof colors] || colors.viewer}`}>
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </span>
    )
  }

  // Check permissions for user management access
  const canManageUsers = guard.hasAccess('users.view') || guard.hasAccess('users.permissions') || userRole === 'admin'
  
  if (!canManageUsers) {
    return (
      <div className="p-6">
        <Alert variant="error">
          You don't have permission to access user management. This feature requires users.view or users.permissions permissions.
        </Alert>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h2>
          <p className="text-gray-600 dark:text-gray-300">Manage users and their permissions</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Add User</span>
        </Button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <Alert variant="success">
          {success}
        </Alert>
      )}
      {error && (
        <Alert variant="error">
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="min-w-[150px]">
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">All Roles</option>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="engineer">Engineer</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Users ({getFilteredUsers().length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {getFilteredUsers().map((user) => {
              // Debug info
              console.log(`🔍 User ${user.email} render:`, {
                permissions: user.permissions?.length || 0,
                custom_enabled: user.custom_permissions_enabled,
                updated_at: user.updated_at
              })
              
              return (
              <div
                key={`${user.id}-${user.updated_at}-${user.permissions?.length || 0}-${user.custom_permissions_enabled}`}
                className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <UserCheck className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                        {user.full_name || 'No Name'}
                      </h3>
                      {getRoleBadge(user.role)}
                      {getPermissionModeBadge(user)}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center space-x-1">
                        <Mail className="h-3 w-3" />
                        <span>{user.email}</span>
                      </div>
                      {user.division && (
                        <div className="flex items-center space-x-1">
                          <Building className="h-3 w-3" />
                          <span>{user.division}</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-gray-400">
                      {user.custom_permissions_enabled ? (
                        <span className="flex items-center space-x-1">
                          <Settings className="h-3 w-3" />
                          <span>Custom permissions: {user.permissions?.length || 0} permissions</span>
                        </span>
                      ) : (
                        <span className="flex items-center space-x-1">
                          <Crown className="h-3 w-3" />
                          <span>Role-based: {getRoleDescription(user.role)}</span>
                        </span>
                      )}
                      {/* Debug info - will show in console */}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {/* Toggle Permission Mode */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => togglePermissionMode(user.id, user.custom_permissions_enabled ? 'role' : 'custom')}
                    className="flex items-center space-x-1"
                  >
                    {user.custom_permissions_enabled ? (
                      <>
                        <Crown className="h-3 w-3" />
                        <span>Switch to Role</span>
                      </>
                    ) : (
                      <>
                        <Settings className="h-3 w-3" />
                        <span>Switch to Custom</span>
                      </>
                    )}
                  </Button>

                  {/* Edit User */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditUser(user)}
                    className="flex items-center space-x-1"
                  >
                    <Edit className="h-3 w-3" />
                    <span>Edit</span>
                  </Button>

                  {/* Manage Permissions */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleManagePermissions(user)}
                    className="flex items-center space-x-1"
                  >
                    <Shield className="h-3 w-3" />
                    <span>Permissions</span>
                  </Button>
                </div>
              </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Edit User Modal */}
      {showForm && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Edit User</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">First Name *</label>
                <Input
                  defaultValue={editingUser.first_name || ''}
                  placeholder="First Name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Last Name *</label>
                <Input
                  defaultValue={editingUser.last_name || ''}
                  placeholder="Last Name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <Input
                  defaultValue={editingUser.email || ''}
                  placeholder="Email"
                  type="email"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <select
                  defaultValue={editingUser.role}
                  onChange={(e) => handleRoleChange(editingUser.id, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="viewer">Viewer</option>
                  <option value="engineer">Engineer</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {getRoleDescription(editingUser.role)}
                </p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleSaveUser({
                  first_name: (document.querySelector('input[placeholder="First Name"]') as HTMLInputElement)?.value,
                  last_name: (document.querySelector('input[placeholder="Last Name"]') as HTMLInputElement)?.value,
                  email: (document.querySelector('input[type="email"]') as HTMLInputElement)?.value,
                  role: editingUser.role,
                  is_active: true
                })}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Permissions Manager Modal */}
      {managingPermissionsUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-6xl mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-lg font-semibold">Manage Permissions</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {managingPermissionsUser.full_name || managingPermissionsUser.email}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {/* Permission Mode Toggle */}
                <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                  <button
                    onClick={() => setPermissionMode('role')}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      permissionMode === 'role'
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <Crown className="h-3 w-3 inline mr-1" />
                    Role-based
                  </button>
                  <button
                    onClick={() => setPermissionMode('custom')}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      permissionMode === 'custom'
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <Settings className="h-3 w-3 inline mr-1" />
                    Custom
                  </button>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setManagingPermissionsUser(null)}
                >
                  Close
                </Button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {permissionMode === 'role' ? (
                // Role-based Permission View
                <div className="space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Crown className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100">Role-based Permissions</h4>
                    </div>
                    <p className="text-blue-700 dark:text-blue-300 text-sm">
                      This user's permissions are automatically managed based on their role: <strong>{managingPermissionsUser.role}</strong>
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(DEFAULT_ROLE_PERMISSIONS).map(([role, permissions]) => (
                      <Card key={role} className={role === managingPermissionsUser.role ? 'ring-2 ring-blue-500' : ''}>
                        <CardHeader>
                          <CardTitle className="flex items-center space-x-2">
                            {getRoleBadge(role)}
                            <span className="text-sm">{permissions.length} permissions</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {getRoleDescription(role)}
                          </p>
                          <div className="space-y-1">
                            {permissions.slice(0, 5).map((permission) => (
                              <div key={permission} className="text-xs text-gray-500 dark:text-gray-400">
                                • {permission}
                              </div>
                            ))}
                            {permissions.length > 5 && (
                              <div className="text-xs text-gray-400">
                                +{permissions.length - 5} more...
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                // Custom Permissions View
                <EnhancedPermissionsManager
                  user={managingPermissionsUser}
                  onUpdate={async (permissions: string[], customEnabled: boolean) => {
                    const updatedUser = {
                      ...managingPermissionsUser,
                      permissions,
                      custom_permissions_enabled: customEnabled
                    }
                    await handleUpdatePermissions(updatedUser)
                  }}
                  onClose={() => setManagingPermissionsUser(null)}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
