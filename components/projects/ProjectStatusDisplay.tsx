'use client'

import { useState, useEffect } from 'react'
import { supabase, TABLES } from '@/lib/supabase'
import { getStatusDisplayInfo } from '@/lib/projectStatusCalculator'
import { updateProjectStatus, getProjectStatusSummary } from '@/lib/projectStatusUpdater'
import { ModernCard } from '@/components/ui/ModernCard'
import { ModernButton } from '@/components/ui/ModernButton'
import { ModernBadge } from '@/components/ui/ModernBadge'
import { 
  RefreshCw, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Play,
  Pause,
  X,
  Calendar,
  BarChart3
} from 'lucide-react'

interface ProjectStatusDisplayProps {
  projectId?: string
  showSummary?: boolean
  showControls?: boolean
  onStatusUpdate?: (updates: any[]) => void
}

export function ProjectStatusDisplay({ 
  projectId, 
  showSummary = true, 
  showControls = true,
  onStatusUpdate 
}: ProjectStatusDisplayProps) {
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<any>(null)
  const [projectStatus, setProjectStatus] = useState<any>(null)
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)

  // Use the imported supabase client

  // Load project status summary
  const loadSummary = async () => {
    try {
      setLoading(true)
      const summaryData = await getProjectStatusSummary()
      setSummary(summaryData)
    } catch (error) {
      console.error('Error loading status summary:', error)
    } finally {
      setLoading(false)
    }
  }

  // Load specific project status
  const loadProjectStatus = async () => {
    if (!projectId) return
    
    try {
      setLoading(true)
      const { data: project, error } = await supabase
        .from(TABLES.PROJECTS)
        .select('*')
        .eq('id', projectId)
        .single()
      
      if (error) throw error
      setProjectStatus(project)
    } catch (error) {
      console.error('Error loading project status:', error)
    } finally {
      setLoading(false)
    }
  }

  // Update project status
  const handleUpdateStatus = async () => {
    if (!projectId) return
    
    try {
      setLoading(true)
      const update = await updateProjectStatus(projectId)
      if (update) {
        setLastUpdate(new Date().toLocaleString())
        await loadProjectStatus()
        if (onStatusUpdate) {
          onStatusUpdate([update])
        }
      }
    } catch (error) {
      console.error('Error updating project status:', error)
    } finally {
      setLoading(false)
    }
  }

  // Update all project statuses
  const handleUpdateAllStatuses = async () => {
    try {
      setLoading(true)
      const updates = await updateAllProjectStatuses()
      setLastUpdate(new Date().toLocaleString())
      if (onStatusUpdate) {
        onStatusUpdate(updates)
      }
      await loadSummary()
    } catch (error) {
      console.error('Error updating all statuses:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSummary()
    if (projectId) {
      loadProjectStatus()
    }
  }, [projectId])

  const getStatusColor = (status: string) => {
    const statusInfo = getStatusDisplayInfo(status as any)
    const colorMap: Record<string, string> = {
      'gray': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
      'orange': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300',
      'blue': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
      'green': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
      'purple': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
      'emerald': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300',
      'yellow': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
      'red': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
    }
    return colorMap[statusInfo.color] || colorMap['gray']
  }

  if (loading && !summary && !projectStatus) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading status information...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Project Status Summary */}
      {showSummary && summary && (
        <ModernCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Project Status Summary
              </h3>
            </div>
            {showControls && (
              <ModernButton
                onClick={handleUpdateAllStatuses}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Update All
              </ModernButton>
            )}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            {Object.entries(summary.by_status).map(([status, count]) => {
              const statusInfo = getStatusDisplayInfo(status as any)
              return (
                <div key={status} className="text-center">
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status)}`}>
                    <span className="mr-1">{statusInfo.icon}</span>
                    {statusInfo.label}
                  </div>
                  <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                    {count as number}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {((count as number / summary.total) * 100).toFixed(1)}%
                  </div>
                </div>
              )
            })}
          </div>
          
          {lastUpdate && (
            <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
              Last updated: {lastUpdate}
            </div>
          )}
        </ModernCard>
      )}

      {/* Individual Project Status */}
      {projectStatus && (
        <ModernCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {projectStatus.project_name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {projectStatus.project_code}
              </p>
            </div>
            {showControls && (
              <ModernButton
                onClick={handleUpdateStatus}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Update Status
              </ModernButton>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Current Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Current Status
              </label>
              <div className="flex items-center gap-3">
                <ModernBadge 
                  className={`px-3 py-1 ${getStatusColor(projectStatus.project_status || 'upcoming')}`}
                >
                  <span className="mr-1">
                    {getStatusDisplayInfo(projectStatus.project_status || 'upcoming').icon}
                  </span>
                  {getStatusDisplayInfo(projectStatus.project_status || 'upcoming').label}
                </ModernBadge>
                {projectStatus.status_confidence && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {projectStatus.status_confidence.toFixed(0)}% confidence
                  </span>
                )}
              </div>
            </div>
            
            {/* Status Reason */}
            {projectStatus.status_reason && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status Reason
                </label>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {projectStatus.status_reason}
                </p>
              </div>
            )}
            
            {/* Last Updated */}
            {projectStatus.status_updated_at && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Last Updated
                </label>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {new Date(projectStatus.status_updated_at).toLocaleString()}
                </p>
              </div>
            )}
            
            {/* Project Dates */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Project Timeline
              </label>
              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                {projectStatus.project_start_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Start: {new Date(projectStatus.project_start_date).toLocaleDateString()}
                  </div>
                )}
                {projectStatus.project_end_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    End: {new Date(projectStatus.project_end_date).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </ModernCard>
      )}
    </div>
  )
}

// Import the updateAllProjectStatuses function
import { updateAllProjectStatuses } from '@/lib/projectStatusUpdater'
