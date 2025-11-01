'use client'

import { useAuth } from './providers'
import { LoginForm } from '@/components/auth/LoginForm'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useEffect, useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { checkReloadProtection } from '@/lib/reloadProtection'

export default function Home() {
  const { user, loading } = useAuth()
  const [mounted, setMounted] = useState(false)
  const mountedRef = useRef(false)
  const router = useRouter()
  const pathname = usePathname()
  
  // ✅ CRITICAL: Start with false and check immediately
  // Calculate isHomePage synchronously if possible
  const [isHomePage, setIsHomePage] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname === '/'
    }
    // On server, assume false to be safe
    return false
  })

  // ✅ CRITICAL FIX: Check if we're actually on home page immediately
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname
      const isHome = currentPath === '/' && (pathname === '/' || pathname === null || pathname === undefined)
      
      if (!isHome) {
        console.log('🚫 Home page component loaded but not on home route:', currentPath)
        setIsHomePage(false)
        return
      }
      
      setIsHomePage(true)
    }
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
    if (pathname !== '/' && pathname !== null && pathname !== undefined) {
      console.log('🚫 Redirect prevented: pathname is', pathname)
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

  // ✅ CRITICAL: Don't render anything if not on home page (important for Vercel)
  if (!isHomePage) {
    return null
  }

  // Show loading while checking auth state
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

  // Show loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600 dark:text-gray-400">Redirecting to dashboard...</p>
      </div>
    </div>
  )
}
