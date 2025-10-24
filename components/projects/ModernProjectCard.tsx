'use client'

import { useState, useEffect, useRef } from 'react'
import { Project, TABLES } from '@/lib/supabase'
import { ProjectAnalytics, calculateProjectAnalytics } from '@/lib/projectAnalytics'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
import { useAuth } from '@/app/providers'
import { hasPermission } from '@/lib/permissionsSystem'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { mapBOQFromDB, mapKPIFromDB } from '@/lib/dataMappers'
import { getProjectStatusIcon } from '@/lib/projectStatusManager'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { 
  Edit, 
  Trash2, 
  Eye, 
  Activity, 
  Target, 
  DollarSign, 
  Calendar,
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3
} from 'lucide-react'

interface ModernProjectCardProps {
  project: Project
  onEdit: (project: Project) => void
  onDelete: (id: string) => void
  onViewDetails?: (project: Project) => void
  getStatusColor: (status: string) => string
  getStatusText: (status: string) => string
}

export function ModernProjectCard({ 
  project, 
  onEdit, 
  onDelete,
  onViewDetails,
  getStatusColor, 
  getStatusText 
}: ModernProjectCardProps) {
  const { appUser } = useAuth()
  const guard = usePermissionGuard()
  const [analytics, setAnalytics] = useState<ProjectAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = getSupabaseClient()
  const mountedRef = useRef(true)

  // 🔧 FIX: Auto-load analytics on mount
  useEffect(() => {
    mountedRef.current = true
    loadAnalytics()
    
    return () => {
      mountedRef.current = false
    }
  }, [project.project_code])

  const loadAnalytics = async () => {
    if (!mountedRef.current) return
    
    try {
      setLoading(true)
      setError(null)
      
      // تقليل التسجيل لتجنب البطء
      if (Math.random() < 0.1) {
        console.log(`🚀 Loading analytics for ${project.project_code}...`)
      }
      
      // 🔧 FIX: Fetch data directly for this project with timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      )
      
      const [activitiesResult, kpisResult] = await Promise.race([
        Promise.all([
          supabase
            .from(TABLES.BOQ_ACTIVITIES)
            .select('*')
            .or(`Project Code.eq.${project.project_code},Project Full Code.like.${project.project_code}%`),
          supabase
            .from(TABLES.KPI)
            .select('*')
            .or(`Project Full Code.eq.${project.project_code},Project Code.eq.${project.project_code},Project Full Code.like.${project.project_code}%`)
        ]),
        timeoutPromise
      ]) as any
      
      if (activitiesResult.error) {
        console.error('❌ Activities error:', activitiesResult.error)
      }
      if (kpisResult.error) {
        console.error('❌ KPIs error:', kpisResult.error)
      }
      
      const activities = (activitiesResult.data || []).map(mapBOQFromDB)
      const kpis = (kpisResult.data || []).map(mapKPIFromDB)
      
      // تقليل التسجيل لتجنب البطء
      if (Math.random() < 0.05) {
        console.log(`✅ Loaded for ${project.project_code}:`, {
          activities: activities.length,
          kpis: kpis.length
        })
      }
      
      if (!mountedRef.current) return
      
      // Calculate analytics
      const calculatedAnalytics = calculateProjectAnalytics(project, activities, kpis)
      setAnalytics(calculatedAnalytics)
      
      // تقليل التسجيل لتجنب البطء
      if (Math.random() < 0.05) {
        console.log(`🎯 Analytics calculated for ${project.project_code}:`, {
          totalActivities: calculatedAnalytics.totalActivities,
          totalKPIs: calculatedAnalytics.totalKPIs,
          overallProgress: calculatedAnalytics.overallProgress
        })
      }
      
    } catch (error: any) {
      console.error('❌ Error loading analytics:', error)
      if (mountedRef.current) {
        setError(error.message)
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }
  
  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`
  }
  
  const getProgressColor = (progress: number) => {
    if (progress >= 90) return 'bg-green-500'
    if (progress >= 70) return 'bg-blue-500'
    if (progress >= 50) return 'bg-yellow-500'
    return 'bg-red-500'
  }
  
  const getBorderColor = (progress: number) => {
    if (progress >= 70) return '#10b981' // green
    if (progress >= 40) return '#f59e0b' // yellow
    return '#3b82f6' // blue
  }

  const getStatusIcon = (status: string) => {
    const icon = getProjectStatusIcon(status)
    // Convert icon string to JSX element
    switch (icon) {
      case '⏳': return <Clock className="w-4 h-4" />
      case '🏗️': return <CheckCircle className="w-4 h-4" />
      case '🚀': return <CheckCircle className="w-4 h-4" />
      case '✅': return <CheckCircle className="w-4 h-4" />
      case '⏰': return <Clock className="w-4 h-4" />
      case '📋': return <CheckCircle className="w-4 h-4" />
      case '⏸️': return <Clock className="w-4 h-4" />
      case '❌': return <AlertTriangle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const progress = analytics?.overallProgress || 0
  const totalActivities = analytics?.totalActivities || 0
  const totalKPIs = analytics?.totalKPIs || 0

  return (
    <Card className="card-modern group overflow-hidden" style={{
      borderLeftColor: getBorderColor(progress),
      borderLeftWidth: '4px'
    }}>
      {/* Header */}
      <CardHeader className="pb-4 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-700">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {project.project_name}
            </CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs font-mono bg-gray-100 dark:bg-gray-700">
                {project.project_code}
              </Badge>
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.project_status)}`}>
                {getStatusIcon(project.project_status)}
                {getStatusText(project.project_status)}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        {/* Progress Section */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Overall Progress</span>
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {loading ? (
                <div className="animate-pulse bg-gray-300 dark:bg-gray-600 h-8 w-16 rounded"></div>
              ) : error ? (
                <span className="text-red-500">Error</span>
              ) : (
                formatPercent(progress)
              )}
            </span>
          </div>
          
          <div className="relative">
            <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
              <div 
                className={`${getProgressColor(progress)} h-3 rounded-full transition-all duration-1000 ease-out relative`}
                style={{ width: `${Math.min(progress, 100)}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="icon-circle cyan">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Activities</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {loading ? (
                    <div className="animate-pulse bg-gray-300 dark:bg-gray-600 h-8 w-8 rounded"></div>
                  ) : error ? (
                    <span className="text-red-500">-</span>
                  ) : (
                    totalActivities
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="icon-circle purple">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">KPIs</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {loading ? (
                    <div className="animate-pulse bg-gray-300 dark:bg-gray-600 h-8 w-8 rounded"></div>
                  ) : error ? (
                    <span className="text-red-500">-</span>
                  ) : (
                    totalKPIs
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Project Details */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Type</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {project.project_type || 'Not specified'}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Division</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {project.responsible_division || 'Not specified'}
            </p>
          </div>
          
          {/* Additional project details */}
          {project.client_name && (
            <div className="space-y-1">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Client</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {project.client_name}
              </p>
            </div>
          )}
          
          {project.consultant_name && (
            <div className="space-y-1">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Consultant</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {project.consultant_name}
              </p>
            </div>
          )}
          
          {project.project_manager_email && (
            <div className="space-y-1">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Project Manager</p>
              <a 
                href={`mailto:${project.project_manager_email}`}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline cursor-pointer truncate block"
                title="Click to send email"
              >
                {project.project_manager_email}
              </a>
            </div>
          )}
          
          {project.area_manager_email && (
            <div className="space-y-1">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Area Manager</p>
              <a 
                href={`mailto:${project.area_manager_email}`}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline cursor-pointer truncate block"
                title="Click to send email"
              >
                {project.area_manager_email}
              </a>
            </div>
          )}
        </div>

        {/* Contract Value */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="icon-circle green">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Contract Value</p>
              <p className="text-lg font-bold text-green-600 dark:text-green-400">
                {formatCurrency(project.contract_amount || 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Health Status */}
        {analytics && (
          <div className="flex gap-2">
            <Badge className={`${
              analytics.projectHealth === 'excellent' ? 'bg-green-100 text-green-800' :
              analytics.projectHealth === 'good' ? 'bg-blue-100 text-blue-800' :
              analytics.projectHealth === 'warning' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            } font-semibold`}>
              {analytics.projectHealth === 'excellent' ? 'Excellent' :
               analytics.projectHealth === 'good' ? 'Good' :
               analytics.projectHealth === 'warning' ? 'Warning' : 'Critical'}
            </Badge>
            <Badge className={`${
              analytics.riskLevel === 'low' ? 'bg-green-100 text-green-800' :
              analytics.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              analytics.riskLevel === 'high' ? 'bg-orange-100 text-orange-800' :
              'bg-red-100 text-red-800'
            }`}>
              Risk: {analytics.riskLevel.toUpperCase()}
            </Badge>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-2 pt-4 border-t" style={{ borderColor: 'rgba(0, 0, 0, 0.06)' }}>
          {onViewDetails && (
            <button
              onClick={() => onViewDetails(project)}
              className="btn-primary flex items-center space-x-2"
            >
              <Eye className="w-4 h-4" />
              <span>Details</span>
            </button>
          )}
          {guard.hasAccess('projects.edit') && (
            <button
              onClick={() => onEdit(project)}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Edit className="w-4 h-4" />
              <span>Edit</span>
            </button>
          )}
          {guard.hasAccess('projects.delete') && (
            <button
              onClick={() => onDelete(project.id)}
              className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Loading analytics...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <p className="text-sm text-red-600 dark:text-red-400">Failed to load analytics</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadAnalytics}
              className="mt-2 text-xs"
            >
              Retry
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
