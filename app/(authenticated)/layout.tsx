'use client'

import { useAuth } from '@/app/providers'
import { useRouter, usePathname } from 'next/navigation'
// import { ModernSidebar } from '@/components/dashboard/ModernSidebar' // ✅ Removed - file deleted
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useEffect, useState } from 'react'
// import { ThemeToggle } from '@/components/ui/ThemeToggle' // ✅ Removed - file deleted
import { LogOut, User } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabaseConnectionManager'
import { ConnectionMonitor } from '@/components/common/ConnectionMonitor'

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, appUser, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const supabase = getSupabaseClient() // ✅ Use managed connection

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !loading && !user) {
      router.push('/')
    }
  }, [user, loading, mounted, router])

  const getCurrentTab = () => {
    if (pathname === '/dashboard') return 'dashboard'
    if (pathname === '/projects') return 'projects'
    if (pathname === '/boq') return 'boq'
    if (pathname === '/kpi') return 'kpi'
    if (pathname === '/settings') return 'settings'
    if (pathname === '/users') return 'users'
    if (pathname === '/reports') return 'reports'
    if (pathname === '/import-export') return 'import-export'
    return 'dashboard'
  }

  const handleTabChange = (tab: string) => {
    router.push(`/${tab}`)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-gray-800 shadow-lg">
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Rabat MVP</h1>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            <button
              onClick={() => handleTabChange('dashboard')}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                getCurrentTab() === 'dashboard'
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => handleTabChange('projects')}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                getCurrentTab() === 'projects'
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Projects
            </button>
            <button
              onClick={() => handleTabChange('boq')}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                getCurrentTab() === 'boq'
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              BOQ
            </button>
            <button
              onClick={() => handleTabChange('kpi')}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                getCurrentTab() === 'kpi'
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              KPI
            </button>
            <button
              onClick={() => handleTabChange('reports')}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                getCurrentTab() === 'reports'
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Reports
            </button>
            <button
              onClick={() => handleTabChange('users')}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                getCurrentTab() === 'users'
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Users
            </button>
            <button
              onClick={() => handleTabChange('settings')}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                getCurrentTab() === 'settings'
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Settings
            </button>
          </nav>
          
          {/* User Info */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-3">
              <User className="h-8 w-8 text-gray-600 dark:text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {appUser?.full_name || user?.email || 'User'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {appUser?.role || 'viewer'}
                </p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:pl-72">
        {/* Top Bar */}
        <div className="sticky top-0 z-30 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="lg:hidden">
                {/* Mobile menu button handled by sidebar */}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <User className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {appUser?.full_name || user?.email}
                </span>
              </div>

              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span className="text-sm font-medium hidden md:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <main className="min-h-[calc(100vh-73px)]">
          {children}
        </main>
      </div>
      
      {/* ✅ Connection Monitor - prevents "Syncing..." issues */}
      <ConnectionMonitor />
    </div>
  )
}


