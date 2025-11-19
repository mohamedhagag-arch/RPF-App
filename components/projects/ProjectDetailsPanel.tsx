'use client'

import { useState, useEffect } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { useAuth } from '@/app/providers'
import { getSupabaseClient, executeQuery } from '@/lib/simpleConnectionManager'
import { useSmartLoading } from '@/lib/smartLoadingManager'
import { Project, BOQActivity, TABLES } from '@/lib/supabase'
import { mapBOQFromDB, mapKPIFromDB } from '@/lib/dataMappers'
import { calculateProjectAnalytics, ProjectAnalytics } from '@/lib/projectAnalytics'
import { calculateActualFromKPI, calculatePlannedFromKPI } from '@/lib/boqKpiSync'
import { calculateBOQValues, formatCurrency, formatPercentage, calculateProjectProgressFromValues } from '@/lib/boqValueCalculator'
import { calculateWorkValueStatus, calculateProgressFromWorkValue, calculateQuantityStatus } from '@/lib/workValueCalculator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Badge } from '@/components/ui/Badge'
import { IntelligentBOQForm } from '@/components/boq/IntelligentBOQForm'
import { EnhancedQuantitySummary } from '@/components/kpi/EnhancedQuantitySummary'
import { 
  X, 
  Activity, 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  CheckCircle, 
  Clock, 
  AlertTriangle,
  DollarSign,
  Calendar,
  Target,
  Zap,
  Award,
  Timer,
  AlertCircle
} from 'lucide-react'

interface ProjectDetailsPanelProps {
  project: Project
  onClose: () => void
}

export function ProjectDetailsPanel({ project, onClose }: ProjectDetailsPanelProps) {
  const guard = usePermissionGuard()
  const { user: authUser, appUser } = useAuth()
  const [analytics, setAnalytics] = useState<ProjectAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState<'overview' | 'activities' | 'kpis'>('overview')
  const [showActivityDetails, setShowActivityDetails] = useState<{[key: string]: boolean}>({})
  const [showKpiDetails, setShowKpiDetails] = useState<{[key: string]: boolean}>({})
  const [showBOQModal, setShowBOQModal] = useState(false)
  const [activityActuals, setActivityActuals] = useState<{[key: string]: number}>({})
  const [activityPlanneds, setActivityPlanneds] = useState<{[key: string]: number}>({})
  // ✅ Store Quantity Summary totals for each activity (from EnhancedQuantitySummary)
  const [quantitySummaryTotals, setQuantitySummaryTotals] = useState<{[key: string]: {totalPlanned: number, totalActual: number, remaining: number, progress: number}}>({})
  // ✅ Load project types and activity-project type mappings
  const [projectTypesMap, setProjectTypesMap] = useState<Map<string, { name: string; description?: string }>>(new Map())
  const [activityProjectTypesMap, setActivityProjectTypesMap] = useState<Map<string, string>>(new Map())
  
  // Copy Feedback
  const [copyFeedback, setCopyFeedback] = useState<{ type: 'latitude' | 'longitude' | null; message: string }>({ type: null, message: '' })
  
  // Copy to clipboard with feedback
  const handleCopyCoordinate = async (value: string, type: 'latitude' | 'longitude') => {
    console.log('🔄 Copying coordinate:', { value, type })
    
    try {
      await navigator.clipboard.writeText(value)
      console.log('✅ Copy successful')
      setCopyFeedback({ type, message: 'Copied successfully!' })
      
      // Clear feedback after 3 seconds
      setTimeout(() => {
        console.log('🧹 Clearing feedback')
        setCopyFeedback({ type: null, message: '' })
      }, 3000)
    } catch (error) {
      console.error('❌ Failed to copy:', error)
      setCopyFeedback({ type, message: 'Copy failed' })
      
      // Clear feedback after 3 seconds
      setTimeout(() => {
        setCopyFeedback({ type: null, message: '' })
      }, 3000)
    }
  }
  
  const supabase = getSupabaseClient()
  const { startSmartLoading, stopSmartLoading } = useSmartLoading('project-details')

  // ✅ Load project types and activity-project type mappings on mount
  useEffect(() => {
    const loadProjectTypes = async () => {
      try {
        console.log('🔄 Loading project types and activities from database...')
        
        // 1. Load project types from project_types table
        const { data: typesData, error: typesError } = await supabase
          .from('project_types')
          .select('name, description')
          .eq('is_active', true)
          .order('name', { ascending: true })
        
        if (typesError) {
          console.error('❌ Error loading project types:', typesError)
        } else {
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
        
        // 2. Load project_type_activities to map activity_name to project_type
        const { data: activitiesData, error: activitiesError } = await supabase
          .from('project_type_activities')
          .select('activity_name, project_type')
          .eq('is_active', true)
        
        if (activitiesError) {
          console.error('❌ Error loading project_type_activities:', activitiesError)
        } else {
          const activityTypesMap = new Map<string, string>()
          if (activitiesData && activitiesData.length > 0) {
            activitiesData.forEach((item: any) => {
              if (item.activity_name && item.project_type) {
                activityTypesMap.set(item.activity_name, item.project_type)
                // Also add lowercase version for case-insensitive matching
                activityTypesMap.set(item.activity_name.toLowerCase(), item.project_type)
              }
            })
          }
          setActivityProjectTypesMap(activityTypesMap)
          console.log(`✅ Loaded ${activityTypesMap.size} activity-project type mappings`)
        }
      } catch (error) {
        console.error('❌ Error loading project types data:', error)
      }
    }
    
    loadProjectTypes()
  }, [supabase])

  // ✅ FIX: Calculate BOTH Planned and Actual from KPI for each activity (filtered by Zone)
  useEffect(() => {
    if (!analytics?.activities || !analytics?.kpis) return

    const calculateUnits = async () => {
      const actuals: {[key: string]: number} = {}
      const planneds: {[key: string]: number} = {}
      
      for (const activity of analytics.activities) {
        try {
          // ✅ Helper: Normalize zone (remove project code prefix)
          // IMPORTANT: P5066-I2 means:
          // - P5066 = Project Code
          // - I2 = Sub Code (NOT Zone 2!)
          // - So Project Full Code = "P5066-I2"
          // - Zone = "1" (the part after Project Full Code)
          const normalizeZone = (zoneStr: string, projectFullCode: string, projectCode: string): string => {
            if (!zoneStr) return ''
            
            let normalized = zoneStr.trim()
            if (!normalized) return ''
            
            // ✅ FIRST: Try to remove Project Full Code (e.g., "P5066-I2 - 1" -> "1")
            if (projectFullCode) {
              const fullCodeUpper = projectFullCode.toUpperCase()
              const normalizedUpper = normalized.toUpperCase()
              
              // If zone starts with Project Full Code, remove it
              if (normalizedUpper.startsWith(fullCodeUpper)) {
                const afterFullCode = normalized.substring(projectFullCode.length).trim()
                // Remove leading dashes or spaces
                normalized = afterFullCode.replace(/^[\s-]+/, '').trim()
                if (normalized) {
                  return normalized.toLowerCase()
                }
              }
            }
            
            // ✅ SECOND: If Project Full Code didn't match, try Project Code only
            if (projectCode) {
              const codeUpper = projectCode.toUpperCase()
              
              // Remove project code prefix in various formats
              normalized = normalized.replace(new RegExp(`^${codeUpper}\\s*-\\s*`, 'i'), '').trim()
              normalized = normalized.replace(new RegExp(`^${codeUpper}\\s+`, 'i'), '').trim()
              normalized = normalized.replace(new RegExp(`^${codeUpper}-`, 'i'), '').trim()
            }
            
            // Clean up any remaining " - " or "- " at the start
            normalized = normalized.replace(/^\s*-\s*/, '').trim()
            
            return normalized.toLowerCase()
          }
          
          // ✅ Helper: Extract zone number (get ALL numbers, not just first)
          const extractZoneNumber = (zoneStr: string): string => {
            if (!zoneStr || zoneStr.trim() === '') return ''
            // Extract all numbers and join them (e.g., "12 - 1" -> "121", "12 - 2" -> "122")
            const numbers = zoneStr.match(/\d+/g)
            if (numbers && numbers.length > 0) {
              return numbers.join('') // Join all numbers to create unique identifier
            }
            return zoneStr.toLowerCase().trim()
          }
          
          // Get activity zone
          const activityZoneRaw = (activity.zone_ref || activity.zone_number || activity.activity_division || '').toString().trim()
          const projectCode = (activity.project_code || '').trim()
          
          // ✅ Use Project Full Code from activity (most accurate)
          const projectFullCode = (activity.project_full_code || activity.project_code || '').toString().trim()
          
          // Normalize activity zone (using Project Full Code first!)
          const activityZone = normalizeZone(activityZoneRaw, projectFullCode, projectCode)
          const activityZoneNum = extractZoneNumber(activityZone)
          
          // ✅ Filter KPIs by activity name AND zone using Project Full Code
          const activityKPIs = analytics.kpis.filter((kpi: any) => {
            const kpiProjectCode = (kpi.project_code || (kpi as any).raw?.['Project Code'] || '').toString().trim().toUpperCase()
            const kpiProjectFullCode = (kpi.project_full_code || (kpi as any).raw?.['Project Full Code'] || '').toString().trim().toUpperCase()
            const kpiActivityName = (kpi.activity_name || kpi['Activity Name'] || (kpi as any).raw?.['Activity Name'] || '').toLowerCase().trim()
            const kpiZoneRaw = (kpi.zone || kpi['Zone'] || kpi.section || (kpi as any).raw?.['Zone'] || (kpi as any).raw?.['Zone Number'] || '').toString().trim()
            const activityName = (activity.activity_name || activity.activity || '').toLowerCase().trim()
            
            // ✅ Match project by Project Full Code (priority) or Project Code
            const projectMatch = (
              (projectFullCode && kpiProjectFullCode && projectFullCode === kpiProjectFullCode) ||
              (projectCode && kpiProjectCode && projectCode.toUpperCase() === kpiProjectCode) ||
              (projectFullCode && kpiProjectCode && projectFullCode === kpiProjectCode) ||
              (projectCode && kpiProjectFullCode && projectCode.toUpperCase() === kpiProjectFullCode)
            )
            
            if (!projectMatch) return false
            
            // Match activity name
            const activityMatch = kpiActivityName === activityName ||
                                 kpiActivityName.includes(activityName) ||
                                 activityName.includes(kpiActivityName)
            
            if (!activityMatch) return false
            
            // ✅ Match zone using normalized zone and zone number (if activity has zone)
            // IMPORTANT: Use Project Full Code for zone normalization (not just Project Code)
            if (activityZone && activityZone.trim() !== '' && activityZone !== 'n/a') {
              // ✅ Use Project Full Code for KPI zone normalization (important for correct matching)
              const kpiZone = normalizeZone(kpiZoneRaw, kpiProjectFullCode || kpiProjectCode, kpiProjectCode)
              const kpiZoneNum = extractZoneNumber(kpiZone)
              
              // Match by zone number or normalized zone (multiple strategies)
              const zoneMatch = 
                // Strategy 1: Exact match (case-insensitive)
                (activityZoneRaw && kpiZoneRaw && activityZoneRaw.toLowerCase() === kpiZoneRaw.toLowerCase()) ||
                // Strategy 2: Normalized zone match
                (activityZone && kpiZone && activityZone === kpiZone) ||
                // Strategy 3: Zone number match
                (activityZoneNum && kpiZoneNum && activityZoneNum === kpiZoneNum) ||
                // Strategy 4: Original zone number match (before normalization)
                (extractZoneNumber(activityZoneRaw) && extractZoneNumber(kpiZoneRaw) && 
                 extractZoneNumber(activityZoneRaw) === extractZoneNumber(kpiZoneRaw))
              
              return zoneMatch
            }
            
            // If activity has no zone, include all KPIs for this activity
            return true
          })
          
          // Calculate Actual from filtered KPIs
          const actualKPIs = activityKPIs.filter((kpi: any) => {
            const inputType = String(kpi.input_type || kpi['Input Type'] || (kpi as any).raw?.['Input Type'] || '').trim().toLowerCase()
            return inputType === 'actual'
          })
          
          const actual = actualKPIs.reduce((sum: number, kpi: any) => {
            const qty = parseFloat(String(kpi.quantity || kpi['Quantity'] || (kpi as any).raw?.['Quantity'] || '0').replace(/,/g, '')) || 0
            return sum + qty
          }, 0)
          
          actuals[activity.id] = actual
          
          // ✅ Calculate Planned from filtered KPIs
          const plannedKPIs = activityKPIs.filter((kpi: any) => {
            const inputType = String(kpi.input_type || kpi['Input Type'] || (kpi as any).raw?.['Input Type'] || '').trim().toLowerCase()
            return inputType === 'planned'
          })
          
          const planned = plannedKPIs.reduce((sum: number, kpi: any) => {
            const qty = parseFloat(String(kpi.quantity || kpi['Quantity'] || (kpi as any).raw?.['Quantity'] || '0').replace(/,/g, '')) || 0
            return sum + qty
          }, 0)
          
          planneds[activity.id] = planned
        } catch (error) {
          // Silently fail
          actuals[activity.id] = activity.actual_units || 0
          planneds[activity.id] = activity.planned_units || 0
        }
      }
      
      setActivityActuals(actuals)
      setActivityPlanneds(planneds)
    }

    calculateUnits()
  }, [analytics?.activities, analytics?.kpis])

  // ✅ Helper function to get KPIs filtered by activity AND zone
  const getActivityKPIsByZone = (activity: any) => {
    if (!analytics?.kpis) return []
    
    // ✅ Helper: Normalize zone (remove project code prefix)
    // IMPORTANT: P5066-I2 means:
    // - P5066 = Project Code
    // - I2 = Sub Code (NOT Zone 2!)
    // - So Project Full Code = "P5066-I2"
    // - Zone = "1" (the part after Project Full Code)
    const normalizeZone = (zoneStr: string, projectFullCode: string, projectCode: string): string => {
      if (!zoneStr) return ''
      
      let normalized = zoneStr.trim()
      if (!normalized) return ''
      
      // ✅ FIRST: Try to remove Project Full Code (e.g., "P5066-I2 - 1" -> "1")
      if (projectFullCode) {
        const fullCodeUpper = projectFullCode.toUpperCase()
        const normalizedUpper = normalized.toUpperCase()
        
        // If zone starts with Project Full Code, remove it
        if (normalizedUpper.startsWith(fullCodeUpper)) {
          const afterFullCode = normalized.substring(projectFullCode.length).trim()
          // Remove leading dashes or spaces
          normalized = afterFullCode.replace(/^[\s-]+/, '').trim()
          if (normalized) {
            return normalized.toLowerCase()
          }
        }
      }
      
      // ✅ SECOND: If Project Full Code didn't match, try Project Code only
      if (projectCode) {
        const codeUpper = projectCode.toUpperCase()
        
        // Remove project code prefix in various formats
        normalized = normalized.replace(new RegExp(`^${codeUpper}\\s*-\\s*`, 'i'), '').trim()
        normalized = normalized.replace(new RegExp(`^${codeUpper}\\s+`, 'i'), '').trim()
        normalized = normalized.replace(new RegExp(`^${codeUpper}-`, 'i'), '').trim()
      }
      
      // Clean up any remaining " - " or "- " at the start
      normalized = normalized.replace(/^\s*-\s*/, '').trim()
      
      return normalized.toLowerCase()
    }
    
    // ✅ Helper: Extract zone number (get ALL numbers, not just first)
    const extractZoneNumber = (zoneStr: string): string => {
      if (!zoneStr || zoneStr.trim() === '') return ''
      // Extract all numbers and join them (e.g., "12 - 1" -> "121", "12 - 2" -> "122")
      const numbers = zoneStr.match(/\d+/g)
      if (numbers && numbers.length > 0) {
        return numbers.join('') // Join all numbers to create unique identifier
      }
      return zoneStr.toLowerCase().trim()
    }
    
    // Get activity zone
    const activityZoneRaw = (activity.zone_ref || activity.zone_number || activity.activity_division || '').toString().trim()
    const projectCode = (activity.project_code || '').trim()
    
    // ✅ Use Project Full Code from activity (most accurate)
    const projectFullCode = (activity.project_full_code || activity.project_code || '').toString().trim()
    
    // Normalize activity zone (using Project Full Code first!)
    const activityZone = normalizeZone(activityZoneRaw, projectFullCode, projectCode)
    const activityZoneNum = extractZoneNumber(activityZone)
    
    const activityName = (activity.activity_name || activity.activity || '').toLowerCase().trim()
    
    // ✅ Filter KPIs by activity name AND zone using Project Full Code
    return analytics.kpis.filter((kpi: any) => {
      const kpiProjectCode = (kpi.project_code || (kpi as any).raw?.['Project Code'] || '').toString().trim().toUpperCase()
      const kpiProjectFullCode = (kpi.project_full_code || (kpi as any).raw?.['Project Full Code'] || '').toString().trim().toUpperCase()
      const kpiActivityName = (kpi.activity_name || kpi['Activity Name'] || (kpi as any).raw?.['Activity Name'] || '').toLowerCase().trim()
      const kpiZoneRaw = (kpi.zone || kpi['Zone'] || kpi.section || (kpi as any).raw?.['Zone'] || (kpi as any).raw?.['Zone Number'] || '').toString().trim()
      
      // ✅ Match project by Project Full Code (priority) or Project Code
      const projectMatch = (
        (projectFullCode && kpiProjectFullCode && projectFullCode === kpiProjectFullCode) ||
        (projectCode && kpiProjectCode && projectCode.toUpperCase() === kpiProjectCode) ||
        (projectFullCode && kpiProjectCode && projectFullCode === kpiProjectCode) ||
        (projectCode && kpiProjectFullCode && projectCode.toUpperCase() === kpiProjectFullCode)
      )
      
      if (!projectMatch) return false
      
      // Match activity name
      const activityMatch = kpiActivityName === activityName ||
                           kpiActivityName.includes(activityName) ||
                           activityName.includes(kpiActivityName)
      
      if (!activityMatch) return false
      
      // ✅ Match zone using normalized zone and zone number (if activity has zone)
      // IMPORTANT: Use Project Full Code for zone normalization (not just Project Code)
      if (activityZone && activityZone.trim() !== '' && activityZone !== 'n/a') {
        // ✅ Use Project Full Code for KPI zone normalization (important for correct matching)
        const kpiZone = normalizeZone(kpiZoneRaw, kpiProjectFullCode || kpiProjectCode, kpiProjectCode)
        const kpiZoneNum = extractZoneNumber(kpiZone)
        
        // Match by zone number or normalized zone (multiple strategies)
        const zoneMatch = 
          // Strategy 1: Exact match (case-insensitive)
          (activityZoneRaw && kpiZoneRaw && activityZoneRaw.toLowerCase() === kpiZoneRaw.toLowerCase()) ||
          // Strategy 2: Normalized zone match
          (activityZone && kpiZone && activityZone === kpiZone) ||
          // Strategy 3: Zone number match
          (activityZoneNum && kpiZoneNum && activityZoneNum === kpiZoneNum) ||
          // Strategy 4: Original zone number match (before normalization)
          (extractZoneNumber(activityZoneRaw) && extractZoneNumber(kpiZoneRaw) && 
           extractZoneNumber(activityZoneRaw) === extractZoneNumber(kpiZoneRaw))
        
        return zoneMatch
      }
      
      // If activity has no zone, include all KPIs for this activity
      return true
    })
  }

  // ✅ Calculate Duration from KPI Planned data (filtered by Zone)
  const calculateActivityDuration = (activity: any) => {
    // Get KPIs filtered by Zone
    const activityKPIs = getActivityKPIsByZone(activity)
    
    // Filter for Planned KPIs only
    const plannedKPIs = activityKPIs.filter((kpi: any) => {
      const inputType = String(kpi.input_type || kpi['Input Type'] || (kpi as any).raw?.['Input Type'] || '').trim().toLowerCase()
      return inputType === 'planned'
    })
    
    if (plannedKPIs.length > 0) {
      // Get all dates from Planned KPIs
      const dates = plannedKPIs
        .map((kpi: any) => {
          const rawKpi = (kpi as any).raw || {}
          const dateStr = rawKpi['Activity Date'] || rawKpi.activity_date || 
                         kpi.activity_date || kpi['Activity Date'] ||
                         rawKpi['Target Date'] || rawKpi.target_date ||
                         kpi.target_date || kpi['Target Date'] ||
                         rawKpi['Day'] || rawKpi.day ||
                         kpi.day || kpi['Day'] ||
                         ''
          
          if (!dateStr) return null
          
          try {
            const date = new Date(dateStr)
            return isNaN(date.getTime()) ? null : date
          } catch {
            return null
          }
        })
        .filter((d): d is Date => d !== null)
        .sort((a, b) => a.getTime() - b.getTime())
      
      if (dates.length > 0) {
        // Duration = difference between first and last Planned KPI date
        const startDate = dates[0]
        const endDate = dates[dates.length - 1]
        const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        return duration > 0 ? duration : activity.calendar_duration || 0
      }
      
      // Fallback: Number of Planned KPI records
      return plannedKPIs.length || activity.calendar_duration || 0
    }
    
    return activity.calendar_duration || 0
  }

  // ✅ Calculate Start Date from first planned KPI for the activity (filtered by Zone)
  const calculateActivityStartDate = (activity: any) => {
    // Get KPIs filtered by Zone
    const activityKPIs = getActivityKPIsByZone(activity)
    
    // Filter for Planned KPIs only
    const plannedKPIs = activityKPIs.filter((kpi: any) => {
      const inputType = String(kpi.input_type || kpi['Input Type'] || (kpi as any).raw?.['Input Type'] || '').trim().toLowerCase()
      return inputType === 'planned'
    })
    
    if (plannedKPIs.length > 0) {
      // Get all dates from Planned KPIs and sort
      const dates = plannedKPIs
        .map((kpi: any) => {
          const rawKpi = (kpi as any).raw || {}
          const dateStr = rawKpi['Activity Date'] || rawKpi.activity_date || 
                         kpi.activity_date || kpi['Activity Date'] ||
                         rawKpi['Target Date'] || rawKpi.target_date ||
                         kpi.target_date || kpi['Target Date'] ||
                         rawKpi['Day'] || rawKpi.day ||
                         kpi.day || kpi['Day'] ||
                         ''
          
          if (!dateStr) return null
          
          try {
            const date = new Date(dateStr)
            return isNaN(date.getTime()) ? null : { date, dateStr }
          } catch {
            return null
          }
        })
        .filter((item): item is { date: Date, dateStr: string } => item !== null)
        .sort((a, b) => a.date.getTime() - b.date.getTime())
      
      if (dates.length > 0) {
        // Return first Planned KPI date (earliest date for this Zone)
        return dates[0].dateStr
      }
    }
    
    // Fallback: Use activity start date
    if (activity.planned_activity_start_date) {
      return activity.planned_activity_start_date
    }
    
    return null
  }

  // ✅ Calculate End Date from last planned KPI for the activity (filtered by Zone)
  const calculateActivityEndDate = (activity: any) => {
    // Get KPIs filtered by Zone
    const activityKPIs = getActivityKPIsByZone(activity)
    
    // Filter for Planned KPIs only
    const plannedKPIs = activityKPIs.filter((kpi: any) => {
      const inputType = String(kpi.input_type || kpi['Input Type'] || (kpi as any).raw?.['Input Type'] || '').trim().toLowerCase()
      return inputType === 'planned'
    })
    
    if (plannedKPIs.length > 0) {
      // Get all dates from Planned KPIs and sort
      const dates = plannedKPIs
        .map((kpi: any) => {
          const rawKpi = (kpi as any).raw || {}
          const dateStr = rawKpi['Activity Date'] || rawKpi.activity_date || 
                         kpi.activity_date || kpi['Activity Date'] ||
                         rawKpi['Target Date'] || rawKpi.target_date ||
                         kpi.target_date || kpi['Target Date'] ||
                         rawKpi['Day'] || rawKpi.day ||
                         kpi.day || kpi['Day'] ||
                         ''
          
          if (!dateStr) return null
          
          try {
            const date = new Date(dateStr)
            return isNaN(date.getTime()) ? null : { date, dateStr }
          } catch {
            return null
          }
        })
        .filter((item): item is { date: Date, dateStr: string } => item !== null)
        .sort((a, b) => a.date.getTime() - b.date.getTime())
      
      if (dates.length > 0) {
        // Return last Planned KPI date (latest date for this Zone)
        return dates[dates.length - 1].dateStr
      }
    }
    
    // Fallback: Use activity deadline
    if (activity.deadline) {
      return activity.deadline
    }
    
    return null
  }

  // ✅ Calculate Activity Status automatically based on dates and progress (filtered by Zone)
  // Enhanced with more detailed and descriptive statuses
  const calculateActivityStatus = (activity: any): {
    status: 'not_started' | 'starting_soon' | 'in_progress' | 'on_track' | 'at_risk' | 'delayed' | 'behind_schedule' | 'completed_early' | 'completed_on_time' | 'completed_late' | 'completed'
    label: string
    color: string
    bgColor: string
    description?: string
  } => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Get Start Date and End Date (filtered by Zone)
    const startDateStr = calculateActivityStartDate(activity)
    const endDateStr = calculateActivityEndDate(activity)
    
    // Get Planned and Actual Units (filtered by Zone)
    const plannedUnits = activityPlanneds[activity.id] !== undefined 
      ? activityPlanneds[activity.id] 
      : activity.planned_units || 0
    const actualUnits = activityActuals[activity.id] !== undefined 
      ? activityActuals[activity.id] 
      : activity.actual_units || 0
    
    // Parse dates
    let startDate: Date | null = null
    let endDate: Date | null = null
    
    if (startDateStr) {
      try {
        startDate = new Date(startDateStr)
        startDate.setHours(0, 0, 0, 0)
      } catch {
        startDate = null
      }
    }
    
    if (endDateStr) {
      try {
        endDate = new Date(endDateStr)
        endDate.setHours(0, 0, 0, 0)
      } catch {
        endDate = null
      }
    }
    
    // Fallback to activity dates if KPI dates not available
    if (!startDate && activity.planned_activity_start_date) {
      try {
        startDate = new Date(activity.planned_activity_start_date)
        startDate.setHours(0, 0, 0, 0)
      } catch {
        startDate = null
      }
    }
    
    if (!endDate && activity.deadline) {
      try {
        endDate = new Date(activity.deadline)
        endDate.setHours(0, 0, 0, 0)
      } catch {
        endDate = null
      }
    }
    
    // Check if activity is completed (Actual >= Planned)
    const isCompleted = plannedUnits > 0 && actualUnits >= plannedUnits
    const completionPercentage = plannedUnits > 0 ? (actualUnits / plannedUnits) * 100 : 0
    
    // ========== COMPLETED STATUSES ==========
    if (isCompleted) {
      if (endDate && today < endDate) {
        // Completed early (before end date)
        const daysEarly = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        return {
          status: 'completed_early',
          label: 'Completed Early',
          color: 'text-emerald-800',
          bgColor: 'bg-emerald-100',
          description: `${daysEarly} day${daysEarly !== 1 ? 's' : ''} ahead of schedule`
        }
      } else if (endDate && today.getTime() === endDate.getTime()) {
        // Completed exactly on time (on end date)
        return {
          status: 'completed_on_time',
          label: 'Completed On Time',
          color: 'text-green-800',
          bgColor: 'bg-green-100',
          description: 'Finished exactly as planned'
        }
      } else if (endDate && today > endDate) {
        // Completed late (after end date)
        const daysLate = Math.ceil((today.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24))
        return {
          status: 'completed_late',
          label: 'Completed Late',
          color: 'text-amber-800',
          bgColor: 'bg-amber-100',
          description: `${daysLate} day${daysLate !== 1 ? 's' : ''} after deadline`
        }
      } else {
        // Completed (no end date available)
        return {
          status: 'completed',
          label: 'Completed',
          color: 'text-green-800',
          bgColor: 'bg-green-100',
          description: `${completionPercentage.toFixed(1)}% completed`
        }
      }
    }
    
    // ========== NOT STARTED STATUSES ==========
    if (startDate && today < startDate) {
      const daysUntilStart = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysUntilStart <= 7) {
        // Starting soon (within 7 days)
        return {
          status: 'starting_soon',
          label: 'Starting Soon',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          description: `Starts in ${daysUntilStart} day${daysUntilStart !== 1 ? 's' : ''}`
        }
      } else {
        // Not started yet (more than 7 days away)
        return {
          status: 'not_started',
          label: 'Not Started',
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          description: `Starts in ${daysUntilStart} day${daysUntilStart !== 1 ? 's' : ''}`
        }
      }
    }
    
    // ========== IN PROGRESS STATUSES ==========
    if (startDate && today >= startDate) {
      // Calculate progress metrics
      let totalDuration = 0
      let daysElapsed = 0
      let expectedProgress = 0
      let actualProgress = completionPercentage
      
      if (startDate && endDate) {
        totalDuration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        daysElapsed = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        expectedProgress = totalDuration > 0 ? (daysElapsed / totalDuration) * 100 : 0
      }
      
      // Check if significantly behind schedule
      const progressGap = expectedProgress - actualProgress
      
      // If today is past end date and not completed
      if (endDate && today > endDate) {
        const daysOverdue = Math.ceil((today.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24))
        return {
          status: 'behind_schedule',
          label: 'Behind Schedule',
          color: 'text-red-800',
          bgColor: 'bg-red-100',
          description: `${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue, ${actualProgress.toFixed(1)}% done`
        }
      }
      
      // If significantly behind expected progress (more than 15% gap)
      if (progressGap > 15) {
        return {
          status: 'delayed',
          label: 'Delayed',
          color: 'text-red-700',
          bgColor: 'bg-red-50',
          description: `${progressGap.toFixed(1)}% behind expected progress`
        }
      }
      
      // If slightly behind expected progress (5-15% gap) - At Risk
      if (progressGap > 5 && progressGap <= 15) {
        return {
          status: 'at_risk',
          label: 'At Risk',
          color: 'text-orange-700',
          bgColor: 'bg-orange-50',
          description: `${progressGap.toFixed(1)}% behind, needs attention`
        }
      }
      
      // If on track or ahead of schedule
      if (actualProgress >= expectedProgress - 5) {
        // Check if ahead of schedule
        if (actualProgress > expectedProgress + 5) {
          return {
            status: 'on_track',
            label: 'Ahead of Schedule',
            color: 'text-blue-800',
            bgColor: 'bg-blue-100',
            description: `${(actualProgress - expectedProgress).toFixed(1)}% ahead of expected`
          }
        } else {
          // On track
          return {
            status: 'on_track',
            label: 'On Track',
            color: 'text-blue-800',
            bgColor: 'bg-blue-100',
            description: `${actualProgress.toFixed(1)}% completed, progressing as planned`
          }
        }
      }
      
      // Default: In Progress
      return {
        status: 'in_progress',
        label: 'In Progress',
        color: 'text-indigo-800',
        bgColor: 'bg-indigo-100',
        description: `${actualProgress.toFixed(1)}% completed`
      }
    }
    
    // ========== DEFAULT STATUS ==========
    // If we can't determine status (no dates available)
    if (actualUnits > 0) {
      return {
        status: 'in_progress',
        label: 'In Progress',
        color: 'text-indigo-800',
        bgColor: 'bg-indigo-100',
        description: `${completionPercentage.toFixed(1)}% completed`
      }
    }
    
    return {
      status: 'not_started',
      label: 'Not Started',
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      description: 'No progress data available'
    }
  }

  // Toggle activity details
  const toggleActivityDetails = (activityId: string) => {
    setShowActivityDetails(prev => ({
      ...prev,
      [activityId]: !prev[activityId]
    }))
  }

  // Toggle KPI details
  const toggleKpiDetails = (kpiId: string) => {
    setShowKpiDetails(prev => ({
      ...prev,
      [kpiId]: !prev[kpiId]
    }))
  }

  // Handle BOQ form submission
  const handleBOQSubmit = async (data: any) => {
    try {
      console.log('💾 ProjectDetailsPanel: Saving BOQ activity to database...', data)
      
      // Map to database format
      const dbData = {
        'Project Code': data.project_code || '',
        'Project Sub Code': data.project_sub_code || '',
        'Project Full Code': data.project_full_code || data.project_code || '',
        'Activity': data.activity_name || '',
        'Activity Division': data.activity_division || data.zone_ref || '',
        'Unit': data.unit || '',
        'Zone Ref': data.zone_ref || data.activity_division || '',
        'Activity Name': data.activity_name || '',
        'Planned Units': data.planned_units?.toString() || '0',
        'Deadline': data.deadline || '',
        'Total Units': data.total_units?.toString() || '0',
        'Actual Units': data.actual_units?.toString() || '0',
        'Total Value': data.planned_value?.toString() || '0',
        'Planned Value': data.planned_value?.toString() || '0',
        'Planned Activity Start Date': data.planned_activity_start_date || '',
        'Total Drilling Meters': data.total_drilling_meters?.toString() || '0',
        'Calendar Duration': data.calendar_duration?.toString() || '0',
        'Project Full Name': data.project_full_name || '',
        'Project Status': data.project_status || 'upcoming',
        // ✅ SET CREATED BY: Add user who created the BOQ activity
        'created_by': appUser?.email || authUser?.email || guard.user?.email || authUser?.id || appUser?.id || guard.user?.id || 'System'
      }
      
      console.log('📦 Database format:', dbData)
      console.log('✅ Setting created_by for BOQ activity:', dbData['created_by'])
      
      // Insert into BOQ Rates table
      const { data: inserted, error } = await (supabase as any)
        .from('Planning Database - BOQ Rates')
        .insert(dbData)
        .select()
        .single()
      
      if (error) {
        console.error('❌ Error saving BOQ activity:', error)
        throw error
      }
      
      console.log('✅ BOQ activity saved successfully:', inserted)
      
      // Close modal and refresh
      setShowBOQModal(false)
      
      // Refresh analytics to show new activity
      await fetchProjectAnalytics()
      
      console.log('✅ ProjectDetailsPanel: BOQ activity added and analytics refreshed')
    } catch (error) {
      console.error('❌ Error handling BOQ submission:', error)
      throw error
    }
  }
  
  useEffect(() => {
    fetchProjectAnalytics()
  }, [project])
  
  const fetchProjectAnalytics = async () => {
    try {
      startSmartLoading(setLoading)
      
      console.log(`📊 Fetching analytics for project: ${project.project_code} (${project.project_name})`)
      
      // ✅ FIX: Build project_full_code correctly
      const projectCode = (project.project_code || '').trim()
      const projectSubCode = (project.project_sub_code || '').trim()
      
      let projectFullCode = projectCode
      if (projectSubCode) {
        // Check if sub_code already starts with project_code (case-insensitive)
        if (projectSubCode.toUpperCase().startsWith(projectCode.toUpperCase())) {
          projectFullCode = projectSubCode
        } else {
          if (projectSubCode.startsWith('-')) {
            projectFullCode = `${projectCode}${projectSubCode}`
          } else {
            projectFullCode = `${projectCode}-${projectSubCode}`
          }
        }
      }
      
      console.log(`🔍 Fetching ALL activities for project: ${projectCode} (Full: ${projectFullCode})`)
      console.log(`📋 Using comprehensive matching strategy with project_full_code`)
      
      // ✅ Strategy 1: Match by exact Project Full Code (PRIMARY - most accurate)
      const { data: activitiesByFullCodeExact, error: error1 } = await executeQuery(async () =>
        supabase
          .from(TABLES.BOQ_ACTIVITIES)
          .select('*')
          .eq('Project Full Code', projectFullCode)
      )
      
      console.log(`🔍 Strategy 1 (Project Full Code): Found ${activitiesByFullCodeExact?.length || 0} activities`)
      
      // ✅ Strategy 2: If no results by Project Full Code, try Project Code + Project Sub Code
      let activitiesByCodeAndSubCode: any[] = []
      let error4: any = null
      if ((!activitiesByFullCodeExact || (Array.isArray(activitiesByFullCodeExact) && activitiesByFullCodeExact.length === 0)) && projectSubCode) {
        console.log(`🔍 Strategy 2: Trying Project Code (${projectCode}) + Project Sub Code (${projectSubCode})`)
        
        // Extract sub_code suffix (e.g., "P10001-01" -> "01", or "01" -> "01")
        let subCodeSuffix = projectSubCode
        if (projectSubCode.toUpperCase().startsWith(projectCode.toUpperCase())) {
          // Sub code contains project code (e.g., "P10001-01"), extract suffix
          subCodeSuffix = projectSubCode.substring(projectCode.length).replace(/^-+/, '')
        }
        
        console.log(`🔍 Strategy 2: Extracted sub_code suffix: "${subCodeSuffix}"`)
        
        // Try exact match on Project Sub Code (could be "01" or "P10001-01")
        let result = await executeQuery(async () =>
          supabase
            .from(TABLES.BOQ_ACTIVITIES)
            .select('*')
            .eq('Project Code', projectCode)
            .eq('Project Sub Code', projectSubCode)
        )
        activitiesByCodeAndSubCode = result.data || []
        error4 = result.error
        
        // If no results, try with sub_code suffix only (e.g., "01")
        if (activitiesByCodeAndSubCode.length === 0 && subCodeSuffix && subCodeSuffix !== projectSubCode) {
          console.log(`🔍 Strategy 2b: Trying Project Sub Code suffix only (${subCodeSuffix})`)
          result = await executeQuery(async () =>
            supabase
              .from(TABLES.BOQ_ACTIVITIES)
              .select('*')
              .eq('Project Code', projectCode)
              .eq('Project Sub Code', subCodeSuffix)
          )
          if (result.data && Array.isArray(result.data) && result.data.length > 0) {
            activitiesByCodeAndSubCode = result.data
            error4 = result.error
          }
        }
        
        // If no results, try where Project Sub Code contains the full code (e.g., "P10001-01")
        if (activitiesByCodeAndSubCode.length === 0 && projectFullCode && projectFullCode !== projectSubCode) {
          console.log(`🔍 Strategy 2c: Trying Project Sub Code that contains full code (${projectFullCode})`)
          result = await executeQuery(async () =>
            supabase
              .from(TABLES.BOQ_ACTIVITIES)
              .select('*')
              .eq('Project Code', projectCode)
              .eq('Project Sub Code', projectFullCode)
          )
          if (result.data && Array.isArray(result.data) && result.data.length > 0) {
            activitiesByCodeAndSubCode = result.data
            error4 = result.error
          }
        }
        
        console.log(`🔍 Strategy 2 (Project Code + Sub Code): Found ${activitiesByCodeAndSubCode.length} activities`)
      }
      
      // ✅ Strategy 3: Match where Project Full Code starts with our project_full_code (for sub-projects)
      // Only if project has sub_code (to avoid matching other projects)
      const { data: activitiesByFullCodeStart, error: error3 } = projectSubCode ? await executeQuery(async () =>
        supabase
          .from(TABLES.BOQ_ACTIVITIES)
          .select('*')
          .like('Project Full Code', `${projectFullCode}%`)
      ) : { data: null, error: null }
      
      // ✅ Strategy 4: Fallback to Project Code ONLY if project has no sub_code (to avoid mixing projects)
      // This prevents fetching activities from other projects with same project_code but different sub_code
      const { data: activitiesByCode, error: error2 } = !projectSubCode ? await executeQuery(async () =>
        supabase
          .from(TABLES.BOQ_ACTIVITIES)
          .select('*')
          .eq('Project Code', projectCode)
          .or('Project Full Code.is.null,Project Full Code.eq.')
      ) : { data: null, error: null }
      
      // Merge results (only include strategies that were executed)
      const allActivitiesData = [
        ...(Array.isArray(activitiesByFullCodeExact) ? activitiesByFullCodeExact : []),
        ...(Array.isArray(activitiesByCodeAndSubCode) ? activitiesByCodeAndSubCode : []),
        ...(Array.isArray(activitiesByFullCodeStart) ? activitiesByFullCodeStart : []),
        ...(Array.isArray(activitiesByCode) ? activitiesByCode : [])
      ].filter(Boolean) // Remove any null/undefined entries
      
      // Remove duplicates based on id (primary key)
      const uniqueActivitiesData = Array.from(
        new Map(allActivitiesData.map((item: any) => [item.id, item])).values()
      )
      
      // ✅ FIX: Strict client-side filtering using project_full_code ONLY
      // This ensures we only get activities for THIS specific project (not other projects with same project_code)
      const filteredActivities = uniqueActivitiesData.filter((item: any) => {
        const itemProjectFullCode = (item['Project Full Code'] || '').toString().trim()
        const itemProjectCode = (item['Project Code'] || '').toString().trim()
        const itemProjectSubCode = (item['Project Sub Code'] || '').toString().trim()
        
        // ✅ PRIORITY 1: Exact match on project_full_code (MOST ACCURATE)
        if (itemProjectFullCode === projectFullCode) {
          return true
        }
        
        // ✅ PRIORITY 2: Build full code from item and match
        if (itemProjectCode && itemProjectSubCode) {
          let itemFullCode = itemProjectCode
          if (itemProjectSubCode) {
            if (itemProjectSubCode.toUpperCase().startsWith(itemProjectCode.toUpperCase())) {
              itemFullCode = itemProjectSubCode
            } else {
              if (itemProjectSubCode.startsWith('-')) {
                itemFullCode = `${itemProjectCode}${itemProjectSubCode}`
              } else {
                itemFullCode = `${itemProjectCode}-${itemProjectSubCode}`
              }
            }
          }
          if (itemFullCode === projectFullCode) {
            return true
          }
        }
        
        // ✅ PRIORITY 3: Match where Project Full Code starts with our project_full_code (for sub-projects)
        // Only if projectFullCode is not empty
        if (projectFullCode && itemProjectFullCode.startsWith(projectFullCode)) {
          return true
        }
        
        // ❌ DO NOT match by project_code alone - this would include other projects with same code!
        // Only match if project_full_code is not available (old data fallback)
        if (!itemProjectFullCode && itemProjectCode === projectCode && !projectSubCode) {
          // Only allow this if current project has no sub_code (to avoid mixing projects)
          return true
        }
        
        return false
      })
      
      const activitiesData = filteredActivities
      const activitiesError = error1 || error2 || error3 || error4
      
      console.log(`📊 Comprehensive fetch results for ${projectFullCode}:`, {
        byFullCodeExact: activitiesByFullCodeExact?.length || 0,
        byFullCodeStart: activitiesByFullCodeStart?.length || 0,
        byCode: activitiesByCode?.length || 0,
        totalBeforeDedup: allActivitiesData.length,
        uniqueAfterDedup: uniqueActivitiesData.length,
        finalAfterFilter: filteredActivities.length,
        projectFullCode,
        projectCode,
        projectSubCode
      })
      
      if (filteredActivities.length === 0) {
        console.warn(`⚠️ NO ACTIVITIES FOUND for project ${projectCode} after comprehensive search!`)
        console.log(`💡 This might indicate a data issue. Check database for entries with Project Code or Project Full Code matching: ${projectCode}`)
      } else {
        console.log(`✅ Successfully found ${filteredActivities.length} activities for project ${projectCode}`)
      }
      
      if (activitiesError) {
        console.error('❌ Error fetching activities:', activitiesError)
      }
      
      // ✅ FIX: Fetch KPIs using project_full_code ONLY (strict matching)
      // Strategy 1: Exact match on Project Full Code (PRIMARY - most accurate)
      let { data: kpisData, error: kpisError } = await executeQuery(async () =>
        supabase
          .from(TABLES.KPI)
          .select('*')
          .eq('Project Full Code', projectFullCode)
      )
      
      console.log(`🔍 KPI Strategy 1 (Project Full Code): Found ${kpisData?.length || 0} KPIs`)
      
      // Strategy 2: If no results by Project Full Code, try Project Code + Project Sub Code
      if ((!kpisData || (Array.isArray(kpisData) && kpisData.length === 0)) && projectSubCode) {
        console.log(`🔍 KPI Strategy 2: Trying Project Code (${projectCode}) + Project Sub Code (${projectSubCode})`)
        
        // Extract sub_code suffix (e.g., "P10001-01" -> "01", or "01" -> "01")
        let subCodeSuffix = projectSubCode
        if (projectSubCode.toUpperCase().startsWith(projectCode.toUpperCase())) {
          // Sub code contains project code (e.g., "P10001-01"), extract suffix
          subCodeSuffix = projectSubCode.substring(projectCode.length).replace(/^-+/, '')
        }
        
        console.log(`🔍 KPI Strategy 2: Extracted sub_code suffix: "${subCodeSuffix}"`)
        
        // Try exact match on Project Sub Code (could be "01" or "P10001-01")
        let result = await executeQuery(async () =>
          supabase
            .from(TABLES.KPI)
            .select('*')
            .eq('Project Code', projectCode)
            .eq('Project Sub Code', projectSubCode)
        )
        if (result.data && Array.isArray(result.data) && result.data.length > 0) {
          kpisData = result.data
          kpisError = result.error
        }
        
        // If no results, try with sub_code suffix only (e.g., "01")
        if ((!kpisData || (Array.isArray(kpisData) && kpisData.length === 0)) && subCodeSuffix && subCodeSuffix !== projectSubCode) {
          console.log(`🔍 KPI Strategy 2b: Trying Project Sub Code suffix only (${subCodeSuffix})`)
          result = await executeQuery(async () =>
            supabase
              .from(TABLES.KPI)
              .select('*')
              .eq('Project Code', projectCode)
              .eq('Project Sub Code', subCodeSuffix)
          )
          if (result.data && Array.isArray(result.data) && result.data.length > 0) {
            kpisData = result.data
            kpisError = result.error
          }
        }
        
        // If no results, try where Project Sub Code contains the full code (e.g., "P10001-01")
        if ((!kpisData || (Array.isArray(kpisData) && kpisData.length === 0)) && projectFullCode && projectFullCode !== projectSubCode) {
          console.log(`🔍 KPI Strategy 2c: Trying Project Sub Code that contains full code (${projectFullCode})`)
          result = await executeQuery(async () =>
            supabase
              .from(TABLES.KPI)
              .select('*')
              .eq('Project Code', projectCode)
              .eq('Project Sub Code', projectFullCode)
          )
          if (result.data && Array.isArray(result.data) && result.data.length > 0) {
            kpisData = result.data
            kpisError = result.error
          }
        }
      }
      
      // Strategy 3: Match where Project Full Code starts with our project_full_code (for sub-projects)
      if (!kpisData || (Array.isArray(kpisData) && kpisData.length === 0)) {
        console.log(`🔄 KPI Strategy 3: No KPIs found with exact Project Full Code match, trying starts with...`)
        const result = await executeQuery(async () =>
          supabase
            .from(TABLES.KPI)
            .select('*')
            .like('Project Full Code', `${projectFullCode}%`)
        )
        if (result.data && Array.isArray(result.data) && result.data.length > 0) {
        kpisData = result.data
        kpisError = result.error
        }
      }
      
      // Strategy 4: Fallback to Project Code ONLY if project has no sub_code (to avoid mixing projects)
      if ((!kpisData || (Array.isArray(kpisData) && kpisData.length === 0)) && !projectSubCode) {
        console.log('🔄 KPI Strategy 4: No KPIs found with Project Full Code, trying Project Code only (no sub_code)...')
        const result = await executeQuery(async () =>
          supabase
            .from(TABLES.KPI)
            .select('*')
            .eq('Project Code', projectCode)
        )
        if (result.data && Array.isArray(result.data) && result.data.length > 0) {
        kpisData = result.data
        kpisError = result.error
        }
      }
      
      // ✅ Additional client-side filtering for KPIs to ensure strict matching
      if (kpisData && Array.isArray(kpisData) && kpisData.length > 0) {
        const filteredKPIs = kpisData.filter((kpi: any) => {
          const kpiProjectFullCode = (kpi['Project Full Code'] || '').toString().trim()
          const kpiProjectCode = (kpi['Project Code'] || '').toString().trim()
          const kpiProjectSubCode = (kpi['Project Sub Code'] || '').toString().trim()
          
          // ✅ PRIORITY 1: Exact match on project_full_code
          if (kpiProjectFullCode === projectFullCode) {
            return true
          }
          
          // ✅ PRIORITY 2: Build full code from KPI and match
          if (kpiProjectCode && kpiProjectSubCode) {
            let kpiFullCode = kpiProjectCode
            if (kpiProjectSubCode) {
              if (kpiProjectSubCode.toUpperCase().startsWith(kpiProjectCode.toUpperCase())) {
                kpiFullCode = kpiProjectSubCode
              } else {
                if (kpiProjectSubCode.startsWith('-')) {
                  kpiFullCode = `${kpiProjectCode}${kpiProjectSubCode}`
                } else {
                  kpiFullCode = `${kpiProjectCode}-${kpiProjectSubCode}`
                }
              }
            }
            if (kpiFullCode === projectFullCode) {
              return true
            }
          }
          
          // ✅ PRIORITY 3: Match where Project Full Code starts with our project_full_code
          if (projectFullCode && kpiProjectFullCode.startsWith(projectFullCode)) {
            return true
          }
          
          // ❌ DO NOT match by project_code alone if project has sub_code
          // Only allow if current project has no sub_code (to avoid mixing projects)
          if (!projectSubCode && !kpiProjectFullCode && kpiProjectCode === projectCode) {
            return true
          }
          
          return false
        })
        
        const originalKPIsCount = kpisData.length
        kpisData = filteredKPIs
        console.log(`✅ Filtered KPIs: ${filteredKPIs.length} out of ${originalKPIsCount} match project_full_code ${projectFullCode}`)
      }
      
      if (kpisError) {
        console.error('❌ Error fetching KPIs:', kpisError)
      }
      
      const activities = (Array.isArray(activitiesData) ? activitiesData : []).map(mapBOQFromDB)
      const kpis = (Array.isArray(kpisData) ? kpisData : []).map(mapKPIFromDB)
      
      console.log(`✅ Loaded ${activities.length} activities for ${project.project_code}`)
      console.log(`✅ Loaded ${kpis.length} KPIs for ${project.project_code}`)
      
      if (activities.length === 0) {
        console.warn(`⚠️ NO ACTIVITIES FOUND for project ${project.project_code}!`)
        console.log('💡 Check if activities exist in "Planning Database - BOQ Rates" table')
      } else {
        console.log('📋 Sample activity:', {
          project_code: activities[0].project_code,
          project_full_code: activities[0].project_full_code,
          activity_name: activities[0].activity_name,
          planned_units: activities[0].planned_units,
          planned_value: activities[0].planned_value,
          actual_units: activities[0].actual_units,
          progress: activities[0].activity_progress_percentage
        })
      }
      
      if (kpis.length === 0) {
        console.warn(`⚠️ NO KPIs FOUND for project ${project.project_code}!`)
        console.log('💡 Check if KPIs exist in "Planning Database - KPI Combined" view')
      } else {
        const plannedKPIs = kpis.filter((k: any) => k.input_type === 'Planned')
        const actualKPIs = kpis.filter((k: any) => k.input_type === 'Actual')
        console.log('📊 KPIs breakdown:', {
          total: kpis.length,
          planned: plannedKPIs.length,
          actual: actualKPIs.length,
          sample: kpis[0]
        })
      }
      
      // Calculate analytics using the fetched data
      const projectAnalytics = calculateProjectAnalytics(project, activities, kpis)
      
      console.log('📈 Analytics calculated:', {
        totalActivities: projectAnalytics.totalActivities,
        completedActivities: projectAnalytics.completedActivities,
        totalKPIs: projectAnalytics.totalKPIs,
        plannedKPIs: projectAnalytics.plannedKPIs,
        actualKPIs: projectAnalytics.actualKPIs,
        overallProgress: projectAnalytics.overallProgress.toFixed(1) + '%',
        financialProgress: projectAnalytics.financialProgress.toFixed(1) + '%',
        plannedValue: projectAnalytics.totalPlannedValue,
        earnedValue: projectAnalytics.totalEarnedValue
      })
      
      setAnalytics(projectAnalytics)
    } catch (error) {
      console.error('❌ Error fetching project analytics:', error)
    } finally {
      stopSmartLoading(setLoading)
    }
  }
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }
  
  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`
  }
  
  const getHealthColor = (health: string) => {
    switch (health) {
      case 'excellent': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'good': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'warning': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }
  
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }
  
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <Card className="w-full max-w-6xl max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-center p-12">
            <LoadingSpinner size="lg" />
          </div>
        </Card>
      </div>
    )
  }
  
  if (!analytics) return null
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <CardHeader className="border-b dark:border-gray-700 flex-shrink-0">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <CardTitle className="text-2xl mb-2">{project.project_name}</CardTitle>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline" className="text-sm">
                  {project.project_code}
                </Badge>
                <Badge className={getHealthColor(analytics.projectHealth)}>
                  {analytics.projectHealth.toUpperCase()}
                </Badge>
                <Badge className={getRiskColor(analytics.riskLevel)}>
                  Risk: {analytics.riskLevel.toUpperCase()}
                </Badge>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        
        
        {/* View Tabs */}
        <div className="flex gap-2 p-4 border-b dark:border-gray-700 flex-shrink-0">
          <Button
            variant={activeView === 'overview' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveView('overview')}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Overview
          </Button>
          <Button
            variant={activeView === 'activities' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveView('activities')}
          >
            <Activity className="h-4 w-4 mr-2" />
            Activities ({analytics.totalActivities})
          </Button>
          <Button
            variant={activeView === 'kpis' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveView('kpis')}
          >
            <Target className="h-4 w-4 mr-2" />
            KPIs ({analytics.totalKPIs})
          </Button>
          
          {/* Add Activity BOQ Button */}
          <div className="ml-auto">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                console.log('➕ Add Activity BOQ clicked for project:', project.project_code)
                setShowBOQModal(true)
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Activity className="h-4 w-4 mr-2" />
              Add Activity BOQ
            </Button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeView === 'overview' && (
            <div className="space-y-6">
              {/* Progress Overview - NEW CONCEPTS */}
              {(() => {
                // ✅ NEW: Calculate progress using shared work value calculator (same as Work Value Status column)
                // ✅ PERFORMANCE: Use pre-calculated workValueStatus from analytics if available
                const workValueStatus = analytics?.workValueStatus || calculateWorkValueStatus(project, analytics?.activities || [], analytics?.kpis || [])
                const progressSummary = calculateProgressFromWorkValue(workValueStatus)
                
                // ✅ Use calculated values directly (no fallback to analytics)
                const actualProgress = progressSummary.actual
                const plannedProgress = progressSummary.planned
                const variance = progressSummary.variance
                
                return (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Actual Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600">
                          {formatPercent(actualProgress)}
                    </div>
                    <div className="mt-2 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full transition-all"
                            style={{ width: `${Math.min(actualProgress, 100)}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      (Earned Value / Total Value)
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Planned Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-600">
                          {formatPercent(plannedProgress)}
                    </div>
                    <div className="mt-2 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${Math.min(plannedProgress, 100)}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      (Planned Value / Total Value)
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Variance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                        <div className={`text-3xl font-bold ${variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {variance >= 0 ? '+' : ''}{formatPercent(variance)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                          Actual - Planned Progress
                    </div>
                  </CardContent>
                </Card>
              </div>
                )
              })()}
              
              {/* Financial Summary - NEW CONCEPTS */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Financial Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Contract Value</p>
                      <p className="text-lg font-bold">{formatCurrency(analytics.totalContractValue)}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Entered manually</p>
                    </div>
                    {(() => {
                      // ✅ NEW: Calculate work value using shared calculator (same as Work Value Status column)
                      // ✅ PERFORMANCE: Use pre-calculated workValueStatus from analytics if available
                      const workValueStatus = analytics?.workValueStatus || calculateWorkValueStatus(project, analytics?.activities || [], analytics?.kpis || [])
                      const totalValue = workValueStatus.total
                      const plannedValue = workValueStatus.planned
                      const earnedValue = workValueStatus.earned
                      const remainingValue = totalValue - earnedValue
                      const variance = earnedValue - plannedValue
                      
                      return (
                        <>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Total Value</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(totalValue)}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Sum of all BOQ or KPI Planned</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Planned Value</p>
                            <p className="text-lg font-bold text-blue-600">{formatCurrency(plannedValue)}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Till yesterday (Planned KPI)</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Earned Value</p>
                            <p className="text-lg font-bold text-green-600">{formatCurrency(earnedValue)}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Till yesterday (Actual KPI)</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Remaining Value</p>
                            <p className="text-lg font-bold text-orange-600">{formatCurrency(remainingValue)}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total - Earned</p>
                    </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Variance</p>
                            <p className={`text-lg font-bold ${variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {variance >= 0 ? '+' : ''}{formatCurrency(variance)}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Earned - Planned</p>
                  </div>
                        </>
                      )
                    })()}
                  </div>
                  {(() => {
                    // ✅ Calculate progress from work value
                    // ✅ PERFORMANCE: Use pre-calculated workValueStatus from analytics if available
                    const workValueStatus = analytics?.workValueStatus || calculateWorkValueStatus(project, analytics?.activities || [], analytics?.kpis || [])
                    const totalValue = workValueStatus.total
                    const plannedValue = workValueStatus.planned
                    const earnedValue = workValueStatus.earned
                    const actualProgress = totalValue > 0 ? (earnedValue / totalValue) * 100 : 0
                    const plannedProgress = totalValue > 0 ? (plannedValue / totalValue) * 100 : 0
                    
                    return (
                      <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Actual Progress</p>
                          <p className="text-lg font-bold text-green-600">{formatPercent(actualProgress)}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">(Earned / Total) × 100</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Planned Progress</p>
                          <p className="text-lg font-bold text-blue-600">{formatPercent(plannedProgress)}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">(Planned / Total) × 100</p>
                        </div>
                      </div>
                    )
                  })()}
                </CardContent>
              </Card>
              
              {/* Quantity Summary - NEW CONCEPTS */}
              {(() => {
                // ✅ NEW: Calculate quantity using shared calculator (same principle as Financial Summary)
                // ✅ PERFORMANCE: Use pre-calculated quantityStatus from analytics if available
                const quantityStatus = analytics?.quantityStatus || calculateQuantityStatus(project, analytics?.activities || [], analytics?.kpis || [])
                const totalQuantity = quantityStatus.total
                const plannedQuantity = quantityStatus.planned
                const earnedQuantity = quantityStatus.earned
                const remainingQuantity = totalQuantity - earnedQuantity
                const quantityVariance = earnedQuantity - plannedQuantity
                
                return (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Quantity Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Total Quantity</p>
                          <p className="text-lg font-bold text-gray-900 dark:text-white">{totalQuantity.toLocaleString()}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Sum of all BOQ or KPI Planned</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Planned Quantity</p>
                          <p className="text-lg font-bold text-blue-600">{plannedQuantity.toLocaleString()}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Till yesterday (Planned KPI)</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Earned Quantity</p>
                          <p className="text-lg font-bold text-green-600">{earnedQuantity.toLocaleString()}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Till yesterday (Actual KPI)</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Remaining Quantity</p>
                          <p className="text-lg font-bold text-orange-600">{remainingQuantity.toLocaleString()}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total - Earned</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Quantity Variance</p>
                          <p className={`text-lg font-bold ${quantityVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {quantityVariance >= 0 ? '+' : ''}{quantityVariance.toLocaleString()}
                      </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Earned - Planned</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
                )
              })()}
              
              {/* Activities Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Activities Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {analytics.totalActivities}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Total</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600 flex items-center justify-center gap-1">
                        <CheckCircle className="h-5 w-5" />
                        {analytics.completedActivities}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Completed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600 flex items-center justify-center gap-1">
                        <Clock className="h-5 w-5" />
                        {analytics.onTrackActivities}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">On Track</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600 flex items-center justify-center gap-1">
                        <AlertTriangle className="h-5 w-5" />
                        {analytics.delayedActivities}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Delayed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-600 flex items-center justify-center gap-1">
                        {analytics.notStartedActivities}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Not Started</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Project Information - Full Width */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Project Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Project Dates - At the top */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-base pb-4 border-b border-gray-200 dark:border-gray-700">
                      {/* Project Start Date */}
                      {(() => {
                        // Get project start date from multiple sources
                        let projectStartDate: string | null = null
                        
                        // Priority 1: From Planned KPIs (first Planned KPI date)
                        if (analytics?.kpis && analytics.kpis.length > 0) {
                          const plannedKPIs = analytics.kpis.filter((kpi: any) => {
                            const inputType = String(kpi.input_type || kpi['Input Type'] || (kpi as any).raw?.['Input Type'] || '').trim().toLowerCase()
                            return inputType === 'planned'
                          })
                          
                          if (plannedKPIs.length > 0) {
                            const dates = plannedKPIs
                              .map((kpi: any) => {
                                const rawKpi = (kpi as any).raw || {}
                                const dateStr = rawKpi['Activity Date'] || rawKpi.activity_date || 
                                               kpi.activity_date || kpi['Activity Date'] ||
                                               rawKpi['Target Date'] || rawKpi.target_date ||
                                               kpi.target_date || kpi['Target Date'] ||
                                               rawKpi['Day'] || rawKpi.day ||
                                               kpi.day || kpi['Day'] ||
                                               ''
                                
                                if (!dateStr) return null
                                
                                try {
                                  const date = new Date(dateStr)
                                  return isNaN(date.getTime()) ? null : { date, dateStr }
                                } catch {
                                  return null
                                }
                              })
                              .filter((item): item is { date: Date, dateStr: string } => item !== null)
                              .sort((a, b) => a.date.getTime() - b.date.getTime())
                            
                            if (dates.length > 0) {
                              projectStartDate = dates[0].dateStr
                            }
                          }
                        }
                        
                        // Priority 2: From project fields
                        if (!projectStartDate) {
                          projectStartDate = project.project_start_date || 
                                           (project as any).raw?.['Project Start Date'] ||
                                           (project as any).raw?.['Planned Start Date'] ||
                                           (project as any).raw?.['Start Date'] ||
                                           (project as any).raw?.['Commencement Date'] ||
                                           null
                        }
                        
                        return projectStartDate ? (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 dark:text-gray-400 font-medium flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              Start Date:
                            </span>
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {new Date(projectStartDate).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                        ) : null
                      })()}
                      
                      {/* Project Completion Date */}
                      {(() => {
                        // Get project completion date from multiple sources
                        let projectCompletionDate: string | null = null
                        
                        // Priority 1: From Planned KPIs (last Planned KPI date)
                        if (analytics?.kpis && analytics.kpis.length > 0) {
                          const plannedKPIs = analytics.kpis.filter((kpi: any) => {
                            const inputType = String(kpi.input_type || kpi['Input Type'] || (kpi as any).raw?.['Input Type'] || '').trim().toLowerCase()
                            return inputType === 'planned'
                          })
                          
                          if (plannedKPIs.length > 0) {
                            const dates = plannedKPIs
                              .map((kpi: any) => {
                                const rawKpi = (kpi as any).raw || {}
                                const dateStr = rawKpi['Activity Date'] || rawKpi.activity_date || 
                                               kpi.activity_date || kpi['Activity Date'] ||
                                               rawKpi['Target Date'] || rawKpi.target_date ||
                                               kpi.target_date || kpi['Target Date'] ||
                                               rawKpi['Day'] || rawKpi.day ||
                                               kpi.day || kpi['Day'] ||
                                               ''
                                
                                if (!dateStr) return null
                                
                                try {
                                  const date = new Date(dateStr)
                                  return isNaN(date.getTime()) ? null : { date, dateStr }
                                } catch {
                                  return null
                                }
                              })
                              .filter((item): item is { date: Date, dateStr: string } => item !== null)
                              .sort((a, b) => a.date.getTime() - b.date.getTime())
                            
                            if (dates.length > 0) {
                              projectCompletionDate = dates[dates.length - 1].dateStr
                            }
                          }
                        }
                        
                        // Priority 2: From project fields
                        if (!projectCompletionDate) {
                          projectCompletionDate = project.project_completion_date || 
                                                (project as any).project_end_date ||
                                                (project as any).raw?.['Project Completion Date'] ||
                                                (project as any).raw?.['Planned Completion Date'] ||
                                                (project as any).raw?.['Completion Date'] ||
                                                (project as any).raw?.['End Date'] ||
                                                null
                        }
                        
                        return projectCompletionDate ? (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 dark:text-gray-400 font-medium flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              Completion Date:
                            </span>
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {new Date(projectCompletionDate).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                        ) : null
                      })()}
                    </div>
                    
                    {/* Other Project Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-base">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400 font-medium">SCOPE:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {(() => {
                            // ✅ Get scope from multiple sources (same logic as ProjectsTableWithCustomization)
                            // Strategy 1: Get from project.project_type field
                            const projectTypeNamesRaw = project.project_type || 
                                                       (project as any).raw?.['Project Type'] || 
                                                       ''
                            
                            // Strategy 2: Get from activities associated with this project
                            const projectActivityNames = analytics?.activities 
                              ? Array.from(new Set(
                                  analytics.activities
                                    .map((act: any) => act.activity_name || act.activity || act['Activity Name'] || (act as any).raw?.['Activity Name'] || '')
                                    .filter((name: string) => name && name.trim() !== '')
                                ))
                              : []
                            
                            // Strategy 3: Get project types from activities using project_type_activities table
                            const projectTypesFromActivities = new Set<string>()
                            projectActivityNames.forEach((activityName: string) => {
                              if (!activityName) return
                              
                              // Try exact match first
                              let projectType = activityProjectTypesMap.get(activityName)
                              
                              // If not found, try case-insensitive match
                              if (!projectType) {
                                const activityNameLower = activityName.toLowerCase().trim()
                                projectType = activityProjectTypesMap.get(activityNameLower)
                                
                                // If still not found, try partial match
                                if (!projectType) {
                                  Array.from(activityProjectTypesMap.entries()).forEach(([key, value]) => {
                                    if (!projectType && 
                                        (key.toLowerCase().includes(activityNameLower) || 
                                         activityNameLower.includes(key.toLowerCase()))) {
                                      projectType = value
                                    }
                                  })
                                }
                              }
                              
                              if (projectType) {
                                projectTypesFromActivities.add(projectType)
                              }
                            })
                            
                            // Combine project types from project.project_type and from activities
                            const allProjectTypeNames = new Set<string>()
                            
                            // Add from project.project_type field
                            if (projectTypeNamesRaw && 
                                projectTypeNamesRaw !== 'N/A' && 
                                projectTypeNamesRaw.trim() !== '') {
                              projectTypeNamesRaw.split(',').forEach((type: string) => {
                                const trimmed = type.trim()
                                if (trimmed) {
                                  allProjectTypeNames.add(trimmed)
                                }
                              })
                            }
                            
                            // Add from activities
                            projectTypesFromActivities.forEach(type => {
                              allProjectTypeNames.add(type)
                            })
                            
                            // Convert to array and look up names in projectTypesMap
                            const scopeNames = Array.from(allProjectTypeNames)
                              .map(typeName => {
                                // Try exact match first
                                const typeInfo = projectTypesMap.get(typeName)
                                if (typeInfo) {
                                  return typeInfo.name
                                }
                                
                                // Try case-insensitive match
                                const found = Array.from(projectTypesMap.entries()).find(([key, value]) => {
                                  return key.toLowerCase() === typeName.toLowerCase()
                                })
                                
                                if (found) {
                                  return found[1].name
                                }
                                
                                // Fallback to original name
                                return typeName
                              })
                              .filter(name => name && name.trim() !== '')
                            
                            // Return combined scope names or fallback
                            if (scopeNames.length > 0) {
                              return scopeNames.join(', ')
                            }
                            
                            // Fallback to project.project_type or N/A
                            return project.project_type || 'N/A'
                          })()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400 font-medium">Division:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{project.responsible_division || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400 font-medium">Plot:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{project.plot_number || 'N/A'}</span>
                      </div>
                      
                      {/* Additional Project Details */}
                      {project.client_name && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 dark:text-gray-400 font-medium">Client:</span>
                          <span className="font-semibold text-gray-900 dark:text-white">{project.client_name}</span>
                        </div>
                      )}
                      
                      {project.first_party_name && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 dark:text-gray-400 font-medium">First Party:</span>
                          <span className="font-semibold text-gray-900 dark:text-white">{project.first_party_name}</span>
                        </div>
                      )}
                      
                      {project.consultant_name && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 dark:text-gray-400 font-medium">Consultant:</span>
                          <span className="font-semibold text-gray-900 dark:text-white">{project.consultant_name}</span>
                        </div>
                      )}
                      
                      {project.project_manager_email && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 dark:text-gray-400 font-medium">Project Manager:</span>
                          <a 
                            href={`mailto:${project.project_manager_email}`}
                            className="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline"
                          >
                            {project.project_manager_email}
                          </a>
                        </div>
                      )}
                      
                      {project.area_manager_email && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 dark:text-gray-400 font-medium">Area Manager:</span>
                          <a 
                            href={`mailto:${project.area_manager_email}`}
                            className="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline"
                          >
                            {project.area_manager_email}
                          </a>
                        </div>
                      )}
                      
                      {project.division_head_email && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 dark:text-gray-400 font-medium">Division Head:</span>
                          <a 
                            href={`mailto:${project.division_head_email}`}
                            className="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline"
                          >
                            {project.division_head_email}
                          </a>
                        </div>
                      )}
                      
                      
                      {project.contract_status && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 dark:text-gray-400 font-medium">Contract Status:</span>
                          <span className="font-semibold text-gray-900 dark:text-white capitalize">{project.contract_status}</span>
                        </div>
                      )}
                      
                      {project.currency && project.currency !== 'AED' && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 dark:text-gray-400 font-medium">Currency:</span>
                          <span className="font-semibold text-gray-900 dark:text-white">{project.currency}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Location Information */}
                    {(project.latitude || project.longitude) && (
                      <div className="border-t pt-4 mt-4">
                          <div className="flex justify-between items-center mb-2">
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Location</p>
                            {(project.latitude && project.longitude) && (
                              <button
                                onClick={() => {
                                  const url = `https://www.google.com/maps?q=${project.latitude},${project.longitude}`;
                                  window.open(url, '_blank');
                                }}
                                className="text-xs bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-md transition-colors"
                                title="Open in Google Maps"
                              >
                                📍 View on Map
                              </button>
                            )}
                          </div>
                          {project.latitude && (
                            <div>
                              {copyFeedback.type === 'latitude' && (
                                <div className="mb-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                                  <p className="text-sm text-green-700 dark:text-green-300 font-medium flex items-center gap-2">
                                    <span className="text-green-600">✅</span>
                                    {copyFeedback.message}
                                  </p>
                                </div>
                              )}
                              <div className="flex justify-between items-center">
                                <span className="text-gray-600 dark:text-gray-400">Latitude:</span>
                                <div className="flex items-center gap-2">
                                  <span 
                                    className="font-medium cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded transition-colors"
                                    onClick={() => project.latitude && handleCopyCoordinate(project.latitude, 'latitude')}
                                    title="Click to copy"
                                  >
                                    {project.latitude}
                                  </span>
                                  <button
                                    onClick={() => project.latitude && handleCopyCoordinate(project.latitude, 'latitude')}
                                    className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                    title="Copy to clipboard"
                                  >
                                    📋
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                          {project.longitude && (
                            <div>
                              {copyFeedback.type === 'longitude' && (
                                <div className="mb-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                                  <p className="text-sm text-green-700 dark:text-green-300 font-medium flex items-center gap-2">
                                    <span className="text-green-600">✅</span>
                                    {copyFeedback.message}
                                  </p>
                                </div>
                              )}
                              <div className="flex justify-between items-center">
                                <span className="text-gray-600 dark:text-gray-400">Longitude:</span>
                                <div className="flex items-center gap-2">
                                  <span 
                                    className="font-medium cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded transition-colors"
                                    onClick={() => project.longitude && handleCopyCoordinate(project.longitude, 'longitude')}
                                    title="Click to copy"
                                  >
                                    {project.longitude}
                                  </span>
                                  <button
                                    onClick={() => project.longitude && handleCopyCoordinate(project.longitude, 'longitude')}
                                    className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                    title="Copy to clipboard"
                                  >
                                    📋
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                      </div>
                    )}
                    
                    {/* Retention Information */}
                    {(project.retention_after_completion !== undefined || 
                      project.retention_after_6_month !== undefined || 
                      project.retention_after_12_month !== undefined) && (
                      <div className="border-t pt-4 mt-4">
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-3">Retention Information</p>
                        <div className="space-y-2">
                          {project.retention_after_completion !== undefined && project.retention_after_completion !== null && (
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600 dark:text-gray-400 font-medium">Retention after Completion:</span>
                              <span className="font-semibold text-gray-900 dark:text-white">
                                {project.retention_after_completion}%
                              </span>
                            </div>
                          )}
                          {project.retention_after_6_month !== undefined && project.retention_after_6_month !== null && (
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600 dark:text-gray-400 font-medium">Retention after 6 Month:</span>
                              <span className="font-semibold text-gray-900 dark:text-white">
                                {project.retention_after_6_month}%
                              </span>
                            </div>
                          )}
                          {project.retention_after_12_month !== undefined && project.retention_after_12_month !== null && (
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600 dark:text-gray-400 font-medium">Retention after 12 Month:</span>
                              <span className="font-semibold text-gray-900 dark:text-white">
                                {project.retention_after_12_month}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Management Team */}
                    {(project.project_manager_email || project.area_manager_email || project.division_head_email) && (
                      <div className="border-t pt-4 mt-4">
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-2">Management Team</p>
                          {project.project_manager_email && (
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600 dark:text-gray-400">Project Manager:</span>
                              <a 
                                href={`mailto:${project.project_manager_email}`}
                                className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline cursor-pointer"
                                title="Click to send email"
                              >
                                {project.project_manager_email}
                              </a>
                            </div>
                          )}
                          {project.area_manager_email && (
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600 dark:text-gray-400">Area Manager:</span>
                              <a 
                                href={`mailto:${project.area_manager_email}`}
                                className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline cursor-pointer"
                                title="Click to send email"
                              >
                                {project.area_manager_email}
                              </a>
                            </div>
                          )}
                          {project.division_head_email && (
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600 dark:text-gray-400">Division Head:</span>
                              <a 
                                href={`mailto:${project.division_head_email}`}
                                className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline cursor-pointer"
                                title="Click to send email"
                              >
                                {project.division_head_email}
                              </a>
                            </div>
                          )}
                      </div>
                    )}
                    
                    {/* Contract Details */}
                    {(project.workmanship_only || project.advance_payment_required || project.virtual_material_value) && (
                      <div className="border-t pt-4 mt-4">
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-2">Contract Details</p>
                          {project.workmanship_only && (
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Workmanship Only:</span>
                              <span className="font-medium">{project.workmanship_only}</span>
                            </div>
                          )}
                          {project.advance_payment_required && (
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Advance Payment:</span>
                              <span className="font-medium">{project.advance_payment_required}</span>
                            </div>
                          )}
                          {project.virtual_material_value && (
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Virtual Material Value:</span>
                              <span className="font-medium">{project.virtual_material_value}</span>
                            </div>
                          )}
                        </div>
                      )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          {activeView === 'activities' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold">BOQ Activities ({analytics.activities.length})</h3>
              
              {analytics.activities.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No activities found for this project
                </div>
              ) : (
                (() => {
                  // ✅ Group activities by Zone
                  const activitiesByZone = new Map<string, typeof analytics.activities>()
                  
                  analytics.activities.forEach((activity) => {
                    const zoneLabel = (activity.zone_ref || activity.zone_number || activity.activity_division || '').toString().trim()
                    const zoneKey = zoneLabel || 'N/A'
                    
                    if (!activitiesByZone.has(zoneKey)) {
                      activitiesByZone.set(zoneKey, [])
                    }
                    activitiesByZone.get(zoneKey)!.push(activity)
                  })
                  
                  // Sort zones alphabetically
                  const sortedZones = Array.from(activitiesByZone.entries()).sort((a, b) => {
                    if (a[0] === 'N/A') return 1
                    if (b[0] === 'N/A') return -1
                    return a[0].localeCompare(b[0])
                  })
                  
                  return (
                    <div className="space-y-6">
                      {sortedZones.map(([zoneKey, zoneActivities]) => (
                        <div key={zoneKey} className="space-y-3">
                          {/* Zone Header */}
                          <div className="flex items-center gap-3 pb-2 border-b-2 border-blue-200 dark:border-blue-800">
                            <Badge variant="outline" className="text-sm font-semibold px-3 py-1 bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700">
                              Zone: {zoneKey}
                            </Badge>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              ({zoneActivities.length} {zoneActivities.length === 1 ? 'activity' : 'activities'})
                            </span>
                          </div>
                          
                          {/* Activities in this Zone */}
                          <div className="space-y-3 pl-4 border-l-2 border-blue-100 dark:border-blue-900/50">
                            {zoneActivities.map((activity) => (
                    <Card key={activity.id} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <h4 className="font-semibold text-lg text-gray-900 dark:text-white mb-1">
                              {activity.activity_name || activity.activity}
                            </h4>
                            <div className="flex items-center gap-2 mb-2">
                              {(() => {
                                const divisionLabel = (activity.activity_division || '').toString().trim()
                                          const shouldShowDivision = divisionLabel && 
                                                                    divisionLabel.toLowerCase() !== 'enabling division' &&
                                                                    divisionLabel !== zoneKey

                                return (
                                  <>
                                              {shouldShowDivision && (
                                      <Badge variant="outline" className="text-xs text-gray-600 dark:text-gray-300 border-dashed">
                                        {divisionLabel}
                                      </Badge>
                                    )}
                                  </>
                                )
                              })()}
                              {activity.unit && (
                                <Badge variant="outline" className="text-xs">
                                  {activity.unit}
                                </Badge>
                              )}
                            </div>
                            
                            {/* Activity Timeline - Always Visible */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-blue-500" />
                                <div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">Start Date</p>
                                  <p className="font-medium text-gray-900 dark:text-white">
                                    {(() => {
                                      const startDate = calculateActivityStartDate(activity)
                                      return startDate 
                                        ? new Date(startDate).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric'
                                          })
                                        : 'Not set'
                                    })()}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-red-500" />
                                <div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">End Date</p>
                                  <p className="font-medium text-gray-900 dark:text-white">
                                    {(() => {
                                      const endDate = calculateActivityEndDate(activity)
                                      return endDate 
                                        ? new Date(endDate).toLocaleDateString('en-US', {
                                          year: 'numeric',
                                          month: 'short',
                                          day: 'numeric'
                                        })
                                      : 'Not set'
                                    })()}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Timer className="h-4 w-4 text-green-500" />
                                <div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">Duration</p>
                                  <p className="font-medium text-gray-900 dark:text-white">
                                    {(() => {
                                      const duration = calculateActivityDuration(activity)
                                      return duration > 0 ? `${duration} days` : 'Not set'
                                    })()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 items-center">
                            {(() => {
                              // ✅ Calculate status automatically based on dates and progress
                              const activityStatus = calculateActivityStatus(activity)
                              return (
                                <div className="flex items-center gap-2">
                                  <Badge className={`${activityStatus.bgColor} ${activityStatus.color} font-semibold text-xs px-2 py-1 whitespace-nowrap`}>
                                    {activityStatus.label}
                                  </Badge>
                                  {activityStatus.description && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                      {activityStatus.description}
                                    </span>
                                  )}
                                </div>
                              )
                            })()}
                            <button
                              type="button"
                              onClick={() => toggleActivityDetails(activity.id)}
                              className="px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded whitespace-nowrap ml-auto"
                            >
                              {showActivityDetails[activity.id] ? "Hide Details" : "Show Details"}
                            </button>
                          </div>
                        </div>
                        
                        {/* Activity Details - Collapsible */}
                        {showActivityDetails[activity.id] && (
                          <>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-gray-500 dark:text-gray-400 mb-1">Progress</p>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div 
                                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                  style={{ 
                                    width: `${Math.min(
                                      activityActuals[activity.id] !== undefined 
                                        ? (activityActuals[activity.id] / activity.planned_units) * 100
                                        : activity.activity_progress_percentage || 0, 
                                      100
                                    )}%` 
                                  }}
                                />
                              </div>
                              <span className="font-bold text-sm text-blue-600 dark:text-blue-400">
                                {formatPercent(
                                  (() => {
                                    const plannedUnits = activityPlanneds[activity.id] !== undefined 
                                      ? activityPlanneds[activity.id] 
                                      : activity.planned_units || 0
                                    const actualUnits = activityActuals[activity.id] !== undefined 
                                      ? activityActuals[activity.id] 
                                      : activity.actual_units || 0
                                    return plannedUnits > 0 ? (actualUnits / plannedUnits) * 100 : (activity.activity_progress_percentage || 0)
                                  })()
                                )}
                              </span>
                            </div>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Planned / Actual</p>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {(() => {
                                // ✅ Use Quantity Summary totals (from EnhancedQuantitySummary) - most accurate!
                                const summaryTotals = quantitySummaryTotals[activity.id]
                                if (summaryTotals) {
                                  return `${summaryTotals.totalPlanned.toLocaleString()} / ${summaryTotals.totalActual.toLocaleString()} ${activity.unit || ''}`
                                }
                                
                                // Fallback to activityPlanneds if Quantity Summary not loaded yet
                                const plannedUnits = activityPlanneds[activity.id] !== undefined 
                                  ? activityPlanneds[activity.id] 
                                  : activity.planned_units || 0
                                const actualUnits = activityActuals[activity.id] !== undefined 
                                  ? activityActuals[activity.id] 
                                  : activity.actual_units || 0
                                return `${plannedUnits.toLocaleString()} / ${actualUnits.toLocaleString()} ${activity.unit || ''}`
                              })()}
                            </p>
                            <p className="text-xs text-blue-600 dark:text-blue-400">
                              (from KPIs - see Quantity Summary below)
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Value</p>
                            <p className="font-medium text-green-600 dark:text-green-400">
                              {(() => {
                                // ✅ Use Planned/Actual filtered by Zone
                                const plannedUnits = activityPlanneds[activity.id] !== undefined 
                                  ? activityPlanneds[activity.id] 
                                  : activity.planned_units || 0
                                const actualUnits = activityActuals[activity.id] !== undefined 
                                  ? activityActuals[activity.id] 
                                  : activity.actual_units || 0
                                
                                // Calculate rate from activity (if total_units > 0)
                                const rate = activity.total_units && activity.total_units > 0
                                  ? (activity.total_value || 0) / activity.total_units
                                  : 0
                                
                                // Value = Rate × Actual Units (for this Zone)
                                const value = rate * actualUnits
                                
                                return formatCurrency(value)
                              })()}
                            </p>
                            <p className="text-xs text-gray-500">
                              Rate × Actual Units (Zone)
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Rate</p>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {(() => {
                                // Calculate rate from activity
                                const rate = activity.total_units && activity.total_units > 0
                                  ? (activity.total_value || 0) / activity.total_units
                                  : 0
                                
                                return `${formatCurrency(rate)} / ${activity.unit}`
                              })()}
                            </p>
                            <p className="text-xs text-gray-500">
                              Total Value ÷ Total Units
                            </p>
                          </div>
                        </div>
                        
                        {/* Enhanced Timeline Section */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-blue-500" />
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Start Date</p>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {(() => {
                                  const startDate = calculateActivityStartDate(activity)
                                  return startDate 
                                    ? new Date(startDate).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric'
                                      })
                                    : 'Not set'
                                })()}
                              </p>
                              {(() => {
                                const startDate = calculateActivityStartDate(activity)
                                const originalStartDate = activity.planned_activity_start_date
                                
                                if (startDate) {
                                  return (
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {(() => {
                                        const startDateObj = new Date(startDate)
                                        const today = new Date()
                                        const diffTime = startDateObj.getTime() - today.getTime()
                                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                                        
                                        if (diffDays > 0) {
                                          return `${diffDays} days from now`
                                        } else if (diffDays === 0) {
                                          return 'Today'
                                        } else {
                                          return `${Math.abs(diffDays)} days ago`
                                        }
                                      })()}
                                    </p>
                                  )
                                }
                                
                                if (startDate && startDate !== originalStartDate) {
                                  return (
                                    <p className="text-xs text-blue-600 dark:text-blue-400">
                                      Updated from KPI
                                    </p>
                                  )
                                }
                                
                                return null
                              })()}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-red-500" />
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">End Date</p>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {(() => {
                                  const endDate = calculateActivityEndDate(activity)
                                  return endDate 
                                    ? new Date(endDate).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric'
                                    })
                                  : 'Not set'
                                })()}
                              </p>
                              {(() => {
                                const endDate = calculateActivityEndDate(activity)
                                if (endDate) {
                                  const endDateObj = new Date(endDate)
                                  const today = new Date()
                                  const diffTime = endDateObj.getTime() - today.getTime()
                                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                                  
                                  if (diffDays > 0) {
                                    return (
                                      <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {diffDays} days remaining
                                      </p>
                                    )
                                  } else if (diffDays === 0) {
                                    return (
                                      <p className="text-xs text-orange-600 dark:text-orange-400">
                                        Due today
                                      </p>
                                    )
                                  } else {
                                    return (
                                      <p className="text-xs text-red-600 dark:text-red-400">
                                        {Math.abs(diffDays)} days overdue
                                      </p>
                                    )
                                  }
                                }
                                return null
                              })()}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Timer className="h-4 w-4 text-green-500" />
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Duration</p>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {(() => {
                                  const duration = calculateActivityDuration(activity)
                                  return duration > 0 ? `${duration} days` : 'Not set'
                                })()}
                              </p>
                              {(() => {
                                const duration = calculateActivityDuration(activity)
                                const originalDuration = activity.calendar_duration
                                if (duration !== originalDuration && duration > 0) {
                                  return (
                                    <p className="text-xs text-blue-600 dark:text-blue-400">
                                      Updated from KPI
                                    </p>
                                  )
                                }
                                return null
                              })()}
                            </div>
                          </div>
                        </div>
                        
                        {/* Additional Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Zone</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {activity.zone_ref || activity.zone_number || 'N/A'}
                            </p>
                            {activity.zone_number && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Zone #: {activity.zone_number}
                              </p>
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Zone Value</p>
                            <p className="text-sm font-medium text-green-600 dark:text-green-400">
                              {(() => {
                                // ✅ Calculate Zone Value = Rate × Planned Units (for this Zone)
                                const plannedUnits = activityPlanneds[activity.id] !== undefined 
                                  ? activityPlanneds[activity.id] 
                                  : activity.planned_units || 0
                                
                                // Calculate rate from activity
                                const rate = activity.total_units && activity.total_units > 0
                                  ? (activity.total_value || 0) / activity.total_units
                                  : 0
                                
                                // Zone Value = Rate × Planned Units (for this Zone)
                                const zoneValue = rate * plannedUnits
                                
                                return formatCurrency(zoneValue)
                              })()}
                            </p>
                            <p className="text-xs text-gray-400">
                              Rate × Planned Units (Zone)
                            </p>
                          </div>
                        </div>
                        
                        {/* ✅ Quantity Summary using EnhancedQuantitySummary */}
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                          <EnhancedQuantitySummary
                            selectedActivity={activity}
                            selectedProject={project}
                            newQuantity={0}
                            unit={activity.unit || ''}
                            showDebug={false}
                            zone={activity.zone_ref || activity.zone_number || undefined}
                            projectFullCode={activity.project_full_code || project.project_full_code || project.project_code || undefined}
                            onTotalsChange={(totals) => {
                              // ✅ Store totals for this activity to use in Planned display
                              setQuantitySummaryTotals(prev => ({
                                ...prev,
                                [activity.id]: totals
                              }))
                            }}
                          />
                        </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
                        </div>
                      ))}
                    </div>
                  )
                })()
              )}
            </div>
          )}
          
          {activeView === 'kpis' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold">KPI Records ({analytics.kpis.length})</h3>
              
              {analytics.kpis.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No KPIs found for this project
                </div>
              ) : (
                <div className="space-y-3">
                  {analytics.kpis.map((kpi) => (
                    <Card key={kpi.id} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-green-500">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <h4 className="font-semibold text-lg text-gray-900 dark:text-white mb-1">
                              {kpi.activity_name || kpi.kpi_name}
                            </h4>
                            
                            {/* Activity Date and Day Order - Always Visible */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-2">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-blue-500" />
                                <div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">Activity Date</p>
                                  <p className="font-medium text-gray-900 dark:text-white">
                                    {kpi.target_date || kpi.start_date || kpi.actual_date
                                      ? new Date(kpi.target_date || kpi.start_date || kpi.actual_date).toLocaleDateString('en-US', {
                                          year: 'numeric',
                                          month: 'short',
                                          day: 'numeric'
                                        })
                                      : 'Not set'
                                    }
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Target className="h-4 w-4 text-green-500" />
                                <div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">Day Order</p>
                                  <p className="font-medium text-gray-900 dark:text-white">
                                    {(() => {
                                      // Calculate day order based on target_date
                                      if (!kpi.target_date) return 'Not set'
                                      
                                      // Find all KPIs for the same activity and sort by date
                                      const activityKPIs = analytics.kpis.filter((otherKpi: any) => 
                                        otherKpi.activity_name === kpi.activity_name &&
                                        otherKpi.project_code === kpi.project_code
                                      )
                                      
                                      if (activityKPIs.length <= 1) return 'Day 1'
                                      
                                      // Sort by target_date
                                      const sortedKPIs = activityKPIs.sort((a: any, b: any) => {
                                        const dateA = new Date(a.target_date || a.start_date || a.actual_date || '')
                                        const dateB = new Date(b.target_date || b.start_date || b.actual_date || '')
                                        return dateA.getTime() - dateB.getTime()
                                      })
                                      
                                      // Find the position of current KPI
                                      const currentIndex = sortedKPIs.findIndex((otherKpi: any) => otherKpi.id === kpi.id)
                                      
                                      if (currentIndex === -1) return 'Day 1'
                                      
                                      const dayNumber = currentIndex + 1
                                      const dayNames = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth']
                                      
                                      if (dayNumber <= 10) {
                                        return `${dayNames[dayNumber - 1]} Day (${dayNumber})`
                                      } else {
                                        return `Day ${dayNumber}`
                                      }
                                    })()}
                                  </p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {kpi.input_type}
                              </Badge>
                              {kpi.section && (
                                <Badge variant="outline" className="text-xs">
                                  {kpi.section}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Badge className={
                              kpi.status === 'completed' ? 'bg-green-100 text-green-800' :
                              kpi.status === 'on_track' ? 'bg-blue-100 text-blue-800' :
                              kpi.status === 'at_risk' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }>
                              {kpi.status}
                            </Badge>
                            <button
                              type="button"
                              onClick={() => toggleKpiDetails(kpi.id)}
                              className="px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded"
                            >
                              {showKpiDetails[kpi.id] ? "Hide" : "Show"}
                            </button>
                          </div>
                        </div>
                        
                        {/* KPI Details - Collapsible */}
                        {showKpiDetails[kpi.id] && (
                          <>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-gray-500 dark:text-gray-400 mb-1">Quantity</p>
                            <p className="font-bold text-lg text-green-600 dark:text-green-400">
                              {kpi.quantity || 0}
                            </p>
                          </div>
                          {kpi.drilled_meters > 0 && (
                            <div>
                              <p className="text-gray-500 dark:text-gray-400 mb-1">Drilled Meters</p>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {kpi.drilled_meters}m
                              </p>
                            </div>
                          )}
                          {kpi.progress_percentage !== undefined && (
                            <div>
                              <p className="text-gray-500 dark:text-gray-400 mb-1">Progress</p>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                  <div 
                                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${Math.min(kpi.progress_percentage || 0, 100)}%` }}
                                  />
                                </div>
                                <span className="font-bold text-sm text-green-600 dark:text-green-400">
                                  {formatPercent(kpi.progress_percentage)}
                                </span>
                              </div>
                            </div>
                          )}
                          <div>
                            <p className="text-gray-500 dark:text-gray-400 mb-1">Target</p>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {kpi.target_value || 'N/A'}
                            </p>
                          </div>
                        </div>
                        
                        {/* Dates Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-blue-500" />
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Date</p>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {kpi.start_date || kpi.target_date || kpi.end_date
                                  ? new Date(kpi.start_date || kpi.target_date || kpi.end_date).toLocaleDateString()
                                  : 'Not set'
                                }
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Actual Work Date</p>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {kpi.actual_work_date 
                                  ? new Date(kpi.actual_work_date).toLocaleDateString()
                                  : 'Not set'
                                }
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Additional Details */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Unit</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {kpi.unit || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Frequency</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {kpi.frequency || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Last Updated</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {kpi.updated_at 
                                ? new Date(kpi.updated_at).toLocaleDateString()
                                : 'N/A'
                              }
                            </p>
                          </div>
                        </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* BOQ Modal */}
      {showBOQModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Add Activity BOQ - {project.project_name}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBOQModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-6">
              <IntelligentBOQForm
                activity={{ project_code: project.project_code }}
                onSubmit={handleBOQSubmit}
                onCancel={() => setShowBOQModal(false)}
                projects={[project]}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


