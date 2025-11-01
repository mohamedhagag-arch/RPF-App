'use client'

import { useAuth } from './providers'
import { LoginForm } from '@/components/auth/LoginForm'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

/**
 * ✅ ROOT FIX: Simplified home page component
 * All redirect logic has been moved to middleware.ts
 * This component only handles rendering the login form
 * No client-side redirects here - middleware handles that
 * 
 * CRITICAL: This component should ONLY be rendered on '/' route
 */
export default function Home() {
  const { user, loading } = useAuth()
  const pathname = usePathname()
  const [shouldRender, setShouldRender] = useState(false)
  
  // ✅ CRITICAL: Check pathname immediately on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const currentPath = window.location.pathname
    const isHome = currentPath === '/' && (pathname === '/' || pathname === null)
    
    if (!isHome) {
      // Not on home page - don't render anything
      console.log('🚫 Home component: Not on home route, skipping render:', {
        currentPath,
        pathname
      })
      setShouldRender(false)
      return
    }
    
    // Only set to render if we're actually on home page
    setShouldRender(true)
  }, [pathname])
  
  // ✅ CRITICAL: Don't render anything on server or if not on home
  if (typeof window === 'undefined') {
    // Server-side: return null to avoid hydration mismatch
    return null
  }
  
  // ✅ CRITICAL: Don't render if we haven't confirmed we're on home page
  // OR if we're clearly not on home page
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : ''
  if (currentPath !== '/' || (pathname && pathname !== '/')) {
    return null
  }
  
  // Don't render until we've confirmed we're on home
  if (!shouldRender) {
    return null
  }

  // Show loading while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  // ✅ CRITICAL: If user exists, middleware should have already redirected
  // But just in case, show loading (middleware will handle redirect)
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
