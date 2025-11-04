'use client'

import { useState, useEffect } from 'react'
import { BOQActivity, Project } from '@/lib/supabase'
import { ColumnCustomizer, ColumnConfig } from '@/components/ui/ColumnCustomizer'
import { useColumnCustomization } from '@/lib/useColumnCustomization'
import { Button } from '@/components/ui/Button'
import { PermissionButton } from '@/components/ui/PermissionButton'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { PermissionGuard } from '@/components/common/PermissionGuard'
import { CheckCircle, Clock, AlertCircle, Calendar, Building, Activity, TrendingUp, Target, Info, Filter, X } from 'lucide-react'

interface BOQTableWithCustomizationProps {
  activities: BOQActivity[]
  projects: Project[]
  onEdit: (activity: BOQActivity) => void
  onDelete: (id: string) => void
  onBulkDelete?: (ids: string[]) => void
  allKPIs?: any[] // ✅ Add KPIs to calculate Actual Dates
}

// Default column configuration for BOQ Activities
const defaultBOQColumns: ColumnConfig[] = [
  { id: 'select', label: 'Select', visible: true, order: 0, fixed: true, width: '60px' },
  { id: 'activity_details', label: 'Activity Details', visible: true, order: 1, width: '250px' },
  { id: 'quantities', label: 'Quantities', visible: true, order: 2, width: '180px' },
  { id: 'activity_value', label: 'Activity Value', visible: true, order: 3, width: '150px' },
  { id: 'planned_dates', label: 'Planned Dates', visible: true, order: 4, width: '180px' },
  { id: 'actual_dates', label: 'Actual Dates', visible: true, order: 5, width: '180px' },
  { id: 'progress_summary', label: 'Progress Summary', visible: true, order: 6, width: '180px' },
  { id: 'work_value_status', label: 'Work Value Status', visible: true, order: 7, width: '200px' },
  { id: 'activity_status', label: 'Activity Status', visible: true, order: 8, width: '150px' },
  { id: 'actions', label: 'Actions', visible: true, order: 9, fixed: true, width: '150px' }
]

export function BOQTableWithCustomization({ 
  activities, 
  projects, 
  onEdit, 
  onDelete, 
  onBulkDelete,
  allKPIs = [] // ✅ Add KPIs prop
}: BOQTableWithCustomizationProps) {
  const guard = usePermissionGuard()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showCustomizer, setShowCustomizer] = useState(false)
  
  const { 
    columns, 
    saveConfiguration, 
    resetToDefault 
  } = useColumnCustomization({ 
    defaultColumns: defaultBOQColumns, 
    storageKey: 'boq' 
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
      setSelectedIds(activities.map(activity => activity.id))
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
  const calculateAdvancedPerformanceScore = (activity: BOQActivity) => {
    let score = 0
    let factors = 0
    
    // Progress Factor (30%)
    if (activity.activity_progress_percentage !== undefined) {
      score += (activity.activity_progress_percentage / 100) * 30
      factors += 30
    }
    
    // Timeline Factor (25%)
    if (activity.activity_planned_start_date && activity.activity_planned_completion_date) {
      const startDate = new Date(activity.activity_planned_start_date)
      const endDate = new Date(activity.activity_planned_completion_date)
      const today = new Date()
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      const elapsedDays = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      const progressRatio = Math.min(1, Math.max(0, elapsedDays / totalDays))
      
      if (progressRatio <= 0.5) score += 25 // On track
      else if (progressRatio <= 0.75) score += 20 // Slightly behind
      else if (progressRatio <= 1.0) score += 15 // Behind schedule
      else score += 5 // Very behind
      factors += 25
    }
    
    // Financial Factor (25%)
    if (activity.planned_value && activity.earned_value) {
      const variance = ((activity.earned_value - activity.planned_value) / activity.planned_value) * 100
      if (variance <= 5) score += 25 // Within 5% budget
      else if (variance <= 15) score += 20 // Within 15% budget
      else if (variance <= 30) score += 15 // Within 30% budget
      else if (variance <= 50) score += 10 // Within 50% budget
      else score += 5 // Over budget
      factors += 25
    }
    
    // Quality Factor (20%)
    if (activity.activity_progress_percentage !== undefined) {
      if (activity.activity_progress_percentage >= 95) score += 20 // Excellent
      else if (activity.activity_progress_percentage >= 85) score += 15 // Very good
      else if (activity.activity_progress_percentage >= 70) score += 10 // Good
      else if (activity.activity_progress_percentage >= 50) score += 5 // Average
      factors += 20
    }
    
    return factors > 0 ? Math.min(100, Math.max(0, (score / factors) * 100)) : 0
  }

  // Calculate Efficiency with Advanced Metrics
  const calculateAdvancedEfficiency = (activity: BOQActivity) => {
    let efficiency = 0
    let metrics = 0
    
    // Quantity Efficiency (40%)
    if (activity.total_units && activity.actual_units) {
      const rate = activity.actual_units / activity.total_units
      if (rate > 1.2) efficiency += 40 // 20% above target
      else if (rate > 1.0) efficiency += 35 // At or above target
      else if (rate > 0.8) efficiency += 25 // Within 20% of target
      else if (rate > 0.6) efficiency += 15 // Within 40% of target
      else efficiency += 5 // Below target
      metrics += 40
    }
    
    // Time Efficiency (35%)
    if (activity.activity_planned_start_date && activity.activity_planned_completion_date) {
      const startDate = new Date(activity.activity_planned_start_date)
      const endDate = new Date(activity.activity_planned_completion_date)
      const today = new Date()
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      const elapsedDays = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      const progressRatio = Math.min(1, Math.max(0, elapsedDays / totalDays))
      
      if (progressRatio <= 0.5) efficiency += 35 // On time
      else if (progressRatio <= 0.75) efficiency += 30 // 3 days late
      else if (progressRatio <= 1.0) efficiency += 25 // 1 week late
      else if (progressRatio <= 1.5) efficiency += 20 // 2 weeks late
      else if (progressRatio <= 2.0) efficiency += 15 // 1 month late
      else efficiency += 5 // Very late
      metrics += 35
    }
    
    // Resource Efficiency (25%)
    if (activity.activity_progress_percentage !== undefined && activity.activity_progress_percentage > 0) {
      const resourceEfficiency = activity.activity_progress_percentage / 100
      efficiency += resourceEfficiency * 25
      metrics += 25
    }
    
    return metrics > 0 ? Math.min(100, Math.max(0, (efficiency / metrics) * 100)) : 0
  }

  // Calculate Risk Level with Advanced Assessment
  const calculateAdvancedRiskLevel = (activity: BOQActivity) => {
    let riskScore = 0
    let riskFactors = 0
    
    // Progress Risk (30%)
    if (activity.activity_progress_percentage !== undefined) {
      if (activity.activity_progress_percentage < 25) riskScore += 30
      else if (activity.activity_progress_percentage < 50) riskScore += 20
      else if (activity.activity_progress_percentage < 75) riskScore += 10
      riskFactors += 30
    }
    
    // Timeline Risk (25%)
    if (activity.activity_planned_start_date && activity.activity_planned_completion_date) {
      const startDate = new Date(activity.activity_planned_start_date)
      const endDate = new Date(activity.activity_planned_completion_date)
      const today = new Date()
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      const elapsedDays = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      const progressRatio = Math.min(1, Math.max(0, elapsedDays / totalDays))
      
      if (progressRatio > 1.5) riskScore += 25
      else if (progressRatio > 1.2) riskScore += 20
      else if (progressRatio > 1.0) riskScore += 15
      else if (progressRatio > 0.8) riskScore += 10
      else if (progressRatio > 0.5) riskScore += 5
      riskFactors += 25
    }
    
    // Financial Risk (25%)
    if (activity.variance_works_value !== undefined) {
      const variancePercentage = Math.abs(activity.variance_works_value / activity.planned_value) * 100
      if (variancePercentage > 50) riskScore += 25
      else if (variancePercentage > 25) riskScore += 20
      else if (variancePercentage > 15) riskScore += 15
      else if (variancePercentage > 5) riskScore += 10
      riskFactors += 25
    }
    
    // Quality Risk (20%)
    if (activity.activity_progress_percentage !== undefined) {
      if (activity.activity_progress_percentage < 30) riskScore += 20
      else if (activity.activity_progress_percentage < 50) riskScore += 15
      else if (activity.activity_progress_percentage < 70) riskScore += 10
      else if (activity.activity_progress_percentage < 85) riskScore += 5
      riskFactors += 20
    }
    
    const riskPercentage = riskFactors > 0 ? (riskScore / riskFactors) * 100 : 0
    
    if (riskPercentage >= 70) return { level: 'high', score: riskPercentage, color: 'red' }
    if (riskPercentage >= 40) return { level: 'medium', score: riskPercentage, color: 'yellow' }
    if (riskPercentage >= 20) return { level: 'low', score: riskPercentage, color: 'green' }
    return { level: 'minimal', score: riskPercentage, color: 'blue' }
  }

  // Calculate Smart Insights with Advanced Logic
  const getSmartInsights = (activity: BOQActivity) => {
    const insights = []
    
    // Progress Insights
    if (activity.activity_progress_percentage !== undefined) {
      if (activity.activity_progress_percentage >= 100) {
        insights.push({ type: 'success', message: 'Activity completed successfully', icon: '🎉' })
      } else if (activity.activity_progress_percentage >= 90) {
        insights.push({ type: 'warning', message: 'Near completion', icon: '🔥' })
      } else if (activity.activity_progress_percentage >= 75) {
        insights.push({ type: 'info', message: 'Excellent progress', icon: '⚡' })
      } else if (activity.activity_progress_percentage >= 50) {
        insights.push({ type: 'info', message: 'Good progress', icon: '📈' })
      } else if (activity.activity_progress_percentage >= 25) {
        insights.push({ type: 'warning', message: 'Promising start', icon: '🚀' })
      } else {
        insights.push({ type: 'info', message: 'Just started', icon: '⏳' })
      }
    }
    
    // Financial Insights
    if (activity.variance_works_value !== undefined) {
      const variancePercentage = (activity.variance_works_value / activity.planned_value) * 100
      if (variancePercentage > 20) {
        insights.push({ type: 'error', message: 'Budget overrun', icon: '💰' })
      } else if (variancePercentage > 5) {
        insights.push({ type: 'warning', message: 'Approaching budget limit', icon: '⚠️' })
      } else if (variancePercentage > -5) {
        insights.push({ type: 'success', message: 'Within budget', icon: '✅' })
      } else {
        insights.push({ type: 'success', message: 'Budget savings', icon: '💎' })
      }
    }
    
    // Timeline Insights
    if (activity.activity_planned_start_date && activity.activity_planned_completion_date) {
      const startDate = new Date(activity.activity_planned_start_date)
      const endDate = new Date(activity.activity_planned_completion_date)
      const today = new Date()
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      const elapsedDays = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      const progressRatio = Math.min(1, Math.max(0, elapsedDays / totalDays))
      
      if (progressRatio > 1.5) {
        insights.push({ type: 'error', message: 'Major delay', icon: '🚨' })
      } else if (progressRatio > 1.0) {
        insights.push({ type: 'warning', message: 'Behind schedule', icon: '⏰' })
      } else if (progressRatio > 0.8) {
        insights.push({ type: 'info', message: 'On track', icon: '📅' })
      } else {
        insights.push({ type: 'success', message: 'Ahead of schedule', icon: '🎯' })
      }
    }
    
    return insights.length > 0 ? insights : [{ type: 'info', message: 'Insufficient data for analysis', icon: '📊' }]
  }

  // Calculate Smart Recommendations with Advanced Logic
  const getSmartRecommendations = (activity: BOQActivity) => {
    const recommendations = []
    
    // Progress-based Recommendations
    if (activity.activity_progress_percentage !== undefined && activity.activity_progress_percentage < 50) {
      recommendations.push({ type: 'action', message: 'Increase resource allocation', icon: '🚀' })
      recommendations.push({ type: 'action', message: 'Review timeline planning', icon: '📋' })
    }
    
    // Financial Recommendations
    if (activity.variance_works_value !== undefined && activity.variance_works_value > activity.planned_value * 0.15) {
      recommendations.push({ type: 'action', message: 'Review cost structure', icon: '💰' })
      recommendations.push({ type: 'action', message: 'Analyze overrun causes', icon: '📊' })
    }
    
    // Timeline Recommendations
    if (activity.activity_planned_start_date && activity.activity_planned_completion_date) {
      const startDate = new Date(activity.activity_planned_start_date)
      const endDate = new Date(activity.activity_planned_completion_date)
      const today = new Date()
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      const elapsedDays = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      const progressRatio = Math.min(1, Math.max(0, elapsedDays / totalDays))
      
      if (progressRatio > 1.2) {
        recommendations.push({ type: 'action', message: 'Accelerate work pace', icon: '⏰' })
        recommendations.push({ type: 'action', message: 'Increase team size', icon: '👥' })
      }
    }
    
    // Quality Recommendations
    if (activity.activity_progress_percentage !== undefined && activity.activity_progress_percentage > 90) {
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

  // Access raw activity data from database row if available
  const getActivityField = (activity: BOQActivity, fieldName: string): any => {
    const raw = (activity as any).raw || activity
    return raw[fieldName] || raw[fieldName.replace(/\s+/g, ' ')] || (activity as any)[fieldName] || ''
  }

  // Render cell content based on column
  const renderCell = (activity: BOQActivity, column: ColumnConfig) => {
    const project = projects.find(p => p.project_code === activity.project_code)
    const projectFullName = getProjectName(activity.project_code) || activity.project_full_code || activity.project_code
    
    switch (column.id) {
      case 'select':
        return (
          <input
            type="checkbox"
            checked={selectedIds.includes(activity.id)}
            onChange={(e) => handleSelectOne(activity.id, e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        )
      
      case 'activity_details':
        // Get Zone from multiple sources
        const rawActivityDetails = (activity as any).raw || {}
        const zoneValue = activity.zone_number || 
                         activity.zone_ref || 
                         rawActivityDetails['Zone Number'] ||
                         rawActivityDetails['Zone Ref'] ||
                         rawActivityDetails['Zone #'] ||
                         'N/A'
        
        return (
          <div className="space-y-1">
            <div className="text-xs text-gray-600 dark:text-gray-400">Project: {projectFullName}</div>
            <div className="font-medium text-gray-900 dark:text-white text-sm">
              {activity.activity_name || 'N/A'}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Zone {zoneValue}
            </div>
          </div>
        )
      
      case 'quantities':
        // ✅ Get quantities from multiple sources (same logic as other columns)
        const rawActivityQuantities = (activity as any).raw || {}
        
        // Get Planned Units
        const plannedUnitsQuantities = activity.planned_units || 
                                      parseFloat(String(rawActivityQuantities['Planned Units'] || '0').replace(/,/g, '')) || 
                                      0
        
        // ✅ Total = Planned (same as Planned Units)
        const totalUnitsQuantities = plannedUnitsQuantities
        
        // Get Actual Units from multiple sources
        let actualUnitsQuantities = activity.actual_units || 
                                  parseFloat(String(rawActivityQuantities['Actual Units'] || '0').replace(/,/g, '')) || 
                                  0
        
        // ✅ If actual_units is 0, try to get from KPIs (Actual KPIs)
        if (actualUnitsQuantities === 0 && allKPIs.length > 0) {
          // Match KPIs to this activity (same logic as progress_summary and work_value_status)
          const activityKPIsQuantities = allKPIs.filter((kpi: any) => {
            const rawKPIQuantities = (kpi as any).raw || {}
            
            const kpiProjectCodeQuantities = (kpi.project_code || kpi['Project Code'] || rawKPIQuantities['Project Code'] || '').toString().trim().toUpperCase()
            const kpiProjectFullCodeQuantities = (kpi.project_full_code || kpi['Project Full Code'] || rawKPIQuantities['Project Full Code'] || '').toString().trim().toUpperCase()
            const activityProjectCodeQuantities = (activity.project_code || '').toString().trim().toUpperCase()
            const activityProjectFullCodeQuantities = (activity.project_full_code || activity.project_code || '').toString().trim().toUpperCase()
            
            const kpiActivityNameQuantities = (kpi.activity_name || kpi['Activity Name'] || kpi.activity || rawKPIQuantities['Activity Name'] || '').toLowerCase().trim()
            const activityNameQuantities = (activity.activity_name || activity.activity || '').toLowerCase().trim()
            
            const kpiZoneQuantities = (kpi.zone || kpi['Zone'] || kpi.section || rawKPIQuantities['Zone'] || '').toLowerCase().trim()
            const activityZoneQuantities = (activity.zone_ref || activity.zone_number || '').toLowerCase().trim()
            
            const projectMatchQuantities = (
              (kpiProjectCodeQuantities && activityProjectCodeQuantities && kpiProjectCodeQuantities === activityProjectCodeQuantities) ||
              (kpiProjectFullCodeQuantities && activityProjectFullCodeQuantities && kpiProjectFullCodeQuantities === activityProjectFullCodeQuantities) ||
              (kpiProjectCodeQuantities && activityProjectFullCodeQuantities && kpiProjectCodeQuantities === activityProjectFullCodeQuantities) ||
              (kpiProjectFullCodeQuantities && activityProjectCodeQuantities && kpiProjectFullCodeQuantities === activityProjectCodeQuantities) ||
              (kpiProjectCodeQuantities && activityProjectCodeQuantities && (
                kpiProjectCodeQuantities.includes(activityProjectCodeQuantities) || 
                activityProjectCodeQuantities.includes(kpiProjectCodeQuantities)
              ))
            )
            
            if (!projectMatchQuantities) return false
            
            const activityMatchQuantities = kpiActivityNameQuantities && activityNameQuantities && 
              (kpiActivityNameQuantities === activityNameQuantities || 
               kpiActivityNameQuantities.includes(activityNameQuantities) || 
               activityNameQuantities.includes(kpiActivityNameQuantities))
            
            const zoneMatchQuantities = kpiZoneQuantities && activityZoneQuantities && 
              (kpiZoneQuantities === activityZoneQuantities || 
               kpiZoneQuantities.includes(activityZoneQuantities) || 
               activityZoneQuantities.includes(kpiZoneQuantities))
            
            return activityMatchQuantities || zoneMatchQuantities
          })
          
          // Sum actual quantities from Actual KPIs
          const actualKPIsQuantities = activityKPIsQuantities.filter((kpi: any) => {
            const inputType = (kpi.input_type || kpi['Input Type'] || kpi.raw?.['Input Type'] || '').toLowerCase()
            return inputType === 'actual'
          })
          
          if (actualKPIsQuantities.length > 0) {
            actualUnitsQuantities = actualKPIsQuantities.reduce((sum: number, kpi: any) => {
              const quantity = parseFloat(String(kpi.quantity || kpi['Quantity'] || kpi.raw?.['Quantity'] || '0').replace(/,/g, '')) || 0
              return sum + quantity
            }, 0)
          }
        }
        
        // ✅ Calculate Remaining: Planned Units - Actual Units
        const remainingQuantity = plannedUnitsQuantities - actualUnitsQuantities
        
        // ✅ DEBUG: Log calculation in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`📊 [BOQ] Quantities for "${activity.activity_name}":`, {
            totalUnits: totalUnitsQuantities,
            plannedUnits: plannedUnitsQuantities,
            actualUnitsFromBOQ: activity.actual_units,
            actualUnitsFromKPIs: actualUnitsQuantities !== activity.actual_units ? actualUnitsQuantities : 'N/A',
            finalActualUnits: actualUnitsQuantities,
            remaining: remainingQuantity
          })
        }
        
        return (
          <div className="space-y-1">
            <div className="text-xs text-gray-600 dark:text-gray-400">Total: {totalUnitsQuantities.toLocaleString()}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Planned: {plannedUnitsQuantities.toLocaleString()}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Actual: {actualUnitsQuantities.toLocaleString()}</div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">Remaining: {Math.max(0, remainingQuantity).toLocaleString()}</div>
          </div>
        )
      
      case 'activity_value':
        const unitRate = activity.rate || (activity.total_value && activity.planned_units && activity.planned_units > 0 
          ? activity.total_value / activity.planned_units 
          : 0)
        return (
          <div className="space-y-1">
            <div className="text-xs text-gray-600 dark:text-gray-400">Total Value: ${(activity.total_value || 0).toLocaleString()}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Unit: {activity.unit || 'N/A'}</div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">Unit Rate: ${unitRate.toLocaleString()}</div>
          </div>
        )
      
      case 'planned_dates':
        const plannedStart = activity.planned_activity_start_date || activity.activity_planned_start_date || ''
        const plannedEnd = activity.deadline || activity.activity_planned_completion_date || ''
        const plannedDuration = activity.calendar_duration || 0
        return (
          <div className="space-y-1">
            <div className="text-xs text-gray-600 dark:text-gray-400">Start: {plannedStart ? formatDate(plannedStart) : 'N/A'}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Completion: {plannedEnd ? formatDate(plannedEnd) : 'N/A'}</div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">Duration: {plannedDuration} days</div>
          </div>
        )
      
      case 'actual_dates':
        // ✅ Get Actual Dates from KPI Actual (same as Projects table)
        // Priority: 1. KPI Actual dates, 2. Activity fields, 3. N/A
        
        let actualStart = getActivityField(activity, 'Actual Start Date') || getActivityField(activity, 'Actual Start') || ''
        let actualCompletion = getActivityField(activity, 'Actual Completion Date') || getActivityField(activity, 'Actual Completion') || ''
        
        // ✅ METHOD 1: Get from KPI Actual (if available)
        if (allKPIs.length > 0) {
          // ✅ DEBUG: Log matching process
          if (process.env.NODE_ENV === 'development') {
            console.log(`🔍 [BOQ] Actual Dates for activity "${activity.activity_name}":`, {
              activityProjectCode: activity.project_code || activity.project_full_code,
              activityName: activity.activity_name,
              activityZone: activity.zone_ref || activity.zone_number,
              allKPIsCount: allKPIs.length,
              sampleKPI: allKPIs[0] ? {
                projectCode: allKPIs[0].project_code || allKPIs[0]['Project Code'],
                activityName: allKPIs[0].activity_name || allKPIs[0]['Activity Name'],
                zone: allKPIs[0].zone || allKPIs[0]['Zone'],
                inputType: allKPIs[0].input_type || allKPIs[0]['Input Type']
              } : null
            })
          }
          
          // Match KPIs to this activity by:
          // - Project Code/Full Code (must match)
          // - Activity Name OR Zone (flexible matching)
          const activityKPIs = allKPIs.filter((kpi: any) => {
            const rawKPI = (kpi as any).raw || {}
            
            // Get KPI identifiers
            const kpiProjectCode = (kpi.project_code || kpi['Project Code'] || rawKPI['Project Code'] || '').toString().trim().toUpperCase()
            const kpiProjectFullCode = (kpi.project_full_code || kpi['Project Full Code'] || rawKPI['Project Full Code'] || '').toString().trim().toUpperCase()
            
            // Get Activity identifiers
            const activityProjectCode = (activity.project_code || '').toString().trim().toUpperCase()
            const activityProjectFullCode = (activity.project_full_code || activity.project_code || '').toString().trim().toUpperCase()
            
            // Get names
            const kpiActivityName = (kpi.activity_name || kpi['Activity Name'] || kpi.activity || rawKPI['Activity Name'] || '').toLowerCase().trim()
            const activityName = (activity.activity_name || activity.activity || '').toLowerCase().trim()
            
            // Get zones
            const kpiZone = (kpi.zone || kpi['Zone'] || kpi.section || rawKPI['Zone'] || '').toLowerCase().trim()
            const activityZone = (activity.zone_ref || activity.zone_number || '').toLowerCase().trim()
            
            // ✅ STRICT: Project code must match (required)
            const projectMatch = (
              (kpiProjectCode && activityProjectCode && kpiProjectCode === activityProjectCode) ||
              (kpiProjectFullCode && activityProjectFullCode && kpiProjectFullCode === activityProjectFullCode) ||
              (kpiProjectCode && activityProjectFullCode && kpiProjectCode === activityProjectFullCode) ||
              (kpiProjectFullCode && activityProjectCode && kpiProjectFullCode === activityProjectCode) ||
              // Partial match for sub-codes
              (kpiProjectCode && activityProjectCode && (
                kpiProjectCode.includes(activityProjectCode) || 
                activityProjectCode.includes(kpiProjectCode)
              ))
            )
            
            if (!projectMatch) return false
            
            // ✅ FLEXIBLE: Activity name OR Zone match (at least one)
            const activityMatch = kpiActivityName && activityName && 
              (kpiActivityName === activityName || 
               kpiActivityName.includes(activityName) || 
               activityName.includes(kpiActivityName))
            
            const zoneMatch = kpiZone && activityZone && 
              (kpiZone === activityZone || 
               kpiZone.includes(activityZone) || 
               activityZone.includes(kpiZone))
            
            return activityMatch || zoneMatch
          })
          
          // ✅ DEBUG: Log matched KPIs
          if (process.env.NODE_ENV === 'development') {
            console.log(`🔍 [BOQ] Matched KPIs for "${activity.activity_name}":`, {
              matchedKPIsCount: activityKPIs.length,
              matchedKPIs: activityKPIs.slice(0, 3).map((k: any) => ({
                activityName: k.activity_name || k['Activity Name'],
                inputType: k.input_type || k['Input Type'],
                actualDate: k.actual_date || k['Actual Date'],
                day: k.day || k['Day']
              }))
            })
          }
          
          // Filter for Actual KPIs only
          const actualKPIs = activityKPIs.filter((kpi: any) => {
            const inputType = (kpi.input_type || kpi['Input Type'] || kpi.raw?.['Input Type'] || '').toLowerCase()
            return inputType === 'actual'
          })
          
          // ✅ DEBUG: Log Actual KPIs
          if (process.env.NODE_ENV === 'development') {
            console.log(`🔍 [BOQ] Actual KPIs for "${activity.activity_name}":`, {
              actualKPIsCount: actualKPIs.length,
              actualKPIs: actualKPIs.slice(0, 5).map((k: any) => ({
                actualDate: k.actual_date || k['Actual Date'],
                day: k.day || k['Day'],
                rawActualDate: k.raw?.['Actual Date'],
                rawDay: k.raw?.['Day']
              }))
            })
          }
          
          // Get actual dates from KPI Actual
          if (actualKPIs.length > 0) {
            // Helper function to parse date string (same as Projects table)
            const parseDateString = (dateStr: string | null | undefined): Date | null => {
              if (!dateStr || dateStr === '' || dateStr === 'N/A' || dateStr === 'null') {
                return null
              }
              
              try {
                const str = String(dateStr).trim()
                
                // PRIORITY 1: Try ISO format first
                const isoDate = new Date(str)
                if (!isNaN(isoDate.getTime()) && isoDate.getFullYear() > 1900 && isoDate.getFullYear() < 2100) {
                  return isoDate
                }
                
                // PRIORITY 2: Try "DD-Mon-YY" format (e.g., "23-Feb-24", "15-Jan-25")
                const dateMatch = str.match(/(\d{1,2})[-/](\w+)[-/](\d{2,4})/)
                if (dateMatch) {
                  const day = parseInt(dateMatch[1], 10)
                  const monthName = dateMatch[2]
                  let year = parseInt(dateMatch[3], 10)
                  
                  const monthMap: { [key: string]: number } = {
                    'jan': 0, 'january': 0, 'feb': 1, 'february': 1, 'mar': 2, 'march': 2,
                    'apr': 3, 'april': 3, 'may': 4, 'jun': 5, 'june': 5,
                    'jul': 6, 'july': 6, 'aug': 7, 'august': 7, 'sep': 8, 'september': 8, 'sept': 8,
                    'oct': 9, 'october': 9, 'nov': 10, 'november': 10, 'dec': 11, 'december': 11
                  }
                  
                  const monthNameLower = monthName.toLowerCase()
                  const month = monthMap[monthNameLower] !== undefined 
                    ? monthMap[monthNameLower]
                    : monthMap[monthNameLower.substring(0, 3)]
                  
                  if (month !== undefined) {
                    if (year < 100) {
                      year = year < 50 ? 2000 + year : 1900 + year
                    }
                    const parsedDate = new Date(year, month, day)
                    if (!isNaN(parsedDate.getTime()) && parsedDate.getFullYear() > 1900 && parsedDate.getFullYear() < 2100) {
                      return parsedDate
                    }
                  }
                }
                
                // PRIORITY 3: Try Day number (e.g., "Day 1", "1")
                const dayMatch = String(str).match(/(?:day\s*)?(\d+)/i)
                if (dayMatch) {
                  const dayNum = parseInt(dayMatch[1], 10)
                  // Estimate date from day number (assuming project start + day number)
                  const plannedStart = activity.planned_activity_start_date || activity.deadline
                  if (plannedStart) {
                    try {
                      const startDate = new Date(plannedStart)
                      if (!isNaN(startDate.getTime())) {
                        const estimatedDate = new Date(startDate)
                        estimatedDate.setDate(estimatedDate.getDate() + dayNum - 1)
                        return estimatedDate
                      }
                    } catch (e) {
                      // Ignore
                    }
                  }
                }
                
              } catch (error) {
                // Ignore errors
              }
              
              return null
            }
            
            // Sort by date (Day/Actual Date column) to get first and last
            // ✅ Use same method as progressCalculator.getLatestActualDate
            const sortedKPIs = actualKPIs
              .map((kpi: any) => {
                const rawKPI = (kpi as any).raw || {}
                
                // Try multiple date sources (in priority order)
                const dateStr = kpi.actual_date || 
                               kpi['Actual Date'] || 
                               rawKPI['Actual Date'] ||
                               kpi.day || 
                               kpi['Day'] || 
                               rawKPI['Day'] ||
                               ''
                
                const date = parseDateString(dateStr)
                
                // ✅ DEBUG: Log date parsing for first few KPIs
                if (process.env.NODE_ENV === 'development' && actualKPIs.indexOf(kpi) < 3) {
                  console.log(`📅 [BOQ] Parsing date for KPI:`, {
                    dateStr: dateStr,
                    actualDate: kpi.actual_date || kpi['Actual Date'],
                    day: kpi.day || kpi['Day'],
                    rawActualDate: rawKPI['Actual Date'],
                    rawDay: rawKPI['Day'],
                    parsedDate: date ? date.toISOString() : 'null'
                  })
                }
                
                return { kpi, date, dateStr }
              })
              .filter(item => item.date !== null && !isNaN(item.date!.getTime()))
              .sort((a, b) => {
                if (!a.date || !b.date) return 0
                return a.date.getTime() - b.date.getTime()
              })
            
            // ✅ DEBUG: Log sorted KPIs
            if (process.env.NODE_ENV === 'development') {
              console.log(`📅 [BOQ] Sorted Actual KPIs for "${activity.activity_name}":`, {
                sortedKPIsCount: sortedKPIs.length,
                firstKPI: sortedKPIs[0] ? {
                  date: sortedKPIs[0].date?.toISOString(),
                  dateStr: sortedKPIs[0].dateStr
                } : null,
                lastKPI: sortedKPIs.length > 0 ? {
                  date: sortedKPIs[sortedKPIs.length - 1].date?.toISOString(),
                  dateStr: sortedKPIs[sortedKPIs.length - 1].dateStr
                } : null
              })
            }
            
            if (sortedKPIs.length > 0) {
              // First KPI date = Actual Start
              const firstKPI = sortedKPIs[0]
              if (firstKPI.date) {
                actualStart = firstKPI.date.toISOString()
              }
              
              // Last KPI date = Actual Completion
              const lastKPI = sortedKPIs[sortedKPIs.length - 1]
              if (lastKPI.date) {
                actualCompletion = lastKPI.date.toISOString()
              }
            }
          }
        }
        
        let actualDuration = 0
        if (actualStart && actualCompletion) {
          const start = new Date(actualStart)
          const end = new Date(actualCompletion)
          if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          actualDuration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
        }
        }
        
        return (
          <div className="space-y-1">
            <div className="text-xs text-gray-600 dark:text-gray-400">Start: {actualStart ? formatDate(actualStart) : 'N/A'}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Completion: {actualCompletion ? formatDate(actualCompletion) : 'N/A'}</div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">Duration: {actualDuration || 'N/A'} {actualDuration > 0 ? 'days' : ''}</div>
          </div>
        )
      
      case 'progress_summary':
        // ✅ Calculate Progress Summary based on Actual Units vs Planned Units
        const rawActivityProgress = (activity as any).raw || {}
        
        // Get planned units
        const plannedUnitsProgress = activity.planned_units || 
                            parseFloat(String(rawActivityProgress['Planned Units'] || '0').replace(/,/g, '')) || 
                            0
        
        // Get actual units from multiple sources
        let actualUnitsProgress = activity.actual_units || 
                        parseFloat(String(rawActivityProgress['Actual Units'] || '0').replace(/,/g, '')) || 
                        0
        
        // ✅ If actual_units is 0, try to get from KPIs (Actual KPIs)
        if (actualUnitsProgress === 0 && allKPIs.length > 0) {
          // Match KPIs to this activity (same logic as work_value_status)
          const activityKPIsProgress = allKPIs.filter((kpi: any) => {
            const rawKPIProgress = (kpi as any).raw || {}
            
            const kpiProjectCodeProgress = (kpi.project_code || kpi['Project Code'] || rawKPIProgress['Project Code'] || '').toString().trim().toUpperCase()
            const kpiProjectFullCodeProgress = (kpi.project_full_code || kpi['Project Full Code'] || rawKPIProgress['Project Full Code'] || '').toString().trim().toUpperCase()
            const activityProjectCodeProgress = (activity.project_code || '').toString().trim().toUpperCase()
            const activityProjectFullCodeProgress = (activity.project_full_code || activity.project_code || '').toString().trim().toUpperCase()
            
            const kpiActivityNameProgress = (kpi.activity_name || kpi['Activity Name'] || kpi.activity || rawKPIProgress['Activity Name'] || '').toLowerCase().trim()
            const activityNameProgress = (activity.activity_name || activity.activity || '').toLowerCase().trim()
            
            const kpiZoneProgress = (kpi.zone || kpi['Zone'] || kpi.section || rawKPIProgress['Zone'] || '').toLowerCase().trim()
            const activityZoneProgress = (activity.zone_ref || activity.zone_number || '').toLowerCase().trim()
            
            const projectMatchProgress = (
              (kpiProjectCodeProgress && activityProjectCodeProgress && kpiProjectCodeProgress === activityProjectCodeProgress) ||
              (kpiProjectFullCodeProgress && activityProjectFullCodeProgress && kpiProjectFullCodeProgress === activityProjectFullCodeProgress) ||
              (kpiProjectCodeProgress && activityProjectFullCodeProgress && kpiProjectCodeProgress === activityProjectFullCodeProgress) ||
              (kpiProjectFullCodeProgress && activityProjectCodeProgress && kpiProjectFullCodeProgress === activityProjectCodeProgress) ||
              (kpiProjectCodeProgress && activityProjectCodeProgress && (
                kpiProjectCodeProgress.includes(activityProjectCodeProgress) || 
                activityProjectCodeProgress.includes(kpiProjectCodeProgress)
              ))
            )
            
            if (!projectMatchProgress) return false
            
            const activityMatchProgress = kpiActivityNameProgress && activityNameProgress && 
              (kpiActivityNameProgress === activityNameProgress || 
               kpiActivityNameProgress.includes(activityNameProgress) || 
               activityNameProgress.includes(kpiActivityNameProgress))
            
            const zoneMatchProgress = kpiZoneProgress && activityZoneProgress && 
              (kpiZoneProgress === activityZoneProgress || 
               kpiZoneProgress.includes(activityZoneProgress) || 
               activityZoneProgress.includes(kpiZoneProgress))
            
            return activityMatchProgress || zoneMatchProgress
          })
          
          // Sum actual quantities from Actual KPIs
          const actualKPIsProgress = activityKPIsProgress.filter((kpi: any) => {
            const inputType = (kpi.input_type || kpi['Input Type'] || kpi.raw?.['Input Type'] || '').toLowerCase()
            return inputType === 'actual'
          })
          
          if (actualKPIsProgress.length > 0) {
            actualUnitsProgress = actualKPIsProgress.reduce((sum: number, kpi: any) => {
              const quantity = parseFloat(String(kpi.quantity || kpi['Quantity'] || kpi.raw?.['Quantity'] || '0').replace(/,/g, '')) || 0
              return sum + quantity
            }, 0)
          }
        }
        
        // ✅ Calculate Planned Progress: (Planned Units / Total Units) × 100
        const totalUnitsProgress = activity.total_units || 
                          parseFloat(String(rawActivityProgress['Total Units'] || '0').replace(/,/g, '')) || 
                          plannedUnitsProgress || 
                          0
        
        const plannedProgress = totalUnitsProgress > 0 
          ? (plannedUnitsProgress / totalUnitsProgress) * 100 
          : 0
        
        // ✅ Calculate Actual Progress: (Actual Units / Planned Units) × 100
        const actualProgress = plannedUnitsProgress > 0 
          ? (actualUnitsProgress / plannedUnitsProgress) * 100 
          : 0
        
        const varianceProgress = actualProgress - plannedProgress
        
        // ✅ DEBUG: Log calculation in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`📊 [BOQ] Progress Summary for "${activity.activity_name}":`, {
            plannedUnits: plannedUnitsProgress,
            actualUnits: actualUnitsProgress,
            totalUnits: totalUnitsProgress,
            plannedProgress,
            actualProgress,
            variance: varianceProgress
          })
        }
        
        return (
          <div className="space-y-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">Planned</span>
                <span className="font-medium">{plannedProgress.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, Math.max(0, plannedProgress))}%` }}></div>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">Actual</span>
                <span className="font-medium">{actualProgress.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, Math.max(0, actualProgress))}%` }}></div>
              </div>
            </div>
            <div className="text-xs font-medium text-gray-900 dark:text-white">
              Variance: {varianceProgress >= 0 ? '+' : ''}{varianceProgress.toFixed(1)}%
            </div>
          </div>
        )
      
      case 'work_value_status':
        const plannedWorkValueAct = activity.planned_value || activity.total_value || 0
        
        // ✅ Calculate Done = Actual Units × Rate
        // Get actual units from multiple sources
        const rawActivity = (activity as any).raw || {}
        let actualUnits = activity.actual_units || 
                          parseFloat(String(rawActivity['Actual Units'] || '0').replace(/,/g, '')) || 
                          0
        
        // ✅ If actual_units is 0, try to get from KPIs (Actual KPIs)
        if (actualUnits === 0 && allKPIs.length > 0) {
          // Match KPIs to this activity (same logic as actual_dates)
          const activityKPIs = allKPIs.filter((kpi: any) => {
            const rawKPI = (kpi as any).raw || {}
            
            const kpiProjectCode = (kpi.project_code || kpi['Project Code'] || rawKPI['Project Code'] || '').toString().trim().toUpperCase()
            const kpiProjectFullCode = (kpi.project_full_code || kpi['Project Full Code'] || rawKPI['Project Full Code'] || '').toString().trim().toUpperCase()
            const activityProjectCode = (activity.project_code || '').toString().trim().toUpperCase()
            const activityProjectFullCode = (activity.project_full_code || activity.project_code || '').toString().trim().toUpperCase()
            
            const kpiActivityName = (kpi.activity_name || kpi['Activity Name'] || kpi.activity || rawKPI['Activity Name'] || '').toLowerCase().trim()
            const activityName = (activity.activity_name || activity.activity || '').toLowerCase().trim()
            
            const kpiZone = (kpi.zone || kpi['Zone'] || kpi.section || rawKPI['Zone'] || '').toLowerCase().trim()
            const activityZone = (activity.zone_ref || activity.zone_number || '').toLowerCase().trim()
            
            const projectMatch = (
              (kpiProjectCode && activityProjectCode && kpiProjectCode === activityProjectCode) ||
              (kpiProjectFullCode && activityProjectFullCode && kpiProjectFullCode === activityProjectFullCode) ||
              (kpiProjectCode && activityProjectFullCode && kpiProjectCode === activityProjectFullCode) ||
              (kpiProjectFullCode && activityProjectCode && kpiProjectFullCode === activityProjectCode) ||
              (kpiProjectCode && activityProjectCode && (
                kpiProjectCode.includes(activityProjectCode) || 
                activityProjectCode.includes(kpiProjectCode)
              ))
            )
            
            if (!projectMatch) return false
            
            const activityMatch = kpiActivityName && activityName && 
              (kpiActivityName === activityName || 
               kpiActivityName.includes(activityName) || 
               activityName.includes(kpiActivityName))
            
            const zoneMatch = kpiZone && activityZone && 
              (kpiZone === activityZone || 
               kpiZone.includes(activityZone) || 
               activityZone.includes(kpiZone))
            
            return activityMatch || zoneMatch
          })
          
          // Sum actual quantities from Actual KPIs
          const actualKPIs = activityKPIs.filter((kpi: any) => {
            const inputType = (kpi.input_type || kpi['Input Type'] || kpi.raw?.['Input Type'] || '').toLowerCase()
            return inputType === 'actual'
          })
          
          if (actualKPIs.length > 0) {
            actualUnits = actualKPIs.reduce((sum: number, kpi: any) => {
              const quantity = parseFloat(String(kpi.quantity || kpi['Quantity'] || kpi.raw?.['Quantity'] || '0').replace(/,/g, '')) || 0
              return sum + quantity
            }, 0)
          }
        }
        
        // Get rate from multiple sources (same as activity_value column)
        const rate = activity.rate || 
                    (activity.total_value && activity.planned_units && activity.planned_units > 0 
                      ? activity.total_value / activity.planned_units 
                      : 0) ||
                    parseFloat(String(rawActivity['Rate'] || '0').replace(/,/g, '')) ||
                    0
        
        // ✅ Calculate Done = Actual Units × Rate
        const workDoneValueAct = actualUnits * rate
        const varianceWorkValueAct = workDoneValueAct - plannedWorkValueAct
        
        // ✅ DEBUG: Log calculation in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`💰 [BOQ] Work Value Status for "${activity.activity_name}":`, {
            actualUnitsFromBOQ: activity.actual_units,
            actualUnitsFromKPIs: actualUnits !== activity.actual_units ? actualUnits : 'N/A',
            finalActualUnits: actualUnits,
            rate,
            workDoneValueAct,
            plannedWorkValueAct,
            variance: varianceWorkValueAct
          })
        }
        
        return (
          <div className="space-y-1">
            <div className="text-xs text-gray-600 dark:text-gray-400">Planned: ${plannedWorkValueAct.toLocaleString()}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Done: ${workDoneValueAct.toLocaleString()}</div>
            <div className={`text-sm font-medium ${varianceWorkValueAct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              Variance: ${varianceWorkValueAct >= 0 ? '+' : ''}${varianceWorkValueAct.toLocaleString()}
            </div>
          </div>
        )
      
      case 'activity_status':
        // ✅ Calculate Activity Status automatically based on activity state
        const rawActivityStatus = (activity as any).raw || {}
        
        // Get planned and actual units
        const plannedUnitsStatus = activity.planned_units || 
                                  parseFloat(String(rawActivityStatus['Planned Units'] || '0').replace(/,/g, '')) || 
                                  0
        
        let actualUnitsStatus = activity.actual_units || 
                              parseFloat(String(rawActivityStatus['Actual Units'] || '0').replace(/,/g, '')) || 
                              0
        
        // ✅ If actual_units is 0, try to get from KPIs (Actual KPIs)
        if (actualUnitsStatus === 0 && allKPIs.length > 0) {
          // Match KPIs to this activity (same logic as progress_summary)
          const activityKPIsStatus = allKPIs.filter((kpi: any) => {
            const rawKPIStatus = (kpi as any).raw || {}
            
            const kpiProjectCodeStatus = (kpi.project_code || kpi['Project Code'] || rawKPIStatus['Project Code'] || '').toString().trim().toUpperCase()
            const kpiProjectFullCodeStatus = (kpi.project_full_code || kpi['Project Full Code'] || rawKPIStatus['Project Full Code'] || '').toString().trim().toUpperCase()
            const activityProjectCodeStatus = (activity.project_code || '').toString().trim().toUpperCase()
            const activityProjectFullCodeStatus = (activity.project_full_code || activity.project_code || '').toString().trim().toUpperCase()
            
            const kpiActivityNameStatus = (kpi.activity_name || kpi['Activity Name'] || kpi.activity || rawKPIStatus['Activity Name'] || '').toLowerCase().trim()
            const activityNameStatus = (activity.activity_name || activity.activity || '').toLowerCase().trim()
            
            const kpiZoneStatus = (kpi.zone || kpi['Zone'] || kpi.section || rawKPIStatus['Zone'] || '').toLowerCase().trim()
            const activityZoneStatus = (activity.zone_ref || activity.zone_number || '').toLowerCase().trim()
            
            const projectMatchStatus = (
              (kpiProjectCodeStatus && activityProjectCodeStatus && kpiProjectCodeStatus === activityProjectCodeStatus) ||
              (kpiProjectFullCodeStatus && activityProjectFullCodeStatus && kpiProjectFullCodeStatus === activityProjectFullCodeStatus) ||
              (kpiProjectCodeStatus && activityProjectFullCodeStatus && kpiProjectCodeStatus === activityProjectFullCodeStatus) ||
              (kpiProjectFullCodeStatus && activityProjectCodeStatus && kpiProjectFullCodeStatus === activityProjectCodeStatus) ||
              (kpiProjectCodeStatus && activityProjectCodeStatus && (
                kpiProjectCodeStatus.includes(activityProjectCodeStatus) || 
                activityProjectCodeStatus.includes(kpiProjectCodeStatus)
              ))
            )
            
            if (!projectMatchStatus) return false
            
            const activityMatchStatus = kpiActivityNameStatus && activityNameStatus && 
              (kpiActivityNameStatus === activityNameStatus || 
               kpiActivityNameStatus.includes(activityNameStatus) || 
               activityNameStatus.includes(kpiActivityNameStatus))
            
            const zoneMatchStatus = kpiZoneStatus && activityZoneStatus && 
              (kpiZoneStatus === activityZoneStatus || 
               kpiZoneStatus.includes(activityZoneStatus) || 
               activityZoneStatus.includes(kpiZoneStatus))
            
            return activityMatchStatus || zoneMatchStatus
          })
          
          const actualKPIsStatus = activityKPIsStatus.filter((kpi: any) => {
            const inputType = (kpi.input_type || kpi['Input Type'] || kpi.raw?.['Input Type'] || '').toLowerCase()
            return inputType === 'actual'
          })
          
          if (actualKPIsStatus.length > 0) {
            actualUnitsStatus = actualKPIsStatus.reduce((sum: number, kpi: any) => {
              const quantity = parseFloat(String(kpi.quantity || kpi['Quantity'] || kpi.raw?.['Quantity'] || '0').replace(/,/g, '')) || 0
              return sum + quantity
            }, 0)
          }
        }
        
        // Get dates for delay calculation
        const plannedStartDate = activity.planned_activity_start_date || activity.activity_planned_start_date || ''
        const plannedEndDate = activity.deadline || activity.activity_planned_completion_date || ''
        
        // ✅ Get actual dates (same logic as actual_dates case)
        let actualStartDate = getActivityField(activity, 'Actual Start Date') || getActivityField(activity, 'Actual Start') || ''
        let actualEndDate = getActivityField(activity, 'Actual Completion Date') || getActivityField(activity, 'Actual Completion') || ''
        
        // ✅ If not found in activity fields, try to get from KPIs
        if ((!actualStartDate || !actualEndDate) && allKPIs.length > 0) {
          const activityKPIsForDates = allKPIs.filter((kpi: any) => {
            const rawKPIForDates = (kpi as any).raw || {}
            
            const kpiProjectCodeForDates = (kpi.project_code || kpi['Project Code'] || rawKPIForDates['Project Code'] || '').toString().trim().toUpperCase()
            const activityProjectCodeForDates = (activity.project_code || '').toString().trim().toUpperCase()
            
            const kpiActivityNameForDates = (kpi.activity_name || kpi['Activity Name'] || kpi.activity || rawKPIForDates['Activity Name'] || '').toLowerCase().trim()
            const activityNameForDates = (activity.activity_name || activity.activity || '').toLowerCase().trim()
            
            return kpiProjectCodeForDates && activityProjectCodeForDates && 
                   kpiProjectCodeForDates === activityProjectCodeForDates &&
                   kpiActivityNameForDates && activityNameForDates &&
                   (kpiActivityNameForDates === activityNameForDates || 
                    kpiActivityNameForDates.includes(activityNameForDates))
          })
          
          const actualKPIsForDates = activityKPIsForDates.filter((kpi: any) => {
            const inputType = (kpi.input_type || kpi['Input Type'] || '').toLowerCase()
            return inputType === 'actual'
          })
          
          if (actualKPIsForDates.length > 0) {
            // Get first and last dates
            const datesWithKPIs = actualKPIsForDates
              .map((kpi: any) => {
                const dateStr = kpi.actual_date || kpi['Actual Date'] || kpi.day || kpi['Day'] || ''
                if (!dateStr) return null
                try {
                  const date = new Date(dateStr)
                  return isNaN(date.getTime()) ? null : date
                } catch {
                  return null
                }
              })
              .filter((d: Date | null) => d !== null)
              .sort((a: Date, b: Date) => a.getTime() - b.getTime())
            
            if (datesWithKPIs.length > 0) {
              if (!actualStartDate) {
                actualStartDate = datesWithKPIs[0].toISOString()
              }
              if (!actualEndDate && datesWithKPIs.length > 1) {
                actualEndDate = datesWithKPIs[datesWithKPIs.length - 1].toISOString()
              }
            }
          }
        }
        
        // ✅ Calculate status automatically
        let status: 'completed' | 'delayed' | 'on_track' | 'not_started' = 'not_started'
        let statusText = 'Not Started'
        let statusIcon = Clock
        let statusColor = 'text-gray-500'
        
        // Check if activity has started (has actual units)
        if (actualUnitsStatus > 0) {
          // Check if completed (actual >= planned)
          if (plannedUnitsStatus > 0 && actualUnitsStatus >= plannedUnitsStatus) {
            status = 'completed'
            statusText = 'Completed'
            statusIcon = CheckCircle
            statusColor = 'text-green-500'
          } else {
            // Check if delayed (actual end date > planned end date)
            let isDelayed = false
            if (plannedEndDate && actualEndDate) {
              try {
                const plannedEnd = new Date(plannedEndDate)
                const actualEnd = new Date(actualEndDate)
                if (!isNaN(plannedEnd.getTime()) && !isNaN(actualEnd.getTime())) {
                  isDelayed = actualEnd > plannedEnd
                }
              } catch (e) {
                // Ignore date parsing errors
              }
            }
            
            // Also check if behind schedule (actual progress < expected progress based on dates)
            if (!isDelayed && plannedStartDate && plannedEndDate && actualStartDate) {
              try {
                const plannedStart = new Date(plannedStartDate)
                const plannedEnd = new Date(plannedEndDate)
                const actualStart = new Date(actualStartDate)
                const today = new Date()
                
                if (!isNaN(plannedStart.getTime()) && !isNaN(plannedEnd.getTime()) && !isNaN(actualStart.getTime())) {
                  const totalPlannedDays = Math.ceil((plannedEnd.getTime() - plannedStart.getTime()) / (1000 * 60 * 60 * 24))
                  const elapsedDays = Math.ceil((today.getTime() - plannedStart.getTime()) / (1000 * 60 * 60 * 24))
                  
                  if (totalPlannedDays > 0 && elapsedDays > 0) {
                    const expectedProgress = (elapsedDays / totalPlannedDays) * 100
                    const actualProgressPct = plannedUnitsStatus > 0 
                      ? (actualUnitsStatus / plannedUnitsStatus) * 100 
                      : 0
                    
                    // If actual progress is significantly behind expected progress
                    if (actualProgressPct < expectedProgress - 10) {
                      isDelayed = true
                    }
                  }
                }
              } catch (e) {
                // Ignore date parsing errors
              }
            }
            
            if (isDelayed) {
              status = 'delayed'
              statusText = 'Delayed'
              statusIcon = AlertCircle
              statusColor = 'text-red-500'
            } else {
              status = 'on_track'
              statusText = 'On Track'
              statusIcon = Clock
              statusColor = 'text-blue-500'
            }
          }
        }
        
        const StatusIcon = statusIcon
        
        return (
          <div className="flex items-center gap-2">
            <StatusIcon className={`h-4 w-4 ${statusColor}`} />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {statusText}
            </span>
          </div>
        )
      
      case 'actions':
        return (
          <div className="flex items-center gap-2">
            <PermissionButton
              permission="boq.edit"
              variant="outline"
              size="sm"
              onClick={() => onEdit(activity)}
              className="text-blue-600 hover:text-blue-700"
            >
              Edit
            </PermissionButton>
            <PermissionButton
              permission="boq.delete"
              variant="outline"
              size="sm"
              onClick={() => onDelete(activity.id)}
              className="text-red-600 hover:text-red-700"
            >
              Delete
            </PermissionButton>
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

  // ✅ Check permission before rendering the entire table
  if (!guard.hasAccess('boq.view')) {
    return null
  }

  return (
    <div className="space-y-4">
      {/* Header with Customization Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            BOQ Activities ({activities.length})
          </h3>
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {selectedIds.length} selected
              </span>
              {onBulkDelete && guard.hasAccess('boq.delete') && (
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
          <PermissionButton
            permission="boq.view"
            variant="outline"
            size="sm"
            onClick={() => setShowCustomizer(true)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Customize Columns
          </PermissionButton>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto max-h-[calc(100vh-300px)] overflow-y-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-gray-200 dark:border-gray-700">
              {visibleColumns.map((column) => (
                <th
                  key={column.id}
                  className="px-4 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800"
                  style={{
                    width: column.width || 'auto',
                    minWidth: column.width || '120px',
                    maxWidth: column.width || 'none',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10
                  }}
                >
                  {column.id === 'select' ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === activities.length && activities.length > 0}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        title="Select All"
                      />
                      <span>{column.label}</span>
                    </div>
                  ) : (
                    column.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activities.map((activity) => (
              <tr
                key={activity.id}
                className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                {visibleColumns.map((column) => (
                  <td
                    key={column.id}
                    className="px-4 py-3 text-sm"
                    style={{
                      width: column.width || 'auto',
                      minWidth: column.width || '120px',
                      maxWidth: column.width || 'none'
                    }}
                  >
                    {renderCell(activity, column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Column Customizer Modal */}
      <PermissionGuard permission="boq.view">
        {showCustomizer && (
          <ColumnCustomizer
            columns={columns}
            onColumnsChange={saveConfiguration}
            onClose={() => setShowCustomizer(false)}
            title="Customize BOQ Table Columns"
            storageKey="boq"
          />
        )}
      </PermissionGuard>
    </div>
  )
}