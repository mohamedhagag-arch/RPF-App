'use client'

import { useState, useEffect, useMemo } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
import { TABLES, Project, BOQActivity, KPIRecord } from '@/lib/supabase'
import { calculateProjectProgressFromValues } from '@/lib/boqValueCalculator'
import { mapProjectFromDB, mapBOQFromDB, mapKPIFromDB } from '@/lib/dataMappers'
import { useAuth } from '@/app/providers'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { 
  TrendingUp, 
  TrendingDown, 
  Building2, 
  Target, 
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  PieChart,
  Activity,
  Zap,
  Search,
  RefreshCw,
  Sparkles,
  Award,
  Gauge,
  LineChart,
  PlayCircle,
  PauseCircle,
  XCircle,
  LayoutDashboard,
  ArrowRight,
  Filter,
  MoreHorizontal,
  Eye,
  ChevronRight,
  TrendingDown as TrendingDownIcon
} from 'lucide-react'
import { DashboardCharts } from './DashboardCharts'
import { SmartAlerts } from './SmartAlerts'
import { AdvancedAnalytics } from './AdvancedAnalytics'
import { DashboardOptimizations } from './DashboardOptimizations'

interface DashboardStats {
  totalProjects: number
  activeProjects: number
  completedProjects: number
  onHoldProjects: number
  totalActivities: number
  completedActivities: number
  totalValue: number
  completedValue: number
  averageProgress: number
  totalKPIs: number
  completedKPIs: number
  overdueKPIs: number
  todayKPIs: number
}

interface ProjectWithProgress extends Project {
  progress: number
  activitiesCount: number
  completedActivities: number
  totalValue: number
  completedValue: number
}

interface RecentActivity {
  id: string
  type: 'project' | 'activity' | 'kpi'
  title: string
  description: string
  timestamp: string
  status: 'success' | 'warning' | 'error' | 'info'
  projectCode?: string
}

export function IntegratedDashboard() {
  const guard = usePermissionGuard()
  const { appUser } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    onHoldProjects: 0,
    totalActivities: 0,
    completedActivities: 0,
    totalValue: 0,
    completedValue: 0,
    averageProgress: 0,
    totalKPIs: 0,
    completedKPIs: 0,
    overdueKPIs: 0,
    todayKPIs: 0
  })
  
  const [projects, setProjects] = useState<ProjectWithProgress[]>([])
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [selectedTimeRange, setSelectedTimeRange] = useState<'today' | 'week' | 'month' | 'all'>('week')
  const [searchTerm, setSearchTerm] = useState('')
  const [rawActivities, setRawActivities] = useState<BOQActivity[]>([])
  const [rawKPIs, setRawKPIs] = useState<KPIRecord[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'charts' | 'alerts' | 'optimizations'>('overview')

  const supabase = getSupabaseClient()

  // Fetch all dashboard data
  const fetchDashboardData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true)
      else setLoading(true)

      // Fetch projects and activities
      console.log('🔄 Starting data fetch...')
      const [projectsResult, activitiesResult] = await Promise.all([
        supabase.from(TABLES.PROJECTS).select('*').order('created_at', { ascending: false }),
        supabase.from(TABLES.BOQ_ACTIVITIES).select('*').order('created_at', { ascending: false })
      ])

      console.log('📊 Projects query result:', {
        data: projectsResult.data?.length || 0,
        error: projectsResult.error
      })
      
      console.log('📊 Activities query result:', {
        data: activitiesResult.data?.length || 0,
        error: activitiesResult.error
      })

      if (projectsResult.error) {
        console.error('❌ Projects error:', projectsResult.error)
        throw projectsResult.error
      }
      if (activitiesResult.error) {
        console.error('❌ Activities error:', activitiesResult.error)
        throw activitiesResult.error
      }

      // Fetch KPIs - first get count, then fetch all in batches if needed
      const { data: firstBatch, error: kpiError, count: totalKPICount } = await supabase
        .from(TABLES.KPI)
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(1000)
      
      if (kpiError) {
        console.error('Error fetching KPIs:', kpiError)
        throw kpiError
      }
      
      let allKPIs: any[] = firstBatch || []
      console.log(`📊 Initial KPI fetch: ${allKPIs.length} records, Total count: ${totalKPICount}`)
      
      // If there are more KPIs, fetch them in batches
      if (totalKPICount && totalKPICount > 1000) {
        console.log(`⚠️ More KPIs available (${totalKPICount}). Fetching remaining batches...`)
        const batchSize = 1000
        const totalBatches = Math.ceil(totalKPICount / batchSize)
        
        for (let i = 1; i < totalBatches; i++) {
          const offset = i * batchSize
          const { data: batchData, error: batchError } = await supabase
            .from(TABLES.KPI)
            .select('*')
            .order('created_at', { ascending: false })
            .range(offset, offset + batchSize - 1)
          
          if (batchError) {
            console.error(`Error fetching KPI batch ${i + 1}:`, batchError)
            break
          }
          
          if (batchData && batchData.length > 0) {
            allKPIs = [...allKPIs, ...batchData]
            console.log(`✅ Fetched KPI batch ${i + 1}/${totalBatches}: ${batchData.length} records (total: ${allKPIs.length})`)
          } else {
            break
          }
        }
      }
      
      console.log(`✅ Total KPIs fetched: ${allKPIs.length} out of ${totalKPICount || 'unknown'}`)
      
      // Create kpisResult object
      const kpisResult = {
        data: allKPIs,
        error: null,
        count: totalKPICount || allKPIs.length
      }
      
      // Log data summary
      console.log('📊 Data Summary:', {
        projects: (projectsResult.data || []).length,
        activities: (activitiesResult.data || []).length,
        kpis: allKPIs.length
      })

      const mappedProjects = (projectsResult.data || []).map((project: any) => mapProjectFromDB(project))
      const mappedActivities = (activitiesResult.data || []).map((activity: any) => mapBOQFromDB(activity))
      const mappedKPIs = (kpisResult.data || []).map((kpi: any) => mapKPIFromDB(kpi))

      const projectsWithProgress: ProjectWithProgress[] = mappedProjects.map((project) => {
        const projectActivities = mappedActivities.filter(
          (activity) => activity.project_code === project.project_code
        )
        
        const completedActivities = projectActivities.filter((activity) => activity.activity_completed)
        
        // Calculate total value with fallback logic
        const totalValue = projectActivities.reduce((sum: number, activity) => {
          let activityValue = 0
          
          // Priority 1: Use total_value directly
          if (activity.total_value && activity.total_value > 0) {
            activityValue = activity.total_value
          }
          // Priority 2: Calculate from rate × total_units
          else if (activity.rate && activity.total_units && activity.rate > 0 && activity.total_units > 0) {
            activityValue = activity.rate * activity.total_units
          }
          // Priority 3: Use activity_value
          else if (activity.activity_value && activity.activity_value > 0) {
            activityValue = activity.activity_value
          }
          // Priority 4: Check raw data
          else {
            const raw = (activity as any).raw || {}
            const rawTotalValue = parseFloat(String(raw['Total Value'] || '0').replace(/,/g, '')) || 0
            if (rawTotalValue > 0) {
              activityValue = rawTotalValue
            } else {
              const rawRate = parseFloat(String(raw['Rate'] || '0').replace(/,/g, '')) || 0
              const rawTotalUnits = parseFloat(String(raw['Total Units'] || '0').replace(/,/g, '')) || 0
              if (rawRate > 0 && rawTotalUnits > 0) {
                activityValue = rawRate * rawTotalUnits
              }
            }
          }
          
          return sum + activityValue
        }, 0)
        
        const completedValue = completedActivities.reduce((sum: number, activity) => {
          let activityValue = 0
          
          // Same logic as above
          if (activity.total_value && activity.total_value > 0) {
            activityValue = activity.total_value
          } else if (activity.rate && activity.total_units && activity.rate > 0 && activity.total_units > 0) {
            activityValue = activity.rate * activity.total_units
          } else if (activity.activity_value && activity.activity_value > 0) {
            activityValue = activity.activity_value
          } else {
            const raw = (activity as any).raw || {}
            const rawTotalValue = parseFloat(String(raw['Total Value'] || '0').replace(/,/g, '')) || 0
            if (rawTotalValue > 0) {
              activityValue = rawTotalValue
            } else {
              const rawRate = parseFloat(String(raw['Rate'] || '0').replace(/,/g, '')) || 0
              const rawTotalUnits = parseFloat(String(raw['Total Units'] || '0').replace(/,/g, '')) || 0
              if (rawRate > 0 && rawTotalUnits > 0) {
                activityValue = rawRate * rawTotalUnits
              }
            }
          }
          
          return sum + activityValue
        }, 0)
        
        const projectProgress = calculateProjectProgressFromValues(projectActivities)
        
        return {
          ...project,
          progress: projectProgress.progress,
          activitiesCount: projectActivities.length,
          completedActivities: completedActivities.length,
          totalValue,
          completedValue
        }
      })

      const totalProjects = projectsWithProgress.length
      const activeProjects = projectsWithProgress.filter(p => {
        const status = (p.project_status as string)?.toLowerCase()
        return status === 'on-going' || status === 'ongoing' || status === 'in-progress'
      }).length
      const completedProjects = projectsWithProgress.filter(p => {
        const status = (p.project_status as string)?.toLowerCase()
        return status === 'completed-duration' || 
               status === 'contract-completed' ||
               status === 'completed' ||
               status === 'finished'
      }).length
      const onHoldProjects = projectsWithProgress.filter(p => {
        const status = (p.project_status as string)?.toLowerCase()
        return status === 'on-hold' || status === 'onhold' || status === 'hold'
      }).length
      
      const totalActivities = mappedActivities.length
      const completedActivities = mappedActivities.filter(a => {
        return a.activity_completed === true || 
               a.activity_completed === 'true' ||
               (a.activity_completed as any) === 1
      }).length
      
      const totalValue = projectsWithProgress.reduce((sum, p) => sum + (p.totalValue || 0), 0)
      const completedValue = projectsWithProgress.reduce((sum, p) => sum + (p.completedValue || 0), 0)
      
      // Debug total value calculation
      console.log('📊 Total Value Calculation:', {
        totalValue,
        completedValue,
        projectsWithValues: projectsWithProgress.filter(p => (p.totalValue || 0) > 0).length,
        totalProjects: projectsWithProgress.length,
        sampleProjectsWithValues: projectsWithProgress
          .filter(p => (p.totalValue || 0) > 0)
          .slice(0, 3)
          .map(p => ({
            code: p.project_code,
            totalValue: p.totalValue,
            completedValue: p.completedValue,
            activitiesCount: p.activitiesCount
          }))
      })
      
      // Debug logging for projects and activities
      console.log('📊 Projects Stats:', {
        totalProjects,
        activeProjects,
        completedProjects,
        onHoldProjects,
        projectStatuses: Array.from(new Set(projectsWithProgress.map(p => p.project_status)))
      })
      
      console.log('📊 Activities Stats:', {
        totalActivities,
        completedActivities,
        sampleActivities: mappedActivities.slice(0, 3).map(a => ({
          id: a.id,
          completed: a.activity_completed,
          type: typeof a.activity_completed,
          total_value: a.total_value,
          rate: a.rate,
          total_units: a.total_units,
          activity_value: a.activity_value
        }))
      })
      
      // Debug value calculation
      const sampleProject = projectsWithProgress[0]
      if (sampleProject) {
        console.log('📊 Sample Project Value Calculation:', {
          projectCode: sampleProject.project_code,
          totalValue: sampleProject.totalValue,
          completedValue: sampleProject.completedValue,
          activitiesCount: sampleProject.activitiesCount,
          sampleActivities: mappedActivities
            .filter(a => a.project_code === sampleProject.project_code)
            .slice(0, 3)
            .map(a => ({
              activity: a.activity_name,
              total_value: a.total_value,
              rate: a.rate,
              total_units: a.total_units,
              activity_value: a.activity_value,
              calculated: (a.total_value || 0) || ((a.rate || 0) * (a.total_units || 0)) || (a.activity_value || 0)
            }))
        })
      }
      
      const averageProgress = totalProjects > 0 
        ? projectsWithProgress.reduce((sum, p) => sum + p.progress, 0) / totalProjects 
        : 0

      const totalKPIs = mappedKPIs.length
      
      // Check all possible status values for completed KPIs
      const completedKPIs = mappedKPIs.filter(k => {
        const status = (k.status || '').toLowerCase()
        return status === 'completed' || status === 'done' || status === 'finished'
      }).length
      
      const today = new Date().toISOString().split('T')[0]
      const todayKPIs = mappedKPIs.filter(k => {
        try {
          const activityDate = k.activity_date || k.target_date
          if (!activityDate) return false
          
          // Validate date string
          const date = new Date(activityDate)
          if (isNaN(date.getTime())) return false // Invalid date
          
          const dateStr = date.toISOString().split('T')[0]
          return dateStr === today
        } catch (error) {
          console.warn('Invalid date in KPI:', k.id, k.activity_date || k.target_date)
          return false
        }
      }).length
      
      const overdueKPIs = mappedKPIs.filter(k => {
        try {
          const status = (k.status || '').toLowerCase()
          const isCompleted = status === 'completed' || status === 'done' || status === 'finished'
          const activityDate = k.activity_date || k.target_date
          if (!activityDate) return false
          
          // Validate date string
          const date = new Date(activityDate)
          if (isNaN(date.getTime())) return false // Invalid date
          
          const todayDate = new Date()
          todayDate.setHours(0, 0, 0, 0)
          return !isCompleted && date < todayDate
        } catch (error) {
          console.warn('Invalid date in KPI for overdue check:', k.id, k.activity_date || k.target_date)
          return false
        }
      }).length
      
      // Debug logging
      console.log('📊 Dashboard Stats Calculation:', {
        totalKPIs,
        completedKPIs,
        todayKPIs,
        overdueKPIs,
        sampleKPIs: mappedKPIs.slice(0, 3).map(k => ({
          id: k.id,
          status: k.status,
          activity_date: k.activity_date,
          target_date: k.target_date
        }))
      })

      const finalStats = {
        totalProjects,
        activeProjects,
        completedProjects,
        onHoldProjects,
        totalActivities,
        completedActivities,
        totalValue,
        completedValue,
        averageProgress,
        totalKPIs,
        completedKPIs,
        overdueKPIs,
        todayKPIs
      }
      
      console.log('📊 Final Stats to set:', finalStats)
      
      setStats(finalStats)

      setProjects(projectsWithProgress)
      setRawActivities(mappedActivities)
      setRawKPIs(mappedKPIs)

      const activities: RecentActivity[] = []
      
      projectsWithProgress.slice(0, 5).forEach(project => {
        activities.push({
          id: `project-${project.id}`,
          type: 'project',
          title: project.project_name,
          description: `Status: ${project.project_status} | Progress: ${project.progress.toFixed(1)}%`,
          timestamp: project.updated_at,
          status: (project.project_status as string) === 'completed-duration' || 
                  (project.project_status as string) === 'contract-completed' ? 'success' : 
                  (project.project_status as string) === 'on-going' ? 'info' : 'warning',
          projectCode: project.project_code
        })
      })

      if (mappedKPIs.length > 0) {
        mappedKPIs.slice(0, 3).forEach((kpi) => {
          const activityDate = kpi.activity_date || kpi.target_date
          activities.push({
            id: `kpi-${kpi.id}`,
            type: 'kpi',
            title: kpi.kpi_name || kpi.activity_name || 'KPI',
            description: `Quantity: ${kpi.quantity} | Type: ${kpi.input_type}`,
            timestamp: kpi.created_at || kpi.updated_at,
            status: kpi.status === 'completed' ? 'success' : 
                    activityDate && new Date(activityDate) < new Date() ? 'error' : 'info',
            projectCode: kpi.project_code
          })
        })
      }

      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setRecentActivities(activities.slice(0, 8))
      
    } catch (error: any) {
      console.error('❌ Error loading dashboard data:', error)
      console.error('Error details:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint
      })
      
      // Set default stats on error
      setStats({
        totalProjects: 0,
        activeProjects: 0,
        completedProjects: 0,
        onHoldProjects: 0,
        totalActivities: 0,
        completedActivities: 0,
        totalValue: 0,
        completedValue: 0,
        averageProgress: 0,
        totalKPIs: 0,
        completedKPIs: 0,
        overdueKPIs: 0,
        todayKPIs: 0
      })
      
      setProjects([])
      setRawActivities([])
      setRawKPIs([])
      setRecentActivities([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
    const handleOnline = () => fetchDashboardData(true)
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [])

  const filteredProjects = useMemo(() => {
    if (!projects || projects.length === 0) return []
    if (!searchTerm || searchTerm.trim() === '') return projects.slice(0, 6)
    
    const searchLower = searchTerm.toLowerCase().trim()
    return projects.filter(project => {
      const projectName = String(project.project_name || '').toLowerCase()
      const projectCode = String(project.project_code || '').toLowerCase()
      const division = String(project.responsible_division || '').toLowerCase()
      return projectName.includes(searchLower) || projectCode.includes(searchLower) || division.includes(searchLower)
    }).slice(0, 6)
  }, [projects, searchTerm])

  const completionRate = stats.totalProjects > 0 ? (stats.completedProjects / stats.totalProjects) * 100 : 0
  const valueCompletionRate = stats.totalValue > 0 ? (stats.completedValue / stats.totalValue) * 100 : 0
  const activityCompletionRate = stats.totalActivities > 0 ? (stats.completedActivities / stats.totalActivities) * 100 : 0
  const kpiCompletionRate = stats.totalKPIs > 0 ? (stats.completedKPIs / stats.totalKPIs) * 100 : 0

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { icon: any, color: string, bgColor: string, label: string }> = {
      'on-going': { 
        icon: PlayCircle, 
        color: 'text-blue-600 dark:text-blue-400', 
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
        label: 'On Going'
      },
      'on-hold': { 
        icon: PauseCircle, 
        color: 'text-yellow-600 dark:text-yellow-400', 
        bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
        label: 'On Hold'
      },
      'completed-duration': { 
        icon: CheckCircle, 
        color: 'text-green-600 dark:text-green-400', 
        bgColor: 'bg-green-100 dark:bg-green-900/30',
        label: 'Completed'
      },
      'contract-completed': { 
        icon: CheckCircle, 
        color: 'text-emerald-600 dark:text-emerald-400', 
        bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
        label: 'Contract Completed'
      },
      'cancelled': { 
        icon: XCircle, 
        color: 'text-red-600 dark:text-red-400', 
        bgColor: 'bg-red-100 dark:bg-red-900/30',
        label: 'Cancelled'
      }
    }
    return configs[status] || { 
      icon: Clock, 
      color: 'text-gray-600 dark:text-gray-400', 
      bgColor: 'bg-gray-100 dark:bg-gray-800',
      label: status
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative inline-block">
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-blue-200 dark:border-blue-900 border-t-blue-600 dark:border-t-blue-500"></div>
            <Sparkles className="h-10 w-10 text-blue-600 dark:text-blue-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">Loading Dashboard</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Please wait while we fetch your data...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 pb-24">
      {/* Modern Header with Glass Effect - Moved to Bottom */}
      <header className="sticky bottom-0 z-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-t border-gray-200/50 dark:border-gray-800/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Left Section - Logo & Title */}
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
                <div className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-3 rounded-2xl shadow-lg">
                  <LayoutDashboard className="h-6 w-6 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Dashboard
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 hidden sm:block">
                  Welcome back, {appUser?.first_name && appUser?.last_name 
                    ? `${appUser.first_name} ${appUser.last_name}` 
                    : appUser?.full_name || 'User'
                  } 👋
                </p>
              </div>
            </div>

            {/* Right Section - Controls */}
            <div className="flex items-center gap-3">
              {/* Time Range Filter */}
              <div className="hidden sm:flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1.5">
                {(['today', 'week', 'month', 'all'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setSelectedTimeRange(range)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
                      selectedTimeRange === range
                        ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    )}
                  >
                    {range.charAt(0).toUpperCase() + range.slice(1)}
                  </button>
                ))}
              </div>

              {/* Refresh Button */}
              <button
                onClick={() => fetchDashboardData(true)}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
                <span className="hidden sm:inline font-medium">Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl rounded-2xl p-2 border border-gray-200/50 dark:border-gray-800/50 shadow-sm">
            {(['overview', 'analytics', 'charts', 'alerts', 'optimizations'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 relative",
                  activeTab === tab
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg scale-105'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                )}
              >
                {tab === 'overview' && <BarChart3 className="h-4 w-4" />}
                {tab === 'analytics' && <LineChart className="h-4 w-4" />}
                {tab === 'charts' && <PieChart className="h-4 w-4" />}
                {tab === 'alerts' && <AlertTriangle className="h-4 w-4" />}
                {tab === 'optimizations' && <Zap className="h-4 w-4" />}
                <span className="capitalize">{tab}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Error or No Data Message */}
            {!loading && !refreshing && stats.totalProjects === 0 && stats.totalActivities === 0 && stats.totalKPIs === 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-8 text-center">
                <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Data Available</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  There is no data to display. Please check:
                </p>
                <ul className="text-left text-sm text-gray-600 dark:text-gray-400 space-y-2 max-w-md mx-auto mb-6">
                  <li>• Database connection is working</li>
                  <li>• Tables exist and have data</li>
                  <li>• Check browser console (F12) for errors</li>
                </ul>
                <button
                  onClick={() => fetchDashboardData(true)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                >
                  Retry Loading Data
                </button>
              </div>
            )}
            
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Total Projects Card */}
              <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 p-6 shadow-xl hover:shadow-2xl transition-all duration-300">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff12_1px,transparent_1px),linear-gradient(to_bottom,#ffffff12_1px,transparent_1px)] bg-[size:24px_24px] opacity-50"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 shadow-lg">
                      <Building2 className="h-6 w-6 text-white" />
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5">
                      <span className="text-white text-sm font-bold">{stats.totalProjects.toLocaleString()}</span>
                    </div>
                  </div>
                  <h3 className="text-white/90 text-sm font-medium mb-1">Total Projects</h3>
                  <p className="text-white text-4xl font-bold mb-3 leading-tight">{stats.totalProjects.toLocaleString()}</p>
                  <div className="flex items-center gap-4 text-white/80 text-xs mt-3">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{stats.completedProjects.toLocaleString()} Completed</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Activity className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{stats.activeProjects.toLocaleString()} Active</span>
                    </div>
                  </div>
                </div>
                <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
              </div>

              {/* Total Value Card */}
              <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 p-6 shadow-xl hover:shadow-2xl transition-all duration-300">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff12_1px,transparent_1px),linear-gradient(to_bottom,#ffffff12_1px,transparent_1px)] bg-[size:24px_24px] opacity-50"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 shadow-lg">
                      <DollarSign className="h-6 w-6 text-white" />
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5">
                      <TrendingUp className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <h3 className="text-white/90 text-sm font-medium mb-1">Total Value</h3>
                  <p className="text-white text-4xl font-bold mb-3 leading-tight">
                    {stats.totalValue >= 1000000000 
                      ? `$${(stats.totalValue / 1000000000).toFixed(1)}B`
                      : stats.totalValue >= 1000000
                      ? `$${(stats.totalValue / 1000000).toFixed(1)}M`
                      : `$${(stats.totalValue / 1000).toFixed(1)}K`
                    }
                  </p>
                  <div className="flex items-center gap-2 text-white/80 text-xs mt-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse flex-shrink-0"></div>
                      <span>{valueCompletionRate.toFixed(1)}% Complete</span>
                    </div>
                  </div>
                </div>
                <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
              </div>

              {/* Activities Card */}
              <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 via-purple-600 to-pink-600 p-6 shadow-xl hover:shadow-2xl transition-all duration-300">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff12_1px,transparent_1px),linear-gradient(to_bottom,#ffffff12_1px,transparent_1px)] bg-[size:24px_24px] opacity-50"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 shadow-lg">
                      <Target className="h-6 w-6 text-white" />
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5">
                      <span className="text-white text-sm font-bold">{stats.totalActivities.toLocaleString()}</span>
                    </div>
                  </div>
                  <h3 className="text-white/90 text-sm font-medium mb-1">Activities</h3>
                  <p className="text-white text-4xl font-bold mb-3 leading-tight">{stats.totalActivities.toLocaleString()}</p>
                  <div className="flex items-center gap-4 text-white/80 text-xs mt-3">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{stats.completedActivities.toLocaleString()} Done</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{(stats.totalActivities - stats.completedActivities).toLocaleString()} Pending</span>
                    </div>
                  </div>
                </div>
                <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
              </div>

              {/* KPI Performance Card */}
              <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 p-6 shadow-xl hover:shadow-2xl transition-all duration-300">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff12_1px,transparent_1px),linear-gradient(to_bottom,#ffffff12_1px,transparent_1px)] bg-[size:24px_24px] opacity-50"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 shadow-lg">
                      <BarChart3 className="h-6 w-6 text-white" />
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5">
                      <span className="text-white text-sm font-bold">{stats.totalKPIs.toLocaleString()}</span>
                    </div>
                  </div>
                  <h3 className="text-white/90 text-sm font-medium mb-1">KPI Performance</h3>
                  <p className="text-white text-4xl font-bold mb-3 leading-tight">{stats.totalKPIs.toLocaleString()}</p>
                  <div className="flex items-center gap-4 text-white/80 text-xs mt-3 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{stats.completedKPIs.toLocaleString()} Completed</span>
                    </div>
                    {stats.overdueKPIs > 0 && (
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>{stats.overdueKPIs.toLocaleString()} Overdue</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
              </div>
            </div>

            {/* Progress Overview Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Overall Progress Card */}
              <div className="lg:col-span-2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl p-8 border border-gray-200/50 dark:border-gray-800/50 shadow-xl">
                <div className="flex items-center gap-4 mb-8">
                  <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-3 shadow-lg">
                    <Gauge className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Overall Progress</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Average: {stats.averageProgress.toFixed(1)}%</p>
                  </div>
                </div>
                
                <div className="space-y-6">
                  {/* Project Completion */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-2">
                          <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Project Completion</span>
                      </div>
                      <span className="text-xl font-bold text-gray-900 dark:text-white">{completionRate.toFixed(1)}%</span>
                    </div>
                    <div className="relative w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                      <div 
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-1000 ease-out shadow-lg"
                        style={{ width: `${completionRate}%` }}
                      >
                        <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                      </div>
                    </div>
                  </div>

                  {/* Value Completion */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="bg-emerald-100 dark:bg-emerald-900/30 rounded-lg p-2">
                          <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Value Completion</span>
                      </div>
                      <span className="text-xl font-bold text-gray-900 dark:text-white">{valueCompletionRate.toFixed(1)}%</span>
                    </div>
                    <div className="relative w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                      <div 
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-1000 ease-out shadow-lg"
                        style={{ width: `${valueCompletionRate}%` }}
                      >
                        <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                      </div>
                    </div>
                  </div>

                  {/* Activity Completion */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="bg-purple-100 dark:bg-purple-900/30 rounded-lg p-2">
                          <Target className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Activity Completion</span>
                      </div>
                      <span className="text-xl font-bold text-gray-900 dark:text-white">{activityCompletionRate.toFixed(1)}%</span>
                    </div>
                    <div className="relative w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                      <div 
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all duration-1000 ease-out shadow-lg"
                        style={{ width: `${activityCompletionRate}%` }}
                      >
                        <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                      </div>
                    </div>
                  </div>

                  {/* KPI Completion */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="bg-orange-100 dark:bg-orange-900/30 rounded-lg p-2">
                          <BarChart3 className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        </div>
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">KPI Completion</span>
                      </div>
                      <span className="text-xl font-bold text-gray-900 dark:text-white">{kpiCompletionRate.toFixed(1)}%</span>
                    </div>
                    <div className="relative w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                      <div 
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full transition-all duration-1000 ease-out shadow-lg"
                        style={{ width: `${kpiCompletionRate}%` }}
                      >
                        <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Stats Card */}
              <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-800/50 shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-2.5 shadow-lg">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Quick Stats</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl border border-blue-200/50 dark:border-blue-800/50 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-500 rounded-lg p-2.5 shadow-md">
                        <Calendar className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">Today's KPIs</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Due today</p>
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.todayKPIs}</span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-xl border border-emerald-200/50 dark:border-emerald-800/50 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="bg-emerald-500 rounded-lg p-2.5 shadow-md">
                        <Award className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">Completed</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">This period</p>
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.completedProjects}</span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-yellow-100/50 dark:from-yellow-900/20 dark:to-yellow-800/20 rounded-xl border border-yellow-200/50 dark:border-yellow-800/50 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="bg-yellow-500 rounded-lg p-2.5 shadow-md">
                        <PauseCircle className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">On Hold</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Projects</p>
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.onHoldProjects}</span>
                  </div>

                  {stats.overdueKPIs > 0 && (
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-800/20 rounded-xl border border-red-200/50 dark:border-red-800/50 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3">
                        <div className="bg-red-500 rounded-lg p-2.5 shadow-md">
                          <AlertTriangle className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">Overdue</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">KPIs</p>
                        </div>
                      </div>
                      <span className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.overdueKPIs}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Projects and Activity Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Projects Card */}
              <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-800/50 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-2.5 shadow-lg">
                      <Building2 className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Recent Projects</h3>
                  </div>
                  <button
                    onClick={() => router.push('/projects')}
                    className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
                  >
                    View All
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                {/* Search Bar */}
                <div className="relative mb-6">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search projects..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Projects List */}
                <div className="space-y-3 max-h-[600px] overflow-y-auto scrollbar-thin">
                  {filteredProjects.length > 0 ? (
                    filteredProjects.map((project) => {
                      const statusConfig = getStatusConfig(project.project_status as string)
                      const StatusIcon = statusConfig.icon
                      
                      return (
                        <div 
                          key={project.id} 
                          className="group p-4 bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-700/50 rounded-xl hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-200 cursor-pointer"
                          onClick={() => router.push(`/projects?project=${project.project_code}`)}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className={cn("h-3 w-3 rounded-full", statusConfig.bgColor)}></div>
                              <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {project.project_name}
                              </h4>
                            </div>
                            <div className="flex items-center gap-2">
                              <StatusIcon className={cn("h-4 w-4", statusConfig.color)} />
                              <span className="text-sm font-bold text-gray-600 dark:text-gray-400">
                                {project.progress.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-3">
                            <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{project.project_code}</span>
                            <span>{project.responsible_division}</span>
                          </div>
                          
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-2 overflow-hidden">
                            <div 
                              className={cn(
                                "h-2.5 rounded-full transition-all duration-500 relative",
                                project.progress >= 80 ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' :
                                project.progress >= 50 ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                                project.progress >= 25 ? 'bg-gradient-to-r from-orange-500 to-orange-600' :
                                'bg-gradient-to-r from-gray-400 to-gray-500'
                              )}
                              style={{ width: `${Math.min(project.progress, 100)}%` }}
                            >
                              <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-gray-500">
                            <div className="flex items-center gap-4">
                              <span className="flex items-center gap-1.5">
                                <Target className="h-3 w-3" />
                                {project.activitiesCount} activities
                              </span>
                            </div>
                            <span className="font-semibold">${(project.totalValue / 1000000).toFixed(1)}M</span>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="text-center py-12">
                      <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        {searchTerm ? 'No projects found' : 'No projects available'}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        {searchTerm 
                          ? `No projects match "${searchTerm}"`
                          : 'There are no projects to display at the moment.'
                        }
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Activity Card */}
              <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-800/50 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl p-2.5 shadow-lg">
                      <Activity className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Recent Activity</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Live</span>
                  </div>
                </div>

                <div className="space-y-3 max-h-[600px] overflow-y-auto scrollbar-thin">
                  {recentActivities.map((activity) => (
                    <div 
                      key={activity.id} 
                      className="flex items-start gap-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-700/50 rounded-xl hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 border border-gray-200 dark:border-gray-700 transition-all duration-200"
                    >
                      <div className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md",
                        activity.status === 'success' ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' :
                        activity.status === 'warning' ? 'bg-gradient-to-br from-yellow-500 to-yellow-600' :
                        activity.status === 'error' ? 'bg-gradient-to-br from-red-500 to-red-600' : 
                        'bg-gradient-to-br from-blue-500 to-blue-600'
                      )}>
                        {activity.type === 'project' ? <Building2 className="h-5 w-5 text-white" /> :
                         activity.type === 'activity' ? <Target className="h-5 w-5 text-white" /> :
                         <BarChart3 className="h-5 w-5 text-white" />}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">{activity.title}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{activity.description}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-gray-500 dark:text-gray-500">
                            {new Date(activity.timestamp).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          {activity.projectCode && (
                            <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-md font-mono">
                              {activity.projectCode}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {recentActivities.length === 0 && (
                    <div className="text-center py-12">
                      <Activity className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No recent activity</h3>
                      <p className="text-gray-600 dark:text-gray-400">Activity will appear here as it happens</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <AdvancedAnalytics 
            projects={projects}
            activities={rawActivities}
            kpis={rawKPIs as KPIRecord[]}
          />
        )}

        {activeTab === 'charts' && (
          <DashboardCharts 
            projects={projects}
            activities={rawActivities}
            kpis={rawKPIs as KPIRecord[]}
          />
        )}

        {activeTab === 'alerts' && (
          <SmartAlerts 
            projects={projects}
            activities={rawActivities}
            kpis={rawKPIs as KPIRecord[]}
          />
        )}

        {activeTab === 'optimizations' && (
          <DashboardOptimizations 
            projects={projects}
            activities={rawActivities}
            kpis={rawKPIs as KPIRecord[]}
          />
        )}
      </main>
    </div>
  )
}
