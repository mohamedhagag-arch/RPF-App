'use client'

import { PermissionGuard } from '@/components/common/PermissionGuard'
import RentedEquipmentList from '@/components/cost-control/RentedEquipmentList'

export default function RentedEquipmentPage() {
  return (
    <PermissionGuard permission="cost_control.rented_equipment.view">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Rented Equipment</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage rented equipment records and track rental costs
          </p>
        </div>
        <RentedEquipmentList />
      </div>
    </PermissionGuard>
  )
}

