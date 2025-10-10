'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { 
  Crown, 
  Shield, 
  Users, 
  Settings, 
  Eye, 
  Edit, 
  Trash2, 
  Plus,
  FileText,
  BarChart3,
  Database,
  Building
} from 'lucide-react'
import { DEFAULT_ROLE_PERMISSIONS, getRoleDescription } from '@/lib/permissionsSystem'

interface RoleInfoPanelProps {
  role: string
  isSelected?: boolean
  permissions?: string[]
  showDetails?: boolean
}

export function RoleInfoPanel({ 
  role, 
  isSelected = false, 
  permissions = [], 
  showDetails = true 
}: RoleInfoPanelProps) {
  const rolePermissions = permissions.length > 0 ? permissions : DEFAULT_ROLE_PERMISSIONS[role as keyof typeof DEFAULT_ROLE_PERMISSIONS] || []
  
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown className="h-5 w-5 text-red-600" />
      case 'manager': return <Users className="h-5 w-5 text-yellow-600" />
      case 'engineer': return <Shield className="h-5 w-5 text-green-600" />
      case 'viewer': return <Eye className="h-5 w-5 text-gray-600" />
      default: return <Shield className="h-5 w-5 text-gray-600" />
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-700'
      case 'manager': return 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-700'
      case 'engineer': return 'border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-700'
      case 'viewer': return 'border-gray-200 bg-gray-50 dark:bg-gray-900/20 dark:border-gray-700'
      default: return 'border-gray-200 bg-gray-50 dark:bg-gray-900/20 dark:border-gray-700'
    }
  }

  const getBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'manager': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'engineer': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'viewer': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const getPermissionIcon = (permission: string) => {
    if (permission.includes('projects')) return <Building className="h-3 w-3" />
    if (permission.includes('boq')) return <FileText className="h-3 w-3" />
    if (permission.includes('kpi')) return <BarChart3 className="h-3 w-3" />
    if (permission.includes('reports')) return <FileText className="h-3 w-3" />
    if (permission.includes('users')) return <Users className="h-3 w-3" />
    if (permission.includes('settings')) return <Settings className="h-3 w-3" />
    if (permission.includes('database')) return <Database className="h-3 w-3" />
    return <Shield className="h-3 w-3" />
  }

  const getPermissionColor = (permission: string) => {
    if (permission.includes('.create')) return 'text-green-600 dark:text-green-400'
    if (permission.includes('.edit')) return 'text-blue-600 dark:text-blue-400'
    if (permission.includes('.delete')) return 'text-red-600 dark:text-red-400'
    if (permission.includes('.view')) return 'text-gray-600 dark:text-gray-400'
    return 'text-purple-600 dark:text-purple-400'
  }

  const groupedPermissions = rolePermissions.reduce((acc, permission) => {
    const category = permission.split('.')[0]
    if (!acc[category]) acc[category] = []
    acc[category].push(permission)
    return acc
  }, {} as Record<string, string[]>)

  return (
    <Card className={`${getRoleColor(role)} ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-3">
          {getRoleIcon(role)}
          <div>
            <div className="flex items-center space-x-2">
              <span className="capitalize">{role}</span>
              <Badge className={getBadgeColor(role)}>
                {rolePermissions.length} permissions
              </Badge>
            </div>
            <p className="text-sm font-normal text-gray-600 dark:text-gray-400 mt-1">
              {getRoleDescription(role)}
            </p>
          </div>
        </CardTitle>
      </CardHeader>
      
      {showDetails && (
        <CardContent>
          <div className="space-y-4">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <Eye className="h-4 w-4 text-gray-500" />
                <span>View: {rolePermissions.filter(p => p.includes('.view')).length}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Plus className="h-4 w-4 text-green-500" />
                <span>Create: {rolePermissions.filter(p => p.includes('.create')).length}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Edit className="h-4 w-4 text-blue-500" />
                <span>Edit: {rolePermissions.filter(p => p.includes('.edit')).length}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Trash2 className="h-4 w-4 text-red-500" />
                <span>Delete: {rolePermissions.filter(p => p.includes('.delete')).length}</span>
              </div>
            </div>

            {/* Grouped Permissions */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">Permissions by Category:</h4>
              {Object.entries(groupedPermissions).map(([category, permissions]) => (
                <div key={category} className="space-y-1">
                  <div className="flex items-center space-x-2">
                    {getPermissionIcon(category + '.view')}
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                      {category}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {permissions.length}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-1 ml-5">
                    {permissions.map((permission) => (
                      <div key={permission} className="flex items-center space-x-1 text-xs">
                        <span className={getPermissionColor(permission)}>
                          {getPermissionIcon(permission)}
                        </span>
                        <span className="text-gray-600 dark:text-gray-400">
                          {permission.split('.')[1] || permission}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
