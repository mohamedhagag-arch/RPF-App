'use client'

import { useState, useEffect, useMemo } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { getSupabaseClient, executeQuery } from '@/lib/simpleConnectionManager'
import { useAuth } from '@/app/providers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  ALL_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  Permission
} from '@/lib/permissionsSystem'
import { 
  Shield, 
  Plus, 
  Edit, 
  Trash2, 
  Search,
  Save,
  X,
  CheckCircle,
  XCircle,
  Key,
  Users,
  Eye,
  Lock,
  Settings,
  Filter,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Square,
  Info,
  BarChart3,
  Sparkles,
  Copy
} from 'lucide-react'

interface CustomRole {
  id: string
  role_key: string
  role_name: string
  description?: string
  permissions: string[]
  created_by?: string
  created_at?: string
  updated_at?: string
}

interface RoleFormData {
  role_name: string
  description: string
  permissions: string[]
}

export function RolesManagement() {
  const guard = usePermissionGuard()
  const { appUser } = useAuth()
  const supabase = getSupabaseClient()
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  
  // Roles data
  const [defaultRoles, setDefaultRoles] = useState<Record<string, string[]>>(DEFAULT_ROLE_PERMISSIONS)
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([])
  const [editingDefaultRole, setEditingDefaultRole] = useState<string | null>(null) // Track which default role is being edited
  const [cloningRole, setCloningRole] = useState<string | null>(null) // Track which role is being cloned
  
  // Form states
  const [showForm, setShowForm] = useState(false)
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null)
  const [formData, setFormData] = useState<RoleFormData>({
    role_name: '',
    description: '',
    permissions: []
  })
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [permissionSearchTerm, setPermissionSearchTerm] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  
  // Permission categories
  const permissionCategories = Array.from(new Set(ALL_PERMISSIONS.map(p => p.category))).sort() as string[]
  
  // Group permissions by category
  const permissionsByCategory = useMemo(() => {
    const grouped: Record<string, Permission[]> = {}
    ALL_PERMISSIONS.forEach(permission => {
      if (!grouped[permission.category]) {
        grouped[permission.category] = []
      }
      grouped[permission.category].push(permission)
    })
    return grouped
  }, [])
  
  // Check permissions
  const canManageRoles = guard.hasAccess('users.permissions') || appUser?.role === 'admin'
  
  // Load custom roles and default role overrides from database
  useEffect(() => {
    if (canManageRoles) {
      loadCustomRoles()
      loadDefaultRoleOverrides()
    }
  }, [canManageRoles])
  
  // Helper function to create default role override key
  const getDefaultRoleOverrideKey = (roleKey: string): string => {
    return `__default_override__${roleKey}`
  }
  
  // Helper function to check if a role key is a default role override
  const isDefaultRoleOverride = (roleKey: string): boolean => {
    return roleKey.startsWith('__default_override__')
  }
  
  // Helper function to extract original role key from override key
  const extractOriginalRoleKey = (overrideKey: string): string => {
    return overrideKey.replace('__default_override__', '')
  }
  
  const loadDefaultRoleOverrides = async () => {
    try {
      // Load all custom roles and filter for default role overrides
      const { data, error } = await (supabase as any)
        .from('custom_roles')
        .select('*')
      
      if (error) {
        // If error is about missing column, just return (use defaults)
        if (error.message?.includes('column') || error.message?.includes('schema')) {
          console.warn('Schema issue detected, using default roles only')
          return
        }
        throw error
      }
      
      if (data && data.length > 0) {
        const overrides: Record<string, string[]> = {}
        
        // Find roles that are default role overrides (using prefix)
        data.forEach((role: any) => {
          if (isDefaultRoleOverride(role.role_key)) {
            const originalKey = extractOriginalRoleKey(role.role_key)
            // Only apply if it's a valid default role
            if (DEFAULT_ROLE_PERMISSIONS[originalKey]) {
              overrides[originalKey] = role.permissions || []
            }
          }
        })
        
        // Merge with default roles
        if (Object.keys(overrides).length > 0) {
          setDefaultRoles(prev => ({
            ...DEFAULT_ROLE_PERMISSIONS,
            ...overrides
          }))
        }
      }
    } catch (err: any) {
      console.error('Error loading default role overrides:', err)
      // Don't show error to user, just use defaults
    }
  }
  
  const loadCustomRoles = async () => {
    try {
      setLoading(true)
      setError('')
      
      const { data, error: fetchError } = await (supabase as any)
        .from('custom_roles')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (fetchError) throw fetchError
      
      // Filter out default role overrides (roles with __default_override__ prefix)
      const filteredData = (data || []).filter((role: any) => !isDefaultRoleOverride(role.role_key))
      
      setCustomRoles(filteredData as CustomRole[])
    } catch (err: any) {
      console.error('Error loading custom roles:', err)
      setError(err.message || 'Failed to load custom roles')
    } finally {
      setLoading(false)
    }
  }
  
  // Get filtered permissions by category and search
  const getFilteredPermissions = () => {
    let filtered = ALL_PERMISSIONS
    
    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(p => p.category === selectedCategory)
    }
    
    // Filter by search term
    if (permissionSearchTerm) {
      const search = permissionSearchTerm.toLowerCase()
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(search) ||
        p.id.toLowerCase().includes(search) ||
        (p.description && p.description.toLowerCase().includes(search))
      )
    }
    
    return filtered
  }
  
  // Get permission statistics
  const permissionStats = useMemo(() => {
    const total = ALL_PERMISSIONS.length
    const selected = formData.permissions.length
    const percentage = total > 0 ? Math.round((selected / total) * 100) : 0
    
    // Stats by category
    const byCategory: Record<string, { total: number; selected: number }> = {}
    permissionCategories.forEach(category => {
      const categoryPerms = permissionsByCategory[category] || []
      const selectedInCategory = categoryPerms.filter((p: Permission) => formData.permissions.includes(p.id)).length
      byCategory[category] = {
        total: categoryPerms.length,
        selected: selectedInCategory
      }
    })
    
    return { total, selected, percentage, byCategory }
  }, [formData.permissions, permissionCategories, permissionsByCategory])
  
  // Toggle category expansion
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }
  
  // Get filtered roles
  const getFilteredRoles = () => {
    const allRoles = [
      ...Object.keys(defaultRoles).map(key => ({
        key,
        name: key.charAt(0).toUpperCase() + key.slice(1),
        type: 'default' as const,
        permissions: defaultRoles[key],
        description: `Default system role: ${key}`
      })),
      ...customRoles.map(role => ({
        key: role.role_key,
        name: role.role_name,
        type: 'custom' as const,
        permissions: role.permissions,
        description: role.description || ''
      }))
    ]
    
    if (!searchTerm) return allRoles
    
    const search = searchTerm.toLowerCase()
    return allRoles.filter(role => 
      role.name.toLowerCase().includes(search) ||
      role.key.toLowerCase().includes(search) ||
      role.description?.toLowerCase().includes(search)
    )
  }
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.role_name.trim()) {
      setError('Role name is required')
      return
    }
    
    if (formData.permissions.length === 0) {
      setError('At least one permission must be selected')
      return
    }
    
    try {
      setLoading(true)
      setError('')
      setSuccess('')
      
      if (editingDefaultRole) {
        // Update default role - save to custom_roles table with special prefix
        // IMPORTANT: Keep the original role key, don't allow changing it
        const originalRoleKey = editingDefaultRole.toLowerCase()
        const overrideKey = getDefaultRoleOverrideKey(originalRoleKey)
        
        // Use the original role name (capitalized)
        const originalRoleName = originalRoleKey.charAt(0).toUpperCase() + originalRoleKey.slice(1)
        
        // Check if override already exists
        const { data: existingRoles, error: checkError } = await (supabase as any)
          .from('custom_roles')
          .select('id')
          .eq('role_key', overrideKey)
          .maybeSingle()
        
        if (checkError && !checkError.message?.includes('No rows')) {
          throw checkError
        }
        
        const overrideData = {
          role_key: overrideKey,
          role_name: originalRoleName, // Keep original role name
          description: formData.description.trim() || `Default role override: ${originalRoleKey}`,
          permissions: formData.permissions,
          updated_at: new Date().toISOString()
        }
        
        if (existingRoles) {
          // Update existing override
          const { error: updateError } = await (supabase as any)
            .from('custom_roles')
            .update(overrideData as any)
            .eq('id', existingRoles.id)
          
          if (updateError) throw updateError
        } else {
          // Create new override
          const { error: insertError } = await (supabase as any)
            .from('custom_roles')
            .insert([{
              ...overrideData,
              created_by: appUser?.id || null
            }] as any)
          
          if (insertError) throw insertError
        }
        
        // Update local state
        setDefaultRoles(prev => ({
          ...prev,
          [originalRoleKey]: formData.permissions
        }))
        
        setSuccess('Default role updated successfully!')
        
        // Clear role overrides cache to force reload
        try {
          const { clearDefaultRoleOverridesCache } = await import('@/lib/permissionsSystem')
          clearDefaultRoleOverridesCache()
        } catch (err) {
          console.warn('⚠️ Could not clear role overrides cache:', err)
        }
      } else if (editingRole) {
        // Update existing custom role
        const roleKey = formData.role_name.toLowerCase().replace(/\s+/g, '_')
        
        const roleData = {
          role_key: roleKey,
          role_name: formData.role_name.trim(),
          description: formData.description.trim() || null,
          permissions: formData.permissions,
          updated_at: new Date().toISOString()
        }
        
        const { error: updateError } = await (supabase as any)
          .from('custom_roles')
          .update(roleData as any)
          .eq('id', editingRole.id)
        
        if (updateError) throw updateError
        setSuccess('Role updated successfully!')
      } else {
        // Create new custom role (or clone)
        const roleKey = formData.role_name.toLowerCase().replace(/\s+/g, '_')
        
        const roleData = {
          role_key: roleKey,
          role_name: formData.role_name.trim(),
          description: formData.description.trim() || null,
          permissions: formData.permissions,
          updated_at: new Date().toISOString()
        }
        
        // Check if role key already exists
        const { data: existing } = await (supabase as any)
          .from('custom_roles')
          .select('id')
          .eq('role_key', roleKey)
          .maybeSingle()
        
        if (existing) {
          throw new Error(`Role with key "${roleKey}" already exists`)
        }
        
        // Check if it conflicts with default roles or override keys
        if (defaultRoles[roleKey]) {
          throw new Error(`Role key "${roleKey}" conflicts with a default system role`)
        }
        if (isDefaultRoleOverride(roleKey)) {
          throw new Error(`Role key "${roleKey}" is reserved for system use`)
        }
        
        
        // Create new role
        const { error: insertError } = await (supabase as any)
          .from('custom_roles')
          .insert([{
            ...roleData,
            created_by: appUser?.id || null
          }] as any)
        
        if (insertError) throw insertError
        setSuccess('Role created successfully!')
      }
      
      // Reset form
      setFormData({
        role_name: '',
        description: '',
        permissions: []
      })
      setEditingRole(null)
      setShowForm(false)
      
      // Reload roles
      await loadCustomRoles()
      
    } catch (err: any) {
      console.error('Error saving role:', err)
      setError(err.message || 'Failed to save role')
    } finally {
      setLoading(false)
    }
  }
  
  // Handle delete role
  const handleDeleteRole = async (role: CustomRole) => {
    if (!confirm(`Are you sure you want to delete role "${role.role_name}"? This action cannot be undone.`)) {
      return
    }
    
    try {
      setLoading(true)
      setError('')
      
      // Check if any users are using this role
      const { data: usersWithRole, error: checkError } = await (supabase as any)
        .from('users')
        .select('id, email, full_name')
        .eq('role', role.role_key)
        .limit(5)
      
      if (checkError) throw checkError
      
      if (usersWithRole && usersWithRole.length > 0) {
        const userList = usersWithRole.map((u: any) => u.email).join(', ')
        setError(`Cannot delete role. ${usersWithRole.length} user(s) are using this role: ${userList}`)
        setLoading(false)
        return
      }
      
      // Delete role
      const { error: deleteError } = await (supabase as any)
        .from('custom_roles')
        .delete()
        .eq('id', role.id)
      
      if (deleteError) throw deleteError
      
      setSuccess('Role deleted successfully!')
      await loadCustomRoles()
      
    } catch (err: any) {
      console.error('Error deleting role:', err)
      setError(err.message || 'Failed to delete role')
    } finally {
      setLoading(false)
    }
  }
  
  // Handle edit role
  const handleEditRole = (role: CustomRole) => {
    setEditingRole(role)
    setEditingDefaultRole(null)
    setFormData({
      role_name: role.role_name,
      description: role.description || '',
      permissions: [...role.permissions]
    })
    setShowForm(true)
  }
  
  // Handle edit default role
  const handleEditDefaultRole = (roleKey: string) => {
    setEditingDefaultRole(roleKey)
    setEditingRole(null)
    setCloningRole(null)
    const roleName = roleKey.charAt(0).toUpperCase() + roleKey.slice(1)
    setFormData({
      role_name: roleName,
      description: `Default system role: ${roleKey}`,
      permissions: [...defaultRoles[roleKey]]
    })
    setShowForm(true)
  }
  
  // Handle clone role (create a copy as a new custom role)
  const handleCloneRole = (roleKey: string, roleType: 'default' | 'custom') => {
    setCloningRole(roleKey)
    setEditingDefaultRole(null)
    setEditingRole(null)
    
    let roleName = ''
    let description = ''
    let permissions: string[] = []
    
    if (roleType === 'default') {
      roleName = `${roleKey.charAt(0).toUpperCase() + roleKey.slice(1)} Copy`
      description = `Copy of default role: ${roleKey}`
      permissions = [...defaultRoles[roleKey]]
    } else {
      const customRole = customRoles.find(r => r.role_key === roleKey)
      if (customRole) {
        roleName = `${customRole.role_name} Copy`
        description = `Copy of ${customRole.role_name}`
        permissions = [...customRole.permissions]
      }
    }
    
    setFormData({
      role_name: roleName,
      description,
      permissions
    })
    setShowForm(true)
  }
  
  // Handle new role
  const handleNewRole = () => {
    setEditingRole(null)
    setEditingDefaultRole(null)
    setFormData({
      role_name: '',
      description: '',
      permissions: []
    })
    setShowForm(true)
  }
  
  // Toggle permission
  const togglePermission = (permissionId: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId]
    }))
  }
  
  // Toggle category permissions
  const toggleCategoryPermissions = (category: string) => {
    const categoryPermissions = ALL_PERMISSIONS
      .filter(p => p.category === category)
      .map(p => p.id)
    
    const allSelected = categoryPermissions.every(p => formData.permissions.includes(p))
    
    setFormData(prev => ({
      ...prev,
      permissions: allSelected
        ? prev.permissions.filter(p => !categoryPermissions.includes(p))
        : Array.from(new Set([...prev.permissions, ...categoryPermissions]))
    }))
  }
  
  // Get permission name
  const getPermissionName = (permissionId: string) => {
    return ALL_PERMISSIONS.find(p => p.id === permissionId)?.name || permissionId
  }
  
  // Get permission category
  const getPermissionCategory = (permissionId: string) => {
    return ALL_PERMISSIONS.find(p => p.id === permissionId)?.category || 'other'
  }
  
  // Get role permission count
  const getRolePermissionCount = (permissions: string[]) => {
    return permissions.length
  }
  
  if (!canManageRoles) {
    return (
      <div className="p-6">
        <Alert variant="error">
          You don't have permission to manage roles.
        </Alert>
      </div>
    )
  }
  
  const filteredRoles = getFilteredRoles()
  const filteredPermissions = getFilteredPermissions()
  
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Shield className="h-8 w-8 text-blue-600" />
            Roles Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage system roles and permissions. Create custom roles or modify existing ones.
          </p>
        </div>
        {guard.hasAccess('users.permissions') && (
          <Button
            onClick={handleNewRole}
            className="flex items-center gap-2"
            disabled={loading}
          >
            <Plus className="h-4 w-4" />
            Create New Role
          </Button>
        )}
      </div>
      
      {/* Alerts */}
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
      
      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search roles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Roles List */}
      {loading && !customRoles.length ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRoles.map(role => (
            <Card key={role.key} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Shield className={`h-5 w-5 ${role.type === 'default' ? 'text-blue-600' : 'text-green-600'}`} />
                      {role.name}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      {role.type === 'default' ? (
                        <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                          Default
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                          Custom
                        </span>
                      )}
                      <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                        {getRolePermissionCount(role.permissions)} permissions
                      </span>
                    </div>
                  </div>
                  {(role.type === 'custom' || role.type === 'default') && (guard.hasAccess('users.permissions') || appUser?.role === 'admin') && (
                    <div className="flex items-center gap-2">
                      {role.type === 'default' ? (
                        <>
                          <Button
                            variant="outline"
                            onClick={() => handleEditDefaultRole(role.key)}
                            className="h-9 w-9 p-0 !px-0 flex items-center justify-center border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                            title="Edit Default Role"
                          >
                            <Edit className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleCloneRole(role.key, 'default')}
                            className="h-9 w-9 p-0 !px-0 flex items-center justify-center border-blue-300 dark:border-blue-600 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            title="Clone as Custom Role"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            onClick={() => handleEditRole(customRoles.find(r => r.role_key === role.key)!)}
                            className="h-9 w-9 p-0 !px-0 flex items-center justify-center border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                            title="Edit Role"
                          >
                            <Edit className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleCloneRole(role.key, 'custom')}
                            className="h-9 w-9 p-0 !px-0 flex items-center justify-center border-blue-300 dark:border-blue-600 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            title="Clone Role"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleDeleteRole(customRoles.find(r => r.role_key === role.key)!)}
                            className="h-9 w-9 p-0 !px-0 flex items-center justify-center border-red-300 dark:border-red-600 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            title="Delete Role"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {role.description || 'No description'}
                </p>
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Key: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">{role.key}</code>
                  </div>
                  {role.type === 'default' && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                      Default role - can be modified but not deleted.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          
          {filteredRoles.length === 0 && (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">No roles found</p>
            </div>
          )}
        </div>
      )}
      
      {/* Role Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="w-full max-w-5xl max-h-[95vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            {/* Enhanced Header */}
            <div className="relative bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white p-6">
              <div className="absolute inset-0 bg-black/10"></div>
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                    <Shield className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">
                      {editingDefaultRole ? 'Edit Default Role' : cloningRole ? 'Clone Role' : editingRole ? 'Edit Role' : 'Create New Role'}
                    </h2>
                    <p className="text-blue-100 text-sm mt-1">
                      {editingDefaultRole 
                        ? 'Modify default role permissions (changes apply to all users with this role)' 
                        : cloningRole 
                        ? 'Create a copy of this role as a new custom role' 
                        : editingRole 
                        ? 'Modify role permissions and settings' 
                        : 'Define a new role with custom permissions'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowForm(false)
                    setEditingRole(null)
                    setEditingDefaultRole(null)
                    setCloningRole(null)
                    setFormData({ role_name: '', description: '', permissions: [] })
                    setPermissionSearchTerm('')
                    setSelectedCategory('')
                    setExpandedCategories(new Set())
                  }}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  aria-label="Close"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Role Name */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Role Name <span className="text-red-500">*</span>
                    {editingDefaultRole && (
                      <span className="ml-2 text-xs text-yellow-600 dark:text-yellow-400">
                        (Cannot be changed for default roles)
                      </span>
                    )}
                  </label>
                  <Input
                    value={formData.role_name}
                    onChange={(e) => {
                      if (!editingDefaultRole) {
                        setFormData({ ...formData, role_name: e.target.value })
                      }
                    }}
                    placeholder="e.g., Project Manager, Site Engineer"
                    required
                    disabled={loading || !!editingDefaultRole}
                    className="text-base"
                  />
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <Key className="h-3 w-3" />
                    <span>Role key:</span>
                    <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-mono">
                      {formData.role_name.toLowerCase().replace(/\s+/g, '_') || 'role_key'}
                    </code>
                  </div>
                </div>
                
                {/* Description */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the role and its responsibilities..."
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white resize-none"
                    rows={3}
                    disabled={loading}
                  />
                </div>
                
                {/* Permissions Section Header */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Permissions <span className="text-red-500">*</span>
                        </h3>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            <span className="font-bold text-blue-600 dark:text-blue-400">{permissionStats.selected}</span> of{' '}
                            <span className="font-medium">{permissionStats.total}</span> selected
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
                                style={{ width: `${permissionStats.percentage}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                              {permissionStats.percentage}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setFormData({ ...formData, permissions: [] })}
                        className="flex items-center gap-2"
                      >
                        <Square className="h-4 w-4" />
                        Clear All
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setFormData({ ...formData, permissions: ALL_PERMISSIONS.map(p => p.id) })}
                        className="flex items-center gap-2"
                      >
                        <CheckSquare className="h-4 w-4" />
                        Select All
                      </Button>
                    </div>
                  </div>
                  
                  {/* Category Filter and Search */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="relative">
                      <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white text-sm"
                      >
                        <option value="">All Categories</option>
                        {permissionCategories.map(category => {
                          const stats = permissionStats.byCategory[category]
                          return (
                            <option key={category} value={category}>
                              {category.charAt(0).toUpperCase() + category.slice(1)} ({stats.selected}/{stats.total})
                            </option>
                          )
                        })}
                      </select>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="text"
                        placeholder="Search permissions..."
                        value={permissionSearchTerm}
                        onChange={(e) => setPermissionSearchTerm(e.target.value)}
                        className="pl-10 text-sm"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Permissions List by Category */}
                <div className="space-y-3">
                  {(selectedCategory 
                    ? [selectedCategory] 
                    : permissionCategories
                  ).map(category => {
                    const categoryPerms = (selectedCategory 
                      ? getFilteredPermissions()
                      : permissionsByCategory[category]
                    ).filter((p: Permission) => !selectedCategory || p.category === category)
                    
                    if (categoryPerms.length === 0) return null
                    
                    const stats = permissionStats.byCategory[category]
                    const allSelected = categoryPerms.every((p: Permission) => formData.permissions.includes(p.id))
                    const someSelected = categoryPerms.some((p: Permission) => formData.permissions.includes(p.id))
                    const isExpanded = expandedCategories.has(category) || selectedCategory === category
                    
                    return (
                      <div key={category} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                        {/* Category Header */}
                        <button
                          type="button"
                          onClick={() => toggleCategory(category)}
                          className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {isExpanded ? (
                              <ChevronDown className="h-5 w-5 text-gray-500" />
                            ) : (
                              <ChevronUp className="h-5 w-5 text-gray-500" />
                            )}
                            <span className="font-semibold text-gray-900 dark:text-white capitalize">
                              {category}
                            </span>
                            <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full font-medium">
                              {stats.selected}/{stats.total}
                            </span>
                            {allSelected && (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            )}
                            {someSelected && !allSelected && (
                              <div className="h-4 w-4 border-2 border-blue-500 rounded" />
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleCategoryPermissions(category)
                            }}
                            className="flex items-center gap-1"
                          >
                            {allSelected ? (
                              <>
                                <Square className="h-3 w-3" />
                                Deselect
                              </>
                            ) : (
                              <>
                                <CheckSquare className="h-3 w-3" />
                                Select All
                              </>
                            )}
                          </Button>
                        </button>
                        
                        {/* Category Permissions */}
                        {isExpanded && (
                          <div className="p-4 space-y-2 bg-white dark:bg-gray-900">
                            {categoryPerms.map((permission: Permission) => {
                              const isChecked = formData.permissions.includes(permission.id)
                              return (
                                <label
                                  key={permission.id}
                                  className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                                    isChecked
                                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                                      : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                                  }`}
                                >
                                  <div className="mt-0.5">
                                    {isChecked ? (
                                      <CheckSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                    ) : (
                                      <Square className="h-5 w-5 text-gray-400" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className={`font-medium text-sm ${
                                        isChecked 
                                          ? 'text-blue-900 dark:text-blue-100' 
                                          : 'text-gray-900 dark:text-white'
                                      }`}>
                                        {permission.name}
                                      </span>
                                      {isChecked && (
                                        <span className="px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                                          Selected
                                        </span>
                                      )}
                                    </div>
                                    {permission.description && (
                                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                                        {permission.description}
                                      </p>
                                    )}
                                    <code className="text-xs text-gray-400 dark:text-gray-500 font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                                      {permission.id}
                                    </code>
                                  </div>
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => togglePermission(permission.id)}
                                    className="sr-only"
                                  />
                                </label>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  
                  {getFilteredPermissions().length === 0 && (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                      <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No permissions found matching your search</p>
                    </div>
                  )}
                </div>
                
              </form>
            </div>
            
            {/* Footer */}
            <div className="flex items-center justify-between p-6 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Info className="h-4 w-4" />
                  <span>
                    <span className="font-semibold text-gray-900 dark:text-white">{permissionStats.selected}</span> permissions selected
                  </span>
                </div>
                {formData.permissions.length === 0 && (
                  <span className="text-xs text-red-500 font-medium">
                    At least one permission is required
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false)
                    setEditingRole(null)
                    setEditingDefaultRole(null)
                    setCloningRole(null)
                    setFormData({ role_name: '', description: '', permissions: [] })
                    setPermissionSearchTerm('')
                    setSelectedCategory('')
                    setExpandedCategories(new Set())
                  }}
                  disabled={loading}
                  className="px-6"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={loading || formData.permissions.length === 0}
                  className="px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/50 flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {editingDefaultRole 
                    ? 'Update Default Role' 
                    : cloningRole 
                    ? 'Create Cloned Role' 
                    : editingRole 
                    ? 'Update Role' 
                    : 'Create Role'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

