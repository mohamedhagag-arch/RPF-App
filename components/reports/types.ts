import { Project, BOQActivity } from '@/lib/supabase'
import { ProcessedKPI } from '@/lib/kpiProcessor'

export type ReportType = 
  | 'overview' 
  | 'projects' 
  | 'activities' 
  | 'kpis' 
  | 'financial' 
  | 'performance' 
  | 'lookahead' 
  | 'monthly-revenue' 
  | 'kpi-chart' 
  | 'delayed-activities' 
  | 'activity-periodical-progress'

export interface ReportStats {
  totalProjects: number
  activeProjects: number
  completedProjects: number
  totalActivities: number
  completedActivities: number
  delayedActivities: number
  totalKPIs: number
  plannedKPIs: number
  actualKPIs: number
  totalValue: number
  earnedValue: number
  plannedValue: number
  variance: number
  overallProgress: number
}

export interface FilteredData {
  filteredProjects: Project[]
  filteredActivities: BOQActivity[]
  filteredKPIs: ProcessedKPI[]
}

export interface ReportsData {
  projects: Project[]
  activities: BOQActivity[]
  kpis: ProcessedKPI[]
  loading: boolean
  error: string
  isFromCache: boolean
  stats: ReportStats
  filteredData: FilteredData
  allAnalytics: any[]
  isComputingAnalytics: boolean
  formatCurrency: (amount: number, currencyCode?: string) => string
  formatNumber: (num: number) => string
  formatPercentage: (num: number) => string
  refreshData: (force?: boolean) => Promise<void>
}

export interface FilterState {
  selectedDivision: string
  selectedProjects: string[]
  dateRange: { start: string; end: string }
  showProjectDropdown: boolean
  projectSearch: string
}


