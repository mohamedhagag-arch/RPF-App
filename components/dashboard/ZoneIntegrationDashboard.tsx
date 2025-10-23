'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ZoneManager, ZoneAnalytics, zoneUtils } from '@/lib/zoneManager'
import { ZoneAnalytics as ZoneAnalyticsComponent } from '@/components/analytics/ZoneAnalytics'
import { ZoneFilter } from '@/components/filters/ZoneFilter'
import { BOQActivity } from '@/lib/supabase'
import { 
  Target, 
  BarChart3, 
  Filter, 
  RefreshCw,
  Download,
  Upload,
  Settings
} from 'lucide-react'

interface ZoneIntegrationDashboardProps {
  activities: BOQActivity[]
  kpis?: any[]
  onZoneSelect?: (zoneRef: string | null) => void
  selectedZone?: string | null
}

export function ZoneIntegrationDashboard({ 
  activities, 
  kpis = [], 
  onZoneSelect,
  selectedZone 
}: ZoneIntegrationDashboardProps) {
  const [zoneManager, setZoneManager] = useState<ZoneManager | null>(null)
  const [analytics, setAnalytics] = useState<ZoneAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'filter'>('overview')

  useEffect(() => {
    const manager = new ZoneManager(activities, kpis)
    const zoneAnalytics = manager.getZoneAnalytics()
    
    setZoneManager(manager)
    setAnalytics(zoneAnalytics)
    setLoading(false)
  }, [activities, kpis])

  const handleZoneSelect = (zoneRef: string | null) => {
    if (onZoneSelect) {
      onZoneSelect(zoneRef)
    }
  }

  const handleRefresh = () => {
    setLoading(true)
    setTimeout(() => {
      const manager = new ZoneManager(activities, kpis)
      const zoneAnalytics = manager.getZoneAnalytics()
      
      setZoneManager(manager)
      setAnalytics(zoneAnalytics)
      setLoading(false)
    }, 500)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!analytics || !zoneManager) {
    return (
      <div className="text-center p-8 text-gray-500">
        No zone data available
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Zone Integration Dashboard
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Comprehensive zone management and analytics
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'overview'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Target className="h-4 w-4" />
          <span>Overview</span>
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'analytics'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          <span>Analytics</span>
        </button>
        <button
          onClick={() => setActiveTab('filter')}
          className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'filter'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Filter className="h-4 w-4" />
          <span>Filter</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Target className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Zones</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.total_zones}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Target className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Zones</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.active_zones}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <BarChart3 className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Avg Progress</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.average_progress}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Zone List */}
          <Card>
            <CardHeader>
              <CardTitle>Zone Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.zone_performance.map((zone, index) => {
                  const color = zoneUtils.getZoneColor(zone.progress_percentage)
                  const status = zoneUtils.getZoneStatus(zone.progress_percentage)
                  
                  return (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 rounded-full bg-gray-300" />
                        <div>
                          <p className="font-medium">{zone.zone_ref}</p>
                          <p className="text-sm text-gray-500">{zone.activities_count} activities</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="text-sm font-medium">{zone.progress_percentage}%</p>
                          <p className="text-xs text-gray-500">{status}</p>
                        </div>
                        <div className="w-16 h-2 bg-gray-200 rounded-full">
                          <div 
                            className={`h-2 rounded-full ${
                              color === 'green' ? 'bg-green-500' :
                              color === 'yellow' ? 'bg-yellow-500' :
                              color === 'orange' ? 'bg-orange-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(zone.progress_percentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'analytics' && (
        <ZoneAnalyticsComponent activities={activities} kpis={kpis} />
      )}

      {activeTab === 'filter' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ZoneFilter 
            activities={activities} 
            kpis={kpis} 
            onZoneSelect={handleZoneSelect}
            selectedZone={selectedZone}
          />
          <Card>
            <CardHeader>
              <CardTitle>Filter Results</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedZone ? (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="font-medium text-blue-900 dark:text-blue-100">
                      Filtering by: {selectedZone}
                    </p>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>• Activities filtered by selected zone</p>
                    <p>• Analytics updated for zone-specific data</p>
                    <p>• Performance metrics focused on this zone</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Filter className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Select a zone to see filtered results</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}