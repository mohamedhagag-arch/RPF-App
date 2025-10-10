'use client'

import { BOQManagement } from '@/components/boq/BOQManagement'
import { PermissionPage } from '@/components/ui/PermissionPage'

export default function BOQPage() {
  return (
    <PermissionPage 
      permission="boq.view"
      accessDeniedTitle="BOQ Access Required"
      accessDeniedMessage="You need permission to view BOQ. Please contact your administrator."
    >
      <div className="p-6">
        <BOQManagement globalSearchTerm="" globalFilters={{ project: '', status: '', division: '', dateRange: '' }} />
      </div>
    </PermissionPage>
  )
}

