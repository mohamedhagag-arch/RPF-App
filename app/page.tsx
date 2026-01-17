'use client'

import { useAuth } from './providers'
import { LoginForm } from '@/components/auth/LoginForm'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { useMaintenanceMode } from '@/hooks/useMaintenanceMode'
import { MaintenancePage } from '@/components/maintenance/MaintenancePage'

/**
 * Home page component
 * 
 * ✅ إصلاح: منع redirects متعددة وحلقة لا نهائية
 * - يعيد التوجيه مرة واحدة فقط
 * - ينتظر loading قبل أي redirect
 */
export default function Home() {
  const { user, loading, appUser } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [shouldRender, setShouldRender] = useState(false)
  const hasChecked = useRef(false)
  const hasRedirected = useRef(false)
  const redirectTimerRef = useRef<NodeJS.Timeout | null>(null)
  const { enabled: maintenanceEnabled, loading: maintenanceLoading, message, estimatedTime } = useMaintenanceMode()
  
  // Check if we're on home route
  useEffect(() => {
    if (hasChecked.current) return
    hasChecked.current = true
    
    if (typeof window === 'undefined') return
    
    const currentPath = window.location.pathname
    
    // Only allow '/' exactly
    if (currentPath !== '/') {
      setShouldRender(false)
      return
    }
    
    if (pathname && pathname !== '/') {
      setShouldRender(false)
      return
    }
    
    setShouldRender(true)
  }, [pathname])
  
  // ✅ Handle redirect ONLY if user exists AND we're on home page AND loading is complete
  useEffect(() => {
    // Clear any existing redirect timer
    if (redirectTimerRef.current) {
      clearTimeout(redirectTimerRef.current)
      redirectTimerRef.current = null
    }
    
    // Only redirect if:
    // 1. User exists
    // 2. We're on home page (/)
    // 3. Loading is complete
    // 4. Haven't redirected yet
    if (user && shouldRender && pathname === '/' && !loading && !hasRedirected.current) {
      // Small delay to ensure everything is ready
      redirectTimerRef.current = setTimeout(() => {
        if (hasRedirected.current) return // Double check
        
        hasRedirected.current = true
        
        // Check if we have a saved redirect path
        const savedRedirect = sessionStorage.getItem('redirectAfterLogin')
        sessionStorage.removeItem('redirectAfterLogin')
        
        // Redirect to saved path or dashboard
        const redirectPath = savedRedirect && savedRedirect !== '/' ? savedRedirect : '/dashboard'
        console.log('✅ Home: User authenticated, redirecting to:', redirectPath)
        router.push(redirectPath)
      }, 100) // Small delay
    }
    
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current)
        redirectTimerRef.current = null
      }
    }
  }, [user, router, shouldRender, pathname, loading])
  
  // Don't render on server
  if (typeof window === 'undefined') {
    return null
  }
  
  // Exit if not on home route
  if (pathname && pathname !== '/') {
    return null
  }
  
  if (typeof window !== 'undefined' && window.location.pathname !== '/') {
    return null
  }
  
  if (!shouldRender) {
    return null
  }

  // Show loading while checking auth state or maintenance mode
  if (loading || maintenanceLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  // ✅ Check maintenance mode - if enabled and user is not admin, show maintenance page
  if (maintenanceEnabled && appUser?.role !== 'admin') {
    return <MaintenancePage message={message} estimatedTime={estimatedTime} />
  }

  // If user exists, show redirecting message
  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Redirecting...</p>
        </div>
      </div>
    )
  }

  // Show login form if no user
  return <LoginForm />
}
