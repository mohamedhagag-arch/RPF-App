'use client'

import { ModernReportsManager } from '@/components/reports/ModernReportsManager'
import { PermissionPage } from '@/components/ui/PermissionPage'

export default function ReportsPage() {
  return (
    <PermissionPage 
      permission="reports.view"
      accessDeniedTitle="Reports Access Required"
      accessDeniedMessage="You need permission to view reports. Please contact your administrator."
    >
      <div className="p-6">
        <ModernReportsManager />
      </div>
    </PermissionPage>
  )
}


