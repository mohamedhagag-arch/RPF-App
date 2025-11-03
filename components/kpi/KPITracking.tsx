'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { usePermissionGuard } from '@/lib/permissionGuard'
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
import { syncBOQFromKPI } from '@/lib/boqKpiSync'
import { calculateActivityProgress, ActivityProgress } from '@/lib/progressCalculator'
import { autoSaveOnKPIUpdate } from '@/lib/autoCalculationSaver'
import { UnifiedFilter, FilterState } from '@/components/ui/UnifiedFilter'
import { Pagination } from '@/components/ui/Pagination'
import { SmartFilter } from '@/components/ui/SmartFilter'
import { Plus, BarChart3, CheckCircle, Clock, AlertCircle, Target, Info, Filter, X, Coins, DollarSign } from 'lucide-react'
import { formatCurrency } from '@/lib/boqValueCalculator'
import { ExportButton } from '@/components/ui/ExportButton'
import { ImportButton } from '@/components/ui/ImportButton'
import { PrintButton } from '@/components/ui/PrintButton'

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
  const [kpis, setKpis] = useState<ProcessedKPI[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [activities, setActivities] = useState<BOQActivity[]>([])
  const [activityProgresses, setActivityProgresses] = useState<ActivityProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const isMountedRef = useRef(true) // ✅ Track if component is mounted
  const [showForm, setShowForm] = useState(false)
  const [showEnhancedForm, setShowEnhancedForm] = useState(false)
  // ✅ Standard View is always the default - Force to true on mount
  const [useCustomizedTable, setUseCustomizedTable] = useState(true)
  
  // Ensure Standard View is always the default on mount
  useEffect(() => {
    // Force Standard View on initial mount
    setUseCustomizedTable(true)
  }, [])
  // editingKPI is now handled by EnhancedKPITable
  const [filters, setFilters] = useState<FilterState>({})
  
  // Smart Filter State
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])
  const [selectedActivities, setSelectedActivities] = useState<string[]>([])
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalKPICount, setTotalKPICount] = useState(0)
  const [pendingKPICount, setPendingKPICount] = useState(0) // Count of KPIs pending approval
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

  const fetchData = async (selectedProjectCodes?: string | string[], forceRefresh = false) => {
    if (!isMountedRef.current) return
    
    try {
      startSmartLoading(setLoading)
      
      // Force refresh by clearing state first if requested
      if (forceRefresh) {
        console.log('🧹 Force refresh: Clearing state...')
        setKpis([])
        setActivities([])
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
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
        setTimeout(() => reject(new Error('KPI fetch timeout')), 60000) // زيادة إلى 60 ثانية
      )
      
      // تحميل Activities مع فلتر المشاريع المحددة
      let activitiesQuery = supabase
        .from(TABLES.BOQ_ACTIVITIES)
        .select('*')
      
      // تطبيق فلتر المشاريع على الأنشطة
      if (projectCodesArray.length === 1) {
        activitiesQuery = activitiesQuery.eq('Project Code', projectCodesArray[0])
      } else if (projectCodesArray.length > 1) {
        activitiesQuery = activitiesQuery.in('Project Code', projectCodesArray)
      }
      
      const activitiesResult = await activitiesQuery
      
      if (activitiesResult.data) {
        const mappedActivities = activitiesResult.data.map(mapBOQFromDB)
        setActivities(mappedActivities)
        console.log('✅ Loaded', mappedActivities.length, 'activities for', projectCodesArray.length, 'project(s)')
        console.log('🔍 Activities loaded:', mappedActivities.map(a => a.activity_name))
      }
      
      // تحميل KPIs للمشاريع المحددة مع تحسين
      let kpisData = null
      let count = 0
      
      // ✅ تحسين: استعلام أبسط وأسرع
      let kpiQuery = supabase
        .from(TABLES.KPI)
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(500) // تقليل الحد الأقصى لتحسين الأداء
      
      // Filter by multiple projects
      if (projectCodesArray.length === 1) {
        kpiQuery = kpiQuery.eq('Project Full Code', projectCodesArray[0])
      } else if (projectCodesArray.length > 1) {
        kpiQuery = kpiQuery.in('Project Full Code', projectCodesArray)
      }
      
      const { data, error, count: totalCount } = await Promise.race([
        kpiQuery,
        timeoutPromise
      ]) as any
      
      if (error) {
        console.error('❌ KPITracking: Error fetching KPIs:', error)
        // ✅ تحسين: معالجة أفضل للأخطاء
        if (error.message.includes('timeout')) {
          setError('Loading KPIs is taking longer than expected. Please try again or select fewer projects.')
        } else {
          setError(`Failed to load KPIs: ${error.message}`)
        }
        setKpis([])
        setTotalKPICount(0)
        return
      }
      
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
      
      // ✅ Filter: For Actual KPIs, only show approved ones (or old ones without approval status)
      // New Actual KPIs must be approved to appear in main KPI page
      // Planned KPIs always show (they don't need approval to view)
      const dateThreshold = new Date()
      dateThreshold.setDate(dateThreshold.getDate() - 90)
      
      const filteredKPIs = mappedKPIs.filter((kpi: any) => {
        // If it's Planned KPI, always show (no approval needed to view)
        if (kpi.input_type === 'Planned') return true
        
        // For Actual KPIs: Check if this is a new KPI (created in last 90 days)
        const createdAt = new Date(kpi.created_at || '2000-01-01')
        const isNewKPI = createdAt >= dateThreshold
        
        if (isNewKPI) {
          // New Actual KPIs: Only show if approved
          // ✅ IMPORTANT: Check raw row data for Approval Status (mapKPIFromDB doesn't include it)
          const rawRow = (kpisData || []).find((r: any) => r.id === kpi.id)
          if (!rawRow) {
            console.warn(`⚠️ Could not find raw row for KPI ${kpi.id} - showing anyway`)
            return true // Show if we can't find raw row
          }
          
          // Check Approval Status column from raw row
          const dbApprovalStatus = rawRow['Approval Status']
          let approvalStatusStr = ''
          if (dbApprovalStatus !== null && dbApprovalStatus !== undefined && dbApprovalStatus !== '') {
            approvalStatusStr = String(dbApprovalStatus).toLowerCase().trim()
          }
          
          // Check Notes field for approval status (fallback)
          const notes = rawRow['Notes'] || kpi.notes || ''
          const notesStr = String(notes)
          const notesHasApproved = notesStr.includes('APPROVED:') && notesStr.includes(':approved:')
          
          // Approved if Approval Status = 'approved' OR Notes contains 'APPROVED:approved:'
          const isApproved = (approvalStatusStr === 'approved') || notesHasApproved
          
          if (!isApproved) {
            console.log(`🚫 Filtering out unapproved KPI ${kpi.id} (Status: ${approvalStatusStr || 'null'}, Notes: ${notesHasApproved ? 'has approval' : 'no approval'})`)
          }
          
          return isApproved
        } else {
          // Old Actual KPIs: Show all (they were created before approval system)
          return true
        }
      })
      
      const processedKPIs = filteredKPIs.map(processKPIRecord)
      
      console.log('📊 Setting KPIs:', processedKPIs.length)
      console.log('🔍 KPI IDs:', processedKPIs.map((k: any) => k.id))
      
      setKpis(processedKPIs)
      
      // Calculate progress for all activities
      try {
        const progresses = activities.map(activity => 
          calculateActivityProgress(activity, processedKPIs)
        )
        setActivityProgresses(progresses)
        console.log('✅ Activity progress calculated successfully')
      } catch (progressError) {
        console.log('⚠️ Progress calculation not available:', progressError)
      }
      
      // Verify KPIs were set
      setTimeout(() => {
        console.log('🔍 Verification: KPIs set successfully, count:', processedKPIs.length)
      }, 100)
      
      // Fetch pending KPIs count
      fetchPendingKPICount()
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
    
    // ✅ الاستماع للتحديثات من Database Management
    const handleDatabaseUpdate = (event: CustomEvent) => {
      const { tableName } = event.detail
      console.log(`🔔 KPI: Database updated event received for ${tableName}`)
      
      // إعادة تحميل البيانات إذا كان الجدول ذو صلة
      if (tableName === TABLES.KPI) {
        console.log(`🔄 KPI: Reloading KPIs due to ${tableName} update...`)
        fetchPendingKPICount() // Update pending count
        if (selectedProjects.length > 0) {
          fetchData(selectedProjects)
        } else {
          getTotalCount()
        }
      } else if (tableName === TABLES.PROJECTS || tableName === TABLES.BOQ_ACTIVITIES) {
        console.log(`🔄 KPI: Reloading related data due to ${tableName} update...`)
        fetchData(filters.project)
      }
    }
    
    window.addEventListener('database-updated', handleDatabaseUpdate as EventListener)
    console.log('👂 KPI: Listening for database updates')
    
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
        await fetchPendingKPICount() // Fetch pending KPIs count
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
      window.removeEventListener('database-updated', handleDatabaseUpdate as EventListener)
      console.log('👋 KPI: Stopped listening for database updates')
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
      
      // 🔄 AUTO-SYNC: If this is Actual, update BOQ
      if (kpiData['Input Type'] === 'Actual' || kpiData.input_type === 'Actual') {
        console.log('🔄 Auto-syncing BOQ from KPI Actual...')
        const { syncBOQFromKPI } = await import('@/lib/boqKpiSync')
        const syncResult = await syncBOQFromKPI(
          kpiData['Project Full Code'] || kpiData.project_full_code,
          kpiData['Activity Name'] || kpiData.activity_name
        )
        console.log('Sync result:', syncResult)
      }
      
      // Refresh data to show new record (reload with current project filter)
      setShowForm(false)
      
      // Force refresh by clearing state first
      setKpis([])
      setActivities([])
      
      // Wait a bit for state to clear
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Then fetch fresh data
      await fetchData(filters.project)
      console.log('✅ DATA REFRESHED AFTER CREATE')
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
      const dbData = {
        'Project Full Code': kpiData['Project Full Code'] || kpiData.project_full_code || '',
        'Project Code': kpiData['Project Code'] || kpiData.project_code || '',
        'Project Sub Code': kpiData['Project Sub Code'] || kpiData.project_sub_code || '',
        'Activity Name': kpiData['Activity Name'] || kpiData.activity_name || '',
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
      
      // Verify the update was successful
      if (!data) {
        console.error('❌ UPDATE FAILED: No data returned from update!')
        throw new Error('Update failed: No data returned')
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
      
      // 🔄 AUTO-SYNC: If this is Actual, update BOQ
      if (kpiData.input_type === 'Actual') {
        console.log('🔄 Auto-syncing BOQ from KPI Actual...')
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
      
      // Close form and refresh (editingKPI is now handled by EnhancedKPITable)
      
      // Refresh data to ensure consistency (reload with current project filter)
      console.log('🔄 Refreshing data after update...')
      console.log('Current filters.project:', filters.project)
      
      try {
        // Force refresh by clearing state first
        console.log('🧹 Clearing KPI and Activities state...')
        setKpis([])
        setActivities([])
        
        // Wait a bit for state to clear
        await new Promise(resolve => setTimeout(resolve, 200))
        
        // Then fetch fresh data
        console.log('🔄 Fetching fresh data after update...')
        console.log('🔍 Current project filter:', filters.project)
        
        // Force a complete refresh - use selectedProjects if available, otherwise filters.project
        const projectToFetch = selectedProjects.length > 0 ? selectedProjects : filters.project
        console.log('🔍 Current selectedProjects:', selectedProjects)
        console.log('🔍 Current filters.project:', filters.project)
        console.log('🔍 Using project filter:', projectToFetch)
        await fetchData(projectToFetch, true) // forceRefresh = true
        console.log('✅ DATA REFRESHED SUCCESSFULLY')
        
        // Verify that the updated KPI is in the refreshed data
        console.log('🔍 Verifying updated KPI is in refreshed data...')
        const updatedKPI = kpis.find(k => k.id === id)
        if (updatedKPI) {
          console.log('✅ Updated KPI found in refreshed data:', updatedKPI)
        } else {
          console.error('❌ Updated KPI NOT found in refreshed data!')
          console.log('Available KPI IDs:', kpis.map(k => k.id))
        }
      
      // Double-check by fetching again after a short delay
      setTimeout(async () => {
        console.log('🔄 Double-checking data after update...')
        try {
          const projectToFetch = selectedProjects.length > 0 ? selectedProjects : filters.project
          await fetchData(projectToFetch, true) // forceRefresh = true
          console.log('✅ Double-check completed')
        } catch (doubleCheckError) {
          console.error('❌ Double-check failed:', doubleCheckError)
        }
      }, 1000)
        
        // Additional verification - check if KPIs are loaded
        setTimeout(() => {
          console.log('🔍 Verification: Current KPIs count:', kpis.length)
          if (kpis.length === 0) {
            console.log('⚠️ WARNING: No KPIs found after refresh!')
            console.log('🔄 Attempting manual refresh...')
            // Try one more fetch before reloading
            fetchData(filters.project).then(() => {
              console.log('🔄 Manual fetch completed')
            }).catch(() => {
              console.log('🔄 Manual fetch failed, reloading page...')
              window.location.reload()
            })
          } else {
            console.log('✅ KPIs loaded successfully after update!')
          }
        }, 500)
        
      } catch (refreshError) {
        console.error('❌ Failed to refresh data:', refreshError)
        // Try to reload the page as fallback
        console.log('🔄 Falling back to page reload...')
        window.location.reload()
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
      
      // Update local state immediately
      setKpis(kpis.filter(k => k.id !== id))
      
      // 🔄 AUTO-SYNC: If this was Actual, update BOQ
      if (kpiToDelete && kpiToDelete.input_type === 'Actual') {
        console.log('🔄 Syncing BOQ after KPI deletion...')
        console.log('⚠️ WARNING: This will update BOQ Actual Units to 0 if no other KPI Actual records exist')
        
        try {
          const { syncBOQFromKPI } = await import('@/lib/boqKpiSync')
          const syncResult = await syncBOQFromKPI(
            kpiToDelete.project_full_code,
            kpiToDelete.activity_name
          )
          console.log('✅ BOQ Sync Result:', syncResult)
        } catch (syncError) {
          console.error('❌ BOQ Sync failed:', syncError)
          // Don't fail the entire delete operation if sync fails
        }
      }
      
      // Force refresh to ensure data consistency
      console.log('🔄 Refreshing data after deletion...')
      console.log('⚠️ IMPORTANT: This should NOT delete the BOQ activity, only refresh KPI data')
      
      try {
        await fetchData(filters.project)
        console.log('✅ DATA REFRESHED AFTER DELETE')
        console.log('🔍 Check if BOQ activity still exists in the activities list')
      } catch (refreshError) {
        console.error('❌ Failed to refresh data after delete:', refreshError)
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
  
  // Total quantities
  const totalPlannedQty = plannedKPIs.reduce((sum: number, k: ProcessedKPI) => sum + k.quantity, 0)
  const totalActualQty = actualKPIs.reduce((sum: number, k: ProcessedKPI) => sum + k.quantity, 0)
  
  // ✅ FIXED: Calculate Planned Value = Rate × Quantity for each Planned KPI
  const totalPlannedValue = plannedKPIs.reduce((sum: number, k: ProcessedKPI) => {
    // Find the related activity to get the rate
    const relatedActivity = activities.find((a: BOQActivity) => 
      a.activity_name === k.activity_name &&
      (a.project_code === k.project_full_code || a.project_full_code === k.project_full_code)
    )
    
    // Calculate rate directly from activity
    let rate = 0
    if (relatedActivity) {
      if (relatedActivity.rate && relatedActivity.rate > 0) {
        rate = relatedActivity.rate
      } else if (relatedActivity.total_value && relatedActivity.total_units && relatedActivity.total_units > 0) {
        rate = relatedActivity.total_value / relatedActivity.total_units
      }
    }
    
    // If we have a rate, calculate value = rate × quantity
    if (rate > 0) {
      const kpiValue = rate * k.quantity
      return sum + kpiValue
    }
    
    // Fallback: use existing value if rate not found
    return sum + (k.planned_value ?? (k.input_type === 'Planned' ? k.value ?? 0 : 0))
  }, 0)
  
  // ✅ FIXED: Calculate Actual Value = Rate × Quantity for each Actual KPI
  const totalActualValue = actualKPIs.reduce((sum: number, k: ProcessedKPI) => {
    // Find the related activity to get the rate
    const relatedActivity = activities.find((a: BOQActivity) => 
      a.activity_name === k.activity_name &&
      (a.project_code === k.project_full_code || a.project_full_code === k.project_full_code)
    )
    
    // Calculate rate directly from activity
    let rate = 0
    if (relatedActivity) {
      if (relatedActivity.rate && relatedActivity.rate > 0) {
        rate = relatedActivity.rate
      } else if (relatedActivity.total_value && relatedActivity.total_units && relatedActivity.total_units > 0) {
        rate = relatedActivity.total_value / relatedActivity.total_units
      }
    }
    
    // If we have a rate, calculate value = rate × quantity
    if (rate > 0) {
      const kpiValue = rate * k.quantity
      return sum + kpiValue
    }
    
    // Fallback: use existing value if rate not found
    return sum + (k.actual_value ?? (k.input_type === 'Actual' ? k.value ?? 0 : 0))
  }, 0)
  const valueAchievementRate = totalPlannedValue > 0 ? (totalActualValue / totalPlannedValue) * 100 : 0
  const achievementRate = totalPlannedValue > 0 ? valueAchievementRate : 0
  
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
                    <Button 
                      onClick={() => setUseCustomizedTable(!useCustomizedTable)}
                      variant="outline"
                      className="flex items-center space-x-2 px-6 py-3 whitespace-nowrap"
                    >
                      <Filter className="h-4 w-4" />
                      <span>{useCustomizedTable ? 'Standard View' : 'Customize Columns'}</span>
                    </Button>
                  </div>
                )}
                
                {/* Need to Submit Button - Show for admin or users with kpi.view permission - Outside kpi.create condition */}
                {(guard.isAdmin() || guard.hasAccess('kpi.view') || guard.hasAccess('kpi.approve')) && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button 
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
                    </Button>
                  </div>
                )}
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">Data Actions:</span>
          {guard.hasAccess('kpi.export') && filteredKPIs.length > 0 && (
            <ExportButton
              data={getExportData()}
              filename="KPI_Records"
              formats={['csv', 'excel']}
              label="Export"
              variant="outline"
            />
          )}
          
          <PrintButton
            label="Print"
            variant="outline"
            printTitle="KPI Records Report"
            printSettings={{
              fontSize: '11px',
              compactMode: true
            }}
          />
          
          {guard.hasAccess('kpi.create') && (
            <ImportButton
              onImport={handleImportKPI}
              requiredColumns={['Project Code', 'Activity Name', 'Quantity', 'Input Type']}
              templateName="KPI_Records"
              templateColumns={importTemplateColumns}
              label="Import"
              variant="outline"
            />
          )}
        </div>
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
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
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

        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900 dark:to-indigo-800 border-indigo-200 dark:border-indigo-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-indigo-600 dark:text-indigo-300">Planned Value</p>
                <p className="text-3xl font-bold text-indigo-900 dark:text-indigo-100">
                  {formatCurrency(totalPlannedValue)}
                </p>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                  Across {plannedCount.toLocaleString()} planned KPIs
                </p>
              </div>
              <Coins className="h-10 w-10 text-indigo-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900 dark:to-emerald-800 border-emerald-200 dark:border-emerald-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-300">Actual Value</p>
                <p className="text-3xl font-bold text-emerald-900 dark:text-emerald-100">
                  {formatCurrency(totalActualValue)}
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                  {valueAchievementRate.toFixed(1)}% of planned value
                </p>
              </div>
              <DollarSign className="h-10 w-10 text-emerald-500" />
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
                  {formatCurrency(totalActualValue)} / {formatCurrency(totalPlannedValue)}
                </p>
                <p className="text-[11px] text-orange-500 dark:text-orange-300">
                  {actualCount.toLocaleString()} / {plannedCount.toLocaleString()} KPIs
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
          {useCustomizedTable ? (
            <KPITableWithCustomization
              kpis={paginatedKPIs as any}
              projects={projects}
              onEdit={(kpi: KPIRecord) => {
                // Handle edit - you can implement this
                console.log('Edit KPI:', kpi)
              }}
              onDelete={handleDeleteKPI}
              onBulkDelete={handleBulkDeleteKPI}
            />
          ) : (
            <OptimizedKPITable
              kpis={paginatedKPIs}
              projects={projects}
              activities={activities}
              onDelete={handleDeleteKPI}
              onBulkDelete={handleBulkDeleteKPI}
              onUpdate={handleUpdateKPI}
            />
          )}
          
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

      {showEnhancedForm && (
        <EnhancedSmartActualKPIForm
          kpi={null}
          projects={projects}
          activities={activities}
          onSubmit={handleCreateKPI}
          onCancel={() => setShowEnhancedForm(false)}
        />
      )}

      {/* Removed duplicate form - now handled by EnhancedKPITable */}
    </div>
  )
}
