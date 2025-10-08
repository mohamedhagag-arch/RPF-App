'use client'

import { SettingsPage as Settings } from '@/components/settings/SettingsPage'
import { HolidaysSettings } from '@/components/settings/HolidaysSettings'
import { CustomActivitiesManager } from '@/components/settings/CustomActivitiesManager'
import { CompanySettings } from '@/components/settings/CompanySettings'
import { useAuth } from '@/app/providers'
import { useState } from 'react'
import { ModernCard } from '@/components/ui/ModernCard'
import { ModernButton } from '@/components/ui/ModernButton'

export default function SettingsPage() {
  const { appUser } = useAuth()
  const [activeTab, setActiveTab] = useState<'general' | 'company' | 'holidays' | 'activities'>('general')

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Manage your application settings
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <ModernButton
          variant={activeTab === 'general' ? 'primary' : 'ghost'}
          onClick={() => setActiveTab('general')}
          size="sm"
        >
          General Settings
        </ModernButton>
        <ModernButton
          variant={activeTab === 'company' ? 'primary' : 'ghost'}
          onClick={() => setActiveTab('company')}
          size="sm"
        >
          Company Settings
        </ModernButton>
        <ModernButton
          variant={activeTab === 'holidays' ? 'primary' : 'ghost'}
          onClick={() => setActiveTab('holidays')}
          size="sm"
        >
          Holidays & Workdays
        </ModernButton>
        <ModernButton
          variant={activeTab === 'activities' ? 'primary' : 'ghost'}
          onClick={() => setActiveTab('activities')}
          size="sm"
        >
          Custom Activities
        </ModernButton>
      </div>

      {/* Content */}
      {activeTab === 'general' && <Settings userRole={appUser?.role} />}
      {activeTab === 'company' && <CompanySettings />}
      {activeTab === 'holidays' && <HolidaysSettings />}
      {activeTab === 'activities' && <CustomActivitiesManager />}
    </div>
  )
}

