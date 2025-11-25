'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/providers'
import { SmartActualKPIForm } from '@/components/kpi/SmartActualKPIForm'
import { PermissionPage } from '@/components/ui/PermissionPage'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
import { TABLES, Project, BOQActivity } from '@/lib/supabase'
import { mapProjectFromDB, mapBOQFromDB } from '@/lib/dataMappers'

export default function AddKPIPage() {
  const { user, appUser, loading } = useAuth()
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)
  const [projects, setProjects] = useState<Project[]>([])
  const [activities, setActivities] = useState<BOQActivity[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const supabase = getSupabaseClient()

  // Load projects and activities
  const loadData = async () => {
    try {
      setLoadingData(true)
      
      // Load projects
      const { data: projectsData, error: projectsError } = await supabase
        .from(TABLES.PROJECTS)
        .select('*')
        .order('created_at', { ascending: false })
      
      if (projectsError) throw projectsError
      
      const mappedProjects = (projectsData || []).map(mapProjectFromDB)
      setProjects(mappedProjects)
      
      // Load activities
      const { data: activitiesData, error: activitiesError } = await supabase
        .from(TABLES.BOQ_ACTIVITIES)
        .select('*')
        .order('created_at', { ascending: false })
      
      if (activitiesError) throw activitiesError
      
      const mappedActivities = (activitiesData || []).map(mapBOQFromDB)
      setActivities(mappedActivities)
      
      console.log('✅ Loaded data:', {
        projects: mappedProjects.length,
        activities: mappedActivities.length
      })
      
    } catch (err: any) {
      console.error('Error loading data:', err)
    } finally {
      setLoadingData(false)
    }
  }

  useEffect(() => {
    // Wait for auth to load
    if (!loading) {
      if (!user || !appUser) {
        console.log('⚠️ AddKPIPage: No user session, redirecting to login')
        router.push('/')
        return
      }
      
      console.log('✅ AddKPIPage: User authenticated:', user.email)
      setIsChecking(false)
      
      // Load data after authentication
      loadData()
    }
  }, [user, appUser, loading, router])

  // Show loading while checking auth or loading data
  if (loading || isChecking || loadingData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            {loading || isChecking ? 'Checking authentication...' : 'Loading projects and activities...'}
          </p>
        </div>
      </div>
    )
  }

  // If no user, redirect will happen in useEffect
  if (!user || !appUser) {
    return null
  }

  return (
    <PermissionPage 
      permission="kpi.create.legacy"
      accessDeniedTitle="KPI Creation Access Required"
      accessDeniedMessage="You need permission to create KPI records. Please contact your administrator."
    >
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <SmartActualKPIForm 
            projects={projects}
            activities={activities}
            onSubmit={async (data) => {
              try {
                console.log('📦 Submitting KPI:', data)
                
                // ✅ SET CREATED BY: Add user who created the KPI
                const createdByValue = appUser?.email || user?.email || appUser?.id || user?.id || 'System'
                const kpiDataWithCreatedBy = {
                  ...data,
                  created_by: createdByValue
                }
                console.log('✅ Setting created_by:', createdByValue)
                
                // Submit to database
                const { error: insertError } = await supabase
                  .from(TABLES.KPI)
                  .insert(kpiDataWithCreatedBy as any)
                
                if (insertError) throw insertError
                
                console.log('✅ KPI saved successfully')
                router.back()
              } catch (error: any) {
                console.error('❌ Error saving KPI:', error)
                throw error
              }
            }}
            onCancel={() => router.back()}
          />
        </div>
      </div>
    </PermissionPage>
  )
}
