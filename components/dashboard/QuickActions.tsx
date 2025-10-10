'use client'

import { useState } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  BarChart3, 
  FileText,
  Settings,
  Users,
  Calendar,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  ClipboardList
} from 'lucide-react'

interface QuickActionsProps {
  onAction?: (action: { type: string; tab?: string; data?: any }) => void
  userRole?: string
  expanded?: boolean
}

export function QuickActions({ onAction, userRole = 'viewer', expanded = false }: QuickActionsProps) {
  const guard = usePermissionGuard()
  const [selectedAction, setSelectedAction] = useState<string | null>(null)

  const getAvailableActions = () => {
    const baseActions = [
      {
        id: 'search',
        title: 'Global Search',
        description: 'Search across all projects, activities, and KPIs',
        icon: Search,
        color: 'blue',
        roles: ['admin', 'manager', 'engineer', 'viewer']
      },
      {
        id: 'filter',
        title: 'Advanced Filters',
        description: 'Apply complex filters to data',
        icon: Filter,
        color: 'green',
        roles: ['admin', 'manager', 'engineer', 'viewer']
      },
      {
        id: 'export',
        title: 'Export Data',
        description: 'Export projects, activities, or KPIs to Excel/CSV',
        icon: Download,
        color: 'purple',
        roles: ['admin', 'manager', 'engineer']
      },
      {
        id: 'import',
        title: 'Import Data',
        description: 'Import new data from CSV files',
        icon: Upload,
        color: 'yellow',
        roles: ['admin', 'manager']
      }
    ]

    const managementActions = [
      {
        id: 'add-project',
        title: 'Add Project',
        description: 'Create a new project',
        icon: Plus,
        color: 'blue',
        roles: ['admin', 'manager'],
        tab: 'projects'
      },
      {
        id: 'add-activity',
        title: 'Add BOQ Activity',
        description: 'Create a new BOQ activity',
        icon: ClipboardList,
        color: 'green',
        roles: ['admin', 'manager', 'engineer'],
        tab: 'boq'
      },
      {
        id: 'add-kpi',
        title: 'Add KPI Record',
        description: 'Create a new KPI record',
        icon: Target,
        color: 'purple',
        roles: ['admin', 'manager', 'engineer'],
        tab: 'kpi'
      }
    ]

    const analyticsActions = [
      {
        id: 'insights',
        title: 'Data Insights',
        description: 'View detailed analytics and trends',
        icon: BarChart3,
        color: 'indigo',
        roles: ['admin', 'manager', 'engineer', 'viewer'],
        tab: 'insights'
      },
      {
        id: 'reports',
        title: 'Generate Reports',
        description: 'Create comprehensive project reports',
        icon: FileText,
        color: 'pink',
        roles: ['admin', 'manager', 'engineer']
      },
      {
        id: 'dashboard',
        title: 'Dashboard View',
        description: 'Return to main dashboard',
        icon: TrendingUp,
        color: 'teal',
        roles: ['admin', 'manager', 'engineer', 'viewer'],
        tab: 'dashboard'
      }
    ]

    const adminActions = [
      {
        id: 'users',
        title: 'Manage Users',
        description: 'Add, edit, or remove users',
        icon: Users,
        color: 'red',
        roles: ['admin']
      },
      {
        id: 'settings',
        title: 'System Settings',
        description: 'Configure system preferences',
        icon: Settings,
        color: 'gray',
        roles: ['admin']
      }
    ]

    return [
      ...baseActions,
      ...managementActions,
      ...analyticsActions,
      ...adminActions
    ].filter(action => action.roles.includes(userRole))
  }

  const actions = getAvailableActions()

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800',
      green: 'bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900 dark:text-green-300 dark:hover:bg-green-800',
      purple: 'bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-900 dark:text-purple-300 dark:hover:bg-purple-800',
      yellow: 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-300 dark:hover:bg-yellow-800',
      indigo: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900 dark:text-indigo-300 dark:hover:bg-indigo-800',
      pink: 'bg-pink-50 text-pink-700 hover:bg-pink-100 dark:bg-pink-900 dark:text-pink-300 dark:hover:bg-pink-800',
      teal: 'bg-teal-50 text-teal-700 hover:bg-teal-100 dark:bg-teal-900 dark:text-teal-300 dark:hover:bg-teal-800',
      red: 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-800',
      gray: 'bg-gray-50 text-gray-700 hover:bg-gray-100 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'
    }
    return colors[color as keyof typeof colors] || colors.blue
  }

  const handleActionClick = (action: any) => {
    setSelectedAction(action.id)
    
    if (onAction) {
      if (action.tab) {
        onAction({ type: 'navigate', tab: action.tab })
      } else {
        onAction({ type: action.id, data: action })
      }
    }

    // Reset selection after a short delay
    setTimeout(() => setSelectedAction(null), 1000)
  }

  const getActionIcon = (icon: any) => {
    return icon
  }

  if (expanded) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>Quick Actions</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {actions.map((action) => {
                const Icon = getActionIcon(action.icon)
                return (
                  <Button
                    key={action.id}
                    variant="outline"
                    className={`h-auto p-4 flex flex-col items-start space-y-2 ${getColorClasses(action.color)} ${
                      selectedAction === action.id ? 'ring-2 ring-primary-500' : ''
                    }`}
                    onClick={() => handleActionClick(action)}
                  >
                    <Icon className="h-5 w-5" />
                    <div className="text-left">
                      <p className="font-medium">{action.title}</p>
                      <p className="text-xs opacity-75">{action.description}</p>
                    </div>
                  </Button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Target className="h-5 w-5" />
          <span>Quick Actions</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {actions.slice(0, 6).map((action) => {
            const Icon = getActionIcon(action.icon)
            return (
              <Button
                key={action.id}
                variant="outline"
                size="sm"
                className={`h-auto p-3 flex flex-col items-center space-y-2 ${getColorClasses(action.color)} ${
                  selectedAction === action.id ? 'ring-2 ring-primary-500' : ''
                }`}
                onClick={() => handleActionClick(action)}
              >
                <Icon className="h-4 w-4" />
                <span className="text-xs font-medium">{action.title}</span>
              </Button>
            )
          })}
        </div>
        {actions.length > 6 && (
          <div className="mt-4 pt-4 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => onAction?.({ type: 'navigate', tab: 'actions' })}
            >
              View All Actions ({actions.length})
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
