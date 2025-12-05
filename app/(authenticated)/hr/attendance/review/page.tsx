'use client'

import AttendanceReview from '@/components/hr/attendance/AttendanceReview'
import { PermissionPage } from '@/components/ui/PermissionPage'
import { DynamicTitle } from '@/components/ui/DynamicTitle'

export default function AttendanceReviewPage() {
  return (
    <PermissionPage 
      permission="hr.attendance.review"
      accessDeniedTitle="Attendance Review Access Required"
      accessDeniedMessage="You need permission to review attendance. Please contact your administrator."
    >
      <DynamicTitle pageTitle="Review Attendance" />
      <AttendanceReview />
    </PermissionPage>
  )
}

