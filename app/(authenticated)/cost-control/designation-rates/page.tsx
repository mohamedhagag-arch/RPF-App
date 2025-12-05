'use client'

import DesignationRates from '@/components/cost-control/DesignationRates'
import { PermissionPage } from '@/components/ui/PermissionPage'
import { DynamicTitle } from '@/components/ui/DynamicTitle'

export default function DesignationRatesPage() {
  return (
    <PermissionPage 
      permission="cost_control.designation_rates.view"
      accessDeniedTitle="Designation Rates Access Required"
      accessDeniedMessage="You need permission to view designation rates. Please contact your administrator."
    >
      <DynamicTitle pageTitle="Designation Rates" />
      <DesignationRates />
    </PermissionPage>
  )
}

