'use client'

import { useState, useEffect } from 'react'
import { BOQActivity, Project } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Edit, Trash2, Eye } from 'lucide-react'
import { BOQWithKPIStatus } from './BOQWithKPIStatus'
import { BOQProgressCell } from './BOQProgressCell'
import { BOQStatusCell } from './BOQStatusCell'
import { BOQActualQuantityCell } from './BOQActualQuantityCell'

interface BOQTableProps {
  activities: BOQActivity[]
  projects: Project[]
  allKPIs: any[] // All KPIs pre-loaded
  onEdit: (activity: BOQActivity) => void
  onDelete: (id: string) => void
  onBulkDelete?: (ids: string[]) => void
}

export function BOQTable({ activities, projects, allKPIs, onEdit, onDelete, onBulkDelete }: BOQTableProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  
  // 🔧 FIX: Clear selection when activities change
  useEffect(() => {
    setSelectedIds([])
  }, [activities])
  
  // Debug: Log allKPIs when updated
  useEffect(() => {
    console.log('📋 BOQTable: allKPIs updated', {
      count: allKPIs.length,
      activities: activities.length,
      sample: allKPIs.slice(0, 2).map(k => ({
        project: k.project_code || k.project_full_code,
        activity: k.activity_name,
        type: k.input_type
      }))
    })
  }, [allKPIs, activities])
  
  const handleSelectAll = (checked: boolean) => {
    if (checked && activities.length > 0) {
      setSelectedIds(activities.map(a => a.id))
    } else {
      setSelectedIds([])
    }
  }
  
  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => prev.includes(id) ? prev : [...prev, id])
    } else {
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id))
    }
  }
  
  const handleBulkDeleteClick = () => {
    if (selectedIds.length === 0) return
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} activity(ies)?\n\nThis will also delete all associated KPIs.`)) return
    if (onBulkDelete) {
      onBulkDelete(selectedIds)
      setSelectedIds([])
    }
  }
  
  const allSelected = activities.length > 0 && selectedIds.length === activities.length && selectedIds.length > 0
  const someSelected = selectedIds.length > 0 && selectedIds.length < activities.length
  
  const getProjectInfo = (projectCode: string) => {
    const project = projects.find(p => p.project_code === projectCode)
    if (!project) return { code: projectCode || 'N/A', name: 'Not specified' }
    return {
      code: project.project_code || projectCode,
      name: project.project_name || 'Not specified'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not specified'
    return new Date(dateString).toLocaleDateString('en-US')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'delayed': return 'bg-red-100 text-red-800'
      case 'not_started': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed'
      case 'in_progress': return 'In Progress'
      case 'delayed': return 'Delayed'
      case 'not_started': return 'Not Started'
      default: return status
    }
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No activities found</p>
      </div>
    )
  }

  return (
    <div className="w-full overflow-hidden">
      {/* Bulk Actions Toolbar */}
      {selectedIds.length > 0 && (
        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
              {selectedIds.length} Activity(ies) selected
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
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkDeleteClick}
            className="flex items-center space-x-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete Selected</span>
          </Button>
        </div>
      )}
      
      <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-400px)] border border-gray-200 dark:border-gray-700 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10 shadow-sm">
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
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Project
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Activity
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Planned Quantity
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actual Quantity
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Progress %
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total Value
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
          {activities.map((activity) => {
            const isSelected = selectedIds.includes(activity.id)
            
            return (
            <tr key={activity.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800 ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/30' : ''}`}>
              {/* Checkbox */}
              <td className="px-4 py-4">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => handleSelectOne(activity.id, e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                />
              </td>
              
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  {getProjectInfo(activity.project_code).code}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {getProjectInfo(activity.project_code).name}
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="text-sm text-gray-900 dark:text-gray-100 font-medium mb-1">{activity.activity_name}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">{activity.activity}</div>
                <BOQWithKPIStatus activity={activity} allKPIs={allKPIs} />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                {(activity.planned_units || 0).toLocaleString()} {activity.unit || ''}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                {/* ✅ Calculate Actual from KPIs (MAIN TABLE) */}
                <BOQActualQuantityCell activity={activity} allKPIs={allKPIs} />
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <BOQProgressCell activity={activity} allKPIs={allKPIs} />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                {formatCurrency(activity.total_value)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <BOQStatusCell activity={activity} />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div className="flex space-x-2 ">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(activity)}
                    className="flex items-center space-x-1 "
                  >
                    <Edit className="h-4 w-4" />
                    <span>Edit</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete(activity.id)}
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
