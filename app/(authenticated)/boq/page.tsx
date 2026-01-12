'use client'

import { ActivitiesManagement } from '@/components/boq/BOQManagement'
import { PermissionPage } from '@/components/ui/PermissionPage'
import { DynamicTitle } from '@/components/ui/DynamicTitle'

export default function BOQPage() {
  return (
    <PermissionPage 
      permission="boq.view"
      accessDeniedTitle="BOQ Access Required"
      accessDeniedMessage="You need permission to view BOQ. Please contact your administrator."
    >
      <DynamicTitle pageTitle="BOQ" />
      <div className="p-6">
        <ActivitiesManagement globalSearchTerm="" globalFilters={{ project: '', status: '', division: '', dateRange: '' }} />
      </div>
    </PermissionPage>
  )
}

