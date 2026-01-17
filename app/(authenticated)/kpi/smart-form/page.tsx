'use client'

import { EnhancedSmartActualKPIForm } from '@/components/kpi/EnhancedSmartActualKPIForm'
import { PermissionPage } from '@/components/ui/PermissionPage'
import { DynamicTitle } from '@/components/ui/DynamicTitle'
import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
import { Project, BOQActivity, TABLES } from '@/lib/supabase'
import { mapProjectFromDB, mapBOQFromDB } from '@/lib/dataMappers'
import { KPIConsistencyManager } from '@/lib/kpi-data-consistency-fix'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Alert } from '@/components/ui/Alert'
import { ArrowLeft, Target, Sparkles } from 'lucide-react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/providers'
import { usePermissionGuard } from '@/lib/permissionGuard'

export default function SmartKPIPage() {
  const router = useRouter()
  const { user: authUser, appUser } = useAuth()
  const guard = usePermissionGuard()
  const [projects, setProjects] = useState<Project[]>([])
  const [activities, setActivities] = useState<BOQActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  
  const supabase = getSupabaseClient()

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Fetch projects
        const { data: projectsData, error: projectsError } = await supabase
          .from(TABLES.PROJECTS)
          .select('*')
          .order('created_at', { ascending: false })
        
        if (projectsError) {
          throw projectsError
        }
        
        const mappedProjects = (projectsData || []).map(mapProjectFromDB)
        setProjects(mappedProjects)
        
        // Fetch ALL activities (no filter - get everything)
        // This ensures both old and new activities are loaded
        const { data: activitiesData, error: activitiesError } = await supabase
          .from(TABLES.BOQ_ACTIVITIES)
          .select('*')
          .order('created_at', { ascending: false })
        
        if (activitiesError) {
          throw activitiesError
        }
        
        const mappedActivities = (activitiesData || []).map(mapBOQFromDB)
        setActivities(mappedActivities)
        
        console.log('✅ Smart KPI Form: Loaded', mappedProjects.length, 'projects and', mappedActivities.length, 'total activities (old + new)')
        console.log('📊 Activities breakdown:', {
          total: mappedActivities.length,
          sample: mappedActivities.slice(0, 3).map(a => ({
            name: a.activity_name,
            project_code: a.project_code,
            project_full_code: a.project_full_code
          }))
        })
        
      } catch (err: any) {
        console.error('❌ Error loading data:', err)
        setError(err.message || 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [])

  const handleCreateKPI = async (kpiData: any) => {
    try {
      console.log('📦 Creating KPI from Smart Form (ENHANCED):', kpiData)
      
      // ✅ BLOCK: Check if this activity should be excluded (not worked on or zero quantity)
      const notWorkedOn = kpiData.notWorkedOn === true || kpiData.hasWorked === false
      const quantityRaw = kpiData['Quantity'] ?? kpiData.quantity ?? '0'
      const quantityStr = String(quantityRaw).trim()
      const quantityValue = parseFloat(quantityStr)
      const hasZeroQuantity = (
        isNaN(quantityValue) || 
        quantityValue === 0 || 
        quantityStr === '0' || 
        quantityStr === '' || 
        quantityRaw === 0 ||
        quantityRaw === '0' ||
        quantityRaw === null ||
        quantityRaw === undefined
      )
      
      if (notWorkedOn || hasZeroQuantity) {
        console.error('🚫 BLOCKED: Attempted to create KPI for activity that should be excluded:', {
          name: kpiData['Activity Name'] || kpiData.activity_name,
          notWorkedOn: notWorkedOn,
          hasZeroQuantity: hasZeroQuantity,
          quantity: quantityValue,
          quantityRaw: quantityRaw,
          quantityStr: quantityStr
        })
        // DO NOT CREATE KPI - silently skip or throw error
        throw new Error('Cannot create KPI: Activity was not worked on or has zero quantity')
      }
      
      // ✅ FIX: Use KPIConsistencyManager to ensure proper format
      // ✅ CRITICAL: Always use project_full_code, never project_code alone
      // Find the project from the projects list to get the correct project_full_code
      let finalProjectCode = kpiData['Project Full Code'] || kpiData.project_full_code
      
      // If Project Full Code is not provided or is empty, try to find it from projects list
      if (!finalProjectCode || finalProjectCode.trim() === '') {
        const projectCodeToSearch = kpiData['Project Code'] || kpiData.project_code
        if (projectCodeToSearch) {
          // Find project by project_code to get project_full_code
          const foundProject = projects.find((p: Project) => 
            p.project_code === projectCodeToSearch || 
            p.project_full_code === projectCodeToSearch
          )
          if (foundProject) {
            finalProjectCode = foundProject.project_full_code || foundProject.project_code
            console.log(`✅ Found project_full_code from projects list: ${finalProjectCode} (was searching for: ${projectCodeToSearch})`)
          } else {
            // Fallback: use project_code if project not found
            finalProjectCode = projectCodeToSearch
            console.warn(`⚠️ Project not found in list, using project_code as fallback: ${finalProjectCode}`)
          }
        }
      }
      
      // ✅ VALIDATE: Ensure we have a valid project code
      if (!finalProjectCode || finalProjectCode.trim() === '') {
        throw new Error('Project Full Code is required and cannot be empty')
      }
      
      console.log(`🔍 Final Project Full Code to save: ${finalProjectCode}`)
      console.log(`🔍 Original kpiData:`, {
        'Project Full Code': kpiData['Project Full Code'],
        'Project Code': kpiData['Project Code'],
        project_full_code: kpiData.project_full_code,
        project_code: kpiData.project_code
      })
      
      const finalActivityName = kpiData['Activity Name'] || kpiData.activity_name
      const finalQuantity = quantityValue // Use the already parsed value
      
      // Find related activity to calculate Value
      let calculatedValue = kpiData['Value'] || kpiData.value || 0
      if (!calculatedValue || calculatedValue === 0) {
        // Try to find activity to get rate
        const relatedActivity = activities.find((a: any) => 
          a.activity_name === finalActivityName && 
          (a.project_code === finalProjectCode || a.project_full_code === finalProjectCode)
        )
        
        if (relatedActivity) {
          let rate = 0
          if (relatedActivity.rate && relatedActivity.rate > 0) {
            rate = relatedActivity.rate
          } else if (relatedActivity.total_value && relatedActivity.total_units && relatedActivity.total_units > 0) {
            rate = relatedActivity.total_value / relatedActivity.total_units
          }
          
          if (rate > 0) {
            calculatedValue = finalQuantity * rate
            console.log(`💰 Calculated Value: ${finalQuantity} × ${rate} = ${calculatedValue}`)
          }
        }
        
        // If still no value, use quantity as fallback
        if (!calculatedValue || calculatedValue === 0) {
          calculatedValue = finalQuantity
        }
      }
      
      // ✅ Find the project to get both project_code and project_full_code
      const foundProjectForSave = projects.find((p: Project) => 
        p.project_full_code === finalProjectCode || 
        p.project_code === finalProjectCode
      )
      
      // ✅ Extract project_code from project_full_code if needed
      // If finalProjectCode is like "4110-P", extract "4110" as project_code
      let projectCodeOnly = finalProjectCode
      if (foundProjectForSave) {
        projectCodeOnly = foundProjectForSave.project_code
      } else if (finalProjectCode.includes('-')) {
        // Extract base code before dash (e.g., "4110-P" -> "4110")
        projectCodeOnly = finalProjectCode.split('-')[0]
      }
      
      console.log(`🔍 Project codes for save:`, {
        project_full_code: finalProjectCode,
        project_code: projectCodeOnly,
        found_project: foundProjectForSave ? foundProjectForSave.project_name : 'Not found'
      })
      
      // ✅ Get Activity Date (unified field) - prioritize Activity Date, fallback to Actual Date or Target Date
      const activityDate = kpiData['Activity Date'] || 
                          kpiData.activity_date || 
                          kpiData['Actual Date'] || 
                          kpiData.actual_date || 
                          kpiData['Target Date'] || 
                          kpiData.target_date || 
                          new Date().toISOString().split('T')[0]
      
      const standardizedData = KPIConsistencyManager.createStandardKPIForSave({
        projectCode: finalProjectCode, // ✅ This will be used for Project Full Code
        projectSubCode: kpiData['Project Sub Code'] || foundProjectForSave?.project_sub_code || '',
        // ❌ Removed projectName - not stored in KPI table
        activityName: finalActivityName,
        // ❌ Removed activityDivision - not stored in KPI table
        quantity: finalQuantity,
        unit: kpiData['Unit'] || kpiData.unit || '',
        inputType: 'Actual', // Always Actual for manual entry
        activityDate: activityDate, // ✅ Unified date field (replaces targetDate and actualDate)
        // ✅ Map Zone Number to Zone (NOT to Section - Section is separate)
        // ✅ NOT from Section - Section is separate from Zone
        zoneNumber: kpiData['Zone Number'] || kpiData['Zone'] || kpiData.zone_number || kpiData.zone || '0'
      })
      
      // ✅ CRITICAL FIX: Override Project Code to use project_code only (not project_full_code)
      // This ensures Project Code contains "4110" and Project Full Code contains "4110-P"
      standardizedData['Project Code'] = projectCodeOnly
      
      // ✅ CRITICAL FIX: Ensure Zone is formatted as: full code + zone (e.g., "P8888-P-01-0")
      // Zone should use project_full_code, not project_code
      if (standardizedData['Zone'] && finalProjectCode) {
        const currentZone = standardizedData['Zone']
        // If zone doesn't already contain project_full_code, format it
        if (!currentZone.includes(finalProjectCode)) {
          standardizedData['Zone'] = `${finalProjectCode}-${currentZone}`
          console.log(`✅ Formatted Zone: ${currentZone} → ${standardizedData['Zone']}`)
        }
      }
      
      // ✅ Add Value field if available or calculated
      if (calculatedValue && calculatedValue > 0) {
        standardizedData['Value'] = calculatedValue.toString()
      }

      // ✅ SET CREATED BY: Add user who created the KPI
      const createdByValue = appUser?.email || authUser?.email || guard.user?.email || authUser?.id || appUser?.id || guard.user?.id || 'System'
      standardizedData['created_by'] = createdByValue
      console.log('✅ Setting created_by:', createdByValue)

      console.log('🔧 Standardized KPI data:', standardizedData)
      
      const { data, error } = await supabase
        .from(TABLES.KPI)
        .insert([standardizedData] as any)
        .select()
        .single()

      if (error) {
        console.error('❌ Database error:', error)
        throw error
      }
      
      console.log('✅ KPI created successfully with consistent format:', data)
      
      // Show success message with more details
      const successActivityName = standardizedData['Activity Name']
      const successProjectCode = standardizedData['Project Full Code']
      const successQuantity = standardizedData['Quantity']
      
      alert(`✅ KPI created successfully!\n\nActivity: ${successActivityName}\nProject: ${successProjectCode}\nQuantity: ${successQuantity}\nType: Actual`)
      
    } catch (err: any) {
      console.error('❌ Error creating KPI:', err)
      throw new Error(err.message || 'Failed to create KPI')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Smart KPI Form...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md mx-auto text-center">
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <PermissionPage 
      permission="kpi.create.smart"
      accessDeniedTitle="KPI Creation Access Required"
      accessDeniedMessage="You need permission to create KPIs. Please contact your administrator."
    >
      <DynamicTitle pageTitle="Smart KPI Form" />
      
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
        {/* Header - Mobile Responsive */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
          <div className="w-full mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
                <Button
                  variant="ghost"
                  onClick={() => router.push('/kpi')}
                  className="flex items-center gap-1 sm:gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white shrink-0"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Back to KPI</span>
                </Button>
                
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center shrink-0">
                    <Target className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white truncate">
                      Smart KPI Form
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 hidden sm:block">
                      Intelligent form for site activities with guided workflow
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end sm:justify-start">
                <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-full text-xs sm:text-sm font-medium">
                  <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span>Enhanced</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="w-full mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
          {/* Info Card */}
          <div className="mb-4 sm:mb-6 md:mb-8">
            <div className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 p-4 sm:p-6 rounded-lg border border-blue-200 dark:border-blue-700">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-green-600 rounded-full flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2">
                    Smart KPI Form Features
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">🎯 Guided Workflow</h3>
                      <p>Step-by-step process: Select project → Choose activities → Record work</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">⚡ Smart Auto-Fill</h3>
                      <p>Automatically fills units, sections, and daily rates from activity data</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">📊 Progress Tracking</h3>
                      <p>Visual progress bar and completion status for all activities</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">✅ Work Confirmation</h3>
                      <p>Simple yes/no question for each activity to streamline data entry</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Start Button */}
          <div className="text-center">
            <Button
              onClick={() => setShowForm(true)}
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Target className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              Start Smart KPI Form
            </Button>
            <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400 px-4">
              Click to begin the guided KPI recording process
            </p>
          </div>

          {/* Enhanced Smart Form - Display in center after button */}
          {showForm && (
            <div className="mt-6 sm:mt-8 md:mt-12 w-full mx-auto px-2 sm:px-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4 md:p-6">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center shrink-0">
                      <Target className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white truncate">
                        Smart KPI Form
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 hidden sm:block">
                        Intelligent form for site activities with guided workflow
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowForm(false)}
                    className="text-gray-400 hover:text-gray-600 shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
                
                <EnhancedSmartActualKPIForm
                  kpi={null}
                  projects={projects}
                  activities={activities}
                  onSubmit={handleCreateKPI}
                  onCancel={() => setShowForm(false)}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </PermissionPage>
  )
}
