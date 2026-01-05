'use client'

import { ModernProfessionalDashboard } from '@/components/dashboard/ModernProfessionalDashboard'
import { PermissionPage } from '@/components/ui/PermissionPage'
import { DynamicTitle } from '@/components/ui/DynamicTitle'

export default function DashboardPage() {
  return (
    <PermissionPage 
      permission="dashboard.view"
      accessDeniedTitle="Dashboard Access Required"
      accessDeniedMessage="You need permission to view the dashboard. Please contact your administrator."
    >
      <DynamicTitle pageTitle="Dashboard" />
      <ModernProfessionalDashboard />
    </PermissionPage>
  )
}

