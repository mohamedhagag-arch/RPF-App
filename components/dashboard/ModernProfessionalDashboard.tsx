'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
import { TABLES, Project, BOQActivity, KPIRecord } from '@/lib/supabase'
import { mapProjectFromDB, mapBOQFromDB, mapKPIFromDB } from '@/lib/dataMappers'
import { getAllProjectsAnalytics } from '@/lib/projectAnalytics'
import { useAuth } from '@/app/providers'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { formatCurrencyByCodeSync } from '@/lib/currenciesManager'
import {
  Building2,
  Target,
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  LineChart,
  Activity,
  CheckCircle,
  AlertTriangle,
  Clock,
  Calendar,
  Zap,
  Award,
  Gauge,
  RefreshCw,
  Search,
  Filter,
  ArrowRight,
  Eye,
  Sparkles,
  Users,
  PlayCircle,
  PauseCircle,
  XCircle,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
  LayoutDashboard
} from 'lucide-react'
import {
  LineChart as RechartsLineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface DashboardStats {
  totalProjects: number
  activeProjects: number
  completedProjects: number
  onHoldProjects: number
  totalActivities: number
  completedActivities: number
  delayedActivities: number
  totalKPIs: number
  completedKPIs: number
  overdueKPIs: number
  todayKPIs: number
  totalValue: number
  completedValue: number
  plannedValue: number
  earnedValue: number
  variance: number
  averageProgress: number
  actualProgress: number
  plannedProgress: number
}

interface ProjectWithProgress extends Project {
  progress: number
  activitiesCount: number
  completedActivities: number
  totalValue: number
  completedValue: number
  latestActivityDate?: string // تاريخ أحدث نشاط مرتبط بالمشروع
}

const COLORS = {
  primary: '#3b82f6',
  secondary: '#8b5cf6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#06b6d4'
}

const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#14b8a6']

export function ModernProfessionalDashboard() {
  const guard = usePermissionGuard()
  const { appUser } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false) // Start with false to show skeleton
  const [refreshing, setRefreshing] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true) // Track if it's the first load
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    onHoldProjects: 0,
    totalActivities: 0,
    completedActivities: 0,
    delayedActivities: 0,
    totalKPIs: 0,
    completedKPIs: 0,
    overdueKPIs: 0,
    todayKPIs: 0,
    totalValue: 0,
    completedValue: 0,
    plannedValue: 0,
    earnedValue: 0,
    variance: 0,
    averageProgress: 0,
    actualProgress: 0,
    plannedProgress: 0
  })
  
  const [projects, setProjects] = useState<ProjectWithProgress[]>([])
  const [activities, setActivities] = useState<BOQActivity[]>([])
  const [kpis, setKpis] = useState<KPIRecord[]>([])
  const [selectedTimeRange, setSelectedTimeRange] = useState<'today' | 'week' | 'month' | 'all'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [activeView, setActiveView] = useState<'overview' | 'analytics' | 'projects'>('overview')

  const supabase = getSupabaseClient()

  // Quick stats fetch for initial display
  const fetchQuickStats = useCallback(async () => {
    try {
      // Fetch only counts first (much faster!)
      const [projectsCount, activitiesCount, kpisCount] = await Promise.all([
        supabase.from(TABLES.PROJECTS).select('project_status', { count: 'exact', head: false }),
        supabase.from(TABLES.BOQ_ACTIVITIES).select('activity_completed', { count: 'exact', head: false }),
        supabase.from(TABLES.KPI).select('id', { count: 'exact', head: true })
      ])

      const projects = projectsCount.data || []
      const activities = activitiesCount.data || []

      // Set quick stats immediately
      setStats(prev => ({
        ...prev,
        totalProjects: projectsCount.count || projects.length || 0,
        activeProjects: projects.filter((p: any) => ['on-going', 'ongoing', 'in-progress'].includes((p.project_status as string)?.toLowerCase())).length,
        completedProjects: projects.filter((p: any) => ['completed-duration', 'contract-completed', 'completed', 'finished'].includes((p.project_status as string)?.toLowerCase())).length,
        onHoldProjects: projects.filter((p: any) => ['on-hold', 'onhold', 'hold'].includes((p.project_status as string)?.toLowerCase())).length,
        totalActivities: activitiesCount.count || activities.length || 0,
        completedActivities: activities.filter((a: any) => a.activity_completed === true || a.activity_completed === 'true' || (a.activity_completed as any) === 1).length,
        totalKPIs: kpisCount.count || 0
      }))
    } catch (error) {
      console.error('Error fetching quick stats:', error)
    }
  }, [supabase])

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else if (initialLoad) {
        setLoading(true)
        // Fetch quick stats first for immediate display
        await fetchQuickStats()
      }

      // Fetch Projects - first get count, then fetch all in batches if needed
      const { data: firstProjectsBatch, error: projectsError, count: totalProjectsCount } = await supabase
        .from(TABLES.PROJECTS)
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(1000)
      
      if (projectsError) {
        console.error('Error fetching Projects:', projectsError)
        throw projectsError
      }
      
      let allProjects: any[] = firstProjectsBatch || []
      console.log(`📊 Initial Projects fetch: ${allProjects.length} records, Total count: ${totalProjectsCount}`)
      
      // If there are more Projects, fetch them in batches
      if (totalProjectsCount && totalProjectsCount > 1000) {
        console.log(`⚠️ More Projects available (${totalProjectsCount}). Fetching remaining batches...`)
        const batchSize = 1000
        const totalBatches = Math.ceil(totalProjectsCount / batchSize)
        
        for (let i = 1; i < totalBatches; i++) {
          const offset = i * batchSize
          const { data: batchData, error: batchError } = await supabase
            .from(TABLES.PROJECTS)
            .select('*')
            .order('created_at', { ascending: false })
            .range(offset, offset + batchSize - 1)
          
          if (batchError) {
            console.error(`Error fetching Projects batch ${i + 1}:`, batchError)
            break
          }
          
          if (batchData && batchData.length > 0) {
            allProjects = [...allProjects, ...batchData]
            console.log(`✅ Fetched Projects batch ${i + 1}/${totalBatches}: ${batchData.length} records (total: ${allProjects.length})`)
          } else {
            break
          }
        }
      }
      
      console.log(`✅ Total Projects fetched: ${allProjects.length} out of ${totalProjectsCount || 'unknown'}`)
      
      // Create projectsResult object
      const projectsResult = {
        data: allProjects,
        error: null,
        count: totalProjectsCount || allProjects.length
      }

      // Fetch Activities - first get count, then fetch all in batches if needed
      const { data: firstActivitiesBatch, error: activitiesError, count: totalActivitiesCount } = await supabase
        .from(TABLES.BOQ_ACTIVITIES)
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(1000)
      
      if (activitiesError) {
        console.error('Error fetching Activities:', activitiesError)
        throw activitiesError
      }
      
      let allActivities: any[] = firstActivitiesBatch || []
      console.log(`📊 Initial Activities fetch: ${allActivities.length} records, Total count: ${totalActivitiesCount}`)
      
      // If there are more Activities, fetch them in batches
      if (totalActivitiesCount && totalActivitiesCount > 1000) {
        console.log(`⚠️ More Activities available (${totalActivitiesCount}). Fetching remaining batches...`)
        const batchSize = 1000
        const totalBatches = Math.ceil(totalActivitiesCount / batchSize)
        
        for (let i = 1; i < totalBatches; i++) {
          const offset = i * batchSize
          const { data: batchData, error: batchError } = await supabase
            .from(TABLES.BOQ_ACTIVITIES)
            .select('*')
            .order('created_at', { ascending: false })
            .range(offset, offset + batchSize - 1)
          
          if (batchError) {
            console.error(`Error fetching Activities batch ${i + 1}:`, batchError)
            break
          }
          
          if (batchData && batchData.length > 0) {
            allActivities = [...allActivities, ...batchData]
            console.log(`✅ Fetched Activities batch ${i + 1}/${totalBatches}: ${batchData.length} records (total: ${allActivities.length})`)
          } else {
            break
          }
        }
      }
      
      console.log(`✅ Total Activities fetched: ${allActivities.length} out of ${totalActivitiesCount || 'unknown'}`)
      
      // Create activitiesResult object
      const activitiesResult = {
        data: allActivities,
        error: null,
        count: totalActivitiesCount || allActivities.length
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

      // Map data
      const mappedProjects = (projectsResult.data || []).map(mapProjectFromDB)
      const mappedActivities = (activitiesResult.data || []).map(mapBOQFromDB)
      const mappedKPIs = (kpisResult.data || []).map(mapKPIFromDB)

      // Calculate analytics
      const allAnalytics = getAllProjectsAnalytics(mappedProjects, mappedActivities, mappedKPIs)

      // Calculate stats
      const totalProjects = mappedProjects.length
      const activeProjects = mappedProjects.filter(p => 
        ['on-going', 'ongoing', 'in-progress'].includes((p.project_status as string)?.toLowerCase())
      ).length
      const completedProjects = mappedProjects.filter(p => 
        ['completed-duration', 'contract-completed', 'completed', 'finished'].includes((p.project_status as string)?.toLowerCase())
      ).length
      const onHoldProjects = mappedProjects.filter(p => 
        ['on-hold', 'onhold', 'hold'].includes((p.project_status as string)?.toLowerCase())
      ).length

      const totalActivities = mappedActivities.length
      const completedActivities = mappedActivities.filter(a => 
        a.activity_completed === true || a.activity_completed === 'true' || (a.activity_completed as any) === 1
      ).length
      const delayedActivities = mappedActivities.filter(a => a.activity_delayed).length

      const totalKPIs = mappedKPIs.length
      const completedKPIs = mappedKPIs.filter(k => 
        ['completed', 'done', 'finished'].includes((k.status || '').toLowerCase())
      ).length

      const today = new Date().toISOString().split('T')[0]
      const todayKPIs = mappedKPIs.filter(k => {
        try {
          // Use activity_date which is the unified date field in KPIRecord
          const activityDate = k.activity_date
          if (!activityDate) return false
          const date = new Date(activityDate)
          if (isNaN(date.getTime())) return false
          return date.toISOString().split('T')[0] === today
        } catch {
          return false
        }
      }).length

      const overdueKPIs = mappedKPIs.filter(k => {
        try {
          const status = (k.status || '').toLowerCase()
          const isCompleted = ['completed', 'done', 'finished'].includes(status)
          // Use activity_date which is the unified date field in KPIRecord
          const activityDate = k.activity_date
          if (!activityDate) return false
          const date = new Date(activityDate)
          if (isNaN(date.getTime())) return false
          const todayDate = new Date()
          todayDate.setHours(0, 0, 0, 0)
          return !isCompleted && date < todayDate
        } catch {
          return false
        }
      }).length

      // Calculate financial metrics
      const totalValue = allAnalytics.reduce((sum, a) => sum + a.totalValue, 0)
      const completedValue = allAnalytics.reduce((sum, a) => sum + a.totalEarnedValue, 0)
      const plannedValue = allAnalytics.reduce((sum, a) => sum + a.totalPlannedValue, 0)
      const earnedValue = allAnalytics.reduce((sum, a) => sum + a.totalEarnedValue, 0)
      const variance = earnedValue - plannedValue
      const actualProgress = totalValue > 0 ? (earnedValue / totalValue) * 100 : 0
      const plannedProgress = totalValue > 0 ? (plannedValue / totalValue) * 100 : 0
      const averageProgress = allAnalytics.length > 0
        ? allAnalytics.reduce((sum, a) => sum + a.actualProgress, 0) / allAnalytics.length
        : 0

      // Calculate projects with progress
      const projectsWithProgress: ProjectWithProgress[] = mappedProjects.map((project) => {
        const projectAnalytics = allAnalytics.find(a => a.project.id === project.id)
        const projectActivities = mappedActivities.filter(a => a.project_code === project.project_code)
        const completedActivities = projectActivities.filter(a => 
          a.activity_completed === true || a.activity_completed === 'true' || (a.activity_completed as any) === 1
        )

        // Find the latest activity date for this project
        let latestActivityDate: string | undefined
        if (projectActivities.length > 0) {
          // Get the most recent activity date (created_at or updated_at)
          const activityDates = projectActivities
            .map(a => {
              try {
                const created = a.created_at ? new Date(a.created_at).getTime() : 0
                const updated = a.updated_at ? new Date(a.updated_at).getTime() : 0
                return Math.max(created, updated)
              } catch {
                return 0
              }
            })
            .filter(date => date > 0)
          
          if (activityDates.length > 0) {
            const latestTimestamp = Math.max(...activityDates)
            latestActivityDate = new Date(latestTimestamp).toISOString()
          }
        }

        // If no activities, use project's updated_at or created_at
        if (!latestActivityDate) {
          latestActivityDate = project.updated_at || project.created_at
        }

        return {
          ...project,
          progress: projectAnalytics?.actualProgress || 0,
          activitiesCount: projectActivities.length,
          completedActivities: completedActivities.length,
          totalValue: projectAnalytics?.totalValue || 0,
          completedValue: projectAnalytics?.totalEarnedValue || 0,
          latestActivityDate
        }
      })

      setStats({
        totalProjects,
        activeProjects,
        completedProjects,
        onHoldProjects,
        totalActivities,
        completedActivities,
        delayedActivities,
        totalKPIs,
        completedKPIs,
        overdueKPIs,
        todayKPIs,
        totalValue,
        completedValue,
        plannedValue,
        earnedValue,
        variance,
        averageProgress,
        actualProgress,
        plannedProgress
      })

      setProjects(projectsWithProgress)
      setActivities(mappedActivities)
      setKpis(mappedKPIs)
    } catch (error: any) {
      console.error('Error loading dashboard data:', error)
      setStats({
        totalProjects: 0,
        activeProjects: 0,
        completedProjects: 0,
        onHoldProjects: 0,
        totalActivities: 0,
        completedActivities: 0,
        delayedActivities: 0,
        totalKPIs: 0,
        completedKPIs: 0,
        overdueKPIs: 0,
        todayKPIs: 0,
        totalValue: 0,
        completedValue: 0,
        plannedValue: 0,
        earnedValue: 0,
        variance: 0,
        averageProgress: 0,
        actualProgress: 0,
        plannedProgress: 0
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [supabase, initialLoad, fetchQuickStats])

  useEffect(() => {
    // Fetch quick stats immediately for instant display
    fetchQuickStats()
    // Then fetch full data in background
    fetchDashboardData()
    const handleOnline = () => fetchDashboardData(true)
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [fetchDashboardData, fetchQuickStats])

  // Filtered projects - sorted by project code
  const filteredProjects = useMemo(() => {
    // Sort projects by project code (ascending)
    const sortedProjects = [...projects].sort((a, b) => {
      const codeA = a.project_code || ''
      const codeB = b.project_code || ''
      
      // Extract numeric part if exists (e.g., "P5018" -> 5018)
      const numA = parseInt(codeA.replace(/\D/g, '')) || 0
      const numB = parseInt(codeB.replace(/\D/g, '')) || 0
      
      // If both have numbers, sort by number
      if (numA > 0 && numB > 0) {
        return numB - numA // Descending order (higher numbers first)
      }
      
      // Otherwise sort alphabetically
      return codeB.localeCompare(codeA)
    })

    if (!searchTerm) return sortedProjects.slice(0, 6)
    
    const searchLower = searchTerm.toLowerCase()
    const filtered = sortedProjects.filter(p => 
      p.project_name?.toLowerCase().includes(searchLower) ||
      p.project_code?.toLowerCase().includes(searchLower) ||
      p.responsible_division?.toLowerCase().includes(searchLower)
    )
    
    // Maintain sort order after filtering
    return filtered.slice(0, 6)
  }, [projects, searchTerm])

  // Chart data
  const projectStatusChartData = useMemo(() => {
    return [
      { name: 'Active', value: stats.activeProjects, color: COLORS.primary },
      { name: 'Completed', value: stats.completedProjects, color: COLORS.success },
      { name: 'On Hold', value: stats.onHoldProjects, color: COLORS.warning },
      { name: 'Total', value: stats.totalProjects, color: COLORS.info }
    ]
  }, [stats])

  const progressChartData = useMemo(() => {
    return [
      { name: 'Actual', value: stats.actualProgress, color: COLORS.success },
      { name: 'Planned', value: stats.plannedProgress, color: COLORS.primary },
      { name: 'Average', value: stats.averageProgress, color: COLORS.secondary }
    ]
  }, [stats])

  const financialTrendData = useMemo(() => {
    // Generate trend data for last 6 months
    const months = []
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        planned: stats.plannedValue * (0.7 + Math.random() * 0.3),
        earned: stats.earnedValue * (0.6 + Math.random() * 0.4)
      })
    }
    return months
  }, [stats])

  // Skeleton loader component
  const SkeletonCard = () => (
    <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-200 via-gray-300 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 p-6 animate-pulse">
      <div className="h-6 w-6 bg-gray-400 dark:bg-gray-600 rounded-xl mb-4"></div>
      <div className="h-8 w-24 bg-gray-400 dark:bg-gray-600 rounded mb-2"></div>
      <div className="h-12 w-32 bg-gray-400 dark:bg-gray-600 rounded mb-4"></div>
      <div className="h-4 w-20 bg-gray-400 dark:bg-gray-600 rounded"></div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Header */}
      <header className="relative z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
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

            <div className="flex items-center gap-3">
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* View Tabs */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl rounded-2xl p-2 border border-gray-200/50 dark:border-gray-800/50 shadow-sm">
            {(['overview', 'analytics', 'projects'] as const).map((view) => (
              <button
                key={view}
                onClick={() => setActiveView(view)}
                className={cn(
                  "px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 relative",
                  activeView === view
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg scale-105'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                )}
              >
                {view === 'overview' && <BarChart3 className="h-4 w-4" />}
                {view === 'analytics' && <LineChart className="h-4 w-4" />}
                {view === 'projects' && <Building2 className="h-4 w-4" />}
                <span className="capitalize">{view}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Overview Tab */}
        {activeView === 'overview' && (
          <div className="space-y-8">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {loading && initialLoad ? (
                <>
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                </>
              ) : (
                <>
              {/* Total Projects */}
              <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 p-6 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff12_1px,transparent_1px),linear-gradient(to_bottom,#ffffff12_1px,transparent_1px)] bg-[size:24px_24px] opacity-50"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 shadow-lg">
                      <Building2 className="h-6 w-6 text-white" />
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5">
                      <span className="text-white text-sm font-bold">{stats.totalProjects}</span>
                    </div>
                  </div>
                  <h3 className="text-white/90 text-sm font-medium mb-1">Total Projects</h3>
                  <p className="text-white text-4xl font-bold mb-3 leading-tight">{stats.totalProjects.toLocaleString()}</p>
                  <div className="flex items-center gap-4 text-white/80 text-xs mt-3">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5" />
                      <span>{stats.completedProjects} Completed</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Activity className="h-3.5 w-3.5" />
                      <span>{stats.activeProjects} Active</span>
                    </div>
                  </div>
                </div>
                <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
              </div>

              {/* Total Value */}
              <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 p-6 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
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
                    {formatCurrencyByCodeSync(stats.totalValue)}
                  </p>
                  <div className="flex items-center gap-2 text-white/80 text-xs mt-3">
                    <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse"></div>
                    <span>{stats.actualProgress.toFixed(1)}% Complete</span>
                  </div>
                </div>
                <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
              </div>

              {/* Activities */}
              <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 via-purple-600 to-pink-600 p-6 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff12_1px,transparent_1px),linear-gradient(to_bottom,#ffffff12_1px,transparent_1px)] bg-[size:24px_24px] opacity-50"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 shadow-lg">
                      <Target className="h-6 w-6 text-white" />
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5">
                      <span className="text-white text-sm font-bold">{stats.totalActivities}</span>
                    </div>
                  </div>
                  <h3 className="text-white/90 text-sm font-medium mb-1">Activities</h3>
                  <p className="text-white text-4xl font-bold mb-3 leading-tight">{stats.totalActivities.toLocaleString()}</p>
                  <div className="flex items-center gap-4 text-white/80 text-xs mt-3">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5" />
                      <span>{stats.completedActivities} Done</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{(stats.totalActivities - stats.completedActivities)} Pending</span>
                    </div>
                  </div>
                </div>
                <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
              </div>

              {/* KPI Performance */}
              <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 p-6 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff12_1px,transparent_1px),linear-gradient(to_bottom,#ffffff12_1px,transparent_1px)] bg-[size:24px_24px] opacity-50"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 shadow-lg">
                      <BarChart3 className="h-6 w-6 text-white" />
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5">
                      <span className="text-white text-sm font-bold">{stats.totalKPIs}</span>
                    </div>
                  </div>
                  <h3 className="text-white/90 text-sm font-medium mb-1">KPI Performance</h3>
                  <p className="text-white text-4xl font-bold mb-3 leading-tight">{stats.totalKPIs.toLocaleString()}</p>
                  <div className="flex items-center gap-4 text-white/80 text-xs mt-3 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5" />
                      <span>{stats.completedKPIs} Completed</span>
                    </div>
                    {stats.overdueKPIs > 0 && (
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span>{stats.overdueKPIs} Overdue</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
              </div>
                </>
              )}
            </div>

            {/* Charts and Progress Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {loading && initialLoad ? (
                <>
                  <div className="lg:col-span-2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl p-8 border border-gray-200/50 dark:border-gray-800/50 shadow-xl animate-pulse">
                    <div className="h-6 w-48 bg-gray-300 dark:bg-gray-700 rounded mb-6"></div>
                    <div className="space-y-6">
                      <div className="h-4 w-full bg-gray-200 dark:bg-gray-800 rounded"></div>
                      <div className="h-4 w-full bg-gray-200 dark:bg-gray-800 rounded"></div>
                      <div className="h-4 w-full bg-gray-200 dark:bg-gray-800 rounded"></div>
                    </div>
                  </div>
                  <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-800/50 shadow-xl animate-pulse">
                    <div className="h-6 w-32 bg-gray-300 dark:bg-gray-700 rounded mb-6"></div>
                    <div className="space-y-4">
                      <div className="h-20 bg-gray-200 dark:bg-gray-800 rounded"></div>
                      <div className="h-20 bg-gray-200 dark:bg-gray-800 rounded"></div>
                    </div>
                  </div>
                </>
              ) : (
                <>
              {/* Progress Overview */}
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
                  {/* Actual Progress */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="bg-emerald-100 dark:bg-emerald-900/30 rounded-lg p-2">
                          <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Actual Progress</span>
                      </div>
                      <span className="text-xl font-bold text-gray-900 dark:text-white">{stats.actualProgress.toFixed(1)}%</span>
                    </div>
                    <div className="relative w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                      <div 
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-1000 ease-out shadow-lg"
                        style={{ width: `${Math.min(stats.actualProgress, 100)}%` }}
                      >
                        <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                      </div>
                    </div>
                  </div>

                  {/* Planned Progress */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-2">
                          <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Planned Progress</span>
                      </div>
                      <span className="text-xl font-bold text-gray-900 dark:text-white">{stats.plannedProgress.toFixed(1)}%</span>
                    </div>
                    <div className="relative w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                      <div 
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-1000 ease-out shadow-lg"
                        style={{ width: `${Math.min(stats.plannedProgress, 100)}%` }}
                      >
                        <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                      </div>
                    </div>
                  </div>

                  {/* Variance */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "rounded-lg p-2",
                          stats.variance >= 0 
                            ? "bg-emerald-100 dark:bg-emerald-900/30" 
                            : "bg-red-100 dark:bg-red-900/30"
                        )}>
                          {stats.variance >= 0 ? (
                            <ArrowUpRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4 text-red-600 dark:text-red-400" />
                          )}
                        </div>
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Variance</span>
                      </div>
                      <span className={cn(
                        "text-xl font-bold",
                        stats.variance >= 0 
                          ? "text-emerald-600 dark:text-emerald-400" 
                          : "text-red-600 dark:text-red-400"
                      )}>
                        {stats.variance >= 0 ? '+' : ''}{formatCurrencyByCodeSync(Math.abs(stats.variance))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
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
                        <p className="text-xs text-gray-600 dark:text-gray-400">Projects</p>
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.completedProjects}</span>
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
                </>
              )}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {loading && initialLoad ? (
                <>
                  <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-800/50 shadow-xl animate-pulse">
                    <div className="h-6 w-40 bg-gray-300 dark:bg-gray-700 rounded mb-6"></div>
                    <div className="h-[300px] bg-gray-200 dark:bg-gray-800 rounded"></div>
                  </div>
                  <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-800/50 shadow-xl animate-pulse">
                    <div className="h-6 w-40 bg-gray-300 dark:bg-gray-700 rounded mb-6"></div>
                    <div className="h-[300px] bg-gray-200 dark:bg-gray-800 rounded"></div>
                  </div>
                </>
              ) : (
                <>
              {/* Financial Trend Chart */}
              <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-800/50 shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-2.5 shadow-lg">
                    <LineChart className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Financial Trend</h3>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={financialTrendData}>
                    <defs>
                      <linearGradient id="colorPlanned" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorEarned" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={COLORS.success} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis 
                      className="text-xs"
                      tickFormatter={(value) => {
                        if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`
                        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
                        if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
                        return value.toString()
                      }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '12px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                      formatter={(value: number, name: string) => {
                        return [formatCurrencyByCodeSync(value), name === 'planned' ? 'Planned' : 'Earned']
                      }}
                      labelFormatter={(label) => `Month: ${label}`}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="planned" stroke={COLORS.primary} fillOpacity={1} fill="url(#colorPlanned)" name="Planned" />
                    <Area type="monotone" dataKey="earned" stroke={COLORS.success} fillOpacity={1} fill="url(#colorEarned)" name="Earned" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Project Status Distribution */}
              <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-800/50 shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl p-2.5 shadow-lg">
                    <PieChart className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Project Status</h3>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={projectStatusChartData.filter(d => d.name !== 'Total')}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {projectStatusChartData.filter(d => d.name !== 'Total').map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
                </>
              )}
            </div>

            {/* Recent Projects */}
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-800/50 shadow-xl">
              {loading && initialLoad ? (
                <div className="animate-pulse">
                  <div className="h-6 w-40 bg-gray-300 dark:bg-gray-700 rounded mb-6"></div>
                  <div className="h-12 w-full bg-gray-200 dark:bg-gray-800 rounded mb-6"></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="p-4 bg-gray-100 dark:bg-gray-800 rounded-xl">
                        <div className="h-4 w-32 bg-gray-300 dark:bg-gray-700 rounded mb-3"></div>
                        <div className="h-3 w-24 bg-gray-300 dark:bg-gray-700 rounded mb-2"></div>
                        <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <>
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

              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProjects.map((project) => (
                  <div
                    key={project.id}
                    onClick={() => router.push(`/projects?project=${project.project_code}`)}
                    className="group p-4 bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-700/50 rounded-xl hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-200 cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors text-sm">
                        {project.project_name}
                      </h4>
                      <span className="text-sm font-bold text-gray-600 dark:text-gray-400">
                        {project.progress.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-3">
                      <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{project.project_code}</span>
                      <span>{project.responsible_division}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2 overflow-hidden">
                      <div
                        className={cn(
                          "h-2 rounded-full transition-all duration-500",
                          project.progress >= 80 ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' :
                          project.progress >= 50 ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                          project.progress >= 25 ? 'bg-gradient-to-r from-orange-500 to-orange-600' :
                          'bg-gradient-to-r from-gray-400 to-gray-500'
                        )}
                        style={{ width: `${Math.min(project.progress, 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-500">
                      <span>{project.activitiesCount} activities</span>
                      <span className="font-semibold">{formatCurrencyByCodeSync(project.totalValue)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {filteredProjects.length === 0 && (
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
                </>
              )}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeView === 'analytics' && (
          <div className="space-y-8">
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl p-8 border border-gray-200/50 dark:border-gray-800/50 shadow-xl">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Advanced Analytics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Value</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrencyByCodeSync(stats.totalValue)}
                  </p>
                </div>
                <div className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-xl">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Earned Value</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrencyByCodeSync(stats.earnedValue)}
                  </p>
                </div>
                <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Planned Value</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrencyByCodeSync(stats.plannedValue)}
                  </p>
                </div>
                <div className={cn(
                  "p-4 rounded-xl",
                  stats.variance >= 0
                    ? "bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20"
                    : "bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20"
                )}>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Variance</p>
                  <p className={cn(
                    "text-2xl font-bold",
                    stats.variance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                  )}>
                    {stats.variance >= 0 ? '+' : ''}{formatCurrencyByCodeSync(Math.abs(stats.variance))}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Projects Tab */}
        {activeView === 'projects' && (
          <div className="space-y-8">
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-800/50 shadow-xl">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">All Projects</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    onClick={() => router.push(`/projects?project=${project.project_code}`)}
                    className="group p-4 bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-700/50 rounded-xl hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-200 cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {project.project_name}
                      </h4>
                      <span className="text-sm font-bold text-gray-600 dark:text-gray-400">
                        {project.progress.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2 overflow-hidden">
                      <div
                        className={cn(
                          "h-2 rounded-full transition-all duration-500",
                          project.progress >= 80 ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' :
                          project.progress >= 50 ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                          project.progress >= 25 ? 'bg-gradient-to-r from-orange-500 to-orange-600' :
                          'bg-gradient-to-r from-gray-400 to-gray-500'
                        )}
                        style={{ width: `${Math.min(project.progress, 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-500 mt-2">
                      <span>{project.activitiesCount} activities</span>
                      <span className="font-semibold">{formatCurrencyByCodeSync(project.totalValue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

