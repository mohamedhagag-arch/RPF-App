'use client'

import { UserManagement } from '@/components/users/UserManagement'
import { useAuth } from '@/app/providers'

export default function UsersPage() {
  const { appUser } = useAuth()
  
  return (
    <div className="p-6">
      <UserManagement userRole={appUser?.role} />
    </div>
  )
}


