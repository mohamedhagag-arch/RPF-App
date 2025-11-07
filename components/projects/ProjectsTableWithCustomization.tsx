'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Project } from '@/lib/supabase'
import { ColumnCustomizer, ColumnConfig } from '@/components/ui/ColumnCustomizer'
import { useColumnCustomization } from '@/lib/useColumnCustomization'
import { Button } from '@/components/ui/Button'
import { PermissionButton } from '@/components/ui/PermissionButton'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { PermissionGuard } from '@/components/common/PermissionGuard'
import { CheckCircle, Clock, AlertCircle, Calendar, Building, Activity, TrendingUp, Target, Info, Filter, X, RotateCcw, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { calculateProjectAnalytics, ProjectAnalytics } from '@/lib/projectAnalytics'
import { formatCurrencyByCodeSync } from '@/lib/currenciesManager'
import { getProjectStatusText, getProjectStatusColor } from '@/lib/projectStatusManager'
import { getStatusDisplayInfo, calculateProjectStatus, ProjectStatusData } from '@/lib/projectStatusCalculator'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'

interface ProjectsTableWithCustomizationProps {
  projects: Project[]
  onEdit: (project: Project) => void
  onDelete: (id: string) => void
  onBulkDelete?: (ids: string[]) => void
  allKPIs?: any[]
  allActivities?: any[]
}

// Default column configuration for Projects
const defaultProjectsColumns: ColumnConfig[] = [
  { id: 'select', label: 'Select', visible: true, order: 0, fixed: true, width: '60px' },
  { id: 'project_code', label: 'Project Code', visible: true, order: 1, width: '150px' },
  { id: 'full_project_code', label: 'Full Project Code', visible: true, order: 2, width: '180px' },
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
  { id: 'first_party_name', label: 'First Party Name', visible: false, order: 22, width: '180px' },
  { id: 'project_staff', label: 'Project Staff', visible: true, order: 23, width: '200px' },
  { id: 'project_manager_email', label: 'Project Manager Email', visible: false, order: 24, width: '200px' },
  { id: 'area_manager_email', label: 'Area Manager Email', visible: false, order: 25, width: '200px' },
  { id: 'division_head_email', label: 'Division Head Email', visible: false, order: 26, width: '200px' },
  { id: 'project_award_date', label: 'Project Award Date', visible: true, order: 27, width: '150px' },
  { id: 'project_start_date', label: 'Project Start Date', visible: true, order: 28, width: '150px' },
  { id: 'project_completion_date', label: 'Project Completion Date', visible: true, order: 29, width: '180px' },
  { id: 'project_duration', label: 'Project Duration', visible: true, order: 30, width: '150px' },
  { id: 'retention_after_completion', label: 'Retention after Completion', visible: true, order: 31, width: '200px' },
  { id: 'retention_after_6_month', label: 'Retention after 6 Month', visible: true, order: 32, width: '200px' },
  { id: 'retention_after_12_month', label: 'Retention after 12 Month', visible: true, order: 33, width: '200px' },
  { id: 'work_programme', label: 'Work Programme', visible: false, order: 34, width: '180px' },
  { id: 'contract_status', label: 'Contract Status', visible: false, order: 35, width: '150px' },
  { id: 'currency', label: 'Currency', visible: false, order: 36, width: '120px' },
  { id: 'workmanship', label: 'Workmanship', visible: true, order: 37, width: '130px' },
  { id: 'advance_payment_required', label: 'Advance Payment Required', visible: false, order: 38, width: '200px' },
  { id: 'virtual_material_value', label: 'Virtual Material Value', visible: false, order: 39, width: '180px' },
  { id: 'created_at', label: 'Created At', visible: false, order: 40, width: '150px' },
  { id: 'updated_at', label: 'Updated At', visible: false, order: 41, width: '150px' },
  { id: 'created_by', label: 'Created By', visible: false, order: 42, width: '150px' },
  { id: 'actions', label: 'Actions', visible: true, order: 43, fixed: true, width: '150px' }
]

export function ProjectsTableWithCustomization({ 
  projects, 
  onEdit, 
  onDelete, 
  onBulkDelete,
  allKPIs = [],
  allActivities = []
}: ProjectsTableWithCustomizationProps) {
  const guard = usePermissionGuard()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showCustomizer, setShowCustomizer] = useState(false)
  const [expandedScopes, setExpandedScopes] = useState<Set<string>>(new Set()) // Track expanded scopes per project
  const [expandedDivisions, setExpandedDivisions] = useState<Set<string>>(new Set()) // Track expanded divisions per project
  const [copiedPlotNumber, setCopiedPlotNumber] = useState<string | null>(null) // Track copied plot number for feedback
  // ✅ FIX: Load project types from project_types table (Project Types & Activities Management)
  const [projectTypesMap, setProjectTypesMap] = useState<Map<string, { name: string; description?: string }>>(new Map())
  
  // Sorting state
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  
  const { 
    columns, 
    saveConfiguration, 
    resetToDefault 
  } = useColumnCustomization({ 
    defaultColumns: defaultProjectsColumns, 
    storageKey: 'projects' 
  })

  // ✅ FIX: Load project types from project_types table on mount
  useEffect(() => {
    const loadProjectTypes = async () => {
      try {
        const supabase = getSupabaseClient()
        console.log('🔄 Loading project types from project_types table...')
        
        const { data, error } = await supabase
          .from('project_types')
          .select('name, description')
          .eq('is_active', true)
          .order('name', { ascending: true })
        
        if (error) {
          console.error('❌ Error loading project types:', error)
          console.error('Error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint
          })
          return
        }
        
        // Create a map for quick lookup by name
        const typesMap = new Map<string, { name: string; description?: string }>()
        if (data && data.length > 0) {
          data.forEach((type: any) => {
            if (type.name) {
              typesMap.set(type.name, {
                name: type.name,
                description: type.description
              })
            }
          })
        }
        
        setProjectTypesMap(typesMap)
        console.log(`✅ Loaded ${typesMap.size} project types from project_types table:`, {
          count: typesMap.size,
          sampleNames: Array.from(typesMap.keys()).slice(0, 5)
        })
      } catch (error: any) {
        console.error('❌ Error loading project types:', error)
        console.error('Error stack:', error.stack)
      }
    }
    
    loadProjectTypes()
  }, [])
  
  // ✅ Calculate analytics for all projects (same as Cards use) - OPTIMIZED for performance
  const projectsAnalytics = useMemo(() => {
    // ✅ DEBUG: Always log to diagnose zero values issue
    console.log(`📊 ProjectsTable: Calculating analytics`, {
      projectsCount: projects.length,
      allActivitiesCount: allActivities.length,
      allKPIsCount: allKPIs.length,
      hasData: projects.length > 0 && (allActivities.length > 0 || allKPIs.length > 0)
    })
    
    if (!projects.length || (!allActivities.length && !allKPIs.length)) {
      console.warn('⚠️ ProjectsTable: No data available for analytics calculation', {
        projectsLength: projects.length,
        activitiesLength: allActivities.length,
        kpisLength: allKPIs.length
      })
      return new Map<string, ProjectAnalytics>()
    }
    
    // ✅ PERFORMANCE: Use Map for O(1) lookups and batch calculation
    const analyticsMap = new Map<string, ProjectAnalytics>()
    
    // ✅ PERFORMANCE: Pre-filter activities and KPIs by project codes to reduce iterations
    const projectCodesSet = new Set(projects.map(p => p.project_code).filter(Boolean))
    const projectFullCodesSet = new Set(
      projects.flatMap(p => [
        p.project_code,
        p.project_sub_code,
        `${p.project_code}${p.project_sub_code || ''}`
      ]).filter(Boolean)
    )
    
    // Pre-filter activities and KPIs that might match any project
    // ✅ EXPANDED: Use case-insensitive matching and check all possible sources
    const potentiallyRelevantActivities = allActivities.filter((a: any) => {
      const rawActivity = a.raw || {}
      const code = (a.project_code || 
                   a['Project Code'] || 
                   rawActivity['Project Code'] || 
                   '').toString().trim().toUpperCase()
      const fullCode = (a.project_full_code || 
                       a['Project Full Code'] || 
                       rawActivity['Project Full Code'] || 
                       '').toString().trim().toUpperCase()
      
      if (!code && !fullCode) return false
      
      // Check if code matches any project code (case-insensitive)
      const codeMatches = Array.from(projectCodesSet).some(pc => 
        pc.toString().trim().toUpperCase() === code || 
        code.includes(pc.toString().trim().toUpperCase()) ||
        pc.toString().trim().toUpperCase().includes(code)
      )
      
      // Check if fullCode matches any project code (case-insensitive)
      const fullCodeMatches = Array.from(projectCodesSet).some(pc => 
        fullCode.startsWith(pc.toString().trim().toUpperCase()) ||
        fullCode.includes(pc.toString().trim().toUpperCase()) ||
        pc.toString().trim().toUpperCase().includes(fullCode)
      )
      
      return codeMatches || fullCodeMatches
    })
    
    const potentiallyRelevantKPIs = allKPIs.filter((k: any) => {
      const rawKPI = k.raw || {}
      const code = (k.project_code || 
                   k['Project Code'] || 
                   rawKPI['Project Code'] || 
                   '').toString().trim().toUpperCase()
      const fullCode = (k.project_full_code || 
                       k['Project Full Code'] || 
                       rawKPI['Project Full Code'] || 
                       '').toString().trim().toUpperCase()
      
      if (!code && !fullCode) return false
      
      // Check if code matches any project code (case-insensitive)
      const codeMatches = Array.from(projectCodesSet).some(pc => 
        pc.toString().trim().toUpperCase() === code || 
        code.includes(pc.toString().trim().toUpperCase()) ||
        pc.toString().trim().toUpperCase().includes(code)
      )
      
      // Check if fullCode matches any project code (case-insensitive)
      const fullCodeMatches = Array.from(projectCodesSet).some(pc => 
        fullCode.startsWith(pc.toString().trim().toUpperCase()) ||
        fullCode.includes(pc.toString().trim().toUpperCase()) ||
        pc.toString().trim().toUpperCase().includes(fullCode)
      )
      
      return codeMatches || fullCodeMatches
    })
    
    // ✅ PERFORMANCE: Calculate analytics only for visible/relevant data
    projects.forEach(project => {
      try {
        // Use pre-filtered data instead of all data
        const analytics = calculateProjectAnalytics(project, potentiallyRelevantActivities, potentiallyRelevantKPIs)
        analyticsMap.set(project.id, analytics)
        
        // ✅ DEBUG: Log analytics for first project to diagnose zero values
        if (project === projects[0]) {
          console.log(`📊 ProjectsTable: Analytics for ${project.project_code}:`, {
            totalValue: analytics.totalValue,
            totalPlannedValue: analytics.totalPlannedValue,
            totalEarnedValue: analytics.totalEarnedValue,
            actualProgress: analytics.actualProgress,
            plannedProgress: analytics.plannedProgress,
            variance: analytics.variance,
            matchedActivities: potentiallyRelevantActivities.filter(a => {
              const code = a.project_code || a['Project Code'] || (a as any).raw?.['Project Code'] || ''
              return code === project.project_code
            }).length,
            matchedKPIs: potentiallyRelevantKPIs.filter(k => {
              const code = k.project_code || k['Project Code'] || (k as any).raw?.['Project Code'] || ''
              return code === project.project_code
            }).length
          })
        }
      } catch (error) {
        // Always log errors to diagnose issues
        console.error(`❌ Error calculating analytics for ${project.project_code}:`, error)
      }
    })
    
    console.log(`✅ ProjectsTable: Calculated analytics for ${analyticsMap.size} projects`)
    return analyticsMap
  }, [projects, allActivities, allKPIs])

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

  // Helper: Normalize project code for matching - OPTIMIZED with useCallback
  const normalizeCode = useCallback((code: any): string => {
    if (!code) return ''
    return String(code).trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  }, [])

  // ✅ EXPANDED: Check if item matches project (comprehensive matching for all projects) - OPTIMIZED with useCallback
  const matchesProject = useCallback((item: any, project: Project): boolean => {
    if (!project?.project_code || !item) return false
    
    try {
      // Get all project code variations
      const projectCode = normalizeCode(project.project_code)
      const projectSubCode = normalizeCode(project.project_sub_code || '')
      const projectFullCodeFromProject = getProjectField(project, 'Project Full Code') || ''
      const projectFullCode = normalizeCode(projectFullCodeFromProject) || (projectSubCode ? `${projectCode}${projectSubCode}` : projectCode)
      
      // Get item codes from all possible sources (EXPANDED)
      const rawItem = (item as any).raw || {}
      
      const getCode = (field: string): string => {
        const variations = [
          item[field],
          item[field.toLowerCase()],
          item[field.replace(/\s+/g, '')],
          item[field.replace(/\s+/g, '_')],
          rawItem[field],
          rawItem[field.replace(/\s+/g, ' ')],
          rawItem[field.replace(/\s+/g, '')],
          rawItem[field.replace(/\s+/g, '_')]
        ]
        
        for (const val of variations) {
          const normalized = normalizeCode(val)
          if (normalized) return normalized
        }
        return ''
      }
      
      const itemProjectCode = getCode('Project Code') || getCode('project_code')
      const itemProjectFullCode = getCode('Project Full Code') || getCode('project_full_code')
      const itemProjectSubCode = getCode('Project Sub Code') || getCode('project_sub_code')
      const itemFullCode = itemProjectSubCode ? `${itemProjectCode}${itemProjectSubCode}` : (itemProjectFullCode || itemProjectCode)
      
      // ✅ STRATEGY 1: Exact matches (case-insensitive)
      if (itemProjectCode === projectCode || itemProjectFullCode === projectCode || itemFullCode === projectCode) {
        return true
      }
      if (projectFullCode && (itemProjectFullCode === projectFullCode || itemFullCode === projectFullCode || itemProjectCode === projectFullCode)) {
        return true
      }
      
      // ✅ STRATEGY 2: Contains/Partial matches (more flexible)
      if (itemProjectCode && projectCode.includes(itemProjectCode)) {
        return true
      }
      if (itemProjectCode && itemProjectCode.includes(projectCode)) {
        return true
      }
      if (itemProjectFullCode && projectCode.includes(itemProjectFullCode)) {
        return true
      }
      if (itemProjectFullCode && itemProjectFullCode.includes(projectCode)) {
        return true
      }
      if (projectFullCode && itemProjectFullCode && projectFullCode.includes(itemProjectFullCode)) {
        return true
      }
      if (projectFullCode && itemProjectFullCode && itemProjectFullCode.includes(projectFullCode)) {
        return true
      }
      
      // ✅ STRATEGY 3: Numeric match (e.g., P5011 matches P5011-01, P5011-02, etc.)
      const projectNum = projectCode.match(/(\d+)/)?.[0]
      if (projectNum) {
        const itemNum = itemProjectCode.match(/(\d+)/)?.[0]
        if (itemNum === projectNum) {
          return true
        }
        const itemFullNum = itemProjectFullCode.match(/(\d+)/)?.[0]
        if (itemFullNum === projectNum) {
          return true
        }
      }
      
      // ✅ STRATEGY 4: Fuzzy match - check if codes share common prefix/suffix
      if (itemProjectCode.length >= 3 && projectCode.length >= 3) {
        const commonPrefix = itemProjectCode.substring(0, 3) === projectCode.substring(0, 3)
        const commonSuffix = itemProjectCode.slice(-3) === projectCode.slice(-3)
        if (commonPrefix || commonSuffix) {
          // Additional check: numeric part should match
          const projectNumeric = projectCode.match(/\d+/)?.[0]
          const itemNumeric = itemProjectCode.match(/\d+/)?.[0]
          if (projectNumeric && itemNumeric && projectNumeric === itemNumeric) {
            return true
          }
        }
      }
      
      return false
    } catch (error) {
      console.error('Error in matchesProject:', error)
      return false
    }
  }, [normalizeCode, getProjectField])

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

  // ✅ SMART Helper: Calculate work value status with intelligent calculations
  const calculateWorkValueStatus = (project: Project): { planned: number, done: number, source: string } => {
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

  // ✅ Render cell content - OPTIMIZED with useCallback
  // All calculated columns use analytics from calculateProjectAnalytics (same as Cards)
  // This ensures data consistency between Cards and Customize Columns
  const renderCell = useCallback((project: Project, column: ColumnConfig) => {
    // Get analytics for this project (calculated once per project)
    const analytics = projectsAnalytics.get(project.id)
    
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
          // Display only the first activity name from the project
          const projectActivitiesForName = allActivities.filter((activity: any) => matchesProject(activity, project))
          
          if (projectActivitiesForName.length > 0) {
            const firstActivityName = projectActivitiesForName[0].activity_name || 
                                      projectActivitiesForName[0].activity || 
                                      ''
            if (firstActivityName) {
              return (
                <div className="font-medium text-gray-900 dark:text-white text-sm">
                  {firstActivityName}
                  </div>
              )
            }
          }
          
          // Fallback to project name if no activities found
          return (
              <div className="font-medium text-gray-900 dark:text-white text-sm">
                {project.project_name || 'N/A'}
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
          const divisionsRaw = project.responsible_division || 'N/A'
          const divisionsList = divisionsRaw !== 'N/A' 
            ? divisionsRaw.split(',').map(d => d.trim()).filter(d => d.length > 0)
            : ['N/A']
          
          const divisionColors: { [key: string]: string } = {
            'Enabling Division': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
            'Infrastructure Division': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
            'Soil Improvement Division': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
            'Marine Division': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
          }
          
          return (
            <div className="flex flex-wrap gap-1.5">
              {divisionsList.map((division, index) => {
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
          // ✅ FIX: Get scope from project_types table (Project Types & Activities Management)
          // 1. Get project type names from project.project_type field
          const projectTypeNamesRaw = project.project_type || 
                                     getProjectField(project, 'Project Type') || 
                                     (project as any).raw?.['Project Type'] || 
                                     ''
          
          // ✅ DEBUG: Always log for first 3 projects to diagnose
          const isFirstProject = projects.indexOf(project) < 3
          if (isFirstProject) {
            console.log(`🔍 [${project.project_code}] Scope lookup - BEFORE processing:`, {
              projectTypeNamesRaw,
              projectTypeRaw: project.project_type,
              projectTypesMapSize: projectTypesMap.size,
              projectTypesMapKeys: Array.from(projectTypesMap.keys()).slice(0, 5),
              hasProjectTypesMap: projectTypesMap.size > 0
            })
          }
          
          // 2. Split by comma (with or without space) to handle multiple project types
          // Support both ", " and "," separators
          const projectTypeNames = projectTypeNamesRaw && 
                                   projectTypeNamesRaw !== 'N/A' && 
                                   projectTypeNamesRaw.trim() !== '' && 
                                   projectTypeNamesRaw !== 'null' && 
                                   projectTypeNamesRaw !== 'undefined'
            ? projectTypeNamesRaw
                .split(/,\s*/) // Split by comma with optional space
                .map((s: string) => s.trim())
                .filter((s: string) => s.length > 0 && s !== 'N/A' && s !== 'null' && s !== 'undefined')
            : []
          
          if (isFirstProject) {
            console.log(`🔍 [${project.project_code}] Scope lookup - AFTER split:`, {
              projectTypeNames,
              count: projectTypeNames.length
            })
          }
          
          // 3. Look up each project type name in project_types table
          const scopeList: string[] = []
          if (projectTypeNames.length > 0) {
            projectTypeNames.forEach((typeName: string) => {
              // Try exact match first
              const projectType = projectTypesMap.get(typeName)
              if (projectType) {
                scopeList.push(projectType.name)
                if (isFirstProject) {
                  console.log(`✅ [${project.project_code}] Found exact match for "${typeName}":`, projectType.name)
                }
              } else {
                // Try case-insensitive match
                let found = false
                Array.from(projectTypesMap.entries()).forEach(([key, value]) => {
                  if (key.toLowerCase() === typeName.toLowerCase()) {
                    scopeList.push(value.name)
                    found = true
                    if (isFirstProject) {
                      console.log(`✅ [${project.project_code}] Found case-insensitive match for "${typeName}":`, value.name)
                    }
                  }
                })
                // If not found in project_types table, use the original name as fallback
                if (!found) {
                  scopeList.push(typeName)
                  if (isFirstProject) {
                    console.log(`⚠️ [${project.project_code}] No match found for "${typeName}", using as-is`)
                  }
                }
              }
            })
          }
          
          // 4. If no scopes found, show N/A
          const finalScopeList = scopeList.length > 0 ? scopeList : ['N/A']
          
          if (isFirstProject) {
            console.log(`🔍 [${project.project_code}] Scope lookup - FINAL RESULT:`, {
              finalScopeList,
              scopeListLength: scopeList.length,
              projectTypeNamesLength: projectTypeNames.length
            })
          }
          
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
          // ✅ Use EXACT same logic as calculateProjectAnalytics (from lib/projectAnalytics.ts line 150-164)
          // This ensures 100% consistency and accuracy
          const projectKPIs = allKPIs.filter((k: any) => {
            // Get project codes from KPI (check mapped fields first, then raw)
            const rawKPI = (k as any).raw || {}
            const kpiProjectCode = k.project_code || rawKPI['Project Code'] || ''
            const kpiProjectFullCode = k.project_full_code || rawKPI['Project Full Code'] || ''
            
            if (!kpiProjectCode && !kpiProjectFullCode) return false
            
            // Strategy 1: Direct project code match
            if (kpiProjectCode === project.project_code) return true
            
            // Strategy 2: Project full code starts with project code (e.g., P9999 matches P9999-01, P9999-02, etc.)
            if (kpiProjectFullCode?.startsWith(project.project_code)) return true
            
            // Strategy 3: Exact full code match (if project has sub-code)
            const fullCode = `${project.project_code}${project.project_sub_code || ''}`
            if (kpiProjectFullCode === fullCode) return true
            
            return false
          })
          
          const hasKPIs = projectKPIs.length > 0
          const totalKPIs = projectKPIs.length
          
          // ✅ DEBUG: Always log for troubleshooting
          if (process.env.NODE_ENV === 'development') {
            console.log(`🔍 [${project.project_code}] KPI Added? Check:`, {
              projectCode: project.project_code,
              projectSubCode: project.project_sub_code,
              projectFullCode: `${project.project_code}${project.project_sub_code || ''}`,
              allKPIsCount: allKPIs.length,
              foundKPIs: totalKPIs,
              sampleKPIs: allKPIs.slice(0, 5).map((k: any) => {
                const rawK = (k as any).raw || {}
                const kCode = k.project_code || rawK['Project Code'] || ''
                const kFullCode = k.project_full_code || rawK['Project Full Code'] || ''
                return {
                  kpiProjectCode: kCode,
                  kpiProjectFullCode: kFullCode,
                  matches: kCode === project.project_code || 
                           kFullCode?.startsWith(project.project_code) ||
                           kFullCode === `${project.project_code}${project.project_sub_code || ''}`
                }
              })
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
          // ✅ Display Project Status calculated automatically based on activities and KPIs
          // Default status is 'upcoming' when project is created, but changes automatically based on activities
          let calculatedStatus: string = 'upcoming'
          
          // Get project activities and KPIs from analytics
          const statusActivities = analytics?.activities || []
          const statusKPIs = analytics?.kpis || []
          
          // Calculate status automatically if we have activities or KPIs
          if (statusActivities.length > 0 || statusKPIs.length > 0) {
            try {
              // Prepare data for status calculation
              const statusData: ProjectStatusData = {
                project_id: project.id,
                project_code: project.project_code || '',
                project_name: project.project_name || '',
                project_start_date: project.project_start_date || project.created_at || new Date().toISOString(),
                project_end_date: project.project_completion_date || getProjectField(project, 'Planned Completion Date') || new Date().toISOString(),
                current_date: new Date().toISOString(),
                activities: statusActivities.map((activity: any) => ({
                  id: activity.id || activity.activity_id || '',
                  activity_timing: activity.activity_timing || (activity as any).raw?.['Activity Timing'] || 'post-commencement',
                  planned_units: activity.planned_units || activity.total_units || 0,
                  actual_units: activity.actual_units || 0,
                  planned_activity_start_date: activity.planned_start_date || (activity as any).raw?.['Planned Start Date'] || '',
                  deadline: activity.deadline || (activity as any).raw?.['Deadline'] || '',
                  status: activity.status || (activity as any).raw?.['Status'] || 'not_started'
                })),
                kpis: statusKPIs.map((kpi: any) => ({
                  id: kpi.id || '',
                  input_type: kpi.input_type || (kpi as any).raw?.['Input Type'] || 'Planned',
                  quantity: kpi.quantity || kpi.Quantity || 0,
                  target_date: kpi.target_date || kpi.activity_date || (kpi as any).raw?.['Target Date'] || (kpi as any).raw?.['Activity Date'] || '',
                  actual_date: kpi.actual_date || (kpi as any).raw?.['Actual Date']
                }))
              }
              
              // Calculate status
              const statusResult = calculateProjectStatus(statusData)
              calculatedStatus = statusResult.status
            } catch (error) {
              console.error('Error calculating project status:', error)
              // Fallback to database status if calculation fails
              calculatedStatus = project.project_status || 'upcoming'
            }
          } else {
            // No activities or KPIs, use database status or default to 'upcoming'
            calculatedStatus = project.project_status || 'upcoming'
          }
          
          // Get display info for the calculated status
          const statusText = getProjectStatusText(calculatedStatus)
          const projectStatusColor = getProjectStatusColor(calculatedStatus)
          const statusInfo = getStatusDisplayInfo(calculatedStatus as any)
          
          // Map icon emoji to React component
          const getStatusIconComponent = () => {
            switch (statusInfo.icon) {
              case '⏳':
                return <Clock className="h-3 w-3" />
              case '🏗️':
                return <Building className="h-3 w-3" />
              case '🚀':
                return <Activity className="h-3 w-3" />
              case '✅':
                return <CheckCircle className="h-3 w-3" />
              case '⏰':
                return <Clock className="h-3 w-3" />
              case '📋':
                return <Target className="h-3 w-3" />
              case '⏸️':
                return <Clock className="h-3 w-3" />
              case '❌':
                return <AlertCircle className="h-3 w-3" />
              default:
                return <Info className="h-3 w-3" />
            }
          }
          
          return (
            <div className="flex items-center gap-2">
              {getStatusIconComponent()}
              <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${projectStatusColor}`}>
                {statusText}
              </span>
            </div>
          )
        
        case 'contract_durations':
          // ✅ Use same data sources as Cards: KPIs and Activities from analytics
          // Cards don't display contract durations, but we use same KPIs/Activities data
          const plannedDatesForContract = getPlannedDatesFromActivities(project)
          const kpiPlannedDatesForContract = getPlannedDatesFromKPIs(project)
          const actualDatesForContract = getActualDatesFromKPIs(project)
          
          // Get dates from all possible sources
          const contractPlannedStart = plannedDatesForContract.start || 
                                       kpiPlannedDatesForContract.start || 
                                       getProjectField(project, 'Planned Start Date') || 
                                       getProjectField(project, 'Planned Start') ||
                                       getProjectField(project, 'Project Start Date') ||
                                       getProjectField(project, 'Commencement Date') ||
                                       ''
          
          const contractPlannedCompletion = plannedDatesForContract.completion || 
                                            kpiPlannedDatesForContract.completion || 
                                            getProjectField(project, 'Planned Completion Date') || 
                                            getProjectField(project, 'Planned Completion') ||
                                            getProjectField(project, 'Project End Date') ||
                                            getProjectField(project, 'Completion Date') ||
                                            ''
          
          // ✅ Calculate contract duration from dates (most accurate)
          let contractDuration = plannedDatesForContract.duration || 0
          if (contractDuration <= 0 && contractPlannedStart && contractPlannedCompletion) {
            const startDate = new Date(contractPlannedStart)
            const endDate = new Date(contractPlannedCompletion)
            if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
              contractDuration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
            }
          }
          
          // ✅ Fallback: From project field
          if (contractDuration <= 0) {
            contractDuration = parseFloat(String(
              getProjectField(project, 'Contract Duration') || 
              getProjectField(project, 'Duration') ||
              getProjectField(project, 'Project Duration') ||
              '0'
            ).replace(/,/g, '')) || 0
          }
          
          // ✅ Fallback: Calculate from contract amount if available (estimate)
          if (contractDuration <= 0) {
            const contractAmt = parseFloat(String(
              project.contract_amount || 
              getProjectField(project, 'Contract Amount') || 
              '0'
            ).replace(/,/g, '')) || 0
            
            // Rough estimate: Larger contracts typically take longer
            if (contractAmt > 0) {
              if (contractAmt >= 10000000) {
                contractDuration = 730 // ~2 years for large projects
              } else if (contractAmt >= 1000000) {
                contractDuration = 365 // ~1 year for medium projects
              } else if (contractAmt >= 100000) {
                contractDuration = 180 // ~6 months for small projects
              } else {
                contractDuration = 90 // ~3 months for very small projects
              }
            }
          }
          
          // Get extension duration
          const extensionDuration = parseFloat(String(
            getProjectField(project, 'Extension of Time Duration') || 
            getProjectField(project, 'Extension Duration') || 
            getProjectField(project, 'EOT Duration') ||
            '0'
          ).replace(/,/g, '')) || 0
          
          // ✅ Calculate actual duration from actual dates
          let contractActualDuration = 0
          const contractActualStart = actualDatesForContract.start || getProjectField(project, 'Actual Start Date') || ''
          const contractActualCompletion = actualDatesForContract.completion || getProjectField(project, 'Actual Completion Date') || ''
          
          if (contractActualStart && contractActualCompletion) {
            const actualStartDate = new Date(contractActualStart)
            const actualEndDate = new Date(contractActualCompletion)
            if (!isNaN(actualStartDate.getTime()) && !isNaN(actualEndDate.getTime())) {
              contractActualDuration = Math.ceil((actualEndDate.getTime() - actualStartDate.getTime()) / (1000 * 60 * 60 * 24))
            }
          } else if (contractActualStart && contractPlannedCompletion) {
            // If only actual start is available, calculate until planned completion
            const actualStartDate = new Date(contractActualStart)
            const plannedEndDate = new Date(contractPlannedCompletion)
            const today = new Date()
            if (!isNaN(actualStartDate.getTime()) && !isNaN(plannedEndDate.getTime())) {
              contractActualDuration = Math.ceil((Math.min(today.getTime(), plannedEndDate.getTime()) - actualStartDate.getTime()) / (1000 * 60 * 60 * 24))
            }
          }
          
          const totalDuration = contractDuration + extensionDuration
          
          return (
            <div className="space-y-1">
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Contract: {contractDuration > 0 ? `${contractDuration} days` : 'N/A'}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Extension: {extensionDuration > 0 ? `${extensionDuration} days` : '0 days'}
              </div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                Total: {totalDuration > 0 ? `${totalDuration} days` : 'N/A'}
              </div>
              {contractActualDuration > 0 && (
                <div className="text-xs text-blue-600 dark:text-blue-400">
                  Actual: {contractActualDuration} days {contractActualDuration > totalDuration ? '(Over)' : contractActualDuration < totalDuration * 0.8 ? '(Ahead)' : ''}
                </div>
              )}
            </div>
          )
        
        case 'planned_dates':
          // ✅ USE BOQ ACTIVITIES FIRST (SAME AS CARDS)
          // Cards (ProjectDetailsPanel) use: activity.planned_activity_start_date and activity.deadline
          // Table now uses: getPlannedDatesFromActivities FIRST (same as Cards), then KPIs as fallback
          // Calculation logic (SAME AS CARDS):
          // 1. Get dates from BOQ Activities: planned_activity_start_date (Start) and deadline (Completion)
          // 2. Start = أول planned_activity_start_date من جميع الأنشطة
          // 3. Completion = آخر deadline من جميع الأنشطة
          // 4. Fallback to KPIs if Activities don't have dates
          
          // ✅ DEBUG: Log data availability
          if (process.env.NODE_ENV === 'development') {
            const projectActivities = allActivities.filter((activity: any) => matchesProject(activity, project))
            console.log(`🔍 [${project.project_code}] Planned Dates Debug:`, {
              allActivitiesCount: allActivities.length,
              projectActivitiesCount: projectActivities.length,
              projectCode: project.project_code,
              sampleActivity: projectActivities[0] ? {
                projectCode: projectActivities[0].project_code || projectActivities[0]['Project Code'],
                activityName: projectActivities[0].activity_name,
                plannedStart: projectActivities[0].planned_activity_start_date || projectActivities[0]['Planned Activity Start Date'],
                deadline: projectActivities[0].deadline || projectActivities[0]['Deadline']
              } : 'No activities found'
            })
          }
          
          // ✅ METHOD 1: From BOQ Activities (Primary Source - SAME AS CARDS)
          const plannedDatesFromActivities = getPlannedDatesFromActivities(project)
          let plannedStart = plannedDatesFromActivities.start || null
          let plannedCompletion = plannedDatesFromActivities.completion || null
          let plannedDuration = plannedDatesFromActivities.duration || 0
          let datesSource = plannedDatesFromActivities.source || 'none'
          
          // ✅ DEBUG: Log result from Activities
          if (process.env.NODE_ENV === 'development') {
            console.log(`📅 [${project.project_code}] Planned Dates from Activities:`, {
              start: plannedStart,
              completion: plannedCompletion,
              duration: plannedDuration,
              source: datesSource,
              formattedStart: plannedStart ? formatDate(plannedStart) : 'N/A',
              formattedCompletion: plannedCompletion ? formatDate(plannedCompletion) : 'N/A'
            })
          }
          
          // ✅ METHOD 2: Fallback to KPIs (only if Activities don't have dates)
          if ((!plannedStart || !plannedCompletion) && allKPIs.length > 0) {
          const plannedDatesFromKPIs = getPlannedDatesFromKPIs(project)
          
            if (!plannedStart && plannedDatesFromKPIs.start) {
              plannedStart = plannedDatesFromKPIs.start
              datesSource = datesSource === 'none' ? 'kpis' : 'activities_kpis'
            }
            
            if (!plannedCompletion && plannedDatesFromKPIs.completion) {
              plannedCompletion = plannedDatesFromKPIs.completion
              datesSource = datesSource === 'none' ? 'kpis' : 'activities_kpis'
            }
          }
          
          // ✅ DEBUG: Log result
          if (process.env.NODE_ENV === 'development') {
            console.log(`📅 [${project.project_code}] Planned Dates from KPIs:`, {
              start: plannedStart,
              completion: plannedCompletion,
              formattedStart: plannedStart ? formatDate(plannedStart) : 'N/A',
              formattedCompletion: plannedCompletion ? formatDate(plannedCompletion) : 'N/A'
            })
          }
          
          // ✅ Fallback ONLY if no KPIs found (to project fields)
          if (!plannedStart || !plannedCompletion) {
            // Only use project fields as fallback if KPIs don't exist
            if (!plannedStart) {
              const projectStart = getProjectField(project, 'Planned Start Date') || 
                                  getProjectField(project, 'Planned Start') || 
                                  getProjectField(project, 'Project Start Date') ||
                                  getProjectField(project, 'Start Date') ||
                                  getProjectField(project, 'Commencement Date') ||
                                  ''
              if (projectStart) {
                plannedStart = projectStart
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
              }
            }
          }
          
          // ✅ Calculate duration from dates (if not already calculated)
          if (plannedDuration === 0 && plannedStart && plannedCompletion) {
            const startDate = new Date(plannedStart)
            const endDate = new Date(plannedCompletion)
            if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
              plannedDuration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
            }
          }
          
          // ✅ Calculate days remaining/elapsed
          let daysInfo = null
          if (plannedStart && plannedCompletion) {
            const startDate = new Date(plannedStart)
            const endDate = new Date(plannedCompletion)
            const today = new Date()
            
            if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
              const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
              const elapsedDays = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
              const remainingDays = totalDays - elapsedDays
              
              if (elapsedDays >= 0) {
                daysInfo = {
                  elapsed: elapsedDays,
                  remaining: remainingDays,
                  total: totalDays,
                  isOverdue: remainingDays < 0
                }
              }
            }
          }
          
          return (
            <div className="space-y-1">
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Start: {plannedStart ? formatDate(plannedStart) : 'N/A'}
                {datesSource !== 'none' && (
                  <span className="ml-1 text-xs text-gray-400" title={`Source: ${datesSource}`}>
                    {datesSource === 'activities' ? '📊' : datesSource === 'kpis' ? '📈' : '📝'}
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Completion: {plannedCompletion ? formatDate(plannedCompletion) : 'N/A'}
              </div>
              {plannedDuration > 0 && (
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  Duration: {plannedDuration} days
                </div>
              )}
              {daysInfo && (
                <div className={`text-xs ${daysInfo.isOverdue ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>
                  {daysInfo.isOverdue 
                    ? `Overdue: ${Math.abs(daysInfo.remaining)} days` 
                    : `Remaining: ${daysInfo.remaining} days`}
                </div>
              )}
            </div>
          )
        
        case 'actual_dates':
          // ✅ USE BOQ ACTIVITIES FIRST (SAME AS CARDS), THEN KPIs
          // Cards (ProjectDetailsPanel) prioritize: activity dates, then KPIs
          // Table now uses: BOQ Activities actual dates FIRST, then KPIs, then project fields
          // Calculation logic (SAME AS CARDS):
          // 1. Get actual dates from BOQ Activities (activity_actual_start_date, activity_actual_completion_date)
          // 2. Fallback to KPIs (Actual KPIs from analytics.kpis)
          // 3. Fallback to project fields
          
          let actualStartDate = ''
          let actualCompletionDate = ''
          let actualDatesSource = 'none'
          
          // ✅ METHOD 1: From BOQ Activities (Primary Source - SAME AS CARDS)
          if (allActivities.length > 0) {
            const projectActivities = allActivities.filter((activity: any) => matchesProject(activity, project))
            
            if (projectActivities.length > 0) {
              const activitiesWithActualDates = projectActivities
                .map((activity: any) => {
              const rawActivity = (activity as any).raw || {}
              
                  const activityActualStart = activity.activity_actual_start_date ||
                                           activity['Activity Actual Start Date'] ||
                                           rawActivity['Activity Actual Start Date'] ||
                                           activity.actual_start_date ||
                                         activity['Actual Start Date'] ||
                                         rawActivity['Actual Start Date'] ||
                                         ''
              
                  const activityActualEnd = activity.activity_actual_completion_date ||
                                           activity['Activity Actual Completion Date'] ||
                                           rawActivity['Activity Actual Completion Date'] ||
                                           activity.actual_completion_date ||
                                       activity['Actual Completion Date'] ||
                                       rawActivity['Actual Completion Date'] ||
                                       activity.completion_date ||
                                       ''
              
                  return { start: activityActualStart, end: activityActualEnd }
                })
                .filter(item => item.start || item.end)
              
              if (activitiesWithActualDates.length > 0) {
                const validStarts = activitiesWithActualDates
                  .map(a => parseDateString(a.start))
                  .filter((d): d is Date => d !== null && !isNaN(d.getTime()))
                
                const validEnds = activitiesWithActualDates
                  .map(a => parseDateString(a.end))
                  .filter((d): d is Date => d !== null && !isNaN(d.getTime()))
                
                if (validStarts.length > 0) {
                  actualStartDate = new Date(Math.min(...validStarts.map(d => d.getTime()))).toISOString()
                  actualDatesSource = 'activities'
                }
                
                if (validEnds.length > 0) {
                  actualCompletionDate = new Date(Math.max(...validEnds.map(d => d.getTime()))).toISOString()
                  actualDatesSource = 'activities'
                }
              }
            }
          }
          
          // ✅ METHOD 2: Fallback to KPIs (if Activities don't have actual dates)
          if ((!actualStartDate || !actualCompletionDate) && allKPIs.length > 0) {
            const actualDatesFromKPIs = getActualDatesFromKPIs(project)
            
            if (!actualStartDate && actualDatesFromKPIs.start) {
              actualStartDate = actualDatesFromKPIs.start
              actualDatesSource = actualDatesSource === 'none' ? 'kpis' : 'activities_kpis'
            }
            
            if (!actualCompletionDate && actualDatesFromKPIs.completion) {
              actualCompletionDate = actualDatesFromKPIs.completion
              actualDatesSource = actualDatesSource === 'none' ? 'kpis' : 'activities_kpis'
            }
          }
          
          // ✅ METHOD 3: Fallback to Project Fields
          if (!actualStartDate) {
            actualStartDate = getProjectField(project, 'Actual Start Date') || 
                             getProjectField(project, 'Actual Start') ||
                             getProjectField(project, 'Project Actual Start Date') ||
                             getProjectField(project, 'Start Date (Actual)') ||
                             ''
            if (actualStartDate) {
              actualDatesSource = actualDatesSource === 'none' ? 'project_fields' : actualDatesSource
            }
          }
          
          if (!actualCompletionDate) {
            actualCompletionDate = getProjectField(project, 'Actual Completion Date') || 
                                getProjectField(project, 'Actual Completion') ||
                                getProjectField(project, 'Project Actual End Date') ||
                                getProjectField(project, 'Completion Date (Actual)') ||
                                ''
            if (actualCompletionDate) {
              actualDatesSource = actualDatesSource === 'none' ? 'project_fields' : actualDatesSource
            }
          }
          
          // ✅ Calculate actual duration
          let actualDatesDuration = 0
          if (actualStartDate && actualCompletionDate) {
            const startDateObj = new Date(actualStartDate)
            const endDateObj = new Date(actualCompletionDate)
            if (!isNaN(startDateObj.getTime()) && !isNaN(endDateObj.getTime())) {
              actualDatesDuration = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24))
            }
          }
          
          // ✅ Compare with planned dates if available (use same source as planned_dates column)
          const plannedDatesCompare = getPlannedDatesFromActivities(project)
          let plannedStartCompare = plannedDatesCompare.start || null
          let plannedCompletionCompare = plannedDatesCompare.completion || null
          
          // Fallback to KPIs if Activities don't have planned dates
          if ((!plannedStartCompare || !plannedCompletionCompare) && allKPIs.length > 0) {
            const plannedDatesFromKPIs = getPlannedDatesFromKPIs(project)
            if (!plannedStartCompare && plannedDatesFromKPIs.start) {
              plannedStartCompare = plannedDatesFromKPIs.start
            }
            if (!plannedCompletionCompare && plannedDatesFromKPIs.completion) {
              plannedCompletionCompare = plannedDatesFromKPIs.completion
            }
          }
          
          // Final fallback to project fields
          if (!plannedStartCompare) {
            plannedStartCompare = getProjectField(project, 'Planned Start Date') || ''
          }
          if (!plannedCompletionCompare) {
            plannedCompletionCompare = getProjectField(project, 'Planned Completion Date') || ''
          }
          
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
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Start: {actualStartDate ? formatDate(actualStartDate) : 'N/A'}
                {varianceInfo?.start !== undefined && (
                  <span className={`ml-2 ${varianceInfo.start > 0 ? 'text-red-600 dark:text-red-400' : varianceInfo.start < 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                    ({varianceInfo.start > 0 ? '+' : ''}{varianceInfo.start} days)
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Completion: {actualCompletionDate ? formatDate(actualCompletionDate) : 'N/A'}
                {varianceInfo?.completion !== undefined && (
                  <span className={`ml-2 ${varianceInfo.completion > 0 ? 'text-red-600 dark:text-red-400' : varianceInfo.completion < 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                    ({varianceInfo.completion > 0 ? '+' : ''}{varianceInfo.completion} days)
                  </span>
                )}
              </div>
              {actualDatesDuration > 0 && (
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  Duration: {actualDatesDuration} days
                </div>
              )}
            </div>
          )
        
        case 'progress_summary':
          // ✅ NEW CONCEPTS: 
          // Planned = مجموع KPI Planned / Total Value
          // Actual = مجموع KPI Actual / Total Value
          // - plannedProgress = (Planned Value / Total Value) × 100
          //   where Planned Value = مجموع KPI Planned حتى اليوم فقط (yesterday)
          // - actualProgress = (Earned Value / Total Value) × 100
          //   where Earned Value = مجموع KPI Actual حتى اليوم فقط (yesterday)
          const progressActualProgress = analytics?.actualProgress || 0
          const progressPlannedProgress = analytics?.plannedProgress || 0
          
          const progress = {
            planned: progressPlannedProgress, // مجموع KPI Planned / Total Value
            actual: progressActualProgress,   // مجموع KPI Actual / Total Value
            source: analytics ? 'analytics' : 'none'
          }
          const varianceProgress = progress.actual - progress.planned
          
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
                  <span className="font-medium">{progress.planned.toFixed(1)}%</span>
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
                  <span className="font-medium">{progress.actual.toFixed(1)}%</span>
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
                  Variance: {varianceProgress >= 0 ? '+' : ''}{varianceProgress.toFixed(1)}%
                </div>
              </div>
            </div>
          )
        
        case 'work_value_status':
          // ✅ NEW CONCEPTS: Use updated analytics with new concepts
          const totalValue = analytics?.totalValue || 0
          const totalPlannedValue = analytics?.totalPlannedValue || 0
          const totalEarnedValue = analytics?.totalEarnedValue || 0
          const totalRemainingValue = analytics?.totalRemainingValue || 0
          const variance = analytics?.variance || 0
          const actualProgress = analytics?.actualProgress || 0
          const plannedProgress = analytics?.plannedProgress || 0
          
          return (
            <div className="space-y-2">
              {/* Total Value */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">Total Value</span>
                <span className="font-medium">{formatCurrencyByCodeSync(totalValue, project.currency)}</span>
              </div>
              
              {/* Planned Value */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">Planned Value</span>
                <span className="font-medium text-blue-600 dark:text-blue-400">{formatCurrencyByCodeSync(totalPlannedValue, project.currency)}</span>
              </div>
              
              {/* Earned Value */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">Earned Value</span>
                <span className="font-medium text-green-600 dark:text-green-400">{formatCurrencyByCodeSync(totalEarnedValue, project.currency)}</span>
              </div>
              
              {/* Remaining Value */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">Remaining Value</span>
                <span className="font-medium text-orange-600 dark:text-orange-400">{formatCurrencyByCodeSync(totalRemainingValue, project.currency)}</span>
              </div>
              
              {/* Variance */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-200 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Variance</span>
                <span className={`font-medium ${variance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatCurrencyByCodeSync(variance, project.currency)}
                </span>
              </div>
              
              {/* Progress bars */}
              {totalValue > 0 && (
                <>
                  <div className="pt-1 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400">Actual Progress</span>
                      <span className="font-medium text-green-600 dark:text-green-400">{actualProgress.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                      <div 
                        className="bg-green-500 h-1.5 rounded-full transition-all" 
                        style={{ width: `${Math.min(100, Math.max(0, actualProgress))}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400">Planned Progress</span>
                      <span className="font-medium text-blue-600 dark:text-blue-400">{plannedProgress.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                      <div 
                        className="bg-blue-500 h-1.5 rounded-full transition-all" 
                        style={{ width: `${Math.min(100, Math.max(0, plannedProgress))}%` }}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          )
        
        case 'contract_amount':
          // ✅ Use analytics from calculateProjectAnalytics (same as Cards)
          // Cards display: project.contract_amount directly
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
                Contract: {formatCurrencyByCodeSync(contractAmt, project.currency)}
              </div>
              {variationsAmt > 0 && (
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Variations: {formatCurrencyByCodeSync(variationsAmt, project.currency)}
                </div>
              )}
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                Total: {formatCurrencyByCodeSync(totalContractAmt, project.currency)}
              </div>
            </div>
          )
        
        case 'divisions_contract_amount':
          // ✅ Get divisions from scope_of_works (project.project_type)
          const divisionsScopeRaw = project.project_type || getProjectField(project, 'Scope of Works') || ''
          const divisionsScopeList = divisionsScopeRaw && divisionsScopeRaw !== 'N/A' 
            ? divisionsScopeRaw.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0)
            : []
          
          // ✅ Map to store division amounts
          const divisionAmounts: Record<string, number> = {}
          
          // Initialize divisions from scope
          divisionsScopeList.forEach((scope: string) => {
            const scopeKey = scope.trim().toLowerCase()
            if (!divisionAmounts[scopeKey]) {
              divisionAmounts[scopeKey] = 0
            }
          })
          
          // ✅ Get activities for this project - USE allActivities DIRECTLY (more reliable)
          // Don't rely on analytics.activities as it might not have all the data
          const projectActivities = allActivities.length > 0 
            ? allActivities.filter((activity: any) => matchesProject(activity, project))
            : (analytics?.activities || [])
          
          // ✅ DEBUG: Log activities for troubleshooting
          if (process.env.NODE_ENV === 'development') {
            console.log(`🔍 [${project.project_code}] Divisions Contract Amount Debug:`, {
              allActivitiesCount: allActivities.length,
              projectActivitiesCount: projectActivities.length,
              scopeList: divisionsScopeList,
              analyticsActivitiesCount: analytics?.activities?.length || 0,
              sampleActivity: projectActivities.length > 0 ? {
                activityName: projectActivities[0].activity_name,
                activityDivision: projectActivities[0].activity_division || projectActivities[0]['Activity Division'],
                activityValue: projectActivities[0].activity_value || projectActivities[0]['Activity Value'] || projectActivities[0].raw?.['Activity Value'],
                totalValue: projectActivities[0].total_value || projectActivities[0]['Total Value'],
                plannedValue: projectActivities[0].planned_value || projectActivities[0]['Planned Value'],
                rate: projectActivities[0].rate || projectActivities[0]['Rate'],
                totalUnits: projectActivities[0].total_units || projectActivities[0]['Total Units'],
                hasRaw: !!projectActivities[0].raw,
                rawActivityValue: projectActivities[0].raw?.['Activity Value'],
                projectCode: projectActivities[0].project_code,
                rawProjectCode: projectActivities[0].raw?.['Project Code']
              } : 'No activities found'
            })
          }
          
          // ✅ Calculate amount for each division from activities
          projectActivities.forEach((activity: any) => {
            // Get activity division from multiple possible fields
            const rawActivity = (activity as any).raw || {}
            const activityDivision = (activity['Activity Division'] || 
                                     activity.activity_division || 
                                     rawActivity['Activity Division'] ||
                                     activity.division ||
                                     '').toLowerCase().trim()
            
            // ✅ Get activity value - SAME WAY AS BOQ (use total_value directly)
            // In BOQ, Activity Value column displays: activity.total_value
            // So we use the same approach here
            let totalValue = 0
            
            // ✅ Use total_value directly (same as BOQ does)
            // Check in order: raw data, then mapped fields, then calculate
            const rawTotalValue = rawActivity['Total Value']
            const mappedTotalValue = activity.total_value
            
            // ✅ PRIORITY 1: Use total_value from raw (direct from database)
            if (rawTotalValue !== null && rawTotalValue !== undefined && rawTotalValue !== '') {
              const parsed = parseFloat(String(rawTotalValue).replace(/,/g, ''))
              if (!isNaN(parsed) && parsed > 0) {
                totalValue = parsed
              }
            }
            
            // ✅ PRIORITY 2: Use total_value from mapped fields
            if (totalValue === 0 && mappedTotalValue !== null && mappedTotalValue !== undefined) {
              const parsed = parseFloat(String(mappedTotalValue).replace(/,/g, ''))
              if (!isNaN(parsed) && parsed > 0) {
                totalValue = parsed
              }
            }
            
            // ✅ PRIORITY 3: Calculate from Rate × Total Units (same as BOQ fallback)
            if (totalValue === 0) {
              const rate = activity.rate || parseFloat(String(rawActivity['Rate'] || '0').replace(/,/g, ''))
              const totalUnits = activity.total_units || parseFloat(String(rawActivity['Total Units'] || '0').replace(/,/g, ''))
              
              if (rate > 0 && totalUnits > 0) {
                totalValue = rate * totalUnits
              }
            }
            
            // ✅ DEBUG: Log value extraction for first few activities
            if (process.env.NODE_ENV === 'development' && projectActivities.indexOf(activity) < 3) {
              console.log(`💰 [${project.project_code}] Activity Value Extraction (BOQ Method):`, {
                activityName: activity.activity_name,
                activityDivision: activityDivision,
                rawTotalValue: rawTotalValue,
                mappedTotalValue: mappedTotalValue,
                finalTotalValue: totalValue,
                rate: activity.rate || rawActivity['Rate'],
                totalUnits: activity.total_units || rawActivity['Total Units'],
                calculated: totalValue > 0 && (activity.rate || rawActivity['Rate']) ? 'Rate × Units' : 'Direct'
              })
            }
            
            // ✅ Match activity division with scope divisions
            if (activityDivision && totalValue > 0) {
              // Try to match with existing divisions in scope
              let matched = false
              for (const scope of divisionsScopeList) {
                const scopeLower = scope.toLowerCase().trim()
                // Check if activity division matches any scope division (more flexible matching)
                if (activityDivision.includes(scopeLower) || 
                    scopeLower.includes(activityDivision) ||
                    activityDivision === scopeLower) {
                  const key = scopeLower
                  divisionAmounts[key] = (divisionAmounts[key] || 0) + totalValue
                  matched = true
                  break
                }
              }
              
              // If no match found, add as new division (use original division name)
              if (!matched && activityDivision) {
                // Use the original division name from activity
                const originalDivision = activity['Activity Division'] || 
                                        activity.activity_division || 
                                        rawActivity['Activity Division'] ||
                                        activityDivision
                divisionAmounts[originalDivision.toLowerCase().trim()] = 
                  (divisionAmounts[originalDivision.toLowerCase().trim()] || 0) + totalValue
              }
            }
          })
          
          // ✅ Also check project fields for division amounts (fallback)
          if (divisionsScopeList.length > 0) {
            divisionsScopeList.forEach((scope: string) => {
              const scopeKey = scope.toLowerCase().trim()
              // Try to get from project fields
              const fieldValue = parseFloat(String(
                getProjectField(project, `${scope} Division T. Contract Value`) || 
                getProjectField(project, `${scope} Division Contract Value`) || 
                getProjectField(project, `${scope} Contract Value`) ||
                '0'
              ).replace(/,/g, '')) || 0
              
              if (fieldValue > 0 && (!divisionAmounts[scopeKey] || divisionAmounts[scopeKey] === 0)) {
                divisionAmounts[scopeKey] = fieldValue
              }
            })
          }
          
          // Calculate total
          const divisionsTotal = Object.values(divisionAmounts).reduce((sum: number, val: number) => sum + val, 0)
          
          // Get divisions to display (from scope, or all divisions found)
          const divisionsToShow = divisionsScopeList.length > 0 ? divisionsScopeList : Object.keys(divisionAmounts)
          
          // Limit display to 3 divisions initially
          const isExpandedDivisions = expandedDivisions.has(project.id)
          const maxVisibleDivisions = 3 // Show max 3 divisions initially
          const visibleDivisions = isExpandedDivisions ? divisionsToShow : divisionsToShow.slice(0, maxVisibleDivisions)
          const hasMoreDivisions = divisionsToShow.length > maxVisibleDivisions
          
          const toggleExpandDivisions = (e: React.MouseEvent) => {
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
          
          return (
            <div className="space-y-1">
              {divisionsToShow.length > 0 ? (
                <>
                  {visibleDivisions.map((division: string, index: number) => {
                    const divisionKey = division.toLowerCase().trim()
                    const amount = divisionAmounts[divisionKey] || 0
                    return (
                      <div key={index} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600 dark:text-gray-400 truncate max-w-[120px]">
                          {division}:
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatCurrencyByCodeSync(amount, project.currency)}
                        </span>
              </div>
                    )
                  })}
                  {hasMoreDivisions && (
                    <button
                      onClick={toggleExpandDivisions}
                      className="px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
                      title={isExpandedDivisions ? 'Show Less' : `Show ${divisionsToShow.length - maxVisibleDivisions} more`}
                    >
                      {isExpandedDivisions ? 'Show Less' : `+${divisionsToShow.length - maxVisibleDivisions}`}
                    </button>
                  )}
              {divisionsTotal > 0 && (
                    <div className="pt-1 border-t border-gray-200 dark:border-gray-700 mt-1">
                  <div className="flex items-center justify-between text-sm font-semibold text-gray-900 dark:text-white">
                    <span>Total:</span>
                    <span>{formatCurrencyByCodeSync(divisionsTotal, project.currency)}</span>
                  </div>
                </div>
              )}
                </>
              ) : (
                <div className="text-xs text-gray-500 dark:text-gray-400 italic">No data available</div>
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
        
        case 'project_start_date':
          const startDate = project.project_start_date || getProjectField(project, 'Project Start Date') || ''
          return (
            <div className="text-sm text-gray-900 dark:text-white">
              {startDate ? formatDate(startDate) : <span className="text-gray-400 dark:text-gray-500">N/A</span>}
            </div>
          )
        
        case 'project_completion_date':
          const completionDate = project.project_completion_date || getProjectField(project, 'Project Completion Date') || ''
          return (
            <div className="text-sm text-gray-900 dark:text-white">
              {completionDate ? formatDate(completionDate) : <span className="text-gray-400 dark:text-gray-500">N/A</span>}
            </div>
          )
        
        case 'project_duration':
          // Use stored duration or calculate from dates
          let duration = project.project_duration
          if (duration === undefined || duration === null) {
            const startDateForDuration = project.project_start_date || getProjectField(project, 'Project Start Date') || ''
            const completionDateForDuration = project.project_completion_date || getProjectField(project, 'Project Completion Date') || ''
            
            if (startDateForDuration && completionDateForDuration) {
              const start = new Date(startDateForDuration)
              const completion = new Date(completionDateForDuration)
              if (!isNaN(start.getTime()) && !isNaN(completion.getTime())) {
                const diffTime = completion.getTime() - start.getTime()
                duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 // Include both start and end days
              }
            }
          }
          
          return (
            <div className="text-sm text-gray-900 dark:text-white">
              {duration !== undefined && duration !== null ? (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">{duration}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {duration === 1 ? 'day' : 'days'}
                  </span>
                </div>
              ) : (
                <span className="text-gray-400 dark:text-gray-500">N/A</span>
              )}
            </div>
          )
        
        case 'retention_after_completion':
          const retentionAfterCompletion = project.retention_after_completion ?? getProjectField(project, 'Retention after Completion')
          return (
            <div className="text-sm text-gray-900 dark:text-white">
              {retentionAfterCompletion !== undefined && retentionAfterCompletion !== null && retentionAfterCompletion !== '' 
                ? `${retentionAfterCompletion}%` 
                : <span className="text-gray-400 dark:text-gray-500">N/A</span>}
            </div>
          )
        
        case 'retention_after_6_month':
          const retentionAfter6Month = project.retention_after_6_month ?? getProjectField(project, 'Retention after 6 Month')
          return (
            <div className="text-sm text-gray-900 dark:text-white">
              {retentionAfter6Month !== undefined && retentionAfter6Month !== null && retentionAfter6Month !== '' 
                ? `${retentionAfter6Month}%` 
                : <span className="text-gray-400 dark:text-gray-500">N/A</span>}
            </div>
          )
        
        case 'retention_after_12_month':
          const retentionAfter12Month = project.retention_after_12_month ?? getProjectField(project, 'Retention after 12 Month')
          return (
            <div className="text-sm text-gray-900 dark:text-white">
              {retentionAfter12Month !== undefined && retentionAfter12Month !== null && retentionAfter12Month !== '' 
                ? `${retentionAfter12Month}%` 
                : <span className="text-gray-400 dark:text-gray-500">N/A</span>}
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
        
        case 'first_party_name':
          const firstPartyName = project.first_party_name || getProjectField(project, 'First Party name') || 'N/A'
          return (
            <div className="text-sm text-gray-900 dark:text-white">
              {firstPartyName !== 'N/A' ? firstPartyName : <span className="text-gray-400 dark:text-gray-500">N/A</span>}
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
        
        case 'created_by':
          const createdBy = project.created_by || getProjectField(project, 'created_by') || 'N/A'
          return (
            <div className="text-sm text-gray-900 dark:text-white">
              {createdBy !== 'N/A' ? createdBy : <span className="text-gray-400 dark:text-gray-500">N/A</span>}
            </div>
          )
        
        case 'actions':
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
  }, [projectsAnalytics, allActivities, allKPIs, matchesProject, getProjectField, getPlannedDatesFromActivities, getActualDatesFromKPIs, copiedPlotNumber, expandedScopes, expandedDivisions])

  // ✅ PERFORMANCE: Memoize visible columns to prevent unnecessary recalculations
  const visibleColumns = useMemo(() => {
    return columns.filter(col => col.visible).sort((a, b) => a.order - b.order)
  }, [columns])

  // Sorting handler
  const handleSort = (columnId: string) => {
    // Don't sort select or actions columns
    if (columnId === 'select' || columnId === 'actions') return
    
    if (sortColumn === columnId) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // New column, default to ascending
      setSortColumn(columnId)
      setSortDirection('asc')
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
      case 'planned_dates':
        const plannedStartDate = getProjectField(project, 'Planned Start Date') || ''
        return plannedStartDate ? new Date(plannedStartDate).getTime() : 0
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
      case 'project_start_date':
        const startDate = project.project_start_date || getProjectField(project, 'Project Start Date') || ''
        return startDate ? new Date(startDate).getTime() : 0
      case 'project_completion_date':
        const completionDate = project.project_completion_date || getProjectField(project, 'Project Completion Date') || ''
        return completionDate ? new Date(completionDate).getTime() : 0
      case 'project_duration':
        return project.project_duration ?? 0
      case 'retention_after_completion':
        return project.retention_after_completion ?? getProjectField(project, 'Retention after Completion') ?? 0
      case 'retention_after_6_month':
        return project.retention_after_6_month ?? getProjectField(project, 'Retention after 6 Month') ?? 0
      case 'retention_after_12_month':
        return project.retention_after_12_month ?? getProjectField(project, 'Retention after 12 Month') ?? 0
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
      case 'virtual_material_value':
        const virtualMatValue = project.virtual_material_value || getProjectField(project, 'Virtual Material Value') || '0'
        const virtualMatNum = parseFloat(String(virtualMatValue).replace(/[%,]/g, '')) || 0
        return virtualMatNum
      case 'client_name':
        return project.client_name || getProjectField(project, 'Client Name') || ''
      case 'consultant_name':
        return project.consultant_name || getProjectField(project, 'Consultant Name') || ''
      case 'first_party_name':
        return project.first_party_name || getProjectField(project, 'First Party Name') || ''
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
            {sortedProjects.map((project) => (
              <tr
                key={project.id}
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
                    {renderCell(project, column)}
                  </td>
                ))}
              </tr>
            ))}
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
    </div>
  )
}
