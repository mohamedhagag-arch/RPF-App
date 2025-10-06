'use client'

import { Project } from '@/lib/supabase'
import { ProjectAnalytics } from '@/lib/projectAnalytics'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Edit, Trash2, Eye, Activity, Target, DollarSign, Building, Hash, Calendar, TrendingUp, BarChart3 } from 'lucide-react'

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
    return '#dc2626' // red
  }

  const progress = analytics?.overallProgress || 0

  return (
    <Card className="hover:shadow-xl transition-all duration-300 hover:scale-105 border-0 bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/30 dark:from-gray-800 dark:via-blue-900/20 dark:to-indigo-900/20 shadow-lg border-l-4" style={{
      borderLeftColor: getBorderColor(progress)
    }}>
      <CardHeader className="pb-4 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-700 dark:via-blue-800/30 dark:to-purple-800/30 rounded-t-lg">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <Building className="h-5 w-5 text-blue-600" />
              {project.project_name}
            </CardTitle>
            <div className="flex gap-2 flex-wrap items-center">
              <Badge variant="outline" className="text-xs font-semibold px-2 py-1 bg-white/80 dark:bg-gray-800/80">
                <Hash className="h-3 w-3 mr-1" />
                {project.project_code}
              </Badge>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${getStatusColor(project.project_status)}`}>
                {getStatusText(project.project_status)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">Analytics</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 p-6">
        {/* Progress and Stats (only if analytics available) */}
        {analytics ? (
          <div className="space-y-4">
            {/* Enhanced Progress Bar */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  Overall Progress
                </span>
                <span className="text-lg font-bold text-blue-700 dark:text-blue-400">{formatPercent(progress)}</span>
              </div>
              <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-3 shadow-inner">
                <div 
                  className={`${getProgressColor(progress)} h-3 rounded-full transition-all duration-700 shadow-sm`}
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            </div>
            
            {/* Enhanced Counts */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <Activity className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Activities</p>
                  <p className="text-lg font-bold text-green-700 dark:text-green-400">{analytics.totalActivities}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <Target className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">KPIs</p>
                  <p className="text-lg font-bold text-purple-700 dark:text-purple-400">{analytics.totalKPIs}</p>
                </div>
              </div>
            </div>
            
            {/* Health Badge */}
            {analytics.projectHealth && (
              <div className="flex gap-2">
                <Badge className={
                  analytics.projectHealth === 'excellent' ? 'bg-green-100 text-green-800' :
                  analytics.projectHealth === 'good' ? 'bg-blue-100 text-blue-800' :
                  analytics.projectHealth === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }>
                  {analytics.projectHealth.toUpperCase()}
                </Badge>
                <Badge className={
                  analytics.riskLevel === 'low' ? 'bg-green-100 text-green-800' :
                  analytics.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  analytics.riskLevel === 'high' ? 'bg-orange-100 text-orange-800' :
                  'bg-red-100 text-red-800'
                }>
                  Risk: {analytics.riskLevel.toUpperCase()}
                </Badge>
              </div>
            )}
          </div>
        ) : (
          // Fallback - basic info only
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <p>Loading analytics...</p>
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

