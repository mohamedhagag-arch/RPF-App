'use client'

import { useEffect, useState, useRef } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { getSupabaseClient, executeQuery } from '@/lib/simpleConnectionManager'
import { useSmartLoading } from '@/lib/smartLoadingManager'
import { BOQActivity, Project, TABLES } from '@/lib/supabase'
import { mapBOQFromDB, mapProjectFromDB, mapKPIFromDB } from '@/lib/dataMappers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Alert } from '@/components/ui/Alert'
import { IntelligentBOQForm } from './IntelligentBOQForm'
import { BOQTable } from './BOQTable'
import { UnifiedFilter, FilterState } from '@/components/ui/UnifiedFilter'
import { Pagination } from '@/components/ui/Pagination'
import { SmartFilter } from '@/components/ui/SmartFilter'
import { Plus, ClipboardList, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { ExportButton } from '@/components/ui/ExportButton'
import { ImportButton } from '@/components/ui/ImportButton'
import { PrintButton } from '@/components/ui/PrintButton'

interface BOQManagementProps {
  globalSearchTerm?: string
  globalFilters?: {
    project: string
    status: string
    division: string
    dateRange: string
  }
}

export function BOQManagement({ globalSearchTerm = '', globalFilters = { project: '', status: '', division: '', dateRange: '' } }: BOQManagementProps = {}) {
  const guard = usePermissionGuard()
  const [activities, setActivities] = useState<BOQActivity[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [projects, setProjects] = useState<Project[]>([])
  const [allKPIs, setAllKPIs] = useState<any[]>([]) // Store all KPIs to pass to sub-components
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingActivity, setEditingActivity] = useState<BOQActivity | null>(null)
  const [filters, setFilters] = useState<FilterState>({})
  
  // Smart Filter State
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])
  const [selectedActivities, setSelectedActivities] = useState<string[]>([])
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(2) // 2 items per page for better performance
  
  const supabase = getSupabaseClient()
  const isMountedRef = useRef(true) // ✅ Track if component is mounted
  const { startSmartLoading, stopSmartLoading } = useSmartLoading('boq') // ✅ Smart loading

  // Handle unified filter changes  
  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters)
  }
  
  // Custom filters for BOQ
  const customBOQFilters = [
    {
      key: 'division',
      label: 'Division',
      type: 'select' as const,
      options: Array.from(new Set(activities.map(a => a.activity_division).filter(Boolean))).map(div => ({
        value: div,
        label: div
      }))
    },
    {
      key: 'completion',
      label: 'Completion',
      type: 'select' as const,
      options: [
        { value: 'completed', label: 'Completed' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'not_started', label: 'Not Started' }
      ]
    }
  ]

  const fetchData = async (page: number = 1) => {
    if (!isMountedRef.current) return
    
    try {
      startSmartLoading(setLoading)
      console.log(`📄 BOQManagement: Fetching activities (page ${page})...`)
      
      // Calculate range for pagination
      const from = (page - 1) * itemsPerPage
      const to = from + itemsPerPage - 1
      
      // ✅ تحميل متوازي مع timeout أطول
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('BOQ fetch timeout')), 60000)
      )
      
      // ✅ Simple query - fetch all fields to avoid column name issues
      let activitiesQuery = supabase
        .from(TABLES.BOQ_ACTIVITIES)
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)
      
      // ✅ تحسين: تطبيق جميع الفلاتر
      if (selectedProjects.length > 0) {
        activitiesQuery = activitiesQuery.in('"Project Code"', selectedProjects)
      }
      
      // ✅ إضافة فلترة على Activities
      if (selectedActivities.length > 0) {
        activitiesQuery = activitiesQuery.in('"Activity"', selectedActivities)
      }
      
      // ✅ إضافة فلترة على Types (Activity Division)
      if (selectedTypes.length > 0) {
        activitiesQuery = activitiesQuery.in('"Activity Division"', selectedTypes)
      }
      
      // ✅ إضافة فلترة على Status (إذا كان هناك حقل مناسب)
      if (selectedStatuses.length > 0) {
        // يمكن إضافة فلترة على حقل Status إذا كان موجوداً
        // activitiesQuery = activitiesQuery.in('"Status"', selectedStatuses)
      }
      
      // ✅ إذا لم يتم اختيار أي فلتر، اعرض سجلات محدودة
      if (selectedProjects.length === 0 && selectedActivities.length === 0 && selectedTypes.length === 0) {
        activitiesQuery = activitiesQuery.limit(50) // زيادة من 10 إلى 50
      }
      
      const { data: activitiesData, error: activitiesError, count } = await Promise.race([
        activitiesQuery,
        timeoutPromise
      ]) as any

      // ✅ ALWAYS update state (React handles unmounted safely)

      if (activitiesError) throw activitiesError

      console.log(`✅ BOQManagement: Fetched ${activitiesData?.length || 0} activities (page ${page})`)
      
      const mappedActivities = (activitiesData || []).map(mapBOQFromDB)
      setActivities(mappedActivities)
      setTotalCount(count || 0)
      
      // Skip KPI loading for now to improve performance
      console.log('⏭️ Skipping KPI loading for better performance')
      setAllKPIs([])
      
      console.log('✅ BOQManagement: Page data loaded successfully!')
    } catch (error: any) {
      console.error('❌ BOQManagement: Error:', error)
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
            fetchData(page)
          }
        }, 1000)
        return
      }
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  useEffect(() => {
    isMountedRef.current = true
    console.log('🟡 BOQ: Component mounted')
    
    // Connection monitoring is handled by simpleConnectionManager
    
    // ✅ Initial load: Only fetch projects list (lightweight)
    const fetchInitialData = async () => {
      try {
        startSmartLoading(setLoading)
        console.log('🟡 BOQ: Fetching initial data (projects list only)...')
        
        const { data: projectsData, error: projectsError } = await executeQuery(async () =>
          supabase
            .from(TABLES.PROJECTS)
            .select('*')
            .limit(10) // Limit initial projects load
        )
        
        // ✅ ALWAYS update state (React handles unmounted safely)
        
        if (projectsError) {
          console.error('❌ Supabase Error fetching projects:', projectsError)
          setError(`Failed to load projects: ${projectsError.message || 'Unknown error'}`)
          return
        }
        
        if (projectsData && Array.isArray(projectsData)) {
          const mappedProjects = projectsData.map(mapProjectFromDB)
          setProjects(mappedProjects)
          console.log('✅ BOQ: Projects list loaded -', mappedProjects.length, 'projects')
          console.log('💡 Use Smart Filter to load BOQ activities')
        }
      } catch (error: any) {
        console.error('❌ Exception in BOQ initial load:', error)
        setError(error.message || 'Failed to load initial data')
      } finally {
        // ✅ ALWAYS stop loading (React handles unmounted safely)
        stopSmartLoading(setLoading)
      }
    }
    
    fetchInitialData()
    
    // Cleanup to prevent memory leaks and hanging
    return () => {
      console.log('🔴 BOQ: Cleanup - component unmounting')
      isMountedRef.current = false
      // Connection monitoring is handled globally
    }
  }, []) // Run ONCE only!
  
  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCreateActivity = async (activityData: any) => {
    try {
      setShowForm(false)
      console.log('========================================')
      console.log('🆕 CREATE BOQ ACTIVITY STARTED')
      console.log('Form Data:', activityData)
      console.log('========================================')
      
      // Map to database format - Use BOTH old (Column 44/45) and new column names
      const dbData = {
        'Project Code': activityData.project_code || '',
        'Project Sub Code': activityData.project_sub_code || '',
        'Project Full Code': activityData.project_full_code || activityData.project_code || '',
        'Activity': activityData.activity_name || '', // Column is "Activity" not "Activity Name"
        'Activity Division': activityData.activity_division || activityData.zone_ref || '',
        'Unit': activityData.unit || '',
        'Zone Ref': activityData.zone_ref || activityData.activity_division || '',
        
        // ✅ Use BOTH old and new column names for compatibility
        'Planned Units': activityData.planned_units?.toString() || '0',
        'Deadline': activityData.deadline || '',
        
        'Total Units': activityData.total_units?.toString() || '0',
        'Actual Units': activityData.actual_units?.toString() || '0',
        'Total Value': activityData.planned_value?.toString() || '0',
        'Planned Value': activityData.planned_value?.toString() || '0',
        'Planned Activity Start Date': activityData.planned_activity_start_date || '',
        'Total Drilling Meters': activityData.total_drilling_meters?.toString() || '0',
        'Calendar Duration': activityData.calendar_duration?.toString() || '0',
        'Project Full Name': activityData.project_full_name || '',
        'Project Status': activityData.project_status || 'active'
      }

      console.log('📦 Database Format:', JSON.stringify(dbData, null, 2))

      const { data, error } = await supabase
        .from(TABLES.BOQ_ACTIVITIES)
        .insert([dbData] as any)
        .select()
        .single()

      if (error) {
        console.error('❌ CREATE ERROR:', error)
        throw error
      }
      
      console.log('✅ CREATE SUCCESS!')
      console.log('Created Data:', data)
      console.log('📊 Verify Planned Units:', data?.['Planned Units'])
      console.log('📊 Verify Deadline:', data?.['Deadline'])
      
      // Close form and refresh
      setShowForm(false)
      await fetchData()
      
      console.log('✅ DATA REFRESHED')
      
    } catch (error: any) {
      console.error('❌ CREATE FAILED:', error)
      setError(`Create failed: ${error.message}`)
      alert(`Failed to create activity: ${error.message}`)
    }
  }

  const handleUpdateActivity = async (id: string, activityData: any) => {
    try {
      console.log('========================================')
      console.log('🔄 UPDATE BOQ ACTIVITY STARTED')
      console.log('ID:', id)
      console.log('Form Data:', activityData)
      console.log('========================================')
      
      // Map to database format - Use BOTH old (Column 44/45) and new column names
      const dbData = {
        'Project Code': activityData.project_code || '',
        'Project Sub Code': activityData.project_sub_code || '',
        'Project Full Code': activityData.project_full_code || activityData.project_code || '',
        'Activity': activityData.activity_name || '', // Column is "Activity" not "Activity Name"
        'Activity Division': activityData.activity_division || activityData.zone_ref || '',
        'Unit': activityData.unit || '',
        'Zone Ref': activityData.zone_ref || activityData.activity_division || '',
        
        // ✅ Use BOTH old and new column names for compatibility
        'Planned Units': activityData.planned_units?.toString() || '0',
        'Deadline': activityData.deadline || '',
        
        'Total Units': activityData.total_units?.toString() || '0',
        'Actual Units': activityData.actual_units?.toString() || '0',
        'Total Value': activityData.planned_value?.toString() || '0',
        'Planned Value': activityData.planned_value?.toString() || '0',
        'Planned Activity Start Date': activityData.planned_activity_start_date || '',
        'Total Drilling Meters': activityData.total_drilling_meters?.toString() || '0',
        'Calendar Duration': activityData.calendar_duration?.toString() || '0',
        'Project Full Name': activityData.project_full_name || '',
        'Project Status': activityData.project_status || 'active'
      }

      console.log('📦 Database Format:', JSON.stringify(dbData, null, 2))

      const { data, error } = await (supabase as any)
        .from(TABLES.BOQ_ACTIVITIES)
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
      console.log('========================================')
      
      // Close form and refresh
      setEditingActivity(null)
      await fetchData()
      
      console.log('✅ DATA REFRESHED')
      
    } catch (error: any) {
      console.error('❌ UPDATE FAILED:', error)
      setError(`Update failed: ${error.message}`)
      alert(`Failed to update activity: ${error.message}`)
    }
  }

  const handleDeleteActivity = async (id: string) => {
    // Find the activity to get its details for KPI deletion
    const activityToDelete = activities.find(a => a.id === id)
    
    if (!activityToDelete) {
      setError('Activity not found')
      return
    }
    
    if (!confirm(`Are you sure you want to delete this activity?\n\nThis will also delete all associated KPIs (Planned).`)) return

    try {
      console.log('========================================')
      console.log('🗑️ DELETE BOQ ACTIVITY STARTED')
      console.log('  - Activity ID:', id)
      console.log('  - Activity Name:', activityToDelete.activity_name)
      console.log('  - Project Full Code:', activityToDelete.project_full_code)
      console.log('========================================')
      
      // Step 1: Delete associated KPIs first
      console.log('🗑️ Step 1: Deleting associated KPIs...')
      const { data: kpiDeleteData, error: kpiError, count: kpiCount } = await supabase
        .from(TABLES.KPI)
        .delete({ count: 'exact' })
        .eq('Project Full Code', activityToDelete.project_full_code || activityToDelete.project_code)
        .eq('Activity Name', activityToDelete.activity_name)
        .eq('Input Type', 'Planned')
      
      if (kpiError) {
        console.error('❌ Error deleting KPIs:', kpiError)
        throw new Error(`Failed to delete associated KPIs: ${kpiError.message}`)
      }
      
      console.log(`✅ Deleted ${kpiCount || 0} associated KPIs`)
      
      // Step 2: Delete the BOQ activity
      console.log('🗑️ Step 2: Deleting BOQ activity...')
      const { error: boqError } = await supabase
        .from(TABLES.BOQ_ACTIVITIES)
        .delete()
        .eq('id', id)

      if (boqError) {
        console.error('❌ Error deleting BOQ activity:', boqError)
        throw boqError
      }
      
      console.log('✅ BOQ activity deleted successfully')
      console.log('========================================')
      console.log('✅ DELETE COMPLETE!')
      console.log(`  - Deleted activity: ${activityToDelete.activity_name}`)
      console.log(`  - Deleted ${kpiCount || 0} associated KPIs`)
      console.log('========================================')
      
      // Update local state
      setActivities(activities.filter(a => a.id !== id))
      
      // Show success message
      alert(`✅ Activity deleted successfully!\nDeleted ${kpiCount || 0} associated KPIs`)
      
    } catch (error: any) {
      console.error('❌ DELETE FAILED:', error)
      setError(error.message)
      alert(`Failed to delete activity: ${error.message}`)
    }
  }

  const handleBulkDeleteActivity = async (ids: string[]) => {
    if (ids.length === 0) return
    
    try {
      console.log('========================================')
      console.log('🗑️ BULK DELETE BOQ ACTIVITIES STARTED')
      console.log(`Deleting ${ids.length} activities`)
      console.log('========================================')
      
      let totalKPIsDeleted = 0
      
      // Delete each activity and its KPIs
      for (const id of ids) {
        const activityToDelete = activities.find(a => a.id === id)
        if (!activityToDelete) continue
        
        // Delete associated KPIs
        const { count: kpiCount } = await supabase
          .from(TABLES.KPI)
          .delete({ count: 'exact' })
          .eq('Project Full Code', activityToDelete.project_full_code || activityToDelete.project_code)
          .eq('Activity Name', activityToDelete.activity_name)
          .eq('Input Type', 'Planned')
        
        totalKPIsDeleted += (kpiCount || 0)
      }
      
      console.log(`🗑️ Deleted ${totalKPIsDeleted} associated KPIs`)
      
      // Delete all activities
      const { error: boqError } = await supabase
        .from(TABLES.BOQ_ACTIVITIES)
        .delete()
        .in('id', ids)
      
      if (boqError) throw boqError
      
      console.log('========================================')
      console.log('✅ BULK DELETE COMPLETE!')
      console.log(`  - Deleted ${ids.length} activities`)
      console.log(`  - Deleted ${totalKPIsDeleted} associated KPIs`)
      console.log('========================================')
      
      // Refresh data
      await fetchData()
      
      // Show success message
      alert(`✅ Successfully deleted ${ids.length} activity(ies) and ${totalKPIsDeleted} associated KPIs!`)
      
    } catch (error: any) {
      console.error('❌ BULK DELETE FAILED:', error)
      setError(error.message)
      alert(`Failed to delete activities: ${error.message}`)
    }
  }

  // ✅ تحسين: إضافة فلترة محلية إضافية
  const filteredActivities = activities.filter(activity => {
    // فلترة محلية إضافية للتأكد من دقة النتائج
    if (selectedProjects.length > 0 && !selectedProjects.includes(activity.project_code)) {
      return false
    }
    if (selectedActivities.length > 0 && !selectedActivities.includes(activity.activity_name)) {
      return false
    }
    if (selectedTypes.length > 0 && !selectedTypes.includes(activity.activity_division)) {
      return false
    }
    return true
  })
  
  // Handle import BOQ data
  const handleImportBOQ = async (importedData: any[]) => {
    try {
      console.log(`📥 Importing ${importedData.length} BOQ activities...`)
      
      // Map imported data to database format
      const activitiesToInsert = importedData.map(row => ({
        'Project Code': row['Project Code'] || row['project_code'] || '',
        'Project Sub Code': row['Project Sub Code'] || row['project_sub_code'] || '',
        'Project Full Code': row['Project Full Code'] || row['project_full_code'] || row['Project Code'] || '',
        'Activity': row['Activity'] || row['activity'] || '',
        'Activity Division': row['Activity Division'] || row['activity_division'] || '',
        'Unit': row['Unit'] || row['unit'] || '',
        'Zone Ref': row['Zone Ref'] || row['zone_ref'] || '',
        'Activity Name': row['Activity Name'] || row['activity_name'] || row['Activity'] || '',
        'Total Units': row['Total Units'] || row['total_units'] || '0',
        'Planned Units': row['Planned Units'] || row['planned_units'] || '0',
        'Actual Units': row['Actual Units'] || row['actual_units'] || '0',
        'Rate': row['Rate'] || row['rate'] || '0',
        'Total Value': row['Total Value'] || row['total_value'] || '0',
        'Planned Activity Start Date': row['Planned Activity Start Date'] || row['planned_activity_start_date'] || '',
        'Deadline': row['Deadline'] || row['deadline'] || '',
        'Calendar Duration': row['Calendar Duration'] || row['calendar_duration'] || '0'
      }))
      
      // Insert into database
      const { data, error } = await supabase
        .from(TABLES.BOQ_ACTIVITIES)
        .insert(activitiesToInsert as any)
        .select()
      
      if (error) {
        console.error('❌ Error importing BOQ activities:', error)
        throw error
      }
      
      console.log(`✅ Successfully imported ${data?.length || 0} BOQ activities`)
      
      // Refresh activities list
      await fetchData(1)
    } catch (error: any) {
      console.error('❌ Import failed:', error)
      throw new Error(`Import failed: ${error.message}`)
    }
  }

  // Prepare data for export
  const getExportData = () => {
    return filteredActivities.map(activity => ({
      'Project Code': activity.project_code,
      'Project Sub Code': activity.project_sub_code,
      'Project Full Code': activity.project_full_code,
      'Activity': activity.activity,
      'Activity Name': activity.activity_name,
      'Activity Division': activity.activity_division,
      'Unit': activity.unit,
      'Zone Ref': activity.zone_ref,
      'Total Units': activity.total_units,
      'Planned Units': activity.planned_units,
      'Actual Units': activity.actual_units,
      'Difference': activity.difference,
      'Rate': activity.rate,
      'Total Value': activity.total_value,
      'Planned Value': activity.planned_value,
      'Earned Value': activity.earned_value,
      'Activity Progress %': activity.activity_progress_percentage,
      'Planned Activity Start Date': activity.planned_activity_start_date,
      'Deadline': activity.deadline,
      'Calendar Duration': activity.calendar_duration,
      'Activity Status': activity.activity_actual_status,
      'Completed': activity.activity_completed ? 'YES' : 'NO',
      'Delayed': activity.activity_delayed ? 'YES' : 'NO',
      'On Track': activity.activity_on_track ? 'YES' : 'NO'
    }))
  }

  // Template columns for import
  const importTemplateColumns = [
    'Project Code',
    'Project Sub Code',
    'Project Full Code',
    'Activity',
    'Activity Name',
    'Activity Division',
    'Unit',
    'Zone Ref',
    'Total Units',
    'Planned Units',
    'Actual Units',
    'Rate',
    'Total Value',
    'Planned Activity Start Date',
    'Deadline',
    'Calendar Duration'
  ]

  // Calculate statistics
  const totalActivities = activities.length
  const completedActivities = activities.filter(a => a.activity_completed).length
  const delayedActivities = activities.filter(a => a.activity_delayed).length
  const onTrackActivities = activities.filter(a => a.activity_on_track).length

  // Don't show full-page loading spinner - show skeleton instead
  const isInitialLoad = loading && activities.length === 0

  return (
    <div className="space-y-6 max-w-full overflow-hidden boq-container">
      {/* Header Section */}
      <div className="space-y-6">
        {/* Title and Description */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Bill of Quantities (BOQ)</h2>
              {loading && (
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-full animate-pulse">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                  <span className="text-xs text-blue-600 dark:text-blue-400">Syncing...</span>
                </div>
              )}
            </div>
            <p className="text-gray-600 dark:text-gray-300 mt-2">Manage and track project activities and quantities</p>
          </div>
          
          {/* Add New Activity Button */}
          {guard.hasAccess('boq.create') && (
            <Button 
              onClick={() => setShowForm(true)} 
              className="flex items-center space-x-2 px-6 py-3 whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              <span>Add New Activity</span>
            </Button>
          )}
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">Data Actions:</span>
          {guard.hasAccess('boq.export') && (
            <ExportButton
              data={getExportData()}
              filename="BOQ_Activities"
              formats={['csv', 'excel']}
              label="Export"
              variant="outline"
            />
          )}
          
          <PrintButton
            label="Print"
            variant="outline"
            printTitle="BOQ Activities Report"
            printSettings={{
              fontSize: '10px',
              compactMode: true
            }}
          />
          
          {guard.hasAccess('boq.create') && (
            <ImportButton
              onImport={handleImportBOQ}
              requiredColumns={['Project Code', 'Activity Name', 'Unit']}
              templateName="BOQ_Activities"
              templateColumns={importTemplateColumns}
              label="Import"
              variant="outline"
            />
          )}
        </div>
      </div>

      {error && (
        <Alert variant="error">
          {error}
        </Alert>
      )}

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
          setCurrentPage(1)
          
          // Load activities when projects selected
          if (projectCodes.length > 0) {
            console.log(`🔄 Loading activities for ${projectCodes.length} project(s)...`)
            // Add delay to prevent rapid successive calls
            setTimeout(() => {
              if (isMountedRef.current) {
                fetchData(1) // This will load BOQ activities
              }
            }, 100)
          } else {
            console.log('🔄 No projects selected, clearing activities...')
            setActivities([])
            setAllKPIs([])
          }
        }}
        onActivitiesChange={(activities) => {
          setSelectedActivities(activities)
          setCurrentPage(1)
          setTimeout(() => {
            if (isMountedRef.current) {
              fetchData(1)
            }
          }, 100)
        }}
        onTypesChange={(types) => {
          setSelectedTypes(types)
          setCurrentPage(1)
          setTimeout(() => {
            if (isMountedRef.current) {
              fetchData(1)
            }
          }, 100)
        }}
        onStatusesChange={(statuses) => {
          setSelectedStatuses(statuses)
          setCurrentPage(1)
          setTimeout(() => {
            if (isMountedRef.current) {
              fetchData(1)
            }
          }, 100)
        }}
        onClearAll={() => {
          console.log('🔄 Clearing all BOQ filters...')
          setSelectedProjects([])
          setSelectedActivities([])
          setSelectedTypes([])
          setSelectedStatuses([])
          setActivities([])
          setAllKPIs([])
          setCurrentPage(1)
        }}
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              BOQ Activities
              <span className="text-sm font-normal text-gray-500">
                ({filteredActivities.length} activities)
              </span>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {activities.length === 0 ? (
            <div className="p-12 text-center">
              <div className="p-8 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-purple-900/20 border-2 border-blue-300 dark:border-blue-700 rounded-lg">
                <div className="flex flex-col items-center gap-4">
                  <div className="p-4 bg-blue-600 rounded-full">
                    <ClipboardList className="h-12 w-12 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-blue-900 dark:text-blue-100 mb-2">
                      🎯 Select Projects to View BOQ Activities
                    </h3>
                    <p className="text-blue-700 dark:text-blue-300 max-w-md mx-auto">
                      Use the Smart Filters above to select projects and view their BOQ activities.
                      This ensures fast loading by only fetching relevant data.
                    </p>
                  </div>
                  <div className="mt-4 px-4 py-2 bg-blue-100 dark:bg-blue-800/30 rounded-lg text-sm text-blue-800 dark:text-blue-200">
                    💡 Tip: You can select multiple projects to view all their activities!
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <BOQTable
              activities={filteredActivities}
              projects={projects}
              allKPIs={allKPIs}
              onEdit={setEditingActivity}
              onDelete={handleDeleteActivity}
              onBulkDelete={handleBulkDeleteActivity}
            />
          )}
        </CardContent>
        
        {/* Pagination */}
        {totalCount > itemsPerPage && (
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(totalCount / itemsPerPage)}
            totalItems={totalCount}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            loading={loading}
          />
        )}
      </Card>

      {showForm && (
        <IntelligentBOQForm
          activity={null}
          projects={projects}
          onSubmit={handleCreateActivity}
          onCancel={() => setShowForm(false)}
        />
      )}

      {editingActivity && (
        <IntelligentBOQForm
          activity={editingActivity}
          projects={projects}
          onSubmit={async (data: any) => {
            console.log('📝 BOQ Form onSubmit called with:', data)
            await handleUpdateActivity(editingActivity.id, data)
          }}
          onCancel={() => {
            console.log('❌ BOQ Form cancelled')
            setEditingActivity(null)
          }}
        />
      )}
    </div>
  )
}
