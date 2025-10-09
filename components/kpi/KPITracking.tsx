'use client'

import { useEffect, useState, useRef } from 'react'
import { getSupabaseClient, executeQuery } from '@/lib/simpleConnectionManager'
import { useSmartLoading } from '@/lib/smartLoadingManager'
import { KPIRecord, Project, BOQActivity, TABLES } from '@/lib/supabase'
import { mapKPIFromDB, mapProjectFromDB, mapBOQFromDB } from '@/lib/dataMappers'
import { processKPIRecord, ProcessedKPI } from '@/lib/kpiProcessor'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Alert } from '@/components/ui/Alert'
import { IntelligentKPIForm } from '@/components/kpi/IntelligentKPIForm'
import { ImprovedKPITable } from '@/components/kpi/ImprovedKPITable'
import { UnifiedFilter, FilterState } from '@/components/ui/UnifiedFilter'
import { Pagination } from '@/components/ui/Pagination'
import { SmartFilter } from '@/components/ui/SmartFilter'
import { Plus, BarChart3, CheckCircle, Clock, AlertCircle, Target, Info, Filter } from 'lucide-react'

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
  const [kpis, setKpis] = useState<ProcessedKPI[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [activities, setActivities] = useState<BOQActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const isMountedRef = useRef(true) // ✅ Track if component is mounted
  const [showForm, setShowForm] = useState(false)
  const [editingKPI, setEditingKPI] = useState<ProcessedKPI | null>(null)
  const [filters, setFilters] = useState<FilterState>({})
  
  // Smart Filter State
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])
  const [selectedActivities, setSelectedActivities] = useState<string[]>([])
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalKPICount, setTotalKPICount] = useState(0)
  const itemsPerPage = 50 // Show 50 KPIs per page
  
  const supabase = getSupabaseClient()
  const { startSmartLoading, stopSmartLoading } = useSmartLoading('kpi') // ✅ Smart loading

  // Handle unified filter changes
  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters)
    setCurrentPage(1) // Reset to first page when filter changes
    
    // If project filter changed, reload data for that specific project
    if (newFilters.project !== filters.project) {
      console.log('🔄 Project filter changed to:', newFilters.project || 'none')
      fetchData(newFilters.project)
    }
  }

  const fetchData = async (selectedProjectCodes?: string | string[]) => {
    if (!isMountedRef.current) return
    
    try {
      startSmartLoading(setLoading)
      
      // Handle multiple project codes
      const projectCodesArray = Array.isArray(selectedProjectCodes) 
        ? selectedProjectCodes 
        : selectedProjectCodes 
          ? [selectedProjectCodes] 
          : []

      // ✅ إذا لم يتم اختيار مشاريع، حمل المشاريع فقط ولا تحمل KPIs
      if (projectCodesArray.length === 0) {
        console.log('💡 KPITracking: No filter selected - Loading projects list only...')
        
        // تحميل المشاريع فقط
        if (projects.length === 0) {
          const projectsResult = await supabase
            .from(TABLES.PROJECTS)
            .select('*')
            .order('created_at', { ascending: false })
          
          if (projectsResult.data) {
            setProjects(projectsResult.data.map(mapProjectFromDB))
            console.log('✅ Loaded', projectsResult.data.length, 'projects')
          }
        }
        
        // الحصول على العدد الإجمالي للـ KPIs (بدون تحميل البيانات)
        const { count: totalCount } = await supabase
          .from(TABLES.KPI)
          .select('*', { count: 'exact', head: true })
        
        setTotalKPICount(totalCount || 0)
        console.log(`📊 Total KPIs in database: ${totalCount || 0}`)
        
        // تعيين البيانات فارغة
        setKpis([])
        setActivities([])
        
        console.log('💡 Use filter to load KPI data')
        stopSmartLoading(setLoading)
        return
      }
      
      // ✅ إذا تم اختيار مشاريع، حمل البيانات
      console.log(`📊 Fetching KPIs for ${projectCodesArray.length} selected project(s):`, projectCodesArray)
      
      // تحميل Activities و KPIs معاً
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('KPI fetch timeout')), 15000)
      )
      
      // تحميل Activities
      const activitiesResult = await supabase
        .from(TABLES.BOQ_ACTIVITIES)
        .select('*')
      
      if (activitiesResult.data) {
        setActivities(activitiesResult.data.map(mapBOQFromDB))
        console.log('✅ Loaded', activitiesResult.data.length, 'activities')
      }
      
      // تحميل KPIs للمشاريع المحددة
      let kpisData = null
      let count = 0
      
      let kpiQuery = supabase
        .from(TABLES.KPI)
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(0, 999) // حد أقصى 1000 للمشاريع المحددة
      
      // Filter by multiple projects
      if (projectCodesArray.length === 1) {
        kpiQuery = kpiQuery.eq('Project Full Code', projectCodesArray[0])
      } else {
        kpiQuery = kpiQuery.in('Project Full Code', projectCodesArray)
      }
      
      const { data, error, count: totalCount } = await Promise.race([
        kpiQuery,
        timeoutPromise
      ]) as any
      
      if (error) throw error
      
      kpisData = data
      count = totalCount || 0
      
      console.log(`✅ Fetched ${data?.length || 0} KPIs out of ${count} total for ${projectCodesArray.length} project(s)`)
      
      // ✅ ALWAYS update state (React handles unmounted components safely)
      setTotalKPICount(count)

      console.log('✅ KPITracking: Fetched', activitiesResult.data?.length || 0, 'activities,', kpisData?.length || 0, 'KPIs')
      
      // Log KPI types distribution
      if (kpisData && kpisData.length > 0) {
        const plannedCount = kpisData.filter((k: any) => k['Input Type'] === 'Planned').length
        const actualCount = kpisData.filter((k: any) => k['Input Type'] === 'Actual').length
        console.log('📊 KPI Distribution: Planned =', plannedCount, ', Actual =', actualCount)
      }
      
      // ✅ Activities already loaded in parallel fetch above
      
      // Map and process KPI data
      const mappedKPIs = (kpisData || []).map(mapKPIFromDB)
      const processedKPIs = mappedKPIs.map(processKPIRecord)
      setKpis(processedKPIs)
    } catch (error: any) {
      console.error('❌ KPITracking: Error:', error)
      setError(error.message)
      
      // ✅ Try to reconnect if connection failed
      if (error.message?.includes('connection') || error.message?.includes('network')) {
        console.log('🔄 Connection error detected, attempting to reconnect...')
        const { resetClient } = await import('@/lib/simpleConnectionManager')
        resetClient()
        console.log('✅ Client reset, retrying data fetch...')
        // Retry the fetch after reset
          setTimeout(() => {
            if (isMountedRef.current) {
              fetchData(filters.project)
            }
          }, 1000)
          return
      }
    } finally {
      // ✅ ALWAYS stop loading (React handles unmounted safely)
      stopSmartLoading(setLoading)
      console.log('🟡 KPITracking: Loading finished')
    }
  }

  // ✅ Initial mount effect
  useEffect(() => {
    isMountedRef.current = true
    console.log('🟡 KPITracking: Component mounted')
    
    // Connection monitoring is handled globally by ConnectionMonitor
    
    // Get total KPI count for info display (without loading all data)
    async function getTotalCount() {
      try {
        const { count } = await supabase
          .from(TABLES.KPI)
          .select('*', { count: 'exact', head: true })
        
        // ✅ ALWAYS update state (React handles unmounted safely)
        setTotalKPICount(count || 0)
        console.log('📊 Total KPIs in database:', count)
      } catch (error) {
        console.error('❌ Error getting KPI count:', error)
      }
    }
    
    // Main data fetch with error handling
    async function fetchInitialData() {
      try {
        await getTotalCount()
        await fetchData() // Fetch projects/activities/KPIs - has its own finally block
      } catch (error) {
        console.error('❌ Error in KPI initial load:', error)
      } finally {
        // ✅ ALWAYS ensure loading stops (backup if fetchData fails early)
        setLoading(false)
      }
    }
    
    fetchInitialData()
    
    return () => {
      console.log('🔴 KPITracking: Component unmounting - cleanup')
      isMountedRef.current = false
      // Connection monitoring is handled globally
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Run only once on mount

  const handleCreateKPI = async (kpiData: any) => {
    try {
      console.log('========================================')
      console.log('✨ Creating KPI:', kpiData)
      console.log('========================================')
      
      // 🎯 Use UNIFIED table for all KPIs (both Planned & Actual)
      console.log('🎯 Inserting into MAIN KPI table')
      
      // Map to database format (WITH Input Type in unified table)
      const dbData = {
        'Project Full Code': kpiData.project_full_code,
        'Project Code': kpiData.project_code || '',
        'Project Sub Code': kpiData.project_sub_code || '',
        'Activity Name': kpiData.activity_name,
        'Quantity': kpiData.quantity?.toString(),
        'Input Type': kpiData.input_type || 'Planned', // ✅ Required in unified table
        'Target Date': kpiData.target_date || '',
        'Actual Date': kpiData.actual_date || '',
        'Activity Date': kpiData.activity_date || kpiData.target_date || kpiData.actual_date || '',
        'Unit': kpiData.unit || '',
        'Section': kpiData.section || '',
        'Drilled Meters': kpiData.drilled_meters?.toString() || '0'
      }

      console.log('📦 Database format:', dbData)

      const { data, error } = await supabase
        .from(TABLES.KPI)
        .insert([dbData] as any)
        .select()
        .single()

      if (error) {
        console.error('Create error:', error)
        throw error
      }
      
      console.log('Created data:', data)
      
      // 🔄 AUTO-SYNC: If this is Actual, update BOQ
      if (kpiData.input_type === 'Actual') {
        console.log('🔄 Auto-syncing BOQ from KPI Actual...')
        const { syncBOQFromKPI } = await import('@/lib/boqKpiSync')
        const syncResult = await syncBOQFromKPI(
          kpiData.project_full_code,
          kpiData.activity_name
        )
        console.log('Sync result:', syncResult)
      }
      
      // Refresh data to show new record (reload with current project filter)
      setShowForm(false)
      fetchData(filters.project)
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
      console.log('========================================')
      
      // 🎯 Use UNIFIED table for all KPIs (both Planned & Actual)
      console.log('🎯 Inserting into MAIN KPI table')
      
      // Map to database format (WITH Input Type in unified table)
      const dbData = {
        'Project Full Code': kpiData.project_full_code || '',
        'Project Code': kpiData.project_code || '',
        'Project Sub Code': kpiData.project_sub_code || '',
        'Activity Name': kpiData.activity_name || '',
        'Quantity': kpiData.quantity?.toString() || '0',
        'Input Type': kpiData.input_type || 'Planned', // ✅ Required in unified table
        'Target Date': kpiData.target_date || '',
        'Actual Date': kpiData.actual_date || '',
        'Activity Date': kpiData.activity_date || kpiData.target_date || kpiData.actual_date || '',
        'Unit': kpiData.unit || '',
        'Section': kpiData.section || '',
        'Drilled Meters': kpiData.drilled_meters?.toString() || '0'
      }

      console.log('📦 Database Format:', JSON.stringify(dbData, null, 2))

      // Perform the update
      const { data, error } = await (supabase as any)
        .from(TABLES.KPI)
        .update(dbData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('❌ UPDATE ERROR:', error)
        throw error
      }
      
      console.log('✅ UPDATE SUCCESS!')
      console.log('Updated Data:', data)
      
      // 🔄 AUTO-SYNC: If this is Actual, update BOQ
      if (kpiData.input_type === 'Actual') {
        console.log('🔄 Auto-syncing BOQ from KPI Actual...')
        const { syncBOQFromKPI } = await import('@/lib/boqKpiSync')
        const syncResult = await syncBOQFromKPI(
          kpiData.project_full_code,
          kpiData.activity_name
        )
        console.log('✅ BOQ Sync Result:', syncResult)
        if (syncResult.success) {
          console.log(`📊 BOQ Actual updated to: ${syncResult.updatedBOQActual}`)
        }
      }
      
      console.log('========================================')
      
      // Close form and refresh
      setEditingKPI(null)
      
      // Refresh data to ensure consistency (reload with current project filter)
      await fetchData(filters.project)
      
      console.log('✅ DATA REFRESHED')
      
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
      
      setKpis(kpis.filter(k => k.id !== id))
      
      // 🔄 AUTO-SYNC: If this was Actual, update BOQ
      if (kpiToDelete && kpiToDelete.input_type === 'Actual') {
        console.log('🔄 Syncing BOQ after KPI deletion...')
        const { syncBOQFromKPI } = await import('@/lib/boqKpiSync')
        await syncBOQFromKPI(
          kpiToDelete.project_full_code,
          kpiToDelete.activity_name
        )
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
      await fetchData(filters.project)
      
      // Show success message
      alert(`✅ Successfully deleted ${count || ids.length} KPI(s)`)
      
    } catch (error: any) {
      console.error('❌ Bulk delete failed:', error)
      setError(`Failed to delete KPIs: ${error.message}`)
      alert(`Failed to delete KPIs: ${error.message}`)
    }
  }

  // Get filtered KPIs using Smart Filters
  // (Moved to useEffect to avoid logging on every render)
  
  const filteredKPIs = kpis.filter(kpi => {
    // Multi-Project filter (Smart Filter)
    if (selectedProjects.length > 0) {
      const matchesProject = selectedProjects.some(projectCode => 
        kpi.project_full_code === projectCode ||
        kpi.project_full_code?.includes(projectCode)
      )
      if (!matchesProject) return false
    }
    
    // Multi-Activity filter (Smart Filter)
    if (selectedActivities.length > 0) {
      const matchesActivity = selectedActivities.some(activityName =>
        kpi.activity_name === activityName ||
        kpi.activity_name?.toLowerCase().includes(activityName.toLowerCase())
      )
      if (!matchesActivity) return false
    }
    
    // Multi-Type filter (Smart Filter)
    if (selectedTypes.length > 0) {
      if (!selectedTypes.includes(kpi.input_type)) return false
    }
    
    // Multi-Status filter (Smart Filter)
    if (selectedStatuses.length > 0) {
      const matchesStatus = selectedStatuses.some(status =>
        kpi.status?.toLowerCase() === status.toLowerCase()
      )
      if (!matchesStatus) return false
    }
    
    // Legacy filter support (fallback for backward compatibility)
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      const project = projects.find(p => p.project_code === kpi.project_full_code)
      const matchesSearch = 
        (kpi.activity_name || '').toLowerCase().includes(searchLower) ||
        (project?.project_name || '').toLowerCase().includes(searchLower) ||
        (project?.project_code || '').toLowerCase().includes(searchLower) ||
        (kpi.project_full_code || '').toLowerCase().includes(searchLower) ||
        (kpi.section || '').toLowerCase().includes(searchLower)
      if (!matchesSearch) return false
    }
    
    // Legacy project filter
    if (filters.project && selectedProjects.length === 0) {
      const matchesProject = 
        kpi.project_full_code === filters.project ||
        kpi.project_full_code?.includes(filters.project)
      if (!matchesProject) return false
    }
    
    // Legacy status filter
    if (filters.status && selectedStatuses.length === 0) {
      if (kpi.status !== filters.status) return false
    }
    
    // Legacy type filter
    if (filters.type && selectedTypes.length === 0) {
      if (kpi.input_type !== filters.type) return false
    }
    
    // Date range filter
    if (filters.dateFrom) {
      const kpiDate = new Date(kpi.target_date)
      const fromDate = new Date(filters.dateFrom)
      if (kpiDate < fromDate) return false
    }
    
    if (filters.dateTo) {
      const kpiDate = new Date(kpi.target_date)
      const toDate = new Date(filters.dateTo)
      if (kpiDate > toDate) return false
    }
    
    return true
  })

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
  const achievementRate = plannedCount > 0 ? (actualCount / plannedCount) * 100 : 0
  
  // Total quantities
  const totalPlannedQty = plannedKPIs.reduce((sum: number, k: ProcessedKPI) => sum + k.quantity, 0)
  const totalActualQty = actualKPIs.reduce((sum: number, k: ProcessedKPI) => sum + k.quantity, 0)
  
  // Quality statistics
  const excellentKPIs = filteredKPIs.filter(k => k.status === 'excellent').length
  const goodKPIs = filteredKPIs.filter(k => k.status === 'good').length

  // Don't show full-page loading spinner - show skeleton instead
  const isInitialLoad = loading && kpis.length === 0

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
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
        <Button onClick={() => setShowForm(true)} className="flex items-center space-x-2 ">
          <Plus className="h-4 w-4" />
          <span>Add New KPI</span>
        </Button>
      </div>
      
      {/* Smart Filter */}
      <SmartFilter
        projects={projects.map(p => ({ 
          project_code: p.project_code, 
          project_name: p.project_name 
        }))}
        activities={activities.map(a => ({
          activity_name: a.activity_name,
          project_code: a.project_code
        }))}
        selectedProjects={selectedProjects}
        selectedActivities={selectedActivities}
        selectedTypes={selectedTypes}
        selectedStatuses={selectedStatuses}
        onProjectsChange={(projectCodes) => {
          setSelectedProjects(projectCodes)
          setCurrentPage(1) // Reset to page 1
          
          // Auto-fetch KPIs for ALL selected projects
          if (projectCodes.length > 0) {
            console.log(`🔄 Loading KPIs for ${projectCodes.length} project(s)...`)
            fetchData(projectCodes) // Pass all project codes!
          } else {
            // Clear KPIs when no project selected
            console.log('🔄 No projects selected, clearing KPIs...')
            setKpis([])
          }
        }}
        onActivitiesChange={setSelectedActivities}
        onTypesChange={setSelectedTypes}
        onStatusesChange={setSelectedStatuses}
        onClearAll={() => {
          console.log('🔄 Clearing all filters...')
          setSelectedProjects([])
          setSelectedActivities([])
          setSelectedTypes([])
          setSelectedStatuses([])
          setKpis([]) // Clear KPIs too
          setCurrentPage(1)
        }}
      />

      {error && (
        <Alert variant="error">
          {error}
        </Alert>
      )}
      
      
      {/* Info about loaded records */}
      {filters.project && totalKPICount > 0 && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-gray-700 dark:text-gray-300">
              <p className="font-semibold text-green-900 dark:text-green-100 mb-1">
                ✅ Project KPIs Loaded
              </p>
              <p>
                Loaded <strong>{kpis.length.toLocaleString()}</strong> KPI records for project <strong>{filters.project}</strong>.
                {filteredKPIs.length !== kpis.length && ` Showing ${filteredKPIs.length.toLocaleString()} after additional filtering.`}
                {` Displaying ${itemsPerPage} records per page.`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* KPI Statistics - Show if KPIs are loaded */}
      {kpis.length > 0 && (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 border-purple-200 dark:border-purple-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 dark:text-purple-300">Total Records</p>
                <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">{totalKPIs}</p>
              </div>
              <BarChart3 className="h-10 w-10 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 border-blue-200 dark:border-blue-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-300">🎯 Planned Targets</p>
                <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{plannedCount}</p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  {totalPlannedQty.toLocaleString()} total qty
                </p>
              </div>
              <Target className="h-10 w-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 border-green-200 dark:border-green-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-300">✓ Actual Achieved</p>
                <p className="text-3xl font-bold text-green-900 dark:text-green-100">{actualCount}</p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  {totalActualQty.toLocaleString()} total qty
                </p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900 dark:to-orange-800 border-orange-200 dark:border-orange-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600 dark:text-orange-300">Achievement Rate</p>
                <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">
                  {achievementRate.toFixed(1)}%
                </p>
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                  {actualCount} / {plannedCount}
                </p>
              </div>
              <div className="relative w-10 h-10">
                <svg className="transform -rotate-90 w-10 h-10">
                  <circle
                    cx="20"
                    cy="20"
                    r="16"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="transparent"
                    className="text-orange-200 dark:text-orange-950"
                  />
                  <circle
                    cx="20"
                    cy="20"
                    r="16"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="transparent"
                    strokeDasharray={`${achievementRate} 100`}
                    className="text-orange-500"
                  />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      )}

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
          <ImprovedKPITable
            kpis={paginatedKPIs}
            projects={projects}
            onEdit={setEditingKPI}
            onDelete={handleDeleteKPI}
            onBulkDelete={handleBulkDeleteKPI}
          />
          
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
          kpi={null}
          projects={projects}
          activities={activities}
          onSubmit={handleCreateKPI}
          onCancel={() => setShowForm(false)}
        />
      )}

      {editingKPI && (
        <IntelligentKPIForm
          kpi={editingKPI}
          projects={projects}
          activities={activities}
          onSubmit={async (data: any) => {
            console.log('📝 Form onSubmit called with:', data)
            await handleUpdateKPI(editingKPI.id, data)
          }}
          onCancel={() => {
            console.log('❌ Form cancelled')
            setEditingKPI(null)
          }}
        />
      )}
    </div>
  )
}
