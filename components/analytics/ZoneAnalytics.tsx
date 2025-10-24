'use client'

import { useState, useEffect } from 'react'
import { ZoneManager, ZoneAnalytics as ZoneAnalyticsType, ZoneInfo } from '@/lib/zoneManager'
import { BOQActivity } from '@/lib/supabase'
import { ModernCard } from '@/components/ui/ModernCard'
import { ModernBadge } from '@/components/ui/ModernBadge'
import { TrendingUp, TrendingDown, Target, CheckCircle, AlertCircle, Clock, BarChart3, MapPin } from 'lucide-react'

interface ZoneAnalyticsProps {
  activities: BOQActivity[]
  kpis?: any[]
}

export function ZoneAnalytics({ activities, kpis = [] }: ZoneAnalyticsProps) {
  const [analytics, setAnalytics] = useState<ZoneAnalyticsType | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedZone, setSelectedZone] = useState<string | null>(null)

  useEffect(() => {
    const zoneManager = new ZoneManager(activities, kpis)
    const zoneAnalytics = zoneManager.getZoneAnalytics()
    setAnalytics(zoneAnalytics)
    setLoading(false)
  }, [activities, kpis])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="text-center p-8">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">No zone analytics available</p>
      </div>
    )
  }

  const getZoneStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'active': return 'bg-blue-100 text-blue-800'
      case 'pending': return 'bg-gray-100 text-gray-800'
      case 'delayed': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'text-green-600'
    if (progress >= 75) return 'text-blue-600'
    if (progress >= 50) return 'text-yellow-600'
    if (progress >= 25) return 'text-orange-600'
    return 'text-red-600'
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ModernCard className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
              <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Zones</p>
              <p className="text-2xl font-bold text-blue-600">{analytics.total_zones}</p>
              </div>
            <MapPin className="h-8 w-8 text-blue-600" />
            </div>
        </ModernCard>

        <ModernCard className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between">
              <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Zones</p>
              <p className="text-2xl font-bold text-green-600">{analytics.active_zones}</p>
              </div>
            <Target className="h-8 w-8 text-green-600" />
            </div>
        </ModernCard>

        <ModernCard className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between">
              <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed</p>
              <p className="text-2xl font-bold text-purple-600">{analytics.completed_zones}</p>
              </div>
            <CheckCircle className="h-8 w-8 text-purple-600" />
            </div>
        </ModernCard>

        <ModernCard className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800">
          <div className="flex items-center justify-between">
              <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Progress</p>
              <p className="text-2xl font-bold text-amber-600">{analytics.average_progress.toFixed(1)}%</p>
              </div>
            <BarChart3 className="h-8 w-8 text-amber-600" />
            </div>
        </ModernCard>
      </div>

      {/* Zone Performance Table */}
      <ModernCard>
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Zone Performance
          </h3>
        </div>
        
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Zone
                  </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Activities
                  </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Planned Units
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actual Units
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Progress
                  </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {analytics.zone_performance.map((zone, index) => (
                <tr 
                  key={zone.zone_ref}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer ${
                    selectedZone === zone.zone_ref ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                  onClick={() => setSelectedZone(selectedZone === zone.zone_ref ? null : zone.zone_ref)}
                >
                      <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                          <span className="text-white text-sm font-bold">{index + 1}</span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {zone.zone_name || zone.zone_ref}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {zone.zone_number ? `#${zone.zone_number}` : 'No number'}
                        </div>
                      </div>
                        </div>
                      </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {zone.activities_count}
                      </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {zone.total_planned_units.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {zone.total_actual_units.toLocaleString()}
                  </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(zone.progress_percentage, 100)}%` }}
                            />
                          </div>
                      <span className={`text-sm font-medium ${getProgressColor(zone.progress_percentage)}`}>
                        {zone.progress_percentage.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                    <ModernBadge 
                      variant={zone.zone_status === 'completed' ? 'success' : 
                              zone.zone_status === 'active' ? 'info' : 
                              zone.zone_status === 'delayed' ? 'error' : 'gray'}
                      size="sm"
                    >
                      {zone.zone_status || 'Unknown'}
                    </ModernBadge>
                      </td>
                    </tr>
              ))}
              </tbody>
            </table>
          </div>
      </ModernCard>

      {/* Zone Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ModernCard>
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Top Performing Zones
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {analytics.zone_comparison.slice(0, 5).map((zone, index) => (
                <div key={zone.zone} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">{index + 1}</span>
                    </div>
                    <span className="ml-3 text-sm font-medium text-gray-900 dark:text-white">
                      {zone.zone}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-green-600">
                    {zone.performance.toFixed(1)}%
                  </span>
                </div>
              ))}
                </div>
              </div>
        </ModernCard>

        <ModernCard>
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Recommendations
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {analytics.zone_recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <span className="text-blue-600 text-xs font-bold">{index + 1}</span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{recommendation}</p>
                </div>
              ))}
                </div>
              </div>
        </ModernCard>
          </div>
    </div>
  )
}