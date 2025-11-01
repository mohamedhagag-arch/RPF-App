'use client'

import { useAuth } from './providers'
import { LoginForm } from '@/components/auth/LoginForm'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useEffect, useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { checkReloadProtection } from '@/lib/reloadProtection'

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  
  // ✅ CRITICAL: All hooks must be called first (React rules)
  const [mounted, setMounted] = useState(false)
  const mountedRef = useRef(false)
  
  // ✅ CRITICAL: Check pathname in initial state (synchronously on client)
  // This prevents the component from executing logic on non-home pages
  const [isHomePage, setIsHomePage] = useState(() => {
    // On client, check immediately
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname
      const isHome = currentPath === '/'
      if (!isHome) {
        console.log('🚫 Home component: Initial state - not on home route:', currentPath)
      }
      return isHome
    }
    // On server, always false to avoid hydration mismatch
    return false
  })
  
  // ✅ CRITICAL: Also check pathname hook value
  // Only consider it home if pathname is explicitly '/'
  // null/undefined means we don't know yet, so assume false to be safe
  const isPathnameHome = pathname === '/'

  // ✅ CRITICAL FIX: Check if we're actually on home page immediately
  // This runs on client after hydration, so no hydration mismatch
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const currentPath = window.location.pathname
    // ✅ CRITICAL: Both must be '/' to confirm we're on home
    const isHome = currentPath === '/' && pathname === '/'
    
    if (!isHome) {
      console.log('🚫 Home page component loaded but not on home route:', {
        currentPath,
        pathname,
        isHomePage: false
      })
      setIsHomePage(false)
      return
    }
    
    console.log('✅ Confirmed we are on home page')
    setIsHomePage(true)
  }, [pathname])

  useEffect(() => {
    if (!mountedRef.current) {
      setMounted(true)
      mountedRef.current = true
    }
  }, [])

  // Redirect authenticated users to dashboard - with delay to prevent rapid redirects
  // ✅ FIX: Only redirect if we're actually on the home page (pathname === '/')
  useEffect(() => {
    // ✅ CRITICAL: Check pathname FIRST - before any other logic
    if (typeof window === 'undefined') return
    
    const currentPath = window.location.pathname
    
    // ✅ IMMEDIATE CHECK: If not on home page, exit immediately
    if (currentPath !== '/') {
      console.log('🚫 Redirect prevented IMMEDIATELY: currentPath is', currentPath)
      setIsHomePage(false)
      return
    }
    
    // ✅ Double check: Also check pathname from hook
    // CRITICAL: Only proceed if pathname is explicitly '/'
    if (pathname !== '/') {
      console.log('🚫 Redirect prevented: pathname is', pathname, '(not home)')
      setIsHomePage(false)
      return
    }
    
    // ✅ Triple check: Also check isHomePage state
    if (!isHomePage) {
      console.log('🚫 Redirect prevented: not on home page, isHomePage =', isHomePage)
      return
    }
    
    // Only proceed if ALL checks pass
    if (user && mounted && !loading && isHomePage && currentPath === '/') {
      // فحص حماية من الـ reload المتكرر
      if (!checkReloadProtection()) {
        console.warn('⚠️ Too many redirects, stopping automatic redirect')
        return
      }
      
      console.log('✅ User authenticated, redirecting to dashboard...')
      
      // Check if this is a reload scenario
      const isReload = typeof window !== 'undefined' && 
        (window.performance?.navigation?.type === 1 || 
         sessionStorage.getItem('auth_reload_check') === 'true')
      
      // تأخير أطول في حالة reload
      const delay = isReload ? 3000 : 2000
      
      const timer = setTimeout(() => {
        router.push('/dashboard')
      }, delay)
      
      return () => clearTimeout(timer)
    }
  }, [user, mounted, loading, router, pathname, isHomePage])

  // ✅ CRITICAL: Fix hydration mismatch and ensure early exit
  // On server, always return null (SSR-safe)
  if (typeof window === 'undefined') {
    // Server-side: return null to avoid hydration issues
    return null
  }
  
  // ✅ Client-side: Multiple checks to ensure we're on home page
  // Check 1: pathname hook (if available)
  if (!isPathnameHome) {
    console.log('🚫 Home component: Render check - pathname is not home:', pathname)
    return null
  }
  
  // Check 2: window.location.pathname (double check)
  if (window.location.pathname !== '/') {
    console.log('🚫 Home component: Render check - window.location.pathname is not home:', window.location.pathname)
    return null
  }
  
  // Check 3: isHomePage state (triple check)
  if (!isHomePage) {
    console.log('🚫 Home component: Render check - isHomePage is false')
    return null
  }

  // Show loading while checking auth state (only if on home page)
  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Show login form if no user
  if (!user) {
    return <LoginForm />
  }

  // ✅ FINAL CHECK: Before showing "Redirecting", verify we're actually on home
  // This prevents showing redirect message on other pages
  const finalPathCheck = typeof window !== 'undefined' ? window.location.pathname : ''
  if (finalPathCheck !== '/' || pathname !== '/') {
    console.log('🚫 Home component: Final check failed - not on home:', {
      finalPathCheck,
      pathname,
      isHomePage
    })
    return null
  }

  // Show loading while redirecting (only if ALL checks pass)
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600 dark:text-gray-400">Redirecting to dashboard...</p>
      </div>
    </div>
  )
}
