'use client'

import { useEffect, useState } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { getSupabaseClient, executeQuery } from '@/lib/simpleConnectionManager'
import { useSmartLoading } from '@/lib/smartLoadingManager'
import { Project, TABLES } from '@/lib/supabase'
import { mapBOQFromDB, mapKPIFromDB } from '@/lib/dataMappers'
import { Button } from '@/components/ui/Button'
import { Edit, Trash2, Eye, Activity, Target, TrendingUp } from 'lucide-react'

interface ProjectsTableProps {
  projects: Project[]
  onEdit: (project: Project) => void
  onDelete: (id: string) => void
  onViewDetails: (project: Project) => void
  getStatusColor: (status: string) => string
  getStatusText: (status: string) => string
}

interface ProjectStats {
  activitiesCount: number
  kpisPlannedCount: number
  kpisActualCount: number
  avgProgress: number
  loaded: boolean
}

export function ProjectsTable({
  projects,
  onEdit,
  onDelete,
  onViewDetails,
  getStatusColor,
  getStatusText
}: ProjectsTableProps) {
  const guard = usePermissionGuard()
  const [projectStats, setProjectStats] = useState<Record<string, ProjectStats>>({})
  const supabase = getSupabaseClient()
  const { startSmartLoading, stopSmartLoading } = useSmartLoading('projects-table')
  
  useEffect(() => {
    if (projects.length > 0) {
      fetchAllProjectStats()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects.length])
  
  async function fetchAllProjectStats() {
    try {
      console.log('📊 ProjectsTable: Fetching stats for', projects.length, 'projects...')
      
      // Get all project codes
      const projectCodes = projects.map(p => p.project_code)
      
      // ✅ Fetch BOQ activities from 'Planning Database - BOQ Rates'
      const { data: activitiesData, error: activitiesError } = await supabase
        .from(TABLES.BOQ_ACTIVITIES)
        .select('*')
        .in('Project Code', projectCodes)
      
      if (activitiesError) {
        console.error('❌ Error fetching activities:', activitiesError)
      }
      
      // ✅ Fetch KPIs from MAIN TABLE (single source of truth!)
      let { data: kpisData, error: kpisError } = await supabase
        .from(TABLES.KPI)
        .select('*')
        .in('Project Full Code', projectCodes)
      
      // Also try with 'Project Code' column and merge results
      const { data: kpisData2 } = await supabase
        .from(TABLES.KPI)
        .select('*')
        .in('Project Code', projectCodes)
      
      // Merge both results (remove duplicates by id)
      const byFullCodeCount = kpisData?.length || 0
      const byCodeCount = kpisData2?.length || 0
      
      const allKPIsData = [...(kpisData || []), ...(kpisData2 || [])]
      const uniqueKPIs = Array.from(new Map(allKPIsData.map((k: any) => [k.id, k])).values())
      kpisData = uniqueKPIs as any
      
      if (kpisError) {
        console.error('❌ Error fetching KPIs:', kpisError)
      }
      
      console.log('🔍 KPI Query Results:', {
        byFullCode: byFullCodeCount,
        byCode: byCodeCount,
        merged: (kpisData || []).length,
        projects: projectCodes
      })
      
      console.log('✅ ProjectsTable: Fetched', activitiesData?.length || 0, 'activities')
      console.log('✅ ProjectsTable: Fetched', kpisData?.length || 0, 'KPIs')
      
      // Debug: Show sample raw data
      if (kpisData && kpisData.length > 0) {
        console.log('📊 Sample raw KPI from DB:', {
          'Project Code': kpisData[0]['Project Code'],
          'Project Full Code': kpisData[0]['Project Full Code'],
          'Activity Name': kpisData[0]['Activity Name'],
          'Input Type': kpisData[0]['Input Type'],
          'Quantity': kpisData[0]['Quantity']
        })
      }
      
      const activities = (activitiesData || []).map(mapBOQFromDB)
      const kpis = (kpisData || []).map(mapKPIFromDB)
      
      // Debug: Show sample mapped data
      if (kpis.length > 0) {
        console.log('📊 Sample mapped KPI:', {
          project_code: kpis[0].project_code,
          project_full_code: kpis[0].project_full_code,
          activity_name: kpis[0].activity_name,
          input_type: kpis[0].input_type
        })
      }
      
      // Calculate stats for each project
      const stats: Record<string, ProjectStats> = {}
      
      projects.forEach(project => {
        const projectActivities = activities.filter(a => 
          a.project_code === project.project_code || 
          a.project_full_code === project.project_code ||
          a.project_full_code?.startsWith(project.project_code)
        )
        
        const projectKPIs = kpis.filter(k => 
          k.project_code === project.project_code || 
          k.project_full_code === project.project_code ||
          k.project_full_code?.startsWith(project.project_code)
        )
        
        const plannedKPIs = projectKPIs.filter(k => k.input_type === 'Planned')
        const actualKPIs = projectKPIs.filter(k => k.input_type === 'Actual')
        
        // ✅ Progress = (Actual KPIs Quantity / Planned KPIs Quantity) × 100
        const totalPlannedQuantity = plannedKPIs.reduce((sum, k) => {
          const qty = parseFloat(k.quantity?.toString() || '0') || 0
          return sum + qty
        }, 0)
        
        const totalActualQuantity = actualKPIs.reduce((sum, k) => {
          const qty = parseFloat(k.quantity?.toString() || '0') || 0
          return sum + qty
        }, 0)
        
        const avgProgress = totalPlannedQuantity > 0
          ? (totalActualQuantity / totalPlannedQuantity) * 100
          : 0
        
        stats[project.project_code] = {
          activitiesCount: projectActivities.length,
          kpisPlannedCount: plannedKPIs.length,
          kpisActualCount: actualKPIs.length,
          avgProgress: avgProgress,
          loaded: true
        }
        
        console.log(`📊 Stats for ${project.project_code}:`, {
          activities: projectActivities.length,
          kpis: {
            total: projectKPIs.length,
            planned: plannedKPIs.length,
            actual: actualKPIs.length,
            plannedQty: totalPlannedQuantity,
            actualQty: totalActualQuantity
          },
          progress: avgProgress.toFixed(1) + '%'
        })
      })
      
      setProjectStats(stats)
      console.log('✅ ProjectsTable: Stats calculated for all projects')
    } catch (error) {
      console.error('❌ ProjectsTable: Error fetching project stats:', error)
    }
  }
  
  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0)
  }

  function formatDate(dateString: string) {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  function getProgressColor(progress: number) {
    if (progress >= 75) return 'bg-green-500'
    if (progress >= 50) return 'bg-blue-500'
    if (progress >= 25) return 'bg-yellow-500'
    return 'bg-red-500'
  }
  
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Project Code
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Project Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Division
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              BOQ Activities
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              KPIs (Planned)
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              KPIs (Actual)
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Progress
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Contract Amount
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
          {projects.length === 0 ? (
            <tr>
              <td colSpan={10} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                No projects found. Create your first project to get started!
              </td>
            </tr>
          ) : (
            projects.map((project) => {
              const stats = projectStats[project.project_code] || {
                activitiesCount: 0,
                kpisPlannedCount: 0,
                kpisActualCount: 0,
                avgProgress: 0,
                loaded: false
              }
              
              return (
                <tr 
                  key={project.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                    {project.project_code}
                    {project.project_sub_code && (
                      <span className="ml-1 text-xs text-gray-500">
                        ({project.project_sub_code})
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100 max-w-xs">
                    <div className="font-medium truncate" title={project.project_name}>
                      {project.project_name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {project.project_type || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                    {project.responsible_division || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(project.project_status)}`}>
                      {getStatusText(project.project_status)}
                    </span>
                  </td>
                  
                  {/* ✨ BOQ Activities from 'Planning Database - BOQ Rates' */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {stats.loaded ? (
                      <div className="flex items-center space-x-2">
                        <Activity className="h-4 w-4 text-blue-500" />
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {stats.activitiesCount}
                        </span>
                        <span className="text-xs text-gray-500">activities</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 animate-pulse">...</span>
                    )}
                  </td>
                  
                  {/* ✨ KPIs Planned from 'Planning Database - KPI Combined' */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {stats.loaded ? (
                      <div className="flex items-center space-x-2">
                        <Target className="h-4 w-4 text-green-500" />
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {stats.kpisPlannedCount}
                        </span>
                        <span className="text-xs text-gray-500">planned</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 animate-pulse">...</span>
                    )}
                  </td>
                  
                  {/* ✨ KPIs Actual from 'Planning Database - KPI Combined' */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {stats.loaded ? (
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="h-4 w-4 text-purple-500" />
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {stats.kpisActualCount}
                        </span>
                        <span className="text-xs text-gray-500">actual</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 animate-pulse">...</span>
                    )}
                  </td>
                  
                  {/* Progress Bar */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {stats.loaded ? (
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 w-24">
                          <div
                            className={`h-2 rounded-full transition-all ${getProgressColor(stats.avgProgress)}`}
                            style={{ width: `${Math.min(stats.avgProgress, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          {stats.avgProgress.toFixed(0)}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {formatCurrency(project.contract_amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewDetails(project)}
                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(project)}
                        className="text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(project.id)}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
