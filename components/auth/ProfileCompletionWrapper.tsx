'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
  const { user: authUser } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [hasChecked, setHasChecked] = useState(false)
  
  const { status, loading, error, refreshStatus } = useProfileCompletion(authUser?.id || null)

  useEffect(() => {
    // Only check once when component mounts and user is available
    if (authUser?.id && !hasChecked) {
      setHasChecked(true)
    }
  }, [authUser?.id, hasChecked])

  useEffect(() => {
    // Show modal if profile is incomplete and we're not loading
    if (hasChecked && !loading && !status.isComplete && authUser?.id) {
      setShowModal(true)
    }
  }, [hasChecked, loading, status.isComplete, authUser?.id])

  const handleProfileComplete = async () => {
    setShowModal(false)
    // Refresh the status after completion
    await refreshStatus()
  }

  // Show loading while checking profile completion
  if (loading && !hasChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Checking your profile...</p>
        </div>
      </div>
    )
  }

  // Show error if there's an issue checking profile
  if (error) {
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

  return (
    <>
      {/* Show children if profile is complete */}
      {status.isComplete && children}
      
      {/* Show modal if profile is incomplete */}
      <ProfileCompletionModal
        isOpen={showModal}
        onComplete={handleProfileComplete}
        userId={authUser?.id || ''}
        userEmail={authUser?.email || ''}
      />
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
