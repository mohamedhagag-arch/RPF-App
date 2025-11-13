'use client'

import { useAuth } from '@/app/providers'
import { useRouter, usePathname } from 'next/navigation'
import { ModernSidebar } from '@/components/dashboard/ModernSidebar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useEffect, useState, useRef } from 'react'
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
  const { user, appUser, loading, checkSession } = useAuth()
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
    // ✅ IMPROVED: Better session recovery with retry mechanism
    if (mounted && !loading && !user) {
      console.log('🔄 Layout: No user found, attempting session recovery...')
      
      let retryCount = 0
      const maxRetries = 8 // 8 attempts over 20 seconds
      let isCancelled = false
      
      const attemptSessionRecovery = async () => {
        if (isCancelled) return
        
        try {
          // ✅ Use checkSession from AuthProvider (more reliable) with timeout
          try {
            const checkPromise = checkSession(true) // Force check
            const checkTimeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Check timeout')), 4000)
            )
            await Promise.race([checkPromise, checkTimeoutPromise])
          } catch (checkErr) {
            console.log('⚠️ Layout: checkSession timeout, continuing...')
          }
          
          // Small delay to let AuthProvider update
          await new Promise(resolve => setTimeout(resolve, 300))
          
          // If no user yet, try direct session check with timeout
          try {
            const sessionPromise = supabase.auth.getSession()
            const sessionTimeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Session check timeout')), 4000)
            )
            
            const { data: { session }, error } = await Promise.race([
              sessionPromise,
              sessionTimeoutPromise
            ]) as any
            
            if (session?.user) {
              console.log('✅ Layout: Session recovered directly:', session.user.email)
              // Session will be picked up by AuthProvider via checkSession
              try {
                await Promise.race([
                  checkSession(true),
                  new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
                ])
              } catch (err) {
                console.log('⚠️ Layout: checkSession timeout after recovery')
              }
              return
            }
          } catch (sessionErr: any) {
            console.log('⚠️ Layout: Direct session check failed:', sessionErr.message || sessionErr)
          }
          
          // If no session, try to refresh
          if (retryCount < maxRetries && !isCancelled) {
            retryCount++
            console.log(`🔄 Layout: Attempting session refresh (${retryCount}/${maxRetries})...`)
            
            try {
              const refreshPromise = supabase.auth.refreshSession()
              const refreshTimeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Refresh timeout')), 4000)
              )
              
              const { data: { session: refreshedSession }, error: refreshError } = await Promise.race([
                refreshPromise,
                refreshTimeoutPromise
              ]) as any
              
              if (refreshedSession?.user) {
                console.log('✅ Layout: Session refreshed successfully:', refreshedSession.user.email)
                // Trigger checkSession again to update AuthProvider
                try {
                  await Promise.race([
                    checkSession(true),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
                  ])
                } catch (err) {
                  console.log('⚠️ Layout: checkSession timeout after refresh')
                }
                return
              } else if (refreshError) {
                console.log('⚠️ Layout: Session refresh error:', refreshError.message)
              }
            } catch (refreshErr: any) {
              console.log('⚠️ Layout: Error during refresh:', refreshErr.message || refreshErr)
            }
            
            // Retry after delay (shorter delay for faster recovery)
            if (retryCount < maxRetries && !isCancelled) {
              setTimeout(attemptSessionRecovery, 2000) // 2 seconds between retries
            }
          } else if (retryCount >= maxRetries && !isCancelled) {
            // All retries exhausted - redirect to login
            console.log('⚠️ Layout: All session recovery attempts failed, redirecting to login')
            router.push('/')
          }
        } catch (error: any) {
          console.log('❌ Layout: Error during session recovery:', error.message || error)
          if (retryCount < maxRetries && !isCancelled) {
            retryCount++
            setTimeout(attemptSessionRecovery, 2000)
          } else if (!isCancelled) {
            router.push('/')
          }
        }
      }
      
      // ✅ Start recovery immediately (no delay)
      attemptSessionRecovery()
      
      // Fallback timeout - redirect after 25 seconds if still no user
      const timeoutId = setTimeout(() => {
        if (!isCancelled) {
          console.log('⚠️ Layout: Timeout reached, redirecting to login')
          router.push('/')
        }
      }, 25000) // 25 seconds total timeout
      
      return () => {
        isCancelled = true
        clearTimeout(timeoutId)
      }
    }
  }, [user, loading, mounted, router, supabase, checkSession])

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

  // ✅ CRITICAL: All hooks must be called before any conditional returns
  // Handle redirect if no user after loading is false
  useEffect(() => {
    if (!user && !loading && mounted) {
      const redirectTimeout = setTimeout(() => {
        if (!user) {
          console.log('⚠️ Layout: No user after loading complete, redirecting to login')
          router.push('/')
        }
      }, 2000) // 2 seconds delay to allow recovery
      
      return () => clearTimeout(redirectTimeout)
    }
  }, [user, loading, mounted, router])

  // ✅ CRITICAL FIX: Simplified loading logic - don't block the UI
  // Show loading only for initial mount, then allow page to render
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // ✅ SIMPLIFIED: After mount, show "Restoring session" only briefly
  // Then allow page to render even if user is not yet loaded
  // This prevents the blank white screen
  if (!user && loading) {
    // Show "Restoring session" for max 3 seconds, then allow render
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Restoring session...</p>
        </div>
      </div>
    )
  }
  
  // If we're redirecting, show message
  if (!user && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Redirecting to login...</p>
        </div>
      </div>
    )
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



