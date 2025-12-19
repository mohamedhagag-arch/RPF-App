'use client'

import { PermissionGuard } from '@/components/common/PermissionGuard'
import OtherCostList from '@/components/cost-control/OtherCostList'

export default function OtherCostPage() {
  return (
    <PermissionGuard permission="cost_control.other_cost.view">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Other Cost</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage other cost records and track miscellaneous expenses
          </p>
        </div>
        <OtherCostList />
      </div>
    </PermissionGuard>
  )
}

