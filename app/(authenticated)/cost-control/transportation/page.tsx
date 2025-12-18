'use client'

import { Truck } from 'lucide-react'
import { PermissionPage } from '@/components/ui/PermissionPage'
import { DynamicTitle } from '@/components/ui/DynamicTitle'
import TransportationList from '@/components/cost-control/TransportationList'

export default function TransportationPage() {
  return (
    <PermissionPage 
      permission="cost_control.transportation.view"
      accessDeniedTitle="Transportation Access Required"
      accessDeniedMessage="You need permission to view transportation. Please contact your administrator."
    >
      <DynamicTitle pageTitle="Transportation" />
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
            <Truck className="h-8 w-8 text-blue-500" />
            Transportation
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage transportation records and track vehicle costs
          </p>
        </div>

        {/* Content */}
        <TransportationList />
      </div>
    </PermissionPage>
  )
}

