'use client'

import { useState, useEffect } from 'react'
import { KPIRecord, Project } from '@/lib/supabase'
import { ColumnCustomizer, ColumnConfig } from '@/components/ui/ColumnCustomizer'
import { useColumnCustomization } from '@/lib/useColumnCustomization'
import { Button } from '@/components/ui/Button'
import { CheckCircle, Clock, AlertCircle, Calendar, Building, Activity, TrendingUp, Target, Info, Filter, X } from 'lucide-react'

interface KPITableWithCustomizationProps {
  kpis: KPIRecord[]
  projects: Project[]
  onEdit: (kpi: KPIRecord) => void
  onDelete: (id: string) => void
  onBulkDelete?: (ids: string[]) => void
}

// Default column configuration for KPI
const defaultKPIColumns: ColumnConfig[] = [
  { id: 'select', label: 'Select', visible: true, order: 0, fixed: true },
  { id: 'activity_details', label: 'Activity Details', visible: true, order: 1 },
  { id: 'date', label: 'Date', visible: true, order: 2 },
  { id: 'input_type', label: 'Input Type', visible: true, order: 3 },
  { id: 'unit', label: 'Unit', visible: true, order: 4 },
  { id: 'quantities', label: 'Quantities', visible: true, order: 5 },
  { id: 'value', label: 'Value', visible: true, order: 6 },
  { id: 'virtual_value', label: 'Virtual Value', visible: true, order: 7 },
  { id: 'activity_commencement_relation', label: 'Activity Commencement Relation', visible: true, order: 8 },
  { id: 'activity_division', label: 'Activity Division', visible: true, order: 9 },
  { id: 'activity_scope', label: 'Activity Scope', visible: true, order: 10 },
  { id: 'key_dates', label: 'Key Dates', visible: true, order: 11 },
  { id: 'cumulative_quantity', label: 'Cumulative Quantity', visible: true, order: 12 },
  { id: 'cumulative_value', label: 'Cumulative Value', visible: true, order: 13 },
  { id: 'actions', label: 'Actions', visible: true, order: 14, fixed: true }
]

export function KPITableWithCustomization({ 
  kpis, 
  projects, 
  onEdit, 
  onDelete, 
  onBulkDelete 
}: KPITableWithCustomizationProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showCustomizer, setShowCustomizer] = useState(false)
  
  const { 
    columns, 
    saveConfiguration, 
    resetToDefault 
  } = useColumnCustomization({ 
    defaultColumns: defaultKPIColumns, 
    storageKey: 'kpi' 
  })

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id])
    } else {
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(kpis.map(kpi => kpi.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleBulkDelete = () => {
    if (onBulkDelete && selectedIds.length > 0) {
      onBulkDelete(selectedIds)
      setSelectedIds([])
    }
  }

  // Enhanced Analysis Functions with Advanced Calculations
  const getProjectName = (projectCode: string) => {
    const project = projects.find(p => p.project_code === projectCode)
    return project?.project_name || projectCode
  }

  // Calculate Advanced Performance Score with Multiple Factors
  const calculateAdvancedPerformanceScore = (kpi: KPIRecord) => {
    let score = 0
    let factors = 0
    
    // Progress Factor (30%)
    if (kpi.progress_percentage !== undefined) {
      score += (kpi.progress_percentage / 100) * 30
      factors += 30
    }
    
    // Timeline Factor (25%)
    if (kpi.target_date && kpi.actual_date) {
      const targetDate = new Date(kpi.target_date)
      const actualDate = new Date(kpi.actual_date)
      const daysDiff = Math.ceil((actualDate.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysDiff <= 0) score += 25 // On time or early
      else if (daysDiff <= 7) score += 20 // 1 week late
      else if (daysDiff <= 30) score += 15 // 1 month late
      else if (daysDiff <= 90) score += 10 // 3 months late
      else score += 5 // Very late
      factors += 25
    }
    
    // Financial Factor (25%)
    if (kpi.planned_value && kpi.actual_value) {
      const variance = ((kpi.actual_value - kpi.planned_value) / kpi.planned_value) * 100
      if (variance <= 5) score += 25 // Within 5% budget
      else if (variance <= 15) score += 20 // Within 15% budget
      else if (variance <= 30) score += 15 // Within 30% budget
      else if (variance <= 50) score += 10 // Within 50% budget
      else score += 5 // Over budget
      factors += 25
    }
    
    // Quality Factor (20%)
    if (kpi.progress_percentage !== undefined) {
      if (kpi.progress_percentage >= 95) score += 20 // Excellent
      else if (kpi.progress_percentage >= 85) score += 15 // Very good
      else if (kpi.progress_percentage >= 70) score += 10 // Good
      else if (kpi.progress_percentage >= 50) score += 5 // Average
      factors += 20
    }
    
    return factors > 0 ? Math.min(100, Math.max(0, (score / factors) * 100)) : 0
  }

  // Calculate Efficiency with Advanced Metrics
  const calculateAdvancedEfficiency = (kpi: KPIRecord) => {
    let efficiency = 0
    let metrics = 0
    
    // Quantity Efficiency (40%)
    if (kpi.quantity && kpi.planned_value) {
      const rate = kpi.quantity / kpi.planned_value
      if (rate > 1.2) efficiency += 40 // 20% above target
      else if (rate > 1.0) efficiency += 35 // At or above target
      else if (rate > 0.8) efficiency += 25 // Within 20% of target
      else if (rate > 0.6) efficiency += 15 // Within 40% of target
      else efficiency += 5 // Below target
      metrics += 40
    }
    
    // Time Efficiency (35%)
    if (kpi.target_date && kpi.actual_date) {
      const targetDate = new Date(kpi.target_date)
      const actualDate = new Date(kpi.actual_date)
      const daysDiff = Math.ceil((actualDate.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysDiff <= 0) efficiency += 35 // On time
      else if (daysDiff <= 3) efficiency += 30 // 3 days late
      else if (daysDiff <= 7) efficiency += 25 // 1 week late
      else if (daysDiff <= 14) efficiency += 20 // 2 weeks late
      else if (daysDiff <= 30) efficiency += 15 // 1 month late
      else efficiency += 5 // Very late
      metrics += 35
    }
    
    // Resource Efficiency (25%)
    if (kpi.progress_percentage !== undefined && kpi.progress_percentage > 0) {
      const resourceEfficiency = kpi.progress_percentage / 100
      efficiency += resourceEfficiency * 25
      metrics += 25
    }
    
    return metrics > 0 ? Math.min(100, Math.max(0, (efficiency / metrics) * 100)) : 0
  }

  // Calculate Risk Level with Advanced Assessment
  const calculateAdvancedRiskLevel = (kpi: KPIRecord) => {
    let riskScore = 0
    let riskFactors = 0
    
    // Progress Risk (30%)
    if (kpi.progress_percentage !== undefined) {
      if (kpi.progress_percentage < 25) riskScore += 30
      else if (kpi.progress_percentage < 50) riskScore += 20
      else if (kpi.progress_percentage < 75) riskScore += 10
      riskFactors += 30
    }
    
    // Timeline Risk (25%)
    if (kpi.target_date && kpi.actual_date) {
      const targetDate = new Date(kpi.target_date)
      const actualDate = new Date(kpi.actual_date)
      const daysDiff = Math.ceil((actualDate.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysDiff > 90) riskScore += 25
      else if (daysDiff > 30) riskScore += 20
      else if (daysDiff > 14) riskScore += 15
      else if (daysDiff > 7) riskScore += 10
      else if (daysDiff > 0) riskScore += 5
      riskFactors += 25
    }
    
    // Financial Risk (25%)
    if (kpi.variance_percentage !== undefined) {
      if (kpi.variance_percentage > 50) riskScore += 25
      else if (kpi.variance_percentage > 25) riskScore += 20
      else if (kpi.variance_percentage > 15) riskScore += 15
      else if (kpi.variance_percentage > 5) riskScore += 10
      riskFactors += 25
    }
    
    // Quality Risk (20%)
    if (kpi.progress_percentage !== undefined) {
      if (kpi.progress_percentage < 30) riskScore += 20
      else if (kpi.progress_percentage < 50) riskScore += 15
      else if (kpi.progress_percentage < 70) riskScore += 10
      else if (kpi.progress_percentage < 85) riskScore += 5
      riskFactors += 20
    }
    
    const riskPercentage = riskFactors > 0 ? (riskScore / riskFactors) * 100 : 0
    
    if (riskPercentage >= 70) return { level: 'high', score: riskPercentage, color: 'red' }
    if (riskPercentage >= 40) return { level: 'medium', score: riskPercentage, color: 'yellow' }
    if (riskPercentage >= 20) return { level: 'low', score: riskPercentage, color: 'green' }
    return { level: 'minimal', score: riskPercentage, color: 'blue' }
  }

  // Calculate Smart Insights with Advanced Logic
  const getSmartInsights = (kpi: KPIRecord) => {
    const insights = []
    
    // Progress Insights
    if (kpi.progress_percentage !== undefined) {
      if (kpi.progress_percentage >= 100) {
        insights.push({ type: 'success', message: 'Activity completed successfully', icon: '🎉' })
      } else if (kpi.progress_percentage >= 90) {
        insights.push({ type: 'warning', message: 'Near completion', icon: '🔥' })
      } else if (kpi.progress_percentage >= 75) {
        insights.push({ type: 'info', message: 'Excellent progress', icon: '⚡' })
      } else if (kpi.progress_percentage >= 50) {
        insights.push({ type: 'info', message: 'Good progress', icon: '📈' })
      } else if (kpi.progress_percentage >= 25) {
        insights.push({ type: 'warning', message: 'Promising start', icon: '🚀' })
      } else {
        insights.push({ type: 'info', message: 'Just started', icon: '⏳' })
      }
    }
    
    // Financial Insights
    if (kpi.variance_percentage !== undefined) {
      if (kpi.variance_percentage > 20) {
        insights.push({ type: 'error', message: 'Budget overrun', icon: '💰' })
      } else if (kpi.variance_percentage > 5) {
        insights.push({ type: 'warning', message: 'Approaching budget limit', icon: '⚠️' })
      } else if (kpi.variance_percentage > -5) {
        insights.push({ type: 'success', message: 'Within budget', icon: '✅' })
      } else {
        insights.push({ type: 'success', message: 'Budget savings', icon: '💎' })
      }
    }
    
    // Timeline Insights
    if (kpi.target_date && kpi.actual_date) {
      const targetDate = new Date(kpi.target_date)
      const actualDate = new Date(kpi.actual_date)
      const daysDiff = Math.ceil((actualDate.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysDiff > 30) {
        insights.push({ type: 'error', message: 'Major delay', icon: '🚨' })
      } else if (daysDiff > 7) {
        insights.push({ type: 'warning', message: 'Moderate delay', icon: '⏰' })
      } else if (daysDiff > 0) {
        insights.push({ type: 'info', message: 'Minor delay', icon: '📅' })
      } else {
        insights.push({ type: 'success', message: 'On time or early', icon: '🎯' })
      }
    }
    
    return insights.length > 0 ? insights : [{ type: 'info', message: 'Insufficient data for analysis', icon: '📊' }]
  }

  // Calculate Smart Recommendations with Advanced Logic
  const getSmartRecommendations = (kpi: KPIRecord) => {
    const recommendations = []
    
    // Progress-based Recommendations
    if (kpi.progress_percentage !== undefined && kpi.progress_percentage < 50) {
      recommendations.push({ type: 'action', message: 'Increase resource allocation', icon: '🚀' })
      recommendations.push({ type: 'action', message: 'Review timeline planning', icon: '📋' })
    }
    
    // Financial Recommendations
    if (kpi.variance_percentage !== undefined && kpi.variance_percentage > 15) {
      recommendations.push({ type: 'action', message: 'Review cost structure', icon: '💰' })
      recommendations.push({ type: 'action', message: 'Analyze overrun causes', icon: '📊' })
    }
    
    // Timeline Recommendations
    if (kpi.target_date && kpi.actual_date) {
      const targetDate = new Date(kpi.target_date)
      const actualDate = new Date(kpi.actual_date)
      const daysDiff = Math.ceil((actualDate.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysDiff > 14) {
        recommendations.push({ type: 'action', message: 'Accelerate work pace', icon: '⏰' })
        recommendations.push({ type: 'action', message: 'Increase team size', icon: '👥' })
      }
    }
    
    // Quality Recommendations
    if (kpi.progress_percentage !== undefined && kpi.progress_percentage > 90) {
      recommendations.push({ type: 'action', message: 'Focus on quality', icon: '⭐' })
      recommendations.push({ type: 'action', message: 'Final review', icon: '🔍' })
    }
    
    return recommendations.length > 0 ? recommendations : [{ type: 'info', message: 'Everything is going well', icon: '✅' }]
  }

  // Format date helper
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    try {
      return new Date(dateString).toLocaleDateString('en-US')
    } catch {
      return 'Invalid Date'
    }
  }

  // Access raw KPI data from database row if available
  const getKPIField = (kpi: KPIRecord, fieldName: string): any => {
    const raw = (kpi as any).raw || kpi
    return raw[fieldName] || raw[fieldName.replace(/\s+/g, ' ')] || (kpi as any)[fieldName] || ''
  }

  // Helper to get week/month/year from date
  const getDateParts = (dateString: string) => {
    if (!dateString) return { week: 'N/A', month: 'N/A', year: 'N/A' }
    try {
      const date = new Date(dateString)
      const week = Math.ceil(date.getDate() / 7)
      const month = date.toLocaleString('en-US', { month: 'short' })
      const year = date.getFullYear()
      return { week: `Week ${week}`, month, year: year.toString() }
    } catch {
      return { week: 'N/A', month: 'N/A', year: 'N/A' }
    }
  }

  // Render cell content based on column
  const renderCell = (kpi: KPIRecord, column: ColumnConfig) => {
    switch (column.id) {
      case 'select':
        return (
          <input
            type="checkbox"
            checked={selectedIds.includes(kpi.id)}
            onChange={(e) => handleSelectOne(kpi.id, e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        )
      
      case 'activity_details':
        const project = projects.find(p => p.project_code === kpi.project_code)
        const projectFullName = getProjectName(kpi.project_code || '') || kpi.project_full_code || kpi.project_code || 'N/A'
        return (
          <div className="space-y-1">
            <div className="text-xs text-gray-600 dark:text-gray-400">Project: {projectFullName}</div>
            <div className="font-medium text-gray-900 dark:text-white text-sm">
              {kpi.activity_name || 'N/A'}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Zone #: {kpi.zone || getKPIField(kpi, 'Zone') || getKPIField(kpi, 'Zone Number') || 'N/A'}
            </div>
          </div>
        )
      
      case 'date':
        const activityDate = kpi.activity_date || kpi.target_date || kpi.actual_date || ''
        return (
          <div className="text-sm text-gray-900 dark:text-white">
            {activityDate ? formatDate(activityDate) : 'N/A'}
          </div>
        )
      
      case 'input_type':
        return (
          <div className="flex items-center gap-2">
            {kpi.input_type === 'Planned' ? (
              <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400">
                Planned
              </span>
            ) : (
              <span className="px-2 py-1 text-xs font-medium rounded bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                Actual
              </span>
            )}
          </div>
        )
      
      case 'unit':
        return (
          <div className="text-sm text-gray-900 dark:text-white">
            {kpi.unit || 'N/A'}
          </div>
        )
      
      case 'quantities':
        return (
          <div className="space-y-1">
            <div className="text-xs text-gray-600 dark:text-gray-400">Quantity: {kpi.quantity || 0}</div>
            {kpi.drilled_meters && (
              <div className="text-xs text-gray-600 dark:text-gray-400">Drilled Meters: {kpi.drilled_meters}m</div>
            )}
          </div>
        )
      
      case 'value':
        const kpiValue = kpi.value || kpi.actual_value || kpi.planned_value || 0
        return (
          <div className="text-sm text-gray-900 dark:text-white">
            ${kpiValue.toLocaleString()}
          </div>
        )
      
      case 'virtual_value':
        const virtualMaterialValue = getKPIField(kpi, 'Virtual Material Value') || getKPIField(kpi, 'Virtual Material') || 0
        const baseValue = kpi.value || kpi.actual_value || kpi.planned_value || 0
        const virtualMaterialValueNum = parseFloat(String(virtualMaterialValue).replace(/,/g, '')) || 0
        const baseValueNum = parseFloat(String(baseValue).replace(/,/g, '')) || 0
        const totalVirtualValue = virtualMaterialValueNum + baseValueNum
        return (
          <div className="space-y-1">
            <div className="text-xs text-gray-600 dark:text-gray-400">Virtual Material: ${virtualMaterialValueNum.toLocaleString()}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Value: ${baseValueNum.toLocaleString()}</div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">Total: ${totalVirtualValue.toLocaleString()}</div>
          </div>
        )
      
      case 'activity_commencement_relation':
        const activityTiming = kpi.activity_timing || getKPIField(kpi, 'Activity Timing') || 'post-commencement'
        return (
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 text-xs font-medium rounded ${
              activityTiming === 'pre-commencement' 
                ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300' 
                : activityTiming === 'post-completion'
                ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
            }`}>
              {activityTiming === 'pre-commencement' ? 'Pre-Commencement' : 
               activityTiming === 'post-completion' ? 'Post-Completion' : 'Post-Commencement'}
            </span>
          </div>
        )
      
      case 'activity_division':
        const activityDiv = kpi.activity || kpi.section || getKPIField(kpi, 'Activity Division') || 'N/A'
        return (
          <div className="text-sm text-gray-900 dark:text-white">
            {activityDiv}
          </div>
        )
      
      case 'activity_scope':
        const activityScope = getKPIField(kpi, 'Activity Scope') || getKPIField(kpi, 'Scope') || kpi.section || 'N/A'
        return (
          <div className="text-sm text-gray-900 dark:text-white">
            {activityScope}
          </div>
        )
      
      case 'key_dates':
        const dateForParts = kpi.activity_date || kpi.target_date || kpi.actual_date || ''
        const dateParts = getDateParts(dateForParts)
        return (
          <div className="space-y-1">
            <div className="text-xs text-gray-600 dark:text-gray-400">Week: {dateParts.week}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Month: {dateParts.month}</div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">Year: {dateParts.year}</div>
          </div>
        )
      
      case 'cumulative_quantity':
        const dailyCumulative = getKPIField(kpi, 'Daily Cumulative') || getKPIField(kpi, 'Daily Cumulative Quantity') || 0
        const weeklyCumulative = getKPIField(kpi, 'Weekly Cumulative') || getKPIField(kpi, 'Weekly Cumulative Quantity') || 0
        const monthlyCumulative = getKPIField(kpi, 'Monthly Cumulative') || getKPIField(kpi, 'Monthly Cumulative Quantity') || 0
        return (
          <div className="space-y-1">
            <div className="text-xs text-gray-600 dark:text-gray-400">Daily: {dailyCumulative}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Weekly: {weeklyCumulative}</div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">Monthly: {monthlyCumulative}</div>
          </div>
        )
      
      case 'cumulative_value':
        const dailyCumulativeValue = getKPIField(kpi, 'Daily Cumulative Value') || 0
        const weeklyCumulativeValue = getKPIField(kpi, 'Weekly Cumulative Value') || 0
        const monthlyCumulativeValue = getKPIField(kpi, 'Monthly Cumulative Value') || 0
        const dailyCumulativeValueNum = parseFloat(String(dailyCumulativeValue).replace(/,/g, '')) || 0
        const weeklyCumulativeValueNum = parseFloat(String(weeklyCumulativeValue).replace(/,/g, '')) || 0
        const monthlyCumulativeValueNum = parseFloat(String(monthlyCumulativeValue).replace(/,/g, '')) || 0
        return (
          <div className="space-y-1">
            <div className="text-xs text-gray-600 dark:text-gray-400">Daily: ${dailyCumulativeValueNum.toLocaleString()}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Weekly: ${weeklyCumulativeValueNum.toLocaleString()}</div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">Monthly: ${monthlyCumulativeValueNum.toLocaleString()}</div>
          </div>
        )
      
      case 'actions':
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(kpi)}
              className="text-blue-600 hover:text-blue-700"
            >
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(kpi.id)}
              className="text-red-600 hover:text-red-700"
            >
              Delete
            </Button>
          </div>
        )
      
      default:
        return (
          <span className="text-gray-500 dark:text-gray-400 text-sm">
            N/A
          </span>
        )
    }
  }

  const visibleColumns = columns.filter(col => col.visible).sort((a, b) => a.order - b.order)

  return (
    <div className="space-y-4">
      {/* Header with Customization Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            KPI Records ({kpis.length})
          </h3>
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {selectedIds.length} selected
              </span>
              {onBulkDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkDelete}
                  className="text-red-600 hover:text-red-700"
                >
                  Delete Selected
                </Button>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCustomizer(true)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Customize Columns
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              {visibleColumns.map((column) => (
                <th
                  key={column.id}
                  className="px-6 py-4 text-left text-base font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 min-w-[120px]"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {kpis.map((kpi) => (
              <tr
                key={kpi.id}
                className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                {visibleColumns.map((column) => (
                  <td
                    key={column.id}
                    className="px-6 py-4 text-base"
                  >
                    {renderCell(kpi, column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Column Customizer Modal */}
      {showCustomizer && (
        <ColumnCustomizer
          columns={columns}
          onColumnsChange={saveConfiguration}
          onClose={() => setShowCustomizer(false)}
          title="Customize KPI Table Columns"
          storageKey="kpi"
        />
      )}
    </div>
  )
}