'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { PermissionPage } from '@/components/ui/PermissionPage'
import { DynamicTitle } from '@/components/ui/DynamicTitle'
import { ModernButton } from '@/components/ui/ModernButton'
import { DollarSign, UserCheck, Database, BarChart3, TrendingUp, TrendingDown, Settings } from 'lucide-react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { useAuth } from '@/app/providers'
import CostControlOverview from '@/components/cost-control/CostControlOverview'
import CostControlManpower from '@/components/cost-control/CostControlManpower'
import CostControlDatabase from '@/components/cost-control/CostControlDatabase'

type CostControlTab = 'overview' | 'manpower' | 'database'

export default function CostControlPage() {
  const { appUser } = useAuth()
  const guard = usePermissionGuard()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<CostControlTab>('overview')
  
  // Check permissions
  const isAdmin = appUser?.role === 'admin'
  const canViewManpower = guard.hasAccess('reports.view') || isAdmin
  const canManageDatabase = guard.hasAccess('database.manage') || isAdmin
  
  // Handle query parameter for tabs
  useEffect(() => {
    const tab = searchParams?.get('tab') as CostControlTab | null
    if (tab && ['overview', 'manpower', 'database'].includes(tab)) {
      // Check permissions before setting tab
      if (tab === 'manpower' && !canViewManpower) {
        setActiveTab('overview')
        return
      }
      if (tab === 'database' && !canManageDatabase) {
        setActiveTab('overview')
        return
      }
      setActiveTab(tab)
    }
  }, [searchParams, canViewManpower, canManageDatabase])

  const tabs = [
    {
      id: 'overview' as CostControlTab,
      label: 'Overview',
      icon: BarChart3,
      description: 'Cost control statistics and overview'
    },
    {
      id: 'manpower' as CostControlTab,
      label: 'MANPOWER',
      icon: UserCheck,
      description: 'Manage and view manpower data',
      requiresPermission: canViewManpower
    },
    {
      id: 'database' as CostControlTab,
      label: 'Database Manager',
      icon: Database,
      description: 'Import, export, and manage cost control data',
      requiresPermission: canManageDatabase
    }
  ]

  const handleTabChange = (tab: CostControlTab) => {
    setActiveTab(tab)
    // Update URL without page reload
    router.push(`/cost-control?tab=${tab}`, { scroll: false })
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <CostControlOverview />
      case 'manpower':
        return canViewManpower ? <CostControlManpower /> : null
      case 'database':
        return canManageDatabase ? <CostControlDatabase /> : null
      default:
        return <CostControlOverview />
    }
  }

  return (
    <PermissionPage 
      permission="reports.view"
      accessDeniedTitle="Cost Control Access Required"
      accessDeniedMessage="You need permission to view cost control. Please contact your administrator."
    >
      <DynamicTitle pageTitle="Cost Control" />
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-yellow-500" />
            Cost Control
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Monitor and control project costs, budgets, and financial performance
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto pb-2">
          {tabs.map((tab) => {
            if (tab.requiresPermission === false) return null
            
            const Icon = tab.icon
            return (
              <ModernButton
                key={tab.id}
                variant={activeTab === tab.id ? 'primary' : 'ghost'}
                onClick={() => handleTabChange(tab.id)}
                size="sm"
                className="flex items-center gap-2"
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </ModernButton>
            )
          })}
        </div>

        {/* Tab Content */}
        <div className="min-h-[600px]">
          {renderTabContent()}
        </div>
      </div>
    </PermissionPage>
  )
}
