'use client'

import { useAuth } from '@/app/providers'
import { useRouter, usePathname } from 'next/navigation'
import { ModernSidebar } from '@/components/dashboard/ModernSidebar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useEffect, useState } from 'react'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { UserDropdown } from '@/components/ui/UserDropdown'
import { ActiveUsersIndicator } from '@/components/ui/ActiveUsersIndicator'
import { Users } from 'lucide-react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { ConnectionMonitor } from '@/components/common/ConnectionMonitor'
import { ProfileCompletionWrapper } from '@/components/auth/ProfileCompletionWrapper'
import '@/lib/simpleConnectionTest'

/**
 * Authenticated Layout Component
 * 
 * Handles:
 * - Session validation and redirects
 * - Sidebar and top bar UI
 * - Loading states
 * 
 * Logic:
 * 1. Wait for component to mount
 * 2. If loading → show loading spinner
 * 3. If no user and not loading → redirect to login
 * 4. If user exists → show authenticated layout
 */
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

  // Mark component as mounted
  useEffect(() => {
    setMounted(true)
  }, [])

  // ✅ Send heartbeat to keep user online (from every page)
  useEffect(() => {
    if (!user) return

    const sendHeartbeat = async () => {
      try {
        const sessionId = sessionStorage.getItem('session_id') || 
          `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        sessionStorage.setItem('session_id', sessionId)

        await fetch('/api/users/activity', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            is_online: true,
            session_id: sessionId,
            user_agent: navigator.userAgent
          })
        })
      } catch (error) {
        console.error('Error sending heartbeat from layout:', error)
      }
    }

    // Send heartbeat immediately when user is available
    sendHeartbeat()

    // Send heartbeat every 30 seconds (real-time)
    const heartbeatInterval = setInterval(sendHeartbeat, 30000) // 30 seconds
    
    // Also send heartbeat when page becomes visible (user switched back to tab)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        sendHeartbeat()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Send heartbeat when window gains focus
    const handleFocus = () => {
      sendHeartbeat()
    }
    
    window.addEventListener('focus', handleFocus)

    // Mark as offline when page unloads
    const handleBeforeUnload = () => {
      navigator.sendBeacon('/api/users/activity', JSON.stringify({
        is_online: false
      }))
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      clearInterval(heartbeatInterval)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [user])

  // Handle redirect if no user after loading completes
  // Only redirect if we're on a protected route and session recovery failed
  useEffect(() => {
    if (mounted && !loading && !user) {
      // Give more time for session recovery (providers.tsx has retries)
      const redirectTimer = setTimeout(() => {
        if (typeof window !== 'undefined' && !user) {
          const currentPath = window.location.pathname
          const protectedRoutes = ['/dashboard', '/projects', '/boq', '/kpi', '/reports', '/settings', '/profile', '/directory']
          const isOnProtectedRoute = protectedRoutes.some(route => currentPath.startsWith(route))
          
          // Only redirect if we're on a protected route and still no user
          if (isOnProtectedRoute) {
            console.log('⚠️ Layout: No user found after recovery attempts, redirecting to login')
            // Store the current path to return to after login
            sessionStorage.setItem('redirectAfterLogin', currentPath)
            window.location.href = '/'
          }
        }
      }, 3000) // Give 3 seconds for session recovery (providers has retries at 0.5s, 1.5s, 3s)
      
      return () => clearTimeout(redirectTimer)
    }
  }, [mounted, loading, user])

  // Helper: Get current tab from pathname
  const getCurrentTab = () => {
    if (pathname === '/dashboard') return 'dashboard'
    if (pathname === '/projects') return 'projects'
    if (pathname === '/boq') return 'boq'
    if (pathname === '/kpi') return 'kpi'
    if (pathname === '/reports') return 'reports'
    if (pathname === '/settings') return 'settings'
    if (pathname === '/profile' || pathname.startsWith('/profile/')) return 'profile'
    if (pathname === '/directory') return 'directory'
    if (pathname === '/planning') return 'planning'
    return 'dashboard'
  }

  // Navigation handlers
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

  // Loading state: Show spinner while mounting or loading
  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // No user state: Show "Restoring session" message
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Restoring session...</p>
        </div>
      </div>
    )
  }

  // Authenticated state: Show full layout
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
        <div className="sticky top-0 z-40 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700 overflow-visible sticky-header">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="lg:hidden">
                {/* Mobile menu button handled by sidebar */}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              
              {/* Active Users Indicator */}
              <ActiveUsersIndicator />
              
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
      
      {/* Connection Monitor */}
      <ConnectionMonitor />
    </div>
  )
}
