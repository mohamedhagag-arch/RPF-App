'use client'

import { useEffect } from 'react'

export default function AuthenticatedPage() {
  useEffect(() => {
    // Redirect to dashboard as the default authenticated page
    window.location.href = '/dashboard'
  }, [])
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Redirecting to dashboard...</p>
      </div>
    </div>
  )
}
