'use client'

import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { useAuth } from '@/app/providers'
import { PermissionGuard } from '@/components/common/PermissionGuard'
import { getSupabaseClient, executeQuery } from '@/lib/simpleConnectionManager'
import { useSmartLoading } from '@/lib/smartLoadingManager'
import { KPIRecord, Project, BOQActivity, TABLES } from '@/lib/supabase'
import { mapKPIFromDB, mapProjectFromDB, mapBOQFromDB } from '@/lib/dataMappers'
import { processKPIRecord, ProcessedKPI } from '@/lib/kpiProcessor'
import { KPIDataMapper } from '@/lib/kpi-data-mapper'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Alert } from '@/components/ui/Alert'
import { IntelligentKPIForm } from '@/components/kpi/IntelligentKPIForm'
import { EnhancedSmartActualKPIForm } from '@/components/kpi/EnhancedSmartActualKPIForm'
import { OptimizedKPITable } from '@/components/kpi/OptimizedKPITable'
import { KPITableWithCustomization } from '@/components/kpi/KPITableWithCustomization'
import { BulkEditKPIModal } from '@/components/kpi/BulkEditKPIModal'
import { syncBOQFromKPI } from '@/lib/boqKpiSync'
import { calculateActivityProgress, ActivityProgress } from '@/lib/progressCalculator'
import { autoSaveOnKPIUpdate } from '@/lib/autoCalculationSaver'
import { UnifiedFilter, FilterState } from '@/components/ui/UnifiedFilter'
import { Pagination } from '@/components/ui/Pagination'
import { SmartFilter } from '@/components/ui/SmartFilter'
import { Plus, BarChart3, CheckCircle, Clock, AlertCircle, Target, Info, Filter, X, Coins, DollarSign, Lock } from 'lucide-react'
import { formatCurrencyByCodeSync } from '@/lib/currenciesManager'
import { ExportButton } from '@/components/ui/ExportButton'
import { ImportButton } from '@/components/ui/ImportButton'
import { PrintButton } from '@/components/ui/PrintButton'
import { PermissionButton } from '@/components/ui/PermissionButton'
import { useEntityActivityTracker } from '@/hooks/useActivityTracker'

interface KPITrackingProps {
  globalSearchTerm?: string
  globalFilters?: {
    project: string
    status: string
    division: string
    dateRange: string
  }
}

export function KPITracking({ globalSearchTerm = '', globalFilters = { project: '', status: '', division: '', dateRange: '' } }: KPITrackingProps = {}) {
  const router = useRouter()
  const guard = usePermissionGuard()
  const { user: authUser, appUser } = useAuth()
  const activityTracker = useEntityActivityTracker('kpi')
  const [kpis, setKpis] = useState<ProcessedKPI[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [activities, setActivities] = useState<BOQActivity[]>([])
  const [activityProgresses, setActivityProgresses] = useState<ActivityProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const isMountedRef = useRef(true) // ✅ Track if component is mounted
  const isLoadingRef = useRef(false) // ✅ Prevent multiple simultaneous loads
  const hasFetchedRef = useRef(false) // ✅ Track if initial fetch has been done
  
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
              // Store the first scope found for each activity
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
    
    // ✅ Defer loading to avoid blocking navigation
    const scopeTimeout = setTimeout(() => {
    loadActivityScopes()
    }, 50) // Small delay to allow UI to render first
    
    return () => clearTimeout(scopeTimeout)
  }, [])
  const [showForm, setShowForm] = useState(false)
  const [showEnhancedForm, setShowEnhancedForm] = useState(false)
  const [editingKPI, setEditingKPI] = useState<KPIRecord | null>(null)
  const [showBulkEditModal, setShowBulkEditModal] = useState(false)
  const [selectedKPIsForBulkEdit, setSelectedKPIsForBulkEdit] = useState<ProcessedKPI[]>([])
  // ✅ Standard View - only enable if user has permission
  const [useCustomizedTable, setUseCustomizedTable] = useState(false)
  const [hasInitializedView, setHasInitializedView] = useState(false)
  
  // Ensure Standard View is only enabled if user has permission (only on initial load)
  useEffect(() => {
    // Only set initial value once, not on every guard change
    if (!hasInitializedView) {
      if (guard.hasAccess('kpi.view')) {
        setUseCustomizedTable(true)
      } else {
        setUseCustomizedTable(false)
      }
      setHasInitializedView(true)
    }
  }, [guard, hasInitializedView])
  // editingKPI is now handled by EnhancedKPITable
  const [filters, setFilters] = useState<FilterState>({})
  
  // Smart Filter State
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])
  const [selectedActivities, setSelectedActivities] = useState<string[]>([])
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [selectedZones, setSelectedZones] = useState<string[]>([])
  const [selectedUnits, setSelectedUnits] = useState<string[]>([])
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>([])
  const [selectedScopes, setSelectedScopes] = useState<string[]>([])
  const [selectedActivityTimings, setSelectedActivityTimings] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<{ from?: string; to?: string }>({})
  const [valueRange, setValueRange] = useState<{ min?: number; max?: number }>({})
  const [quantityRange, setQuantityRange] = useState<{ min?: number; max?: number }>({})
  const [currentPage, setCurrentPage] = useState(1)
  const [totalKPICount, setTotalKPICount] = useState(0)
  const [pendingKPICount, setPendingKPICount] = useState(0) // Count of KPIs pending approval
  const itemsPerPage = 50 // Show 50 KPIs per page
  
  // ✅ Server-side sorting state
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  
  const supabase = getSupabaseClient()
  const { startSmartLoading, stopSmartLoading } = useSmartLoading('kpi') // ✅ Smart loading
  
  // ✅ Permission check - return access denied if user doesn't have permission
  if (!guard.hasAccess('kpi.view')) {
    return (
      <div className="p-6">
        <Alert variant="error">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            <div>
              <h3 className="font-semibold">Access Denied</h3>
              <p className="text-sm">You do not have permission to view KPI. Please contact your administrator.</p>
            </div>
          </div>
        </Alert>
      </div>
    )
  }

  // Handle unified filter changes (legacy - not used with SmartFilter)
  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters)
    setCurrentPage(1)
    // No need to fetch data - filtering is done locally
  }

  // Fetch count of KPIs pending approval
  const fetchPendingKPICount = async () => {
    try {
      // Fetch ALL Actual KPIs to count those without approval
      let allData: any[] = []
      let offset = 0
      const chunkSize = 1000
      let hasMore = true
      
      while (hasMore) {
        const { data: chunkData, error: chunkError } = await supabase
          .from(TABLES.KPI)
          .select('*')
          .eq('Input Type', 'Actual')
          .order('created_at', { ascending: false })
          .range(offset, offset + chunkSize - 1)
        
        if (chunkError) {
          console.error('Error fetching pending KPIs count:', chunkError)
          break
        }
        
        if (!chunkData || chunkData.length === 0) {
          hasMore = false
          break
        }
        
        allData = [...allData, ...chunkData]
        
        if (chunkData.length < chunkSize) {
          hasMore = false
        } else {
          offset += chunkSize
        }
      }
      
      // Filter to only those that need approval
      const pendingCount = allData.filter((row: any) => {
        const approvalStatus = row['Approval Status']
        const notes = row['Notes'] || ''
        
        // Normalize approval status
        let approvalStatusStr = ''
        if (approvalStatus !== null && approvalStatus !== undefined && approvalStatus !== '') {
          approvalStatusStr = String(approvalStatus).toLowerCase().trim()
        }
        
        // Check Notes field for approval status (fallback)
        const notesStr = String(notes)
        const notesHasApproved = notesStr.includes('APPROVED:') && notesStr.includes(':approved:')
        
        // Exclude if explicitly approved
        const isExplicitlyApproved = (approvalStatusStr === 'approved') || notesHasApproved
        
        // Include if NOT approved
        return !isExplicitlyApproved
      }).length
      
      setPendingKPICount(pendingCount)
      console.log(`📊 Pending KPIs count: ${pendingCount}`)
    } catch (err: any) {
      console.error('Error fetching pending KPIs count:', err)
      setPendingKPICount(0)
    }
  }

  // ✅ Handle server-side sorting
  const handleSort = useCallback((columnId: string, direction: 'asc' | 'desc') => {
    setSortColumn(columnId)
    setSortDirection(direction)
    setCurrentPage(1) // Reset to first page when sorting changes
  }, [])
  
  // ✅ Map column ID to database column name for sorting
  const getSortColumnName = (columnId: string): string | null => {
    const columnMap: Record<string, string> = {
      'activity_details': 'Activity Name',
      'date': 'Activity Date',
      'input_type': 'Input Type',
      'quantities': 'Quantity',
      'value': 'Value',
      'virtual_value': 'Virtual Material Value',
      'activity_commencement_relation': 'Activity Timing',
      'activity_division': 'Activity Division',
      'activity_scope': 'Activity Scope',
      'key_dates': 'Key Date',
      'cumulative_quantity': 'Quantity', // Use Quantity for cumulative
      'cumulative_value': 'Value' // Use Value for cumulative
    }
    return columnMap[columnId] || null
  }

  // ✅ Sort processed KPIs by column ID
  const sortKPIs = useCallback((kpis: ProcessedKPI[], columnId: string | null, direction: 'asc' | 'desc'): ProcessedKPI[] => {
    if (!columnId) return kpis

    const sorted = [...kpis].sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (columnId) {
        case 'activity_details':
          aValue = (a.activity_name || '').toLowerCase()
          bValue = (b.activity_name || '').toLowerCase()
          break
        case 'date':
        case 'key_dates':
          aValue = a.activity_date || a.target_date || ''
          bValue = b.activity_date || b.target_date || ''
          break
        case 'input_type':
          aValue = (a.input_type || '').toLowerCase()
          bValue = (b.input_type || '').toLowerCase()
          break
        case 'quantities':
        case 'cumulative_quantity':
          aValue = Number(a.quantity || 0)
          bValue = Number(b.quantity || 0)
          break
        case 'value':
        case 'cumulative_value':
          aValue = Number(a.value || 0)
          bValue = Number(b.value || 0)
          break
        case 'virtual_value': {
          const aRaw = (a as any).raw || {}
          const bRaw = (b as any).raw || {}
          aValue = Number(aRaw['Virtual Material Value'] || 0)
          bValue = Number(bRaw['Virtual Material Value'] || 0)
          break
        }
        case 'activity_commencement_relation': {
          const aRaw = (a as any).raw || {}
          const bRaw = (b as any).raw || {}
          aValue = (aRaw['Activity Timing'] || '').toLowerCase()
          bValue = (bRaw['Activity Timing'] || '').toLowerCase()
          break
        }
        case 'activity_division': {
          const aRaw = (a as any).raw || {}
          const bRaw = (b as any).raw || {}
          aValue = (aRaw['Activity Division'] || '').toLowerCase()
          bValue = (bRaw['Activity Division'] || '').toLowerCase()
          break
        }
        case 'activity_scope': {
          const aRaw = (a as any).raw || {}
          const bRaw = (b as any).raw || {}
          aValue = (aRaw['Activity Scope'] || '').toLowerCase()
          bValue = (bRaw['Activity Scope'] || '').toLowerCase()
          break
        }
        default:
          // Default sort by created_at
          aValue = a.created_at || ''
          bValue = b.created_at || ''
      }

      // Handle date comparison
      if (columnId === 'date' || columnId === 'key_dates') {
        const aDate = aValue ? new Date(aValue).getTime() : 0
        const bDate = bValue ? new Date(bValue).getTime() : 0
        return direction === 'asc' ? aDate - bDate : bDate - aDate
      }

      // Handle number comparison
      if (columnId === 'quantities' || columnId === 'cumulative_quantity' || 
          columnId === 'value' || columnId === 'cumulative_value' || columnId === 'virtual_value') {
        return direction === 'asc' ? aValue - bValue : bValue - aValue
      }

      // Handle string comparison
      if (aValue < bValue) return direction === 'asc' ? -1 : 1
      if (aValue > bValue) return direction === 'asc' ? 1 : -1
      return 0
    })

    return sorted
  }, [])

  // ✅ PERFORMANCE: Fetch KPI page with pagination (only visible KPIs)
  const fetchKPIPage = useCallback(async (page: number = 1, filterProjects: string[] = [], search: string = '', sortCol: string | null = null, sortDir: 'asc' | 'desc' = 'asc') => {
    // ✅ Prevent multiple simultaneous loads
    if (isLoadingRef.current) {
      console.log('⏸️ KPI fetch already in progress, skipping...')
      return
    }
    
    if (!isMountedRef.current) return
    
    // ✅ Only fetch if filters are applied
    if (filterProjects.length === 0) {
      console.log('💡 No filters applied - not loading data')
      setKpis([])
      setActivities([])
      setTotalKPICount(0)
      isLoadingRef.current = false
      stopSmartLoading(setLoading)
      return
    }
    
    try {
      isLoadingRef.current = true
      startSmartLoading(setLoading)
      setError('')
      
      if (process.env.NODE_ENV === 'development') {
        console.log('📊 Loading KPI page...', { page, filterProjects, search })
      }
      
      // ✅ Fetch projects first (always needed)
      const projectsRes = await supabase
        .from(TABLES.PROJECTS)
        .select('*')
        .order('created_at', { ascending: false })
      
      if (projectsRes.error) {
        console.error('❌ Projects Error:', projectsRes.error)
        setError(`Failed to load projects: ${projectsRes.error.message}`)
        isLoadingRef.current = false
        stopSmartLoading(setLoading)
        return
      }
      
      const mappedProjects = (projectsRes.data || []).map(mapProjectFromDB)
      setProjects(mappedProjects)
      
      // ✅ SIMPLIFIED: Fetch by Project Full Code only
      // ✅ CRITICAL: project_full_code is the ONLY identifier - any difference means separate project
      console.log('🔍 Filter by Project Full Code only:', filterProjects)
      
      // ✅ FIX: Try both Project Full Code and Project Code queries
      // Some projects might not have Project Full Code in DB, so we fetch by Project Code first
      // then filter client-side by Project Full Code
      const projectCodes = filterProjects.map(code => {
        const parts = code.split('-')
        return parts[0] // Extract project code (e.g., "P9999" from "P9999-01")
      })
      const uniqueProjectCodes = Array.from(new Set(projectCodes))
      
      console.log('🔍 Extracted project codes:', uniqueProjectCodes)
      
      // ✅ IMPROVED: Helper function to fetch all records with pagination
      // ✅ FIX: Handle multiple project codes by fetching each separately and combining
      const fetchAllRecords = async (table: string, filterCodes: string[], filterField: string) => {
        let allData: any[] = []
        
        // ✅ Get sort column name for database
        const dbSortColumn = sortCol ? getSortColumnName(sortCol) : null
        
        // ✅ Fetch each project code separately to avoid .or() pagination issues
        for (const code of filterCodes) {
        let offset = 0
        const chunkSize = 1000
        let hasMore = true
        
        while (hasMore) {
          let query = supabase
            .from(table)
            .select('*')
              .eq(filterField, code)
            .range(offset, offset + chunkSize - 1)
          
          // ✅ Apply sorting if specified
          if (table === TABLES.KPI) {
            if (dbSortColumn) {
              query = query.order(dbSortColumn, { ascending: sortDir === 'asc' })
            } else {
              query = query.order('created_at', { ascending: false })
            }
          }
          
          const { data, error } = await query
          
          if (error) {
              console.error(`❌ Error fetching ${table} for ${code}:`, error)
            break
          }
          
          if (!data || data.length === 0) {
            hasMore = false
            break
          }
          
          allData = [...allData, ...data]
            console.log(`📥 Fetched ${table} chunk for ${code}: ${data.length} records (total so far: ${allData.length})`)
          
          if (data.length < chunkSize) {
            hasMore = false
          } else {
            offset += chunkSize
            }
          }
        }
        
        // ✅ Remove duplicates by ID
        const uniqueData = allData.filter((item: any, index: number, self: any[]) => 
          index === self.findIndex((i: any) => i.id === item.id)
        )
        
        console.log(`✅ Total ${table} records fetched: ${uniqueData.length} (after deduplication)`)
        return uniqueData
      }
      
      // ✅ Fetch activities and KPIs - try Project Full Code first, then fallback to Project Code
      // ✅ FIX: Use separate queries for each project code to avoid pagination issues
      const [activitiesByFullCode, activitiesByCode, kpisByFullCode, kpisByCode] = await Promise.all([
        fetchAllRecords(TABLES.BOQ_ACTIVITIES, filterProjects, 'Project Full Code'),
        fetchAllRecords(TABLES.BOQ_ACTIVITIES, uniqueProjectCodes, 'Project Code'),
        fetchAllRecords(TABLES.KPI, filterProjects, 'Project Full Code'),
        fetchAllRecords(TABLES.KPI, uniqueProjectCodes, 'Project Code')
      ])
      
      // Create response objects to match expected format
      const activitiesResByFullCode = { data: activitiesByFullCode, error: null }
      const activitiesResByCode = { data: activitiesByCode, error: null }
      const kpisResByFullCode = { data: kpisByFullCode, error: null }
      const kpisResByCode = { data: kpisByCode, error: null }
      
      // ✅ Combine results and remove duplicates
      const allActivities: any[] = [
        ...(activitiesResByFullCode.data || []),
        ...(activitiesResByCode.data || [])
      ]
      const uniqueActivities = allActivities.filter((activity: any, index: number, self: any[]) => 
        index === self.findIndex((a: any) => a.id === activity.id)
      )
      
      const allKPIs: any[] = [
        ...(kpisResByFullCode.data || []),
        ...(kpisResByCode.data || [])
      ]
      const uniqueKPIs = allKPIs.filter((kpi: any, index: number, self: any[]) => 
        index === self.findIndex((k: any) => k.id === kpi.id)
      )
      
      // Use combined results
      const activitiesRes = { data: uniqueActivities, error: activitiesResByFullCode.error || activitiesResByCode.error }
      const kpisRes = { data: uniqueKPIs, error: kpisResByFullCode.error || kpisResByCode.error }
      
      // ✅ CRITICAL: Map data FIRST to build project_full_code correctly, THEN filter
      console.log(`📥 Fetched ${activitiesRes.data?.length || 0} activities, ${kpisRes.data?.length || 0} KPIs from database`)
      
      // ✅ STEP 1: Map all activities and KPIs to build project_full_code correctly
      const mappedActivitiesRaw = (activitiesRes.data || []).map(mapBOQFromDB)
      const mappedKPIsRaw = (kpisRes.data || []).map(mapKPIFromDB)
      
      // ✅ DEBUG: Log sample KPIs after mapping
      if (mappedKPIsRaw.length > 0) {
        console.log('📋 Sample KPIs after mapping (first 3):', mappedKPIsRaw.slice(0, 3).map((k: any) => ({
          activityName: k.activity_name,
          projectFullCode: k.project_full_code,
          projectCode: k.project_code,
          projectSubCode: k.project_sub_code
        })))
      }
      
      // ✅ STEP 2: Filter by exact Project Full Code match using BUILT project_full_code
      let filteredActivitiesData = mappedActivitiesRaw.filter((activity: any) => {
        const activityFullCode = (activity.project_full_code || '').toString().trim()
        const activityProjectCode = (activity.project_code || '').toString().trim()
        const activityProjectSubCode = (activity.project_sub_code || '').toString().trim()
        
        // ✅ Match by exact Project Full Code OR by Project Code if activity has no sub_code
        return filterProjects.some(selectedFullCode => {
          const selectedFullCodeUpper = selectedFullCode.toUpperCase().trim()
          const activityFullCodeUpper = activityFullCode.toUpperCase().trim()
          
          // Priority 1: Exact match on project_full_code
          if (activityFullCodeUpper === selectedFullCodeUpper) {
            return true
          }
          
          // Priority 2: If selected project has sub_code (e.g., "P10001-01") and activity has no sub_code (e.g., "P10001"),
          // match by project_code only (activities might not have sub_code in DB)
          const selectedParts = selectedFullCode.split('-')
          const selectedCode = selectedParts[0]?.toUpperCase().trim()
          const selectedSubCode = selectedParts.slice(1).join('-').toUpperCase().trim()
          
          // If selected project has sub_code and activity has no sub_code, match by project_code
          if (selectedSubCode && !activityProjectSubCode && activityProjectCode.toUpperCase() === selectedCode) {
            return true
          }
          
          // Priority 3: If both have sub_codes, build activity full code and match
          if (activityProjectCode && activityProjectSubCode) {
            let builtActivityFullCode = activityProjectCode
            if (activityProjectSubCode.toUpperCase().startsWith(activityProjectCode.toUpperCase())) {
              builtActivityFullCode = activityProjectSubCode
            } else if (activityProjectSubCode.startsWith('-')) {
              builtActivityFullCode = `${activityProjectCode}${activityProjectSubCode}`
            } else {
              builtActivityFullCode = `${activityProjectCode}-${activityProjectSubCode}`
            }
            
            if (builtActivityFullCode.toUpperCase() === selectedFullCodeUpper) {
              return true
            }
          }
          
          return false
        })
      })
      
      let filteredKPIsData = mappedKPIsRaw.filter((kpi: any) => {
        const kpiFullCode = (kpi.project_full_code || '').toString().trim()
        const kpiProjectCode = (kpi.project_code || '').toString().trim()
        const kpiProjectSubCode = (kpi.project_sub_code || '').toString().trim()
        
        // ✅ Match by exact Project Full Code OR by Project Code if KPI has no sub_code
        return filterProjects.some(selectedFullCode => {
          const selectedFullCodeUpper = selectedFullCode.toUpperCase().trim()
          const kpiFullCodeUpper = kpiFullCode.toUpperCase().trim()
          
          // Priority 1: Exact match on project_full_code
          if (kpiFullCodeUpper === selectedFullCodeUpper) {
            return true
          }
          
          // Priority 2: If selected project has sub_code (e.g., "P10001-01") and KPI has no sub_code (e.g., "P10001"),
          // match by project_code only (KPIs might not have sub_code in DB)
          const selectedParts = selectedFullCode.split('-')
          const selectedCode = selectedParts[0]?.toUpperCase().trim()
          const selectedSubCode = selectedParts.slice(1).join('-').toUpperCase().trim()
          
          // If selected project has sub_code and KPI has no sub_code, match by project_code
          if (selectedSubCode && !kpiProjectSubCode && kpiProjectCode.toUpperCase() === selectedCode) {
            return true
          }
          
          // Priority 3: If both have sub_codes, build KPI full code and match
          if (kpiProjectCode && kpiProjectSubCode) {
            let builtKpiFullCode = kpiProjectCode
            if (kpiProjectSubCode.toUpperCase().startsWith(kpiProjectCode.toUpperCase())) {
              builtKpiFullCode = kpiProjectSubCode
            } else if (kpiProjectSubCode.startsWith('-')) {
              builtKpiFullCode = `${kpiProjectCode}${kpiProjectSubCode}`
            } else {
              builtKpiFullCode = `${kpiProjectCode}-${kpiProjectSubCode}`
            }
            
            if (builtKpiFullCode.toUpperCase() === selectedFullCodeUpper) {
              return true
            }
          }
          
          return false
        })
      })
      
      console.log(`✅ Filtered: ${filteredActivitiesData.length} activities, ${filteredKPIsData.length} KPIs out of ${mappedActivitiesRaw.length} total activities, ${mappedKPIsRaw.length} total KPIs`)
      
      if (filteredKPIsData.length === 0 && mappedKPIsRaw.length > 0) {
        console.warn('⚠️ No KPIs matched filters!', {
          sampleKPI: {
            activityName: mappedKPIsRaw[0]?.activity_name,
            projectFullCode: mappedKPIsRaw[0]?.project_full_code,
            projectCode: mappedKPIsRaw[0]?.project_code,
            projectSubCode: mappedKPIsRaw[0]?.project_sub_code
          },
          selectedProjects: filterProjects,
          allProjectFullCodes: mappedKPIsRaw.slice(0, 5).map((k: any) => k.project_full_code)
        })
      }
      
      if (activitiesRes.error) {
        console.warn('⚠️ Activities Error:', activitiesRes.error)
      }
      
      if (kpisRes.error) {
        console.warn('⚠️ KPIs Error:', kpisRes.error)
      }
      
      // Use filtered and mapped data
      const mappedActivities = filteredActivitiesData
      const mappedKPIs = filteredKPIsData
      
      // ✅ Filter: For Actual KPIs, only show approved ones (or old ones without approval status)
      const dateThreshold = new Date()
      dateThreshold.setDate(dateThreshold.getDate() - 90)
      
      const filteredKPIs = mappedKPIs.filter((kpi: any) => {
        // If it's Planned KPI, always show
        if (kpi.input_type === 'Planned') return true
        
        // For Actual KPIs: Check if this is a new KPI (created in last 90 days)
        const createdAt = new Date(kpi.created_at || '2000-01-01')
        const isNewKPI = createdAt >= dateThreshold
        
        if (isNewKPI) {
          // New Actual KPIs: Only show if approved
          const rawRow = (kpisRes.data || []).find((r: any) => r.id === kpi.id)
          if (!rawRow) return true
          
          const dbApprovalStatus = rawRow['Approval Status']
          let approvalStatusStr = ''
          if (dbApprovalStatus !== null && dbApprovalStatus !== undefined && dbApprovalStatus !== '') {
            approvalStatusStr = String(dbApprovalStatus).toLowerCase().trim()
          }
          
          const notes = rawRow['Notes'] || kpi.notes || ''
          const notesStr = String(notes)
          const notesHasApproved = notesStr.includes('APPROVED:') && notesStr.includes(':approved:')
          
          return (approvalStatusStr === 'approved') || notesHasApproved
        } else {
          // Old Actual KPIs: Show all
          return true
        }
      })
      
      const processedKPIs = filteredKPIs.map(processKPIRecord)
      
      // ✅ Apply sorting to all merged data after processing
      const sortedKPIs = sortKPIs(processedKPIs, sortCol, sortDir)
      
      // Update state
      if (isMountedRef.current) {
        setActivities(mappedActivities)
        setKpis(sortedKPIs)
        setTotalKPICount(mappedKPIs.length)
        
        // Calculate progress for activities
        try {
          const kpiRecordsForProgress: KPIRecord[] = sortedKPIs.map((processed: ProcessedKPI) => ({
            id: processed.id,
            project_full_code: processed.project_full_code,
            activity_name: processed.activity_name,
            quantity: processed.quantity,
            input_type: processed.input_type,
            section: processed.section,
            zone: processed.zone,
            drilled_meters: processed.drilled_meters,
            unit: processed.unit,
            value: processed.value,
            planned_value: processed.planned_value,
            actual_value: processed.actual_value,
            target_date: processed.target_date,
            activity_date: processed.activity_date,
            created_at: processed.created_at,
            updated_at: processed.updated_at,
            status: processed.status === 'excellent' || processed.status === 'good' 
              ? 'on_track' 
              : processed.status === 'average' 
              ? 'at_risk' 
              : 'delayed'
          }))
          
          const progresses = mappedActivities.map(activity => 
            calculateActivityProgress(activity, kpiRecordsForProgress)
          )
          setActivityProgresses(progresses)
        } catch (progressError) {
          console.log('⚠️ Progress calculation not available:', progressError)
        }
        
        console.log('✅ Data loaded:', {
          activities: mappedActivities.length,
          kpis: sortedKPIs.length
        })
      }
      
      // Fetch pending KPIs count
      fetchPendingKPICount()
    } catch (error: any) {
      console.error('❌ KPITracking: Error:', error)
      if (isMountedRef.current) {
        setError(error.message || 'Failed to load data')
      }
    } finally {
      isLoadingRef.current = false
      if (isMountedRef.current) {
        stopSmartLoading(setLoading)
      }
    }
  }, [supabase, startSmartLoading, stopSmartLoading, sortColumn, sortDirection, sortKPIs])

  // ✅ Fetch projects only on mount (lightweight)
  const fetchProjects = useCallback(async () => {
    if (!isMountedRef.current) return
    
    try {
      const projectsRes = await supabase
        .from(TABLES.PROJECTS)
        .select('*')
        .order('created_at', { ascending: false })
      
      if (projectsRes.error) {
        console.error('❌ Projects Error:', projectsRes.error)
        return
      }
      
      const mappedProjects = (projectsRes.data || []).map(mapProjectFromDB)
      if (isMountedRef.current) {
        setProjects(mappedProjects)
        console.log('✅ Projects loaded:', mappedProjects.length)
      }
    } catch (error: any) {
      console.error('❌ Error loading projects:', error)
    }
  }, [supabase])

  // ✅ Initial mount effect - simplified like ProjectsList
  useEffect(() => {
    isMountedRef.current = true
    isLoadingRef.current = false
    hasFetchedRef.current = false
    // ✅ Ensure loading state is false on mount
    setLoading(false)
    console.log('🟡 KPITracking: Component mounted')
    
    // Listen for database updates
    const handleDatabaseUpdate = (event: CustomEvent) => {
      const { tableName } = event.detail
      console.log(`🔔 KPI: Database updated event received for ${tableName}`)
      
      if (tableName === TABLES.KPI || tableName === TABLES.BOQ_ACTIVITIES) {
        console.log(`🔄 KPI: Reloading data due to ${tableName} update...`)
        if (selectedProjects.length > 0) {
          console.log(`📊 Reloading KPIs for ${selectedProjects.length} selected project(s)...`)
          fetchData(selectedProjects)
        } else {
          console.log('⚠️ No projects selected - KPIs will not be loaded until a project is selected')
          console.log('💡 Tip: Select a project in the filter to see the newly created KPIs')
        }
      } else if (tableName === TABLES.PROJECTS) {
        fetchProjects()
      }
    }
    
    window.addEventListener('database-updated', handleDatabaseUpdate as EventListener)
    
    // ✅ PERFORMANCE: Defer all data fetching to avoid blocking navigation
    // Use setTimeout to run after component is fully rendered
    const dataTimeout = setTimeout(() => {
      if (isMountedRef.current) {
    fetchProjects()
        // ✅ Defer fetchPendingKPICount (heavy operation) even more
        setTimeout(() => {
          if (isMountedRef.current) {
    fetchPendingKPICount()
          }
        }, 200) // Additional delay for heavy operation
      }
    }, 50) // Small delay to allow UI to render first
    
    return () => {
      clearTimeout(dataTimeout)
      console.log('🔴 KPITracking: Component unmounting')
      isMountedRef.current = false
      window.removeEventListener('database-updated', handleDatabaseUpdate as EventListener)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Run only once on mount
  
  // ✅ PERFORMANCE: Fetch data when filters or page change (with stable dependencies)
  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true
      return
    }
    
    if (isLoadingRef.current) return
    
    if (selectedProjects.length > 0) {
      fetchKPIPage(currentPage, selectedProjects, '', sortColumn, sortDirection)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, selectedProjects.join(','), sortColumn, sortDirection])
  
  // ✅ LEGACY: Keep fetchData for backward compatibility (wraps fetchKPIPage)
  const fetchData = useCallback(async (filterProjects: string[] = []) => {
    await fetchKPIPage(currentPage, filterProjects, '')
  }, [fetchKPIPage, currentPage])

  const handleCreateKPI = async (kpiData: any) => {
    try {
      console.log('========================================')
      console.log('✨ Creating KPI:', kpiData)
      console.log('========================================')
      
      // 🎯 Use UNIFIED table for all KPIs (both Planned & Actual)
      console.log('🎯 Inserting into MAIN KPI table')
      
      // ✅ Calculate Value from Quantity × Rate (from activity)
      const projectCode = kpiData['Project Full Code'] || kpiData.project_full_code || ''
      const activityName = kpiData['Activity Name'] || kpiData.activity_name || ''
      const quantity = parseFloat(kpiData['Quantity'] || kpiData.quantity?.toString() || '0')
      
      let calculatedValue = kpiData['Value'] || kpiData.value || 0
      
      // If Value is not provided, calculate it from activity rate
      if (!calculatedValue || calculatedValue === 0) {
        // Find related activity to get rate and activity_timing
        const relatedActivity = activities.find((a: any) => 
          a.activity_name === activityName && 
          (a.project_code === projectCode || a.project_full_code === projectCode)
        )
        
        if (relatedActivity) {
          let rate = 0
          if (relatedActivity.rate && relatedActivity.rate > 0) {
            rate = relatedActivity.rate
          } else if (relatedActivity.total_value && relatedActivity.total_units && relatedActivity.total_units > 0) {
            rate = relatedActivity.total_value / relatedActivity.total_units
          }
          
          if (rate > 0) {
            calculatedValue = quantity * rate
            console.log(`💰 Calculated Value: ${quantity} × ${rate} = ${calculatedValue}`)
          }
          
          // ✅ Copy Activity Timing from BOQ Activity to KPI
          if (relatedActivity.activity_timing) {
            console.log(`⏰ Copying Activity Timing from BOQ: ${relatedActivity.activity_timing}`)
          }
        }
        
        // If still no value, use quantity as fallback (1:1 ratio)
        if (!calculatedValue || calculatedValue === 0) {
          calculatedValue = quantity
          console.log(`⚠️ Using quantity as Value fallback: ${calculatedValue}`)
        }
      }
      
      // Map to database format (WITH Input Type in unified table)
      const inputType = kpiData['Input Type'] || kpiData.input_type || 'Planned'
      
      const dbData: any = {
        'Project Full Code': projectCode,
        'Project Code': kpiData['Project Code'] || kpiData.project_code || '',
        'Project Sub Code': kpiData['Project Sub Code'] || kpiData.project_sub_code || '',
        'Activity Name': activityName,
        'Activity Division': kpiData['Activity Division'] || kpiData.activity_division || '', // ✅ Division field
        'Quantity': quantity.toString(),
        'Value': calculatedValue.toString(), // ✅ Include calculated Value
        'Input Type': inputType, // ✅ Required in unified table
        'Target Date': kpiData['Target Date'] || kpiData.target_date || '',
        'Actual Date': kpiData['Actual Date'] || kpiData.actual_date || '',
        'Activity Date': kpiData['Activity Date'] || kpiData.activity_date || kpiData['Target Date'] || kpiData['Actual Date'] || kpiData.target_date || kpiData.actual_date || '',
        'Unit': kpiData['Unit'] || kpiData.unit || '',
        'Zone': kpiData['Zone'] || kpiData.zone || '',
        'Zone Number': kpiData['Zone Number'] || kpiData.zone_number || '',
        'Day': kpiData['Day'] || kpiData.day || '',
        'Drilled Meters': kpiData['Drilled Meters'] || kpiData.drilled_meters?.toString() || '0'
      }
      
      // ✅ Get Activity Division from related activity if not provided
      if (!dbData['Activity Division']) {
        const relatedActivity = activities.find((a: any) => 
          (a['Activity Name'] || a.activity_name) === activityName && 
          ((a['Project Code'] || a.project_code) === projectCode || (a['Project Full Code'] || a.project_full_code) === projectCode)
        )
        
        if (relatedActivity) {
          const activityDivision = (relatedActivity as any).activity_division || (relatedActivity as any)['Activity Division'] || ''
          if (activityDivision) {
            dbData['Activity Division'] = activityDivision
            console.log(`✅ Copied Activity Division from BOQ Activity: ${dbData['Activity Division']}`)
          }
        }
      }
      
      // ✅ Find related activity to copy Activity Timing if not provided
      if (!dbData['Activity Timing'] && !kpiData['Activity Timing'] && !kpiData.activity_timing) {
        const relatedActivity = activities.find((a: any) => 
          (a['Activity Name'] || a.activity_name) === activityName && 
          ((a['Project Code'] || a.project_code) === projectCode || (a['Project Full Code'] || a.project_full_code) === projectCode)
        )
        
        if (relatedActivity && relatedActivity.activity_timing) {
          dbData['Activity Timing'] = relatedActivity.activity_timing
          console.log(`✅ Copied Activity Timing from BOQ Activity: ${dbData['Activity Timing']}`)
        }
      } else if (kpiData['Activity Timing'] || kpiData.activity_timing) {
        dbData['Activity Timing'] = kpiData['Activity Timing'] || kpiData.activity_timing
      }
      
      // ✅ AUTO-APPROVE: If this is a Planned KPI, automatically set Approval Status to 'approved'
      if (inputType === 'Planned') {
        dbData['Approval Status'] = 'approved'
        console.log('✅ Auto-approving Planned KPI on creation')
      }

      // ✅ SET CREATED BY: Add user who created the KPI
      const createdByValue = appUser?.email || authUser?.email || guard.user?.email || authUser?.id || appUser?.id || guard.user?.id || 'System'
      dbData['created_by'] = createdByValue
      console.log('✅ Setting created_by:', createdByValue, {
        appUserEmail: appUser?.email,
        authUserEmail: authUser?.email,
        guardUserEmail: guard.user?.email
      })

      console.log('📦 Database format:', dbData)

      const { data, error } = await supabase
        .from(TABLES.KPI)
        .insert([dbData] as any)
        .select()
        .single()

      if (error) {
        console.error('Create error:', error)
        
        // ✅ Helpful error message for missing Activity Timing column
        if (error.message && error.message.includes("Activity Timing") && error.message.includes("schema cache")) {
          console.error('')
          console.error('🔧 SOLUTION: The "Activity Timing" column is missing from the KPI table.')
          console.error('   Please run the migration script: Database/add-activity-timing-to-kpi.sql')
          console.error('   This will add the required column to the "Planning Database - KPI" table.')
          console.error('')
        }
        
        throw error
      }
      
      console.log('Created data:', data)
      
      // 🔔 SEND NOTIFICATIONS: Notify Planning department when KPI is created
      if (kpiData['Input Type'] === 'Actual' || kpiData.input_type === 'Actual') {
        try {
          const { kpiNotificationService } = await import('@/lib/kpiNotificationService')
          await kpiNotificationService.notifyKPICreated(
            {
              id: (data as any).id,
              project_code: kpiData['Project Code'] || kpiData.project_code,
              project_full_code: kpiData['Project Full Code'] || kpiData.project_full_code,
              activity_name: kpiData['Activity Name'] || kpiData.activity_name,
              quantity: quantity,
              input_type: inputType
            },
            guard.user?.id || ''
          )
          console.log('✅ KPI notifications sent')
        } catch (notifError) {
          console.error('⚠️ Error sending KPI notifications:', notifError)
          // Don't fail the KPI creation if notification fails
        }
      }
      
      // ✅ FIX: AUTO-SYNC: Update BOQ for BOTH Planned and Actual KPIs
      console.log('🔄 Auto-syncing BOQ from KPI...')
      const { syncBOQFromKPI } = await import('@/lib/boqKpiSync')
      const syncResult = await syncBOQFromKPI(
        kpiData['Project Full Code'] || kpiData.project_full_code,
        kpiData['Activity Name'] || kpiData.activity_name
      )
      console.log('✅ BOQ Sync Result:', syncResult)
      if (syncResult.success) {
        console.log(`📊 BOQ Planned updated to: ${syncResult.updatedBOQPlanned}`)
        console.log(`📊 BOQ Actual updated to: ${syncResult.updatedBOQActual}`)
      }
      
      // Track activity
      const insertedData = data as any
      if (insertedData?.id) {
        activityTracker.create(insertedData.id, {
          project_code: projectCode,
          activity_name: activityName,
          input_type: inputType,
          quantity: quantity,
          value: calculatedValue,
        })
      }
      
      // Refresh data to show new record
      setShowForm(false)
      if (selectedProjects.length > 0) {
        await fetchData(selectedProjects)
      }
    } catch (error: any) {
      console.error('Create failed:', error)
      setError(error.message)
    }
  }

  const handleUpdateKPI = async (id: string, kpiData: any) => {
    try {
      console.log('========================================')
      console.log('🔄 UPDATE KPI STARTED')
      console.log('ID:', id)
      console.log('Form Data:', kpiData)
      console.log('Form Data Keys:', Object.keys(kpiData))
      console.log('Form Data Values:', Object.values(kpiData))
      console.log('🔍 project_full_code:', kpiData.project_full_code)
      console.log('🔍 activity_name:', kpiData.activity_name)
      console.log('🔍 quantity:', kpiData.quantity)
      console.log('========================================')
      
      // 🎯 Use UNIFIED table for all KPIs (both Planned & Actual)
      console.log('🎯 Inserting into MAIN KPI table')
      
      // Map to database format (WITH Input Type in unified table)
      const dbData: any = {
        'Project Full Code': kpiData['Project Full Code'] || kpiData.project_full_code || '',
        'Project Code': kpiData['Project Code'] || kpiData.project_code || '',
        'Project Sub Code': kpiData['Project Sub Code'] || kpiData.project_sub_code || '',
        'Activity Name': kpiData['Activity Name'] || kpiData.activity_name || '',
        'Activity Division': kpiData['Activity Division'] || kpiData.activity_division || '', // ✅ Division field
        'Quantity': kpiData['Quantity'] || kpiData.quantity?.toString() || '0',
        'Input Type': kpiData['Input Type'] || kpiData.input_type || 'Planned', // ✅ Required in unified table
        'Target Date': kpiData['Target Date'] || kpiData.target_date || '',
        'Actual Date': kpiData['Actual Date'] || kpiData.actual_date || '',
        'Activity Date': kpiData['Activity Date'] || kpiData.activity_date || kpiData['Target Date'] || kpiData['Actual Date'] || kpiData.target_date || kpiData.actual_date || '',
        'Unit': kpiData['Unit'] || kpiData.unit || '',
        'Zone': kpiData['Zone'] || kpiData.zone || '',
        'Zone Number': kpiData['Zone Number'] || kpiData.zone_number || '',
        'Day': kpiData['Day'] || kpiData.day || '',
        'Drilled Meters': kpiData['Drilled Meters'] || kpiData.drilled_meters?.toString() || '0'
      }
      
      // ✅ SET UPDATED BY: Add user who updated the KPI
      const updatedByValue = appUser?.email || authUser?.email || guard.user?.email || authUser?.id || appUser?.id || guard.user?.id || 'System'
      dbData['updated_by'] = updatedByValue
      console.log('✅ Setting updated_by:', updatedByValue)
      
      console.log('🔍 dbData after mapping:', dbData)
      console.log('🔍 dbData Project Full Code:', dbData['Project Full Code'])
      console.log('🔍 kpiData.project_full_code:', kpiData.project_full_code)
      
      // Validate that we have essential data
      if (!dbData['Project Full Code']) {
        console.error('❌ Missing Project Full Code!')
        throw new Error('Project Full Code is required')
      }
      if (!dbData['Activity Name']) {
        console.error('❌ Missing Activity Name!')
        throw new Error('Activity Name is required')
      }
      if (!dbData['Quantity']) {
        console.error('❌ Missing Quantity!')
        throw new Error('Quantity is required')
      }

      console.log('📦 Database Format:', JSON.stringify(dbData, null, 2))
      console.log('🔍 Database Format Keys:', Object.keys(dbData))
      console.log('🔍 Database Format Values:', Object.values(dbData))

      // First, check if KPI exists
      console.log('🔍 Checking if KPI exists before update...')
      const { data: existingKPI, error: checkError } = await (supabase as any)
        .from(TABLES.KPI)
        .select('*')
        .eq('id', id)
        .single()
      
      if (checkError) {
        console.error('❌ Error checking existing KPI:', checkError)
        throw new Error(`KPI with ID ${id} not found`)
      }
      
      console.log('✅ KPI exists:', existingKPI.id)
      console.log('📊 Current KPI data:', existingKPI)

      // Perform the update
      console.log('🔄 Executing UPDATE query...')
      console.log('Table:', TABLES.KPI)
      console.log('ID to update:', id)
      
      const { data, error } = await (supabase as any)
        .from(TABLES.KPI)
        .update(dbData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('❌ UPDATE ERROR:', error)
        console.error('Error details:', error.message)
        console.error('Error code:', error.code)
        throw error
      }
      
      console.log('✅ UPDATE SUCCESS!')
      console.log('Updated Data:', data)
      console.log('Updated Data ID:', data?.id)
      console.log('Updated Data Keys:', data ? Object.keys(data) : 'No data')
      
      // Track activity
      activityTracker.update(id, {
        old_values: existingKPI,
        new_values: dbData,
        project_code: dbData['Project Full Code'],
        activity_name: dbData['Activity Name'],
      })
      
      // Verify the update was successful
      if (!data) {
        console.error('❌ UPDATE FAILED: No data returned from update!')
        throw new Error('Update failed: No data returned')
      }
      
      // ✅ IMMEDIATE UPDATE: Update the KPI in the local state immediately
      // This ensures the table shows the updated data right away
      try {
        const mappedKPI = mapKPIFromDB(data)
        const processedKPI = processKPIRecord(mappedKPI)
        
        setKpis(prevKPIs => {
          const updatedKPIs = prevKPIs.map(k => 
            k.id === id ? processedKPI : k
          )
          console.log('✅ Updated KPI in local state immediately')
          return updatedKPIs
        })
      } catch (stateUpdateError) {
        console.warn('⚠️ Could not update local state immediately:', stateUpdateError)
        // Continue with normal refresh
      }
      
      console.log('🔍 Verifying update in database...')
      const { data: verifyData, error: verifyError } = await (supabase as any)
        .from(TABLES.KPI)
        .select('*')
        .eq('id', id)
        .single()
      
      if (verifyError) {
        console.error('❌ Verification failed:', verifyError)
        throw new Error('Verification failed: KPI not found after update')
      }
      
      console.log('✅ Verification successful:', verifyData)
      
      // Check if the updated data matches what we sent
      console.log('🔍 Checking if updated data matches sent data...')
      console.log('Sent Project Full Code:', dbData['Project Full Code'])
      console.log('Database Project Full Code:', verifyData['Project Full Code'])
      console.log('Sent Activity Name:', dbData['Activity Name'])
      console.log('Database Activity Name:', verifyData['Activity Name'])
      console.log('Sent Quantity:', dbData['Quantity'])
      console.log('Database Quantity:', verifyData['Quantity'])
      
      if (verifyData['Project Full Code'] !== dbData['Project Full Code']) {
        console.error('❌ Project Full Code mismatch!')
        console.error('Sent:', dbData['Project Full Code'])
        console.error('Database:', verifyData['Project Full Code'])
      }
      
      if (verifyData['Activity Name'] !== dbData['Activity Name']) {
        console.error('❌ Activity Name mismatch!')
        console.error('Sent:', dbData['Activity Name'])
        console.error('Database:', verifyData['Activity Name'])
      }
      
      // ✅ FIX: AUTO-SYNC: Update BOQ for BOTH Planned and Actual KPIs
      console.log('🔄 Auto-syncing BOQ from KPI...')
      const syncResult = await syncBOQFromKPI(
        kpiData.project_full_code,
        kpiData.activity_name
      )
      console.log('✅ BOQ Sync Result:', syncResult)
      if (syncResult.success) {
        console.log(`📊 BOQ Planned updated to: ${syncResult.updatedBOQPlanned}`)
        console.log(`📊 BOQ Actual updated to: ${syncResult.updatedBOQActual}`)
      }
      
      console.log('========================================')
      
      // Close form and refresh (editingKPI is now handled by EnhancedKPITable)
      
      // Refresh data to ensure consistency - Always refresh, not just when selectedProjects.length > 0
      console.log('🔄 Refreshing KPI data after update...')
      try {
        // Use current filters or all projects
        const projectsToFetch = selectedProjects.length > 0 ? selectedProjects : projects.map(p => p.project_code)
        if (projectsToFetch.length > 0) {
          await fetchData(projectsToFetch)
        } else {
          // If no projects selected, fetch all
          await fetchData(projects.map(p => p.project_code))
        }
        console.log('✅ KPI data refreshed successfully')
      } catch (refreshError) {
        console.error('❌ Error refreshing KPI data:', refreshError)
        // Still try to refresh with all projects as fallback
        try {
          await fetchData(projects.map(p => p.project_code))
        } catch (fallbackError) {
          console.error('❌ Fallback refresh also failed:', fallbackError)
        }
      }
      
      // ✅ Auto-save calculations after KPI update
      try {
        const mappedKPI = mapKPIFromDB(data)
        const autoSaveResult = await autoSaveOnKPIUpdate(mappedKPI)
        
        if (autoSaveResult.success) {
          console.log('✅ Auto-save calculations completed after KPI update:', {
            updatedActivities: autoSaveResult.updatedActivities,
            updatedProjects: autoSaveResult.updatedProjects
          })
        } else {
          console.warn('⚠️ Auto-save calculations had errors after KPI update:', autoSaveResult.errors)
        }
      } catch (autoSaveError) {
        console.warn('⚠️ Auto-save calculations failed after KPI update:', autoSaveError)
      }
      
    } catch (error: any) {
      console.error('❌ UPDATE FAILED:', error)
      setError(`Update failed: ${error.message}`)
      alert(`Failed to update KPI: ${error.message}`)
    }
  }

  const handleDeleteKPI = async (id: string) => {
    if (!confirm('Are you sure you want to delete this KPI?')) return

    try {
      // Get KPI details before deleting for sync
      const kpiToDelete = kpis.find(k => k.id === id)
      
      console.log('========================================')
      console.log('🗑️ Deleting KPI from MAIN TABLE')
      console.log('KPI ID:', id)
      console.log('KPI Type:', kpiToDelete?.input_type)
      console.log('========================================')

      const { error } = await supabase
        .from(TABLES.KPI)
        .delete()
        .eq('id', id)

      if (error) throw error
      
      // Track activity
      activityTracker.delete(id, {
        project_code: kpiToDelete?.project_full_code,
        activity_name: kpiToDelete?.activity_name,
        input_type: kpiToDelete?.input_type,
      })
      
      // Update local state immediately
      setKpis(kpis.filter(k => k.id !== id))
      
      // 🔄 AUTO-SYNC: If this was Actual, update BOQ
      // ✅ FIX: Sync BOQ after deletion for BOTH Planned and Actual KPIs
      if (kpiToDelete) {
        console.log('🔄 Syncing BOQ after KPI deletion...')
        console.log('⚠️ WARNING: This will update BOQ Units based on remaining KPIs')
        
        try {
          const { syncBOQFromKPI } = await import('@/lib/boqKpiSync')
          const syncResult = await syncBOQFromKPI(
            kpiToDelete.project_full_code,
            kpiToDelete.activity_name
          )
          console.log('✅ BOQ Sync Result:', syncResult)
          if (syncResult.success) {
            console.log(`📊 BOQ Planned updated to: ${syncResult.updatedBOQPlanned}`)
            console.log(`📊 BOQ Actual updated to: ${syncResult.updatedBOQActual}`)
          }
        } catch (syncError) {
          console.error('❌ BOQ Sync failed:', syncError)
          // Don't fail the entire delete operation if sync fails
        }
      }
      
      // Refresh data to ensure consistency
      if (selectedProjects.length > 0) {
        await fetchData(selectedProjects)
      }
    } catch (error: any) {
      setError(error.message)
    }
  }

  const handleBulkDeleteKPI = async (ids: string[]) => {
    if (ids.length === 0) return
    
    try {
      console.log('========================================')
      console.log('🗑️ BULK DELETE STARTED')
      console.log(`Deleting ${ids.length} KPIs`)
      console.log('========================================')
      
      // 🎯 Delete from MAIN KPI table
      const { data, error, count } = await supabase
        .from(TABLES.KPI)
        .delete({ count: 'exact' })
        .in('id', ids)
      
      if (error) throw error
      
      console.log(`✅ Deleted ${count || ids.length} KPIs`)
      console.log('========================================')
      
      // Refresh data
      if (selectedProjects.length > 0) {
        await fetchData(selectedProjects)
      }
      
      // Show success message
      alert(`✅ Successfully deleted ${count || ids.length} KPI(s)`)
      
    } catch (error: any) {
      console.error('❌ Bulk delete failed:', error)
      setError(`Failed to delete KPIs: ${error.message}`)
      alert(`Failed to delete KPIs: ${error.message}`)
    }
  }

  // ✅ BULK EDIT: Update multiple KPIs at once
  const handleBulkUpdateKPI = async (ids: string[], updateData: any): Promise<{ success: boolean; updated: number; errors: string[] }> => {
    if (ids.length === 0) {
      return { success: false, updated: 0, errors: ['No KPIs selected'] }
    }
    
    try {
      console.log('========================================')
      console.log('🔄 BULK UPDATE STARTED')
      console.log(`Updating ${ids.length} KPIs`)
      console.log('Update Data:', updateData)
      console.log('========================================')
      
      startSmartLoading(setLoading)
      setError('')
      
      // Map update data to database format
      const dbUpdateData: any = {}
      
      if (updateData.quantity !== undefined) {
        dbUpdateData['Quantity'] = updateData.quantity.toString()
      }
      
      if (updateData.unit !== undefined) {
        dbUpdateData['Unit'] = updateData.unit
      }
      
      if (updateData.target_date !== undefined) {
        dbUpdateData['Target Date'] = updateData.target_date || null
      }
      
      if (updateData.actual_date !== undefined) {
        dbUpdateData['Actual Date'] = updateData.actual_date || null
      }
      
      if (updateData.activity_date !== undefined) {
        dbUpdateData['Activity Date'] = updateData.activity_date || null
      }
      
      if (updateData.zone !== undefined) {
        dbUpdateData['Zone'] = updateData.zone
      }
      
      if (updateData.section !== undefined) {
        dbUpdateData['Section'] = updateData.section
      }
      
      if (updateData.day !== undefined) {
        dbUpdateData['Day'] = updateData.day
      }
      
      if (updateData.drilled_meters !== undefined) {
        dbUpdateData['Drilled Meters'] = updateData.drilled_meters.toString()
      }
      
      if (updateData.notes !== undefined) {
        dbUpdateData['Notes'] = updateData.notes
      }
      
      // ✅ Calculate Value from Quantity × Rate if quantity is being updated
      if (updateData.quantity !== undefined) {
        // Get all KPIs being updated to calculate values
        const kpisToUpdate = kpis.filter(k => ids.includes(k.id))
        
        // Update value for each KPI based on its activity rate
        // We'll need to update in batches with calculated values
        const updatePromises: Array<Promise<void>> = []
        const errors: string[] = []
        let successCount = 0
        
        // Process in chunks to avoid overwhelming the database
        const chunkSize = 50
        for (let i = 0; i < ids.length; i += chunkSize) {
          const chunkIds = ids.slice(i, i + chunkSize)
          
          // For each KPI in chunk, calculate value and update
          for (const id of chunkIds) {
            const kpi = kpisToUpdate.find(k => k.id === id)
            if (!kpi) {
              errors.push(`KPI ${id} not found`)
              continue
            }
            
            // Find related activity to get rate
            const relatedActivity = activities.find((a: any) => 
              a.activity_name === kpi.activity_name && 
              (a.project_code === kpi.project_full_code || a.project_full_code === kpi.project_full_code)
            )
            
            // Calculate value from quantity × rate
            let calculatedValue = 0
            if (relatedActivity) {
              let rate = 0
              if (relatedActivity.rate && relatedActivity.rate > 0) {
                rate = relatedActivity.rate
              } else if (relatedActivity.total_value && relatedActivity.total_units && relatedActivity.total_units > 0) {
                rate = relatedActivity.total_value / relatedActivity.total_units
              }
              
              if (rate > 0) {
                const newQuantity = parseFloat(updateData.quantity) || kpi.quantity
                calculatedValue = newQuantity * rate
              }
            }
            
            // Build update data for this specific KPI
            const kpiUpdateData: any = { ...dbUpdateData }
            if (calculatedValue > 0) {
              kpiUpdateData['Value'] = calculatedValue.toString()
            }
            
            // Update this KPI
            const updatePromise = (async () => {
              try {
                const { error: updateError } = await (supabase as any)
                  .from(TABLES.KPI)
                  .update(kpiUpdateData)
                  .eq('id', id)
                
                if (updateError) {
                  errors.push(`KPI ${id}: ${updateError.message}`)
                } else {
                  successCount++
                }
              } catch (err: any) {
                errors.push(`KPI ${id}: ${err.message || 'Unknown error'}`)
              }
            })()
            
            updatePromises.push(updatePromise)
          }
        }
        
        // Wait for all updates to complete
        await Promise.all(updatePromises)
        
        console.log(`✅ Bulk update completed: ${successCount} succeeded, ${errors.length} failed`)
        console.log('========================================')
        
        // ✅ AUTO-SYNC: Update BOQ for all affected activities
        const affectedActivities = Array.from(new Set(kpisToUpdate.map(k => ({
          project_full_code: k.project_full_code,
          activity_name: k.activity_name
        }))))
        
        console.log('🔄 Auto-syncing BOQ for affected activities...')
        const syncPromises = affectedActivities.map(async (activity) => {
          try {
            const syncResult = await syncBOQFromKPI(
              activity.project_full_code,
              activity.activity_name
            )
            if (syncResult.success) {
              console.log(`✅ BOQ synced for ${activity.activity_name}`)
            }
          } catch (syncError) {
            console.error(`❌ BOQ sync failed for ${activity.activity_name}:`, syncError)
          }
        })
        
        await Promise.all(syncPromises)
        
        // Refresh data
        if (selectedProjects.length > 0) {
          await fetchData(selectedProjects)
        }
        
        return {
          success: successCount > 0,
          updated: successCount,
          errors
        }
      } else {
        // No quantity update - simple bulk update
        const { error: updateError, count } = await (supabase as any)
          .from(TABLES.KPI)
          .update(dbUpdateData)
          .in('id', ids)
        
        if (updateError) {
          throw updateError
        }
        
        console.log(`✅ Updated ${count || ids.length} KPIs`)
        console.log('========================================')
        
        // ✅ AUTO-SYNC: Update BOQ for all affected activities
        const kpisToUpdate = kpis.filter(k => ids.includes(k.id))
        const affectedActivities = Array.from(new Set(kpisToUpdate.map(k => ({
          project_full_code: k.project_full_code,
          activity_name: k.activity_name
        }))))
        
        console.log('🔄 Auto-syncing BOQ for affected activities...')
        const syncPromises = affectedActivities.map(async (activity) => {
          try {
            const syncResult = await syncBOQFromKPI(
              activity.project_full_code,
              activity.activity_name
            )
            if (syncResult.success) {
              console.log(`✅ BOQ synced for ${activity.activity_name}`)
            }
          } catch (syncError) {
            console.error(`❌ BOQ sync failed for ${activity.activity_name}:`, syncError)
          }
        })
        
        await Promise.all(syncPromises)
        
        // Refresh data
        if (selectedProjects.length > 0) {
          await fetchData(selectedProjects)
        }
        
        return {
          success: true,
          updated: count || ids.length,
          errors: []
        }
      }
    } catch (error: any) {
      console.error('❌ Bulk update failed:', error)
      setError(`Failed to update KPIs: ${error.message}`)
      return {
        success: false,
        updated: 0,
        errors: [error.message || 'Unknown error']
      }
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  // ✅ Helper function to normalize timing values (used in both filter and display)
  const normalizeTiming = (value: string): string => {
    return value.toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
  }

  // ✅ SIMPLIFIED: Filter KPIs locally like ProjectsList
  const filteredKPIs = useMemo(() => {
    return kpis.filter(kpi => {
      // Multi-Project filter (Smart Filter)
      // ✅ Use same matching logic as fetchData to handle KPIs without sub_code
      if (selectedProjects.length > 0) {
        const kpiFullCode = (kpi.project_full_code || '').toString().trim()
        const kpiProjectCode = ((kpi as any).project_code || '').toString().trim()
        const kpiProjectSubCode = ((kpi as any).project_sub_code || '').toString().trim()
        
        const matchesProject = selectedProjects.some(selectedProject => {
          const selectedFullCodeUpper = selectedProject.toUpperCase().trim()
          const kpiFullCodeUpper = kpiFullCode.toUpperCase().trim()
          
          // Priority 1: Exact match on project_full_code
          if (kpiFullCodeUpper === selectedFullCodeUpper) {
            return true
          }
          
          // Priority 2: If selected project has sub_code (e.g., "P10001-01") and KPI has no sub_code (e.g., "P10001"),
          // match by project_code only (KPIs might not have sub_code in DB)
          const selectedParts = selectedProject.split('-')
          const selectedCode = selectedParts[0]?.toUpperCase().trim()
          const selectedSubCode = selectedParts.slice(1).join('-').toUpperCase().trim()
          
          // If selected project has sub_code and KPI has no sub_code, match by project_code
          if (selectedSubCode && !kpiProjectSubCode && kpiProjectCode.toUpperCase() === selectedCode) {
            return true
          }
          
          // Priority 3: If both have sub_codes, build KPI full code and match
          if (kpiProjectCode && kpiProjectSubCode) {
            let builtKpiFullCode = kpiProjectCode
            if (kpiProjectSubCode.toUpperCase().startsWith(kpiProjectCode.toUpperCase())) {
              builtKpiFullCode = kpiProjectSubCode
            } else if (kpiProjectSubCode.startsWith('-')) {
              builtKpiFullCode = `${kpiProjectCode}${kpiProjectSubCode}`
            } else {
              builtKpiFullCode = `${kpiProjectCode}-${kpiProjectSubCode}`
            }
            
            if (builtKpiFullCode.toUpperCase() === selectedFullCodeUpper) {
              return true
            }
          }
          
          return false
        })
        
        if (!matchesProject) return false
      }
      
      // Multi-Activity filter
      if (selectedActivities.length > 0) {
        const matchesActivity = selectedActivities.some(activityName =>
          kpi.activity_name === activityName ||
          kpi.activity_name?.toLowerCase().includes(activityName.toLowerCase())
        )
        if (!matchesActivity) return false
      }
      
      // Multi-Type filter
      if (selectedTypes.length > 0) {
        if (!selectedTypes.includes(kpi.input_type)) return false
      }
      
      // Zone filter
      if (selectedZones.length > 0) {
        // ✅ FIX: Extract zone from multiple sources and normalize (same logic as SmartFilter)
        const kpiZoneRaw = (kpi.zone || (kpi as any).section || (kpi as any).zone_ref || (kpi as any).zone_number || '').toString().trim()
        
        // Normalize zone by removing project code prefix
        const projectCodes = selectedProjects.map(p => {
          const parts = p.split('-')
          return parts[0] // Extract project code (e.g., "P5068" from "P5068-01")
        })
        
        let kpiZone = kpiZoneRaw
        for (const projectCode of projectCodes) {
          const codeUpper = projectCode.toUpperCase()
          kpiZone = kpiZone.replace(new RegExp(`^${codeUpper}\\s*-\\s*`, 'i'), '').trim()
          kpiZone = kpiZone.replace(new RegExp(`^${codeUpper}\\s+`, 'i'), '').trim()
          kpiZone = kpiZone.replace(new RegExp(`^${codeUpper}-`, 'i'), '').trim()
        }
        // If normalization results in empty, use original
        if (!kpiZone) kpiZone = kpiZoneRaw
        
        const matchesZone = selectedZones.some(selectedZone => {
          // Normalize selected zone too
          let normalizedSelectedZone = selectedZone
          for (const projectCode of projectCodes) {
            const codeUpper = projectCode.toUpperCase()
            normalizedSelectedZone = normalizedSelectedZone.replace(new RegExp(`^${codeUpper}\\s*-\\s*`, 'i'), '').trim()
            normalizedSelectedZone = normalizedSelectedZone.replace(new RegExp(`^${codeUpper}\\s+`, 'i'), '').trim()
            normalizedSelectedZone = normalizedSelectedZone.replace(new RegExp(`^${codeUpper}-`, 'i'), '').trim()
          }
          if (!normalizedSelectedZone) normalizedSelectedZone = selectedZone
          
          const zoneLower = normalizedSelectedZone.toLowerCase().trim()
          const kpiZoneLower = kpiZone.toLowerCase().trim()
          // ✅ Exact match or contains match
          return kpiZoneLower === zoneLower ||
                 kpiZoneLower.includes(zoneLower) ||
                 zoneLower.includes(kpiZoneLower)
        })
        if (!matchesZone) return false
      }
      
      // Unit filter
      if (selectedUnits.length > 0) {
        const kpiUnit = ((kpi as any).unit || '').toLowerCase().trim()
        if (!selectedUnits.some(unit => kpiUnit === unit.toLowerCase().trim())) return false
      }
      
      // Division filter
      if (selectedDivisions.length > 0) {
        // ✅ Get Activity Division from multiple sources (same logic as KPITableWithCustomization)
        const rawKPIDivision = (kpi as any).raw || {}
        let kpiDivision = ''
        
        // Priority 1: Get Activity Division directly from KPI data (from database)
        kpiDivision = rawKPIDivision['Activity Division'] ||
                     (kpi as any)['Activity Division'] ||
                     (kpi as any).activity_division ||
                     ''
        
        // Priority 2: Fallback to BOQ Activity if not found in KPI
        if ((!kpiDivision || kpiDivision.trim() === '') && activities && activities.length > 0) {
          const activityName = kpi.activity_name || (kpi as any).activity || ''
          const projectCode = (kpi as any).project_code || kpi.project_full_code || ''
          
          if (activityName && projectCode) {
            const relatedActivity = activities.find((a: any) => {
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
              const rawActivityDivision = (relatedActivity as any).raw || {}
              // Get Activity Division from BOQ Activity
              kpiDivision = relatedActivity.activity_division || 
                           rawActivityDivision['Activity Division'] ||
                           ''
            }
          }
        }
        
        // Normalize division value
        const normalizedKpiDivision = kpiDivision.toLowerCase().trim()
        
        const matchesDivision = selectedDivisions.some(division => {
          const normalizedDivision = division.toLowerCase().trim()
          return normalizedKpiDivision === normalizedDivision ||
                 normalizedKpiDivision.includes(normalizedDivision) ||
                 normalizedDivision.includes(normalizedKpiDivision)
        })
        
        if (!matchesDivision) return false
      }
      
      // Scope filter
      if (selectedScopes.length > 0) {
        // ✅ Get scope from multiple sources (same logic as KPITableWithCustomization)
        const rawKPIScope = (kpi as any).raw || {}
        let kpiScope = ''
        
        // Priority 1: From project_type_activities table (cached map) with flexible matching
        const activityName = kpi.activity_name?.trim().toLowerCase()
        if (activityName && activityScopeMap.size > 0) {
          const scope = findActivityScope(activityName, activityScopeMap)
          if (scope) {
            kpiScope = scope
          }
        }
        
        // Priority 2: From KPI raw data
        if (!kpiScope) {
          kpiScope = rawKPIScope['Activity Scope'] ||
                     rawKPIScope['Activity Scope of Works'] ||
                     rawKPIScope['Scope of Works'] ||
                     rawKPIScope['Scope'] ||
                     (kpi as any).activity_scope ||
                     ''
        }
        
        // Priority 3: Try to get from activities if available
        if (!kpiScope && activities.length > 0 && activityName) {
          const relatedActivity = activities.find((a: any) => {
            const activityNameMatch = (
              a.activity_name?.toLowerCase().trim() === activityName ||
              a.activity?.toLowerCase().trim() === activityName
            )
            const projectMatch = (
              a.project_code === (kpi as any).project_code ||
              a.project_full_code === (kpi as any).project_code ||
              a.project_code === kpi.project_full_code ||
              a.project_full_code === kpi.project_full_code
            )
            return activityNameMatch && projectMatch
          })
          
          if (relatedActivity) {
            const rawActivityScope = (relatedActivity as any).raw || {}
            kpiScope = rawActivityScope['Activity Scope'] ||
                      rawActivityScope['Activity Scope of Works'] ||
                      rawActivityScope['Scope of Works'] ||
                      rawActivityScope['Scope'] ||
                      ''
          }
        }
        
        // ✅ Only filter if scope was found, otherwise exclude the KPI when scope filter is active
        if (kpiScope && kpiScope !== 'N/A' && kpiScope.trim() !== '') {
          const kpiScopeLower = kpiScope.toLowerCase().trim()
          const matchesScope = selectedScopes.some(scope => {
            const scopeLower = scope.toLowerCase().trim()
            const match = kpiScopeLower === scopeLower ||
                         kpiScopeLower.includes(scopeLower) ||
                         scopeLower.includes(kpiScopeLower)
            return match
          })
          if (!matchesScope) {
            // ✅ DEBUG: Log when scope doesn't match
            if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
              console.log('🔍 Scope filter - No match:', {
                activityName: kpi.activity_name,
                kpiScope,
                selectedScopes,
                activityScopeMapSize: activityScopeMap.size,
                activityNameInMap: activityName ? activityScopeMap.has(activityName) : false
              })
            }
            return false
          }
        } else {
          // ✅ If no scope found and scope filter is active, exclude the KPI
          // This ensures that only KPIs with matching scopes are shown
          if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
            console.log('🔍 Scope filter - No scope found for KPI:', {
              activityName: kpi.activity_name,
              activityNameLower: activityName,
              activityScopeMapSize: activityScopeMap.size,
              hasActivityInMap: activityName ? activityScopeMap.has(activityName) : false
            })
          }
          return false
        }
      }
      
      // Activity Timing filter
      if (selectedActivityTimings.length > 0) {
        // ✅ Get Activity Timing from multiple sources (same logic as KPITableWithCustomization)
        const rawKPI = (kpi as any).raw || {}
        // ✅ FIX: Read Activity Timing from KPI first - check both mapped field and raw data
        let kpiTiming = (kpi as any).activity_timing || 
                       rawKPI['Activity Timing'] ||
                       rawKPI['activity_timing'] ||
                       ''
        
        // ✅ Normalize empty strings to undefined
        if (kpiTiming === '' || kpiTiming === 'N/A') {
          kpiTiming = undefined
        }
        
        // ✅ Try to get from related BOQ Activity ONLY if not found in KPI
        if (!kpiTiming) {
          const activityName = kpi.activity_name || (kpi as any).activity || ''
          const projectCode = (kpi as any).project_code || kpi.project_full_code || ''
          
          if (activityName && activities && activities.length > 0) {
            const relatedActivity = activities.find((a: any) => {
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
              
              if (boqTiming && boqTiming !== 'N/A' && boqTiming.trim() !== '') {
                kpiTiming = boqTiming.trim()
              }
            }
          }
        }
        
        // ✅ Default to 'post-commencement' only if no timing found at all
        if (!kpiTiming || kpiTiming === 'N/A' || kpiTiming.trim() === '') {
          kpiTiming = 'post-commencement'
        }
        
        // ✅ Normalize timing value for comparison (using helper function defined above)
        const normalizedKpiTiming = normalizeTiming(kpiTiming.toString())
        
        const matchesTiming = selectedActivityTimings.some(timing => {
          const normalizedTiming = normalizeTiming(timing)
          
          // ✅ Match exact or partial (handles "Post Commencement" vs "post-commencement")
          const exactMatch = normalizedKpiTiming === normalizedTiming
          const partialMatch1 = normalizedKpiTiming.includes(normalizedTiming)
          const partialMatch2 = normalizedTiming.includes(normalizedKpiTiming)
          
          // ✅ DEBUG: Log first KPI to diagnose
          if (process.env.NODE_ENV === 'development' && kpis.length > 0 && kpi === kpis[0] && selectedActivityTimings.length > 0 && timing === selectedActivityTimings[0]) {
            console.log('🔍 Activity Timing Filter - First Comparison:', {
              kpi_id: kpi.id,
              activity_name: kpi.activity_name,
              kpiTiming_original: kpiTiming,
              normalizedKpiTiming,
              selectedTiming_original: timing,
              normalizedTiming,
              exactMatch,
              partialMatch1,
              partialMatch2,
              finalMatch: exactMatch || partialMatch1 || partialMatch2
            })
          }
          
          return exactMatch || partialMatch1 || partialMatch2
        })
        
        if (!matchesTiming) {
          // ✅ DEBUG: Log when KPI is filtered out (sample)
          if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
            console.log('❌ Activity Timing Filter - KPI filtered out:', {
              kpi_id: kpi.id,
              activity_name: kpi.activity_name,
              kpiTiming: kpiTiming,
              normalizedKpiTiming,
              selectedActivityTimings,
              normalizedSelectedTimings: selectedActivityTimings.map(t => normalizeTiming(t))
            })
          }
          return false
        }
      }
      
      // ✅ FIXED: Date range filter - Use EXACT SAME LOGIC as Date column in table
      // Priority: Day, Actual Date (for Actual), Target Date (for Planned), Activity Date
      if (dateRange.from || dateRange.to) {
        const rawKPIDate = (kpi as any).raw || {}
        
        // Priority 1: Day column (if available and formatted)
        const dayValue = (kpi as any).day || rawKPIDate['Day'] || ''
        
        // Priority 2: Actual Date (for Actual KPIs) or Target Date (for Planned KPIs)
        const actualDateValue = (kpi as any).actual_date || rawKPIDate['Actual Date'] || ''
        const targetDateValue = kpi.target_date || rawKPIDate['Target Date'] || ''
        
        // Priority 3: Activity Date
        const activityDateValue = kpi.activity_date || rawKPIDate['Activity Date'] || ''
        
        // Determine which date to use based on Input Type (SAME AS TABLE COLUMN)
        let dateToUse = ''
        if (kpi.input_type === 'Actual' && actualDateValue) {
          dateToUse = actualDateValue
        } else if (kpi.input_type === 'Planned' && targetDateValue) {
          dateToUse = targetDateValue
        } else if (dayValue) {
          // If Day is available, try to use it or fallback to Activity Date
          dateToUse = activityDateValue || dayValue
        } else {
          dateToUse = activityDateValue || actualDateValue || targetDateValue
        }
        
        // If no date found, skip this KPI (don't include it in filtered results)
        if (!dateToUse) {
          return false
        }
        
        // Parse the date and compare with filter range
        try {
          const kpiDate = new Date(dateToUse)
          if (isNaN(kpiDate.getTime())) {
            return false // Invalid date, skip this KPI
          }
          
          kpiDate.setHours(0, 0, 0, 0) // Normalize to start of day
          
          if (dateRange.from) {
            const fromDate = new Date(dateRange.from)
            fromDate.setHours(0, 0, 0, 0)
            if (kpiDate < fromDate) return false
          }
          
          if (dateRange.to) {
            const toDate = new Date(dateRange.to)
            toDate.setHours(23, 59, 59, 999) // End of day
            if (kpiDate > toDate) return false
          }
        } catch (error) {
          console.warn('[Date Range Filter] Error parsing date:', dateToUse, error)
          return false // Skip this KPI if date parsing fails
        }
      }
      
      // Value range filter
      if (valueRange.min !== undefined || valueRange.max !== undefined) {
        const kpiValue = (kpi as any).value || kpi.value || 0
        if (valueRange.min !== undefined && kpiValue < valueRange.min) return false
        if (valueRange.max !== undefined && kpiValue > valueRange.max) return false
      }
      
      // Quantity range filter
      if (quantityRange.min !== undefined || quantityRange.max !== undefined) {
        const kpiQuantity = kpi.quantity || 0
        if (quantityRange.min !== undefined && kpiQuantity < quantityRange.min) return false
        if (quantityRange.max !== undefined && kpiQuantity > quantityRange.max) return false
      }
      
      return true
    })
  }, [kpis, activities, activityScopeMap, selectedProjects, selectedActivities, selectedTypes, selectedZones, selectedUnits, selectedDivisions, selectedScopes, selectedActivityTimings, dateRange, valueRange, quantityRange, globalSearchTerm])

  // Pagination logic
  const totalPages = Math.ceil(filteredKPIs.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedKPIs = filteredKPIs.slice(startIndex, endIndex)

  // Calculate KPI statistics (from ALL filtered, not just current page)
  const totalKPIs = filteredKPIs.length
  const plannedKPIs = filteredKPIs.filter(k => k.input_type === 'Planned')
  const actualKPIs = filteredKPIs.filter(k => k.input_type === 'Actual')
  const plannedCount = plannedKPIs.length
  const actualCount = actualKPIs.length
  
  // Total quantities
  const totalPlannedQty = plannedKPIs.reduce((sum: number, k: ProcessedKPI) => sum + k.quantity, 0)
  const totalActualQty = actualKPIs.reduce((sum: number, k: ProcessedKPI) => sum + k.quantity, 0)
  
  // ✅ OPTIMIZED: Create activity index map for O(1) lookup instead of O(n) find() in reduce
  // This dramatically improves performance for large projects (500+ KPIs)
  // ✅ IMPROVED: Includes Zone in matching for accuracy
  const activityIndexMap = useMemo(() => {
    const map = new Map<string, BOQActivity[]>() // Store array to handle multiple activities with same name but different zones
    activities.forEach((activity: BOQActivity) => {
      const activityName = (activity.activity_name || '').toLowerCase().trim()
      const projectFullCode = (activity.project_full_code || '').toLowerCase().trim()
      const projectCode = (activity.project_code || '').toLowerCase().trim()
      const rawActivity = (activity as any).raw || {}
      const activityZone = (activity.zone_ref || activity.zone_number || rawActivity['Zone Ref'] || rawActivity['Zone Number'] || '').toString().toLowerCase().trim()
      
      // Create multiple keys for flexible matching (with and without zone)
      // Key 1: activity_name + project_full_code + zone
      if (activityName && projectFullCode) {
        const key1WithZone = `${activityName}|${projectFullCode}|${activityZone}`
        const key1WithoutZone = `${activityName}|${projectFullCode}`
        
        if (activityZone) {
          if (!map.has(key1WithZone)) {
            map.set(key1WithZone, [])
          }
          map.get(key1WithZone)!.push(activity)
        }
        
        // Also store without zone for fallback
        if (!map.has(key1WithoutZone)) {
          map.set(key1WithoutZone, [])
        }
        map.get(key1WithoutZone)!.push(activity)
      }
      
      // Key 2: activity_name + project_code + zone (if different from project_full_code)
      if (activityName && projectCode && projectCode !== projectFullCode) {
        const key2WithZone = `${activityName}|${projectCode}|${activityZone}`
        const key2WithoutZone = `${activityName}|${projectCode}`
        
        if (activityZone) {
          if (!map.has(key2WithZone)) {
            map.set(key2WithZone, [])
          }
          map.get(key2WithZone)!.push(activity)
        }
        
        // Also store without zone for fallback
        if (!map.has(key2WithoutZone)) {
          map.set(key2WithoutZone, [])
        }
        map.get(key2WithoutZone)!.push(activity)
      }
    })
    return map
  }, [activities])
  
  // ✅ OPTIMIZED: Helper function to get activity rate using index map with Zone matching
  const getActivityRate = useCallback((kpi: ProcessedKPI): number => {
    const activityName = (kpi.activity_name || '').toLowerCase().trim()
    const projectFullCode = (kpi.project_full_code || '').toLowerCase().trim()
    const projectCode = ((kpi as any).project_code || '').toLowerCase().trim()
    
    // ✅ IMPROVED: Extract KPI Zone from multiple sources (same logic as KPITableWithCustomization)
    const rawKPI = ((kpi as any).raw || {})
    const kpiZoneRaw = (kpi.zone || rawKPI['Zone'] || rawKPI['Zone Number'] || '').toString().trim()
    // Normalize KPI zone (remove project code prefix if exists)
    let kpiZone = kpiZoneRaw.toLowerCase().trim()
    if (kpiZone && (kpi as any).project_code) {
      const projectCodeUpper = ((kpi as any).project_code || '').toUpperCase()
      kpiZone = kpiZone.replace(new RegExp(`^${projectCodeUpper}\\s*-\\s*`, 'i'), '').trim()
      kpiZone = kpiZone.replace(new RegExp(`^${projectCodeUpper}\\s+`, 'i'), '').trim()
      kpiZone = kpiZone.replace(new RegExp(`^${projectCodeUpper}-`, 'i'), '').trim()
    }
    if (!kpiZone) kpiZone = kpiZoneRaw.toLowerCase().trim()
    
    // Try multiple keys for flexible matching (with Zone priority)
    let relatedActivities: BOQActivity[] | undefined
    
    // Try 1: activity_name + project_full_code + zone (most precise)
    if (activityName && projectFullCode && kpiZone) {
      const key1WithZone = `${activityName}|${projectFullCode}|${kpiZone}`
      relatedActivities = activityIndexMap.get(key1WithZone)
    }
    
    // Try 2: activity_name + project_full_code (without zone - fallback)
    if (!relatedActivities || relatedActivities.length === 0) {
      if (activityName && projectFullCode) {
        const key1WithoutZone = `${activityName}|${projectFullCode}`
        relatedActivities = activityIndexMap.get(key1WithoutZone)
      }
    }
    
    // Try 3: activity_name + project_code + zone (if not found and project_code exists)
    if (!relatedActivities || relatedActivities.length === 0) {
      if (activityName && projectCode && kpiZone) {
        const key2WithZone = `${activityName}|${projectCode}|${kpiZone}`
        relatedActivities = activityIndexMap.get(key2WithZone)
      }
    }
    
    // Try 4: activity_name + project_code (without zone - fallback)
    if (!relatedActivities || relatedActivities.length === 0) {
      if (activityName && projectCode) {
        const key2WithoutZone = `${activityName}|${projectCode}`
        relatedActivities = activityIndexMap.get(key2WithoutZone)
      }
    }
    
    // If multiple activities found, prefer the one with matching zone
    let relatedActivity: BOQActivity | undefined
    if (relatedActivities && relatedActivities.length > 0) {
      if (kpiZone && relatedActivities.length > 1) {
        // Prefer activity with matching zone
        relatedActivity = relatedActivities.find(a => {
          const rawA = (a as any).raw || {}
          const aZone = (a.zone_ref || a.zone_number || rawA['Zone Ref'] || rawA['Zone Number'] || '').toString().toLowerCase().trim()
          return aZone === kpiZone || aZone.includes(kpiZone) || kpiZone.includes(aZone)
        }) || relatedActivities[0]
      } else {
        relatedActivity = relatedActivities[0]
      }
    }
    
    if (relatedActivity) {
      const rawActivity = (relatedActivity as any).raw || {}
      
      // ✅ PRIORITY 1: Calculate Rate = Total Value / Total Units (SAME AS TABLE)
      // This matches the table's logic exactly
      const totalValueFromActivity = relatedActivity.total_value || 
                                   parseFloat(String(rawActivity['Total Value'] || '0').replace(/,/g, '')) || 
                                   0
      
      const totalUnits = relatedActivity.total_units || 
                       relatedActivity.planned_units ||
                       parseFloat(String(rawActivity['Total Units'] || rawActivity['Planned Units'] || '0').replace(/,/g, '')) || 
                       0
      
      if (totalUnits > 0 && totalValueFromActivity > 0) {
        const calculatedRate = totalValueFromActivity / totalUnits
        // ✅ DEBUG: Log calculated rate for first few KPIs
        if (process.env.NODE_ENV === 'development' && Math.random() < 0.01) { // Log 1% randomly
          const aZone = (relatedActivity.zone_ref || relatedActivity.zone_number || rawActivity['Zone Ref'] || rawActivity['Zone Number'] || '').toString().toLowerCase().trim()
          console.log(`✅ [getActivityRate] Calculated rate for ${activityName}:`, {
            kpiZone: kpiZone || 'N/A',
            activityZone: aZone || 'N/A',
            calculatedRate,
            totalValue: totalValueFromActivity,
            totalUnits,
            calculation: `${totalValueFromActivity} / ${totalUnits} = ${calculatedRate}`,
            projectFullCode,
            projectCode
          })
        }
        return calculatedRate
      }
      
      // ✅ PRIORITY 2: Use rate directly from activity (fallback)
      if (relatedActivity.rate && relatedActivity.rate > 0) {
        // ✅ DEBUG: Log successful rate match for first few KPIs
        if (process.env.NODE_ENV === 'development' && Math.random() < 0.01) { // Log 1% randomly
          const aZone = (relatedActivity.zone_ref || relatedActivity.zone_number || rawActivity['Zone Ref'] || rawActivity['Zone Number'] || '').toString().toLowerCase().trim()
          console.log(`✅ [getActivityRate] Found rate for ${activityName}:`, {
            kpiZone: kpiZone || 'N/A',
            activityZone: aZone || 'N/A',
            rate: relatedActivity.rate,
            projectFullCode,
            projectCode
          })
        }
        return relatedActivity.rate
      }
      
      // ✅ PRIORITY 3: Try to get rate from raw activity data
      const rateFromRaw = parseFloat(String(rawActivity['Rate'] || '0').replace(/,/g, '')) || 0
      if (rateFromRaw > 0) {
        return rateFromRaw
      }
    }
    
    // ✅ DEBUG: Log when no rate found
    if (process.env.NODE_ENV === 'development' && Math.random() < 0.01) { // Log 1% randomly
      console.warn(`⚠️ [getActivityRate] No rate found for ${activityName}:`, {
        kpiZone: kpiZone || 'N/A',
        projectFullCode,
        projectCode,
        foundActivities: relatedActivities?.length || 0
      })
    }
    
    return 0
  }, [activityIndexMap])
  
  // ✅ FIXED: Calculate Planned Value using EXACT SAME LOGIC as table Value column
  // Priority: 1) Calculate from Rate × Quantity (same as table), 2) Use Value directly from KPI, 3) Use Planned Value
  const totalPlannedValue = useMemo(() => {
    if (plannedKPIs.length === 0) {
      return 0
    }

    let total = 0
    let fromCalculated = 0
    let fromValue = 0
    let fromPlannedValue = 0
    let skipped = 0
    
    plannedKPIs.forEach((kpi: ProcessedKPI) => {
      const rawKPI = (kpi as any).raw || {}
      
      // Get Quantity
      const quantity = (kpi.quantity ?? 
                       parseFloat(String(rawKPI['Quantity'] || '0').replace(/,/g, ''))) || 
                       0
      
      // ✅ PRIORITY 1: Calculate from Rate × Quantity (SAME AS TABLE COLUMN)
      // This is how Value is calculated in the table: Quantity × Rate
      const rate = getActivityRate(kpi)
      let calculatedValue = 0
      if (rate > 0 && quantity > 0) {
        calculatedValue = rate * quantity
        if (calculatedValue > 0) {
          total += calculatedValue
          fromCalculated++
          return
        }
      }
      
      // ✅ PRIORITY 2: Use Value directly from KPI (fallback if calculated value is 0)
      // Check raw['Value'] first (from database), then k.value
      let kpiValue = 0
      
      // Try raw['Value'] (from database with capital V) - MOST RELIABLE
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
      
      // If we found a value, use it
      if (kpiValue > 0) {
        total += kpiValue
        fromValue++
        return
      }
      
      // ✅ PRIORITY 3: Use Planned Value from KPI (same as table fallback)
      if (kpiValue === 0) {
        const plannedValue = kpi.planned_value || parseFloat(String(rawKPI['Planned Value'] || '0').replace(/,/g, '')) || 0
        if (plannedValue > 0) {
          total += plannedValue
          fromPlannedValue++
          return
        }
      }
      
      // ✅ CRITICAL: If no value found and no rate, skip (NEVER use quantity as value!)
      skipped++
    })
    
    // Calculate total quantity for comparison
    const totalPlannedQty = plannedKPIs.reduce((sum: number, k: ProcessedKPI) => {
      const rawKPI = (k as any).raw || {}
      return sum + ((k.quantity ?? parseFloat(String(rawKPI['Quantity'] || '0').replace(/,/g, ''))) || 0)
    }, 0)
    
    // ✅ ALWAYS LOG: To help debug the issue
    const seemsWrong = total === totalPlannedQty && total > 0
    console.log(`📊 [Planned Value] Calculated for ${plannedKPIs.length} Planned KPIs:`, {
      total,
      totalPlannedQty,
      fromCalculated,
      fromValue,
      fromPlannedValue,
      skipped,
      percentages: {
        fromCalculated: plannedKPIs.length > 0 ? ((fromCalculated / plannedKPIs.length) * 100).toFixed(1) + '%' : '0%',
        fromValue: plannedKPIs.length > 0 ? ((fromValue / plannedKPIs.length) * 100).toFixed(1) + '%' : '0%',
        fromPlannedValue: plannedKPIs.length > 0 ? ((fromPlannedValue / plannedKPIs.length) * 100).toFixed(1) + '%' : '0%',
        skipped: plannedKPIs.length > 0 ? ((skipped / plannedKPIs.length) * 100).toFixed(1) + '%' : '0%'
      },
      warning: seemsWrong ? '⚠️ Total equals quantity - values may not be calculated correctly!' : 
              (total === 0 ? '⚠️ Total is 0 - no values found!' : null),
      note: 'Total is VALUE (not quantity) - Priority: 1) Rate × Quantity, 2) Value from KPI, 3) Planned Value'
    })
    
    // Log sample KPIs for debugging
    if (plannedKPIs.length > 0) {
      console.log('🔍 Sample Planned KPIs (first 5):', plannedKPIs.slice(0, 5).map((k: ProcessedKPI) => {
        const rawKPI = (k as any).raw || {}
        const qty = (k.quantity ?? parseFloat(String(rawKPI['Quantity'] || '0').replace(/,/g, ''))) || 0
        const r = getActivityRate(k)
        return {
          id: k.id,
          activity_name: k.activity_name,
          quantity: qty,
          value_direct: k.value,
          value_raw: rawKPI['Value'],
          value_raw_lowercase: rawKPI.value,
          rate: r,
          calculated_from_rate: r > 0 ? (r * qty) : 0
        }
      }))
    }
    
    if (total === 0 && totalPlannedQty > 0) {
      console.warn('⚠️ [Planned Value] Total is 0 but quantity is', totalPlannedQty, '- values may not be calculated correctly!')
    }
    
    if (seemsWrong) {
      console.error('❌ [Planned Value] CRITICAL ERROR: Total equals quantity! This means values are not being calculated correctly.')
    }
    
    return total
  }, [plannedKPIs, getActivityRate])
  
  // ✅ FIXED: Calculate Actual Value using EXACT SAME LOGIC as table Value column
  // Priority: 1) Rate × Quantity (SAME AS TABLE), 2) Value directly from KPI, 3) Actual Value
  // ✅ IMPORTANT: Always calculate VALUE, never use quantity directly
  const totalActualValue = useMemo(() => {
    let total = 0
    let fromValue = 0
    let fromRate = 0
    let fromActualValue = 0
    let skipped = 0
    
    actualKPIs.forEach((k: ProcessedKPI) => {
      const rawKPI = (k as any).raw || {}
      
      // Get Quantity
      const quantity = (k.quantity ?? 
                      parseFloat(String(rawKPI['Quantity'] || '0').replace(/,/g, ''))) || 
                      0
      
      // ✅ PRIORITY 1: Calculate from Rate × Quantity (SAME AS TABLE COLUMN)
      // This is how Value is calculated in the table: Quantity × Rate
      const rate = getActivityRate(k)
      let calculatedValue = 0
      if (rate > 0 && quantity > 0) {
        calculatedValue = rate * quantity
        if (calculatedValue > 0) {
          total += calculatedValue
          fromRate++
          return
        }
      }
      
      // ✅ PRIORITY 2: Use Value directly from KPI (fallback if calculated value is 0)
      // Check raw['Value'] first (from database), then k.value
      let kpiValue = 0
      
      // Try raw['Value'] (from database with capital V) - MOST RELIABLE
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
      if (kpiValue === 0 && k.value !== undefined && k.value !== null) {
        const val = k.value
        kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
      }
      
      if (kpiValue > 0) {
        total += kpiValue
        fromValue++
        return
      }
      
      // ✅ PRIORITY 3: Try Actual Value (fallback if calculated value and Value are both 0)
      const actualValue = (k.actual_value ?? 
                         parseFloat(String(rawKPI['Actual Value'] || '0').replace(/,/g, ''))) || 
                         0
      
      if (actualValue > 0) {
        total += actualValue
        fromActualValue++
        return
      }
      
      // ✅ If no value found and no rate, skip (don't add quantity!)
      skipped++
    })
    
    // ✅ DEBUG: Log calculation summary
    if (process.env.NODE_ENV === 'development' && actualKPIs.length > 0) {
      console.log(`📊 [Actual Value] Calculated for ${actualKPIs.length} Actual KPIs:`, {
        total,
        fromValue,
        fromRate,
        fromActualValue,
        skipped,
        percentageFromValue: actualKPIs.length > 0 ? ((fromValue / actualKPIs.length) * 100).toFixed(1) + '%' : '0%',
        percentageFromRate: actualKPIs.length > 0 ? ((fromRate / actualKPIs.length) * 100).toFixed(1) + '%' : '0%',
        note: 'Total is VALUE (not quantity)'
      })
    }
    
    return total
  }, [actualKPIs, getActivityRate])
  // Calculate achievement rates
  const valueAchievementRate = totalPlannedValue > 0 ? (totalActualValue / totalPlannedValue) * 100 : 0
  const quantityAchievementRate = totalPlannedQty > 0 ? (totalActualQty / totalPlannedQty) * 100 : 0
  // Use value-based achievement rate as primary (more accurate for financial tracking)
  const achievementRate = totalPlannedValue > 0 ? valueAchievementRate : (totalPlannedQty > 0 ? quantityAchievementRate : 0)
  
  // Quality statistics
  const excellentKPIs = filteredKPIs.filter(k => k.status === 'excellent').length
  const goodKPIs = filteredKPIs.filter(k => k.status === 'good').length

  // Handle import KPI data
  const handleImportKPI = async (importedData: any[]) => {
    try {
      console.log(`📥 Importing ${importedData.length} KPI records...`)
      
      // Map imported data to database format
      const kpisToInsert = importedData.map(row => ({
        'Project Full Code': row['Project Full Code'] || row['project_full_code'] || row['Project Code'] || '',
        'Project Code': row['Project Code'] || row['project_code'] || '',
        'Project Sub Code': row['Project Sub Code'] || row['project_sub_code'] || '',
        'Activity Name': row['Activity Name'] || row['activity_name'] || '',
        'Activity': row['Activity'] || row['activity'] || '',
        'Quantity': row['Quantity'] || row['quantity'] || '0',
        'Input Type': row['Input Type'] || row['input_type'] || 'Planned',
        'Unit': row['Unit'] || row['unit'] || '',
        'Section': row['Section'] || row['section'] || '',
        'Zone': row['Zone'] || row['zone'] || '',
        'Drilled Meters': row['Drilled Meters'] || row['drilled_meters'] || '0',
        'Value': row['Value'] || row['value'] || '0',
        'Target Date': row['Target Date'] || row['target_date'] || '',
        'Actual Date': row['Actual Date'] || row['actual_date'] || '',
        'Activity Date': row['Activity Date'] || row['activity_date'] || '',
        'Day': row['Day'] || row['day'] || '',
        'Recorded By': row['Recorded By'] || row['recorded_by'] || '',
        'Notes': row['Notes'] || row['notes'] || ''
      }))
      
      // Insert into database
      const { data, error } = await supabase
        .from(TABLES.KPI)
        .insert(kpisToInsert as any)
        .select()
      
      if (error) {
        console.error('❌ Error importing KPI records:', error)
        throw error
      }
      
      console.log(`✅ Successfully imported ${data?.length || 0} KPI records`)
      
      // Refresh KPI list
      if (selectedProjects.length > 0) {
        await fetchData(selectedProjects)
      }
    } catch (error: any) {
      console.error('❌ Import failed:', error)
      throw new Error(`Import failed: ${error.message}`)
    }
  }

  // Prepare data for export
  const getExportData = () => {
    const paginated = filteredKPIs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    
    return paginated.map(kpi => ({
      'Project Full Code': kpi.project_full_code,
      'Project Code': (kpi as any).project_code || '',
      'Activity Name': kpi.activity_name,
      'Input Type': kpi.input_type,
      'Quantity': kpi.quantity,
      'Unit': kpi.unit,
      'Target Date': kpi.target_date,
      'Actual Date': (kpi as any).actual_date || '',
      'Activity Date': kpi.activity_date || '',
      'Day': (kpi as any).day || '',
      'Section': kpi.section,
      'Zone': (kpi as any).zone || '',
      'Drilled Meters': kpi.drilled_meters,
      'Value': (kpi as any).value || 0,
      'Recorded By': (kpi as any).recorded_by || '',
      'Notes': (kpi as any).notes || '',
      'Status': kpi.status
    }))
  }

  // Template columns for import
  const importTemplateColumns = [
    'Project Full Code',
    'Project Code',
    'Project Sub Code',
    'Activity Name',
    'Activity',
    'Quantity',
    'Input Type',
    'Unit',
    'Section',
    'Zone',
    'Drilled Meters',
    'Value',
    'Target Date',
    'Actual Date',
    'Activity Date',
    'Day',
    'Recorded By',
    'Notes'
  ]

  // Don't show full-page loading spinner - show skeleton instead
  const isInitialLoad = loading && kpis.length === 0

  return (
    <div className="space-y-6 max-w-full overflow-hidden kpi-container">
      {/* Header Section */}
      <div className="space-y-6">
        {/* Title and Description */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">KPI Tracking</h2>
              {loading && (
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-full animate-pulse">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                  <span className="text-xs text-blue-600 dark:text-blue-400">Syncing...</span>
                </div>
              )}
            </div>
            <p className="text-gray-600 dark:text-gray-300 mt-2">Monitor and track KPIs for projects and activities</p>
          </div>
          
                 {/* Add New KPI Buttons */}
                 {guard.hasAccess('kpi.create') && (
                   <div className="flex flex-col sm:flex-row gap-2">
                     <Button 
                       onClick={() => setShowForm(true)} 
                       className="flex items-center space-x-2 px-6 py-3 whitespace-nowrap"
                     >
                       <Plus className="h-4 w-4" />
                       <span>Add New KPI</span>
                     </Button>
                     <Button 
                       onClick={() => {
                         // Navigate to the dedicated smart form page
                         router.push('/kpi/smart-form')
                       }}
                       className="flex items-center space-x-2 px-6 py-3 whitespace-nowrap bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white"
                     >
                       <Target className="h-4 w-4" />
                       <span>Smart Site KPI Form</span>
                     </Button>
                     <Button 
                       onClick={() => {
                         // ✅ Use router.push to maintain session and avoid reload
                         router.push('/kpi/add')
                       }}
                       variant="outline"
                       className="flex items-center space-x-2 px-6 py-3 whitespace-nowrap"
                     >
                       <Target className="h-4 w-4" />
                       <span>Legacy Site Form</span>
                     </Button>
                    <PermissionButton
                      permission="kpi.view"
                      onClick={() => setUseCustomizedTable(!useCustomizedTable)}
                      variant="outline"
                      className="flex items-center space-x-2 px-6 py-3 whitespace-nowrap"
                    >
                      <Filter className="h-4 w-4" />
                      <span>{useCustomizedTable ? 'Standard View' : 'Customize Columns'}</span>
                    </PermissionButton>
                  </div>
                )}
                
                {/* Need to Submit Button - Protected by permissions */}
                <PermissionButton
                  permission="kpi.need_to_submit"
                  onClick={() => router.push('/kpi/pending-approval')}
                  variant="outline"
                  className="flex items-center space-x-2 px-6 py-3 whitespace-nowrap bg-yellow-50 hover:bg-yellow-100 border-yellow-300 text-yellow-700 dark:bg-yellow-900/20 dark:border-yellow-700 dark:text-yellow-300 relative"
                >
                  <Clock className="h-4 w-4" />
                  <span>Need to Submit</span>
                  {pendingKPICount > 0 && (
                    <span className="ml-2 px-2 py-0.5 text-xs font-bold rounded-full bg-red-500 text-white">
                      {pendingKPICount}
                    </span>
                  )}
                </PermissionButton>
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">Data Actions:</span>
          {filteredKPIs.length > 0 && (
            <PermissionGuard permission="kpi.export">
              <ExportButton
                data={getExportData()}
                filename="KPI_Records"
                formats={['csv', 'excel']}
                label="Export"
                variant="outline"
              />
            </PermissionGuard>
          )}
          
          <PermissionGuard permission="kpi.print">
            <PrintButton
              label="Print"
              variant="outline"
              printTitle="KPI Records Report"
              printSettings={{
                fontSize: 'medium',
                compactMode: true
              }}
            />
          </PermissionGuard>
          
          <PermissionGuard permission="kpi.import">
            <ImportButton
              onImport={handleImportKPI}
              requiredColumns={['Project Code', 'Activity Name', 'Quantity', 'Input Type']}
              templateName="KPI_Records"
              templateColumns={importTemplateColumns}
              label="Import"
              variant="outline"
            />
          </PermissionGuard>
        </div>
      </div>
      
      {/* Smart Filter */}
      <SmartFilter
        projects={projects.map(p => {
          // ✅ CRITICAL: Use project_full_code from project object directly
          // This ensures consistency with database values
          const projectCode = (p.project_code || '').trim()
          const projectSubCode = (p.project_sub_code || '').trim()
          const projectFullCode = (p.project_full_code || projectCode).trim() // Use from DB, fallback to code
          
          return {
            project_code: projectCode,
            project_sub_code: projectSubCode,
            project_full_code: projectFullCode, // ✅ Use from database, not manually built
            project_name: p.project_name 
          }
        })}
        activities={activities.map(a => ({
          activity_name: a.activity_name,
          project_code: a.project_code,
          project_full_code: a.project_full_code || a.project_code, // ✅ CRITICAL: Include project_full_code
          zone: a.zone_ref || a.zone_number || '',
          unit: a.unit || '',
          activity_division: a.activity_division || ''
        }))}
        kpis={kpis.map(k => {
          // ✅ Get activity_scope from multiple sources
          const rawKPIScope = (k as any).raw || {}
          let activityScope = ''
          
          // Priority 1: From project_type_activities table (cached map) with flexible matching
          const activityName = k.activity_name?.trim().toLowerCase()
          if (activityName && activityScopeMap.size > 0) {
            const scope = findActivityScope(activityName, activityScopeMap)
            if (scope) {
              activityScope = scope
            }
          }
          
          // Priority 2: From KPI raw data
          if (!activityScope) {
            activityScope = rawKPIScope['Activity Scope'] ||
                           rawKPIScope['Activity Scope of Works'] ||
                           rawKPIScope['Scope of Works'] ||
                           rawKPIScope['Scope'] ||
                           (k as any).activity_scope ||
                           ''
          }
          
          // Priority 3: From activities if available
          if (!activityScope && activities.length > 0 && activityName) {
            const relatedActivity = activities.find((a: any) => {
              const activityNameMatch = (
                a.activity_name?.toLowerCase().trim() === activityName ||
                a.activity?.toLowerCase().trim() === activityName
              )
              return activityNameMatch
            })
            
            if (relatedActivity) {
              const rawActivityScope = (relatedActivity as any).raw || {}
              activityScope = rawActivityScope['Activity Scope'] ||
                            rawActivityScope['Activity Scope of Works'] ||
                            rawActivityScope['Scope of Works'] ||
                            rawActivityScope['Scope'] ||
                            ''
            }
          }
          
          // ✅ Get Activity Timing using same logic as Activity Commencement Relation column
          const rawKPI = (k as any).raw || {}
          let activityTiming = (k as any).activity_timing || 
                             rawKPI['Activity Timing'] ||
                             rawKPI['activity_timing'] ||
                             ''
          
          // Normalize empty strings to undefined
          if (activityTiming === '' || activityTiming === 'N/A') {
            activityTiming = undefined
          }
          
          // Try to get from related BOQ Activity ONLY if not found in KPI
          if (!activityTiming && activities && activities.length > 0) {
            const activityName = k.activity_name || (k as any).activity || ''
            const projectCode = (k as any).project_code || k.project_full_code || ''
            
            if (activityName && projectCode) {
              const relatedActivity = activities.find((a: any) => {
                const nameMatch = (
                  a.activity_name?.toLowerCase().trim() === activityName.toLowerCase().trim() ||
                  a.activity?.toLowerCase().trim() === activityName.toLowerCase().trim()
                )
                const projectMatch = (
                  a.project_code === projectCode ||
                  a.project_full_code === projectCode ||
                  a.project_code === k.project_full_code ||
                  a.project_full_code === k.project_full_code
                )
                return nameMatch && projectMatch
              })
              
              if (relatedActivity) {
                const boqTiming = relatedActivity.activity_timing || 
                                (relatedActivity as any).raw?.['Activity Timing'] ||
                                ''
                
                if (boqTiming && boqTiming !== 'N/A' && boqTiming.trim() !== '') {
                  activityTiming = boqTiming.trim()
                }
              }
            }
          }
          
          // Default to 'post-commencement' only if no timing found at all
          if (!activityTiming || activityTiming === 'N/A' || activityTiming.trim() === '') {
            activityTiming = 'post-commencement'
          }
          
          return {
            // ✅ FIX: Extract zone from multiple sources (same logic as filtering)
            zone: ((k as any).zone || (k as any).section || (k as any).zone_ref || (k as any).zone_number || '').toString().trim(),
            unit: (k as any).unit || '',
            activity_division: (k as any).activity_division || '',
            activity_scope: activityScope || undefined, // Only include if not empty
            activity_timing: activityTiming, // ✅ Use calculated activity timing (same as Activity Commencement Relation)
            value: (k as any).value || 0,
            quantity: (k as any).quantity || 0
          }
        })}
        selectedProjects={selectedProjects}
        selectedActivities={selectedActivities}
        selectedTypes={selectedTypes}
        selectedZones={selectedZones}
        selectedUnits={selectedUnits}
        selectedDivisions={selectedDivisions}
        selectedScopes={selectedScopes}
        selectedActivityTimings={selectedActivityTimings}
        selectedStatuses={selectedStatuses}
        dateRange={dateRange}
        valueRange={valueRange}
        quantityRange={quantityRange}
        onProjectsChange={(projectCodes) => {
          setSelectedProjects(projectCodes)
          setCurrentPage(1) // Reset to page 1
          // ✅ Fetch data when filters are applied
          fetchData(projectCodes)
        }}
        onActivitiesChange={setSelectedActivities}
        onTypesChange={setSelectedTypes}
        onZonesChange={setSelectedZones}
        onUnitsChange={setSelectedUnits}
        onDivisionsChange={setSelectedDivisions}
        onScopesChange={setSelectedScopes}
        onActivityTimingsChange={setSelectedActivityTimings}
        onStatusesChange={setSelectedStatuses}
        onDateRangeChange={setDateRange}
        onValueRangeChange={setValueRange}
        onQuantityRangeChange={setQuantityRange}
        onClearAll={() => {
          setSelectedProjects([])
          setSelectedActivities([])
          setSelectedTypes([])
          setSelectedZones([])
          setSelectedUnits([])
          setSelectedDivisions([])
          setSelectedScopes([])
          setSelectedActivityTimings([])
          setSelectedStatuses([])
          setDateRange({})
          setValueRange({})
          setQuantityRange({})
          setCurrentPage(1)
          // Clear data when filters are cleared
          setKpis([])
          setActivities([])
          setTotalKPICount(0)
        }}
      />

      {error && (
        <Alert variant="error">
          {error}
        </Alert>
      )}
      
      

      {/* KPI Statistics - Show if KPIs are loaded */}
      {/* ✅ REDESIGNED: KPI Statistics Cards with Clear Logic */}
      {kpis.length > 0 && (() => {
        // Get currency once for all cards
        const firstProject = selectedProjects.length > 0 
          ? projects.find(p => selectedProjects.includes(p.project_code))
          : projects[0]
        const currencyCode = firstProject?.currency || 'AED'
        
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4 mb-6">
            {/* Card 1: Total Records - Shows total count of all KPIs */}
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 border-purple-200 dark:border-purple-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-purple-600 dark:text-purple-300 mb-1">Total Records</p>
                    <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">{totalKPIs.toLocaleString()}</p>
                    <p className="text-xs text-purple-500 dark:text-purple-400 mt-1">
                      {plannedCount} Planned • {actualCount} Actual
                    </p>
                  </div>
                  <BarChart3 className="h-10 w-10 text-purple-500 flex-shrink-0 ml-2" />
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Planned Targets - Shows count of planned KPIs + total planned quantity */}
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 border-blue-200 dark:border-blue-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-300 mb-1">🎯 Planned Targets</p>
                    <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{plannedCount.toLocaleString()}</p>
                    <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">
                      {totalPlannedQty.toLocaleString()} units
                    </p>
                  </div>
                  <Target className="h-10 w-10 text-blue-500 flex-shrink-0 ml-2" />
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Actual Achieved - Shows actual quantity + actual value */}
            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 border-green-200 dark:border-green-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-green-600 dark:text-green-300 mb-1">✓ Actual Achieved</p>
                    <p className="text-3xl font-bold text-green-900 dark:text-green-100">
                      {totalActualQty.toLocaleString()}
                    </p>
                    <p className="text-xs text-green-500 dark:text-green-400 mt-1">
                      {formatCurrencyByCodeSync(totalActualValue, currencyCode)}
                    </p>
                  </div>
                  <CheckCircle className="h-10 w-10 text-green-500 flex-shrink-0 ml-2" />
                </div>
              </CardContent>
            </Card>

            {/* Card 4: Planned Value - Shows total planned financial value */}
            <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900 dark:to-indigo-800 border-indigo-200 dark:border-indigo-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-indigo-600 dark:text-indigo-300 mb-1">💰 Planned Value</p>
                    <p className="text-3xl font-bold text-indigo-900 dark:text-indigo-100">
                      {formatCurrencyByCodeSync(totalPlannedValue, currencyCode)}
                    </p>
                    <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-1">
                      From {plannedCount} KPIs
                    </p>
                  </div>
                  <Coins className="h-10 w-10 text-indigo-500 flex-shrink-0 ml-2" />
                </div>
              </CardContent>
            </Card>

            {/* Card 5: Actual Value - Shows total actual financial value */}
            <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900 dark:to-emerald-800 border-emerald-200 dark:border-emerald-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-emerald-600 dark:text-emerald-300 mb-1">💵 Actual Value</p>
                    <p className="text-3xl font-bold text-emerald-900 dark:text-emerald-100">
                      {formatCurrencyByCodeSync(totalActualValue, currencyCode)}
                    </p>
                    <p className="text-xs text-emerald-500 dark:text-emerald-400 mt-1">
                      {totalPlannedValue > 0 
                        ? `${valueAchievementRate.toFixed(1)}% of planned`
                        : 'No planned value'}
                    </p>
                  </div>
                  <DollarSign className="h-10 w-10 text-emerald-500 flex-shrink-0 ml-2" />
                </div>
              </CardContent>
            </Card>

            {/* Card 6: Achievement Rate - Shows performance percentage */}
            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900 dark:to-orange-800 border-orange-200 dark:border-orange-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-orange-600 dark:text-orange-300 mb-1">📊 Achievement Rate</p>
                    <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">
                      {Math.min(achievementRate, 999).toFixed(1)}%
                    </p>
                    <div className="mt-1 space-y-0.5">
                      <p className="text-xs text-orange-500 dark:text-orange-400 truncate">
                        {formatCurrencyByCodeSync(totalActualValue, currencyCode)} / {formatCurrencyByCodeSync(totalPlannedValue, currencyCode)}
                      </p>
                      <p className="text-[11px] text-orange-400 dark:text-orange-300">
                        {actualCount} / {plannedCount} KPIs
                      </p>
                    </div>
                  </div>
                  <div className="relative w-12 h-12 flex-shrink-0 ml-2">
                    <svg className="transform -rotate-90 w-12 h-12">
                      <circle
                        cx="24"
                        cy="24"
                        r="20"
                        stroke="currentColor"
                        strokeWidth="3"
                        fill="transparent"
                        className="text-orange-200 dark:text-orange-950"
                      />
                      <circle
                        cx="24"
                        cy="24"
                        r="20"
                        stroke="currentColor"
                        strokeWidth="3"
                        fill="transparent"
                        strokeDasharray={`${Math.min(achievementRate, 100)} 100`}
                        className="text-orange-500"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      })()}

      {/* Empty State - Show when no data loaded */}
      {kpis.length === 0 && !loading && (
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-dashed border-blue-300 dark:border-blue-700">
          <CardContent className="p-12 text-center">
            <div className="flex flex-col items-center space-y-4">
              <div className="p-4 bg-blue-100 dark:bg-blue-800/30 rounded-full">
                <Target className="h-12 w-12 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  No KPI Data Loaded
                </h3>
                <p className="text-gray-600 dark:text-gray-300 max-w-md mx-auto">
                  Select one or more projects using the filter above to load and view KPI data.
                  This helps improve performance by loading only the data you need.
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Filter className="h-4 w-4" />
                <span>Use the Smart Filter to select projects</span>
              </div>
              {totalKPICount > 0 && (
                <div className="mt-4 px-4 py-2 bg-blue-100 dark:bg-blue-800/30 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    📊 <strong>{totalKPICount.toLocaleString()}</strong> total KPIs available in database
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Table - Show if KPIs are loaded */}
      {kpis.length > 0 && (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <Target className="w-5 h-5" />
              KPI Tracking
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                ({filteredKPIs.length.toLocaleString()} {selectedProjects.length > 0 ? `for ${selectedProjects.length} project(s)` : 'total records'})
              </span>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {guard.hasAccess('kpi.view') ? (
            guard.hasAccess('kpi.view') && useCustomizedTable ? (
              <KPITableWithCustomization
                kpis={paginatedKPIs as any}
                projects={projects}
                allActivities={activities} // ✅ Pass activities to get Rate from BOQ
                onEdit={(kpi: KPIRecord) => {
                  setEditingKPI(kpi)
                  setShowForm(true)
                }}
                onDelete={handleDeleteKPI}
                onBulkDelete={handleBulkDeleteKPI}
                onBulkEdit={(selectedKPIs) => {
                  setSelectedKPIsForBulkEdit(selectedKPIs as unknown as ProcessedKPI[])
                  setShowBulkEditModal(true)
                }}
                onSort={handleSort} // ✅ Server-side sorting
                currentSortColumn={sortColumn} // ✅ Current sort column
                currentSortDirection={sortDirection} // ✅ Current sort direction
              />
            ) : guard.hasAccess('kpi.view') ? (
              <OptimizedKPITable
              kpis={paginatedKPIs}
              projects={projects}
              activities={activities}
              onDelete={handleDeleteKPI}
              onBulkDelete={handleBulkDeleteKPI}
              onUpdate={handleUpdateKPI}
              onBulkEdit={(selectedKPIs) => {
                setSelectedKPIsForBulkEdit(selectedKPIs)
                setShowBulkEditModal(true)
              }}
            />
            ) : null
          ) : null}
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(page) => {
                  setCurrentPage(page)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                totalItems={filteredKPIs.length}
                itemsPerPage={itemsPerPage}
              />
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {showForm && (
        <IntelligentKPIForm
          kpi={editingKPI || null}
          projects={projects}
          activities={activities}
          onSubmit={editingKPI ? async (data) => {
            await handleUpdateKPI(editingKPI.id, data)
            setShowForm(false)
            setEditingKPI(null)
          } : handleCreateKPI}
          onCancel={() => {
            setShowForm(false)
            setEditingKPI(null)
          }}
        />
      )}

      {showEnhancedForm && (
        <EnhancedSmartActualKPIForm
          kpi={null}
          projects={projects}
          activities={activities}
          onSubmit={handleCreateKPI}
          onCancel={() => setShowEnhancedForm(false)}
        />
      )}

      {/* Bulk Edit Modal */}
      {showBulkEditModal && (
        <BulkEditKPIModal
          selectedKPIs={selectedKPIsForBulkEdit}
          projects={projects}
          activities={activities}
          onUpdate={handleBulkUpdateKPI}
          onCancel={() => {
            setShowBulkEditModal(false)
            setSelectedKPIsForBulkEdit([])
          }}
          isOpen={showBulkEditModal}
        />
      )}

      {/* Removed duplicate form - now handled by EnhancedKPITable */}
    </div>
  )
}
