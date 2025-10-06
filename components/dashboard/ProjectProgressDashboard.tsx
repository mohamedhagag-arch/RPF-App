'use client'

import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabaseConnectionManager'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { TABLES } from '@/lib/supabase'
import { mapBOQFromDB, mapProjectFromDB } from '@/lib/dataMappers'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { TrendingUp, TrendingDown, Target, CheckCircle2, Clock, AlertCircle, BarChart3 } from 'lucide-react'

interface ProjectStats {
  totalPlanned: number
  totalActual: number
  progress: number
  variance: number
  variancePercentage: number
  status: 'excellent' | 'good' | 'warning' | 'critical'
}

export function ProjectProgressDashboard() {
  const [stats, setStats] = useState<ProjectStats | null>(null)
  const [projectBreakdown, setProjectBreakdown] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = getSupabaseClient() // ✅ Use managed connection

  useEffect(() => {
    fetchProgressData()
  }, [])

  const fetchProgressData = async () => {
    try {
      setLoading(true)

      // Fetch all BOQ activities
      const { data: boqData } = await supabase
        .from(TABLES.BOQ_ACTIVITIES)
        .select('*')

      const activities = (boqData || []).map(mapBOQFromDB)

      // Fetch all projects
      const { data: projectsData } = await supabase
        .from(TABLES.PROJECTS)
        .select('*')

      const projects = (projectsData || []).map(mapProjectFromDB)

      // Calculate overall stats
      const totalPlanned = activities.reduce((sum, a) => sum + (a.planned_units || 0), 0)
      const totalActual = activities.reduce((sum, a) => sum + (a.actual_units || 0), 0)
      const progress = totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : 0
      const variance = totalActual - totalPlanned
      const variancePercentage = totalPlanned > 0 ? (variance / totalPlanned) * 100 : 0

      let status: 'excellent' | 'good' | 'warning' | 'critical'
      if (progress >= 100) status = 'excellent'
      else if (progress >= 80) status = 'good'
      else if (progress >= 50) status = 'warning'
      else status = 'critical'

      setStats({
        totalPlanned,
        totalActual,
        progress,
        variance,
        variancePercentage,
        status
      })

      // Calculate per-project breakdown
      const breakdown = projects.map(project => {
        const projectActivities = activities.filter(a => a.project_code === project.project_code)
        const planned = projectActivities.reduce((sum, a) => sum + (a.planned_units || 0), 0)
        const actual = projectActivities.reduce((sum, a) => sum + (a.actual_units || 0), 0)
        const projectProgress = planned > 0 ? (actual / planned) * 100 : 0

        return {
          project_code: project.project_code,
          project_name: project.project_name,
          planned,
          actual,
          progress: projectProgress,
          activitiesCount: projectActivities.length
        }
      }).filter(p => p.planned > 0) // Only projects with planned work

      setProjectBreakdown(breakdown)

    } catch (error) {
      console.error('Error fetching progress data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <LoadingSpinner />
  }

  if (!stats) {
    return null
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600 bg-green-50 border-green-200'
      case 'good': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'critical': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent': return <CheckCircle2 className="w-6 h-6" />
      case 'good': return <TrendingUp className="w-6 h-6" />
      case 'warning': return <Clock className="w-6 h-6" />
      case 'critical': return <AlertCircle className="w-6 h-6" />
    }
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'bg-green-500'
    if (progress >= 80) return 'bg-blue-500'
    if (progress >= 50) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Project Progress Dashboard
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          Real-time progress tracking based on Planned vs Actual quantities
        </p>
      </div>

      {/* Overall Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Total Planned */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Total Planned</span>
              <Target className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {stats.totalPlanned.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">Units across all projects</p>
          </CardContent>
        </Card>

        {/* Total Actual */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Total Actual</span>
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {stats.totalActual.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">Units completed</p>
          </CardContent>
        </Card>

        {/* Progress */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Overall Progress</span>
              <BarChart3 className="w-5 h-5 text-purple-500" />
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {stats.progress.toFixed(1)}%
            </div>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all ${getProgressColor(stats.progress)}`}
                style={{ width: `${Math.min(stats.progress, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Variance */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Variance</span>
              {stats.variance >= 0 ? (
                <TrendingUp className="w-5 h-5 text-green-500" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-500" />
              )}
            </div>
            <div className={`text-3xl font-bold ${
              stats.variance >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {stats.variance > 0 ? '+' : ''}{stats.variance.toFixed(0)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {stats.variancePercentage > 0 ? '+' : ''}{stats.variancePercentage.toFixed(1)}% from planned
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status Banner */}
      <Card className={`border-2 ${getStatusColor(stats.status)}`}>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className={getStatusColor(stats.status)}>
              {getStatusIcon(stats.status)}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                Project Status: {stats.status.charAt(0).toUpperCase() + stats.status.slice(1)}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {stats.status === 'excellent' && 'All projects are meeting or exceeding targets!'}
                {stats.status === 'good' && 'Projects are on track and progressing well.'}
                {stats.status === 'warning' && 'Some projects need attention to stay on schedule.'}
                {stats.status === 'critical' && 'Immediate action required to get back on track.'}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.progress.toFixed(0)}%
              </div>
              <div className="text-xs text-gray-500">Complete</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per-Project Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Project Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {projectBreakdown.map((project, idx) => (
              <div key={idx} className="border-b pb-4 last:border-b-0 last:pb-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {project.project_code}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {project.project_name}
                    </p>
                  </div>
                  <div className="text-right mr-4">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {project.progress.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500">
                      {project.activitiesCount} activities
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-2">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all ${getProgressColor(project.progress)}`}
                      style={{ width: `${Math.min(project.progress, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Planned vs Actual */}
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Planned:</span>
                    <div className="font-semibold text-blue-600">
                      {project.planned.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Actual:</span>
                    <div className="font-semibold text-green-600">
                      {project.actual.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Remaining:</span>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {(project.planned - project.actual).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

