'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PermissionPage } from '@/components/ui/PermissionPage'
import { DynamicTitle } from '@/components/ui/DynamicTitle'
import { ShoppingCart, Building2 } from 'lucide-react'
import { usePermissionGuard } from '@/lib/permissionGuard'

export default function ProcurementPage() {
  const router = useRouter()
  const guard = usePermissionGuard()
  
  // Redirect to vendor-list by default
  useEffect(() => {
    if (guard.hasAccess('procurement.vendor_list.view')) {
      router.replace('/procurement/vendor-list')
    }
  }, [router, guard])

  return (
    <PermissionPage 
      permission="procurement.view"
      accessDeniedTitle="Procurement Access Required"
      accessDeniedMessage="You need permission to view Procurement. Please contact your administrator."
    >
      <DynamicTitle pageTitle="Procurement" />
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
            <ShoppingCart className="h-8 w-8 text-teal-500" />
            Procurement
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Procurement Management
          </p>
        </div>

        {/* Loading or redirecting message */}
        <div className="min-h-[600px] flex items-center justify-center">
          <div className="text-center">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Redirecting to Vendor List...</p>
          </div>
        </div>
      </div>
    </PermissionPage>
  )
}

