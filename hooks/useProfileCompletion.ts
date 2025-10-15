import { useState, useEffect } from 'react'
import { checkProfileCompletion, ProfileCompletionStatus } from '@/lib/profileCompletionGuard'

export function useProfileCompletion(userId: string | null) {
  const [status, setStatus] = useState<ProfileCompletionStatus>({
    isComplete: false,
    missingFields: [],
    completionPercentage: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    const checkStatus = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const result = await checkProfileCompletion(userId)
        setStatus(result)
      } catch (err: any) {
        console.error('Error checking profile completion:', err)
        setError(err.message || 'Failed to check profile completion')
      } finally {
        setLoading(false)
      }
    }

    checkStatus()
  }, [userId])

  const refreshStatus = async () => {
    if (!userId) return

    try {
      setLoading(true)
      setError(null)
      
      const result = await checkProfileCompletion(userId)
      setStatus(result)
    } catch (err: any) {
      console.error('Error refreshing profile completion:', err)
      setError(err.message || 'Failed to refresh profile completion')
    } finally {
      setLoading(false)
    }
  }

  return {
    status,
    loading,
    error,
    refreshStatus
  }
}
