'use client'

import { Users } from 'lucide-react'
import { PermissionPage } from '@/components/ui/PermissionPage'
import { DynamicTitle } from '@/components/ui/DynamicTitle'
import HiredManpowerList from '@/components/cost-control/HiredManpowerList'

export default function HiredManpowerPage() {
  return (
    <PermissionPage 
      permission="cost_control.hired_manpower.view"
      accessDeniedTitle="Hired Manpower Access Required"
      accessDeniedMessage="You need permission to view hired manpower. Please contact your administrator."
    >
      <DynamicTitle pageTitle="Hired Manpower" />
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-500" />
            Hired Manpower
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage hired manpower records and track labor costs
          </p>
        </div>

        {/* Content */}
        <HiredManpowerList />
      </div>
    </PermissionPage>
  )
}

