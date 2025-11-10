'use client'

import { useState, useEffect, useRef, memo } from 'react'
import { Project, TABLES } from '@/lib/supabase'
import { ProjectAnalytics, calculateProjectAnalytics } from '@/lib/projectAnalytics'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
import { useAuth } from '@/app/providers'
import { hasPermission } from '@/lib/permissionsSystem'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { mapBOQFromDB, mapKPIFromDB } from '@/lib/dataMappers'
import { getProjectStatusIcon } from '@/lib/projectStatusManager'
import { formatCurrencyByCodeSync } from '@/lib/currenciesManager'
import { calculateWorkValueStatus, calculateProgressFromWorkValue } from '@/lib/workValueCalculator'
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
  analytics?: ProjectAnalytics | null // ✅ Optional: Pre-calculated analytics (from parent)
  allActivities?: any[] // ✅ Optional: Pre-loaded activities (from parent)
  allKPIs?: any[] // ✅ Optional: Pre-loaded KPIs (from parent)
  onEdit: (project: Project) => void
  onDelete: (id: string) => void
  onViewDetails?: (project: Project) => void
  getStatusColor: (status: string) => string
  getStatusText: (status: string) => string
}

// ✅ PERFORMANCE: Memoize card to prevent unnecessary re-renders
export const ModernProjectCard = memo(function ModernProjectCard({ 
  project, 
  analytics: propAnalytics, // ✅ Pre-calculated analytics from parent
  allActivities: propActivities = [], // ✅ Pre-loaded activities from parent
  allKPIs: propKPIs = [], // ✅ Pre-loaded KPIs from parent
  onEdit, 
  onDelete,
  onViewDetails,
  getStatusColor, 
  getStatusText 
}: ModernProjectCardProps) {
  const { appUser } = useAuth()
  const guard = usePermissionGuard()
  const [analytics, setAnalytics] = useState<ProjectAnalytics | null>(propAnalytics || null)
  // ✅ Initialize loading to false if analytics provided, true if not (will be set in useEffect)
  const [loading, setLoading] = useState(!propAnalytics && propActivities === undefined && propKPIs === undefined)
  const [error, setError] = useState<string | null>(null)
  const supabase = getSupabaseClient()
  const mountedRef = useRef(true)

  // ✅ Use pre-calculated analytics from parent (ProjectsList) - NO RECALCULATION INSIDE CARD
  // ✅ All calculations happen OUTSIDE the card in ProjectsList.tsx for better performance
  // ✅ Only recalculate if propAnalytics is not provided (fallback for edge cases)
  useEffect(() => {
    mountedRef.current = true
    
    // ✅ PRIORITY 1: Use propAnalytics if provided (calculated OUTSIDE in ProjectsList)
    // This is the main path - all calculations happen in ProjectsList, card just displays
    if (propAnalytics) {
      // ✅ PERFORMANCE: Reduced logging - only log in development and very rarely
      if (process.env.NODE_ENV === 'development' && Math.random() < 0.01) {
        console.log(`✅ ModernProjectCard [${project.project_code}]: Using pre-calculated analytics from ProjectsList`)
      }
      setAnalytics(propAnalytics)
      setLoading(false)
      setError(null)
      return
    }
    
    // ✅ PRIORITY 2: If propAnalytics not provided but activities/KPIs are, calculate as fallback
    // This only happens if ProjectsList didn't calculate analytics for some reason
    if (propActivities !== undefined && propKPIs !== undefined) {
      try {
        const calculatedAnalytics = calculateProjectAnalytics(project, propActivities, propKPIs)
        setAnalytics(calculatedAnalytics)
        setLoading(false)
        setError(null)
        if (Math.random() < 0.05) {
          console.log(`⚠️ Calculated analytics INSIDE card as fallback for ${project.project_code} (should be calculated OUTSIDE)`)
        }
        return
      } catch (error) {
        console.error(`❌ Error calculating analytics from pre-loaded data:`, error)
        // Fall through to loadAnalytics()
      }
    }
    
    // ✅ PRIORITY 3: Fallback - Load analytics from database (only if not provided)
    // This should rarely happen as ProjectsList should always provide analytics
    loadAnalytics()
    
    return () => {
      mountedRef.current = false
    }
  }, [project.project_code, propAnalytics, propActivities, propKPIs])

  const loadAnalytics = async () => {
    if (!mountedRef.current) return
    
    try {
      setLoading(true)
      setError(null)
      
      // تقليل التسجيل لتجنب البطء
      if (Math.random() < 0.1) {
        console.log(`🚀 Loading analytics for ${project.project_code}...`)
      }
      
      // ✅ SPEED: Reduced timeout for faster failure detection
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 5000)
      )
      
      // ✅ FIX: Build project_full_code for accurate matching
      const projectCode = (project.project_code || '').trim()
      const projectSubCode = (project.project_sub_code || '').trim()
      
      let projectFullCode = projectCode
      if (projectSubCode) {
        // Check if sub_code already starts with project_code (case-insensitive)
        if (projectSubCode.toUpperCase().startsWith(projectCode.toUpperCase())) {
          projectFullCode = projectSubCode
        } else {
          if (projectSubCode.startsWith('-')) {
            projectFullCode = `${projectCode}${projectSubCode}`
          } else {
            projectFullCode = `${projectCode}-${projectSubCode}`
          }
        }
      }
      
      // ✅ FIXED: Use project_full_code for accurate matching
      const [activitiesResult, kpisResult] = await Promise.race([
        Promise.all([
          supabase
            .from(TABLES.BOQ_ACTIVITIES)
            .select('*')
            .or(`Project Full Code.eq.${projectFullCode},Project Code.eq.${projectCode},Project Full Code.like.${projectFullCode}%`)
            .limit(1000), // ✅ SPEED: Limit results to prevent huge queries
          supabase
            .from(TABLES.KPI)
            .select('*')
            .or(`Project Full Code.eq.${projectFullCode},Project Code.eq.${projectCode},Project Full Code.like.${projectFullCode}%`)
            .limit(1000) // ✅ SPEED: Limit results to prevent huge queries
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

  // Use dynamic currency system based on project currency
  const formatCurrency = (amount: number) => {
    return formatCurrencyByCodeSync(amount, project.currency)
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

  // ✅ Calculate display values from analytics - ALWAYS calculate even if analytics is null
  // ✅ REBUILD: Calculate counts directly from activities and KPIs if analytics not available
  // This ensures we always have valid numbers for display (0 if no data)
  
  // Build project_full_code for matching
  const projectCode = (project.project_code || '').trim()
  const projectSubCode = (project.project_sub_code || '').trim()
  let projectFullCode = projectCode
  if (projectSubCode) {
    if (projectSubCode.toUpperCase().startsWith(projectCode.toUpperCase())) {
      projectFullCode = projectSubCode
    } else {
      if (projectSubCode.startsWith('-')) {
        projectFullCode = `${projectCode}${projectSubCode}`
      } else {
        projectFullCode = `${projectCode}-${projectSubCode}`
      }
    }
  }
  
  // ✅ REBUILD: Calculate activities count directly (same logic as analytics)
  const matchedActivities = propActivities?.filter(a => {
    const aCode = (a.project_code || '').trim()
    const aFullCode = (a.project_full_code || '').trim()
    const aRawCode = (a as any).raw?.['Project Code'] || ''
    const aRawFullCode = (a as any).raw?.['Project Full Code'] || ''
    
    return aCode === projectCode || 
           aFullCode === projectFullCode || 
           aFullCode === projectCode ||
           aRawCode === projectCode ||
           aRawFullCode === projectFullCode ||
           aFullCode.startsWith(projectFullCode) ||
           aFullCode.startsWith(projectCode)
  }) || []
  
  // ✅ REBUILD: Calculate KPIs count directly (same logic as activities)
  const matchedKPIs = propKPIs?.filter(k => {
    const kCode = (k.project_code || '').trim()
    const kFullCode = (k.project_full_code || '').trim()
    const kRawCode = (k as any).raw?.['Project Code'] || ''
    const kRawFullCode = (k as any).raw?.['Project Full Code'] || ''
    
    return kCode === projectCode || 
           kFullCode === projectFullCode || 
           kFullCode === projectCode ||
           kRawCode === projectCode ||
           kRawFullCode === projectFullCode ||
           kFullCode.startsWith(projectFullCode) ||
           kFullCode.startsWith(projectCode)
  }) || []
  
  // ✅ NEW: Calculate progress using shared work value calculator
  // ✅ PERFORMANCE: Use pre-calculated workValueStatus from analytics (calculated once in ProjectsList)
  const workValueStatus = analytics?.workValueStatus || calculateWorkValueStatus(project, propActivities || [], propKPIs || [])
  const progressSummary = calculateProgressFromWorkValue(workValueStatus)
  
  // ✅ Use calculated progress from work value, fallback to analytics
  const progress = progressSummary.actual ?? analytics?.actualProgress ?? analytics?.overallProgress ?? 0
  const totalActivities = analytics?.totalActivities ?? matchedActivities.length
  const totalKPIs = analytics?.totalKPIs ?? matchedKPIs.length
  
  // ✅ DEBUG: Log direct calculation results
  console.log(`🔍 [${project.project_code}] ModernProjectCard - Direct counts:`, {
    projectCode,
    projectFullCode,
    propActivitiesLength: propActivities?.length || 0,
    propKPIsLength: propKPIs?.length || 0,
    matchedActivitiesCount: matchedActivities.length,
    matchedKPIsCount: matchedKPIs.length,
    analyticsTotalActivities: analytics?.totalActivities,
    analyticsTotalKPIs: analytics?.totalKPIs,
    finalTotalActivities: totalActivities,
    finalTotalKPIs: totalKPIs,
    // Show sample matched KPIs
    sampleMatchedKPIs: matchedKPIs.slice(0, 2).map(k => ({
      project_code: k.project_code,
      project_full_code: k.project_full_code,
      activity_name: k.activity_name
    }))
  })

  // ✅ DEBUG: Log analytics state for troubleshooting - SHOW FULL VALUES AND DISPLAY VALUES
  // Log for ALL projects to see what's happening
  console.log(`🔍 ModernProjectCard [${project.project_code}]:`, {
    hasAnalytics: !!analytics,
    hasPropAnalytics: !!propAnalytics,
    loading,
    error,
    propActivitiesLength: propActivities?.length || 0,
    propKPIsLength: propKPIs?.length || 0,
    // ✅ Show FULL analytics object to see all values
    analytics: analytics ? {
      totalActivities: analytics.totalActivities,
      totalKPIs: analytics.totalKPIs,
      overallProgress: analytics.overallProgress,
      actualProgress: analytics.actualProgress,
      totalContractValue: analytics.totalContractValue,
      totalValue: analytics.totalValue,
      totalPlannedValue: analytics.totalPlannedValue,
      totalEarnedValue: analytics.totalEarnedValue,
      financialProgress: analytics.financialProgress,
      weightedProgress: analytics.weightedProgress,
      completedActivities: analytics.completedActivities,
      onTrackActivities: analytics.onTrackActivities,
      plannedKPIs: analytics.plannedKPIs,
      actualKPIs: analytics.actualKPIs,
      // ✅ Show activities and KPIs arrays to verify matching
      activitiesCount: analytics.activities?.length || 0,
      kpisCount: analytics.kpis?.length || 0
    } : null,
    // ✅ Show actual values being used for display (AFTER calculation)
    displayValues: {
      progress,
      totalActivities,
      totalKPIs,
      progressFormatted: formatPercent(progress),
      // ✅ Verify these are numbers, not strings or undefined
      progressType: typeof progress,
      totalActivitiesType: typeof totalActivities,
      totalKPIsType: typeof totalKPIs
    },
    contractAmount: project.contract_amount,
    // ✅ Show what will be displayed
    willDisplay: {
      progress: formatPercent(progress),
      activities: totalActivities,
      kpis: totalKPIs
    }
  })

  return (
    <Card className="card-modern group overflow-hidden relative bg-white dark:bg-gray-800 shadow-lg hover:shadow-2xl transition-all duration-300 border-0" style={{
      borderLeftColor: getBorderColor(progress),
      borderLeftWidth: '5px',
      minHeight: '450px'
    }}>
      {/* Decorative Top Bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-60"></div>
      
      {/* Header Section - Redesigned */}
      <CardHeader className="pb-5 pt-6 px-6 bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900 border-b border-gray-100 dark:border-gray-700">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 mb-3">
              <CardTitle className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 flex-1">
                {project.project_name}
              </CardTitle>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm flex-shrink-0 ${getStatusColor(project.project_status)}`}>
                {getStatusIcon(project.project_status)}
                {getStatusText(project.project_status)}
              </span>
            </div>
            {project.project_description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2 leading-relaxed">
                {project.project_description}
              </p>
            )}
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-mono bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 border-gray-200 dark:border-gray-600 px-3 py-1 font-semibold">
                {(() => {
                  // ✅ Build project_full_code to show the full code (e.g., P5066-R1) instead of just project_code (P5066)
                  const projectCode = (project.project_code || '').trim()
                  const projectSubCode = (project.project_sub_code || '').trim()
                  
                  let projectFullCode = projectCode
                  if (projectSubCode) {
                    // Check if sub_code already starts with project_code (case-insensitive)
                    if (projectSubCode.toUpperCase().startsWith(projectCode.toUpperCase())) {
                      // project_sub_code already contains project_code (e.g., "P5066-R1")
                      projectFullCode = projectSubCode
                    } else {
                      // project_sub_code is just the suffix (e.g., "R1" or "-R1")
                      if (projectSubCode.startsWith('-')) {
                        projectFullCode = `${projectCode}${projectSubCode}`
                      } else {
                        projectFullCode = `${projectCode}-${projectSubCode}`
                      }
                    }
                  }
                  
                  return projectFullCode || projectCode || 'N/A'
                })()}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6 space-y-5">
        {/* Progress Section - Redesigned */}
        <div className="relative bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 dark:from-emerald-900/30 dark:via-green-900/30 dark:to-teal-900/30 rounded-2xl p-5 border border-emerald-100 dark:border-emerald-800/50 shadow-sm hover:shadow-md transition-shadow">
          <div className="absolute top-3 right-3">
            <div className="w-12 h-12 rounded-full bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <div className="pr-16">
            <div className="flex items-baseline justify-between mb-4">
              <div>
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 uppercase tracking-wide mb-1">Actual Progress</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">(Earned Value / Total Value)</p>
              </div>
              <span className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums">
                {loading ? (
                  <div className="inline-block animate-pulse bg-gray-300 dark:bg-gray-600 h-9 w-20 rounded"></div>
                ) : error ? (
                  <span className="text-red-500 text-xl">Error</span>
                ) : (
                  <span title={`Progress: ${progress}%`} className="bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
                    {formatPercent(progress)}
                  </span>
                )}
              </span>
            </div>
            
            <div className="relative h-4 bg-white/80 dark:bg-gray-800/80 rounded-full overflow-hidden shadow-inner">
              <div 
                className={`h-full rounded-full transition-all duration-700 ease-out relative overflow-hidden ${
                  progress >= 90 ? 'bg-gradient-to-r from-emerald-500 to-green-500' :
                  progress >= 70 ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                  progress >= 50 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                  'bg-gradient-to-r from-red-500 to-pink-500'
                }`}
                style={{ width: loading ? '0%' : `${Math.min(progress, 100)}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="group/stat relative bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100 dark:from-blue-900/30 dark:via-cyan-900/30 dark:to-blue-800/30 rounded-xl p-5 border border-blue-100 dark:border-blue-800/50 shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-300 overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-blue-200/30 dark:bg-blue-700/20 rounded-full -mr-10 -mt-10 blur-xl"></div>
            <div className="relative flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg flex items-center justify-center flex-shrink-0">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide mb-1">Activities</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums min-h-[36px] flex items-center">
                  {loading ? (
                    <div className="animate-pulse bg-gray-300 dark:bg-gray-600 h-9 w-16 rounded"></div>
                  ) : error ? (
                    <span className="text-red-500 text-xl">-</span>
                  ) : (
                    <span className="bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">
                      {totalActivities}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="group/stat relative bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100 dark:from-purple-900/30 dark:via-pink-900/30 dark:to-purple-800/30 rounded-xl p-5 border border-purple-100 dark:border-purple-800/50 shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-300 overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-purple-200/30 dark:bg-purple-700/20 rounded-full -mr-10 -mt-10 blur-xl"></div>
            <div className="relative flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg flex items-center justify-center flex-shrink-0">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wide mb-1">KPIs</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums min-h-[36px] flex items-center">
                  {loading ? (
                    <div className="animate-pulse bg-gray-300 dark:bg-gray-600 h-9 w-16 rounded"></div>
                  ) : error ? (
                    <span className="text-red-500 text-xl">-</span>
                  ) : (
                    <span className="bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                      {totalKPIs}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Project Dates & Duration */}
        {(project.project_start_date || project.project_completion_date || project.project_duration) && (
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Project Timeline</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {project.project_start_date && (
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Start Date</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {new Date(project.project_start_date).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
              )}
              {project.project_completion_date && (
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Completion Date</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {new Date(project.project_completion_date).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
              )}
              {(project.project_duration !== undefined && project.project_duration !== null) && (
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Duration</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-500" />
                    {project.project_duration} {project.project_duration === 1 ? 'day' : 'days'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Project Details */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">SCOPE</p>
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
          
          {project.division_head_email && (
            <div className="space-y-1">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Division Head</p>
              <a 
                href={`mailto:${project.division_head_email}`}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline cursor-pointer truncate block"
                title="Click to send email"
              >
                {project.division_head_email}
              </a>
            </div>
          )}
        </div>

        {/* Contract Value - Redesigned */}
        <div className="relative bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 dark:from-emerald-900/30 dark:via-green-900/30 dark:to-teal-900/30 rounded-xl p-5 border border-emerald-100 dark:border-emerald-800/50 shadow-sm overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-200/20 dark:bg-emerald-700/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <div className="relative flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 shadow-lg flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide mb-1">Contract Value</p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {formatCurrency(project.contract_amount || 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Project Status based on Variance Percentage */}
        {analytics && (
          <div className="flex gap-2">
            <Badge className={`${
              analytics.projectStatus === 'ahead' ? 'bg-green-100 text-green-800 border border-green-300' :
              analytics.projectStatus === 'on_track' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
              'bg-red-100 text-red-800 border border-red-300'
            } font-semibold`}>
              {analytics.projectStatus === 'ahead' ? 'Project Ahead' :
               analytics.projectStatus === 'on_track' ? 'Project On Track' : 'Project Delayed'}
            </Badge>
            {analytics.variancePercentage !== 0 && (
              <Badge className="bg-gray-100 text-gray-800 border border-gray-300">
                Variance: {analytics.variancePercentage > 0 ? '+' : ''}{analytics.variancePercentage.toFixed(1)}%
            </Badge>
            )}
          </div>
        )}

        {/* Action Buttons - Redesigned */}
        <div className="flex justify-end gap-2 pt-5 border-t border-gray-200 dark:border-gray-700">
          {onViewDetails && (
            <button
              onClick={() => onViewDetails(project)}
              className="group/btn relative flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700"></div>
              <Eye className="w-4 h-4 relative z-10" />
              <span className="relative z-10">Details</span>
            </button>
          )}
          {guard.hasAccess('projects.edit') && (
            <button
              onClick={() => onEdit(project)}
              className="group/btn flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-500 rounded-xl font-semibold text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 active:scale-95"
            >
              <Edit className="w-4 h-4" />
              <span>Edit</span>
            </button>
          )}
          {guard.hasAccess('projects.delete') && (
            <button
              onClick={() => onDelete(project.id)}
              className="group/btn flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-gray-800 border-2 border-red-200 dark:border-red-800 hover:border-red-500 dark:hover:border-red-500 rounded-xl font-semibold text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 active:scale-95"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ✅ FIXED: Removed full-screen loading overlay - causes layout shift */}
        {/* Loading is now handled inline with skeleton placeholders above */}

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
}, (prevProps, nextProps) => {
  // Only re-render if these props change
  // Return true if props are equal (skip re-render), false if different (re-render)
  return (
    prevProps.project.id === nextProps.project.id &&
    prevProps.project.project_code === nextProps.project.project_code &&
    prevProps.project.project_name === nextProps.project.project_name &&
    prevProps.project.project_status === nextProps.project.project_status &&
    prevProps.analytics === nextProps.analytics &&
    prevProps.onEdit === nextProps.onEdit &&
    prevProps.onDelete === nextProps.onDelete &&
    prevProps.onViewDetails === nextProps.onViewDetails &&
    prevProps.getStatusColor === nextProps.getStatusColor &&
    prevProps.getStatusText === nextProps.getStatusText
  )
})
