'use client'

import { useState } from 'react'
import { 
  LayoutDashboard, 
  FolderOpen, 
  ClipboardList, 
  BarChart3, 
  FileText, 
  Users, 
  Settings,
  Menu,
  X,
  LogOut,
  User
} from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface ModernSidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
  userName: string
  userRole: string
}

const navigationItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'projects', label: 'Projects', icon: FolderOpen },
  { id: 'boq', label: 'BOQ', icon: ClipboardList },
  { id: 'kpi', label: 'KPI', icon: BarChart3 },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export function ModernSidebar({ activeTab, onTabChange, userName, userRole }: ModernSidebarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleSignOut = async () => {
    const { getSupabaseClient } = await import('@/lib/supabaseConnectionManager')
    const supabase = getSupabaseClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Rabat MVP</h1>
        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigationItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          
          return (
            <button
              key={item.id}
              onClick={() => {
                onTabChange(item.id)
                setIsMobileMenuOpen(false)
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
            <User className="h-5 w-5 text-blue-600 dark:text-blue-300" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {userName}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
              {userRole}
            </p>
          </div>
        </div>
        <Button
          onClick={handleSignOut}
          variant="outline"
          size="sm"
          className="w-full flex items-center gap-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-72 bg-white dark:bg-gray-800 shadow-lg">
        <SidebarContent />
      </div>

      {/* Mobile Sidebar */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-50"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Sidebar */}
          <div className="lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-gray-800 shadow-lg">
            <SidebarContent />
          </div>
        </>
      )}
    </>
  )
}
