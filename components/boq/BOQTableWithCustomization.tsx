'use client'

import { useState, useEffect, useMemo } from 'react'
import { BOQActivity, Project } from '@/lib/supabase'
import { ColumnCustomizer, ColumnConfig } from '@/components/ui/ColumnCustomizer'
import { useColumnCustomization } from '@/lib/useColumnCustomization'
import { Button } from '@/components/ui/Button'
import { PermissionButton } from '@/components/ui/PermissionButton'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { PermissionGuard } from '@/components/common/PermissionGuard'
import { CheckCircle, Clock, AlertCircle, Calendar, Building, Activity, TrendingUp, Target, Info, Filter, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { formatCurrencyByCodeSync } from '@/lib/currenciesManager'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
import { RecordHistoryModal } from '@/components/common/RecordHistoryModal'
import { formatDate } from '@/lib/dateHelpers'

interface BOQTableWithCustomizationProps {
  activities: BOQActivity[]
  projects: Project[]
  onEdit: (activity: BOQActivity) => void
  onDelete: (id: string) => void
  onBulkDelete?: (ids: string[]) => void
  allKPIs?: any[] // ✅ Add KPIs to calculate Actual Dates
  onSort?: (columnId: string, direction: 'asc' | 'desc') => void // ✅ Server-side sorting callback
  currentSortColumn?: string | null // ✅ Current sort column from parent
  currentSortDirection?: 'asc' | 'desc' // ✅ Current sort direction from parent
}

// Default column configuration for BOQ Activities
const defaultBOQColumns: ColumnConfig[] = [
  { id: 'select', label: 'Select', visible: true, order: 0, fixed: true, width: '60px' },
  { id: 'activity_details', label: 'Activity Details', visible: true, order: 1, width: '250px' },
  { id: 'scope', label: 'Scope', visible: true, order: 2, width: '200px' },
  { id: 'division', label: 'Division', visible: true, order: 3, width: '180px' }, // ✅ Division column
  { id: 'activity_timing', label: 'Activity Timing', visible: true, order: 4, width: '180px' }, // ✅ Activity Timing column
  { id: 'quantities', label: 'Quantities', visible: true, order: 5, width: '180px' },
  { id: 'activity_value', label: 'Activity Value', visible: true, order: 6, width: '150px' },
  { id: 'planned_dates', label: 'Planned Dates', visible: true, order: 7, width: '180px' },
  { id: 'actual_dates', label: 'Actual Dates', visible: true, order: 8, width: '180px' },
  { id: 'progress_summary', label: 'Progress Summary', visible: true, order: 9, width: '180px' },
  { id: 'work_value_status', label: 'Work Value Status', visible: true, order: 10, width: '200px' },
  { id: 'daily_productivity', label: 'Daily Productivity', visible: true, order: 11, width: '240px' },
  { id: 'activity_status', label: 'Activity Status', visible: true, order: 12, width: '150px' },
  { id: 'use_virtual_material', label: 'Use Virtual Material', visible: true, order: 13, width: '150px' },
  { id: 'actions', label: 'Actions', visible: true, order: 14, fixed: true, width: '200px' }
]

export function BOQTableWithCustomization({ 
  activities, 
  projects, 
  onEdit, 
  onDelete, 
  onBulkDelete,
  allKPIs = [], // ✅ Add KPIs prop
  onSort, // ✅ Server-side sorting callback
  currentSortColumn, // ✅ Current sort column from parent
  currentSortDirection // ✅ Current sort direction from parent
}: BOQTableWithCustomizationProps) {
  const guard = usePermissionGuard()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showCustomizer, setShowCustomizer] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [historyRecordId, setHistoryRecordId] = useState<string>('')
  const [historyRecordType, setHistoryRecordType] = useState<'kpi' | 'boq' | 'project'>('boq')
  const [historyRecordData, setHistoryRecordData] = useState<any>(null)
  // ✅ FIX: Load project types from project_types table for Scope display
  const [projectTypesMap, setProjectTypesMap] = useState<Map<string, { name: string; description?: string }>>(new Map())
  
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
    defaultColumns: defaultBOQColumns, 
    storageKey: 'boq' 
  })

  // ✅ FIX: Load project types and project_type_activities for Scope lookup and Unit Rate
  const [activityProjectTypesMap, setActivityProjectTypesMap] = useState<Map<string, string>>(new Map()) // activity_name -> project_type
  const [activityRatesMap, setActivityRatesMap] = useState<Map<string, number>>(new Map()) // activity_name -> estimated_rate
  
  useEffect(() => {
    const loadData = async () => {
      try {
        const supabase = getSupabaseClient()
        console.log('🔄 Loading project types and activities for BOQ Scope column and Unit Rate...')
        
        // 1. Load project types from project_types table
        const { data: typesData, error: typesError } = await supabase
          .from('project_types')
          .select('name, description')
          .eq('is_active', true)
          .order('name', { ascending: true })
        
        if (typesError) {
          console.error('❌ Error loading project types:', typesError)
        } else {
          // Create a map for quick lookup by name
          const typesMap = new Map<string, { name: string; description?: string }>()
          if (typesData && typesData.length > 0) {
            typesData.forEach((type: any) => {
              if (type.name) {
                typesMap.set(type.name, {
                  name: type.name,
                  description: type.description
                })
              }
            })
          }
          setProjectTypesMap(typesMap)
          console.log(`✅ Loaded ${typesMap.size} project types`)
        }
        
        // 2. Load project_type_activities to map activity_name to project_type and estimated_rate
        const { data: activitiesData, error: activitiesError } = await supabase
          .from('project_type_activities')
          .select('activity_name, project_type, estimated_rate')
          .eq('is_active', true)
        
        if (activitiesError) {
          console.error('❌ Error loading project_type_activities:', activitiesError)
        } else {
          // Create a map: activity_name -> project_type
          const activityTypesMap = new Map<string, string>()
          // Create a map: activity_name -> estimated_rate
          const ratesMap = new Map<string, number>()
          
          if (activitiesData && activitiesData.length > 0) {
            activitiesData.forEach((item: any) => {
              if (item.activity_name) {
                const activityNameLower = item.activity_name.toLowerCase().trim()
                
                // Store project_type (both exact and lowercase for flexible matching)
                if (item.project_type) {
                  activityTypesMap.set(item.activity_name, item.project_type)
                  activityTypesMap.set(activityNameLower, item.project_type)
                }
                
                // Store estimated_rate (both exact and lowercase for flexible matching)
                if (item.estimated_rate != null && item.estimated_rate > 0) {
                  const rate = parseFloat(String(item.estimated_rate)) || 0
                  if (rate > 0) {
                    ratesMap.set(item.activity_name, rate)
                    ratesMap.set(activityNameLower, rate)
                  }
                }
              }
            })
          }
          setActivityProjectTypesMap(activityTypesMap)
          setActivityRatesMap(ratesMap)
          console.log(`✅ Loaded ${activitiesData?.length || 0} activities from project_type_activities (${ratesMap.size} with rates)`)
        }
      } catch (error: any) {
        console.error('❌ Error loading data:', error)
      }
    }
    
    loadData()
  }, [])

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
  
  // ✅ FIX: Get project by project_full_code (not just project_code)
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
      return pCode.toUpperCase() === projectFullCode.toUpperCase()
    })
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

  // Format date helper - using centralized formatDate from dateHelpers

  // Access raw activity data from database row if available
  const getActivityField = (activity: BOQActivity, fieldName: string): any => {
    const raw = (activity as any).raw || activity
    return raw[fieldName] || raw[fieldName.replace(/\s+/g, ' ')] || (activity as any)[fieldName] || ''
  }

  // ✅ COMPLETE REWRITE: Get Planned Start Date from first Planned KPI Date column
  // Logic: Find matching Planned KPIs (Project + Activity Name + Zone), then get FIRST date from Date column
  const getPlannedStartDate = (activity: BOQActivity): string => {
    const raw = (activity as any).raw || {}
    
    // ============================================
    // Helper Functions
    // ============================================
    
    // Normalize zone (remove project code prefix)
    const normalizeZone = (zone: string, projectCode: string): string => {
      if (!zone || !projectCode) return (zone || '').toLowerCase().trim()
      let normalized = zone.trim()
      const codeUpper = projectCode.toUpperCase()
      normalized = normalized.replace(new RegExp(`^${codeUpper}\\s*-\\s*`, 'i'), '').trim()
      normalized = normalized.replace(new RegExp(`^${codeUpper}\\s+`, 'i'), '').trim()
      normalized = normalized.replace(new RegExp(`^${codeUpper}-`, 'i'), '').trim()
      return normalized.toLowerCase()
    }
    
    // Extract zone from activity
    const getActivityZone = (activity: BOQActivity): string => {
      const rawActivity = (activity as any).raw || {}
      let zoneValue = activity.zone_number || 
                     activity.zone_ref || 
                     rawActivity['Zone Number'] ||
                     rawActivity['Zone Ref'] ||
                     rawActivity['Zone #'] ||
                     ''
      
      if (zoneValue && activity.project_code) {
        const projectCodeUpper = activity.project_code.toUpperCase().trim()
        let zoneStr = zoneValue.toString()
        zoneStr = zoneStr.replace(new RegExp(`^${projectCodeUpper}\\s*-\\s*`, 'i'), '').trim()
        zoneStr = zoneStr.replace(new RegExp(`^${projectCodeUpper}\\s+`, 'i'), '').trim()
        zoneStr = zoneStr.replace(new RegExp(`^${projectCodeUpper}-`, 'i'), '').trim()
        zoneStr = zoneStr.replace(/^\s*-\s*/, '').trim()
        zoneStr = zoneStr.replace(/\s+/g, ' ').trim()
        zoneValue = zoneStr || ''
      }
      
      return (zoneValue || '').toString().toLowerCase().trim()
    }
    
    // Extract zone from KPI
    const getKPIZone = (kpi: any): string => {
      const rawKPI = (kpi as any).raw || {}
      // ✅ NOT from Section - Section is separate from Zone
      const zoneRaw = (
        kpi.zone || 
        rawKPI['Zone'] || 
        rawKPI['Zone Number'] || 
        ''
      ).toString().trim()
      const projectCode = (kpi.project_code || kpi['Project Code'] || rawKPI['Project Code'] || '').toString().trim()
      return normalizeZone(zoneRaw, projectCode)
    }
    
    // Extract zone number for exact matching
    // ✅ IMPROVED: Extract zone number more accurately (e.g., "Zone 2" → "2", not "12" → "2")
    const extractZoneNumber = (zone: string): string => {
      if (!zone || zone.trim() === '') return ''
      
      // Normalize zone text
      const normalizedZone = zone.toLowerCase().trim()
      
      // Try to match "zone X" or "zone-X" pattern first (most common)
      const zonePatternMatch = normalizedZone.match(/zone\s*[-_]?\s*(\d+)/i)
      if (zonePatternMatch && zonePatternMatch[1]) {
        return zonePatternMatch[1]
      }
      
      // Try to match standalone number at the end (e.g., "Zone 2", "Area 2")
      const endNumberMatch = normalizedZone.match(/(\d+)\s*$/)
      if (endNumberMatch && endNumberMatch[1]) {
        return endNumberMatch[1]
      }
      
      // Fallback: extract first number (but prefer zone-specific patterns above)
      const numberMatch = normalizedZone.match(/\d+/)
      if (numberMatch) return numberMatch[0]
      
      return normalizedZone
    }
    
    // Parse date string to YYYY-MM-DD format (without timezone conversion)
    const parseDateToYYYYMMDD = (dateStr: string): string | null => {
      if (!dateStr || dateStr.trim() === '' || dateStr === 'N/A') return null
      
      try {
        // Try to parse as ISO date first
        const date = new Date(dateStr)
        if (isNaN(date.getTime())) return null
        
        // Extract YYYY-MM-DD directly from the date string if it's already in that format
        // Otherwise, construct it from the date object
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        
        return `${year}-${month}-${day}`
      } catch {
        return null
      }
    }
    
    // ============================================
    // PRIORITY 1: Get from first Planned KPI Date column
    // ============================================
    
    if (allKPIs && allKPIs.length > 0) {
      const activityName = (activity.activity_name || '').toLowerCase().trim()
      const activityProjectCode = (activity.project_code || '').toString().trim().toUpperCase()
      const activityProjectFullCode = (activity.project_full_code || activity.project_code || '').toString().trim().toUpperCase()
      const activityZone = getActivityZone(activity)
      const activityZoneNum = extractZoneNumber(activityZone)
      
      // Find matching Planned KPIs (Project + Activity Name + Zone)
      const matchingKPIs = allKPIs.filter((kpi: any) => {
        const rawKPI = (kpi as any).raw || {}
        
        // 1. Must be Planned
        const kpiInputType = (kpi.input_type || rawKPI['Input Type'] || '').toString().toLowerCase().trim()
        if (kpiInputType !== 'planned') return false
        
        // 2. Activity Name must match
        const kpiActivityName = (kpi.activity_name || rawKPI['Activity Name'] || '').toLowerCase().trim()
        if (!kpiActivityName || !activityName) return false
        if (kpiActivityName !== activityName && !kpiActivityName.includes(activityName) && !activityName.includes(kpiActivityName)) {
          return false
        }
        
        // 3. Project Code must match
        const kpiProjectCode = (kpi.project_code || rawKPI['Project Code'] || '').toString().trim().toUpperCase()
        const kpiProjectFullCode = (kpi.project_full_code || rawKPI['Project Full Code'] || '').toString().trim().toUpperCase()
        
        const projectMatch = (
          (kpiProjectCode && activityProjectCode && kpiProjectCode === activityProjectCode) ||
          (kpiProjectFullCode && activityProjectFullCode && kpiProjectFullCode === activityProjectFullCode) ||
          (kpiProjectCode && activityProjectFullCode && kpiProjectCode === activityProjectFullCode) ||
          (kpiProjectFullCode && activityProjectCode && kpiProjectFullCode === activityProjectCode)
        )
        if (!projectMatch) return false
        
        // 4. Zone must match EXACTLY (if activity has zone)
        if (activityZone && activityZone.trim() !== '') {
          const kpiZone = getKPIZone(kpi)
          if (!kpiZone || kpiZone.trim() === '') return false
          
          const kpiZoneNum = extractZoneNumber(kpiZone)
          if (activityZoneNum && kpiZoneNum && activityZoneNum !== kpiZoneNum) {
            return false
          }
        }
        
        return true
      })
      
      // Get dates from matching KPIs (from Date column)
      if (matchingKPIs.length > 0) {
        const validDates: Array<{ dateStr: string; dateObj: Date; kpi: any }> = []
        
        matchingKPIs.forEach((kpi: any) => {
          const rawKPI = (kpi as any).raw || {}
          
          // Get Date from Activity Date column (for Planned KPIs, filtered by Input Type = 'Planned')
          let kpiDateStr = ''
          if (kpi.activity_date && kpi.activity_date.toString().trim() !== '' && kpi.activity_date !== 'N/A') {
            kpiDateStr = kpi.activity_date.toString().trim()
          } else if (rawKPI['Activity Date'] && rawKPI['Activity Date'].toString().trim() !== '' && rawKPI['Activity Date'] !== 'N/A') {
            kpiDateStr = rawKPI['Activity Date'].toString().trim()
          } else if (rawKPI['Date'] && rawKPI['Date'].toString().trim() !== '' && rawKPI['Date'] !== 'N/A') {
            kpiDateStr = rawKPI['Date'].toString().trim()
          }
          
          if (kpiDateStr) {
            // Parse date without timezone conversion
            const parsedDate = parseDateToYYYYMMDD(kpiDateStr)
            if (parsedDate) {
              // Create date object for sorting (using local time to avoid timezone issues)
              try {
                const [year, month, day] = parsedDate.split('-').map(Number)
                const dateObj = new Date(year, month - 1, day)
                if (!isNaN(dateObj.getTime())) {
                  validDates.push({ dateStr: parsedDate, dateObj, kpi })
                }
              } catch {
                // Skip invalid date
              }
            }
          }
        })
        
        // Sort by date and return earliest (FIRST date from Date column)
        if (validDates.length > 0) {
          validDates.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
          const earliestDate = validDates[0].dateStr
          
          // Debug logging
          if (process.env.NODE_ENV === 'development') {
            const rawKPI = (validDates[0].kpi as any).raw || {}
            const kpiZone = getKPIZone(validDates[0].kpi)
            console.log(`📅 [Planned Start Date] ✅ Activity "${activity.activity_name}" (Zone: ${activityZone || 'N/A'}):`, {
              matchingKPIsCount: matchingKPIs.length,
              validDatesCount: validDates.length,
              allDates: validDates.map(d => d.dateStr),
              earliestDate,
              earliestDateSource: {
                kpiDate: validDates[0].kpi.activity_date || rawKPI['Activity Date'] || rawKPI['Date'] || 'N/A',
                kpiZone: kpiZone || 'N/A',
                kpiActivityName: validDates[0].kpi.activity_name || rawKPI['Activity Name'] || 'N/A',
                kpiProjectCode: validDates[0].kpi.project_code || rawKPI['Project Code'] || 'N/A'
              },
              activityProjectCode,
              activityZone: activityZone || 'N/A',
              note: '✅ Start Date is the FIRST date from Date column in Planned KPIs (no timezone conversion)'
            })
          }
          
          return earliestDate
        }
      }
    }
    
    // ✅ Priority 2: Direct BOQ Activity fields (ONLY if no Planned KPIs found)
    const directStart = activity.planned_activity_start_date || 
                       activity.activity_planned_start_date ||
                       getActivityField(activity, 'Planned Activity Start Date') ||
                       getActivityField(activity, 'Planned Start Date') ||
                       getActivityField(activity, 'Activity Planned Start Date') ||
                       raw['Planned Activity Start Date'] ||
                       raw['Planned Start Date'] ||
                       raw['Activity Planned Start Date'] ||
                       ''
    
    if (directStart && directStart.trim() !== '' && directStart !== 'N/A') {
      return directStart
    }
    
    // Priority 3: Calculate from Completion Date - Duration
    const plannedEnd = activity.deadline || 
                      activity.activity_planned_completion_date ||
                      getActivityField(activity, 'Deadline') ||
                      getActivityField(activity, 'Planned Completion Date') ||
                      getActivityField(activity, 'Activity Planned Completion Date') ||
                      raw['Deadline'] ||
                      raw['Planned Completion Date'] ||
                      raw['Activity Planned Completion Date'] ||
                      ''
    
    const plannedDuration = activity.calendar_duration || 
                           parseFloat(String(getActivityField(activity, 'Calendar Duration') || '0')) ||
                           parseFloat(String(raw['Calendar Duration'] || '0')) ||
                           0
    
    if (plannedEnd && plannedEnd.trim() !== '' && plannedEnd !== 'N/A' && plannedDuration > 0) {
      try {
        const endDate = new Date(plannedEnd)
        if (!isNaN(endDate.getTime())) {
          const startDate = new Date(endDate)
          startDate.setDate(startDate.getDate() - plannedDuration)
          return startDate.toISOString().split('T')[0]
        }
      } catch (e) {
        // Invalid date, continue to next priority
      }
    }
    
    // Priority 4: Get from Project Start Date
    const activityFullCode = (activity.project_full_code || activity.project_code || '').trim()
    const project = getProjectByFullCode(activityFullCode) || projects.find(p => p.project_code === activity.project_code)
    if (project) {
      const projectStartDate = project.project_start_date || 
                              (project as any).start_date ||
                              ''
      if (projectStartDate && projectStartDate.trim() !== '' && projectStartDate !== 'N/A') {
        return projectStartDate
      }
    }
    
    // Priority 5: Try to get from activity raw data (various field names)
    const rawStartDates = [
      raw['Start Date'],
      raw['Activity Start Date'],
      raw['Planned Start'],
      raw['Start'],
      (activity as any).start_date,
      (activity as any).activity_start_date
    ]
    
    for (const date of rawStartDates) {
      if (date && date.toString().trim() !== '' && date !== 'N/A') {
        try {
          const parsedDate = new Date(date)
          if (!isNaN(parsedDate.getTime())) {
            return parsedDate.toISOString().split('T')[0]
          }
        } catch {
          // Invalid date, continue
        }
      }
    }
    
    return ''
  }

  // ============================================
  // Get Actual Start Date (same logic as Planned Start Date)
  // ============================================
  const getActualStartDate = (activity: BOQActivity): string => {
    const raw = (activity as any).raw || {}
    
    // Helper functions (same as getPlannedStartDate)
    const normalizeZone = (zone: string, projectCode: string): string => {
      if (!zone || !projectCode) return (zone || '').toLowerCase().trim()
      let normalized = zone.trim()
      const codeUpper = projectCode.toUpperCase()
      normalized = normalized.replace(new RegExp(`^${codeUpper}\\s*-\\s*`, 'i'), '').trim()
      normalized = normalized.replace(new RegExp(`^${codeUpper}\\s+`, 'i'), '').trim()
      normalized = normalized.replace(new RegExp(`^${codeUpper}-`, 'i'), '').trim()
      return normalized.toLowerCase()
    }
    
    const getActivityZone = (activity: BOQActivity): string => {
      const rawActivity = (activity as any).raw || {}
      let zoneValue = activity.zone_number || 
                     activity.zone_ref || 
                     rawActivity['Zone Number'] ||
                     rawActivity['Zone Ref'] ||
                     rawActivity['Zone #'] ||
                     ''
      
      if (zoneValue && activity.project_code) {
        const projectCodeUpper = activity.project_code.toUpperCase().trim()
        let zoneStr = zoneValue.toString()
        zoneStr = zoneStr.replace(new RegExp(`^${projectCodeUpper}\\s*-\\s*`, 'i'), '').trim()
        zoneStr = zoneStr.replace(new RegExp(`^${projectCodeUpper}\\s+`, 'i'), '').trim()
        zoneStr = zoneStr.replace(new RegExp(`^${projectCodeUpper}-`, 'i'), '').trim()
        zoneStr = zoneStr.replace(/^\s*-\s*/, '').trim()
        zoneStr = zoneStr.replace(/\s+/g, ' ').trim()
        zoneValue = zoneStr || ''
      }
      
      return (zoneValue || '').toString().toLowerCase().trim()
    }
    
    const getKPIZone = (kpi: any): string => {
      const rawKPI = (kpi as any).raw || {}
      // ✅ NOT from Section - Section is separate from Zone
      const zoneRaw = (
        kpi.zone || 
        rawKPI['Zone'] || 
        rawKPI['Zone Number'] || 
        ''
      ).toString().trim()
      const projectCode = (kpi.project_code || kpi['Project Code'] || rawKPI['Project Code'] || '').toString().trim()
      return normalizeZone(zoneRaw, projectCode)
    }
    
    // ✅ IMPROVED: Extract zone number more accurately
    const extractZoneNumber = (zone: string): string => {
      if (!zone || zone.trim() === '') return ''
      
      // Normalize zone text
      const normalizedZone = zone.toLowerCase().trim()
      
      // Try to match "zone X" or "zone-X" pattern first (most common)
      const zonePatternMatch = normalizedZone.match(/zone\s*[-_]?\s*(\d+)/i)
      if (zonePatternMatch && zonePatternMatch[1]) {
        return zonePatternMatch[1]
      }
      
      // Try to match standalone number at the end (e.g., "Zone 2", "Area 2")
      const endNumberMatch = normalizedZone.match(/(\d+)\s*$/)
      if (endNumberMatch && endNumberMatch[1]) {
        return endNumberMatch[1]
      }
      
      // Fallback: extract first number (but prefer zone-specific patterns above)
      const numberMatch = normalizedZone.match(/\d+/)
      if (numberMatch) return numberMatch[0]
      
      return normalizedZone
    }
    
    const parseDateToYYYYMMDD = (dateStr: string): string | null => {
      if (!dateStr || dateStr.trim() === '' || dateStr === 'N/A') return null
      
      try {
        const date = new Date(dateStr)
        if (isNaN(date.getTime())) return null
        
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        
        return `${year}-${month}-${day}`
      } catch {
        return null
      }
    }
    
    // ============================================
    // PRIORITY 1: Get from first Actual KPI Date column
    // ============================================
    
    if (allKPIs && allKPIs.length > 0) {
      const activityName = (activity.activity_name || '').toLowerCase().trim()
      const activityProjectCode = (activity.project_code || '').toString().trim().toUpperCase()
      const activityProjectFullCode = (activity.project_full_code || activity.project_code || '').toString().trim().toUpperCase()
      const activityZone = getActivityZone(activity)
      const activityZoneNum = extractZoneNumber(activityZone)
      
      // Find matching Actual KPIs (Project + Activity Name + Zone)
      const matchingKPIs = allKPIs.filter((kpi: any) => {
        const rawKPI = (kpi as any).raw || {}
        
        // 1. Must be Actual
        const kpiInputType = (kpi.input_type || rawKPI['Input Type'] || '').toString().toLowerCase().trim()
        if (kpiInputType !== 'actual') return false
        
        // 2. Activity Name must match
        const kpiActivityName = (kpi.activity_name || rawKPI['Activity Name'] || '').toLowerCase().trim()
        if (!kpiActivityName || !activityName) return false
        if (kpiActivityName !== activityName && !kpiActivityName.includes(activityName) && !activityName.includes(kpiActivityName)) {
          return false
        }
        
        // 3. Project Code must match
        const kpiProjectCode = (kpi.project_code || rawKPI['Project Code'] || '').toString().trim().toUpperCase()
        const kpiProjectFullCode = (kpi.project_full_code || rawKPI['Project Full Code'] || '').toString().trim().toUpperCase()
        
        const projectMatch = (
          (kpiProjectCode && activityProjectCode && kpiProjectCode === activityProjectCode) ||
          (kpiProjectFullCode && activityProjectFullCode && kpiProjectFullCode === activityProjectFullCode) ||
          (kpiProjectCode && activityProjectFullCode && kpiProjectCode === activityProjectFullCode) ||
          (kpiProjectFullCode && activityProjectCode && kpiProjectFullCode === activityProjectCode)
        )
        if (!projectMatch) return false
        
        // 4. Zone must match EXACTLY (if activity has zone)
        if (activityZone && activityZone.trim() !== '') {
          const kpiZone = getKPIZone(kpi)
          if (!kpiZone || kpiZone.trim() === '') return false
          
          const kpiZoneNum = extractZoneNumber(kpiZone)
          if (activityZoneNum && kpiZoneNum && activityZoneNum !== kpiZoneNum) {
            return false
          }
        }
        
        return true
      })
      
      // Get dates from matching KPIs (from Date/Actual Date column)
      if (matchingKPIs.length > 0) {
        const validDates: Array<{ dateStr: string; dateObj: Date; kpi: any }> = []
        
        matchingKPIs.forEach((kpi: any) => {
          const rawKPI = (kpi as any).raw || {}
          
          // Get Date from Activity Date column (for Actual KPIs, filtered by Input Type = 'Actual')
          let kpiDateStr = ''
          if (kpi.activity_date && kpi.activity_date.toString().trim() !== '' && kpi.activity_date !== 'N/A') {
            kpiDateStr = kpi.activity_date.toString().trim()
          } else if (rawKPI['Activity Date'] && rawKPI['Activity Date'].toString().trim() !== '' && rawKPI['Activity Date'] !== 'N/A') {
            kpiDateStr = rawKPI['Activity Date'].toString().trim()
          } else if (rawKPI['Date'] && rawKPI['Date'].toString().trim() !== '' && rawKPI['Date'] !== 'N/A') {
            kpiDateStr = rawKPI['Date'].toString().trim()
          }
          
          if (kpiDateStr) {
            const parsedDate = parseDateToYYYYMMDD(kpiDateStr)
            if (parsedDate) {
              try {
                const [year, month, day] = parsedDate.split('-').map(Number)
                const dateObj = new Date(year, month - 1, day)
                if (!isNaN(dateObj.getTime())) {
                  validDates.push({ dateStr: parsedDate, dateObj, kpi })
                }
              } catch {
                // Skip invalid date
              }
            }
          }
        })
        
        // Sort by date and return earliest (FIRST date from Date/Actual Date column)
        if (validDates.length > 0) {
          validDates.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
          const earliestDate = validDates[0].dateStr
          
          if (process.env.NODE_ENV === 'development') {
            const rawKPI = (validDates[0].kpi as any).raw || {}
            const kpiZone = getKPIZone(validDates[0].kpi)
            console.log(`📅 [Actual Start Date] ✅ Activity "${activity.activity_name}" (Zone: ${activityZone || 'N/A'}):`, {
              matchingKPIsCount: matchingKPIs.length,
              validDatesCount: validDates.length,
              allDates: validDates.map(d => d.dateStr),
              earliestDate,
              earliestDateSource: {
                kpiDate: validDates[0].kpi.activity_date || rawKPI['Activity Date'] || rawKPI['Date'] || 'N/A',
                kpiZone: kpiZone || 'N/A',
                kpiActivityName: validDates[0].kpi.activity_name || rawKPI['Activity Name'] || 'N/A',
                kpiProjectCode: validDates[0].kpi.project_code || rawKPI['Project Code'] || 'N/A'
              },
              activityProjectCode,
              activityZone: activityZone || 'N/A',
              note: '✅ Start Date is the FIRST date from Date/Actual Date column in Actual KPIs'
            })
          }
          
          return earliestDate
        }
      }
    }
    
    // ✅ Priority 2: Direct BOQ Activity fields (ONLY if no Actual KPIs found)
    const directStart = getActivityField(activity, 'Actual Start Date') ||
                       getActivityField(activity, 'Actual Start') ||
                       getActivityField(activity, 'Activity Actual Start Date') ||
                       raw['Actual Start Date'] ||
                       raw['Actual Start'] ||
                       raw['Activity Actual Start Date'] ||
                       ''
    
    if (directStart && directStart.trim() !== '' && directStart !== 'N/A') {
      return directStart
    }
    
    return ''
  }

  // ============================================
  // Get Actual End Date (same logic as Planned End Date)
  // ============================================
  const getActualEndDate = (activity: BOQActivity): string => {
    const raw = (activity as any).raw || {}
    
    // Helper functions (same as getActualStartDate)
    const normalizeZone = (zone: string, projectCode: string): string => {
      if (!zone || !projectCode) return (zone || '').toLowerCase().trim()
      let normalized = zone.trim()
      const codeUpper = projectCode.toUpperCase()
      normalized = normalized.replace(new RegExp(`^${codeUpper}\\s*-\\s*`, 'i'), '').trim()
      normalized = normalized.replace(new RegExp(`^${codeUpper}\\s+`, 'i'), '').trim()
      normalized = normalized.replace(new RegExp(`^${codeUpper}-`, 'i'), '').trim()
      return normalized.toLowerCase()
    }
    
    const getActivityZone = (activity: BOQActivity): string => {
      const rawActivity = (activity as any).raw || {}
      let zoneValue = activity.zone_number || 
                     activity.zone_ref || 
                     rawActivity['Zone Number'] ||
                     rawActivity['Zone Ref'] ||
                     rawActivity['Zone #'] ||
                     ''
      
      if (zoneValue && activity.project_code) {
        const projectCodeUpper = activity.project_code.toUpperCase().trim()
        let zoneStr = zoneValue.toString()
        zoneStr = zoneStr.replace(new RegExp(`^${projectCodeUpper}\\s*-\\s*`, 'i'), '').trim()
        zoneStr = zoneStr.replace(new RegExp(`^${projectCodeUpper}\\s+`, 'i'), '').trim()
        zoneStr = zoneStr.replace(new RegExp(`^${projectCodeUpper}-`, 'i'), '').trim()
        zoneStr = zoneStr.replace(/^\s*-\s*/, '').trim()
        zoneStr = zoneStr.replace(/\s+/g, ' ').trim()
        zoneValue = zoneStr || ''
      }
      
      return (zoneValue || '').toString().toLowerCase().trim()
    }
    
    const getKPIZone = (kpi: any): string => {
      const rawKPI = (kpi as any).raw || {}
      // ✅ NOT from Section - Section is separate from Zone
      const zoneRaw = (
        kpi.zone || 
        rawKPI['Zone'] || 
        rawKPI['Zone Number'] || 
        ''
      ).toString().trim()
      const projectCode = (kpi.project_code || kpi['Project Code'] || rawKPI['Project Code'] || '').toString().trim()
      return normalizeZone(zoneRaw, projectCode)
    }
    
    // ✅ IMPROVED: Extract zone number more accurately
    const extractZoneNumber = (zone: string): string => {
      if (!zone || zone.trim() === '') return ''
      
      // Normalize zone text
      const normalizedZone = zone.toLowerCase().trim()
      
      // Try to match "zone X" or "zone-X" pattern first (most common)
      const zonePatternMatch = normalizedZone.match(/zone\s*[-_]?\s*(\d+)/i)
      if (zonePatternMatch && zonePatternMatch[1]) {
        return zonePatternMatch[1]
      }
      
      // Try to match standalone number at the end (e.g., "Zone 2", "Area 2")
      const endNumberMatch = normalizedZone.match(/(\d+)\s*$/)
      if (endNumberMatch && endNumberMatch[1]) {
        return endNumberMatch[1]
      }
      
      // Fallback: extract first number (but prefer zone-specific patterns above)
      const numberMatch = normalizedZone.match(/\d+/)
      if (numberMatch) return numberMatch[0]
      
      return normalizedZone
    }
    
    const parseDateToYYYYMMDD = (dateStr: string): string | null => {
      if (!dateStr || dateStr.trim() === '' || dateStr === 'N/A') return null
      
      try {
        const date = new Date(dateStr)
        if (isNaN(date.getTime())) return null
        
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        
        return `${year}-${month}-${day}`
      } catch {
        return null
      }
    }
    
    // ============================================
    // PRIORITY 1: Get from last Actual KPI Date column
    // ============================================
    
    if (allKPIs && allKPIs.length > 0) {
      const activityName = (activity.activity_name || '').toLowerCase().trim()
      const activityProjectCode = (activity.project_code || '').toString().trim().toUpperCase()
      const activityProjectFullCode = (activity.project_full_code || activity.project_code || '').toString().trim().toUpperCase()
      const activityZone = getActivityZone(activity)
      const activityZoneNum = extractZoneNumber(activityZone)
      
      // Find matching Actual KPIs (Project + Activity Name + Zone)
      const matchingKPIs = allKPIs.filter((kpi: any) => {
        const rawKPI = (kpi as any).raw || {}
        
        // 1. Must be Actual
        const kpiInputType = (kpi.input_type || rawKPI['Input Type'] || '').toString().toLowerCase().trim()
        if (kpiInputType !== 'actual') return false
        
        // 2. Activity Name must match
        const kpiActivityName = (kpi.activity_name || rawKPI['Activity Name'] || '').toLowerCase().trim()
        if (!kpiActivityName || !activityName) return false
        if (kpiActivityName !== activityName && !kpiActivityName.includes(activityName) && !activityName.includes(kpiActivityName)) {
          return false
        }
        
        // 3. Project Code must match
        const kpiProjectCode = (kpi.project_code || rawKPI['Project Code'] || '').toString().trim().toUpperCase()
        const kpiProjectFullCode = (kpi.project_full_code || rawKPI['Project Full Code'] || '').toString().trim().toUpperCase()
        
        const projectMatch = (
          (kpiProjectCode && activityProjectCode && kpiProjectCode === activityProjectCode) ||
          (kpiProjectFullCode && activityProjectFullCode && kpiProjectFullCode === activityProjectFullCode) ||
          (kpiProjectCode && activityProjectFullCode && kpiProjectCode === activityProjectFullCode) ||
          (kpiProjectFullCode && activityProjectCode && kpiProjectFullCode === activityProjectCode)
        )
        if (!projectMatch) return false
        
        // 4. Zone must match EXACTLY (if activity has zone)
        if (activityZone && activityZone.trim() !== '') {
          const kpiZone = getKPIZone(kpi)
          if (!kpiZone || kpiZone.trim() === '') return false
          
          const kpiZoneNum = extractZoneNumber(kpiZone)
          if (activityZoneNum && kpiZoneNum && activityZoneNum !== kpiZoneNum) {
            return false
          }
        }
        
        return true
      })
      
      // Get dates from matching KPIs (from Date/Actual Date column)
      if (matchingKPIs.length > 0) {
        const validDates: Array<{ dateStr: string; dateObj: Date; kpi: any }> = []
        
        matchingKPIs.forEach((kpi: any) => {
          const rawKPI = (kpi as any).raw || {}
          
          // Get Date from Activity Date column (for Actual KPIs, filtered by Input Type = 'Actual')
          let kpiDateStr = ''
          if (kpi.activity_date && kpi.activity_date.toString().trim() !== '' && kpi.activity_date !== 'N/A') {
            kpiDateStr = kpi.activity_date.toString().trim()
          } else if (rawKPI['Activity Date'] && rawKPI['Activity Date'].toString().trim() !== '' && rawKPI['Activity Date'] !== 'N/A') {
            kpiDateStr = rawKPI['Activity Date'].toString().trim()
          } else if (rawKPI['Date'] && rawKPI['Date'].toString().trim() !== '' && rawKPI['Date'] !== 'N/A') {
            kpiDateStr = rawKPI['Date'].toString().trim()
          }
          
          if (kpiDateStr) {
            const parsedDate = parseDateToYYYYMMDD(kpiDateStr)
            if (parsedDate) {
              try {
                const [year, month, day] = parsedDate.split('-').map(Number)
                const dateObj = new Date(year, month - 1, day)
                if (!isNaN(dateObj.getTime())) {
                  validDates.push({ dateStr: parsedDate, dateObj, kpi })
                }
              } catch {
                // Skip invalid date
              }
            }
          }
        })
        
        // Sort by date and return latest (LAST date from Date/Actual Date column)
        if (validDates.length > 0) {
          validDates.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
          const latestDate = validDates[validDates.length - 1].dateStr
          
          if (process.env.NODE_ENV === 'development') {
            const rawKPI = (validDates[validDates.length - 1].kpi as any).raw || {}
            const kpiZone = getKPIZone(validDates[validDates.length - 1].kpi)
            console.log(`📅 [Actual End Date] ✅ Activity "${activity.activity_name}" (Zone: ${activityZone || 'N/A'}):`, {
              matchingKPIsCount: matchingKPIs.length,
              validDatesCount: validDates.length,
              allDates: validDates.map(d => d.dateStr),
              latestDate,
              latestDateSource: {
                kpiDate: validDates[validDates.length - 1].kpi.activity_date || rawKPI['Activity Date'] || rawKPI['Date'] || 'N/A',
                kpiZone: kpiZone || 'N/A',
                kpiActivityName: validDates[validDates.length - 1].kpi.activity_name || rawKPI['Activity Name'] || 'N/A',
                kpiProjectCode: validDates[validDates.length - 1].kpi.project_code || rawKPI['Project Code'] || 'N/A'
              },
              activityProjectCode,
              activityZone: activityZone || 'N/A',
              note: '✅ End Date is the LAST date from Date/Actual Date column in Actual KPIs'
            })
          }
          
          return latestDate
        }
      }
    }
    
    // ✅ Priority 2: Direct BOQ Activity fields (ONLY if no Actual KPIs found)
    const directEnd = getActivityField(activity, 'Actual Completion Date') ||
                      getActivityField(activity, 'Actual Completion') ||
                      getActivityField(activity, 'Activity Actual Completion Date') ||
                      activity.deadline ||
                      raw['Actual Completion Date'] ||
                      raw['Actual Completion'] ||
                      raw['Activity Actual Completion Date'] ||
                      ''
    
    if (directEnd && directEnd.trim() !== '' && directEnd !== 'N/A') {
      return directEnd
    }
    
    return ''
  }

  // Render cell content based on column
  const renderCell = (activity: BOQActivity, column: ColumnConfig) => {
    // ✅ FIX: Find project by project_full_code (not just project_code)
    const activityFullCode = (activity.project_full_code || activity.project_code || '').trim()
    const project = getProjectByFullCode(activityFullCode) || projects.find(p => p.project_code === activity.project_code)
    const projectFullName = project?.project_name || getProjectName(activity.project_code) || activity.project_full_code || activity.project_code
    const currencyCode = project?.currency
    
    // ============================================
    // ✅ SHARED HELPER FUNCTIONS (used by multiple columns)
    // ============================================
    
    // ✅ Helper function to format numbers with 2 decimal places
    const formatNumber = (num: number): string => {
      if (isNaN(num) || !isFinite(num)) return '0.00'
      return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    }
    
    // ✅ Calculate yesterday date (end of yesterday at 23:59:59) - shared across columns
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(23, 59, 59, 999)
    
    // ✅ Helper function to get KPI value (handles Value field or calculates from Quantity × Rate)
    const getKPIValue = (kpi: any, activity: BOQActivity): number => {
      const rawKPI = (kpi as any).raw || {}
      const rawActivity = (activity as any).raw || {}
      
      // Get quantity
      const quantity = parseFloat(String(kpi.quantity || kpi['Quantity'] || rawKPI['Quantity'] || '0').replace(/,/g, '')) || 0
      
      // Priority 1: Try to get Value directly
      let kpiValue = parseFloat(String(kpi.value || kpi['Value'] || rawKPI['Value'] || '0').replace(/,/g, '')) || 0
      
      // ✅ Check if Value equals Quantity (means it's quantity, not value)
      if (kpiValue > 0 && quantity > 0 && Math.abs(kpiValue - quantity) < 0.01) {
        kpiValue = 0 // Reset to calculate from rate
      }
      
      // Priority 2: If value is 0 or equals quantity, calculate from Quantity × Rate
      if (kpiValue === 0 && quantity > 0) {
        // Try to get rate from KPI
        let rate = parseFloat(String(kpi.rate || kpi['Rate'] || rawKPI['Rate'] || '0').replace(/,/g, '')) || 0
        
        // If no rate in KPI, calculate from activity
        if (rate === 0) {
          rate = parseFloat(String(activity.rate || rawActivity['Rate'] || '0').replace(/,/g, '')) || 0
          
          // If still no rate, calculate from Total Value / Planned Units
          if (rate === 0 && activity.total_value && activity.planned_units && activity.planned_units > 0) {
            rate = activity.total_value / activity.planned_units
          }
        }
        
        kpiValue = quantity * rate
      }
      
      // Ensure valid number
      return isNaN(kpiValue) || !isFinite(kpiValue) ? 0 : kpiValue
    }
    
    // ✅ Helper function to check if KPI matches activity
    const kpiMatchesActivity = (kpi: any, activity: BOQActivity): boolean => {
      const rawKPI = (kpi as any).raw || {}
      
      // Match Project Code or Project Full Code
      const kpiProjectCode = (kpi.project_code || kpi['Project Code'] || rawKPI['Project Code'] || '').toString().trim().toUpperCase()
      const kpiProjectFullCode = (kpi.project_full_code || kpi['Project Full Code'] || rawKPI['Project Full Code'] || '').toString().trim().toUpperCase()
      const activityProjectCode = (activity.project_code || '').toString().trim().toUpperCase()
      const activityProjectFullCode = (activity.project_full_code || activity.project_code || '').toString().trim().toUpperCase()
      
      const projectMatch = (
        (kpiProjectCode && activityProjectCode && kpiProjectCode === activityProjectCode) ||
        (kpiProjectFullCode && activityProjectFullCode && kpiProjectFullCode === activityProjectFullCode) ||
        (kpiProjectCode && activityProjectFullCode && kpiProjectCode === activityProjectFullCode) ||
        (kpiProjectFullCode && activityProjectCode && kpiProjectFullCode === activityProjectCode)
      )
      
      if (!projectMatch) return false
      
      // Match Activity Name (required)
      const kpiActivityName = (kpi.activity_name || kpi['Activity Name'] || kpi.activity || rawKPI['Activity Name'] || '').toLowerCase().trim()
      const activityName = (activity.activity_name || activity.activity || '').toLowerCase().trim()
      
      const activityMatch = kpiActivityName && activityName && (
        kpiActivityName === activityName ||
        kpiActivityName.includes(activityName) ||
        activityName.includes(kpiActivityName)
      )
      
      if (!activityMatch) return false
      
      // Match Zone (optional but helps with precision)
      // ✅ NOT from Section - Section is separate from Zone
      const kpiZone = (kpi.zone || kpi['Zone'] || rawKPI['Zone'] || '').toLowerCase().trim()
      const activityZone = (activity.zone_ref || activity.zone_number || '').toLowerCase().trim()
      
      if (activityZone && kpiZone) {
        return kpiZone === activityZone || kpiZone.includes(activityZone) || activityZone.includes(kpiZone)
      }
      
      return true // If no zone in activity, accept the match
    }
    
    // ✅ Helper function to check if KPI date is until yesterday
    const isKPIUntilYesterday = (kpi: any, inputType: 'planned' | 'actual'): boolean => {
      const rawKPI = (kpi as any).raw || {}
      
      // Get date based on input type
      let kpiDateStr = ''
      if (inputType === 'planned') {
        kpiDateStr = kpi.activity_date || kpi['Activity Date'] || rawKPI['Activity Date'] || ''
      } else {
        kpiDateStr = kpi.activity_date || kpi['Activity Date'] || rawKPI['Activity Date'] || ''
      }
      
      // If no date, include it (assume valid)
      if (!kpiDateStr) return true
      
      try {
        const kpiDate = new Date(kpiDateStr)
        if (isNaN(kpiDate.getTime())) return true // Include if invalid date
        return kpiDate <= yesterday
      } catch {
        return true // Include if date parsing fails
      }
    }
    
    // Helper: Normalize zone value (remove project code prefix)
    const normalizeZone = (zone: string, projectCode: string): string => {
      if (!zone || !projectCode) return (zone || '').toLowerCase().trim()
      let normalized = zone.trim()
      const codeUpper = projectCode.toUpperCase()
      normalized = normalized.replace(new RegExp(`^${codeUpper}\\s*-\\s*`, 'i'), '').trim()
      normalized = normalized.replace(new RegExp(`^${codeUpper}\\s+`, 'i'), '').trim()
      normalized = normalized.replace(new RegExp(`^${codeUpper}-`, 'i'), '').trim()
      return normalized.toLowerCase()
    }
    
    // Helper: Extract zone from description (e.g., "P5066-12 | Zone 2")
    const extractZoneFromDescription = (description: string): string => {
      if (!description || description.trim() === '') return ''
      
      // Try to match patterns like "P5066-12 | Zone 2" or "Zone 2" or "Zone-2"
      const zonePatternMatch = description.match(/zone\s*[-_]?\s*(\d+)/i)
      if (zonePatternMatch && zonePatternMatch[1]) {
        return `zone ${zonePatternMatch[1]}`.toLowerCase().trim()
      }
      
      // Try to match project code pattern with zone (e.g., "P5066-12")
      const projectCodeZoneMatch = description.match(/([A-Z]\d+)-(\d+)/i)
      if (projectCodeZoneMatch && projectCodeZoneMatch[2]) {
        return projectCodeZoneMatch[2].toLowerCase().trim()
      }
      
      return ''
    }
    
    // Helper: Extract zone from activity (IMPROVED: Extract from description if zone field is empty)
    const getActivityZone = (activity: BOQActivity): string => {
      const raw = (activity as any).raw || {}
      let zoneValue = activity.zone_number || 
                     activity.zone_ref || 
                     raw['Zone Number'] ||
                     raw['Zone Ref'] ||
                     raw['Zone #'] ||
                     ''
      
      // ✅ NEW: If zone is empty, try to extract from activity description
      if (!zoneValue || zoneValue.trim() === '') {
        const activityDescription = activity.activity || 
                                   activity.activity_name || 
                                   raw['Activity'] ||
                                   raw['Activity Name'] ||
                                   ''
        if (activityDescription) {
          const extractedZone = extractZoneFromDescription(activityDescription)
          if (extractedZone) {
            zoneValue = extractedZone
          }
        }
      }
      
      // ✅ IMPROVED: Remove project code from zone value (same logic as activity_details)
      if (zoneValue && activity.project_code) {
        const projectCodeUpper = activity.project_code.toUpperCase().trim()
        let zoneStr = zoneValue.toString()
        
        // Remove project code patterns:
        // 1. "P9999 - " or "P9999 -" at start
        zoneStr = zoneStr.replace(new RegExp(`^${projectCodeUpper}\\s*-\\s*`, 'i'), '').trim()
        // 2. " P9999 - " or " P9999 -" in middle
        zoneStr = zoneStr.replace(new RegExp(`\\s+${projectCodeUpper}\\s*-\\s*`, 'gi'), ' ').trim()
        // 3. Just "P9999" at start followed by space or dash
        zoneStr = zoneStr.replace(new RegExp(`^${projectCodeUpper}(\\s|-)+`, 'i'), '').trim()
        // 4. Just "P9999" in middle with spaces/dashes around
        zoneStr = zoneStr.replace(new RegExp(`(\\s|-)+${projectCodeUpper}(\\s|-)+`, 'gi'), ' ').trim()
        // 5. Clean up any remaining " - " or "- " at the start
        zoneStr = zoneStr.replace(/^\s*-\s*/, '').trim()
        // 6. Clean up multiple spaces
        zoneStr = zoneStr.replace(/\s+/g, ' ').trim()
        
        zoneValue = zoneStr || ''
      }
      
      return (zoneValue || '').toString().toLowerCase().trim()
    }
    
    // Helper: Extract zone from KPI (IMPROVED: Extract from description if zone field is empty)
    const getKPIZone = (kpi: any): string => {
      const raw = (kpi as any).raw || {}
      // ✅ NOT from Section - Section is separate from Zone
      let zoneRaw = (
        kpi.zone || 
        raw['Zone'] || 
        raw['Zone Number'] || 
        ''
      ).toString().trim()
      
      // ✅ NEW: If zone is empty, try to extract from KPI description/activity name
      if (!zoneRaw || zoneRaw.trim() === '') {
        const kpiDescription = kpi.activity_name || 
                              kpi.activity || 
                              raw['Activity Name'] ||
                              raw['Activity'] ||
                              ''
        if (kpiDescription) {
          const extractedZone = extractZoneFromDescription(kpiDescription)
          if (extractedZone) {
            zoneRaw = extractedZone
          }
        }
      }
      
      const projectCode = (kpi.project_code || kpi['Project Code'] || raw['Project Code'] || '').toString().trim()
      return normalizeZone(zoneRaw, projectCode)
    }
    
    // Helper: Check if KPI matches activity (Project, Activity Name, Zone) - ULTRA STRICT VERSION
    // ✅ IMPROVED: Ultra strict Project Full Code matching to prevent "P5066-12" matching "P5066-2"
    // NOTE: This is a more strict version used by quantities column, the shared version is above
    const kpiMatchesActivityStrict = (kpi: any, activity: BOQActivity): boolean => {
      const rawKPI = (kpi as any).raw || {}
      
      // 1. Project Code Matching (ULTRA STRICT)
      const kpiProjectCode = (kpi.project_code || kpi['Project Code'] || rawKPI['Project Code'] || '').toString().trim().toUpperCase()
      const kpiProjectFullCode = (kpi.project_full_code || kpi['Project Full Code'] || rawKPI['Project Full Code'] || '').toString().trim().toUpperCase()
      const activityProjectCode = (activity.project_code || '').toString().trim().toUpperCase()
      const activityProjectFullCode = (activity.project_full_code || activity.project_code || '').toString().trim().toUpperCase()
      
      // ✅ CRITICAL: If activity has Project Full Code with sub-code (e.g., "P5066-12"), 
      // KPI MUST have EXACT Project Full Code match (not just Project Code)
      // This prevents "P5066-12" from matching "P5066-2" or "P5066-11"
      let projectMatch = false
      
      if (activityProjectFullCode && activityProjectFullCode.includes('-')) {
        // Activity has sub-code (e.g., "P5066-12")
        // KPI MUST have EXACT Project Full Code match
        if (kpiProjectFullCode && kpiProjectFullCode === activityProjectFullCode) {
          projectMatch = true
        }
        // Do NOT allow partial matches (e.g., "P5066" matching "P5066-12")
        // This ensures strict matching
      } else {
        // Activity has no sub-code (e.g., "P5066")
        // Match by Project Code or Project Full Code
        projectMatch = (
          (kpiProjectCode && activityProjectCode && kpiProjectCode === activityProjectCode) ||
          (kpiProjectFullCode && activityProjectFullCode && kpiProjectFullCode === activityProjectFullCode) ||
          (kpiProjectCode && activityProjectFullCode && kpiProjectCode === activityProjectFullCode) ||
          (kpiProjectFullCode && activityProjectCode && kpiProjectFullCode === activityProjectCode)
        )
      }
      
      if (!projectMatch) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`🚫 [kpiMatchesActivity] Project mismatch:`, {
            activityProjectCode,
            activityProjectFullCode,
            kpiProjectCode,
            kpiProjectFullCode,
            reason: activityProjectFullCode && activityProjectFullCode.includes('-') 
              ? 'Activity has sub-code - requires exact Project Full Code match' 
              : 'Standard matching'
          })
        }
        return false
      }
      
      // 2. Activity Name Matching (required)
      const kpiActivityName = (kpi.activity_name || kpi['Activity Name'] || kpi.activity || rawKPI['Activity Name'] || '').toLowerCase().trim()
      const activityName = (activity.activity_name || activity.activity || '').toLowerCase().trim()
      const activityMatch = kpiActivityName && activityName && (
        kpiActivityName === activityName || 
        kpiActivityName.includes(activityName) || 
        activityName.includes(kpiActivityName)
      )
      if (!activityMatch) return false
      
      // 3. Zone Matching (ULTRA STRICT: If activity has zone, KPI MUST have EXACT matching zone)
      const kpiZone = getKPIZone(kpi)
      const activityZone = getActivityZone(activity)
      
      // ✅ ULTRA STRICT: If activity has zone, KPI MUST have zone and they MUST match EXACTLY
      if (activityZone && activityZone.trim() !== '') {
        // Activity has zone - KPI MUST have zone (no exceptions)
        if (!kpiZone || kpiZone.trim() === '') {
          // Debug: KPI rejected because it has no zone but activity has zone
          if (process.env.NODE_ENV === 'development') {
            console.log(`🚫 [Zone Match] KPI rejected: Activity has zone "${activityZone}" but KPI has no zone`, {
              activityName: activity.activity_name,
              kpiActivityName: kpi.activity_name || kpi['Activity Name'],
              kpiProjectCode: kpi.project_code || kpi['Project Code']
            })
          }
          return false // KPI has no zone, reject it immediately
        }
        
        // ✅ ULTRA STRICT: Extract zone number from both and match EXACTLY
        // ✅ IMPROVED: Extract zone number more accurately
        const extractZoneNumber = (zone: string): string => {
          if (!zone || zone.trim() === '') return ''
          
          // Normalize zone text
          const normalizedZone = zone.toLowerCase().trim()
          
          // Try to match "zone X" or "zone-X" pattern first (most common)
          const zonePatternMatch = normalizedZone.match(/zone\s*[-_]?\s*(\d+)/i)
          if (zonePatternMatch && zonePatternMatch[1]) {
            return zonePatternMatch[1]
          }
          
          // Try to match standalone number at the end (e.g., "Zone 2", "Area 2")
          const endNumberMatch = normalizedZone.match(/(\d+)\s*$/)
          if (endNumberMatch && endNumberMatch[1]) {
            return endNumberMatch[1]
          }
          
          // Fallback: extract first number (but prefer zone-specific patterns above)
          const numberMatch = normalizedZone.match(/\d+/)
          if (numberMatch) return numberMatch[0]
          
          return normalizedZone
        }
        
        const activityZoneNum = extractZoneNumber(activityZone)
        const kpiZoneNum = extractZoneNumber(kpiZone)
        
        // ✅ CRITICAL: Zone numbers MUST match EXACTLY (primary check)
        if (activityZoneNum && kpiZoneNum && activityZoneNum !== kpiZoneNum) {
          // Debug: KPI rejected because zone numbers don't match
          if (process.env.NODE_ENV === 'development') {
            console.log(`🚫 [Zone Match] KPI rejected: Zone numbers don't match`, {
              activityName: activity.activity_name,
              activityZone,
              activityZoneNum,
              kpiZone,
              kpiZoneNum,
              kpiActivityName: kpi.activity_name || kpi['Activity Name'],
              kpiProjectCode: kpi.project_code || kpi['Project Code']
            })
          }
          return false // Zone numbers don't match, reject it
        }
        
        // ✅ SECONDARY CHECK: If zone numbers match, verify full zone text is compatible
        // This prevents "Zone 2" matching with "Zone 12" even if numbers partially match
        const normalizedActivityZone = activityZone.toLowerCase().trim()
        const normalizedKpiZone = kpiZone.toLowerCase().trim()
        
        if (activityZoneNum === kpiZoneNum) {
          // Check if zone number is standalone (not part of larger number)
          // Example: "zone 2" should match "zone 2" but not "zone 12" or "zone 22"
          const activityZoneStandalone = normalizedActivityZone.match(new RegExp(`\\b${activityZoneNum}\\b`))
          const kpiZoneStandalone = normalizedKpiZone.match(new RegExp(`\\b${kpiZoneNum}\\b`))
          
          // If both have standalone zone numbers, accept
          // If one doesn't have standalone, be more careful
          if (!activityZoneStandalone || !kpiZoneStandalone) {
            // If zone numbers match but text is very different, reject
            // Example: "zone 2" vs "zone 12" - both extract "2" but shouldn't match
            if (normalizedActivityZone !== normalizedKpiZone && 
                !normalizedActivityZone.includes(normalizedKpiZone) && 
                !normalizedKpiZone.includes(normalizedActivityZone)) {
              if (process.env.NODE_ENV === 'development') {
                console.log(`🚫 [Zone Match] KPI rejected: Zone text mismatch despite number match`, {
                  activityName: activity.activity_name,
                  activityZone: normalizedActivityZone,
                  activityZoneNum,
                  kpiZone: normalizedKpiZone,
                  kpiZoneNum,
                  kpiActivityName: kpi.activity_name || kpi['Activity Name'],
                  kpiProjectCode: kpi.project_code || kpi['Project Code']
                })
              }
              return false
            }
          }
        }
        
        // ✅ ACCEPT: Zone numbers match and zone text is compatible
        // Debug: KPI accepted because zones match
        if (process.env.NODE_ENV === 'development') {
          const rawKPI = (kpi as any).raw || {}
          const quantityStr = String(
            kpi.quantity || 
            kpi['Quantity'] || 
            rawKPI['Quantity'] || 
            '0'
          ).replace(/,/g, '').trim()
          const kpiQuantity = parseFloat(quantityStr) || 0
          console.log(`✅ [Zone Match] KPI accepted: Zones match`, {
            activityName: activity.activity_name,
            activityZone: normalizedActivityZone,
            activityZoneNum,
            kpiZone: normalizedKpiZone,
            kpiZoneNum,
            kpiActivityName: kpi.activity_name || kpi['Activity Name'],
            kpiQuantity
          })
        }
      }
      // If activity has no zone, accept KPI (with or without zone)
      
      return true
    }
    
    // Helper: Extract quantity from KPI
    const getKPIQuantity = (kpi: any): number => {
      const raw = (kpi as any).raw || {}
      const quantityStr = String(
        kpi.quantity || 
        kpi['Quantity'] || 
        kpi.Quantity ||
        raw['Quantity'] || 
        raw.Quantity ||
        '0'
      ).replace(/,/g, '').trim()
      return parseFloat(quantityStr) || 0
    }
    
    // Helper: Check if KPI date is until yesterday - EXTENDED VERSION (with more date sources)
    // NOTE: This version has more date sources, but uses the shared 'yesterday' variable
    const isKPIUntilYesterdayExtended = (kpi: any, inputType: 'planned' | 'actual'): boolean => {
      
      const raw = (kpi as any).raw || {}
      let kpiDateStr = ''
      
      if (inputType === 'planned') {
        // ✅ Priority: Date column > target_date > activity_date > created_at
        kpiDateStr = raw['Date'] ||
                    kpi.date ||
                    kpi.target_date || 
                    kpi.activity_date || 
                    raw['Target Date'] || 
                    raw['Activity Date'] ||
                    kpi['Target Date'] || 
                    kpi['Activity Date'] ||
                    kpi.created_at ||
                    ''
      } else {
        kpiDateStr = kpi.actual_date || 
                    kpi.activity_date || 
                    kpi['Actual Date'] || 
                    kpi['Activity Date'] || 
                    raw['Actual Date'] || 
                    raw['Activity Date'] ||
                    kpi.created_at ||
                    ''
      }
      
      // If no date, include it (treat as valid)
      if (!kpiDateStr) return true
      
      try {
        const kpiDate = new Date(kpiDateStr)
        if (isNaN(kpiDate.getTime())) return true // Invalid date, include it
        return kpiDate <= yesterday
      } catch {
        return true // Error, include it
      }
    }
    
    // ============================================
    // END OF SHARED HELPER FUNCTIONS
    // ============================================
    
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
        let zoneValue = activity.zone_number || 
                       activity.zone_ref || 
                       rawActivityDetails['Zone Number'] ||
                       rawActivityDetails['Zone Ref'] ||
                       rawActivityDetails['Zone #'] ||
                       ''
        
        // Remove project code from zone value if it exists
        // Example: "P9999 - Building A" -> "Building A" or "Zone P9999 - Building A" -> "Building A"
        if (zoneValue && activity.project_code) {
          const projectCodeUpper = activity.project_code.toUpperCase().trim()
          let zoneStr = zoneValue.toString()
          
          // Remove project code patterns:
          // 1. "P9999 - " or "P9999 -" at start
          zoneStr = zoneStr.replace(new RegExp(`^${projectCodeUpper}\\s*-\\s*`, 'i'), '').trim()
          // 2. " P9999 - " or " P9999 -" in middle
          zoneStr = zoneStr.replace(new RegExp(`\\s+${projectCodeUpper}\\s*-\\s*`, 'gi'), ' ').trim()
          // 3. Just "P9999" at start followed by space or dash
          zoneStr = zoneStr.replace(new RegExp(`^${projectCodeUpper}(\\s|-)+`, 'i'), '').trim()
          // 4. Just "P9999" in middle with spaces/dashes around
          zoneStr = zoneStr.replace(new RegExp(`(\\s|-)+${projectCodeUpper}(\\s|-)+`, 'gi'), ' ').trim()
          // 5. Clean up any remaining " - " or "- " at the start
          zoneStr = zoneStr.replace(/^\s*-\s*/, '').trim()
          // 6. Clean up multiple spaces
          zoneStr = zoneStr.replace(/\s+/g, ' ').trim()
          
          zoneValue = zoneStr || 'N/A'
        }
        
        // ✅ Get project full code and name
        // ✅ CRITICAL: Use activity.project_full_code directly (it's already correct from mapBOQFromDB)
        let projectFullCode = activity.project_full_code || 'N/A'
        let projectName = ''
        
        if (project) {
          // ✅ Use project's full_code if available, otherwise build it
          if (project.project_full_code) {
            projectFullCode = project.project_full_code.trim()
          } else if (project.project_sub_code) {
            const projectCode = (project.project_code || '').trim()
            const projectSubCode = (project.project_sub_code || '').trim()
            if (projectSubCode.toUpperCase().startsWith(projectCode.toUpperCase())) {
              projectFullCode = projectSubCode.trim()
            } else {
              projectFullCode = projectSubCode.startsWith('-') 
                ? `${projectCode}${projectSubCode}`.trim()
                : `${projectCode}-${projectSubCode}`.trim()
            }
          } else {
            projectFullCode = project.project_code || 'N/A'
          }
          projectName = project.project_name || ''
        } else {
          // ✅ Use activity's project_full_code (already correct from mapBOQFromDB)
          // If not available, build it from project_code + project_sub_code
          if (!projectFullCode || projectFullCode === 'N/A') {
            if (activity.project_code && activity.project_sub_code) {
              const projectCode = (activity.project_code || '').trim().toUpperCase()
              const projectSubCode = (activity.project_sub_code || '').trim()
              if (projectSubCode.toUpperCase().startsWith(projectCode)) {
                projectFullCode = projectSubCode.trim()
              } else {
                projectFullCode = projectSubCode.startsWith('-') 
                  ? `${activity.project_code}${projectSubCode}`.trim()
                  : `${activity.project_code}-${projectSubCode}`.trim()
              }
            } else {
              projectFullCode = activity.project_code || 'N/A'
            }
          }
          // Try to get project name from getProjectName if project object not found
          const foundProjectName = getProjectName(activity.project_code)
          projectName = foundProjectName && foundProjectName !== activity.project_code ? foundProjectName : ''
        }
        
        // Always show full code | project name format if we have both
        const projectDisplay = projectFullCode !== 'N/A' && projectName && projectName.trim() !== ''
          ? `${projectFullCode} | ${projectName}`
          : projectFullCode !== 'N/A' 
            ? projectFullCode
            : projectFullName || 'N/A'
        
        return (
          <div className="space-y-1">
            <div className="font-medium text-gray-900 dark:text-white text-sm">
              {activity.activity_name || 'N/A'}
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
      
      case 'scope':
        // ✅ FIX: Get scope from project_type_activities table (same source as Project Types & Activities Management)
        // 1. Get activity name from activity
        const activityName = activity.activity_name || 
                             activity.activity || 
                             (activity as any).raw?.['Activity Name'] ||
                             (activity as any).raw?.['Activity'] ||
                             ''
        
        // 2. Look up project_type from project_type_activities table using activity_name
        let activityProjectType: string | undefined = undefined
        
        if (activityName) {
          // Try exact match first
          activityProjectType = activityProjectTypesMap.get(activityName)
          
          // If not found, try case-insensitive match
          if (!activityProjectType) {
            const activityNameLower = activityName.toLowerCase().trim()
            activityProjectType = activityProjectTypesMap.get(activityNameLower)
            
            // If still not found, try partial match
            if (!activityProjectType) {
              Array.from(activityProjectTypesMap.entries()).forEach(([key, value]) => {
                if (!activityProjectType && 
                    (key.toLowerCase().includes(activityNameLower) || 
                     activityNameLower.includes(key.toLowerCase()))) {
                  activityProjectType = value
                }
              })
            }
          }
        }
        
        // ✅ DEBUG: Log for first few activities to diagnose
        const isFirstActivity = activities.indexOf(activity) < 3
        if (isFirstActivity) {
          console.log(`🔍 [BOQ Scope] Activity: ${activityName}`, {
            activityName,
            foundProjectType: activityProjectType,
            activityProjectTypesMapSize: activityProjectTypesMap.size,
            sampleKeys: Array.from(activityProjectTypesMap.keys()).slice(0, 5)
          })
        }
        
        // 3. If project_type found, look it up in project_types table to get the scope name
        const scopeList: string[] = []
        if (activityProjectType) {
          // Try exact match first
          const projectType = projectTypesMap.get(activityProjectType)
          if (projectType) {
            scopeList.push(projectType.name)
            if (isFirstActivity) {
              console.log(`✅ [BOQ Scope] Found scope for "${activityName}":`, projectType.name)
            }
          } else {
            // Try case-insensitive match
            let found = false
            Array.from(projectTypesMap.entries()).forEach(([key, value]) => {
              if (key.toLowerCase() === activityProjectType!.toLowerCase()) {
                scopeList.push(value.name)
                found = true
                if (isFirstActivity) {
                  console.log(`✅ [BOQ Scope] Found case-insensitive scope for "${activityName}":`, value.name)
                }
              }
            })
            // If not found in project_types table, use the project_type from project_type_activities as fallback
            if (!found) {
              scopeList.push(activityProjectType)
              if (isFirstActivity) {
                console.log(`⚠️ [BOQ Scope] Project type "${activityProjectType}" not found in project_types, using as-is`)
              }
            }
          }
        }
        
        // 4. ✅ FALLBACK: If no scopes found from project_type_activities, try to get from Project's project_type
        if (scopeList.length === 0) {
          // Try to find project and get its project_type
          const activityProjectCode = activity.project_code || activity.project_full_code || ''
          if (activityProjectCode) {
            // Try project_full_code first, then project_code
            let relatedProject = getProjectByFullCode(activityProjectCode)
            if (!relatedProject && activity.project_code) {
              relatedProject = projects.find((p: any) => {
                const projectCode = (p.project_code || '').toString().trim()
                return projectCode === activity.project_code
              })
            }
            
            if (relatedProject && relatedProject.project_type) {
              // Split project_type (comma-separated) and add each scope
              const projectScopes = relatedProject.project_type.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0)
              if (projectScopes.length > 0) {
                scopeList.push(...projectScopes)
                if (isFirstActivity) {
                  console.log(`✅ [BOQ Scope] Found scope from Project's project_type:`, projectScopes)
                }
              }
            }
          }
        }
        
        // 5. If still no scopes found, show N/A
        const finalScopeList = scopeList.length > 0 ? scopeList : ['N/A']
        
        if (isFirstActivity) {
          console.log(`🔍 [BOQ Scope] Final result:`, {
            activityName,
            activityProjectType,
            finalScopeList,
            scopeListLength: scopeList.length
          })
        }
        
        return (
          <div className="flex flex-wrap gap-1.5 items-center">
            {finalScopeList.map((scope, index) => {
              const scopeLower = scope.toLowerCase()
              let scopeColor = 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300'
              
              if (scopeLower.includes('infrastructure') || scopeLower.includes('enabling')) {
                scopeColor = 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
              } else if (scopeLower.includes('construction') || scopeLower.includes('excavation')) {
                scopeColor = 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
              }
              
              return (
                <span key={index} className={`px-2.5 py-1 text-xs font-medium rounded-full ${scopeColor}`}>
                  {scope}
                </span>
              )
            })}
          </div>
        )
      
      case 'division':
        // ✅ Display Division from activity_division field
        const divisionValue = activity.activity_division || 
                             (activity as any).raw?.['Activity Division'] ||
                             (activity as any).raw?.['activity_division'] ||
                             'N/A'
        
        if (divisionValue === 'N/A' || !divisionValue) {
          return (
            <span className="text-gray-400 dark:text-gray-500 text-sm">N/A</span>
          )
        }
        
        // Division colors matching Projects table
        const divisionColors: { [key: string]: string } = {
          'Enabling Division': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
          'Infrastructure Division': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
          'Soil Improvement Division': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
          'Marine Division': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
        }
        
        const divisionColor = divisionColors[divisionValue] || 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300'
        
        return (
          <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${divisionColor}`}>
            {divisionValue}
          </span>
        )
      
      case 'activity_timing':
        // ✅ Display Activity Timing from activity_timing field
        const activityTimingValue = activity.activity_timing || 
                                   (activity as any).raw?.['Activity Timing'] ||
                                   (activity as any).raw?.['activity_timing'] ||
                                   'post-commencement' // Default value
        
        // Format the timing value for display
        const formatActivityTiming = (timing: string): string => {
          if (!timing) return 'N/A'
          // Convert kebab-case to Title Case
          return timing
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
        }
        
        const formattedTiming = formatActivityTiming(activityTimingValue)
        
        // Activity Timing colors
        const timingColors: { [key: string]: string } = {
          'pre-commencement': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
          'post-commencement': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
          'post-completion': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
        }
        
        const timingColor = timingColors[activityTimingValue] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
        
        return (
          <div className="space-y-1">
            <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${timingColor}`}>
              {formattedTiming}
            </span>
            {/* Show additional info if post-completion */}
            {activityTimingValue === 'post-completion' && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {activity.has_value ? 'Has Value' : 'No Value'} • {activity.affects_timeline ? 'Affects Timeline' : 'No Timeline Impact'}
              </div>
            )}
          </div>
        )
      
      case 'quantities':
        // ============================================
        // ✅ COMPLETE REWRITE: Quantities Column
        // ============================================
        // Requirements:
        // 1. Planned = Sum of Planned KPIs until yesterday (with Zone matching)
        // 2. Actual = Sum of Actual KPIs until yesterday (with Zone matching)
        // 3. Planned and Actual must not exceed Total
        // 4. Zone matching is required for precision
        // ============================================
        // ✅ NOTE: Helper functions (normalizeZone, extractZoneFromDescription, getActivityZone, 
        // getKPIZone, kpiMatchesActivity, getKPIQuantity, isKPIUntilYesterday) are defined 
        // above before switch statement for reuse across multiple columns
        
        // Get Total Units
        const rawActivityQuantities = (activity as any).raw || {}
        const totalUnits = activity.total_units || 
                          parseFloat(String(rawActivityQuantities['Total Units'] || '0').replace(/,/g, '')) || 
                          activity.planned_units ||
                          parseFloat(String(rawActivityQuantities['Planned Units'] || '0').replace(/,/g, '')) || 
                          0
        
        // Calculate yesterday date for filtering KPIs
        const yesterdayQuantities = new Date()
        yesterdayQuantities.setDate(yesterdayQuantities.getDate() - 1)
        yesterdayQuantities.setHours(23, 59, 59, 999) // End of yesterday
        
        // Calculate Planned: Sum of Planned KPIs until yesterday (with Zone matching)
        let plannedUnits = 0
        if (allKPIs.length > 0) {
          // Step 1: Filter Planned KPIs only
          const plannedKPIs = allKPIs.filter((kpi: any) => {
            const inputType = (kpi.input_type || kpi['Input Type'] || (kpi as any).raw?.['Input Type'] || '').toLowerCase()
            return inputType === 'planned'
          })
          
          // Step 2: Match Planned KPIs to this activity (Project, Activity Name, Zone)
          const matchedPlannedKPIs = plannedKPIs.filter((kpi: any) => kpiMatchesActivityStrict(kpi, activity))
          
          // Step 3: Filter until yesterday and sum quantities
          const plannedKPIsUntilYesterday = matchedPlannedKPIs.filter((kpi: any) => isKPIUntilYesterdayExtended(kpi, 'planned'))
          plannedUnits = plannedKPIsUntilYesterday.reduce((sum: number, kpi: any) => {
            return sum + getKPIQuantity(kpi)
          }, 0)
        }
        
        // Calculate Actual: Sum of Actual KPIs until yesterday (with Zone matching)
        // ✅ EXACT SAME LOGIC AS PLANNED - Always calculate from KPIs (ignore activity.actual_units)
        let actualUnits = 0
        
        if (allKPIs.length > 0) {
          // Step 1: Filter Actual KPIs only
          const actualKPIs = allKPIs.filter((kpi: any) => {
            const inputType = (kpi.input_type || kpi['Input Type'] || (kpi as any).raw?.['Input Type'] || '').toLowerCase()
            return inputType === 'actual'
          })
          
          // Step 2: Match Actual KPIs to this activity (Project, Activity Name, Zone)
          // ✅ USE SAME FUNCTION AS PLANNED - kpiMatchesActivity
          const matchedActualKPIs = actualKPIs.filter((kpi: any) => kpiMatchesActivityStrict(kpi, activity))
          
          // Step 3: Filter until yesterday and sum quantities
          const actualKPIsUntilYesterday = matchedActualKPIs.filter((kpi: any) => isKPIUntilYesterdayExtended(kpi, 'actual'))
          actualUnits = actualKPIsUntilYesterday.reduce((sum: number, kpi: any) => {
            return sum + getKPIQuantity(kpi)
          }, 0)
        }
        
        // ✅ CRITICAL: Cap Planned and Actual to not exceed Total (logical constraint)
        const cappedPlanned = totalUnits > 0 ? Math.min(plannedUnits, totalUnits) : plannedUnits
        const cappedActual = totalUnits > 0 ? Math.min(actualUnits, totalUnits) : actualUnits
        
        // Calculate Remaining
        const remaining = Math.max(0, totalUnits - cappedActual)
        
        // Debug logging
        if (process.env.NODE_ENV === 'development') {
          const activityZone = getActivityZone(activity)
          
          // Count matched KPIs for debugging
          let matchedPlannedCount = 0
          let matchedActualCount = 0
          if (allKPIs.length > 0) {
            const plannedKPIs = allKPIs.filter((kpi: any) => {
              const inputType = (kpi.input_type || kpi['Input Type'] || (kpi as any).raw?.['Input Type'] || '').toLowerCase()
              return inputType === 'planned'
            })
            const actualKPIs = allKPIs.filter((kpi: any) => {
              const inputType = (kpi.input_type || kpi['Input Type'] || (kpi as any).raw?.['Input Type'] || '').toLowerCase()
              return inputType === 'actual'
            })
            
            matchedPlannedCount = plannedKPIs.filter((kpi: any) => kpiMatchesActivityStrict(kpi, activity)).length
            matchedActualCount = actualKPIs.filter((kpi: any) => kpiMatchesActivityStrict(kpi, activity)).length
          }
          
          console.log(`📊 [BOQ Quantities] "${activity.activity_name}" (Zone: ${activityZone || 'N/A'}):`, {
            totalUnits,
            plannedUnits,
            cappedPlanned,
            actualUnits,
            cappedActual,
            remaining,
            plannedExceeded: plannedUnits > totalUnits,
            actualExceeded: actualUnits > totalUnits,
            matchedPlannedKPIs: matchedPlannedCount,
            matchedActualKPIs: matchedActualCount,
            activityZone: activityZone || 'No Zone',
            note: activityZone ? 'Zone matching is STRICT - only KPIs with matching zone are included' : 'No zone - all KPIs for this activity are included'
          })
        }
        
        return (
          <div className="space-y-1">
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Total: {formatNumber(totalUnits)}
            </div>
            <div className={`text-xs ${cappedPlanned < plannedUnits ? 'text-orange-600 dark:text-orange-400 font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
              Planned: {formatNumber(cappedPlanned)}
              {cappedPlanned < plannedUnits && (
                <span className="ml-1 text-[10px] opacity-75">(capped from {formatNumber(plannedUnits)})</span>
              )}
            </div>
            <div className={`text-xs ${cappedActual < actualUnits ? 'text-orange-600 dark:text-orange-400 font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
              Actual: {formatNumber(cappedActual)}
              {cappedActual < actualUnits && (
                <span className="ml-1 text-[10px] opacity-75">(capped from {formatNumber(actualUnits)})</span>
              )}
            </div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              Remaining: {formatNumber(remaining)}
            </div>
          </div>
        )
      
      case 'activity_value':
        // ✅ FIX: Calculate Unit Rate from multiple sources with priority order
        let unitRate = 0
        
        // Priority 1: Use activity.rate if available
        if (activity.rate && activity.rate > 0) {
          unitRate = activity.rate
        }
        // Priority 2: Calculate from total_value / total_units (if total_units > 0)
        else if (activity.total_value && activity.total_units && activity.total_units > 0) {
          unitRate = activity.total_value / activity.total_units
        }
        // Priority 3: Calculate from total_value / planned_units (if planned_units > 0)
        else if (activity.total_value && activity.planned_units && activity.planned_units > 0) {
          unitRate = activity.total_value / activity.planned_units
        }
        // Priority 4: Calculate from total_value / actual_units (if actual_units > 0)
        else if (activity.total_value && activity.actual_units && activity.actual_units > 0) {
          unitRate = activity.total_value / activity.actual_units
        }
        // Priority 5: Get estimated_rate from project_type_activities table
        else if (activity.activity_name) {
          const activityName = activity.activity_name
          const activityNameLower = activityName.toLowerCase().trim()
          
          // Try exact match first
          let estimatedRate = activityRatesMap.get(activityName)
          
          // If not found, try case-insensitive match
          if (!estimatedRate || estimatedRate === 0) {
            estimatedRate = activityRatesMap.get(activityNameLower) || 0
          }
          
          // If still not found, try partial match
          if (!estimatedRate || estimatedRate === 0) {
            Array.from(activityRatesMap.entries()).forEach(([key, value]) => {
              if (!estimatedRate && value > 0 &&
                  (key.toLowerCase().includes(activityNameLower) || 
                   activityNameLower.includes(key.toLowerCase()))) {
                estimatedRate = value
              }
            })
          }
          
          if (estimatedRate && estimatedRate > 0) {
            unitRate = estimatedRate
          }
        }
        
        return (
          <div className="space-y-1">
            <div className="text-xs text-gray-600 dark:text-gray-400">Total Value: {formatCurrencyByCodeSync(activity.total_value || 0, currencyCode)}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Unit: {activity.unit || 'N/A'}</div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">Unit Rate: {formatCurrencyByCodeSync(unitRate, currencyCode)}</div>
          </div>
        )
      
      case 'planned_dates':
        // ✅ ENHANCED: Get Planned Start Date from multiple sources
        const plannedStart = getPlannedStartDate(activity)
        const plannedEnd = activity.deadline || 
                          activity.activity_planned_completion_date ||
                          getActivityField(activity, 'Deadline') ||
                          getActivityField(activity, 'Planned Completion Date') ||
                          getActivityField(activity, 'Activity Planned Completion Date') ||
                          ''
        const plannedDuration = activity.calendar_duration || 
                              parseFloat(String(getActivityField(activity, 'Calendar Duration') || '0')) ||
                              0
        
        // ✅ Recalculate duration if we have both start and end dates
        let finalDuration = plannedDuration
        if (plannedStart && plannedEnd && plannedStart !== 'N/A' && plannedEnd !== 'N/A') {
          try {
            const startDate = new Date(plannedStart)
            const endDate = new Date(plannedEnd)
            if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
              const diffTime = endDate.getTime() - startDate.getTime()
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
              // ✅ If same day, duration should be 1 (not 0)
              finalDuration = diffDays >= 0 ? Math.max(1, diffDays) : plannedDuration
            }
          } catch {
            // Keep original duration if calculation fails
          }
        }
        
        return (
          <div className="space-y-1">
            <div className="text-xs text-gray-600 dark:text-gray-400">Start: {plannedStart ? formatDate(plannedStart) : 'N/A'}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Completion: {plannedEnd ? formatDate(plannedEnd) : 'N/A'}</div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">Duration: {finalDuration} days</div>
          </div>
        )
      
      case 'actual_dates':
        // ✅ ENHANCED: Get Actual Dates from Actual KPIs (same logic as Planned Dates)
        const actualStart = getActualStartDate(activity)
        const actualEnd = getActualEndDate(activity)
        
        // ✅ Recalculate duration if we have both start and end dates
        let actualDuration = 0
        if (actualStart && actualEnd && actualStart !== 'N/A' && actualEnd !== 'N/A') {
          try {
            const startDate = new Date(actualStart)
            const endDate = new Date(actualEnd)
            if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
              const diffTime = endDate.getTime() - startDate.getTime()
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
              // ✅ If same day, duration should be 1 (not 0)
              actualDuration = diffDays >= 0 ? Math.max(1, diffDays) : 0
            }
          } catch {
            // Keep duration as 0 if calculation fails
          }
        }
        
        // ✅ Check if activity hasn't started yet
        const hasNotStarted = !actualStart || actualStart === '' || actualStart === 'N/A'
        
        return (
          <div className="space-y-1">
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Start: {hasNotStarted ? (
                <span className="italic text-orange-600 dark:text-orange-400 font-medium">Not Started</span>
              ) : (
                formatDate(actualStart)
              )}
            </div>
            {!hasNotStarted && (
              <>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Completion: {actualEnd ? formatDate(actualEnd) : 'N/A'}
                </div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  Duration: {actualDuration} {actualDuration > 0 ? 'days' : ''}
                </div>
              </>
            )}
          </div>
        )
      
      case 'progress_summary':
        // ============================================
        // ✅ COMPLETE REWRITE: Progress Summary Column
        // ============================================
        // Logic: Use EXACT SAME quantities as Quantities column × Rate (SAME AS Work Value Status)
        // Planned Progress = (Capped Planned Quantity × Rate / Total Value) × 100
        // Actual Progress = (Capped Actual Quantity × Rate / Total Value) × 100
        // Variance = Actual Progress - Planned Progress
        // ============================================
        
        // Get Total Value from BOQ Activity
        const rawActivityProgress = (activity as any).raw || {}
        const totalValueProgress = activity.total_value || 
                          parseFloat(String(rawActivityProgress['Total Value'] || '0').replace(/,/g, '')) || 
                          0
        
        // Get Total Units (SAME AS QUANTITIES COLUMN)
        const totalUnitsProgress = activity.total_units || 
                          parseFloat(String(rawActivityProgress['Total Units'] || '0').replace(/,/g, '')) || 
                          activity.planned_units ||
                          parseFloat(String(rawActivityProgress['Planned Units'] || '0').replace(/,/g, '')) || 
                          0
        
        // Calculate Planned Quantity (EXACT SAME LOGIC AS QUANTITIES COLUMN)
        let plannedQuantityProgress = 0
        if (allKPIs.length > 0) {
          const plannedKPIsProgress = allKPIs.filter((kpi: any) => {
            const inputType = (kpi.input_type || kpi['Input Type'] || (kpi as any).raw?.['Input Type'] || '').toLowerCase()
            return inputType === 'planned'
          })
          const matchedPlannedKPIsProgress = plannedKPIsProgress.filter((kpi: any) => kpiMatchesActivityStrict(kpi, activity))
          const plannedKPIsUntilYesterdayProgress = matchedPlannedKPIsProgress.filter((kpi: any) => isKPIUntilYesterdayExtended(kpi, 'planned'))
          plannedQuantityProgress = plannedKPIsUntilYesterdayProgress.reduce((sum: number, kpi: any) => {
            return sum + getKPIQuantity(kpi)
          }, 0)
        }
        const cappedPlannedQuantityProgress = totalUnitsProgress > 0 ? Math.min(plannedQuantityProgress, totalUnitsProgress) : plannedQuantityProgress
        
        // Calculate Actual Quantity (EXACT SAME LOGIC AS QUANTITIES COLUMN)
        let actualQuantityProgress = 0
        if (allKPIs.length > 0) {
          const actualKPIsProgress = allKPIs.filter((kpi: any) => {
            const inputType = (kpi.input_type || kpi['Input Type'] || (kpi as any).raw?.['Input Type'] || '').toLowerCase()
            return inputType === 'actual'
          })
          const matchedActualKPIsProgress = actualKPIsProgress.filter((kpi: any) => kpiMatchesActivityStrict(kpi, activity))
          const actualKPIsUntilYesterdayProgress = matchedActualKPIsProgress.filter((kpi: any) => isKPIUntilYesterdayExtended(kpi, 'actual'))
          actualQuantityProgress = actualKPIsUntilYesterdayProgress.reduce((sum: number, kpi: any) => {
            return sum + getKPIQuantity(kpi)
          }, 0)
        }
        const cappedActualQuantityProgress = totalUnitsProgress > 0 ? Math.min(actualQuantityProgress, totalUnitsProgress) : actualQuantityProgress
        
        // Get Rate (SAME LOGIC AS activity_value COLUMN)
        let rateProgress = 0
        if (activity.rate && activity.rate > 0) {
          rateProgress = activity.rate
        } else if (activity.total_value && activity.total_units && activity.total_units > 0) {
          rateProgress = activity.total_value / activity.total_units
        } else if (activity.total_value && activity.planned_units && activity.planned_units > 0) {
          rateProgress = activity.total_value / activity.planned_units
        } else if (activity.total_value && activity.actual_units && activity.actual_units > 0) {
          rateProgress = activity.total_value / activity.actual_units
        } else if (activity.activity_name) {
          const activityNameProgress = activity.activity_name
          const activityNameLowerProgress = activityNameProgress.toLowerCase().trim()
          let estimatedRateProgress = activityRatesMap.get(activityNameProgress)
          if (!estimatedRateProgress || estimatedRateProgress === 0) {
            estimatedRateProgress = activityRatesMap.get(activityNameLowerProgress) || 0
          }
          if (!estimatedRateProgress || estimatedRateProgress === 0) {
            Array.from(activityRatesMap.entries()).forEach(([key, value]) => {
              if (!estimatedRateProgress && value > 0 &&
                  (key.toLowerCase().includes(activityNameLowerProgress) || 
                   activityNameLowerProgress.includes(key.toLowerCase()))) {
                estimatedRateProgress = value
              }
            })
          }
          if (estimatedRateProgress && estimatedRateProgress > 0) {
            rateProgress = estimatedRateProgress
          }
        }
        if (rateProgress === 0) {
          const rateFromRawProgress = parseFloat(String(rawActivityProgress['Rate'] || '0').replace(/,/g, '')) || 0
          if (rateFromRawProgress > 0) rateProgress = rateFromRawProgress
        }
        
        // Calculate Values: Capped Quantity × Rate (SAME AS Work Value Status)
        const plannedValueProgress = rateProgress > 0 ? cappedPlannedQuantityProgress * rateProgress : 0
        const actualValueProgress = rateProgress > 0 ? cappedActualQuantityProgress * rateProgress : 0
        
        // Calculate Progress Percentages
        const plannedProgress = totalValueProgress > 0 
          ? Math.min(100, Math.max(0, (plannedValueProgress / totalValueProgress) * 100))
          : 0
        
        const actualProgress = totalValueProgress > 0 
          ? Math.min(100, Math.max(0, (actualValueProgress / totalValueProgress) * 100))
          : 0
        
        const varianceProgress = actualProgress - plannedProgress
        
        // ✅ DEBUG: Log in development mode
        if (process.env.NODE_ENV === 'development') {
          console.log(`📊 [Progress Summary] "${activity.activity_name}":`, {
            totalValue: totalValueProgress,
            plannedValue: plannedValueProgress,
            actualValue: actualValueProgress,
            plannedQuantity: plannedQuantityProgress,
            cappedPlannedQuantity: cappedPlannedQuantityProgress,
            actualQuantity: actualQuantityProgress,
            cappedActualQuantity: cappedActualQuantityProgress,
            rate: rateProgress,
            plannedProgress: plannedProgress.toFixed(1) + '%',
            actualProgress: actualProgress.toFixed(1) + '%',
            variance: varianceProgress.toFixed(1) + '%'
          })
        }
        
        // ✅ Render the progress summary UI
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
        // ============================================
        // ✅ COMPLETE REWRITE: Work Value Status Column
        // ============================================
        // Logic: Use EXACT SAME quantities as Quantities column × Rate
        // 1. Planned Value = Capped Planned Quantity (from Quantities column) × Rate
        // 2. Done Value = Capped Actual Quantity (from Quantities column) × Rate
        // 3. Variance = Done - Planned
        // ============================================
        
        // Get Total Units (SAME AS QUANTITIES COLUMN)
        const rawActivityWorkValue = (activity as any).raw || {}
        const totalUnitsWorkValue = activity.total_units || 
                          parseFloat(String(rawActivityWorkValue['Total Units'] || '0').replace(/,/g, '')) || 
                          activity.planned_units ||
                          parseFloat(String(rawActivityWorkValue['Planned Units'] || '0').replace(/,/g, '')) || 
                          0
        
        // Calculate Planned Quantity (EXACT SAME LOGIC AS QUANTITIES COLUMN)
        let plannedQuantity = 0
        if (allKPIs.length > 0) {
          const plannedKPIs = allKPIs.filter((kpi: any) => {
            const inputType = (kpi.input_type || kpi['Input Type'] || (kpi as any).raw?.['Input Type'] || '').toLowerCase()
            return inputType === 'planned'
          })
          const matchedPlannedKPIs = plannedKPIs.filter((kpi: any) => kpiMatchesActivityStrict(kpi, activity))
          const plannedKPIsUntilYesterday = matchedPlannedKPIs.filter((kpi: any) => isKPIUntilYesterdayExtended(kpi, 'planned'))
          plannedQuantity = plannedKPIsUntilYesterday.reduce((sum: number, kpi: any) => {
            return sum + getKPIQuantity(kpi)
          }, 0)
        }
        const cappedPlannedQuantity = totalUnitsWorkValue > 0 ? Math.min(plannedQuantity, totalUnitsWorkValue) : plannedQuantity
        
        // Calculate Actual Quantity (EXACT SAME LOGIC AS QUANTITIES COLUMN)
        let actualQuantity = 0
        if (allKPIs.length > 0) {
          const actualKPIs = allKPIs.filter((kpi: any) => {
            const inputType = (kpi.input_type || kpi['Input Type'] || (kpi as any).raw?.['Input Type'] || '').toLowerCase()
            return inputType === 'actual'
          })
          const matchedActualKPIs = actualKPIs.filter((kpi: any) => kpiMatchesActivityStrict(kpi, activity))
          const actualKPIsUntilYesterday = matchedActualKPIs.filter((kpi: any) => isKPIUntilYesterdayExtended(kpi, 'actual'))
          actualQuantity = actualKPIsUntilYesterday.reduce((sum: number, kpi: any) => {
            return sum + getKPIQuantity(kpi)
          }, 0)
        }
        const cappedActualQuantity = totalUnitsWorkValue > 0 ? Math.min(actualQuantity, totalUnitsWorkValue) : actualQuantity
        
        // Get Rate (SAME LOGIC AS activity_value COLUMN)
        let rate = 0
        // Priority 1: Use activity.rate if available
        if (activity.rate && activity.rate > 0) {
          rate = activity.rate
        }
        // Priority 2: Calculate from total_value / total_units
        else if (activity.total_value && activity.total_units && activity.total_units > 0) {
          rate = activity.total_value / activity.total_units
        }
        // Priority 3: Calculate from total_value / planned_units
        else if (activity.total_value && activity.planned_units && activity.planned_units > 0) {
          rate = activity.total_value / activity.planned_units
        }
        // Priority 4: Calculate from total_value / actual_units
        else if (activity.total_value && activity.actual_units && activity.actual_units > 0) {
          rate = activity.total_value / activity.actual_units
        }
        // Priority 5: Get estimated_rate from project_type_activities table
        else if (activity.activity_name) {
          const activityName = activity.activity_name
          const activityNameLower = activityName.toLowerCase().trim()
          let estimatedRate = activityRatesMap.get(activityName)
          if (!estimatedRate || estimatedRate === 0) {
            estimatedRate = activityRatesMap.get(activityNameLower) || 0
          }
          if (!estimatedRate || estimatedRate === 0) {
            Array.from(activityRatesMap.entries()).forEach(([key, value]) => {
              if (!estimatedRate && value > 0 &&
                  (key.toLowerCase().includes(activityNameLower) || 
                   activityNameLower.includes(key.toLowerCase()))) {
                estimatedRate = value
              }
            })
          }
          if (estimatedRate && estimatedRate > 0) {
            rate = estimatedRate
          }
        }
        // Priority 6: Try to get from raw data
        if (rate === 0) {
          const rateFromRaw = parseFloat(String(rawActivityWorkValue['Rate'] || '0').replace(/,/g, '')) || 0
          if (rateFromRaw > 0) rate = rateFromRaw
        }
        
        // Calculate Values: Capped Quantity × Rate
        const plannedWorkValue = rate > 0 ? cappedPlannedQuantity * rate : 0
        const workDoneValue = rate > 0 ? cappedActualQuantity * rate : 0
        const varianceWorkValue = workDoneValue - plannedWorkValue
        
        // ✅ DEBUG: Log calculation in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`💰 [BOQ] Work Value Status for "${activity.activity_name}":`, {
            totalUnits: totalUnitsWorkValue,
            plannedQuantity,
            cappedPlannedQuantity,
            actualQuantity,
            cappedActualQuantity,
            rate,
            plannedValue: plannedWorkValue,
            doneValue: workDoneValue,
            variance: varianceWorkValue,
            calculation: {
              planned: `${cappedPlannedQuantity} × ${rate} = ${plannedWorkValue}`,
              done: `${cappedActualQuantity} × ${rate} = ${workDoneValue}`
            }
          })
        }
        
        return (
          <div className="space-y-1">
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Planned: {formatCurrencyByCodeSync(plannedWorkValue, currencyCode)}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Done: {formatCurrencyByCodeSync(workDoneValue, currencyCode)}
            </div>
            <div className={`text-sm font-medium ${varianceWorkValue >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              Variance: {varianceWorkValue >= 0 ? '+' : ''}{formatCurrencyByCodeSync(varianceWorkValue, currencyCode)}
            </div>
          </div>
        )
      
      case 'activity_status':
        // ============================================
        // ✅ COMPLETE REWRITE: Activity Status Column
        // ============================================
        // ✅ SMART: Activity Status now depends ENTIRELY on Progress Summary
        // Uses the EXACT same calculation logic as Progress Summary column
        // Status calculation based on Planned Progress vs Actual Progress:
        //    - Not Started: plannedProgress = 0 AND actualProgress = 0
        //    - Delayed: plannedProgress > 0 AND actualProgress = 0 (Planned started but Actual hasn't started)
        //    - Delayed: plannedProgress > actualProgress + 5% (when both are > 0)
        //    - Completed: actualProgress >= 100% OR (actualProgress >= plannedProgress when plannedProgress = 100%)
        //    - Ahead: plannedProgress < actualProgress - 5%
        //    - On Track: All other cases (difference between -5% and +5%)
        // ============================================
        
        const rawActivityStatus = (activity as any).raw || {}
        
        // ✅ REUSE: Calculate Progress Summary (SAME LOGIC AS progress_summary COLUMN)
        // Get Total Value from BOQ activity
        const totalValueStatus = activity.total_value || 
                          parseFloat(String(rawActivityStatus['Total Value'] || '0').replace(/,/g, '')) || 
                          0
        
        // Get Total Units (SAME AS QUANTITIES COLUMN)
        const totalUnitsStatus = activity.total_units || 
                          parseFloat(String(rawActivityStatus['Total Units'] || '0').replace(/,/g, '')) || 
                          activity.planned_units ||
                          parseFloat(String(rawActivityStatus['Planned Units'] || '0').replace(/,/g, '')) || 
                          0
        
        // Calculate Planned Quantity (EXACT SAME LOGIC AS QUANTITIES COLUMN)
        let plannedQuantityStatus = 0
        if (allKPIs.length > 0) {
          const plannedKPIsStatus = allKPIs.filter((kpi: any) => {
            const inputType = (kpi.input_type || kpi['Input Type'] || (kpi as any).raw?.['Input Type'] || '').toLowerCase()
            return inputType === 'planned'
          })
          const matchedPlannedKPIsStatus = plannedKPIsStatus.filter((kpi: any) => kpiMatchesActivityStrict(kpi, activity))
          const plannedKPIsUntilYesterdayStatus = matchedPlannedKPIsStatus.filter((kpi: any) => isKPIUntilYesterdayExtended(kpi, 'planned'))
          plannedQuantityStatus = plannedKPIsUntilYesterdayStatus.reduce((sum: number, kpi: any) => {
            return sum + getKPIQuantity(kpi)
          }, 0)
        }
        const cappedPlannedQuantityStatus = totalUnitsStatus > 0 ? Math.min(plannedQuantityStatus, totalUnitsStatus) : plannedQuantityStatus
        
        // Calculate Actual Quantity (EXACT SAME LOGIC AS QUANTITIES COLUMN)
        let actualQuantityStatus = 0
        if (allKPIs.length > 0) {
          const actualKPIsStatus = allKPIs.filter((kpi: any) => {
            const inputType = (kpi.input_type || kpi['Input Type'] || (kpi as any).raw?.['Input Type'] || '').toLowerCase()
            return inputType === 'actual'
          })
          const matchedActualKPIsStatus = actualKPIsStatus.filter((kpi: any) => kpiMatchesActivityStrict(kpi, activity))
          const actualKPIsUntilYesterdayStatus = matchedActualKPIsStatus.filter((kpi: any) => isKPIUntilYesterdayExtended(kpi, 'actual'))
          actualQuantityStatus = actualKPIsUntilYesterdayStatus.reduce((sum: number, kpi: any) => {
            return sum + getKPIQuantity(kpi)
          }, 0)
        }
        const cappedActualQuantityStatus = totalUnitsStatus > 0 ? Math.min(actualQuantityStatus, totalUnitsStatus) : actualQuantityStatus
        
        // Get Rate (SAME LOGIC AS activity_value COLUMN)
        let rateStatus = 0
        if (activity.rate && activity.rate > 0) {
          rateStatus = activity.rate
        } else if (activity.total_value && activity.total_units && activity.total_units > 0) {
          rateStatus = activity.total_value / activity.total_units
        } else if (activity.total_value && activity.planned_units && activity.planned_units > 0) {
          rateStatus = activity.total_value / activity.planned_units
        } else if (activity.total_value && activity.actual_units && activity.actual_units > 0) {
          rateStatus = activity.total_value / activity.actual_units
        } else if (activity.activity_name) {
          const activityNameStatus = activity.activity_name
          const activityNameLowerStatus = activityNameStatus.toLowerCase().trim()
          let estimatedRateStatus = activityRatesMap.get(activityNameStatus)
          if (!estimatedRateStatus || estimatedRateStatus === 0) {
            estimatedRateStatus = activityRatesMap.get(activityNameLowerStatus) || 0
          }
          if (!estimatedRateStatus || estimatedRateStatus === 0) {
            Array.from(activityRatesMap.entries()).forEach(([key, value]) => {
              if (!estimatedRateStatus && value > 0 &&
                  (key.toLowerCase().includes(activityNameLowerStatus) || 
                   activityNameLowerStatus.includes(key.toLowerCase()))) {
                estimatedRateStatus = value
              }
            })
          }
          if (estimatedRateStatus && estimatedRateStatus > 0) {
            rateStatus = estimatedRateStatus
          }
        }
        if (rateStatus === 0) {
          const rateFromRawStatus = parseFloat(String(rawActivityStatus['Rate'] || '0').replace(/,/g, '')) || 0
          if (rateFromRawStatus > 0) rateStatus = rateFromRawStatus
        }
        
        // Calculate Values: Capped Quantity × Rate (SAME AS Work Value Status)
        const plannedValueStatus = rateStatus > 0 ? cappedPlannedQuantityStatus * rateStatus : 0
        const actualValueStatus = rateStatus > 0 ? cappedActualQuantityStatus * rateStatus : 0
        
        // ✅ Calculate Planned Progress: (Planned Value / Total Value) × 100
        const plannedProgressStatus = totalValueStatus > 0 
          ? Math.min(100, (plannedValueStatus / totalValueStatus) * 100)
          : 0
        
        // ✅ Calculate Actual Progress: (Actual Value / Total Value) × 100
        const actualProgressStatus = totalValueStatus > 0 
          ? Math.min(100, (actualValueStatus / totalValueStatus) * 100)
          : 0
        
        // ============================================
        // ✅ SMART: Calculate Activity Status based on Progress Summary
        // ============================================
        let status: 'completed' | 'delayed' | 'ahead' | 'on_track' | 'not_started' = 'not_started'
        let statusText = 'Not Started'
        let statusIcon = Clock
        let statusColor = 'text-gray-500 dark:text-gray-400'
        
        // ✅ NEW: Check if Planned has started but Actual hasn't started yet - This is Delayed
        if (plannedProgressStatus > 0 && actualProgressStatus === 0) {
          status = 'delayed'
          statusText = 'Delayed'
          statusIcon = AlertCircle
          statusColor = 'text-red-600 dark:text-red-400'
        }
        // Check if activity has started (actualProgressStatus > 0)
        else if (actualProgressStatus > 0) {
          // Check if completed
          // Completed if: actualProgressStatus >= 100% OR (actualProgressStatus >= plannedProgressStatus when plannedProgressStatus = 100%)
          if (actualProgressStatus >= 100 || (plannedProgressStatus >= 100 && actualProgressStatus >= plannedProgressStatus)) {
            status = 'completed'
            statusText = 'Completed'
            statusIcon = CheckCircle
            statusColor = 'text-green-600 dark:text-green-400'
          } else {
            // Calculate difference between Planned and Actual
            const progressDifference = plannedProgressStatus - actualProgressStatus
            
            // ✅ Delayed: Planned > Actual + 5%
            if (progressDifference > 5) {
              status = 'delayed'
              statusText = 'Delayed'
              statusIcon = AlertCircle
              statusColor = 'text-red-600 dark:text-red-400'
            }
            // ✅ Ahead: Planned < Actual - 5%
            else if (progressDifference < -5) {
              status = 'ahead'
              statusText = 'Ahead'
              statusIcon = TrendingUp
              statusColor = 'text-green-600 dark:text-green-400'
            }
            // ✅ On Track: Difference between -5% and +5%
            else {
              status = 'on_track'
              statusText = 'On Track'
              statusIcon = Clock
              statusColor = 'text-blue-600 dark:text-blue-400'
            }
          }
        }
        
        const StatusIcon = statusIcon
        
        // ✅ DEBUG: Log calculation in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`📊 [BOQ] Activity Status (based on Progress Summary) for "${activity.activity_name}":`, {
            status,
            plannedProgress: plannedProgressStatus.toFixed(1) + '%',
            actualProgress: actualProgressStatus.toFixed(1) + '%',
            progressDifference: (plannedProgressStatus - actualProgressStatus).toFixed(1) + '%',
            plannedValue: plannedValueStatus,
            actualValue: actualValueStatus,
            totalValue: totalValueStatus
          })
        }
        
        return (
          <div className="flex items-center gap-2">
            <StatusIcon className={`h-4 w-4 ${statusColor}`} />
            <span className={`text-sm font-medium ${statusColor}`}>
              {statusText}
            </span>
          </div>
        )
      
      case 'use_virtual_material':
        // ✅ Display Use Virtual Material checkbox status
        const useVirtualMaterialValue = activity.use_virtual_material ?? false
        
        return (
          <div className="flex items-center gap-2">
            {useVirtualMaterialValue ? (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium text-green-600 dark:text-green-400">Yes</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <X className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                <span className="text-sm text-gray-400 dark:text-gray-500">No</span>
              </div>
            )}
          </div>
        )
      
      case 'daily_productivity':
        // ✅ Calculate Daily Productivity: Remaining Units / Remaining Days
        // Logic: Daily Productivity = Remaining Units / Remaining Days (always >= calculated value)
        // "أني أخلص بدري يوم أو يومين أفضل من أن الإنتاجية تقل وأخلص في المعاد"
        // ✅ IMPORTANT: Use Remaining Units (Total - Actual) not Planned Units
        const rawProductivity = (activity as any).raw || {}
        
        // ✅ Get Total Units (SAME AS QUANTITIES COLUMN)
        const totalUnitsProductivity = activity.total_units || 
                                     parseFloat(String(rawProductivity['Total Units'] || '0').replace(/,/g, '')) || 
                                     activity.planned_units ||
                                     parseFloat(String(rawProductivity['Planned Units'] || '0').replace(/,/g, '')) || 
                                     0
        
        // ✅ Calculate Planned Quantity (EXACT SAME LOGIC AS QUANTITIES COLUMN)
        let plannedQuantityProductivity = 0
        if (allKPIs.length > 0) {
          const plannedKPIsProductivity = allKPIs.filter((kpi: any) => {
            const inputType = (kpi.input_type || kpi['Input Type'] || (kpi as any).raw?.['Input Type'] || '').toLowerCase()
            return inputType === 'planned'
          })
          const matchedPlannedKPIsProductivity = plannedKPIsProductivity.filter((kpi: any) => kpiMatchesActivityStrict(kpi, activity))
          const plannedKPIsUntilYesterdayProductivity = matchedPlannedKPIsProductivity.filter((kpi: any) => isKPIUntilYesterdayExtended(kpi, 'planned'))
          plannedQuantityProductivity = plannedKPIsUntilYesterdayProductivity.reduce((sum: number, kpi: any) => {
            return sum + getKPIQuantity(kpi)
          }, 0)
        }
        const cappedPlannedQuantityProductivity = totalUnitsProductivity > 0 ? Math.min(plannedQuantityProductivity, totalUnitsProductivity) : plannedQuantityProductivity
        
        // ✅ Calculate Actual Units from KPIs (EXACT SAME LOGIC AS QUANTITIES COLUMN)
        // ✅ Always calculate from KPIs (ignore activity.actual_units) - Use same kpiMatchesActivityStrict function
        let actualUnitsProductivity = 0
        let actualDaysCount = 0 // Initialize actual days count
        
        if (allKPIs.length > 0) {
          // Step 1: Filter Actual KPIs only
          const actualKPIs = allKPIs.filter((kpi: any) => {
            const inputType = (kpi.input_type || kpi['Input Type'] || (kpi as any).raw?.['Input Type'] || '').toLowerCase()
            return inputType === 'actual'
          })
          
          // Step 2: Match Actual KPIs to this activity (Project, Activity Name, Zone)
          // ✅ USE SAME FUNCTION AS QUANTITIES COLUMN - kpiMatchesActivityStrict
          const matchedActualKPIsProductivity = actualKPIs.filter((kpi: any) => kpiMatchesActivityStrict(kpi, activity))
          
          // Step 3: Filter until yesterday and sum quantities
          const actualKPIsUntilYesterday = matchedActualKPIsProductivity.filter((kpi: any) => isKPIUntilYesterdayExtended(kpi, 'actual'))
          actualUnitsProductivity = actualKPIsUntilYesterday.reduce((sum: number, kpi: any) => {
            return sum + getKPIQuantity(kpi)
          }, 0)
          
          // ✅ Calculate Actual Days: Count unique dates from Actual KPIs
          const actualDaysSet = new Set<string>()
          actualKPIsUntilYesterday.forEach((kpi: any) => {
            const raw = (kpi as any).raw || {}
            // Get date from KPI (same priority as isKPIUntilYesterday)
            const kpiDateStr = kpi.actual_date || 
                              kpi.activity_date || 
                              kpi['Actual Date'] || 
                              kpi['Activity Date'] || 
                              raw['Actual Date'] || 
                              raw['Activity Date'] ||
                              kpi.created_at ||
                              ''
            
            if (kpiDateStr) {
              try {
                // Normalize date to YYYY-MM-DD format for unique counting
                const kpiDate = new Date(kpiDateStr)
                if (!isNaN(kpiDate.getTime())) {
                  const dateKey = kpiDate.toISOString().split('T')[0]
                  actualDaysSet.add(dateKey)
                }
              } catch {
                // Skip invalid dates
              }
            }
          })
          actualDaysCount = actualDaysSet.size
        }
        
        // ✅ CRITICAL: Cap Actual to not exceed Total (same as quantities column)
        const cappedActualProductivity = totalUnitsProductivity > 0 ? Math.min(actualUnitsProductivity, totalUnitsProductivity) : actualUnitsProductivity
        
        // ✅ Calculate Remaining Units = Total Units - Capped Actual (EXACT SAME AS QUANTITIES COLUMN)
        const remainingUnitsProductivity = Math.max(0, totalUnitsProductivity - cappedActualProductivity)
        
        // ✅ Get Remaining Days (from today until deadline)
        const plannedEndProductivity = activity.deadline || 
                                      activity.activity_planned_completion_date ||
                                      getActivityField(activity, 'Deadline') ||
                                      getActivityField(activity, 'Planned Completion Date') ||
                                      rawProductivity['Deadline'] ||
                                      rawProductivity['Planned Completion Date'] ||
                                      ''
        
        const plannedStartProductivity = getPlannedStartDate(activity)
        
        let remainingDaysProductivity = 0
        
        // ✅ Priority 1: Calculate Remaining Days from today until deadline
        if (plannedEndProductivity && plannedEndProductivity !== 'N/A') {
          try {
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const endDate = new Date(plannedEndProductivity)
            endDate.setHours(23, 59, 59, 999)
            if (!isNaN(endDate.getTime())) {
              const diffTime = endDate.getTime() - today.getTime()
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
              // ✅ If deadline is in the past, use 1 day minimum (to avoid division by zero)
              remainingDaysProductivity = diffDays > 0 ? diffDays : 1
            }
          } catch {
            // Keep remainingDays as 0, will use fallback
          }
        }
        
        // ✅ Priority 2: Calculate Planned Duration (from Start to End) if Remaining Days = 0 or deadline in past
        if (remainingDaysProductivity === 0 || remainingDaysProductivity === 1) {
          if (plannedStartProductivity && plannedEndProductivity && 
              plannedStartProductivity !== 'N/A' && plannedEndProductivity !== 'N/A') {
            try {
              const startDate = new Date(plannedStartProductivity)
              const endDate = new Date(plannedEndProductivity)
              if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
                const diffTime = endDate.getTime() - startDate.getTime()
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                // ✅ Use planned duration if remaining days is 0 or 1 (deadline in past)
                if (remainingDaysProductivity <= 1 && diffDays > 0) {
                  remainingDaysProductivity = Math.max(1, diffDays)
                } else if (remainingDaysProductivity === 0) {
                  remainingDaysProductivity = diffDays >= 0 ? Math.max(1, diffDays) : 0
                }
              }
            } catch {
              // Keep remainingDays as is
            }
          }
        }
        
        // ✅ Priority 3: Use calendar_duration if still 0
        if (remainingDaysProductivity === 0) {
          remainingDaysProductivity = activity.calendar_duration || 
                                     parseFloat(String(getActivityField(activity, 'Calendar Duration') || '0')) ||
                                     parseFloat(String(rawProductivity['Calendar Duration'] || '0')) ||
                                     0
        }
        
        // ✅ Priority 4: Use default duration (30 days) if units > 0 but no duration found
        if (remainingDaysProductivity === 0 && remainingUnitsProductivity > 0) {
          remainingDaysProductivity = 30 // Default: 30 days
        }
        
        // ✅ Calculate Total Duration (from Start to End) for Natural Daily Productivity
        let totalDurationProductivity = 0
        if (plannedStartProductivity && plannedEndProductivity && 
            plannedStartProductivity !== 'N/A' && plannedEndProductivity !== 'N/A') {
          try {
            const startDate = new Date(plannedStartProductivity)
            const endDate = new Date(plannedEndProductivity)
            if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
              const diffTime = endDate.getTime() - startDate.getTime()
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
              totalDurationProductivity = diffDays >= 0 ? Math.max(1, diffDays) : 0
            }
          } catch {
            // Keep totalDuration as 0
          }
        }
        
        // ✅ Fallback: Use calendar_duration if total duration not calculated
        if (totalDurationProductivity === 0) {
          totalDurationProductivity = activity.calendar_duration || 
                                     parseFloat(String(getActivityField(activity, 'Calendar Duration') || '0')) ||
                                     parseFloat(String(rawProductivity['Calendar Duration'] || '0')) ||
                                     0
        }
        
        // ✅ Calculate Daily Productivity
        // ✅ CRITICAL: Daily Productivity must be >= Natural Daily Productivity (Total Quantity / Duration)
        // Natural Daily Productivity (Planned) = Total Units / Total Duration
        // Remaining Daily Productivity (Required) = Remaining Units / Remaining Days
        // Actual Daily Productivity = Actual Quantity / Actual Days (from record raw)
        // Final Daily Productivity = Math.ceil(Math.max(Natural, Remaining))
        let dailyProductivity = 0
        let plannedProductivity = 0 // Natural Daily Productivity
        let requiredProductivity = 0 // Remaining Daily Productivity
        let actualProductivity = 0 // Actual Daily Productivity
        let showCalculation = false
        
        // ✅ Calculate Natural Daily Productivity (Planned) = Capped Planned Quantity / Duration
        // Use Planned Quantity from Quantities column (not Total Units)
        if (cappedPlannedQuantityProductivity > 0 && totalDurationProductivity > 0) {
          plannedProductivity = cappedPlannedQuantityProductivity / totalDurationProductivity
        } else if (totalUnitsProductivity > 0 && totalDurationProductivity > 0) {
          // Fallback to Total Units if no Planned KPIs
          plannedProductivity = totalUnitsProductivity / totalDurationProductivity
        }
        
        // ✅ Calculate Actual Daily Productivity = Actual Quantity / Actual Days
        // If no Actual KPIs, use Planned Productivity as Actual
        if (actualUnitsProductivity > 0 && actualDaysCount > 0) {
          actualProductivity = actualUnitsProductivity / actualDaysCount
        } else if (actualUnitsProductivity === 0 && actualDaysCount === 0) {
          // No Actual KPIs yet - use Planned Productivity as Actual
          actualProductivity = plannedProductivity
        }
        
        // ✅ Show calculation if we have remaining units (even if 0, for completed activities)
        if (remainingUnitsProductivity >= 0 && remainingDaysProductivity > 0) {
          if (remainingUnitsProductivity > 0) {
            // ✅ Calculate Remaining Daily Productivity (Required)
            const rawRequiredProductivity = remainingUnitsProductivity / remainingDaysProductivity
            
            // ✅ CRITICAL: Required Productivity must be >= Planned Productivity (never less)
            // Required can be more than Planned, but never less
            requiredProductivity = Math.max(plannedProductivity, rawRequiredProductivity)
            
            // ✅ CRITICAL: Daily Productivity must be >= Natural Daily Productivity
            // Use Math.max to ensure it's always >= natural productivity
            const finalProductivity = Math.max(plannedProductivity, requiredProductivity)
            
            // ✅ ALWAYS round UP: Math.ceil ensures any decimal (e.g., 6.4, 10.1, 15.9) becomes next integer
            dailyProductivity = Math.ceil(finalProductivity)
            showCalculation = true
          } else {
            // ✅ If remaining units = 0 (completed), show 0/day
            dailyProductivity = 0
            requiredProductivity = 0
            showCalculation = true
          }
        } else if (remainingUnitsProductivity > 0 && remainingDaysProductivity === 0) {
          // ✅ If we have remaining units but no remaining days, show estimated productivity (based on default 30 days)
          const estimatedProductivity = remainingUnitsProductivity / 30
          
          // ✅ CRITICAL: Required Productivity must be >= Planned Productivity (never less)
          requiredProductivity = Math.max(plannedProductivity, estimatedProductivity)
          
          // ✅ CRITICAL: Ensure it's >= Natural Daily Productivity
          const finalProductivity = Math.max(plannedProductivity, requiredProductivity)
          
          // ✅ ALWAYS round UP: Math.ceil ensures any decimal becomes next integer
          dailyProductivity = Math.ceil(finalProductivity)
          showCalculation = true
        } else if (totalUnitsProductivity > 0 && totalDurationProductivity > 0) {
          // ✅ If no remaining units but we have total units and duration, show natural productivity
          dailyProductivity = Math.ceil(plannedProductivity)
          showCalculation = true
        }
        
        // Get unit
        const unitProductivity = activity.unit || 
                                rawProductivity['Unit'] || 
                                ''
        
        // ✅ Check if quantities are completed (Remaining = 0)
        const isCompleted = remainingUnitsProductivity === 0 && totalUnitsProductivity > 0
        
        return (
          <div className="space-y-1">
            {isCompleted ? (
              // ✅ Show completion message when Remaining = 0
              <div className="flex flex-col items-start gap-1">
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">
                    Completed
                  </span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 ml-5">
                  All quantities finished
                </div>
              </div>
            ) : showCalculation ? (
              <>
                <div className="text-sm font-bold text-gray-900 dark:text-white mb-2">
                  {formatNumber(dailyProductivity)} {unitProductivity}/day
                </div>
                <div className="space-y-1.5">
                  {/* Planned (Natural Daily Productivity) */}
                  {plannedProductivity > 0 && (
                    <div className="text-xs">
                      <span className="font-semibold text-blue-600 dark:text-blue-400">Planned:</span>{' '}
                      <span className="font-medium text-blue-700 dark:text-blue-300">
                        {formatNumber(plannedProductivity)} {unitProductivity}/day
                      </span>
                      <span className="text-gray-500 dark:text-gray-400 ml-1">
                        ({formatNumber(cappedPlannedQuantityProductivity)} / {totalDurationProductivity} days)
                      </span>
                    </div>
                  )}
                  {/* Actual (Actual Daily Productivity) */}
                  {actualProductivity > 0 && (
                    <div className="text-xs">
                      <span className="font-semibold text-green-600 dark:text-green-400">Actual:</span>{' '}
                      <span className="font-medium text-green-700 dark:text-green-300">
                        {formatNumber(actualProductivity)} {unitProductivity}/day
                      </span>
                      <span className="text-gray-500 dark:text-gray-400 ml-1">
                        ({formatNumber(actualUnitsProductivity)} / {actualDaysCount > 0 ? actualDaysCount : '?'} days
                        {actualDaysCount === 0 && actualUnitsProductivity > 0 && (
                          <span className="text-green-600 dark:text-green-400"> est.</span>
                        )}
                        )
                      </span>
                    </div>
                  )}
                  {/* Required (Remaining Daily Productivity) */}
                  {remainingUnitsProductivity > 0 && (
                    <div className="text-xs">
                      <span className="font-semibold text-orange-600 dark:text-orange-400">Required:</span>{' '}
                      <span className="font-medium text-orange-700 dark:text-orange-300">
                        {formatNumber(requiredProductivity)} {unitProductivity}/day
                      </span>
                      <span className="text-gray-500 dark:text-gray-400 ml-1">
                        ({formatNumber(remainingUnitsProductivity)} / {remainingDaysProductivity > 0 ? remainingDaysProductivity : '?'} days
                        {remainingDaysProductivity === 0 && (
                          <span className="text-orange-600 dark:text-orange-400"> est.</span>
                        )}
                        )
                      </span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <span className="text-sm text-gray-400 dark:text-gray-500">N/A</span>
            )}
          </div>
        )
      
      case 'actions':
        const rawActivity = (activity as any).raw || {}
        const createdBy = (activity as any).created_by || rawActivity['created_by'] || null
        
        return (
          <div className="flex items-center gap-2">
            <PermissionButton
              permission="activities.edit"
              variant="outline"
              size="sm"
              onClick={() => onEdit(activity)}
              className="text-blue-600 hover:text-blue-700"
            >
              Edit
            </PermissionButton>
            <PermissionButton
              permission="activities.delete"
              variant="outline"
              size="sm"
              onClick={() => onDelete(activity.id)}
              className="text-red-600 hover:text-red-700"
            >
              Delete
            </PermissionButton>
            <button
              type="button"
              onClick={() => {
                setShowHistoryModal(true)
                setHistoryRecordId(activity.id)
                setHistoryRecordType('boq')
                setHistoryRecordData(activity)
              }}
              className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              title="View Complete History"
            >
              👤
            </button>
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

  // Get sortable value for an activity and column
  const getSortValue = (activity: BOQActivity, columnId: string): any => {
    const getField = (fieldName: string) => {
      const raw = (activity as any).raw || activity
      return raw[fieldName] || (activity as any)[fieldName] || ''
    }
    
    switch (columnId) {
      case 'activity_details':
        return activity.activity_name || getField('Activity Name') || ''
      case 'quantities':
        return parseFloat(String(activity.planned_units || getField('Planned Units') || '0').replace(/,/g, '')) || 0
      case 'activity_value':
        return parseFloat(String(activity.total_value || getField('Total Value') || '0').replace(/,/g, '')) || 0
      case 'planned_dates':
        const plannedStart = activity.activity_planned_start_date || getField('Planned Start Date') || ''
        return plannedStart ? new Date(plannedStart).getTime() : 0
      case 'actual_dates':
        const actualStart = (activity as any).activity_actual_start_date || getField('Actual Start Date') || ''
        return actualStart ? new Date(actualStart).getTime() : 0
      case 'progress_summary':
        return activity.activity_progress_percentage ?? 0
      case 'work_value_status':
        const plannedWorkValue = parseFloat(String(getField('Planned Work Value') || '0').replace(/,/g, '')) || 0
        return plannedWorkValue
      case 'activity_status':
        return (activity as any).activity_status || getField('Activity Status') || ''
      case 'daily_productivity':
        // ✅ Calculate Daily Productivity for sorting (same logic as renderCell - Remaining Units / Remaining Days)
        const rawProductivitySort = (activity as any).raw || {}
        
        // Get Total Units
        const totalUnitsSort = activity.total_units || 
                              parseFloat(String(rawProductivitySort['Total Units'] || '0').replace(/,/g, '')) || 
                              0
        
        // Get Actual Units (simplified for sorting - use activity.actual_units if available)
        const actualUnitsSort = activity.actual_units || 
                               parseFloat(String(rawProductivitySort['Actual Units'] || '0').replace(/,/g, '')) || 
                               0
        
        // Calculate Remaining Units = Total Units - Actual Units
        const remainingUnitsSort = Math.max(0, totalUnitsSort - actualUnitsSort)
        
        // Get Remaining Days (simplified for sorting - from deadline or calendar_duration)
        const plannedEndSort = activity.deadline || 
                             activity.activity_planned_completion_date ||
                             getField('Deadline') ||
                             getField('Planned Completion Date') ||
                             rawProductivitySort['Deadline'] ||
                             rawProductivitySort['Planned Completion Date'] ||
                             ''
        
        let remainingDaysSort = 0
        if (plannedEndSort && plannedEndSort !== 'N/A') {
          try {
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const endDate = new Date(plannedEndSort)
            endDate.setHours(23, 59, 59, 999)
            if (!isNaN(endDate.getTime())) {
              const diffTime = endDate.getTime() - today.getTime()
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
              remainingDaysSort = diffDays >= 0 ? Math.max(1, diffDays) : 0
            }
          } catch {
            // Keep remainingDays as 0
          }
        }
        
        // Fallback: Use calendar_duration if no deadline
        if (remainingDaysSort === 0) {
          remainingDaysSort = activity.calendar_duration || 
                             parseFloat(String(getField('Calendar Duration') || '0')) ||
                             parseFloat(String(rawProductivitySort['Calendar Duration'] || '0')) ||
                             0
        }
        
        // Use default duration (30 days) if remaining units > 0 but no remaining days found
        if (remainingDaysSort === 0 && remainingUnitsSort > 0) {
          remainingDaysSort = 30 // Default: 30 days
        }
        
        // ✅ Calculate Total Duration for Natural Daily Productivity
        let totalDurationSort = activity.calendar_duration || 
                               parseFloat(String(getField('Calendar Duration') || '0')) ||
                               parseFloat(String(rawProductivitySort['Calendar Duration'] || '0')) ||
                               0
        
        // ✅ Calculate Natural Daily Productivity (Total Quantity / Duration)
        let naturalDailyProductivitySort = 0
        if (totalUnitsSort > 0 && totalDurationSort > 0) {
          naturalDailyProductivitySort = totalUnitsSort / totalDurationSort
        }
        
        if (remainingDaysSort > 0 && remainingUnitsSort > 0) {
          // ✅ Calculate Remaining Daily Productivity
          const remainingDailyProductivitySort = remainingUnitsSort / remainingDaysSort
          
          // ✅ CRITICAL: Daily Productivity must be >= Natural Daily Productivity
          const finalProductivity = Math.max(naturalDailyProductivitySort, remainingDailyProductivitySort)
          return Math.ceil(finalProductivity)
        } else if (totalUnitsSort > 0 && totalDurationSort > 0) {
          // ✅ If no remaining units but we have total units and duration, return natural productivity
          return Math.ceil(naturalDailyProductivitySort)
        }
        return 0
      default:
        return getField(columnId) || ''
    }
  }

  // Sort activities - skip client-side sorting if server-side sorting is enabled
  const sortedActivities = useMemo(() => {
    // ✅ If server-side sorting is enabled, don't sort client-side
    if (onSort) {
      return activities // Data is already sorted from server
    }
    
    if (!sortColumn) return activities
    
    return [...activities].sort((a, b) => {
      const aValue = getSortValue(a, sortColumn)
      const bValue = getSortValue(b, sortColumn)
      
      if (aValue === null || aValue === undefined) return 1
      if (bValue === null || bValue === undefined) return -1
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue, undefined, { numeric: true, sensitivity: 'base' })
        return sortDirection === 'asc' ? comparison : -comparison
      }
      
      const comparison = (aValue as number) - (bValue as number)
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [activities, sortColumn, sortDirection])

  // ✅ Check permission before rendering the entire table
  if (!guard.hasAccess('activities.view')) {
    return null
  }

  return (
    <div className="space-y-4">
      {/* Header with Customization Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Activities ({activities.length})
          </h3>
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {selectedIds.length} selected
              </span>
              {onBulkDelete && guard.hasAccess('activities.delete') && (
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
            permission="activities.view"
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
                          checked={selectedIds.length === activities.length && activities.length > 0}
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
            {sortedActivities.map((activity) => (
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

      {/* History Modal */}
      <RecordHistoryModal
        isOpen={showHistoryModal}
        onClose={() => {
          setShowHistoryModal(false)
          setHistoryRecordId('')
          setHistoryRecordData(null)
        }}
        recordType={historyRecordType}
        recordId={historyRecordId}
        recordData={historyRecordData}
        title="BOQ Activity Complete History"
      />
    </div>
  )
}