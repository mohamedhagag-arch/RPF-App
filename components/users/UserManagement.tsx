'use client'

import { useState, useEffect } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { getSupabaseClient, executeQuery } from '@/lib/simpleConnectionManager'
import { useSmartLoading } from '@/lib/smartLoadingManager'
import { useAuth } from '@/app/providers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { User } from '@/lib/supabase'
import { EnhancedPermissionsManager } from './EnhancedPermissionsManager'
import { IntegratedUserManager } from './IntegratedUserManager'
import { 
  UserWithPermissions,
  getUserPermissions,
  getPermissionsCount,
  ALL_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS
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
  Download,
  Upload,
  Copy,
  History,
  BarChart3,
  Settings,
  UserCog,
  Globe,
  Clock,
  Star,
  Target,
  Zap,
  MoreHorizontal,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

interface UserManagementProps {
  userRole?: string
}

export function UserManagement({ userRole = 'viewer' }: UserManagementProps) {
  const guard = usePermissionGuard()
  const { appUser, refreshUserProfile } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  
  // Add logging for loading state changes
  const setLoadingWithLog = (value: boolean) => {
    console.log(`🔄 setLoading called with value: ${value} at ${new Date().toISOString()}`)
    setLoading(value)
    console.log(`✅ setLoading completed with value: ${value}`)
  }
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { startSmartLoading, stopSmartLoading } = useSmartLoading('users')
  
  // Create custom startSmartLoading and stopSmartLoading with logging
  const startSmartLoadingWithLog = (setLoadingFn: (loading: boolean) => void) => {
    console.log('🔄 startSmartLoadingWithLog called')
    startSmartLoading(setLoadingWithLog)
  }
  
  const stopSmartLoadingWithLog = (setLoadingFn: (loading: boolean) => void) => {
    console.log('🔄 stopSmartLoadingWithLog called')
    stopSmartLoading(setLoadingWithLog)
  }
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [managingPermissionsUser, setManagingPermissionsUser] = useState<UserWithPermissions | null>(null)
  const [useIntegratedSystem, setUseIntegratedSystem] = useState(false) // Force use regular system

  // Advanced Features States
  const [showBulkOperations, setShowBulkOperations] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [showExportImport, setShowExportImport] = useState(false)
  const [showAuditLog, setShowAuditLog] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [advancedFilters, setAdvancedFilters] = useState({
    isActive: '',
    role: '',
    division: '',
    createdAfter: '',
    createdBefore: ''
  })
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')

  const supabase = getSupabaseClient()

  // Check permissions for user management access
  const canManageUsers = guard.hasAccess('users.view') || guard.hasAccess('users.permissions') || userRole === 'admin'

  // Advanced Features Functions
  const getFilteredUsers = () => {
    let filtered = users

    // Basic filters
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.division?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (selectedRole) {
      filtered = filtered.filter(user => user.role === selectedRole)
    }

    // Advanced filters
    if (advancedFilters.isActive !== '') {
      const isActive = advancedFilters.isActive === 'true'
      filtered = filtered.filter(user => user.is_active === isActive)
    }

    if (advancedFilters.role) {
      filtered = filtered.filter(user => user.role === advancedFilters.role)
    }

    if (advancedFilters.division) {
      filtered = filtered.filter(user => user.division === advancedFilters.division)
    }

    if (advancedFilters.createdAfter) {
      const date = new Date(advancedFilters.createdAfter)
      filtered = filtered.filter(user => new Date(user.created_at) >= date)
    }

    if (advancedFilters.createdBefore) {
      const date = new Date(advancedFilters.createdBefore)
      filtered = filtered.filter(user => new Date(user.created_at) <= date)
    }

    // Sorting
    filtered.sort((a, b) => {
      const aValue = (a as any)[sortBy] ?? ''
      const bValue = (b as any)[sortBy] ?? ''

      const aStr = typeof aValue === 'string' ? aValue.toLowerCase() : String(aValue)
      const bStr = typeof bValue === 'string' ? bValue.toLowerCase() : String(bValue)

      if (sortOrder === 'asc') {
        return aStr < bStr ? -1 : aStr > bStr ? 1 : 0
      } else {
        return aStr > bStr ? -1 : aStr < bStr ? 1 : 0
      }
    })

    return filtered
  }

  const exportUsers = () => {
    const data = getFilteredUsers().map(user => ({
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      division: user.division,
      is_active: (user as any).is_active || true,
      created_at: user.created_at,
      updated_at: user.updated_at
    }))
    
    const csvContent = [
      Object.keys(data[0] || {}).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `users_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const bulkUpdateUsers = async (updates: any) => {
    if (selectedUsers.length === 0) return

    try {
      // Update users one by one to avoid type issues
      for (const userId of selectedUsers) {
        const { error } = await (supabase as any)
          .from('users')
          .update(updates)
          .eq('id', userId)

        if (error) throw error
      }

      setSelectedUsers([])
      fetchUsers()
    } catch (error: any) {
      setError(error.message)
    }
  }

  const getUserStats = () => {
    const filtered = getFilteredUsers()
    const total = filtered.length
    const active = filtered.filter(u => {
      const userAny = u as any;
      return userAny.is_active !== false;
    }).length
    const inactive = total - active
    
    const byRole = filtered.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const byDivision = filtered.reduce((acc, user) => {
      const division = user.division || 'No Division'
      acc[division] = (acc[division] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return { total, active, inactive, byRole, byDivision }
  }

  const getUniqueValues = (field: keyof User) => {
    return Array.from(new Set(users.map(u => u[field]).filter(Boolean))).sort()
  }

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const selectAllUsers = () => {
    const filtered = getFilteredUsers()
    setSelectedUsers(filtered.map(u => u.id))
  }

  const clearSelection = () => {
    setSelectedUsers([])
  }
  
  console.log('🔍 UserManagement Debug:', {
    userRole: userRole,
    canManageUsers: canManageUsers,
    hasUsersView: guard.hasAccess('users.view'),
    hasUsersPermissions: guard.hasAccess('users.permissions'),
    appUserEmail: appUser?.email
  })

  useEffect(() => {
    console.log('🔄 UserManagement useEffect triggered:', { canManageUsers: canManageUsers, userRole: userRole })
    // Check permissions and fetch users if allowed
    if (canManageUsers) {
      console.log('✅ Calling fetchUsers because canManageUsers is true')
      fetchUsers()
    } else {
      console.log('❌ Not calling fetchUsers because canManageUsers is false')
    }
  }, [userRole, canManageUsers])

         const fetchUsers = async () => {
           try {
             startSmartLoadingWithLog(setLoading)
             console.log('🔄 Fetching users data...')
             
             // ✅ تحسين: إضافة timeout protection
             const timeoutPromise = new Promise((_, reject) => 
               setTimeout(() => reject(new Error('Users fetch timeout')), 20000)
             )
             
             const { data, error } = await Promise.race([
               supabase
                 .from('users')
                 .select('*')
                 .order('created_at', { ascending: false }),
               timeoutPromise
             ]) as any

             if (error) {
               console.error('❌ Error fetching users:', error)
               throw error
             }

             console.log('📥 Fetched users data:', data)
             console.log('📊 Total users fetched:', data?.length)
             
             const targetUser = data?.find((u: any) => u.email === 'hajeta4728@aupvs.com')
             console.log('📊 User with email hajeta4728@aupvs.com:', targetUser)
             
             if (targetUser) {
               console.log('🔍 Target user permissions:', (targetUser as any).permissions)
               console.log('🔍 Target user permissions length:', (targetUser as any).permissions?.length)
               console.log('🔍 Target user custom_enabled:', (targetUser as any).custom_permissions_enabled)
               console.log('🔍 Target user updated_at:', (targetUser as any).updated_at)
               console.log('🔍 Target user created_at:', (targetUser as any).created_at)
               console.log('🔍 Time difference (seconds):', 
                 new Date((targetUser as any).updated_at).getTime() - new Date((targetUser as any).created_at).getTime() / 1000
               )
             } else {
               console.warn('⚠️ Target user hajeta4728@aupvs.com not found in fetched data!')
             }

             // Also log all users with their permission counts
             console.log('📋 All users permission summary:')
             data?.forEach((user: any, index: number) => {
               console.log(`${index + 1}. ${user.email}: ${user.permissions?.length || 0} permissions, updated: ${user.updated_at}`)
             })

             setUsers(data || [])
           } catch (error: any) {
             console.error('❌ Error in fetchUsers:', error)
             setError(error.message)
           } finally {
             console.log('🔄 Calling stopSmartLoading to set loading to false')
             stopSmartLoadingWithLog(setLoading)
             console.log('✅ Loading should now be false')
           }
         }

  const handleCreateUser = async (userData: Partial<User>) => {
    try {
      // Create auth user first
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email!,
        password: 'TempPassword123!', // Should be changed on first login
        email_confirm: true,
        user_metadata: {
          full_name: userData.full_name
        }
      })

      if (authError) throw authError

      // Create user profile
      const { error: profileError } = await (supabase as any)
        .from('users')
        .insert([{
          id: authData.user.id,
          email: userData.email,
          full_name: userData.full_name,
          role: userData.role,
          division: userData.division
        }])

      if (profileError) throw profileError

      setShowForm(false)
      fetchUsers()
    } catch (error: any) {
      setError(error.message)
    }
  }

  const handleUpdateUser = async (id: string, userData: Partial<User>) => {
    try {
      const { error } = await (supabase as any)
        .from('users')
        .update(userData)
        .eq('id', id)

      if (error) throw error

      setEditingUser(null)
      fetchUsers()
    } catch (error: any) {
      setError(error.message)
    }
  }

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return

    try {
      // Delete from auth users
      const { error: authError } = await supabase.auth.admin.deleteUser(id)
      if (authError) throw authError

      // Delete from users table
      const { error: profileError } = await supabase
        .from('users')
        .delete()
        .eq('id', id)

      if (profileError) throw profileError

      fetchUsers()
    } catch (error: any) {
      setError(error.message)
    }
  }

  const handleUpdatePermissions = async (userId: string, permissions: string[], customEnabled: boolean) => {
    try {
      console.log('🔄 Updating permissions for user:', userId, {
        permissions: permissions.length,
        customEnabled
      })

      console.log('🔍 About to update user with data:', {
        userId,
        permissions,
        permissionsLength: permissions.length,
        customEnabled,
        timestamp: new Date().toISOString()
      })

      const { data, error } = await (supabase as any)
        .from('users')
        .update({
          permissions: permissions, // Store as TEXT[] array directly
          custom_permissions_enabled: customEnabled,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()

      console.log('🔍 Update query result:', {
        data,
        error,
        errorMessage: error?.message,
        errorCode: error?.code,
        errorDetails: error?.details
      })

      if (error) {
        console.error('❌ Error updating permissions:', error)
        throw error
      }

      console.log('✅ Permissions updated successfully:', data)
      console.log('📋 Updated permissions data:', data[0]?.permissions)
      console.log('📊 Permissions count:', data[0]?.permissions?.length)
      console.log('🔍 Updated user full data:', data[0])
      console.log('🔍 Updated user custom_permissions_enabled:', data[0]?.custom_permissions_enabled)
      console.log('🔍 Updated user updated_at:', data[0]?.updated_at)
      
      // Show success message
      setSuccess(`Permissions updated successfully for ${data[0]?.email || 'user'}!`)
      setTimeout(() => setSuccess(''), 3000)
      
             // Refresh users list
             await fetchUsers()

             // Refresh the global user profile if this is the current user
             if (userId === appUser?.id) {
               console.log('🔄 Refreshing global user profile for current user...')
               await refreshUserProfile()
               console.log('✅ Global user profile refreshed - user should now see updated permissions!')
             }

             // Update the managing permissions user state
             if (managingPermissionsUser && managingPermissionsUser.id === userId) {
               console.log('🔄 Updating managingPermissionsUser state with:', { permissions, customEnabled })
               console.log('🔍 Current managingPermissionsUser:', managingPermissionsUser)
               const updatedUser = {
                 ...managingPermissionsUser,
                 permissions,
                 custom_permissions_enabled: customEnabled
               }
               console.log('🔍 New managingPermissionsUser will be:', updatedUser)
               setManagingPermissionsUser(updatedUser)
             }
      
    } catch (error: any) {
      console.error('❌ Failed to update permissions:', error)
      setError(error.message || 'Failed to update permissions')
      throw error
    }
  }

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await (supabase as any)
        .from('users')
        .update({
          is_active: !currentStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (error) throw error

      fetchUsers()
    } catch (error: any) {
      setError(error.message)
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800'
      case 'manager': return 'bg-blue-100 text-blue-800'
      case 'engineer': return 'bg-green-100 text-green-800'
      case 'viewer': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return Shield
      case 'manager': return UserCheck
      case 'engineer': return Users
      case 'viewer': return UserX
      default: return Users
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      (user.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.division || '').toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = selectedRole === '' || user.role === selectedRole
    
    return matchesSearch && matchesRole
  })

  if (!canManageUsers) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-600">
              You don't have permission to access user management. This feature requires users.view or users.permissions permissions.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  console.log('🔍 UserManagement Render Debug:', {
    loading: loading,
    loadingType: typeof loading,
    usersCount: users.length,
    canManageUsers: canManageUsers,
    useIntegratedSystem: useIntegratedSystem,
    usersArrayLength: users.length,
    timestamp: new Date().toISOString()
  })

  if (loading) {
    console.log('🔄 Showing Loading Spinner because loading =', loading)
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
        <div className="ml-4 text-sm text-gray-600">
          Loading users... (loading = {loading.toString()})
        </div>
      </div>
    )
  }

  // Use the integrated system by default
  if (useIntegratedSystem) {
    console.log('🔄 Using IntegratedUserManager because useIntegratedSystem =', useIntegratedSystem)
    return <IntegratedUserManager userRole={userRole} />
  }
  
  console.log('🔄 Using regular UserManagement because useIntegratedSystem =', useIntegratedSystem)

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="space-y-6">
        {/* Title and Description */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">User Management</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Manage system users and their permissions</p>
          </div>
          
          {/* System Toggle */}
          <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setUseIntegratedSystem(true)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                useIntegratedSystem
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Key className="h-3 w-3 inline mr-1" />
              Integrated System
            </button>
            <button
              onClick={() => setUseIntegratedSystem(false)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                !useIntegratedSystem
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Shield className="h-3 w-3 inline mr-1" />
              Legacy System
            </button>
          </div>
        </div>

        {/* Advanced Features Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Left Side - Advanced Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBulkOperations(!showBulkOperations)}
              className="flex items-center gap-2"
              disabled={selectedUsers.length === 0}
            >
              <Settings className="h-4 w-4" />
              Bulk Operations ({selectedUsers.length})
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={exportUsers}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export Users
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAnalytics(!showAnalytics)}
              className="flex items-center gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Analytics
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAuditLog(!showAuditLog)}
              className="flex items-center gap-2"
            >
              <History className="h-4 w-4" />
              Audit Log
            </Button>
          </div>

          {/* Right Side - View Mode and Add User */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Users className="h-3 w-3 inline mr-1" />
                Table
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'cards'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Building className="h-3 w-3 inline mr-1" />
                Cards
              </button>
            </div>
            
            <Button onClick={() => setShowForm(true)} className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Add New User</span>
            </Button>
          </div>
        </div>

        {/* Bulk Operations Panel */}
        {showBulkOperations && (
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Selected {selectedUsers.length} users
              </span>
              
              <Button
                size="sm"
                onClick={() => bulkUpdateUsers({ is_active: true } as any)}
                className="flex items-center gap-2"
              >
                <UserCheck className="h-4 w-4" />
                Activate
              </Button>
              
              <Button
                size="sm"
                onClick={() => bulkUpdateUsers({ is_active: false } as any)}
                className="flex items-center gap-2"
              >
                <UserX className="h-4 w-4" />
                Deactivate
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={clearSelection}
              >
                Clear Selection
              </Button>
            </div>
          </div>
        )}

        {/* Analytics Panel */}
        {showAnalytics && (
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{getUserStats().total}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Users</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{getUserStats().active}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Active</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{getUserStats().inactive}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Inactive</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round((getUserStats().active / getUserStats().total) * 100)}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Active Rate</div>
              </div>
            </div>
          </div>
        )}
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

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="md:w-48">
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Roles</option>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="engineer">Engineer</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Users List */}
      <Card>
        <CardContent className="p-0">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Users Found</h3>
              <p className="text-gray-600 mb-4">
                {users.length === 0 
                  ? "Get started by creating your first user."
                  : "No users match your search criteria."
                }
              </p>
              {users.length === 0 && (
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First User
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Permissions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Division
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredUsers.map((user) => {
                    const RoleIcon = getRoleIcon(user.role)
                    const userWithPerms = user as UserWithPermissions
                    // Always use user.permissions if available, regardless of custom_permissions_enabled
                    const permissionsCount = userWithPerms.permissions && userWithPerms.permissions.length > 0
                      ? userWithPerms.permissions.length 
                      : getPermissionsCount(user.role)
                    
                    // Debug logging for permission counts
                    if (user.email === 'hajeta4728@aupvs.com') {
                      console.log('🔍 Permission count calculation for hajeta4728@aupvs.com:', {
                        userPermissions: userWithPerms.permissions,
                        permissionsLength: userWithPerms.permissions?.length,
                        customEnabled: userWithPerms.custom_permissions_enabled,
                        role: user.role,
                        defaultCount: getPermissionsCount(user.role),
                        finalCount: permissionsCount
                      })
                    }
                    const isActive = (userWithPerms.is_active !== undefined) ? userWithPerms.is_active : true
                    
                    return (
                      <tr key={user.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800 ${!isActive ? 'opacity-50' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                              <Users className="h-5 w-5 text-primary-600" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {user.full_name}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                                <Mail className="h-3 w-3 mr-1" />
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                            <RoleIcon className="h-3 w-3 mr-1" />
                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                              {permissionsCount}
                            </span>
                            <span className="text-xs text-gray-500">permissions</span>
                            {userWithPerms.custom_permissions_enabled && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300">
                                <Key className="h-3 w-3 mr-1" />
                                Custom
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          <div className="flex items-center">
                            <Building className="h-4 w-4 mr-1 text-gray-400" />
                            {user.division || 'Not specified'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleToggleUserStatus(user.id, isActive)}
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer ${
                              isActive 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' 
                                : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                            }`}
                          >
                            {isActive ? (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Active
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3 w-3 mr-1" />
                                Inactive
                              </>
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(`/profile/${user.id}`, '_blank')}
                              title="View Profile"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setManagingPermissionsUser(userWithPerms)}
                              title="Manage Permissions"
                            >
                              <Shield className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingUser(user)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Form Modal */}
      {showForm && (
        <UserForm
          user={null}
          onSubmit={handleCreateUser}
          onCancel={() => setShowForm(false)}
        />
      )}

      {editingUser && (
        <UserForm
          user={editingUser}
          onSubmit={(data) => handleUpdateUser(editingUser.id, data)}
          onCancel={() => setEditingUser(null)}
        />
      )}

      {/* Enhanced Permissions Manager */}
      {managingPermissionsUser && (
        <EnhancedPermissionsManager
          key={managingPermissionsUser.id + managingPermissionsUser.updated_at} // Force re-render when user changes
          user={managingPermissionsUser}
          onUpdate={(permissions, customEnabled) => 
            handleUpdatePermissions(managingPermissionsUser.id, permissions, customEnabled)
          }
          onClose={() => setManagingPermissionsUser(null)}
          onEditUser={async (userData) => {
            const updateData: Partial<User> = {
              full_name: userData.full_name,
              email: userData.email,
              role: userData.role as 'admin' | 'manager' | 'engineer' | 'viewer',
              division: userData.division
            }
            await handleUpdateUser(managingPermissionsUser.id, updateData)
            setManagingPermissionsUser(null)
          }}
          onAddRole={async (roleData) => {
            try {
              // Add role to DEFAULT_ROLE_PERMISSIONS
              const newRoleKey = roleData.name.toLowerCase().replace(/\s+/g, '_')
              DEFAULT_ROLE_PERMISSIONS[newRoleKey] = roleData.permissions
              
              console.log('✅ New role added successfully:', {
                key: newRoleKey,
                name: roleData.name,
                description: roleData.description,
                permissionsCount: roleData.permissions.length
              })
              
              // TODO: Save to database if needed
              // You can add database save logic here
              
            } catch (error) {
              console.error('❌ Error adding role:', error)
              throw error
            }
          }}
        />
      )}
    </div>
  )
}

// User Form Component
interface UserFormProps {
  user: User | null
  onSubmit: (data: Partial<User>) => void
  onCancel: () => void
}

function UserForm({ user, onSubmit, onCancel }: UserFormProps) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    full_name: '',
    email: '',
    role: 'viewer' as 'admin' | 'manager' | 'engineer' | 'viewer',
    division: ''
  })
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || user.full_name?.split(' ')[0] || '',
        last_name: user.last_name || user.full_name?.split(' ').slice(1).join(' ') || '',
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        division: user.division || ''
      })
    }
  }, [user])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.first_name.trim() || !formData.last_name.trim() || !formData.email.trim()) {
      setError('Please fill in all required fields')
      return
    }

    onSubmit(formData)
  }

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {user ? 'Edit User' : 'Add New User'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="error">
                {error}
              </Alert>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name *
              </label>
              <Input
                value={formData.first_name}
                onChange={(e) => {
                  handleChange('first_name', e.target.value)
                  handleChange('full_name', `${e.target.value} ${formData.last_name}`.trim())
                }}
                placeholder="Enter first name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name *
              </label>
              <Input
                value={formData.last_name}
                onChange={(e) => {
                  handleChange('last_name', e.target.value)
                  handleChange('full_name', `${formData.first_name} ${e.target.value}`.trim())
                }}
                placeholder="Enter last name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="Enter email address"
                required
                disabled={!!user} // Don't allow editing email for existing users
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <select
                value={formData.role}
                onChange={(e) => handleChange('role', e.target.value)}
                className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="viewer">Viewer</option>
                <option value="engineer">Engineer</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Division
              </label>
              <Input
                value={formData.division}
                onChange={(e) => handleChange('division', e.target.value)}
                placeholder="Enter division"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
              >
                Cancel
              </Button>
              <Button type="submit">
                {user ? 'Save Changes' : 'Create User'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

