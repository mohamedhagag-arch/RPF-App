'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/app/providers'
import { EnhancedSidebar } from './EnhancedSidebar'
import { EnhancedHeader } from './EnhancedHeader'
import { ProjectsList } from '../projects/ProjectsList'
import { BOQManagement } from '../boq/BOQManagement'
import { KPITracking } from '../kpi/KPITracking'
import { EnhancedDashboardOverview } from './EnhancedDashboardOverview'
import { ProjectProgressDashboard } from './ProjectProgressDashboard'
import { DataInsights } from './DataInsights'
import { QuickActions } from '@/components/dashboard/QuickActions'
import { SettingsPage } from '../settings/SettingsPage'
import { UserManagement } from '../users/UserManagement'
import { GlobalSearch } from '../search/GlobalSearch'
import { ImportExportManager } from '../import-export/ImportExportManager'
import { ReportsManager } from '../reports/ReportsManager'
import { AdvancedReportsManager } from '../reports/AdvancedReportsManager'

type TabType = 'dashboard' | 'projects' | 'boq' | 'kpi' | 'insights' | 'actions' | 'settings' | 'users' | 'search' | 'import-export' | 'reports'

export function EnhancedDashboard() {
  const { appUser } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')
  const [mounted, setMounted] = useState(false)
  const [globalSearchTerm, setGlobalSearchTerm] = useState('')
  const [globalFilters, setGlobalFilters] = useState({
    project: '',
    status: '',
    division: '',
    dateRange: ''
  })
  const [showGlobalSearch, setShowGlobalSearch] = useState(false)
  const [tabKey, setTabKey] = useState(0) // Force remount counter
  const mountedRef = useRef(false)

  useEffect(() => {
    if (!mountedRef.current) {
      setMounted(true)
      mountedRef.current = true
    }
  }, [])

  const renderContent = () => {
    if (!mounted) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="loading-spinner mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      )
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <ProjectProgressDashboard />
            <EnhancedDashboardOverview 
              globalSearchTerm={globalSearchTerm}
              globalFilters={globalFilters}
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <QuickActions 
                onAction={(action: { type: string; tab?: string; data?: any }) => {
                  if (action.type === 'navigate') {
                    setActiveTab(action.tab as TabType)
                  }
                }}
                userRole={appUser?.role}
              />
              <DataInsights />
            </div>
          </div>
        )
      case 'projects':
        return (
          <ProjectsList 
            key={`projects-${tabKey}`}
            globalSearchTerm={globalSearchTerm}
            globalFilters={globalFilters}
          />
        )
      case 'boq':
        return (
          <BOQManagement 
            key={`boq-${tabKey}`}
            globalSearchTerm={globalSearchTerm}
            globalFilters={globalFilters}
          />
        )
      case 'kpi':
        return (
          <KPITracking 
            key={`kpi-${tabKey}`}
            globalSearchTerm={globalSearchTerm}
            globalFilters={globalFilters}
          />
        )
      case 'insights':
        return <DataInsights expanded={true} />
      case 'actions':
        return <QuickActions expanded={true} userRole={appUser?.role} />
      case 'settings':
        return <SettingsPage userRole={appUser?.role} />
      case 'users':
        return <UserManagement userRole={appUser?.role} />
      case 'search':
        return null // Global search is handled as a modal
      case 'import-export':
        return <ImportExportManager userRole={appUser?.role} />
      case 'reports':
        return <AdvancedReportsManager />
      default:
        return <EnhancedDashboardOverview />
    }
  }

  const handleTabChange = (tab: TabType) => {
    console.log('🔄 EnhancedDashboard: Changing tab from', activeTab, 'to', tab)
    if (tab === 'search') {
      setShowGlobalSearch(true)
    } else {
      setActiveTab(tab)
      setTabKey(prev => prev + 1) // Increment to force remount
      console.log('🔄 EnhancedDashboard: Tab key incremented to force remount')
    }
  }

  const handleGlobalSearchResult = (result: any) => {
    setShowGlobalSearch(false)
    // Navigate to appropriate tab based on result type
    switch (result.type) {
      case 'project':
        setActiveTab('projects')
        break
      case 'activity':
        setActiveTab('boq')
        break
      case 'kpi':
        setActiveTab('kpi')
        break
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <EnhancedHeader 
        user={appUser} 
        globalSearchTerm={globalSearchTerm}
        onGlobalSearchChange={setGlobalSearchTerm}
        globalFilters={globalFilters}
        onGlobalFiltersChange={setGlobalFilters}
      />
      <div className="flex h-screen overflow-hidden">
        <EnhancedSidebar 
          activeTab={activeTab} 
          onTabChange={handleTabChange} 
          userRole={appUser?.role}
          enhanced={true}
        />
        <main className="flex-1 p-6 overflow-y-auto max-w-full">
          <div className="max-w-full">
            {renderContent()}
          </div>
        </main>
      </div>

      {/* Global Search Modal */}
      {showGlobalSearch && (
        <GlobalSearch
          isOpen={showGlobalSearch}
          onResultClick={handleGlobalSearchResult}
          onClose={() => setShowGlobalSearch(false)}
        />
      )}
    </div>
  )
}
