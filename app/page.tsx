'use client'

import { useAuth } from './providers'
import { LoginForm } from '@/components/auth/LoginForm'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { checkReloadProtection } from '@/lib/reloadProtection'

export default function Home() {
  const { user, loading } = useAuth()
  const [mounted, setMounted] = useState(false)
  const mountedRef = useRef(false)
  const router = useRouter()

  useEffect(() => {
    if (!mountedRef.current) {
      setMounted(true)
      mountedRef.current = true
    }
  }, [])

  // Redirect authenticated users to dashboard - with delay to prevent rapid redirects
  useEffect(() => {
    if (user && mounted && !loading) {
      // فحص حماية من الـ reload المتكرر
      if (!checkReloadProtection()) {
        console.warn('⚠️ Too many redirects, stopping automatic redirect')
        return
      }
      
      console.log('✅ User authenticated, redirecting to dashboard...')
      // تأخير بسيط لتجنب إعادة التوجيه السريعة
      const timer = setTimeout(() => {
        router.push('/dashboard')
      }, 2000) // زيادة التأخير إلى ثانيتين
      
      return () => clearTimeout(timer)
    }
  }, [user, mounted, loading, router])

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
