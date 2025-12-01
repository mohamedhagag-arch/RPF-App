'use client'

import { useState, useEffect } from 'react'
import { ZoneManager, ZoneInfo } from '@/lib/zoneManager'
import { BOQActivity } from '@/lib/supabase'
import { ModernCard } from '@/components/ui/ModernCard'
import { ModernBadge } from '@/components/ui/ModernBadge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { 
  Search, 
  Filter, 
  MapPin, 
  Target, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  TrendingUp,
  BarChart3,
  X
} from 'lucide-react'

interface ZoneFilterProps {
  activities: BOQActivity[]
  kpis?: any[]
  onZoneSelect?: (zoneRef: string | null) => void
  selectedZone?: string | null
}

export function ZoneFilter({ 
  activities, 
  kpis = [], 
  onZoneSelect,
  selectedZone 
}: ZoneFilterProps) {
  const [zoneManager, setZoneManager] = useState<ZoneManager | null>(null)
  const [zones, setZones] = useState<ZoneInfo[]>([])
  const [filteredZones, setFilteredZones] = useState<ZoneInfo[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'name' | 'progress' | 'activities'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const manager = new ZoneManager(activities, kpis)
    const zoneAnalytics = manager.getZoneAnalytics()
    
    setZoneManager(manager)
    setZones(zoneAnalytics.zone_performance)
    setFilteredZones(zoneAnalytics.zone_performance)
    setLoading(false)
  }, [activities, kpis])

  // Filter and sort zones
  useEffect(() => {
    let filtered = [...zones]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(zone => 
        zone.zone_ref.toLowerCase().includes(searchTerm.toLowerCase()) ||
        zone.zone_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        zone.zone_number?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(zone => zone.zone_status === statusFilter)
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(zone => zone.zone_priority === priorityFilter)
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'name':
          comparison = (a.zone_name || a.zone_ref).localeCompare(b.zone_name || b.zone_ref)
          break
        case 'progress':
          comparison = a.progress_percentage - b.progress_percentage
          break
        case 'activities':
          comparison = a.activities_count - b.activities_count
          break
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })

    setFilteredZones(filtered)
  }, [zones, searchTerm, statusFilter, priorityFilter, sortBy, sortOrder])

  const handleZoneClick = (zoneRef: string) => {
    if (onZoneSelect) {
      onZoneSelect(selectedZone === zoneRef ? null : zoneRef)
    }
  }

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setPriorityFilter('all')
    setSortBy('name')
    setSortOrder('asc')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'active': return 'bg-blue-100 text-blue-800'
      case 'pending': return 'bg-gray-100 text-gray-800'
      case 'delayed': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <ModernCard>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Zone Filters
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="text-gray-600 hover:text-gray-800"
            >
              <X className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search Zones
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search zones..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="delayed">Delayed</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority
              </label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Priority</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sort By
              </label>
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'name' | 'progress' | 'activities')}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="name">Name</option>
                  <option value="progress">Progress</option>
                  <option value="activities">Activities</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </ModernCard>

      {/* Zone List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredZones.map((zone) => (
          <ModernCard
            key={zone.zone_ref}
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
              selectedZone === zone.zone_ref 
                ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                : 'hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
            onClick={() => handleZoneClick(zone.zone_ref)}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                    <MapPin className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {zone.zone_name || zone.zone_ref}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {zone.zone_number ? `#${zone.zone_number}` : 'No number'}
                    </p>
                  </div>
                </div>
                {selectedZone === zone.zone_ref && (
                  <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                    <CheckCircle className="h-4 w-4 text-blue-600" />
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {/* Progress Bar */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Progress
                    </span>
                    <span className={`text-sm font-bold ${getProgressColor(zone.progress_percentage)}`}>
                      {zone.progress_percentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(zone.progress_percentage, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">
                      {zone.activities_count} activities
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">
                      {zone.total_planned_units.toLocaleString()} planned
                    </span>
                  </div>
                </div>

                {/* Status and Priority */}
                <div className="flex items-center justify-between">
                  <ModernBadge 
                    variant={zone.zone_status === 'completed' ? 'success' : 
                            zone.zone_status === 'active' ? 'info' : 
                            zone.zone_status === 'delayed' ? 'error' : 'gray'}
                    size="sm"
                  >
                    {zone.zone_status || 'Unknown'}
                  </ModernBadge>
                  
                  {zone.zone_priority && (
                    <ModernBadge 
                      variant={zone.zone_priority === 'high' ? 'error' : 
                              zone.zone_priority === 'medium' ? 'warning' : 'success'}
                      size="sm"
                    >
                      {zone.zone_priority}
                    </ModernBadge>
                  )}
                </div>
              </div>
            </div>
          </ModernCard>
        ))}
      </div>

      {/* No Results */}
      {filteredZones.length === 0 && (
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No zones found
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Try adjusting your filters or search terms
          </p>
        </div>
      )}
    </div>
  )
}