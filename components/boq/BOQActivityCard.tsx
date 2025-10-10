'use client'

import { useState } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { BOQActivity } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Edit2, Trash2, TrendingUp, Target, Calendar } from 'lucide-react'

interface BOQActivityCardProps {
  activity: BOQActivity
  projectName: string
  onEdit: () => void
  onDelete: () => void
  onCreateKPI: () => void
}

export function BOQActivityCard({ 
  activity, 
  projectName, 
  onEdit, 
  onDelete,
  onCreateKPI 
}: BOQActivityCardProps) {
  const guard = usePermissionGuard()
  const progressPercentage = activity.planned_units > 0 
    ? (activity.actual_units / activity.planned_units) * 100 
    : 0

  const getProgressColor = () => {
    if (progressPercentage >= 100) return 'text-green-600'
    if (progressPercentage >= 80) return 'text-blue-600'
    if (progressPercentage >= 50) return 'text-yellow-600'
    return 'text-gray-600'
  }

  const getProgressBg = () => {
    if (progressPercentage >= 100) return 'bg-green-500'
    if (progressPercentage >= 80) return 'bg-blue-500'
    if (progressPercentage >= 50) return 'bg-yellow-500'
    return 'bg-gray-400'
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
              {activity.activity_name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {projectName} • {activity.activity_division || 'N/A'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              className="h-8 w-8 p-0"
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">Progress</span>
            <span className={`text-xs font-semibold ${getProgressColor()}`}>
              {progressPercentage.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all ${getProgressBg()}`}
              style={{ width: `${Math.min(progressPercentage, 100)}%` }}
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mb-3 text-xs">
          <div>
            <span className="text-gray-500">Total</span>
            <div className="font-semibold text-gray-900 dark:text-white">
              {activity.total_units?.toLocaleString() || 0}
            </div>
          </div>
          <div>
            <span className="text-gray-500">Planned</span>
            <div className="font-semibold text-blue-600">
              {activity.planned_units?.toLocaleString() || 0}
            </div>
          </div>
          <div>
            <span className="text-gray-500">Actual</span>
            <div className="font-semibold text-green-600">
              {activity.actual_units?.toLocaleString() || 0}
            </div>
          </div>
        </div>

        {/* Action: Create KPI */}
        <Button
          variant="outline"
          size="sm"
          onClick={onCreateKPI}
          className="w-full text-purple-600 border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900"
        >
          <Target className="w-4 h-4 mr-2" />
          Create Daily KPI from this Activity
        </Button>
      </CardContent>
    </Card>
  )
}

