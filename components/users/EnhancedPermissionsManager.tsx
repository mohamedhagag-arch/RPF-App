'use client'

import { useState, useEffect, useMemo } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
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
  X,
  Bell,
  Download,
  History,
  TrendingUp,
  Activity
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
  database: Database,
  'cost-control': DollarSign,
  hr: UserCheck
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
  const supabase = getSupabaseClient()
  
  // State for custom roles and default role overrides from database
  const [customRoles, setCustomRoles] = useState<Record<string, { name: string; permissions: string[] }>>({})
  const [defaultRoleOverrides, setDefaultRoleOverrides] = useState<Record<string, string[]>>({})
  
  // Helper function to check if a role key is a default role override
  const isDefaultRoleOverride = (roleKey: string): boolean => {
    return roleKey.startsWith('__default_override__')
  }
  
  // Helper function to extract original role key from override key
  const extractOriginalRoleKey = (overrideKey: string): string => {
    return overrideKey.replace('__default_override__', '')
  }
  
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
    // Only fall back to default role permissions (with overrides) if user.permissions is null/empty
    const getRolePermissions = () => {
      // Check if we have overrides loaded
      if (defaultRoleOverrides[user.role]) {
        return defaultRoleOverrides[user.role]
      }
      return DEFAULT_ROLE_PERMISSIONS[user.role] || []
    }
    
    const newPermissions = user.permissions && user.permissions.length > 0
      ? user.permissions 
      : getRolePermissions()
    
    console.log('🔄 Setting selectedPermissions to:', newPermissions)
    console.log('🔄 Setting customEnabled to:', user.custom_permissions_enabled || false)
    
    setSelectedPermissions(newPermissions)
    setCustomEnabled(user.custom_permissions_enabled || false)
  }, [user, user.permissions, user.custom_permissions_enabled, defaultRoleOverrides])

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
  
  // Advanced Features States
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [showAuditLog, setShowAuditLog] = useState(false)
  const [showExportOptions, setShowExportOptions] = useState(false)
  
  // Role management states
  const [showRoleManager, setShowRoleManager] = useState(false)
  const [newRoleName, setNewRoleName] = useState('')
  const [showSaveAsRoleModal, setShowSaveAsRoleModal] = useState(false)
  const [newRoleNameForSave, setNewRoleNameForSave] = useState('')
  const [newRoleDescriptionForSave, setNewRoleDescriptionForSave] = useState('')
  const [newRoleDescription, setNewRoleDescription] = useState('')
  const [rolesVersion, setRolesVersion] = useState(0) // Force re-render of availableRoles

  // Get unique categories and actions
  const categories = useMemo(() => {
    const cats = Array.from(new Set(ALL_PERMISSIONS.map(p => p.category)))
    return cats.map(cat => ({
      id: cat,
      name: cat.charAt(0).toUpperCase() + cat.slice(1).replace(/-/g, ' '),
      icon: CATEGORY_ICONS[cat as keyof typeof CATEGORY_ICONS] || Settings,
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
    // ✅ تفعيل custom mode تلقائياً عند تغيير أي صلاحية
    if (!customEnabled) {
      setCustomEnabled(true)
      console.log('✅ Custom mode enabled automatically (permission toggle)')
    }
    
    setSelectedPermissions(prev => 
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    )
  }

  const handleCategoryToggle = (categoryId: string) => {
    // ✅ تفعيل custom mode تلقائياً
    if (!customEnabled) {
      setCustomEnabled(true)
      console.log('✅ Custom mode enabled automatically (category toggle)')
    }
    
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
    // ✅ تفعيل custom mode تلقائياً
    if (!customEnabled) {
      setCustomEnabled(true)
      console.log('✅ Custom mode enabled automatically (select all)')
    }
    setSelectedPermissions(ALL_PERMISSIONS.map(p => p.id))
  }

  const handleSelectNone = () => {
    // ✅ تفعيل custom mode تلقائياً
    if (!customEnabled) {
      setCustomEnabled(true)
      console.log('✅ Custom mode enabled automatically (select none)')
    }
    setSelectedPermissions([])
  }

  const handleResetToRole = async (roleName?: string) => {
    try {
      const role = roleName || user.role
      const roleKey = role.toLowerCase().replace(/\s+/g, '_')
      
      // Get permissions from default roles or custom roles
      let permissions: string[] = []
      let roleDisplayName = roleKey
      
      // Check default roles first (with overrides from state)
      if (DEFAULT_ROLE_PERMISSIONS[roleKey]) {
        // Use override if exists, otherwise use default
        permissions = defaultRoleOverrides[roleKey] || DEFAULT_ROLE_PERMISSIONS[roleKey]
        roleDisplayName = roleKey
      } else if (DEFAULT_ROLE_PERMISSIONS[role]) {
        permissions = defaultRoleOverrides[role] || DEFAULT_ROLE_PERMISSIONS[role]
        roleDisplayName = role
      } else if (customRoles[roleKey]) {
        // Check custom roles from database
        permissions = customRoles[roleKey].permissions
        roleDisplayName = customRoles[roleKey].name
      } else if (customRoles[role]) {
        permissions = customRoles[role].permissions
        roleDisplayName = customRoles[role].name
      }
      
      setSelectedPermissions(permissions)
      setCustomEnabled(false)
      setSuccess(`Reset to "${roleDisplayName}" role with ${permissions.length} permissions`)
    } catch (error: any) {
      console.error('Error resetting to role:', error)
      // Fallback to default permissions (with overrides)
      const role = roleName || user.role
      const roleKey = role.toLowerCase().replace(/\s+/g, '_')
      const permissions = defaultRoleOverrides[roleKey] || defaultRoleOverrides[role] || DEFAULT_ROLE_PERMISSIONS[roleKey] || DEFAULT_ROLE_PERMISSIONS[role] || []
      setSelectedPermissions(permissions)
      setCustomEnabled(false)
      setError('Failed to load updated role permissions. Using default permissions.')
    }
  }

  // ✅ Apply role completely - update user.role in database and apply permissions
  const handleApplyRole = async (roleKey: string) => {
    try {
      setLoading(true)
      setError('')
      
      // Get permissions from default roles (with overrides) or custom roles
      let permissions: string[] = []
      let roleDisplayName = roleKey
      
      // Check default roles first (with overrides)
      if (DEFAULT_ROLE_PERMISSIONS[roleKey]) {
        // Use override if exists, otherwise use default
        permissions = defaultRoleOverrides[roleKey] || DEFAULT_ROLE_PERMISSIONS[roleKey]
        roleDisplayName = roleKey
      } else if (customRoles[roleKey]) {
        // Check custom roles from database
        permissions = customRoles[roleKey].permissions
        roleDisplayName = customRoles[roleKey].name
      } else {
        setError(`Role "${roleKey}" not found`)
        setLoading(false)
        return
      }

      // Update user role in database using onEditUser callback
      if (onEditUser) {
        await onEditUser({
          full_name: user.full_name,
          email: user.email,
          role: roleKey, // ✅ Update to new role key
          division: user.division || '',
          is_active: user.is_active !== false
        })
      }

      // Update permissions
      await onUpdate(permissions, false) // false = disable custom_permissions_enabled

      // Update local state
      setSelectedPermissions(permissions)
      setCustomEnabled(false)

      setSuccess(`✅ Role "${roleDisplayName}" applied successfully! User role updated and ${permissions.length} permissions applied.`)
      setLoading(false)
      
      // Show success message for 3 seconds
      setTimeout(() => {
        setSuccess('')
      }, 3000)
    } catch (error: any) {
      console.error('Error applying role:', error)
      setError(error.message || 'Failed to apply role')
      setLoading(false)
    }
  }

  const handleSaveAsRole = async () => {
    if (!newRoleNameForSave.trim()) {
      setError('Role name is required')
      return
    }

    const roleKey = newRoleNameForSave.toLowerCase().replace(/\s+/g, '_')
    
    // Check if role already exists
    if (DEFAULT_ROLE_PERMISSIONS[roleKey]) {
      if (!confirm(`Role "${newRoleNameForSave}" already exists. Do you want to overwrite it?`)) {
        return
      }
    }

    try {
      setLoading(true)
      setError('')
      
      // ✅ Save to database using Supabase
      const roleData = {
        role_key: roleKey,
        role_name: newRoleNameForSave,
        description: newRoleDescriptionForSave || `Custom role with ${selectedPermissions.length} permissions`,
        permissions: selectedPermissions,
        created_by: user.id
      }

      // Check if role already exists
      const { data: existingRole } = await (supabase as any)
        .from('custom_roles')
        .select('id')
        .eq('role_key', roleKey)
        .single()

      let result
      if (existingRole) {
        // Update existing role
        const { data, error } = await (supabase as any)
          .from('custom_roles')
          .update({
            role_name: newRoleNameForSave,
            description: newRoleDescriptionForSave || `Custom role with ${selectedPermissions.length} permissions`,
            permissions: selectedPermissions,
            updated_at: new Date().toISOString()
          })
          .eq('role_key', roleKey)
          .select()
          .single()

        if (error) throw error
        result = data
      } else {
        // Insert new role
        const { data, error } = await (supabase as any)
          .from('custom_roles')
          .insert([roleData])
          .select()
          .single()

        if (error) throw error
        result = data
      }

      // Update local state
      setCustomRoles(prev => ({
        ...prev,
        [roleKey]: {
          name: newRoleNameForSave,
          permissions: selectedPermissions
        }
      }))

      // Also add to DEFAULT_ROLE_PERMISSIONS for immediate use
      DEFAULT_ROLE_PERMISSIONS[roleKey] = [...selectedPermissions]
      
      // Call onAddRole callback if provided
      if (onAddRole) {
        await onAddRole({
          name: newRoleNameForSave,
          description: newRoleDescriptionForSave || `Custom role with ${selectedPermissions.length} permissions`,
          permissions: selectedPermissions
        })
      }

      setSuccess(`Role "${newRoleNameForSave}" saved successfully to database!`)
      setShowSaveAsRoleModal(false)
      setNewRoleNameForSave('')
      setNewRoleDescriptionForSave('')
      setLoading(false)
      
      // Force update availableRoles by incrementing version
      setRolesVersion(prev => prev + 1)
      
      // Reload custom roles from database to ensure sync
      await loadCustomRoles()
      
      // Show success message for 3 seconds
      setTimeout(() => {
        setSuccess('')
      }, 3000)
    } catch (error: any) {
      console.error('Error saving role to database:', error)
      
      // Check if table doesn't exist
      if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
        setError('Custom roles table does not exist. Please run the SQL script: Database/create-custom-roles-table.sql')
      } else {
        setError(error.message || 'Failed to save role to database')
      }
      setLoading(false)
    }
  }

  const [loadingRoles, setLoadingRoles] = useState(false)

  // Load custom roles and default role overrides from database
  const loadCustomRoles = async () => {
    try {
      setLoadingRoles(true)
      const { data, error } = await (supabase as any)
        .from('custom_roles')
        .select('role_key, role_name, permissions')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading custom roles:', error)
        // If table doesn't exist, return empty (will be handled gracefully)
        if (error.code === 'PGRST116') {
          console.warn('Custom roles table does not exist yet. Run the SQL script to create it.')
          return
        }
        throw error
      }

      // Convert array to object for easy lookup
      const rolesMap: Record<string, { name: string; permissions: string[] }> = {}
      const overridesMap: Record<string, string[]> = {}
      
      if (data) {
        data.forEach((role: any) => {
          if (isDefaultRoleOverride(role.role_key)) {
            // This is a default role override
            const originalKey = extractOriginalRoleKey(role.role_key)
            if (DEFAULT_ROLE_PERMISSIONS[originalKey]) {
              overridesMap[originalKey] = role.permissions || []
            }
          } else {
            // This is a custom role
            rolesMap[role.role_key] = {
              name: role.role_name,
              permissions: role.permissions || []
            }
          }
        })
      }

      setCustomRoles(rolesMap)
      setDefaultRoleOverrides(overridesMap)
      console.log('✅ Loaded custom roles from database:', Object.keys(rolesMap).length)
      console.log('✅ Loaded default role overrides:', Object.keys(overridesMap).length)
    } catch (error: any) {
      console.error('Error loading custom roles:', error)
    } finally {
      setLoadingRoles(false)
    }
  }

  // Load custom roles and overrides on mount and when rolesVersion changes
  useEffect(() => {
    loadCustomRoles()
  }, [rolesVersion])

  // Get all available roles (including custom roles from database)
  const availableRoles = useMemo(() => {
    // Merge default roles with overrides and custom roles from database
    const allRoles: Record<string, string[]> = {}
    
    // Start with default roles, but apply overrides if they exist
    Object.keys(DEFAULT_ROLE_PERMISSIONS).forEach(key => {
      allRoles[key] = defaultRoleOverrides[key] || DEFAULT_ROLE_PERMISSIONS[key]
    })
    
    // Add custom roles (exclude overrides)
    Object.keys(customRoles).forEach(key => {
      // Only add if it's not a default role override
      if (!isDefaultRoleOverride(key) && !DEFAULT_ROLE_PERMISSIONS[key]) {
        allRoles[key] = customRoles[key].permissions
      }
    })
    
    return Object.keys(allRoles).map(key => ({
      key,
      name: customRoles[key]?.name || key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')
    })).sort((a, b) => {
      // Sort: default roles first, then custom roles
      const isDefaultA = DEFAULT_ROLE_PERMISSIONS[a.key] ? 0 : 1
      const isDefaultB = DEFAULT_ROLE_PERMISSIONS[b.key] ? 0 : 1
      if (isDefaultA !== isDefaultB) return isDefaultA - isDefaultB
      return a.name.localeCompare(b.name)
    })
  }, [customRoles, defaultRoleOverrides, rolesVersion]) // Re-compute when customRoles, overrides, or rolesVersion changes

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

  // Export permissions to CSV
  const exportPermissionsToCSV = () => {
    if (!guard.hasAccess('users.export')) {
      setError('You do not have permission to export permissions')
      return
    }

    const data = selectedPermissions.map(id => {
      const permission = ALL_PERMISSIONS.find(p => p.id === id)
      return {
        id: permission?.id || id,
        name: permission?.name || id,
        category: permission?.category || 'unknown',
        action: permission?.action || 'unknown',
        description: permission?.description || ''
      }
    })

    const csvContent = [
      'ID,Name,Category,Action,Description',
      ...data.map(row => `"${row.id}","${row.name}","${row.category}","${row.action}","${row.description}"`)
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `permissions_${user.email}_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    setSuccess('Permissions exported successfully!')
    setTimeout(() => setSuccess(''), 2000)
  }

  // Export permissions to JSON
  const exportPermissionsToJSON = () => {
    if (!guard.hasAccess('users.export')) {
      setError('You do not have permission to export permissions')
      return
    }

    const data = {
      user: {
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        custom_permissions_enabled: customEnabled
      },
      permissions: selectedPermissions.map(id => {
        const permission = ALL_PERMISSIONS.find(p => p.id === id)
        return {
          id: permission?.id || id,
          name: permission?.name || id,
          category: permission?.category || 'unknown',
          action: permission?.action || 'unknown',
          description: permission?.description || ''
        }
      }),
      export_date: new Date().toISOString(),
      total_permissions: selectedPermissions.length
    }

    const jsonContent = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonContent], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `permissions_${user.email}_${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    setSuccess('Permissions exported successfully!')
    setTimeout(() => setSuccess(''), 2000)
  }

  // Get permission analytics
  const getPermissionAnalytics = () => {
    const analytics = {
      total: selectedPermissions.length,
      byCategory: categories.reduce((acc, cat) => {
        const catPermissions = ALL_PERMISSIONS.filter(p => p.category === cat.id)
        const catSelected = selectedPermissions.filter(id =>
          catPermissions.some(p => p.id === id)
        ).length
        acc[cat.id] = {
          total: catPermissions.length,
          selected: catSelected,
          percentage: catPermissions.length > 0 ? (catSelected / catPermissions.length) * 100 : 0
        }
        return acc
      }, {} as Record<string, { total: number; selected: number; percentage: number }>),
      byAction: actions.reduce((acc, act) => {
        const actPermissions = ALL_PERMISSIONS.filter(p => p.action === act.id)
        const actSelected = selectedPermissions.filter(id =>
          actPermissions.some(p => p.id === id)
        ).length
        acc[act.id] = {
          total: actPermissions.length,
          selected: actSelected,
          percentage: actPermissions.length > 0 ? (actSelected / actPermissions.length) * 100 : 0
        }
        return acc
      }, {} as Record<string, { total: number; selected: number; percentage: number }>),
      coverage: (selectedPermissions.length / ALL_PERMISSIONS.length) * 100
    }
    return analytics
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-hidden relative">
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
            {guard.hasAccess('analytics.view') && (
              <Button 
                variant="outline" 
                onClick={() => setShowAnalytics(!showAnalytics)} 
                size="sm"
                className="flex items-center gap-2"
              >
                <BarChart3 className="h-4 w-4" />
                Analytics
              </Button>
            )}
            {guard.hasAccess('system.audit') && (
              <Button 
                variant="outline" 
                onClick={() => setShowAuditLog(!showAuditLog)} 
                size="sm"
                className="flex items-center gap-2"
              >
                <History className="h-4 w-4" />
                Audit Log
              </Button>
            )}
            {guard.hasAccess('users.export') && (
              <Button 
                variant="outline" 
                onClick={() => setShowExportOptions(!showExportOptions)} 
                size="sm"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
            )}
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
              const Icon = category.icon || Settings
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

        {/* Analytics Panel */}
        {showAnalytics && guard.hasAccess('analytics.view') && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Permission Analytics
              </h3>
              <Button variant="outline" size="sm" onClick={() => setShowAnalytics(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {(() => {
              const analytics = getPermissionAnalytics()
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="bg-white dark:bg-gray-800">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Total Coverage</p>
                          <p className="text-2xl font-bold text-blue-600">{analytics.coverage.toFixed(1)}%</p>
                        </div>
                        <Activity className="h-8 w-8 text-blue-500" />
                      </div>
                    </CardContent>
                  </Card>
                  {Object.entries(analytics.byCategory).slice(0, 3).map(([catId, stats]) => {
                    const category = categories.find(c => c.id === catId)
                    const Icon = category?.icon || Settings
                    return (
                      <Card key={catId} className="bg-white dark:bg-gray-800">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{category?.name || catId}</p>
                              <p className="text-2xl font-bold text-green-600">{stats.percentage.toFixed(1)}%</p>
                              <p className="text-xs text-gray-500">{stats.selected}/{stats.total}</p>
                            </div>
                            <Icon className="h-8 w-8 text-green-500" />
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )
            })()}
          </div>
        )}

        {/* Export Options Dropdown */}
        {showExportOptions && guard.hasAccess('users.export') && (
          <div className="absolute right-4 top-24 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-[60] p-2 min-w-[200px]">
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  exportPermissionsToCSV()
                  setShowExportOptions(false)
                }}
                className="w-full justify-start"
              >
                <Download className="h-4 w-4 mr-2" />
                Export as CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  exportPermissionsToJSON()
                  setShowExportOptions(false)
                }}
                className="w-full justify-start"
              >
                <Download className="h-4 w-4 mr-2" />
                Export as JSON
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  copyPermissionsToClipboard()
                  setShowExportOptions(false)
                }}
                className="w-full justify-start"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy to Clipboard
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExportOptions(false)}
                className="w-full justify-start"
              >
                <X className="h-4 w-4 mr-2" />
                Close
              </Button>
            </div>
          </div>
        )}

        {/* Audit Log Panel */}
        {showAuditLog && guard.hasAccess('system.audit') && (
          <div className="p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <History className="h-5 w-5" />
                Permission Change History
              </h3>
              <Button variant="outline" size="sm" onClick={() => setShowAuditLog(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-center py-8">
                <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  Audit log feature will track all permission changes for this user.
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                  This feature requires audit logging to be enabled in the database.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex h-[calc(90vh-200px)]">
          {/* Sidebar - Filters and Controls */}
          <div className="w-80 bg-gray-50 dark:bg-gray-700/50 border-r border-gray-200 dark:border-gray-700 p-4 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
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
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Select Role to Apply
                  </label>
                  <select
                    onChange={async (e) => {
                      if (e.target.value && e.target.value !== user.role) {
                        // Apply the new role completely (update user.role + permissions)
                        await handleApplyRole(e.target.value)
                      } else if (e.target.value === user.role) {
                        // Just reset permissions to current role
                        handleResetToRole(e.target.value)
                      }
                    }}
                    value={user.role}
                    disabled={loading}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {availableRoles.map(role => (
                      <option key={role.key} value={role.key}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    onClick={() => handleResetToRole()}
                    disabled={loading}
                    size="sm"
                    className="w-full justify-start"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset Permissions Only
                  </Button>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowSaveAsRoleModal(true)}
                  size="sm"
                  className="w-full justify-start"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save As Role
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
                  const Icon = category.icon || Settings
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
                      {/* KPI Notifications Info */}
                      {categoryId === 'kpi' && (
                        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                          <div className="flex items-start gap-2">
                            <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                                KPI Notifications System
                              </p>
                              <p className="text-xs text-blue-700 dark:text-blue-300">
                                Users with <strong>kpi.approve</strong> permission will receive notifications when engineers create new Actual KPIs. Configure notification recipients in <strong>Settings → KPI Notifications</strong>.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      
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
                          {/* KPI Notifications Info for List View */}
                          {categoryId === 'kpi' && (
                            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                              <div className="flex items-start gap-2">
                                <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                                    KPI Notifications System
                                  </p>
                                  <p className="text-xs text-blue-700 dark:text-blue-300">
                                    Users with <strong>kpi.approve</strong> permission will receive notifications when engineers create new Actual KPIs. Configure notification recipients in <strong>Settings → KPI Notifications</strong>.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
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

      {/* Save As Role Modal */}
      {showSaveAsRoleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Save className="h-5 w-5" />
              Save Permissions as New Role
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert className="bg-red-50 border-red-200 text-red-800">
                <AlertTriangle className="h-4 w-4" />
                {error}
              </Alert>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Role Name *
              </label>
              <Input
                type="text"
                value={newRoleNameForSave}
                onChange={(e) => setNewRoleNameForSave(e.target.value)}
                placeholder="e.g., Custom Manager, Project Lead"
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                Will be saved as: {newRoleNameForSave.toLowerCase().replace(/\s+/g, '_') || '...'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={newRoleDescriptionForSave}
                onChange={(e) => setNewRoleDescriptionForSave(e.target.value)}
                placeholder="Describe this role's purpose and responsibilities"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                rows={3}
              />
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <strong>{selectedPermissions.length}</strong> permissions will be saved with this role.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outline"
                onClick={() => {
                  setShowSaveAsRoleModal(false)
                  setNewRoleNameForSave('')
                  setNewRoleDescriptionForSave('')
                  setError('')
                }}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveAsRole}
                disabled={loading || !newRoleNameForSave.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Role
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
        </div>
      )}
    </div>
  )
}
