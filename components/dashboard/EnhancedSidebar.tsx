'use client'

import { useState, useCallback } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { 
  LayoutDashboard, 
  FolderOpen, 
  ClipboardList, 
  BarChart3,
  Search,
  Filter,
  Settings,
  Users,
  TrendingUp,
  Target,
  Activity,
  Zap,
  Bookmark,
  History,
  Star,
  FileText,
  Download
} from 'lucide-react'
import { clsx } from 'clsx'

type TabType = 'dashboard' | 'projects' | 'boq' | 'kpi' | 'insights' | 'actions' | 'settings' | 'search' | 'reports'

interface EnhancedSidebarProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  userRole: string | undefined
  enhanced?: boolean
}

const mainMenuItems = [
  {
    id: 'dashboard' as TabType,
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['admin', 'manager', 'engineer', 'viewer'],
    description: 'Overview and analytics'
  },
  {
    id: 'projects' as TabType,
    label: 'Projects',
    icon: FolderOpen,
    roles: ['admin', 'manager', 'engineer', 'viewer'],
    description: 'Project management'
  },
  {
    id: 'boq' as TabType,
    label: 'BOQ Activities',
    icon: ClipboardList,
    roles: ['admin', 'manager', 'engineer'],
    description: 'Bill of quantities'
  },
  {
    id: 'kpi' as TabType,
    label: 'KPI Tracking',
    icon: BarChart3,
    roles: ['admin', 'manager', 'engineer'],
    description: 'Performance indicators'
  }
]

const enhancedMenuItems = [
  {
    id: 'insights' as TabType,
    label: 'Data Insights',
    icon: TrendingUp,
    roles: ['admin', 'manager', 'engineer', 'viewer'],
    description: 'Advanced analytics'
  },
  {
    id: 'actions' as TabType,
    label: 'Quick Actions',
    icon: Zap,
    roles: ['admin', 'manager', 'engineer'],
    description: 'Bulk operations'
  },
  {
    id: 'search' as TabType,
    label: 'Global Search',
    icon: Search,
    roles: ['admin', 'manager', 'engineer', 'viewer'],
    description: 'Search everything'
  },
  {
    id: 'reports' as TabType,
    label: 'Advanced Reports',
    icon: FileText,
    roles: ['admin', 'manager', 'engineer'],
    description: 'Daily, Weekly, Monthly reports'
  },
  {
    id: 'settings' as TabType,
    label: 'Settings',
    icon: Settings,
    roles: ['admin', 'manager', 'engineer', 'viewer'],
    description: 'App preferences and user management'
  }
]

export function EnhancedSidebar({ activeTab, onTabChange, userRole, enhanced = false }: EnhancedSidebarProps) {
  const guard = usePermissionGuard()
  const [collapsed, setCollapsed] = useState(false)
  const [showFavorites, setShowFavorites] = useState(false)

  const filteredMainItems = mainMenuItems.filter(item => 
    item.roles.includes(userRole || 'viewer')
  )

  const filteredEnhancedItems = enhanced ? enhancedMenuItems.filter(item => 
    item.roles.includes(userRole || 'viewer')
  ) : []


  const handleTabClick = useCallback((tab: TabType) => {
    onTabChange(tab)
  }, [onTabChange])

  const getRoleColor = (role: string) => {
    const colors = {
      admin: 'text-red-600 bg-red-50',
      manager: 'text-blue-600 bg-blue-50',
      engineer: 'text-green-600 bg-green-50',
      viewer: 'text-gray-600 bg-gray-50'
    }
    return colors[role as keyof typeof colors] || colors.viewer
  }

  const getRoleIcon = (role: string) => {
    const icons = {
      admin: Settings,
      manager: Users,
      engineer: Activity,
      viewer: Target
    }
    return icons[role as keyof typeof icons] || Target
  }

  if (collapsed) {
    return (
      <aside className="w-16 bg-white dark:bg-gray-800 shadow-sm border-l border-gray-200 dark:border-gray-700 min-h-screen">
        <nav className="p-2 space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(false)}
            className="w-full justify-center"
          >
            <LayoutDashboard className="h-4 w-4" />
          </Button>
          
          {filteredMainItems.map((item) => {
            const Icon = item.icon
            return (
              <Button
                key={item.id}
                variant={activeTab === item.id ? 'primary' : 'ghost'}
                size="sm"
                className="w-full justify-center"
                onClick={() => handleTabClick(item.id)}
                title={item.label}
              >
                <Icon className="h-4 w-4" />
              </Button>
            )
          })}
        </nav>
      </aside>
    )
  }

  return (
    <aside className="w-80 bg-white dark:bg-gray-800 shadow-sm border-l border-gray-200 dark:border-gray-700 min-h-screen">
      <nav className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <LayoutDashboard className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">Rabat MVP</h2>
              <p className="text-xs text-gray-500">Project Management</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(true)}
            className="p-1"
          >
            <LayoutDashboard className="h-4 w-4" />
          </Button>
        </div>

        {/* User Role Badge */}
        <Card className="mb-4">
          <CardContent className="p-3">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${getRoleColor(userRole || 'viewer')}`}>
                {(() => {
                  const RoleIcon = getRoleIcon(userRole || 'viewer')
                  return <RoleIcon className="h-4 w-4" />
                })()}
              </div>
              <div>
                <p className="text-sm font-medium capitalize">{userRole || 'viewer'}</p>
                <p className="text-xs text-gray-500">Access Level</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Navigation */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Main</h3>
          {filteredMainItems.map((item) => {
            const Icon = item.icon
            return (
              <Button
                key={item.id}
                variant={activeTab === item.id ? 'primary' : 'ghost'}
                className={clsx(
                  'w-full justify-start space-x-3 h-auto p-3',
                  activeTab === item.id && 'bg-primary-50 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                )}
                onClick={() => handleTabClick(item.id)}
              >
                <Icon className="h-5 w-5" />
                <div className="text-left">
                  <span className="font-medium">{item.label}</span>
                  <p className="text-xs opacity-75">{item.description}</p>
                </div>
              </Button>
            )
          })}
        </div>

        {/* Enhanced Features */}
        {enhanced && filteredEnhancedItems.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Enhanced</h3>
            {filteredEnhancedItems.map((item) => {
              const Icon = item.icon
              return (
                <Button
                  key={item.id}
                  variant={activeTab === item.id ? 'primary' : 'ghost'}
                  className={clsx(
                    'w-full justify-start space-x-3 h-auto p-3',
                    activeTab === item.id && 'bg-primary-50 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                  )}
                  onClick={() => handleTabClick(item.id)}
                >
                  <Icon className="h-5 w-5" />
                  <div className="text-left">
                    <span className="font-medium">{item.label}</span>
                    <p className="text-xs opacity-75">{item.description}</p>
                  </div>
                </Button>
              )
            })}
          </div>
        )}


        {/* Quick Stats */}
        <Card className="mt-6">
          <CardContent className="p-3">
            <h4 className="text-sm font-medium mb-2">Quick Stats</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">Active Projects</span>
                <span className="font-medium">12</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Pending Tasks</span>
                <span className="font-medium">8</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Overdue Items</span>
                <span className="font-medium text-red-600">3</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Keyboard Shortcuts */}
        <Card className="mt-4">
          <CardContent className="p-3">
            <h4 className="text-sm font-medium mb-2">Shortcuts</h4>
            <div className="space-y-1 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Search</span>
                <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Ctrl+K</kbd>
              </div>
              <div className="flex justify-between">
                <span>Dashboard</span>
                <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Ctrl+D</kbd>
              </div>
              <div className="flex justify-between">
                <span>Projects</span>
                <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Ctrl+P</kbd>
              </div>
            </div>
          </CardContent>
        </Card>
      </nav>
    </aside>
  )
}
