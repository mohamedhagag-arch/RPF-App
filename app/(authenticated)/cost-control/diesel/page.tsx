'use client'

import { PermissionGuard } from '@/components/common/PermissionGuard'
import DieselList from '@/components/cost-control/DieselList'

export default function DieselPage() {
  return (
    <PermissionGuard permission="cost_control.diesel.view">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Diesel</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage diesel records and track fuel consumption
          </p>
        </div>
        <DieselList />
      </div>
    </PermissionGuard>
  )
}

