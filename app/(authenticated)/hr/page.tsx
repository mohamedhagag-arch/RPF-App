'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PermissionPage } from '@/components/ui/PermissionPage'
import { DynamicTitle } from '@/components/ui/DynamicTitle'
import { Briefcase, Users } from 'lucide-react'
import { usePermissionGuard } from '@/lib/permissionGuard'

export default function HRPage() {
  const router = useRouter()
  const guard = usePermissionGuard()
  
  // Redirect to manpower by default
  useEffect(() => {
    if (guard.hasAccess('hr.manpower.view')) {
      router.replace('/hr/manpower')
    }
  }, [router, guard])

  return (
    <PermissionPage 
      permission="hr.view"
      accessDeniedTitle="HR Access Required"
      accessDeniedMessage="You need permission to view HR. Please contact your administrator."
    >
      <DynamicTitle pageTitle="HR" />
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
            <Briefcase className="h-8 w-8 text-pink-500" />
            HR
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Human Resources Management
          </p>
        </div>

        {/* Loading or redirecting message */}
        <div className="min-h-[600px] flex items-center justify-center">
          <div className="text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Redirecting to Manpower...</p>
          </div>
        </div>
      </div>
    </PermissionPage>
  )
}

