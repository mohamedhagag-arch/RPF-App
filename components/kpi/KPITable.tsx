'use client'

import { KPIRecord, Project, BOQActivity } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Edit, Trash2, Eye } from 'lucide-react'

interface KPITableProps {
  kpis: KPIRecord[]
  projects: Project[]
  activities: BOQActivity[]
  onEdit: (kpi: KPIRecord) => void
  onDelete: (id: string) => void
}

export function KPITable({ kpis, projects, activities, onEdit, onDelete }: KPITableProps) {
  const getProjectInfo = (projectCode: string) => {
    const project = projects.find(p => p.project_code === projectCode)
    if (!project) return { code: projectCode || 'N/A', name: 'Not specified' }
    return {
      code: project.project_code || projectCode,
      name: project.project_name || 'Not specified'
    }
  }

  const getActivityInfo = (activityName: string) => {
    return activityName || 'Not specified'
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not specified'
    return new Date(dateString).toLocaleDateString('en-US')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_track': return 'bg-green-100 text-green-800'
      case 'delayed': return 'bg-red-100 text-red-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'at_risk': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'on_track': return 'On Track'
      case 'delayed': return 'Delayed'
      case 'completed': return 'Completed'
      case 'at_risk': return 'At Risk'
      default: return status
    }
  }

  const calculateProgress = (planned: number, actual: number) => {
    if (planned === 0) return 0
    return Math.min((actual / planned) * 100, 100)
  }

  if (kpis.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No KPIs found</p>
      </div>
    )
  }

  return (
    <div className="w-full overflow-hidden">
      <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-400px)] border border-gray-200 dark:border-gray-700 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10 shadow-sm">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              KPI / Activity
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Project
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Planned
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Actual
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Variance
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Progress %
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Activity Timing
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
          {kpis.map((kpi) => {
            const plannedValue = kpi.planned_value || 0
            const actualValue = kpi.actual_value || 0
            const progress = kpi.progress_percentage || calculateProgress(plannedValue, actualValue)
            const variance = kpi.variance || (actualValue - plannedValue)
            const variancePercentage = kpi.variance_percentage || 
              (plannedValue > 0 ? (variance / plannedValue) * 100 : 0)
            
            return (
              <tr key={kpi.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                {/* KPI Name */}
                <td className="px-6 py-4 text-sm">
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {kpi.kpi_name || kpi.activity_name}
                  </div>
                  {kpi.section && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Section: {kpi.section}
                    </div>
                  )}
                </td>
                
                {/* Project */}
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {getProjectInfo(kpi.project_full_code).code}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {getProjectInfo(kpi.project_full_code).name}
                  </div>
                </td>
                
                {/* Planned Value */}
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="font-semibold text-blue-600 dark:text-blue-400">
                    {(kpi.planned_value || 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {kpi.input_type === 'Planned' ? 'Planned' : 'Target'}
                  </div>
                </td>
                
                {/* Actual Value */}
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="font-semibold text-green-600 dark:text-green-400">
                    {(kpi.actual_value || 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {kpi.input_type === 'Actual' ? 'Actual' : 'Current'}
                  </div>
                </td>
                
                {/* Variance */}
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className={`font-semibold ${
                    variance > 0 ? 'text-green-600 dark:text-green-400' : 
                    variance < 0 ? 'text-red-600 dark:text-red-400' : 
                    'text-gray-600 dark:text-gray-400'
                  }`}>
                    {variance > 0 ? '+' : ''}{variance.toLocaleString()}
                  </div>
                  <div className={`text-xs ${
                    variancePercentage > 0 ? 'text-green-600 dark:text-green-400' : 
                    variancePercentage < 0 ? 'text-red-600 dark:text-red-400' : 
                    'text-gray-500 dark:text-gray-400'
                  }`}>
                    {variancePercentage > 0 ? '+' : ''}{variancePercentage.toFixed(1)}%
                  </div>
                </td>
                
                {/* Progress % */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                      <div 
                        className={`h-2.5 rounded-full transition-all ${
                          progress >= 100 ? 'bg-green-600' :
                          progress >= 80 ? 'bg-blue-600' :
                          progress >= 50 ? 'bg-yellow-600' : 'bg-red-600'
                        }`}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      ></div>
                    </div>
                    <span className={`text-sm font-semibold ${
                      progress >= 100 ? 'text-green-600 dark:text-green-400' :
                      progress >= 80 ? 'text-blue-600 dark:text-blue-400' :
                      progress >= 50 ? 'text-yellow-600 dark:text-yellow-400' : 
                      'text-red-600 dark:text-red-400'
                    }`}>
                      {progress.toFixed(1)}%
                    </span>
                  </div>
                </td>
                
                {/* Status */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusColor(kpi.status || 'on_track')}`}>
                    {getStatusText(kpi.status || 'on_track')}
                  </span>
                  {variance !== 0 && (
                    <div className={`text-xs mt-1 ${
                      variance > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {variance > 0 ? '↑ Ahead' : '↓ Behind'}
                    </div>
                  )}
                </td>
                
                {/* Activity Timing */}
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {kpi.activity_timing ? (
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                        kpi.activity_timing === 'pre-commencement' 
                          ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300' 
                          : kpi.activity_timing === 'post-completion'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                      }`}>
                        {kpi.activity_timing === 'pre-commencement' ? '⏰ Pre' : 
                         kpi.activity_timing === 'post-completion' ? '🔧 Post-Comp' : '🚀 Post'}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {kpi.activity_timing === 'pre-commencement' ? 'Before Start' : 
                         kpi.activity_timing === 'post-completion' ? 'After End' : 'With Start'}
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-600 text-xs">Not set</span>
                  )}
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2 ">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(kpi)}
                      className="flex items-center space-x-1 "
                    >
                      <Edit className="h-4 w-4" />
                      <span>Edit</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDelete(kpi.id)}
                      className="flex items-center space-x-1  text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Delete</span>
                    </Button>
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
