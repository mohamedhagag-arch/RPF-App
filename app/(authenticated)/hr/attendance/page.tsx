'use client'

import HRAttendance from '@/components/hr/HRAttendance'
import { PermissionPage } from '@/components/ui/PermissionPage'
import { DynamicTitle } from '@/components/ui/DynamicTitle'

export default function AttendancePage() {
  return (
    <PermissionPage 
      permission="hr.attendance.view"
      accessDeniedTitle="HR Attendance Access Required"
      accessDeniedMessage="You need permission to view HR Attendance. Please contact your administrator."
    >
      <DynamicTitle pageTitle="HR - Attendance" />
      <HRAttendance />
    </PermissionPage>
  )
}

