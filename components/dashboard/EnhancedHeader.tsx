'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/app/providers'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { User } from '@/lib/supabase'
import { 
  LogOut, 
  User as UserIcon, 
  Bell, 
  Settings,
  Search,
  Filter,
  Download,
  Upload,
  HelpCircle,
  Moon,
  Sun,
  Maximize2,
  Minimize2
} from 'lucide-react'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { EnhancedSearch } from '@/components/ui/EnhancedSearch'

interface EnhancedHeaderProps {
  user: User | null
  globalSearchTerm?: string
  onGlobalSearchChange?: (term: string) => void
  globalFilters?: {
    project: string
    status: string
    division: string
    dateRange: string
  }
  onGlobalFiltersChange?: (filters: any) => void
}

export function EnhancedHeader({ 
  user, 
  globalSearchTerm = '', 
  onGlobalSearchChange,
  globalFilters = { project: '', status: '', division: '', dateRange: '' },
  onGlobalFiltersChange
}: EnhancedHeaderProps) {
  const { signOut } = useAuth()
  const [notifications, setNotifications] = useState(3)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showSearch, setShowSearch] = useState(false)

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin': return 'System Administrator'
      case 'manager': return 'Project Manager'
      case 'engineer': return 'Engineer'
      case 'viewer': return 'Viewer'
      default: return role
    }
  }

  const getRoleColor = (role: string) => {
    const colors = {
      admin: 'text-red-600 bg-red-50',
      manager: 'text-blue-600 bg-blue-50',
      engineer: 'text-green-600 bg-green-50',
      viewer: 'text-gray-600 bg-gray-50'
    }
    return colors[role as keyof typeof colors] || colors.viewer
  }

  const handleSearch = (term: string, filters: any) => {
    if (onGlobalSearchChange) {
      onGlobalSearchChange(term)
    }
    if (onGlobalFiltersChange) {
      onGlobalFiltersChange(filters)
    }
  }

  const handleResultSelect = (result: any) => {
    // Handle search result selection
    console.log('Selected result:', result)
  }

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left Section - Logo and Search */}
          <div className="flex items-center space-x-4 flex-1">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <UserIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Project Management System
                </h1>
                <p className="text-sm text-gray-500">Rabat MVP</p>
              </div>
            </div>

            {/* Global Search */}
            <div className="flex-1 max-w-md">
              <EnhancedSearch
                onSearch={handleSearch}
                onResultSelect={handleResultSelect}
                placeholder="Search projects, activities, KPIs..."
                className="w-full"
              />
            </div>
          </div>

          {/* Center Section - Quick Actions */}
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSearch(!showSearch)}
              className="hidden md:flex"
            >
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="hidden md:flex"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="hidden md:flex"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="hidden md:flex"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
          </div>

          {/* Right Section - User Info and Actions */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <Button
              variant="ghost"
              size="sm"
              className="relative"
            >
              <Bell className="h-4 w-4" />
              {notifications > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {notifications}
                </span>
              )}
            </Button>

            {/* Fullscreen Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              className="hidden md:flex"
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>

            {/* Help */}
            <Button
              variant="ghost"
              size="sm"
              className="hidden md:flex"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* User Info */}
            <div className="flex items-center space-x-3">
              <div className="text-right hidden md:block">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {user?.full_name}
                </p>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user?.role || 'viewer')}`}>
                    {getRoleDisplayName(user?.role || 'viewer')}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-2"
                >
                  <UserIcon className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-2"
                >
                  <Settings className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={signOut}
                  className="flex items-center space-x-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden md:inline">Sign Out</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Search Bar */}
        {showSearch && (
          <div className="mt-4 md:hidden">
            <EnhancedSearch
              onSearch={handleSearch}
              onResultSelect={handleResultSelect}
              placeholder="Search..."
              className="w-full"
            />
          </div>
        )}
      </div>

      {/* Global Filters Bar */}
      {(globalFilters.project || globalFilters.status || globalFilters.division) && (
        <div className="px-6 py-2 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4 text-sm">
            <span className="text-gray-600 dark:text-gray-400">Active Filters:</span>
            
            {globalFilters.project && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                Project: {globalFilters.project}
              </span>
            )}
            
            {globalFilters.status && (
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                Status: {globalFilters.status}
              </span>
            )}
            
            {globalFilters.division && (
              <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                Division: {globalFilters.division}
              </span>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onGlobalFiltersChange?.({ project: '', status: '', division: '', dateRange: '' })}
              className="text-xs"
            >
              Clear All
            </Button>
          </div>
        </div>
      )}
    </header>
  )
}
