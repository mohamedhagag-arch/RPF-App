'use client'

import { memo, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Project, BOQActivity } from '@/lib/supabase'
import type { ReportStats, FilteredData } from '../types'

interface OverviewTabProps {
  stats: ReportStats
  filteredData: FilteredData
  formatCurrency: (amount: number, currencyCode?: string) => string
  formatPercentage: (num: number) => string
}

export default memo(function OverviewTab({ stats, filteredData, formatCurrency, formatPercentage }: OverviewTabProps) {
  const { filteredProjects, filteredActivities } = filteredData

  // Project status distribution
  const projectStatusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    filteredProjects.forEach((p: Project) => {
      const status = p.project_status || 'unknown'
      counts[status] = (counts[status] || 0) + 1
    })
    return counts
  }, [filteredProjects])

  // Activity status distribution
  const activityStatusCounts = useMemo(() => {
    return {
      completed: filteredActivities.filter((a: BOQActivity) => a.activity_progress_percentage >= 100).length,
      inProgress: filteredActivities.filter((a: BOQActivity) => a.activity_progress_percentage > 0 && a.activity_progress_percentage < 100).length,
      notStarted: filteredActivities.filter((a: BOQActivity) => a.activity_progress_percentage === 0).length,
      delayed: filteredActivities.filter((a: BOQActivity) => a.activity_delayed).length
    }
  }, [filteredActivities])
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Project Status */}
        <Card>
          <CardHeader>
            <CardTitle>Project Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(projectStatusCounts).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                    {status.replace('-', ' ')}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${(count as number / filteredProjects.length) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold w-12 text-right">{count as number}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Activity Status */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(activityStatusCounts).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                    {status.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${(count as number / filteredActivities.length) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold w-12 text-right">{count as number}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Key Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Key Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{formatPercentage(stats.overallProgress)}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Overall Progress</p>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.earnedValue)}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Earned Value</p>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">{formatCurrency(stats.plannedValue)}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Planned Value</p>
            </div>
            <div className={`text-center p-4 rounded-lg ${stats.variance >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
              <p className={`text-2xl font-bold ${stats.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(stats.variance)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Variance</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
})

