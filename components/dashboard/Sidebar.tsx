'use client'

import { Button } from '@/components/ui/Button'
import { 
  LayoutDashboard, 
  FolderOpen, 
  ClipboardList, 
  BarChart3,
  Settings
} from 'lucide-react'
import { clsx } from 'clsx'
import { useCallback } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'

type TabType = 'dashboard' | 'projects' | 'boq' | 'kpi'

interface SidebarProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  userRole: string | undefined
}

const menuItems = [
  {
    id: 'dashboard' as TabType,
    label: 'Dashboard',
    icon: LayoutDashboard,
    permission: 'dashboard.view'
  },
  {
    id: 'projects' as TabType,
    label: 'Project Management',
    icon: FolderOpen,
    permission: 'projects.view'
  },
  {
    id: 'boq' as TabType,
    label: 'Bill of Quantities (BOQ)',
    icon: ClipboardList,
    permission: 'boq.view'
  },
  {
    id: 'kpi' as TabType,
    label: 'Key Performance Indicators (KPI)',
    icon: BarChart3,
    permission: 'kpi.view'
  }
]

export function Sidebar({ activeTab, onTabChange, userRole }: SidebarProps) {
  const guard = usePermissionGuard()
  const filteredMenuItems = menuItems.filter(item => 
    guard.hasAccess(item.permission)
  )

  // Hide sidebar completely if user has no permissions
  if (filteredMenuItems.length === 0) {
    return null
  }

  const handleTabClick = useCallback((tab: TabType) => {
    onTabChange(tab)
  }, [onTabChange])

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 shadow-sm border-l border-gray-200 dark:border-gray-700 min-h-screen">
      <nav className="p-4 space-y-2">
        {filteredMenuItems.map((item) => {
          const Icon = item.icon
          return (
            <Button
              key={item.id}
              variant={activeTab === item.id ? 'primary' : 'ghost'}
              className={clsx(
                'w-full justify-start space-x-3',
                activeTab === item.id && 'bg-primary-50 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
              )}
              onClick={() => handleTabClick(item.id)}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Button>
          )
        })}
      </nav>
    </aside>
  )
}
