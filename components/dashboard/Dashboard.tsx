'use client'

import { useState, useEffect, useRef } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { useAuth } from '@/app/providers'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { ProjectsList } from '../projects/ProjectsList'
import { BOQManagement } from '../boq/BOQManagement'
import { KPITracking } from '../kpi/KPITracking'
import { DashboardOverview } from './DashboardOverview'

type TabType = 'dashboard' | 'projects' | 'boq' | 'kpi'

export function Dashboard() {
  const guard = usePermissionGuard()
  const { appUser } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')
  const [mounted, setMounted] = useState(false)
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

    // Check permissions before rendering content
    switch (activeTab) {
      case 'dashboard':
        if (!guard.hasAccess('dashboard.view')) return null
        return <DashboardOverview />
      case 'projects':
        if (!guard.hasAccess('projects.view')) return null
        return <ProjectsList />
      case 'boq':
        if (!guard.hasAccess('boq.view')) return null
        return <BOQManagement />
      case 'kpi':
        if (!guard.hasAccess('kpi.view')) return null
        return <KPITracking />
      default:
        if (!guard.hasAccess('dashboard.view')) return null
        return <DashboardOverview />
    }
  }
  
  // Auto-redirect to first available tab if current tab is not accessible
  useEffect(() => {
    if (!mounted) return
    
    const availableTabs: TabType[] = []
    if (guard.hasAccess('dashboard.view')) availableTabs.push('dashboard')
    if (guard.hasAccess('projects.view')) availableTabs.push('projects')
    if (guard.hasAccess('boq.view')) availableTabs.push('boq')
    if (guard.hasAccess('kpi.view')) availableTabs.push('kpi')
    
    // If current tab is not accessible, redirect to first available
    if (availableTabs.length > 0 && !availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[0])
    }
  }, [activeTab, mounted, guard])

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header user={appUser} />
      <div className="flex">
        <Sidebar activeTab={activeTab} onTabChange={handleTabChange} userRole={appUser?.role} />
        <main className="flex-1 p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  )
}
