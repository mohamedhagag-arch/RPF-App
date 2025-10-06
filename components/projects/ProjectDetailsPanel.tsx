'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Project, BOQActivity, TABLES } from '@/lib/supabase'
import { mapBOQFromDB, mapKPIFromDB } from '@/lib/dataMappers'
import { calculateProjectAnalytics, ProjectAnalytics } from '@/lib/projectAnalytics'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Badge } from '@/components/ui/Badge'
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
  const [analytics, setAnalytics] = useState<ProjectAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState<'overview' | 'activities' | 'kpis'>('overview')
  
  const supabase = createClientComponentClient()
  
  useEffect(() => {
    fetchProjectAnalytics()
  }, [project])
  
  const fetchProjectAnalytics = async () => {
    try {
      setLoading(true)
      
      console.log(`📊 Fetching analytics for project: ${project.project_code} (${project.project_name})`)
      
      // ✅ Fetch ONLY activities for THIS project from 'Planning Database - BOQ Rates'
      const { data: activitiesData, error: activitiesError } = await supabase
        .from(TABLES.BOQ_ACTIVITIES)
        .select('*')
        .eq('Project Code', project.project_code)
      
      if (activitiesError) {
        console.error('❌ Error fetching activities:', activitiesError)
      }
      
      // ✅ Fetch ONLY KPIs for THIS project from MAIN TABLE
      let { data: kpisData, error: kpisError } = await supabase
        .from(TABLES.KPI)
        .select('*')
        .eq('Project Full Code', project.project_code)
      
      // If no results, try with 'Project Code' column
      if (!kpisData || kpisData.length === 0) {
        console.log('🔄 No KPIs found with Project Full Code, trying Project Code...')
        const result = await supabase
          .from(TABLES.KPI)
          .select('*')
          .eq('Project Code', project.project_code)
        kpisData = result.data
        kpisError = result.error
      }
      
      if (kpisError) {
        console.error('❌ Error fetching KPIs:', kpisError)
      }
      
      const activities = (activitiesData || []).map(mapBOQFromDB)
      const kpis = (kpisData || []).map(mapKPIFromDB)
      
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
        const plannedKPIs = kpis.filter(k => k.input_type === 'Planned')
        const actualKPIs = kpis.filter(k => k.input_type === 'Actual')
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
      setLoading(false)
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
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Status:</span>
                        <span className="font-medium capitalize">{project.project_status}</span>
                      </div>
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
                    <Card key={activity.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {activity.activity_name || activity.activity}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {activity.activity_division || 'No division'}
                            </p>
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
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Progress</p>
                            <p className="font-bold text-lg">{formatPercent(activity.activity_progress_percentage || 0)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Planned / Actual</p>
                            <p className="font-medium">{activity.planned_units} / {activity.actual_units} {activity.unit}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Value</p>
                            <p className="font-medium">{formatCurrency(activity.earned_value || 0)}</p>
                          </div>
                        </div>
                        
                        {activity.deadline && (
                          <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                            <Calendar className="h-3 w-3 inline mr-1" />
                            Deadline: {new Date(activity.deadline).toLocaleDateString()}
                          </div>
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
                    <Card key={kpi.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {kpi.activity_name || kpi.kpi_name}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Type: {kpi.input_type} {kpi.section && `| Section: ${kpi.section}`}
                            </p>
                          </div>
                          <Badge className={
                            kpi.status === 'completed' ? 'bg-green-100 text-green-800' :
                            kpi.status === 'on_track' ? 'bg-blue-100 text-blue-800' :
                            kpi.status === 'at_risk' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }>
                            {kpi.status}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Quantity</p>
                            <p className="font-bold text-lg">{kpi.quantity || 0}</p>
                          </div>
                          {kpi.drilled_meters > 0 && (
                            <div>
                              <p className="text-gray-500">Drilled Meters</p>
                              <p className="font-medium">{kpi.drilled_meters}m</p>
                            </div>
                          )}
                          {kpi.progress_percentage !== undefined && (
                            <div>
                              <p className="text-gray-500">Progress</p>
                              <p className="font-bold">{formatPercent(kpi.progress_percentage)}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

