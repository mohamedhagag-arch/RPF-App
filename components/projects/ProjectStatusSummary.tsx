'use client'

import { useState, useEffect } from 'react'
import { supabase, TABLES } from '@/lib/supabase'
import { getProjectStatusStatistics, getAllProjectStatuses } from '@/lib/projectStatusManager'
import { ModernCard } from '@/components/ui/ModernCard'
import { ProjectStatusBadge } from '@/components/ui/ProjectStatusBadge'
import { BarChart3, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react'

interface ProjectStatusSummaryProps {
  projects?: any[]
  showDetails?: boolean
  className?: string
}

export function ProjectStatusSummary({ 
  projects = [], 
  showDetails = true,
  className = '' 
}: ProjectStatusSummaryProps) {
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<any>(null)
  const [allProjects, setAllProjects] = useState<any[]>(projects)

  // Use the imported supabase client

  // Load projects if not provided
  useEffect(() => {
    if (projects.length === 0) {
      loadProjects()
    } else {
      setAllProjects(projects)
      calculateStats(projects)
    }
  }, [projects])

  const loadProjects = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from(TABLES.PROJECTS)
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      setAllProjects(data || [])
      calculateStats(data || [])
    } catch (error) {
      console.error('Error loading projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (projectList: any[]) => {
    const statistics = getProjectStatusStatistics(projectList)
    setStats(statistics)
  }

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-gray-500">No project data available</p>
      </div>
    )
  }

  const statusOptions = getAllProjectStatuses()

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <ModernCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <BarChart3 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Projects</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
          </div>
        </ModernCard>

        <ModernCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Projects</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.active_count}</p>
            </div>
          </div>
        </ModernCard>

        <ModernCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.completed_count}</p>
            </div>
          </div>
        </ModernCard>

        <ModernCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Issues</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.problematic_count}</p>
            </div>
          </div>
        </ModernCard>
      </div>

      {/* Status Breakdown */}
      {showDetails && (
        <ModernCard className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Project Status Breakdown
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {statusOptions.map((status) => {
              const count = stats.by_status[status.value] || 0
              const percentage = stats.total > 0 ? ((count / stats.total) * 100).toFixed(1) : '0'
              
              return (
                <div key={status.value} className="text-center">
                  <ProjectStatusBadge 
                    status={status.value} 
                    size="sm" 
                    className="mb-2"
                  />
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {count}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {percentage}%
                  </div>
                </div>
              )
            })}
          </div>
        </ModernCard>
      )}
    </div>
  )
}
