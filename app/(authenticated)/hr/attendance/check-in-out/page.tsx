'use client'

import CheckInOutPage from '@/components/hr/attendance/CheckInOutPage'
import { PermissionPage } from '@/components/ui/PermissionPage'
import { DynamicTitle } from '@/components/ui/DynamicTitle'

export default function CheckInOutRoute() {
  return (
    <PermissionPage 
      permission="hr.attendance.check_in_out"
      accessDeniedTitle="Check-In/Out Access Required"
      accessDeniedMessage="You need permission to check in/out. Please contact your administrator."
    >
      <DynamicTitle pageTitle="Check-In/Out" />
      <CheckInOutPage />
    </PermissionPage>
  )
}

