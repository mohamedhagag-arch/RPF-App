'use client'

import { useState, useMemo, useCallback } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { Button } from '@/components/ui/Button'
import { Edit, Trash2, Target, CheckCircle } from 'lucide-react'
import { ProcessedKPI, getKPITypeStatusColor, getKPITypeBadgeColor, getKPITypeIcon } from '@/lib/kpiProcessor'
import { KPIEditButton } from './KPIEditButton'
import { EnhancedKPIEditModal } from './EnhancedKPIEditModal'

interface OptimizedKPITableProps {
  kpis: ProcessedKPI[]
  projects: Array<{ project_code: string; project_name: string }>
  activities: any[]
  onDelete?: (id: string) => void
  onBulkDelete?: (ids: string[]) => void
  onUpdate?: (id: string, data: any) => Promise<void>
}

export function OptimizedKPITable({ 
  kpis, 
  projects, 
  activities, 
  onDelete, 
  onBulkDelete,
  onUpdate 
}: OptimizedKPITableProps) {
  const guard = usePermissionGuard()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [editingKPI, setEditingKPI] = useState<ProcessedKPI | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  
  // Memoized project info lookup
  const projectInfoMap = useMemo(() => {
    const map = new Map<string, { code: string; name: string }>()
    projects.forEach(project => {
      map.set(project.project_code, {
        code: project.project_code,
        name: project.project_name
      })
    })
    return map
  }, [projects])

  // Memoized project info getter
  const getProjectInfo = useCallback((projectCode: string) => {
    return projectInfoMap.get(projectCode) || { code: projectCode || 'N/A', name: 'Not specified' }
  }, [projectInfoMap])

  // Memoized permission checks
  const canEdit = useMemo(() => guard.hasAccess('kpi.edit'), [guard])
  const canDelete = useMemo(() => guard.hasAccess('kpi.delete'), [guard])
  
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      const allIds = kpis.map(kpi => kpi.id).filter(Boolean) as string[]
      setSelectedIds(allIds)
    } else {
      setSelectedIds([])
    }
  }, [kpis])
  
  const handleSelectOne = useCallback((id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id])
    } else {
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id))
    }
  }, [])
  
  const handleBulkDeleteClick = useCallback(() => {
    if (selectedIds.length === 0) return
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} KPI(s)?`)) return
    if (onBulkDelete) {
      onBulkDelete(selectedIds)
      setSelectedIds([])
    }
  }, [selectedIds, onBulkDelete])

  // Enhanced Edit Button Handler
  const handleEditClick = useCallback((kpi: ProcessedKPI) => {
    setEditingKPI(kpi)
    setShowEditModal(true)
  }, [])

  // Enhanced Update Handler
  const handleUpdateKPI = useCallback(async (id: string, data: any) => {
    if (!editingKPI || !onUpdate) return
    
    try {
      console.log('📝 OptimizedKPITable: handleUpdateKPI called with id:', id, 'data:', data)
      console.log('📝 OptimizedKPITable: editingKPI.id:', editingKPI.id)
      console.log('📝 OptimizedKPITable: calling onUpdate with:', id, data)
      
      await onUpdate(id, data)
      setShowEditModal(false)
      setEditingKPI(null)
    } catch (error) {
      throw error
    }
  }, [editingKPI, onUpdate])

  // Cancel Edit Handler
  const handleCancelEdit = useCallback(() => {
    setShowEditModal(false)
    setEditingKPI(null)
  }, [])
  
  const allSelected = kpis.length > 0 && selectedIds.length === kpis.filter(k => k.id).length
  const someSelected = selectedIds.length > 0 && !allSelected

  if (kpis.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">No KPI data found</p>
      </div>
    )
  }

  return (
    <>
      <div className="w-full overflow-hidden">
        {/* Bulk Actions Toolbar */}
        {selectedIds.length > 0 && (
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {selectedIds.length} KPI(s) selected
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedIds([])}
                className="text-gray-600 dark:text-gray-300"
              >
                Clear Selection
              </Button>
            </div>
            {canDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkDeleteClick}
                className="flex items-center space-x-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete Selected</span>
              </Button>
            )}
          </div>
        )}
        
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-400px)] border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-750 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(input) => {
                      if (input) {
                        input.indeterminate = someSelected
                      }
                    }}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Activity / KPI
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Project
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider w-20">
                  Zone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Target Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Actual Date
                </th>
                {(canEdit || canDelete) && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {kpis.map((kpi) => {
                const projectInfo = getProjectInfo(kpi.project_full_code)
                const isPlanned = kpi.input_type === 'Planned'
                const isSelected = selectedIds.includes(kpi.id as string)
                
                return (
                  <tr key={kpi.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                    isPlanned ? 'bg-blue-50 bg-opacity-10 dark:bg-blue-900 dark:bg-opacity-5' : 
                    'bg-green-50 bg-opacity-10 dark:bg-green-900 dark:bg-opacity-5'
                  } ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/30' : ''}`}>
                    {/* Checkbox */}
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => kpi.id && handleSelectOne(kpi.id as string, e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                      />
                    </td>
                    
                    {/* Type Badge */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${getKPITypeBadgeColor(kpi.input_type)}`}>
                        <span>{getKPITypeIcon(kpi.input_type)}</span>
                        {kpi.input_type}
                      </span>
                    </td>
                    
                    {/* Activity/KPI Name */}
                    <td className="px-6 py-4 text-sm max-w-[300px]">
                      <div className="font-semibold text-gray-900 dark:text-gray-100">
                        {kpi.activity_name}
                      </div>
                      {kpi.section && (
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded border border-gray-300 dark:border-gray-700">
                            Section: {kpi.section}
                          </span>
                        </div>
                      )}
                    </td>
                    
                    {/* Project */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="font-semibold text-blue-600 dark:text-blue-400">
                        {projectInfo.code}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 max-w-[180px] truncate" title={projectInfo.name}>
                        {projectInfo.name}
                      </div>
                    </td>
                    
                    {/* Zone */}
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 dark:text-gray-100 w-20">
                      <span className="px-1.5 py-0.5 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 rounded text-center truncate max-w-16">
                        {kpi.zone || 'N/A'}
                      </span>
                    </td>
                    
                    {/* Quantity */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className={`font-bold text-lg ${
                        isPlanned ? 'text-blue-700 dark:text-blue-400' : 'text-green-700 dark:text-green-400'
                      }`}>
                        {kpi.quantity.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {isPlanned ? '🎯 Target' : '✓ Achieved'}
                      </div>
                    </td>
                    
                    {/* Target Date */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {(() => {
                        const dateValue = kpi.target_date || kpi.activity_date
                        if (!dateValue) {
                          return <span className="text-gray-400 dark:text-gray-600">Not set</span>
                        }
                        
                        const date = new Date(dateValue)
                        if (isNaN(date.getTime())) {
                          return <span className="text-gray-400 dark:text-gray-600">Invalid date</span>
                        }
                        
                        return (
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-gray-100">
                              {date.toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {kpi.input_type === 'Planned' ? '🎯 Target' : '📅 Actual'}
                            </div>
                          </div>
                        )
                      })()}
                    </td>
                    
                    {/* Actual Date */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {(() => {
                        const dateValue = kpi.actual_date
                        if (!dateValue) {
                          return <span className="text-gray-400 dark:text-gray-600">Not set</span>
                        }
                        
                        const date = new Date(dateValue)
                        if (isNaN(date.getTime())) {
                          return <span className="text-gray-400 dark:text-gray-600">Invalid date</span>
                        }
                        
                        return (
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-gray-100">
                              {date.toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              ✓ Actual
                            </div>
                          </div>
                        )
                      })()}
                    </td>
                    
                    {/* Enhanced Actions */}
                    {(canEdit || canDelete) && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          {/* Enhanced Edit Button */}
                          {canEdit && (
                            <KPIEditButton
                              kpi={kpi}
                              onEdit={handleEditClick}
                              className="hover:scale-105 transition-transform duration-200"
                            />
                          )}
                          
                          {/* Delete Button */}
                          {canDelete && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onDelete && onDelete(kpi.id)}
                              className="flex items-center space-x-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 dark:hover:border-red-600 transition-all duration-200"
                              title="Delete KPI"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enhanced Edit Modal */}
      {showEditModal && editingKPI && (
        <EnhancedKPIEditModal
          kpi={editingKPI}
          projects={projects}
          activities={activities}
          onUpdate={handleUpdateKPI}
          onCancel={handleCancelEdit}
          isOpen={showEditModal}
        />
      )}
    </>
  )
}
