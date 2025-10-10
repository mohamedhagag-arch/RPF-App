'use client'

import { useMemo } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { Project, BOQActivity, KPIRecord } from '@/lib/supabase'

interface DashboardChartsProps {
  projects: Project[]
  activities: BOQActivity[]
  kpis: KPIRecord[]
}

export function DashboardCharts({ projects, activities, kpis }: DashboardChartsProps) {
  const guard = usePermissionGuard()
  // Project Status Distribution
  const projectStatusData = useMemo(() => {
    const statusCounts = projects.reduce((acc, project) => {
      acc[project.project_status] = (acc[project.project_status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
      percentage: (count / projects.length) * 100
    }))
  }, [projects])

  // Monthly Progress Trend
  const monthlyProgressData = useMemo(() => {
    const monthlyData = projects.reduce((acc, project) => {
      const month = new Date(project.created_at).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short' 
      })
      
      if (!acc[month]) {
        acc[month] = { total: 0, completed: 0 }
      }
      
      acc[month].total++
      if (project.project_status === 'completed') {
        acc[month].completed++
      }
      
      return acc
    }, {} as Record<string, { total: number; completed: number }>)

    return Object.entries(monthlyData).map(([month, data]) => ({
      month,
      total: data.total,
      completed: data.completed,
      completionRate: (data.completed / data.total) * 100
    }))
  }, [projects])

  // Division Performance
  const divisionData = useMemo(() => {
    const divisionStats = projects.reduce((acc, project) => {
      const division = project.responsible_division
      
      if (!acc[division]) {
        acc[division] = { total: 0, completed: 0, totalValue: 0 }
      }
      
      acc[division].total++
      if (project.project_status === 'completed') {
        acc[division].completed++
      }
      
      return acc
    }, {} as Record<string, { total: number; completed: number; totalValue: number }>)

    return Object.entries(divisionStats).map(([division, stats]) => ({
      division,
      total: stats.total,
      completed: stats.completed,
      completionRate: (stats.completed / stats.total) * 100
    })).sort((a, b) => b.completionRate - a.completionRate)
  }, [projects])

  // KPI Performance Over Time
  const kpiPerformanceData = useMemo(() => {
    const kpiByMonth = kpis.reduce((acc, kpi) => {
      const activityDate = kpi.activity_date || kpi.target_date || kpi.actual_date
      if (!activityDate) return acc
      
      const month = new Date(activityDate).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short' 
      })
      
      if (!acc[month]) {
        acc[month] = { total: 0, completed: 0 }
      }
      
      acc[month].total++
      if (kpi.status === 'completed') {
        acc[month].completed++
      }
      
      return acc
    }, {} as Record<string, { total: number; completed: number }>)

    return Object.entries(kpiByMonth).map(([month, data]) => ({
      month,
      total: data.total,
      completed: data.completed,
      completionRate: (data.completed / data.total) * 100
    }))
  }, [kpis])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Project Status Distribution */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Project Status Distribution</h3>
        
        <div className="space-y-4">
          {projectStatusData.map((item) => (
            <div key={item.status} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`h-4 w-4 rounded-full ${
                  item.status === 'completed' ? 'bg-green-500' :
                  item.status === 'active' ? 'bg-blue-500' :
                  item.status === 'on_hold' ? 'bg-orange-500' : 'bg-gray-500'
                }`}></div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                  {item.status.replace('_', ' ')}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 dark:text-gray-400">{item.count}</span>
                <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      item.status === 'completed' ? 'bg-green-500' :
                      item.status === 'active' ? 'bg-blue-500' :
                      item.status === 'on_hold' ? 'bg-orange-500' : 'bg-gray-500'
                    }`}
                    style={{ width: `${item.percentage}%` }}
                  ></div>
                </div>
                <span className="text-sm font-bold text-gray-900 dark:text-white w-12 text-right">
                  {item.percentage.toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Division Performance */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Division Performance</h3>
        
        <div className="space-y-4">
          {divisionData.slice(0, 5).map((item) => (
            <div key={item.division} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xs font-bold">
                    {item.division.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{item.division}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {item.completed}/{item.total} completed
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {item.completionRate.toFixed(1)}%
                </p>
                <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                  <div 
                    className={`h-2 rounded-full ${
                      item.completionRate >= 80 ? 'bg-green-500' :
                      item.completionRate >= 60 ? 'bg-blue-500' :
                      item.completionRate >= 40 ? 'bg-orange-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${item.completionRate}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Progress Trend */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Monthly Progress Trend</h3>
        
        <div className="space-y-3">
          {monthlyProgressData.slice(-6).map((item) => (
            <div key={item.month} className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.month}</span>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {item.completed}/{item.total}
                </span>
                <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full"
                    style={{ width: `${item.completionRate}%` }}
                  ></div>
                </div>
                <span className="text-sm font-bold text-gray-900 dark:text-white w-12 text-right">
                  {item.completionRate.toFixed(0)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* KPI Performance */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">KPI Performance</h3>
        
        <div className="space-y-3">
          {kpiPerformanceData.slice(-6).map((item) => (
            <div key={item.month} className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.month}</span>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {item.completed}/{item.total}
                </span>
                <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full"
                    style={{ width: `${item.completionRate}%` }}
                  ></div>
                </div>
                <span className="text-sm font-bold text-gray-900 dark:text-white w-12 text-right">
                  {item.completionRate.toFixed(0)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
