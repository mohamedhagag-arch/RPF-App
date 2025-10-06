'use client'

import { Project } from '@/lib/supabase'
import { ProjectAnalytics } from '@/lib/projectAnalytics'
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
        {analytics ? (
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
                  <span className="font-bold text-gray-900 dark:text-white">{analytics.totalActivities}</span> Activities
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-purple-600" />
                <span className="text-gray-600 dark:text-gray-400">
                  <span className="font-bold text-gray-900 dark:text-white">{analytics.totalKPIs}</span> KPIs
                </span>
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

