'use client'

import { useMemo } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { Project, BOQActivity, KPIRecord } from '@/lib/supabase'

interface DashboardOptimizationsProps {
  projects: Project[]
  activities: BOQActivity[]
  kpis: KPIRecord[]
}

export function DashboardOptimizations({ projects, activities, kpis }: DashboardOptimizationsProps) {
  const guard = usePermissionGuard()
  // Performance optimizations
  const optimizations = useMemo(() => {
    const suggestions = []

    // Check for projects with many incomplete activities
    const projectsWithManyIncomplete = projects.filter(project => {
      const projectActivities = activities.filter(a => a.project_code === project.project_code)
      const incompleteActivities = projectActivities.filter(a => !a.activity_completed)
      return incompleteActivities.length > 5 && project.project_status === 'on-going'
    })

    if (projectsWithManyIncomplete.length > 0) {
      suggestions.push({
        type: 'warning',
        title: 'Projects with Many Incomplete Activities',
        description: `${projectsWithManyIncomplete.length} projects have more than 5 incomplete activities`,
        action: 'Consider breaking down large activities into smaller tasks',
        impact: 'high'
      })
    }

    // Check for activities with high variance
    const highVarianceActivities = activities.filter(activity => {
      const variance = Math.abs(activity.variance_units || 0)
      const plannedUnits = activity.planned_units || 0
      return plannedUnits > 0 && (variance / plannedUnits) > 0.3
    })

    if (highVarianceActivities.length > 0) {
      suggestions.push({
        type: 'info',
        title: 'Activities with High Variance',
        description: `${highVarianceActivities.length} activities show significant variance from planned values`,
        action: 'Review planning accuracy and update estimates',
        impact: 'medium'
      })
    }

    // Check for overdue KPIs
    const now = new Date()
    const overdueKPIs = kpis.filter(kpi => {
      // Use activity_date which is the unified date field in KPIRecord
      const activityDate = kpi.activity_date
      return kpi.status !== 'completed' && activityDate && new Date(activityDate) < now
    })
    
    if (overdueKPIs.length > 0) {
      suggestions.push({
        type: 'error',
        title: 'Overdue KPIs',
        description: `${overdueKPIs.length} KPIs are overdue and need attention`,
        action: 'Update KPI status or reschedule deadlines',
        impact: 'high'
      })
    }

    // Check for projects without recent updates
    const staleProjects = projects.filter(project => {
      const lastUpdate = new Date(project.updated_at)
      const daysSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24)
      return daysSinceUpdate > 7 && project.project_status === 'on-going'
    })

    if (staleProjects.length > 0) {
      suggestions.push({
        type: 'warning',
        title: 'Projects Without Recent Updates',
        description: `${staleProjects.length} active projects haven't been updated in over a week`,
        action: 'Schedule regular project reviews and updates',
        impact: 'medium'
      })
    }

    // Check for resource allocation
    const divisionWorkload = projects.reduce((acc, project) => {
      const division = project.responsible_division
      if (!acc[division]) {
        acc[division] = { projects: 0, totalValue: 0 }
      }
      acc[division].projects++
      
      const projectActivities = activities.filter(a => a.project_code === project.project_code)
      const projectValue = projectActivities.reduce((sum, a) => sum + (a.total_value || 0), 0)
      acc[division].totalValue += projectValue
      
      return acc
    }, {} as Record<string, { projects: number; totalValue: number }>)

    const maxProjects = Math.max(...Object.values(divisionWorkload).map(d => d.projects))
    const overloadedDivisions = Object.entries(divisionWorkload)
      .filter(([_, data]) => data.projects === maxProjects && data.projects > 3)
      .map(([division, _]) => division)

    if (overloadedDivisions.length > 0) {
      suggestions.push({
        type: 'info',
        title: 'Resource Allocation Optimization',
        description: `${overloadedDivisions.join(', ')} division(s) have the highest project load`,
        action: 'Consider redistributing projects or adding resources',
        impact: 'medium'
      })
    }

    return suggestions
  }, [projects, activities, kpis])

  const getOptimizationIcon = (type: string) => {
    switch (type) {
      case 'error':
        return '🔴'
      case 'warning':
        return '🟡'
      case 'info':
        return '🔵'
      default:
        return '⚪'
    }
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'text-red-600 dark:text-red-400'
      case 'medium':
        return 'text-orange-600 dark:text-orange-400'
      case 'low':
        return 'text-blue-600 dark:text-blue-400'
      default:
        return 'text-gray-600 dark:text-gray-400'
    }
  }

  if (optimizations.length === 0) {
    return (
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
        <div className="text-center py-8">
          <div className="text-4xl mb-4">🎉</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Excellent Performance!</h3>
          <p className="text-gray-600 dark:text-gray-400">
            No optimization suggestions at this time. Your projects are well-managed!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-8 w-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
          <span className="text-white text-sm font-bold">⚡</span>
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Performance Optimizations</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {optimizations.length} suggestion{optimizations.length !== 1 ? 's' : ''} to improve efficiency
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {optimizations.map((optimization, index) => (
          <div 
            key={index}
            className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
          >
            <div className="flex items-start gap-3">
              <div className="text-2xl">{getOptimizationIcon(optimization.type)}</div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {optimization.title}
                  </h4>
                  <span className={`text-xs font-medium ${getImpactColor(optimization.impact)}`}>
                    {optimization.impact.toUpperCase()} IMPACT
                  </span>
                </div>
                
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                  {optimization.description}
                </p>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-500">
                    Suggested Action
                  </span>
                  
                  <button className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors">
                    {optimization.action} →
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
