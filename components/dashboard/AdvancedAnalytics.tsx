'use client'

import { useMemo } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { Project, BOQActivity, KPIRecord } from '@/lib/supabase'
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart, 
  Activity,
  Target,
  Calendar,
  DollarSign,
  Users,
  Building2,
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'

interface AdvancedAnalyticsProps {
  projects: Project[]
  activities: BOQActivity[]
  kpis: KPIRecord[]
}

export function AdvancedAnalytics({ projects, activities, kpis }: AdvancedAnalyticsProps) {
  const guard = usePermissionGuard()
  // Performance Metrics
  const performanceMetrics = useMemo(() => {
    const totalProjects = projects.length
    const activeProjects = projects.filter(p => p.project_status === 'on-going').length
    const completedProjects = projects.filter(p => p.project_status === 'completed-duration' || p.project_status === 'contract-completed').length
    
    const totalActivities = activities.length
    const completedActivities = activities.filter(a => a.activity_completed).length
    
    const totalKPIs = kpis.length
    const completedKPIs = kpis.filter(k => k.status === 'completed').length
    
    // Calculate total value
    const totalValue = activities.reduce((sum, activity) => sum + (activity.total_value || 0), 0)
    const completedValue = activities
      .filter(activity => activity.activity_completed)
      .reduce((sum, activity) => sum + (activity.total_value || 0), 0)
    
    // Calculate efficiency metrics
    const projectCompletionRate = totalProjects > 0 ? (completedProjects / totalProjects) * 100 : 0
    const activityCompletionRate = totalActivities > 0 ? (completedActivities / totalActivities) * 100 : 0
    const kpiCompletionRate = totalKPIs > 0 ? (completedKPIs / totalKPIs) * 100 : 0
    const valueCompletionRate = totalValue > 0 ? (completedValue / totalValue) * 100 : 0
    
    // Calculate average project duration (simplified)
    const now = new Date()
    const averageProjectAge = projects.length > 0 
      ? projects.reduce((sum, project) => {
          const createdDate = new Date(project.created_at)
          const ageInDays = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
          return sum + ageInDays
        }, 0) / projects.length
      : 0
    
    return {
      projectCompletionRate,
      activityCompletionRate,
      kpiCompletionRate,
      valueCompletionRate,
      averageProjectAge,
      totalValue,
      completedValue,
      totalProjects,
      activeProjects,
      completedProjects
    }
  }, [projects, activities, kpis])

  // Trend Analysis
  const trendAnalysis = useMemo(() => {
    const now = new Date()
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    
    // Projects created this month vs last month
    const thisMonthProjects = projects.filter(p => new Date(p.created_at) >= lastMonth).length
    const lastMonthProjects = projects.filter(p => {
      const createdDate = new Date(p.created_at)
      return createdDate >= new Date(lastMonth.getFullYear(), lastMonth.getMonth() - 1, lastMonth.getDate()) &&
             createdDate < lastMonth
    }).length
    
    // Activities completed this week vs last week
    const thisWeekActivities = activities.filter(a => {
      const completedDate = a.updated_at ? new Date(a.updated_at) : null
      return completedDate && completedDate >= lastWeek && a.activity_completed
    }).length
    
    const lastWeekActivities = activities.filter(a => {
      const completedDate = a.updated_at ? new Date(a.updated_at) : null
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
      return completedDate && completedDate >= twoWeeksAgo && completedDate < lastWeek && a.activity_completed
    }).length
    
    // KPIs completed this week vs last week
    const thisWeekKPIs = kpis.filter(k => {
      const completedDate = k.updated_at ? new Date(k.updated_at) : null
      return completedDate && completedDate >= lastWeek && k.status === 'completed'
    }).length
    
    const lastWeekKPIs = kpis.filter(k => {
      const completedDate = k.updated_at ? new Date(k.updated_at) : null
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
      return completedDate && completedDate >= twoWeeksAgo && completedDate < lastWeek && k.status === 'completed'
    }).length
    
    return {
      projectGrowth: lastMonthProjects > 0 ? ((thisMonthProjects - lastMonthProjects) / lastMonthProjects) * 100 : 0,
      activityGrowth: lastWeekActivities > 0 ? ((thisWeekActivities - lastWeekActivities) / lastWeekActivities) * 100 : 0,
      kpiGrowth: lastWeekKPIs > 0 ? ((thisWeekKPIs - lastWeekKPIs) / lastWeekKPIs) * 100 : 0
    }
  }, [projects, activities, kpis])

  // Division Performance Analysis
  const divisionAnalysis = useMemo(() => {
    const divisionStats = projects.reduce((acc, project) => {
      const division = project.responsible_division
      
      if (!acc[division]) {
        acc[division] = {
          totalProjects: 0,
          completedProjects: 0,
          totalValue: 0,
          completedValue: 0,
          activities: 0,
          completedActivities: 0
        }
      }
      
      acc[division].totalProjects++
      if (project.project_status === 'completed-duration' || project.project_status === 'contract-completed') {
        acc[division].completedProjects++
      }
      
      // Add activities for this project
      const projectActivities = activities.filter(a => a.project_code === project.project_code)
      acc[division].activities += projectActivities.length
      acc[division].completedActivities += projectActivities.filter(a => a.activity_completed).length
      
      // Add values
      const projectValue = projectActivities.reduce((sum, a) => sum + (a.total_value || 0), 0)
      const completedProjectValue = projectActivities
        .filter(a => a.activity_completed)
        .reduce((sum, a) => sum + (a.total_value || 0), 0)
      
      acc[division].totalValue += projectValue
      acc[division].completedValue += completedProjectValue
      
      return acc
    }, {} as Record<string, any>)

    return Object.entries(divisionStats).map(([division, stats]) => ({
      division,
      ...stats,
      projectCompletionRate: stats.totalProjects > 0 ? (stats.completedProjects / stats.totalProjects) * 100 : 0,
      activityCompletionRate: stats.activities > 0 ? (stats.completedActivities / stats.activities) * 100 : 0,
      valueCompletionRate: stats.totalValue > 0 ? (stats.completedValue / stats.totalValue) * 100 : 0,
      efficiency: (stats.projectCompletionRate + stats.activityCompletionRate + stats.valueCompletionRate) / 3
    })).sort((a, b) => b.efficiency - a.efficiency)
  }, [projects, activities])

  // Risk Analysis
  const riskAnalysis = useMemo(() => {
    const now = new Date()
    const overdueKPIs = kpis.filter(k => {
      const activityDate = k.activity_date || k.target_date
      return k.status !== 'completed' && activityDate && new Date(activityDate) < now
    }).length
    const todayKPIs = kpis.filter(k => {
      const activityDate = k.activity_date || k.target_date
      return activityDate === now.toISOString().split('T')[0] && k.status !== 'completed'
    }).length
    
    // Projects with no progress
    const stalledProjects = projects.filter(project => {
      if (project.project_status !== 'on-going') return false
      const projectActivities = activities.filter(a => a.project_code === project.project_code)
      return projectActivities.length > 0 && projectActivities.every(a => !a.activity_completed)
    }).length
    
    // High variance activities
    const highVarianceActivities = activities.filter(activity => {
      const variance = Math.abs(activity.variance_units || 0)
      const plannedUnits = activity.planned_units || 0
      return plannedUnits > 0 && (variance / plannedUnits) > 0.5
    }).length
    
    return {
      overdueKPIs,
      todayKPIs,
      stalledProjects,
      highVarianceActivities,
      riskScore: Math.min(100, (overdueKPIs * 10) + (todayKPIs * 5) + (stalledProjects * 8) + (highVarianceActivities * 3))
    }
  }, [projects, activities, kpis])

  const getTrendIcon = (value: number) => {
    return value >= 0 ? (
      <TrendingUp className="h-4 w-4 text-green-500" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-500" />
    )
  }

  const getTrendColor = (value: number) => {
    return value >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
  }

  return (
    <div className="space-y-6">
      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Target className="h-5 w-5 text-white" />
            </div>
            <div className="flex items-center gap-1">
              {getTrendIcon(trendAnalysis.projectGrowth)}
              <span className={`text-sm font-medium ${getTrendColor(trendAnalysis.projectGrowth)}`}>
                {Math.abs(trendAnalysis.projectGrowth).toFixed(1)}%
              </span>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {performanceMetrics.projectCompletionRate.toFixed(1)}%
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Project Completion Rate</p>
        </div>

        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="h-10 w-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div className="flex items-center gap-1">
              {getTrendIcon(trendAnalysis.activityGrowth)}
              <span className={`text-sm font-medium ${getTrendColor(trendAnalysis.activityGrowth)}`}>
                {Math.abs(trendAnalysis.activityGrowth).toFixed(1)}%
              </span>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {performanceMetrics.activityCompletionRate.toFixed(1)}%
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Activity Completion Rate</p>
        </div>

        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="h-10 w-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <div className="flex items-center gap-1">
              {getTrendIcon(trendAnalysis.kpiGrowth)}
              <span className={`text-sm font-medium ${getTrendColor(trendAnalysis.kpiGrowth)}`}>
                {Math.abs(trendAnalysis.kpiGrowth).toFixed(1)}%
              </span>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {performanceMetrics.kpiCompletionRate.toFixed(1)}%
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">KPI Completion Rate</p>
        </div>

        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="h-10 w-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                {performanceMetrics.valueCompletionRate.toFixed(1)}%
              </span>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            ${(performanceMetrics.completedValue / 1000000).toFixed(1)}M
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Value Completed</p>
        </div>
      </div>

      {/* Division Performance */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Division Performance Analysis</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {divisionAnalysis.slice(0, 6).map((division) => (
            <div key={division.division} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm font-bold">
                      {division.division.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">{division.division}</h4>
                </div>
                <span className="text-sm font-bold text-gray-600 dark:text-gray-400">
                  {division.efficiency.toFixed(1)}%
                </span>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Projects</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {division.completedProjects}/{division.totalProjects}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full"
                    style={{ width: `${division.projectCompletionRate}%` }}
                  ></div>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Activities</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {division.completedActivities}/{division.activities}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full"
                    style={{ width: `${division.activityCompletionRate}%` }}
                  ></div>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Value</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    ${(division.completedValue / 1000000).toFixed(1)}M
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full"
                    style={{ width: `${division.valueCompletionRate}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Risk Analysis */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Risk Analysis</h3>
          <div className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${
              riskAnalysis.riskScore < 30 ? 'bg-green-500' :
              riskAnalysis.riskScore < 60 ? 'bg-orange-500' : 'bg-red-500'
            }`}></div>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Risk Score: {riskAnalysis.riskScore}/100
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span className="text-sm font-medium text-red-800 dark:text-red-400">Overdue KPIs</span>
            </div>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{riskAnalysis.overdueKPIs}</p>
          </div>
          
          <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <span className="text-sm font-medium text-orange-800 dark:text-orange-400">Due Today</span>
            </div>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{riskAnalysis.todayKPIs}</p>
          </div>
          
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="h-5 w-5 text-yellow-500" />
              <span className="text-sm font-medium text-yellow-800 dark:text-yellow-400">Stalled Projects</span>
            </div>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{riskAnalysis.stalledProjects}</p>
          </div>
          
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              <span className="text-sm font-medium text-blue-800 dark:text-blue-400">High Variance</span>
            </div>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{riskAnalysis.highVarianceActivities}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
