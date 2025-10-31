'use client'

import { useState, useEffect } from 'react'
import { getSupabaseClient, executeQuery } from '@/lib/simpleConnectionManager'
import { useSmartLoading } from '@/lib/smartLoadingManager'
import { Card, CardContent, CardHeader, CardTitle } from './Card'
import { Button } from './Button'
import { LoadingSpinner } from './LoadingSpinner'
import { 
  ArrowRight, 
  ArrowDown, 
  FolderOpen, 
  ClipboardList, 
  BarChart3,
  Users,
  Calendar,
  Target,
  TrendingUp,
  Link,
  Eye,
  EyeOff
} from 'lucide-react'

interface ProjectData {
  id: string
  project_code: string
  project_name: string
  project_status: string
  contract_amount: number
  responsible_division: string
  created_at: string
}

interface ActivityData {
  id: string
  project_id: string
  project_code: string
  activity_name: string
  activity_completed: boolean
  activity_delayed: boolean
  total_value: number
  activity_progress_percentage: number
}

interface KPIData {
  id: string
  project_id: string
  activity_id: string
  kpi_name: string
  status: string
  planned_value: number
  actual_value: number
  target_date: string
}

interface RelationshipViewerProps {
  projectId?: string
  activityId?: string
  kpiId?: string
  className?: string
}

export function RelationshipViewer({ 
  projectId, 
  activityId, 
  kpiId, 
  className = "" 
}: RelationshipViewerProps) {
  const [project, setProject] = useState<ProjectData | null>(null)
  const [activities, setActivities] = useState<ActivityData[]>([])
  const [kpis, setKpis] = useState<KPIData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedSections, setExpandedSections] = useState({
    activities: true,
    kpis: true,
    details: false
  })
  
  const supabase = getSupabaseClient()
  const { startSmartLoading, stopSmartLoading } = useSmartLoading('relationship-viewer')

  useEffect(() => {
    if (projectId || activityId || kpiId) {
      fetchRelationshipData()
    }
  }, [projectId, activityId, kpiId])

  const fetchRelationshipData = async () => {
    try {
      setLoading(true)
      setError('')

      if (projectId) {
        await fetchProjectData(projectId)
      } else if (activityId) {
        await fetchActivityData(activityId)
      } else if (kpiId) {
        await fetchKPIData(kpiId)
      }
    } catch (error: any) {
      console.error('Error fetching relationship data:', error)
      setError('Failed to load relationship data')
    } finally {
      setLoading(false)
    }
  }

  const fetchProjectData = async (id: string) => {
    // Fetch project
    const { data: projectData, error: projectError } = await supabase
      .from('Planning Database - ProjectsList')
      .select('*')
      .eq('id', id)
      .single()

    if (projectError) throw projectError
    setProject(projectData)

    // Fetch related activities
    const { data: activitiesData, error: activitiesError } = await supabase
      .from('Planning Database - BOQ Rates')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false })

    if (activitiesError) throw activitiesError
    setActivities(activitiesData || [])

    // Fetch related KPIs
    const { data: kpisData, error: kpisError } = await supabase
      .from('Planning Database - KPI')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false })

    if (kpisError) throw kpisError
    setKpis(kpisData || [])
  }

  const fetchActivityData = async (id: string) => {
    // Fetch activity
    const { data: activityData, error: activityError } = await supabase
      .from('Planning Database - BOQ Rates')
      .select('*')
      .eq('id', id)
      .single()

    if (activityError) throw activityError

    // Fetch related project
    const { data: projectData, error: projectError } = await supabase
      .from('Planning Database - ProjectsList')
      .select('*')
      .eq('id', (activityData as any).project_id)
      .single()

    if (projectError) throw projectError
    setProject(projectData)

    // Set activities with the current one
    setActivities([activityData])

    // Fetch related KPIs
    const { data: kpisData, error: kpisError } = await supabase
      .from('Planning Database - KPI')
      .select('*')
      .eq('activity_id', id)
      .order('created_at', { ascending: false })

    if (kpisError) throw kpisError
    setKpis(kpisData || [])
  }

  const fetchKPIData = async (id: string) => {
    // Fetch KPI
    const { data: kpiData, error: kpiError } = await supabase
      .from('Planning Database - KPI')
      .select('*')
      .eq('id', id)
      .single()

    if (kpiError) throw kpiError

    // Fetch related project
    const { data: projectData, error: projectError } = await supabase
      .from('Planning Database - ProjectsList')
      .select('*')
      .eq('id', (kpiData as any).project_id)
      .single()

    if (projectError) throw projectError
    setProject(projectData)

    // Fetch related activity
    if ((kpiData as any).activity_id) {
      const { data: activityData, error: activityError } = await supabase
        .from('Planning Database - BOQ Rates')
        .select('*')
        .eq('id', (kpiData as any).activity_id)
        .single()

      if (activityError) throw activityError
      setActivities([activityData])
    }

    // Set KPIs with the current one
    setKpis([kpiData])
  }

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'text-green-600 bg-green-50',
      completed: 'text-blue-600 bg-blue-50',
      on_track: 'text-green-600 bg-green-50',
      delayed: 'text-red-600 bg-red-50',
      on_hold: 'text-yellow-600 bg-yellow-50'
    }
    return colors[status as keyof typeof colors] || 'text-gray-600 bg-gray-50'
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500'
    if (progress >= 60) return 'bg-blue-500'
    if (progress >= 40) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <p className="text-red-600">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!project) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <p className="text-gray-600">No data available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Project Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FolderOpen className="h-5 w-5" />
            <span>Project: {project.project_code}</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.project_status)}`}>
              {project.project_status}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h3 className="font-medium text-lg">{project.project_name}</h3>
              <p className="text-sm text-gray-600">{project.responsible_division}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Contract Amount</p>
              <p className="font-semibold">AED {project.contract_amount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Created</p>
              <p className="font-semibold">{new Date(project.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activities Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <ClipboardList className="h-5 w-5" />
              <span>BOQ Activities ({activities.length})</span>
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleSection('activities')}
            >
              {expandedSections.activities ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        {expandedSections.activities && (
          <CardContent>
            <div className="space-y-3">
              {activities.map((activity) => (
                <div key={activity.id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{activity.activity_name}</h4>
                    <div className="flex items-center space-x-2">
                      {activity.activity_completed && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Completed
                        </span>
                      )}
                      {activity.activity_delayed && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Delayed
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Value</p>
                      <p className="font-semibold">AED {activity.total_value.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Progress</p>
                      <div className="flex items-center space-x-2">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${getProgressColor(activity.activity_progress_percentage)}`}
                            style={{ width: `${Math.min(activity.activity_progress_percentage, 100)}%` }}
                          ></div>
                        </div>
                        <span className="font-semibold">{activity.activity_progress_percentage}%</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-gray-600">Project Code</p>
                      <p className="font-semibold">{activity.project_code}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* KPIs Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>KPI Records ({kpis.length})</span>
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleSection('kpis')}
            >
              {expandedSections.kpis ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        {expandedSections.kpis && (
          <CardContent>
            <div className="space-y-3">
              {kpis.map((kpi) => (
                <div key={kpi.id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{kpi.kpi_name}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(kpi.status)}`}>
                      {kpi.status.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Planned Value</p>
                      <p className="font-semibold">{kpi.planned_value}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Actual Value</p>
                      <p className="font-semibold">{kpi.actual_value}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Target Date</p>
                      <p className="font-semibold">{new Date(kpi.target_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Relationship Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Link className="h-5 w-5" />
            <span>Relationship Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
              <FolderOpen className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <p className="text-2xl font-bold text-blue-600">1</p>
              <p className="text-sm text-blue-600">Project</p>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-900 rounded-lg">
              <ClipboardList className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <p className="text-2xl font-bold text-green-600">{activities.length}</p>
              <p className="text-sm text-green-600">Activities</p>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900 rounded-lg">
              <BarChart3 className="h-8 w-8 mx-auto mb-2 text-purple-600" />
              <p className="text-2xl font-bold text-purple-600">{kpis.length}</p>
              <p className="text-sm text-purple-600">KPI Records</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
