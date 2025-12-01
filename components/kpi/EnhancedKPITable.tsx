'use client'

import { useState } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { Button } from '@/components/ui/Button'
import { Edit, Trash2, Target, CheckCircle, MoreHorizontal, Eye, Calendar, Activity } from 'lucide-react'
import { ProcessedKPI, getKPITypeStatusColor, getKPITypeBadgeColor, getKPITypeIcon } from '@/lib/kpiProcessor'
import { IntelligentKPIForm } from './IntelligentKPIForm'
import { SmartActualKPIForm } from './SmartActualKPIForm'
import { KPIEditButton } from './KPIEditButton'
import { KPIEditModal } from './KPIEditModal'

interface EnhancedKPITableProps {
  kpis: ProcessedKPI[]
  projects: Array<{ project_code: string; project_name: string }>
  activities: any[]
  onEdit?: (kpi: any) => void
  onDelete?: (id: string) => void
  onBulkDelete?: (ids: string[]) => void
  onUpdate?: (id: string, data: any) => Promise<void>
}

export function EnhancedKPITable({ 
  kpis, 
  projects, 
  activities, 
  onEdit, 
  onDelete, 
  onBulkDelete,
  onUpdate 
}: EnhancedKPITableProps) {
  const guard = usePermissionGuard()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [editingKPI, setEditingKPI] = useState<ProcessedKPI | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = kpis.map(kpi => kpi.id).filter(Boolean) as string[]
      setSelectedIds(allIds)
    } else {
      setSelectedIds([])
    }
  }
  
  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id])
    } else {
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id))
    }
  }
  
  const handleBulkDeleteClick = () => {
    if (selectedIds.length === 0) return
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} KPI(s)?`)) return
    if (onBulkDelete) {
      onBulkDelete(selectedIds)
      setSelectedIds([])
    }
  }

  // Enhanced Edit Button Handler
  const handleEditClick = (kpi: ProcessedKPI) => {
    console.log('📝 Enhanced Edit Button: Starting edit for KPI:', kpi)
    console.log('📝 KPI Type:', kpi.input_type)
    console.log('📝 KPI Data:', kpi)
    
    setEditingKPI(kpi)
    setShowEditModal(true)
    
    console.log('📝 Enhanced Edit: Modal should be opening now')
    // Note: onEdit is no longer needed as we handle editing internally
  }

  // Enhanced Update Handler
  const handleUpdateKPI = async (data: any) => {
    if (!editingKPI || !onUpdate) return
    
    try {
      console.log('📝 Enhanced Update: Updating KPI with data:', data)
      await onUpdate(editingKPI.id, data)
      
      // Close form and reset state
      setShowEditModal(false)
      setEditingKPI(null)
      
      console.log('✅ Enhanced Update: KPI updated successfully')
    } catch (error) {
      console.error('❌ Enhanced Update: Failed to update KPI:', error)
      // Don't close modal on error
      throw error
    }
  }

  // Cancel Edit Handler
  const handleCancelEdit = () => {
    console.log('❌ Enhanced Edit: Cancelling edit')
    setShowEditModal(false)
    setEditingKPI(null)
  }
  
  const allSelected = kpis.length > 0 && selectedIds.length === kpis.filter(k => k.id).length
  const someSelected = selectedIds.length > 0 && !allSelected
  
  const getProjectInfo = (projectCode: string) => {
    const project = projects.find(p => p.project_code === projectCode)
    if (!project) return { code: projectCode || 'N/A', name: 'Not specified' }
    return {
      code: project.project_code || projectCode,
      name: project.project_name || 'Not specified'
    }
  }

  if (kpis.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">No KPI data found</p>
      </div>
    )
  }

  // Separate Planned and Actual
  const plannedKPIs = kpis.filter(k => k.input_type === 'Planned')
  const actualKPIs = kpis.filter(k => k.input_type === 'Actual')
  
  // Debug logging
  console.log('🔍 EnhancedKPITable: Total KPIs =', kpis.length)
  console.log('🔍 EnhancedKPITable: Planned KPIs =', plannedKPIs.length)
  console.log('🔍 EnhancedKPITable: Actual KPIs =', actualKPIs.length)

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
            {guard.hasAccess('kpi.delete') && (
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
                {/* Select All Checkbox */}
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Target Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                {((onEdit && guard.hasAccess('kpi.edit')) || (onDelete && guard.hasAccess('kpi.delete'))) && (
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
                    
                    {/* Status */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-2">
                        <span className={`inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-full ${getKPITypeStatusColor(kpi.input_type, kpi.status)}`}>
                          {kpi.status.charAt(0).toUpperCase() + kpi.status.slice(1)}
                        </span>
                        {/* Performance Bar */}
                        <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                          <div 
                            className={`h-1.5 rounded-full transition-all ${
                              isPlanned ? 'bg-blue-600' : 'bg-green-600'
                            }`}
                            style={{ width: `${kpi.performance_level}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    
                    {/* Enhanced Actions */}
                    {((onEdit && guard.hasAccess('kpi.edit')) || (onDelete && guard.hasAccess('kpi.delete'))) && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          {/* Enhanced Edit Button */}
                          <KPIEditButton
                            kpi={kpi}
                            onEdit={handleEditClick}
                            className="hover:scale-105 transition-transform duration-200"
                          />
                          
                          {/* Delete Button */}
                          {guard.hasAccess('kpi.delete') && (
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
        <KPIEditModal
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