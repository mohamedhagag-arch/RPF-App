'use client'

import { BOQActivity } from '@/lib/supabase'

export interface ZoneInfo {
  zone_number: string
  activities_count: number
  total_planned_units: number
  total_actual_units: number
  progress_percentage: number
  zone_name?: string
  zone_description?: string
  zone_status?: 'active' | 'completed' | 'pending' | 'delayed'
  zone_priority?: 'high' | 'medium' | 'low'
  zone_color?: string
}

export interface ZoneAnalytics {
  total_zones: number
  active_zones: number
  completed_zones: number
  average_progress: number
  zone_performance: ZoneInfo[]
  zone_comparison: {
    zone: string
    performance: number
    rank: number
  }[]
  zone_recommendations: string[]
}

export interface ZoneMapping {
  zone_number: string
  zone_name: string
  zone_description?: string
  zone_color: string
  zone_priority: 'high' | 'medium' | 'low'
  zone_status: 'active' | 'completed' | 'pending' | 'delayed'
  created_at: string
  updated_at: string
}

export class ZoneManager {
  private activities: BOQActivity[]
  private kpis: any[]
  private zoneMappings: ZoneMapping[]

  constructor(activities: BOQActivity[], kpis: any[] = [], zoneMappings: ZoneMapping[] = []) {
    this.activities = activities
    this.kpis = kpis
    this.zoneMappings = zoneMappings
  }

  /**
   * Get all unique zones from activities
   */
  getUniqueZones(): string[] {
    const zones = new Set<string>()
    
    this.activities.forEach(activity => {
      if (activity.zone_number && activity.zone_number !== '0') {
        zones.add(activity.zone_number)
      }
    })
    
    return Array.from(zones).sort()
  }

  /**
   * Get zone information with enhanced details
   */
  getZoneInfo(zoneNumber: string): ZoneInfo | null {
    const zoneActivities = this.activities.filter(a => a.zone_number === zoneNumber)
    
    if (zoneActivities.length === 0) return null

    const totalPlanned = zoneActivities.reduce((sum, a) => sum + (a.planned_units || 0), 0)
    const totalActual = zoneActivities.reduce((sum, a) => sum + (a.actual_units || 0), 0)
    const progress = totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : 0

    // Find zone mapping for enhanced info
    const zoneMapping = this.zoneMappings.find(z => z.zone_number === zoneNumber)
    
    // Determine zone status based on progress
    let zoneStatus: 'active' | 'completed' | 'pending' | 'delayed' = 'pending'
    if (progress >= 100) zoneStatus = 'completed'
    else if (progress > 0) zoneStatus = 'active'
    else zoneStatus = 'pending'

    return {
      zone_number: zoneNumber,
      activities_count: zoneActivities.length,
      total_planned_units: totalPlanned,
      total_actual_units: totalActual,
      progress_percentage: Math.round(progress * 100) / 100,
      zone_name: zoneMapping?.zone_name || this.generateZoneName(zoneNumber),
      zone_description: zoneMapping?.zone_description,
      zone_status: zoneStatus,
      zone_priority: zoneMapping?.zone_priority || this.determineZonePriority(progress, zoneActivities.length),
      zone_color: zoneMapping?.zone_color || this.getZoneColor(progress)
    }
  }

  /**
   * Get comprehensive zone analytics
   */
  getZoneAnalytics(): ZoneAnalytics {
    const uniqueZones = this.getUniqueZones()
    const zoneInfos = uniqueZones.map(zone => this.getZoneInfo(zone)).filter(Boolean) as ZoneInfo[]
    
    const totalZones = zoneInfos.length
    const activeZones = zoneInfos.filter(z => z.zone_status === 'active').length
    const completedZones = zoneInfos.filter(z => z.zone_status === 'completed').length
    const averageProgress = zoneInfos.length > 0 
      ? zoneInfos.reduce((sum, z) => sum + z.progress_percentage, 0) / zoneInfos.length 
      : 0

    // Zone performance comparison
    const zoneComparison = zoneInfos
      .map(z => ({
        zone: z.zone_number,
        performance: z.progress_percentage
      }))
      .sort((a, b) => b.performance - a.performance)
      .map((z, index) => ({
        zone: z.zone,
        performance: z.performance,
        rank: index + 1
      }))

    // Generate recommendations
    const recommendations = this.generateZoneRecommendations(zoneInfos)

    return {
      total_zones: totalZones,
      active_zones: activeZones,
      completed_zones: completedZones,
      average_progress: Math.round(averageProgress * 100) / 100,
      zone_performance: zoneInfos,
      zone_comparison: zoneComparison,
      zone_recommendations: recommendations
    }
  }

  /**
   * Get activities by zone
   */
  getActivitiesByZone(zoneNumber: string): BOQActivity[] {
    return this.activities.filter(a => a.zone_number === zoneNumber)
  }

  /**
   * Get zone comparison data
   */
  getZoneComparison(): { zone: string; performance: number; rank: number }[] {
    const analytics = this.getZoneAnalytics()
    return analytics.zone_comparison
  }

  /**
   * Get zone recommendations
   */
  getZoneRecommendations(): string[] {
    const analytics = this.getZoneAnalytics()
    return analytics.zone_recommendations
  }

  /**
   * Get zone mapping for a specific zone
   */
  getZoneMapping(zoneNumber: string): ZoneMapping | null {
    return this.zoneMappings.find(z => z.zone_number === zoneNumber) || null
  }

  /**
   * Create or update zone mapping
   */
  createZoneMapping(zoneData: Partial<ZoneMapping>): ZoneMapping {
    const now = new Date().toISOString()
    return {
      zone_number: zoneData.zone_number || '0',
      zone_name: zoneData.zone_name || this.generateZoneName(zoneData.zone_number || '0'),
      zone_description: zoneData.zone_description || '',
      zone_color: zoneData.zone_color || '#3B82F6',
      zone_priority: zoneData.zone_priority || 'medium',
      zone_status: zoneData.zone_status || 'pending',
      created_at: zoneData.created_at || now,
      updated_at: now
    }
  }

  /**
   * Get zones by status
   */
  getZonesByStatus(status: 'active' | 'completed' | 'pending' | 'delayed'): ZoneInfo[] {
    const analytics = this.getZoneAnalytics()
    return analytics.zone_performance.filter(z => z.zone_status === status)
  }

  /**
   * Get zones by priority
   */
  getZonesByPriority(priority: 'high' | 'medium' | 'low'): ZoneInfo[] {
    const analytics = this.getZoneAnalytics()
    return analytics.zone_performance.filter(z => z.zone_priority === priority)
  }

  /**
   * Get zone performance summary
   */
  getZonePerformanceSummary(): {
    bestPerforming: ZoneInfo | null
    worstPerforming: ZoneInfo | null
    averageProgress: number
    totalActivities: number
    completionRate: number
  } {
    const analytics = this.getZoneAnalytics()
    const zones = analytics.zone_performance
    
    if (zones.length === 0) {
      return {
        bestPerforming: null,
        worstPerforming: null,
        averageProgress: 0,
        totalActivities: 0,
        completionRate: 0
      }
    }

    const sortedByProgress = [...zones].sort((a, b) => b.progress_percentage - a.progress_percentage)
    const totalActivities = zones.reduce((sum, z) => sum + z.activities_count, 0)
    const completedZones = zones.filter(z => z.zone_status === 'completed').length
    const completionRate = (completedZones / zones.length) * 100

    return {
      bestPerforming: sortedByProgress[0],
      worstPerforming: sortedByProgress[sortedByProgress.length - 1],
      averageProgress: analytics.average_progress,
      totalActivities,
      completionRate: Math.round(completionRate * 100) / 100
    }
  }

  // Private helper methods
  private generateZoneName(zoneNumber: string): string {
    if (!zoneNumber || zoneNumber === '0') return 'Unknown Zone'
    
    // If already has a proper name, return it
    if (zoneNumber.includes('Zone') || zoneNumber.includes('Area')) {
      return zoneNumber
    }
    
    // Generate a name based on the number
    return `Zone ${zoneNumber}`
  }

  private determineZonePriority(progress: number, activityCount: number): 'high' | 'medium' | 'low' {
    if (progress < 20 && activityCount > 5) return 'high'
    if (progress > 80) return 'low'
    return 'medium'
  }

  private getZoneColor(progress: number): string {
    if (progress >= 100) return '#10B981' // Green
    if (progress >= 75) return '#3B82F6' // Blue
    if (progress >= 50) return '#F59E0B' // Yellow
    if (progress >= 25) return '#EF4444' // Red
    return '#6B7280' // Gray
  }

  private generateZoneRecommendations(zoneInfos: ZoneInfo[]): string[] {
    const recommendations: string[] = []
    
    // Find zones with low progress
    const lowProgressZones = zoneInfos.filter(z => z.progress_percentage < 25)
    if (lowProgressZones.length > 0) {
      recommendations.push(`Focus on ${lowProgressZones.length} zones with low progress: ${lowProgressZones.map(z => z.zone_number).join(', ')}`)
    }
    
    // Find zones with high activity count but low progress
    const highActivityLowProgress = zoneInfos.filter(z => z.activities_count > 3 && z.progress_percentage < 50)
    if (highActivityLowProgress.length > 0) {
      recommendations.push(`Review resource allocation for zones with many activities but low progress: ${highActivityLowProgress.map(z => z.zone_number).join(', ')}`)
    }
    
    // Find completed zones
    const completedZones = zoneInfos.filter(z => z.zone_status === 'completed')
    if (completedZones.length > 0) {
      recommendations.push(`Celebrate completion of ${completedZones.length} zones: ${completedZones.map(z => z.zone_number).join(', ')}`)
    }
    
    return recommendations
  }
}

export const zoneUtils = {
  formatZoneName(zoneNumber: string): string {
    if (!zoneNumber || zoneNumber === '0') return 'Unknown Zone'
    return zoneNumber.includes('Zone') ? zoneNumber : `Zone ${zoneNumber}`
  },

  getZoneColor(progress: number): string {
    if (progress >= 100) return '#10B981'
    if (progress >= 75) return '#3B82F6'
    if (progress >= 50) return '#F59E0B'
    if (progress >= 25) return '#EF4444'
    return '#6B7280'
  },

  getZoneStatus(progress: number): string {
    if (progress >= 100) return 'Completed'
    if (progress >= 75) return 'On Track'
    if (progress >= 50) return 'In Progress'
    if (progress >= 25) return 'Started'
    return 'Not Started'
  },

  getZonePriorityColor(priority: 'high' | 'medium' | 'low'): string {
    switch (priority) {
      case 'high': return '#EF4444'
      case 'medium': return '#F59E0B'
      case 'low': return '#10B981'
      default: return '#6B7280'
    }
  },

  getZoneStatusColor(status: 'active' | 'completed' | 'pending' | 'delayed'): string {
    switch (status) {
      case 'active': return '#3B82F6'
      case 'completed': return '#10B981'
      case 'pending': return '#6B7280'
      case 'delayed': return '#EF4444'
      default: return '#6B7280'
    }
  }
}