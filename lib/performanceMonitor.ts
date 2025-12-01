/**
 * Performance Monitor - مراقب الأداء الشامل
 * 
 * نظام مراقبة وتحسين الأداء في الوقت الفعلي
 */

import { fastQueryExecutor } from './fastConnectionManager'
import { criticalDataPreloader } from './ultraFastLoading'

// ✅ Performance metrics interface
interface PerformanceMetrics {
  timestamp: number
  pageLoadTime: number
  queryCount: number
  cacheHitRate: number
  averageQueryTime: number
  slowQueries: string[]
  memoryUsage: number
  connectionStatus: 'connected' | 'disconnected' | 'slow'
}

// ✅ Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  SLOW_QUERY_TIME: 5000, // 5 seconds
  HIGH_MEMORY_USAGE: 100 * 1024 * 1024, // 100MB
  LOW_CACHE_HIT_RATE: 0.7, // 70%
  MAX_QUERIES_PER_MINUTE: 100
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: PerformanceMetrics[] = []
  private maxMetricsHistory = 100
  private isMonitoring = false
  private monitoringInterval: NodeJS.Timeout | null = null
  private queryTimes: number[] = []
  private cacheHits = 0
  private cacheMisses = 0
  private queryCount = 0
  private startTime = Date.now()

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) return

    this.isMonitoring = true
    console.log('🚀 Performance monitoring started')

    // Monitor every 30 seconds
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics()
    }, 30000)

    // Initial metrics collection
    this.collectMetrics()
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return

    this.isMonitoring = false
    console.log('⏹️ Performance monitoring stopped')

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
  }

  /**
   * Collect performance metrics
   */
  private collectMetrics(): void {
    const timestamp = Date.now()
    const pageLoadTime = performance.now()
    
    // Calculate cache hit rate
    const totalCacheRequests = this.cacheHits + this.cacheMisses
    const cacheHitRate = totalCacheRequests > 0 ? this.cacheHits / totalCacheRequests : 0

    // Calculate average query time
    const averageQueryTime = this.queryTimes.length > 0 
      ? this.queryTimes.reduce((a, b) => a + b, 0) / this.queryTimes.length 
      : 0

    // Get memory usage
    const memoryUsage = this.getMemoryUsage()

    // Get connection status
    const connectionStatus = this.getConnectionStatus()

    // Identify slow queries
    const slowQueries = this.queryTimes
      .map((time, index) => ({ time, index }))
      .filter(({ time }) => time > PERFORMANCE_THRESHOLDS.SLOW_QUERY_TIME)
      .map(({ index }) => `query_${index}`)

    const metrics: PerformanceMetrics = {
      timestamp,
      pageLoadTime,
      queryCount: this.queryCount,
      cacheHitRate,
      averageQueryTime,
      slowQueries,
      memoryUsage,
      connectionStatus
    }

    this.metrics.push(metrics)

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory)
    }

    // Check for performance issues
    this.checkPerformanceIssues(metrics)

    console.log('📊 Performance metrics collected:', {
      queryCount: metrics.queryCount,
      cacheHitRate: (metrics.cacheHitRate * 100).toFixed(1) + '%',
      averageQueryTime: metrics.averageQueryTime.toFixed(0) + 'ms',
      memoryUsage: (metrics.memoryUsage / 1024 / 1024).toFixed(1) + 'MB'
    })
  }

  /**
   * Record query execution
   */
  recordQuery(queryTime: number, cacheHit: boolean = false): void {
    this.queryCount++
    this.queryTimes.push(queryTime)
    
    if (cacheHit) {
      this.cacheHits++
    } else {
      this.cacheMisses++
    }

    // Keep only recent query times
    if (this.queryTimes.length > 50) {
      this.queryTimes = this.queryTimes.slice(-50)
    }
  }

  /**
   * Get memory usage
   */
  private getMemoryUsage(): number {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      return (performance as any).memory?.usedJSHeapSize || 0
    }
    return 0
  }

  /**
   * Get connection status
   */
  private getConnectionStatus(): 'connected' | 'disconnected' | 'slow' {
    const recentMetrics = this.metrics.slice(-5)
    if (recentMetrics.length === 0) return 'connected'

    const averageQueryTime = recentMetrics.reduce((sum, m) => sum + m.averageQueryTime, 0) / recentMetrics.length
    
    if (averageQueryTime > PERFORMANCE_THRESHOLDS.SLOW_QUERY_TIME) {
      return 'slow'
    }

    return 'connected'
  }

  /**
   * Check for performance issues
   */
  private checkPerformanceIssues(metrics: PerformanceMetrics): void {
    const issues: string[] = []

    // Check for slow queries
    if (metrics.averageQueryTime > PERFORMANCE_THRESHOLDS.SLOW_QUERY_TIME) {
      issues.push('Slow queries detected')
    }

    // Check for high memory usage
    if (metrics.memoryUsage > PERFORMANCE_THRESHOLDS.HIGH_MEMORY_USAGE) {
      issues.push('High memory usage detected')
    }

    // Check for low cache hit rate
    if (metrics.cacheHitRate < PERFORMANCE_THRESHOLDS.LOW_CACHE_HIT_RATE) {
      issues.push('Low cache hit rate')
    }

    // Check for too many queries
    if (metrics.queryCount > PERFORMANCE_THRESHOLDS.MAX_QUERIES_PER_MINUTE) {
      issues.push('Too many queries per minute')
    }

    if (issues.length > 0) {
      console.warn('⚠️ Performance issues detected:', issues)
      this.handlePerformanceIssues(issues)
    }
  }

  /**
   * Handle performance issues
   */
  private handlePerformanceIssues(issues: string[]): void {
    // Clear cache if memory usage is high
    if (issues.includes('High memory usage detected')) {
      console.log('🧹 Clearing cache due to high memory usage')
      fastQueryExecutor.clearCache()
      criticalDataPreloader.clearPreloadedData()
    }

    // Optimize queries if too many
    if (issues.includes('Too many queries per minute')) {
      console.log('🔄 Optimizing query frequency')
      // Implement query batching or debouncing
    }
  }

  /**
   * Get current performance metrics
   */
  getCurrentMetrics(): PerformanceMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null
  }

  /**
   * Get performance history
   */
  getMetricsHistory(): PerformanceMetrics[] {
    return [...this.metrics]
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    averagePageLoadTime: number
    averageQueryTime: number
    cacheHitRate: number
    totalQueries: number
    memoryUsage: number
    connectionStatus: string
    recommendations: string[]
  } {
    const recentMetrics = this.metrics.slice(-10) // Last 10 measurements
    
    if (recentMetrics.length === 0) {
      return {
        averagePageLoadTime: 0,
        averageQueryTime: 0,
        cacheHitRate: 0,
        totalQueries: 0,
        memoryUsage: 0,
        connectionStatus: 'unknown',
        recommendations: []
      }
    }

    const averagePageLoadTime = recentMetrics.reduce((sum, m) => sum + m.pageLoadTime, 0) / recentMetrics.length
    const averageQueryTime = recentMetrics.reduce((sum, m) => sum + m.averageQueryTime, 0) / recentMetrics.length
    const cacheHitRate = recentMetrics.reduce((sum, m) => sum + m.cacheHitRate, 0) / recentMetrics.length
    const totalQueries = recentMetrics.reduce((sum, m) => sum + m.queryCount, 0)
    const memoryUsage = recentMetrics[recentMetrics.length - 1].memoryUsage
    const connectionStatus = recentMetrics[recentMetrics.length - 1].connectionStatus

    // Generate recommendations
    const recommendations: string[] = []
    
    if (averageQueryTime > 3000) {
      recommendations.push('Consider optimizing database queries')
    }
    
    if (cacheHitRate < 0.8) {
      recommendations.push('Improve caching strategy')
    }
    
    if (memoryUsage > 50 * 1024 * 1024) {
      recommendations.push('Consider implementing lazy loading')
    }
    
    if (connectionStatus === 'slow') {
      recommendations.push('Check network connection and database performance')
    }

    return {
      averagePageLoadTime,
      averageQueryTime,
      cacheHitRate,
      totalQueries,
      memoryUsage,
      connectionStatus,
      recommendations
    }
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = []
    this.queryTimes = []
    this.cacheHits = 0
    this.cacheMisses = 0
    this.queryCount = 0
    this.startTime = Date.now()
    console.log('🔄 Performance metrics reset')
  }

  /**
   * Get monitoring status
   */
  isMonitoringActive(): boolean {
    return this.isMonitoring
  }
}

// ✅ Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance()

// ✅ Auto-start monitoring in browser
if (typeof window !== 'undefined') {
  // Start monitoring after a short delay
  setTimeout(() => {
    performanceMonitor.startMonitoring()
  }, 2000)
}

// ✅ Export performance utilities
export function recordQueryTime(queryTime: number, cacheHit: boolean = false): void {
  performanceMonitor.recordQuery(queryTime, cacheHit)
}

export function getPerformanceSummary() {
  return performanceMonitor.getPerformanceSummary()
}

export function resetPerformanceMetrics(): void {
  performanceMonitor.resetMetrics()
}
