'use client'

import { KPITracking } from '@/components/kpi/KPITracking'
import { PermissionPage } from '@/components/ui/PermissionPage'
import { DynamicTitle } from '@/components/ui/DynamicTitle'

export default function KPIPage() {
  return (
    <PermissionPage 
      permission="kpi.view"
      accessDeniedTitle="KPI Access Required"
      accessDeniedMessage="You need permission to view KPI. Please contact your administrator."
    >
      <DynamicTitle pageTitle="KPI" />
      <div className="p-6">
        <KPITracking globalSearchTerm="" globalFilters={{ project: '', status: '', division: '', dateRange: '' }} />
      </div>
    </PermissionPage>
  )
}

