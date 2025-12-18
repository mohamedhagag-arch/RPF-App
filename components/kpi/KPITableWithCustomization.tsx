'use client'

import { useState, useEffect, useMemo } from 'react'
import { KPIRecord, Project } from '@/lib/supabase'
import { ColumnCustomizer, ColumnConfig } from '@/components/ui/ColumnCustomizer'
import { useColumnCustomization } from '@/lib/useColumnCustomization'
import { Button } from '@/components/ui/Button'
import { PermissionButton } from '@/components/ui/PermissionButton'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { CheckCircle, Clock, AlertCircle, Calendar, Building, Activity, TrendingUp, Target, Info, Filter, X, ArrowUpDown, ArrowUp, ArrowDown, Edit, History } from 'lucide-react'
import { formatCurrencyByCodeSync } from '@/lib/currenciesManager'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
import { KPIHistoryModal } from '@/components/kpi/KPIHistoryModal'
import { RecordHistoryModal } from '@/components/common/RecordHistoryModal'
import { formatDate } from '@/lib/dateHelpers'

interface KPITableWithCustomizationProps {
  kpis: KPIRecord[]
  projects: Project[]
  onEdit: (kpi: KPIRecord) => void
  onDelete: (id: string) => void
  onBulkDelete?: (ids: string[]) => void
  onBulkEdit?: (selectedKPIs: KPIRecord[]) => void
  allActivities?: any[] // ✅ Add activities to get Rate from BOQ
  onSort?: (columnId: string, direction: 'asc' | 'desc') => void // ✅ Server-side sorting callback
  currentSortColumn?: string | null // ✅ Current sort column from parent
  currentSortDirection?: 'asc' | 'desc' // ✅ Current sort direction from parent
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
  { id: 'section', label: 'Section', visible: true, order: 7, width: '150px' },
  { id: 'activity_commencement_relation', label: 'Activity Commencement Relation', visible: true, order: 8, width: '260px' },
  { id: 'activity_division', label: 'Activity Division', visible: true, order: 9, width: '200px' },
  { id: 'activity_scope', label: 'Activity Scope', visible: true, order: 10, width: '200px' },
  { id: 'key_dates', label: 'Key Dates', visible: true, order: 11, width: '170px' },
  { id: 'cumulative_quantity', label: 'Cumulative Quantity', visible: true, order: 12, width: '200px' },
  { id: 'cumulative_value', label: 'Cumulative Value', visible: true, order: 13, width: '200px' },
  { id: 'actions', label: 'Actions', visible: true, order: 14, fixed: true, width: '160px' }
]

export function KPITableWithCustomization({ 
  kpis, 
  projects, 
  onEdit, 
  onDelete, 
  onBulkDelete,
  onBulkEdit,
  allActivities = [], // ✅ Add activities prop
  onSort, // ✅ Server-side sorting callback
  currentSortColumn, // ✅ Current sort column from parent
  currentSortDirection // ✅ Current sort direction from parent
}: KPITableWithCustomizationProps) {
  const guard = usePermissionGuard()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showCustomizer, setShowCustomizer] = useState(false)
  const [historyKPI, setHistoryKPI] = useState<KPIRecord | null>(null)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [showRecordHistoryModal, setShowRecordHistoryModal] = useState(false)
  const [historyRecordId, setHistoryRecordId] = useState<string>('')
  const [historyRecordType, setHistoryRecordType] = useState<'kpi' | 'boq' | 'project'>('kpi')
  const [historyRecordData, setHistoryRecordData] = useState<any>(null)
  // ✅ Cache for activity-to-scope mapping from project_type_activities table
  const [activityScopeMap, setActivityScopeMap] = useState<Map<string, string>>(new Map())
  
  // ✅ Helper function to find scope with flexible matching
  // Handles cases like "Guide Wall - Infra" matching "Guide Wall"
  const findActivityScope = (activityName: string, scopeMap: Map<string, string>): string | undefined => {
    if (!activityName || scopeMap.size === 0) return undefined
    
    const normalizedName = activityName.trim().toLowerCase()
    
    // Try exact match first
    let scope = scopeMap.get(normalizedName)
    if (scope) return scope
    
    // Try removing last segment after "-" or " -"
    // Examples: "Guide Wall - Infra" -> "Guide Wall", "Activity - Type" -> "Activity"
    const segments = normalizedName.split(/\s*-\s*/)
    if (segments.length > 1) {
      // Try with first segment only
      const firstSegment = segments[0].trim()
      if (firstSegment) {
        scope = scopeMap.get(firstSegment)
        if (scope) return scope
      }
      
      // Try with all segments except last
      const withoutLast = segments.slice(0, -1).join(' - ').trim()
      if (withoutLast) {
        scope = scopeMap.get(withoutLast)
        if (scope) return scope
      }
    }
    
    // Try partial match (check if any key in map starts with the activity name or vice versa)
    let foundScope: string | undefined = undefined
    scopeMap.forEach((value, key) => {
      if (!foundScope && (normalizedName.startsWith(key) || key.startsWith(normalizedName))) {
        foundScope = value
      }
    })
    
    return foundScope
  }
  
  // ✅ Local sorting state (fallback if onSort not provided)
  const [localSortColumn, setLocalSortColumn] = useState<string | null>(null)
  const [localSortDirection, setLocalSortDirection] = useState<'asc' | 'desc'>('asc')
  
  // ✅ Use parent sort state if available, otherwise use local state
  const sortColumn = currentSortColumn !== undefined ? currentSortColumn : localSortColumn
  const sortDirection = currentSortDirection !== undefined ? currentSortDirection : localSortDirection
  
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

  // ✅ FIX: Find project by project_full_code (same logic as BOQTableWithCustomization)
  const getProjectByFullCode = (projectFullCode: string) => {
    return projects.find(p => {
      const pFullCode = (p.project_full_code || '').trim()
      if (pFullCode && pFullCode.toUpperCase() === projectFullCode.toUpperCase()) {
        return true
      }
      // Fallback: build full code from project_code + project_sub_code
      const pCode = (p.project_code || '').trim()
      const pSubCode = (p.project_sub_code || '').trim()
      if (pSubCode) {
        if (pSubCode.toUpperCase().startsWith(pCode.toUpperCase())) {
          return pSubCode.toUpperCase() === projectFullCode.toUpperCase()
        } else {
          const builtFullCode = pSubCode.startsWith('-') 
            ? `${pCode}${pSubCode}`.trim()
            : `${pCode}-${pSubCode}`.trim()
          return builtFullCode.toUpperCase() === projectFullCode.toUpperCase()
        }
      }
      // Final fallback: match by project_code only
      return pCode.toUpperCase() === projectFullCode.toUpperCase()
    })
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

  // Format date helper - using centralized formatDate from dateHelpers

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
        // ✅ FIX: Find project by project_full_code (not just project_code)
        const kpiFullCode = (kpi.project_full_code || kpi.project_code || '').trim()
        const project = getProjectByFullCode(kpiFullCode) || projects.find(p => p.project_code === kpi.project_code)
        
        // ✅ Get project full code and name - prioritize from project object
        let projectFullCode = kpi.project_full_code || kpi.project_code || 'N/A'
        let projectName = ''
        
        if (project) {
          // ✅ Use project's full_code if available, otherwise build it
          projectFullCode = project.project_full_code || kpiFullCode
          projectName = project.project_name || ''
        } else {
          // Fallback: use kpi's project_full_code directly
          projectFullCode = kpi.project_full_code || kpi.project_code || 'N/A'
          // Try to get project name from getProjectName
          const foundProjectName = getProjectName(kpi.project_code || '')
          projectName = foundProjectName && foundProjectName !== kpi.project_code ? foundProjectName : ''
        }
        
        // Always show full code | project name format if we have both
        const projectDisplay = projectFullCode !== 'N/A' && projectName && projectName.trim() !== ''
          ? `${projectFullCode} | ${projectName}`
          : projectFullCode !== 'N/A' 
            ? projectFullCode
            : kpi.project_full_code || kpi.project_code || 'N/A'
        
        // Get Zone from multiple sources (NOT from Section - Section is separate)
        const rawKPIDetails = (kpi as any).raw || {}
        let zoneValue = kpi.zone || 
                       getKPIField(kpi, 'Zone') || 
                       getKPIField(kpi, 'Zone Number') ||
                       rawKPIDetails['Zone'] ||
                       rawKPIDetails['Zone Number'] ||
                       (kpi as any).zone_ref ||
                       (kpi as any).zone_number ||
                       ''
        
        // Remove project code from zone value if it exists
        // Example: "P8888 - 1" -> "1" or "Zone P8888 - Building A" -> "Building A"
        if (zoneValue && zoneValue.toString().trim() !== '') {
          const projectCodeUpper = (kpi.project_code || '').toUpperCase().trim()
          let zoneStr = zoneValue.toString().trim()
          
          // Only normalize if we have a project code
          if (projectCodeUpper) {
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
          }
          
          // If zone is empty or only contains dash after normalization, use original
          if (!zoneStr || zoneStr === '-' || zoneStr === '') {
            zoneStr = zoneValue.toString().trim() || ''
          }
          
          zoneValue = zoneStr
        } else {
          zoneValue = ''
        }
        
        // Debug: Log zone extraction (only in development)
        if (process.env.NODE_ENV === 'development' && !zoneValue) {
          console.log('🔍 Zone extraction debug:', {
            activityName: kpi.activity_name,
            kpiZone: kpi.zone,
            rawZone: rawKPIDetails['Zone'],
            rawZoneNumber: rawKPIDetails['Zone Number'],
            zoneRef: (kpi as any).zone_ref,
            zoneNumber: (kpi as any).zone_number,
            finalZone: zoneValue
          })
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
            {zoneValue && zoneValue.toString().trim() !== '' && zoneValue !== 'N/A' && (
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
        // ============================================
        // ✅ COMPLETE REWRITE: Value Column - Clean & Simple
        // ============================================
        // Logic:
        // 1. Find BOQ Activity matching: Project + Activity Name + Zone
        // 2. Get Total Value and Total Units from that Activity
        // 3. Rate = Total Value / Total Units
        // 4. Total Value = Quantity × Rate
        // ============================================
        
        const rawKPIValue = (kpi as any).raw || {}
        
        // Helper: Normalize zone (remove project code prefix)
        const normalizeZone = (zone: string, projectCode: string): string => {
          if (!zone || !projectCode) return (zone || '').toLowerCase().trim()
          let normalized = zone.trim()
          const codeUpper = projectCode.toUpperCase()
          normalized = normalized.replace(new RegExp(`^${codeUpper}\\s*-\\s*`, 'i'), '').trim()
          normalized = normalized.replace(new RegExp(`^${codeUpper}\\s+`, 'i'), '').trim()
          normalized = normalized.replace(new RegExp(`^${codeUpper}-`, 'i'), '').trim()
          return normalized.toLowerCase()
        }
        
        // Helper: Extract zone number
        const extractZoneNumber = (zone: string): string => {
          if (!zone || zone.trim() === '') return ''
          const numberMatch = zone.match(/\d+/)
          if (numberMatch) return numberMatch[0]
          return zone.toLowerCase().trim()
        }
        
        // Get Quantity
        let quantityForValue = parseFloat(String(rawKPIValue['Quantity'] || '0').replace(/,/g, '')) || 0
        if (quantityForValue === 0) {
          quantityForValue = kpi.quantity || 0
        }
        
        // Extract KPI info
        const kpiProjectCode = (kpi.project_code || rawKPIValue['Project Code'] || '').toString().trim().toUpperCase()
        const kpiProjectFullCode = (kpi.project_full_code || rawKPIValue['Project Full Code'] || '').toString().trim().toUpperCase()
        const kpiActivityName = (kpi.activity_name || rawKPIValue['Activity Name'] || '').toLowerCase().trim()
        const kpiZoneRaw = (kpi.zone || rawKPIValue['Zone'] || rawKPIValue['Zone Number'] || '').toString().trim()
        const kpiZone = normalizeZone(kpiZoneRaw, kpiProjectCode)
        const kpiZoneNum = extractZoneNumber(kpiZone)
        
        // Find matching Activity from BOQ
        let matchedActivity: any = null
        if (allActivities.length > 0 && kpiActivityName) {
          matchedActivity = allActivities.find((activity: any) => {
            // 1. Activity Name must match
            const activityName = (activity.activity_name || activity.activity || '').toLowerCase().trim()
            if (!activityName || (activityName !== kpiActivityName && !activityName.includes(kpiActivityName) && !kpiActivityName.includes(activityName))) {
              return false
            }
            
            // 2. Project Code must match
            const activityProjectCode = (activity.project_code || '').toString().trim().toUpperCase()
            const activityProjectFullCode = (activity.project_full_code || activity.project_code || '').toString().trim().toUpperCase()
            const projectMatch = (
              (kpiProjectCode && activityProjectCode && kpiProjectCode === activityProjectCode) ||
              (kpiProjectFullCode && activityProjectFullCode && kpiProjectFullCode === activityProjectFullCode) ||
              (kpiProjectCode && activityProjectFullCode && kpiProjectCode === activityProjectFullCode) ||
              (kpiProjectFullCode && activityProjectCode && kpiProjectFullCode === activityProjectCode)
            )
            if (!projectMatch) return false
            
            // 3. Zone MUST match EXACTLY (if KPI has zone)
            if (kpiZone && kpiZone.trim() !== '') {
              const rawActivity = (activity as any).raw || {}
              const activityZoneRaw = (activity.zone_ref || activity.zone_number || rawActivity['Zone Ref'] || rawActivity['Zone Number'] || '').toString().trim()
              const activityZone = normalizeZone(activityZoneRaw, activityProjectCode)
              
              if (!activityZone || activityZone.trim() === '') {
                return false // Activity has no zone but KPI has zone
              }
              
              const activityZoneNum = extractZoneNumber(activityZone)
              if (kpiZoneNum && activityZoneNum && kpiZoneNum !== activityZoneNum) {
                return false // Zone numbers don't match
              }
            }
            
            return true
          })
        }
        
        // Calculate Rate from matched Activity - CRITICAL: We MUST have a rate to calculate financial value
        let rateForValue = 0
        let totalValueFromActivity = 0
        
        if (matchedActivity) {
          const rawActivity = (matchedActivity as any).raw || {}
            
          // Get Total Value and Total Units from Activity in THIS Zone
          totalValueFromActivity = matchedActivity.total_value || 
                                   parseFloat(String(rawActivity['Total Value'] || '0').replace(/,/g, '')) || 
                                   0
            
          const totalUnits = matchedActivity.total_units || 
                           matchedActivity.planned_units ||
                              parseFloat(String(rawActivity['Total Units'] || rawActivity['Planned Units'] || '0').replace(/,/g, '')) || 
                              0
              
          // Calculate Rate = Total Value / Total Units
          if (totalUnits > 0 && totalValueFromActivity > 0) {
            rateForValue = totalValueFromActivity / totalUnits
          } else {
            // Fallback: Try to get rate directly from activity
            rateForValue = matchedActivity.rate || 
                          parseFloat(String(rawActivity['Rate'] || '0').replace(/,/g, '')) || 
                                     0
          }
            
          // Debug logging
          if (process.env.NODE_ENV === 'development') {
            const activityZoneRaw = (matchedActivity.zone_ref || matchedActivity.zone_number || rawActivity['Zone Ref'] || rawActivity['Zone Number'] || '').toString().trim()
            const activityZone = normalizeZone(activityZoneRaw, matchedActivity.project_code || '')
            const activityZoneNum = extractZoneNumber(activityZone)
            
            console.log(`✅ [KPI Value] Rate calculated for "${kpi.activity_name}":`, {
              kpiZone: kpiZone || 'N/A',
              kpiZoneNum: kpiZoneNum || 'N/A',
              activityZone: activityZone || 'N/A',
              activityZoneNum: activityZoneNum || 'N/A',
              totalValueFromActivity,
              totalUnits,
              rateForValue,
              calculation: `${totalValueFromActivity} / ${totalUnits} = ${rateForValue}`
            })
          }
        }
        
        // ✅ CRITICAL: If no rate from matched Activity, try multiple fallback strategies
        if (rateForValue === 0) {
          // Strategy 1: Try to get rate from KPI raw data
          rateForValue = parseFloat(String(rawKPIValue['Rate'] || '0').replace(/,/g, '')) || 0
          
          // Strategy 2: If still 0, try to find ANY activity with same name and project (ignore zone)
          if (rateForValue === 0 && allActivities.length > 0 && kpiActivityName) {
            const anyMatchingActivity = allActivities.find((activity: any) => {
              const activityName = (activity.activity_name || activity.activity || '').toLowerCase().trim()
              if (!activityName || activityName !== kpiActivityName) return false
              
              const activityProjectCode = (activity.project_code || '').toString().trim().toUpperCase()
              const activityProjectFullCode = (activity.project_full_code || activity.project_code || '').toString().trim().toUpperCase()
              const projectMatch = (
                (kpiProjectCode && activityProjectCode && kpiProjectCode === activityProjectCode) ||
                (kpiProjectFullCode && activityProjectFullCode && kpiProjectFullCode === activityProjectFullCode) ||
                (kpiProjectCode && activityProjectFullCode && kpiProjectCode === activityProjectFullCode) ||
                (kpiProjectFullCode && activityProjectCode && kpiProjectFullCode === activityProjectCode)
              )
              return projectMatch
            })
            
            if (anyMatchingActivity) {
              const rawActivity = (anyMatchingActivity as any).raw || {}
              const totalValue = anyMatchingActivity.total_value || 
                               parseFloat(String(rawActivity['Total Value'] || '0').replace(/,/g, '')) || 
                               0
              const totalUnits = anyMatchingActivity.total_units || 
                               anyMatchingActivity.planned_units ||
                               parseFloat(String(rawActivity['Total Units'] || rawActivity['Planned Units'] || '0').replace(/,/g, '')) || 
                               0
              
              if (totalUnits > 0 && totalValue > 0) {
                rateForValue = totalValue / totalUnits
                if (process.env.NODE_ENV === 'development') {
                  console.log(`✅ [KPI Value] Using Rate from any matching activity (ignoring zone): ${rateForValue}`)
                }
              } else {
                rateForValue = anyMatchingActivity.rate || 
                             parseFloat(String(rawActivity['Rate'] || '0').replace(/,/g, '')) || 
                             0
                if (process.env.NODE_ENV === 'development' && rateForValue > 0) {
                  console.log(`✅ [KPI Value] Using Rate directly from any matching activity: ${rateForValue}`)
                }
              }
            }
          }
          
          if (process.env.NODE_ENV === 'development') {
            if (rateForValue > 0) {
              console.log(`✅ [KPI Value] Final Rate found: ${rateForValue}`)
            } else {
              console.warn(`⚠️ [KPI Value] No Rate found for "${kpi.activity_name}" (Zone: ${kpiZone || 'N/A'}):`, {
                kpiProjectCode,
                kpiActivityName,
                kpiZone: kpiZone || 'N/A',
                kpiZoneNum: kpiZoneNum || 'N/A',
                totalActivities: allActivities.length,
                quantityForValue,
                hasMatchedActivity: !!matchedActivity
              })
            }
          }
        }
        
        // ✅ CRITICAL FIX: ALWAYS calculate from Quantity × Rate if Quantity is available
        // NEVER use Value from KPI if it equals Quantity (it's a quantity, not a financial value)
        let totalValue = 0
        
        // Get Value from KPI for comparison
        const valueFromKPI = kpi.value || parseFloat(String(rawKPIValue['Value'] || '0').replace(/,/g, '')) || 0
        
        // ✅ CRITICAL CHECK: If Value equals Quantity, it means it's a quantity stored in Value field
        // In this case, we MUST calculate from Rate × Quantity, never use the Value
        const isValueActuallyQuantity = valueFromKPI > 0 && quantityForValue > 0 && Math.abs(valueFromKPI - quantityForValue) < 0.01
        
        // ✅ PRIORITY 1: ALWAYS calculate from Quantity × Rate if both Quantity and Rate are available
        // This is ALWAYS the correct method - never use Value from KPI when we can calculate
        if (quantityForValue > 0 && rateForValue > 0) {
          // We have both Quantity and Rate - ALWAYS calculate the financial value
          totalValue = quantityForValue * rateForValue
          if (process.env.NODE_ENV === 'development') {
            console.log(`✅ [KPI Value] Calculating from Rate × Quantity: ${quantityForValue} × ${rateForValue} = ${totalValue}`)
          }
        } else if (quantityForValue > 0) {
          // We have quantity but no rate
          if (isValueActuallyQuantity) {
            // Value equals quantity, so we cannot use it - we need Rate
            // Keep totalValue as 0 and show warning
            if (process.env.NODE_ENV === 'development') {
              console.warn(`⚠️ [KPI Value] Value equals Quantity (${valueFromKPI}), but no Rate found. Cannot calculate financial value.`)
            }
          } else if (valueFromKPI > 0 && !isValueActuallyQuantity) {
            // Value is different from quantity, so it's a real financial value
            // Since Rate is 0, use Value as fallback
            totalValue = valueFromKPI
            if (process.env.NODE_ENV === 'development') {
              console.log(`✅ [KPI Value] No Rate available, using Value from KPI: ${valueFromKPI}`)
            }
          }
        }
        
        // ✅ PRIORITY 2: FALLBACK - If still 0 and no quantity, try Planned Value or Actual Value
        if (totalValue === 0 && quantityForValue === 0) {
          if (kpi.input_type === 'Planned') {
            const plannedValue = kpi.planned_value || parseFloat(String(rawKPIValue['Planned Value'] || '0').replace(/,/g, '')) || 0
            if (plannedValue > 0) {
              totalValue = plannedValue
              if (process.env.NODE_ENV === 'development') {
                console.log(`✅ [KPI Value] Using Planned Value from KPI for "${kpi.activity_name}": ${plannedValue}`)
              }
            }
          } else if (kpi.input_type === 'Actual') {
            const actualValue = kpi.actual_value || parseFloat(String(rawKPIValue['Actual Value'] || '0').replace(/,/g, '')) || 0
            if (actualValue > 0) {
              totalValue = actualValue
              if (process.env.NODE_ENV === 'development') {
                console.log(`✅ [KPI Value] Using Actual Value from KPI for "${kpi.activity_name}": ${actualValue}`)
              }
            }
          }
        }
        
        // ✅ FINAL CHECK: If totalValue is still 0 but we have quantity, and Value equals quantity
        // This means we couldn't calculate because Rate is missing
        // In this case, we should NOT display the quantity as value - keep it as 0
        if (totalValue === 0 && quantityForValue > 0 && isValueActuallyQuantity) {
          // Explicitly keep as 0 - don't use quantity as value
          totalValue = 0
        }
        
        // Get project currency
        const projectForValue = projects.find(p => {
          const pCode = (p.project_code || '').toString().trim().toUpperCase()
          const pFullCode = (p.project_full_code || p.project_code || '').toString().trim().toUpperCase()
          return (
            (kpiProjectCode && pCode && kpiProjectCode === pCode) ||
            (kpiProjectFullCode && pFullCode && kpiProjectFullCode === pFullCode) ||
            (kpiProjectCode && pFullCode && kpiProjectCode === pFullCode) ||
            (kpiProjectFullCode && pCode && kpiProjectFullCode === pCode)
          )
        })
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
        // ============================================
        // ✅ COMPLETE REWRITE: Virtual Value Column - Clean & Simple
        // ============================================
        // Logic:
        // 1. Get Virtual Material Value from project
        // 2. Find BOQ Activity matching: Project + Activity Name + Zone
        // 3. Get Total Value and Total Units from that Activity
        // 4. Rate = Total Value / Total Units
        // 5. Base Value = Quantity × Rate
        // 6. Total Virtual Value = Virtual Material Value + Base Value
        // ============================================
        
        const rawKPIVirtual = (kpi as any).raw || {}
        
        // Helper: Normalize zone (same as value column)
        const normalizeZoneVirtual = (zone: string, projectCode: string): string => {
          if (!zone || !projectCode) return (zone || '').toLowerCase().trim()
          let normalized = zone.trim()
          const codeUpper = projectCode.toUpperCase()
          normalized = normalized.replace(new RegExp(`^${codeUpper}\\s*-\\s*`, 'i'), '').trim()
          normalized = normalized.replace(new RegExp(`^${codeUpper}\\s+`, 'i'), '').trim()
          normalized = normalized.replace(new RegExp(`^${codeUpper}-`, 'i'), '').trim()
          return normalized.toLowerCase()
        }
        
        // Helper: Extract zone number (same as value column)
        const extractZoneNumberVirtual = (zone: string): string => {
          if (!zone || zone.trim() === '') return ''
          const numberMatch = zone.match(/\d+/)
          if (numberMatch) return numberMatch[0]
          return zone.toLowerCase().trim()
        }
        
        // Get Virtual Material Value from project (as PERCENTAGE, not direct value)
        const kpiProjectCodeVirtual = (kpi.project_code || rawKPIVirtual['Project Code'] || '').toString().trim().toUpperCase()
        const kpiProjectFullCodeVirtual = (kpi.project_full_code || rawKPIVirtual['Project Full Code'] || '').toString().trim().toUpperCase()
        
        const projectForVirtual = projects.find(p => {
          const pCode = (p.project_code || '').toString().trim().toUpperCase()
          const pFullCode = (p.project_full_code || p.project_code || '').toString().trim().toUpperCase()
          return (
            (kpiProjectCodeVirtual && pCode && kpiProjectCodeVirtual === pCode) ||
            (kpiProjectFullCodeVirtual && pFullCode && kpiProjectFullCodeVirtual === pFullCode) ||
            (kpiProjectCodeVirtual && pFullCode && kpiProjectCodeVirtual === pFullCode) ||
            (kpiProjectFullCodeVirtual && pCode && kpiProjectFullCodeVirtual === pCode)
          )
        })
        
        // ✅ Virtual Material Value is a PERCENTAGE (e.g., "15%" or "20%")
        // Extract percentage from string (remove % sign and parse)
        let virtualMaterialPercentage = 0
        if (projectForVirtual) {
          const virtualMaterialValueStr = String(projectForVirtual.virtual_material_value || '0').trim()
          // Remove % sign, spaces, and parse
          // Handle formats like "15%", "15 %", "15", or "0.15" (as decimal)
          let cleanedValue = virtualMaterialValueStr.replace(/%/g, '').replace(/,/g, '').replace(/\s+/g, '').trim()
          
          // If value is between 0 and 1, treat as decimal (e.g., 0.15 = 15%)
          const parsedValue = parseFloat(cleanedValue) || 0
          if (parsedValue > 0 && parsedValue <= 1) {
            virtualMaterialPercentage = parsedValue * 100
          } else {
            virtualMaterialPercentage = parsedValue
          }
        }
        if (virtualMaterialPercentage === 0) {
          const virtualMaterialValueStr = String(rawKPIVirtual['Virtual Material Value'] || '0').trim()
          let cleanedValue = virtualMaterialValueStr.replace(/%/g, '').replace(/,/g, '').replace(/\s+/g, '').trim()
          const parsedValue = parseFloat(cleanedValue) || 0
          if (parsedValue > 0 && parsedValue <= 1) {
            virtualMaterialPercentage = parsedValue * 100
          } else {
            virtualMaterialPercentage = parsedValue
          }
        }
        
        // Get Quantity
        let quantityForVirtual = parseFloat(String(rawKPIVirtual['Quantity'] || '0').replace(/,/g, '')) || 0
        if (quantityForVirtual === 0) {
          quantityForVirtual = kpi.quantity || 0
        }
        
        // Extract KPI info
        const kpiActivityNameVirtual = (kpi.activity_name || rawKPIVirtual['Activity Name'] || '').toLowerCase().trim()
        const kpiZoneRawVirtual = (kpi.zone || rawKPIVirtual['Zone'] || rawKPIVirtual['Zone Number'] || '').toString().trim()
        const kpiZoneVirtual = normalizeZoneVirtual(kpiZoneRawVirtual, kpiProjectCodeVirtual)
        const kpiZoneNumVirtual = extractZoneNumberVirtual(kpiZoneVirtual)
        
        // Find matching Activity from BOQ (same logic as value column)
        // ✅ CRITICAL: Only calculate Virtual Material if use_virtual_material = true in BOQ Activity
        let matchedActivityVirtual: any = null
        if (allActivities.length > 0 && kpiActivityNameVirtual) {
          matchedActivityVirtual = allActivities.find((activity: any) => {
            // 1. Activity Name must match
            const activityName = (activity.activity_name || activity.activity || '').toLowerCase().trim()
            if (!activityName || (activityName !== kpiActivityNameVirtual && !activityName.includes(kpiActivityNameVirtual) && !kpiActivityNameVirtual.includes(activityName))) {
              return false
            }
            
            // 2. Project Code must match
            const activityProjectCode = (activity.project_code || '').toString().trim().toUpperCase()
            const activityProjectFullCode = (activity.project_full_code || activity.project_code || '').toString().trim().toUpperCase()
            const projectMatch = (
              (kpiProjectCodeVirtual && activityProjectCode && kpiProjectCodeVirtual === activityProjectCode) ||
              (kpiProjectFullCodeVirtual && activityProjectFullCode && kpiProjectFullCodeVirtual === activityProjectFullCode) ||
              (kpiProjectCodeVirtual && activityProjectFullCode && kpiProjectCodeVirtual === activityProjectFullCode) ||
              (kpiProjectFullCodeVirtual && activityProjectCode && kpiProjectFullCodeVirtual === activityProjectCode)
            )
            if (!projectMatch) return false
            
            // 3. Zone MUST match EXACTLY (if KPI has zone)
            if (kpiZoneVirtual && kpiZoneVirtual.trim() !== '') {
              const rawActivity = (activity as any).raw || {}
              const activityZoneRaw = (activity.zone_ref || activity.zone_number || rawActivity['Zone Ref'] || rawActivity['Zone Number'] || '').toString().trim()
              const activityZone = normalizeZoneVirtual(activityZoneRaw, activityProjectCode)
              
              if (!activityZone || activityZone.trim() === '') {
                return false // Activity has no zone but KPI has zone
              }
              
              const activityZoneNum = extractZoneNumberVirtual(activityZone)
              if (kpiZoneNumVirtual && activityZoneNum && kpiZoneNumVirtual !== activityZoneNum) {
                return false // Zone numbers don't match
              }
            }
            
            return true
          })
        }
        
        // ✅ CRITICAL: Check if use_virtual_material is enabled for this activity
        const useVirtualMaterialEnabled = matchedActivityVirtual?.use_virtual_material ?? false
        
        // ✅ If use_virtual_material is false, don't calculate Virtual Material (set percentage to 0)
        if (!useVirtualMaterialEnabled) {
          virtualMaterialPercentage = 0
        }
        
        // Calculate Rate from matched Activity
        let rateForVirtual = 0
        let totalValueFromActivityVirtual = 0
        
        if (matchedActivityVirtual) {
          const rawActivityVirtual = (matchedActivityVirtual as any).raw || {}
            
          // Get Total Value and Total Units from Activity in THIS Zone
          totalValueFromActivityVirtual = matchedActivityVirtual.total_value || 
                                           parseFloat(String(rawActivityVirtual['Total Value'] || '0').replace(/,/g, '')) || 
                                           0
            
          const totalUnitsVirtual = matchedActivityVirtual.total_units || 
                                   matchedActivityVirtual.planned_units ||
                                      parseFloat(String(rawActivityVirtual['Total Units'] || rawActivityVirtual['Planned Units'] || '0').replace(/,/g, '')) || 
                                      0
              
          // Calculate Rate = Total Value / Total Units
              if (totalUnitsVirtual > 0 && totalValueFromActivityVirtual > 0) {
                rateForVirtual = totalValueFromActivityVirtual / totalUnitsVirtual
          } else {
            // Fallback: Try to get rate directly from activity
            rateForVirtual = matchedActivityVirtual.rate || 
                            parseFloat(String(rawActivityVirtual['Rate'] || '0').replace(/,/g, '')) || 
                                     0
          }
        }
        
        // ✅ CRITICAL: If no rate from Activity, try multiple fallback strategies (same as Value column)
        if (rateForVirtual === 0) {
          // Strategy 1: Try to get rate from KPI raw data
          rateForVirtual = parseFloat(String(rawKPIVirtual['Rate'] || '0').replace(/,/g, '')) || 0
          
          // Strategy 2: If still 0, try to find ANY activity with same name and project (ignore zone)
          if (rateForVirtual === 0 && allActivities.length > 0 && kpiActivityNameVirtual) {
            const anyMatchingActivity = allActivities.find((activity: any) => {
              const activityName = (activity.activity_name || activity.activity || '').toLowerCase().trim()
              if (!activityName || activityName !== kpiActivityNameVirtual) return false
              
              const activityProjectCode = (activity.project_code || '').toString().trim().toUpperCase()
              const activityProjectFullCode = (activity.project_full_code || activity.project_code || '').toString().trim().toUpperCase()
              const projectMatch = (
                (kpiProjectCodeVirtual && activityProjectCode && kpiProjectCodeVirtual === activityProjectCode) ||
                (kpiProjectFullCodeVirtual && activityProjectFullCode && kpiProjectFullCodeVirtual === activityProjectFullCode) ||
                (kpiProjectCodeVirtual && activityProjectFullCode && kpiProjectCodeVirtual === activityProjectFullCode) ||
                (kpiProjectFullCodeVirtual && activityProjectCode && kpiProjectFullCodeVirtual === activityProjectCode)
              )
              return projectMatch
            })
            
            if (anyMatchingActivity) {
              const rawActivity = (anyMatchingActivity as any).raw || {}
              const totalValue = anyMatchingActivity.total_value || 
                               parseFloat(String(rawActivity['Total Value'] || '0').replace(/,/g, '')) || 
                               0
              const totalUnits = anyMatchingActivity.total_units || 
                               anyMatchingActivity.planned_units ||
                               parseFloat(String(rawActivity['Total Units'] || rawActivity['Planned Units'] || '0').replace(/,/g, '')) || 
                               0
              
              if (totalUnits > 0 && totalValue > 0) {
                rateForVirtual = totalValue / totalUnits
                if (process.env.NODE_ENV === 'development') {
                  console.log(`✅ [KPI Virtual Value] Using Rate from any matching activity (ignoring zone): ${rateForVirtual}`)
                }
              } else {
                rateForVirtual = anyMatchingActivity.rate || 
                               parseFloat(String(rawActivity['Rate'] || '0').replace(/,/g, '')) || 
                               0
                if (process.env.NODE_ENV === 'development' && rateForVirtual > 0) {
                  console.log(`✅ [KPI Virtual Value] Using Rate directly from any matching activity: ${rateForVirtual}`)
                }
              }
            }
          }
          
          if (process.env.NODE_ENV === 'development') {
            if (rateForVirtual > 0) {
              console.log(`✅ [KPI Virtual Value] Final Rate found: ${rateForVirtual}`)
            } else {
              console.warn(`⚠️ [KPI Virtual Value] No Rate found for "${kpi.activity_name}" (Zone: ${kpiZoneVirtual || 'N/A'})`)
            }
          }
        }
        
        // ✅ CRITICAL FIX: Use the SAME calculation logic as Value column
        // This ensures Virtual Value uses the correct financial value (Quantity × Rate), not just quantity
        let baseValue = 0
        
        // Get Value from KPI for comparison
        const valueFromKPIVirtual = kpi.value || parseFloat(String(rawKPIVirtual['Value'] || '0').replace(/,/g, '')) || 0
        
        // ✅ CRITICAL CHECK: If Value equals Quantity, it means it's a quantity stored in Value field
        // In this case, we MUST calculate from Rate × Quantity, never use the Value
        const isValueActuallyQuantityVirtual = valueFromKPIVirtual > 0 && quantityForVirtual > 0 && Math.abs(valueFromKPIVirtual - quantityForVirtual) < 0.01
        
        // ✅ PRIORITY 1: Calculate from Quantity × Rate if Quantity is available
        // This is ALWAYS the correct method when we have a quantity
        if (quantityForVirtual > 0) {
          if (rateForVirtual > 0) {
            // We have both Quantity and Rate - calculate the financial value
            baseValue = quantityForVirtual * rateForVirtual
            if (process.env.NODE_ENV === 'development') {
              console.log(`✅ [KPI Virtual Value] Calculating from Rate × Quantity: ${quantityForVirtual} × ${rateForVirtual} = ${baseValue}`)
            }
          } else if (isValueActuallyQuantityVirtual) {
            // Value equals quantity, so we cannot use it - we need Rate
            // Keep baseValue as 0 and show warning
            if (process.env.NODE_ENV === 'development') {
              console.warn(`⚠️ [KPI Virtual Value] Value equals Quantity (${valueFromKPIVirtual}), but no Rate found. Cannot calculate financial value.`)
            }
          } else if (valueFromKPIVirtual > 0 && !isValueActuallyQuantityVirtual) {
            // Value is different from quantity, so it's a real financial value
            // But we prefer Rate × Quantity if Rate is available
            // Since Rate is 0, use Value as fallback
            baseValue = valueFromKPIVirtual
            if (process.env.NODE_ENV === 'development') {
              console.log(`✅ [KPI Virtual Value] No Rate available, using Value from KPI: ${valueFromKPIVirtual}`)
            }
          }
        }
        
        // ✅ PRIORITY 2: FALLBACK - If still 0 and no quantity, try Planned Value or Actual Value
        if (baseValue === 0 && quantityForVirtual === 0) {
          if (kpi.input_type === 'Planned') {
            const plannedValue = kpi.planned_value || parseFloat(String(rawKPIVirtual['Planned Value'] || '0').replace(/,/g, '')) || 0
            if (plannedValue > 0) {
              baseValue = plannedValue
              if (process.env.NODE_ENV === 'development') {
                console.log(`✅ [KPI Virtual Value] Using Planned Value from KPI for "${kpi.activity_name}": ${plannedValue}`)
              }
            }
          } else if (kpi.input_type === 'Actual') {
            const actualValue = kpi.actual_value || parseFloat(String(rawKPIVirtual['Actual Value'] || '0').replace(/,/g, '')) || 0
            if (actualValue > 0) {
              baseValue = actualValue
              if (process.env.NODE_ENV === 'development') {
                console.log(`✅ [KPI Virtual Value] Using Actual Value from KPI for "${kpi.activity_name}": ${actualValue}`)
              }
            }
          }
        }
        
        // ✅ FINAL CHECK: If baseValue is still 0 but we have quantity, and Value equals quantity
        // This means we couldn't calculate because Rate is missing
        // In this case, we should NOT display the quantity as value - keep it as 0
        if (baseValue === 0 && quantityForVirtual > 0 && isValueActuallyQuantityVirtual) {
          // Explicitly keep as 0 - don't use quantity as value
          baseValue = 0
        }
        
        // ✅ Virtual Material calculation (as PERCENTAGE):
        // - Virtual Material Amount = Base Value × (Virtual Material Percentage / 100)
        // - Total Virtual Value = Base Value + Virtual Material Amount = Base Value × (1 + Percentage / 100)
        let virtualMaterialAmount = 0
        let totalVirtualValue = baseValue
        
        if (useVirtualMaterialEnabled && virtualMaterialPercentage > 0) {
          // Calculate Virtual Material Amount from percentage
          virtualMaterialAmount = baseValue * (virtualMaterialPercentage / 100)
          // Total = Base Value + Virtual Material Amount
          totalVirtualValue = baseValue + virtualMaterialAmount
        }
        
        // Get project currency
        const currencyCodeForVirtual = projectForVirtual?.currency || 'AED'
        
        return (
          <div className="space-y-1">
            {useVirtualMaterialEnabled && virtualMaterialPercentage > 0 ? (
              <>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Virtual Material ({virtualMaterialPercentage}%): {formatCurrencyByCodeSync(virtualMaterialAmount, currencyCodeForVirtual)}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Value: {formatCurrencyByCodeSync(baseValue, currencyCodeForVirtual)}</div>
                <div className="text-sm text-gray-900 dark:text-white">Total: {formatCurrencyByCodeSync(totalVirtualValue, currencyCodeForVirtual)}</div>
              </>
            ) : (
              <>
                <div className="text-xs text-gray-500 dark:text-gray-400">Virtual Material: N/A</div>
                <div className="text-sm text-gray-900 dark:text-white">Total: {formatCurrencyByCodeSync(totalVirtualValue, currencyCodeForVirtual)}</div>
              </>
            )}
          </div>
        )
      
      case 'section':
        // ✅ Section is only relevant for Actual KPIs (entered by site engineer)
        // Show Section only for Actual KPIs, show N/A for Planned KPIs
        const rawKPISection = (kpi as any).raw || {}
        const sectionValue = kpi.section || 
                            rawKPISection['Section'] || 
                            ''
        
        // Only show Section for Actual KPIs
        if (kpi.input_type === 'Actual' || (kpi as any).input_type === 'Actual') {
          return (
            <div className="text-sm text-gray-900 dark:text-white">
              {sectionValue || 'N/A'}
            </div>
          )
        } else {
          // For Planned KPIs, show N/A or empty
          return (
            <div className="text-sm text-gray-400 dark:text-gray-500 italic">
              N/A
            </div>
          )
        }
      
      case 'activity_commencement_relation':
        // ✅ Get Activity Timing from multiple sources (Priority: KPI raw data > KPI mapped field > BOQ Activity > Default)
        const rawKPI = (kpi as any).raw || {}
        // ✅ FIX: Read Activity Timing from KPI first - check both mapped field and raw data
        let activityTiming = (kpi as any).activity_timing || 
                            rawKPI['Activity Timing'] ||
                            rawKPI['activity_timing'] ||
                            getKPIField(kpi, 'Activity Timing') ||
                            ''
        
        // ✅ Normalize empty strings to undefined
        if (activityTiming === '' || activityTiming === 'N/A') {
          activityTiming = undefined
        }
        
        // ✅ DEBUG: Log Activity Timing sources for first few KPIs
        if (kpis.indexOf(kpi) < 3) {
          console.log('🔍 Activity Timing Debug:', {
            kpi_id: kpi.id,
            activity_name: kpi.activity_name,
            kpi_activity_timing: (kpi as any).activity_timing,
            raw_activity_timing: rawKPI['Activity Timing'],
            raw_activity_timing_lower: rawKPI['activity_timing'],
            getKPIField_result: getKPIField(kpi, 'Activity Timing'),
            final_activityTiming: activityTiming
          })
        }
        
        // ✅ Try to get from related BOQ Activity ONLY if not found in KPI
        if (!activityTiming) {
          const activityName = kpi.activity_name || (kpi as any).activity || ''
          const projectCode = kpi.project_code || kpi.project_full_code || ''
          
          if (activityName && allActivities && allActivities.length > 0) {
            const relatedActivity = allActivities.find((a: any) => {
              const nameMatch = (
                a.activity_name?.toLowerCase().trim() === activityName.toLowerCase().trim() ||
                a.activity?.toLowerCase().trim() === activityName.toLowerCase().trim()
              )
              const projectMatch = (
                a.project_code === projectCode ||
                a.project_full_code === projectCode ||
                a.project_code === kpi.project_full_code ||
                a.project_full_code === kpi.project_full_code
              )
              return nameMatch && projectMatch
            })
            
            if (relatedActivity) {
              const boqTiming = relatedActivity.activity_timing || 
                                  (relatedActivity as any).raw?.['Activity Timing'] ||
                                  ''
              
              // ✅ Only use BOQ Activity timing if KPI doesn't have one
              if (boqTiming && boqTiming !== 'N/A' && boqTiming.trim() !== '') {
                activityTiming = boqTiming.trim()
                  
                  // ✅ DEBUG: Log when using BOQ Activity timing
                  if (kpis.indexOf(kpi) < 3) {
                    console.log('🔍 Using BOQ Activity Timing:', {
                      kpi_id: kpi.id,
                      activity_name: activityName,
                      boq_timing: boqTiming,
                      final_timing: activityTiming
                    })
                  }
                }
              }
            }
          }
        
        // ✅ Default to 'post-commencement' only if no timing found at all
        if (!activityTiming || activityTiming === 'N/A' || activityTiming.trim() === '') {
          activityTiming = 'post-commencement'
        }
        
        // ✅ Normalize activity timing value
        const normalizedTiming = activityTiming.toString().toLowerCase().trim()
        
        return (
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 text-xs font-medium rounded ${
              normalizedTiming === 'pre-commencement' 
                ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300' 
                : normalizedTiming === 'post-completion'
                ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
            }`}>
              {normalizedTiming === 'pre-commencement' ? 'Pre-Commencement' : 
               normalizedTiming === 'post-completion' ? 'Post-Completion' : 'Post-Commencement'}
            </span>
          </div>
        )
      
      case 'activity_division':
        // ✅ Get Activity Division from KPI first (stored in database), then fallback to BOQ Activity
        const rawKPIDivision = (kpi as any).raw || {}
        let activityDiv = 'N/A'
        
        // Priority 1: Get Activity Division directly from KPI data (from database)
        activityDiv = getKPIField(kpi, 'Activity Division') ||
                     rawKPIDivision['Activity Division'] ||
                     (kpi as any)['Activity Division'] ||
                     ''
        
        // Priority 2: Fallback to BOQ Activity if not found in KPI
        if ((activityDiv === 'N/A' || !activityDiv || activityDiv.trim() === '') && allActivities.length > 0) {
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
        
        // Priority 3: Final fallback to other KPI fields
        if (activityDiv === 'N/A' || !activityDiv || activityDiv.trim() === '') {
          activityDiv = kpi.activity || 
                       kpi.section || 
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
        
        // Priority 1: Get from project_type_activities table (Settings) - cached map with flexible matching
        if (activityName && activityScopeMap.size > 0) {
          const activityNameLower = activityName.toLowerCase()
          const scope = findActivityScope(activityNameLower, activityScopeMap)
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
                         ''
        }
        
        // Priority 4: ✅ FALLBACK - Get from Project's project_type if still not found
        if ((!activityScope || activityScope === 'N/A' || activityScope.trim() === '') && projects.length > 0) {
          const kpiProjectCode = kpi.project_code || kpi.project_full_code || ''
          if (kpiProjectCode) {
            // Try to find project using getProjectByFullCode helper
            let relatedProject = getProjectByFullCode(kpiProjectCode)
            if (!relatedProject && kpi.project_code) {
              relatedProject = projects.find((p: any) => {
                const projectCode = (p.project_code || '').toString().trim()
                return projectCode === kpi.project_code
              })
            }
            
            if (relatedProject && relatedProject.project_type) {
              // Split project_type (comma-separated) and use first scope
              const projectScopes = relatedProject.project_type.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0)
              if (projectScopes.length > 0) {
                activityScope = projectScopes[0] // Use first scope
                console.log(`✅ [KPI Scope] Found scope from Project's project_type:`, projectScopes[0])
              }
            }
          }
        }
        
        // Final fallback to N/A if still empty
        if (!activityScope || activityScope.trim() === '') {
          activityScope = 'N/A'
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
        const rawKPIActions = (kpi as any).raw || {}
        const createdBy = (kpi as any).created_by || rawKPIActions['created_by'] || null
        
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setHistoryKPI(kpi)
                setShowHistoryModal(true)
              }}
              className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
              title="View KPI History"
            >
              <History className="w-4 h-4 mr-1" />
              History
            </Button>
            {createdBy && (
              <button
                type="button"
                onClick={() => {
                  setShowRecordHistoryModal(true)
                  setHistoryRecordId(kpi.id)
                  setHistoryRecordType('kpi')
                  setHistoryRecordData(kpi)
                }}
                className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                title="View Complete History (All Changes)"
              >
                👤
              </button>
            )}
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
  // Sorting handler - use server-side sorting if callback provided
  const handleSort = (columnId: string) => {
    // Don't sort select or actions columns
    if (columnId === 'select' || columnId === 'actions') return
    
    // ✅ If onSort callback provided, use server-side sorting
    if (onSort) {
      // Use current sort state from parent if available, otherwise default to 'asc'
      const currentCol = currentSortColumn !== undefined ? currentSortColumn : localSortColumn
      const currentDir = currentSortDirection !== undefined ? currentSortDirection : localSortDirection
      const newDirection = currentCol === columnId && currentDir === 'asc' ? 'desc' : 'asc'
      onSort(columnId, newDirection)
      return
    }
    
    // Otherwise, use client-side sorting (fallback)
    if (localSortColumn === columnId) {
      // Toggle direction if same column
      setLocalSortDirection(localSortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // New column, default to ascending
      setLocalSortColumn(columnId)
      setLocalSortDirection('asc')
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
      case 'section':
        // ✅ Section is only relevant for Actual KPIs
        if (kpi.input_type === 'Actual' || (kpi as any).input_type === 'Actual') {
          return kpi.section || getKPIField('Section') || ''
        }
        return '' // Empty for Planned KPIs
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

  // Sort KPIs - skip client-side sorting if server-side sorting is enabled
  const sortedKPIs = useMemo(() => {
    // ✅ If server-side sorting is enabled, don't sort client-side
    if (onSort) {
      return kpis // Data is already sorted from server
    }
    
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
        case 'section':
          // ✅ Section is only relevant for Actual KPIs
          if (kpi.input_type === 'Actual' || (kpi as any).input_type === 'Actual') {
            return kpi.section || getKPIField('Section') || ''
          }
          return '' // Empty for Planned KPIs
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
              {onBulkEdit && (
                <PermissionButton
                  permission="kpi.edit"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const selectedKPIs = kpis.filter(k => selectedIds.includes(k.id))
                    onBulkEdit(selectedKPIs)
                  }}
                  className="text-blue-600 hover:text-blue-700"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Bulk Edit
                </PermissionButton>
              )}
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

      {/* KPI History Modal */}
      <KPIHistoryModal
        kpi={historyKPI}
        isOpen={showHistoryModal}
        onClose={() => {
          setShowHistoryModal(false)
          setHistoryKPI(null)
        }}
      />

      {/* Record History Modal (Complete History with Audit Log) */}
      <RecordHistoryModal
        isOpen={showRecordHistoryModal}
        onClose={() => {
          setShowRecordHistoryModal(false)
          setHistoryRecordId('')
          setHistoryRecordData(null)
        }}
        recordType={historyRecordType}
        recordId={historyRecordId}
        recordData={historyRecordData}
        title="KPI Complete History"
      />
    </div>
  )
}