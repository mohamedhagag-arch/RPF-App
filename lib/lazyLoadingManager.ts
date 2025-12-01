/**
 * Lazy Loading Manager
 * Manages efficient data loading with pagination and caching
 */

export interface LazyLoadingOptions {
  pageSize?: number
  cacheSize?: number
  enableCaching?: boolean
  prefetchNext?: boolean
}

export interface LazyLoadingResult<T> {
  data: T[]
  hasMore: boolean
  totalCount: number
  currentPage: number
  isLoading: boolean
  error?: string
}

export class LazyLoadingManager<T> {
  private cache: Map<string, T[]> = new Map()
  private totalCount: number = 0
  private currentPage: number = 0
  private isLoading: boolean = false
  private error?: string

  constructor(
    private fetchFunction: (page: number, pageSize: number) => Promise<{ data: T[], count: number }>,
    private options: LazyLoadingOptions = {}
  ) {
    this.options = {
      pageSize: 50,
      cacheSize: 200,
      enableCaching: true,
      prefetchNext: true,
      ...options
    }
  }

  async loadPage(page: number = 0): Promise<LazyLoadingResult<T>> {
    if (this.isLoading) {
      return this.getCurrentResult()
    }

    this.isLoading = true
    this.error = undefined

    try {
      const cacheKey = `page_${page}`
      
      // Check cache first
      if (this.options.enableCaching && this.cache.has(cacheKey)) {
        const cachedData = this.cache.get(cacheKey)!
        this.currentPage = page
        this.isLoading = false
        
        return {
          data: cachedData,
          hasMore: this.hasMorePages(),
          totalCount: this.totalCount,
          currentPage: page,
          isLoading: false
        }
      }

      // Fetch from database
      const result = await this.fetchFunction(page, this.options.pageSize!)
      
      // Update cache
      if (this.options.enableCaching) {
        this.cache.set(cacheKey, result.data)
        this.cleanupCache()
      }

      this.totalCount = result.count
      this.currentPage = page
      this.isLoading = false

      // Prefetch next page if enabled
      if (this.options.prefetchNext && this.hasMorePages()) {
        this.prefetchNextPage()
      }

      return {
        data: result.data,
        hasMore: this.hasMorePages(),
        totalCount: this.totalCount,
        currentPage: page,
        isLoading: false
      }

    } catch (error: any) {
      this.error = error.message
      this.isLoading = false
      
      return {
        data: [],
        hasMore: false,
        totalCount: 0,
        currentPage: page,
        isLoading: false,
        error: error.message
      }
    }
  }

  async loadNextPage(): Promise<LazyLoadingResult<T>> {
    return this.loadPage(this.currentPage + 1)
  }

  async loadAllData(): Promise<T[]> {
    const allData: T[] = []
    let currentPage = 0
    let hasMore = true

    while (hasMore) {
      const result = await this.loadPage(currentPage)
      allData.push(...result.data)
      hasMore = result.hasMore
      currentPage++
    }

    return allData
  }

  private hasMorePages(): boolean {
    const totalPages = Math.ceil(this.totalCount / this.options.pageSize!)
    return this.currentPage < totalPages - 1
  }

  private async prefetchNextPage(): Promise<void> {
    if (this.hasMorePages()) {
      const nextPage = this.currentPage + 1
      const cacheKey = `page_${nextPage}`
      
      if (!this.cache.has(cacheKey)) {
        try {
          const result = await this.fetchFunction(nextPage, this.options.pageSize!)
          this.cache.set(cacheKey, result.data)
        } catch (error) {
          // Silently fail prefetch
          console.warn('Prefetch failed:', error)
        }
      }
    }
  }

  private cleanupCache(): void {
    if (this.cache.size > this.options.cacheSize!) {
      const keys = Array.from(this.cache.keys())
      const keysToDelete = keys.slice(0, keys.length - this.options.cacheSize!)
      
      keysToDelete.forEach(key => {
        this.cache.delete(key)
      })
    }
  }

  private getCurrentResult(): LazyLoadingResult<T> {
    return {
      data: [],
      hasMore: false,
      totalCount: this.totalCount,
      currentPage: this.currentPage,
      isLoading: this.isLoading,
      error: this.error
    }
  }

  clearCache(): void {
    this.cache.clear()
  }

  getCacheSize(): number {
    return this.cache.size
  }
}

// Utility functions for common use cases
export async function loadAllProjects(): Promise<any[]> {
  const { supabase, TABLES } = await import('./supabase')
  
  const { data, error } = await supabase
    .from(TABLES.PROJECTS)
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function loadAllActivities(): Promise<any[]> {
  const { supabase, TABLES } = await import('./supabase')
  
  const { data, error } = await supabase
    .from(TABLES.BOQ_ACTIVITIES)
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function loadAllKPIs(): Promise<any[]> {
  const { supabase, TABLES } = await import('./supabase')
  
  const { data, error } = await supabase
    .from(TABLES.KPI)
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

// Enhanced loading with progress tracking
export async function loadAllDataWithProgress(
  onProgress?: (progress: number, stage: string) => void
): Promise<{ projects: any[], activities: any[], kpis: any[] }> {
  const totalSteps = 3
  let currentStep = 0

  const updateProgress = (stage: string) => {
    currentStep++
    const progress = (currentStep / totalSteps) * 100
    onProgress?.(progress, stage)
  }

  try {
    updateProgress('Loading projects...')
    const projects = await loadAllProjects()

    updateProgress('Loading activities...')
    const activities = await loadAllActivities()

    updateProgress('Loading KPIs...')
    const kpis = await loadAllKPIs()

    updateProgress('Complete!')
    
    return { projects, activities, kpis }
  } catch (error) {
    throw new Error(`Failed to load data: ${error}`)
  }
}
