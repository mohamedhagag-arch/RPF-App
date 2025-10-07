'use client'

import { useEffect, useState, useRef } from 'react'
import { getSupabaseClient, executeQuery } from '@/lib/simpleConnectionManager'
import { useSmartLoading } from '@/lib/smartLoadingManager'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { TABLES } from '@/lib/supabase'
import { mapProjectFromDB, mapBOQFromDB, mapKPIFromDB } from '@/lib/dataMappers'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  FolderOpen, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  TrendingUp,
  Users,
  ClipboardList,
  BarChart3
} from 'lucide-react'

interface DashboardStats {
  totalProjects: number
  activeProjects: number
  completedProjects: number
  totalActivities: number
  completedActivities: number
  delayedActivities: number
  totalKPIs: number
  onTrackKPIs: number
}

export function DashboardOverview() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const mountedRef = useRef(false)
  const supabase = getSupabaseClient()
  const { startSmartLoading, stopSmartLoading } = useSmartLoading('dashboard-overview')

  useEffect(() => {
    if (!mountedRef.current) {
      setMounted(true)
      mountedRef.current = true
    }
  }, [])

  useEffect(() => {
    if (!mounted) return

    const fetchStats = async () => {
      try {
        // Initialize with default values
        let projects: any[] = []
        let activities: any[] = []
        let kpis: any[] = []

        // Fetch projects stats
        try {
          const { data: projectsData, error: projectsError } = await supabase
            .from(TABLES.PROJECTS)
            .select('project_status')
          
          if (!projectsError) {
            projects = projectsData || []
          }
        } catch (error) {
          console.log('Projects table not found yet')
        }

        // Fetch activities stats
        try {
          const { data: activitiesData, error: activitiesError } = await supabase
            .from(TABLES.BOQ_ACTIVITIES)
            .select('activity_completed, activity_delayed')
          
          if (!activitiesError) {
            activities = activitiesData || []
          }
        } catch (error) {
          console.log('BOQ activities table not found yet')
        }

        // Fetch KPIs stats
        try {
          const { data: kpisData, error: kpisError } = await supabase
            .from(TABLES.KPI) // ✅ Use main KPI table
            .select('status')
          
          if (!kpisError) {
            kpis = kpisData || []
          }
        } catch (error) {
          console.log('KPI records table not found yet')
        }

        const totalProjects = projects?.length || 0
        const activeProjects = projects?.filter(p => p.project_status === 'active').length || 0
        const completedProjects = projects?.filter(p => p.project_status === 'completed').length || 0
        
        const totalActivities = activities?.length || 0
        const completedActivities = activities?.filter(a => a.activity_completed).length || 0
        const delayedActivities = activities?.filter(a => a.activity_delayed).length || 0
        
        const totalKPIs = kpis?.length || 0
        const onTrackKPIs = kpis?.filter(k => k.status === 'on_track').length || 0

        setStats({
          totalProjects,
          activeProjects,
          completedProjects,
          totalActivities,
          completedActivities,
          delayedActivities,
          totalKPIs,
          onTrackKPIs
        })
      } catch (error) {
        console.error('Error fetching dashboard stats:', error)
        // Set default stats if there's an error
        setStats({
          totalProjects: 0,
          activeProjects: 0,
          completedProjects: 0,
          totalActivities: 0,
          completedActivities: 0,
          delayedActivities: 0,
          totalKPIs: 0,
          onTrackKPIs: 0
        })
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]) // Removed supabase from deps to prevent infinite loop

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading dashboard data...</p>
        </div>
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total Projects',
      value: stats?.totalProjects || 0,
      icon: FolderOpen,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Active Projects',
      value: stats?.activeProjects || 0,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Completed Projects',
      value: stats?.completedProjects || 0,
      icon: CheckCircle,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50'
    },
    {
      title: 'Total Activities',
      value: stats?.totalActivities || 0,
      icon: ClipboardList,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Completed Activities',
      value: stats?.completedActivities || 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Delayed Activities',
      value: stats?.delayedActivities || 0,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      title: 'Total KPIs',
      value: stats?.totalKPIs || 0,
      icon: BarChart3,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50'
    },
    {
      title: 'On-Track KPIs',
      value: stats?.onTrackKPIs || 0,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Overview of project and activity status</p>
      </div>

      {stats && stats.totalProjects === 0 && stats.totalActivities === 0 && stats.totalKPIs === 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Welcome to Rabat MVP Project Management System
            </h3>
            <p className="text-blue-700 dark:text-blue-300 mb-4">
              No data found. Please set up your database and create some projects to get started.
            </p>
            <div className="text-sm text-blue-600 dark:text-blue-400">
              <p>To get started:</p>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Run the database schema in Supabase SQL Editor</li>
                <li>Create your first project</li>
                <li>Add BOQ activities and KPIs</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon
          return (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{card.title}</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{card.value}</p>
                  </div>
                  <div className={`p-3 rounded-full ${card.bgColor} dark:bg-gray-700`}>
                    <Icon className={`h-6 w-6 ${card.color} dark:text-gray-300`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Project Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Active Projects</span>
                <span className="font-semibold text-gray-900 dark:text-white">{stats?.activeProjects || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Completed Projects</span>
                <span className="font-semibold text-gray-900 dark:text-white">{stats?.completedProjects || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total Projects</span>
                <span className="font-semibold text-gray-900 dark:text-white">{stats?.totalProjects || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Activity Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Completed Activities</span>
                <span className="font-semibold text-green-600 dark:text-green-400">{stats?.completedActivities || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Delayed Activities</span>
                <span className="font-semibold text-red-600 dark:text-red-400">{stats?.delayedActivities || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total Activities</span>
                <span className="font-semibold text-gray-900 dark:text-white">{stats?.totalActivities || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
