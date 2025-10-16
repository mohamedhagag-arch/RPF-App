'use client'

import { useState, useEffect, useRef } from 'react'
import { getSupabaseClient, executeQuery } from '@/lib/simpleConnectionManager'
import { useSmartLoading } from '@/lib/smartLoadingManager'
import { Project, BOQActivity, TABLES } from '@/lib/supabase'
import { mapProjectFromDB, mapBOQFromDB, mapKPIFromDB } from '@/lib/dataMappers'
import { processKPIRecord, ProcessedKPI } from '@/lib/kpiProcessor'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Alert } from '@/components/ui/Alert'
import { SmartFilter } from '@/components/ui/SmartFilter'
import { PrintableReport } from './PrintableReport'
import { PrintButton } from '@/components/ui/PrintButton'
import {
  FileText,
  Download,
  BarChart3,
  PieChart,
  TrendingUp,
  Calendar,
  Filter,
  RefreshCw,
  Printer,
  Archive,
  Target,
  CheckCircle,
  AlertTriangle,
  Clock,
  DollarSign,
  Activity,
  Eye,
  CalendarDays,
  CalendarRange,
  CalendarClock,
  FastForward
} from 'lucide-react'
import {
  generateDailyReport,
  generateWeeklyReport,
  generateMonthlyReport,
  generateLookaheadReport,
  generateProjectSummary,
  WorkReport,
  LookaheadReport
} from '@/lib/reportingSystem'

type ReportType = 'summary' | 'daily' | 'weekly' | 'monthly' | 'lookahead' | 'projects' | 'activities' | 'kpis' | 'financial' | 'performance'

export function ModernReportsManager() {
  const [projects, setProjects] = useState<Project[]>([])
  const [activities, setActivities] = useState<BOQActivity[]>([])
  const [kpis, setKpis] = useState<ProcessedKPI[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeReport, setActiveReport] = useState<ReportType>('summary')
  
  const { startSmartLoading, stopSmartLoading } = useSmartLoading('modern-reports')
  
  // Smart Filter State
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  })
  
  const supabase = getSupabaseClient()
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    console.log('🟡 Reports: Component mounted')
    
    fetchAllData()
    
    return () => {
      console.log('🔴 Reports: Component unmounting')
      isMountedRef.current = false
    }
  }, [])

  const fetchAllData = async () => {
    try {
      startSmartLoading(setLoading)
      setError('')
      console.log('📊 Reports: Fetching all data...')

      // ✅ SMART LOADING: Load only what's needed based on filters
      const shouldLoadAll = selectedProjects.length === 0
      
      if (shouldLoadAll) {
        console.log('📊 Loading summary data (limited records for performance)...')
        
        // Load limited data for summary
      const [projectsResult, activitiesResult, kpisResult] = await Promise.all([
          executeQuery(async () =>
        supabase
          .from(TABLES.PROJECTS)
          .select('*')
              .order('created_at', { ascending: false })
              // Removed limit to load all projects
          ),
          executeQuery(async () =>
        supabase
          .from(TABLES.BOQ_ACTIVITIES)
          .select('*')
              .order('created_at', { ascending: false })
              .limit(200) // Limit to 200 activities
          ),
          executeQuery(async () =>
        supabase
          .from(TABLES.KPI)
          .select('*')
          .order('created_at', { ascending: false })
              .limit(500) // Limit to 500 KPIs
          )
        ])

        if (projectsResult.error) throw projectsResult.error
        if (activitiesResult.error) throw activitiesResult.error
        if (kpisResult.error) throw kpisResult.error

        const mappedProjects = (projectsResult.data || []).map(mapProjectFromDB)
        const mappedActivities = (activitiesResult.data || []).map(mapBOQFromDB)
        const mappedKPIs = (kpisResult.data || []).map(mapKPIFromDB)
        const processedKPIs = mappedKPIs.map(processKPIRecord)

        setProjects(mappedProjects)
        setActivities(mappedActivities)
        setKpis(processedKPIs)

        console.log('✅ Reports: Summary data loaded (limited)', {
          projects: mappedProjects.length,
          activities: mappedActivities.length,
          kpis: processedKPIs.length
        })
      } else {
        console.log('📊 Loading filtered data for selected projects:', selectedProjects)
        
        // Load full data for selected projects
        const [projectsResult, activitiesResult, kpisResult] = await Promise.all([
          executeQuery(async () =>
            supabase
              .from(TABLES.PROJECTS)
              .select('*')
              .in('Project Code', selectedProjects)
          ),
          executeQuery(async () =>
            supabase
              .from(TABLES.BOQ_ACTIVITIES)
              .select('*')
              .in('Project Code', selectedProjects)
          ),
          executeQuery(async () =>
            supabase
              .from(TABLES.KPI)
              .select('*')
              .in('Project Full Code', selectedProjects)
          )
        ])

        if (projectsResult.error) throw projectsResult.error
        if (activitiesResult.error) throw activitiesResult.error
        if (kpisResult.error) throw kpisResult.error

      const mappedProjects = (projectsResult.data || []).map(mapProjectFromDB)
      const mappedActivities = (activitiesResult.data || []).map(mapBOQFromDB)
      const mappedKPIs = (kpisResult.data || []).map(mapKPIFromDB)
      const processedKPIs = mappedKPIs.map(processKPIRecord)

      setProjects(mappedProjects)
      setActivities(mappedActivities)
      setKpis(processedKPIs)

        console.log('✅ Reports: Filtered data loaded', {
        projects: mappedProjects.length,
        activities: mappedActivities.length,
        kpis: processedKPIs.length
      })
      }
    } catch (error: any) {
      console.error('❌ Reports: Error loading data:', error)
      setError('Failed to load report data: ' + error.message)
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  // Apply filters
  const getFilteredData = () => {
    let filteredProjects = projects
    let filteredActivities = activities
    let filteredKPIs = kpis

    // Filter by selected projects
    if (selectedProjects.length > 0) {
      filteredProjects = projects.filter(p => selectedProjects.includes(p.project_code))
      filteredActivities = activities.filter(a => selectedProjects.some(pc => 
        a.project_code === pc || a.project_full_code?.startsWith(pc)
      ))
      filteredKPIs = kpis.filter(k => selectedProjects.some(pc => 
        (k as any).project_code === pc || k.project_full_code?.startsWith(pc)
      ))
    }

    // Filter by divisions
    if (selectedDivisions.length > 0) {
      filteredProjects = filteredProjects.filter(p => 
        selectedDivisions.includes(p.responsible_division)
      )
    }

    // Filter by statuses
    if (selectedStatuses.length > 0) {
      filteredProjects = filteredProjects.filter(p => 
        selectedStatuses.includes(p.project_status)
      )
    }

    // Filter by date range
    if (dateRange.start) {
      const startDate = new Date(dateRange.start)
      filteredProjects = filteredProjects.filter(p => new Date(p.created_at) >= startDate)
      filteredActivities = filteredActivities.filter(a => new Date(a.created_at) >= startDate)
      filteredKPIs = filteredKPIs.filter(k => new Date(k.created_at) >= startDate)
    }

    if (dateRange.end) {
      const endDate = new Date(dateRange.end)
      filteredProjects = filteredProjects.filter(p => new Date(p.created_at) <= endDate)
      filteredActivities = filteredActivities.filter(a => new Date(a.created_at) <= endDate)
      filteredKPIs = filteredKPIs.filter(k => new Date(k.created_at) <= endDate)
    }

    return { filteredProjects, filteredActivities, filteredKPIs }
  }

  const { filteredProjects, filteredActivities, filteredKPIs } = getFilteredData()

  // Calculate summary statistics
  const summary = {
    totalProjects: filteredProjects.length,
    activeProjects: filteredProjects.filter(p => p.project_status === 'on-going').length,
    completedProjects: filteredProjects.filter(p => p.project_status === 'completed' || p.project_status === 'completed-duration' || p.project_status === 'contract-duration').length,
    onHoldProjects: filteredProjects.filter(p => p.project_status === 'on-hold').length,
    
    totalActivities: filteredActivities.length,
    completedActivities: filteredActivities.filter(a => a.activity_completed).length,
    delayedActivities: filteredActivities.filter(a => a.activity_delayed).length,
    onTrackActivities: filteredActivities.filter(a => a.activity_on_track).length,
    
    totalKPIs: filteredKPIs.length,
    plannedKPIs: filteredKPIs.filter(k => k.input_type === 'Planned').length,
    actualKPIs: filteredKPIs.filter(k => k.input_type === 'Actual').length,
    
    totalContractValue: filteredProjects.reduce((sum, p) => sum + (p.contract_amount || 0), 0),
    totalPlannedValue: filteredActivities.reduce((sum, a) => sum + (a.planned_value || 0), 0),
    totalActualValue: filteredActivities.reduce((sum, a) => sum + (a.total_value || 0), 0),
    
    // Calculate average progress from KPIs
    averageProgress: (() => {
      const planned = filteredKPIs.filter(k => k.input_type === 'Planned')
      const actual = filteredKPIs.filter(k => k.input_type === 'Actual')
      const totalPlanned = planned.reduce((sum, k) => sum + (parseFloat(k.quantity?.toString() || '0') || 0), 0)
      const totalActual = actual.reduce((sum, k) => sum + (parseFloat(k.quantity?.toString() || '0') || 0), 0)
      return totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : 0
    })()
  }

  const exportToCSV = () => {
    let csv = ''
    
    if (activeReport === 'projects') {
      csv = 'Project Code,Project Name,Division,Status,Contract Amount,Created\n'
      filteredProjects.forEach(p => {
        csv += `"${p.project_code}","${p.project_name}","${p.responsible_division}","${p.project_status}","${p.contract_amount}","${new Date(p.created_at).toLocaleDateString()}"\n`
      })
    } else if (activeReport === 'activities') {
      csv = 'Activity Name,Project,Division,Planned,Actual,Unit,Progress,Start Date,End Date,Status,Created\n'
      filteredActivities.forEach(a => {
        const startDate = a.planned_activity_start_date || a.activity_planned_start_date || a.lookahead_start_date || ''
        const endDate = a.deadline || a.activity_planned_completion_date || a.lookahead_activity_completion_date || ''
        csv += `"${a.activity_name}","${a.project_code}","${a.activity_division}","${a.planned_units}","${a.actual_units}","${a.unit}","${(a.activity_progress_percentage || 0).toFixed(0)}%","${startDate ? new Date(startDate).toLocaleDateString() : ''}","${endDate ? new Date(endDate).toLocaleDateString() : ''}","${a.activity_actual_status}","${new Date(a.created_at).toLocaleDateString()}"\n`
      })
    } else if (activeReport === 'kpis') {
      csv = 'Activity,Project,Type,Quantity,Unit,Date,Created\n'
      filteredKPIs.forEach(k => {
        const dateValue = k.activity_date || k.target_date || ''
        csv += `"${k.activity_name}","${k.project_full_code}","${k.input_type}","${k.quantity}","${k.unit || ''}","${dateValue ? new Date(dateValue).toLocaleDateString() : ''}","${new Date(k.created_at).toLocaleDateString()}"\n`
      })
    }

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${activeReport}-report-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
  }

  const printReport = () => {
    // Trigger browser print dialog
    window.print()
  }

  const getReportTitle = () => {
    switch (activeReport) {
      case 'summary': return 'Project Summary Report'
      case 'daily': return 'Daily Progress Report'
      case 'weekly': return 'Weekly Progress Report'
      case 'monthly': return 'Monthly Progress Report'
      case 'lookahead': return 'Lookahead Planning Report'
      case 'projects': return 'Projects Overview Report'
      case 'activities': return 'BOQ Activities Report'
      case 'kpis': return 'KPI Tracking Report'
      case 'financial': return 'Financial Performance Report'
      case 'performance': return 'Performance Analysis Report'
      default: return 'Project Report'
    }
  }

  const getPrintSettingsForReport = (reportType: ReportType) => {
    switch (reportType) {
      case 'activities':
        return {
          fontSize: '10px',
          compactMode: true
        }
      default:
        return {
          fontSize: '11px',
          compactMode: true
        }
    }
  }

  const getReportDateRange = () => {
    if (dateRange.start && dateRange.end) {
      return `${new Date(dateRange.start).toLocaleDateString()} - ${new Date(dateRange.end).toLocaleDateString()}`
    }
    if (activeReport === 'daily') {
      return new Date().toLocaleDateString()
    }
    if (activeReport === 'weekly') {
      const now = new Date()
      const weekStart = new Date(now.setDate(now.getDate() - now.getDay()))
      const weekEnd = new Date(now.setDate(now.getDate() - now.getDay() + 6))
      return `${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`
    }
    if (activeReport === 'monthly') {
      return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    }
    return 'All Time'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading reports data...</p>
        </div>
      </div>
    )
  }

  return (
    <PrintableReport
      title={getReportTitle()}
      reportType={activeReport.toUpperCase() + ' REPORT'}
      dateRange={getReportDateRange()}
      preparedBy="System Administrator"
      projectCode={selectedProjects.length === 1 ? selectedProjects[0] : undefined}
      projectName={selectedProjects.length === 1 ? projects.find(p => p.project_code === selectedProjects[0])?.project_name : undefined}
      showSignatures={true}
      confidential={false}
    >
    <div className="space-y-6">
        {/* Header - Hidden on print */}
        <div className="flex justify-between items-center no-print print-hide">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Reports & Analytics
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Comprehensive project reports with real-time data from BOQ and KPI
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchAllData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <PrintButton
            label="Print Report"
            variant="outline"
            printTitle={getReportTitle()}
            printSettings={getPrintSettingsForReport(activeReport)}
          />
          <Button onClick={exportToCSV} variant="primary" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="error">
          {error}
        </Alert>
      )}

        {/* Smart Filters - Hidden on print */}
        <Card className="no-print print-hide">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Report Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <SmartFilter
              projects={projects}
              activities={activities}
              selectedProjects={selectedProjects}
              selectedActivities={[]}
              selectedTypes={selectedTypes}
              selectedStatuses={selectedStatuses}
              onProjectsChange={setSelectedProjects}
              onTypesChange={setSelectedTypes}
              onStatusesChange={setSelectedStatuses}
              onActivitiesChange={() => {}}
              onClearAll={() => {
                setSelectedProjects([])
                setSelectedTypes([])
                setSelectedStatuses([])
              }}
            />
            
            {/* Date Range Filter */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="w-full h-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="w-full h-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 stat-card-grid">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 border-blue-200 dark:border-blue-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Projects</p>
                <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{summary.totalProjects}</p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  {summary.activeProjects} active, {summary.completedProjects} completed
                </p>
              </div>
              <Archive className="h-10 w-10 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 border-green-200 dark:border-green-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700 dark:text-green-300">BOQ Activities</p>
                <p className="text-3xl font-bold text-green-900 dark:text-green-100">{summary.totalActivities}</p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  {summary.completedActivities} completed, {summary.delayedActivities} delayed
                </p>
              </div>
              <Target className="h-10 w-10 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 border-purple-200 dark:border-purple-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700 dark:text-purple-300">KPI Records</p>
                <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">{summary.totalKPIs}</p>
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                  {summary.plannedKPIs} planned, {summary.actualKPIs} actual
                </p>
              </div>
              <BarChart3 className="h-10 w-10 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900 dark:to-orange-800 border-orange-200 dark:border-orange-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-700 dark:text-orange-300">Avg Progress</p>
                <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">
                  {summary.averageProgress.toFixed(1)}%
                </p>
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                  Based on KPI data
                </p>
              </div>
              <TrendingUp className="h-10 w-10 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

        {/* Report Type Tabs - Hidden on print */}
        <div className="flex gap-2 flex-wrap no-print print-hide">
        {[
          { id: 'summary', label: 'Summary', icon: BarChart3, color: 'blue' },
          { id: 'daily', label: 'Daily', icon: CalendarDays, color: 'green' },
          { id: 'weekly', label: 'Weekly', icon: CalendarRange, color: 'purple' },
          { id: 'monthly', label: 'Monthly', icon: CalendarClock, color: 'orange' },
          { id: 'lookahead', label: 'Lookahead', icon: FastForward, color: 'pink' },
          { id: 'projects', label: 'Projects', icon: Archive, color: 'indigo' },
          { id: 'activities', label: 'Activities', icon: Target, color: 'teal' },
          { id: 'kpis', label: 'KPIs', icon: TrendingUp, color: 'cyan' },
          { id: 'financial', label: 'Financial', icon: DollarSign, color: 'emerald' },
          { id: 'performance', label: 'Performance', icon: Activity, color: 'rose' }
        ].map((tab) => {
          const Icon = tab.icon
          return (
            <Button
              key={tab.id}
              variant={activeReport === tab.id ? 'primary' : 'outline'}
              onClick={() => setActiveReport(tab.id as ReportType)}
              size="sm"
            >
              <Icon className="w-4 h-4 mr-2" />
              {tab.label}
            </Button>
          )
        })}
      </div>

      {/* Report Content */}
        <div className="report-section">
          {activeReport === 'summary' && <SummaryReport summary={summary} activities={filteredActivities} />}
          {activeReport === 'daily' && <DailyReport activities={filteredActivities} />}
          {activeReport === 'weekly' && <WeeklyReport activities={filteredActivities} />}
          {activeReport === 'monthly' && <MonthlyReport activities={filteredActivities} />}
          {activeReport === 'lookahead' && <LookaheadReportView activities={filteredActivities} />}
          {activeReport === 'projects' && <ProjectsReport projects={filteredProjects} activities={filteredActivities} kpis={filteredKPIs} />}
          {activeReport === 'activities' && <ActivitiesReport activities={filteredActivities} />}
          {activeReport === 'kpis' && <KPIsReport kpis={filteredKPIs} />}
          {activeReport === 'financial' && <FinancialReport summary={summary} projects={filteredProjects} activities={filteredActivities} />}
          {activeReport === 'performance' && <PerformanceReport projects={filteredProjects} activities={filteredActivities} kpis={filteredKPIs} />}
        </div>
      </div>
    </PrintableReport>
  )
}

// Daily Report Component
function DailyReport({ activities }: { activities: BOQActivity[] }) {
  const todayReport = generateDailyReport(activities, new Date())
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
          Daily Report - {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </h3>
      </div>

      {/* Daily Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Planned</p>
                <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                  {todayReport.totalPlanned.toFixed(0)}
                </p>
              </div>
              <Target className="h-10 w-10 text-blue-600" />
            </div>
        </CardContent>
      </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700 dark:text-green-300">Total Actual</p>
                <p className="text-3xl font-bold text-green-900 dark:text-green-100">
                  {todayReport.totalActual.toFixed(0)}
                </p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Progress</p>
                <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                  {todayReport.progressPercentage.toFixed(0)}%
                </p>
              </div>
              <TrendingUp className="h-10 w-10 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900 dark:to-orange-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-700 dark:text-orange-300">Activities</p>
                <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">
                  {todayReport.activities.length}
                </p>
                <p className="text-xs text-orange-600 mt-1">{todayReport.completedActivities} completed</p>
              </div>
              <Activity className="h-10 w-10 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Activities */}
      {todayReport.activities.length > 0 ? (
        <div className="overflow-x-auto">
          <h4 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Today's Activities</h4>
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Activity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Planned</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actual</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Progress</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {todayReport.activities.map(activity => (
                <tr key={activity.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">{activity.activity_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{activity.project_code}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">{activity.planned_units} {activity.unit}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-green-600">{activity.actual_units} {activity.unit}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${Math.min(activity.activity_progress_percentage || 0, 100)}%` }}></div>
                      </div>
                      <span className="text-sm font-medium">{(activity.activity_progress_percentage || 0).toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      activity.activity_completed ? 'bg-green-100 text-green-800' :
                      activity.activity_delayed ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {activity.activity_completed ? 'Completed' : activity.activity_delayed ? 'Delayed' : 'In Progress'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <CalendarDays className="h-12 w-12 mx-auto mb-3 text-gray-400" />
          <p>No activities scheduled for today</p>
        </div>
      )}
    </div>
  )
}

// Weekly Report Component
function WeeklyReport({ activities }: { activities: BOQActivity[] }) {
  const weeklyReport = generateWeeklyReport(activities)
  const weekNumber = Math.ceil((new Date().getDate()) / 7)
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
          Weekly Report - {weeklyReport.startDate.toLocaleDateString()} to {weeklyReport.endDate.toLocaleDateString()}
        </h3>
      </div>

      {/* Weekly Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Total Activities</p>
            <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">{weeklyReport.activities.length}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-green-700 dark:text-green-300">Completed</p>
            <p className="text-3xl font-bold text-green-900 dark:text-green-100">{weeklyReport.completedActivities}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">In Progress</p>
            <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{weeklyReport.ongoingActivities}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900 dark:to-red-800">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-red-700 dark:text-red-300">Delayed</p>
            <p className="text-3xl font-bold text-red-900 dark:text-red-100">{weeklyReport.delayedActivities}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900 dark:to-indigo-800">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Progress</p>
            <p className="text-3xl font-bold text-indigo-900 dark:text-indigo-100">{weeklyReport.progressPercentage.toFixed(0)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Activities Table */}
      {weeklyReport.activities.length > 0 && (
        <ActivitiesReport activities={weeklyReport.activities} />
      )}
    </div>
  )
}

// Monthly Report Component
function MonthlyReport({ activities }: { activities: BOQActivity[] }) {
  const monthlyReport = generateMonthlyReport(activities)
  const monthName = monthlyReport.startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
          Monthly Report - {monthName}
        </h3>
      </div>

      {/* Monthly Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900 dark:to-orange-800">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-orange-700 dark:text-orange-300">Total Activities</p>
            <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">{monthlyReport.activities.length}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-green-700 dark:text-green-300">Completed</p>
            <p className="text-3xl font-bold text-green-900 dark:text-green-100">{monthlyReport.completedActivities}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Planned</p>
            <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{monthlyReport.totalPlanned.toFixed(0)}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900 dark:to-cyan-800">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-cyan-700 dark:text-cyan-300">Total Actual</p>
            <p className="text-3xl font-bold text-cyan-900 dark:text-cyan-100">{monthlyReport.totalActual.toFixed(0)}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Progress</p>
            <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">{monthlyReport.progressPercentage.toFixed(0)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-gray-900 dark:text-white">Monthly Progress</h4>
          <span className="text-2xl font-bold text-blue-600">{monthlyReport.progressPercentage.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
          <div
            className="bg-gradient-to-r from-blue-600 to-purple-600 h-4 rounded-full transition-all"
            style={{ width: `${Math.min(monthlyReport.progressPercentage, 100)}%` }}
          ></div>
        </div>
      </div>

      {/* Monthly Activities */}
      {monthlyReport.activities.length > 0 && (
        <ActivitiesReport activities={monthlyReport.activities} />
      )}
    </div>
  )
}

// Lookahead Report Component
function LookaheadReportView({ activities }: { activities: BOQActivity[] }) {
  const lookaheadReport = generateLookaheadReport(activities)
  
  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Lookahead Report - Planning Ahead
      </h3>

      {/* Current Week */}
      <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-300 dark:border-blue-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
            <CalendarRange className="h-5 w-5" />
            Current Week (Week {lookaheadReport.currentWeek.weekNumber})
          </CardTitle>
          <p className="text-sm text-gray-600">
            {lookaheadReport.currentWeek.startDate.toLocaleDateString()} - {lookaheadReport.currentWeek.endDate.toLocaleDateString()}
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Activities</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{lookaheadReport.currentWeek.plannedActivities.length}</p>
            </div>
            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
              <p className="text-2xl font-bold text-green-600">{lookaheadReport.currentWeek.completedActivities.length}</p>
            </div>
            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">In Progress</p>
              <p className="text-2xl font-bold text-blue-600">{lookaheadReport.currentWeek.inProgressActivities.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Week */}
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-300 dark:border-green-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-900 dark:text-green-100">
            <FastForward className="h-5 w-5" />
            Next Week (Week {lookaheadReport.nextWeek.weekNumber})
          </CardTitle>
          <p className="text-sm text-gray-600">
            {lookaheadReport.nextWeek.startDate.toLocaleDateString()} - {lookaheadReport.nextWeek.endDate.toLocaleDateString()}
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Planned Activities</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{lookaheadReport.nextWeek.plannedActivities.length}</p>
            </div>
            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Estimated Workload</p>
              <p className="text-2xl font-bold text-green-600">{lookaheadReport.nextWeek.estimatedWorkload.toFixed(0)}</p>
            </div>
          </div>
          
          {lookaheadReport.nextWeek.plannedActivities.length > 0 && (
            <div className="space-y-2">
              <h5 className="font-semibold text-gray-900 dark:text-white">Upcoming Activities:</h5>
              {lookaheadReport.nextWeek.plannedActivities.slice(0, 5).map(activity => (
                <div key={activity.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{activity.activity_name}</p>
                    <p className="text-xs text-gray-500">{activity.project_code}</p>
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    {activity.planned_units} {activity.unit}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Critical Path */}
      {lookaheadReport.upcoming.criticalPath.length > 0 && (
        <Card className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-red-300 dark:border-red-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-900 dark:text-red-100">
              <AlertTriangle className="h-5 w-5" />
              Critical Path - Needs Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lookaheadReport.upcoming.criticalPath.map(activity => (
                <div key={activity.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border-l-4 border-red-500">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{activity.activity_name}</p>
                    <p className="text-xs text-gray-500">{activity.project_code} • Deadline: {new Date(activity.deadline).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-600">{(activity.activity_progress_percentage || 0).toFixed(0)}%</p>
                    <p className="text-xs text-gray-500">Progress</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Summary Report Component
function SummaryReport({ summary, activities }: { summary: any, activities: BOQActivity[] }) {
  const projectSummary = generateProjectSummary(activities)
  
  return (
    <div className="space-y-6">
      {/* Overall Project Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900 dark:to-emerald-800">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Total Work Planned</p>
            <p className="text-3xl font-bold text-emerald-900 dark:text-emerald-100">
              {projectSummary.totalWork.planned.toFixed(0)}
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">All units combined</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Work Actual</p>
            <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
              {projectSummary.totalWork.actual.toFixed(0)}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Completed work</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900 dark:to-orange-800">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-orange-700 dark:text-orange-300">Remaining Work</p>
            <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">
              {projectSummary.totalWork.remaining.toFixed(0)}
            </p>
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">To be completed</p>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br ${
          projectSummary.progress.status === 'ahead' ? 'from-green-50 to-green-100 dark:from-green-900 dark:to-green-800' :
          projectSummary.progress.status === 'on_track' ? 'from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800' :
          projectSummary.progress.status === 'at_risk' ? 'from-yellow-50 to-yellow-100 dark:from-yellow-900 dark:to-yellow-800' :
          'from-red-50 to-red-100 dark:from-red-900 dark:to-red-800'
        }`}>
          <CardContent className="p-6">
            <p className={`text-sm font-medium ${
              projectSummary.progress.status === 'ahead' ? 'text-green-700 dark:text-green-300' :
              projectSummary.progress.status === 'on_track' ? 'text-blue-700 dark:text-blue-300' :
              projectSummary.progress.status === 'at_risk' ? 'text-yellow-700 dark:text-yellow-300' :
              'text-red-700 dark:text-red-300'
            }`}>Overall Progress</p>
            <p className={`text-3xl font-bold ${
              projectSummary.progress.status === 'ahead' ? 'text-green-900 dark:text-green-100' :
              projectSummary.progress.status === 'on_track' ? 'text-blue-900 dark:text-blue-100' :
              projectSummary.progress.status === 'at_risk' ? 'text-yellow-900 dark:text-yellow-100' :
              'text-red-900 dark:text-red-100'
            }`}>
              {projectSummary.progress.percentage.toFixed(1)}%
            </p>
            <p className={`text-xs mt-1 ${
              projectSummary.progress.status === 'ahead' ? 'text-green-600 dark:text-green-400' :
              projectSummary.progress.status === 'on_track' ? 'text-blue-600 dark:text-blue-400' :
              projectSummary.progress.status === 'at_risk' ? 'text-yellow-600 dark:text-yellow-400' :
              'text-red-600 dark:text-red-400'
            }`}>{projectSummary.progress.status.replace('_', ' ').toUpperCase()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Work by Period */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            Work Breakdown by Period
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Today</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{projectSummary.byPeriod.today.toFixed(0)}</p>
            </div>
            <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">This Week</p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{projectSummary.byPeriod.thisWeek.toFixed(0)}</p>
            </div>
            <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">This Month</p>
              <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{projectSummary.byPeriod.thisMonth.toFixed(0)}</p>
            </div>
            <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">{projectSummary.byPeriod.total.toFixed(0)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Projects Summary */}
        <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
          <h3 className="font-semibold text-lg text-blue-900 dark:text-blue-100 mb-4">Projects Overview</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-700 dark:text-gray-300">Total:</span>
              <span className="font-bold text-gray-900 dark:text-white">{summary.totalProjects}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700 dark:text-gray-300">Active:</span>
              <span className="font-bold text-green-600">{summary.activeProjects}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700 dark:text-gray-300">Completed:</span>
              <span className="font-bold text-blue-600">{summary.completedProjects}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700 dark:text-gray-300">On Hold:</span>
              <span className="font-bold text-yellow-600">{summary.onHoldProjects}</span>
            </div>
          </div>
        </div>

        {/* Activities Summary */}
        <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
          <h3 className="font-semibold text-lg text-green-900 dark:text-green-100 mb-4">Activities Overview</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-700 dark:text-gray-300">Total:</span>
              <span className="font-bold text-gray-900 dark:text-white">{summary.totalActivities}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700 dark:text-gray-300">Completed:</span>
              <span className="font-bold text-green-600">{summary.completedActivities}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700 dark:text-gray-300">On Track:</span>
              <span className="font-bold text-blue-600">{summary.onTrackActivities}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700 dark:text-gray-300">Delayed:</span>
              <span className="font-bold text-red-600">{summary.delayedActivities}</span>
            </div>
          </div>
        </div>

        {/* KPIs Summary */}
        <div className="p-6 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
          <h3 className="font-semibold text-lg text-purple-900 dark:text-purple-100 mb-4">KPIs Overview</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-700 dark:text-gray-300">Total Records:</span>
              <span className="font-bold text-gray-900 dark:text-white">{summary.totalKPIs}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700 dark:text-gray-300">Planned:</span>
              <span className="font-bold text-blue-600">{summary.plannedKPIs}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700 dark:text-gray-300">Actual:</span>
              <span className="font-bold text-green-600">{summary.actualKPIs}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700 dark:text-gray-300">Progress:</span>
              <span className="font-bold text-purple-600">{summary.averageProgress.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-900 dark:text-white">Overall KPI Progress</h3>
          <span className="text-2xl font-bold text-blue-600">{summary.averageProgress.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
          <div
            className="bg-gradient-to-r from-blue-600 to-purple-600 h-4 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(summary.averageProgress, 100)}%` }}
          ></div>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          Based on {summary.actualKPIs} actual vs {summary.plannedKPIs} planned KPIs
        </p>
      </div>
    </div>
  )
}

// Projects Report Component
function ProjectsReport({ projects, activities, kpis }: { projects: Project[], activities: BOQActivity[], kpis: ProcessedKPI[] }) {
  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Projects Report ({projects.length} projects)
      </h3>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Project</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Division</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Activities</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">KPIs</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Progress</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Contract Value</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {projects.map(project => {
              const projectActivities = activities.filter(a => 
                a.project_code === project.project_code || 
                a.project_full_code?.startsWith(project.project_code)
              )
              const projectKPIs = kpis.filter(k => 
                k.project_full_code?.startsWith(project.project_code)
              )
              
              const plannedKPIs = projectKPIs.filter(k => k.input_type === 'Planned')
              const actualKPIs = projectKPIs.filter(k => k.input_type === 'Actual')
              
              const totalPlanned = plannedKPIs.reduce((sum, k) => sum + (parseFloat(k.quantity?.toString() || '0') || 0), 0)
              const totalActual = actualKPIs.reduce((sum, k) => sum + (parseFloat(k.quantity?.toString() || '0') || 0), 0)
              const progress = totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : 0

              return (
                <tr key={project.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900 dark:text-gray-100">{project.project_name}</div>
                    <div className="text-sm text-gray-500">{project.project_code}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                    {project.responsible_division || 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      project.project_status === 'on-going' ? 'bg-green-100 text-green-800' :
                      project.project_status === 'completed' || project.project_status === 'completed-duration' || project.project_status === 'contract-duration' ? 'bg-blue-100 text-blue-800' :
                      project.project_status === 'on-hold' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {project.project_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                    {projectActivities.length}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                    {projectKPIs.length}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {progress.toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
                    AED {(project.contract_amount || 0).toLocaleString()}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Activities Report Component
function ActivitiesReport({ activities }: { activities: BOQActivity[] }) {
  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Activities Report ({activities.length} activities)
      </h3>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Activity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Project</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Division</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Planned</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actual</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Progress</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Start Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">End Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {activities.slice(0, 50).map(activity => (
              <tr key={activity.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900 dark:text-gray-100">{activity.activity_name}</div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                  {activity.project_code}
                </td>
                <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                  {activity.activity_division || 'N/A'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                  {activity.planned_units} {activity.unit}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                  {activity.actual_units} {activity.unit}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${Math.min(activity.activity_progress_percentage || 0, 100)}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {(activity.activity_progress_percentage || 0).toFixed(0)}%
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                  {activity.planned_activity_start_date || activity.activity_planned_start_date || activity.lookahead_start_date ? 
                    new Date(activity.planned_activity_start_date || activity.activity_planned_start_date || activity.lookahead_start_date).toLocaleDateString() : 'N/A'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                  {activity.deadline || activity.activity_planned_completion_date || activity.lookahead_activity_completion_date ? 
                    new Date(activity.deadline || activity.activity_planned_completion_date || activity.lookahead_activity_completion_date).toLocaleDateString() : 'N/A'}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    activity.activity_completed ? 'bg-green-100 text-green-800' :
                    activity.activity_delayed ? 'bg-red-100 text-red-800' :
                    activity.activity_on_track ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {activity.activity_actual_status || 'Unknown'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {activities.length > 50 && (
        <p className="text-sm text-gray-500 text-center">
          Showing first 50 of {activities.length} activities. Export to view all.
        </p>
      )}
    </div>
  )
}

// KPIs Report Component
function KPIsReport({ kpis }: { kpis: ProcessedKPI[] }) {
  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        KPI Records Report ({kpis.length} records)
      </h3>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Activity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Project</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Quantity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Unit</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Date</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {kpis.slice(0, 50).map(kpi => (
              <tr key={kpi.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900 dark:text-gray-100">{kpi.activity_name}</div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                  {kpi.project_full_code || (kpi as any).project_code}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    kpi.input_type === 'Planned' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {kpi.input_type}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {parseFloat(kpi.quantity?.toString() || '0').toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                  {kpi.unit || 'N/A'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                  {kpi.activity_date ? new Date(kpi.activity_date).toLocaleDateString() : 
                   kpi.target_date ? new Date(kpi.target_date).toLocaleDateString() : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {kpis.length > 50 && (
        <p className="text-sm text-gray-500 text-center">
          Showing first 50 of {kpis.length} KPI records. Export to view all.
        </p>
      )}
    </div>
  )
}

// Helper function
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency: 'AED',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount || 0)
}

// Financial Report Component
function FinancialReport({ summary, projects, activities }: { summary: any, projects: Project[], activities: BOQActivity[] }) {

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Financial Report
      </h3>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-blue-300 dark:border-blue-700">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100">Total Contract Value</h4>
            <DollarSign className="h-8 w-8 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
            {formatCurrency(summary.totalContractValue)}
          </p>
        </div>

        <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-lg border-2 border-green-300 dark:border-green-700">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-green-900 dark:text-green-100">Completed Value</h4>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-900 dark:text-green-100">
            {formatCurrency(summary.totalActualValue)}
          </p>
          <p className="text-sm text-green-700 dark:text-green-400 mt-1">
            {summary.totalContractValue > 0 
              ? ((summary.totalActualValue / summary.totalContractValue) * 100).toFixed(1)
              : 0}% of total
          </p>
        </div>

        <div className="p-6 bg-orange-50 dark:bg-orange-900/20 rounded-lg border-2 border-orange-300 dark:border-orange-700">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-orange-900 dark:text-orange-100">Remaining Value</h4>
            <Clock className="h-8 w-8 text-orange-600" />
          </div>
          <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">
            {formatCurrency(summary.totalContractValue - summary.totalActualValue)}
          </p>
          <p className="text-sm text-orange-700 dark:text-orange-400 mt-1">
            {summary.totalContractValue > 0 
              ? (((summary.totalContractValue - summary.totalActualValue) / summary.totalContractValue) * 100).toFixed(1)
              : 0}% remaining
          </p>
        </div>
      </div>

      {/* Projects Financial Breakdown */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Project</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Contract Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Activities Value</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Percentage</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {projects.map(project => {
              const projectActivities = activities.filter(a => 
                a.project_code === project.project_code || 
                a.project_full_code?.startsWith(project.project_code)
              )
              const activitiesValue = projectActivities.reduce((sum, a) => sum + (a.total_value || 0), 0)
              const percentage = project.contract_amount > 0 
                ? (activitiesValue / project.contract_amount) * 100 
                : 0

              return (
                <tr key={project.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900 dark:text-gray-100">{project.project_name}</div>
                    <div className="text-sm text-gray-500">{project.project_code}</div>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {formatCurrency(project.contract_amount)}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-green-600">
                    {formatCurrency(activitiesValue)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Performance Report Component
function PerformanceReport({ projects, activities, kpis }: { projects: Project[], activities: BOQActivity[], kpis: ProcessedKPI[] }) {
  // Calculate project performance
  const projectPerformance = projects.map(project => {
    const projectActivities = activities.filter(a => 
      a.project_code === project.project_code || 
      a.project_full_code?.startsWith(project.project_code)
    )
    const projectKPIs = kpis.filter(k => 
      (k as any).project_code === project.project_code || 
      k.project_full_code?.startsWith(project.project_code)
    )
    
    const plannedKPIs = projectKPIs.filter(k => k.input_type === 'Planned')
    const actualKPIs = projectKPIs.filter(k => k.input_type === 'Actual')
    
    const totalPlanned = plannedKPIs.reduce((sum, k) => sum + (parseFloat(k.quantity?.toString() || '0') || 0), 0)
    const totalActual = actualKPIs.reduce((sum, k) => sum + (parseFloat(k.quantity?.toString() || '0') || 0), 0)
    const progress = totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : 0

    return {
      project,
      activitiesCount: projectActivities.length,
      kpisCount: projectKPIs.length,
      progress,
      status: progress >= 75 ? 'Excellent' : progress >= 50 ? 'Good' : progress >= 25 ? 'Fair' : 'Needs Attention'
    }
  }).sort((a, b) => b.progress - a.progress)

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Performance Report
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Performers */}
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-900 dark:text-green-100">
              <TrendingUp className="h-5 w-5" />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {projectPerformance.slice(0, 5).map((item, index) => (
                <div key={item.project.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-green-600 text-white rounded-full font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">{item.project.project_name}</div>
                      <div className="text-xs text-gray-500">{item.project.project_code}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">{item.progress.toFixed(0)}%</div>
                    <div className="text-xs text-gray-500">{item.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Needs Attention */}
        <Card className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-red-200 dark:border-red-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-900 dark:text-red-100">
              <AlertTriangle className="h-5 w-5" />
              Needs Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {projectPerformance.slice(-5).reverse().map((item, index) => (
                <div key={item.project.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-red-600 text-white rounded-full font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">{item.project.project_name}</div>
                      <div className="text-xs text-gray-500">{item.project.project_code}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-red-600">{item.progress.toFixed(0)}%</div>
                    <div className="text-xs text-gray-500">{item.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* All Projects Performance */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Rank</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Project</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Activities</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">KPIs</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Progress</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {projectPerformance.map((item, index) => (
              <tr key={item.project.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center w-8 h-8 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-full font-bold text-sm">
                    {index + 1}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900 dark:text-gray-100">{item.project.project_name}</div>
                  <div className="text-sm text-gray-500">{item.project.project_code}</div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                  {item.activitiesCount}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                  {item.kpisCount}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          item.progress >= 75 ? 'bg-green-600' :
                          item.progress >= 50 ? 'bg-blue-600' :
                          item.progress >= 25 ? 'bg-yellow-600' :
                          'bg-red-600'
                        }`}
                        style={{ width: `${Math.min(item.progress, 100)}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {item.progress.toFixed(1)}%
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    item.status === 'Excellent' ? 'bg-green-100 text-green-800' :
                    item.status === 'Good' ? 'bg-blue-100 text-blue-800' :
                    item.status === 'Fair' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ModernReportsManager

