#!/usr/bin/env node

/**
 * Performance Monitor Script
 * مراقب الأداء
 */

const { performanceMonitor } = require('../lib/performanceMonitor')

console.log('📊 Performance Monitor Started')
console.log('================================')

// Start monitoring
performanceMonitor.startMonitoring()

// Display metrics every 30 seconds
setInterval(() => {
  const summary = performanceMonitor.getPerformanceSummary()
  
  console.log('\n📈 Performance Summary:')
  console.log('------------------------')
  console.log('Average Page Load Time:', summary.averagePageLoadTime.toFixed(2) + 'ms')
  console.log('Average Query Time:', summary.averageQueryTime.toFixed(2) + 'ms')
  console.log('Cache Hit Rate:', (summary.cacheHitRate * 100).toFixed(1) + '%')
  console.log('Total Queries:', summary.totalQueries)
  console.log('Memory Usage:', (summary.memoryUsage / 1024 / 1024).toFixed(2) + 'MB')
  console.log('Connection Status:', summary.connectionStatus)
  
  if (summary.recommendations.length > 0) {
    console.log('\n💡 Recommendations:')
    summary.recommendations.forEach(rec => console.log('- ' + rec))
  }
}, 30000)

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⏹️ Stopping performance monitor...')
  performanceMonitor.stopMonitoring()
  process.exit(0)
})
