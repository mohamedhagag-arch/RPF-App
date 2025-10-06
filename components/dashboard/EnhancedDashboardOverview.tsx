'use client'

import { useState, useEffect, useRef } from 'react'
import { getSupabaseClient } from '@/lib/supabaseConnectionManager'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Alert } from '@/components/ui/Alert'
import { TABLES } from '@/lib/supabase'
import { mapProjectFromDB, mapBOQFromDB, mapKPIFromDB } from '@/lib/dataMappers'
// import { SmartDashboardStats } from './SmartDashboardStats' // ✅ Removed - file deleted
// import { SmartAlerts } from './SmartAlerts' // ✅ Removed - file deleted
// import { TopPerformers } from './TopPerformers' // ✅ Removed - file deleted
// import { RecentActivityFeed } from './RecentActivityFeed' // ✅ Removed - file deleted
import { 
  FolderOpen, 
  ClipboardList, 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  DollarSign,
  Calendar,
  Target,
  Activity,
  Zap,
  Award
} from 'lucide-react'

interface DashboardStats {
  totalProjects: number
  activeProjects: number
  completedProjects: number
  onHoldProjects: number
  totalActivities: number
  completedActivities: number
  delayedActivities: number
  onTrackActivities: number
  totalKPIs: number
  onTrackKPIs: number
  delayedKPIs: number
  completedKPIs: number
  totalContractValue: number
  completedValue: number
  remainingValue: number
  averageProgress: number
  topPerformingProjects: Array<{
    project_code: string
    project_name: string
    progress: number
    status: string
  }>
  recentActivities: Array<{
    id: string
    project_code: string
    activity_name: string
    status: string
    updated_at: string
  }>
  kpiTrends: Array<{
    month: string
    onTrack: number
    delayed: number
    completed: number
  }>
}

interface EnhancedDashboardOverviewProps {
  globalSearchTerm?: string
  globalFilters?: {
    project: string
    status: string
    division: string
    dateRange: string
  }
}

export function EnhancedDashboardOverview({ 
  globalSearchTerm = '', 
  globalFilters = { project: '', status: '', division: '', dateRange: '' } 
}: EnhancedDashboardOverviewProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)
  const mountedRef = useRef(false)
  
  const supabase = getSupabaseClient() // ✅ Use managed connection

  useEffect(() => {
    if (!mountedRef.current) {
      setMounted(true)
      mountedRef.current = true
    }
  }, [])

  useEffect(() => {
    if (!mounted) return

    const fetchEnhancedStats = async () => {
      try {
        setLoading(true)
        setError('')

        // Fetch all data with enhanced queries
        const [projectsResult, activitiesResult, kpisResult] = await Promise.all([
          supabase
            .from(TABLES.PROJECTS)
            .select('*')
            .order('created_at', { ascending: false }),
          supabase
            .from(TABLES.BOQ_ACTIVITIES)
            .select('*')
            .order('created_at', { ascending: false }),
          supabase
            .from(TABLES.KPI) // ✅ Use main KPI table
            .select('*')
            .order('created_at', { ascending: false })
        ])

        if (projectsResult.error) throw projectsResult.error
        if (activitiesResult.error) throw activitiesResult.error
        if (kpisResult.error) throw kpisResult.error

        // Map database data to application format
        const projects = (projectsResult.data || []).map(mapProjectFromDB)
        const activities = (activitiesResult.data || []).map(mapBOQFromDB)
        const kpis = (kpisResult.data || []).map(mapKPIFromDB)

        // Apply global filters
        let filteredProjects = projects
        let filteredActivities = activities
        let filteredKPIs = kpis

        if (globalSearchTerm) {
          const searchLower = globalSearchTerm.toLowerCase()
          filteredProjects = projects.filter(p => 
            (p.project_name || '').toLowerCase().includes(searchLower) ||
            (p.project_code || '').toLowerCase().includes(searchLower)
          )
          filteredActivities = activities.filter(a => 
            (a.activity_name || '').toLowerCase().includes(searchLower) ||
            (a.project_code || '').toLowerCase().includes(searchLower)
          )
          filteredKPIs = kpis.filter(k => 
            (k.kpi_name || '').toLowerCase().includes(searchLower)
          )
        }

        if (globalFilters.project) {
          filteredActivities = filteredActivities.filter(a => a.project_code === globalFilters.project)
          filteredKPIs = filteredKPIs.filter(k => {
            const project = projects.find(p => p.id === k.project_id)
            return project?.project_code === globalFilters.project
          })
        }

        if (globalFilters.status) {
          filteredProjects = filteredProjects.filter(p => p.project_status === globalFilters.status)
          filteredActivities = filteredActivities.filter(a => {
            if (globalFilters.status === 'completed') return a.activity_completed
            if (globalFilters.status === 'delayed') return a.activity_delayed
            if (globalFilters.status === 'on_track') return a.activity_on_track
            return true
          })
          filteredKPIs = filteredKPIs.filter(k => k.status === globalFilters.status)
        }

        if (globalFilters.division) {
          filteredProjects = filteredProjects.filter(p => p.responsible_division === globalFilters.division)
        }

        // Calculate enhanced statistics
        const totalProjects = filteredProjects.length
        const activeProjects = filteredProjects.filter(p => p.project_status === 'active').length
        const completedProjects = filteredProjects.filter(p => p.project_status === 'completed').length
        const onHoldProjects = filteredProjects.filter(p => p.project_status === 'on_hold').length

        const totalActivities = filteredActivities.length
        const completedActivities = filteredActivities.filter(a => a.activity_completed).length
        const delayedActivities = filteredActivities.filter(a => a.activity_delayed).length
        const onTrackActivities = filteredActivities.filter(a => a.activity_on_track).length

        const totalKPIs = filteredKPIs.length
        const onTrackKPIs = filteredKPIs.filter(k => k.status === 'on_track').length
        const delayedKPIs = filteredKPIs.filter(k => k.status === 'delayed').length
        const completedKPIs = filteredKPIs.filter(k => k.status === 'completed').length

        // Calculate financial metrics
        const totalContractValue = filteredProjects.reduce((sum, p) => sum + (p.contract_amount || 0), 0)
        const completedValue = filteredActivities
          .filter(a => a.activity_completed)
          .reduce((sum, a) => sum + (a.total_value || 0), 0)
        const remainingValue = totalContractValue - completedValue

        // Calculate average progress
        const averageProgress = totalActivities > 0 
          ? filteredActivities.reduce((sum, a) => sum + (a.activity_progress_percentage || 0), 0) / totalActivities
          : 0

        // Top performing projects (by activity progress)
        const topPerformingProjects = filteredProjects
          .map(project => {
            const projectActivities = filteredActivities.filter(a => 
              a.project_code === project.project_code || 
              a.project_full_code === project.project_code
            )
            const progress = projectActivities.length > 0
              ? projectActivities.reduce((sum, a) => sum + (a.activity_progress_percentage || 0), 0) / projectActivities.length
              : 0
            return {
              project_code: project.project_code || '',
              project_name: project.project_name || '',
              progress: Math.round(progress),
              status: project.project_status || 'active',
              totalActivities: projectActivities.length,
              completedActivities: projectActivities.filter(a => a.activity_completed).length
            }
          })
          .filter(p => p.totalActivities > 0) // Only projects with activities
          .sort((a, b) => b.progress - a.progress)
          .slice(0, 5)

        // Recent activities
        const recentActivities = filteredActivities
          .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
          .slice(0, 10)
          .map(activity => ({
            id: activity.id,
            project_code: activity.project_code || '',
            activity_name: activity.activity_name || activity.activity || '',
            status: activity.activity_completed ? 'completed' : 
                   activity.activity_delayed ? 'delayed' : 
                   activity.activity_on_track ? 'on_track' : 'pending',
            progress: activity.activity_progress_percentage || 0,
            updated_at: activity.updated_at || activity.created_at
          }))

        // KPI trends (last 6 months)
        const kpiTrends = []
        const now = new Date()
        for (let i = 5; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
          const month = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
          
          const monthKPIs = filteredKPIs.filter(k => {
            const kpiDate = new Date(k.created_at)
            return kpiDate.getMonth() === date.getMonth() && kpiDate.getFullYear() === date.getFullYear()
          })

          kpiTrends.push({
            month,
            onTrack: monthKPIs.filter(k => k.status === 'on_track').length,
            delayed: monthKPIs.filter(k => k.status === 'delayed').length,
            completed: monthKPIs.filter(k => k.status === 'completed').length
          })
        }

        setStats({
          totalProjects,
          activeProjects,
          completedProjects,
          onHoldProjects,
          totalActivities,
          completedActivities,
          delayedActivities,
          onTrackActivities,
          totalKPIs,
          onTrackKPIs,
          delayedKPIs,
          completedKPIs,
          totalContractValue,
          completedValue,
          remainingValue,
          averageProgress,
          topPerformingProjects,
          recentActivities,
          kpiTrends
        })
      } catch (error: any) {
        console.error('Error fetching enhanced dashboard stats:', error)
        setError('Failed to load dashboard data')
        setStats(null)
      } finally {
        setLoading(false)
      }
    }

    fetchEnhancedStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalSearchTerm, globalFilters]) // ✅ FIXED: Removed 'mounted' to prevent infinite loop

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading enhanced dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="error">
        {error}
      </Alert>
    )
  }

  if (!stats) {
    return (
      <Alert variant="warning">
        No data available
      </Alert>
    )
  }

  const statCards = [
    {
      title: 'Total Projects',
      value: stats.totalProjects,
      icon: FolderOpen,
      color: 'blue',
      trend: stats.activeProjects,
      trendLabel: 'Active'
    },
    {
      title: 'BOQ Activities',
      value: stats.totalActivities,
      icon: ClipboardList,
      color: 'green',
      trend: stats.completedActivities,
      trendLabel: 'Completed'
    },
    {
      title: 'KPI Records',
      value: stats.totalKPIs,
      icon: BarChart3,
      color: 'purple',
      trend: stats.onTrackKPIs,
      trendLabel: 'On Track'
    },
    {
      title: 'Contract Value',
      value: `AED ${(stats.totalContractValue || 0).toLocaleString()}`,
      icon: DollarSign,
      color: 'yellow',
      trend: stats.completedValue,
      trendLabel: 'Completed Value'
    }
  ]

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      green: 'bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-300',
      purple: 'bg-purple-50 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
      yellow: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
    }
    return colors[color as keyof typeof colors] || colors.blue
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProjects}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalActivities}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Progress</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageProgress.toFixed(1)}%</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total KPIs</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalKPIs}</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Alerts */}
      {stats.delayedActivities > 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4" />
          <div>
            <h4 className="font-semibold">Delayed Activities</h4>
            <p className="text-sm">{stats.delayedActivities} activities are behind schedule</p>
          </div>
        </Alert>
      )}

      {/* Progress Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>Overall Progress</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Average Progress</span>
                  <span>{Math.round(stats.averageProgress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(stats.averageProgress, 100)}%` }}
                  ></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>{stats.completedActivities} Completed</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span>{stats.onTrackActivities} On Track</span>
                </div>
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <span>{stats.delayedActivities} Delayed</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-purple-500" />
                  <span>{stats.totalActivities} Total</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Financial Overview</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Contract</span>
                <span className="font-semibold">AED {(stats.totalContractValue || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Completed Value</span>
                <span className="font-semibold text-green-600">AED {(stats.completedValue || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Remaining Value</span>
                <span className="font-semibold text-blue-600">AED {(stats.remainingValue || 0).toLocaleString()}</span>
              </div>
              <div className="pt-2 border-t">
                <div className="flex justify-between text-sm mb-1">
                  <span>Completion Rate</span>
                  <span>{stats.totalContractValue > 0 ? Math.round((stats.completedValue / stats.totalContractValue) * 100) : 0}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${stats.totalContractValue > 0 ? (stats.completedValue / stats.totalContractValue) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Project Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Active</span>
                </div>
                <span className="font-semibold">{stats.activeProjects}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm">Completed</span>
                </div>
                <span className="font-semibold">{stats.completedProjects}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm">On Hold</span>
                </div>
                <span className="font-semibold">{stats.onHoldProjects}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers and Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Top Performing Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.topPerformingProjects?.slice(0, 5).map((project, index) => (
                <div key={project.project_code} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-sm font-semibold text-blue-600 dark:text-blue-300">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{project.project_name}</p>
                      <p className="text-xs text-gray-500">{project.project_code}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{project.progress?.toFixed(1) || 0}%</p>
                  </div>
                </div>
              )) || (
                <p className="text-sm text-gray-500">No projects data available</p>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentActivities?.slice(0, 5).map((activity, index) => (
                <div key={activity.id || index} className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.activity_name || 'Activity update'}</p>
                    <p className="text-xs text-gray-500">{activity.updated_at || 'Recently'}</p>
                  </div>
                </div>
              )) || (
                <p className="text-sm text-gray-500">No recent activities</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Legacy Top Performing Projects - Hidden */}
      <div className="hidden">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Top Performing Projects</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.topPerformingProjects.map((project, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="font-medium">{project.project_code}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{project.project_name}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{project.progress}%</p>
                  <p className="text-xs text-gray-500 capitalize">{project.status}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}
