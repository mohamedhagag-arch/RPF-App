'use client'

import { IntegratedDashboard } from '@/components/dashboard/IntegratedDashboard'
import { PermissionPage } from '@/components/ui/PermissionPage'

export default function DashboardPage() {
  return (
    <PermissionPage 
      permission="dashboard.view"
      accessDeniedTitle="Dashboard Access Required"
      accessDeniedMessage="You need permission to view the dashboard. Please contact your administrator."
    >
      <IntegratedDashboard />
    </PermissionPage>
  )
}

