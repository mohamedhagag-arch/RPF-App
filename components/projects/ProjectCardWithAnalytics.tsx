'use client'

import { useState, useEffect } from 'react'
import { Project, TABLES } from '@/lib/supabase'
import { ProjectAnalytics, calculateProjectAnalytics } from '@/lib/projectAnalytics'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
import { mapBOQFromDB, mapKPIFromDB } from '@/lib/dataMappers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Edit, Trash2, Eye, Activity, Target, DollarSign } from 'lucide-react'

interface ProjectCardWithAnalyticsProps {
  project: Project
  analytics: ProjectAnalytics | null
  onEdit: (project: Project) => void
  onDelete: (id: string) => void
  onViewDetails?: (project: Project) => void
  getStatusColor: (status: string) => string
  getStatusText: (status: string) => string
}

/**
 * Project Card that receives pre-calculated analytics
 * No fetching - just displays the data passed from parent
 * This prevents the "too many requests" problem
 */
export function ProjectCardWithAnalytics({ 
  project, 
  analytics,
  onEdit, 
  onDelete,
  onViewDetails,
  getStatusColor, 
  getStatusText 
}: ProjectCardWithAnalyticsProps) {
  const [fallbackAnalytics, setFallbackAnalytics] = useState<ProjectAnalytics | null>(null)
  const [loadingFallback, setLoadingFallback] = useState(false)
  const supabase = getSupabaseClient()
  
  // 🔧 FALLBACK: If no analytics provided, fetch them directly
  useEffect(() => {
    if (!analytics && !loadingFallback) {
      console.log(`🔄 No analytics provided for ${project.project_code}, fetching directly...`)
      // Add a small delay to prevent overwhelming the server
      const timeoutId = setTimeout(() => {
        fetchAnalyticsDirectly()
      }, 100)
      
      return () => clearTimeout(timeoutId)
    }
  }, [analytics, project.project_code])
  
  const fetchAnalyticsDirectly = async () => {
    try {
      setLoadingFallback(true)
      console.log(`📊 Fetching analytics directly for ${project.project_code}`)
      
      // Fetch activities for this project
      const { data: activitiesData, error: activitiesError } = await supabase
        .from(TABLES.BOQ_ACTIVITIES)
        .select('*')
        .or(`Project Code.eq.${project.project_code},Project Full Code.like.${project.project_code}%`)
      
      if (activitiesError) {
        console.error('❌ Error fetching activities:', activitiesError)
      }
      
      // Fetch KPIs for this project
      const { data: kpisData, error: kpisError } = await supabase
        .from(TABLES.KPI)
        .select('*')
        .or(`Project Full Code.eq.${project.project_code},Project Code.eq.${project.project_code},Project Full Code.like.${project.project_code}%`)
      
      if (kpisError) {
        console.error('❌ Error fetching KPIs:', kpisError)
      }
      
      const activities = (activitiesData || []).map(mapBOQFromDB)
      const kpis = (kpisData || []).map(mapKPIFromDB)
      
      console.log(`✅ Direct fetch: ${activities.length} activities, ${kpis.length} KPIs for ${project.project_code}`)
      
      // Calculate analytics
      const calculatedAnalytics = calculateProjectAnalytics(project, activities, kpis)
      setFallbackAnalytics(calculatedAnalytics)
      
    } catch (error) {
      console.error('❌ Error in fallback analytics:', error)
    } finally {
      setLoadingFallback(false)
    }
  }
  
  // Use fallback analytics if main analytics is not available
  const finalAnalytics = analytics || fallbackAnalytics
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
    if (progress >= 90) return 'bg-green-600'
    if (progress >= 70) return 'bg-blue-600'
    if (progress >= 50) return 'bg-yellow-600'
    return 'bg-red-600'
  }
  
  const getBorderColor = (progress: number) => {
    if (progress >= 70) return '#16a34a' // green
    if (progress >= 40) return '#eab308' // yellow
    return '#3b82f6' // blue instead of red
  }

  const progress = finalAnalytics?.overallProgress || 0

  // 🔍 DEBUG: Log analytics data to console
  console.log(`🔍 ProjectCard Analytics for ${project.project_code}:`, {
    mainAnalytics: analytics,
    fallbackAnalytics: fallbackAnalytics,
    finalAnalytics: finalAnalytics,
    totalActivities: finalAnalytics?.totalActivities,
    totalKPIs: finalAnalytics?.totalKPIs,
    overallProgress: finalAnalytics?.overallProgress,
    project: {
      code: project.project_code,
      name: project.project_name,
      contract_amount: project.contract_amount
    }
  })
  
  // 🔍 DEBUG: Check if analytics is null
  if (!finalAnalytics) {
    console.warn(`⚠️ NO ANALYTICS for project ${project.project_code}!`)
    console.log('🔍 This means both main and fallback analytics failed')
  } else {
    console.log(`✅ Analytics available for ${project.project_code}:`, {
      source: analytics ? 'main' : 'fallback',
      totalActivities: finalAnalytics.totalActivities,
      totalKPIs: finalAnalytics.totalKPIs,
      overallProgress: finalAnalytics.overallProgress,
      projectHealth: finalAnalytics.projectHealth,
      riskLevel: finalAnalytics.riskLevel
    })
  }

  return (
    <Card className="hover:shadow-lg transition-all duration-200 border-l-4" style={{
      borderLeftColor: getBorderColor(progress)
    }}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg mb-1">{project.project_name}</CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs">
                {project.project_code}
              </Badge>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.project_status)}`}>
                {getStatusText(project.project_status)}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress and Stats (only if analytics available) */}
        {finalAnalytics ? (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-3">
            {/* Progress Bar */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600 dark:text-gray-400">Progress</span>
                <span className="font-bold">{formatPercent(progress)}</span>
              </div>
              <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className={`${getProgressColor(progress)} h-2 rounded-full transition-all duration-500`}
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            </div>
            
            {/* Counts */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-600" />
                <span className="text-gray-600 dark:text-gray-400">
                  <span className="font-bold text-gray-900 dark:text-white">{finalAnalytics.totalActivities}</span> Activities
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-purple-600" />
                <span className="text-gray-600 dark:text-gray-400">
                  <span className="font-bold text-gray-900 dark:text-white">{finalAnalytics.totalKPIs}</span> KPIs
                </span>
              </div>
            </div>
            
            {/* Health Badge */}
            <div className="flex gap-2">
              <Badge className="bg-orange-100 text-orange-800 font-bold">
                WARNING
              </Badge>
              <Badge className="bg-green-100 text-green-800">
                Risk: LOW
              </Badge>
            </div>
          </div>
        ) : (
          // Fallback - basic info only
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {loadingFallback ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <p>Loading analytics...</p>
              </div>
            ) : (
              <p>No analytics available</p>
            )}
          </div>
        )}
        
        {/* Project Details */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-xs">Type</p>
            <p className="font-bold text-gray-900 dark:text-white truncate">{project.project_type || 'Not specified'}</p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-xs">Division</p>
            <p className="font-bold text-gray-900 dark:text-white truncate">{project.responsible_division || 'Not specified'}</p>
          </div>
        </div>
        
        {/* Contract Amount */}
        <div className="flex items-center gap-2 text-sm">
          <DollarSign className="h-4 w-4 text-green-600" />
          <span className="text-gray-600 dark:text-gray-400">Contract:</span>
          <span className="font-bold text-green-600">{formatCurrency(project.contract_amount)}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-2 pt-3 border-t dark:border-gray-700">
          {onViewDetails && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onViewDetails(project)}
              className="flex items-center space-x-1"
            >
              <Eye className="h-4 w-4" />
              <span>Details</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(project)}
            className="flex items-center space-x-1"
          >
            <Edit className="h-4 w-4" />
            <span>Edit</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(project.id)}
            className="flex items-center space-x-1 text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

