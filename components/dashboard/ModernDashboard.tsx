'use client'

import { useState, useEffect } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { getSupabaseClient, executeQuery } from '@/lib/simpleConnectionManager'
import { useSmartLoading } from '@/lib/smartLoadingManager'
import { TABLES } from '@/lib/supabase'
import { ModernCard, StatCard, ProgressCard } from '@/components/ui/ModernCard'
import { 
  LayoutDashboard, 
  FolderKanban, 
  ClipboardList, 
  Target,
  TrendingUp,
  Users,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  Building2,
  BarChart3,
  Calendar
} from 'lucide-react'

export function ModernDashboard() {
  const guard = usePermissionGuard()
  const [activeTab, setActiveTab] = useState('overview')
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    totalActivities: 0,
    completedActivities: 0,
    totalKPIs: 0,
    projectsProgress: 0
  })
  const [loading, setLoading] = useState(true)
  
  const supabase = getSupabaseClient()
  const { startSmartLoading, stopSmartLoading } = useSmartLoading('modern-dashboard')
  
  // Quick lightweight stats fetch
  useEffect(() => {
    const fetchQuickStats = async () => {
      try {
        // Fetch only counts, not full data (MUCH faster!)
        const [projectsCount, activitiesCount, kpisCount] = await Promise.all([
          supabase
            .from(TABLES.PROJECTS)
            .select('project_status', { count: 'exact', head: false }),
          supabase
            .from(TABLES.BOQ_ACTIVITIES)
            .select('activity_completed', { count: 'exact', head: false }),
          supabase
            .from('Planning Database - KPI')
            .select('id', { count: 'exact', head: true }) // head:true = only count, no data!
        ])
        
        const projects = projectsCount.data || []
        const activities = activitiesCount.data || []
        
        setStats({
          totalProjects: projectsCount.count || projects.length || 0,
          activeProjects: projects.filter((p: any) => p.project_status === 'on-going').length,
          completedProjects: projects.filter((p: any) => p.project_status === 'completed-duration' || p.project_status === 'contract-completed').length,
          totalActivities: activitiesCount.count || activities.length || 0,
          completedActivities: activities.filter((a: any) => a.activity_completed).length,
          totalKPIs: kpisCount.count || 0,
          projectsProgress: projects.length > 0 
            ? Math.round((projects.filter((p: any) => p.project_status === 'completed-duration' || p.project_status === 'contract-completed').length / projects.length) * 100)
            : 0
        })
        
        setLoading(false)
        console.log('✅ Dashboard stats loaded quickly!')
        
      } catch (error) {
        console.error('Error loading dashboard:', error)
        setLoading(false)
      }
    }
    
    fetchQuickStats()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      {/* Modern Header */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Welcome back! Here's what's happening today
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg transition-all duration-300 hover:scale-105">
                <Plus className="h-4 w-4 inline mr-2" />
                New Project
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto px-6 py-8 space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-slide-up">
          <StatCard
            title="Total Projects"
            value={loading ? '...' : stats.totalProjects}
            icon={<FolderKanban className="h-6 w-6" />}
            color="blue"
          />
          
          <StatCard
            title="Active Projects"
            value={loading ? '...' : stats.activeProjects}
            icon={<Building2 className="h-6 w-6" />}
            color="green"
          />
          
          <StatCard
            title="BOQ Activities"
            value={loading ? '...' : stats.totalActivities}
            icon={<ClipboardList className="h-6 w-6" />}
            color="purple"
          />
          
          <StatCard
            title="Total KPIs"
            value={loading ? '...' : stats.totalKPIs}
            icon={<Target className="h-6 w-6" />}
            color="orange"
          />
        </div>

        {/* Progress Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ProgressCard
            title="Projects Progress"
            value={loading ? 0 : stats.projectsProgress}
            max={100}
            color="blue"
            icon={<BarChart3 className="h-5 w-5" />}
            subtitle="Overall completion rate"
          />
          
          <ProgressCard
            title="Completed Projects"
            value={loading ? 0 : stats.completedProjects}
            max={loading ? 1 : stats.totalProjects}
            color="green"
            icon={<CheckCircle className="h-5 w-5" />}
            subtitle={loading ? 'Loading...' : `${stats.completedProjects} of ${stats.totalProjects} projects`}
          />
          
          <ProgressCard
            title="Completed Activities"
            value={loading ? 0 : stats.completedActivities}
            max={loading ? 1 : stats.totalActivities}
            color="orange"
            icon={<Clock className="h-5 w-5" />}
            subtitle="Awaiting completion"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <ModernCard className="lg:col-span-2 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Recent Activity
                </h3>
              </div>
              <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                View All
              </button>
            </div>

            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div 
                  key={i}
                  className="flex items-start gap-4 p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                >
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <FolderKanban className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white">
                      Project Alpha updated
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      BOQ activities completed for Phase 2
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                      2 hours ago
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ModernCard>

          {/* Quick Stats */}
          <ModernCard className="animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
                <Target className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Quick Stats
              </h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Completed
                  </span>
                </div>
                <span className="text-lg font-bold text-green-600 dark:text-green-400">
                  {stats.completedProjects}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    In Progress
                  </span>
                </div>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {stats.activeProjects}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    At Risk
                  </span>
                </div>
                <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                  12
                </span>
              </div>
            </div>
          </ModernCard>
        </div>
      </div>
    </div>
  )
}

function Plus({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  )
}

