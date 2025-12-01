#!/usr/bin/env node

/**
 * Clear Cache Script
 * مسح التخزين المؤقت
 */

const { fastQueryExecutor } = require('../lib/fastConnectionManager')
const { criticalDataPreloader } = require('../lib/ultraFastLoading')

console.log('🧹 Clearing all caches...')

// Clear fast query cache
fastQueryExecutor.clearCache()
console.log('✅ Fast query cache cleared')

// Clear preloaded data
criticalDataPreloader.clearPreloadedData()
console.log('✅ Preloaded data cleared')

console.log('🎉 All caches cleared successfully!')
