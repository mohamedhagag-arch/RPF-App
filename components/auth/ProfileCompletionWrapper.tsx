'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/app/providers'
import { useProfileCompletion } from '@/hooks/useProfileCompletion'
import { ProfileCompletionModal } from './ProfileCompletionModal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Alert } from '@/components/ui/Alert'
import { XCircle, AlertTriangle } from 'lucide-react'

interface ProfileCompletionWrapperProps {
  children: React.ReactNode
}

export function ProfileCompletionWrapper({ children }: ProfileCompletionWrapperProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user: authUser } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [hasChecked, setHasChecked] = useState(false)
  
  const { status, loading, error, refreshStatus } = useProfileCompletion(authUser?.id || null)

  // ✅ FIX: Pages that should always be accessible regardless of profile completion
  // These are public profile pages or pages that don't require profile completion
  const alwaysAllowPages = [
    '/profile/', // Profile pages (including /profile/[userId])
    '/directory', // Directory page
    '/qr/', // QR code pages
  ]
  
  // ✅ CRITICAL: Handle pathname being null/undefined on initial render
  const currentPath = pathname || (typeof window !== 'undefined' ? window.location.pathname : '')
  const shouldCheckProfile = !alwaysAllowPages.some(path => currentPath?.startsWith(path))

  useEffect(() => {
    // Only check once when component mounts and user is available
    if (authUser?.id && !hasChecked && shouldCheckProfile) {
      setHasChecked(true)
    } else if (!shouldCheckProfile) {
      // For pages that don't need profile check, mark as checked immediately
      setHasChecked(true)
    }
  }, [authUser?.id, hasChecked, shouldCheckProfile, pathname])

  useEffect(() => {
    // Show modal if profile is incomplete and we're not loading
    // But only if we're checking profile (not on allowed pages)
    if (hasChecked && !loading && !status.isComplete && authUser?.id && shouldCheckProfile) {
      setShowModal(true)
    }
  }, [hasChecked, loading, status.isComplete, authUser?.id, shouldCheckProfile])

  const handleProfileComplete = async () => {
    setShowModal(false)
    // Refresh the status after completion
    await refreshStatus()
  }

  // Show loading while checking profile completion (only for pages that need it)
  if (loading && !hasChecked && shouldCheckProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Checking your profile...</p>
        </div>
      </div>
    )
  }

  // Show error if there's an issue checking profile (only for pages that need it)
  if (error && shouldCheckProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-md w-full">
          <Alert variant="error">
            <XCircle className="h-4 w-4" />
            <div>
              <h3 className="font-medium">Profile Check Failed</h3>
              <p className="text-sm mt-1">{error}</p>
              <button 
                onClick={() => {
                  // ✅ Re-check profile without full reload
                  window.location.href = window.location.href
                }}
                className="text-sm underline mt-2 hover:no-underline"
              >
                Retry
              </button>
            </div>
          </Alert>
        </div>
      </div>
    )
  }

  // ✅ FIX: Always show children on pages that don't require profile check
  // For pages that need profile check: only show if profile is complete
  const shouldShowChildren = !shouldCheckProfile 
    ? true // Always show on allowed pages (profile pages, directory, etc.)
    : status.isComplete // For other pages, only show if profile is complete

  return (
    <>
      {/* Show children if on allowed pages OR if profile is complete */}
      {shouldShowChildren && children}
      
      {/* Show modal if profile is incomplete (only on pages that need it) */}
      {shouldCheckProfile && (
        <ProfileCompletionModal
          isOpen={showModal}
          onComplete={handleProfileComplete}
          userId={authUser?.id || ''}
          userEmail={authUser?.email || ''}
        />
      )}
    </>
  )
}

/**
 * Alternative component that shows a banner instead of blocking access
 */
export function ProfileCompletionBanner({ children }: ProfileCompletionWrapperProps) {
  const router = useRouter()
  const { user: authUser } = useAuth()
  const [showBanner, setShowBanner] = useState(false)
  const [hasChecked, setHasChecked] = useState(false)
  
  const { status, loading } = useProfileCompletion(authUser?.id || null)

  useEffect(() => {
    if (authUser?.id && !hasChecked) {
      setHasChecked(true)
    }
  }, [authUser?.id, hasChecked])

  useEffect(() => {
    if (hasChecked && !loading && !status.isComplete && authUser?.id) {
      setShowBanner(true)
    }
  }, [hasChecked, loading, status.isComplete, authUser?.id])

  return (
    <div className="min-h-screen flex flex-col">
      {/* Banner */}
      {showBanner && (
        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white p-4 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-5 w-5" />
              <div>
                <h3 className="font-semibold">Complete Your Profile</h3>
                <p className="text-sm text-yellow-100">
                  Please complete your profile information to access all features ({status.completionPercentage}% complete)
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push('/profile')}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Complete Now
            </button>
          </div>
        </div>
      )}
      
      {/* Main content */}
      <div className="flex-1">
        {children}
      </div>
    </div>
  )
}
