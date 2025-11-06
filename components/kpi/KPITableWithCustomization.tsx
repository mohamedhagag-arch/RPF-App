'use client'

import { useState, useEffect, useMemo } from 'react'
import { KPIRecord, Project } from '@/lib/supabase'
import { ColumnCustomizer, ColumnConfig } from '@/components/ui/ColumnCustomizer'
import { useColumnCustomization } from '@/lib/useColumnCustomization'
import { Button } from '@/components/ui/Button'
import { PermissionButton } from '@/components/ui/PermissionButton'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { CheckCircle, Clock, AlertCircle, Calendar, Building, Activity, TrendingUp, Target, Info, Filter, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { formatCurrencyByCodeSync } from '@/lib/currenciesManager'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'

interface KPITableWithCustomizationProps {
  kpis: KPIRecord[]
  projects: Project[]
  onEdit: (kpi: KPIRecord) => void
  onDelete: (id: string) => void
  onBulkDelete?: (ids: string[]) => void
  allActivities?: any[] // ✅ Add activities to get Rate from BOQ
}

// Default column configuration for KPI
const defaultKPIColumns: ColumnConfig[] = [
  { id: 'select', label: 'Select', visible: true, order: 0, fixed: true, width: '70px' },
  { id: 'activity_details', label: 'Activity Details', visible: true, order: 1, width: '280px' },
  { id: 'date', label: 'Date', visible: true, order: 2, width: '140px' },
  { id: 'input_type', label: 'Input Type', visible: true, order: 3, width: '150px' },
  { id: 'quantities', label: 'Quantities', visible: true, order: 4, width: '200px' },
  { id: 'value', label: 'Value', visible: true, order: 5, width: '200px' },
  { id: 'virtual_value', label: 'Virtual Value', visible: true, order: 6, width: '200px' },
  { id: 'activity_commencement_relation', label: 'Activity Commencement Relation', visible: true, order: 7, width: '260px' },
  { id: 'activity_division', label: 'Activity Division', visible: true, order: 8, width: '200px' },
  { id: 'activity_scope', label: 'Activity Scope', visible: true, order: 9, width: '200px' },
  { id: 'key_dates', label: 'Key Dates', visible: true, order: 10, width: '170px' },
  { id: 'cumulative_quantity', label: 'Cumulative Quantity', visible: true, order: 11, width: '200px' },
  { id: 'cumulative_value', label: 'Cumulative Value', visible: true, order: 12, width: '200px' },
  { id: 'actions', label: 'Actions', visible: true, order: 13, fixed: true, width: '160px' }
]

export function KPITableWithCustomization({ 
  kpis, 
  projects, 
  onEdit, 
  onDelete, 
  onBulkDelete,
  allActivities = [] // ✅ Add activities prop
}: KPITableWithCustomizationProps) {
  const guard = usePermissionGuard()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showCustomizer, setShowCustomizer] = useState(false)
  // ✅ Cache for activity-to-scope mapping from project_type_activities table
  const [activityScopeMap, setActivityScopeMap] = useState<Map<string, string>>(new Map())
  
  // Sorting state
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  
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

  // ✅ Load Activity Scope mapping from project_type_activities table (Settings)
  useEffect(() => {
    const loadActivityScopes = async () => {
      try {
        const supabase = getSupabaseClient()
        const { data, error } = await supabase
          .from('project_type_activities')
          .select('activity_name, project_type')
          .eq('is_active', true)
        
        if (error) {
          console.error('❌ Error loading activity scopes:', error)
          return
        }
        
        // Create a map: activity_name -> project_type (scope)
        const scopeMap = new Map<string, string>()
        if (data) {
          data.forEach((item: any) => {
            const activityName = item.activity_name?.trim().toLowerCase()
            const projectType = item.project_type?.trim()
            if (activityName && projectType) {
              // Store the first scope found for each activity (or could store all as array)
              if (!scopeMap.has(activityName)) {
                scopeMap.set(activityName, projectType)
              }
            }
          })
        }
        
        setActivityScopeMap(scopeMap)
        console.log(`✅ Loaded ${scopeMap.size} activity scope mappings`)
      } catch (error) {
        console.error('❌ Error in loadActivityScopes:', error)
      }
    }
    
    loadActivityScopes()
  }, []) // Load once on mount

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
      if (isNaN(date.getTime())) return { week: 'N/A', month: 'N/A', year: 'N/A' }
      
      // Calculate week number properly (ISO week)
      const startOfYear = new Date(date.getFullYear(), 0, 1)
      const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
      const week = Math.ceil((days + startOfYear.getDay() + 1) / 7)
      
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
        // ✅ Find project by matching project_code
        const project = projects.find(p => p.project_code === kpi.project_code)
        const projectFullName = getProjectName(kpi.project_code || '') || kpi.project_full_code || kpi.project_code || 'N/A'
        
        // ✅ Get project full code and name
        // Try to get full code from project object first, then from kpi
        let projectFullCode = 'N/A'
        let projectName = ''
        
        if (project) {
          // Use project's full code if available
          // ✅ FIX: Check if project_sub_code already contains project_code to avoid duplication
          if (project.project_sub_code) {
            const projectCode = (project.project_code || '').trim().toUpperCase()
            const projectSubCode = (project.project_sub_code || '').trim()
            // If sub_code already starts with project_code, use it as is
            if (projectSubCode.toUpperCase().startsWith(projectCode)) {
              projectFullCode = projectSubCode
            } else {
              projectFullCode = `${projectCode}${projectSubCode}`
            }
          } else {
            projectFullCode = project.project_code || 'N/A'
          }
          projectName = project.project_name || ''
        } else {
          // Fallback to kpi's full code
          // ✅ FIX: Check if project_sub_code already contains project_code to avoid duplication
          if (kpi.project_code && kpi.project_sub_code) {
            const projectCode = (kpi.project_code || '').trim().toUpperCase()
            const projectSubCode = (kpi.project_sub_code || '').trim()
            // If sub_code already starts with project_code, use it as is
            if (projectSubCode.toUpperCase().startsWith(projectCode)) {
              projectFullCode = projectSubCode
            } else {
              projectFullCode = `${projectCode}${projectSubCode}`
            }
          } else {
            projectFullCode = kpi.project_full_code || 
                             kpi.project_code ||
                             'N/A'
          }
          // Try to get project name from getProjectName if project object not found
          const foundProjectName = getProjectName(kpi.project_code || '')
          projectName = foundProjectName && foundProjectName !== kpi.project_code ? foundProjectName : ''
        }
        
        // Always show full code | project name format if we have both
        const projectDisplay = projectFullCode !== 'N/A' && projectName && projectName.trim() !== ''
          ? `${projectFullCode} | ${projectName}`
          : projectFullCode !== 'N/A' 
            ? projectFullCode
            : projectFullName || 'N/A'
        
        // Get Zone from multiple sources
        const rawKPIDetails = (kpi as any).raw || {}
        let zoneValue = kpi.zone || 
                       getKPIField(kpi, 'Zone') || 
                       getKPIField(kpi, 'Zone Number') ||
                       rawKPIDetails['Zone'] ||
                       rawKPIDetails['Zone Number'] ||
                       rawKPIDetails['Section'] ||
                       kpi.section ||
                       ''
        
        // Remove project code from zone value if it exists
        // Example: "P8888 - 1" -> "1" or "Zone P8888 - Building A" -> "Building A"
        if (zoneValue && kpi.project_code) {
          const projectCodeUpper = kpi.project_code.toUpperCase().trim()
          let zoneStr = zoneValue.toString()
          
          // Remove project code patterns:
          // 1. "P8888 - " or "P8888 -" at start
          zoneStr = zoneStr.replace(new RegExp(`^${projectCodeUpper}\\s*-\\s*`, 'i'), '').trim()
          // 2. " P8888 - " or " P8888 -" in middle
          zoneStr = zoneStr.replace(new RegExp(`\\s+${projectCodeUpper}\\s*-\\s*`, 'gi'), ' ').trim()
          // 3. Just "P8888" at start followed by space or dash
          zoneStr = zoneStr.replace(new RegExp(`^${projectCodeUpper}(\\s|-)+`, 'i'), '').trim()
          // 4. Just "P8888" in middle with spaces/dashes around
          zoneStr = zoneStr.replace(new RegExp(`(\\s|-)+${projectCodeUpper}(\\s|-)+`, 'gi'), ' ').trim()
          // 5. Clean up any remaining " - " or "- " at the start
          zoneStr = zoneStr.replace(/^\s*-\s*/, '').trim()
          // 6. Clean up multiple spaces
          zoneStr = zoneStr.replace(/\s+/g, ' ').trim()
          // 7. If zone is empty or only contains dash, set to 'N/A'
          if (!zoneStr || zoneStr === '-' || zoneStr === '') {
            zoneStr = 'N/A'
          }
          
          zoneValue = zoneStr
        }
        
        return (
          <div className="space-y-1">
            <div className="font-medium text-gray-900 dark:text-white text-sm">
              {kpi.activity_name || 'N/A'}
            </div>
            {projectDisplay && projectDisplay !== 'N/A' && (
            <div className="text-xs text-gray-600 dark:text-gray-400">
                {projectDisplay}
            </div>
            )}
            {zoneValue && zoneValue !== 'N/A' && (
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Zone {zoneValue}
              </div>
            )}
          </div>
        )
      
      case 'date':
        // ✅ Get date from multiple sources (Priority: Day, Actual Date, Target Date, Activity Date)
        const rawKPIDate = (kpi as any).raw || {}
        
        // Priority 1: Day column (if available and formatted)
        const dayValue = kpi.day || rawKPIDate['Day'] || ''
        
        // Priority 2: Actual Date (for Actual KPIs) or Target Date (for Planned KPIs)
        const actualDateValue = kpi.actual_date || rawKPIDate['Actual Date'] || ''
        const targetDateValue = kpi.target_date || rawKPIDate['Target Date'] || ''
        
        // Priority 3: Activity Date
        const activityDateValue = kpi.activity_date || rawKPIDate['Activity Date'] || ''
        
        // Determine which date to use based on Input Type
        let dateToDisplay = ''
        if (kpi.input_type === 'Actual' && actualDateValue) {
          dateToDisplay = actualDateValue
        } else if (kpi.input_type === 'Planned' && targetDateValue) {
          dateToDisplay = targetDateValue
        } else if (dayValue) {
          // If Day is available, try to use it or fallback to Activity Date
          dateToDisplay = activityDateValue || dayValue
        } else {
          dateToDisplay = activityDateValue || actualDateValue || targetDateValue
        }
        
        return (
          <div className="text-sm text-gray-900 dark:text-white">
            {dateToDisplay ? formatDate(dateToDisplay) : 'N/A'}
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
      
      case 'quantities':
        // ✅ Get quantities and unit from multiple sources (Priority: raw data, then mapped data)
        const rawKPIQuantities = (kpi as any).raw || {}
        
        // Get Quantity from raw data first (most accurate)
        let quantityValue = parseFloat(String(rawKPIQuantities['Quantity'] || '0').replace(/,/g, '')) || 0
        if (quantityValue === 0) {
          quantityValue = kpi.quantity || 0
        }
        
        // Get Unit from raw data first
        const unitValue = kpi.unit || rawKPIQuantities['Unit'] || 'N/A'
        
        // Get Drilled Meters from raw data first
        let drilledMetersValue = parseFloat(String(rawKPIQuantities['Drilled Meters'] || '0').replace(/,/g, '')) || 0
        if (drilledMetersValue === 0) {
          drilledMetersValue = kpi.drilled_meters || 0
        }
        
        return (
          <div className="space-y-1">
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {quantityValue.toLocaleString()} {unitValue !== 'N/A' ? unitValue : ''}
            </div>
            {drilledMetersValue > 0 && (
              <div className="text-xs text-gray-600 dark:text-gray-400">Drilled Meters: {drilledMetersValue.toLocaleString()}m</div>
            )}
          </div>
        )
      
      case 'value':
        // ✅ Value = Quantity × Rate (Rate from BOQ Activity)
        // Display: Total Value + Rate (Value per Unit)
        const rawKPIValue = (kpi as any).raw || {}
        
        // Get Quantity from raw data first, then fallback to mapped data
        let quantityForValue = parseFloat(String(rawKPIValue['Quantity'] || '0').replace(/,/g, '')) || 0
        if (quantityForValue === 0) {
          quantityForValue = kpi.quantity || 0
        }
        
        // ✅ Get Rate from BOQ Activity (Priority: BOQ Activity Rate)
        let rateForValue = 0
        
        // Priority 1: Find related BOQ Activity and get Rate from it
        if (allActivities.length > 0) {
          const relatedActivity = allActivities.find((activity: any) => {
            const activityNameMatch = (
              activity.activity_name?.toLowerCase().trim() === kpi.activity_name?.toLowerCase().trim() ||
              activity.activity?.toLowerCase().trim() === kpi.activity_name?.toLowerCase().trim()
            )
            
            const projectCodeMatch = (
              activity.project_code === kpi.project_code ||
              activity.project_full_code === kpi.project_code ||
              activity.project_code === kpi.project_full_code ||
              activity.project_full_code === kpi.project_full_code
            )
            
            return activityNameMatch && projectCodeMatch
          })
          
          if (relatedActivity) {
            const rawActivity = (relatedActivity as any).raw || {}
            // Try to get rate from activity
            rateForValue = relatedActivity.rate || 
                          parseFloat(String(rawActivity['Rate'] || '0').replace(/,/g, '')) || 
                          0
            
            // If rate is 0, calculate from Total Value / Total Units
            if (rateForValue === 0) {
              const totalValue = relatedActivity.total_value || 
                               parseFloat(String(rawActivity['Total Value'] || '0').replace(/,/g, '')) || 
                               0
              const totalUnits = relatedActivity.total_units || 
                              relatedActivity.planned_units ||
                              parseFloat(String(rawActivity['Total Units'] || rawActivity['Planned Units'] || '0').replace(/,/g, '')) || 
                              0
              
              if (totalUnits > 0 && totalValue > 0) {
                rateForValue = totalValue / totalUnits
              }
            }
          }
        }
        
        // Priority 2: Fallback to KPI raw data Rate
        if (rateForValue === 0) {
          rateForValue = parseFloat(String(rawKPIValue['Rate'] || '0').replace(/,/g, '')) || 0
        }
        
        // Priority 3: Fallback to Activity Rate in raw KPI data
        if (rateForValue === 0) {
          rateForValue = parseFloat(String(rawKPIValue['Activity Rate'] || '0').replace(/,/g, '')) || 0
        }
        
        // Calculate Total Value = Quantity × Rate
        const totalValue = quantityForValue * rateForValue
        
        // Get project currency
        const projectForValue = projects.find(p => 
          p.project_code === kpi.project_code || 
          p.project_sub_code === kpi.project_code ||
          p.project_code === kpi.project_full_code
        )
        const currencyCode = projectForValue?.currency || 'AED'
        
        return (
          <div className="space-y-1">
          <div className="text-sm text-gray-900 dark:text-white">
              Total: {formatCurrencyByCodeSync(totalValue, currencyCode)}
            </div>
            {rateForValue > 0 && (
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Rate: {formatCurrencyByCodeSync(rateForValue, currencyCode)}/unit
              </div>
            )}
          </div>
        )
      
      case 'virtual_value':
        // ✅ Get Virtual Material Value from project (not from KPI)
        const rawKPIVirtual = (kpi as any).raw || {}
        
        // Get Virtual Material Value from project
        const projectForVirtual = projects.find(p => 
          p.project_code === kpi.project_code || 
          p.project_sub_code === kpi.project_code ||
          p.project_code === kpi.project_full_code
        )
        
        // Priority 1: Get Virtual Material Value from project
        let virtualMaterialValue = 0
        if (projectForVirtual) {
          virtualMaterialValue = parseFloat(String(projectForVirtual.virtual_material_value || '0').replace(/,/g, '')) || 0
        }
        
        // Priority 2: Fallback to raw KPI data if project value not found
        if (virtualMaterialValue === 0) {
          virtualMaterialValue = parseFloat(String(
            rawKPIVirtual['Virtual Material Value'] || 
            getKPIField(kpi, 'Virtual Material Value') || 
            getKPIField(kpi, 'Virtual Material') || 
            '0'
          ).replace(/,/g, '')) || 0
        }
        
        // Get Base Value (KPI Value) - Value = Quantity × Rate (Rate from BOQ Activity)
        let quantityForVirtual = parseFloat(String(rawKPIVirtual['Quantity'] || '0').replace(/,/g, '')) || 0
        if (quantityForVirtual === 0) {
          quantityForVirtual = kpi.quantity || 0
        }
        
        // ✅ Get Rate from BOQ Activity (same logic as value column)
        let rateForVirtual = 0
        
        // Priority 1: Find related BOQ Activity and get Rate from it
        if (allActivities.length > 0) {
          const relatedActivityVirtual = allActivities.find((activity: any) => {
            const activityNameMatch = (
              activity.activity_name?.toLowerCase().trim() === kpi.activity_name?.toLowerCase().trim() ||
              activity.activity?.toLowerCase().trim() === kpi.activity_name?.toLowerCase().trim()
            )
            
            const projectCodeMatch = (
              activity.project_code === kpi.project_code ||
              activity.project_full_code === kpi.project_code ||
              activity.project_code === kpi.project_full_code ||
              activity.project_full_code === kpi.project_full_code
            )
            
            return activityNameMatch && projectCodeMatch
          })
          
          if (relatedActivityVirtual) {
            const rawActivityVirtual = (relatedActivityVirtual as any).raw || {}
            rateForVirtual = relatedActivityVirtual.rate || 
                            parseFloat(String(rawActivityVirtual['Rate'] || '0').replace(/,/g, '')) || 
                            0
            
            // If rate is 0, calculate from Total Value / Total Units
            if (rateForVirtual === 0) {
              const totalValueVirtual = relatedActivityVirtual.total_value || 
                                       parseFloat(String(rawActivityVirtual['Total Value'] || '0').replace(/,/g, '')) || 
                                       0
              const totalUnitsVirtual = relatedActivityVirtual.total_units || 
                                      relatedActivityVirtual.planned_units ||
                                      parseFloat(String(rawActivityVirtual['Total Units'] || rawActivityVirtual['Planned Units'] || '0').replace(/,/g, '')) || 
                                      0
              
              if (totalUnitsVirtual > 0 && totalValueVirtual > 0) {
                rateForVirtual = totalValueVirtual / totalUnitsVirtual
              }
            }
          }
        }
        
        // Priority 2: Fallback to KPI raw data Rate
        if (rateForVirtual === 0) {
          rateForVirtual = parseFloat(String(rawKPIVirtual['Rate'] || '0').replace(/,/g, '')) || 0
        }
        
        // Priority 3: Fallback to Activity Rate in raw KPI data
        if (rateForVirtual === 0) {
          rateForVirtual = parseFloat(String(rawKPIVirtual['Activity Rate'] || '0').replace(/,/g, '')) || 0
        }
        
        // Calculate Base Value = Quantity × Rate
        const baseValue = quantityForVirtual * rateForVirtual
        
        const totalVirtualValue = virtualMaterialValue + baseValue
        
        // Get project currency (already found above as projectForVirtual)
        const currencyCodeForVirtual = projectForVirtual?.currency || 'AED'
        
        return (
          <div className="space-y-1">
            <div className="text-xs text-gray-600 dark:text-gray-400">Virtual Material: {formatCurrencyByCodeSync(virtualMaterialValue, currencyCodeForVirtual)}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Value: {formatCurrencyByCodeSync(baseValue, currencyCodeForVirtual)}</div>
            <div className="text-sm text-gray-900 dark:text-white">Total: {formatCurrencyByCodeSync(totalVirtualValue, currencyCodeForVirtual)}</div>
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
        // ✅ Get Activity Division from BOQ Activity (not from KPI)
        const rawKPIDivision = (kpi as any).raw || {}
        let activityDiv = 'N/A'
        
        // Priority 1: Find related BOQ Activity and get Activity Division from it
        if (allActivities.length > 0) {
          const relatedActivityDivision = allActivities.find((activity: any) => {
            const activityNameMatch = (
              activity.activity_name?.toLowerCase().trim() === kpi.activity_name?.toLowerCase().trim() ||
              activity.activity?.toLowerCase().trim() === kpi.activity_name?.toLowerCase().trim()
            )
            
            const projectCodeMatch = (
              activity.project_code === kpi.project_code ||
              activity.project_full_code === kpi.project_code ||
              activity.project_code === kpi.project_full_code ||
              activity.project_full_code === kpi.project_full_code
            )
            
            return activityNameMatch && projectCodeMatch
          })
          
          if (relatedActivityDivision) {
            const rawActivityDivision = (relatedActivityDivision as any).raw || {}
            // Get Activity Division from BOQ Activity
            activityDiv = relatedActivityDivision.activity_division || 
                         rawActivityDivision['Activity Division'] ||
                         relatedActivityDivision.activity ||
                         rawActivityDivision['Activity'] ||
                         'N/A'
          }
        }
        
        // Priority 2: Fallback to KPI data if BOQ Activity not found
        if (activityDiv === 'N/A' || !activityDiv) {
          activityDiv = kpi.activity || 
                       kpi.section || 
                       getKPIField(kpi, 'Activity Division') ||
                       rawKPIDivision['Activity Division'] ||
                       rawKPIDivision['Section'] ||
                       'N/A'
        }
        
        return (
          <div className="text-sm text-gray-900 dark:text-white">
            {activityDiv}
          </div>
        )
      
      case 'activity_scope':
        // ✅ Get Activity Scope from project_type_activities table (Settings)
        const rawKPIScope = (kpi as any).raw || {}
        let activityScope = 'N/A'
        const activityName = kpi.activity_name?.trim()
        
        // Priority 1: Get from project_type_activities table (Settings) - cached map
        if (activityName && activityScopeMap.size > 0) {
          const activityNameLower = activityName.toLowerCase()
          const scope = activityScopeMap.get(activityNameLower)
          if (scope) {
            activityScope = scope
          }
        }
        
        // Priority 2: Fallback to BOQ Activity raw data if scope not found in settings
        if ((activityScope === 'N/A' || !activityScope) && allActivities.length > 0 && activityName) {
          const relatedActivityScope = allActivities.find((activity: any) => {
            const activityNameMatch = (
              activity.activity_name?.toLowerCase().trim() === activityName.toLowerCase() ||
              activity.activity?.toLowerCase().trim() === activityName.toLowerCase()
            )
            
            const projectCodeMatch = (
              activity.project_code === kpi.project_code ||
              activity.project_full_code === kpi.project_code ||
              activity.project_code === kpi.project_full_code ||
              activity.project_full_code === kpi.project_full_code
            )
            
            return activityNameMatch && projectCodeMatch
          })
          
          if (relatedActivityScope) {
            const rawActivityScope = (relatedActivityScope as any).raw || {}
            // Try to get scope from raw data
            activityScope = rawActivityScope['Activity Scope'] ||
                          rawActivityScope['Activity Scope of Works'] ||
                          rawActivityScope['Scope of Works'] ||
                          rawActivityScope['Scope'] ||
                          'N/A'
          }
        }
        
        // Priority 3: Fallback to KPI data if activity scope not found
        if (activityScope === 'N/A' || !activityScope) {
          activityScope = getKPIField(kpi, 'Activity Scope') || 
                         getKPIField(kpi, 'Activity Scope of Works') ||
                         getKPIField(kpi, 'Scope of Works') ||
                         getKPIField(kpi, 'Scope') || 
                         rawKPIScope['Activity Scope'] ||
                         rawKPIScope['Activity Scope of Works'] ||
                         rawKPIScope['Scope of Works'] ||
                         rawKPIScope['Scope'] ||
                         'N/A'
        }
        
        return (
          <div className="text-sm text-gray-900 dark:text-white">
            {activityScope}
          </div>
        )
      
      case 'key_dates':
        // ✅ Get date from multiple sources (same priority as date column)
        const rawKPIKeyDates = (kpi as any).raw || {}
        const dayValueKeyDates = kpi.day || rawKPIKeyDates['Day'] || ''
        const actualDateValueKeyDates = kpi.actual_date || rawKPIKeyDates['Actual Date'] || ''
        const targetDateValueKeyDates = kpi.target_date || rawKPIKeyDates['Target Date'] || ''
        const activityDateValueKeyDates = kpi.activity_date || rawKPIKeyDates['Activity Date'] || ''
        
        // Determine which date to use based on Input Type
        let dateForParts = ''
        if (kpi.input_type === 'Actual' && actualDateValueKeyDates) {
          dateForParts = actualDateValueKeyDates
        } else if (kpi.input_type === 'Planned' && targetDateValueKeyDates) {
          dateForParts = targetDateValueKeyDates
        } else if (dayValueKeyDates) {
          dateForParts = activityDateValueKeyDates || dayValueKeyDates
        } else {
          dateForParts = activityDateValueKeyDates || actualDateValueKeyDates || targetDateValueKeyDates
        }
        
        const dateParts = getDateParts(dateForParts)
        return (
          <div className="space-y-1">
            <div className="text-xs text-gray-600 dark:text-gray-400">Week: {dateParts.week}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Month: {dateParts.month}</div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">Year: {dateParts.year}</div>
          </div>
        )
      
      case 'cumulative_quantity':
        // ✅ Calculate cumulative quantities from KPIs (same project + activity + input type)
        const rawKPICumQty = (kpi as any).raw || {}
        
        // Get current KPI date and quantity
        const currentKPIDate = kpi.actual_date || kpi.target_date || kpi.activity_date || kpi.day || ''
        const currentQuantity = kpi.quantity || parseFloat(String(rawKPICumQty['Quantity'] || '0').replace(/,/g, '')) || 0
        
        // Parse current KPI date
        const parseDateForCumulative = (dateStr: string | null | undefined): Date | null => {
          if (!dateStr) return null
          try {
            // Handle "Day N" format
            if (typeof dateStr === 'string' && dateStr.toLowerCase().startsWith('day')) {
              const dayMatch = dateStr.match(/\d+/)
              if (dayMatch) {
                const dayNum = parseInt(dayMatch[0])
                // Use a base date (e.g., project start date or current date minus days)
                const baseDate = new Date()
                baseDate.setDate(baseDate.getDate() - dayNum)
                return baseDate
              }
            }
            const date = new Date(dateStr)
            return isNaN(date.getTime()) ? null : date
          } catch {
            return null
          }
        }
        
        const currentDate = parseDateForCumulative(currentKPIDate)
        
        // Filter KPIs for same project + activity + input type
        const relatedKPIs = kpis.filter((otherKPI: any) => {
          const sameProject = (
            otherKPI.project_code === kpi.project_code ||
            otherKPI.project_full_code === kpi.project_code ||
            otherKPI.project_code === kpi.project_full_code ||
            otherKPI.project_full_code === kpi.project_full_code
          )
          const sameActivity = (
            otherKPI.activity_name?.toLowerCase().trim() === kpi.activity_name?.toLowerCase().trim()
          )
          const sameInputType = otherKPI.input_type === kpi.input_type
          
          return sameProject && sameActivity && sameInputType
        })
        
        // Calculate daily cumulative (same day)
        let dailyCumulativeNum = 0
        if (currentDate) {
          relatedKPIs.forEach((otherKPI: any) => {
            const otherDateStr = otherKPI.actual_date || otherKPI.target_date || otherKPI.activity_date || otherKPI.day || ''
            const otherDate = parseDateForCumulative(otherDateStr)
            if (otherDate && 
                otherDate.getDate() === currentDate.getDate() &&
                otherDate.getMonth() === currentDate.getMonth() &&
                otherDate.getFullYear() === currentDate.getFullYear()) {
              const otherQuantity = otherKPI.quantity || parseFloat(String((otherKPI as any).raw?.['Quantity'] || '0').replace(/,/g, '')) || 0
              dailyCumulativeNum += otherQuantity
            }
          })
        }
        
        // Calculate weekly cumulative (same week)
        let weeklyCumulativeNum = 0
        if (currentDate) {
          const currentWeek = Math.ceil((currentDate.getDate() + new Date(currentDate.getFullYear(), 0, 1).getDay()) / 7)
          const currentYear = currentDate.getFullYear()
          
          relatedKPIs.forEach((otherKPI: any) => {
            const otherDateStr = otherKPI.actual_date || otherKPI.target_date || otherKPI.activity_date || otherKPI.day || ''
            const otherDate = parseDateForCumulative(otherDateStr)
            if (otherDate) {
              const otherWeek = Math.ceil((otherDate.getDate() + new Date(otherDate.getFullYear(), 0, 1).getDay()) / 7)
              const otherYear = otherDate.getFullYear()
              
              if (otherWeek === currentWeek && otherYear === currentYear) {
                const otherQuantity = otherKPI.quantity || parseFloat(String((otherKPI as any).raw?.['Quantity'] || '0').replace(/,/g, '')) || 0
                weeklyCumulativeNum += otherQuantity
              }
            }
          })
        }
        
        // Calculate monthly cumulative (same month)
        let monthlyCumulativeNum = 0
        if (currentDate) {
          const currentMonth = currentDate.getMonth()
          const currentYear = currentDate.getFullYear()
          
          relatedKPIs.forEach((otherKPI: any) => {
            const otherDateStr = otherKPI.actual_date || otherKPI.target_date || otherKPI.activity_date || otherKPI.day || ''
            const otherDate = parseDateForCumulative(otherDateStr)
            if (otherDate && 
                otherDate.getMonth() === currentMonth &&
                otherDate.getFullYear() === currentYear) {
              const otherQuantity = otherKPI.quantity || parseFloat(String((otherKPI as any).raw?.['Quantity'] || '0').replace(/,/g, '')) || 0
              monthlyCumulativeNum += otherQuantity
            }
          })
        }
        
        // Fallback to raw data if calculated values are 0
        if (dailyCumulativeNum === 0 && weeklyCumulativeNum === 0 && monthlyCumulativeNum === 0) {
          const dailyCumulative = getKPIField(kpi, 'Daily Cumulative') || 
                                  getKPIField(kpi, 'Daily Cumulative Quantity') || 
                                  rawKPICumQty['Daily Cumulative'] ||
                                  rawKPICumQty['Daily Cumulative Quantity'] ||
                                  0
          const weeklyCumulative = getKPIField(kpi, 'Weekly Cumulative') || 
                                  getKPIField(kpi, 'Weekly Cumulative Quantity') || 
                                  rawKPICumQty['Weekly Cumulative'] ||
                                  rawKPICumQty['Weekly Cumulative Quantity'] ||
                                  0
          const monthlyCumulative = getKPIField(kpi, 'Monthly Cumulative') || 
                                   getKPIField(kpi, 'Monthly Cumulative Quantity') || 
                                   rawKPICumQty['Monthly Cumulative'] ||
                                   rawKPICumQty['Monthly Cumulative Quantity'] ||
                                   0
          
          dailyCumulativeNum = parseFloat(String(dailyCumulative).replace(/,/g, '')) || 0
          weeklyCumulativeNum = parseFloat(String(weeklyCumulative).replace(/,/g, '')) || 0
          monthlyCumulativeNum = parseFloat(String(monthlyCumulative).replace(/,/g, '')) || 0
        }
        
        return (
          <div className="space-y-1">
            <div className="text-xs text-gray-600 dark:text-gray-400">Daily: {dailyCumulativeNum.toLocaleString()}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Weekly: {weeklyCumulativeNum.toLocaleString()}</div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">Monthly: {monthlyCumulativeNum.toLocaleString()}</div>
          </div>
        )
      
      case 'cumulative_value':
        // ✅ Calculate cumulative values from KPIs (same project + activity + input type)
        const rawKPICumValue = (kpi as any).raw || {}
        
        // Get current KPI date
        const currentKPIDateValue = kpi.actual_date || kpi.target_date || kpi.activity_date || kpi.day || ''
        
        // Parse current KPI date (reuse same function)
        const parseDateForCumulativeValue = (dateStr: string | null | undefined): Date | null => {
          if (!dateStr) return null
          try {
            if (typeof dateStr === 'string' && dateStr.toLowerCase().startsWith('day')) {
              const dayMatch = dateStr.match(/\d+/)
              if (dayMatch) {
                const dayNum = parseInt(dayMatch[0])
                const baseDate = new Date()
                baseDate.setDate(baseDate.getDate() - dayNum)
                return baseDate
              }
            }
            const date = new Date(dateStr)
            return isNaN(date.getTime()) ? null : date
          } catch {
            return null
          }
        }
        
        const currentDateValue = parseDateForCumulativeValue(currentKPIDateValue)
        
        // Filter KPIs for same project + activity + input type
        const relatedKPIsValue = kpis.filter((otherKPI: any) => {
          const sameProject = (
            otherKPI.project_code === kpi.project_code ||
            otherKPI.project_full_code === kpi.project_code ||
            otherKPI.project_code === kpi.project_full_code ||
            otherKPI.project_full_code === kpi.project_full_code
          )
          const sameActivity = (
            otherKPI.activity_name?.toLowerCase().trim() === kpi.activity_name?.toLowerCase().trim()
          )
          const sameInputType = otherKPI.input_type === kpi.input_type
          
          return sameProject && sameActivity && sameInputType
        })
        
        // Helper to get value from KPI (Quantity × Rate)
        const getKPIValue = (kpiRecord: any): number => {
          const rawKPI = (kpiRecord as any).raw || {}
          const quantity = kpiRecord.quantity || parseFloat(String(rawKPI['Quantity'] || '0').replace(/,/g, '')) || 0
          
          // Get rate from BOQ Activity if available
          let rate = 0
          if (allActivities.length > 0) {
            const relatedActivity = allActivities.find((activity: any) => {
              const activityNameMatch = (
                activity.activity_name?.toLowerCase().trim() === kpiRecord.activity_name?.toLowerCase().trim()
              )
              const projectCodeMatch = (
                activity.project_code === kpiRecord.project_code ||
                activity.project_full_code === kpiRecord.project_code ||
                activity.project_code === kpiRecord.project_full_code ||
                activity.project_full_code === kpiRecord.project_full_code
              )
              return activityNameMatch && projectCodeMatch
            })
            
            if (relatedActivity) {
              const rawActivity = (relatedActivity as any).raw || {}
              rate = relatedActivity.rate || parseFloat(String(rawActivity['Rate'] || '0').replace(/,/g, '')) || 0
              
              if (rate === 0) {
                const totalValue = relatedActivity.total_value || parseFloat(String(rawActivity['Total Value'] || '0').replace(/,/g, '')) || 0
                const totalUnits = relatedActivity.total_units || relatedActivity.planned_units || parseFloat(String(rawActivity['Total Units'] || rawActivity['Planned Units'] || '0').replace(/,/g, '')) || 0
                if (totalUnits > 0 && totalValue > 0) {
                  rate = totalValue / totalUnits
                }
              }
            }
          }
          
          // Fallback to KPI value or calculate
          if (rate === 0) {
            const valueFromKPI = kpiRecord.value || parseFloat(String(rawKPI['Value'] || '0').replace(/,/g, '')) || 0
            if (valueFromKPI > 0) {
              return valueFromKPI
            }
          }
          
          return quantity * rate
        }
        
        // Calculate daily cumulative value (same day)
        let dailyCumulativeValueNum = 0
        if (currentDateValue) {
          relatedKPIsValue.forEach((otherKPI: any) => {
            const otherDateStr = otherKPI.actual_date || otherKPI.target_date || otherKPI.activity_date || otherKPI.day || ''
            const otherDate = parseDateForCumulativeValue(otherDateStr)
            if (otherDate && 
                otherDate.getDate() === currentDateValue.getDate() &&
                otherDate.getMonth() === currentDateValue.getMonth() &&
                otherDate.getFullYear() === currentDateValue.getFullYear()) {
              dailyCumulativeValueNum += getKPIValue(otherKPI)
            }
          })
        }
        
        // Calculate weekly cumulative value (same week)
        let weeklyCumulativeValueNum = 0
        if (currentDateValue) {
          const currentWeek = Math.ceil((currentDateValue.getDate() + new Date(currentDateValue.getFullYear(), 0, 1).getDay()) / 7)
          const currentYear = currentDateValue.getFullYear()
          
          relatedKPIsValue.forEach((otherKPI: any) => {
            const otherDateStr = otherKPI.actual_date || otherKPI.target_date || otherKPI.activity_date || otherKPI.day || ''
            const otherDate = parseDateForCumulativeValue(otherDateStr)
            if (otherDate) {
              const otherWeek = Math.ceil((otherDate.getDate() + new Date(otherDate.getFullYear(), 0, 1).getDay()) / 7)
              const otherYear = otherDate.getFullYear()
              
              if (otherWeek === currentWeek && otherYear === currentYear) {
                weeklyCumulativeValueNum += getKPIValue(otherKPI)
              }
            }
          })
        }
        
        // Calculate monthly cumulative value (same month)
        let monthlyCumulativeValueNum = 0
        if (currentDateValue) {
          const currentMonth = currentDateValue.getMonth()
          const currentYear = currentDateValue.getFullYear()
          
          relatedKPIsValue.forEach((otherKPI: any) => {
            const otherDateStr = otherKPI.actual_date || otherKPI.target_date || otherKPI.activity_date || otherKPI.day || ''
            const otherDate = parseDateForCumulativeValue(otherDateStr)
            if (otherDate && 
                otherDate.getMonth() === currentMonth &&
                otherDate.getFullYear() === currentYear) {
              monthlyCumulativeValueNum += getKPIValue(otherKPI)
            }
          })
        }
        
        // Fallback to raw data if calculated values are 0
        if (dailyCumulativeValueNum === 0 && weeklyCumulativeValueNum === 0 && monthlyCumulativeValueNum === 0) {
          const dailyCumulativeValue = getKPIField(kpi, 'Daily Cumulative Value') || 
                                      rawKPICumValue['Daily Cumulative Value'] ||
                                      0
          const weeklyCumulativeValue = getKPIField(kpi, 'Weekly Cumulative Value') || 
                                       rawKPICumValue['Weekly Cumulative Value'] ||
                                       0
          const monthlyCumulativeValue = getKPIField(kpi, 'Monthly Cumulative Value') || 
                                        rawKPICumValue['Monthly Cumulative Value'] ||
                                        0
          
          dailyCumulativeValueNum = parseFloat(String(dailyCumulativeValue).replace(/,/g, '')) || 0
          weeklyCumulativeValueNum = parseFloat(String(weeklyCumulativeValue).replace(/,/g, '')) || 0
          monthlyCumulativeValueNum = parseFloat(String(monthlyCumulativeValue).replace(/,/g, '')) || 0
        }
        
        // Get project currency for cumulative values
        const projectForCumValue = projects.find(p => 
          p.project_code === kpi.project_code || 
          p.project_sub_code === kpi.project_code ||
          p.project_code === kpi.project_full_code
        )
        const currencyCodeForCum = projectForCumValue?.currency || 'AED'
        
        return (
          <div className="space-y-1">
            <div className="text-xs text-gray-600 dark:text-gray-400">Daily: {formatCurrencyByCodeSync(dailyCumulativeValueNum, currencyCodeForCum)}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Weekly: {formatCurrencyByCodeSync(weeklyCumulativeValueNum, currencyCodeForCum)}</div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">Monthly: {formatCurrencyByCodeSync(monthlyCumulativeValueNum, currencyCodeForCum)}</div>
          </div>
        )
      
      case 'actions':
        return (
          <div className="flex items-center gap-2">
            <PermissionButton
              permission="kpi.edit"
              variant="outline"
              size="sm"
              onClick={() => onEdit(kpi)}
              className="text-blue-600 hover:text-blue-700"
            >
              Edit
            </PermissionButton>
            <PermissionButton
              permission="kpi.delete"
              variant="outline"
              size="sm"
              onClick={() => onDelete(kpi.id)}
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

  // Sorting handler
  const handleSort = (columnId: string) => {
    if (columnId === 'select' || columnId === 'actions') return
    
    if (sortColumn === columnId) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(columnId)
      setSortDirection('asc')
    }
  }

  // Get sortable value for a KPI and column
  const getSortValue = (kpi: KPIRecord, columnId: string): any => {
    const getKPIField = (fieldName: string) => {
      const raw = (kpi as any).raw || kpi
      return raw[fieldName] || (kpi as any)[fieldName] || ''
    }
    
    switch (columnId) {
      case 'activity_details':
        return kpi.activity_name || getKPIField('Activity Name') || ''
      case 'date':
        const dateValue = kpi.target_date || kpi.activity_date || getKPIField('Target Date') || getKPIField('Activity Date') || ''
        return dateValue ? new Date(dateValue).getTime() : 0
      case 'input_type':
        return kpi.input_type || getKPIField('Input Type') || ''
      case 'quantities':
        return parseFloat(String(kpi.quantity || getKPIField('Quantity') || '0').replace(/,/g, '')) || 0
      case 'value':
        const valueNum = parseFloat(String(kpi.value || getKPIField('Value') || '0').replace(/,/g, '')) || 0
        return valueNum
      case 'virtual_value':
        const virtualValue = parseFloat(String(getKPIField('Virtual Material Value') || '0').replace(/,/g, '')) || 0
        return virtualValue
      case 'activity_commencement_relation':
        const activityTiming = kpi.activity_timing || getKPIField('Activity Timing') || 'post-commencement'
        // Sort by timing: pre-commencement = 1, post-commencement = 2, post-completion = 3
        if (activityTiming === 'pre-commencement') return 1
        if (activityTiming === 'post-completion') return 3
        return 2 // post-commencement
      case 'activity_division':
        return (kpi as any).activity_division || getKPIField('Activity Division') || ''
      case 'activity_scope':
        return getKPIField('Activity Scope') || ''
      case 'key_dates':
        const keyDate = getKPIField('Key Date') || ''
        return keyDate ? new Date(keyDate).getTime() : 0
      case 'cumulative_quantity':
        // Calculate cumulative quantity from all related KPIs
        const relatedKPIsForCumQty = kpis.filter((otherKPI: any) => {
          const sameProject = (
            otherKPI.project_code === kpi.project_code ||
            otherKPI.project_full_code === kpi.project_code ||
            otherKPI.project_code === kpi.project_full_code ||
            otherKPI.project_full_code === kpi.project_full_code
          )
          const sameActivity = (
            otherKPI.activity_name?.toLowerCase().trim() === kpi.activity_name?.toLowerCase().trim()
          )
          const sameInputType = otherKPI.input_type === kpi.input_type
          return sameProject && sameActivity && sameInputType
        })
        const cumQty = relatedKPIsForCumQty.reduce((sum, k) => {
          const qty = parseFloat(String(k.quantity || 0).replace(/,/g, '')) || 0
          return sum + qty
        }, 0)
        return cumQty
      case 'cumulative_value':
        // Calculate cumulative value from all related KPIs
        const relatedKPIsForCumValue = kpis.filter((otherKPI: any) => {
          const sameProject = (
            otherKPI.project_code === kpi.project_code ||
            otherKPI.project_full_code === kpi.project_code ||
            otherKPI.project_code === kpi.project_full_code ||
            otherKPI.project_full_code === kpi.project_full_code
          )
          const sameActivity = (
            otherKPI.activity_name?.toLowerCase().trim() === kpi.activity_name?.toLowerCase().trim()
          )
          const sameInputType = otherKPI.input_type === kpi.input_type
          return sameProject && sameActivity && sameInputType
        })
        const cumValue = relatedKPIsForCumValue.reduce((sum, k) => {
          const val = parseFloat(String(k.value || 0).replace(/,/g, '')) || 0
          return sum + val
        }, 0)
        return cumValue
      default:
        return getKPIField(columnId) || ''
    }
  }

  // Sort KPIs
  const sortedKPIs = useMemo(() => {
    if (!sortColumn) return kpis
    
    // Create getSortValue with access to kpis array
    const getSortValueWithKPIs = (kpi: KPIRecord, columnId: string): any => {
      const getKPIField = (fieldName: string) => {
        const raw = (kpi as any).raw || kpi
        return raw[fieldName] || (kpi as any)[fieldName] || ''
      }
      
      switch (columnId) {
        case 'activity_details':
          return kpi.activity_name || getKPIField('Activity Name') || ''
        case 'date':
          const dateValue = kpi.target_date || kpi.activity_date || getKPIField('Target Date') || getKPIField('Activity Date') || ''
          return dateValue ? new Date(dateValue).getTime() : 0
        case 'input_type':
          return kpi.input_type || getKPIField('Input Type') || ''
        case 'quantities':
          return parseFloat(String(kpi.quantity || getKPIField('Quantity') || '0').replace(/,/g, '')) || 0
        case 'value':
          const valueNum = parseFloat(String(kpi.value || getKPIField('Value') || '0').replace(/,/g, '')) || 0
          return valueNum
        case 'virtual_value':
          const virtualValue = parseFloat(String(getKPIField('Virtual Material Value') || '0').replace(/,/g, '')) || 0
          return virtualValue
        case 'activity_commencement_relation':
          const activityTiming = kpi.activity_timing || getKPIField('Activity Timing') || 'post-commencement'
          // Sort by timing: pre-commencement = 1, post-commencement = 2, post-completion = 3
          if (activityTiming === 'pre-commencement') return 1
          if (activityTiming === 'post-completion') return 3
          return 2 // post-commencement
        case 'activity_division':
          return (kpi as any).activity_division || getKPIField('Activity Division') || ''
        case 'activity_scope':
          return getKPIField('Activity Scope') || ''
        case 'key_dates':
          const keyDate = getKPIField('Key Date') || ''
          return keyDate ? new Date(keyDate).getTime() : 0
        case 'cumulative_quantity':
          // Calculate cumulative quantity from all related KPIs
          const relatedKPIsForCumQty = kpis.filter((otherKPI: any) => {
            const sameProject = (
              otherKPI.project_code === kpi.project_code ||
              otherKPI.project_full_code === kpi.project_code ||
              otherKPI.project_code === kpi.project_full_code ||
              otherKPI.project_full_code === kpi.project_full_code
            )
            const sameActivity = (
              otherKPI.activity_name?.toLowerCase().trim() === kpi.activity_name?.toLowerCase().trim()
            )
            const sameInputType = otherKPI.input_type === kpi.input_type
            return sameProject && sameActivity && sameInputType
          })
          const cumQty = relatedKPIsForCumQty.reduce((sum, k) => {
            const qty = parseFloat(String(k.quantity || 0).replace(/,/g, '')) || 0
            return sum + qty
          }, 0)
          return cumQty
        case 'cumulative_value':
          // Calculate cumulative value from all related KPIs
          const relatedKPIsForCumValue = kpis.filter((otherKPI: any) => {
            const sameProject = (
              otherKPI.project_code === kpi.project_code ||
              otherKPI.project_full_code === kpi.project_code ||
              otherKPI.project_code === kpi.project_full_code ||
              otherKPI.project_full_code === kpi.project_full_code
            )
            const sameActivity = (
              otherKPI.activity_name?.toLowerCase().trim() === kpi.activity_name?.toLowerCase().trim()
            )
            const sameInputType = otherKPI.input_type === kpi.input_type
            return sameProject && sameActivity && sameInputType
          })
          const cumValue = relatedKPIsForCumValue.reduce((sum, k) => {
            const val = parseFloat(String(k.value || 0).replace(/,/g, '')) || 0
            return sum + val
          }, 0)
          return cumValue
        default:
          return getKPIField(columnId) || ''
      }
    }
    
    return [...kpis].sort((a, b) => {
      const aValue = getSortValueWithKPIs(a, sortColumn)
      const bValue = getSortValueWithKPIs(b, sortColumn)
      
      if (aValue === null || aValue === undefined) return 1
      if (bValue === null || bValue === undefined) return -1
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue, undefined, { numeric: true, sensitivity: 'base' })
        return sortDirection === 'asc' ? comparison : -comparison
      }
      
      const comparison = (aValue as number) - (bValue as number)
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [kpis, sortColumn, sortDirection])

  // ✅ Check permission before rendering the entire table
  if (!guard.hasAccess('kpi.view')) {
    return null
  }

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
                <PermissionButton
                  permission="kpi.delete"
                  variant="outline"
                  size="sm"
                  onClick={handleBulkDelete}
                  className="text-red-600 hover:text-red-700"
                >
                  Delete Selected
                </PermissionButton>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <PermissionButton
            permission="kpi.view"
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
              {visibleColumns.map((column) => {
                const isSortable = column.id !== 'select' && column.id !== 'actions'
                const isSorted = sortColumn === column.id
                
                return (
                <th
                  key={column.id}
                    onClick={() => isSortable && handleSort(column.id)}
                    className={`px-4 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 ${
                      isSortable ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none' : ''
                    }`}
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
                          checked={selectedIds.length === kpis.length && kpis.length > 0}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          title="Select All"
                        />
                        <span>{column.label}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span>{column.label}</span>
                        {isSortable && (
                          <div className="flex flex-col">
                            {isSorted ? (
                              sortDirection === 'asc' ? (
                                <ArrowUp className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                              ) : (
                                <ArrowDown className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                              )
                            ) : (
                              <ArrowUpDown className="h-3 w-3 text-gray-400 dark:text-gray-500" />
                            )}
                          </div>
                        )}
                      </div>
                    )}
                </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {sortedKPIs.map((kpi) => (
              <tr
                key={kpi.id}
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
                    {renderCell(kpi, column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Column Customizer Modal */}
      {showCustomizer && guard.hasAccess('kpi.view') && (
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