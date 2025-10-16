'use client'

import { useState, useEffect, useMemo } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { getSupabaseClient, executeQuery, checkConnection } from '@/lib/simpleConnectionManager'
import { TABLES, Project, BOQActivity, KPIRecord, User } from '@/lib/supabase'
import { calculateProjectProgress, calculateActivityProgress } from '@/lib/progressCalculations'
import { mapProjectFromDB, mapBOQFromDB, mapKPIFromDB } from '@/lib/dataMappers'
import { processKPIRecord, ProcessedKPI } from '@/lib/kpiProcessor'
import { useAuth } from '@/app/providers'
import { cn } from '@/lib/utils'
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
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
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Plus,
  Filter,
  Search,
  RefreshCw
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

      console.log('🔄 Fetching integrated dashboard data...')
      console.log('📋 Using table:', TABLES.PROJECTS)
      console.log('📋 All available tables:', TABLES)

      // Fetch projects using the same method as ProjectsList
      const { data: projectsData, error: projectsError } = await supabase
        .from(TABLES.PROJECTS)
        .select('*')
        .order('created_at', { ascending: false })
      
      console.log('📊 Projects query result:', {
        data: projectsData,
        error: projectsError,
        count: projectsData?.length || 0
      })

      if (projectsError) {
        console.error('❌ Projects query error:', projectsError)
        throw projectsError
      }

      // Fetch all activities using the same method as BOQManagement
      console.log('📋 Using activities table:', TABLES.BOQ_ACTIVITIES)
      const { data: activitiesData, error: activitiesError } = await supabase
        .from(TABLES.BOQ_ACTIVITIES)
        .select('*')
        .order('created_at', { ascending: false })

      console.log('📊 Activities query result:', {
        data: activitiesData,
        error: activitiesError,
        count: activitiesData?.length || 0
      })

      if (activitiesError) {
        console.error('❌ Activities query error:', activitiesError)
        throw activitiesError
      }

      // Fetch KPI records using the same method as KPITracking
      console.log('📋 Using KPI table:', TABLES.KPI)
      const { data: kpisData, error: kpisError } = await supabase
        .from(TABLES.KPI)
        .select('*')
        .order('created_at', { ascending: false })

      console.log('📊 KPI query result:', {
        data: kpisData,
        error: kpisError,
        count: kpisData?.length || 0
      })

      if (kpisError) {
        console.error('❌ KPI query error:', kpisError)
        throw kpisError
      }

      // Map data using the same mappers as other pages
      const mappedProjects = (projectsData || []).map((project: any) => mapProjectFromDB(project))
      const mappedActivities = (activitiesData || []).map((activity: any) => mapBOQFromDB(activity))
      const mappedKPIs = (kpisData || []).map((kpi: any) => mapKPIFromDB(kpi))

      // Calculate project progress and stats using mapped data
      const projectsWithProgress: ProjectWithProgress[] = mappedProjects.map((project) => {
        const projectActivities = mappedActivities.filter(
          (activity) => activity.project_code === project.project_code
        )
        
        const completedActivities = projectActivities.filter((activity) => activity.activity_completed)
        const totalValue = projectActivities.reduce((sum: number, activity) => sum + (activity.total_value || 0), 0)
        const completedValue = completedActivities.reduce((sum: number, activity) => sum + (activity.total_value || 0), 0)
        
        return {
          ...project,
          progress: projectActivities.length > 0 
            ? (completedActivities.length / projectActivities.length) * 100 
            : 0,
          activitiesCount: projectActivities.length,
          completedActivities: completedActivities.length,
          totalValue,
          completedValue
        }
      })

      // Calculate overall stats
      const totalProjects = projectsWithProgress.length
      const activeProjects = projectsWithProgress.filter(p => (p.project_status as string) === 'on-going').length
      const completedProjects = projectsWithProgress.filter(p => (p.project_status as string) === 'completed' || (p.project_status as string) === 'completed-duration' || (p.project_status as string) === 'contract-duration').length
      const onHoldProjects = projectsWithProgress.filter(p => (p.project_status as string) === 'on-hold').length
      
      const totalActivities = mappedActivities.length
      const completedActivities = mappedActivities.filter(a => a.activity_completed).length
      
      const totalValue = projectsWithProgress.reduce((sum, p) => sum + p.totalValue, 0)
      const completedValue = projectsWithProgress.reduce((sum, p) => sum + p.completedValue, 0)
      
      const averageProgress = totalProjects > 0 
        ? projectsWithProgress.reduce((sum, p) => sum + p.progress, 0) / totalProjects 
        : 0

      // KPI stats using mapped data
      const totalKPIs = mappedKPIs.length
      const completedKPIs = mappedKPIs.filter(k => k.status === 'completed').length
      const today = new Date().toISOString().split('T')[0]
      const todayKPIs = mappedKPIs.filter(k => {
        const activityDate = k.activity_date || k.target_date
        return activityDate === today
      }).length
      const overdueKPIs = mappedKPIs.filter(k => {
        const activityDate = k.activity_date || k.target_date
        return k.status !== 'completed' && activityDate && new Date(activityDate) < new Date()
      }).length

      setStats({
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
      })

      setProjects(projectsWithProgress)
      setRawActivities(mappedActivities)
      setRawKPIs(mappedKPIs)

      // Generate recent activities
      const activities: RecentActivity[] = []
      
      // Add recent project updates
      projectsWithProgress.slice(0, 5).forEach(project => {
        activities.push({
          id: `project-${project.id}`,
          type: 'project',
          title: `Project ${project.project_name}`,
          description: `Status: ${project.project_status} | Progress: ${project.progress.toFixed(1)}%`,
          timestamp: project.updated_at,
          status: (project.project_status as string) === 'completed' || (project.project_status as string) === 'completed-duration' || (project.project_status as string) === 'contract-duration' ? 'success' : 
                  (project.project_status as string) === 'on-going' ? 'info' : 'warning',
          projectCode: project.project_code
        })
      })

      // Add recent KPI updates using mapped data
      if (mappedKPIs.length > 0) {
        mappedKPIs.slice(0, 3).forEach((kpi) => {
          const activityDate = kpi.activity_date || kpi.target_date
          activities.push({
            id: `kpi-${kpi.id}`,
            type: 'kpi',
            title: `KPI: ${kpi.kpi_name || kpi.activity_name}`,
            description: `Quantity: ${kpi.quantity} | Type: ${kpi.input_type}`,
            timestamp: kpi.created_at || kpi.updated_at,
            status: kpi.status === 'completed' ? 'success' : 
                    activityDate && new Date(activityDate) < new Date() ? 'error' : 'info',
            projectCode: kpi.project_code
          })
        })
      }

      // Sort by timestamp and take recent 8
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setRecentActivities(activities.slice(0, 8))

      console.log('✅ Dashboard data loaded successfully!')
      console.log('📊 Raw projects data:', projectsData?.slice(0, 3))
      console.log('📊 Raw activities data:', activitiesData?.slice(0, 3))
      console.log('📊 Raw KPI data:', kpisData?.slice(0, 3))
      console.log('📊 Mapped projects:', mappedProjects.slice(0, 3))
      console.log('📊 Mapped activities:', mappedActivities.slice(0, 3))
      console.log('📊 Mapped KPIs:', mappedKPIs.slice(0, 3))
      console.log('📊 Processed projects:', projectsWithProgress.map(p => ({
        id: p.id,
        name: p.project_name,
        code: p.project_code,
        division: p.responsible_division,
        status: p.project_status,
        progress: p.progress,
        activitiesCount: p.activitiesCount
      })))
      console.log('📊 Final stats:', {
        totalProjects: totalProjects,
        activeProjects: activeProjects,
        completedProjects: completedProjects,
        totalActivities: totalActivities,
        completedActivities: completedActivities,
        totalKPIs: totalKPIs,
        completedKPIs: completedKPIs,
        totalValue: totalValue,
        completedValue: completedValue
      })
      
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error)
      
      // محاولة إعادة الاتصال بعد 10 ثوان
      setTimeout(() => {
        console.log('🔄 Retrying dashboard data fetch...')
        fetchDashboardData(true)
      }, 10000)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
    
    // ✅ Removed periodic connection check to avoid disturbing users
    // Only check connection when browser detects offline/online events
    
    // معالج لانقطاع الاتصال في المتصفح
    const handleOnline = () => {
      console.log('🌐 Connection restored, refreshing data...')
      fetchDashboardData(true)
    }
    
    const handleOffline = () => {
      console.warn('📡 Connection lost')
    }
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Filter projects based on search
  const filteredProjects = useMemo(() => {
    // إذا لم تكن هناك مشاريع محملة بعد
    if (!projects || projects.length === 0) {
      return []
    }
    
    if (!searchTerm || searchTerm.trim() === '') {
      return projects.slice(0, 6)
    }
    
    const searchLower = searchTerm.toLowerCase().trim()
    const filtered = projects.filter(project => {
      // جلب جميع القيم مع حماية من القيم الفارغة
      const projectName = String(project.project_name || '').toLowerCase()
      const projectCode = String(project.project_code || '').toLowerCase()
      const division = String(project.responsible_division || '').toLowerCase()
      const projectId = String(project.id || '').toLowerCase()
      
      // بحث أساسي - يتطابق مع أي جزء من النص
      const nameMatch = projectName.includes(searchLower)
      const codeMatch = projectCode.includes(searchLower)
      const divisionMatch = division.includes(searchLower)
      const idMatch = projectId.includes(searchLower)
      
      // بحث في الكلمات المنفصلة
      const nameWords = projectName.split(/\s+/)
      const codeWords = projectCode.split(/\s+/)
      const divisionWords = division.split(/\s+/)
      
      const nameWordMatch = nameWords.some(word => word.includes(searchLower))
      const codeWordMatch = codeWords.some(word => word.includes(searchLower))
      const divisionWordMatch = divisionWords.some(word => word.includes(searchLower))
      
      // بحث في جميع الحقول كسلسلة واحدة
      const allFields = `${projectName} ${projectCode} ${division} ${projectId}`.toLowerCase()
      const allFieldsMatch = allFields.includes(searchLower)
      
      return nameMatch || codeMatch || divisionMatch || idMatch || 
             nameWordMatch || codeWordMatch || divisionWordMatch ||
             allFieldsMatch
    })
    
    console.log('🔍 Search Debug:', {
      searchTerm,
      searchLower,
      totalProjects: projects.length,
      filteredCount: filtered.length,
      allProjects: projects.map(p => ({
        id: p.id,
        name: p.project_name,
        code: p.project_code,
        division: p.responsible_division,
        status: p.project_status,
        nameMatch: String(p.project_name || '').toLowerCase().includes(searchLower),
        codeMatch: String(p.project_code || '').toLowerCase().includes(searchLower),
        divisionMatch: String(p.responsible_division || '').toLowerCase().includes(searchLower),
        idMatch: String(p.id || '').toLowerCase().includes(searchLower)
      })),
      filteredProjects: filtered.map(p => ({
        id: p.id,
        name: p.project_name,
        code: p.project_code,
        division: p.responsible_division
      })),
      searchResults: filtered.length > 0 ? 'FOUND' : 'NOT_FOUND'
    })
    
    return filtered.slice(0, 6)
  }, [projects, searchTerm])

  // Calculate completion rate
  const completionRate = stats.totalProjects > 0 
    ? (stats.completedProjects / stats.totalProjects) * 100 
    : 0

  // Calculate value completion rate
  const valueCompletionRate = stats.totalValue > 0 
    ? (stats.completedValue / stats.totalValue) * 100 
    : 0

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-[1800px] mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Integrated Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2 text-lg">
                Welcome back, {appUser?.first_name && appUser?.last_name 
                  ? `${appUser.first_name} ${appUser.last_name}` 
                  : appUser?.full_name || 'User'
                }! Here's your complete project overview
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Dashboard Tabs */}
              <div className="flex items-center gap-2 bg-white dark:bg-gray-700 rounded-lg p-1">
                {(['overview', 'analytics', 'charts', 'alerts', 'optimizations'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      activeTab === tab
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              {/* Time Range Filter */}
              <div className="flex items-center gap-2 bg-white dark:bg-gray-700 rounded-lg p-1">
                {(['today', 'week', 'month', 'all'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setSelectedTimeRange(range)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                      selectedTimeRange === range
                        ? 'bg-green-600 text-white shadow-lg'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    {range.charAt(0).toUpperCase() + range.slice(1)}
                  </button>
                ))}
              </div>

              {/* Refresh Button */}
              <button
                onClick={() => fetchDashboardData(true)}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg transition-all duration-300 hover:scale-105 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1800px] mx-auto px-6 py-8">
        {/* Tab Content */}
        {activeTab === 'overview' && (
          <>
            {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Projects */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Projects</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.totalProjects}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-600 dark:text-green-400">{stats.completedProjects}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Activity className="h-4 w-4 text-blue-500" />
                    <span className="text-sm text-blue-600 dark:text-blue-400">{stats.activeProjects}</span>
                  </div>
                </div>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Building2 className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>

          {/* Total Value */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Value</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  ${(stats.totalValue / 1000000).toFixed(1)}M
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-600 dark:text-green-400">
                      {valueCompletionRate.toFixed(1)}% Complete
                    </span>
                  </div>
                </div>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>

          {/* Activities Progress */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Activities</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.totalActivities}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-600 dark:text-green-400">{stats.completedActivities}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-orange-500" />
                    <span className="text-sm text-orange-600 dark:text-orange-400">
                      {stats.totalActivities - stats.completedActivities}
                    </span>
                  </div>
                </div>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Target className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>

          {/* KPI Performance */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">KPI Performance</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.totalKPIs}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-600 dark:text-green-400">{stats.completedKPIs}</span>
                  </div>
                  {stats.overdueKPIs > 0 && (
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <span className="text-sm text-red-600 dark:text-red-400">{stats.overdueKPIs}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Progress Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Overall Progress */}
          <div className="lg:col-span-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Overall Progress</h3>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Average: {stats.averageProgress.toFixed(1)}%</span>
              </div>
            </div>
            
            <div className="space-y-4">
              {/* Project Completion Rate */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Project Completion</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{completionRate.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${completionRate}%` }}
                  ></div>
                </div>
              </div>

              {/* Value Completion Rate */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Value Completion</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{valueCompletionRate.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${valueCompletionRate}%` }}
                  ></div>
                </div>
              </div>

              {/* Activity Completion Rate */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Activity Completion</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {stats.totalActivities > 0 ? ((stats.completedActivities / stats.totalActivities) * 100).toFixed(1) : 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${stats.totalActivities > 0 ? (stats.completedActivities / stats.totalActivities) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Quick Stats</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Today's KPIs</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Due today</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{stats.todayKPIs}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-green-500 rounded-lg flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Completed</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">This period</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-green-600 dark:text-green-400">{stats.completedProjects}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-orange-500 rounded-lg flex items-center justify-center">
                    <Clock className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">On Hold</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Projects</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-orange-600 dark:text-orange-400">{stats.onHoldProjects}</span>
              </div>

              {stats.overdueKPIs > 0 && (
                <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 bg-red-500 rounded-lg flex items-center justify-center">
                      <AlertTriangle className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Overdue</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">KPIs</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-red-600 dark:text-red-400">{stats.overdueKPIs}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Projects and Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Projects */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Recent Projects</h3>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search projects..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">Loading projects...</p>
                </div>
              ) : filteredProjects.length > 0 ? (
                filteredProjects.map((project) => (
                  <div key={project.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`h-3 w-3 rounded-full ${
                          (project.project_status as string) === 'completed' || (project.project_status as string) === 'completed-duration' || (project.project_status as string) === 'contract-duration' ? 'bg-green-500' :
                          (project.project_status as string) === 'on-going' ? 'bg-blue-500' :
                          (project.project_status as string) === 'site-preparation' ? 'bg-orange-500' :
                          (project.project_status as string) === 'on-hold' ? 'bg-yellow-500' :
                          (project.project_status as string) === 'cancelled' ? 'bg-red-500' : 'bg-gray-500'
                        }`}></div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">{project.project_name}</h4>
                      </div>
                      <span className="text-sm font-bold text-gray-600 dark:text-gray-400">
                        {project.progress.toFixed(1)}%
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                      <span>{project.project_code}</span>
                      <span>{project.responsible_division}</span>
                    </div>
                    
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${
                          project.progress >= 80 ? 'bg-gradient-to-r from-green-500 to-green-600' :
                          project.progress >= 50 ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                          project.progress >= 25 ? 'bg-gradient-to-r from-orange-500 to-orange-600' :
                          'bg-gradient-to-r from-gray-400 to-gray-500'
                        }`}
                        style={{ width: `${Math.min(project.progress, 100)}%` }}
                      ></div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-gray-500">
                      <span>{project.activitiesCount} activities</span>
                      <span>${(project.totalValue / 1000000).toFixed(1)}M</span>
                    </div>
                  </div>
                ))
              ) : searchTerm && searchTerm.trim() !== '' ? (
                <div className="text-center py-8">
                  <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No projects found</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    No projects match your search for "{searchTerm}". Try a different search term.
                  </p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No projects available</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    There are no projects to display at the moment.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Recent Activity</h3>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Live</span>
              </div>
            </div>

            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                    activity.status === 'success' ? 'bg-green-500' :
                    activity.status === 'warning' ? 'bg-orange-500' :
                    activity.status === 'error' ? 'bg-red-500' : 'bg-blue-500'
                  }`}>
                    {activity.type === 'project' ? <Building2 className="h-4 w-4 text-white" /> :
                     activity.type === 'activity' ? <Target className="h-4 w-4 text-white" /> :
                     <BarChart3 className="h-4 w-4 text-white" />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 dark:text-white text-sm">{activity.title}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{activity.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-gray-500 dark:text-gray-500">
                        {new Date(activity.timestamp).toLocaleDateString()}
                      </span>
                      {activity.projectCode && (
                        <span className="text-xs bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">
                          {activity.projectCode}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
          </>
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
      </div>
    </div>
  )
}
