'use client'

import { EnhancedSmartActualKPIForm } from '@/components/kpi/EnhancedSmartActualKPIForm'
import { PermissionPage } from '@/components/ui/PermissionPage'
import { DynamicTitle } from '@/components/ui/DynamicTitle'
import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
import { Project, BOQActivity, TABLES } from '@/lib/supabase'
import { mapProjectFromDB, mapBOQFromDB } from '@/lib/dataMappers'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Alert } from '@/components/ui/Alert'
import { ArrowLeft, Target, Sparkles } from 'lucide-react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useRouter } from 'next/navigation'

export default function SmartKPIPage() {
  const router = useRouter()
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
        
        // Fetch activities
        const { data: activitiesData, error: activitiesError } = await supabase
          .from(TABLES.BOQ_ACTIVITIES)
          .select('*')
          .order('created_at', { ascending: false })
        
        if (activitiesError) {
          throw activitiesError
        }
        
        const mappedActivities = (activitiesData || []).map(mapBOQFromDB)
        setActivities(mappedActivities)
        
        console.log('✅ Smart KPI Form: Loaded', mappedProjects.length, 'projects and', mappedActivities.length, 'activities')
        
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
      console.log('📦 Creating KPI from Smart Form:', kpiData)
      
      const { data, error } = await supabase
        .from(TABLES.KPI)
        .insert([kpiData] as any)
        .select()
        .single()

      if (error) {
        throw error
      }
      
      console.log('✅ KPI created successfully:', data)
      
      // Show success message
      alert(`✅ KPI created successfully for activity: ${kpiData['Activity Name']}`)
      
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
      permission="kpi.create"
      accessDeniedTitle="KPI Creation Access Required"
      accessDeniedMessage="You need permission to create KPIs. Please contact your administrator."
    >
      <DynamicTitle pageTitle="Smart KPI Form" />
      
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
        {/* Header */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  onClick={() => router.push('/kpi')}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to KPI
                </Button>
                
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Smart KPI Form
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Intelligent form for site activities with guided workflow
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => router.push('/kpi')}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to KPI
                </Button>
                <div className="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-full text-sm font-medium">
                  <Sparkles className="h-4 w-4" />
                  Enhanced
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Info Card */}
          <div className="mb-8">
            <div className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-700">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-green-600 rounded-full flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    Smart KPI Form Features
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
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
              className="px-8 py-4 text-lg bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Target className="h-5 w-5 mr-2" />
              Start Smart KPI Form
            </Button>
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              Click to begin the guided KPI recording process
            </p>
          </div>

          {/* Enhanced Smart Form - Display in center after button */}
          {showForm && (
            <div className="mt-12 max-w-6xl mx-auto">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center">
                      <Target className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        Smart KPI Form
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Intelligent form for site activities with guided workflow
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowForm(false)}
                    className="text-gray-400 hover:text-gray-600"
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
