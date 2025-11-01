'use client'

import { useAuth } from './providers'
import { LoginForm } from '@/components/auth/LoginForm'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { usePathname } from 'next/navigation'

/**
 * ✅ ROOT FIX: Simplified home page component
 * All redirect logic has been moved to middleware.ts
 * This component only handles rendering the login form
 * No client-side redirects here - middleware handles that
 */
export default function Home() {
  const { user, loading } = useAuth()
  const pathname = usePathname()
  
  // ✅ CRITICAL: Only render on actual home page
  // If somehow we're not on '/', return null immediately
  if (typeof window !== 'undefined') {
    const currentPath = window.location.pathname
    if (currentPath !== '/' || (pathname && pathname !== '/')) {
      // Not on home page - middleware should handle redirect, just return null
      return null
    }
  }
  
  // On server, render nothing (will be handled by middleware or client hydration)
  if (typeof window === 'undefined') {
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
