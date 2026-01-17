'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PermissionPage } from '@/components/ui/PermissionPage'

export default function RPFEquipmentPage() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirect to Machine List with RPF Equipment tab
    router.replace('/cost-control/machine-list?tab=rpf-equipment')
  }, [router])
  
  return (
    <PermissionPage
      permission="cost_control.rpf_equipment.view"
      accessDeniedTitle="RPF Equipment Access Required"
      accessDeniedMessage="You need permission to view RPF equipment. Please contact your administrator."
    >
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Redirecting to Machine List...</p>
        </div>
      </div>
    </PermissionPage>
  )
}

