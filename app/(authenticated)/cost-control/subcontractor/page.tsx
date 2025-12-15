'use client'

import { HardHat } from 'lucide-react'
import { PermissionPage } from '@/components/ui/PermissionPage'
import { DynamicTitle } from '@/components/ui/DynamicTitle'
import SubcontractorList from '@/components/cost-control/SubcontractorList'

export default function SubcontractorPage() {
  return (
    <PermissionPage 
      permission="cost_control.subcontractor.view"
      accessDeniedTitle="Subcontractor Access Required"
      accessDeniedMessage="You need permission to view subcontractors. Please contact your administrator."
    >
      <DynamicTitle pageTitle="Subcontractor" />
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
            <HardHat className="h-8 w-8 text-indigo-500" />
            Subcontractor
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage subcontractors and their activities
          </p>
        </div>

        {/* Content */}
        <SubcontractorList />
      </div>
    </PermissionPage>
  )
}

