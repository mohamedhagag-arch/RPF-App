'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/app/providers'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { ProjectsList } from '../projects/ProjectsList'
import { BOQManagement } from '../boq/BOQManagement'
import { KPITracking } from '../kpi/KPITracking'
import { DashboardOverview } from './DashboardOverview'

type TabType = 'dashboard' | 'projects' | 'boq' | 'kpi'

export function Dashboard() {
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

    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview />
      case 'projects':
        return <ProjectsList />
      case 'boq':
        return <BOQManagement />
      case 'kpi':
        return <KPITracking />
      default:
        return <DashboardOverview />
    }
  }

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
