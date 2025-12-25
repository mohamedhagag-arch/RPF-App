'use client'

import { useAuth } from '@/app/providers'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { ModernSidebar } from '@/components/dashboard/ModernSidebar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useEffect, useState, useRef } from 'react'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { UserDropdown } from '@/components/ui/UserDropdown'
import { ActiveUsersIndicator } from '@/components/ui/ActiveUsersIndicator'
import { KPINotificationsDropdown } from '@/components/ui/KPINotificationsDropdown'
import { PrayerTimesWidget } from '@/components/ui/PrayerTimesWidget'
import { UrgentMessageFloatingButton } from '@/components/ui/UrgentMessageFloatingButton'
import { kpiNotificationService } from '@/lib/kpiNotificationService'
import { Users, Bell, Home, ChevronRight } from 'lucide-react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { ConnectionMonitor } from '@/components/common/ConnectionMonitor'
import { ProfileCompletionWrapper } from '@/components/auth/ProfileCompletionWrapper'
import { useActivityTracker } from '@/hooks/useActivityTracker'
import { sessionTimeoutManager } from '@/lib/sessionTimeoutManager'
import { professionalSessionManager } from '@/lib/professionalSessionManager'
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
  const [notificationCount, setNotificationCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  const notificationButtonRef = useRef<HTMLButtonElement | null>(null)
  const supabase = createClientComponentClient()
  const activityTracker = useActivityTracker()

  // Mark component as mounted
  useEffect(() => {
    setMounted(true)
  }, [])

  // Initialize session timeout manager when user is authenticated
  useEffect(() => {
    if (user && appUser) {
      sessionTimeoutManager.initialize().catch(err => {
        console.warn('⚠️ Failed to initialize session timeout manager:', err)
      })
    }
    
    return () => {
      // Cleanup on unmount
      sessionTimeoutManager.cleanup()
    }
  }, [user, appUser])

  // Load notification count and check for pending KPIs
  useEffect(() => {
    if (appUser?.id) {
      loadNotificationCount()
      // Check for pending KPIs and create notifications if needed (once on mount)
      checkPendingKPIs()
      // Refresh notification count every 30 seconds
      const interval = setInterval(() => {
        loadNotificationCount()
      }, 30000)

      return () => clearInterval(interval)
    }
  }, [appUser?.id])

  const checkPendingKPIs = async () => {
    try {
      console.log('🔍 Checking for pending KPIs that need notifications...')
      await kpiNotificationService.notifyPendingKPIs()
      // Wait a bit for notifications to be created
      await new Promise(resolve => setTimeout(resolve, 1000))
      // Reload notification count after checking
      await loadNotificationCount()
    } catch (error: any) {
      console.error('Error checking pending KPIs:', error)
      // Check if table doesn't exist
      if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
        console.warn('⚠️ kpi_notifications table does not exist. Please run Database/setup-kpi-notifications-complete.sql')
        console.warn('   Or run: Database/kpi-notifications-table.sql then Database/fix-kpi-notifications-rls.sql')
      }
    }
  }

  // Close notifications dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (
        notificationButtonRef.current &&
        !notificationButtonRef.current.contains(target) &&
        !target.closest('[data-notification-dropdown]')
      ) {
        setShowNotifications(false)
      }
    }

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showNotifications])

  const loadNotificationCount = async () => {
    if (!appUser?.id) {
      console.log('⚠️ No user ID available for notification count')
      return
    }

    try {
      const count = await kpiNotificationService.getNotificationCount(appUser.id)
      setNotificationCount(count)
      if (count > 0) {
        console.log(`✅ Found ${count} unread notification(s) for user ${appUser.id}`)
      }
    } catch (error: any) {
      console.error('Error loading notification count:', error)
      // Check if table doesn't exist
      if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
        console.warn('⚠️ kpi_notifications table does not exist. Please run Database/kpi-notifications-table.sql')
      }
    }
  }

  // Track page views for active users with high precision
  useEffect(() => {
    if (!mounted || !user || !pathname) return

    // Small delay to ensure page is fully loaded
    const timeoutId = setTimeout(() => {
      const pageTitle = document.title || pathname
      const queryParams = window.location.search
      const fullPath = pathname + queryParams
      
      // Get more context about the page
      let description = `Viewing ${pageTitle}`
      if (queryParams) {
        const params = new URLSearchParams(queryParams)
        const tab = params.get('tab')
        if (tab) {
          description += ` - ${tab} tab`
        }
      }
      
      activityTracker.log({
        action: 'view',
        entity: 'other',
        pagePath: fullPath, // Include query params
        pageTitle: pageTitle,
        description: description,
        isActive: true,
        metadata: {
          pathname: pathname,
          query_params: queryParams,
          referrer: document.referrer || '',
        },
      })
    }, 100) // Small delay to capture full page state

    return () => clearTimeout(timeoutId)
  }, [pathname, mounted, user, activityTracker])

  // ✅ Send heartbeat to keep user online (from every page)
  useEffect(() => {
    if (!user) return

    const sendHeartbeat = async () => {
      try {
        // Double-check user exists before sending heartbeat
        if (!user) return
        
        const sessionId = sessionStorage.getItem('session_id') || 
          `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        sessionStorage.setItem('session_id', sessionId)

        const response = await fetch('/api/users/activity', {
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
        
        // Only log errors if it's not a successful response (including silent success)
        if (!response.ok && response.status !== 401) {
          // Don't log 401 errors - they're expected during session initialization
          if (process.env.NODE_ENV === 'development') {
            console.warn('⚠️ Heartbeat response not OK:', response.status)
          }
        }
      } catch (error) {
        // Silently handle heartbeat errors - they're not critical
        // Only log in development
        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️ Heartbeat error (non-critical):', error)
        }
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

  // ✅ Handle redirect ONLY if no user after loading completes AND session recovery failed
  // لا يعيد التوجيه إذا كان المستخدم موجود أو في حالة استعادة الجلسة
  const redirectAttempted = useRef(false)
  
  useEffect(() => {
    if (!mounted || loading) return
    
    // ✅ إذا كان المستخدم موجود → لا redirect (يبقى على نفس الصفحة)
    if (user) {
      redirectAttempted.current = false
      return
    }
    
    // ✅ إذا كان في حالة loading أو recovering → لا redirect (ينتظر)
    const state = professionalSessionManager.getState()
    if (state.isLoading || state.isRecovering) {
      return
    }
    
    // ✅ فقط إذا لم يكن هناك user ولا loading ولا recovering
    if (!user && typeof window !== 'undefined' && !redirectAttempted.current) {
      const hasRefreshToken = professionalSessionManager.hasRefreshToken()
      const hasCachedSession = state.session !== null
      
      // ✅ إذا كان له refresh token أو cached session → ينتظر الاستعادة (لا redirect)
      if (hasRefreshToken || hasCachedSession) {
        // Give session recovery more time (3 seconds)
        const recoveryTimer = setTimeout(() => {
          if (!user && !state.isLoading && !state.isRecovering && !redirectAttempted.current) {
            const currentPath = window.location.pathname
            const protectedRoutes = ['/dashboard', '/projects', '/boq', '/kpi', '/reports', '/settings', '/profile', '/directory', '/hr', '/cost-control', '/procurement']
            const isOnProtectedRoute = protectedRoutes.some(route => currentPath.startsWith(route))
            
            if (isOnProtectedRoute) {
              redirectAttempted.current = true
              console.log('⚠️ Layout: Session recovery timeout - redirecting to login')
              sessionStorage.setItem('redirectAfterLogin', currentPath)
              window.location.href = '/'
            }
          }
        }, 3000) // 3 seconds for recovery
        
        return () => clearTimeout(recoveryTimer)
      }
      
      // ✅ إذا لم يكن له refresh token ولا cached session → redirect فوري
      if (!hasRefreshToken && !hasCachedSession) {
        const currentPath = window.location.pathname
        const protectedRoutes = ['/dashboard', '/projects', '/boq', '/kpi', '/reports', '/settings', '/profile', '/directory', '/hr', '/cost-control', '/procurement']
        const isOnProtectedRoute = protectedRoutes.some(route => currentPath.startsWith(route))
        
        if (isOnProtectedRoute && !redirectAttempted.current) {
          redirectAttempted.current = true
          console.log('⚠️ Layout: No user, no refresh token, and no cached session - redirecting to login')
          sessionStorage.setItem('redirectAfterLogin', currentPath)
          window.location.href = '/'
        }
      }
    }
  }, [mounted, loading, user])

  // Helper: Get current tab from pathname
  const getCurrentTab = () => {
    if (pathname === '/dashboard') return 'dashboard'
    if (pathname === '/projects') return 'projects'
    if (pathname === '/boq') return 'boq'
    if (pathname === '/kpi') return 'kpi'
    if (pathname === '/kpi/add') return 'forms/kpi-standard'
    if (pathname === '/kpi/smart-form') return 'forms/kpi-smart'
    if (pathname === '/reports') return 'reports'
    if (pathname === '/cost-control') return 'cost-control'
    if (pathname === '/cost-control/manpower') return 'cost-control/manpower'
    if (pathname === '/cost-control/designation-rates') return 'cost-control/designation-rates'
    if (pathname === '/cost-control/machine-list') return 'cost-control/machine-list'
    if (pathname === '/cost-control/transportation') return 'cost-control/transportation'
    if (pathname === '/cost-control/hired-manpower') return 'cost-control/hired-manpower'
    if (pathname === '/cost-control/rpf-equipment') return 'cost-control/rpf-equipment'
    if (pathname === '/cost-control/rented-equipment') return 'cost-control/rented-equipment'
    if (pathname === '/cost-control/other-cost') return 'cost-control/other-cost'
    if (pathname === '/settings') {
      // Check if it's user form tab
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search)
        if (params.get('tab') === 'users') return 'forms/user'
      }
      return 'settings'
    }
    if (pathname === '/profile' || pathname.startsWith('/profile/')) return 'profile'
    if (pathname === '/directory') return 'directory'
    if (pathname === '/planning') return 'planning'
    if (pathname === '/hr') return 'hr'
    if (pathname === '/hr/manpower') return 'hr/manpower'
    if (pathname === '/hr/attendance') return 'hr/attendance'
    if (pathname === '/hr/attendance/check-in-out') return 'hr/attendance/check-in-out'
    if (pathname === '/hr/attendance/review') return 'hr/attendance/review'
    if (pathname === '/procurement') return 'procurement'
    if (pathname === '/procurement/vendor-list') return 'procurement/vendor-list'
    return 'dashboard'
  }

  // Navigation handlers
  const handleTabChange = (tab: string) => {
    if (tab === 'users') {
      router.push('/settings?tab=users')
    } else if (tab === 'directory') {
      router.push('/directory')
    } else if (tab === 'forms/boq') {
      router.push('/boq')
    } else if (tab === 'forms/kpi-standard') {
      router.push('/kpi/add')
    } else if (tab === 'forms/kpi-smart') {
      router.push('/kpi/smart-form')
    } else if (tab === 'forms/project') {
      router.push('/projects')
    } else if (tab === 'forms/user') {
      router.push('/settings?tab=users')
    } else if (tab === 'forms') {
      router.push('/boq') // Default to BOQ Form
    } else if (tab === 'cost-control') {
      router.push('/cost-control')
    } else if (tab === 'cost-control/manpower') {
      router.push('/cost-control/manpower')
    } else if (tab === 'cost-control/designation-rates') {
      router.push('/cost-control/designation-rates')
    } else if (tab === 'cost-control/machine-list') {
      router.push('/cost-control/machine-list')
    } else if (tab === 'cost-control/material') {
      router.push('/cost-control/material')
    } else if (tab === 'cost-control/subcontractor') {
      router.push('/cost-control/subcontractor')
    } else if (tab === 'cost-control/diesel') {
      router.push('/cost-control/diesel')
    } else if (tab === 'cost-control/transportation') {
      router.push('/cost-control/transportation')
    } else if (tab === 'cost-control/hired-manpower') {
      router.push('/cost-control/hired-manpower')
    } else if (tab === 'cost-control/rpf-equipment') {
      router.push('/cost-control/rpf-equipment')
    } else if (tab === 'cost-control/rented-equipment') {
      router.push('/cost-control/rented-equipment')
    } else if (tab === 'cost-control/other-cost') {
      router.push('/cost-control/other-cost')
    } else if (tab === 'hr') {
      router.push('/hr')
    } else if (tab === 'hr/manpower') {
      router.push('/hr/manpower')
    } else if (tab === 'hr/attendance') {
      router.push('/hr/attendance')
    } else if (tab === 'hr/attendance/check-in-out') {
      router.push('/hr/attendance/check-in-out')
    } else if (tab === 'hr/attendance/review') {
      router.push('/hr/attendance/review')
    } else if (tab === 'procurement') {
      router.push('/procurement')
    } else if (tab === 'procurement/vendor-list') {
      router.push('/procurement/vendor-list')
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

  // ✅ Loading state: Show spinner only while mounting or loading
  // محسّن: بدون حلول لا نهائية
  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            {loading && !user ? 'Restoring session...' : 'Loading...'}
          </p>
        </div>
      </div>
    )
  }

  // ✅ No user state after loading: Redirect immediately (no "Checking session..." loop)
  // The redirect logic in useEffect will handle the actual redirect
  if (!user && !loading) {
    // Show minimal loading while redirect happens
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Redirecting...</p>
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
        userProfilePicture={(appUser as any)?.profile_picture_url}
        onProfileClick={handleProfileClick}
        onCollapseChange={setSidebarCollapsed}
      />

      {/* Main Content */}
      <div className={`transition-all duration-300 overflow-visible ${
        sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-72'
      }`}>
        {/* Top Bar - Enhanced Navbar */}
        <div className="sticky top-0 z-[100] bg-gradient-to-r from-white via-white to-gray-50/50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900/50 backdrop-blur-xl border-b-2 border-gray-200/50 dark:border-gray-700/50 shadow-sm overflow-visible sticky-header">
          <div className="px-6 py-3">
            {/* Main Navbar */}
            <div className="flex items-center justify-between mb-2">
              {/* Left Section - Breadcrumbs */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="lg:hidden">
                  {/* Mobile menu button handled by sidebar */}
                </div>
                
                {/* Breadcrumbs */}
                <nav className="hidden md:flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    <Home className="h-4 w-4" />
                    <span className="font-medium">Dashboard</span>
                  </button>
                  {pathname !== '/dashboard' && (
                    <>
                      <ChevronRight className="h-4 w-4" />
                      <span className="text-gray-900 dark:text-white font-semibold capitalize">
                        {pathname.split('/').filter(Boolean).pop()?.replace(/-/g, ' ') || 'Page'}
                      </span>
                    </>
                  )}
                </nav>
              </div>

              {/* Center Section - Prayer Times */}
              <div className="hidden lg:flex items-center justify-center flex-1">
                <PrayerTimesWidget />
              </div>

              {/* Right Section - Actions */}
              <div className="flex items-center gap-2">
                {/* Theme Toggle */}
                <div className="p-0.5 rounded-xl bg-gray-100 dark:bg-gray-700">
                  <ThemeToggle />
                </div>
                
                {/* KPI Notifications */}
                <div className="relative">
                  <button
                    ref={(el) => { notificationButtonRef.current = el }}
                    onClick={() => {
                      setShowNotifications(!showNotifications)
                      if (!showNotifications) {
                        loadNotificationCount()
                      }
                    }}
                    className="relative flex items-center justify-center p-2.5 text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-xl transition-all duration-200 hover:scale-105 border border-transparent hover:border-orange-200 dark:hover:border-orange-800"
                    title="KPI Notifications"
                  >
                    <Bell className="h-5 w-5" />
                    {notificationCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 bg-gradient-to-br from-red-500 to-red-600 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-lg animate-pulse">
                        {notificationCount > 99 ? '99+' : notificationCount}
                      </span>
                    )}
                  </button>
                  {showNotifications && (
                    <div data-notification-dropdown>
                      <KPINotificationsDropdown
                        onClose={() => {
                          setShowNotifications(false)
                          loadNotificationCount()
                        }}
                      />
                    </div>
                  )}
                </div>
                
                {/* Active Users Indicator */}
                <div className="hidden sm:block">
                  <ActiveUsersIndicator />
                </div>
                
                {/* Directory Button */}
                <button
                  onClick={handleDirectoryClick}
                  className="hidden md:flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-xl transition-all duration-200 hover:scale-105 border border-transparent hover:border-purple-200 dark:hover:border-purple-800"
                  title="Directory"
                >
                  <Users className="h-4 w-4" />
                  <span className="hidden lg:inline">Directory</span>
                </button>
                
                {/* User Dropdown */}
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
      
      {/* Urgent Message Floating Button */}
      <UrgentMessageFloatingButton />
    </div>
  )
}
