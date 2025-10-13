'use client'

import { useState } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import {
  ALL_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  Permission,
  UserWithPermissions,
  getRoleDescription,
  getPermissionsCount
} from '@/lib/permissionsSystem'
import {
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  Edit,
  Plus,
  Trash2,
  Lock,
  Unlock,
  Users,
  Settings,
  FileText,
  DollarSign,
  Database,
  UserPlus,
  Crown,
  Save,
  UserCog,
  Mail,
  Building,
  UserCheck
} from 'lucide-react'

interface AdvancedPermissionsManagerProps {
  user: UserWithPermissions
  onUpdate: (permissions: string[], customEnabled: boolean) => Promise<void>
  onClose: () => void
  onAddRole?: (roleData: { name: string; description: string; permissions: string[] }) => Promise<void>
  onEditUser?: (userData: { full_name: string; email: string; role: string; division: string; is_active: boolean }) => Promise<void>
}

export function AdvancedPermissionsManager({ user, onUpdate, onClose, onAddRole, onEditUser }: AdvancedPermissionsManagerProps) {
  const guard = usePermissionGuard()
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(
    user.custom_permissions_enabled && user.permissions 
      ? user.permissions 
      : DEFAULT_ROLE_PERMISSIONS[user.role] || []
  )
  const [customMode, setCustomMode] = useState(user.custom_permissions_enabled || false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  
  // Add Role states
  const [showAddRole, setShowAddRole] = useState(false)
  const [newRole, setNewRole] = useState({
    name: '',
    description: '',
    permissions: [] as string[]
  })
  const [addingRole, setAddingRole] = useState(false)

  // Edit User states
  const [showEditUser, setShowEditUser] = useState(false)
  const [editUserData, setEditUserData] = useState({
    full_name: user.full_name,
    email: user.email,
    role: user.role,
    division: user.division || '',
    is_active: user.is_active
  })
  const [editingUser, setEditingUser] = useState(false)

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'projects': return FileText
      case 'boq': return Database
      case 'kpi': return Shield
      case 'users': return Users
      case 'reports': return FileText
      case 'settings': return Settings
      case 'system': return Lock
      case 'database': return Database
      default: return Shield
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'projects': return 'blue'
      case 'boq': return 'green'
      case 'kpi': return 'purple'
      case 'users': return 'red'
      case 'reports': return 'orange'
      case 'settings': return 'indigo'
      case 'system': return 'gray'
      case 'database': return 'cyan'
      default: return 'gray'
    }
  }

  const togglePermission = (permissionId: string) => {
    setSelectedPermissions(prev => {
      if (prev.includes(permissionId)) {
        return prev.filter(p => p !== permissionId)
      } else {
        return [...prev, permissionId]
      }
    })
  }

  const selectAll = (category: string) => {
    const categoryPerms = ALL_PERMISSIONS
      .filter(p => p.category === category)
      .map(p => p.id)
    
    setSelectedPermissions(prev => {
      const withoutCategory = prev.filter(p => !categoryPerms.includes(p))
      return [...withoutCategory, ...categoryPerms]
    })
  }

  const deselectAll = (category: string) => {
    const categoryPerms = ALL_PERMISSIONS
      .filter(p => p.category === category)
      .map(p => p.id)
    
    setSelectedPermissions(prev => prev.filter(p => !categoryPerms.includes(p)))
  }

  const loadRoleDefaults = () => {
    setSelectedPermissions(DEFAULT_ROLE_PERMISSIONS[user.role] || [])
    setCustomMode(false)
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError('')
      await onUpdate(selectedPermissions, customMode)
      onClose()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleAddRole = async () => {
    if (!onAddRole) return
    
    if (!newRole.name.trim()) {
      setError('Role name is required')
      return
    }
    
    if (newRole.permissions.length === 0) {
      setError('At least one permission is required')
      return
    }

    try {
      setAddingRole(true)
      setError('')
      await onAddRole(newRole)
      setShowAddRole(false)
      setNewRole({ name: '', description: '', permissions: [] })
    } catch (error: any) {
      setError(error.message)
    } finally {
      setAddingRole(false)
    }
  }

  const toggleRolePermission = (permissionId: string) => {
    setNewRole(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId]
    }))
  }

  const selectAllRolePermissions = (category: string) => {
    const categoryPerms = ALL_PERMISSIONS
      .filter(p => p.category === category)
      .map(p => p.id)
    
    setNewRole(prev => ({
      ...prev,
      permissions: Array.from(new Set([...prev.permissions, ...categoryPerms]))
    }))
  }

  const clearAllRolePermissions = (category: string) => {
    const categoryPerms = ALL_PERMISSIONS
      .filter(p => p.category === category)
      .map(p => p.id)
    
    setNewRole(prev => ({
      ...prev,
      permissions: prev.permissions.filter(p => !categoryPerms.includes(p))
    }))
  }

  const handleEditUser = async () => {
    if (!onEditUser) return
    
    if (!editUserData.full_name.trim()) {
      setError('Full name is required')
      return
    }
    
    if (!editUserData.email.trim()) {
      setError('Email is required')
      return
    }

    try {
      setEditingUser(true)
      setError('')
      await onEditUser(editUserData)
      setShowEditUser(false)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setEditingUser(false)
    }
  }

  // Group permissions by category
  const permissionsByCategory = ALL_PERMISSIONS.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = []
    }
    acc[permission.category].push(permission)
    return acc
  }, {} as Record<string, Permission[]>)

  const roleDefaults = DEFAULT_ROLE_PERMISSIONS[user.role] || []
  const changesFromDefault = customMode && (
    selectedPermissions.length !== roleDefaults.length ||
    selectedPermissions.some(p => !roleDefaults.includes(p))
  )

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 p-6 z-10">
          <div className="flex items-center justify-between">
            <div className="text-white">
              <h2 className="text-2xl font-bold flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Shield className="h-6 w-6" />
                </div>
                Manage Permissions
              </h2>
              <div className="flex items-center gap-4 text-blue-100">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span className="font-semibold">{user.full_name}</span>
                </div>
                <div className="w-1 h-1 bg-blue-300 rounded-full"></div>
                <span>{user.email}</span>
                <div className="w-1 h-1 bg-blue-300 rounded-full"></div>
                <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                  {user.role.toUpperCase()}
                </span>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={onClose}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Close
            </Button>
          </div>

          {/* Role Info */}
          <div className="mt-4 p-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-white/20 rounded-lg">
                <Settings className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-white mb-1">Role Information</h3>
                <p className="text-blue-100 text-xs leading-relaxed">
                  {getRoleDescription(user.role)}
                </p>
                <div className="mt-2 flex items-center gap-3 text-blue-200 text-xs">
                  <span className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Default permissions: <strong>{getPermissionsCount(user.role)}</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Custom Mode Toggle */}
          <div className="mt-3 p-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  {customMode ? (
                    <Unlock className="h-5 w-5 text-yellow-300" />
                  ) : (
                    <Lock className="h-5 w-5 text-green-300" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="customMode"
                      checked={customMode}
                      onChange={(e) => setCustomMode(e.target.checked)}
                      className="h-4 w-4 text-blue-600 rounded-lg focus:ring-2 focus:ring-white/50"
                    />
                    <label htmlFor="customMode" className="text-base font-semibold text-white cursor-pointer">
                      Enable Custom Permissions
                    </label>
                  </div>
                  <p className="text-blue-100 text-xs mt-1">
                    {customMode 
                      ? '🔓 Custom mode active - You can override role defaults'
                      : '🔒 Using default role permissions'
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {customMode && changesFromDefault && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={loadRoleDefaults}
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Reset to Defaults
                  </Button>
                )}
                
                {/* Edit User Button */}
                {onEditUser && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowEditUser(true)}
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    <UserCog className="h-4 w-4 mr-2" />
                    Edit User
                  </Button>
                )}
                
                {/* Add Role Button */}
                {onAddRole && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowAddRole(true)}
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    <Crown className="h-4 w-4 mr-2" />
                    Add Role
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 bg-gray-50 dark:bg-gray-800/50 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800">
          {error && (
            <Alert variant="error" className="mb-6 rounded-xl border-2">
              {error}
            </Alert>
          )}


          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Shield className="h-5 w-5" />
                </div>
                <span className="text-blue-100 text-xs font-medium">Total</span>
              </div>
              <p className="text-2xl font-bold mb-1">
                {selectedPermissions.length}
              </p>
              <p className="text-blue-100 text-xs">
                of {ALL_PERMISSIONS.length} available
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Plus className="h-5 w-5" />
                </div>
                <span className="text-green-100 text-xs font-medium">Create</span>
              </div>
              <p className="text-2xl font-bold mb-1">
                {selectedPermissions.filter(p => p.includes('.create')).length}
              </p>
              <p className="text-green-100 text-xs">
                Creation permissions
              </p>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Edit className="h-5 w-5" />
                </div>
                <span className="text-orange-100 text-xs font-medium">Edit</span>
              </div>
              <p className="text-2xl font-bold mb-1">
                {selectedPermissions.filter(p => p.includes('.edit')).length}
              </p>
              <p className="text-orange-100 text-xs">
                Modification permissions
              </p>
            </div>

            <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Trash2 className="h-5 w-5" />
                </div>
                <span className="text-red-100 text-xs font-medium">Delete</span>
              </div>
              <p className="text-2xl font-bold mb-1">
                {selectedPermissions.filter(p => p.includes('.delete')).length}
              </p>
              <p className="text-red-100 text-xs">
                Deletion permissions
              </p>
            </div>
          </div>

          {/* Permissions by Category */}
          <div className="space-y-4">
            {Object.entries(permissionsByCategory).map(([category, permissions]) => {
              const Icon = getCategoryIcon(category)
              const color = getCategoryColor(category)
              const categoryPerms = permissions.map(p => p.id)
              const selectedInCategory = selectedPermissions.filter(p => categoryPerms.includes(p)).length
              const totalInCategory = permissions.length
              const allSelected = selectedInCategory === totalInCategory
              const someSelected = selectedInCategory > 0 && selectedInCategory < totalInCategory

              const colorClasses = {
                blue: 'from-blue-500 to-blue-600',
                green: 'from-green-500 to-green-600',
                purple: 'from-purple-500 to-purple-600',
                red: 'from-red-500 to-red-600',
                orange: 'from-orange-500 to-orange-600',
                indigo: 'from-indigo-500 to-indigo-600',
                gray: 'from-gray-500 to-gray-600'
              }

              const bgColorClasses = {
                blue: 'bg-blue-50 dark:bg-blue-900/20',
                green: 'bg-green-50 dark:bg-green-900/20',
                purple: 'bg-purple-50 dark:bg-purple-900/20',
                red: 'bg-red-50 dark:bg-red-900/20',
                orange: 'bg-orange-50 dark:bg-orange-900/20',
                indigo: 'bg-indigo-50 dark:bg-indigo-900/20',
                gray: 'bg-gray-50 dark:bg-gray-900/20'
              }

              const textColorClasses = {
                blue: 'text-blue-600 dark:text-blue-400',
                green: 'text-green-600 dark:text-green-400',
                purple: 'text-purple-600 dark:text-purple-400',
                red: 'text-red-600 dark:text-red-400',
                orange: 'text-orange-600 dark:text-orange-400',
                indigo: 'text-indigo-600 dark:text-indigo-400',
                gray: 'text-gray-600 dark:text-gray-400'
              }

              return (
                <div key={category} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  {/* Category Header */}
                  <div className={`bg-gradient-to-r ${colorClasses[color as keyof typeof colorClasses]} p-4`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg">
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-white capitalize">
                            {category} Permissions
                          </h3>
                          <p className="text-white/80 text-xs">
                            {selectedInCategory} of {totalInCategory} permissions selected
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => selectAll(category)}
                          disabled={allSelected}
                          className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Select All
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deselectAll(category)}
                          disabled={selectedInCategory === 0}
                          className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Clear All
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Permissions Grid */}
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {permissions.map(permission => {
                        const isSelected = selectedPermissions.includes(permission.id)
                        const isInRoleDefaults = roleDefaults.includes(permission.id)
                        
                        return (
                          <div
                            key={permission.id}
                            className={`group p-3 border-2 rounded-lg cursor-pointer transition-all duration-300 hover:shadow-lg ${
                              isSelected
                                ? `border-${color}-400 bg-${color}-50 dark:bg-${color}-900/20 shadow-md`
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                            } ${!customMode ? 'opacity-75' : ''}`}
                            onClick={() => customMode && togglePermission(permission.id)}
                          >
                            <div className="flex items-start gap-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => customMode && togglePermission(permission.id)}
                                disabled={!customMode}
                                className={`h-4 w-4 text-${color}-600 rounded focus:ring-2 focus:ring-${color}-500/50 mt-0.5`}
                              />
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-gray-900 dark:text-white text-xs mb-1">
                                  {permission.name}
                                </h4>
                                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 leading-relaxed">
                                  {permission.description}
                                </p>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`text-xs px-2 py-1 rounded-lg font-medium ${bgColorClasses[color as keyof typeof bgColorClasses]} ${textColorClasses[color as keyof typeof textColorClasses]}`}>
                                    {permission.action}
                                  </span>
                                  {isInRoleDefaults && !customMode && (
                                    <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-lg">
                                      <CheckCircle className="h-3 w-3" />
                                      Default
                                    </span>
                                  )}
                                  {!isInRoleDefaults && isSelected && customMode && (
                                    <span className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-lg">
                                      <AlertTriangle className="h-3 w-3" />
                                      Custom
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Summary */}
          <div className="mt-6 mb-4 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-xl p-6 text-white shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  {customMode ? (
                    <Unlock className="h-6 w-6 text-yellow-300" />
                  ) : (
                    <Lock className="h-6 w-6 text-green-300" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-1">
                    {customMode ? 'Custom Permissions Mode' : 'Default Role Mode'}
                  </h3>
                  <div className="flex items-center gap-3 text-blue-100">
                    <span className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      <strong>{selectedPermissions.length}</strong> permissions selected
                    </span>
                    {customMode && changesFromDefault && (
                      <span className="flex items-center gap-2 text-yellow-200">
                        <AlertTriangle className="h-4 w-4" />
                        <strong>
                          {selectedPermissions.length - roleDefaults.length > 0 ? '+' : ''}
                          {selectedPermissions.length - roleDefaults.length}
                        </strong> from defaults
                      </span>
                    )}
                    {!customMode && (
                      <span className="text-green-200">
                        Using {user.role} role defaults
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={onClose} 
                  disabled={saving}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20 px-4 py-2"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSave} 
                  disabled={saving}
                  className="bg-white text-blue-600 hover:bg-gray-100 px-6 py-2 font-semibold shadow-lg"
                >
                  {saving ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      Saving...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Save Permissions
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="text-center py-4">
            <div className="inline-flex items-center gap-2 text-gray-400 dark:text-gray-500 text-sm">
              <div className="w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div className="w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              <span className="ml-2">Scroll for more content</span>
            </div>
          </div>
        </div>
      </div>

      {/* Add Role Modal */}
      {showAddRole && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-gray-200 dark:border-gray-700">
            {/* Add Role Header */}
            <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 p-6">
              <div className="flex items-center justify-between">
                <div className="text-white">
                  <h2 className="text-2xl font-bold flex items-center gap-3 mb-2">
                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                      <Crown className="h-6 w-6" />
                    </div>
                    Add New Role
                  </h2>
                  <p className="text-green-100 text-sm">
                    Create a custom role with specific permissions
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setShowAddRole(false)}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>

            {/* Add Role Content */}
            <div className="flex-1 p-6 bg-gray-50 dark:bg-gray-800/50 overflow-y-auto">
              {error && (
                <Alert variant="error" className="mb-6 rounded-xl border-2">
                  {error}
                </Alert>
              )}

              {/* Role Details */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 mb-6 shadow-lg">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Settings className="h-5 w-5 text-blue-600" />
                  Role Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Role Name *
                    </label>
                    <input
                      type="text"
                      value={newRole.name}
                      onChange={(e) => setNewRole(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Senior Engineer, Project Lead"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description
                    </label>
                    <input
                      type="text"
                      value={newRole.description}
                      onChange={(e) => setNewRole(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief description of the role"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Role Permissions */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Shield className="h-5 w-5 text-blue-600" />
                    Role Permissions
                  </h3>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {newRole.permissions.length} permissions selected
                  </div>
                </div>

                {/* Permissions by Category */}
                <div className="space-y-4">
                  {Object.entries(permissionsByCategory).map(([category, permissions]) => {
                    const Icon = getCategoryIcon(category)
                    const color = getCategoryColor(category)
                    const categoryPerms = permissions.map(p => p.id)
                    const selectedInCategory = newRole.permissions.filter(p => categoryPerms.includes(p)).length
                    const totalInCategory = permissions.length

                    const colorClasses = {
                      blue: 'from-blue-500 to-blue-600',
                      green: 'from-green-500 to-green-600',
                      purple: 'from-purple-500 to-purple-600',
                      red: 'from-red-500 to-red-600',
                      orange: 'from-orange-500 to-orange-600',
                      indigo: 'from-indigo-500 to-indigo-600',
                      gray: 'from-gray-500 to-gray-600'
                    }

                    const bgColorClasses = {
                      blue: 'bg-blue-50 dark:bg-blue-900/20',
                      green: 'bg-green-50 dark:bg-green-900/20',
                      purple: 'bg-purple-50 dark:bg-purple-900/20',
                      red: 'bg-red-50 dark:bg-red-900/20',
                      orange: 'bg-orange-50 dark:bg-orange-900/20',
                      indigo: 'bg-indigo-50 dark:bg-indigo-900/20',
                      gray: 'bg-gray-50 dark:bg-gray-900/20'
                    }

                    const textColorClasses = {
                      blue: 'text-blue-600 dark:text-blue-400',
                      green: 'text-green-600 dark:text-green-400',
                      purple: 'text-purple-600 dark:text-purple-400',
                      red: 'text-red-600 dark:text-red-400',
                      orange: 'text-orange-600 dark:text-orange-400',
                      indigo: 'text-indigo-600 dark:text-indigo-400',
                      gray: 'text-gray-600 dark:text-gray-400'
                    }

                    return (
                      <div key={category} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                        {/* Category Header */}
                        <div className={`bg-gradient-to-r ${colorClasses[color as keyof typeof colorClasses]} p-4`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-white/20 rounded-lg">
                                <Icon className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <h4 className="text-lg font-semibold text-white capitalize">
                                  {category} Permissions
                                </h4>
                                <p className="text-white/80 text-sm">
                                  {selectedInCategory} of {totalInCategory} selected
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => selectAllRolePermissions(category)}
                                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                All
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => clearAllRolePermissions(category)}
                                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                None
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Permissions Grid */}
                        <div className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {permissions.map(permission => {
                              const isSelected = newRole.permissions.includes(permission.id)
                              
                              return (
                                <div
                                  key={permission.id}
                                  className={`p-3 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
                                    isSelected
                                      ? `border-${color}-400 bg-${color}-50 dark:bg-${color}-900/20 shadow-sm`
                                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                  }`}
                                  onClick={() => toggleRolePermission(permission.id)}
                                >
                                  <div className="flex items-start gap-3">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => toggleRolePermission(permission.id)}
                                      className={`h-4 w-4 text-${color}-600 rounded focus:ring-2 focus:ring-${color}-500/50 mt-0.5`}
                                    />
                                    <div className="flex-1 min-w-0">
                                      <h5 className="font-medium text-gray-900 dark:text-white text-sm mb-1">
                                        {permission.name}
                                      </h5>
                                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 leading-relaxed">
                                        {permission.description}
                                      </p>
                                      <span className={`text-xs px-2 py-1 rounded-lg font-medium ${bgColorClasses[color as keyof typeof bgColorClasses]} ${textColorClasses[color as keyof typeof textColorClasses]}`}>
                                        {permission.action}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Add Role Actions */}
              <div className="mt-6 bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 rounded-2xl p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 rounded-xl">
                      <Crown className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">Ready to Create Role</h3>
                      <p className="text-green-100 text-sm">
                        {newRole.permissions.length} permissions selected for "{newRole.name || 'New Role'}"
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowAddRole(false)}
                      disabled={addingRole}
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleAddRole}
                      disabled={addingRole || !newRole.name.trim() || newRole.permissions.length === 0}
                      className="bg-white text-green-600 hover:bg-gray-100 font-semibold"
                    >
                      {addingRole ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                          Creating...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Save className="h-4 w-4" />
                          Create Role
                        </div>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-gray-200 dark:border-gray-700">
            {/* Edit User Header */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6">
              <div className="flex items-center justify-between">
                <div className="text-white">
                  <h2 className="text-2xl font-bold flex items-center gap-3 mb-2">
                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                      <UserCog className="h-6 w-6" />
                    </div>
                    Edit User Details
                  </h2>
                  <p className="text-blue-100 text-sm">
                    Modify user information and settings
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setShowEditUser(false)}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>

            {/* Edit User Content */}
            <div className="flex-1 p-6 bg-gray-50 dark:bg-gray-800/50 overflow-y-auto">
              {error && (
                <Alert variant="error" className="mb-6 rounded-xl border-2">
                  {error}
                </Alert>
              )}

              {/* User Details Form */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  User Information
                </h3>
                
                <div className="space-y-6">
                  {/* First Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      First Name *
                    </label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        value={editUserData.full_name?.split(' ')[0] || ''}
                        onChange={(e) => {
                          const lastName = editUserData.full_name?.split(' ').slice(1).join(' ') || ''
                          setEditUserData(prev => ({ 
                            ...prev, 
                            full_name: `${e.target.value} ${lastName}`.trim()
                          }))
                        }}
                        placeholder="Enter first name"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Last Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Last Name *
                    </label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        value={editUserData.full_name?.split(' ').slice(1).join(' ') || ''}
                        onChange={(e) => {
                          const firstName = editUserData.full_name?.split(' ')[0] || ''
                          setEditUserData(prev => ({ 
                            ...prev, 
                            full_name: `${firstName} ${e.target.value}`.trim()
                          }))
                        }}
                        placeholder="Enter last name"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email Address *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="email"
                        value={editUserData.email}
                        onChange={(e) => setEditUserData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="Enter email address"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Role */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Role *
                    </label>
                    <div className="relative">
                      <UserCheck className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <select
                        value={editUserData.role}
                        onChange={(e) => setEditUserData(prev => ({ ...prev, role: e.target.value as 'admin' | 'manager' | 'engineer' | 'viewer' }))}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none"
                      >
                        <option value="admin">Admin</option>
                        <option value="manager">Manager</option>
                        <option value="engineer">Engineer</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </div>
                  </div>

                  {/* Division */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Division
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        value={editUserData.division}
                        onChange={(e) => setEditUserData(prev => ({ ...prev, division: e.target.value }))}
                        placeholder="Enter division (optional)"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Active Status */}
                  <div>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={editUserData.is_active}
                        onChange={(e) => setEditUserData(prev => ({ ...prev, is_active: e.target.checked }))}
                        className="h-5 w-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        User is active
                      </span>
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-8">
                      Inactive users cannot log in to the system
                    </p>
                  </div>
                </div>
              </div>

              {/* Edit User Actions */}
              <div className="mt-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 rounded-xl">
                      <UserCog className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">Update User Information</h3>
                      <p className="text-blue-100 text-sm">
                        Changes will be applied to "{editUserData.full_name || 'User'}"
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowEditUser(false)}
                      disabled={editingUser}
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                    >
                      Cancel
                    </Button>
                    {guard.hasAccess('users.create') && (<Button 
                      onClick={handleEditUser}
                      disabled={editingUser || !editUserData.full_name.trim() || !editUserData.email.trim()}
                      className="bg-white text-blue-600 hover:bg-gray-100 font-semibold"
                    >
                      {editingUser ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          Updating...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Save className="h-4 w-4" />
                          Update User
                        </div>
                      )}
                    </Button>)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdvancedPermissionsManager

