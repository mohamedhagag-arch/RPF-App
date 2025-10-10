'use client'

import { useAuth } from '@/app/providers'
import { Button } from '@/components/ui/Button'
import { User } from '@/lib/supabase'
import { LogOut, User as UserIcon } from 'lucide-react'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { usePermissionGuard } from '@/lib/permissionGuard'

interface HeaderProps {
  user: User | null
}

export function Header({ user }: HeaderProps) {
  const guard = usePermissionGuard()
  const { signOut } = useAuth()

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin': return 'System Administrator'
      case 'manager': return 'Project Manager'
      case 'engineer': return 'Engineer'
      case 'viewer': return 'Viewer'
      default: return role
    }
  }

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Project Management System - Rabat MVP
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <UserIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              <div className="text-sm">
                <p className="font-medium text-gray-900 dark:text-white">
                  {user?.first_name && user?.last_name 
                    ? `${user.first_name} ${user.last_name}` 
                    : user?.full_name || 'User'
                  }
                </p>
                <p className="text-gray-500 dark:text-gray-400">{getRoleDisplayName(user?.role || 'viewer')}</p>
              </div>
            </div>
            
            <ThemeToggle />
            
            <Button
              variant="outline"
              size="sm"
              onClick={signOut}
              className="flex items-center space-x-2"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
