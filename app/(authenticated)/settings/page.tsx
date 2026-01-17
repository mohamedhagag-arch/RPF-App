'use client'

import { SettingsPage as Settings } from '@/components/settings/SettingsPage'
import { HolidaysSettings } from '@/components/settings/HolidaysSettings'
import { CustomActivitiesManager } from '@/components/settings/CustomActivitiesManager'
import { CompanySettings } from '@/components/settings/CompanySettings'
import { CompaniesManager } from '@/components/settings/CompaniesManager'
import { DatabaseManagement } from '@/components/settings/DatabaseManagement'
import { UserManagement } from '@/components/users/UserManagement'
import { MaintenanceModeManager } from '@/components/settings/MaintenanceModeManager'
import { useAuth } from '@/app/providers'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { ModernCard } from '@/components/ui/ModernCard'
import { ModernButton } from '@/components/ui/ModernButton'
import { PermissionPage } from '@/components/ui/PermissionPage'
import { DynamicTitle } from '@/components/ui/DynamicTitle'

export default function SettingsPage() {
  const { appUser } = useAuth()
  const guard = usePermissionGuard()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<'general' | 'company' | 'companies' | 'holidays' | 'activities' | 'database' | 'users' | 'maintenance'>('general')
  
  // Check permissions for advanced features
  const isAdmin = appUser?.role === 'admin'
  const canManageUsers = guard.hasAccess('users.permissions') || guard.hasAccess('users.view') || isAdmin
  const canManageCompany = guard.hasAccess('settings.company') || isAdmin
  const canManageCompanies = guard.hasAccess('settings.manage') || isAdmin
  const canManageHolidays = guard.hasAccess('settings.holidays') || isAdmin
  const canManageActivities = guard.hasAccess('settings.activities') || isAdmin
  const canManageDatabase = guard.hasAccess('database.manage') || isAdmin
  const canManageMaintenance = guard.hasAccess('settings.maintenance_mode') || guard.hasAccess('settings.manage') || isAdmin

  // Handle query parameter for users tab
  useEffect(() => {
    const tab = searchParams?.get('tab')
    if (tab === 'users' && canManageUsers) {
      setActiveTab('users')
    }
    
    // If user doesn't have permission and trying to access restricted tabs, redirect to general
    if (!canManageCompany && activeTab === 'company') setActiveTab('general')
    if (!canManageCompanies && activeTab === 'companies') setActiveTab('general')
    if (!canManageHolidays && activeTab === 'holidays') setActiveTab('general')
    if (!canManageActivities && activeTab === 'activities') setActiveTab('general')
    if (!canManageDatabase && activeTab === 'database') setActiveTab('general')
    if (!canManageUsers && activeTab === 'users') setActiveTab('general')
    if (!canManageMaintenance && activeTab === 'maintenance') setActiveTab('general')
  }, [searchParams, canManageUsers, canManageCompany, canManageCompanies, canManageHolidays, canManageActivities, canManageDatabase, activeTab])

  return (
    <PermissionPage
      permission="settings.view"
      accessDeniedTitle="Settings Access Required"
      accessDeniedMessage="You need permission to view settings. Please contact your administrator."
    >
      <DynamicTitle pageTitle="Settings" />
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {(canManageUsers || canManageCompany || canManageHolidays || canManageActivities || canManageDatabase)
              ? "Manage your application settings" 
              : "Manage your personal settings"
            }
          </p>
        </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto pb-2">
        <ModernButton
          variant={activeTab === 'general' ? 'primary' : 'ghost'}
          onClick={() => setActiveTab('general')}
          size="sm"
        >
          General Settings
        </ModernButton>
        
        {/* Company Settings Tab */}
        {canManageCompany && (
          <ModernButton
            variant={activeTab === 'company' ? 'primary' : 'ghost'}
            onClick={() => setActiveTab('company')}
            size="sm"
          >
            Company Settings
          </ModernButton>
        )}
        
        {/* Companies Management Tab */}
        {canManageCompanies && (
          <ModernButton
            variant={activeTab === 'companies' ? 'primary' : 'ghost'}
            onClick={() => setActiveTab('companies')}
            size="sm"
          >
            🏢 Companies
          </ModernButton>
        )}
        
        {/* Holidays Tab */}
        {canManageHolidays && (
          <ModernButton
            variant={activeTab === 'holidays' ? 'primary' : 'ghost'}
            onClick={() => setActiveTab('holidays')}
            size="sm"
          >
            Holidays & Workdays
          </ModernButton>
        )}
        
        {/* Activities Tab */}
        {canManageActivities && (
          <ModernButton
            variant={activeTab === 'activities' ? 'primary' : 'ghost'}
            onClick={() => setActiveTab('activities')}
            size="sm"
          >
            Custom Activities
          </ModernButton>
        )}
        
        {/* Database Tab */}
        {canManageDatabase && (
          <ModernButton
            variant={activeTab === 'database' ? 'primary' : 'ghost'}
            onClick={() => setActiveTab('database')}
            size="sm"
          >
            🗄️ Database Management
          </ModernButton>
        )}
        
        {/* Users Tab */}
        {canManageUsers && (
          <ModernButton
            variant={activeTab === 'users' ? 'primary' : 'ghost'}
            onClick={() => setActiveTab('users')}
            size="sm"
          >
            👥 User Management
          </ModernButton>
        )}
        
        {/* Maintenance Mode Tab */}
        {canManageMaintenance && (
          <ModernButton
            variant={activeTab === 'maintenance' ? 'primary' : 'ghost'}
            onClick={() => setActiveTab('maintenance')}
            size="sm"
            className="relative"
          >
            🛠️ Maintenance Mode
          </ModernButton>
        )}
      </div>

      {/* Content */}
        {activeTab === 'general' && <Settings userRole={appUser?.role} />}
        {activeTab === 'company' && canManageCompany && <CompanySettings />}
        {activeTab === 'companies' && canManageCompanies && <CompaniesManager />}
        {activeTab === 'holidays' && canManageHolidays && <HolidaysSettings />}
        {activeTab === 'activities' && canManageActivities && <CustomActivitiesManager />}
        {activeTab === 'database' && canManageDatabase && <DatabaseManagement />}
        {activeTab === 'users' && canManageUsers && <UserManagement userRole={appUser?.role} />}
        {activeTab === 'maintenance' && canManageMaintenance && <MaintenanceModeManager />}
      </div>
    </PermissionPage>
  )
}

