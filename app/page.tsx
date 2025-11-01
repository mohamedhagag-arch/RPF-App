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
  const [isHomePage, setIsHomePage] = useState(true)

  // ✅ CRITICAL FIX: Check if we're actually on home page
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname
      const isHome = currentPath === '/' && (pathname === '/' || pathname === null || pathname === undefined)
      setIsHomePage(isHome)
      
      // If we're not on home page, don't do anything
      if (!isHome) {
        console.log('🚫 Home page component loaded but not on home route:', currentPath)
        return
      }
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
    // ✅ CRITICAL: Don't execute if not on home page
    if (!isHomePage) {
      return
    }
    
    // ✅ Double check pathname inside effect as well
    if (typeof window === 'undefined') return
    
    const currentPath = window.location.pathname
    // Only redirect if we're on the home page
    if (currentPath !== '/' || (pathname !== '/' && pathname !== null && pathname !== undefined)) {
      return
    }
    
    if (user && mounted && !loading && isHomePage) {
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
