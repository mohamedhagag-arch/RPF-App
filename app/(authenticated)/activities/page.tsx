'use client'

import { ActivitiesManagement } from '@/components/boq/BOQManagement'
import { PermissionPage } from '@/components/ui/PermissionPage'
import { DynamicTitle } from '@/components/ui/DynamicTitle'

export default function ActivitiesPage() {
  return (
    <PermissionPage 
      permission="activities.view"
      accessDeniedTitle="Activities Access Required"
      accessDeniedMessage="You need permission to view Activities. Please contact your administrator."
    >
      <DynamicTitle pageTitle="Activities" />
      <div className="p-6">
        <ActivitiesManagement globalSearchTerm="" globalFilters={{ project: '', status: '', division: '', dateRange: '' }} />
      </div>
    </PermissionPage>
  )
}
