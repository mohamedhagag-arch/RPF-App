'use client'

import { useState, useEffect } from 'react'
import { getSupabaseClient, executeQuery } from '@/lib/simpleConnectionManager'
import { useSmartLoading } from '@/lib/smartLoadingManager'
import { Project, TABLES } from '@/lib/supabase'
import { mapBOQFromDB, mapKPIFromDB } from '@/lib/dataMappers'
import { calculateProjectAnalytics } from '@/lib/projectAnalytics'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Edit, Trash2, Eye, Activity, Target, DollarSign, TrendingUp, CheckCircle, Clock, AlertTriangle } from 'lucide-react'

interface EnhancedProjectCardProps {
  project: Project
  onEdit: (project: Project) => void
  onDelete: (id: string) => void
  onViewDetails?: (project: Project) => void
  getStatusColor: (status: string) => string
  getStatusText: (status: string) => string
}

export function EnhancedProjectCard({ 
  project, 
  onEdit, 
  onDelete,
  onViewDetails,
  getStatusColor, 
  getStatusText 
}: EnhancedProjectCardProps) {
  const [quickStats, setQuickStats] = useState({
    activitiesCount: 0,
    kpisCount: 0,
    progress: 0,
    loaded: false
  })
  
  const supabase = getSupabaseClient()
  const { startSmartLoading, stopSmartLoading } = useSmartLoading('project-card')
  
  useEffect(() => {
    // Only fetch if card is visible (intersection observer could be added)
    // For now, add a small delay to prevent overwhelming the browser
    const timeoutId = setTimeout(() => {
      fetchQuickStats()
    }, Math.random() * 1000) // Random delay 0-1s to stagger requests
    
    return () => clearTimeout(timeoutId)
  }, [project])
  
  const fetchQuickStats = async () => {
    try {
      // Quick count queries - fixed OR syntax
      const [activitiesData, kpisData] = await Promise.all([
        supabase
          .from(TABLES.BOQ_ACTIVITIES)
          .select('*')
          .eq('Project Code', project.project_code),
        supabase
          .from(TABLES.KPI) // ✅ Use main KPI table
          .select('*')
          .eq('Project Full Code', project.project_code)
      ])
      
      const activities = (activitiesData.data || []).map(mapBOQFromDB)
      const avgProgress = activities.length > 0
        ? activities.reduce((sum, a) => sum + (a.activity_progress_percentage || 0), 0) / activities.length
        : 0
      
      setQuickStats({
        activitiesCount: activities.length,
        kpisCount: kpisData.data?.length || 0,
        progress: avgProgress,
        loaded: true
      })
    } catch (error) {
      console.error('Error fetching quick stats:', error)
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
    if (progress >= 90) return 'bg-green-600'
    if (progress >= 70) return 'bg-blue-600'
    if (progress >= 50) return 'bg-yellow-600'
    return 'bg-red-600'
  }

  return (
    <Card className="hover:shadow-lg transition-all duration-200 border-l-4" style={{
      borderLeftColor: quickStats.progress >= 70 ? '#16a34a' : quickStats.progress >= 40 ? '#eab308' : '#dc2626'
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
        {/* Quick Stats */}
        {quickStats.loaded && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-3">
            {/* Progress Bar */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600 dark:text-gray-400">Progress</span>
                <span className="font-bold">{formatPercent(quickStats.progress)}</span>
              </div>
              <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className={`${getProgressColor(quickStats.progress)} h-2 rounded-full transition-all duration-500`}
                  style={{ width: `${Math.min(quickStats.progress, 100)}%` }}
                />
              </div>
            </div>
            
            {/* Counts */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-600" />
                <span className="text-gray-600 dark:text-gray-400">
                  <span className="font-bold text-gray-900 dark:text-white">{quickStats.activitiesCount}</span> Activities
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-purple-600" />
                <span className="text-gray-600 dark:text-gray-400">
                  <span className="font-bold text-gray-900 dark:text-white">{quickStats.kpisCount}</span> KPIs
                </span>
              </div>
            </div>
          </div>
        )}
        
        {/* Project Details */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-xs">Type</p>
            <p className="font-medium text-gray-900 dark:text-white truncate">{project.project_type || 'Not specified'}</p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-xs">Division</p>
            <p className="font-medium text-gray-900 dark:text-white truncate">{project.responsible_division || 'Not specified'}</p>
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

