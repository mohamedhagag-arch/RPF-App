'use client'

import { useState, useEffect } from 'react'
import { ModernCard } from '@/components/ui/ModernCard'
import { ModernButton } from '@/components/ui/ModernButton'
import { ModernBadge } from '@/components/ui/ModernBadge'
import { 
  CustomActivity, 
  loadCustomActivities,
  deleteCustomActivity,
  exportCustomActivities,
  importCustomActivities 
} from '@/lib/customActivities'
import { Sparkles, Trash2, Download, Upload, TrendingUp, Info } from 'lucide-react'

export function CustomActivitiesManager() {
  const [activities, setActivities] = useState<CustomActivity[]>([])

  useEffect(() => {
    loadActivities()
  }, [])

  const loadActivities = () => {
    const loaded = loadCustomActivities()
    setActivities(loaded)
  }

  const handleDelete = (activityName: string, division: string) => {
    if (confirm(`Delete "${activityName}"?`)) {
      deleteCustomActivity(activityName, division)
      loadActivities()
    }
  }

  const handleExport = () => {
    const json = exportCustomActivities()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'custom-activities.json'
    a.click()
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const json = event.target?.result as string
        if (importCustomActivities(json)) {
          loadActivities()
          alert('✅ Custom activities imported successfully!')
        } else {
          alert('❌ Failed to import activities')
        }
      }
      reader.readAsText(file)
    }
  }

  // Group by division
  const grouped = activities.reduce((acc, activity) => {
    const div = activity.division || 'Other'
    if (!acc[div]) acc[div] = []
    acc[div].push(activity)
    return acc
  }, {} as Record<string, CustomActivity[]>)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Custom Activities
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Activities you've added that aren't in the default templates
          </p>
        </div>

        <div className="flex gap-3">
          <ModernButton
            variant="outline"
            onClick={handleExport}
            icon={<Download className="h-4 w-4" />}
            size="sm"
            disabled={activities.length === 0}
          >
            Export
          </ModernButton>
          
          <label className="cursor-pointer">
            <div className="inline-block">
              <ModernButton
                variant="primary"
                icon={<Upload className="h-4 w-4" />}
                size="sm"
                type="button"
              >
                Import
              </ModernButton>
            </div>
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Info Card */}
      <ModernCard className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-purple-600 mt-0.5" />
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">
              Auto-Learning System
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              When you create a BOQ activity with a custom name (not in templates), it's automatically saved here for future use.
            </p>
          </div>
        </div>
      </ModernCard>

      {/* Activities List */}
      {activities.length === 0 ? (
        <ModernCard className="text-center py-12">
          <Sparkles className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            No custom activities yet
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
            Create your first custom activity in BOQ Management
          </p>
        </ModernCard>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([division, divActivities]) => (
            <ModernCard key={division}>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 dark:text-white">
                    {division}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {divActivities.length} custom {divActivities.length === 1 ? 'activity' : 'activities'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {divActivities
                  .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
                  .map((activity, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {activity.name}
                          </p>
                          <ModernBadge variant="info" size="sm">
                            {activity.unit}
                          </ModernBadge>
                          {activity.typical_duration && (
                            <ModernBadge variant="purple" size="sm">
                              {activity.typical_duration} days
                            </ModernBadge>
                          )}
                          {activity.usage_count && activity.usage_count > 1 && (
                            <ModernBadge variant="success" size="sm" icon={<TrendingUp className="h-3 w-3" />}>
                              Used {activity.usage_count}x
                            </ModernBadge>
                          )}
                        </div>
                        {activity.created_at && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Added: {new Date(activity.created_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => handleDelete(activity.name, activity.division)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
              </div>
            </ModernCard>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {activities.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ModernCard className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {activities.length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Total Custom Activities
              </p>
            </div>
          </ModernCard>

          <ModernCard className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20">
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {Object.keys(grouped).length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Divisions Covered
              </p>
            </div>
          </ModernCard>

          <ModernCard className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {activities.reduce((sum, a) => sum + (a.usage_count || 0), 0)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Total Usage Count
              </p>
            </div>
          </ModernCard>
        </div>
      )}
    </div>
  )
}

