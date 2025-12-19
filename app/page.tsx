'use client'

import { useAuth } from './providers'
import { LoginForm } from '@/components/auth/LoginForm'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'

/**
 * ✅ CRITICAL FIX: Home page component with absolute path protection
 * 
 * This component MUST only render on '/' route
 * Uses multiple layers of protection to prevent interference with other routes
 */
export default function Home() {
  const { user, loading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [shouldRender, setShouldRender] = useState(false)
  const hasChecked = useRef(false)
  
  // ✅ ULTIMATE PROTECTION: Early exit check before any hooks logic
  useEffect(() => {
    if (hasChecked.current) return
    hasChecked.current = true
    
    if (typeof window === 'undefined') return
    
    const currentPath = window.location.pathname
    
    // Absolute check: Only allow '/' exactly
    if (currentPath !== '/') {
      console.log('🚫 Home component: Immediate exit - not on home route:', currentPath)
      setShouldRender(false)
      return
    }
    
    // Double check with pathname hook
    if (pathname && pathname !== '/') {
      console.log('🚫 Home component: Pathname mismatch:', pathname)
      setShouldRender(false)
      return
    }
    
    // Only set to render if we're absolutely sure we're on '/'
    setShouldRender(true)
    console.log('✅ Home component: Confirmed on home route')
  }, [pathname])
  
  // ✅ Handle redirect if user exists (must be before any conditional returns)
  useEffect(() => {
    if (user && shouldRender) {
      // Check if we have a saved redirect path
      const savedRedirect = sessionStorage.getItem('redirectAfterLogin')
      sessionStorage.removeItem('redirectAfterLogin')
      
      // Redirect to saved path or dashboard
      const redirectPath = savedRedirect && savedRedirect !== '/' ? savedRedirect : '/dashboard'
      console.log('✅ Home: User authenticated, redirecting to:', redirectPath)
      router.push(redirectPath)
    }
  }, [user, router, shouldRender])
  
  // ✅ CRITICAL: Don't render anything on server
  if (typeof window === 'undefined') {
    return null
  }
  
  // ✅ CRITICAL: Immediate exit if pathname doesn't match
  if (pathname && pathname !== '/') {
    return null
  }
  
  // ✅ CRITICAL: Check window.location.pathname synchronously
  if (typeof window !== 'undefined' && window.location.pathname !== '/') {
    return null
  }
  
  // ✅ CRITICAL: Don't render until confirmed
  if (!shouldRender) {
    return null
  }

  // Show loading while checking auth state (with shorter timeout)
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

  // If user exists, show redirecting message (should be fast with new session manager)
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
