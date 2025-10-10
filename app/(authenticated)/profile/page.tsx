'use client'

import UserProfile from '@/components/users/UserProfile'
import { PermissionPage } from '@/components/ui/PermissionPage'

export default function ProfilePage() {
  return (
    <PermissionPage
      permission="users.view"
      accessDeniedTitle="Profile Access Required"
      accessDeniedMessage="You need permission to view your profile. Please contact your administrator."
    >
      <div className="p-6">
        <UserProfile />
      </div>
    </PermissionPage>
  )
}

