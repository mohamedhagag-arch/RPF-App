'use client'

import { useState, useEffect } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { getSupabaseClient, executeQuery } from '@/lib/simpleConnectionManager'
import { useSmartLoading } from '@/lib/smartLoadingManager'
import { Project, BOQActivity, TABLES } from '@/lib/supabase'
import { mapBOQFromDB, mapKPIFromDB } from '@/lib/dataMappers'
import { calculateProjectAnalytics, ProjectAnalytics } from '@/lib/projectAnalytics'
import { calculateActualFromKPI } from '@/lib/boqKpiSync'
import { calculateBOQValues, formatCurrency, formatPercentage, calculateProjectProgressFromValues } from '@/lib/boqValueCalculator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Badge } from '@/components/ui/Badge'
import { IntelligentBOQForm } from '@/components/boq/IntelligentBOQForm'
import { 
  X, 
  Activity, 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  CheckCircle, 
  Clock, 
  AlertTriangle,
  DollarSign,
  Calendar,
  Target,
  Zap,
  Award,
  AlertCircle
} from 'lucide-react'

interface ProjectDetailsPanelProps {
  project: Project
  onClose: () => void
}

export function ProjectDetailsPanel({ project, onClose }: ProjectDetailsPanelProps) {
  const guard = usePermissionGuard()
  const [analytics, setAnalytics] = useState<ProjectAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState<'overview' | 'activities' | 'kpis'>('overview')
  const [showActivityDetails, setShowActivityDetails] = useState<{[key: string]: boolean}>({})
  const [showKpiDetails, setShowKpiDetails] = useState<{[key: string]: boolean}>({})
  const [showBOQModal, setShowBOQModal] = useState(false)
  const [activityActuals, setActivityActuals] = useState<{[key: string]: number}>({})
  
  // Copy Feedback
  const [copyFeedback, setCopyFeedback] = useState<{ type: 'latitude' | 'longitude' | null; message: string }>({ type: null, message: '' })
  
  // Copy to clipboard with feedback
  const handleCopyCoordinate = async (value: string, type: 'latitude' | 'longitude') => {
    console.log('🔄 Copying coordinate:', { value, type })
    
    try {
      await navigator.clipboard.writeText(value)
      console.log('✅ Copy successful')
      setCopyFeedback({ type, message: 'Copied successfully!' })
      
      // Clear feedback after 3 seconds
      setTimeout(() => {
        console.log('🧹 Clearing feedback')
        setCopyFeedback({ type: null, message: '' })
      }, 3000)
    } catch (error) {
      console.error('❌ Failed to copy:', error)
      setCopyFeedback({ type, message: 'Copy failed' })
      
      // Clear feedback after 3 seconds
      setTimeout(() => {
        setCopyFeedback({ type: null, message: '' })
      }, 3000)
    }
  }
  
  const supabase = getSupabaseClient()
  const { startSmartLoading, stopSmartLoading } = useSmartLoading('project-details')

  // ✅ Calculate Actual from KPI for each activity
  useEffect(() => {
    if (!analytics?.activities) return

    const calculateActuals = async () => {
      const actuals: {[key: string]: number} = {}
      
      for (const activity of analytics.activities) {
        try {
          const actual = await calculateActualFromKPI(
            activity.project_code || '',
            activity.activity_name || ''
          )
          actuals[activity.id] = actual
        } catch (error) {
          // Silently fail
          actuals[activity.id] = activity.actual_units || 0
        }
      }
      
      setActivityActuals(actuals)
    }

    calculateActuals()
  }, [analytics?.activities])

  // ✅ Calculate Duration from KPI Planned data
  const calculateActivityDuration = (activity: any) => {
    if (!analytics?.kpis) return activity.calendar_duration || 0
    
    // Find KPI records for this activity
    const activityKPIs = analytics.kpis.filter((kpi: any) => 
      kpi.project_code === activity.project_code && 
      kpi.activity_name === activity.activity_name &&
      kpi.input_type === 'Planned'
    )
    
    if (activityKPIs.length > 0) {
      // ✅ Duration = Number of KPI Planned records (not sum of quantities)
      return activityKPIs.length || activity.calendar_duration || 0
    }
    
    return activity.calendar_duration || 0
  }

  // ✅ Calculate Start Date from KPI data or project start date
  const calculateActivityStartDate = (activity: any) => {
    // If activity has start date, use it
    if (activity.planned_activity_start_date) {
      return activity.planned_activity_start_date
    }
    
    // If no KPI data, return null
    if (!analytics?.kpis) return null
    
    // Find KPI records for this activity
    const activityKPIs = analytics.kpis.filter((kpi: any) => 
      kpi.project_code === activity.project_code && 
      kpi.activity_name === activity.activity_name
    )
    
    if (activityKPIs.length > 0) {
      // Try to find start date from KPI records
      const kpiWithStartDate = activityKPIs.find((kpi: any) => kpi.start_date)
      if (kpiWithStartDate?.start_date) {
        return kpiWithStartDate.start_date
      }
      
      // If no start date in KPI, use project start date as fallback
      const projectData = analytics.project as any
      if (projectData?.project_start_date) {
        return projectData.project_start_date
      }
    }
    
    return null
  }

  // Toggle activity details
  const toggleActivityDetails = (activityId: string) => {
    setShowActivityDetails(prev => ({
      ...prev,
      [activityId]: !prev[activityId]
    }))
  }

  // Toggle KPI details
  const toggleKpiDetails = (kpiId: string) => {
    setShowKpiDetails(prev => ({
      ...prev,
      [kpiId]: !prev[kpiId]
    }))
  }

  // Handle BOQ form submission
  const handleBOQSubmit = async (data: any) => {
    try {
      console.log('💾 ProjectDetailsPanel: Saving BOQ activity to database...', data)
      
      // Map to database format
      const dbData = {
        'Project Code': data.project_code || '',
        'Project Sub Code': data.project_sub_code || '',
        'Project Full Code': data.project_full_code || data.project_code || '',
        'Activity': data.activity_name || '',
        'Activity Division': data.activity_division || data.zone_ref || '',
        'Unit': data.unit || '',
        'Zone Ref': data.zone_ref || data.activity_division || '',
        'Activity Name': data.activity_name || '',
        'Planned Units': data.planned_units?.toString() || '0',
        'Deadline': data.deadline || '',
        'Total Units': data.total_units?.toString() || '0',
        'Actual Units': data.actual_units?.toString() || '0',
        'Total Value': data.planned_value?.toString() || '0',
        'Planned Value': data.planned_value?.toString() || '0',
        'Planned Activity Start Date': data.planned_activity_start_date || '',
        'Total Drilling Meters': data.total_drilling_meters?.toString() || '0',
        'Calendar Duration': data.calendar_duration?.toString() || '0',
        'Project Full Name': data.project_full_name || '',
        'Project Status': data.project_status || 'upcoming'
      }
      
      console.log('📦 Database format:', dbData)
      
      // Insert into BOQ Rates table
      const { data: inserted, error } = await (supabase as any)
        .from('Planning Database - BOQ Rates')
        .insert(dbData)
        .select()
        .single()
      
      if (error) {
        console.error('❌ Error saving BOQ activity:', error)
        throw error
      }
      
      console.log('✅ BOQ activity saved successfully:', inserted)
      
      // Close modal and refresh
      setShowBOQModal(false)
      
      // Refresh analytics to show new activity
      await fetchProjectAnalytics()
      
      console.log('✅ ProjectDetailsPanel: BOQ activity added and analytics refreshed')
    } catch (error) {
      console.error('❌ Error handling BOQ submission:', error)
      throw error
    }
  }
  
  useEffect(() => {
    fetchProjectAnalytics()
  }, [project])
  
  const fetchProjectAnalytics = async () => {
    try {
      startSmartLoading(setLoading)
      
      console.log(`📊 Fetching analytics for project: ${project.project_code} (${project.project_name})`)
      
      // ✅ Fetch ONLY activities for THIS project from 'Planning Database - BOQ Rates'
      const { data: activitiesData, error: activitiesError } = await executeQuery(async () =>
        supabase
          .from(TABLES.BOQ_ACTIVITIES)
          .select('*')
          .eq('Project Code', project.project_code)
      )
      
      if (activitiesError) {
        console.error('❌ Error fetching activities:', activitiesError)
      }
      
      // ✅ Fetch ONLY KPIs for THIS project from MAIN TABLE
      let { data: kpisData, error: kpisError } = await executeQuery(async () =>
        supabase
          .from(TABLES.KPI)
          .select('*')
          .eq('Project Full Code', project.project_code)
      )
      
      // If no results, try with 'Project Code' column
      if (!kpisData || (Array.isArray(kpisData) && kpisData.length === 0)) {
        console.log('🔄 No KPIs found with Project Full Code, trying Project Code...')
        const result = await executeQuery(async () =>
          supabase
            .from(TABLES.KPI)
            .select('*')
            .eq('Project Code', project.project_code)
        )
        kpisData = result.data
        kpisError = result.error
      }
      
      if (kpisError) {
        console.error('❌ Error fetching KPIs:', kpisError)
      }
      
      const activities = (Array.isArray(activitiesData) ? activitiesData : []).map(mapBOQFromDB)
      const kpis = (Array.isArray(kpisData) ? kpisData : []).map(mapKPIFromDB)
      
      console.log(`✅ Loaded ${activities.length} activities for ${project.project_code}`)
      console.log(`✅ Loaded ${kpis.length} KPIs for ${project.project_code}`)
      
      if (activities.length === 0) {
        console.warn(`⚠️ NO ACTIVITIES FOUND for project ${project.project_code}!`)
        console.log('💡 Check if activities exist in "Planning Database - BOQ Rates" table')
      } else {
        console.log('📋 Sample activity:', {
          project_code: activities[0].project_code,
          project_full_code: activities[0].project_full_code,
          activity_name: activities[0].activity_name,
          planned_units: activities[0].planned_units,
          planned_value: activities[0].planned_value,
          actual_units: activities[0].actual_units,
          progress: activities[0].activity_progress_percentage
        })
      }
      
      if (kpis.length === 0) {
        console.warn(`⚠️ NO KPIs FOUND for project ${project.project_code}!`)
        console.log('💡 Check if KPIs exist in "Planning Database - KPI Combined" view')
      } else {
        const plannedKPIs = kpis.filter((k: any) => k.input_type === 'Planned')
        const actualKPIs = kpis.filter((k: any) => k.input_type === 'Actual')
        console.log('📊 KPIs breakdown:', {
          total: kpis.length,
          planned: plannedKPIs.length,
          actual: actualKPIs.length,
          sample: kpis[0]
        })
      }
      
      // Calculate analytics using the fetched data
      const projectAnalytics = calculateProjectAnalytics(project, activities, kpis)
      
      console.log('📈 Analytics calculated:', {
        totalActivities: projectAnalytics.totalActivities,
        completedActivities: projectAnalytics.completedActivities,
        totalKPIs: projectAnalytics.totalKPIs,
        plannedKPIs: projectAnalytics.plannedKPIs,
        actualKPIs: projectAnalytics.actualKPIs,
        overallProgress: projectAnalytics.overallProgress.toFixed(1) + '%',
        financialProgress: projectAnalytics.financialProgress.toFixed(1) + '%',
        plannedValue: projectAnalytics.totalPlannedValue,
        earnedValue: projectAnalytics.totalEarnedValue
      })
      
      setAnalytics(projectAnalytics)
    } catch (error) {
      console.error('❌ Error fetching project analytics:', error)
    } finally {
      stopSmartLoading(setLoading)
    }
  }
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }
  
  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`
  }
  
  const getHealthColor = (health: string) => {
    switch (health) {
      case 'excellent': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'good': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'warning': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }
  
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }
  
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <Card className="w-full max-w-6xl max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-center p-12">
            <LoadingSpinner size="lg" />
          </div>
        </Card>
      </div>
    )
  }
  
  if (!analytics) return null
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <CardHeader className="border-b dark:border-gray-700 flex-shrink-0">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <CardTitle className="text-2xl mb-2">{project.project_name}</CardTitle>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline" className="text-sm">
                  {project.project_code}
                </Badge>
                <Badge className={getHealthColor(analytics.projectHealth)}>
                  {analytics.projectHealth.toUpperCase()}
                </Badge>
                <Badge className={getRiskColor(analytics.riskLevel)}>
                  Risk: {analytics.riskLevel.toUpperCase()}
                </Badge>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        
        
        {/* View Tabs */}
        <div className="flex gap-2 p-4 border-b dark:border-gray-700 flex-shrink-0">
          <Button
            variant={activeView === 'overview' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveView('overview')}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Overview
          </Button>
          <Button
            variant={activeView === 'activities' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveView('activities')}
          >
            <Activity className="h-4 w-4 mr-2" />
            Activities ({analytics.totalActivities})
          </Button>
          <Button
            variant={activeView === 'kpis' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveView('kpis')}
          >
            <Target className="h-4 w-4 mr-2" />
            KPIs ({analytics.totalKPIs})
          </Button>
          
          {/* Add Activity BOQ Button */}
          <div className="ml-auto">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                console.log('➕ Add Activity BOQ clicked for project:', project.project_code)
                setShowBOQModal(true)
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Activity className="h-4 w-4 mr-2" />
              Add Activity BOQ
            </Button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeView === 'overview' && (
            <div className="space-y-6">
              {/* Progress Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Overall Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-600">
                      {formatPercent(analytics.overallProgress)}
                    </div>
                    <div className="mt-2 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(analytics.overallProgress, 100)}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Financial Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600">
                      {formatPercent(analytics.financialProgress)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      Earned: {formatCurrency(analytics.totalEarnedValue)}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Weighted Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-purple-600">
                      {formatPercent(analytics.weightedProgress)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      By Activity Value
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Financial Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Financial Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Contract Value</p>
                      <p className="text-lg font-bold">{formatCurrency(analytics.totalContractValue)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Planned Value</p>
                      <p className="text-lg font-bold text-blue-600">{formatCurrency(analytics.totalPlannedValue)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Earned Value</p>
                      <p className="text-lg font-bold text-green-600">{formatCurrency(analytics.totalEarnedValue)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Remaining</p>
                      <p className="text-lg font-bold text-orange-600">{formatCurrency(analytics.totalRemainingValue)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Activities Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Activities Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {analytics.totalActivities}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Total</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600 flex items-center justify-center gap-1">
                        <CheckCircle className="h-5 w-5" />
                        {analytics.completedActivities}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Completed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600 flex items-center justify-center gap-1">
                        <Clock className="h-5 w-5" />
                        {analytics.onTrackActivities}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">On Track</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600 flex items-center justify-center gap-1">
                        <AlertTriangle className="h-5 w-5" />
                        {analytics.delayedActivities}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Delayed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-600 flex items-center justify-center gap-1">
                        {analytics.notStartedActivities}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Not Started</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* KPI Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    KPI Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Total KPIs</p>
                      <p className="text-2xl font-bold">{analytics.totalKPIs}</p>
                      <p className="text-xs text-gray-500">Planned: {analytics.plannedKPIs} | Actual: {analytics.actualKPIs}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
                      <p className="text-2xl font-bold text-green-600">{analytics.completedKPIs}</p>
                      <p className="text-xs text-gray-500">{analytics.totalKPIs > 0 ? formatPercent((analytics.completedKPIs / analytics.totalKPIs) * 100) : '0%'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">On Track</p>
                      <p className="text-2xl font-bold text-blue-600">{analytics.onTrackKPIs}</p>
                      <p className="text-xs text-gray-500">{analytics.totalKPIs > 0 ? formatPercent((analytics.onTrackKPIs / analytics.totalKPIs) * 100) : '0%'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Delayed/At Risk</p>
                      <p className="text-2xl font-bold text-red-600">{analytics.delayedKPIs + analytics.atRiskKPIs}</p>
                      <p className="text-xs text-gray-500">{analytics.totalKPIs > 0 ? formatPercent(((analytics.delayedKPIs + analytics.atRiskKPIs) / analytics.totalKPIs) * 100) : '0%'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Time Performance */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Schedule Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">On Schedule</span>
                        <span className="font-bold text-green-600">{analytics.activitiesOnSchedule}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Behind Schedule</span>
                        <span className="font-bold text-red-600">{analytics.activitiesBehindSchedule}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Average Delay</span>
                        <span className="font-bold text-orange-600">{formatPercent(analytics.averageDelay)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Project Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Type:</span>
                        <span className="font-medium">{project.project_type || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Division:</span>
                        <span className="font-medium">{project.responsible_division || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Plot:</span>
                        <span className="font-medium">{project.plot_number || 'N/A'}</span>
                      </div>
                      
                      {/* Additional Project Details */}
                      {project.client_name && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Client:</span>
                          <span className="font-medium">{project.client_name}</span>
                        </div>
                      )}
                      
                      {project.first_party_name && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">First Party:</span>
                          <span className="font-medium">{project.first_party_name}</span>
                        </div>
                      )}
                      
                      {project.consultant_name && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Consultant:</span>
                          <span className="font-medium">{project.consultant_name}</span>
                        </div>
                      )}
                      
                      {project.project_manager_email && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Project Manager:</span>
                          <span className="font-medium text-blue-600 dark:text-blue-400">{project.project_manager_email}</span>
                        </div>
                      )}
                      
                      {project.area_manager_email && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Area Manager:</span>
                          <span className="font-medium text-blue-600 dark:text-blue-400">{project.area_manager_email}</span>
                        </div>
                      )}
                      
                      
                      {project.contract_status && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Contract Status:</span>
                          <span className="font-medium capitalize">{project.contract_status}</span>
                        </div>
                      )}
                      
                      {project.currency && project.currency !== 'AED' && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Currency:</span>
                          <span className="font-medium">{project.currency}</span>
                        </div>
                      )}
                      
                      {/* Location Information */}
                      {(project.latitude || project.longitude) && (
                        <div className="border-t pt-2 mt-2">
                          <div className="flex justify-between items-center mb-2">
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Location</p>
                            {(project.latitude && project.longitude) && (
                              <button
                                onClick={() => {
                                  const url = `https://www.google.com/maps?q=${project.latitude},${project.longitude}`;
                                  window.open(url, '_blank');
                                }}
                                className="text-xs bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-md transition-colors"
                                title="Open in Google Maps"
                              >
                                📍 View on Map
                              </button>
                            )}
                          </div>
                          {project.latitude && (
                            <div>
                              {copyFeedback.type === 'latitude' && (
                                <div className="mb-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                                  <p className="text-sm text-green-700 dark:text-green-300 font-medium flex items-center gap-2">
                                    <span className="text-green-600">✅</span>
                                    {copyFeedback.message}
                                  </p>
                                </div>
                              )}
                              <div className="flex justify-between items-center">
                                <span className="text-gray-600 dark:text-gray-400">Latitude:</span>
                                <div className="flex items-center gap-2">
                                  <span 
                                    className="font-medium cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded transition-colors"
                                    onClick={() => project.latitude && handleCopyCoordinate(project.latitude, 'latitude')}
                                    title="Click to copy"
                                  >
                                    {project.latitude}
                                  </span>
                                  <button
                                    onClick={() => project.latitude && handleCopyCoordinate(project.latitude, 'latitude')}
                                    className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                    title="Copy to clipboard"
                                  >
                                    📋
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                          {project.longitude && (
                            <div>
                              {copyFeedback.type === 'longitude' && (
                                <div className="mb-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                                  <p className="text-sm text-green-700 dark:text-green-300 font-medium flex items-center gap-2">
                                    <span className="text-green-600">✅</span>
                                    {copyFeedback.message}
                                  </p>
                                </div>
                              )}
                              <div className="flex justify-between items-center">
                                <span className="text-gray-600 dark:text-gray-400">Longitude:</span>
                                <div className="flex items-center gap-2">
                                  <span 
                                    className="font-medium cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded transition-colors"
                                    onClick={() => project.longitude && handleCopyCoordinate(project.longitude, 'longitude')}
                                    title="Click to copy"
                                  >
                                    {project.longitude}
                                  </span>
                                  <button
                                    onClick={() => project.longitude && handleCopyCoordinate(project.longitude, 'longitude')}
                                    className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                    title="Copy to clipboard"
                                  >
                                    📋
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Management Team */}
                      {(project.project_manager_email || project.area_manager_email) && (
                        <div className="border-t pt-2 mt-2">
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-2">Management Team</p>
                          {project.project_manager_email && (
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600 dark:text-gray-400">Project Manager:</span>
                              <a 
                                href={`mailto:${project.project_manager_email}`}
                                className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline cursor-pointer"
                                title="Click to send email"
                              >
                                {project.project_manager_email}
                              </a>
                            </div>
                          )}
                          {project.area_manager_email && (
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600 dark:text-gray-400">Area Manager:</span>
                              <a 
                                href={`mailto:${project.area_manager_email}`}
                                className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline cursor-pointer"
                                title="Click to send email"
                              >
                                {project.area_manager_email}
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                      
                      
                      {/* Contract Details */}
                      {(project.workmanship_only || project.advance_payment_required || project.virtual_material_value) && (
                        <div className="border-t pt-2 mt-2">
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-2">Contract Details</p>
                          {project.workmanship_only && (
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Workmanship Only:</span>
                              <span className="font-medium">{project.workmanship_only}</span>
                            </div>
                          )}
                          {project.advance_payment_required && (
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Advance Payment:</span>
                              <span className="font-medium">{project.advance_payment_required}</span>
                            </div>
                          )}
                          {project.virtual_material_value && (
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Virtual Material Value:</span>
                              <span className="font-medium">{project.virtual_material_value}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
          
          {activeView === 'activities' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold">BOQ Activities ({analytics.activities.length})</h3>
              
              {analytics.activities.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No activities found for this project
                </div>
              ) : (
                <div className="space-y-3">
                  {analytics.activities.map((activity) => (
                    <Card key={activity.id} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <h4 className="font-semibold text-lg text-gray-900 dark:text-white mb-1">
                              {activity.activity_name || activity.activity}
                            </h4>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {activity.activity_division || 'No division'}
                              </Badge>
                              {activity.unit && (
                                <Badge variant="outline" className="text-xs">
                                  {activity.unit}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {activity.activity_completed && (
                              <Badge className="bg-green-100 text-green-800">Completed</Badge>
                            )}
                            {activity.activity_on_track && !activity.activity_completed && (
                              <Badge className="bg-blue-100 text-blue-800">On Track</Badge>
                            )}
                            {activity.activity_delayed && (
                              <Badge className="bg-red-100 text-red-800">Delayed</Badge>
                            )}
                            <button
                              type="button"
                              onClick={() => toggleActivityDetails(activity.id)}
                              className="px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded"
                            >
                              {showActivityDetails[activity.id] ? "Hide" : "Show"}
                            </button>
                          </div>
                        </div>
                        
                        {/* Activity Details - Collapsible */}
                        {showActivityDetails[activity.id] && (
                          <>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-gray-500 dark:text-gray-400 mb-1">Progress</p>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div 
                                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                  style={{ 
                                    width: `${Math.min(
                                      activityActuals[activity.id] !== undefined 
                                        ? (activityActuals[activity.id] / activity.planned_units) * 100
                                        : activity.activity_progress_percentage || 0, 
                                      100
                                    )}%` 
                                  }}
                                />
                              </div>
                              <span className="font-bold text-sm text-blue-600 dark:text-blue-400">
                                {formatPercent(
                                  activityActuals[activity.id] !== undefined 
                                    ? (activityActuals[activity.id] / activity.planned_units) * 100
                                    : activity.activity_progress_percentage || 0
                                )}
                              </span>
                            </div>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Planned / Actual</p>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {activity.planned_units} / {activityActuals[activity.id] || activity.actual_units} {activity.unit}
                            </p>
                            {activityActuals[activity.id] !== undefined && activityActuals[activity.id] !== activity.actual_units && (
                              <p className="text-xs text-blue-600 dark:text-blue-400">
                                ✅ Updated from KPI
                              </p>
                            )}
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Value</p>
                            <p className="font-medium text-green-600 dark:text-green-400">
                              {(() => {
                                const actualUnits = activityActuals[activity.id] || activity.actual_units || 0
                                const values = calculateBOQValues(
                                  activity.total_units || 0,
                                  activity.planned_units || 0,
                                  actualUnits,
                                  activity.total_value || 0
                                )
                                return formatCurrency(values.value)
                              })()}
                            </p>
                            <p className="text-xs text-gray-500">
                              Rate × Actual Units
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Rate</p>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {(() => {
                                const actualUnits = activityActuals[activity.id] || activity.actual_units || 0
                                const values = calculateBOQValues(
                                  activity.total_units || 0,
                                  activity.planned_units || 0,
                                  actualUnits,
                                  activity.total_value || 0
                                )
                                return `${formatCurrency(values.rate)} / ${activity.unit}`
                              })()}
                            </p>
                            <p className="text-xs text-gray-500">
                              Total Value ÷ Total Units
                            </p>
                          </div>
                        </div>
                        
                        {/* Dates Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-blue-500" />
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Start Date</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {(() => {
                                const startDate = calculateActivityStartDate(activity)
                                return startDate 
                                  ? new Date(startDate).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric'
                                    })
                                  : 'Not set'
                              })()}
                            </p>
                            {(() => {
                              const startDate = calculateActivityStartDate(activity)
                              const originalStartDate = activity.planned_activity_start_date
                              
                              if (startDate) {
                                return (
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {(() => {
                                      const startDateObj = new Date(startDate)
                                      const today = new Date()
                                      const diffTime = startDateObj.getTime() - today.getTime()
                                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                                      
                                      if (diffDays > 0) {
                                        return `${diffDays} days from now`
                                      } else if (diffDays === 0) {
                                        return 'Today'
                                      } else {
                                        return `${Math.abs(diffDays)} days ago`
                                      }
                                    })()}
                                  </p>
                                )
                              }
                              
                              if (startDate && startDate !== originalStartDate) {
                                return (
                                  <p className="text-xs text-blue-600 dark:text-blue-400">
                                    Updated from KPI
                                  </p>
                                )
                              }
                              
                              return null
                            })()}
                          </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-red-500" />
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Deadline</p>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {activity.deadline 
                                  ? new Date(activity.deadline).toLocaleDateString()
                                  : 'Not set'
                                }
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Additional Details */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Duration</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {(() => {
                                const duration = calculateActivityDuration(activity)
                                return duration > 0 ? `${duration} days` : 'Not set'
                              })()}
                            </p>
                            {(() => {
                              const duration = calculateActivityDuration(activity)
                              const originalDuration = activity.calendar_duration
                              if (duration !== originalDuration && duration > 0) {
                                return (
                                  <p className="text-xs text-blue-600 dark:text-blue-400">
                                    Updated from KPI
                                  </p>
                                )
                              }
                              return null
                            })()}
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Zone</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {activity.zone_ref || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Total Value</p>
                            <p className="text-sm font-medium text-green-600 dark:text-green-400">
                              {formatCurrency(activity.total_value || 0)}
                            </p>
                          </div>
                        </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {activeView === 'kpis' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold">KPI Records ({analytics.kpis.length})</h3>
              
              {analytics.kpis.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No KPIs found for this project
                </div>
              ) : (
                <div className="space-y-3">
                  {analytics.kpis.map((kpi) => (
                    <Card key={kpi.id} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-green-500">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <h4 className="font-semibold text-lg text-gray-900 dark:text-white mb-1">
                              {kpi.activity_name || kpi.kpi_name}
                            </h4>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {kpi.input_type}
                              </Badge>
                              {kpi.section && (
                                <Badge variant="outline" className="text-xs">
                                  {kpi.section}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Badge className={
                              kpi.status === 'completed' ? 'bg-green-100 text-green-800' :
                              kpi.status === 'on_track' ? 'bg-blue-100 text-blue-800' :
                              kpi.status === 'at_risk' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }>
                              {kpi.status}
                            </Badge>
                            <button
                              type="button"
                              onClick={() => toggleKpiDetails(kpi.id)}
                              className="px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded"
                            >
                              {showKpiDetails[kpi.id] ? "Hide" : "Show"}
                            </button>
                          </div>
                        </div>
                        
                        {/* KPI Details - Collapsible */}
                        {showKpiDetails[kpi.id] && (
                          <>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-gray-500 dark:text-gray-400 mb-1">Quantity</p>
                            <p className="font-bold text-lg text-green-600 dark:text-green-400">
                              {kpi.quantity || 0}
                            </p>
                          </div>
                          {kpi.drilled_meters > 0 && (
                            <div>
                              <p className="text-gray-500 dark:text-gray-400 mb-1">Drilled Meters</p>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {kpi.drilled_meters}m
                              </p>
                            </div>
                          )}
                          {kpi.progress_percentage !== undefined && (
                            <div>
                              <p className="text-gray-500 dark:text-gray-400 mb-1">Progress</p>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                  <div 
                                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${Math.min(kpi.progress_percentage || 0, 100)}%` }}
                                  />
                                </div>
                                <span className="font-bold text-sm text-green-600 dark:text-green-400">
                                  {formatPercent(kpi.progress_percentage)}
                                </span>
                              </div>
                            </div>
                          )}
                          <div>
                            <p className="text-gray-500 dark:text-gray-400 mb-1">Target</p>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {kpi.target_value || 'N/A'}
                            </p>
                          </div>
                        </div>
                        
                        {/* Dates Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-blue-500" />
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Date</p>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {kpi.start_date || kpi.target_date || kpi.end_date
                                  ? new Date(kpi.start_date || kpi.target_date || kpi.end_date).toLocaleDateString()
                                  : 'Not set'
                                }
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Actual Work Date</p>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {kpi.actual_work_date 
                                  ? new Date(kpi.actual_work_date).toLocaleDateString()
                                  : 'Not set'
                                }
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Additional Details */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Unit</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {kpi.unit || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Frequency</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {kpi.frequency || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Last Updated</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {kpi.updated_at 
                                ? new Date(kpi.updated_at).toLocaleDateString()
                                : 'N/A'
                              }
                            </p>
                          </div>
                        </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* BOQ Modal */}
      {showBOQModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Add Activity BOQ - {project.project_name}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBOQModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-6">
              <IntelligentBOQForm
                activity={{ project_code: project.project_code }}
                onSubmit={handleBOQSubmit}
                onCancel={() => setShowBOQModal(false)}
                projects={[project]}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

