'use client'

import { useMemo } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { Project, BOQActivity, KPIRecord } from '@/lib/supabase'
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  TrendingDown, 
  DollarSign,
  Target,
  Calendar,
  Users,
  Zap
} from 'lucide-react'

interface SmartAlertsProps {
  projects: Project[]
  activities: BOQActivity[]
  kpis: KPIRecord[]
}

interface Alert {
  id: string
  type: 'warning' | 'error' | 'info' | 'success'
  title: string
  description: string
  action?: string
  priority: 'high' | 'medium' | 'low'
  timestamp: string
}

export function SmartAlerts({ projects, activities, kpis }: SmartAlertsProps) {
  const guard = usePermissionGuard()
  const alerts = useMemo(() => {
    const alertsList: Alert[] = []
    const now = new Date()
    const today = now.toISOString().split('T')[0]

    // Overdue KPIs
    const overdueKPIs = kpis.filter(kpi => {
      // Use activity_date which is the unified date field in KPIRecord
      const activityDate = kpi.activity_date
      return kpi.status !== 'completed' && activityDate && new Date(activityDate) < now
    })
    
    overdueKPIs.forEach(kpi => {
      // Use activity_date which is the unified date field in KPIRecord
      const activityDate = kpi.activity_date || ''
      alertsList.push({
        id: `overdue-kpi-${kpi.id}`,
        type: 'error',
        title: 'Overdue KPI',
        description: `${kpi.kpi_name || kpi.activity_description || kpi.activity_name} was due on ${new Date(activityDate).toLocaleDateString()}`,
        action: 'Update KPI status',
        priority: 'high',
        timestamp: activityDate
      })
    })

    // Today's KPIs
    const todayKPIs = kpis.filter(kpi => {
      // Use activity_date which is the unified date field in KPIRecord
      const activityDate = kpi.activity_date
      return activityDate === today && kpi.status !== 'completed'
    })
    
    todayKPIs.forEach(kpi => {
      alertsList.push({
        id: `today-kpi-${kpi.id}`,
        type: 'warning',
        title: 'KPI Due Today',
        description: `${kpi.kpi_name || kpi.activity_description || kpi.activity_name} is due today`,
        action: 'Complete KPI',
        priority: 'high',
        timestamp: today
      })
    })

    // Projects with no progress
    const stalledProjects = projects.filter(project => {
      if (project.project_status !== 'on-going') return false
      
      const projectActivities = activities.filter(activity => 
        activity.project_code === project.project_code
      )
      
      const completedActivities = projectActivities.filter(activity => 
        activity.activity_completed
      )
      
      return projectActivities.length > 0 && completedActivities.length === 0
    })

    stalledProjects.forEach(project => {
      alertsList.push({
        id: `stalled-project-${project.id}`,
        type: 'warning',
        title: 'Stalled Project',
        description: `${project.project_name} has no completed activities`,
        action: 'Review project activities',
        priority: 'medium',
        timestamp: project.updated_at
      })
    })

    // Projects approaching deadline (if we had deadline data)
    const recentProjects = projects.filter(project => {
      const createdDate = new Date(project.created_at)
      const daysSinceCreation = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
      return daysSinceCreation > 30 && project.project_status === 'on-going'
    })

    recentProjects.slice(0, 3).forEach(project => {
      alertsList.push({
        id: `long-running-project-${project.id}`,
        type: 'info',
        title: 'Long Running Project',
        description: `${project.project_name} has been active for over 30 days`,
        action: 'Review project timeline',
        priority: 'low',
        timestamp: project.created_at
      })
    })

    // High value projects with low progress
    const highValueProjects = projects.filter(project => {
      const projectActivities = activities.filter(activity => 
        activity.project_code === project.project_code
      )
      
      const totalValue = projectActivities.reduce((sum, activity) => 
        sum + (activity.total_value || 0), 0
      )
      
      const completedValue = projectActivities
        .filter(activity => activity.activity_completed)
        .reduce((sum, activity) => sum + (activity.total_value || 0), 0)
      
      const progressRate = totalValue > 0 ? (completedValue / totalValue) * 100 : 0
      
      return totalValue > 1000000 && progressRate < 20 && project.project_status === 'on-going'
    })

    highValueProjects.forEach(project => {
      alertsList.push({
        id: `high-value-slow-${project.id}`,
        type: 'warning',
        title: 'High Value Project Needs Attention',
        description: `${project.project_name} has low progress despite high value`,
        action: 'Accelerate project activities',
        priority: 'medium',
        timestamp: project.updated_at
      })
    })

    // Activities with significant variance
    const highVarianceActivities = activities.filter(activity => {
      const variance = Math.abs(activity.variance_units || 0)
      const plannedUnits = activity.planned_units || 0
      const variancePercentage = plannedUnits > 0 ? (variance / plannedUnits) * 100 : 0
      
      return variancePercentage > 50 && !activity.activity_completed
    })

    highVarianceActivities.slice(0, 5).forEach(activity => {
      alertsList.push({
        id: `variance-activity-${activity.id}`,
        type: 'info',
        title: 'High Variance Activity',
        description: `${activity.activity_description} has significant variance from planned units`,
        action: 'Review activity progress',
        priority: 'medium',
        timestamp: activity.updated_at || activity.created_at
      })
    })

    // Sort by priority and timestamp
    return alertsList.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
      
      if (priorityDiff !== 0) return priorityDiff
      
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    })
  }, [projects, activities, kpis])

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-red-500" />
      case 'warning':
        return <Clock className="h-5 w-5 text-orange-500" />
      case 'info':
        return <Target className="h-5 w-5 text-blue-500" />
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-500" />
    }
  }

  const getAlertColor = (type: Alert['type']) => {
    switch (type) {
      case 'error':
        return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
      case 'warning':
        return 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20'
      case 'info':
        return 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20'
      case 'success':
        return 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
      default:
        return 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50'
    }
  }

  const getPriorityBadge = (priority: Alert['priority']) => {
    const colors = {
      high: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      medium: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
    }
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[priority]}`}>
        {priority.toUpperCase()}
      </span>
    )
  }

  if (alerts.length === 0) {
    return (
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
        <div className="text-center py-8">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">All Clear!</h3>
          <p className="text-gray-600 dark:text-gray-400">
            No alerts or issues detected. Everything is running smoothly.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Smart Alerts</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {alerts.length} active alert{alerts.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-600 dark:text-gray-400">Live</span>
        </div>
      </div>

      <div className="space-y-4 max-h-96 overflow-y-auto scrollbar-thin">
        {alerts.map((alert) => (
          <div 
            key={alert.id}
            className={`p-4 rounded-xl border ${getAlertColor(alert.type)} hover:shadow-md transition-all duration-200`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {getAlertIcon(alert.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {alert.title}
                  </h4>
                  {getPriorityBadge(alert.priority)}
                </div>
                
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                  {alert.description}
                </p>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-500">
                    {new Date(alert.timestamp).toLocaleDateString()}
                  </span>
                  
                  {alert.action && (
                    <button className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors">
                      {alert.action} →
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}