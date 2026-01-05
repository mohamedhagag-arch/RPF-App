'use client'

import { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
import { Project, BOQActivity, TABLES } from '@/lib/supabase'
import { mapKPIFromDB } from '@/lib/dataMappers'
import { processKPIRecord } from '@/lib/kpiProcessor'
import { getAllProjectsAnalytics } from '@/lib/projectAnalytics'
import { calculateProjectLookAhead, ProjectLookAhead } from '@/components/reports/LookAheadHelper'
import { BarChart3, DollarSign, CheckCircle, Target, AlertTriangle } from 'lucide-react'

interface LookaheadTabProps {
  activities: BOQActivity[]
  projects: Project[]
  formatCurrency: (amount: number, currencyCode?: string) => string
}

export const LookaheadTab = memo(function LookaheadTab({ activities, projects, formatCurrency }: LookaheadTabProps) {
  const [selectedDivision, setSelectedDivision] = useState<string>('')
  const [kpis, setKpis] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [lookAheadPeriodType, setLookAheadPeriodType] = useState<'days' | 'weeks' | 'months'>('months')
  const [lookAheadPeriodCount, setLookAheadPeriodCount] = useState<number>(3)
  const [lookAheadDateMode, setLookAheadDateMode] = useState<'period' | 'dates'>('period')
  const [lookAheadStartDate, setLookAheadStartDate] = useState<string>('')
  const [lookAheadEndDate, setLookAheadEndDate] = useState<string>('')
  const supabase = getSupabaseClient()

  useEffect(() => {
    // Fetch KPIs for accurate calculations
    const fetchKPIs = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from(TABLES.KPI)
          .select('*')
          .order('created_at', { ascending: false })
        
        if (!error && data) {
          const mappedKPIs = data.map(mapKPIFromDB)
          const processedKPIs = mappedKPIs.map(processKPIRecord)
          setKpis(processedKPIs)
        }
      } catch (error) {
        console.error('Error fetching KPIs:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchKPIs()
  }, [supabase])

  
  // ✅ PERFORMANCE: Memoize filtered projects
  const filteredProjects = useMemo(() => {
    let filtered = selectedDivision 
    ? projects.filter((p: Project) => p.responsible_division === selectedDivision)
    : projects
  
  // Filter only active projects (on-going, upcoming, or site-preparation)
    return filtered.filter((p: Project) => 
    p.project_status === 'on-going' || 
    p.project_status === 'upcoming' || 
    p.project_status === 'site-preparation'
  )
  }, [projects, selectedDivision])

  const divisions = useMemo(() => {
    return Array.from(new Set(projects.map((p: Project) => p.responsible_division).filter(Boolean))).sort()
  }, [projects])

  // ✅ Calculate LookAhead for each project based on Remaining Quantity / Actual Productivity
  const projectsLookAhead = useMemo(() => {
    return filteredProjects.map((project: Project) => {
      // Get all activities for this project
      const projectActivities = activities.filter((a: BOQActivity) => {
        const activityFullCode = (a.project_full_code || a.project_code || '').toString().trim().toUpperCase()
        const projectFullCode = (project.project_full_code || project.project_code || '').toString().trim().toUpperCase()
        return activityFullCode === projectFullCode
      })
      
      // Calculate LookAhead for this project
      return calculateProjectLookAhead(project, projectActivities, kpis)
    })
  }, [filteredProjects, activities, kpis])

  // ✅ Calculate future date range based on period type and count OR custom dates
  const futureDateRange = useMemo(() => {
    if (lookAheadDateMode === 'dates') {
      // Use custom dates
      const startDate = lookAheadStartDate ? new Date(lookAheadStartDate) : new Date()
      const endDate = lookAheadEndDate ? new Date(lookAheadEndDate) : new Date()
      
      startDate.setHours(0, 0, 0, 0)
      endDate.setHours(23, 59, 59, 999)
      
      return {
        start: startDate,
        end: endDate
      }
    } else {
      // Use period count
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const endDate = new Date(today)
      
      switch (lookAheadPeriodType) {
        case 'days':
          endDate.setDate(today.getDate() + lookAheadPeriodCount)
          break
        case 'weeks':
          endDate.setDate(today.getDate() + (lookAheadPeriodCount * 7))
          break
        case 'months':
          endDate.setMonth(today.getMonth() + lookAheadPeriodCount)
          break
      }
      
      endDate.setHours(23, 59, 59, 999)
      
      return {
        start: today,
        end: endDate
      }
    }
  }, [lookAheadDateMode, lookAheadPeriodType, lookAheadPeriodCount, lookAheadStartDate, lookAheadEndDate])

  // ✅ Generate periods (columns) based on selected period type and count
  const lookAheadPeriods = useMemo(() => {
    const periods: Array<{ label: string; start: Date; end: Date; shortLabel: string }> = []
    
    if (lookAheadDateMode === 'dates') {
      // For custom dates, determine period type based on date range
      const daysDiff = Math.ceil((futureDateRange.end.getTime() - futureDateRange.start.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysDiff <= 30) {
        // Daily periods
        const current = new Date(futureDateRange.start)
        let dayNum = 1
        while (current <= futureDateRange.end) {
          const periodStart = new Date(current)
          periodStart.setHours(0, 0, 0, 0)
          const periodEnd = new Date(periodStart)
          periodEnd.setHours(23, 59, 59, 999)
          
          periods.push({
            label: periodStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            shortLabel: `D${dayNum}`,
            start: periodStart,
            end: periodEnd
          })
          
          current.setDate(current.getDate() + 1)
          dayNum++
        }
      } else if (daysDiff <= 90) {
        // Weekly periods
        const current = new Date(futureDateRange.start)
        let weekNum = 1
        while (current <= futureDateRange.end) {
          const periodStart = new Date(current)
          // Start from Monday
          const dayOfWeek = periodStart.getDay()
          const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
          periodStart.setDate(periodStart.getDate() - diff)
          periodStart.setHours(0, 0, 0, 0)
          
          const periodEnd = new Date(periodStart)
          periodEnd.setDate(periodStart.getDate() + 6)
          periodEnd.setHours(23, 59, 59, 999)
          
          if (periodStart <= futureDateRange.end && periodEnd >= futureDateRange.start) {
            periods.push({
              label: `Week ${weekNum} (${periodStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${periodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`,
              shortLabel: `W${weekNum}`,
              start: periodStart,
              end: periodEnd
            })
            weekNum++
          }
          
          current.setDate(current.getDate() + 7)
        }
      } else {
        // Monthly periods
        const current = new Date(futureDateRange.start)
        current.setDate(1)
        current.setHours(0, 0, 0, 0)
        let monthNum = 1
        
        while (current <= futureDateRange.end) {
          const periodStart = new Date(current)
          const periodEnd = new Date(periodStart)
          periodEnd.setMonth(periodStart.getMonth() + 1)
          periodEnd.setDate(0)
          periodEnd.setHours(23, 59, 59, 999)
          
          if (periodStart <= futureDateRange.end && periodEnd >= futureDateRange.start) {
            periods.push({
              label: periodStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
              shortLabel: periodStart.toLocaleDateString('en-US', { month: 'short' }),
              start: periodStart,
              end: periodEnd
            })
            monthNum++
          }
          
          current.setMonth(current.getMonth() + 1)
        }
      }
    } else {
      // Period count mode
      const startDate = new Date()
      startDate.setHours(0, 0, 0, 0)
      
      switch (lookAheadPeriodType) {
        case 'days':
          for (let i = 0; i < lookAheadPeriodCount; i++) {
            const periodStart = new Date(startDate)
            periodStart.setDate(startDate.getDate() + i)
            periodStart.setHours(0, 0, 0, 0)
            const periodEnd = new Date(periodStart)
            periodEnd.setHours(23, 59, 59, 999)
            
            periods.push({
              label: periodStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              shortLabel: `D${i + 1}`,
              start: periodStart,
              end: periodEnd
            })
          }
          break
        case 'weeks':
          for (let i = 0; i < lookAheadPeriodCount; i++) {
            const periodStart = new Date(startDate)
            // Start from Monday
            const dayOfWeek = periodStart.getDay()
            const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
            periodStart.setDate(startDate.getDate() - diff + (i * 7))
            periodStart.setHours(0, 0, 0, 0)
            
            const periodEnd = new Date(periodStart)
            periodEnd.setDate(periodStart.getDate() + 6)
            periodEnd.setHours(23, 59, 59, 999)
            
            periods.push({
              label: `Week ${i + 1} (${periodStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${periodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`,
              shortLabel: `W${i + 1}`,
              start: periodStart,
              end: periodEnd
            })
          }
          break
        case 'months':
          for (let i = 0; i < lookAheadPeriodCount; i++) {
            const periodStart = new Date(startDate)
            periodStart.setMonth(startDate.getMonth() + i)
            periodStart.setDate(1)
            periodStart.setHours(0, 0, 0, 0)
            
            const periodEnd = new Date(periodStart)
            periodEnd.setMonth(periodStart.getMonth() + 1)
            periodEnd.setDate(0)
            periodEnd.setHours(23, 59, 59, 999)
            
            periods.push({
              label: periodStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
              shortLabel: periodStart.toLocaleDateString('en-US', { month: 'short' }),
              start: periodStart,
              end: periodEnd
            })
          }
          break
      }
    }
    
    return periods
  }, [lookAheadDateMode, lookAheadPeriodType, lookAheadPeriodCount, futureDateRange])

  // ✅ Calculate forecast value per period for each project
  const calculateForecastValuePerPeriod = useCallback((lookAhead: ProjectLookAhead, period: { start: Date; end: Date }): number => {
    let totalForecastValue = 0
    
    // Get project activities
    const project = filteredProjects.find((p: Project) => p.id === lookAhead.projectId)
    if (!project) return 0
    
    const projectActivities = activities.filter((a: BOQActivity) => {
      const activityFullCode = (a.project_full_code || a.project_code || '').toString().trim().toUpperCase()
      const projectFullCode = (project.project_full_code || project.project_code || '').toString().trim().toUpperCase()
      return activityFullCode === projectFullCode
    })
    
    // Calculate working days in period (excluding Friday and Saturday)
    const periodStart = new Date(period.start)
    const periodEnd = new Date(period.end)
    let workingDays = 0
    const current = new Date(periodStart)
    
    while (current <= periodEnd) {
      const dayOfWeek = current.getDay()
      if (dayOfWeek !== 5 && dayOfWeek !== 6) { // Exclude Friday (5) and Saturday (6)
        workingDays++
      }
      current.setDate(current.getDate() + 1)
    }
    
    // For each activity, calculate forecast value for this period
    lookAhead.activities.forEach((activityLookAhead) => {
      const activity = activityLookAhead.activity
      const rawActivity = (activity as any).raw || {}
      
      // Skip if activity is already completed
      if (activityLookAhead.isCompleted) return
      
      // Skip if activity completion date is before period start
      if (activityLookAhead.completionDate && activityLookAhead.completionDate < periodStart) return
      
      // Get productivity (Actual or Planned)
      const productivity = activityLookAhead.actualProductivity > 0 
        ? activityLookAhead.actualProductivity 
        : activityLookAhead.plannedProductivity
      
      if (productivity <= 0) return
      
      // Calculate working days for this activity in this period
      // If activity completes during this period, only count days until completion
      let activityWorkingDays = workingDays
      if (activityLookAhead.completionDate && activityLookAhead.completionDate <= periodEnd) {
        // Activity completes during this period - count only days until completion
        activityWorkingDays = 0
        const current = new Date(periodStart)
        const completionDate = new Date(activityLookAhead.completionDate)
        completionDate.setHours(23, 59, 59, 999)
        
        while (current <= completionDate && current <= periodEnd) {
          const dayOfWeek = current.getDay()
          if (dayOfWeek !== 5 && dayOfWeek !== 6) { // Exclude Friday (5) and Saturday (6)
            activityWorkingDays++
          }
          current.setDate(current.getDate() + 1)
        }
      } else if (activityLookAhead.completionDate && activityLookAhead.completionDate > periodEnd) {
        // Activity continues beyond this period - use full period working days
        activityWorkingDays = workingDays
      }
      
      // Calculate forecast quantity for this period
      let forecastQuantity = productivity * activityWorkingDays
      
      // Cap forecast quantity to remaining units
      if (forecastQuantity > activityLookAhead.remainingUnits) {
        forecastQuantity = activityLookAhead.remainingUnits
      }
      
      // Get activity rate
      let rate = 0
      const totalValueFromActivity = activity.total_value || 
                                   parseFloat(String(rawActivity['Total Value'] || '0').replace(/,/g, '')) || 
                                   0
      const totalUnits = activity.total_units || 
                      activity.planned_units ||
                      parseFloat(String(rawActivity['Total Units'] || rawActivity['Planned Units'] || '0').replace(/,/g, '')) || 
                      0
      
      if (totalUnits > 0 && totalValueFromActivity > 0) {
        rate = totalValueFromActivity / totalUnits
      } else {
        rate = activity.rate || 
              parseFloat(String(rawActivity['Rate'] || '0').replace(/,/g, '')) || 
              0
      }
      
      // Calculate forecast value
      if (rate > 0 && forecastQuantity > 0) {
        totalForecastValue += forecastQuantity * rate
      }
    })
    
    return totalForecastValue
  }, [filteredProjects, activities])

  // ✅ Filter projects that will complete within the future date range
  // ✅ IMPORTANT: Only show projects with remaining work (not completed)
  // ✅ Principle: Projects are shown based on remaining quantities and actual productivity
  // ✅ Completed projects (no remaining work) should NOT appear
  const filteredProjectsLookAhead = useMemo(() => {
    return projectsLookAhead.filter((lookAhead: ProjectLookAhead) => {
      // ✅ CRITICAL CHECK: Project must have at least one activity with remaining work
      // This ensures completed projects (all activities finished) are excluded
      const hasRemainingWork = lookAhead.activities.some((activity) => {
        return activity.remainingUnits > 0 && !activity.isCompleted
      })
      
      // ✅ Exclude completed projects (no remaining work)
      if (!hasRemainingWork) return false
      
      // ✅ Date range filter: Show projects completing within the selected period
      // If project has completion date, it should be within the future date range
      if (lookAhead.latestCompletionDate) {
        return lookAhead.latestCompletionDate >= futureDateRange.start && 
               lookAhead.latestCompletionDate <= futureDateRange.end
      }
      
      // ✅ If no completion date but has remaining work, include it (project is still active)
      // This handles cases where productivity calculation hasn't determined a completion date yet
      return true
    })
  }, [projectsLookAhead, futureDateRange])


  // ✅ Get analytics for summary cards
  const allAnalytics = useMemo(() => {
    return getAllProjectsAnalytics(filteredProjects, activities, kpis)
  }, [filteredProjects, activities, kpis])
  
  // ✅ Show all active projects (not just those with Remaining Value > 0)
  // This ensures all active projects are visible, even if they have 0 remaining value
  const projectsWithRemainingValue = useMemo(() => {
    // Return all analytics (all active projects from filteredProjects)
    // The Remaining Value calculation will show 0 for completed projects, which is correct
    return allAnalytics
  }, [allAnalytics])

  // Calculate totals for summary cards
  const totals = useMemo(() => {
    const totalContractValue = projectsWithRemainingValue.reduce((sum: number, a: any) => sum + (a.totalContractValue || 0), 0)
    const totalEarnedValue = projectsWithRemainingValue.reduce((sum: number, a: any) => sum + (a.totalEarnedValue || 0), 0)
    const totalRemainingValue = projectsWithRemainingValue.reduce((sum: number, a: any) => {
      const totalValue = a.totalValue || 0
      const earnedValue = a.totalEarnedValue || 0
      return sum + (totalValue - earnedValue)
    }, 0)

    return {
      totalContractValue,
      totalEarnedValue,
      totalRemainingValue
    }
  }, [projectsWithRemainingValue])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
          </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">LookAhead Planning Report</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Project completion forecast based on Actual Productivity (Remaining Quantity ÷ Actual Productivity)
            </p>
          </div>
          <select
            value={selectedDivision}
            onChange={(e) => setSelectedDivision(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Divisions</option>
            {(divisions as string[]).map((div: string) => (
              <option key={div} value={div}>{div}</option>
            ))}
          </select>
        </div>
        
        {/* Future Period Selection */}
        <div className="flex flex-col gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          {/* Mode Selection */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
              Filter by:
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLookAheadDateMode('period')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  lookAheadDateMode === 'period'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                Period Count
              </button>
              <button
                type="button"
                onClick={() => setLookAheadDateMode('dates')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  lookAheadDateMode === 'dates'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                Custom Dates
              </button>
            </div>
          </div>

          {/* Period Count Mode */}
          {lookAheadDateMode === 'period' && (
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                Show projects completing in the next:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={lookAheadPeriodCount}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 1
                    setLookAheadPeriodCount(Math.max(1, Math.min(100, value)))
                  }}
                  className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center"
                />
                <select
                  value={lookAheadPeriodType}
                  onChange={(e) => setLookAheadPeriodType(e.target.value as 'days' | 'weeks' | 'months')}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="days">Days</option>
                  <option value="weeks">Weeks</option>
                  <option value="months">Months</option>
                </select>
              </div>
            </div>
          )}

          {/* Custom Dates Mode */}
          {lookAheadDateMode === 'dates' && (
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                Show projects completing between:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={lookAheadStartDate}
                  onChange={(e) => setLookAheadStartDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">and</span>
                <input
                  type="date"
                  value={lookAheadEndDate}
                  onChange={(e) => setLookAheadEndDate(e.target.value)}
                  min={lookAheadStartDate || undefined}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* Date Range Display */}
          <div className="text-sm text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
            <span className="font-medium">Date Range:</span>{' '}
            {futureDateRange.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - {futureDateRange.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Contract Value</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {formatCurrency(totals.totalContractValue)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {projectsWithRemainingValue.length} active projects
                </p>
        </div>
              <DollarSign className="h-12 w-12 text-blue-500 dark:text-blue-400 opacity-50" />
          </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">Earned Value</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {formatCurrency(totals.totalEarnedValue)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {totals.totalContractValue > 0 ? ((totals.totalEarnedValue / totals.totalContractValue) * 100).toFixed(1) : 0}% completed
                </p>
        </div>
              <CheckCircle className="h-12 w-12 text-green-500 dark:text-green-400 opacity-50" />
          </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Remaining Value</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {formatCurrency(totals.totalRemainingValue)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  To be completed in next 3 months
          </p>
        </div>
              <Target className="h-12 w-12 text-orange-500 dark:text-orange-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projects LookAhead Table - Based on Remaining Quantity / Actual Productivity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            Project Completion Forecast - Based on Actual Productivity
          </CardTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Completion dates calculated from: Remaining Quantity ÷ Actual Productivity (Actual Quantity / Actual Days). For each activity, then the latest activity completion date determines the project completion date.
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600">
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left font-semibold sticky left-0 bg-gray-100 dark:bg-gray-800 z-10">Project Full Name</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left font-semibold">Project Status</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold">Contract Value</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold">Earned Value</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold">Remaining Value</th>
                  {lookAheadPeriods.map((period, index) => (
                    <th key={index} className="border border-gray-300 dark:border-gray-600 px-3 py-3 text-center font-semibold min-w-[120px]">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold">{period.shortLabel}</span>
                        <span className="text-xs font-normal mt-1">{period.label}</span>
                      </div>
                    </th>
                  ))}
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center font-semibold">Completion Date</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center font-semibold">Remaining Days</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjectsLookAhead.length === 0 ? (
                  <tr>
                    <td colSpan={6 + lookAheadPeriods.length + 2} className="border border-gray-300 dark:border-gray-600 px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <AlertTriangle className="h-8 w-8 text-gray-400" />
                        <p>No projects found completing in the selected period</p>
                        <p className="text-xs">
                          Showing projects completing between {futureDateRange.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} and {futureDateRange.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredProjectsLookAhead.map((lookAhead: ProjectLookAhead) => {
                    // Find project from filteredProjects
                    const project = filteredProjects.find((p: Project) => p.id === lookAhead.projectId)
                    if (!project) return null
                    
                    // Get analytics for this project
                    const analytics = allAnalytics.find((a: any) => a.project.id === project.id)
                    const totalValue = analytics?.totalValue || 0
                    const earnedValue = analytics?.totalEarnedValue || 0
                    const remainingValue = totalValue - earnedValue
                    const contractValue = analytics?.totalContractValue || project.contract_amount || 0
                    
                    // Calculate total remaining days (max from all activities)
                    const totalRemainingDays = Math.max(...lookAhead.activities.map(a => a.remainingDays), 0)
                    
                    return (
                      <tr key={project.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 sticky left-0 bg-white dark:bg-gray-900 z-10">
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {lookAhead.projectCode}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {lookAhead.projectName}
                            </p>
                          </div>
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            project.project_status === 'on-going' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                            project.project_status === 'upcoming' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                            project.project_status === 'site-preparation' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                          }`}>
                            {project.project_status?.replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'N/A'}
                          </span>
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {formatCurrency(contractValue, project.currency)}
                          </span>
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right">
                          <span className="font-medium text-green-600 dark:text-green-400">
                            {formatCurrency(earnedValue, project.currency)}
                          </span>
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right">
                          <span className="font-semibold text-blue-600 dark:text-blue-400">
                            {formatCurrency(remainingValue, project.currency)}
                          </span>
                        </td>
                        {lookAheadPeriods.map((period, index) => {
                          // Calculate forecast value for this period
                          const forecastValue = calculateForecastValuePerPeriod(lookAhead, period)
                          
                          // Check if project completion date falls within this period
                          const isInPeriod = lookAhead.latestCompletionDate && 
                            lookAhead.latestCompletionDate >= period.start && 
                            lookAhead.latestCompletionDate <= period.end
                          
                          return (
                            <td key={index} className="border border-gray-300 dark:border-gray-600 px-3 py-3 text-center">
                              {forecastValue > 0 ? (
                                <div className="flex flex-col items-center gap-1">
                                  <span className="font-semibold text-blue-600 dark:text-blue-400 text-sm">
                                    {formatCurrency(forecastValue, project.currency)}
                                  </span>
                                  {isInPeriod && (
                                    <div className="flex items-center gap-1 mt-0.5">
                                      <span className="text-xs text-green-600 dark:text-green-400">✓</span>
                                      <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {lookAhead.latestCompletionDate?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-300 dark:text-gray-600">-</span>
                              )}
                            </td>
                          )
                        })}
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center">
                          {lookAhead.latestCompletionDate ? (
                            <span className="font-medium text-blue-600 dark:text-blue-400">
                              {lookAhead.latestCompletionDate.toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center">
                          {totalRemainingDays > 0 ? (
                            <span className="font-medium text-orange-600 dark:text-orange-400">
                              {totalRemainingDays} days
                            </span>
                          ) : (
                            <span className="text-green-600 dark:text-green-400 font-medium">Completed</span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
                {/* Grand Total Row */}
                {filteredProjectsLookAhead.length > 0 && (
                  <tr className="bg-gray-100 dark:bg-gray-800 font-bold border-t-2 border-gray-400 dark:border-gray-500">
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 sticky left-0 bg-gray-100 dark:bg-gray-800 z-10">
                      <span className="text-gray-900 dark:text-white">Grand Total</span>
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3">
                      <span className="text-gray-500 dark:text-gray-400">-</span>
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right">
                      <span className="text-gray-900 dark:text-white">
                        {formatCurrency(
                          filteredProjectsLookAhead.reduce((sum: number, lookAhead: ProjectLookAhead) => {
                            const project = filteredProjects.find((p: Project) => p.id === lookAhead.projectId)
                            if (!project) return sum
                            const analytics = allAnalytics.find((a: any) => a.project.id === project.id)
                            return sum + (analytics?.totalContractValue || project.contract_amount || 0)
                          }, 0)
                        )}
                      </span>
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right">
                      <span className="text-green-600 dark:text-green-400">
                        {formatCurrency(
                          filteredProjectsLookAhead.reduce((sum: number, lookAhead: ProjectLookAhead) => {
                            const project = filteredProjects.find((p: Project) => p.id === lookAhead.projectId)
                            if (!project) return sum
                            const analytics = allAnalytics.find((a: any) => a.project.id === project.id)
                            const totalValue = analytics?.totalValue || 0
                            const earnedValue = analytics?.totalEarnedValue || 0
                            return sum + earnedValue
                          }, 0)
                        )}
                      </span>
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right">
                      <span className="text-blue-600 dark:text-blue-400">
                        {formatCurrency(
                          filteredProjectsLookAhead.reduce((sum: number, lookAhead: ProjectLookAhead) => {
                            const project = filteredProjects.find((p: Project) => p.id === lookAhead.projectId)
                            if (!project) return sum
                            const analytics = allAnalytics.find((a: any) => a.project.id === project.id)
                            const totalValue = analytics?.totalValue || 0
                            const earnedValue = analytics?.totalEarnedValue || 0
                            return sum + (totalValue - earnedValue)
                          }, 0)
                        )}
                      </span>
                    </td>
                    {lookAheadPeriods.map((period, index) => {
                      // Calculate total forecast value for this period across all projects
                      const totalForecastValue = filteredProjectsLookAhead.reduce((sum: number, lookAhead: ProjectLookAhead) => {
                        return sum + calculateForecastValuePerPeriod(lookAhead, period)
                      }, 0)
                      
                      return (
                        <td key={index} className="border border-gray-300 dark:border-gray-600 px-3 py-3 text-center">
                          {totalForecastValue > 0 ? (
                            <span className="font-bold text-blue-600 dark:text-blue-400">
                              {formatCurrency(totalForecastValue)}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      )
                    })}
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center">
                      <span className="text-gray-500 dark:text-gray-400">-</span>
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center">
                      <span className="text-gray-500 dark:text-gray-400">-</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
})

export default LookaheadTab


