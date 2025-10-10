'use client'

import { useState, useEffect, useMemo } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { ModernBadge } from '@/components/ui/ModernBadge'
import { ModernButton } from '@/components/ui/ModernButton'
import {
  ALL_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  Permission,
  UserWithPermissions,
  getRoleDescription,
  getPermissionsCount,
  validatePermissions,
  cleanPermissions
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
  UserCheck,
  Search,
  Filter,
  Grid,
  List,
  Zap,
  Target,
  FolderKanban,
  BarChart3,
  Calendar,
  Globe,
  Key,
  Settings2,
  ChevronDown,
  ChevronRight,
  Copy,
  RotateCcw,
  Check,
  X
} from 'lucide-react'

interface EnhancedPermissionsManagerProps {
  user: UserWithPermissions
  onUpdate: (permissions: string[], customEnabled: boolean) => Promise<void>
  onClose: () => void
  onAddRole?: (roleData: { name: string; description: string; permissions: string[] }) => Promise<void>
  onEditUser?: (userData: { full_name: string; email: string; role: string; division: string; is_active: boolean }) => Promise<void>
}

// Icons for categories
const CATEGORY_ICONS = {
  projects: FolderKanban,
  boq: Target,
  kpi: BarChart3,
  users: Users,
  reports: FileText,
  settings: Settings,
  system: Globe,
  database: Database
}

// Action colors
const ACTION_COLORS = {
  view: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  create: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  edit: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  delete: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  manage: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  export: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  approve: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  backup: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  restore: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200'
}

export function EnhancedPermissionsManager({ user, onUpdate, onClose, onAddRole, onEditUser }: EnhancedPermissionsManagerProps) {
  const guard = usePermissionGuard()
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(() => {
    // Always use user.permissions if available, regardless of custom_permissions_enabled
    const initialPermissions = user.permissions && user.permissions.length > 0
      ? user.permissions 
      : DEFAULT_ROLE_PERMISSIONS[user.role] || []
    console.log('🎯 Initial selectedPermissions:', initialPermissions)
    return initialPermissions
  })
  const [customEnabled, setCustomEnabled] = useState(user.custom_permissions_enabled || false)

  // Update local state when user prop changes (after successful save)
  useEffect(() => {
    console.log('🔄 EnhancedPermissionsManager: User prop changed:', user)
    console.log('📋 User permissions from prop:', user.permissions)
    console.log('📊 User permissions length:', user.permissions?.length)
    
    // Always use user.permissions if available, regardless of custom_permissions_enabled
    // Only fall back to default role permissions if user.permissions is null/empty
    const newPermissions = user.permissions && user.permissions.length > 0
      ? user.permissions 
      : DEFAULT_ROLE_PERMISSIONS[user.role] || []
    
    console.log('🔄 Setting selectedPermissions to:', newPermissions)
    console.log('🔄 Setting customEnabled to:', user.custom_permissions_enabled || false)
    
    setSelectedPermissions(newPermissions)
    setCustomEnabled(user.custom_permissions_enabled || false)
  }, [user, user.permissions, user.custom_permissions_enabled])

  // Monitor selectedPermissions changes
  useEffect(() => {
    console.log('🎯 selectedPermissions state changed to:', selectedPermissions)
    console.log('📊 selectedPermissions length:', selectedPermissions.length)
  }, [selectedPermissions])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedAction, setSelectedAction] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['projects', 'users', 'settings']))
  
  // Role management states
  const [showRoleManager, setShowRoleManager] = useState(false)
  const [newRoleName, setNewRoleName] = useState('')
  const [newRoleDescription, setNewRoleDescription] = useState('')

  // Get unique categories and actions
  const categories = useMemo(() => {
    const cats = Array.from(new Set(ALL_PERMISSIONS.map(p => p.category)))
    return cats.map(cat => ({
      id: cat,
      name: cat.charAt(0).toUpperCase() + cat.slice(1),
      icon: CATEGORY_ICONS[cat as keyof typeof CATEGORY_ICONS],
      count: ALL_PERMISSIONS.filter(p => p.category === cat).length
    }))
  }, [])

  const actions = useMemo(() => {
    const acts = Array.from(new Set(ALL_PERMISSIONS.map(p => p.action)))
    return acts.map(action => ({
      id: action,
      name: action.charAt(0).toUpperCase() + action.slice(1),
      color: ACTION_COLORS[action as keyof typeof ACTION_COLORS]
    }))
  }, [])

  // Filter permissions based on search and filters
  const filteredPermissions = useMemo(() => {
    let filtered = ALL_PERMISSIONS

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower) ||
        p.id.toLowerCase().includes(searchLower)
      )
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category === selectedCategory)
    }

    // Action filter
    if (selectedAction !== 'all') {
      filtered = filtered.filter(p => p.action === selectedAction)
    }

    return filtered
  }, [searchTerm, selectedCategory, selectedAction])

  // Group permissions by category
  const groupedPermissions = useMemo(() => {
    const grouped: Record<string, Permission[]> = {}
    filteredPermissions.forEach(permission => {
      if (!grouped[permission.category]) {
        grouped[permission.category] = []
      }
      grouped[permission.category].push(permission)
    })
    return grouped
  }, [filteredPermissions])

  // Permission statistics
  const permissionStats = useMemo(() => {
    const total = ALL_PERMISSIONS.length
    const selected = selectedPermissions.length
    const byCategory = categories.reduce((acc, cat) => {
      const catPermissions = ALL_PERMISSIONS.filter(p => p.category === cat.id)
      const catSelected = selectedPermissions.filter(id => 
        catPermissions.some(p => p.id === id)
      ).length
      acc[cat.id] = { total: catPermissions.length, selected: catSelected }
      return acc
    }, {} as Record<string, { total: number; selected: number }>)

    return { total, selected, byCategory }
  }, [selectedPermissions, categories])

  const handlePermissionToggle = (permissionId: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    )
  }

  const handleCategoryToggle = (categoryId: string) => {
    const categoryPermissions = ALL_PERMISSIONS
      .filter(p => p.category === categoryId)
      .map(p => p.id)
    
    const allSelected = categoryPermissions.every(id => selectedPermissions.includes(id))
    
    if (allSelected) {
      // Deselect all permissions in this category
      setSelectedPermissions(prev => prev.filter(id => !categoryPermissions.includes(id)))
    } else {
      // Select all permissions in this category
      setSelectedPermissions(prev => {
        const newPermissions = [...prev]
        categoryPermissions.forEach(id => {
          if (!newPermissions.includes(id)) {
            newPermissions.push(id)
          }
        })
        return newPermissions
      })
    }
  }

  const handleSelectAll = () => {
    setSelectedPermissions(ALL_PERMISSIONS.map(p => p.id))
  }

  const handleSelectNone = () => {
    setSelectedPermissions([])
  }

  const handleResetToRole = () => {
    setSelectedPermissions(DEFAULT_ROLE_PERMISSIONS[user.role] || [])
    setCustomEnabled(false)
  }

  const handleSave = async () => {
    try {
      setLoading(true)
      setError('')
      
      // تنظيف الصلاحيات (إزالة التكرارات والترتيب)
      console.log('🧹 Cleaning permissions before save...')
      const cleanedPermissions = cleanPermissions(selectedPermissions)
      console.log('✅ Cleaned permissions:', cleanedPermissions.length)
      
      // التحقق من صحة الصلاحيات
      console.log('🔍 Validating permissions...')
      const validation = validatePermissions(cleanedPermissions)
      
      // عرض التحذيرات إن وجدت
      if (validation.warnings.length > 0) {
        console.warn('⚠️  Validation warnings:', validation.warnings)
        // يمكنك عرض التحذيرات للمستخدم هنا إذا أردت
      }
      
      // إذا كانت هناك أخطاء، أوقف الحفظ
      if (!validation.isValid) {
        console.error('❌ Validation errors:', validation.errors)
        setError(validation.errors.join('\n'))
        return
      }
      
      await onUpdate(cleanedPermissions, customEnabled)
      
      // تحديث الحالة المحلية بالصلاحيات المنظفة
      setSelectedPermissions(cleanedPermissions)
      
      setSuccess('Permissions updated successfully!')
      console.log('✅ EnhancedPermissionsManager: Save completed, showing success message')
      
      // Don't auto-close, let user close manually to see the updated data
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      setError(error.message || 'Failed to update permissions')
    } finally {
      setLoading(false)
    }
  }

  const toggleCategoryExpansion = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId)
      } else {
        newSet.add(categoryId)
      }
      return newSet
    })
  }

  const copyPermissionsToClipboard = () => {
    const permissionsText = selectedPermissions
      .map(id => ALL_PERMISSIONS.find(p => p.id === id)?.name || id)
      .join('\n')
    navigator.clipboard.writeText(permissionsText)
    setSuccess('Permissions copied to clipboard!')
    setTimeout(() => setSuccess(''), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Advanced Permissions Manager
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Managing permissions for {user.full_name} ({user.role})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={copyPermissionsToClipboard} size="sm">
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
            <Button variant="outline" onClick={onClose} size="sm">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Statistics Bar */}
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {permissionStats.selected}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Selected
              </div>
            </div>
            {categories.map(category => {
              const Icon = category.icon
              const stats = permissionStats.byCategory[category.id]
              return (
                <div key={category.id} className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Icon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                      {stats.selected}/{stats.total}
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {category.name}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex h-[calc(90vh-200px)]">
          {/* Sidebar - Filters and Controls */}
          <div className="w-80 bg-gray-50 dark:bg-gray-700/50 border-r border-gray-200 dark:border-gray-700 p-4 overflow-y-auto">
            {/* Search */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search Permissions
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search permissions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name} ({category.count})
                  </option>
                ))}
              </select>
            </div>

            {/* Action Filter */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Action Type
              </label>
              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">All Actions</option>
                {actions.map(action => (
                  <option key={action.id} value={action.id}>
                    {action.name}
                  </option>
                ))}
              </select>
            </div>

            {/* View Mode */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                View Mode
              </label>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'primary' : 'outline'}
                  onClick={() => setViewMode('grid')}
                  size="sm"
                  className="flex-1"
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'primary' : 'outline'}
                  onClick={() => setViewMode('list')}
                  size="sm"
                  className="flex-1"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quick Actions
              </label>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  onClick={handleSelectAll}
                  size="sm"
                  className="w-full justify-start"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Select All
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSelectNone}
                  size="sm"
                  className="w-full justify-start"
                >
                  <X className="h-4 w-4 mr-2" />
                  Select None
                </Button>
                <Button
                  variant="outline"
                  onClick={handleResetToRole}
                  size="sm"
                  className="w-full justify-start"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset to Role
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSave}
                  disabled={loading}
                  size="sm"
                  className="w-full justify-start bg-green-600 hover:bg-green-700 text-white"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Category Quick Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category Quick Select
              </label>
              <div className="space-y-2">
                {categories.map(category => {
                  const Icon = category.icon
                  const stats = permissionStats.byCategory[category.id]
                  const isFullySelected = stats.selected === stats.total
                  const isPartiallySelected = stats.selected > 0 && stats.selected < stats.total
                  
                  return (
                    <Button
                      key={category.id}
                      variant={isFullySelected ? 'primary' : isPartiallySelected ? 'outline' : 'ghost'}
                      onClick={() => handleCategoryToggle(category.id)}
                      size="sm"
                      className="w-full justify-start"
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {category.name}
                      <span className="ml-auto text-xs">
                        {stats.selected}/{stats.total}
                      </span>
                    </Button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Main Content - Permissions */}
          <div className="flex-1 p-4 overflow-y-auto">
            {success && (
              <Alert className="mb-4 bg-green-50 border-green-200 text-green-800">
                <CheckCircle className="h-4 w-4" />
                {success}
              </Alert>
            )}

            {error && (
              <Alert className="mb-4 bg-red-50 border-red-200 text-red-800">
                <AlertTriangle className="h-4 w-4" />
                {error}
              </Alert>
            )}

            {/* Permissions by Category */}
            {Object.entries(groupedPermissions).map(([categoryId, permissions]) => {
              const category = categories.find(c => c.id === categoryId)
              const Icon = category?.icon || Settings
              const isExpanded = expandedCategories.has(categoryId)
              const categoryStats = permissionStats.byCategory[categoryId]
              const isFullySelected = categoryStats.selected === categoryStats.total
              const isPartiallySelected = categoryStats.selected > 0 && categoryStats.selected < categoryStats.total

              return (
                <Card key={categoryId} className="mb-4">
                  <CardHeader 
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    onClick={() => toggleCategoryExpansion(categoryId)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        )}
                        <Icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        <div>
                          <CardTitle className="text-lg">
                            {category?.name || categoryId}
                          </CardTitle>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {permissions.length} permissions
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <ModernBadge 
                          variant={isFullySelected ? 'info' : isPartiallySelected ? 'warning' : 'gray'}
                          size="sm"
                        >
                          {categoryStats.selected}/{categoryStats.total}
                        </ModernBadge>
                        <Button
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCategoryToggle(categoryId)
                          }}
                          size="sm"
                        >
                          {isFullySelected ? 'Deselect All' : 'Select All'}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  {isExpanded && (
                    <CardContent>
                      {viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {permissions.map(permission => (
                            <div
                              key={permission.id}
                              className={`p-3 rounded-lg border transition-all cursor-pointer ${
                                selectedPermissions.includes(permission.id)
                                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                              }`}
                              onClick={() => handlePermissionToggle(permission.id)}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                                  {permission.name}
                                </h4>
                                <ModernBadge
                                  variant="gray"
                                  size="sm"
                                  className={ACTION_COLORS[permission.action]}
                                >
                                  {permission.action}
                                </ModernBadge>
                              </div>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                                {permission.description}
                              </p>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500 dark:text-gray-500 font-mono">
                                  {permission.id}
                                </span>
                                {selectedPermissions.includes(permission.id) ? (
                                  <CheckCircle className="h-4 w-4 text-blue-500" />
                                ) : (
                                  <div className="h-4 w-4 border-2 border-gray-300 dark:border-gray-600 rounded" />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {permissions.map(permission => (
                            <div
                              key={permission.id}
                              className={`p-3 rounded-lg border transition-all cursor-pointer ${
                                selectedPermissions.includes(permission.id)
                                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                              }`}
                              onClick={() => handlePermissionToggle(permission.id)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-1">
                                    <h4 className="font-medium text-gray-900 dark:text-white">
                                      {permission.name}
                                    </h4>
                                    <ModernBadge
                                      variant="gray"
                                      size="sm"
                                      className={ACTION_COLORS[permission.action]}
                                    >
                                      {permission.action}
                                    </ModernBadge>
                                  </div>
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                    {permission.description}
                                  </p>
                                  <span className="text-xs text-gray-500 dark:text-gray-500 font-mono">
                                    {permission.id}
                                  </span>
                                </div>
                                <div className="ml-4">
                                  {selectedPermissions.includes(permission.id) ? (
                                    <CheckCircle className="h-5 w-5 text-blue-500" />
                                  ) : (
                                    <div className="h-5 w-5 border-2 border-gray-300 dark:border-gray-600 rounded" />
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              )
            })}

            {filteredPermissions.length === 0 && (
              <div className="text-center py-12">
                <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No permissions found
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Try adjusting your search or filter criteria
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer - Actions */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="customEnabled"
                checked={customEnabled}
                onChange={(e) => setCustomEnabled(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="customEnabled" className="text-sm text-gray-700 dark:text-gray-300">
                Enable custom permissions
              </label>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {selectedPermissions.length} of {ALL_PERMISSIONS.length} permissions selected
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={onClose} 
              disabled={loading}
              className="min-w-[80px]"
            >
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={handleSave} 
              disabled={loading}
              className="min-w-[140px] bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
