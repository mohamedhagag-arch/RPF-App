/**
 * ✅ PERFORMANCE: Chunked analytics processor to prevent page freezing
 * Processes analytics in small chunks using requestIdleCallback or setTimeout
 */

import { getAllProjectsAnalytics } from './projectAnalytics'
import { Project, BOQActivity } from './supabase'

interface ProcessAnalyticsOptions {
  onProgress?: (processed: number, total: number) => void
  chunkSize?: number
}

/**
 * Process analytics in chunks to prevent blocking the main thread
 */
export async function processAnalyticsInChunks(
  projects: Project[],
  allActivities: BOQActivity[],
  allKPIs: any[],
  options: ProcessAnalyticsOptions = {}
): Promise<any[]> {
  const { onProgress, chunkSize = 50 } = options
  
  // If small dataset, process immediately
  if (projects.length <= chunkSize) {
    return getAllProjectsAnalytics(projects, allActivities, allKPIs)
  }
  
  const results: any[] = []
  const total = projects.length
  
  // Process in chunks
  for (let i = 0; i < projects.length; i += chunkSize) {
    const chunk = projects.slice(i, i + chunkSize)
    const chunkResults = getAllProjectsAnalytics(chunk, allActivities, allKPIs)
    results.push(...chunkResults)
    
    // Report progress
    if (onProgress) {
      onProgress(Math.min(i + chunkSize, total), total)
    }
    
    // Yield to browser between chunks to prevent freezing
    if (i + chunkSize < projects.length) {
      await new Promise<void>((resolve) => {
        // Use requestIdleCallback if available, otherwise setTimeout
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
          ;(window as any).requestIdleCallback(() => resolve(), { timeout: 50 })
        } else {
          setTimeout(() => resolve(), 0)
        }
      })
    }
  }
  
  return results
}

/**
 * Debounced analytics processor - waits for idle time before processing
 */
export function createDebouncedAnalyticsProcessor(
  delay: number = 100
): (projects: Project[], activities: BOQActivity[], kpis: any[]) => Promise<any[]> {
  let timeoutId: NodeJS.Timeout | null = null
  let pendingResolve: ((value: any[]) => void) | null = null
  
  return (projects: Project[], activities: BOQActivity[], kpis: any[]): Promise<any[]> => {
    return new Promise((resolve) => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      
      pendingResolve = resolve
      
      timeoutId = setTimeout(async () => {
        const results = await processAnalyticsInChunks(projects, activities, kpis, {
          chunkSize: 50 // Process 50 projects at a time
        })
        if (pendingResolve) {
          pendingResolve(results)
          pendingResolve = null
        }
      }, delay)
    })
  }
}

