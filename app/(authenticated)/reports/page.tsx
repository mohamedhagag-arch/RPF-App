'use client'

import { ModernReportsManager } from '@/components/reports/ModernReportsManager'
import { PermissionPage } from '@/components/ui/PermissionPage'
import { DynamicTitle } from '@/components/ui/DynamicTitle'

export default function ReportsPage() {
  return (
    <PermissionPage 
      permission="reports.view"
      accessDeniedTitle="Reports Access Required"
      accessDeniedMessage="You need permission to view reports. Please contact your administrator."
    >
      <DynamicTitle pageTitle="Reports" />
      <div className="p-6">
        <ModernReportsManager />
      </div>
    </PermissionPage>
  )
}


