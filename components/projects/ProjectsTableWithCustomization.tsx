'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Project } from '@/lib/supabase'
import { ColumnCustomizer, ColumnConfig } from '@/components/ui/ColumnCustomizer'
import { useColumnCustomization } from '@/lib/useColumnCustomization'
import { Button } from '@/components/ui/Button'
import { PermissionButton } from '@/components/ui/PermissionButton'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { PermissionGuard } from '@/components/common/PermissionGuard'
import { CheckCircle, Clock, AlertCircle, Calendar, Building, Activity, TrendingUp, Target, Info, Filter, X, RotateCcw, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { RecordHistoryModal } from '@/components/common/RecordHistoryModal'
import { calculateProjectAnalytics, ProjectAnalytics } from '@/lib/projectAnalytics'
import { formatCurrencyByCodeSync } from '@/lib/currenciesManager'
import { getProjectStatusText, getProjectStatusColor } from '@/lib/projectStatusManager'
import { getStatusDisplayInfo, calculateProjectStatus, ProjectStatusData } from '@/lib/projectStatusCalculator'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
import { buildProjectFullCode, filterActivitiesByProject, filterKPIsByProject } from '@/lib/projectDataFetcher'
import { calculateActivityRate } from '@/lib/rateCalculator'
import { calculateWorkValueStatus, calculateProgressFromWorkValue } from '@/lib/workValueCalculator'
import { TABLES } from '@/lib/supabase'

interface ProjectsTableWithCustomizationProps {
  projects: Project[]
  onEdit: (project: Project) => void
  onDelete: (id: string) => void
  onBulkDelete?: (ids: string[]) => void
  allKPIs?: any[]
  allActivities?: any[]
  projectsAnalytics?: Map<string, ProjectAnalytics> // ✅ Pre-calculated analytics from parent
  onSort?: (columnId: string, direction: 'asc' | 'desc') => void // ✅ Database-level sorting callback
  currentSortColumn?: string // ✅ Current sort column from parent
  currentSortDirection?: 'asc' | 'desc' // ✅ Current sort direction from parent
  highlightedProjectId?: string // ✅ Project ID to highlight in the table
}

// Default column configuration for Projects
const defaultProjectsColumns: ColumnConfig[] = [
  { id: 'select', label: 'Select', visible: true, order: 0, fixed: true, width: '60px' },
  { id: 'project_code', label: 'Project Code', visible: true, order: 1, width: '150px' },
  { id: 'full_project_code', label: 'Full Project Code', visible: true, order: 2, fixed: true, width: '180px' },
  { id: 'project_name', label: 'Project Name', visible: true, order: 3, width: '250px' },
  { id: 'project_description', label: 'Project Description', visible: true, order: 4, width: '300px' },
  { id: 'plot_number', label: 'Plot No.', visible: true, order: 5, width: '120px' },
  { id: 'responsible_divisions', label: 'Responsible Divisions', visible: true, order: 6, width: '180px' },
  { id: 'scope_of_works', label: 'Scope of Works', visible: true, order: 7, width: '250px' },
  { id: 'kpi_added', label: 'KPI Added?', visible: true, order: 8, width: '120px' },
  { id: 'project_status', label: 'Project Status', visible: true, order: 9, width: '150px' },
  { id: 'contract_durations', label: 'Contract Durations', visible: true, order: 10, width: '180px' },
  { id: 'planned_dates', label: 'Planned Dates', visible: true, order: 11, width: '180px' },
  { id: 'actual_dates', label: 'Actual Dates', visible: true, order: 12, width: '180px' },
  { id: 'progress_summary', label: 'Progress Summary', visible: true, order: 13, width: '180px' },
  { id: 'work_value_status', label: 'Work Value Status', visible: true, order: 14, width: '200px' },
  { id: 'contract_amount', label: 'Contract Amount', visible: true, order: 15, width: '150px' },
  { id: 'divisions_contract_amount', label: 'Divisions Contract Amount', visible: true, order: 16, width: '220px' },
  { id: 'temporary_material', label: 'Temporary Material', visible: true, order: 17, width: '150px' },
  { id: 'project_location', label: 'Project Location', visible: true, order: 18, width: '180px' },
  { id: 'project_parties', label: 'Project Parties', visible: true, order: 19, width: '200px' },
  { id: 'client_name', label: 'Client Name', visible: false, order: 20, width: '180px' },
  { id: 'consultant_name', label: 'Consultant Name', visible: false, order: 21, width: '180px' },
  { id: 'project_staff', label: 'Project Staff', visible: true, order: 22, width: '200px' },
  { id: 'project_manager_email', label: 'Project Manager Email', visible: false, order: 24, width: '200px' },
  { id: 'area_manager_email', label: 'Area Manager Email', visible: false, order: 25, width: '200px' },
  { id: 'division_head_email', label: 'Division Head Email', visible: false, order: 26, width: '200px' },
  { id: 'project_award_date', label: 'Project Award Date', visible: true, order: 27, width: '150px' },
  { id: 'retention_details', label: 'Retention', visible: true, order: 28, width: '220px' },
  { id: 'work_programme', label: 'Work Programme', visible: false, order: 29, width: '180px' },
  { id: 'contract_status', label: 'Contract Status', visible: false, order: 35, width: '150px' },
  { id: 'currency', label: 'Currency', visible: false, order: 36, width: '120px' },
  { id: 'workmanship', label: 'Workmanship', visible: true, order: 37, width: '130px' },
  { id: 'advance_payment_required', label: 'Advance Payment Required', visible: false, order: 38, width: '200px' },
  { id: 'advance_payment_percentage', label: 'Advance Payment Percentage', visible: true, order: 38.5, width: '200px' },
  { id: 'virtual_material_value', label: 'Virtual Material Value', visible: false, order: 39, width: '180px' },
  { id: 'created_at', label: 'Created At', visible: false, order: 40, width: '150px' },
  { id: 'updated_at', label: 'Updated At', visible: false, order: 41, width: '150px' },
  { id: 'created_by', label: 'Created By', visible: false, order: 42, width: '180px' },
  { id: 'actions', label: 'Actions', visible: true, order: 43, fixed: true, width: '200px' }
]

export function ProjectsTableWithCustomization({ 
  projects, 
  onEdit, 
  onDelete, 
  onBulkDelete,
  allKPIs = [],
  allActivities = [],
  projectsAnalytics: propProjectsAnalytics, // ✅ Pre-calculated analytics from parent
  onSort, // ✅ Database-level sorting callback
  currentSortColumn, // ✅ Current sort column from parent
  currentSortDirection, // ✅ Current sort direction from parent
  highlightedProjectId // ✅ Project ID to highlight in the table
}: ProjectsTableWithCustomizationProps) {
  const guard = usePermissionGuard()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showCustomizer, setShowCustomizer] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [historyRecordId, setHistoryRecordId] = useState<string>('')
  const [historyRecordType, setHistoryRecordType] = useState<'kpi' | 'boq' | 'project'>('project')
  const [historyRecordData, setHistoryRecordData] = useState<any>(null)
  const [expandedScopes, setExpandedScopes] = useState<Set<string>>(new Set()) // Track expanded scopes per project
  const [expandedDivisions, setExpandedDivisions] = useState<Set<string>>(new Set()) // Track expanded divisions per project
  const [copiedPlotNumber, setCopiedPlotNumber] = useState<string | null>(null) // Track copied plot number for feedback
  // ✅ FIX: Load project types from project_types table (Project Types & Activities Management)
  const [projectTypesMap, setProjectTypesMap] = useState<Map<string, { name: string; description?: string }>>(new Map())
  // ✅ FIX: Load project_type_activities to map activity_name to project_type
  const [activityProjectTypesMap, setActivityProjectTypesMap] = useState<Map<string, string>>(new Map()) // activity_name -> project_type
  
  // Sorting state - use props if provided (database-level sorting), otherwise use local state (client-side sorting)
  const [localSortColumn, setLocalSortColumn] = useState<string | null>(null)
  const [localSortDirection, setLocalSortDirection] = useState<'asc' | 'desc'>('asc')
  
  // ✅ Scroll to highlighted project when it changes
  useEffect(() => {
    if (highlightedProjectId) {
      const rowId = `project-row-${highlightedProjectId}`
      const rowElement = document.getElementById(rowId)
      if (rowElement) {
        // Small delay to ensure table is rendered
        setTimeout(() => {
          rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 100)
      }
    }
  }, [highlightedProjectId])
  
  // Use parent's sort state if onSort callback is provided (database-level sorting)
  const sortColumn = onSort ? (currentSortColumn || null) : localSortColumn
  const sortDirection = onSort ? (currentSortDirection || 'asc') : localSortDirection
  
  const { 
    columns, 
    saveConfiguration, 
    resetToDefault 
  } = useColumnCustomization({ 
    defaultColumns: defaultProjectsColumns, 
    storageKey: 'projects' 
  })

  // ✅ FIX: Load project types and project_type_activities on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const supabase = getSupabaseClient()
        console.log('🔄 Loading project types and activities from database...')
        
        // 1. Load project types from project_types table
        const { data: typesData, error: typesError } = await supabase
          .from('project_types')
          .select('name, description')
          .eq('is_active', true)
          .order('name', { ascending: true })
        
        if (typesError) {
          console.error('❌ Error loading project types:', typesError)
          console.error('Error details:', {
            message: typesError.message,
            details: typesError.details,
            hint: typesError.hint
          })
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
          console.log(`✅ Loaded ${typesMap.size} project types from project_types table`)
        }
        
        // 2. Load project_type_activities to map activity_name to project_type
        const { data: activitiesData, error: activitiesError } = await supabase
          .from('project_type_activities')
          .select('activity_name, project_type')
          .eq('is_active', true)
        
        if (activitiesError) {
          console.error('❌ Error loading project_type_activities:', activitiesError)
        } else {
          // Create a map: activity_name -> project_type
          const activityTypesMap = new Map<string, string>()
          if (activitiesData && activitiesData.length > 0) {
            activitiesData.forEach((item: any) => {
              if (item.activity_name && item.project_type) {
                const activityNameLower = item.activity_name.toLowerCase().trim()
                // Store both exact and lowercase for flexible matching
                activityTypesMap.set(item.activity_name, item.project_type)
                activityTypesMap.set(activityNameLower, item.project_type)
              }
            })
          }
          setActivityProjectTypesMap(activityTypesMap)
          console.log(`✅ Loaded ${activitiesData?.length || 0} activities from project_type_activities`)
        }
      } catch (error: any) {
        console.error('❌ Error loading data:', error)
        console.error('Error stack:', error.stack)
      }
    }
    
    loadData()
  }, [])

  // ✅ Calculate analytics for all projects (same as Cards use) - OPTIMIZED for performance
  // ✅ PERFORMANCE: Use pre-calculated analytics from parent if available
  // Otherwise, calculate as fallback (should rarely happen)
  const projectsAnalytics = useMemo(() => {
    // ✅ PRIORITY 1: Use pre-calculated analytics from ProjectsList
    if (propProjectsAnalytics && propProjectsAnalytics.size > 0) {
    if (process.env.NODE_ENV === 'development') {
        console.log(`✅ ProjectsTable: Using pre-calculated analytics from ProjectsList (${propProjectsAnalytics.size} projects)`)
      }
      return propProjectsAnalytics
    }
    
    // ✅ PRIORITY 2: Fallback - Calculate if not provided (should rarely happen)
    if (process.env.NODE_ENV === 'development') {
      console.log(`⚠️ ProjectsTable: Calculating analytics as fallback (should be provided from parent)`, {
        projectsCount: projects.length,
        allActivitiesCount: allActivities.length,
        allKPIsCount: allKPIs.length
      })
    }
    
    if (!projects.length || (!allActivities.length && !allKPIs.length)) {
      return new Map<string, ProjectAnalytics>()
    }
    
    const analyticsMap = new Map<string, ProjectAnalytics>()
    
    projects.forEach(project => {
      try {
        const projectCode = (project.project_code || '').trim()
        const projectSubCode = (project.project_sub_code || '').trim()
        const projectFullCode = buildProjectFullCode(project)
        
        const activitiesForFiltering = allActivities.map((a: any) => {
          const raw = a.raw || {}
          return {
            'Project Full Code': a.project_full_code || raw['Project Full Code'] || '',
            'Project Code': a.project_code || raw['Project Code'] || '',
            'Project Sub Code': a.project_sub_code || raw['Project Sub Code'] || '',
            ...a
          }
        })
        
        const filteredActivities = filterActivitiesByProject(
          activitiesForFiltering,
          projectCode,
          projectSubCode,
          projectFullCode
        )
        
        const kpisForFiltering = allKPIs.map((k: any) => {
          const raw = k.raw || {}
          return {
            'Project Full Code': k.project_full_code || raw['Project Full Code'] || '',
            'Project Code': k.project_code || raw['Project Code'] || '',
            'Project Sub Code': k.project_sub_code || raw['Project Sub Code'] || '',
            ...k
          }
        })
        
        const filteredKPIs = filterKPIsByProject(
          kpisForFiltering,
          projectCode,
          projectSubCode,
          projectFullCode
        )
        
        const analytics = calculateProjectAnalytics(project, filteredActivities, filteredKPIs)
        analyticsMap.set(project.id, analytics)
      } catch (error) {
        console.error(`❌ Error calculating analytics for ${project.project_code}:`, error)
      }
    })
    
    return analyticsMap
  }, [propProjectsAnalytics, projects, allActivities, allKPIs])

  // ✅ Helper: Get analytics for a project (with fallback)
  const getProjectAnalytics = (project: Project): ProjectAnalytics | null => {
    return projectsAnalytics.get(project.id) || null
  }

  // Selection handlers
  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id])
    } else {
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(projects.map(project => project.id))
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

  // Helper: Get project field from raw data - OPTIMIZED with useCallback
  const getProjectField = useCallback((project: Project, fieldName: string): any => {
    try {
      const raw = (project as any).raw || project
      return raw[fieldName] || raw[fieldName.replace(/\s+/g, ' ')] || (project as any)[fieldName] || ''
    } catch {
      return ''
    }
  }, [])

  // ✅ Helper: تحديث حالة المشروع في قاعدة البيانات
  const updateProjectStatusInDB = useCallback(async (
    projectId: string,
    newStatus: string,
    confidence: number,
    reason: string
  ) => {
    try {
      const supabase = getSupabaseClient()
      
      const updateData: any = {
        project_status: newStatus,
        'Project Status': newStatus, // ✅ تحديث عمود "Project Status" أيضاً
        updated_at: new Date().toISOString()
      }
      
      // إضافة حقول إضافية إذا كانت موجودة
      try {
        updateData.status_confidence = confidence
        updateData.status_reason = reason
        updateData.status_updated_at = new Date().toISOString()
      } catch {
        // تجاهل إذا كانت الحقول غير موجودة
      }
      
      const { error } = await (supabase as any)
        .from(TABLES.PROJECTS)
        .update(updateData)
        .eq('id', projectId)
      
      if (error) {
        // محاولة التحديث بدون الحقول الإضافية
        const { error: retryError } = await (supabase as any)
          .from(TABLES.PROJECTS)
          .update({
            project_status: newStatus,
            'Project Status': newStatus, // ✅ تحديث عمود "Project Status" أيضاً
            updated_at: new Date().toISOString()
          })
          .eq('id', projectId)
        
        if (retryError) {
          if (process.env.NODE_ENV === 'development') {
            console.error(`❌ [Status Update] Failed to update project ${projectId}:`, retryError)
          }
          return false // فشل التحديث
        }
      }
      
      // ✅ إرسال إشعار database-updated لتحديث الواجهة تلقائياً
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('database-updated', {
          detail: { tableName: TABLES.PROJECTS, timestamp: Date.now() }
        })
        window.dispatchEvent(event)
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ [Status Update] Updated project ${projectId} to ${newStatus} and dispatched database-updated event`)
        }
      } else if (process.env.NODE_ENV === 'development') {
        console.log(`✅ [Status Update] Updated project ${projectId} to ${newStatus}`)
      }
      
      return true // نجح التحديث
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`❌ [Status Update] Error updating project ${projectId}:`, error)
      }
      return false // فشل التحديث
    }
  }, [])

  // Helper: Normalize project code for matching - OPTIMIZED with useCallback
  const normalizeCode = useCallback((code: any): string => {
    if (!code) return ''
    return String(code).trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  }, [])

  // ✅ IMPROVED: Check if item matches project using STRICT matching logic from projectAnalytics.ts
  // This ensures accurate matching based on full_code and sub_code (e.g., project 5066)
  const matchesProject = useCallback((item: any, project: Project): boolean => {
    if (!project?.project_code || !item) return false
    
    try {
      // ✅ Build project_full_code correctly (same logic as projectAnalytics.ts)
      const projectCode = (project.project_code || '').toString().trim()
      const projectSubCode = (project.project_sub_code || '').toString().trim()
      
      // Build project_full_code (case-sensitive for exact matching)
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
      
      const projectCodeUpper = projectCode.toUpperCase()
      const projectFullCodeUpper = projectFullCode.toUpperCase()
      
      // ✅ Removed debug logging to reduce console noise
      
      // ✅ Extract item codes from all possible sources (same logic as projectAnalytics.ts)
      const rawItem = (item as any).raw || {}
      
      // ✅ PRIORITY 1: Try project_full_code first (most accurate)
      const itemProjectFullCode = (
        item.project_full_code ||
        item['Project Full Code'] ||
        rawItem['Project Full Code'] ||
        ''
      ).toString().trim()
      
      // ✅ PRIORITY 2: Get project_code and project_sub_code
      const itemProjectCode = (
        item.project_code ||
        item['Project Code'] ||
        rawItem['Project Code'] ||
        ''
      ).toString().trim()
      
      const itemProjectSubCode = (
        item.project_sub_code ||
        item['Project Sub Code'] ||
        rawItem['Project Sub Code'] ||
        ''
      ).toString().trim()
      
      // ✅ PRIORITY 1: Direct exact match with project_full_code (MOST ACCURATE - prevents mixing projects)
      if (projectFullCodeUpper && itemProjectFullCode.toUpperCase() === projectFullCodeUpper) {
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
        if (itemFullCode.toUpperCase() === projectFullCodeUpper) {
          return true
        }
      }
      
      // ✅ PRIORITY 3: Match where Project Full Code starts with our project_full_code (for sub-projects)
      // Only if project has sub_code (to avoid matching other projects with same project_code)
      if (projectSubCode && projectFullCode && itemProjectFullCode && itemProjectFullCode.toUpperCase().startsWith(projectFullCodeUpper)) {
        return true
      }
      
      // ✅ PRIORITY 4: Build item full code from item codes and match (if item has both codes)
      if (itemProjectCode && itemProjectSubCode) {
        let builtItemFullCode = itemProjectCode
        if (itemProjectSubCode.toUpperCase().startsWith(itemProjectCode.toUpperCase())) {
          builtItemFullCode = itemProjectSubCode
        } else if (itemProjectSubCode.startsWith('-')) {
          builtItemFullCode = `${itemProjectCode}${itemProjectSubCode}`
        } else {
          builtItemFullCode = `${itemProjectCode}-${itemProjectSubCode}`
        }
        if (builtItemFullCode.toUpperCase() === projectFullCodeUpper) {
          return true
        }
      }
      
      // ✅ PRIORITY 4.5: Special case for P5066-R4 - Match when item has Project Code = P5066 and Project Sub Code = P5066-R4
      // This handles the case where project_sub_code = "P5066-R4" (starts with project_code)
      if (projectCodeUpper === 'P5066' && projectSubCode && projectSubCode.toUpperCase().startsWith('P5066')) {
        // Project has sub_code that starts with project_code (e.g., "P5066-R4")
        if (itemProjectCode.toUpperCase() === 'P5066' && itemProjectSubCode && itemProjectSubCode.toUpperCase() === projectSubCode.toUpperCase()) {
          return true
        }
      }
      
      // ❌ DO NOT match by project_code alone if project has sub_code
      // This prevents mixing projects with same project_code but different sub_code
      // Only allow project_code matching if current project has no sub_code (old data fallback)
      if (!projectSubCode && !itemProjectFullCode && itemProjectCode.toUpperCase() === projectCodeUpper) {
        return true
      }
      
      // ✅ Removed debug logging to reduce console noise
      
      return false
    } catch (error) {
      console.error('Error in matchesProject:', error)
      return false
    }
  }, [])

  // Helper: Format date
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A'
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return 'N/A'
      return date.toLocaleDateString('en-US')
    } catch {
      return 'N/A'
    }
  }

  // ✅ EXPANDED: Parse date string (handles ALL possible formats from Supabase)
  const parseDateString = (dateStr: string | null | undefined): Date | null => {
    if (!dateStr || dateStr === '' || dateStr === 'N/A' || dateStr === 'null' || dateStr === 'undefined') {
      return null
    }
    
    try {
      const str = String(dateStr).trim()
      
      // ✅ PRIORITY 1: Try ISO format first (most common in Supabase)
      const isoDate = new Date(str)
      if (!isNaN(isoDate.getTime()) && isoDate.getFullYear() > 1900 && isoDate.getFullYear() < 2100) {
        return isoDate
      }
      
      // ✅ PRIORITY 2: Try "DD-Mon-YY" format (e.g., "23-Feb-24", "15-Jan-25")
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
          // Handle 2-digit years
          if (year < 100) {
            year = year < 50 ? 2000 + year : 1900 + year
          }
          const parsedDate = new Date(year, month, day)
          if (!isNaN(parsedDate.getTime()) && parsedDate.getFullYear() > 1900 && parsedDate.getFullYear() < 2100) {
            return parsedDate
          }
        }
      }
      
      // ✅ PRIORITY 3: Try "YYYY-MM-DD" format (PostgreSQL date format)
      const ymdMatch = str.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
      if (ymdMatch) {
        const year = parseInt(ymdMatch[1], 10)
        const month = parseInt(ymdMatch[2], 10) - 1 // JavaScript months are 0-indexed
        const day = parseInt(ymdMatch[3], 10)
        const parsedDate = new Date(year, month, day)
        if (!isNaN(parsedDate.getTime()) && parsedDate.getFullYear() > 1900 && parsedDate.getFullYear() < 2100) {
          return parsedDate
        }
      }
      
      // ✅ PRIORITY 4: Try "DD/MM/YYYY" or "MM/DD/YYYY" format
      const dmyMatch = str.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/)
      if (dmyMatch) {
        const first = parseInt(dmyMatch[1], 10)
        const second = parseInt(dmyMatch[2], 10)
        const year = parseInt(dmyMatch[3], 10)
        
        // Try both DD/MM/YYYY and MM/DD/YYYY
        let parsedDate = new Date(year, second - 1, first) // DD/MM/YYYY
        if (!isNaN(parsedDate.getTime()) && parsedDate.getFullYear() > 1900 && parsedDate.getFullYear() < 2100) {
          return parsedDate
        }
        
        parsedDate = new Date(year, first - 1, second) // MM/DD/YYYY
        if (!isNaN(parsedDate.getTime()) && parsedDate.getFullYear() > 1900 && parsedDate.getFullYear() < 2100) {
          return parsedDate
        }
      }
      
      // ✅ PRIORITY 5: Try timestamp (milliseconds or seconds)
      const timestamp = parseInt(str, 10)
      if (!isNaN(timestamp)) {
        // If timestamp is in seconds (less than year 2100 in seconds), convert to milliseconds
        const date = timestamp > 1000000000000 ? new Date(timestamp) : new Date(timestamp * 1000)
        if (!isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2100) {
          return date
        }
      }
      
    } catch (error) {
      // Ignore errors, return null
    }
    
    return null
  }

  // ✅ EXPANDED Helper: Get planned dates from KPIs (وسع النطاق ليشمل كل المشاريع)
  // المنطق: 
  // 1. يذهب إلى جدول KPI
  // 2. يبحث عن المشروع (باستخدام منطق matching شامل)
  // 3. يبحث عن تاريخ أول نشاط KPI (أول Planned KPI) = Start
  // 4. يبحث عن آخر تاريخ نشاط KPI (آخر Planned KPI) = Completion
  const getPlannedDatesFromKPIs = (project: Project): { start: string | null, completion: string | null } => {
    if (!project.project_code) {
      return { start: null, completion: null }
    }

    try {
      // ✅ USE ANALYTICS FIRST (SAME AS CARDS) - analytics.kpis contains filtered KPIs
      const analytics = getProjectAnalytics(project)
      let plannedKPIs: any[] = []
      
      // ✅ Priority 1: Use KPIs from analytics (same filtering as Cards)
      if (analytics && analytics.kpis && analytics.kpis.length > 0) {
        plannedKPIs = analytics.kpis.filter((kpi: any) => {
          const inputType = String(
            kpi.input_type || 
            kpi['Input Type'] || 
            (kpi as any).raw?.['Input Type'] || 
            (kpi as any).raw?.['input_type'] ||
            ''
          ).trim()
          return inputType.toLowerCase() === 'planned' || inputType === 'Planned'
        })
      }
      
      // ✅ Priority 2: Fallback to allKPIs if analytics not available or no KPIs found
      if (plannedKPIs.length === 0) {
        plannedKPIs = allKPIs.filter((kpi: any) => {
        // Get Input Type from multiple sources (EXPANDED)
        const inputType = String(
          kpi.input_type || 
          kpi['Input Type'] || 
          (kpi as any).raw?.['Input Type'] || 
          (kpi as any).raw?.['input_type'] ||
          ''
        ).trim()
        
        // Check if it's Planned (case-insensitive)
        const isPlanned = inputType.toLowerCase() === 'planned' || inputType === 'Planned'
        
        // ✅ EXPANDED: Check if matches project (multiple strategies)
        const matches = matchesProject(kpi, project)
        
        return matches && isPlanned
      })
      }

      // ✅ Fallback: If still no Planned KPIs found, try all KPIs
      if (plannedKPIs.length === 0) {
        // ✅ EXPANDED: Try fallback - search in all KPIs (not just Planned) if no Planned found
        // Sometimes KPIs might not have Input Type set correctly
        const allProjectKPIs = allKPIs.filter((kpi: any) => matchesProject(kpi, project))
        
        if (allProjectKPIs.length > 0) {
          // Try to find any KPIs with dates for this project
          const datesFromAllKPIs = allProjectKPIs
            .map((kpi: any) => {
              const rawKpi = (kpi as any).raw || {}
              
              let dateStr = rawKpi['Activity Date'] || rawKpi.activity_date || 
                           kpi.activity_date || kpi['Activity Date'] ||
                           rawKpi['Target Date'] || rawKpi.target_date ||
                           kpi.target_date || kpi['Target Date'] ||
                           rawKpi['Day'] || rawKpi.day ||
                           kpi.day || kpi['Day'] || ''
              
              const parsed = parseDateString(dateStr)
              return parsed ? { date: parsed, kpi, dateStr } : null
            })
            .filter((item): item is { date: Date, kpi: any, dateStr: string } => item !== null)
            .sort((a, b) => a.date.getTime() - b.date.getTime())
          
          if (datesFromAllKPIs.length > 0) {
            return {
              start: datesFromAllKPIs[0].date.toISOString(),
              completion: datesFromAllKPIs[datesFromAllKPIs.length - 1].date.toISOString()
            }
          }
        }
        
        return { start: null, completion: null }
      }

      // ✅ EXPANDED: Extract dates - تاريخ نشاط KPI من جدول KPI (وسع البحث ليشمل جميع الحقول)
      // Start = تاريخ أول نشاط Planned KPI
      // Completion = تاريخ آخر نشاط Planned KPI
      const datesWithKPIs = plannedKPIs
        .map((kpi: any) => {
          const rawKpi = (kpi as any).raw || {}
          
          // ✅ EXPANDED PRIORITY 1: Activity Date (تاريخ النشاط) - جميع الاختلافات
          let dateStr = rawKpi['Activity Date'] ||
                       rawKpi.activity_date ||
                       rawKpi['activity_date'] ||
                       rawKpi['ActivityDate'] ||
                       rawKpi.ActivityDate ||
                       ''
          
          // ✅ EXPANDED PRIORITY 2: من المابيد object (Activity Date) - جميع الاختلافات
          if (!dateStr || dateStr === '' || dateStr === 'N/A' || dateStr === 'null') {
            dateStr = kpi.activity_date ||
                     kpi['Activity Date'] ||
                     kpi['activity_date'] ||
                     kpi['ActivityDate'] ||
                     kpi.ActivityDate ||
                     ''
          }
          
          // ✅ EXPANDED PRIORITY 3: Target Date (للـ Planned KPIs) - جميع الاختلافات
          if (!dateStr || dateStr === '' || dateStr === 'N/A' || dateStr === 'null') {
            dateStr = rawKpi['Target Date'] ||
                     rawKpi.target_date ||
                     rawKpi['target_date'] ||
                     rawKpi['TargetDate'] ||
                     rawKpi.TargetDate ||
                     kpi.target_date ||
                     kpi['Target Date'] ||
                     kpi['target_date'] ||
                     kpi['TargetDate'] ||
                     kpi.TargetDate ||
                     ''
          }
          
          // ✅ EXPANDED PRIORITY 4: Day column - جميع الاختلافات
          if (!dateStr || dateStr === '' || dateStr === 'N/A' || dateStr === 'null') {
            dateStr = rawKpi['Day'] || 
                     rawKpi.day ||
                     rawKpi['day'] ||
                     rawKpi.Day ||
                     kpi.day || 
                     kpi['Day'] ||
                     kpi['day'] ||
                     kpi.Day ||
                     ''
          }
          
          // ✅ EXPANDED PRIORITY 5: Other date fields - جميع الاختلافات
          if (!dateStr || dateStr === '' || dateStr === 'N/A' || dateStr === 'null') {
            dateStr = rawKpi.date ||
                     rawKpi['date'] ||
                     rawKpi.Date ||
                     rawKpi['Date'] ||
                     kpi.date ||
                     kpi['date'] ||
                     kpi.Date ||
                     kpi['Date'] ||
                     ''
          }
          
          // ✅ PRIORITY 6: created_at as last resort
          if (!dateStr || dateStr === '' || dateStr === 'N/A' || dateStr === 'null') {
            dateStr = kpi.created_at ||
                     rawKpi.created_at ||
                     kpi['created_at'] ||
                     rawKpi['created_at'] ||
                     ''
          }
          
          // Parse the date string
          const parsed = parseDateString(dateStr)
          
          return parsed ? { date: parsed, kpi, dateStr } : null
        })
        .filter((item): item is { date: Date, kpi: any, dateStr: string } => item !== null)
        .sort((a, b) => a.date.getTime() - b.date.getTime())

      if (datesWithKPIs.length === 0) {
        return { start: null, completion: null }
      }

      // ✅ 3. تاريخ أول نشاط Planned KPI = Start
      // ✅ 4. تاريخ آخر نشاط Planned KPI = Completion
      return {
        start: datesWithKPIs[0].date.toISOString(),
        completion: datesWithKPIs[datesWithKPIs.length - 1].date.toISOString()
      }
    } catch (error) {
      console.error(`❌ Error getting planned dates from KPIs for ${project.project_code}:`, error)
      return { start: null, completion: null }
    }
  }

  // ✅ NEW: Get Planned Dates from BOQ Activities and KPIs (Post-Commencement only)
  // تاريخ البداية: من BOQ Activities أو أول KPI Planned (Post-Commencement فقط)
  // تاريخ النهاية: آخر KPI Planned (Post-Commencement فقط)
  const getPlannedDatesForProject = useCallback((project: Project): { start: string | null, completion: string | null } => {
    if (!project.project_code) {
      return { start: null, completion: null }
    }

    try {
      let plannedStart: string | null = null
      let plannedCompletion: string | null = null

      // ✅ STEP 1: Get planned start date from BOQ Activities
      if (allActivities.length > 0) {
        const projectActivities = allActivities.filter((activity: any) => matchesProject(activity, project))
        
        if (projectActivities.length > 0) {
          const activitiesWithStartDates = projectActivities
            .map((activity: any) => {
              const rawActivity = (activity as any).raw || {}
              
              // Get planned start date from activity
              let startDate = activity.planned_activity_start_date || 
                             activity.activity_planned_start_date || 
                             activity.planned_start_date ||
                             rawActivity['Planned Activity Start Date'] ||
                             rawActivity['PlannedActivityStartDate'] ||
                             activity['Planned Activity Start Date'] ||
                             activity['Planned Start Date'] ||
                             ''
              
              if (!startDate || startDate === '' || startDate === 'N/A' || startDate === 'null') {
                return null
              }
              
              const parsed = parseDateString(startDate)
              return parsed ? { date: parsed, dateStr: startDate } : null
            })
            .filter((item): item is { date: Date, dateStr: string } => item !== null)
            .sort((a, b) => a.date.getTime() - b.date.getTime())
          
          if (activitiesWithStartDates.length > 0) {
            plannedStart = activitiesWithStartDates[0].date.toISOString()
          }
        }
      }

      // ✅ STEP 2: Get planned dates from KPIs (Post-Commencement only)
      if (allKPIs.length > 0) {
        // Get all Planned KPIs for this project
        const plannedKPIs = allKPIs.filter((kpi: any) => {
          // Check if it's Planned
          const inputType = String(
            kpi.input_type || 
            kpi['Input Type'] || 
            (kpi as any).raw?.['Input Type'] || 
            (kpi as any).raw?.['input_type'] ||
            ''
          ).trim().toLowerCase()
          
          if (inputType !== 'planned') {
            return false
          }
          
          // Check if matches project
          if (!matchesProject(kpi, project)) {
            return false
          }
          
          // ✅ IMPORTANT: Check if Activity Timing is Post-Commencement
          const rawKPI = (kpi as any).raw || {}
          const activityTiming = String(
            kpi.activity_timing ||
            (kpi as any)['Activity Timing'] ||
            rawKPI['Activity Timing'] ||
            rawKPI['activity_timing'] ||
            ''
          ).trim().toLowerCase()
          
          // Only include Post-Commencement KPIs (exclude Pre-Commencement)
          return activityTiming === 'post-commencement' || 
                 activityTiming === 'post commencement' ||
                 activityTiming === '' || // If not specified, assume Post-Commencement
                 activityTiming === 'n/a'
        })

        if (plannedKPIs.length > 0) {
          // Extract dates from Planned KPIs (Post-Commencement only)
          const datesWithKPIs = plannedKPIs
            .map((kpi: any) => {
              const rawKpi = (kpi as any).raw || {}
              
              // Get date from multiple sources
              let dateStr = rawKpi['Activity Date'] ||
                           rawKpi.activity_date ||
                           kpi.activity_date ||
                           kpi['Activity Date'] ||
                           rawKpi['Target Date'] ||
                           rawKpi.target_date ||
                           kpi.target_date ||
                           kpi['Target Date'] ||
                           rawKpi['Day'] ||
                           rawKpi.day ||
                           kpi.day ||
                           kpi['Day'] ||
                           ''
              
              if (!dateStr || dateStr === '' || dateStr === 'N/A' || dateStr === 'null') {
                return null
              }
              
              const parsed = parseDateString(dateStr)
              return parsed ? { date: parsed, kpi, dateStr } : null
            })
            .filter((item): item is { date: Date, kpi: any, dateStr: string } => item !== null)
            .sort((a, b) => a.date.getTime() - b.date.getTime())

          if (datesWithKPIs.length > 0) {
            // ✅ Start date: First Planned KPI (Post-Commencement) or from BOQ if not found
            if (!plannedStart) {
              plannedStart = datesWithKPIs[0].date.toISOString()
            }
            
            // ✅ Completion date: Last Planned KPI (Post-Commencement)
            plannedCompletion = datesWithKPIs[datesWithKPIs.length - 1].date.toISOString()
          }
        }
      }

      return { start: plannedStart, completion: plannedCompletion }
    } catch (error) {
      console.error(`❌ Error getting planned dates for ${project.project_code}:`, error)
      return { start: null, completion: null }
    }
  }, [allActivities, allKPIs, matchesProject])

  // ✅ IMPROVED: Get Actual Dates from BOQ Activities and KPIs with better matching
  // تاريخ البداية: من BOQ Activities أو أول KPI Actual
  // تاريخ النهاية: آخر KPI Actual
  const getActualDatesForProject = useCallback((project: Project): { start: string | null, completion: string | null } => {
    if (!project.project_code) {
      return { start: null, completion: null }
    }

    try {
      let actualStart: string | null = null
      let actualCompletion: string | null = null

      // ✅ STEP 1: Get actual start date from BOQ Activities
      if (allActivities.length > 0) {
        const projectActivities = allActivities.filter((activity: any) => matchesProject(activity, project))
        
        if (projectActivities.length > 0) {
          const activitiesWithStartDates = projectActivities
            .map((activity: any) => {
              const rawActivity = (activity as any).raw || {}
              
              // Get actual start date from activity (check all possible fields)
              let startDate = activity.activity_actual_start_date || 
                             activity.actual_start_date ||
                             rawActivity['Activity Actual Start Date'] ||
                             rawActivity['Actual Start Date'] ||
                             activity['Activity Actual Start Date'] ||
                             activity['Actual Start Date'] ||
                             ''
              
              if (!startDate || startDate === '' || startDate === 'N/A' || startDate === 'null') {
                return null
              }
              
              const parsed = parseDateString(startDate)
              return parsed ? { date: parsed, dateStr: startDate } : null
            })
            .filter((item): item is { date: Date, dateStr: string } => item !== null)
            .sort((a, b) => a.date.getTime() - b.date.getTime())
          
          if (activitiesWithStartDates.length > 0) {
            actualStart = activitiesWithStartDates[0].date.toISOString()
          }
        }
      }

      // ✅ STEP 2: Get actual dates from KPIs (IMPROVED: More flexible filtering)
      if (allKPIs.length > 0) {
        // Get all Actual KPIs for this project
        const actualKPIs = allKPIs.filter((kpi: any) => {
          // Check if it's Actual (check all possible sources)
          const inputType = String(
            kpi.input_type || 
            kpi['Input Type'] || 
            (kpi as any).raw?.['Input Type'] || 
            (kpi as any).raw?.['input_type'] ||
            ''
          ).trim().toLowerCase()
          
          if (inputType !== 'actual') {
            return false
          }
          
          // Check if matches project (CRITICAL: Must match correctly)
          const matches = matchesProject(kpi, project)
          if (!matches) {
            return false
          }
          
          // ✅ IMPROVED: Check Activity Timing - be more flexible
          const rawKPI = (kpi as any).raw || {}
          const activityTiming = String(
            kpi.activity_timing ||
            (kpi as any)['Activity Timing'] ||
            rawKPI['Activity Timing'] ||
            rawKPI['activity_timing'] ||
            ''
          ).trim().toLowerCase()
          
          // ✅ FLEXIBLE: Include Post-Commencement, empty, or N/A (exclude only Pre-Commencement)
          // This ensures we don't miss KPIs that don't have Activity Timing set
          const isPreCommencement = activityTiming === 'pre-commencement' || 
                                   activityTiming === 'pre commencement' ||
                                   activityTiming === 'precommencement'
          
          // Exclude only Pre-Commencement, include everything else
          return !isPreCommencement
        })
        
        // ✅ DEBUG: Log filtering results
        if (process.env.NODE_ENV === 'development' && actualKPIs.length === 0 && allKPIs.length > 0) {
          const projectKPIs = allKPIs.filter((kpi: any) => matchesProject(kpi, project))
          const actualProjectKPIs = projectKPIs.filter((kpi: any) => {
            const inputType = String(
              kpi.input_type || 
              kpi['Input Type'] || 
              (kpi as any).raw?.['Input Type'] || 
              (kpi as any).raw?.['input_type'] ||
              ''
            ).trim().toLowerCase()
            return inputType === 'actual'
          })
          console.log(`🔍 [Actual Dates] Project ${project.project_code}:`, {
            totalKPIs: allKPIs.length,
            projectKPIs: projectKPIs.length,
            actualProjectKPIs: actualProjectKPIs.length,
            filteredActualKPIs: actualKPIs.length,
            note: actualKPIs.length === 0 ? 'No Actual KPIs found after filtering' : 'OK'
          })
        }

        if (actualKPIs.length > 0) {
          // ✅ IMPROVED: Extract dates with comprehensive field search (same as getActualDatesFromKPIs)
          const datesWithKPIs = actualKPIs
            .map((kpi: any) => {
              const rawKpi = (kpi as any).raw || {}
              
              // ✅ PRIORITY 1: Actual Date - جميع الاختلافات
              let dateStr = rawKpi['Actual Date'] ||
                           rawKpi.actual_date ||
                           rawKpi['actual_date'] ||
                           rawKpi['ActualDate'] ||
                           rawKpi.ActualDate ||
                           ''
              
              // ✅ PRIORITY 2: من المابيد object (Actual Date)
              if (!dateStr || dateStr === '' || dateStr === 'N/A' || dateStr === 'null') {
                dateStr = kpi.actual_date ||
                         kpi['Actual Date'] ||
                         kpi['actual_date'] ||
                         kpi['ActualDate'] ||
                         kpi.ActualDate ||
                         ''
              }
              
              // ✅ PRIORITY 3: Activity Date - جميع الاختلافات
              if (!dateStr || dateStr === '' || dateStr === 'N/A' || dateStr === 'null') {
                dateStr = rawKpi['Activity Date'] ||
                         rawKpi.activity_date ||
                         rawKpi['activity_date'] ||
                         rawKpi['ActivityDate'] ||
                         rawKpi.ActivityDate ||
                         kpi.activity_date ||
                         kpi['Activity Date'] ||
                         kpi['activity_date'] ||
                         kpi['ActivityDate'] ||
                         kpi.ActivityDate ||
                         ''
              }
              
              // ✅ PRIORITY 4: Day column - جميع الاختلافات
              if (!dateStr || dateStr === '' || dateStr === 'N/A' || dateStr === 'null') {
                dateStr = rawKpi['Day'] || 
                         rawKpi.day ||
                         rawKpi['day'] ||
                         rawKpi.Day ||
                         kpi.day || 
                         kpi['Day'] ||
                         kpi['day'] ||
                         kpi.Day ||
                         ''
              }
              
              if (!dateStr || dateStr === '' || dateStr === 'N/A' || dateStr === 'null') {
                return null
              }
              
              const parsed = parseDateString(dateStr)
              return parsed ? { date: parsed, kpi, dateStr } : null
            })
            .filter((item): item is { date: Date, kpi: any, dateStr: string } => item !== null)
            .sort((a, b) => a.date.getTime() - b.date.getTime())

          if (datesWithKPIs.length > 0) {
            // ✅ Start date: First Actual KPI or from BOQ if not found
            if (!actualStart) {
              actualStart = datesWithKPIs[0].date.toISOString()
            }
            
            // ✅ Completion date: Last Actual KPI
            actualCompletion = datesWithKPIs[datesWithKPIs.length - 1].date.toISOString()
          }
        }
      }

      return { start: actualStart, completion: actualCompletion }
    } catch (error) {
      console.error(`❌ Error getting actual dates for ${project.project_code}:`, error)
      return { start: null, completion: null }
    }
  }, [allActivities, allKPIs, matchesProject])

  // ✅ EXPANDED Helper: Get actual dates from KPIs - OPTIMIZED with useCallback
  const getActualDatesFromKPIs = useCallback((project: Project): { start: string | null, completion: string | null } => {
    if (!project.project_code) {
      return { start: null, completion: null }
    }

    try {
      // ✅ USE ANALYTICS FIRST (SAME AS CARDS) - analytics.kpis contains filtered KPIs
      const analytics = getProjectAnalytics(project)
      let actualKPIs: any[] = []
      
      // ✅ Priority 1: Use KPIs from analytics (same filtering as Cards)
      if (analytics && analytics.kpis && analytics.kpis.length > 0) {
        actualKPIs = analytics.kpis.filter((kpi: any) => {
          const inputType = String(
            kpi.input_type || 
            kpi['Input Type'] || 
            (kpi as any).raw?.['Input Type'] || 
            (kpi as any).raw?.['input_type'] ||
            ''
          ).trim()
          return inputType.toLowerCase() === 'actual' || inputType === 'Actual'
        })
      }
      
      // ✅ Priority 2: Fallback to allKPIs if analytics not available or no KPIs found
      if (actualKPIs.length === 0) {
        actualKPIs = allKPIs.filter((kpi: any) => {
        // Get Input Type from multiple sources (EXPANDED)
        const inputType = String(
          kpi.input_type || 
          kpi['Input Type'] || 
          (kpi as any).raw?.['Input Type'] || 
          (kpi as any).raw?.['input_type'] ||
          ''
        ).trim()
        
        // Check if it's Actual (case-insensitive)
        const isActual = inputType.toLowerCase() === 'actual' || inputType === 'Actual'
        
        // ✅ EXPANDED: Check if matches project (multiple strategies)
        const matches = matchesProject(kpi, project)
        
        return matches && isActual
      })
      }

      // ✅ EXPANDED: Extract dates with comprehensive field search
      const datesWithKPIs = actualKPIs
        .map((kpi: any) => {
          const rawKpi = (kpi as any).raw || {}
          
          // ✅ EXPANDED PRIORITY 1: Actual Date - جميع الاختلافات
          let dateStr = rawKpi['Actual Date'] ||
                       rawKpi.actual_date ||
                       rawKpi['actual_date'] ||
                       rawKpi['ActualDate'] ||
                       rawKpi.ActualDate ||
                       ''
          
          // ✅ EXPANDED PRIORITY 2: من المابيد object (Actual Date)
          if (!dateStr || dateStr === '' || dateStr === 'N/A' || dateStr === 'null') {
            dateStr = kpi.actual_date ||
                     kpi['Actual Date'] ||
                     kpi['actual_date'] ||
                     kpi['ActualDate'] ||
                     kpi.ActualDate ||
                     ''
          }
          
          // ✅ EXPANDED PRIORITY 3: Activity Date - جميع الاختلافات
          if (!dateStr || dateStr === '' || dateStr === 'N/A' || dateStr === 'null') {
            dateStr = rawKpi['Activity Date'] ||
                     rawKpi.activity_date ||
                     rawKpi['activity_date'] ||
                     rawKpi['ActivityDate'] ||
                     rawKpi.ActivityDate ||
                     kpi.activity_date ||
                     kpi['Activity Date'] ||
                     kpi['activity_date'] ||
                     kpi['ActivityDate'] ||
                     kpi.ActivityDate ||
                     ''
          }
          
          // ✅ EXPANDED PRIORITY 4: Day column - جميع الاختلافات
          if (!dateStr || dateStr === '' || dateStr === 'N/A' || dateStr === 'null') {
            dateStr = rawKpi['Day'] || 
                     rawKpi.day ||
                     rawKpi['day'] ||
                     rawKpi.Day ||
                     kpi.day || 
                     kpi['Day'] ||
                     kpi['day'] ||
                     kpi.Day ||
                     ''
          }
          
          // ✅ EXPANDED PRIORITY 5: Other date fields - جميع الاختلافات
          if (!dateStr || dateStr === '' || dateStr === 'N/A' || dateStr === 'null') {
            dateStr = rawKpi.date ||
                     rawKpi['date'] ||
                     rawKpi.Date ||
                     rawKpi['Date'] ||
                     kpi.date ||
                     kpi['date'] ||
                     kpi.Date ||
                     kpi['Date'] ||
                     ''
          }
          
          // ✅ PRIORITY 6: created_at as last resort
          if (!dateStr || dateStr === '' || dateStr === 'N/A' || dateStr === 'null') {
            dateStr = kpi.created_at ||
                     rawKpi.created_at ||
                     kpi['created_at'] ||
                     rawKpi['created_at'] ||
                     ''
          }
          
          const parsed = parseDateString(dateStr)
          return parsed ? { date: parsed, kpi, dateStr } : null
        })
        .filter((item): item is { date: Date, kpi: any, dateStr: string } => item !== null)
        .sort((a, b) => a.date.getTime() - b.date.getTime())

      if (datesWithKPIs.length === 0) {
        // ✅ EXPANDED: Try fallback - search in all KPIs (not just Actual) if no Actual found
        const allProjectKPIs = allKPIs.filter((kpi: any) => matchesProject(kpi, project))
        
        if (allProjectKPIs.length > 0) {
          const datesFromAllKPIs = allProjectKPIs
            .map((kpi: any) => {
              const rawKpi = (kpi as any).raw || {}
              
              let dateStr = rawKpi['Actual Date'] || rawKpi.actual_date ||
                           kpi.actual_date || kpi['Actual Date'] ||
                           rawKpi['Activity Date'] || rawKpi.activity_date ||
                           kpi.activity_date || kpi['Activity Date'] ||
                           rawKpi['Day'] || rawKpi.day ||
                           kpi.day || kpi['Day'] || ''
              
              const parsed = parseDateString(dateStr)
              return parsed ? { date: parsed, kpi, dateStr } : null
            })
            .filter((item): item is { date: Date, kpi: any, dateStr: string } => item !== null)
            .sort((a, b) => a.date.getTime() - b.date.getTime())
          
          if (datesFromAllKPIs.length > 0) {
            return {
              start: datesFromAllKPIs[0].date.toISOString(),
              completion: datesFromAllKPIs[datesFromAllKPIs.length - 1].date.toISOString()
            }
          }
        }
        
        return { start: null, completion: null }
      }

      return {
        start: datesWithKPIs[0].date.toISOString(),
        completion: datesWithKPIs[datesWithKPIs.length - 1].date.toISOString()
      }
    } catch (error) {
      console.error(`❌ Error getting actual dates from KPIs for ${project.project_code}:`, error)
      return { start: null, completion: null }
    }
  }, [allKPIs, matchesProject, getProjectAnalytics])

  // ✅ SMART Helper: Calculate progress summary with intelligent fallbacks
  const calculateProgressSummary = (project: Project): { planned: number, actual: number, source: string } => {
    let plannedProgress = 0
    let actualProgress = 0
    let source = 'none'
    
    if (!project.project_code) {
      return { planned: 0, actual: 0, source: 'none' }
    }

    try {
      // ✅ METHOD 1: From BOQ Activities (Primary Source - Most Accurate)
      if (allActivities.length > 0) {
        const projectActivities = allActivities.filter((activity: any) => matchesProject(activity, project))
        
        if (projectActivities.length > 0) {
          // Weighted average by activity value (more valuable activities count more)
          let totalPlannedProgress = 0
          let totalActualProgress = 0
          let totalWeight = 0
          let activityCount = 0
          
          projectActivities.forEach((activity: any) => {
            const plannedValue = activity.planned_progress_percentage || 0
            const actualValue = activity.activity_progress_percentage || 0
            const activityValue = activity.planned_value || activity.total_value || activity.earned_value || 1
            
            // Weight by activity value for more accurate calculation
            const weight = activityValue > 0 ? activityValue : 1
            
            if (plannedValue > 0 || actualValue > 0) {
              totalPlannedProgress += plannedValue * weight
              totalActualProgress += actualValue * weight
              totalWeight += weight
              activityCount++
            }
          })
          
          if (activityCount > 0 && totalWeight > 0) {
            plannedProgress = totalPlannedProgress / totalWeight
            actualProgress = totalActualProgress / totalWeight
            source = 'activities'
          } else {
            // Simple average if no weights available
            let simplePlanned = 0
            let simpleActual = 0
            let simpleCount = 0
            
            projectActivities.forEach((activity: any) => {
              const plannedValue = activity.planned_progress_percentage || 0
              const actualValue = activity.activity_progress_percentage || 0
              
              if (plannedValue > 0 || actualValue > 0) {
                simplePlanned += plannedValue
                simpleActual += actualValue
                simpleCount++
              }
            })
            
            if (simpleCount > 0) {
              plannedProgress = simplePlanned / simpleCount
              actualProgress = simpleActual / simpleCount
              source = 'activities'
            }
          }
        }
      }
      
      // ✅ METHOD 2: Calculate from Work Value (if progress not available but work value is)
      if (plannedProgress === 0 && actualProgress === 0 && allActivities.length > 0) {
        const projectActivities = allActivities.filter((activity: any) => matchesProject(activity, project))
        
        if (projectActivities.length > 0) {
          let totalPlannedValue = 0
          let totalEarnedValue = 0
          
          projectActivities.forEach((activity: any) => {
            const planned = activity.planned_value || 0
            const earned = activity.earned_value || 0
            
            totalPlannedValue += planned
            totalEarnedValue += earned
          })
          
          if (totalPlannedValue > 0) {
            actualProgress = (totalEarnedValue / totalPlannedValue) * 100
            plannedProgress = 100 // Assuming 100% planned if we have planned value
            source = 'work_value'
          }
        }
      }
      
      // ✅ METHOD 3: Calculate from KPIs (Quantity-based)
      if (plannedProgress === 0 && actualProgress === 0 && allKPIs.length > 0) {
        const projectKPIs = allKPIs.filter((kpi: any) => matchesProject(kpi, project))
        
        if (projectKPIs.length > 0) {
          let totalPlannedQty = 0
          let totalActualQty = 0
          let totalPlannedValue = 0
          let totalActualValue = 0
          
          projectKPIs.forEach((kpi: any) => {
            const inputType = String(kpi.input_type || kpi['Input Type'] || '').trim()
            const quantity = kpi.quantity || 0
            const value = kpi.value || 0
            
            if (inputType === 'Planned') {
              totalPlannedQty += quantity
              totalPlannedValue += value
            } else if (inputType === 'Actual') {
              totalActualQty += quantity
              totalActualValue += value
            }
          })
          
          // Use value-based if available, otherwise quantity-based
          if (totalPlannedValue > 0) {
            actualProgress = (totalActualValue / totalPlannedValue) * 100
            plannedProgress = 100
            source = 'kpi_value'
          } else if (totalPlannedQty > 0) {
            actualProgress = (totalActualQty / totalPlannedQty) * 100
            plannedProgress = 100
            source = 'kpi_quantity'
          }
        }
      }
      
      // ✅ METHOD 4: Time-based calculation (Smart estimation)
      if (plannedProgress === 0 && actualProgress === 0) {
        const plannedDates = getPlannedDatesFromKPIs(project)
        const actualDates = getActualDatesFromKPIs(project)
        
        // Try planned dates from multiple sources
        const plannedStart = plannedDates.start || 
                            getProjectField(project, 'Planned Start Date') || 
                            getProjectField(project, 'Planned Start') ||
                            getProjectField(project, 'Project Start Date') ||
                            ''
        const plannedCompletion = plannedDates.completion || 
                                 getProjectField(project, 'Planned Completion Date') || 
                                 getProjectField(project, 'Planned Completion') ||
                                 getProjectField(project, 'Project End Date') ||
                                 ''
        
        // For actual progress, use actual dates if available
        const actualStart = actualDates.start || 
                           getProjectField(project, 'Actual Start Date') || 
                           getProjectField(project, 'Actual Start') ||
                           ''
        
        if (plannedStart && plannedCompletion) {
          const startDate = new Date(plannedStart)
          const endDate = new Date(plannedCompletion)
          const today = new Date()
          
          if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
            const totalDuration = endDate.getTime() - startDate.getTime()
            const elapsedDuration = today.getTime() - startDate.getTime()
            
            if (totalDuration > 0) {
              plannedProgress = Math.min(100, Math.max(0, (elapsedDuration / totalDuration) * 100))
              
              // Calculate actual progress if actual start date is available
              if (actualStart) {
                const actualStartDate = new Date(actualStart)
                if (!isNaN(actualStartDate.getTime())) {
                  const actualElapsed = today.getTime() - actualStartDate.getTime()
                  const actualTotalDuration = endDate.getTime() - actualStartDate.getTime()
                  
                  if (actualTotalDuration > 0) {
                    actualProgress = Math.min(100, Math.max(0, (actualElapsed / actualTotalDuration) * 100))
                  }
                }
              } else {
                actualProgress = plannedProgress // If no actual start, assume same as planned
              }
              
              source = 'time_based'
            }
          }
        }
      }
      
      // ✅ METHOD 5: From project fields (Final fallback)
      if (actualProgress === 0) {
        actualProgress = parseFloat(String(
          getProjectField(project, 'Actual Progress') || 
          getProjectField(project, 'Progress') || 
          getProjectField(project, 'Overall Progress') ||
          getProjectField(project, 'Current Progress') ||
          '0'
        ).replace(/,/g, '')) || 0
        
        if (actualProgress > 0) {
          source = 'project_field'
        }
      }
      
      if (plannedProgress === 0) {
        plannedProgress = parseFloat(String(
          getProjectField(project, 'Planned Progress') || 
          getProjectField(project, 'Expected Progress') ||
          getProjectField(project, 'Target Progress') ||
          '0'
        ).replace(/,/g, '')) || 0
        
        if (plannedProgress > 0) {
          source = 'project_field'
        }
      }
      
      // Ensure values are within valid range
      plannedProgress = Math.min(100, Math.max(0, plannedProgress))
      actualProgress = Math.min(100, Math.max(0, actualProgress))
      
    } catch (error) {
      console.error('Error calculating progress:', error)
    }
    
    return { planned: plannedProgress, actual: actualProgress, source }
  }

  // ✅ Use shared work value calculator
  const calculateWorkValueStatusNew = useCallback((project: Project): { total: number, planned: number, earned: number } => {
    return calculateWorkValueStatus(project, allActivities || [], allKPIs || [])
  }, [allActivities, allKPIs])
  
  // ✅ OLD: Calculate Work Value Status with correct business logic (replaced by shared function)
  // Total Value: مجموع كل القيم لل BOQ مجتمعة أو KPI Planned مجتمعة
  // Planned Value: مجموع القيم المخطط لها حتى تاريخ أمس (من KPI Planned)
  // Earned Value: مجموع كل القيم ال KPI Actual حتى تاريخ أمس
  const calculateWorkValueStatusNew_OLD = useCallback((project: Project): { total: number, planned: number, earned: number } => {
    let totalValue = 0
    let plannedValue = 0
    let earnedValue = 0
    
    if (!project.project_code) {
      return { total: 0, planned: 0, earned: 0 }
    }

    try {
      // ✅ Calculate yesterday date (end of yesterday)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      yesterday.setHours(23, 59, 59, 999)

      // ✅ STEP 1: Calculate Total Value from BOQ Activities (all activities, not filtered by date)
      if (allActivities.length > 0) {
        const projectActivities = allActivities.filter((activity: any) => matchesProject(activity, project))
        
        if (projectActivities.length > 0) {
          projectActivities.forEach((activity: any) => {
            const rawActivity = (activity as any).raw || {}
            
            // Get Total Value from activity
            const activityTotalValue = activity.total_value || 
                                     parseFloat(String(rawActivity['Total Value'] || '0').replace(/,/g, '')) || 
                                     0
            
            if (activityTotalValue > 0) {
              totalValue += activityTotalValue
            } else {
              // Calculate from Rate × Total Units if Total Value not available
              const rate = activity.rate || 
                          parseFloat(String(rawActivity['Rate'] || '0').replace(/,/g, '')) || 
                          0
              const totalUnits = activity.total_units || 
                              parseFloat(String(rawActivity['Total Units'] || '0').replace(/,/g, '')) || 
                              0
              
              if (rate > 0 && totalUnits > 0) {
                totalValue += rate * totalUnits
              }
            }
          })
        }
      }

      // ✅ STEP 2: If Total Value from BOQ is 0, calculate from all KPI Planned (not filtered by date)
      if (totalValue === 0 && allKPIs.length > 0) {
        const projectKPIs = allKPIs.filter((kpi: any) => matchesProject(kpi, project))
        
        const plannedKPIs = projectKPIs.filter((kpi: any) => {
          const inputType = String(
            kpi.input_type || 
            kpi['Input Type'] || 
            (kpi as any).raw?.['Input Type'] || 
            (kpi as any).raw?.['input_type'] ||
            ''
          ).trim().toLowerCase()
          return inputType === 'planned'
        })

        if (plannedKPIs.length > 0) {
          plannedKPIs.forEach((kpi: any) => {
            const rawKpi = (kpi as any).raw || {}
            const quantity = parseFloat(String(kpi.quantity || rawKpi['Quantity'] || '0').replace(/,/g, '')) || 0
            
            // Find related activity to get rate
            let rate = 0
            if (allActivities.length > 0) {
              const relatedActivity = allActivities.find((activity: any) => {
                if (!matchesProject(activity, project)) return false
                const kpiActivityName = kpi.activity_name || kpi['Activity Name'] || ''
                const activityName = activity.activity_name || activity['Activity Name'] || ''
                return kpiActivityName && activityName && kpiActivityName.toLowerCase() === activityName.toLowerCase()
              })
              
              if (relatedActivity) {
                const rawActivity = (relatedActivity as any).raw || {}
                rate = relatedActivity.rate || 
                      parseFloat(String(rawActivity['Rate'] || '0').replace(/,/g, '')) || 
                      0
                
                if (rate === 0) {
                  const totalValue = relatedActivity.total_value || 
                                   parseFloat(String(rawActivity['Total Value'] || '0').replace(/,/g, '')) || 
                                   0
                  const totalUnits = relatedActivity.total_units || 
                                  parseFloat(String(rawActivity['Total Units'] || '0').replace(/,/g, '')) || 
                                  0
                  if (totalUnits > 0 && totalValue > 0) {
                    rate = totalValue / totalUnits
                  }
                }
              }
            }
            
            // Calculate value: rate × quantity or use kpi.value
            let kpiValue = 0
            if (rate > 0 && quantity > 0) {
              kpiValue = rate * quantity
            } else {
              kpiValue = parseFloat(String(kpi.value || rawKpi['Value'] || '0').replace(/,/g, '')) || 0
            }
            
            totalValue += kpiValue
          })
        }
      }

      // ✅ STEP 3: Calculate Planned Value from KPI Planned until yesterday
      if (allKPIs.length > 0) {
        const projectKPIs = allKPIs.filter((kpi: any) => matchesProject(kpi, project))
        
        const plannedKPIs = projectKPIs.filter((kpi: any) => {
          // Check if it's Planned
          const inputType = String(
            kpi.input_type || 
            kpi['Input Type'] || 
            (kpi as any).raw?.['Input Type'] || 
            (kpi as any).raw?.['input_type'] ||
            ''
          ).trim().toLowerCase()
          
          if (inputType !== 'planned') {
            return false
          }
          
          // ✅ Filter by date: only KPIs until yesterday
          const rawKpi = (kpi as any).raw || {}
          const kpiDateStr = kpi.activity_date ||
                            kpi.target_date ||
                            rawKpi['Activity Date'] ||
                            rawKpi['Target Date'] ||
                            rawKpi['Day'] ||
                            kpi.day ||
                            ''
          
          if (kpiDateStr) {
            const kpiDate = parseDateString(kpiDateStr)
            if (kpiDate && kpiDate > yesterday) {
              return false // Skip KPIs after yesterday
            }
          }
          
          return true
        })

        if (plannedKPIs.length > 0) {
          plannedKPIs.forEach((kpi: any) => {
            const rawKpi = (kpi as any).raw || {}
            const quantity = parseFloat(String(kpi.quantity || rawKpi['Quantity'] || '0').replace(/,/g, '')) || 0
            
            // Find related activity to get rate
            let rate = 0
            if (allActivities.length > 0) {
              const relatedActivity = allActivities.find((activity: any) => {
                if (!matchesProject(activity, project)) return false
                const kpiActivityName = kpi.activity_name || kpi['Activity Name'] || ''
                const activityName = activity.activity_name || activity['Activity Name'] || ''
                return kpiActivityName && activityName && kpiActivityName.toLowerCase() === activityName.toLowerCase()
              })
              
              if (relatedActivity) {
                const rawActivity = (relatedActivity as any).raw || {}
                rate = relatedActivity.rate || 
                      parseFloat(String(rawActivity['Rate'] || '0').replace(/,/g, '')) || 
                      0
                
                if (rate === 0) {
                  const totalValue = relatedActivity.total_value || 
                                   parseFloat(String(rawActivity['Total Value'] || '0').replace(/,/g, '')) || 
                                   0
                  const totalUnits = relatedActivity.total_units || 
                                  parseFloat(String(rawActivity['Total Units'] || '0').replace(/,/g, '')) || 
                                  0
                  if (totalUnits > 0 && totalValue > 0) {
                    rate = totalValue / totalUnits
                  }
                }
              }
            }
            
            // Calculate value: rate × quantity or use kpi.value
            let kpiValue = 0
            if (rate > 0 && quantity > 0) {
              kpiValue = rate * quantity
            } else {
              kpiValue = parseFloat(String(kpi.value || rawKpi['Value'] || '0').replace(/,/g, '')) || 0
            }
            
            plannedValue += kpiValue
          })
        }
      }

      // ✅ STEP 4: Calculate Earned Value from KPI Actual until yesterday
      if (allKPIs.length > 0) {
        const projectKPIs = allKPIs.filter((kpi: any) => matchesProject(kpi, project))
        
        const actualKPIs = projectKPIs.filter((kpi: any) => {
          // Check if it's Actual
          const inputType = String(
            kpi.input_type || 
            kpi['Input Type'] || 
            (kpi as any).raw?.['Input Type'] || 
            (kpi as any).raw?.['input_type'] ||
            ''
          ).trim().toLowerCase()
          
          if (inputType !== 'actual') {
            return false
          }
          
          // ✅ Filter by date: only KPIs until yesterday
          const rawKpi = (kpi as any).raw || {}
          const kpiDateStr = kpi.activity_date ||
                            kpi.target_date ||
                            rawKpi['Activity Date'] ||
                            rawKpi['Target Date'] ||
                            rawKpi['Day'] ||
                            kpi.day ||
                            ''
          
          if (kpiDateStr) {
            const kpiDate = parseDateString(kpiDateStr)
            if (kpiDate && kpiDate > yesterday) {
              return false // Skip KPIs after yesterday
            }
          }
          
          return true
        })

        if (actualKPIs.length > 0) {
          actualKPIs.forEach((kpi: any) => {
            const rawKpi = (kpi as any).raw || {}
            const quantity = parseFloat(String(kpi.quantity || rawKpi['Quantity'] || '0').replace(/,/g, '')) || 0
            
            // Find related activity to get rate
            let rate = 0
            if (allActivities.length > 0) {
              const relatedActivity = allActivities.find((activity: any) => {
                if (!matchesProject(activity, project)) return false
                const kpiActivityName = kpi.activity_name || kpi['Activity Name'] || ''
                const activityName = activity.activity_name || activity['Activity Name'] || ''
                return kpiActivityName && activityName && kpiActivityName.toLowerCase() === activityName.toLowerCase()
              })
              
              if (relatedActivity) {
                const rawActivity = (relatedActivity as any).raw || {}
                rate = relatedActivity.rate || 
                      parseFloat(String(rawActivity['Rate'] || '0').replace(/,/g, '')) || 
                      0
                
                if (rate === 0) {
                  const totalValue = relatedActivity.total_value || 
                                   parseFloat(String(rawActivity['Total Value'] || '0').replace(/,/g, '')) || 
                                   0
                  const totalUnits = relatedActivity.total_units || 
                                  parseFloat(String(rawActivity['Total Units'] || '0').replace(/,/g, '')) || 
                                  0
                  if (totalUnits > 0 && totalValue > 0) {
                    rate = totalValue / totalUnits
                  }
                }
              }
            }
            
            // Calculate value: rate × quantity or use kpi.value
            let kpiValue = 0
            if (rate > 0 && quantity > 0) {
              kpiValue = rate * quantity
            } else {
              kpiValue = parseFloat(String(kpi.value || rawKpi['Value'] || '0').replace(/,/g, '')) || 0
            }
            
            earnedValue += kpiValue
          })
        }
      }
    } catch (error) {
      console.error('Error calculating work value status:', error)
    }
    
    return { total: totalValue, planned: plannedValue, earned: earnedValue }
  }, [allActivities, allKPIs, matchesProject])

  // ✅ OLD: Calculate work value status with intelligent calculations (kept for backward compatibility)
  const calculateWorkValueStatusOld = (project: Project): { planned: number, done: number, source: string } => {
    let plannedValue = 0
    let doneValue = 0
    let source = 'none'
    
    if (!project.project_code) {
      return { planned: 0, done: 0, source: 'none' }
    }

    try {
      // ✅ METHOD 1: From BOQ Activities - Direct values (Most Accurate)
      if (allActivities.length > 0) {
        const projectActivities = allActivities.filter((activity: any) => matchesProject(activity, project))
        
        if (projectActivities.length > 0) {
          projectActivities.forEach((activity: any) => {
            const planned = activity.planned_value || 0
            const earned = activity.earned_value || 0
            
            plannedValue += planned
            doneValue += earned
          })
          
          if (plannedValue > 0 || doneValue > 0) {
            source = 'activities_direct'
          }
          
          // ✅ METHOD 1B: Calculate from Units × Rate (if direct values not available)
          if (plannedValue === 0 && doneValue === 0) {
            projectActivities.forEach((activity: any) => {
              const plannedUnits = activity.planned_units || 0
              const actualUnits = activity.actual_units || 0
              const rate = activity.rate || 0
              
              // Also try total_value / total_units to get rate if rate not available
              let effectiveRate = rate
              if (effectiveRate === 0) {
                const totalValue = activity.total_value || 0
                const totalUnits = activity.total_units || 0
                if (totalUnits > 0 && totalValue > 0) {
                  effectiveRate = totalValue / totalUnits
                }
              }
              
              if (effectiveRate > 0) {
                if (plannedUnits > 0) {
                  plannedValue += plannedUnits * effectiveRate
                }
                if (actualUnits > 0) {
                  doneValue += actualUnits * effectiveRate
                }
              }
            })
            
            if (plannedValue > 0 || doneValue > 0) {
              source = 'activities_calculated'
            }
          }
          
          // ✅ METHOD 1C: Use total_value as fallback
          if (plannedValue === 0 && doneValue === 0) {
            projectActivities.forEach((activity: any) => {
              const totalValue = activity.total_value || 0
              
              // If no planned/earned, assume total_value is planned and calculate done from progress
              if (totalValue > 0) {
                plannedValue += totalValue
                
                const progress = activity.activity_progress_percentage || 0
                if (progress > 0) {
                  doneValue += (totalValue * progress) / 100
                }
              }
            })
            
            if (plannedValue > 0 || doneValue > 0) {
              source = 'activities_total'
            }
          }
        }
      }
      
      // ✅ METHOD 2: From KPIs (Value + Quantity × Rate)
      if (plannedValue === 0 && doneValue === 0 && allKPIs.length > 0) {
        const projectKPIs = allKPIs.filter((kpi: any) => matchesProject(kpi, project))
        
        if (projectKPIs.length > 0) {
          projectKPIs.forEach((kpi: any) => {
            const inputType = String(kpi.input_type || kpi['Input Type'] || '').trim()
            const quantity = kpi.quantity || 0
            const rate = kpi.rate || 0
            const value = kpi.value || 0
            
            // Prioritize value, then calculate from quantity × rate
            let kpiValue = value
            if (kpiValue === 0 && rate > 0 && quantity > 0) {
              kpiValue = quantity * rate
            }
            
            // Also try to find rate from related activity if not in KPI
            if (kpiValue === 0 && quantity > 0 && allActivities.length > 0) {
              const relatedActivity = allActivities.find((activity: any) => {
                if (!matchesProject(activity, project)) return false
                const kpiActivityName = kpi.activity_name || kpi['Activity Name'] || ''
                const activityName = activity.activity_name || activity['Activity Name'] || ''
                return kpiActivityName && activityName && kpiActivityName.toLowerCase() === activityName.toLowerCase()
              })
              
              if (relatedActivity) {
                const activityRate = relatedActivity.rate || 0
                if (activityRate === 0) {
                  const totalValue = relatedActivity.total_value || 0
                  const totalUnits = relatedActivity.total_units || 0
                  if (totalUnits > 0 && totalValue > 0) {
                    kpiValue = quantity * (totalValue / totalUnits)
                  }
                } else {
                  kpiValue = quantity * activityRate
                }
              }
            }
            
            if (inputType === 'Planned') {
              plannedValue += kpiValue
            } else if (inputType === 'Actual') {
              doneValue += kpiValue
            }
          })
          
          if (plannedValue > 0 || doneValue > 0) {
            source = 'kpis'
          }
        }
      }
      
      // ✅ METHOD 3: Calculate from Contract Amount × Progress (Smart estimation)
      if (plannedValue === 0 && doneValue === 0) {
        const contractAmt = parseFloat(String(
          project.contract_amount || 
          getProjectField(project, 'Contract Amount') || 
          '0'
        ).replace(/,/g, '')) || 0
        
        if (contractAmt > 0) {
          plannedValue = contractAmt
          
          // Estimate done value from progress
          const progress = parseFloat(String(
            getProjectField(project, 'Actual Progress') || 
            getProjectField(project, 'Progress') || 
            '0'
          ).replace(/,/g, '')) || 0
          
          if (progress > 0) {
            doneValue = (contractAmt * progress) / 100
            source = 'contract_estimated'
          } else {
            // Use time-based estimation
            const plannedDates = getPlannedDatesFromKPIs(project)
            const plannedStart = plannedDates.start || getProjectField(project, 'Planned Start Date') || ''
            const plannedCompletion = plannedDates.completion || getProjectField(project, 'Planned Completion Date') || ''
            const actualStart = getActualDatesFromKPIs(project).start || getProjectField(project, 'Actual Start Date') || ''
            
            if (plannedStart && plannedCompletion) {
              const startDate = new Date(plannedStart)
              const endDate = new Date(plannedCompletion)
              const today = new Date()
              
              if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
                const totalDuration = endDate.getTime() - startDate.getTime()
                const elapsedDuration = actualStart 
                  ? (today.getTime() - new Date(actualStart).getTime())
                  : (today.getTime() - startDate.getTime())
                
                if (totalDuration > 0) {
                  const timeProgress = Math.min(100, Math.max(0, (elapsedDuration / totalDuration) * 100))
                  doneValue = (contractAmt * timeProgress) / 100
                  source = 'contract_time_estimated'
                }
              }
            }
          }
        }
      }
      
      // ✅ METHOD 4: From project fields (Final fallback)
      if (plannedValue === 0 && doneValue === 0) {
        plannedValue = parseFloat(String(
          getProjectField(project, 'Planned Work Value') || 
          getProjectField(project, 'Value of Planned Work') ||
          getProjectField(project, 'Planned Value') ||
          getProjectField(project, 'Budget Amount') ||
          '0'
        ).replace(/,/g, '')) || 0
        
        doneValue = parseFloat(String(
          getProjectField(project, 'Work Done Value') || 
          getProjectField(project, 'Value of Work Done') ||
          getProjectField(project, 'Earned Value') ||
          getProjectField(project, 'Actual Work Value') ||
          '0'
        ).replace(/,/g, '')) || 0
        
        if (plannedValue > 0 || doneValue > 0) {
          source = 'project_fields'
        }
      }
      
    } catch (error) {
      console.error('Error calculating work value:', error)
    }
    
    return { planned: plannedValue, done: doneValue, source }
  }

  // ✅ SMART Helper: Get planned dates from multiple intelligent sources - OPTIMIZED with useCallback
  const getPlannedDatesFromActivities = useCallback((project: Project): { start: string | null, completion: string | null, duration: number, source: string } => {
    let plannedStart: string | null = null
    let plannedCompletion: string | null = null
    let duration = 0
    let source = 'none'
    
    if (!project.project_code) {
      return { start: null, completion: null, duration: 0, source: 'none' }
    }

    try {
      // ✅ METHOD 1: From BOQ Activities (Primary Source)
      if (allActivities.length > 0) {
        // ✅ PERFORMANCE: Only log in development mode and very rarely
        if (process.env.NODE_ENV === 'development' && Math.random() < 0.01) {
          console.log(`🔍 [${project.project_code}] getPlannedDatesFromActivities - BEFORE filtering:`, {
            allActivitiesCount: allActivities.length,
            projectCode: project.project_code,
            projectSubCode: project.project_sub_code,
            firstFewActivities: allActivities.slice(0, 3).map((a: any) => ({
              projectCode: a.project_code || a['Project Code'] || a.raw?.['Project Code'],
              projectFullCode: a.project_full_code || a['Project Full Code'] || a.raw?.['Project Full Code'],
              activityName: a.activity_name,
              hasRaw: !!a.raw,
              rawKeys: a.raw ? Object.keys(a.raw).slice(0, 10) : []
            }))
          })
        }
        
        const projectActivities = allActivities.filter((activity: any) => {
          const matches = matchesProject(activity, project)
          return matches
        })
        
        // ✅ PERFORMANCE: Only log in development mode and very rarely
        if (process.env.NODE_ENV === 'development' && Math.random() < 0.01) {
          console.log(`🔍 [${project.project_code}] Matching Activities - AFTER filtering:`, {
            allActivitiesCount: allActivities.length,
            projectActivitiesCount: projectActivities.length,
            projectCode: project.project_code,
            projectSubCode: project.project_sub_code,
            sampleProjectActivity: projectActivities[0] ? {
              projectCode: projectActivities[0].project_code || projectActivities[0]['Project Code'],
              projectFullCode: projectActivities[0].project_full_code || projectActivities[0]['Project Full Code'],
              activityName: projectActivities[0].activity_name,
              plannedStart: projectActivities[0].planned_activity_start_date || projectActivities[0]['Planned Activity Start Date'],
              deadline: projectActivities[0].deadline || projectActivities[0]['Deadline'],
              rawPlannedStart: projectActivities[0].raw?.['Planned Activity Start Date'],
              rawDeadline: projectActivities[0].raw?.['Deadline'],
              allRawKeys: projectActivities[0].raw ? Object.keys(projectActivities[0].raw).filter(k => 
                k.toLowerCase().includes('date') || k.toLowerCase().includes('deadline') || k.toLowerCase().includes('start') || k.toLowerCase().includes('completion')
              ) : []
            } : null
          })
        }
        
        if (projectActivities.length > 0) {
          const activitiesWithDates = projectActivities
            .map((activity: any) => {
              // Try all possible field variations
              const rawActivity = (activity as any).raw || {}
              
              // ✅ EXPANDED: Try ALL possible field names for start date (PRIORITY ORDER)
              // Priority 1: From mapped fields (snake_case)
              let start = activity.planned_activity_start_date || 
                           activity.activity_planned_start_date || 
                           activity.planned_start_date ||
                           ''
              
              // Priority 2: From raw database row (with spaces - EXACT MATCH)
              if (!start || start === '' || start === 'N/A' || start === 'null') {
                start = rawActivity['Planned Activity Start Date'] ||
                       rawActivity['PlannedActivityStartDate'] ||
                       rawActivity['Activity Planned Start Date'] ||
                       rawActivity['ActivityPlannedStartDate'] ||
                       ''
              }
              
              // Priority 3: From activity object with bracket notation
              if (!start || start === '' || start === 'N/A' || start === 'null') {
                start = activity['Planned Activity Start Date'] ||
                       activity['PlannedActivityStartDate'] ||
                       activity['Activity Planned Start Date'] ||
                       activity['ActivityPlannedStartDate'] ||
                       activity['Planned Start Date'] ||
                       activity['Start Date'] ||
                       ''
              }
              
              // ✅ EXPANDED: Try ALL possible field names for end date (PRIORITY ORDER)
              // Priority 1: From mapped fields (snake_case)
              let end = activity.deadline || 
                         activity.activity_planned_completion_date || 
                         activity.planned_completion_date ||
                       activity.completion_date ||
                       ''
              
              // Priority 2: From raw database row (with spaces - EXACT MATCH)
              if (!end || end === '' || end === 'N/A' || end === 'null') {
                end = rawActivity['Deadline'] ||
                     rawActivity['Activity Planned Completion Date'] ||
                     rawActivity['ActivityPlannedCompletionDate'] ||
                     rawActivity['Activity Actual Completion Date'] ||
                     rawActivity['ActivityActualCompletionDate'] ||
                     rawActivity['Planned Completion Date'] ||
                     rawActivity['Completion Date'] ||
                     ''
              }
              
              // Priority 3: From activity object with bracket notation
              if (!end || end === '' || end === 'N/A' || end === 'null') {
                end = activity['Deadline'] ||
                     activity['Activity Planned Completion Date'] ||
                     activity['ActivityPlannedCompletionDate'] ||
                     activity['Activity Actual Completion Date'] ||
                     activity['ActivityActualCompletionDate'] ||
                     activity['Planned Completion Date'] ||
                     activity['Completion Date'] ||
                     activity['End Date'] ||
                     ''
              }
              
              const dur = activity.calendar_duration || 
                         rawActivity['Calendar Duration'] ||
                         activity['CalendarDuration'] ||
                         0
              
              // ✅ PERFORMANCE: Only log in development mode and very rarely
              if (process.env.NODE_ENV === 'development' && Math.random() < 0.01 && project.project_code === 'P9999') {
                console.log(`🔍 [${project.project_code}] Activity Date Extraction for "${activity.activity_name}":`, {
                  activityName: activity.activity_name,
                  projectCode: activity.project_code,
                  projectFullCode: activity.project_full_code,
                  rawFields: {
                    'planned_activity_start_date': activity.planned_activity_start_date,
                    'Planned Activity Start Date': activity['Planned Activity Start Date'],
                    'deadline': activity.deadline,
                    'Deadline': activity['Deadline'],
                    'raw.Planned Activity Start Date': rawActivity['Planned Activity Start Date'],
                    'raw.Deadline': rawActivity['Deadline'],
                    'raw keys': Object.keys(rawActivity).filter(k => k.toLowerCase().includes('date') || k.toLowerCase().includes('deadline'))
                  },
                  extractedStart: start,
                  extractedEnd: end,
                  hasStart: !!(start && start !== ''),
                  hasEnd: !!(end && end !== '')
                })
              }
              
              // ✅ CRITICAL: Return activity even if dates are empty (for debugging)
              // We'll filter later after checking if we extracted anything
              return { start, end, duration: dur, hasValue: activity.has_value !== false, activity: activity }
            })
            // ✅ Only filter out activities with NO dates at all (after extraction attempts)
            .filter(item => {
              const hasStart = item.start && item.start !== '' && item.start !== 'N/A' && item.start !== 'null'
              const hasEnd = item.end && item.end !== '' && item.end !== 'N/A' && item.end !== 'null'
              return hasStart || hasEnd
            })
          
          if (activitiesWithDates.length > 0) {
            // Prioritize activities with value (has_value = true)
            const valuableActivities = activitiesWithDates.filter(a => a.hasValue)
            const activitiesToUse = valuableActivities.length > 0 ? valuableActivities : activitiesWithDates
            
            const validStarts = activitiesToUse
              .map(a => parseDateString(a.start))
              .filter((d): d is Date => d !== null && !isNaN(d.getTime()))
            
            const validEnds = activitiesToUse
              .map(a => parseDateString(a.end))
              .filter((d): d is Date => d !== null && !isNaN(d.getTime()))
            
            if (validStarts.length > 0) {
              plannedStart = new Date(Math.min(...validStarts.map(d => d.getTime()))).toISOString()
            }
            
            if (validEnds.length > 0) {
              plannedCompletion = new Date(Math.max(...validEnds.map(d => d.getTime()))).toISOString()
            }
            
            if (plannedStart && plannedCompletion) {
              const startDate = new Date(plannedStart)
              const endDate = new Date(plannedCompletion)
              if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
                duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
              }
            }
            
            // Sum calendar_duration if calculated duration is 0
            if (duration === 0) {
              duration = activitiesToUse.reduce((sum, a) => sum + (a.duration || 0), 0)
            }
            
            if (plannedStart || plannedCompletion) {
              source = 'activities'
            }
          }
        }
      }
      
      // ✅ METHOD 2: From KPIs (if activities don't have dates)
      if ((!plannedStart || !plannedCompletion) && allKPIs.length > 0) {
        const kpiDates = getPlannedDatesFromKPIs(project)
        
        if (kpiDates.start && !plannedStart) {
          plannedStart = kpiDates.start
          source = source === 'none' ? 'kpis' : 'activities_kpis'
        }
        
        if (kpiDates.completion && !plannedCompletion) {
          plannedCompletion = kpiDates.completion
          source = source === 'none' ? 'kpis' : 'activities_kpis'
        }
      }
      
      // ✅ METHOD 3: From Project Fields (Fallback)
      if (!plannedStart) {
        const projectStart = getProjectField(project, 'Planned Start Date') || 
                            getProjectField(project, 'Planned Start') || 
                            getProjectField(project, 'Project Start Date') ||
                            getProjectField(project, 'Start Date') ||
                            getProjectField(project, 'Commencement Date') ||
                            ''
        if (projectStart) {
          plannedStart = projectStart
          source = source === 'none' ? 'project_fields' : source
        }
      }
      
      if (!plannedCompletion) {
        const projectCompletion = getProjectField(project, 'Planned Completion Date') || 
                                 getProjectField(project, 'Planned Completion') ||
                                 getProjectField(project, 'Project End Date') ||
                                 getProjectField(project, 'End Date') ||
                                 getProjectField(project, 'Completion Date') ||
                                 ''
        if (projectCompletion) {
          plannedCompletion = projectCompletion
          source = source === 'none' ? 'project_fields' : source
        }
      }
      
      // ✅ METHOD 4: Calculate duration if dates available but duration not
      if (plannedStart && plannedCompletion && duration === 0) {
        const startDate = new Date(plannedStart)
        const endDate = new Date(plannedCompletion)
        if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
          duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        }
      }
      
      // ✅ METHOD 5: Estimate from Contract Duration field
      if (duration === 0) {
        const contractDuration = parseFloat(String(
          getProjectField(project, 'Contract Duration') || 
          getProjectField(project, 'Duration') ||
          '0'
        ).replace(/,/g, '')) || 0
        
        if (contractDuration > 0) {
          duration = contractDuration
          
          // If we have start but not completion, estimate completion
          if (plannedStart && !plannedCompletion) {
            const startDate = new Date(plannedStart)
            if (!isNaN(startDate.getTime())) {
              const endDate = new Date(startDate)
              endDate.setDate(endDate.getDate() + contractDuration)
              plannedCompletion = endDate.toISOString()
            }
          }
          
          // If we have completion but not start, estimate start
          if (plannedCompletion && !plannedStart) {
            const endDate = new Date(plannedCompletion)
            if (!isNaN(endDate.getTime())) {
              const startDate = new Date(endDate)
              startDate.setDate(startDate.getDate() - contractDuration)
              plannedStart = startDate.toISOString()
            }
          }
          
          if (duration > 0) {
            source = source === 'none' ? 'contract_duration' : source
          }
        }
      }
      
    } catch (error) {
      console.error('Error getting planned dates:', error)
    }
    
    return { start: plannedStart, completion: plannedCompletion, duration, source }
  }, [allActivities, allKPIs])

  // Status helpers
  const getProjectStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'on-going': return <Activity className="h-4 w-4 text-blue-500" />
      case 'on-hold': return <Clock className="h-4 w-4 text-yellow-500" />
      case 'cancelled': return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'upcoming': return <Calendar className="h-4 w-4 text-gray-500" />
      default: return <Building className="h-4 w-4 text-gray-500" />
    }
  }

  // ✅ Memoize divisions calculations for all projects (EXACT COPY from projectAnalytics.ts logic)
  const divisionsDataMap = useMemo(() => {
    const map = new Map<string, { divisionAmounts: Record<string, number>, divisionNames: Record<string, string> }>()
    
    // ✅ DEBUG: Log input data
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 DivisionsDataMap: Starting calculation for ${projects.length} projects`, {
        allActivitiesCount: allActivities.length
      })
    }
    
    // Early return if no data
    if (allActivities.length === 0) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ DivisionsDataMap: No Activities available, returning empty map')
      }
      return map
    }
    
    projects.forEach((project) => {
      // ✅ FIX: Use project_full_code as primary identifier (SAME AS workValueCalculator.ts)
      // This ensures P4110 and P4110-P are treated as separate projects
      let projectFullCode = (project.project_full_code || '').toString().trim()
      if (!projectFullCode) {
        // Build from project_code + project_sub_code if not available
      const projectCode = (project.project_code || '').toString().trim()
      const projectSubCode = (project.project_sub_code || '').toString().trim()
      if (projectSubCode) {
          if (projectSubCode.toUpperCase().startsWith(projectCode.toUpperCase())) {
          projectFullCode = projectSubCode
        } else if (projectSubCode.startsWith('-')) {
          projectFullCode = `${projectCode}${projectSubCode}`
        } else {
          projectFullCode = `${projectCode}-${projectSubCode}`
        }
        } else {
          projectFullCode = projectCode
        }
      }
      const projectFullCodeUpper = projectFullCode.toUpperCase()
      
      const projectCode = (project.project_code || '').toString().trim()
      const projectCodeUpper = projectCode.toUpperCase()
      
      // ✅ Step 2: Helper to extract project codes (SAME AS workValueCalculator.ts)
      // Priority: project_full_code first (most specific), then project_code (fallback)
      const extractProjectCodes = (item: any): string[] => {
        const codes: string[] = []
        const raw = (item as any).raw || {}
        
        // ✅ PRIORITY 1: Extract project_full_code (most specific - distinguishes P4110 from P4110-P)
        const fullCodeSources = [
          item.project_full_code,
          (item as any)['Project Full Code'],
          raw['Project Full Code']
        ]
        
        for (const source of fullCodeSources) {
          if (source) {
            const code = source.toString().trim()
            if (code) {
              codes.push(code)
              codes.push(code.toUpperCase())
              // If we have a full code, return immediately (don't add project_code)
              // This ensures P4110-P and P4110 are treated as different projects
              return Array.from(new Set(codes))
            }
          }
        }
        
        // ✅ PRIORITY 2: Extract project_code (fallback if no full code exists)
        const codeSources = [
          item.project_code,
          (item as any)['Project Code'],
          raw['Project Code']
        ]
        
        for (const source of codeSources) {
          if (source) {
            const code = source.toString().trim()
            if (code) {
              codes.push(code)
              codes.push(code.toUpperCase())
            }
          }
        }
        
        return Array.from(new Set(codes))
      }
      
      // ✅ Step 3: Helper to check if codes match (SAME AS workValueCalculator.ts)
      // CRITICAL: Use exact match for project_full_code to distinguish P4110 from P4110-P
      const codesMatch = (itemCodes: string[], targetCodes: string[]): boolean => {
        const targetCodesUpper = targetCodes.map(c => c.toUpperCase().trim())
        const itemCodesUpper = itemCodes.map(c => c.toUpperCase().trim())
          
        // ✅ First, try exact match (most important for project_full_code)
        for (const itemCode of itemCodesUpper) {
          if (targetCodesUpper.includes(itemCode)) {
            return true
          }
        }
        
        // ✅ Only if no exact match, check if one is a prefix of another
        // But ONLY if both don't have a dash (to avoid matching P4110 with P4110-P)
        for (const itemCode of itemCodesUpper) {
          for (const targetCode of targetCodesUpper) {
            // If both codes contain a dash, require exact match
            const itemHasDash = itemCode.includes('-')
            const targetHasDash = targetCode.includes('-')
            
            if (itemHasDash || targetHasDash) {
              // If either has a dash, only exact match is allowed
              if (itemCode === targetCode) {
            return true
          }
            } else {
              // If neither has a dash, allow prefix matching (for backward compatibility)
              if (itemCode.startsWith(targetCode) || targetCode.startsWith(itemCode)) {
            return true
          }
        }
          }
        }
        
        return false
      }
      
      // Build target codes for matching
      // ✅ CRITICAL: If project has project_full_code, use ONLY that (don't add project_code)
      // This ensures P4110 and P4110-P are treated as completely separate projects
      const targetCodes: string[] = []
      if (projectFullCodeUpper) {
        targetCodes.push(projectFullCodeUpper)
        // ✅ Only add project_code if it's different AND project_full_code was built from project_code + project_sub_code
        // If project_full_code exists directly in DB, don't add project_code to avoid false matches
        const hasDirectFullCode = project.project_full_code && project.project_full_code.toString().trim() !== ''
        if (!hasDirectFullCode && projectCodeUpper && projectCodeUpper !== projectFullCodeUpper) {
          // Only add project_code if we built project_full_code ourselves (fallback case)
          targetCodes.push(projectCodeUpper)
        }
      } else if (projectCodeUpper) {
        // If no project_full_code at all, use project_code
        targetCodes.push(projectCodeUpper)
      }
      
      // ✅ FIX: Calculate division amounts from KPIs Planned (as requested by user)
      // Step 4: Filter KPIs Planned for this project
      const projectKPIs = allKPIs.filter((kpi: any) => {
        const kpiCodes = extractProjectCodes(kpi)
        if (kpiCodes.length === 0) {
          return false
        }
        return codesMatch(kpiCodes, targetCodes)
      })
      
      // Filter only Planned KPIs
      const plannedKPIs = projectKPIs.filter((kpi: any) => {
        const inputType = String(
          kpi.input_type || 
          kpi['Input Type'] || 
          (kpi as any).raw?.['Input Type'] || 
          (kpi as any).raw?.['input_type'] ||
          ''
        ).trim().toLowerCase()
        return inputType === 'planned'
      })
      
      // ✅ DEBUG: Log KPI matching for first few projects
      if (process.env.NODE_ENV === 'development' && projects.indexOf(project) < 5) {
        console.log(`🔍 [${project.project_code}] KPI filtering:`, {
          projectFullCode,
          targetCodes: targetCodes,
          allKPIsCount: allKPIs.length,
          matchedKPIsCount: projectKPIs.length,
          plannedKPIsCount: plannedKPIs.length
        })
      }
      
      // Step 5: Calculate division amounts from ALL Activities (not just Planned KPIs)
      // ✅ FIX: Calculate from activities' total_value grouped by division
      const divisionAmounts: Record<string, number> = {}
      const divisionNames: Record<string, string> = {}
      
      // ✅ First, calculate from all activities in the project
      const projectActivities = allActivities.filter((activity: any) => {
        const activityCodes = extractProjectCodes(activity)
        return codesMatch(activityCodes, targetCodes)
      })
      
      projectActivities.forEach((activity: any) => {
        const rawActivity = (activity as any).raw || {}
        
        // Get division from activity
        const division = activity.activity_division || 
                        activity['Activity Division'] || 
                        rawActivity['Activity Division'] || 
                        rawActivity['activity_division'] || ''
        
        // Skip if no division found
        if (!division || division.trim() === '') {
          return
        }
        
        const divisionKey = division.trim().toLowerCase()
        const divisionName = division.trim()
        
        // Get total_value from activity
        const activityTotalValue = activity.total_value || 
                                 parseFloat(String(rawActivity['Total Value'] || '0').replace(/,/g, '')) || 
                                 0
        
        if (activityTotalValue > 0) {
          if (!divisionNames[divisionKey]) {
            divisionNames[divisionKey] = divisionName
          }
          divisionAmounts[divisionKey] = (divisionAmounts[divisionKey] || 0) + activityTotalValue
        } else {
          // Calculate from Rate × Total Units if Total Value not available
          const rate = activity.rate || 
                      parseFloat(String(rawActivity['Rate'] || '0').replace(/,/g, '')) || 
                      0
          const totalUnits = activity.total_units || 
                          activity.planned_units ||
                          parseFloat(String(rawActivity['Total Units'] || rawActivity['Planned Units'] || '0').replace(/,/g, '')) || 
                          0
          
          if (rate > 0 && totalUnits > 0) {
            const calculatedValue = rate * totalUnits
            if (calculatedValue > 0) {
              if (!divisionNames[divisionKey]) {
                divisionNames[divisionKey] = divisionName
              }
              divisionAmounts[divisionKey] = (divisionAmounts[divisionKey] || 0) + calculatedValue
            }
          }
        }
      })
      
      // ✅ Fallback: If no activities found or division amounts are empty, calculate from Planned KPIs
      if (Object.keys(divisionAmounts).length === 0) {
        plannedKPIs.forEach((kpi: any) => {
        const rawKPI = (kpi as any).raw || {}
        
        // ✅ Get division from KPI - Use "Activity Division" (same as KPITracking.tsx)
        const division = kpi.activity_division || 
                        kpi['Activity Division'] || 
                        rawKPI['Activity Division'] || 
                        rawKPI['activity_division'] || ''
        
        // Skip if no division found
        if (!division || division.trim() === '') {
          return
        }
        
        const divisionKey = division.trim().toLowerCase()
        const divisionName = division.trim()
        
        // ✅ Get Planned Value from KPI (SAME LOGIC AS BOQManagement.tsx and workValueCalculator.ts)
        // Get Quantity
        const quantity = parseFloat(String(kpi.quantity || rawKPI['Quantity'] || '0').replace(/,/g, '')) || 0
        
        // Find matching activity to get Rate
        let rate = 0
        const matchingActivity = allActivities.find((activity: any) => {
          const activityCodes = extractProjectCodes(activity)
          if (!codesMatch(activityCodes, targetCodes)) return false
          
          const kpiActivityName = (kpi.activity_name || rawKPI['Activity Name'] || '').toLowerCase().trim()
          const activityName = (activity.activity_name || activity.activity || '').toLowerCase().trim()
          if (!kpiActivityName || !activityName || kpiActivityName !== activityName) return false
          
          // Zone matching (flexible)
          const kpiZone = (kpi.zone || rawKPI['Zone'] || '').toString().trim()
          const activityZone = (activity.zone_ref || activity.zone_number || activity.zone || '').toString().trim()
          if (activityZone && kpiZone && activityZone !== kpiZone) return false
          
          return true
        })
        
        if (matchingActivity) {
          const rawActivity = (matchingActivity as any).raw || {}
          const totalValueFromActivity = matchingActivity.total_value || 
                                       parseFloat(String(rawActivity['Total Value'] || '0').replace(/,/g, '')) || 
                                       0
          const totalUnits = matchingActivity.total_units || 
                          matchingActivity.planned_units ||
                          parseFloat(String(rawActivity['Total Units'] || rawActivity['Planned Units'] || '0').replace(/,/g, '')) || 
                          0
          
          if (totalUnits > 0 && totalValueFromActivity > 0) {
            rate = totalValueFromActivity / totalUnits
          } else if (matchingActivity.rate && matchingActivity.rate > 0) {
            rate = matchingActivity.rate
          } else {
            const rateFromRaw = parseFloat(String(rawActivity['Rate'] || '0').replace(/,/g, '')) || 0
            if (rateFromRaw > 0) rate = rateFromRaw
          }
        }
        
        let kpiValue = 0
        
        // ✅ PRIORITY 1: ALWAYS calculate from Quantity × Rate if both are available
        // This is the most accurate method as it uses the actual rate from the BOQ Activity
        if (rate > 0 && quantity > 0) {
          const calculatedValue = quantity * rate
          if (calculatedValue > 0) {
            kpiValue = calculatedValue
          }
        }
        
        // ✅ PRIORITY 2: Use Planned Value directly from KPI (fallback)
        if (kpiValue === 0) {
          const plannedValue = kpi.planned_value || parseFloat(String(rawKPI['Planned Value'] || '0').replace(/,/g, '')) || 0
          if (plannedValue > 0) {
            kpiValue = plannedValue
          }
        }
        
        // ✅ PRIORITY 3: Fallback to Value field if Planned Value is not available (but check if it's actually a quantity)
        if (kpiValue === 0) {
          // Try raw['Value'] (from database with capital V)
          if (rawKPI['Value'] !== undefined && rawKPI['Value'] !== null) {
            const val = rawKPI['Value']
            kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
          }
          
          // Try raw.value (from database with lowercase v)
          if (kpiValue === 0 && rawKPI.value !== undefined && rawKPI.value !== null) {
            const val = rawKPI.value
            kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
          }
          
          // Try k.value (direct property from ProcessedKPI)
          if (kpiValue === 0 && kpi.value !== undefined && kpi.value !== null) {
            const val = kpi.value
            kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
          }
          
          // ✅ CRITICAL CHECK: If Value equals Quantity, it means it's a quantity, not a financial value
          if (kpiValue > 0 && quantity > 0 && Math.abs(kpiValue - quantity) < 0.01) {
            // Value equals quantity, so it's not a real financial value - skip
            kpiValue = 0
          }
        }
        
        // ✅ PRIORITY 4: If still no rate, try to get Rate from KPI raw data and calculate
        if (kpiValue === 0 && quantity > 0) {
          const rateFromKPI = parseFloat(String(rawKPI['Rate'] || kpi.rate || '0').replace(/,/g, '')) || 0
          if (rateFromKPI > 0) {
            const calculatedFromKPIRate = quantity * rateFromKPI
            if (calculatedFromKPIRate > 0) {
              kpiValue = calculatedFromKPIRate
            }
          }
        }
        
        // Sum values for this division (only if we have a value)
        if (kpiValue > 0) {
          if (!divisionNames[divisionKey]) {
            divisionNames[divisionKey] = divisionName
          }
          divisionAmounts[divisionKey] = (divisionAmounts[divisionKey] || 0) + kpiValue
        }
      })
      }
      
      // Store in map (always store, even if empty, to ensure all projects are in the map)
      map.set(project.id, { divisionAmounts, divisionNames })
      
      // ✅ DEBUG: Log for first few projects to verify data is being calculated
      // ✅ Removed per-project divisions logging to reduce console noise
    })
    
    // ✅ Removed summary logging to reduce console noise
    
    return map
  }, [projects, allKPIs]) // ✅ FIX: Changed to use allKPIs since we now calculate from KPIs Planned

  // ✅ Render cell content - OPTIMIZED with useCallback
  // All calculated columns use analytics from calculateProjectAnalytics (same as Cards)
  // This ensures data consistency between Cards and Customize Columns
  const renderCell = useCallback((project: Project, column: ColumnConfig) => {
    // Get analytics for this project (calculated once per project)
    const analytics = projectsAnalytics.get(project.id)
    
    // ✅ Use the SAME helper functions as Cards (ModernProjectCard.tsx)
    // This ensures 100% consistency in formatting and calculations
    const formatCurrency = (amount: number) => {
      return formatCurrencyByCodeSync(amount, project.currency)
    }
    
    const formatPercent = (value: number) => {
      return `${value.toFixed(1)}%`
    }
    
    // ✅ Use the SAME progress calculation as Cards
    const progress = analytics?.actualProgress ?? analytics?.overallProgress ?? 0
    const totalActivities = analytics?.totalActivities ?? 0
    const totalKPIs = analytics?.totalKPIs ?? 0
    
    // ✅ PERFORMANCE: Debug logging removed for production performance
    
    try {
      switch (column.id) {
        case 'select':
          return (
            <input
              type="checkbox"
              checked={selectedIds.includes(project.id)}
              onChange={(e) => handleSelectOne(project.id, e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          )
        
        case 'project_code':
          // ✅ Display only Project Code (base code without sub-code)
          const projectCodeValue = project.project_code || 'N/A'
          
          return (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {projectCodeValue}
              </span>
                </div>
          )
        
        case 'full_project_code':
          // ✅ Display Full Project Code (Project Code + Sub Code)
          // Check if Project Full Code exists in database first
          let fullProjectCode = getProjectField(project, 'Project Full Code')
          
          // If not, construct it from project_code and project_sub_code
          if (!fullProjectCode || fullProjectCode === 'N/A' || fullProjectCode === '') {
            const projectCode = (project.project_code || '').trim()
            const projectSubCode = (project.project_sub_code || '').trim()
            
            // ✅ FIX: Handle cases where project_sub_code might already contain project_code
            // Check if project_sub_code already contains project_code at the start
            if (projectSubCode && projectSubCode.startsWith(projectCode)) {
              // project_sub_code already contains the full code (e.g., "P9999-01")
              // But check if it's duplicated (e.g., "P9999P9999-01")
              if (projectSubCode.startsWith(`${projectCode}${projectCode}`)) {
                // Remove duplicate project_code
                fullProjectCode = projectSubCode.replace(`${projectCode}${projectCode}`, projectCode)
              } else {
                // Already correct format
                fullProjectCode = projectSubCode
              }
            } else if (projectSubCode) {
              // project_sub_code is just the suffix (e.g., "-01" or "01")
              // Check if sub_code starts with "-" or not
              if (projectSubCode.startsWith('-')) {
                fullProjectCode = `${projectCode}${projectSubCode}`
              } else {
                fullProjectCode = `${projectCode}-${projectSubCode}`
              }
            } else {
              // No sub_code, use project_code only
              fullProjectCode = projectCode
            }
          } else {
            // ✅ FIX: Check if the fullProjectCode from database has duplicate project_code
            const projectCode = (project.project_code || '').trim()
            if (projectCode && fullProjectCode.includes(`${projectCode}${projectCode}`)) {
              // Remove duplicate project_code
              fullProjectCode = fullProjectCode.replace(`${projectCode}${projectCode}`, projectCode)
            }
          }
          
          return (
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {fullProjectCode || 'N/A'}
              </span>
                  </div>
          )
        
        case 'project_name':
          // ✅ FIX: Display project name directly (not activity name)
          // Get project name from multiple sources (for uploaded data compatibility)
          const projectName = project.project_name || 
                             getProjectField(project, 'Project Name') || 
                             (project as any).raw?.['Project Name'] || 
                             'N/A'
          
              return (
                <div className="font-medium text-gray-900 dark:text-white text-sm">
              {projectName}
              </div>
          )
        
        case 'project_description':
          // ✅ Display Project Description
          const projectDescription = project.project_description || getProjectField(project, 'Project Description') || 'N/A'
          
          return (
            <div className="text-sm text-gray-700 dark:text-gray-300">
              {projectDescription !== 'N/A' ? (
                <p className="line-clamp-2" title={projectDescription}>
                  {projectDescription}
                </p>
              ) : (
                <span className="text-gray-400 dark:text-gray-500">N/A</span>
              )}
                </div>
          )
        
        case 'plot_number':
          const plotNumber = project.plot_number || getProjectField(project, 'Plot Number') || getProjectField(project, 'Plot') || ''
          
          const handleCopyPlotNumber = async (e: React.MouseEvent) => {
            e.stopPropagation() // Prevent row selection when clicking
            if (!plotNumber || plotNumber === 'N/A') return
            
            try {
              await navigator.clipboard.writeText(plotNumber)
              setCopiedPlotNumber(plotNumber)
              // Clear feedback after 2 seconds
              setTimeout(() => {
                setCopiedPlotNumber(null)
              }, 2000)
            } catch (error) {
              console.error('Failed to copy plot number:', error)
            }
          }
          
          const isCopied = copiedPlotNumber === plotNumber
          
          return (
            <div>
              {plotNumber && plotNumber !== 'N/A' ? (
                <div 
                  onClick={handleCopyPlotNumber}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg inline-block cursor-pointer transition-all duration-200 ${
                    isCopied 
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                  title={isCopied ? 'Copied!' : 'Click to copy'}
                >
                  {isCopied ? '✓ Copied' : plotNumber}
                </div>
              ) : (
                <span className="text-gray-400 dark:text-gray-500 text-sm">N/A</span>
              )}
            </div>
          )
        
        case 'responsible_divisions':
          // ✅ Get divisions from project.responsible_division (from database)
          const divisionsRaw = project.responsible_division || ''
          const divisionsFromProject = divisionsRaw 
            ? divisionsRaw.split(',').map(d => d.trim()).filter(d => d.length > 0)
            : []
          
          // ✅ Get divisions from BOQ Activities for this project
          const divisionsFromBOQ = new Set<string>()
          if (allActivities.length > 0) {
            const projectActivities = allActivities.filter((activity: any) => matchesProject(activity, project))
            projectActivities.forEach((activity: any) => {
              const activityDivision = activity.activity_division || 
                                     (activity as any).raw?.['Activity Division'] ||
                                     (activity as any).raw?.['activity_division'] ||
                                     ''
              if (activityDivision && activityDivision.trim() !== '') {
                divisionsFromBOQ.add(activityDivision.trim())
              }
            })
          }
          
          // ✅ Merge divisions from project and BOQ (remove duplicates)
          const allDivisionsSet = new Set<string>()
          divisionsFromProject.forEach(d => allDivisionsSet.add(d))
          divisionsFromBOQ.forEach(d => allDivisionsSet.add(d))
          
          const allDivisionsList = Array.from(allDivisionsSet).sort()
          
          // If no divisions found, show N/A
          if (allDivisionsList.length === 0) {
            return (
              <span className="text-gray-400 dark:text-gray-500 text-sm">N/A</span>
            )
          }
          
          const divisionColors: { [key: string]: string } = {
            'Enabling Division': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
            'Infrastructure Division': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
            'Soil Improvement Division': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
            'Marine Division': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
          }
          
          return (
            <div className="flex flex-wrap gap-1.5">
              {allDivisionsList.map((division, index) => {
                const divisionColor = divisionColors[division] || 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300'
                return (
                  <span key={index} className={`px-2.5 py-1 text-xs font-medium rounded-full ${divisionColor}`}>
                    {division}
                  </span>
                )
              })}
            </div>
          )
        
        case 'scope_of_works':
          // ✅ FIX: Get scope from project_type_activities table (same source as BOQ Scope)
          // Strategy 1: Get from project.project_type field (if available)
          const projectTypeNamesRaw = project.project_type || 
                                     getProjectField(project, 'Project Type') || 
                                     (project as any).raw?.['Project Type'] || 
                                     ''
          
          // Strategy 2: Get from activities associated with this project
          // Find activities for this project from allActivities prop
          const projectActivitiesForScope = allActivities.filter((act: any) => {
            const actProjectCode = act.project_code || act['Project Code'] || (act as any).raw?.['Project Code'] || ''
            const actProjectFullCode = act.project_full_code || act['Project Full Code'] || (act as any).raw?.['Project Full Code'] || ''
            const projectCode = project.project_code || ''
            const projectFullCode = project.project_sub_code ? `${project.project_code}-${project.project_sub_code}` : project.project_code || ''
            
            // Match by project code or project full code
            return (actProjectCode === projectCode) || 
                   (actProjectFullCode === projectFullCode) ||
                   (actProjectFullCode?.startsWith(projectCode)) ||
                   (projectFullCode && actProjectFullCode?.startsWith(projectFullCode))
          })
          
          // Get unique activity names from project activities
          const projectActivityNames = Array.from(new Set(
            projectActivitiesForScope
              .map((act: any) => act.activity_name || act.activity || act['Activity Name'] || (act as any).raw?.['Activity Name'] || '')
              .filter((name: string) => name && name.trim() !== '')
          ))
          
          // ✅ PERFORMANCE: Only log in development mode and very rarely (0.1%)
          const shouldLog = process.env.NODE_ENV === 'development' && Math.random() < 0.001
          if (shouldLog) {
            console.log(`🔍 [${project.project_code}] Scope lookup - BEFORE processing:`, {
              projectTypeNamesRaw,
              projectTypeRaw: project.project_type,
              projectActivitiesCount: projectActivitiesForScope.length,
              projectActivityNames,
              projectTypesMapSize: projectTypesMap.size
            })
          }
          
          // 3. Get project types from activities using project_type_activities table
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
          
          // 4. Combine project types from project.project_type and from activities
          const allProjectTypeNames = new Set<string>()
          
          // Add from project.project_type field
          if (projectTypeNamesRaw && 
              projectTypeNamesRaw !== 'N/A' && 
              projectTypeNamesRaw.trim() !== '' && 
              projectTypeNamesRaw !== 'null' && 
              projectTypeNamesRaw !== 'undefined') {
            projectTypeNamesRaw
              .split(/,\s*/)
              .map((s: string) => s.trim())
              .filter((s: string) => s.length > 0 && s !== 'N/A' && s !== 'null' && s !== 'undefined')
              .forEach((typeName: string) => allProjectTypeNames.add(typeName))
          }
          
          // Add from activities
          projectTypesFromActivities.forEach((typeName: string) => allProjectTypeNames.add(typeName))
          
          const projectTypeNames = Array.from(allProjectTypeNames)
          
          if (shouldLog) {
            console.log(`🔍 [${project.project_code}] Scope lookup - AFTER processing:`, {
              projectTypeNames,
              count: projectTypeNames.length,
              fromProjectField: projectTypeNamesRaw ? projectTypeNamesRaw.split(/,\s*/).length : 0,
              fromActivities: projectTypesFromActivities.size
            })
          }
          
          // 5. Look up each project type name in project_types table
          const scopeList: string[] = []
          if (projectTypeNames.length > 0) {
            projectTypeNames.forEach((typeName: string) => {
              // Try exact match first
              const projectType = projectTypesMap.get(typeName)
              if (projectType) {
                scopeList.push(projectType.name)
              } else {
                // Try case-insensitive match
                let found = false
                Array.from(projectTypesMap.entries()).forEach(([key, value]) => {
                  if (key.toLowerCase() === typeName.toLowerCase()) {
                    scopeList.push(value.name)
                    found = true
                  }
                })
                // If not found in project_types table, use the original name as fallback
                if (!found) {
                  scopeList.push(typeName)
                }
              }
            })
          }
          
          // 6. If no scopes found, show N/A
          const finalScopeList = scopeList.length > 0 ? scopeList : ['N/A']
          
          // ✅ PERFORMANCE: Removed excessive logging
          
          const isExpanded = expandedScopes.has(project.id)
          const maxVisible = 3 // Show max 3 scopes initially
          const visibleScopes = isExpanded ? finalScopeList : finalScopeList.slice(0, maxVisible)
          const hasMore = finalScopeList.length > maxVisible
          
          const getScopeColor = (scope: string): string => {
            const scopeLower = scope.toLowerCase()
            if (scopeLower.includes('infrastructure') || scopeLower.includes('enabling')) {
              return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
            }
            if (scopeLower.includes('construction') || scopeLower.includes('excavation')) {
              return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
            }
            return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300'
          }
          
          const toggleExpand = (e: React.MouseEvent) => {
            e.stopPropagation()
            setExpandedScopes(prev => {
              const newSet = new Set(prev)
              if (newSet.has(project.id)) {
                newSet.delete(project.id)
              } else {
                newSet.add(project.id)
              }
              return newSet
            })
          }
          
          return (
            <div className="flex flex-wrap gap-1.5 items-center">
              {visibleScopes.map((scope, index) => {
                const scopeColor = getScopeColor(scope)
                return (
                  <span key={index} className={`px-2.5 py-1 text-xs font-medium rounded-full ${scopeColor}`}>
                    {scope}
                  </span>
                )
              })}
              {hasMore && (
                <button
                  onClick={toggleExpand}
                  className="px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
                  title={isExpanded ? 'Show Less' : `Show ${scopeList.length - maxVisible} more`}
                >
                  {isExpanded ? 'Show Less' : `+${scopeList.length - maxVisible}`}
                </button>
              )}
            </div>
          )
        
        case 'kpi_added':
          // ✅ Use EXACT same logic as calculateProjectAnalytics (from lib/projectAnalytics.ts)
          // This ensures 100% consistency and accuracy
          
          // Build project_full_code correctly (same as calculateProjectAnalytics)
          const projectCode = (project.project_code || '').toString().trim()
          const projectSubCode = (project.project_sub_code || '').toString().trim()
          
          // Build project_full_code (case-sensitive for exact matching)
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
          
          // Build project code for matching (uppercase for comparison)
          // IMPORTANT: Use Project Full Code for accurate matching with Sub Code
          const projectCodeUpper = projectCode.toUpperCase()
          const projectFullCodeUpper = projectFullCode.toUpperCase()
          
          // ✅ Use only Project Full Code for matching (handles Sub Code correctly)
          // This ensures P5066-I2 matches only KPIs with Project Full Code = "P5066-I2", not "P5066-I3"
          const projectCodeVariations = new Set<string>()
          projectCodeVariations.add(projectFullCodeUpper) // ✅ PRIMARY: Use project_full_code (includes Sub Code)
          
          // ✅ Only add Project Code if no Sub Code (for projects without sub codes)
          if (!projectSubCode) {
            projectCodeVariations.add(projectCodeUpper)
          }
          
          // ✅ Helper function to extract project code from any source
          // IMPORTANT: Prioritize Project Full Code for accurate matching with Sub Code
          const extractProjectCode = (item: any): string[] => {
            const codes: string[] = []
            const raw = (item as any).raw || {}
            
            // ✅ PRIORITY 1: Try Project Full Code first (MOST IMPORTANT - handles Sub Code correctly)
            const projectFullCode = item.project_full_code || 
                                   (item as any)['Project Full Code'] || 
                                   raw['Project Full Code'] || 
                                   ''
            
            if (projectFullCode) {
              const code = projectFullCode.toString().trim()
              if (code) {
                codes.push(code.toUpperCase()) // Use uppercase for comparison
              }
            }
            
            // ✅ PRIORITY 2: Fallback to Project Code only (if Project Full Code not found)
            // Only use this if Project Full Code is not available
            if (codes.length === 0) {
              const projectCode = item.project_code || 
                                (item as any)['Project Code'] || 
                                raw['Project Code'] || 
                                ''
              
              if (projectCode) {
                const code = projectCode.toString().trim()
                if (code) {
                  codes.push(code.toUpperCase()) // Use uppercase for comparison
                }
              }
            }
            
            // Remove duplicates
            return Array.from(new Set(codes))
          }
          
          // ✅ Helper function to check if codes match (STRICT matching using Project Full Code)
          // IMPORTANT: P5066-I2 means:
          // - P5066 = Project Code
          // - I2 = Sub Code (NOT Zone 2!)
          // - So Project Full Code = "P5066-I2"
          // - We must match EXACTLY by Project Full Code to avoid matching wrong projects
          const codesMatch = (itemCodes: string[], projectCodes: Set<string>): boolean => {
            for (const itemCode of itemCodes) {
              const itemCodeUpper = itemCode.toUpperCase().trim()
              
              // ✅ PRIORITY 1: Direct exact match with project_full_code (MOST IMPORTANT - handles Sub Code correctly)
              // This ensures P5066-I2 matches only KPIs with Project Full Code = "P5066-I2", not "P5066-I3"
              if (projectFullCodeUpper && itemCodeUpper === projectFullCodeUpper) {
                return true
              }
              
              // ✅ PRIORITY 2: If no Sub Code, match by Project Code only (exact match)
              // Only use this if project has no sub_code (to avoid matching wrong projects)
              if (!projectSubCode && projectCodeUpper && itemCodeUpper === projectCodeUpper) {
                return true
              }
              
              // ❌ REMOVED: All other matching strategies (starts with, contains, etc.)
              // These cause incorrect matching between projects with same code but different sub codes
              // Example: P5066-I2 should NOT match KPIs for P5066-I3
            }
            
            return false
          }
          
          // Filter KPIs using the same matching logic as calculateProjectAnalytics
          const projectKPIs = allKPIs.filter((k: any) => {
            const kpiCodes = extractProjectCode(k)
            if (kpiCodes.length === 0) return false
            return codesMatch(kpiCodes, projectCodeVariations)
          })
          
          // ✅ Check specifically for Planned KPIs (not Actual)
          const plannedKPIs = projectKPIs.filter((k: any) => {
            const inputType = (k.input_type || (k as any).raw?.['Input Type'] || '').toString().trim().toLowerCase()
            return inputType === 'planned'
          })
          const hasKPIs = plannedKPIs.length > 0
          const totalKPIs = plannedKPIs.length
          
          // ✅ PERFORMANCE: Only log in development mode and very rarely (0.1%)
          if (process.env.NODE_ENV === 'development' && Math.random() < 0.001) {
            console.log(`🔍 [${project.project_code}] KPI Added? Check:`, {
              projectCode,
              projectFullCode,
              allKPIsCount: allKPIs.length,
              foundKPIs: totalKPIs
            })
          }
          
          return (
            <div className="flex items-center gap-2">
              {hasKPIs ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-gray-900 dark:text-white">
                    Yes ({totalKPIs})
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-gray-900 dark:text-white">
                    No
                  </span>
                </>
              )}
            </div>
          )
        
        case 'project_status':
          // ✅ UPDATED: Project Status based on business rules
          // Rules:
          // 1. upcoming: Default status when project is created (no Actual KPIs)
          // 2. site-preparation: At least one activity started + at least one Actual KPI + activity is pre-commencement
          // 3. on-going: At least one post-commencement activity started + at least one Actual KPI
          // 4. completed-duration: Project completion date = today but project not completed yet
          // 5. contract-completed: Actual Quantity = Planned Quantity
          // 6. on-hold & cancelled: Manual (set from form)
          let calculatedStatus: string = project.project_status || 'upcoming'
          
          try {
            // ✅ STEP 1: Check manual statuses first (on-hold, cancelled)
            // These are set manually from form and don't change automatically
            const currentStatusFromDB = project.project_status || 'upcoming'
            if (currentStatusFromDB === 'on-hold' || currentStatusFromDB === 'cancelled') {
              calculatedStatus = currentStatusFromDB
            } else {
              // ✅ STEP 2: Get all KPIs for this project
              const projectKPIs = allKPIs.filter((kpi: any) => matchesProject(kpi, project))
              
              // ✅ STEP 3: Separate Planned and Actual KPIs
              const plannedKPIs = projectKPIs.filter((k: any) => {
                const inputType = String(
                  k.input_type || 
                  (k as any)['Input Type'] || 
                  (k as any).raw?.['Input Type'] || 
                  ''
                ).trim().toLowerCase()
                return inputType === 'planned'
              })
              
              const actualKPIs = projectKPIs.filter((k: any) => {
                const inputType = String(
                  k.input_type || 
                  (k as any)['Input Type'] || 
                  (k as any).raw?.['Input Type'] || 
                  ''
                ).trim().toLowerCase()
                return inputType === 'actual'
              })
              
              // ✅ STEP 4: Helper function to get Activity Timing from KPI
              const getActivityTiming = (kpi: any): 'pre-commencement' | 'post-commencement' | 'post-completion' | null => {
                const raw = (kpi as any).raw || {}
                let activityTiming = String(
                  kpi.activity_timing || 
                  (kpi as any)['Activity Timing'] ||
                  raw['Activity Timing'] ||
                  raw['activity_timing'] ||
                  ''
                ).trim().toLowerCase()
                
                if (!activityTiming || activityTiming === 'n/a' || activityTiming === '') {
                  return null
                }
                
                if (activityTiming.includes('pre-commencement') || activityTiming.includes('pre commencement')) {
                  return 'pre-commencement'
                } else if (activityTiming.includes('post-completion') || activityTiming.includes('post completion')) {
                  return 'post-completion'
                } else if (activityTiming.includes('post-commencement') || activityTiming.includes('post commencement')) {
                  return 'post-commencement'
                }
                
                return null
              }
              
              // ✅ STEP 5: Separate Actual KPIs by Activity Timing
              const preCommencementActualKPIs = actualKPIs.filter((k: any) => {
                const timing = getActivityTiming(k)
                return timing === 'pre-commencement'
              })
              
              const postCommencementActualKPIs = actualKPIs.filter((k: any) => {
                const timing = getActivityTiming(k)
                return timing === 'post-commencement'
              })
              
              // ✅ STEP 6: Calculate quantities
              const totalPlannedQuantity = plannedKPIs.reduce((sum: number, k: any) => {
                const qty = parseFloat(String(k.quantity || '0').replace(/,/g, '')) || 0
                return sum + qty
              }, 0)
              
              const totalActualQuantity = actualKPIs.reduce((sum: number, k: any) => {
                const qty = parseFloat(String(k.quantity || '0').replace(/,/g, '')) || 0
                return sum + qty
              }, 0)
              
              // ✅ STEP 7: Check project completion date
              const projectCompletionDate = project.project_completion_date || 
                                          getProjectField(project, 'Project Completion Date') || 
                                          getProjectField(project, 'Completion Date') ||
                                          getProjectField(project, 'End Date') ||
                                          null
              
              const today = new Date()
              today.setHours(0, 0, 0, 0)
              
              let todayIsCompletionDate = false
              if (projectCompletionDate) {
                const completionDate = new Date(projectCompletionDate)
                completionDate.setHours(0, 0, 0, 0)
                todayIsCompletionDate = completionDate.getTime() === today.getTime()
              }
              
              // ✅ STEP 8: Determine status based on business rules (priority order)
              
              // Rule 5: contract-completed: Actual Quantity = Planned Quantity
              if (totalPlannedQuantity > 0 && totalActualQuantity >= totalPlannedQuantity) {
                calculatedStatus = 'contract-completed'
              }
              // Rule 4: completed-duration: Project completion date = today but project not completed yet
              else if (todayIsCompletionDate && totalPlannedQuantity > 0 && totalActualQuantity < totalPlannedQuantity) {
                calculatedStatus = 'completed-duration'
              }
              // Rule 3: on-going: At least one post-commencement activity started + at least one Actual KPI
              else if (postCommencementActualKPIs.length > 0) {
                calculatedStatus = 'on-going'
              }
              // Rule 2: site-preparation: At least one activity started + at least one Actual KPI + activity is pre-commencement
              else if (preCommencementActualKPIs.length > 0) {
                calculatedStatus = 'site-preparation'
              }
              // Rule 1: upcoming: Default status (no Actual KPIs)
              else {
                calculatedStatus = 'upcoming'
              }
              
              // ✅ Update status in database if changed
              if (calculatedStatus !== currentStatusFromDB) {
                const reason = `Auto-calculated: Planned Qty=${totalPlannedQuantity.toLocaleString()}, Actual Qty=${totalActualQuantity.toLocaleString()}, Pre-Comm KPIs=${preCommencementActualKPIs.length}, Post-Comm KPIs=${postCommencementActualKPIs.length}, Today=Completion Date=${todayIsCompletionDate}`
                // ✅ تحديث الحالة في الداتابيز مع معالجة الأخطاء
                updateProjectStatusInDB(project.id, calculatedStatus, 100, reason)
                  .catch((err) => {
                    // Only log errors, not success messages to reduce console noise
                    if (process.env.NODE_ENV === 'development') {
                      console.error(`❌ [Status Update] Error updating ${project.project_code}:`, err)
                    }
                  })
              }
              
              // ✅ DEBUG: Log status calculation in development mode
              if (process.env.NODE_ENV === 'development' && Math.random() < 0.01) {
                console.log(`📊 [Project Status] ${project.project_code}:`, {
                  status: calculatedStatus,
                  oldStatus: currentStatusFromDB,
                  changed: calculatedStatus !== currentStatusFromDB,
                  totalPlannedQuantity,
                  totalActualQuantity,
                  preCommencementActualKPIs: preCommencementActualKPIs.length,
                  postCommencementActualKPIs: postCommencementActualKPIs.length,
                  projectCompletionDate: projectCompletionDate ? formatDate(projectCompletionDate) : 'N/A',
                  todayIsCompletionDate
                })
              }
            }
            
          } catch (error) {
            console.error(`❌ [Status Error] ${project.project_code}:`, error)
            calculatedStatus = project.project_status || 'upcoming'
          }
          
          // ✅ Display status with icon and color
          const statusText = getProjectStatusText(calculatedStatus)
          const projectStatusColor = getProjectStatusColor(calculatedStatus)
          const statusInfo = getStatusDisplayInfo(calculatedStatus as any)
          
          const StatusIcon = () => {
            const iconMap: Record<string, React.ReactNode> = {
              '⏳': <Clock className="h-3 w-3" />,
              '🏗️': <Building className="h-3 w-3" />,
              '🚀': <Activity className="h-3 w-3" />,
              '✅': <CheckCircle className="h-3 w-3" />,
              '⏰': <Clock className="h-3 w-3" />,
              '📋': <Target className="h-3 w-3" />,
              '⏸️': <Clock className="h-3 w-3" />,
              '❌': <AlertCircle className="h-3 w-3" />
            }
            return iconMap[statusInfo.icon] || <Info className="h-3 w-3" />
          }
          
          return (
            <div className="flex items-center gap-2">
              <StatusIcon />
              <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${projectStatusColor}`}>
                {statusText}
              </span>
            </div>
          )
        
        case 'contract_durations':
          // ✅ Display Project Start Date, Project Completion Date, and Project Duration from form
          // Get Project Start Date from form (project.project_start_date or form field)
          const projectStartDate = project.project_start_date || 
                                   getProjectField(project, 'Project Start Date') || 
                                   getProjectField(project, 'Start Date') ||
                                   ''
          
          // Get Project Completion Date from form (project.project_completion_date or form field)
          const projectCompletionDate = project.project_completion_date || 
                                      getProjectField(project, 'Project Completion Date') || 
                                      getProjectField(project, 'Completion Date') ||
                                      getProjectField(project, 'End Date') ||
                                      ''
          
          // Get Project Duration from form (project.project_duration or form field)
          let projectDuration = project.project_duration
          
          // If duration not set, calculate from dates
          if (projectDuration === undefined || projectDuration === null || projectDuration === 0) {
            if (projectStartDate && projectCompletionDate) {
              const startDate = new Date(projectStartDate)
              const completionDate = new Date(projectCompletionDate)
              if (!isNaN(startDate.getTime()) && !isNaN(completionDate.getTime())) {
                const diffTime = completionDate.getTime() - startDate.getTime()
                projectDuration = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 // Include both start and end days
              }
            }
          }
          
          // Fallback: Try to get duration from form field
          if (projectDuration === undefined || projectDuration === null || projectDuration === 0) {
            const durationFromField = parseFloat(String(
              getProjectField(project, 'Project Duration') || 
              getProjectField(project, 'Duration') ||
              '0'
            ).replace(/,/g, '')) || 0
            if (durationFromField > 0) {
              projectDuration = durationFromField
            }
          }
          
          return (
            <div className="space-y-1">
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Start: {projectStartDate ? formatDate(projectStartDate) : 'N/A'}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Completion: {projectCompletionDate ? formatDate(projectCompletionDate) : 'N/A'}
              </div>
              {projectDuration !== undefined && projectDuration !== null && projectDuration > 0 && (
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  Duration: {projectDuration} {projectDuration === 1 ? 'day' : 'days'}
                </div>
              )}
            </div>
          )
        
        case 'planned_dates':
          // ✅ NEW: Display Planned Dates from BOQ Activities and KPIs (Post-Commencement only)
          // تاريخ البداية: من BOQ Activities أو أول KPI Planned (Post-Commencement فقط)
          // تاريخ النهاية: آخر KPI Planned (Post-Commencement فقط)
          const plannedDates = getPlannedDatesForProject(project)
          const plannedStartDate = plannedDates.start
          const plannedCompletionDate = plannedDates.completion
          
          // Calculate duration if both dates are available
          let plannedDuration = 0
          if (plannedStartDate && plannedCompletionDate) {
            const startDate = new Date(plannedStartDate)
            const endDate = new Date(plannedCompletionDate)
            if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
              plannedDuration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1 // Include both start and end days
            }
          }
          
          return (
            <div className="space-y-1">
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Start: {plannedStartDate ? formatDate(plannedStartDate) : 'N/A'}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Completion: {plannedCompletionDate ? formatDate(plannedCompletionDate) : 'N/A'}
              </div>
              {plannedDuration > 0 && (
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  Duration: {plannedDuration} {plannedDuration === 1 ? 'day' : 'days'}
                </div>
              )}
            </div>
          )
        
        case 'actual_dates':
          // ✅ IMPROVED: Display Actual Dates with smart status messages
          // تاريخ البداية: من BOQ Activities أو أول KPI Actual
          // تاريخ النهاية: آخر KPI Actual
          const actualDates = getActualDatesForProject(project)
          const actualStartDate = actualDates.start
          const actualCompletionDate = actualDates.completion
          
          // ✅ Get actual progress to determine if project is completed
          const projectActualProgress = analytics?.actualProgress ?? analytics?.overallProgress ?? 0
          const isProjectCompleted = projectActualProgress >= 97
          
          // ✅ SMART STATUS: Determine project status based on dates and progress
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          
          // Case 1: Project hasn't started yet (no start date)
          if (!actualStartDate) {
            return (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400 italic">
                  Project Not Started
                </div>
              </div>
            )
          }
          
          // Case 2: Project started but not completed
          // Either no completion date OR progress < 97%
          if (actualStartDate && (!actualCompletionDate || !isProjectCompleted)) {
            const startDateObj = new Date(actualStartDate)
            startDateObj.setHours(0, 0, 0, 0)
            
            // Calculate days since start
            const daysSinceStart = Math.ceil((today.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24))
            
            return (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-500" />
                  <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
                    In Progress
                  </div>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Started: {formatDate(actualStartDate)}
                </div>
                {daysSinceStart >= 0 && (
                  <div className="text-xs text-gray-500 dark:text-gray-500">
                    {daysSinceStart} {daysSinceStart === 1 ? 'day' : 'days'} ongoing
                  </div>
                )}
                {!isProjectCompleted && projectActualProgress > 0 && (
                  <div className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                    {projectActualProgress.toFixed(1)}% complete
                  </div>
                )}
                {!isProjectCompleted && (
                  <div className="flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3 text-orange-500" />
                    <div className="text-xs text-orange-600 dark:text-orange-400 italic">
                      Project Not Completed
                    </div>
                  </div>
                )}
              </div>
            )
          }
          
          // Case 3: Project completed (has both start and completion dates AND progress >= 97%)
          // Calculate duration if both dates are available
          let actualDatesDuration = 0
          if (actualStartDate && actualCompletionDate) {
            const startDate = new Date(actualStartDate)
            const endDate = new Date(actualCompletionDate)
            if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
              actualDatesDuration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1 // Include both start and end days
            }
          }
          
          // ✅ Compare with planned dates if available (use same source as planned_dates column)
          const plannedDatesCompare = getPlannedDatesForProject(project)
          let plannedStartCompare = plannedDatesCompare.start || null
          let plannedCompletionCompare = plannedDatesCompare.completion || null
          
          let varianceInfo: { start?: number, completion?: number } | null = null
          if (actualStartDate && plannedStartCompare) {
            const actualStartDateObj = new Date(actualStartDate)
            const plannedStartDateObj = new Date(plannedStartCompare)
            if (!isNaN(actualStartDateObj.getTime()) && !isNaN(plannedStartDateObj.getTime())) {
              const startVariance = Math.ceil((actualStartDateObj.getTime() - plannedStartDateObj.getTime()) / (1000 * 60 * 60 * 24))
              varianceInfo = { start: startVariance }
            }
          }
          
          if (actualCompletionDate && plannedCompletionCompare) {
            const actualEndDateObj = new Date(actualCompletionDate)
            const plannedEndDateObj = new Date(plannedCompletionCompare)
            if (!isNaN(actualEndDateObj.getTime()) && !isNaN(plannedEndDateObj.getTime())) {
              const completionVariance = Math.ceil((actualEndDateObj.getTime() - plannedEndDateObj.getTime()) / (1000 * 60 * 60 * 24))
              if (!varianceInfo) varianceInfo = {}
              varianceInfo.completion = completionVariance
            }
          }
          
          return (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div className="text-xs font-medium text-green-600 dark:text-green-400">
                  Completed
                </div>
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Start: {formatDate(actualStartDate)}
                {varianceInfo?.start !== undefined && (
                  <span className={`ml-2 ${varianceInfo.start > 0 ? 'text-red-600 dark:text-red-400' : varianceInfo.start < 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                    ({varianceInfo.start > 0 ? '+' : ''}{varianceInfo.start} days)
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Completion: {formatDate(actualCompletionDate)}
                {varianceInfo?.completion !== undefined && (
                  <span className={`ml-2 ${varianceInfo.completion > 0 ? 'text-red-600 dark:text-red-400' : varianceInfo.completion < 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                    ({varianceInfo.completion > 0 ? '+' : ''}{varianceInfo.completion} days)
                  </span>
                )}
              </div>
              {actualDatesDuration > 0 && (
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  Duration: {actualDatesDuration} {actualDatesDuration === 1 ? 'day' : 'days'}
                </div>
              )}
            </div>
          )
        
        case 'progress_summary':
          // ✅ NEW: Use same business logic as Work Value Status
          // Planned Progress = (Planned Value / Total Value) × 100
          // Actual Progress = (Earned Value / Total Value) × 100
          // Variance = Actual Progress - Planned Progress
          // ✅ PERFORMANCE: Use pre-calculated workValueStatus from analytics (calculated once in ProjectsList)
          const workValueStatusForProgress = analytics?.workValueStatus || calculateWorkValueStatusNew(project)
          const totalValueForProgress = workValueStatusForProgress.total
          const totalPlannedValueForProgress = workValueStatusForProgress.planned
          const totalEarnedValueForProgress = workValueStatusForProgress.earned
          
          // Calculate progress percentages
          const progressPlanned = totalValueForProgress > 0 ? (totalPlannedValueForProgress / totalValueForProgress) * 100 : 0
          const progressActual = totalValueForProgress > 0 ? (totalEarnedValueForProgress / totalValueForProgress) * 100 : 0
          const varianceProgress = progressActual - progressPlanned
          
          const progress = {
            planned: progressPlanned,
            actual: progressActual,
            source: 'work_value_status'
          }
          
          // Determine status icon
          const getProgressStatusIcon = () => {
            if (progress.actual >= 100) {
              return <CheckCircle className="h-3 w-3 text-green-500" />
            } else if (progress.actual >= progress.planned) {
              return <TrendingUp className="h-3 w-3 text-green-500" />
            } else if (progress.actual >= progress.planned * 0.8) {
              return <Clock className="h-3 w-3 text-yellow-500" />
            } else {
              return <AlertCircle className="h-3 w-3 text-red-500" />
            }
          }
          
          // Get source indicator
          const getSourceIndicator = () => {
            if (progress.source === 'analytics') {
              return '📊 Analytics (Same as Cards)'
            }
            const sourceLabels: { [key: string]: string } = {
              'activities': '📊 Activities',
              'work_value': '💰 Work Value',
              'kpi_value': '📈 KPI Value',
              'kpi_quantity': '📊 KPI Qty',
              'time_based': '⏰ Time-based',
              'contract_estimated': '📋 Contract Est.',
              'project_field': '📝 Project Field'
            }
            return sourceLabels[progress.source] || ''
          }
          
          return (
            <div className="space-y-2">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600 dark:text-gray-400">Planned</span>
                  <span className="font-medium">{formatPercent(progress.planned)}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                  <div 
                    className="bg-blue-500 h-1.5 rounded-full transition-all" 
                    style={{ width: `${Math.min(100, Math.max(0, progress.planned))}%` }}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <span className="text-gray-600 dark:text-gray-400">Actual</span>
                    {getProgressStatusIcon()}
                  </div>
                  <span className="font-medium">{formatPercent(progress.actual)}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                  <div 
                    className={`h-1.5 rounded-full transition-all ${progress.actual >= progress.planned ? 'bg-green-500' : progress.actual >= progress.planned * 0.8 ? 'bg-yellow-500' : 'bg-orange-500'}`} 
                    style={{ width: `${Math.min(100, Math.max(0, progress.actual))}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className={`text-xs font-medium ${varianceProgress >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  Variance: {varianceProgress >= 0 ? '+' : ''}{formatPercent(varianceProgress)}
                </div>
              </div>
            </div>
          )
        
        case 'work_value_status':
          // ✅ Use correct business logic from workValueCalculator.ts
          // Total Value: مجموع كل Planned KPIs للمشروع بغض النظر عن أي شيء
          // Planned Value: مجموع كل Planned KPIs حتى تاريخ أمس، ولا يضع في الاعتبار Activity Commencement Relation
          // Earned Value: مجموع كل Actual KPIs
          // ✅ PERFORMANCE: Use pre-calculated workValueStatus from analytics (calculated once in ProjectsList)
          const workValueStatus = analytics?.workValueStatus || calculateWorkValueStatusNew(project)
          const totalValue = workValueStatus.total
          const totalPlannedValue = workValueStatus.planned
          const totalEarnedValue = workValueStatus.earned
          const totalRemainingValue = totalValue - totalEarnedValue
          const variance = totalEarnedValue - totalPlannedValue
          const actualProgress = totalValue > 0 ? (totalEarnedValue / totalValue) * 100 : 0
          const plannedProgress = totalValue > 0 ? (totalPlannedValue / totalValue) * 100 : 0
          
          return (
            <div className="space-y-2">
              {/* Total Value */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">Total Value</span>
                <span className="font-medium">{formatCurrency(totalValue)}</span>
              </div>
              
              {/* Planned Value */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">Planned Value</span>
                <span className="font-medium text-blue-600 dark:text-blue-400">{formatCurrency(totalPlannedValue)}</span>
              </div>
              
              {/* Earned Value */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">Earned Value</span>
                <span className="font-medium text-green-600 dark:text-green-400">{formatCurrency(totalEarnedValue)}</span>
              </div>
              
              {/* Remaining Value */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">Remaining Value</span>
                <span className="font-medium text-orange-600 dark:text-orange-400">{formatCurrency(totalRemainingValue)}</span>
              </div>
              
              {/* Variance */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-200 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Variance</span>
                <span className={`font-medium ${variance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatCurrency(variance)}
                </span>
              </div>
            </div>
          )
        
        case 'contract_amount':
          // ✅ Use the SAME calculation as Cards (ModernProjectCard.tsx)
          // Cards display: formatCurrency(project.contract_amount || 0)
          const contractAmt = analytics?.totalContractValue || 
                             parseFloat(String(
                               project.contract_amount || 
                               getProjectField(project, 'Contract Amount') || 
                               '0'
                             ).replace(/,/g, '')) || 0
          
          const variationsAmt = parseFloat(String(
            getProjectField(project, 'Variations Amount') || 
            getProjectField(project, 'Variations') || 
            '0'
          ).replace(/,/g, '')) || 0
          
          const totalContractAmt = contractAmt + variationsAmt
          
          return (
            <div className="space-y-1">
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Contract: {formatCurrency(contractAmt)}
              </div>
              {variationsAmt > 0 && (
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Variations: {formatCurrency(variationsAmt)}
                </div>
              )}
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                Total: {formatCurrency(totalContractAmt)}
              </div>
            </div>
          )
        
        case 'divisions_contract_amount':
          // ✅ Get pre-calculated divisions data from useMemo
          const divisionsData = divisionsDataMap.get(project.id)
          const divisionAmounts = divisionsData?.divisionAmounts || {}
          const divisionNames = divisionsData?.divisionNames || {}
          
          // ✅ DEBUG: Log to verify data is available for all projects
          if (process.env.NODE_ENV === 'development' && projects.indexOf(project) < 10) {
            const hasData = Object.keys(divisionAmounts).length > 0
            if (hasData) {
              console.log(`✅ [${project.project_code}] Divisions data found:`, {
                projectId: project.id,
                divisionsCount: Object.keys(divisionAmounts).length,
                divisions: Object.keys(divisionNames)
              })
            } else {
              console.log(`⚠️ [${project.project_code}] No divisions data found`, {
                projectId: project.id,
                mapHasProject: divisionsDataMap.has(project.id),
                divisionsDataExists: !!divisionsData
              })
            }
          }
          
          // Build divisions list sorted by amount (descending)
          const divisionsList = Object.keys(divisionAmounts)
            .map(key => ({
              key: key.toLowerCase().trim(),
              name: divisionNames[key] || key,
              amount: divisionAmounts[key] || 0
            }))
            .sort((a, b) => b.amount - a.amount)
          
          // ✅ Calculate total from ALL activities in the project (not just Planned KPIs)
          // Total should be the sum of total_value from all activities in the project
          let totalAmount = 0
          if (allActivities.length > 0) {
            // Helper to extract project codes (same as in divisionsDataMap)
            const extractProjectCodes = (item: any): string[] => {
              const codes: string[] = []
              const raw = (item as any).raw || {}
              
              const fullCodeSources = [
                item.project_full_code,
                (item as any)['Project Full Code'],
                raw['Project Full Code']
              ]
              
              for (const source of fullCodeSources) {
                if (source) {
                  const code = source.toString().trim()
                  if (code) {
                    codes.push(code)
                    codes.push(code.toUpperCase())
                    return Array.from(new Set(codes))
                  }
                }
              }
              
              const codeSources = [
                item.project_code,
                (item as any)['Project Code'],
                raw['Project Code']
              ]
              
              for (const source of codeSources) {
                if (source) {
                  const code = source.toString().trim()
                  if (code) {
                    codes.push(code)
                    codes.push(code.toUpperCase())
                  }
                }
              }
              
              return Array.from(new Set(codes))
            }
            
            // Build target codes for matching (same as in divisionsDataMap)
            let projectFullCode = (project.project_full_code || '').toString().trim()
            if (!projectFullCode) {
              const projectCode = (project.project_code || '').toString().trim()
              const projectSubCode = (project.project_sub_code || '').toString().trim()
              if (projectSubCode) {
                if (projectSubCode.toUpperCase().startsWith(projectCode.toUpperCase())) {
                  projectFullCode = projectSubCode
                } else if (projectSubCode.startsWith('-')) {
                  projectFullCode = `${projectCode}${projectSubCode}`
                } else {
                  projectFullCode = `${projectCode}-${projectSubCode}`
                }
              } else {
                projectFullCode = projectCode
              }
            }
            const projectFullCodeUpper = projectFullCode.toUpperCase()
            const projectCode = (project.project_code || '').toString().trim()
            const projectCodeUpper = projectCode.toUpperCase()
            
            const targetCodes: string[] = []
            if (projectFullCodeUpper) {
              targetCodes.push(projectFullCodeUpper)
              const hasDirectFullCode = project.project_full_code && project.project_full_code.toString().trim() !== ''
              if (!hasDirectFullCode && projectCodeUpper && projectCodeUpper !== projectFullCodeUpper) {
                targetCodes.push(projectCodeUpper)
              }
            } else if (projectCodeUpper) {
              targetCodes.push(projectCodeUpper)
            }
            
            // Helper to check if codes match
            const codesMatch = (itemCodes: string[], targetCodes: string[]): boolean => {
              const targetCodesUpper = targetCodes.map(c => c.toUpperCase().trim())
              const itemCodesUpper = itemCodes.map(c => c.toUpperCase().trim())
              
              for (const itemCode of itemCodesUpper) {
                if (targetCodesUpper.includes(itemCode)) {
                  return true
                }
              }
              
              for (const itemCode of itemCodesUpper) {
                for (const targetCode of targetCodesUpper) {
                  const itemHasDash = itemCode.includes('-')
                  const targetHasDash = targetCode.includes('-')
                  
                  if (itemHasDash || targetHasDash) {
                    if (itemCode === targetCode) {
                      return true
                    }
                  } else {
                    if (itemCode.startsWith(targetCode) || targetCode.startsWith(itemCode)) {
                      return true
                    }
                  }
                }
              }
              
              return false
            }
            
            // Filter activities for this project
            const projectActivities = allActivities.filter((activity: any) => {
              const activityCodes = extractProjectCodes(activity)
              return codesMatch(activityCodes, targetCodes)
            })
            
            // Sum total_value from all activities
            projectActivities.forEach((activity: any) => {
              const rawActivity = (activity as any).raw || {}
              const activityTotalValue = activity.total_value || 
                                       parseFloat(String(rawActivity['Total Value'] || '0').replace(/,/g, '')) || 
                                       0
              
              if (activityTotalValue > 0) {
                totalAmount += activityTotalValue
              } else {
                // Calculate from Rate × Total Units if Total Value not available
                const rate = activity.rate || 
                            parseFloat(String(rawActivity['Rate'] || '0').replace(/,/g, '')) || 
                            0
                const totalUnits = activity.total_units || 
                                activity.planned_units ||
                                parseFloat(String(rawActivity['Total Units'] || rawActivity['Planned Units'] || '0').replace(/,/g, '')) || 
                                0
                
                if (rate > 0 && totalUnits > 0) {
                  totalAmount += rate * totalUnits
                }
              }
            })
          }
          
          // ✅ Fallback: If no activities found, use sum of divisions (from Planned KPIs)
          if (totalAmount === 0) {
            totalAmount = divisionsList.reduce((sum, div) => sum + div.amount, 0)
          }
          
          // Handle expand/collapse for better UX (show first 5, then expand)
          const isDivExpanded = expandedDivisions.has(project.id)
          const maxDivVisible = 5 // ✅ Increased from 3 to 5
          const visibleDivisions = isDivExpanded ? divisionsList : divisionsList.slice(0, maxDivVisible)
          const hasMoreDivisions = divisionsList.length > maxDivVisible
          
          // Toggle expand handler
          const handleToggleDivExpand = (e: React.MouseEvent) => {
            e.stopPropagation()
            setExpandedDivisions(prev => {
              const newSet = new Set(prev)
              if (newSet.has(project.id)) {
                newSet.delete(project.id)
              } else {
                newSet.add(project.id)
              }
              return newSet
            })
          }
          
          // Render
          if (divisionsList.length === 0) {
            return (
              <div className="text-xs text-gray-400 dark:text-gray-500 italic py-2">
                No data available
              </div>
            )
          }
          
          return (
            <div className="space-y-2 py-1">
              {/* ✅ NEW DESIGN: Show all visible divisions in a clean list */}
              <div className="space-y-1.5">
                {visibleDivisions.map((division, index) => (
                  <div 
                    key={`${project.id}-${division.key}-${index}`} 
                    className="flex items-center justify-between text-xs py-0.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded px-1 -mx-1 transition-colors"
                  >
                    <span className="text-gray-600 dark:text-gray-400 truncate flex-1 min-w-0 mr-2">
                      {division.name}:
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white whitespace-nowrap">
                      {formatCurrency(division.amount)}
                    </span>
                  </div>
                ))}
              </div>
              
              {/* ✅ Show expand/collapse button if there are more divisions */}
              {hasMoreDivisions && (
                <button
                  onClick={handleToggleDivExpand}
                  className="w-full px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                  title={isDivExpanded ? 'Show Less' : `Show ${divisionsList.length - maxDivVisible} more divisions`}
                >
                  {isDivExpanded ? (
                    <span className="flex items-center justify-center gap-1">
                      <span>Show Less</span>
                      <ArrowUp className="h-3 w-3" />
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-1">
                      <span>+{divisionsList.length - maxDivVisible} more</span>
                      <ArrowDown className="h-3 w-3" />
                    </span>
                  )}
                </button>
              )}
              
              {/* ✅ NEW DESIGN: Always show total at the bottom with better styling */}
              {totalAmount > 0 && (
                <div className="pt-1.5 border-t border-gray-200 dark:border-gray-700 mt-1.5">
                  <div className="flex items-center justify-between text-sm font-semibold text-gray-900 dark:text-white">
                    <span className="text-gray-700 dark:text-gray-300">Total:</span>
                    <span className="text-blue-600 dark:text-blue-400">{formatCurrency(totalAmount)}</span>
                  </div>
                </div>
              )}
            </div>
          )
        
        case 'temporary_material':
          const hasTempMaterial = getProjectField(project, 'Project has Temporary Materials?') || 
                                 getProjectField(project, 'Temporary Materials') || 
                                 'No'
          
          const hasMaterial = hasTempMaterial === 'Yes' || 
                             hasTempMaterial === 'TRUE' || 
                             hasTempMaterial === true ||
                             String(hasTempMaterial).toLowerCase() === 'yes'
          
          return (
            <div className="flex items-center gap-2">
              {hasMaterial ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <X className="h-4 w-4 text-gray-400" />
              )}
              <span className={`text-sm font-medium ${hasMaterial ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                {hasMaterial ? 'Yes' : 'No'}
              </span>
            </div>
          )
        
        case 'project_location':
          const latitude = project.latitude || getProjectField(project, 'Latitude') || ''
          const longitude = project.longitude || getProjectField(project, 'Longitude') || ''
          const locationLink = latitude && longitude 
            ? `https://www.google.com/maps?q=${latitude},${longitude}`
            : ''
          
          return (
            <div>
              {locationLink ? (
                <a 
                  href={locationLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                >
                  {latitude}, {longitude}
                </a>
              ) : (
                <span className="text-gray-500 dark:text-gray-400 text-sm">N/A</span>
              )}
            </div>
          )
        
        case 'project_parties':
          return (
            <div className="space-y-1">
              <div className="text-xs text-gray-600 dark:text-gray-400">
                First Party: {project.first_party_name || 'N/A'}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Client: {project.client_name || 'N/A'}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Consultant: {project.consultant_name || 'N/A'}
              </div>
            </div>
          )
        
        case 'project_staff':
          const areaManager = project.area_manager_email || getProjectField(project, 'Area Manager') || 'N/A'
          const projectManager = project.project_manager_email || getProjectField(project, 'Project Manager') || 'N/A'
          const divisionHead = getProjectField(project, 'Division Head') || 'N/A'
          
          return (
            <div className="space-y-1">
              <div className="text-xs text-gray-600 dark:text-gray-400">Area Manager: {areaManager}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Project Manager: {projectManager}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Division Head: {divisionHead}</div>
            </div>
          )
        
        case 'project_award_date':
          return (
            <div className="text-sm text-gray-900 dark:text-white">
              {project.date_project_awarded ? formatDate(project.date_project_awarded) : 'N/A'}
            </div>
          )
        
        case 'retention_details':
          // ✅ Display all three retention values in one column
          const retentionAfterCompletion = project.retention_after_completion ?? getProjectField(project, 'Retention after Completion')
          const retentionAfter6Month = project.retention_after_6_month ?? getProjectField(project, 'Retention after 6 Month')
          const retentionAfter12Month = project.retention_after_12_month ?? getProjectField(project, 'Retention after 12 Month')
          
          return (
            <div className="space-y-1">
              <div className="text-xs text-gray-600 dark:text-gray-400">
                After Completion: {retentionAfterCompletion !== undefined && retentionAfterCompletion !== null && retentionAfterCompletion !== '' 
                  ? `${retentionAfterCompletion}%` 
                  : <span className="text-gray-400 dark:text-gray-500">N/A</span>}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                After 6 Month: {retentionAfter6Month !== undefined && retentionAfter6Month !== null && retentionAfter6Month !== '' 
                  ? `${retentionAfter6Month}%` 
                  : <span className="text-gray-400 dark:text-gray-500">N/A</span>}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                After 12 Month: {retentionAfter12Month !== undefined && retentionAfter12Month !== null && retentionAfter12Month !== '' 
                  ? `${retentionAfter12Month}%` 
                  : <span className="text-gray-400 dark:text-gray-500">N/A</span>}
              </div>
            </div>
          )
        
        case 'workmanship':
          const hasWorkmanship = project.workmanship_only || getProjectField(project, 'Workmanship?') || 'No'
          const virtualMaterialPercent = project.virtual_material_value || getProjectField(project, 'Virtual Material %') || '0'
          
          return (
            <div className="space-y-1">
              <div className="text-sm text-gray-900 dark:text-white">
                {hasWorkmanship === 'Yes' || hasWorkmanship === 'TRUE' || hasWorkmanship === true ? 'Yes' : 'No'}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Virtual Material: {virtualMaterialPercent}%
              </div>
            </div>
          )
        
        case 'client_name':
          const clientName = project.client_name || getProjectField(project, 'Client Name') || 'N/A'
          return (
            <div className="text-sm text-gray-900 dark:text-white">
              {clientName !== 'N/A' ? clientName : <span className="text-gray-400 dark:text-gray-500">N/A</span>}
            </div>
          )
        
        case 'consultant_name':
          const consultantName = project.consultant_name || getProjectField(project, 'Consultant Name') || 'N/A'
          return (
            <div className="text-sm text-gray-900 dark:text-white">
              {consultantName !== 'N/A' ? consultantName : <span className="text-gray-400 dark:text-gray-500">N/A</span>}
            </div>
          )
        
        case 'project_manager_email':
          const projectManagerEmail = project.project_manager_email || getProjectField(project, 'Project Manager Email') || 'N/A'
          return (
            <div className="text-sm text-gray-900 dark:text-white">
              {projectManagerEmail !== 'N/A' ? (
                <a href={`mailto:${projectManagerEmail}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                  {projectManagerEmail}
                </a>
              ) : (
                <span className="text-gray-400 dark:text-gray-500">N/A</span>
              )}
            </div>
          )
        
        case 'area_manager_email':
          const areaManagerEmail = project.area_manager_email || getProjectField(project, 'Area Manager Email') || 'N/A'
          return (
            <div className="text-sm text-gray-900 dark:text-white">
              {areaManagerEmail !== 'N/A' ? (
                <a href={`mailto:${areaManagerEmail}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                  {areaManagerEmail}
                </a>
              ) : (
                <span className="text-gray-400 dark:text-gray-500">N/A</span>
              )}
            </div>
          )
        
        case 'division_head_email':
          const divisionHeadEmail = project.division_head_email || getProjectField(project, 'Division Head Email') || 'N/A'
          return (
            <div className="text-sm text-gray-900 dark:text-white">
              {divisionHeadEmail !== 'N/A' ? (
                <a href={`mailto:${divisionHeadEmail}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                  {divisionHeadEmail}
                </a>
              ) : (
                <span className="text-gray-400 dark:text-gray-500">N/A</span>
              )}
            </div>
          )
        
        case 'work_programme':
          const workProgramme = project.work_programme || getProjectField(project, 'Work Programme') || 'N/A'
          return (
            <div className="text-sm text-gray-900 dark:text-white">
              {workProgramme !== 'N/A' ? (
                <p className="line-clamp-2" title={workProgramme}>
                  {workProgramme}
                </p>
              ) : (
                <span className="text-gray-400 dark:text-gray-500">N/A</span>
              )}
            </div>
          )
        
        case 'contract_status':
          const contractStatus = project.contract_status || getProjectField(project, 'Contract Status') || 'N/A'
          const statusColors: { [key: string]: string } = {
            'Active': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
            'Inactive': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
            'Pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
            'Completed': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
            'Terminated': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
          }
          const statusColor = statusColors[contractStatus] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
          return (
            <div>
              {contractStatus !== 'N/A' ? (
                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${statusColor}`}>
                  {contractStatus}
                </span>
              ) : (
                <span className="text-gray-400 dark:text-gray-500 text-sm">N/A</span>
              )}
            </div>
          )
        
        case 'currency':
          const currency = project.currency || getProjectField(project, 'Currency') || 'AED'
          return (
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {currency}
            </div>
          )
        
        case 'advance_payment_required':
          const advancePayment = project.advance_payment_required || getProjectField(project, 'Advnace Payment Required') || 'No'
          const hasAdvancePayment = advancePayment === 'Yes' || advancePayment === 'TRUE' || advancePayment === true || String(advancePayment).toLowerCase() === 'yes'
          return (
            <div className="flex items-center gap-2">
              {hasAdvancePayment ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <X className="h-4 w-4 text-gray-400" />
              )}
              <span className={`text-sm font-medium ${hasAdvancePayment ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                {hasAdvancePayment ? 'Yes' : 'No'}
              </span>
            </div>
          )
        
        case 'advance_payment_percentage':
          const advancePercentage = project.advance_payment_percentage ?? 
            (() => {
              const value = getProjectField(project, 'Advance Payment Percentage') || getProjectField(project, 'Advance Payment %')
              if (value !== undefined && value !== null && value !== '') {
                const parsed = parseFloat(String(value))
                return isNaN(parsed) ? undefined : parsed
              }
              return undefined
            })()
          
          return (
            <div className="flex items-center gap-2">
              {advancePercentage !== undefined && advancePercentage !== null ? (
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  {advancePercentage.toFixed(2)}%
                </span>
              ) : (
                <span className="text-sm text-gray-400 dark:text-gray-500">N/A</span>
              )}
            </div>
          )
        
        case 'virtual_material_value':
          const virtualMaterialValueCol = project.virtual_material_value || getProjectField(project, 'Virtual Material Value') || '0'
          const virtualMaterialPercentCol = typeof virtualMaterialValueCol === 'string' && virtualMaterialValueCol.includes('%') 
            ? virtualMaterialValueCol 
            : `${virtualMaterialValueCol}%`
          return (
            <div className="text-sm text-gray-900 dark:text-white">
              {virtualMaterialValueCol !== '0' && virtualMaterialValueCol !== '0%' ? virtualMaterialPercentCol : <span className="text-gray-400 dark:text-gray-500">N/A</span>}
            </div>
          )
        
        case 'created_at':
          const createdAt = project.created_at || getProjectField(project, 'created_at') || ''
          return (
            <div className="text-sm text-gray-900 dark:text-white">
              {createdAt ? formatDate(createdAt) : <span className="text-gray-400 dark:text-gray-500">N/A</span>}
            </div>
          )
        
        case 'updated_at':
          const updatedAt = project.updated_at || getProjectField(project, 'updated_at') || ''
          return (
            <div className="text-sm text-gray-900 dark:text-white">
              {updatedAt ? formatDate(updatedAt) : <span className="text-gray-400 dark:text-gray-500">N/A</span>}
            </div>
          )
        
        case 'actions':
          const createdBy = project.created_by || getProjectField(project, 'created_by') || null
          return (
            <div className="flex items-center gap-2">
              <PermissionButton
                permission="projects.edit"
                variant="outline"
                size="sm"
                onClick={() => onEdit(project)}
                className="text-blue-600 hover:text-blue-700"
              >
                Edit
              </PermissionButton>
              <PermissionButton
                permission="projects.delete"
                variant="outline"
                size="sm"
                onClick={() => onDelete(project.id)}
                className="text-red-600 hover:text-red-700"
              >
                Delete
              </PermissionButton>
              <button
                type="button"
                onClick={() => {
                  setShowHistoryModal(true)
                  setHistoryRecordId(project.id)
                  setHistoryRecordType('project')
                  setHistoryRecordData(project)
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
    } catch (error) {
      console.error(`Error rendering cell for column ${column.id}:`, error)
      return (
        <span className="text-red-500 dark:text-red-400 text-sm">
          Error
        </span>
      )
    }
  }, [projectsAnalytics, allActivities, allKPIs, matchesProject, getProjectField, getPlannedDatesFromActivities, getActualDatesFromKPIs, getPlannedDatesForProject, getActualDatesForProject, copiedPlotNumber, expandedScopes, expandedDivisions])

  // ✅ PERFORMANCE: Memoize visible columns to prevent unnecessary recalculations
  const visibleColumns = useMemo(() => {
    return columns.filter(col => col.visible).sort((a, b) => a.order - b.order)
  }, [columns])

  // Sorting handler - use database-level sorting if callback provided
  const handleSort = (columnId: string) => {
    // Don't sort select or actions columns
    if (columnId === 'select' || columnId === 'actions') return
    
    // ✅ If onSort callback provided, use database-level sorting
    if (onSort) {
      // Use current sort state from parent if available, otherwise default to 'asc'
      const currentCol = currentSortColumn || sortColumn
      const currentDir = currentSortDirection || sortDirection
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

  // Get sortable value for a project and column
  const getSortValue = (project: Project, columnId: string): any => {
    const analytics = getProjectAnalytics(project)
    
    switch (columnId) {
      case 'project_code':
        return project.project_code || ''
      case 'full_project_code':
        return (project as any).project_full_code || project.project_code || ''
      case 'project_name':
        return project.project_name || ''
      case 'project_description':
        return project.project_description || ''
      case 'plot_number':
        return getProjectField(project, 'Plot Number') || ''
      case 'responsible_divisions':
        return project.responsible_division || getProjectField(project, 'Responsible Divisions') || ''
      case 'scope_of_works':
        return project.project_type || getProjectField(project, 'Scope of Works') || ''
      case 'kpi_added':
        // Sort by whether KPIs exist (Yes = 1, No = 0)
        const hasKPIs = analytics && analytics.totalKPIs > 0
        return hasKPIs ? 1 : 0
      case 'project_status':
        return project.project_status || ''
      case 'contract_durations':
        // Sort by planned duration days
        const plannedStart = getProjectField(project, 'Planned Start Date') || ''
        const plannedEnd = getProjectField(project, 'Planned Completion Date') || ''
        if (plannedStart && plannedEnd) {
          const start = new Date(plannedStart)
          const end = new Date(plannedEnd)
          if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
          }
        }
        return 0
      case 'actual_dates':
        const actualStartDate = getProjectField(project, 'Actual Start Date') || ''
        return actualStartDate ? new Date(actualStartDate).getTime() : 0
      case 'progress_summary':
        return analytics?.overallProgress ?? 0
      case 'work_value_status':
        // Sort by planned work value
        return analytics?.totalPlannedValue ?? 0
      case 'contract_amount':
        const contractAmt = analytics?.totalContractValue || parseFloat(String(getProjectField(project, 'Contract Amount') || '0').replace(/,/g, '')) || 0
        return contractAmt
      case 'divisions_contract_amount':
        // Sort by total divisions amount
        return analytics?.totalContractValue ?? 0
      case 'temporary_material':
        const hasTempMaterial = getProjectField(project, 'Project has Temporary Materials?') || getProjectField(project, 'Temporary Materials') || ''
        return (hasTempMaterial === 'Yes' || hasTempMaterial === 'TRUE' || hasTempMaterial === true) ? 1 : 0
      case 'project_location':
        const location = getProjectField(project, 'Location') || getProjectField(project, 'Project Location') || ''
        return location
      case 'project_parties':
        // Sort by client name (first party in parties list)
        return project.client_name || getProjectField(project, 'Client Name') || ''
      case 'project_staff':
        // Sort by project manager name
        return project.project_manager_email || getProjectField(project, 'Project Manager') || ''
      case 'project_award_date':
        return project.date_project_awarded ? new Date(project.date_project_awarded).getTime() : 0
      case 'contract_durations':
        // Sort by project start date
        const startDateForSort = project.project_start_date || getProjectField(project, 'Project Start Date') || ''
        return startDateForSort ? new Date(startDateForSort).getTime() : 0
      case 'retention_details':
        // Sort by retention after completion (first value)
        return project.retention_after_completion ?? getProjectField(project, 'Retention after Completion') ?? 0
      case 'work_programme':
        return project.work_programme || getProjectField(project, 'Work Programme') || ''
      case 'contract_status':
        return project.contract_status || getProjectField(project, 'Contract Status') || ''
      case 'currency':
        return project.currency || getProjectField(project, 'Currency') || 'AED'
      case 'workmanship':
        const hasWorkmanship = project.workmanship_only || getProjectField(project, 'Workmanship?') || 'No'
        return (hasWorkmanship === 'Yes' || hasWorkmanship === 'TRUE' || hasWorkmanship === true) ? 1 : 0
      case 'advance_payment_required':
        const advancePayment = project.advance_payment_required || getProjectField(project, 'Advnace Payment Required') || 'No'
        return (advancePayment === 'Yes' || advancePayment === 'TRUE' || advancePayment === true) ? 1 : 0
      case 'advance_payment_percentage':
        const advancePercentage = project.advance_payment_percentage ?? 
          (() => {
            const value = getProjectField(project, 'Advance Payment Percentage') || getProjectField(project, 'Advance Payment %')
            if (value !== undefined && value !== null && value !== '') {
              const parsed = parseFloat(String(value))
              return isNaN(parsed) ? 0 : parsed
            }
            return 0
          })()
        return advancePercentage
      case 'virtual_material_value':
        const virtualMatValue = project.virtual_material_value || getProjectField(project, 'Virtual Material Value') || '0'
        const virtualMatNum = parseFloat(String(virtualMatValue).replace(/[%,]/g, '')) || 0
        return virtualMatNum
      case 'client_name':
        return project.client_name || getProjectField(project, 'Client Name') || ''
      case 'consultant_name':
        return project.consultant_name || getProjectField(project, 'Consultant Name') || ''
      case 'project_manager_email':
        return project.project_manager_email || getProjectField(project, 'Project Manager Email') || ''
      case 'area_manager_email':
        return project.area_manager_email || getProjectField(project, 'Area Manager Email') || ''
      case 'division_head_email':
        return project.division_head_email || getProjectField(project, 'Division Head Email') || ''
      case 'created_at':
        return project.created_at ? new Date(project.created_at).getTime() : 0
      case 'updated_at':
        return project.updated_at ? new Date(project.updated_at).getTime() : 0
      case 'created_by':
        return project.created_by || getProjectField(project, 'created_by') || ''
      default:
        return getProjectField(project, columnId) || ''
    }
  }

  // Sort projects
  const sortedProjects = useMemo(() => {
    if (!sortColumn) return projects
    
    return [...projects].sort((a, b) => {
      const aValue = getSortValue(a, sortColumn)
      const bValue = getSortValue(b, sortColumn)
      
      // Handle null/undefined values
      if (aValue === null || aValue === undefined) return 1
      if (bValue === null || bValue === undefined) return -1
      
      // Compare values
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue, undefined, { numeric: true, sensitivity: 'base' })
        return sortDirection === 'asc' ? comparison : -comparison
      }
      
      // Numeric comparison
      const comparison = (aValue as number) - (bValue as number)
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [projects, sortColumn, sortDirection, getProjectAnalytics, getProjectField])

  // ✅ Check permission before rendering the entire table
  if (!guard.hasAccess('projects.view')) {
    return null
  }

  return (
    <div className="space-y-4">
      {/* Header with Customization Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Projects ({projects.length})
          </h3>
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {selectedIds.length} selected
              </span>
              {onBulkDelete && guard.hasAccess('projects.delete') && (
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
            permission="projects.view"
            variant="outline"
            size="sm"
            onClick={() => setShowCustomizer(true)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Customize Columns
          </PermissionButton>
          <PermissionButton
            permission="projects.view"
            variant="outline"
            size="sm"
            onClick={() => {
              resetToDefault()
              setTimeout(() => window.location.reload(), 100)
            }}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            title="Reset to default columns"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </PermissionButton>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto max-h-[calc(100vh-300px)] overflow-y-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-gray-200 dark:border-gray-700">
              {visibleColumns.map((column, columnIndex) => {
                const isSortable = column.id !== 'select' && column.id !== 'actions'
                const isSorted = sortColumn === column.id
                
                // Calculate left position for fixed columns
                let leftPosition = 0
                if (column.fixed) {
                  for (let i = 0; i < columnIndex; i++) {
                    const prevColumn = visibleColumns[i]
                    if (prevColumn.fixed) {
                      const width = prevColumn.width || '120px'
                      const widthNum = parseInt(width.replace('px', '')) || 120
                      leftPosition += widthNum
                    }
                  }
                }
                
                return (
                <th
                  key={column.id}
                    onClick={() => isSortable && handleSort(column.id)}
                    className={`px-4 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 ${
                      isSortable ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none' : ''
                    } ${column.fixed ? 'shadow-[2px_0_4px_rgba(0,0,0,0.1)]' : ''}`}
                    style={{
                      width: column.width || 'auto',
                      minWidth: column.width || '120px',
                      maxWidth: column.width || 'none',
                      position: column.fixed ? 'sticky' : 'relative',
                      left: column.fixed ? `${leftPosition}px` : 'auto',
                      top: 0,
                      zIndex: column.fixed ? 20 : 10
                    }}
                  >
                    {column.id === 'select' ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.length === projects.length && projects.length > 0}
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
            {sortedProjects.map((project) => {
              const isHighlighted = highlightedProjectId === project.id
              return (
                <tr
                  key={project.id}
                  id={isHighlighted ? `project-row-${project.id}` : undefined}
                  className={`group border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                    isHighlighted ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 ring-2 ring-blue-400 dark:ring-blue-600' : ''
                  }`}
                >
                  {visibleColumns.map((column, columnIndex) => {
                    // Calculate left position for fixed columns
                    let leftPosition = 0
                    if (column.fixed) {
                      for (let i = 0; i < columnIndex; i++) {
                        const prevColumn = visibleColumns[i]
                        if (prevColumn.fixed) {
                          const width = prevColumn.width || '120px'
                          const widthNum = parseInt(width.replace('px', '')) || 120
                          leftPosition += widthNum
                        }
                      }
                    }
                    
                    return (
                      <td
                        key={column.id}
                        className={`px-4 py-3 text-sm ${column.fixed ? 'shadow-[2px_0_4px_rgba(0,0,0,0.1)] bg-white dark:bg-gray-900 group-hover:bg-gray-50 dark:group-hover:bg-gray-800/50' : ''}`}
                        style={{
                          width: column.width || 'auto',
                          minWidth: column.width || '120px',
                          maxWidth: column.width || 'none',
                          position: column.fixed ? 'sticky' : 'relative',
                          left: column.fixed ? `${leftPosition}px` : 'auto',
                          zIndex: column.fixed ? 15 : 1
                        }}
                      >
                        {renderCell(project, column)}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Column Customizer Modal */}
      <PermissionGuard permission="projects.view">
      {showCustomizer && (
        <ColumnCustomizer
          columns={columns}
          onColumnsChange={saveConfiguration}
          onClose={() => setShowCustomizer(false)}
          title="Customize Projects Table Columns"
          storageKey="projects"
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
        title="Project Complete History"
      />
    </div>
  )
}
