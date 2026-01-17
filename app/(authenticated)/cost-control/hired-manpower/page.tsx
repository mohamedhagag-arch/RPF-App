'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PermissionPage } from '@/components/ui/PermissionPage'

export default function HiredManpowerPage() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirect to MANPOWER with Hired Manpower tab
    router.replace('/cost-control/manpower?tab=hired-manpower')
  }, [router])
  
  return (
    <PermissionPage 
      permission="cost_control.hired_manpower.view"
      accessDeniedTitle="Hired Manpower Access Required"
      accessDeniedMessage="You need permission to view hired manpower. Please contact your administrator."
    >
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Redirecting to MANPOWER...</p>
        </div>
      </div>
    </PermissionPage>
  )
}

