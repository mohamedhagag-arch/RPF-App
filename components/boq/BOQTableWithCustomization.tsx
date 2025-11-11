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
  { id: 'scope', label: 'Scope', visible: true, order: 2, width: '200px' },
  { id: 'division', label: 'Division', visible: true, order: 3, width: '180px' }, // ✅ Division column
  { id: 'activity_timing', label: 'Activity Timing', visible: true, order: 4, width: '180px' }, // ✅ Activity Timing column
  { id: 'quantities', label: 'Quantities', visible: true, order: 5, width: '180px' },
  { id: 'activity_value', label: 'Activity Value', visible: true, order: 6, width: '150px' },
  { id: 'planned_dates', label: 'Planned Dates', visible: true, order: 7, width: '180px' },
  { id: 'actual_dates', label: 'Actual Dates', visible: true, order: 8, width: '180px' },
  { id: 'progress_summary', label: 'Progress Summary', visible: true, order: 9, width: '180px' },
  { id: 'work_value_status', label: 'Work Value Status', visible: true, order: 10, width: '200px' },
  { id: 'activity_status', label: 'Activity Status', visible: true, order: 11, width: '150px' },
  { id: 'actions', label: 'Actions', visible: true, order: 12, fixed: true, width: '150px' }
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
  // ✅ FIX: Load project types from project_types table for Scope display
  const [projectTypesMap, setProjectTypesMap] = useState<Map<string, { name: string; description?: string }>>(new Map())
  
  // Sorting state
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  
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
    // ✅ FIX: Find project by project_full_code (not just project_code)
    const activityFullCode = (activity.project_full_code || activity.project_code || '').trim()
    const project = getProjectByFullCode(activityFullCode) || projects.find(p => p.project_code === activity.project_code)
    const projectFullName = project?.project_name || getProjectName(activity.project_code) || activity.project_full_code || activity.project_code
    const currencyCode = project?.currency
    
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
        
        // 4. If no scopes found, show N/A
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
        
        // Helper: Extract zone from activity
        const getActivityZone = (activity: BOQActivity): string => {
          const raw = (activity as any).raw || {}
          const zoneRaw = (
            activity.zone_ref || 
            activity.zone_number || 
            raw['Zone Ref'] || 
            raw['Zone Number'] || 
            ''
          ).toString().trim()
          return normalizeZone(zoneRaw, activity.project_code || '')
        }
        
        // Helper: Extract zone from KPI
        const getKPIZone = (kpi: any): string => {
          const raw = (kpi as any).raw || {}
          const zoneRaw = (
            kpi.zone || 
            kpi.section || 
            raw['Zone'] || 
            raw['Zone Number'] || 
            ''
          ).toString().trim()
          const projectCode = (kpi.project_code || kpi['Project Code'] || raw['Project Code'] || '').toString().trim()
          return normalizeZone(zoneRaw, projectCode)
        }
        
        // Helper: Check if KPI matches activity (Project, Activity Name, Zone)
        const kpiMatchesActivity = (kpi: any, activity: BOQActivity): boolean => {
          const rawKPI = (kpi as any).raw || {}
          
          // 1. Project Code Matching
          const kpiProjectCode = (kpi.project_code || kpi['Project Code'] || rawKPI['Project Code'] || '').toString().trim().toUpperCase()
          const kpiProjectFullCode = (kpi.project_full_code || kpi['Project Full Code'] || rawKPI['Project Full Code'] || '').toString().trim().toUpperCase()
          const activityProjectCode = (activity.project_code || '').toString().trim().toUpperCase()
          const activityProjectFullCode = (activity.project_full_code || activity.project_code || '').toString().trim().toUpperCase()
          
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
          
          // 2. Activity Name Matching (required)
          const kpiActivityName = (kpi.activity_name || kpi['Activity Name'] || kpi.activity || rawKPI['Activity Name'] || '').toLowerCase().trim()
          const activityName = (activity.activity_name || activity.activity || '').toLowerCase().trim()
          const activityMatch = kpiActivityName && activityName && (
            kpiActivityName === activityName || 
            kpiActivityName.includes(activityName) || 
            activityName.includes(kpiActivityName)
          )
          if (!activityMatch) return false
          
          // 3. Zone Matching (if both have zones, they must match)
          const kpiZone = getKPIZone(kpi)
          const activityZone = getActivityZone(activity)
          if (activityZone && kpiZone) {
            const zoneMatch = (
              activityZone === kpiZone ||
              activityZone.includes(kpiZone) ||
              kpiZone.includes(activityZone)
            )
            if (!zoneMatch) return false
          }
          
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
        
        // Helper: Check if KPI date is until yesterday
        const isKPIUntilYesterday = (kpi: any, inputType: 'planned' | 'actual'): boolean => {
          const yesterday = new Date()
          yesterday.setDate(yesterday.getDate() - 1)
          yesterday.setHours(23, 59, 59, 999)
          
          const raw = (kpi as any).raw || {}
          let kpiDateStr = ''
          
          if (inputType === 'planned') {
            kpiDateStr = kpi.target_date || 
                        kpi.activity_date || 
                        kpi['Target Date'] || 
                        kpi['Activity Date'] || 
                        raw['Target Date'] || 
                        raw['Activity Date'] ||
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
          const matchedPlannedKPIs = plannedKPIs.filter((kpi: any) => kpiMatchesActivity(kpi, activity))
          
          // Step 3: Filter until yesterday and sum quantities
          const plannedKPIsUntilYesterday = matchedPlannedKPIs.filter((kpi: any) => isKPIUntilYesterday(kpi, 'planned'))
          plannedUnits = plannedKPIsUntilYesterday.reduce((sum: number, kpi: any) => {
            return sum + getKPIQuantity(kpi)
          }, 0)
        }
        
        // Calculate Actual: Sum of Actual KPIs until yesterday (with Zone matching)
        let actualUnits = activity.actual_units || 
                         parseFloat(String(rawActivityQuantities['Actual Units'] || '0').replace(/,/g, '')) || 
                         0
        
        // If actual_units is 0 or not set, calculate from Actual KPIs
        if (actualUnits === 0 && allKPIs.length > 0) {
          // Step 1: Filter Actual KPIs only
          const actualKPIs = allKPIs.filter((kpi: any) => {
            const inputType = (kpi.input_type || kpi['Input Type'] || (kpi as any).raw?.['Input Type'] || '').toLowerCase()
            return inputType === 'actual'
          })
          
          // Step 2: Match Actual KPIs to this activity (Project, Activity Name, Zone)
          const matchedActualKPIs = actualKPIs.filter((kpi: any) => kpiMatchesActivity(kpi, activity))
          
          // Step 3: Filter until yesterday and sum quantities
          const actualKPIsUntilYesterday = matchedActualKPIs.filter((kpi: any) => isKPIUntilYesterday(kpi, 'actual'))
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
          console.log(`📊 [BOQ Quantities] "${activity.activity_name}" (Zone: ${getActivityZone(activity) || 'N/A'}):`, {
            totalUnits,
            plannedUnits,
            cappedPlanned,
            actualUnits,
            cappedActual,
            remaining,
            plannedExceeded: plannedUnits > totalUnits,
            actualExceeded: actualUnits > totalUnits
          })
        }
        
        return (
          <div className="space-y-1">
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Total: {totalUnits.toLocaleString()}
            </div>
            <div className={`text-xs ${cappedPlanned < plannedUnits ? 'text-orange-600 dark:text-orange-400 font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
              Planned: {cappedPlanned.toLocaleString()}
              {cappedPlanned < plannedUnits && (
                <span className="ml-1 text-[10px] opacity-75">(capped from {plannedUnits.toLocaleString()})</span>
              )}
            </div>
            <div className={`text-xs ${cappedActual < actualUnits ? 'text-orange-600 dark:text-orange-400 font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
              Actual: {cappedActual.toLocaleString()}
              {cappedActual < actualUnits && (
                <span className="ml-1 text-[10px] opacity-75">(capped from {actualUnits.toLocaleString()})</span>
              )}
            </div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              Remaining: {remaining.toLocaleString()}
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
            
            // ✅ STRICT: Activity name must match (required for activity-specific matching)
            const activityMatch = kpiActivityName && activityName && 
              (kpiActivityName === activityName || 
               kpiActivityName.includes(activityName) || 
               activityName.includes(kpiActivityName))
            
            // ✅ Zone match is optional but helps with precision
            const zoneMatch = kpiZone && activityZone && 
              (kpiZone === activityZone || 
               kpiZone.includes(activityZone) || 
               activityZone.includes(kpiZone))
            
            // ✅ Require activity name match (not just zone) to ensure activity-specific matching
            // If zone is available, both should match for better precision
            if (activityZone && kpiZone) {
              return activityMatch && zoneMatch
            }
            
            // If no zone in activity, require activity name match
            return activityMatch
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
        
        // ✅ Get Total Units for Actual Progress calculation (still based on quantities)
        const totalUnitsProgress = activity.total_units || 
                          parseFloat(String(rawActivityProgress['Total Units'] || '0').replace(/,/g, '')) || 
                          activity.planned_units ||
                          parseFloat(String(rawActivityProgress['Planned Units'] || '0').replace(/,/g, '')) || 
                          0
        
        // ✅ Calculate yesterday date for filtering KPIs
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        yesterday.setHours(23, 59, 59, 999) // End of yesterday
        
        // ✅ Get Total Value from BOQ activity (this is the base for calculations)
        const totalValueProgress = activity.total_value || 
                          parseFloat(String(rawActivityProgress['Total Value'] || '0').replace(/,/g, '')) || 
                          0
        
        // ✅ Get Planned Value from Planned KPIs until yesterday only
        let plannedValueProgress = 0
        if (allKPIs.length > 0 && totalValueProgress > 0) {
          // Match KPIs to this activity
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
            
            // ✅ STRICT: Activity name must match (required for activity-specific matching)
            const activityMatchProgress = kpiActivityNameProgress && activityNameProgress && 
              (kpiActivityNameProgress === activityNameProgress || 
               kpiActivityNameProgress.includes(activityNameProgress) || 
               activityNameProgress.includes(kpiActivityNameProgress))
            
            // ✅ Zone match is optional but helps with precision
            const zoneMatchProgress = kpiZoneProgress && activityZoneProgress && 
              (kpiZoneProgress === activityZoneProgress || 
               kpiZoneProgress.includes(activityZoneProgress) || 
               activityZoneProgress.includes(kpiZoneProgress))
            
            // ✅ Require activity name match (not just zone) to ensure activity-specific matching
            // If zone is available, both should match for better precision
            if (activityZoneProgress && kpiZoneProgress) {
              return activityMatchProgress && zoneMatchProgress
            }
            
            // If no zone in activity, require activity name match
            return activityMatchProgress
          })
          
          // Filter for Planned KPIs only
          const plannedKPIsProgress = activityKPIsProgress.filter((kpi: any) => {
            const inputType = (kpi.input_type || kpi['Input Type'] || kpi.raw?.['Input Type'] || '').toLowerCase()
            return inputType === 'planned'
          })
          
          // ✅ Filter Planned KPIs until yesterday only and sum VALUES (not quantities)
          if (plannedKPIsProgress.length > 0) {
            plannedValueProgress = plannedKPIsProgress
              .filter((kpi: any) => {
                // Get KPI date from multiple sources
                const kpiDateStr = kpi.activity_date || kpi.target_date || kpi['Activity Date'] || kpi['Target Date'] || kpi.raw?.['Activity Date'] || kpi.raw?.['Target Date'] || ''
                if (!kpiDateStr) return true // Include if no date (assume it's valid)
                
                try {
                  const kpiDate = new Date(kpiDateStr)
                  if (isNaN(kpiDate.getTime())) return true // Include if invalid date
                  return kpiDate <= yesterday // Only include KPIs until yesterday
                } catch {
                  return true // Include if date parsing fails
                }
              })
              .reduce((sum: number, kpi: any) => {
                // Calculate value: use value directly if available, otherwise quantity × rate
                let kpiValue = parseFloat(String(kpi.value || kpi['Value'] || kpi.raw?.['Value'] || '0').replace(/,/g, '')) || 0
                
                // If value is 0 or not available, calculate from quantity × rate
                if (kpiValue === 0) {
                  const quantity = parseFloat(String(kpi.quantity || kpi['Quantity'] || kpi.raw?.['Quantity'] || '0').replace(/,/g, '')) || 0
                  const rate = parseFloat(String(kpi.rate || kpi['Rate'] || kpi.raw?.['Rate'] || '0').replace(/,/g, '')) || 0
                  
                  // If rate is not available, calculate from activity rate
                  if (rate === 0) {
                    const activityRate = activity.rate || 
                                      (activity.total_value && activity.planned_units && activity.planned_units > 0 
                                        ? activity.total_value / activity.planned_units 
                                        : 0) ||
                                      parseFloat(String(rawActivityProgress['Rate'] || '0').replace(/,/g, '')) ||
                                      0
                    kpiValue = quantity * activityRate
                  } else {
                    kpiValue = quantity * rate
                  }
                }
                
                return sum + kpiValue
              }, 0)
          }
        }
        
        // ✅ Fallback: If no Planned KPIs found, use 0 (should start from 0%)
        // This ensures Planned Progress starts from 0% and increases as KPIs are added
        if (plannedValueProgress === 0 && allKPIs.length === 0) {
          plannedValueProgress = 0
        }
        
        // ✅ Get Actual Value from Actual KPIs until yesterday only
        let actualValueProgress = 0
        if (allKPIs.length > 0 && totalValueProgress > 0) {
          // Match KPIs to this activity (same logic as Planned)
          const activityKPIsActual = allKPIs.filter((kpi: any) => {
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
            
            // ✅ STRICT: Activity name must match (required for activity-specific matching)
            const activityMatchProgress = kpiActivityNameProgress && activityNameProgress && 
              (kpiActivityNameProgress === activityNameProgress || 
               kpiActivityNameProgress.includes(activityNameProgress) || 
               activityNameProgress.includes(kpiActivityNameProgress))
            
            // ✅ Zone match is optional but helps with precision
            const zoneMatchProgress = kpiZoneProgress && activityZoneProgress && 
              (kpiZoneProgress === activityZoneProgress || 
               kpiZoneProgress.includes(activityZoneProgress) || 
               activityZoneProgress.includes(kpiZoneProgress))
            
            // ✅ Require activity name match (not just zone) to ensure activity-specific matching
            // If zone is available, both should match for better precision
            if (activityZoneProgress && kpiZoneProgress) {
              return activityMatchProgress && zoneMatchProgress
            }
            
            // If no zone in activity, require activity name match
            return activityMatchProgress
          })
          
          // Filter for Actual KPIs only
          const actualKPIsProgress = activityKPIsActual.filter((kpi: any) => {
            const inputType = (kpi.input_type || kpi['Input Type'] || kpi.raw?.['Input Type'] || '').toLowerCase()
            return inputType === 'actual'
          })
          
          // ✅ Filter Actual KPIs until yesterday only and sum VALUES (not quantities)
          if (actualKPIsProgress.length > 0) {
            actualValueProgress = actualKPIsProgress
              .filter((kpi: any) => {
                // Get KPI date from multiple sources
                const kpiDateStr = kpi.actual_date || kpi.activity_date || kpi['Actual Date'] || kpi['Activity Date'] || kpi.raw?.['Actual Date'] || kpi.raw?.['Activity Date'] || ''
                if (!kpiDateStr) return true // Include if no date
                
                try {
                  const kpiDate = new Date(kpiDateStr)
                  if (isNaN(kpiDate.getTime())) return true
                  return kpiDate <= yesterday // Only include KPIs until yesterday
                } catch {
                  return true
                }
              })
              .reduce((sum: number, kpi: any) => {
                // Calculate value: use value directly if available, otherwise quantity × rate
                let kpiValue = parseFloat(String(kpi.value || kpi['Value'] || kpi.raw?.['Value'] || '0').replace(/,/g, '')) || 0
                
                // If value is 0 or not available, calculate from quantity × rate
                if (kpiValue === 0) {
                  const quantity = parseFloat(String(kpi.quantity || kpi['Quantity'] || kpi.raw?.['Quantity'] || '0').replace(/,/g, '')) || 0
                  const rate = parseFloat(String(kpi.rate || kpi['Rate'] || kpi.raw?.['Rate'] || '0').replace(/,/g, '')) || 0
                  
                  // If rate is not available, calculate from activity rate
                  if (rate === 0) {
                    const activityRate = activity.rate || 
                                      (activity.total_value && activity.planned_units && activity.planned_units > 0 
                                        ? activity.total_value / activity.planned_units 
                                        : 0) ||
                                      parseFloat(String(rawActivityProgress['Rate'] || '0').replace(/,/g, '')) ||
                                      0
                    kpiValue = quantity * activityRate
                  } else {
                    kpiValue = quantity * rate
                  }
                }
                
                return sum + kpiValue
              }, 0)
          }
        }
        
        // ✅ Fallback: If no Actual KPIs found, use 0 (should start from 0%)
        if (actualValueProgress === 0 && allKPIs.length === 0) {
          actualValueProgress = 0
        }
        
        // ✅ Calculate Planned Progress: (Planned Value until yesterday / Total Value) × 100
        // This starts from 0% and increases to 100% as Planned KPIs are added until yesterday
        // Cap at 100% to prevent values exceeding 100%
        const plannedProgress = totalValueProgress > 0 
          ? Math.min(100, (plannedValueProgress / totalValueProgress) * 100)
          : 0
        
        // ✅ Calculate Actual Progress: (Actual Value until yesterday / Total Value) × 100
        // This starts from 0% and increases to 100% as Actual KPIs are added until yesterday
        // Cap at 100% to prevent values exceeding 100%
        const actualProgress = totalValueProgress > 0 
          ? Math.min(100, (actualValueProgress / totalValueProgress) * 100)
          : 0
        
        const varianceProgress = actualProgress - plannedProgress
        
        // ✅ DEBUG: Log calculation in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`📊 [BOQ] Progress Summary for "${activity.activity_name}":`, {
            plannedValue: plannedValueProgress,
            actualValue: actualValueProgress,
            totalValue: totalValueProgress,
            plannedProgressRaw: totalValueProgress > 0 ? (plannedValueProgress / totalValueProgress) * 100 : 0,
            plannedProgressCapped: plannedProgress,
            actualProgressRaw: totalValueProgress > 0 ? (actualValueProgress / totalValueProgress) * 100 : 0,
            actualProgressCapped: actualProgress,
            variance: varianceProgress,
            plannedWarning: plannedValueProgress > totalValueProgress ? '⚠️ Planned Value exceeds Total Value!' : 'OK',
            actualWarning: actualValueProgress > totalValueProgress ? '⚠️ Actual Value exceeds Total Value!' : 'OK'
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
        const rawActivity = (activity as any).raw || {}
        
        // ✅ Calculate yesterday date for filtering KPIs
        const yesterdayWorkValue = new Date()
        yesterdayWorkValue.setDate(yesterdayWorkValue.getDate() - 1)
        yesterdayWorkValue.setHours(23, 59, 59, 999) // End of yesterday
        
        // ✅ Get Planned Value from Planned KPIs until yesterday only
        let plannedWorkValueAct = 0
        if (allKPIs.length > 0) {
          // Match KPIs to this activity (same logic as progress_summary)
          const activityKPIsWorkValue = allKPIs.filter((kpi: any) => {
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
            
            // ✅ STRICT: Activity name must match (required for activity-specific matching)
            const activityMatch = kpiActivityName && activityName && 
              (kpiActivityName === activityName || 
               kpiActivityName.includes(activityName) || 
               activityName.includes(kpiActivityName))
            
            // ✅ Zone match is optional but helps with precision
            const zoneMatch = kpiZone && activityZone && 
              (kpiZone === activityZone || 
               kpiZone.includes(activityZone) || 
               activityZone.includes(kpiZone))
            
            // ✅ Require activity name match (not just zone) to ensure activity-specific matching
            // If zone is available, both should match for better precision
            if (activityZone && kpiZone) {
              return activityMatch && zoneMatch
            }
            
            // If no zone in activity, require activity name match
            return activityMatch
          })
          
          // Filter for Planned KPIs only
          const plannedKPIsWorkValue = activityKPIsWorkValue.filter((kpi: any) => {
            const inputType = (kpi.input_type || kpi['Input Type'] || kpi.raw?.['Input Type'] || '').toLowerCase()
            return inputType === 'planned'
          })
          
          // ✅ Filter Planned KPIs until yesterday only and sum VALUES
          if (plannedKPIsWorkValue.length > 0) {
            plannedWorkValueAct = plannedKPIsWorkValue
              .filter((kpi: any) => {
                const kpiDateStr = kpi.activity_date || kpi.target_date || kpi['Activity Date'] || kpi['Target Date'] || kpi.raw?.['Activity Date'] || kpi.raw?.['Target Date'] || ''
                if (!kpiDateStr) return true
                
                try {
                  const kpiDate = new Date(kpiDateStr)
                  if (isNaN(kpiDate.getTime())) return true
                  return kpiDate <= yesterdayWorkValue
                } catch {
                  return true
                }
              })
              .reduce((sum: number, kpi: any) => {
                let kpiValue = parseFloat(String(kpi.value || kpi['Value'] || kpi.raw?.['Value'] || '0').replace(/,/g, '')) || 0
                
                if (kpiValue === 0) {
                  const quantity = parseFloat(String(kpi.quantity || kpi['Quantity'] || kpi.raw?.['Quantity'] || '0').replace(/,/g, '')) || 0
                  const rate = parseFloat(String(kpi.rate || kpi['Rate'] || kpi.raw?.['Rate'] || '0').replace(/,/g, '')) || 0
                  
                  if (rate === 0) {
                    const activityRate = activity.rate || 
                                      (activity.total_value && activity.planned_units && activity.planned_units > 0 
                                        ? activity.total_value / activity.planned_units 
                                        : 0) ||
                                      parseFloat(String(rawActivity['Rate'] || '0').replace(/,/g, '')) ||
                                      0
                    kpiValue = quantity * activityRate
                  } else {
                    kpiValue = quantity * rate
                  }
                }
                
                return sum + kpiValue
              }, 0)
          }
        }
        
        // ✅ Fallback: If no Planned KPIs found, use activity.planned_value or total_value
        if (plannedWorkValueAct === 0) {
          plannedWorkValueAct = activity.planned_value || activity.total_value || 0
        }
        
        // ✅ Get Done Value from Actual KPIs until yesterday only
        let workDoneValueAct = 0
        if (allKPIs.length > 0) {
          // Match KPIs to this activity (same logic as above)
          const activityKPIsDone = allKPIs.filter((kpi: any) => {
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
            
            // ✅ STRICT: Activity name must match (required for activity-specific matching)
            const activityMatch = kpiActivityName && activityName && 
              (kpiActivityName === activityName || 
               kpiActivityName.includes(activityName) || 
               activityName.includes(kpiActivityName))
            
            // ✅ Zone match is optional but helps with precision
            const zoneMatch = kpiZone && activityZone && 
              (kpiZone === activityZone || 
               kpiZone.includes(activityZone) || 
               activityZone.includes(kpiZone))
            
            // ✅ Require activity name match (not just zone) to ensure activity-specific matching
            // If zone is available, both should match for better precision
            if (activityZone && kpiZone) {
              return activityMatch && zoneMatch
            }
            
            // If no zone in activity, require activity name match
            return activityMatch
          })
          
          // Filter for Actual KPIs only
          const actualKPIsDone = activityKPIsDone.filter((kpi: any) => {
            const inputType = (kpi.input_type || kpi['Input Type'] || kpi.raw?.['Input Type'] || '').toLowerCase()
            return inputType === 'actual'
          })
          
          // ✅ Filter Actual KPIs until yesterday only and sum VALUES
          if (actualKPIsDone.length > 0) {
            workDoneValueAct = actualKPIsDone
              .filter((kpi: any) => {
                const kpiDateStr = kpi.actual_date || kpi.activity_date || kpi['Actual Date'] || kpi['Activity Date'] || kpi.raw?.['Actual Date'] || kpi.raw?.['Activity Date'] || ''
                if (!kpiDateStr) return true
                
                try {
                  const kpiDate = new Date(kpiDateStr)
                  if (isNaN(kpiDate.getTime())) return true
                  return kpiDate <= yesterdayWorkValue
                } catch {
                  return true
                }
              })
              .reduce((sum: number, kpi: any) => {
                let kpiValue = parseFloat(String(kpi.value || kpi['Value'] || kpi.raw?.['Value'] || '0').replace(/,/g, '')) || 0
                
                if (kpiValue === 0) {
                  const quantity = parseFloat(String(kpi.quantity || kpi['Quantity'] || kpi.raw?.['Quantity'] || '0').replace(/,/g, '')) || 0
                  const rate = parseFloat(String(kpi.rate || kpi['Rate'] || kpi.raw?.['Rate'] || '0').replace(/,/g, '')) || 0
                  
                  if (rate === 0) {
                    const activityRate = activity.rate || 
                                      (activity.total_value && activity.planned_units && activity.planned_units > 0 
                                        ? activity.total_value / activity.planned_units 
                                        : 0) ||
                                      parseFloat(String(rawActivity['Rate'] || '0').replace(/,/g, '')) ||
                                      0
                    kpiValue = quantity * activityRate
                  } else {
                    kpiValue = quantity * rate
                  }
                }
                
                return sum + kpiValue
              }, 0)
          }
        }
        
        const varianceWorkValueAct = workDoneValueAct - plannedWorkValueAct
        
        // ✅ DEBUG: Log calculation in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`💰 [BOQ] Work Value Status for "${activity.activity_name}":`, {
            plannedValue: plannedWorkValueAct,
            doneValue: workDoneValueAct,
            variance: varianceWorkValueAct
          })
        }
        
        return (
          <div className="space-y-1">
            <div className="text-xs text-gray-600 dark:text-gray-400">Planned: {formatCurrencyByCodeSync(plannedWorkValueAct, currencyCode)}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Done: {formatCurrencyByCodeSync(workDoneValueAct, currencyCode)}</div>
            <div className={`text-sm font-medium ${varianceWorkValueAct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              Variance: {varianceWorkValueAct >= 0 ? '+' : ''}{formatCurrencyByCodeSync(varianceWorkValueAct, currencyCode)}
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
      default:
        return getField(columnId) || ''
    }
  }

  // Sort activities
  const sortedActivities = useMemo(() => {
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
    </div>
  )
}