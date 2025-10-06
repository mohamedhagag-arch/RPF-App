'use client'

import { useAuth } from '@/app/providers'
import { useRouter, usePathname } from 'next/navigation'
import { ModernSidebar } from '@/components/dashboard/ModernSidebar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useEffect, useState } from 'react'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
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
      <ModernSidebar
        activeTab={getCurrentTab()}
        onTabChange={handleTabChange}
        userName={appUser?.full_name || user?.email || 'User'}
        userRole={appUser?.role || 'viewer'}
      />

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
              <ThemeToggle />
              
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


