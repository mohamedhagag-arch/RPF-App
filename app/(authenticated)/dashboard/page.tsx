'use client'

import { ProjectProgressDashboard } from '@/components/dashboard/ProjectProgressDashboard'
import { EnhancedDashboardOverview } from '@/components/dashboard/EnhancedDashboardOverview'
import { QuickActions } from '@/components/dashboard/QuickActions'
import { DataInsights } from '@/components/dashboard/DataInsights'
import { useAuth } from '@/app/providers'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const { appUser } = useAuth()
  const router = useRouter()

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Overview and analytics
          </p>
        </div>
      </div>

      <ProjectProgressDashboard />
      <EnhancedDashboardOverview globalSearchTerm="" globalFilters={{ project: '', status: '', division: '', dateRange: '' }} />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <QuickActions 
          onAction={(action: { type: string; tab?: string; data?: any }) => {
            if (action.type === 'navigate' && action.tab) {
              router.push(`/${action.tab}`)
            }
          }}
          userRole={appUser?.role}
        />
        <DataInsights />
      </div>
    </div>
  )
}

