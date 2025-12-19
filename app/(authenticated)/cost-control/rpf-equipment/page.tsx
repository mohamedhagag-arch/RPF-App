import { Cog } from 'lucide-react'
import { PermissionPage } from '@/components/ui/PermissionPage'
import { DynamicTitle } from '@/components/ui/DynamicTitle'
import RPFEquipmentList from '@/components/cost-control/RPFEquipmentList'

export default function RPFEquipmentPage() {
  return (
    <PermissionPage
      permission="cost_control.rpf_equipment.view"
      accessDeniedTitle="RPF Equipment Access Required"
      accessDeniedMessage="You need permission to view RPF equipment. Please contact your administrator."
    >
      <DynamicTitle pageTitle="RPF Equipment" />
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
            <Cog className="h-8 w-8 text-blue-500" />
            RPF Equipment
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage RPF equipment records and track related costs
          </p>
        </div>
        <RPFEquipmentList />
      </div>
    </PermissionPage>
  )
}

