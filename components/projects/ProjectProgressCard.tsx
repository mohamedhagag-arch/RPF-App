'use client'

import { Project, BOQActivity } from '@/lib/supabase'
import { 
  calculateProjectProgressByUnits,
  calculateProjectProgressByValue,
  calculateWeightedProjectProgress,
  getProjectStatistics
} from '@/lib/progressCalculations'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { TrendingUp, TrendingDown, Activity, DollarSign, CheckCircle, Clock } from 'lucide-react'

interface ProjectProgressCardProps {
  project: Project
  activities: BOQActivity[]
  showDetailed?: boolean
}

export function ProjectProgressCard({ 
  project, 
  activities,
  showDetailed = false 
}: ProjectProgressCardProps) {
  const guard = usePermissionGuard()
  
  const stats = getProjectStatistics(project, activities)
  
  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'text-green-600 bg-green-100'
    if (percentage >= 80) return 'text-blue-600 bg-blue-100'
    if (percentage >= 50) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }
  
  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-green-500'
    if (percentage >= 80) return 'bg-blue-500'
    if (percentage >= 50) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  if (!showDetailed) {
    // Simple progress display
    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600 dark:text-gray-400">Progress</span>
          <span className={`font-semibold ${getProgressColor(stats.progress.byUnits)}`}>
            {stats.progress.byUnits.toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(stats.progress.byUnits)}`}
            style={{ width: `${Math.min(stats.progress.byUnits, 100)}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>{stats.activities.completed} / {stats.activities.total} activities</span>
          <span className={stats.status.status === 'on_track' ? 'text-blue-600' : 'text-red-600'}>
            {stats.status.label}
          </span>
        </div>
      </div>
    )
  }

  // Detailed progress card
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Project Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Progress Indicators */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">By Units</span>
              <span className={`text-lg font-bold ${getProgressColor(stats.progress.byUnits)}`}>
                {stats.progress.byUnits.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${getProgressBarColor(stats.progress.byUnits)}`}
                style={{ width: `${Math.min(stats.progress.byUnits, 100)}%` }}
              ></div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">By Value</span>
              <span className={`text-lg font-bold ${getProgressColor(stats.progress.byValue)}`}>
                {stats.progress.byValue.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${getProgressBarColor(stats.progress.byValue)}`}
                style={{ width: `${Math.min(stats.progress.byValue, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center justify-center">
          <div className={`px-4 py-2 rounded-full ${getProgressColor(stats.progress.byUnits)}`}>
            <span className="font-semibold">{stats.status.label}</span>
          </div>
        </div>

        {/* Activities Summary */}
        <div className="grid grid-cols-4 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.activities.total}
            </div>
            <div className="text-xs text-gray-500">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {stats.activities.completed}
            </div>
            <div className="text-xs text-gray-500">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {stats.activities.onTrack}
            </div>
            <div className="text-xs text-gray-500">On Track</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {stats.activities.delayed}
            </div>
            <div className="text-xs text-gray-500">Delayed</div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="space-y-3 pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Contract Amount
            </span>
            <span className="font-semibold">
              AED {(stats.financial.contractAmount || 0).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Earned Value</span>
            <span className="font-semibold text-green-600">
              AED {(stats.financial.earnedValue || 0).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Remaining Value</span>
            <span className="font-semibold text-orange-600">
              AED {(stats.financial.remainingValue || 0).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Completion Rate */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Completion Rate</span>
            <span className="text-sm font-bold text-blue-600">
              {stats.activities.completionRate.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="h-3 bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(stats.activities.completionRate, 100)}%` }}
            ></div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
