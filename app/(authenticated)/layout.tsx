'use client'

import { useAuth } from '@/app/providers'
import { useRouter, usePathname } from 'next/navigation'
import { ModernSidebar } from '@/components/dashboard/ModernSidebar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useEffect, useState } from 'react'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { UserDropdown } from '@/components/ui/UserDropdown'
import { LogOut, User, Users } from 'lucide-react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { ConnectionMonitor } from '@/components/common/ConnectionMonitor'
import { ProfileCompletionWrapper } from '@/components/auth/ProfileCompletionWrapper'
// Simple connection management - no complex systems needed
// Import simple connection test for development
import '@/lib/simpleConnectionTest'

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, appUser, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const supabase = createClientComponentClient()

  useEffect(() => {
    setMounted(true)
    
    // Set reload flag if this is a page reload
    if (typeof window !== 'undefined') {
      const isReload = window.performance?.navigation?.type === 1
      if (isReload) {
        sessionStorage.setItem('auth_reload_check', 'true')
        console.log('🔄 Layout: Page reload detected, setting reload flag')
      }
    }
  }, [])

  useEffect(() => {
    // ✅ FIX: More tolerant session handling - don't redirect immediately
    if (mounted && !loading && !user) {
      // Check if this is a reload scenario
      const isReload = typeof window !== 'undefined' && (
        window.performance?.navigation?.type === 1 || 
        sessionStorage.getItem('auth_reload_check') === 'true' ||
        document.referrer === window.location.href ||
        window.location.href.includes('localhost:3000') ||
        window.location.href.includes('127.0.0.1')
      )
      
      if (isReload) {
        console.log('🔄 Layout: Detected reload, waiting for session recovery...')
        // Clear the reload flag
        sessionStorage.removeItem('auth_reload_check')
        // Wait longer for session to recover
        setTimeout(() => {
          if (!user) {
            console.log('⚠️ Layout: No session found after reload, redirecting to login')
            router.push('/')
          }
        }, 45000) // Increased timeout to 45 seconds
      } else {
        // For new tabs or navigation, wait a bit before redirecting
        console.log('🔄 Layout: New navigation detected, waiting for session...')
        setTimeout(() => {
          if (!user) {
            console.log('⚠️ Layout: No session found, redirecting to login')
            router.push('/')
          }
        }, 20000) // Wait 20 seconds before redirecting
      }
    }
  }, [user, loading, mounted, router])

  const getCurrentTab = () => {
    if (pathname === '/dashboard') return 'dashboard'
    if (pathname === '/projects') return 'projects'
    if (pathname === '/boq') return 'boq'
    if (pathname === '/kpi') return 'kpi'
    if (pathname === '/settings') return 'settings'
    if (pathname === '/reports') return 'reports'
    if (pathname === '/profile') return 'profile'
    if (pathname.startsWith('/profile/')) return 'profile'
    if (pathname === '/directory') return 'directory'
    return 'dashboard'
  }


  const handleTabChange = (tab: string) => {
    if (tab === 'users') {
      router.push('/settings?tab=users')
    } else if (tab === 'directory') {
      router.push('/directory')
    } else {
      router.push(`/${tab}`)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleProfileClick = () => {
    router.push('/profile')
  }

  const handleSettingsClick = () => {
    router.push('/settings')
  }

  const handleDirectoryClick = () => {
    router.push('/directory')
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
        onProfileClick={handleProfileClick}
        onCollapseChange={setSidebarCollapsed}
      />

      {/* Main Content */}
      <div className={`transition-all duration-300 overflow-visible ${
        sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'
      }`}>
        {/* Top Bar */}
        <div className="sticky top-0 z-30 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700 overflow-visible sticky-header">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="lg:hidden">
                {/* Mobile menu button handled by sidebar */}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              
              {/* Directory Button */}
              <button
                onClick={handleDirectoryClick}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Directory"
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Directory</span>
              </button>
              
              <UserDropdown
                userName={appUser?.first_name && appUser?.last_name 
                  ? `${appUser.first_name} ${appUser.last_name}` 
                  : appUser?.full_name || user?.email || 'User'
                }
                userRole={appUser?.role || 'viewer'}
                onProfileClick={handleProfileClick}
                onSettingsClick={handleSettingsClick}
                onSignOut={handleSignOut}
              />
            </div>
          </div>
        </div>

        {/* Page Content */}
        <main className="min-h-[calc(100vh-73px)]">
          <ProfileCompletionWrapper>
            {children}
          </ProfileCompletionWrapper>
        </main>
      </div>
      
      {/* ✅ Connection Monitor - prevents "Syncing..." issues */}
      <ConnectionMonitor />
    </div>
  )
}


