'use client'

import { useState, useEffect } from 'react'
import { getSupabaseClient, executeQuery } from '@/lib/simpleConnectionManager'
import { useSmartLoading } from '@/lib/smartLoadingManager'
import { TABLES } from '@/lib/supabase'
import { mapProjectFromDB, mapBOQFromDB, mapKPIFromDB } from '@/lib/dataMappers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  PieChart, 
  Activity,
  Calendar,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign
} from 'lucide-react'

interface DataInsightsProps {
  expanded?: boolean
}

interface InsightData {
  projectDistribution: Array<{
    status: string
    count: number
    percentage: number
  }>
  activityTrends: Array<{
    month: string
    completed: number
    delayed: number
    onTrack: number
  }>
  kpiPerformance: Array<{
    status: string
    count: number
    percentage: number
  }>
  divisionPerformance: Array<{
    division: string
    projects: number
    activities: number
    completionRate: number
  }>
  financialInsights: {
    totalValue: number
    completedValue: number
    remainingValue: number
    averageProjectValue: number
  }
  timeInsights: {
    averageCompletionTime: number
    onTimeProjects: number
    delayedProjects: number
    criticalProjects: number
  }
}

export function DataInsights({ expanded = false }: DataInsightsProps) {
  const [insights, setInsights] = useState<InsightData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedView, setSelectedView] = useState<'overview' | 'trends' | 'performance' | 'financial'>('overview')
  
  const supabase = getSupabaseClient()
  const { startSmartLoading, stopSmartLoading } = useSmartLoading('data-insights')

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        setLoading(true)
        setError('')

        // Fetch all data
        const [projectsResult, activitiesResult, kpisResult] = await Promise.all([
          supabase.from(TABLES.PROJECTS).select('*'),
          supabase.from(TABLES.BOQ_ACTIVITIES).select('*'),
          supabase.from(TABLES.KPI).select('*') // ✅ Use main KPI table
        ])

        if (projectsResult.error) throw projectsResult.error
        if (activitiesResult.error) throw activitiesResult.error
        if (kpisResult.error) throw kpisResult.error

        const projects = (projectsResult.data || []).map(mapProjectFromDB)
        const activities = (activitiesResult.data || []).map(mapBOQFromDB)
        const kpis = (kpisResult.data || []).map(mapKPIFromDB)

        // Calculate project distribution
        const projectStatuses = ['active', 'completed', 'on_hold', 'cancelled']
        const projectDistribution = projectStatuses.map(status => {
          const count = projects.filter(p => p.project_status === status).length
          return {
            status,
            count,
            percentage: projects.length > 0 ? (count / projects.length) * 100 : 0
          }
        }).filter(item => item.count > 0)

        // Calculate activity trends (last 6 months)
        const activityTrends = []
        const now = new Date()
        for (let i = 5; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
          const month = date.toLocaleDateString('en-US', { month: 'short' })
          
          const monthActivities = activities.filter(a => {
            const activityDate = new Date(a.created_at)
            return activityDate.getMonth() === date.getMonth() && activityDate.getFullYear() === date.getFullYear()
          })

          activityTrends.push({
            month,
            completed: monthActivities.filter(a => a.activity_completed).length,
            delayed: monthActivities.filter(a => a.activity_delayed).length,
            onTrack: monthActivities.filter(a => a.activity_on_track).length
          })
        }

        // Calculate KPI performance
        const kpiStatuses = ['on_track', 'delayed', 'completed', 'at_risk']
        const kpiPerformance = kpiStatuses.map(status => {
          const count = kpis.filter(k => k.status === status).length
          return {
            status,
            count,
            percentage: kpis.length > 0 ? (count / kpis.length) * 100 : 0
          }
        }).filter(item => item.count > 0)

        // Calculate division performance
        const divisions = Array.from(new Set(projects.map(p => p.responsible_division).filter(Boolean)))
        const divisionPerformance = divisions.map(division => {
          const divisionProjects = projects.filter(p => p.responsible_division === division)
          const divisionActivities = activities.filter(a => 
            divisionProjects.some(p => p.id === a.project_id)
          )
          const completedActivities = divisionActivities.filter(a => a.activity_completed).length
          
          return {
            division,
            projects: divisionProjects.length,
            activities: divisionActivities.length,
            completionRate: divisionActivities.length > 0 ? (completedActivities / divisionActivities.length) * 100 : 0
          }
        }).sort((a, b) => b.completionRate - a.completionRate)

        // Calculate financial insights
        const totalValue = projects.reduce((sum, p) => sum + (p.contract_amount || 0), 0)
        const completedValue = activities
          .filter(a => a.activity_completed)
          .reduce((sum, a) => sum + (a.total_value || 0), 0)
        const remainingValue = totalValue - completedValue
        const averageProjectValue = projects.length > 0 ? totalValue / projects.length : 0

        // Calculate time insights
        const completedProjects = projects.filter(p => p.project_status === 'completed')
        const onTimeProjects = completedProjects.filter(p => {
          // This would need actual deadline data to be accurate
          return true // Placeholder
        }).length
        const delayedProjects = projects.filter(p => p.project_status === 'on_hold').length
        const criticalProjects = activities.filter(a => a.activity_delayed).length

        setInsights({
          projectDistribution,
          activityTrends,
          kpiPerformance,
          divisionPerformance,
          financialInsights: {
            totalValue,
            completedValue,
            remainingValue,
            averageProjectValue
          },
          timeInsights: {
            averageCompletionTime: 0, // Would need actual data
            onTimeProjects,
            delayedProjects,
            criticalProjects
          }
        })
      } catch (error: any) {
        console.error('Error fetching insights:', error)
        setError('Failed to load insights data')
      } finally {
        setLoading(false)
      }
    }

    fetchInsights()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Run only once on mount

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-red-600">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!insights) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-gray-600">No insights data available</p>
        </CardContent>
      </Card>
    )
  }

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'bg-green-500',
      completed: 'bg-blue-500',
      on_hold: 'bg-yellow-500',
      cancelled: 'bg-red-500',
      on_track: 'bg-green-500',
      delayed: 'bg-red-500',
      at_risk: 'bg-orange-500'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-500'
  }

  const getStatusIcon = (status: string) => {
    const icons = {
      active: CheckCircle,
      completed: CheckCircle,
      on_hold: Clock,
      cancelled: AlertTriangle,
      on_track: CheckCircle,
      delayed: AlertTriangle,
      at_risk: AlertTriangle
    }
    return icons[status as keyof typeof icons] || Activity
  }

  if (expanded) {
    return (
      <div className="space-y-6">
        {/* View Selector */}
        <Card>
          <CardContent className="p-4">
            <div className="flex space-x-2">
              {[
                { id: 'overview', label: 'Overview', icon: BarChart3 },
                { id: 'trends', label: 'Trends', icon: TrendingUp },
                { id: 'performance', label: 'Performance', icon: Target },
                { id: 'financial', label: 'Financial', icon: DollarSign }
              ].map((view) => {
                const Icon = view.icon
                return (
                  <Button
                    key={view.id}
                    variant={selectedView === view.id ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedView(view.id as any)}
                    className="flex items-center space-x-2"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{view.label}</span>
                  </Button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Expanded Content */}
        {selectedView === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Project Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {insights.projectDistribution.map((item, index) => {
                    const Icon = getStatusIcon(item.status)
                    return (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${getStatusColor(item.status)}`}></div>
                          <Icon className="h-4 w-4 text-gray-500" />
                          <span className="capitalize">{item.status.replace('_', ' ')}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold">{item.count}</span>
                          <span className="text-sm text-gray-500 ml-2">({item.percentage.toFixed(1)}%)</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>KPI Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {insights.kpiPerformance.map((item, index) => {
                    const Icon = getStatusIcon(item.status)
                    return (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${getStatusColor(item.status)}`}></div>
                          <Icon className="h-4 w-4 text-gray-500" />
                          <span className="capitalize">{item.status.replace('_', ' ')}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold">{item.count}</span>
                          <span className="text-sm text-gray-500 ml-2">({item.percentage.toFixed(1)}%)</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {selectedView === 'trends' && (
          <Card>
            <CardHeader>
              <CardTitle>Activity Trends (Last 6 Months)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {insights.activityTrends.map((trend, index) => (
                  <div key={index} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">{trend.month}</span>
                      <span className="text-sm text-gray-500">
                        Total: {trend.completed + trend.delayed + trend.onTrack}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Completed: {trend.completed}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span>On Track: {trend.onTrack}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span>Delayed: {trend.delayed}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {selectedView === 'performance' && (
          <Card>
            <CardHeader>
              <CardTitle>Division Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {insights.divisionPerformance.map((division, index) => (
                  <div key={index} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">{division.division}</span>
                      <span className="text-sm text-gray-500">
                        {division.completionRate.toFixed(1)}% completion
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>Projects: {division.projects}</div>
                      <div>Activities: {division.activities}</div>
                    </div>
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(division.completionRate, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {selectedView === 'financial' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Financial Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Contract Value</span>
                    <span className="font-semibold">AED {(insights.financialInsights.totalValue || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Completed Value</span>
                    <span className="font-semibold text-green-600">AED {(insights.financialInsights.completedValue || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Remaining Value</span>
                    <span className="font-semibold text-blue-600">AED {(insights.financialInsights.remainingValue || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average Project Value</span>
                    <span className="font-semibold">AED {(insights.financialInsights.averageProjectValue || 0).toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Time Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>On Time Projects</span>
                    <span className="font-semibold text-green-600">{insights.timeInsights.onTimeProjects}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delayed Projects</span>
                    <span className="font-semibold text-red-600">{insights.timeInsights.delayedProjects}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Critical Activities</span>
                    <span className="font-semibold text-orange-600">{insights.timeInsights.criticalProjects}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    )
  }

  // Compact view
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <BarChart3 className="h-5 w-5" />
          <span>Data Insights</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{insights.projectDistribution.length}</div>
              <div className="text-sm text-blue-600">Project Statuses</div>
            </div>
            <div className="text-center p-3 bg-green-50 dark:bg-green-900 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{insights.kpiPerformance.length}</div>
              <div className="text-sm text-green-600">KPI Categories</div>
            </div>
          </div>
          
          <div className="text-center p-3 bg-purple-50 dark:bg-purple-900 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              AED {(insights.financialInsights.totalValue || 0).toLocaleString()}
            </div>
            <div className="text-sm text-purple-600">Total Contract Value</div>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {/* Navigate to expanded view */}}
          >
            View Detailed Insights
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
