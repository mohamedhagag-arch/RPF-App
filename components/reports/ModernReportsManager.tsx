'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { getSupabaseClient, executeQuery } from '@/lib/simpleConnectionManager'
import { useSmartLoading } from '@/lib/smartLoadingManager'
import { downloadExcel } from '@/lib/exportImportUtils'
import { Project, BOQActivity, TABLES } from '@/lib/supabase'
import { mapProjectFromDB, mapBOQFromDB, mapKPIFromDB } from '@/lib/dataMappers'
import { processKPIRecord, ProcessedKPI } from '@/lib/kpiProcessor'
import { getAllProjectsAnalytics } from '@/lib/projectAnalytics'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Alert } from '@/components/ui/Alert'
import { PrintableReport } from './PrintableReport'
import { formatCurrencyByCodeSync } from '@/lib/currenciesManager'
import {
  FileText,
  Download,
  BarChart3,
  PieChart,
  TrendingUp,
  Calendar,
  Filter,
  RefreshCw,
  Printer,
  Archive,
  Target,
  CheckCircle,
  AlertTriangle,
  Clock,
  DollarSign,
  Activity,
  Eye,
  CalendarDays,
  CalendarRange,
  CalendarClock,
  FastForward,
  TrendingDown,
  Users,
  Building2,
  Zap,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Search,
  ChevronDown
} from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

type ReportType = 'overview' | 'projects' | 'activities' | 'kpis' | 'financial' | 'performance' | 'lookahead' | 'monthly-revenue'

interface ReportStats {
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

export function ModernReportsManager() {
  const [projects, setProjects] = useState<Project[]>([])
  const [activities, setActivities] = useState<BOQActivity[]>([])
  const [kpis, setKpis] = useState<ProcessedKPI[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isFromCache, setIsFromCache] = useState(false)
  const [activeReport, setActiveReport] = useState<ReportType>('overview')
  const [cachedAnalytics, setCachedAnalytics] = useState<any[] | null>(null) // ✅ Store cached analytics
  const [selectedDivision, setSelectedDivision] = useState<string>('')
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]) // ✅ Changed to array for multi-select
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' })
  
  // ✅ Multi-select dropdown states
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)
  const [projectSearch, setProjectSearch] = useState('')
  const projectDropdownRef = useRef<HTMLDivElement>(null)
  
  // ✅ PERFORMANCE: Debounced filter values to reduce recalculation
  const [debouncedDivision, setDebouncedDivision] = useState<string>('')
  const [debouncedProjects, setDebouncedProjects] = useState<string[]>([]) // ✅ Changed to array
  const [debouncedDateRange, setDebouncedDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' })
  
  const { startSmartLoading, stopSmartLoading } = useSmartLoading('modern-reports')
  const supabase = getSupabaseClient()
  const isMountedRef = useRef(true)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  // ✅ CACHE: Storage keys and cache expiration (30 minutes)
  const CACHE_KEYS = {
    projects: 'reports_cache_projects',
    activities: 'reports_cache_activities',
    kpis: 'reports_cache_kpis',
    analytics: 'reports_cache_analytics', // ✅ Cache analytics too
    timestamp: 'reports_cache_timestamp'
  }
  const CACHE_EXPIRATION_MS = 30 * 60 * 1000 // 30 minutes

  // Handle Print - Open in new tab with only printable content
  const handlePrint = useCallback(() => {
    // Create a new tab
    const printWindow = window.open('', '_blank')
    
    if (!printWindow) {
      alert('Please allow popups to print the report')
      return
    }

    // Get the printable content
    const printableContent = document.querySelector('.printable-report')
    
    if (!printableContent) {
      alert('Printable content not found')
      return
    }

    // Clone the content to avoid modifying the original
    const clonedContent = printableContent.cloneNode(true) as HTMLElement
    
    // Remove all elements with .no-print class
    const noPrintElements = clonedContent.querySelectorAll('.no-print')
    noPrintElements.forEach(el => el.remove())
    
    // CRITICAL: Remove all inline styles from tables and cells that prevent proper printing
    const allTables = clonedContent.querySelectorAll('table')
    allTables.forEach(table => {
      // Remove inline styles from table
      if (table.hasAttribute('style')) {
        const style = table.getAttribute('style') || ''
        // Remove width, tableLayout, table-layout, minWidth, maxWidth
        const newStyle = style
          .replace(/width[^;]*;?/gi, '')
          .replace(/table-layout[^;]*;?/gi, '')
          .replace(/tableLayout[^;]*;?/gi, '')
          .replace(/min-width[^;]*;?/gi, '')
          .replace(/max-width[^;]*;?/gi, '')
        if (newStyle.trim()) {
          table.setAttribute('style', newStyle)
        } else {
          table.removeAttribute('style')
        }
      }
      
      // Remove inline width styles from all th and td
      const allCells = table.querySelectorAll('th, td')
      allCells.forEach(cell => {
        if (cell.hasAttribute('style')) {
          const style = cell.getAttribute('style') || ''
          // Remove width, minWidth, maxWidth
          const newStyle = style
            .replace(/width[^;]*;?/gi, '')
            .replace(/min-width[^;]*;?/gi, '')
            .replace(/max-width[^;]*;?/gi, '')
          if (newStyle.trim()) {
            cell.setAttribute('style', newStyle)
          } else {
            cell.removeAttribute('style')
          }
        }
      })
    })
    
    // Remove all overflow restrictions from containers
    const overflowContainers = clonedContent.querySelectorAll('[class*="overflow"], .print-table-container')
    overflowContainers.forEach(container => {
      if (container instanceof HTMLElement) {
        container.style.overflow = 'visible'
        container.style.maxHeight = 'none'
        container.style.height = 'auto'
        container.style.width = '100%'
      }
    })
    
    // Get all stylesheets
    const styles = Array.from(document.styleSheets)
      .map(styleSheet => {
        try {
          return Array.from(styleSheet.cssRules)
            .map(rule => rule.cssText)
            .join('\n')
        } catch (e) {
          return ''
        }
      })
      .join('\n')

    // Get inline styles
    const inlineStyles = Array.from(document.querySelectorAll('style'))
      .map(style => style.innerHTML)
      .join('\n')

    // Create comprehensive print CSS - COMPLETE REWRITE
    const printCSS = `
      @media print {
        /* ========== PAGE SETUP ========== */
        @page {
          size: A4 landscape !important;
          margin: 0.8cm !important;
        }

        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        body {
          background: white !important;
          color: #000 !important;
          font-family: Arial, sans-serif !important;
          font-size: 9pt !important;
          margin: 0 auto !important;
          padding: 0 !important;
          line-height: 1.4 !important;
          text-align: center !important;
        }

        /* ========== HIDE NON-PRINTABLE ========== */
        .no-print,
        button:not(.print-button),
        .print-button,
        svg,
        [class*="icon"] {
          display: none !important;
        }

        /* ========== TABLES - CRITICAL ========== */
        /* Remove ALL overflow restrictions */
        .print-table-container,
        [class*="overflow"] {
          overflow: visible !important;
          max-height: none !important;
          height: auto !important;
          width: 100% !important;
        }

        /* Force table to use auto layout and show all columns */
        table,
        .print-table,
        table[style],
        table[style*="width"],
        table[style*="tableLayout"],
        table[style*="table-layout"] {
          width: 100% !important;
          table-layout: auto !important;
          border-collapse: collapse !important;
          font-size: 6pt !important;
          margin: 5px auto !important;
        }

        /* Table cells - flexible widths, allow text wrapping */
        th,
        td,
        th[style],
        td[style],
        th[style*="width"],
        td[style*="width"],
        .print-table th,
        .print-table td,
        .print-table th[style],
        .print-table td[style] {
          padding: 3px 4px !important;
          border: 0.5px solid #000 !important;
          font-size: 6pt !important;
          white-space: normal !important;
          word-wrap: break-word !important;
          word-break: break-word !important;
          overflow: visible !important;
          width: auto !important;
          min-width: auto !important;
          max-width: none !important;
          line-height: 1.3 !important;
        }

        /* Table headers */
        th {
          background: #f0f0f0 !important;
          font-weight: bold !important;
          text-align: center !important;
        }

        /* Table body cells */
        td {
          text-align: center !important;
        }

        /* Remove sticky positioning */
        .sticky,
        [class*="sticky"] {
          position: static !important;
          z-index: auto !important;
        }

        /* Table structure */
        thead {
          display: table-header-group !important;
        }

        tbody {
          display: table-row-group !important;
        }

        tr {
          page-break-inside: avoid !important;
        }

        /* ========== CARDS & SECTIONS ========== */
        [class*="Card"] {
          border: 1px solid #000 !important;
          border-radius: 0 !important;
          padding: 8px !important;
          margin: 5px auto !important;
          background: white !important;
          page-break-inside: avoid !important;
          text-align: center !important;
        }

        /* ========== TEXT SIZES ========== */
        p, span, div {
          font-size: 8pt !important;
          line-height: 1.4 !important;
          text-align: center !important;
        }

        .text-3xl { font-size: 14pt !important; text-align: center !important; }
        .text-2xl { font-size: 12pt !important; text-align: center !important; }
        .text-xl { font-size: 10pt !important; text-align: center !important; }
        .text-sm { font-size: 8pt !important; text-align: center !important; }
        .text-xs { font-size: 7pt !important; text-align: center !important; }

        h1 { font-size: 14pt !important; text-align: center !important; }
        h2 { font-size: 12pt !important; text-align: center !important; }
        h3 { font-size: 10pt !important; text-align: center !important; }
        h4 { font-size: 9pt !important; text-align: center !important; }

        /* ========== CLEANUP ========== */
        * {
          box-shadow: none !important;
          text-shadow: none !important;
          border-radius: 0 !important;
        }

        .bg-gradient-to-br,
        [class*="gradient"],
        [class*="bg-blue"],
        [class*="bg-green"] {
          background: white !important;
          color: #000 !important;
          border: 1px solid #000 !important;
        }

        .space-y-6 > * { margin: 3px 0 !important; }
        .gap-4, .gap-6 { gap: 3px !important; }
        .p-6, .p-4 { padding: 5px !important; }

        /* ========== REPORT HEADER/FOOTER ========== */
        .report-header {
          display: block !important;
          margin-bottom: 10px !important;
        }

        .report-footer {
          position: fixed !important;
          bottom: 0 !important;
          left: 0 !important;
          right: 0 !important;
          padding: 5px 1cm !important;
          border-top: 1px solid #000 !important;
          background: white !important;
          font-size: 7pt !important;
        }
      }

      /* Screen preview styles - Better formatting */
      @media screen {
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          padding: 0;
          background: #f5f5f5;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          font-size: 14px;
          line-height: 1.5;
        }
        
        .print-button {
          position: fixed;
          top: 20px;
          right: 20px;
          padding: 12px 24px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          z-index: 1000;
        }
        
        .print-button:hover {
          background: #2563eb;
        }
        
        .print-content {
          background: white;
          padding: 30px;
          margin: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          max-width: 100%;
          overflow-x: auto;
          min-height: 100vh;
        }

        .print-content > * {
          margin: 0;
          padding: 0;
        }

        .print-content > div {
          width: 100%;
          max-width: 100%;
        }

        /* Tables in screen preview */
        table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          margin: 15px 0;
          font-size: 12px;
          table-layout: auto;
        }

        th, td {
          padding: 10px 12px;
          border: 1px solid #ddd;
          text-align: left;
          vertical-align: top;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        th {
          background: #f8f9fa;
          font-weight: 600;
          position: relative;
        }

        /* Prevent table cells from overlapping */
        tr {
          display: table-row;
        }

        tbody tr:hover {
          background: #f8f9fa;
        }

        /* Cards in screen preview */
        [class*="Card"] {
          margin: 15px 0;
          padding: 15px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          background: white;
        }

        /* Grid layouts */
        .grid {
          display: grid;
          gap: 15px;
        }

        /* Spacing */
        .space-y-6 > * {
          margin-top: 20px;
          margin-bottom: 20px;
        }

        .gap-4 {
          gap: 15px;
        }

        .gap-6 {
          gap: 20px;
        }

        /* Text sizes */
        h1 { font-size: 24px; margin: 20px 0; }
        h2 { font-size: 20px; margin: 18px 0; }
        h3 { font-size: 18px; margin: 16px 0; }
        h4 { font-size: 16px; margin: 14px 0; }

        .text-3xl { font-size: 30px; }
        .text-2xl { font-size: 24px; }
        .text-xl { font-size: 20px; }
        .text-sm { font-size: 14px; }
        .text-xs { font-size: 12px; }

        /* Remove overflow restrictions for screen */
        .print-table-container,
        [class*="overflow"] {
          overflow-x: auto;
          overflow-y: visible;
        }

        /* Ensure tables are visible */
        .print-table {
          width: 100%;
          min-width: 100%;
        }
      }
    `

    // Create the print HTML
    const printHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reports & Analytics - Print</title>
          <style>
            ${styles}
            ${inlineStyles}
            ${printCSS}
          </style>
        </head>
        <body>
          <button class="print-button" onclick="window.print()">🖨️ Print</button>
          <div class="print-content">
            <div style="max-width: 100%; overflow-x: auto;">
              ${clonedContent.innerHTML}
            </div>
          </div>
        </body>
      </html>
    `

    // Write to the new tab
    printWindow.document.write(printHTML)
    printWindow.document.close()
    
    // Focus the new tab
    printWindow.focus()
  }, [])

  // ✅ Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
        setShowProjectDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ✅ PERFORMANCE: Debounce filter changes to reduce recalculation
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedDivision(selectedDivision)
      setDebouncedProjects(selectedProjects)
      setDebouncedDateRange(dateRange)
    }, 300) // 300ms debounce
    
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [selectedDivision, selectedProjects, dateRange])

  // ✅ CACHE: Clear cache (defined first for use in other cache functions)
  const clearCache = useCallback(() => {
    try {
      localStorage.removeItem(CACHE_KEYS.projects)
      localStorage.removeItem(CACHE_KEYS.activities)
      localStorage.removeItem(CACHE_KEYS.kpis)
      localStorage.removeItem(CACHE_KEYS.analytics)
      localStorage.removeItem(CACHE_KEYS.timestamp)
      console.log('🗑️ Cache cleared')
    } catch (error) {
      console.error('❌ Error clearing cache:', error)
    }
  }, [])

  // ✅ CACHE: Load data from localStorage (with fallback for partial cache)
  const loadFromCache = useCallback(() => {
    try {
      const timestamp = localStorage.getItem(CACHE_KEYS.timestamp)
      if (!timestamp) return null
      
      const cacheAge = Date.now() - parseInt(timestamp, 10)
      if (cacheAge > CACHE_EXPIRATION_MS) {
        console.log('⏰ Cache expired, will fetch fresh data')
        return null
      }
      
      const cachedProjects = localStorage.getItem(CACHE_KEYS.projects)
      const cachedActivities = localStorage.getItem(CACHE_KEYS.activities)
      const cachedKPIs = localStorage.getItem(CACHE_KEYS.kpis)
      const cachedAnalytics = localStorage.getItem(CACHE_KEYS.analytics)
      
      // At minimum, we need projects and KPIs
      if (!cachedProjects || !cachedKPIs) {
        return null
      }
      
      const projects = JSON.parse(cachedProjects)
      const kpis = JSON.parse(cachedKPIs)
      const activities = cachedActivities ? JSON.parse(cachedActivities) : []
      const analytics = cachedAnalytics ? JSON.parse(cachedAnalytics) : null
      
      console.log(`✅ Loaded from cache: ${projects.length} projects, ${activities.length} activities, ${kpis.length} KPIs${analytics ? `, ${analytics.length} analytics` : ''} (age: ${Math.round(cacheAge / 1000 / 60)} minutes)`)
      
      return { projects, activities, kpis, analytics }
    } catch (error) {
      console.error('❌ Error loading from cache:', error)
      // Clear corrupted cache
      try {
        clearCache()
      } catch (e) {
        // Ignore errors when clearing
      }
      return null
    }
  }, [clearCache])

  // ✅ CACHE: Save data to localStorage with smart fallback
  const saveToCache = useCallback((projects: Project[], activities: BOQActivity[], kpis: ProcessedKPI[], analytics?: any[]) => {
    try {
      // First, try to clear old cache to free space
      try {
        localStorage.removeItem(CACHE_KEYS.projects)
        localStorage.removeItem(CACHE_KEYS.activities)
        localStorage.removeItem(CACHE_KEYS.kpis)
        localStorage.removeItem(CACHE_KEYS.analytics)
      } catch (e) {
        // Ignore errors when clearing
      }

      // Try to save essential data first
      try {
        localStorage.setItem(CACHE_KEYS.projects, JSON.stringify(projects))
        localStorage.setItem(CACHE_KEYS.kpis, JSON.stringify(kpis))
        localStorage.setItem(CACHE_KEYS.timestamp, Date.now().toString())
        console.log('💾 Essential data saved to cache')
      } catch (error: any) {
        if (error.name === 'QuotaExceededError') {
          console.warn('⚠️ localStorage full, skipping cache save')
          return
        }
        throw error
      }

      // Try to save activities (usually the largest)
      try {
        localStorage.setItem(CACHE_KEYS.activities, JSON.stringify(activities))
        console.log('💾 Activities saved to cache')
      } catch (error: any) {
        if (error.name === 'QuotaExceededError') {
          console.warn('⚠️ Activities too large for cache, skipping activities')
          // Keep essential data (projects, KPIs) but skip activities
        } else {
          throw error
        }
      }

      // Try to save analytics (optional, can be skipped if needed)
      if (analytics) {
        try {
          // ✅ OPTIMIZATION: Only save essential analytics fields to reduce size
          const compactAnalytics = analytics.map((a: any) => ({
            project: { id: a.project.id, project_code: a.project.project_code, project_full_code: a.project.project_full_code },
            totalValue: a.totalValue,
            totalEarnedValue: a.totalEarnedValue,
            totalPlannedValue: a.totalPlannedValue,
            totalRemainingValue: a.totalRemainingValue,
            variance: a.variance,
            variancePercentage: a.variancePercentage,
            projectStatus: a.projectStatus
          }))
          localStorage.setItem(CACHE_KEYS.analytics, JSON.stringify(compactAnalytics))
          console.log(`💾 Analytics saved to cache (compact format: ${analytics.length} items)`)
        } catch (error: any) {
          if (error.name === 'QuotaExceededError') {
            console.warn('⚠️ Analytics too large for cache, skipping analytics')
            // Analytics are optional, continue without them
          } else {
            throw error
          }
        }
      }
    } catch (error: any) {
      console.error('❌ Error saving to cache:', error)
      // Final fallback: clear everything and try to save at least timestamp
      try {
        clearCache()
        localStorage.setItem(CACHE_KEYS.timestamp, Date.now().toString())
        console.log('💾 Cache cleared and timestamp saved')
      } catch (finalError) {
        console.error('❌ Failed to save even timestamp:', finalError)
      }
    }
  }, [clearCache])

  // ✅ CACHE: Get cache size estimate (for debugging)
  const getCacheSize = useCallback(() => {
    try {
      let totalSize = 0
      Object.values(CACHE_KEYS).forEach(key => {
        const item = localStorage.getItem(key)
        if (item) {
          totalSize += new Blob([item]).size
        }
      })
      return totalSize
    } catch (error) {
      return 0
    }
  }, [])

  // Helper function to fetch all records with pagination (Supabase default limit is 1000)
  const fetchAllRecords = useCallback(async (table: string) => {
    let allData: any[] = []
    let offset = 0
    const chunkSize = 1000
    let hasMore = true
    
    while (hasMore) {
      const { data, error } = await supabase
        .from(table)
          .select('*')
              .order('created_at', { ascending: false })
        .range(offset, offset + chunkSize - 1)
      
      if (error) {
        console.error(`❌ Error fetching ${table}:`, error)
        throw error
      }
      
      if (!data || data.length === 0) {
        hasMore = false
        break
      }
      
      allData = [...allData, ...data]
      console.log(`📥 Fetched ${table} chunk: ${data.length} records (total so far: ${allData.length})`)
      
      if (data.length < chunkSize) {
        hasMore = false
      } else {
        offset += chunkSize
      }
    }
    
    console.log(`✅ Total ${table} records fetched: ${allData.length}`)
    return allData
  }, [supabase])

  // ✅ Store loading functions in ref to prevent infinite loops
  const loadingFunctionsRef = useRef({ startSmartLoading, stopSmartLoading })
  useEffect(() => {
    loadingFunctionsRef.current = { startSmartLoading, stopSmartLoading }
  }, [startSmartLoading, stopSmartLoading])

  const fetchAllData = useCallback(async (forceRefresh: boolean = false) => {
    try {
      // ✅ CACHE: Try to load from cache first (unless force refresh)
      if (!forceRefresh) {
        const cachedData = loadFromCache()
        if (cachedData) {
          if (isMountedRef.current) {
            setProjects(cachedData.projects)
            setActivities(cachedData.activities)
            setKpis(cachedData.kpis)
            if (cachedData.analytics) {
              setCachedAnalytics(cachedData.analytics)
            }
            setLoading(false)
            setIsFromCache(true)
          }
          return
        }
      }
      
      // If loading from server, reset cache flag
      setIsFromCache(false)
      setCachedAnalytics(null)

      loadingFunctionsRef.current.startSmartLoading(setLoading)
      setError('')

      // Fetch all data with pagination to get ALL records (not just first 1000)
      const [projectsData, activitiesData, kpisData] = await Promise.all([
        fetchAllRecords(TABLES.PROJECTS),
        fetchAllRecords(TABLES.BOQ_ACTIVITIES),
        fetchAllRecords(TABLES.KPI)
      ])

      const mappedProjects = (projectsData || []).map(mapProjectFromDB)
      const mappedActivities = (activitiesData || []).map(mapBOQFromDB)
      const mappedKPIs = (kpisData || []).map(mapKPIFromDB)
      const processedKPIs = mappedKPIs.map(processKPIRecord)

      // ✅ PERFORMANCE: Calculate analytics once and cache it
      const calculatedAnalytics = getAllProjectsAnalytics(mappedProjects, mappedActivities, processedKPIs)

      if (isMountedRef.current) {
      setProjects(mappedProjects)
      setActivities(mappedActivities)
      setKpis(processedKPIs)
        setCachedAnalytics(calculatedAnalytics)
        
        // ✅ CACHE: Save to cache after successful load (including analytics)
        saveToCache(mappedProjects, mappedActivities, processedKPIs, calculatedAnalytics)
      }
      
      console.log(`✅ Reports data loaded: ${mappedProjects.length} projects, ${mappedActivities.length} activities, ${processedKPIs.length} KPIs`)
    } catch (error: any) {
      console.error('Error loading data:', error)
      if (isMountedRef.current) {
        setError('Failed to load report data: ' + (error.message || 'Unknown error'))
      }
    } finally {
      if (isMountedRef.current) {
        loadingFunctionsRef.current.stopSmartLoading(setLoading)
      }
    }
  }, [fetchAllRecords, loadFromCache, saveToCache])

  // ✅ Load data on mount only (prevent infinite loop)
  const hasLoadedRef = useRef(false)
  useEffect(() => {
    isMountedRef.current = true
    
    // Only load once
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true
      fetchAllData()
    }
    
    return () => {
      isMountedRef.current = false
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Empty deps - only run once on mount

  // Filter data based on division, project, and date range
  // ✅ PERFORMANCE: Optimized filtering using Sets for O(1) lookups and debounced values
  const filteredData = useMemo(() => {
    let filteredProjects = projects
    let filteredActivities = activities
    let filteredKPIs = kpis

    // Filter by division (using debounced value)
    if (debouncedDivision) {
      filteredProjects = filteredProjects.filter(p => p.responsible_division === debouncedDivision)
    }

    // Filter by projects (multi-select, using debounced values)
    // ✅ FIX: Use project_full_code only
    if (debouncedProjects.length > 0) {
      const debouncedProjectsSet = new Set(debouncedProjects)
      filteredProjects = filteredProjects.filter(p => 
        (p.project_full_code && debouncedProjectsSet.has(p.project_full_code)) || 
        debouncedProjectsSet.has(p.id)
      )
    }

    // Filter activities and KPIs based on filtered projects
    // ✅ PERFORMANCE: Use Sets for O(1) lookup instead of O(n) includes
    // ✅ FIX: Use project_full_code only for matching
    if (debouncedDivision || debouncedProjects.length > 0) {
      const projectFullCodesSet = new Set(filteredProjects.map(p => p.project_full_code).filter(Boolean))
      const projectIdsSet = new Set(filteredProjects.map(p => p.id))
      
      filteredActivities = filteredActivities.filter(a => {
        const activityFullCode = a.project_full_code || ''
        return projectFullCodesSet.has(activityFullCode) ||
               projectIdsSet.has(a.project_id)
      })
      
      filteredKPIs = filteredKPIs.filter(k => {
        const kpiProjectFullCode = (k as any).project_full_code || (k as any)['Project Full Code'] || ''
        return projectFullCodesSet.has(kpiProjectFullCode) ||
               ((k as any).project_id && projectIdsSet.has((k as any).project_id))
      })
    }

    // Filter by date range (using debounced values)
    if (debouncedDateRange.start) {
      const startDate = new Date(debouncedDateRange.start).getTime()
      filteredActivities = filteredActivities.filter(a => {
        return new Date(a.created_at).getTime() >= startDate
      })
      filteredKPIs = filteredKPIs.filter(k => {
        return new Date(k.created_at).getTime() >= startDate
      })
    }

    if (debouncedDateRange.end) {
      const endDate = new Date(debouncedDateRange.end).getTime()
      filteredActivities = filteredActivities.filter(a => {
        return new Date(a.created_at).getTime() <= endDate
      })
      filteredKPIs = filteredKPIs.filter(k => {
        return new Date(k.created_at).getTime() <= endDate
      })
    }

    return { filteredProjects, filteredActivities, filteredKPIs }
  }, [projects, activities, kpis, debouncedDivision, debouncedProjects, debouncedDateRange.start, debouncedDateRange.end])

  // ✅ PERFORMANCE: Use cached analytics and filter instead of recalculating
  const allAnalytics = useMemo(() => {
    const { filteredProjects, filteredActivities, filteredKPIs } = filteredData
    
    // If no filters applied, use cached analytics directly (much faster)
    if (!debouncedDivision && debouncedProjects.length === 0 && !debouncedDateRange.start && !debouncedDateRange.end) {
      if (cachedAnalytics && cachedAnalytics.length > 0) {
        // Filter cached analytics by projects
        const filteredProjectIds = new Set(filteredProjects.map(p => p.id))
        return cachedAnalytics.filter((a: any) => filteredProjectIds.has(a.project.id))
      }
    }
    
    // If filters applied or no cache, calculate from filtered data
    if (filteredProjects.length === 0) return []
    
    // ✅ PERFORMANCE: Only recalculate if filters changed, otherwise use cached
    return getAllProjectsAnalytics(filteredProjects, filteredActivities, filteredKPIs)
  }, [filteredData, cachedAnalytics, debouncedDivision, debouncedProjects, debouncedDateRange.start, debouncedDateRange.end])

  // Calculate comprehensive statistics
  // ✅ PERFORMANCE: Optimized stats calculation - separate simple counts from heavy analytics
  const stats = useMemo((): ReportStats => {
    const { filteredProjects, filteredActivities, filteredKPIs } = filteredData
    
    // Projects stats - simple counts (fast)
    const totalProjects = filteredProjects.length
    const activeProjects = filteredProjects.filter(p => 
      p.project_status === 'on-going' || p.project_status === 'site-preparation'
    ).length
    const completedProjects = filteredProjects.filter(p => 
      p.project_status === 'completed-duration' || p.project_status === 'contract-completed'
    ).length

    // Activities stats - simple counts (fast)
    const totalActivities = filteredActivities.length
    const completedActivities = filteredActivities.filter(a => 
      a.activity_progress_percentage >= 100 || a.activity_completed
    ).length
    const now = Date.now()
    const delayedActivities = filteredActivities.filter(a => 
      a.activity_delayed || (a.deadline && new Date(a.deadline).getTime() < now && a.activity_progress_percentage < 100)
    ).length

    // KPIs stats - simple counts (fast)
    const totalKPIs = filteredKPIs.length
    const plannedKPIs = filteredKPIs.filter(k => k.input_type === 'Planned').length
    const actualKPIs = filteredKPIs.filter(k => k.input_type === 'Actual').length

    // ✅ FIXED: Calculate Financial stats directly from KPIs
    // This prevents double-counting when multiple projects share KPIs
    
    // ✅ Calculate yesterday date (end of yesterday) for Planned Value filtering
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(23, 59, 59, 999)
    
    // Helper function to parse date string
    const parseDateString = (dateStr: string | null | undefined): Date | null => {
      if (!dateStr || dateStr === '' || dateStr === 'N/A' || dateStr === 'null') {
        return null
      }
      try {
        const date = new Date(dateStr)
        return isNaN(date.getTime()) ? null : date
      } catch {
        return null
      }
    }
    
    // ✅ Helper function to extract project codes (same logic as workValueCalculator.ts)
    const extractProjectCodes = (item: any): string[] => {
      const codes: string[] = []
      const raw = (item as any).raw || {}
      
      // ✅ PRIORITY 1: Extract project_full_code (most specific - distinguishes P4110 from P4110-P)
      const fullCodeSources = [
        item.project_full_code,
        (item as any)['Project Full Code'],
        raw['Project Full Code']
      ]
      
      for (const source of fullCodeSources) {
        if (source) {
          const code = source.toString().trim()
          if (code) {
            codes.push(code)
            codes.push(code.toUpperCase())
            // If we have a full code, return immediately (don't add project_code)
            // This ensures P4110-P and P4110 are treated as different projects
            return Array.from(new Set(codes))
          }
        }
      }
      
      // ✅ PRIORITY 2: Extract project_code (fallback if no full code exists)
      const codeSources = [
        item.project_code,
        (item as any)['Project Code'],
        raw['Project Code']
      ]
      
      for (const source of codeSources) {
        if (source) {
          const code = source.toString().trim()
          if (code) {
            codes.push(code)
            codes.push(code.toUpperCase())
          }
        }
      }
      
      return Array.from(new Set(codes))
    }
    
    // ✅ Helper function to check if codes match (same logic as workValueCalculator.ts)
    const codesMatch = (itemCodes: string[], targetCodes: string[]): boolean => {
      const targetCodesUpper = targetCodes.map(c => c.toUpperCase().trim())
      const itemCodesUpper = itemCodes.map(c => c.toUpperCase().trim())
      
      // ✅ First, try exact match (most important for project_full_code)
      for (const itemCode of itemCodesUpper) {
        if (targetCodesUpper.includes(itemCode)) {
          return true
        }
      }
      
      // ✅ Only if no exact match, check if one is a prefix of another
      // But ONLY if both don't have a dash (to avoid matching P4110 with P4110-P)
      for (const itemCode of itemCodesUpper) {
        for (const targetCode of targetCodesUpper) {
          // If both codes contain a dash, require exact match
          const itemHasDash = itemCode.includes('-')
          const targetHasDash = targetCode.includes('-')
          
          if (itemHasDash || targetHasDash) {
            // If either has a dash, only exact match is allowed
            if (itemCode === targetCode) {
              return true
            }
          } else {
            // If neither has a dash, allow prefix matching (for backward compatibility)
            if (itemCode.startsWith(targetCode) || targetCode.startsWith(itemCode)) {
              return true
            }
          }
        }
      }
      
      return false
    }
    
    // ✅ Get selected project codes for filtering KPIs (using extractProjectCodes)
    const selectedProjectCodesList: string[] = []
    filteredProjects.forEach((project: Project) => {
      const projectCodes = extractProjectCodes(project)
      selectedProjectCodesList.push(...projectCodes)
    })
    const selectedProjectCodes = Array.from(new Set(selectedProjectCodesList))
    
    // Helper function to check if KPI matches selected projects
    // ✅ CRITICAL: Use same logic as workValueCalculator.ts to distinguish P4110 from P4110-P
    const kpiMatchesProjects = (kpi: any): boolean => {
      if (selectedProjectCodes.length === 0) {
        return true // No project filter, include all
      }
      
      const kpiCodes = extractProjectCodes(kpi)
      return codesMatch(kpiCodes, selectedProjectCodes)
    }
    
    // ✅ Calculate Total Value from ALL Planned KPIs (NO date filter, but with project filter)
    // Total Value = مجموع جميع Planned KPIs للمشاريع المختارة بدون فلترة بالتاريخ
    let totalValue = 0
    
    // Filter all Planned KPIs that match selected projects (NO date filter)
    const allPlannedKPIs = kpis.filter((k: any) => {
      // Check input type (case-insensitive)
      const inputType = String(k.input_type || (k as any).raw?.['Input Type'] || (k as any).raw?.['input_type'] || '').trim().toLowerCase()
      if (inputType !== 'planned') {
        return false
      }
      
      // Check if KPI matches selected projects
      return kpiMatchesProjects(k)
    })
    
    // Calculate Total Value from all Planned KPIs (no date filtering)
    allPlannedKPIs.forEach((kpi: any) => {
      const rawKPI = (kpi as any).raw || {}
      
      // ✅ PRIORITY 1: Use Planned Value directly from KPI (most accurate)
      const plannedValue = kpi.planned_value || parseFloat(String(rawKPI['Planned Value'] || '0').replace(/,/g, '')) || 0
      if (plannedValue > 0) {
        totalValue += plannedValue
        return
      }
      
      // ✅ PRIORITY 2: Fallback to Value field if Planned Value is not available
      let kpiValue = 0
      
      // Try raw['Value'] (from database with capital V)
      if (rawKPI['Value'] !== undefined && rawKPI['Value'] !== null) {
        const val = rawKPI['Value']
        kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
      }
      
      // Try raw.value (from database with lowercase v)
      if (kpiValue === 0 && rawKPI.value !== undefined && rawKPI.value !== null) {
        const val = rawKPI.value
        kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
      }
      
      // Try k.value (direct property from ProcessedKPI)
      if (kpiValue === 0 && kpi.value !== undefined && kpi.value !== null) {
        const val = kpi.value
        kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
      }
      
      if (kpiValue > 0) {
        totalValue += kpiValue
      }
    })
    
    // ✅ Calculate Planned Value from Planned KPIs UNTIL YESTERDAY (with date filter)
    // Planned Value = مجموع Planned KPIs للمشاريع المختارة حتى أمس (مع فلترة بالتاريخ)
    let totalPlannedValue = 0
    
    // Filter Planned KPIs that match selected projects AND are until yesterday
    const plannedKPIsList = kpis.filter((k: any) => {
      // First check if it's Planned (case-insensitive)
      const inputType = String(k.input_type || (k as any).raw?.['Input Type'] || (k as any).raw?.['input_type'] || '').trim().toLowerCase()
      if (inputType !== 'planned') {
        return false
      }
      
      // Check if KPI matches selected projects
      if (!kpiMatchesProjects(k)) {
        return false
      }
      
      // ✅ Filter by date: only KPIs until yesterday
      const rawKPI = (k as any).raw || {}
      const kpiDateStr = k.activity_date ||
                        k.target_date ||
                        rawKPI['Activity Date'] ||
                        rawKPI['Target Date'] ||
                        rawKPI['Day'] ||
                        k.day ||
                        ''
      
      if (kpiDateStr) {
        const kpiDate = parseDateString(kpiDateStr)
        if (kpiDate && kpiDate > yesterday) {
          return false // Skip KPIs after yesterday
        }
      }
      
      return true
    })
    
    // Debug log
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 [Financial Stats Calculation]', {
        totalKPIs: kpis.length,
        filteredKPIsCount: filteredKPIs.length,
        allPlannedKPIsCount: allPlannedKPIs.length,
        plannedKPIsUntilYesterdayCount: plannedKPIsList.length,
        totalValue,
        totalPlannedValue: 0, // Will be calculated below
        selectedProjectsCount: filteredProjects.length,
        selectedProjectCodes: Array.from(selectedProjectCodes)
      })
    }
    
    plannedKPIsList.forEach((kpi: any) => {
      const rawKPI = (kpi as any).raw || {}
      
      // ✅ PRIORITY 1: Use Planned Value directly from KPI (most accurate)
      const plannedValue = kpi.planned_value || parseFloat(String(rawKPI['Planned Value'] || '0').replace(/,/g, '')) || 0
      if (plannedValue > 0) {
        totalPlannedValue += plannedValue
        return
      }
      
      // ✅ PRIORITY 2: Fallback to Value field if Planned Value is not available
      let kpiValue = 0
      
      // Try raw['Value'] (from database with capital V)
      if (rawKPI['Value'] !== undefined && rawKPI['Value'] !== null) {
        const val = rawKPI['Value']
        kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
      }
      
      // Try raw.value (from database with lowercase v)
      if (kpiValue === 0 && rawKPI.value !== undefined && rawKPI.value !== null) {
        const val = rawKPI.value
        kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
      }
      
      // Try k.value (direct property from ProcessedKPI)
      if (kpiValue === 0 && kpi.value !== undefined && kpi.value !== null) {
        const val = kpi.value
        kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
      }
      
      if (kpiValue > 0) {
        totalPlannedValue += kpiValue
      }
    })
    
    // Calculate Earned Value from ALL Actual KPIs
    let totalEarnedValue = 0
    const actualKPIsList = filteredKPIs.filter(k => k.input_type === 'Actual')
    
    actualKPIsList.forEach((kpi: any) => {
      const rawKPI = (kpi as any).raw || {}
      
      // ✅ PRIORITY 1: Use Actual Value directly from KPI (most accurate)
      const actualValue = kpi.actual_value || parseFloat(String(rawKPI['Actual Value'] || '0').replace(/,/g, '')) || 0
      if (actualValue > 0) {
        totalEarnedValue += actualValue
        return
      }
      
      // ✅ PRIORITY 2: Fallback to Value field if Actual Value is not available
      let kpiValue = 0
      
      // Try raw['Value'] (from database with capital V)
      if (rawKPI['Value'] !== undefined && rawKPI['Value'] !== null) {
        const val = rawKPI['Value']
        kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
      }
      
      // Try raw.value (from database with lowercase v)
      if (kpiValue === 0 && rawKPI.value !== undefined && rawKPI.value !== null) {
        const val = rawKPI.value
        kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
      }
      
      // Try k.value (direct property from ProcessedKPI)
      if (kpiValue === 0 && kpi.value !== undefined && kpi.value !== null) {
        const val = kpi.value
        kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
      }
      
      if (kpiValue > 0) {
        totalEarnedValue += kpiValue
      }
    })
    
    // ✅ Total Value = Sum of ALL Planned KPIs (NO date filter)
    // Planned Value = Sum of Planned KPIs UNTIL YESTERDAY (with date filter)
    // Total Value represents the total planned value from all Planned KPIs without date filtering
    
    const variance = totalEarnedValue - totalPlannedValue
    const overallProgress = totalValue > 0 ? (totalEarnedValue / totalValue) * 100 : 0

    return {
      totalProjects,
      activeProjects,
      completedProjects,
      totalActivities,
      completedActivities,
      delayedActivities,
      totalKPIs,
      plannedKPIs,
      actualKPIs,
    totalValue,
      earnedValue: totalEarnedValue,
      plannedValue: totalPlannedValue,
    variance,
      overallProgress
    }
  }, [filteredData])

  // Get unique divisions
  const divisions = useMemo(() => {
    return Array.from(new Set(projects.map(p => p.responsible_division).filter(Boolean))).sort()
  }, [projects])

  // ✅ PERFORMANCE: Memoize formatting functions
  const formatCurrency = useCallback((amount: number, currencyCode?: string) => {
    return formatCurrencyByCodeSync(amount || 0, currencyCode || 'AED')
  }, [])

  const formatNumber = useCallback((num: number) => {
    return new Intl.NumberFormat('en-US').format(num)
  }, [])

  const formatPercentage = useCallback((num: number) => {
    return `${num.toFixed(1)}%`
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
  return (
      <Alert variant="error" className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <span>{error}</span>
        <Button onClick={() => fetchAllData(true)} size="sm" variant="outline" className="ml-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </Alert>
    )
  }

  return (
    <PrintableReport title="Reports & Analytics" reportType={activeReport}>
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between no-print">
        <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reports & Analytics</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Comprehensive project performance insights
              {isFromCache && (
                <span className="ml-2 text-xs text-blue-600 dark:text-blue-400" title="Data loaded from cache">
                  (Cached)
                </span>
              )}
          </p>
        </div>
          <div className="flex items-center gap-2">
          <Button onClick={() => fetchAllData(true)} variant="outline" size="sm" title="Refresh data from server (bypass cache)">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
            <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
          </Button>
        </div>
      </div>

        {/* Filters */}
        <Card className="no-print">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Division
                </label>
                <select
                  value={selectedDivision}
                  onChange={(e) => {
                    setSelectedDivision(e.target.value)
                    // Clear project selection when division changes
                    if (e.target.value !== selectedDivision) {
                      setSelectedProjects([])
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">All Divisions</option>
                  {divisions.map(div => (
                    <option key={div} value={div}>{div}</option>
                  ))}
                </select>
              </div>
              <div className="relative" ref={projectDropdownRef}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Project
                </label>
                <button
                  type="button"
                  onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white flex items-center justify-between ${
                    selectedProjects.length > 0
                      ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800'
                      : 'border-gray-300 dark:border-gray-600'
                  } hover:border-gray-400 dark:hover:border-gray-500`}
                >
                  <span className="text-sm truncate">
                    {selectedProjects.length === 0
                      ? 'All Projects'
                      : selectedProjects.length === 1
                      ? (() => {
                          const project = projects.find(p => 
                            (p.project_full_code && selectedProjects.includes(p.project_full_code)) || 
                            selectedProjects.includes(p.id)
                          )
                          return project 
                            ? `${project.project_full_code || `${project.project_code}${project.project_sub_code ? `-${project.project_sub_code}` : ''}`} - ${project.project_name}`
                            : '1 project selected'
                        })()
                      : `${selectedProjects.length} projects selected`
                    }
                  </span>
                  <ChevronDown className={`w-4 h-4 ml-2 flex-shrink-0 transition-transform ${showProjectDropdown ? 'rotate-180' : ''}`} />
                </button>
                
                {showProjectDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-80 overflow-hidden">
                    <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search projects..."
                          value={projectSearch}
                          onChange={(e) => setProjectSearch(e.target.value)}
                          className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          autoFocus
                        />
                      </div>
                      {selectedProjects.length > 0 && (
                        <button
                          onClick={() => setSelectedProjects([])}
                          className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                        >
                          Clear selection
                        </button>
                      )}
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {(() => {
                        const availableProjects = selectedDivision 
                    ? projects.filter(p => p.responsible_division === selectedDivision)
                    : projects
                        
                        const filteredProjects = projectSearch
                          ? availableProjects.filter(p => {
                              const searchLower = projectSearch.toLowerCase()
                              const projectCode = (p.project_full_code || `${p.project_code}${p.project_sub_code ? `-${p.project_sub_code}` : ''}`).toLowerCase()
                              const projectName = (p.project_name || '').toLowerCase()
                              return projectCode.includes(searchLower) || projectName.includes(searchLower)
                            })
                          : availableProjects
                        
                        return filteredProjects.length > 0 ? (
                          filteredProjects.map((project) => {
                            const projectFullCode = project.project_full_code || project.id
                            const displayCode = project.project_full_code || `${project.project_code}${project.project_sub_code ? `-${project.project_sub_code}` : ''}`
                            const isSelected = selectedProjects.includes(projectFullCode)
                            
                            return (
                              <label
                                key={project.id}
                                className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    if (isSelected) {
                                      setSelectedProjects(selectedProjects.filter(p => p !== projectFullCode))
                                    } else {
                                      setSelectedProjects([...selectedProjects, projectFullCode])
                                    }
                                  }}
                                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                    {displayCode}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {project.project_name}
                                  </div>
                                </div>
                              </label>
                            )
                          })
                        ) : (
                          <div className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                            No projects found
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={() => {
                    setSelectedDivision('')
                    setSelectedProjects([])
                    setDateRange({ start: '', end: '' })
                    setProjectSearch('')
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Clear Filters
                </Button>
            </div>
          </div>
        </CardContent>
      </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
            <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Projects</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {formatNumber(stats.totalProjects)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {stats.activeProjects} active, {stats.completedProjects} completed
                </p>
              </div>
                <Building2 className="h-12 w-12 text-blue-500 dark:text-blue-400 opacity-50" />
            </div>
          </CardContent>
        </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
            <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">BOQ Activities</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {formatNumber(stats.totalActivities)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {stats.completedActivities} completed, {stats.delayedActivities} delayed
                </p>
              </div>
                <Target className="h-12 w-12 text-green-500 dark:text-green-400 opacity-50" />
            </div>
          </CardContent>
        </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
            <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                  <p className="text-sm font-medium text-purple-600 dark:text-purple-400">KPI Records</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {formatNumber(stats.totalKPIs)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {stats.plannedKPIs} planned, {stats.actualKPIs} actual
                </p>
              </div>
                <BarChart3 className="h-12 w-12 text-purple-500 dark:text-purple-400 opacity-50" />
            </div>
          </CardContent>
        </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20">
            <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                  <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Overall Progress</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {formatPercentage(stats.overallProgress)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Based on earned value
                </p>
              </div>
                <TrendingUp className="h-12 w-12 text-orange-500 dark:text-orange-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                Total Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(stats.totalValue)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Total contract value
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-blue-500" />
                Earned Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(stats.earnedValue)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {formatPercentage((stats.totalValue > 0 ? stats.earnedValue / stats.totalValue : 0) * 100)} of total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-purple-500" />
                Planned Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(stats.plannedValue)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {formatPercentage((stats.totalValue > 0 ? stats.plannedValue / stats.totalValue : 0) * 100)} of total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-500" />
                Remaining Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(stats.totalValue - stats.earnedValue)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {formatPercentage((stats.totalValue > 0 ? ((stats.totalValue - stats.earnedValue) / stats.totalValue) * 100 : 0))} remaining
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {stats.variance >= 0 ? (
                  <ArrowUpRight className="h-5 w-5 text-green-500" />
                ) : (
                  <ArrowDownRight className="h-5 w-5 text-red-500" />
                )}
                Variance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${stats.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(stats.variance)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Earned - Planned
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Report Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'projects', label: 'Projects', icon: Building2 },
            { id: 'activities', label: 'Activities', icon: Target },
            { id: 'kpis', label: 'KPIs', icon: TrendingUp },
            { id: 'financial', label: 'Financial', icon: DollarSign },
            { id: 'performance', label: 'Performance', icon: Activity },
            { id: 'lookahead', label: 'LookAhead', icon: FastForward },
            { id: 'monthly-revenue', label: 'Monthly Revenue', icon: CalendarDays }
        ].map((tab) => {
          const Icon = tab.icon
          return (
            <Button
              key={tab.id}
              variant={activeReport === tab.id ? 'primary' : 'outline'}
              onClick={() => setActiveReport(tab.id as ReportType)}
              size="sm"
            >
              <Icon className="w-4 h-4 mr-2" />
              {tab.label}
            </Button>
          )
        })}
      </div>

      {/* Report Content */}
        <div className="report-section">
          {activeReport === 'overview' && (
            <OverviewReport stats={stats} filteredData={filteredData} formatCurrency={formatCurrency} formatPercentage={formatPercentage} />
          )}
          {activeReport === 'projects' && (
            <ProjectsReport projects={filteredData.filteredProjects} activities={filteredData.filteredActivities} kpis={filteredData.filteredKPIs} formatCurrency={formatCurrency} />
          )}
          {activeReport === 'activities' && (
            <ActivitiesReport activities={filteredData.filteredActivities} kpis={filteredData.filteredKPIs} formatCurrency={formatCurrency} />
          )}
          {activeReport === 'kpis' && (
            <KPIsReport kpis={filteredData.filteredKPIs} formatCurrency={formatCurrency} />
          )}
          {activeReport === 'financial' && (
            <FinancialReport stats={stats} filteredData={filteredData} formatCurrency={formatCurrency} />
          )}
          {activeReport === 'performance' && (
            <PerformanceReport filteredData={filteredData} formatCurrency={formatCurrency} formatPercentage={formatPercentage} />
          )}
          {activeReport === 'lookahead' && (
            <LookaheadReportView activities={filteredData.filteredActivities} projects={filteredData.filteredProjects} formatCurrency={formatCurrency} />
          )}
          {activeReport === 'monthly-revenue' && (
            <MonthlyWorkRevenueReportView 
              activities={filteredData.filteredActivities} 
              projects={filteredData.filteredProjects} 
              kpis={filteredData.filteredKPIs}
              formatCurrency={formatCurrency} 
            />
          )}
        </div>
      </div>
    </PrintableReport>
  )
}

// Overview Report Component
function OverviewReport({ stats, filteredData, formatCurrency, formatPercentage }: any) {
  const { filteredProjects, filteredActivities, filteredKPIs } = filteredData

  // Project status distribution
  const projectStatusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    filteredProjects.forEach((p: Project) => {
      const status = p.project_status || 'unknown'
      counts[status] = (counts[status] || 0) + 1
    })
    return counts
  }, [filteredProjects])

  // Activity status distribution
  const activityStatusCounts = useMemo(() => {
    return {
      completed: filteredActivities.filter((a: BOQActivity) => a.activity_progress_percentage >= 100).length,
      inProgress: filteredActivities.filter((a: BOQActivity) => a.activity_progress_percentage > 0 && a.activity_progress_percentage < 100).length,
      notStarted: filteredActivities.filter((a: BOQActivity) => a.activity_progress_percentage === 0).length,
      delayed: filteredActivities.filter((a: BOQActivity) => a.activity_delayed).length
    }
  }, [filteredActivities])
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Project Status */}
        <Card>
        <CardHeader>
            <CardTitle>Project Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="space-y-3">
              {Object.entries(projectStatusCounts).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                    {status.replace('-', ' ')}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${(count as number / filteredProjects.length) * 100}%` }}
                      />
      </div>
                    <span className="text-sm font-semibold w-12 text-right">{count as number}</span>
              </div>
                </div>
              ))}
            </div>
        </CardContent>
      </Card>

        {/* Activity Status */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(activityStatusCounts).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                    {status.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${(count as number / filteredActivities.length) * 100}%` }}
                      />
              </div>
                    <span className="text-sm font-semibold w-12 text-right">{count as number}</span>
            </div>
              </div>
              ))}
            </div>
          </CardContent>
        </Card>
    </div>

      {/* Key Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Key Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{formatPercentage(stats.overallProgress)}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Overall Progress</p>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.earnedValue)}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Earned Value</p>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">{formatCurrency(stats.plannedValue)}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Planned Value</p>
            </div>
            <div className={`text-center p-4 rounded-lg ${stats.variance >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
              <p className={`text-2xl font-bold ${stats.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(stats.variance)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Variance</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
  )
}

// Projects Report Component
function ProjectsReport({ projects, activities, kpis, formatCurrency }: any) {
  // ✅ PERFORMANCE: Memoize analytics calculation
  const allAnalytics = useMemo(() => {
    return getAllProjectsAnalytics(projects, activities, kpis)
  }, [projects, activities, kpis])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Projects Report</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: '70vh' }}>
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 border-b-2 border-gray-300 dark:border-gray-600">
                <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800">Project</th>
                <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800">Status</th>
                <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800">Contract Value</th>
                <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800">Earned Value</th>
                <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800">Progress</th>
                <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800">Variance</th>
              </tr>
            </thead>
            <tbody>
              {allAnalytics.map((analytics: any) => {
                const project = analytics.project
                const progress = analytics.actualProgress || 0
                const variance = analytics.variance || 0
              return (
                <tr key={project.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                      <div>
                        <p className="font-medium">{project.project_full_code || `${project.project_code}${project.project_sub_code ? `-${project.project_sub_code}` : ''}`}</p>
                        <p className="text-xs text-gray-500">{project.project_name}</p>
                    </div>
                  </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        project.project_status === 'on-going' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        project.project_status === 'completed-duration' || project.project_status === 'contract-completed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}>
                        {project.project_status?.replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'N/A'}
                    </span>
                  </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right">
                      {formatCurrency(project.contract_amount || 0, project.currency)}
                  </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right">
                      {formatCurrency(analytics.totalEarnedValue || 0, project.currency)}
                  </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                      <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                            className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                      </div>
                        <span className="text-sm font-semibold">{progress.toFixed(1)}%</span>
                    </div>
                  </td>
                    <td className={`border border-gray-300 dark:border-gray-600 px-4 py-2 text-right ${variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(variance, project.currency)}
                  </td>
                </tr>
              )
            })}
            </tbody>
            {allAnalytics.length > 0 && (
              <tfoot className="sticky bottom-0 z-10">
                <tr className="bg-gray-100 dark:bg-gray-800 font-bold border-t-2 border-gray-300 dark:border-gray-600">
                  <td colSpan={2} className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold bg-gray-100 dark:bg-gray-800">Total:</td>
                  <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold bg-gray-100 dark:bg-gray-800">
                    {formatCurrency(
                      allAnalytics.reduce((sum: number, a: any) => {
                        const contractAmt = a.project?.contract_amount || 0
                        return sum + contractAmt
                      }, 0),
                      allAnalytics[0]?.project?.currency || 'AED'
                    )}
                  </td>
                  <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold bg-gray-100 dark:bg-gray-800">
                    {formatCurrency(
                      allAnalytics.reduce((sum: number, a: any) => sum + (a.totalEarnedValue || 0), 0),
                      allAnalytics[0]?.project?.currency || 'AED'
                    )}
                  </td>
                  <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold bg-gray-100 dark:bg-gray-800">
                    {allAnalytics.length > 0 ? (
                      (allAnalytics.reduce((sum: number, a: any) => sum + (a.actualProgress || 0), 0) / allAnalytics.length).toFixed(1)
                    ) : '0.0'}%
                  </td>
                  <td className={`border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold bg-gray-100 dark:bg-gray-800 ${
                    allAnalytics.reduce((sum: number, a: any) => sum + (a.variance || 0), 0) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(
                      allAnalytics.reduce((sum: number, a: any) => sum + (a.variance || 0), 0),
                      allAnalytics[0]?.project?.currency || 'AED'
                    )}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
          </CardContent>
        </Card>
  )
}

// Activities Report Component
function ActivitiesReport({ activities, kpis = [], formatCurrency }: any) {
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50
  
  // Get project currency for each activity
  const getActivityCurrency = (activity: BOQActivity): string => {
    // Try to get currency from project if available
    return (activity as any).project?.currency || 'AED'
  }
  
  // Calculate Actual Units from KPIs for an activity
  const calculateActualUnits = useCallback((activity: BOQActivity): number => {
    if (!kpis || kpis.length === 0) {
      return activity.actual_units || 0
    }
    
    try {
      const activityName = (activity.activity_name || activity.activity || '').toLowerCase().trim()
      const projectFullCode = (activity.project_full_code || activity.project_code || '').toString().trim()
      const zoneRef = (activity.zone_ref || '').toString().trim().toLowerCase()
      const zoneNumber = (activity.zone_number || '').toString().trim().toLowerCase()
      
      // Filter KPIs for this activity
      const activityKPIs = kpis.filter((kpi: any) => {
        const kpiActivityName = String(kpi.activity_name || kpi['Activity Name'] || (kpi as any).raw?.['Activity Name'] || '').toLowerCase().trim()
        const kpiProjectFullCode = String(kpi.project_full_code || kpi['Project Full Code'] || (kpi as any).raw?.['Project Full Code'] || '').toString().trim()
        const kpiProjectCode = String(kpi.project_code || kpi['Project Code'] || (kpi as any).raw?.['Project Code'] || '').toString().trim()
        const kpiZone = String(kpi.zone || kpi['Zone'] || (kpi as any).raw?.['Zone'] || '').toString().trim().toLowerCase()
        
        // Match activity name
        const activityMatch = kpiActivityName === activityName || 
                              kpiActivityName.includes(activityName) || 
                              activityName.includes(kpiActivityName)
        
        if (!activityMatch) return false
        
        // Match project
        const projectMatch = kpiProjectFullCode === projectFullCode || 
                            kpiProjectCode === projectFullCode ||
                            kpiProjectFullCode === activity.project_code ||
                            kpiProjectCode === activity.project_code
        
        if (!projectMatch) return false
        
        // Match zone if available
        if (zoneRef && zoneRef !== 'enabling division' && zoneNumber) {
          const zoneMatch = kpiZone === zoneRef || 
                           kpiZone === zoneNumber ||
                           kpiZone.includes(zoneRef) ||
                           kpiZone.includes(zoneNumber)
          if (!zoneMatch) return false
        }
        
        return true
      })
      
      // Sum only ACTUAL KPIs
      const actualKPIs = activityKPIs.filter((kpi: any) => {
        const inputType = String(kpi.input_type || kpi['Input Type'] || (kpi as any).raw?.['Input Type'] || '').trim().toLowerCase()
        return inputType === 'actual'
      })
      
      const totalActual = actualKPIs.reduce((sum: number, kpi: any) => {
        const qty = parseFloat(String(kpi.quantity || kpi['Quantity'] || (kpi as any).raw?.['Quantity'] || '0').replace(/,/g, '')) || 0
        return sum + qty
      }, 0)
      
      return totalActual
    } catch (error) {
      console.error('Error calculating actual units:', error)
      return activity.actual_units || 0
    }
  }, [kpis])
  
  // Calculate Earned Value from KPIs for an activity
  const calculateEarnedValue = useCallback((activity: BOQActivity): number => {
    if (!kpis || kpis.length === 0) {
      return activity.earned_value || 0
    }
    
    try {
      const activityName = (activity.activity_name || activity.activity || '').toLowerCase().trim()
      const projectFullCode = (activity.project_full_code || activity.project_code || '').toString().trim()
      const zoneRef = (activity.zone_ref || '').toString().trim().toLowerCase()
      const zoneNumber = (activity.zone_number || '').toString().trim().toLowerCase()
      
      // Filter KPIs for this activity (same logic as calculateActualUnits)
      const activityKPIs = kpis.filter((kpi: any) => {
        const kpiActivityName = String(kpi.activity_name || kpi['Activity Name'] || (kpi as any).raw?.['Activity Name'] || '').toLowerCase().trim()
        const kpiProjectFullCode = String(kpi.project_full_code || kpi['Project Full Code'] || (kpi as any).raw?.['Project Full Code'] || '').toString().trim()
        const kpiProjectCode = String(kpi.project_code || kpi['Project Code'] || (kpi as any).raw?.['Project Code'] || '').toString().trim()
        const kpiZone = String(kpi.zone || kpi['Zone'] || (kpi as any).raw?.['Zone'] || '').toString().trim().toLowerCase()
        
        // Match activity name
        const activityMatch = kpiActivityName === activityName || 
                              kpiActivityName.includes(activityName) || 
                              activityName.includes(kpiActivityName)
        
        if (!activityMatch) return false
        
        // Match project
        const projectMatch = kpiProjectFullCode === projectFullCode || 
                            kpiProjectCode === projectFullCode ||
                            kpiProjectFullCode === activity.project_code ||
                            kpiProjectCode === activity.project_code
        
        if (!projectMatch) return false
        
        // Match zone if available
        if (zoneRef && zoneRef !== 'enabling division' && zoneNumber) {
          const zoneMatch = kpiZone === zoneRef || 
                           kpiZone === zoneNumber ||
                           kpiZone.includes(zoneRef) ||
                           kpiZone.includes(zoneNumber)
          if (!zoneMatch) return false
        }
        
        return true
      })
      
      // Sum only ACTUAL KPIs
      const actualKPIs = activityKPIs.filter((kpi: any) => {
        const inputType = String(kpi.input_type || kpi['Input Type'] || (kpi as any).raw?.['Input Type'] || '').trim().toLowerCase()
        return inputType === 'actual'
      })
      
      // Calculate Earned Value using unified logic (same as workValueCalculator.ts)
      let earnedValue = 0
      
      actualKPIs.forEach((kpi: any) => {
        const rawKpi = (kpi as any).raw || {}
        const quantity = parseFloat(String(kpi.quantity || rawKpi['Quantity'] || '0').replace(/,/g, '')) || 0
        
        // Get activity rate
        let rate = 0
        const rawActivity = (activity as any).raw || {}
        
        // Priority 1: Calculate Rate = Total Value / Total Units
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
          // Priority 2: Use rate directly from activity
          rate = activity.rate || 
                parseFloat(String(rawActivity['Rate'] || '0').replace(/,/g, '')) || 
                0
        }
        
        // Priority 1: Calculate from Rate × Quantity
        let calculatedValue = 0
        if (rate > 0 && quantity > 0) {
          calculatedValue = rate * quantity
          if (calculatedValue > 0) {
            earnedValue += calculatedValue
            return // Move to next KPI
          }
        }
        
        // Priority 2: Use Value directly from KPI
        let kpiValue = 0
        
        // Try raw['Value'] (from database with capital V)
        if (rawKpi['Value'] !== undefined && rawKpi['Value'] !== null) {
          const val = rawKpi['Value']
          kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
        }
        
        // Try raw.value (from database with lowercase v)
        if (kpiValue === 0 && rawKpi.value !== undefined && rawKpi.value !== null) {
          const val = rawKpi.value
          kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
        }
        
        // Try k.value (direct property from ProcessedKPI)
        if (kpiValue === 0 && kpi.value !== undefined && kpi.value !== null) {
          const val = kpi.value
          kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
        }
        
        if (kpiValue > 0) {
          earnedValue += kpiValue
          return // Move to next KPI
        }
        
        // Priority 3: Try Actual Value
        const actualValue = (kpi.actual_value ?? 
                           parseFloat(String(rawKpi['Actual Value'] || '0').replace(/,/g, ''))) || 
                           0
        
        if (actualValue > 0) {
          earnedValue += actualValue
          return // Move to next KPI
        }
      })
      
      return earnedValue
    } catch (error) {
      console.error('Error calculating earned value:', error)
      return activity.earned_value || 0
    }
  }, [kpis])
  
  // Calculate pagination
  const totalPages = Math.ceil(activities.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedActivities = activities.slice(startIndex, endIndex)
  
  // Calculate totals
  const totals = useMemo(() => {
    return activities.reduce((acc: any, activity: BOQActivity) => {
      acc.totalUnits += activity.total_units || 0
      acc.plannedUnits += activity.planned_units || 0
      acc.actualUnits += calculateActualUnits(activity)
      acc.totalValue += activity.total_value || 0
      acc.plannedValue += activity.planned_value || 0
      acc.earnedValue += activity.earned_value || 0
      return acc
    }, {
      totalUnits: 0,
      plannedUnits: 0,
      actualUnits: 0,
      totalValue: 0,
      plannedValue: 0,
      earnedValue: 0
    })
  }, [activities, calculateActualUnits, calculateEarnedValue])
  
  const formatDate = (date: string | null | undefined): string => {
    if (!date) return 'N/A'
    try {
      return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    } catch {
      return 'N/A'
    }
  }
  
  // Helper: Get activity field (same as BOQTableWithCustomization)
  const getActivityField = (activity: BOQActivity, fieldName: string): any => {
    const raw = (activity as any).raw || activity
    return raw[fieldName] || raw[fieldName.replace(/\s+/g, ' ')] || (activity as any)[fieldName] || ''
  }
  
  // Helper: Normalize zone (remove project code prefix)
  const normalizeZone = (zone: string, projectCode: string): string => {
    if (!zone || !projectCode) return (zone || '').toLowerCase().trim()
    let normalized = zone.trim()
    const codeUpper = projectCode.toUpperCase()
    normalized = normalized.replace(new RegExp(`^${codeUpper}\\s*-\\s*`, 'i'), '').trim()
    normalized = normalized.replace(new RegExp(`^${codeUpper}\\s+`, 'i'), '').trim()
    normalized = normalized.replace(new RegExp(`^${codeUpper}-`, 'i'), '').trim()
    return normalized.toLowerCase()
  }
  
  // Helper: Extract zone from activity
  const getActivityZone = (activity: BOQActivity): string => {
    const rawActivity = (activity as any).raw || {}
    let zoneValue = activity.zone_number || 
                   activity.zone_ref || 
                   rawActivity['Zone Number'] ||
                   rawActivity['Zone Ref'] ||
                   rawActivity['Zone #'] ||
                   ''
    
    if (zoneValue && activity.project_code) {
      const projectCodeUpper = activity.project_code.toUpperCase().trim()
      let zoneStr = zoneValue.toString()
      zoneStr = zoneStr.replace(new RegExp(`^${projectCodeUpper}\\s*-\\s*`, 'i'), '').trim()
      zoneStr = zoneStr.replace(new RegExp(`^${projectCodeUpper}\\s+`, 'i'), '').trim()
      zoneStr = zoneStr.replace(new RegExp(`^${projectCodeUpper}-`, 'i'), '').trim()
      zoneStr = zoneStr.replace(/^\s*-\s*/, '').trim()
      zoneStr = zoneStr.replace(/\s+/g, ' ').trim()
      zoneValue = zoneStr || ''
    }
    
    return (zoneValue || '').toString().toLowerCase().trim()
  }
  
  // Helper: Extract zone from KPI
  const getKPIZone = (kpi: any): string => {
    const rawKPI = (kpi as any).raw || {}
    const zoneRaw = (
      kpi.zone || 
      kpi.section || 
      rawKPI['Zone'] || 
      rawKPI['Zone Number'] || 
      ''
    ).toString().trim()
    const projectCode = (kpi.project_code || kpi['Project Code'] || rawKPI['Project Code'] || '').toString().trim()
    return normalizeZone(zoneRaw, projectCode)
  }
  
  // Helper: Extract zone number for exact matching
  const extractZoneNumber = (zone: string): string => {
    if (!zone || zone.trim() === '') return ''
    
    const normalizedZone = zone.toLowerCase().trim()
    
    // Try to match "zone X" or "zone-X" pattern first
    const zonePatternMatch = normalizedZone.match(/zone\s*[-_]?\s*(\d+)/i)
    if (zonePatternMatch && zonePatternMatch[1]) {
      return zonePatternMatch[1]
    }
    
    // Try to match standalone number at the end
    const endNumberMatch = normalizedZone.match(/(\d+)\s*$/)
    if (endNumberMatch && endNumberMatch[1]) {
      return endNumberMatch[1]
    }
    
    // Fallback: extract first number
    const numberMatch = normalizedZone.match(/\d+/)
    if (numberMatch) return numberMatch[0]
    
    return normalizedZone
  }
  
  // Helper: Parse date string to YYYY-MM-DD format
  const parseDateToYYYYMMDD = (dateStr: string): string | null => {
    if (!dateStr || dateStr.trim() === '' || dateStr === 'N/A') return null
    
    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return null
      
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      
      return `${year}-${month}-${day}`
    } catch {
      return null
    }
  }
  
  // Get Planned Start Date (same logic as BOQTableWithCustomization)
  const getPlannedStartDate = useCallback((activity: BOQActivity): string => {
    const raw = (activity as any).raw || {}
    
    // PRIORITY 1: Get from first Planned KPI Date column
    if (kpis && kpis.length > 0) {
      const activityName = (activity.activity_name || '').toLowerCase().trim()
      const activityProjectCode = (activity.project_code || '').toString().trim().toUpperCase()
      const activityProjectFullCode = (activity.project_full_code || activity.project_code || '').toString().trim().toUpperCase()
      const activityZone = getActivityZone(activity)
      const activityZoneNum = extractZoneNumber(activityZone)
      
      // Find matching Planned KPIs
      const matchingKPIs = kpis.filter((kpi: any) => {
        const rawKPI = (kpi as any).raw || {}
        
        // 1. Must be Planned
        const kpiInputType = (kpi.input_type || rawKPI['Input Type'] || '').toString().toLowerCase().trim()
        if (kpiInputType !== 'planned') return false
        
        // 2. Activity Name must match
        const kpiActivityName = (kpi.activity_name || rawKPI['Activity Name'] || '').toLowerCase().trim()
        if (!kpiActivityName || !activityName) return false
        if (kpiActivityName !== activityName && !kpiActivityName.includes(activityName) && !activityName.includes(kpiActivityName)) {
          return false
        }
        
        // 3. Project Code must match
        const kpiProjectCode = (kpi.project_code || rawKPI['Project Code'] || '').toString().trim().toUpperCase()
        const kpiProjectFullCode = (kpi.project_full_code || rawKPI['Project Full Code'] || '').toString().trim().toUpperCase()
        
        const projectMatch = (
          (kpiProjectCode && activityProjectCode && kpiProjectCode === activityProjectCode) ||
          (kpiProjectFullCode && activityProjectFullCode && kpiProjectFullCode === activityProjectFullCode) ||
          (kpiProjectCode && activityProjectFullCode && kpiProjectCode === activityProjectFullCode) ||
          (kpiProjectFullCode && activityProjectCode && kpiProjectFullCode === activityProjectCode)
        )
        if (!projectMatch) return false
        
        // 4. Zone must match EXACTLY (if activity has zone)
        if (activityZone && activityZone.trim() !== '') {
          const kpiZone = getKPIZone(kpi)
          if (!kpiZone || kpiZone.trim() === '') return false
          
          const kpiZoneNum = extractZoneNumber(kpiZone)
          if (activityZoneNum && kpiZoneNum && activityZoneNum !== kpiZoneNum) {
            return false
          }
        }
        
        return true
      })
      
      // Get dates from matching KPIs
      if (matchingKPIs.length > 0) {
        const validDates: Array<{ dateStr: string; dateObj: Date }> = []
        
        matchingKPIs.forEach((kpi: any) => {
          const rawKPI = (kpi as any).raw || {}
          
          // Get Date from Date column
          let kpiDateStr = ''
          if (kpi.target_date && kpi.target_date.toString().trim() !== '' && kpi.target_date !== 'N/A') {
            kpiDateStr = kpi.target_date.toString().trim()
          } else if (kpi.activity_date && kpi.activity_date.toString().trim() !== '' && kpi.activity_date !== 'N/A') {
            kpiDateStr = kpi.activity_date.toString().trim()
          } else if (rawKPI['Date'] && rawKPI['Date'].toString().trim() !== '' && rawKPI['Date'] !== 'N/A') {
            kpiDateStr = rawKPI['Date'].toString().trim()
          } else if (rawKPI['Target Date'] && rawKPI['Target Date'].toString().trim() !== '' && rawKPI['Target Date'] !== 'N/A') {
            kpiDateStr = rawKPI['Target Date'].toString().trim()
          } else if (rawKPI['Activity Date'] && rawKPI['Activity Date'].toString().trim() !== '' && rawKPI['Activity Date'] !== 'N/A') {
            kpiDateStr = rawKPI['Activity Date'].toString().trim()
          }
          
          if (kpiDateStr) {
            const parsedDate = parseDateToYYYYMMDD(kpiDateStr)
            if (parsedDate) {
              try {
                const [year, month, day] = parsedDate.split('-').map(Number)
                const dateObj = new Date(year, month - 1, day)
                if (!isNaN(dateObj.getTime())) {
                  validDates.push({ dateStr: parsedDate, dateObj })
                }
              } catch {
                // Skip invalid date
              }
            }
          }
        })
        
        // Sort by date and return earliest
        if (validDates.length > 0) {
          validDates.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
          return validDates[0].dateStr
        }
      }
    }
    
    // Priority 2: Direct BOQ Activity fields
    const directStart = activity.planned_activity_start_date || 
                       activity.activity_planned_start_date ||
                       getActivityField(activity, 'Planned Activity Start Date') ||
                       getActivityField(activity, 'Planned Start Date') ||
                       getActivityField(activity, 'Activity Planned Start Date') ||
                       raw['Planned Activity Start Date'] ||
                       raw['Planned Start Date'] ||
                       raw['Activity Planned Start Date'] ||
                       ''
    
    if (directStart && directStart.trim() !== '' && directStart !== 'N/A') {
      return directStart
    }
    
    return ''
  }, [kpis])
  
  // Get Planned End Date (last date from Planned KPIs)
  const getPlannedEndDate = useCallback((activity: BOQActivity): string => {
    const raw = (activity as any).raw || {}
    
    // PRIORITY 1: Get from last Planned KPI Date column
    if (kpis && kpis.length > 0) {
      const activityName = (activity.activity_name || '').toLowerCase().trim()
      const activityProjectCode = (activity.project_code || '').toString().trim().toUpperCase()
      const activityProjectFullCode = (activity.project_full_code || activity.project_code || '').toString().trim().toUpperCase()
      const activityZone = getActivityZone(activity)
      const activityZoneNum = extractZoneNumber(activityZone)
      
      // Find matching Planned KPIs (same logic as getPlannedStartDate)
      const matchingKPIs = kpis.filter((kpi: any) => {
        const rawKPI = (kpi as any).raw || {}
        
        const kpiInputType = (kpi.input_type || rawKPI['Input Type'] || '').toString().toLowerCase().trim()
        if (kpiInputType !== 'planned') return false
        
        const kpiActivityName = (kpi.activity_name || rawKPI['Activity Name'] || '').toLowerCase().trim()
        if (!kpiActivityName || !activityName) return false
        if (kpiActivityName !== activityName && !kpiActivityName.includes(activityName) && !activityName.includes(kpiActivityName)) {
          return false
        }
        
        const kpiProjectCode = (kpi.project_code || rawKPI['Project Code'] || '').toString().trim().toUpperCase()
        const kpiProjectFullCode = (kpi.project_full_code || rawKPI['Project Full Code'] || '').toString().trim().toUpperCase()
        
        const projectMatch = (
          (kpiProjectCode && activityProjectCode && kpiProjectCode === activityProjectCode) ||
          (kpiProjectFullCode && activityProjectFullCode && kpiProjectFullCode === activityProjectFullCode) ||
          (kpiProjectCode && activityProjectFullCode && kpiProjectCode === activityProjectFullCode) ||
          (kpiProjectFullCode && activityProjectCode && kpiProjectFullCode === activityProjectCode)
        )
        if (!projectMatch) return false
        
        if (activityZone && activityZone.trim() !== '') {
          const kpiZone = getKPIZone(kpi)
          if (!kpiZone || kpiZone.trim() === '') return false
          
          const kpiZoneNum = extractZoneNumber(kpiZone)
          if (activityZoneNum && kpiZoneNum && activityZoneNum !== kpiZoneNum) {
            return false
          }
        }
        
        return true
      })
      
      // Get dates from matching KPIs
      if (matchingKPIs.length > 0) {
        const validDates: Array<{ dateStr: string; dateObj: Date }> = []
        
        matchingKPIs.forEach((kpi: any) => {
          const rawKPI = (kpi as any).raw || {}
          
          let kpiDateStr = ''
          if (kpi.target_date && kpi.target_date.toString().trim() !== '' && kpi.target_date !== 'N/A') {
            kpiDateStr = kpi.target_date.toString().trim()
          } else if (kpi.activity_date && kpi.activity_date.toString().trim() !== '' && kpi.activity_date !== 'N/A') {
            kpiDateStr = kpi.activity_date.toString().trim()
          } else if (rawKPI['Date'] && rawKPI['Date'].toString().trim() !== '' && rawKPI['Date'] !== 'N/A') {
            kpiDateStr = rawKPI['Date'].toString().trim()
          } else if (rawKPI['Target Date'] && rawKPI['Target Date'].toString().trim() !== '' && rawKPI['Target Date'] !== 'N/A') {
            kpiDateStr = rawKPI['Target Date'].toString().trim()
          } else if (rawKPI['Activity Date'] && rawKPI['Activity Date'].toString().trim() !== '' && rawKPI['Activity Date'] !== 'N/A') {
            kpiDateStr = rawKPI['Activity Date'].toString().trim()
          }
          
          if (kpiDateStr) {
            const parsedDate = parseDateToYYYYMMDD(kpiDateStr)
            if (parsedDate) {
              try {
                const [year, month, day] = parsedDate.split('-').map(Number)
                const dateObj = new Date(year, month - 1, day)
                if (!isNaN(dateObj.getTime())) {
                  validDates.push({ dateStr: parsedDate, dateObj })
                }
              } catch {
                // Skip invalid date
              }
            }
          }
        })
        
        // Sort by date and return latest (LAST date)
        if (validDates.length > 0) {
          validDates.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
          return validDates[validDates.length - 1].dateStr
        }
      }
    }
    
    // Priority 2: Direct BOQ Activity fields
    const directEnd = activity.deadline || 
                      activity.activity_planned_completion_date ||
                      getActivityField(activity, 'Deadline') ||
                      getActivityField(activity, 'Planned Completion Date') ||
                      getActivityField(activity, 'Activity Planned Completion Date') ||
                      raw['Deadline'] ||
                      raw['Planned Completion Date'] ||
                      raw['Activity Planned Completion Date'] ||
                      ''
    
    if (directEnd && directEnd.trim() !== '' && directEnd !== 'N/A') {
      return directEnd
    }
    
    return ''
  }, [kpis])
  
  // Get Actual Start Date (first date from Actual KPIs)
  const getActualStartDate = useCallback((activity: BOQActivity): string => {
    const raw = (activity as any).raw || {}
    
    // PRIORITY 1: Get from first Actual KPI Date column
    if (kpis && kpis.length > 0) {
      const activityName = (activity.activity_name || '').toLowerCase().trim()
      const activityProjectCode = (activity.project_code || '').toString().trim().toUpperCase()
      const activityProjectFullCode = (activity.project_full_code || activity.project_code || '').toString().trim().toUpperCase()
      const activityZone = getActivityZone(activity)
      const activityZoneNum = extractZoneNumber(activityZone)
      
      // Find matching Actual KPIs
      const matchingKPIs = kpis.filter((kpi: any) => {
        const rawKPI = (kpi as any).raw || {}
        
        // 1. Must be Actual
        const kpiInputType = (kpi.input_type || rawKPI['Input Type'] || '').toString().toLowerCase().trim()
        if (kpiInputType !== 'actual') return false
        
        // 2. Activity Name must match
        const kpiActivityName = (kpi.activity_name || rawKPI['Activity Name'] || '').toLowerCase().trim()
        if (!kpiActivityName || !activityName) return false
        if (kpiActivityName !== activityName && !kpiActivityName.includes(activityName) && !activityName.includes(kpiActivityName)) {
          return false
        }
        
        // 3. Project Code must match
        const kpiProjectCode = (kpi.project_code || rawKPI['Project Code'] || '').toString().trim().toUpperCase()
        const kpiProjectFullCode = (kpi.project_full_code || rawKPI['Project Full Code'] || '').toString().trim().toUpperCase()
        
        const projectMatch = (
          (kpiProjectCode && activityProjectCode && kpiProjectCode === activityProjectCode) ||
          (kpiProjectFullCode && activityProjectFullCode && kpiProjectFullCode === activityProjectFullCode) ||
          (kpiProjectCode && activityProjectFullCode && kpiProjectCode === activityProjectFullCode) ||
          (kpiProjectFullCode && activityProjectCode && kpiProjectFullCode === activityProjectCode)
        )
        if (!projectMatch) return false
        
        // 4. Zone must match EXACTLY (if activity has zone)
        if (activityZone && activityZone.trim() !== '') {
          const kpiZone = getKPIZone(kpi)
          if (!kpiZone || kpiZone.trim() === '') return false
          
          const kpiZoneNum = extractZoneNumber(kpiZone)
          if (activityZoneNum && kpiZoneNum && activityZoneNum !== kpiZoneNum) {
            return false
          }
        }
        
        return true
      })
      
      // Get dates from matching KPIs
      if (matchingKPIs.length > 0) {
        const validDates: Array<{ dateStr: string; dateObj: Date }> = []
        
        matchingKPIs.forEach((kpi: any) => {
          const rawKPI = (kpi as any).raw || {}
          
          // Get Date from Date/Actual Date column
          let kpiDateStr = ''
          if (kpi.actual_date && kpi.actual_date.toString().trim() !== '' && kpi.actual_date !== 'N/A') {
            kpiDateStr = kpi.actual_date.toString().trim()
          } else if (kpi.activity_date && kpi.activity_date.toString().trim() !== '' && kpi.activity_date !== 'N/A') {
            kpiDateStr = kpi.activity_date.toString().trim()
          } else if (kpi.target_date && kpi.target_date.toString().trim() !== '' && kpi.target_date !== 'N/A') {
            kpiDateStr = kpi.target_date.toString().trim()
          } else if (rawKPI['Date'] && rawKPI['Date'].toString().trim() !== '' && rawKPI['Date'] !== 'N/A') {
            kpiDateStr = rawKPI['Date'].toString().trim()
          } else if (rawKPI['Actual Date'] && rawKPI['Actual Date'].toString().trim() !== '' && rawKPI['Actual Date'] !== 'N/A') {
            kpiDateStr = rawKPI['Actual Date'].toString().trim()
          } else if (rawKPI['Activity Date'] && rawKPI['Activity Date'].toString().trim() !== '' && rawKPI['Activity Date'] !== 'N/A') {
            kpiDateStr = rawKPI['Activity Date'].toString().trim()
          }
          
          if (kpiDateStr) {
            const parsedDate = parseDateToYYYYMMDD(kpiDateStr)
            if (parsedDate) {
              try {
                const [year, month, day] = parsedDate.split('-').map(Number)
                const dateObj = new Date(year, month - 1, day)
                if (!isNaN(dateObj.getTime())) {
                  validDates.push({ dateStr: parsedDate, dateObj })
                }
              } catch {
                // Skip invalid date
              }
            }
          }
        })
        
        // Sort by date and return earliest (FIRST date)
        if (validDates.length > 0) {
          validDates.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
          return validDates[0].dateStr
        }
      }
    }
    
    // Priority 2: Direct BOQ Activity fields
    const directStart = getActivityField(activity, 'Actual Start Date') ||
                       getActivityField(activity, 'Actual Start') ||
                       getActivityField(activity, 'Activity Actual Start Date') ||
                       raw['Actual Start Date'] ||
                       raw['Actual Start'] ||
                       raw['Activity Actual Start Date'] ||
                       ''
    
    if (directStart && directStart.trim() !== '' && directStart !== 'N/A') {
      return directStart
    }
    
    return ''
  }, [kpis])
  
  // Get Actual End Date (last date from Actual KPIs)
  // ✅ IMPORTANT: If activity hasn't started (no Actual Start Date), return empty string
  const getActualEndDate = useCallback((activity: BOQActivity): string => {
    // ✅ FIRST: Check if activity has started (has Actual Start Date)
    const actualStart = getActualStartDate(activity)
    if (!actualStart || actualStart.trim() === '' || actualStart === 'N/A') {
      // Activity hasn't started yet, so no Actual End Date
      return ''
    }
    
    const raw = (activity as any).raw || {}
    
    // PRIORITY 1: Get from last Actual KPI Date column
    if (kpis && kpis.length > 0) {
      const activityName = (activity.activity_name || '').toLowerCase().trim()
      const activityProjectCode = (activity.project_code || '').toString().trim().toUpperCase()
      const activityProjectFullCode = (activity.project_full_code || activity.project_code || '').toString().trim().toUpperCase()
      const activityZone = getActivityZone(activity)
      const activityZoneNum = extractZoneNumber(activityZone)
      
      // Find matching Actual KPIs (same logic as getActualStartDate)
      const matchingKPIs = kpis.filter((kpi: any) => {
        const rawKPI = (kpi as any).raw || {}
        
        const kpiInputType = (kpi.input_type || rawKPI['Input Type'] || '').toString().toLowerCase().trim()
        if (kpiInputType !== 'actual') return false
        
        const kpiActivityName = (kpi.activity_name || rawKPI['Activity Name'] || '').toLowerCase().trim()
        if (!kpiActivityName || !activityName) return false
        if (kpiActivityName !== activityName && !kpiActivityName.includes(activityName) && !activityName.includes(kpiActivityName)) {
          return false
        }
        
        const kpiProjectCode = (kpi.project_code || rawKPI['Project Code'] || '').toString().trim().toUpperCase()
        const kpiProjectFullCode = (kpi.project_full_code || rawKPI['Project Full Code'] || '').toString().trim().toUpperCase()
        
        const projectMatch = (
          (kpiProjectCode && activityProjectCode && kpiProjectCode === activityProjectCode) ||
          (kpiProjectFullCode && activityProjectFullCode && kpiProjectFullCode === activityProjectFullCode) ||
          (kpiProjectCode && activityProjectFullCode && kpiProjectCode === activityProjectFullCode) ||
          (kpiProjectFullCode && activityProjectCode && kpiProjectFullCode === activityProjectCode)
        )
        if (!projectMatch) return false
        
        if (activityZone && activityZone.trim() !== '') {
          const kpiZone = getKPIZone(kpi)
          if (!kpiZone || kpiZone.trim() === '') return false
          
          const kpiZoneNum = extractZoneNumber(kpiZone)
          if (activityZoneNum && kpiZoneNum && activityZoneNum !== kpiZoneNum) {
            return false
          }
        }
        
        return true
      })
      
      // Get dates from matching KPIs
      if (matchingKPIs.length > 0) {
        const validDates: Array<{ dateStr: string; dateObj: Date }> = []
        
        matchingKPIs.forEach((kpi: any) => {
          const rawKPI = (kpi as any).raw || {}
          
          let kpiDateStr = ''
          if (kpi.actual_date && kpi.actual_date.toString().trim() !== '' && kpi.actual_date !== 'N/A') {
            kpiDateStr = kpi.actual_date.toString().trim()
          } else if (kpi.activity_date && kpi.activity_date.toString().trim() !== '' && kpi.activity_date !== 'N/A') {
            kpiDateStr = kpi.activity_date.toString().trim()
          } else if (kpi.target_date && kpi.target_date.toString().trim() !== '' && kpi.target_date !== 'N/A') {
            kpiDateStr = kpi.target_date.toString().trim()
          } else if (rawKPI['Date'] && rawKPI['Date'].toString().trim() !== '' && rawKPI['Date'] !== 'N/A') {
            kpiDateStr = rawKPI['Date'].toString().trim()
          } else if (rawKPI['Actual Date'] && rawKPI['Actual Date'].toString().trim() !== '' && rawKPI['Actual Date'] !== 'N/A') {
            kpiDateStr = rawKPI['Actual Date'].toString().trim()
          } else if (rawKPI['Activity Date'] && rawKPI['Activity Date'].toString().trim() !== '' && rawKPI['Activity Date'] !== 'N/A') {
            kpiDateStr = rawKPI['Activity Date'].toString().trim()
          }
          
          if (kpiDateStr) {
            const parsedDate = parseDateToYYYYMMDD(kpiDateStr)
            if (parsedDate) {
              try {
                const [year, month, day] = parsedDate.split('-').map(Number)
                const dateObj = new Date(year, month - 1, day)
                if (!isNaN(dateObj.getTime())) {
                  validDates.push({ dateStr: parsedDate, dateObj })
                }
              } catch {
                // Skip invalid date
              }
            }
          }
        })
        
        // Sort by date and return latest (LAST date)
        if (validDates.length > 0) {
          validDates.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
          return validDates[validDates.length - 1].dateStr
        }
      }
    }
    
    // Priority 2: Direct BOQ Activity fields (ONLY if activity has started)
    // Note: We already checked that actualStart exists at the beginning of the function
    const directEnd = getActivityField(activity, 'Actual Completion Date') ||
                      getActivityField(activity, 'Actual Completion') ||
                      getActivityField(activity, 'Activity Actual Completion Date') ||
                      raw['Actual Completion Date'] ||
                      raw['Actual Completion'] ||
                      raw['Activity Actual Completion Date'] ||
                      ''
    
    // ✅ Don't use deadline as fallback for Actual End Date - it's a planned date
    if (directEnd && directEnd.trim() !== '' && directEnd !== 'N/A') {
      return directEnd
    }
    
    return ''
  }, [kpis, getActualStartDate])
  
  // Get Start Date with priority order (DEPRECATED - use getPlannedStartDate/getActualStartDate instead)
  const getStartDate = useCallback((activity: BOQActivity): string | null => {
    const raw = (activity as any).raw || {}
    const activityAny = activity as any
    
    // Priority 1: From mapped fields (snake_case)
    let start = activity.planned_activity_start_date || 
                activity.activity_planned_start_date || 
                activityAny.planned_start_date ||
                ''
    
    // Priority 2: From raw database row (with spaces - EXACT MATCH)
    if (!start || start === '' || start === 'N/A' || start === 'null') {
      start = raw['Planned Activity Start Date'] ||
             raw['PlannedActivityStartDate'] ||
             raw['Activity Planned Start Date'] ||
             raw['ActivityPlannedStartDate'] ||
             ''
    }
    
    // Priority 3: From activity object with bracket notation
    if (!start || start === '' || start === 'N/A' || start === 'null') {
      start = activityAny['Planned Activity Start Date'] ||
             activityAny['PlannedActivityStartDate'] ||
             activityAny['Activity Planned Start Date'] ||
             activityAny['ActivityPlannedStartDate'] ||
             activityAny['Planned Start Date'] ||
             activityAny['Start Date'] ||
             ''
    }
    
    // Priority 4: Try lookahead_start_date
    if (!start || start === '' || start === 'N/A' || start === 'null') {
      start = activity.lookahead_start_date || raw['Lookahead Start Date'] || ''
    }
    
    if (start && start.toString().trim() !== '' && start !== 'N/A' && start !== 'null') {
      try {
        const parsedDate = new Date(start)
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate.toISOString().split('T')[0]
        }
      } catch {
        // Invalid date, continue
      }
    }
    
    return null
  }, [])
  
  // Calculate Progress from Actual Units / Planned Units
  const calculateProgress = useCallback((activity: BOQActivity): number => {
    const plannedUnits = activity.planned_units || 0
    if (plannedUnits <= 0) return 0
    
    const actualUnits = calculateActualUnits(activity)
    const progress = (actualUnits / plannedUnits) * 100
    return Math.max(0, progress) // Allow values over 100%
  }, [calculateActualUnits])
  
  // Export to Excel function (moved here to use date functions)
  const handleExportActivities = useCallback(async () => {
    if (activities.length === 0) {
      alert('No data to export')
      return
    }

    try {
      // Dynamically import xlsx-js-style for advanced formatting
      const XLSX = await import('xlsx-js-style')
      
      // Prepare data for Excel export
      const exportData: any[] = []

      // Add header row
      const headerRow: any = {
        'Activity Name': 'Activity Name',
        'Project': 'Project',
        'Zone': 'Zone',
        'Division': 'Division',
        'Unit': 'Unit',
        'Total Units': 'Total Units',
        'Planned Units': 'Planned Units',
        'Actual Units': 'Actual Units',
        'Rate': 'Rate',
        'Total Value': 'Total Value',
        'Planned Value': 'Planned Value',
        'Earned Value': 'Earned Value',
        'Progress %': 'Progress %',
        'Planned Start Date': 'Planned Start Date',
        'Planned End Date': 'Planned End Date',
        'Actual Start Date': 'Actual Start Date',
        'Actual End Date': 'Actual End Date',
        'Status': 'Status'
      }
      exportData.push(headerRow)

      // Add data rows
      activities.forEach((activity: BOQActivity) => {
        const currency = getActivityCurrency(activity)
        const progressValue = calculateProgress(activity)
        const zoneDisplay = activity.zone_ref && activity.zone_ref !== 'Enabling Division' 
          ? `${activity.zone_ref}${activity.zone_number ? ` - ${activity.zone_number}` : ''}`
          : activity.zone_number || 'N/A'
        
        const plannedStartDate = getPlannedStartDate(activity)
        const plannedEndDate = getPlannedEndDate(activity)
        const actualStartDate = getActualStartDate(activity)
        const actualEndDate = getActualEndDate(activity)
        
        // ✅ Calculate Status based on Progress percentage (same logic as table)
        let status = 'In Progress'
        if ((progressValue === 0 || progressValue < 0.1) && (!actualStartDate || actualStartDate.trim() === '' || actualStartDate === 'N/A')) {
          status = 'Not Started'
        } else if (progressValue >= 100) {
          status = 'Completed'
        } else if (progressValue < 50 && actualStartDate) {
          status = 'Delayed'
        } else if (progressValue >= 50 && progressValue < 100) {
          status = 'On Track'
        } else {
          status = 'In Progress'
        }
        
        // ✅ If activity hasn't started, show "Not Started" instead of date
        const actualEndDateDisplay = actualStartDate 
          ? (actualEndDate ? formatDate(actualEndDate) : 'N/A')
          : 'Not Started'
        
        const row: any = {
          'Activity Name': activity.activity_name || activity.activity || 'N/A',
          'Project': activity.project_full_code || activity.project_code || 'N/A',
          'Zone': zoneDisplay,
          'Division': activity.activity_division || 'N/A',
          'Unit': activity.unit || 'N/A',
          'Total Units': activity.total_units || 0,
          'Planned Units': activity.planned_units || 0,
          'Actual Units': calculateActualUnits(activity),
          'Rate': activity.rate || 0,
          'Total Value': activity.total_value || 0,
          'Planned Value': activity.planned_value || 0,
          'Earned Value': calculateEarnedValue(activity),
          'Progress %': progressValue,
          'Planned Start Date': plannedStartDate ? formatDate(plannedStartDate) : 'N/A',
          'Planned End Date': plannedEndDate ? formatDate(plannedEndDate) : 'N/A',
          'Actual Start Date': actualStartDate ? formatDate(actualStartDate) : 'N/A',
          'Actual End Date': actualEndDateDisplay,
          'Status': status
        }
        exportData.push(row)
      })

      // Add totals row
      const totals = activities.reduce((acc: any, activity: BOQActivity) => {
        acc.totalUnits += activity.total_units || 0
        acc.plannedUnits += activity.planned_units || 0
        acc.actualUnits += calculateActualUnits(activity)
        acc.totalValue += activity.total_value || 0
        acc.plannedValue += activity.planned_value || 0
        acc.earnedValue += calculateEarnedValue(activity)
        return acc
      }, {
        totalUnits: 0,
        plannedUnits: 0,
        actualUnits: 0,
        totalValue: 0,
        plannedValue: 0,
        earnedValue: 0
      })
      
      const totalsRow: any = {
        'Activity Name': 'TOTAL',
        'Project': '',
        'Zone': '',
        'Division': '',
        'Unit': '',
        'Total Units': totals.totalUnits,
        'Planned Units': totals.plannedUnits,
        'Actual Units': totals.actualUnits,
        'Rate': '',
        'Total Value': totals.totalValue,
        'Planned Value': totals.plannedValue,
        'Earned Value': totals.earnedValue,
        'Progress %': '',
        'Planned Start Date': '',
        'Planned End Date': '',
        'Actual Start Date': '',
        'Actual End Date': '',
        'Status': ''
      }
      exportData.push(totalsRow)

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(exportData)
      
      // Define column widths
      const colWidths = [
        { wch: 40 }, // Activity Name
        { wch: 20 }, // Project
        { wch: 18 }, // Zone
        { wch: 20 }, // Division
        { wch: 12 }, // Unit
        { wch: 15 }, // Total Units
        { wch: 15 }, // Planned Units
        { wch: 15 }, // Actual Units
        { wch: 15 }, // Rate
        { wch: 18 }, // Total Value
        { wch: 18 }, // Planned Value
        { wch: 18 }, // Earned Value
        { wch: 12 }, // Progress %
        { wch: 18 }, // Planned Start Date
        { wch: 18 }, // Planned End Date
        { wch: 18 }, // Actual Start Date
        { wch: 18 }, // Actual End Date
        { wch: 15 }  // Status
      ]
      ws['!cols'] = colWidths
      
      // Freeze first row
      ws['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft', state: 'frozen' }
      
      // Define styles
      const headerStyle = {
        font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
        fill: { fgColor: { rgb: '4472C4' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        }
      }
      
      const numberStyle = {
        numFmt: '#,##0.00',
        alignment: { horizontal: 'right', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: 'CCCCCC' } },
          bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
          left: { style: 'thin', color: { rgb: 'CCCCCC' } },
          right: { style: 'thin', color: { rgb: 'CCCCCC' } }
        }
      }
      
      const textStyle = {
        alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
        border: {
          top: { style: 'thin', color: { rgb: 'CCCCCC' } },
          bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
          left: { style: 'thin', color: { rgb: 'CCCCCC' } },
          right: { style: 'thin', color: { rgb: 'CCCCCC' } }
        }
      }
      
      const totalsStyle = {
        font: { bold: true, sz: 11 },
        fill: { fgColor: { rgb: 'D9E1F2' } },
        alignment: { horizontal: 'right', vertical: 'center' },
        numFmt: '#,##0.00',
        border: {
          top: { style: 'medium', color: { rgb: '000000' } },
          bottom: { style: 'medium', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: 'CCCCCC' } },
          right: { style: 'thin', color: { rgb: 'CCCCCC' } }
        }
      }
      
      const totalsTextStyle = {
        font: { bold: true, sz: 11 },
        fill: { fgColor: { rgb: 'D9E1F2' } },
        alignment: { horizontal: 'left', vertical: 'center' },
        border: {
          top: { style: 'medium', color: { rgb: '000000' } },
          bottom: { style: 'medium', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: 'CCCCCC' } },
          right: { style: 'thin', color: { rgb: 'CCCCCC' } }
        }
      }
      
      // Apply styles to cells
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
      const getColLetter = (colIndex: number): string => {
        try {
          return XLSX.utils.encode_col(colIndex)
        } catch {
          let result = ''
          let num = colIndex
          while (num >= 0) {
            result = String.fromCharCode(65 + (num % 26)) + result
            num = Math.floor(num / 26) - 1
          }
          return result
        }
      }
      
      // Style header row (row 0)
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
        if (!ws[cellAddress]) continue
        ws[cellAddress].s = headerStyle
      }
      
      // Style data rows
      for (let row = 1; row <= range.e.r; row++) {
        const isTotalsRow = row === range.e.r
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
          if (!ws[cellAddress]) continue
          
          const colIndex = col
          // Number columns: 5-11 (Total Units through Earned Value), 12 (Progress %)
          const isNumberColumn = (colIndex >= 5 && colIndex <= 11) || colIndex === 12
          
          if (isTotalsRow) {
            if (colIndex === 0) {
              ws[cellAddress].s = totalsTextStyle
            } else if (isNumberColumn) {
              ws[cellAddress].s = totalsStyle
            } else {
              ws[cellAddress].s = totalsTextStyle
            }
          } else {
            const evenRowStyle = row % 2 === 0 
              ? { ...textStyle, fill: { fgColor: { rgb: 'F2F2F2' } } }
              : textStyle
            
            if (isNumberColumn) {
              ws[cellAddress].s = row % 2 === 0 
                ? { ...numberStyle, fill: { fgColor: { rgb: 'F2F2F2' } } }
                : numberStyle
            } else {
              ws[cellAddress].s = evenRowStyle
            }
          }
        }
      }
      
      // Create workbook
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Activities Report')
      
      // Generate filename
      const dateStr = new Date().toISOString().split('T')[0]
      
      // Write file
      XLSX.writeFile(wb, `Activities_Report_${dateStr}.xlsx`)
      
      console.log(`✅ Downloaded formatted Excel: Activities_Report_${dateStr}.xlsx`)
    } catch (error) {
      console.error('Error exporting to Excel:', error)
      alert('Failed to export data. Please try again.')
    }
  }, [activities, formatCurrency, calculateActualUnits, calculateEarnedValue, calculateProgress, getPlannedStartDate, getPlannedEndDate, getActualStartDate, getActualEndDate])
  
  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Activities</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{activities.length}</p>
              </div>
              <Activity className="h-10 w-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Value</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {formatCurrency(totals.totalValue)}
                </p>
              </div>
              <DollarSign className="h-10 w-10 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Earned Value</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {formatCurrency(totals.earnedValue)}
                </p>
              </div>
              <TrendingUp className="h-10 w-10 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Activities Table */}
    <Card>
      <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-500" />
                Activities Report
              </CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Showing {startIndex + 1}-{Math.min(endIndex, activities.length)} of {activities.length} activities
              </p>
            </div>
            <Button
              onClick={handleExportActivities}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export to Excel
            </Button>
          </div>
      </CardHeader>
      <CardContent>
          <div className="relative">
            <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)', scrollbarWidth: 'auto' }}>
              <table className="border-collapse text-sm" style={{ tableLayout: 'auto', width: 'auto', minWidth: '100%' }}>
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600">
                  <th className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-left font-semibold whitespace-nowrap" style={{ minWidth: '300px' }}>Activity Name</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-left font-semibold whitespace-nowrap" style={{ minWidth: '180px' }}>Project</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-left font-semibold whitespace-nowrap" style={{ minWidth: '150px' }}>Zone</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-left font-semibold whitespace-nowrap" style={{ minWidth: '180px' }}>Division</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-left font-semibold whitespace-nowrap">Unit</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-right font-semibold whitespace-nowrap">Total Units</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-right font-semibold whitespace-nowrap">Planned Units</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-right font-semibold whitespace-nowrap">Actual Units</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-right font-semibold whitespace-nowrap">Rate</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-right font-semibold whitespace-nowrap">Total Value</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-right font-semibold whitespace-nowrap">Planned Value</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-right font-semibold whitespace-nowrap">Earned Value</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-right font-semibold whitespace-nowrap">Progress</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-left font-semibold whitespace-nowrap">Planned Start Date</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-left font-semibold whitespace-nowrap">Planned End Date</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-left font-semibold whitespace-nowrap">Actual Start Date</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-left font-semibold whitespace-nowrap">Actual End Date</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-center font-semibold whitespace-nowrap">Status</th>
            </tr>
          </thead>
            <tbody>
                {                  paginatedActivities.length === 0 ? (
                  <tr>
                    <td colSpan={19} className="border border-gray-300 dark:border-gray-600 px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <AlertTriangle className="h-8 w-8 text-gray-400" />
                        <p>No activities found</p>
                      </div>
                </td>
                  </tr>
                ) : (
                  paginatedActivities.map((activity: BOQActivity) => {
                    const currency = getActivityCurrency(activity)
                    const progress = calculateProgress(activity)
                    const zoneDisplay = activity.zone_ref && activity.zone_ref !== 'Enabling Division' 
                      ? `${activity.zone_ref}${activity.zone_number ? ` - ${activity.zone_number}` : ''}`
                      : activity.zone_number || 'N/A'
                    const plannedStartDate = getPlannedStartDate(activity)
                    const plannedEndDate = getPlannedEndDate(activity)
                    const actualStartDate = getActualStartDate(activity)
                    const actualEndDate = getActualEndDate(activity)
                    
                    // ✅ Calculate Status based on Progress percentage
                    let status = 'In Progress'
                    let statusColor = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    
                    // Priority 1: Check if activity hasn't started (Progress = 0% and no Actual Start Date)
                    if ((progress === 0 || progress < 0.1) && (!actualStartDate || actualStartDate.trim() === '' || actualStartDate === 'N/A')) {
                      status = 'Not Started'
                      statusColor = 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                    }
                    // Priority 2: Check if activity is completed (Progress >= 100%)
                    else if (progress >= 100) {
                      status = 'Completed'
                      statusColor = 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    }
                    // Priority 3: Check if activity is behind schedule (Progress < 50% and has started)
                    else if (progress < 50 && actualStartDate) {
                      status = 'Delayed'
                      statusColor = 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }
                    // Priority 4: Check if activity is on track (Progress >= 50% and < 100%)
                    else if (progress >= 50 && progress < 100) {
                      status = 'On Track'
                      statusColor = 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    }
                    // Default: In Progress (Progress > 0% and < 50%)
                    else {
                      status = 'In Progress'
                      statusColor = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    }
                    
                    return (
                      <tr key={activity.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <td className="border border-gray-300 dark:border-gray-600 px-5 py-4" style={{ minWidth: '300px' }}>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {activity.activity_name || activity.activity || 'N/A'}
                          </div>
                          {activity.activity_timing && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {activity.activity_timing}
                            </div>
                          )}
                </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-5 py-4" style={{ minWidth: '180px' }}>
                          <div className="text-sm text-gray-900 dark:text-white">
                            {activity.project_full_code || activity.project_code || 'N/A'}
                          </div>
                </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-5 py-4" style={{ minWidth: '150px' }}>
                          <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 rounded">
                            {zoneDisplay}
                          </span>
                </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-5 py-4" style={{ minWidth: '180px' }}>
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {activity.activity_division || 'N/A'}
                          </span>
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-5 py-4">
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {activity.unit || 'N/A'}
                          </span>
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-right">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {(activity.total_units || 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-right">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {(activity.planned_units || 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-right">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {calculateActualUnits(activity).toLocaleString()}
                          </span>
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-right">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {formatCurrency(activity.rate || 0, currency)}
                          </span>
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-right">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {formatCurrency(activity.total_value || 0, currency)}
                          </span>
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-right">
                          <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                            {formatCurrency(activity.planned_value || 0, currency)}
                          </span>
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-right">
                          <span className="text-sm font-medium text-green-600 dark:text-green-400">
                            {formatCurrency(calculateEarnedValue(activity), currency)}
                          </span>
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                                className={`h-2 rounded-full ${
                                  progress >= 100 ? 'bg-green-500' :
                                  progress >= 75 ? 'bg-blue-500' :
                                  progress >= 50 ? 'bg-yellow-500' :
                                  'bg-red-500'
                                }`}
                                style={{ width: `${Math.min(100, progress)}%` }}
                        />
        </div>
                            <span className="text-sm font-semibold text-right">
                              {progress.toFixed(1)}%
                            </span>
      </div>
                </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-5 py-4">
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {plannedStartDate ? formatDate(plannedStartDate) : 'N/A'}
                          </span>
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-5 py-4">
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {plannedEndDate ? formatDate(plannedEndDate) : 'N/A'}
                          </span>
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-5 py-4">
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {actualStartDate ? formatDate(actualStartDate) : 'N/A'}
                          </span>
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-5 py-4">
                          <span className={`text-xs ${!actualStartDate ? 'text-orange-600 dark:text-orange-400 font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
                            {actualStartDate 
                              ? (actualEndDate ? formatDate(actualEndDate) : 'N/A') 
                              : 'Not Started'}
                          </span>
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${statusColor}`}>
                            {status}
                  </span>
                </td>
              </tr>
                    )
                  })
                )}
          </tbody>
              {paginatedActivities.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-100 dark:bg-gray-800 font-bold border-t-2 border-gray-300 dark:border-gray-600">
                    <td colSpan={5} className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-right">TOTAL:</td>
                    <td colSpan={4} className="border border-gray-300 dark:border-gray-600 px-5 py-4"></td>
                    <td className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-right">
                      {totals.totalUnits.toLocaleString()}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-right">
                      {totals.plannedUnits.toLocaleString()}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-right">
                      {totals.actualUnits.toLocaleString()}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-right">-</td>
                    <td className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-right">
                      {formatCurrency(totals.totalValue)}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-right">
                      {formatCurrency(totals.plannedValue)}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-5 py-4 text-right">
                      {formatCurrency(totals.earnedValue)}
                    </td>
                    <td colSpan={4} className="border border-gray-300 dark:border-gray-600 px-5 py-4"></td>
                  </tr>
                </tfoot>
              )}
        </table>
    </div>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
      </CardContent>
    </Card>
    </div>
  )
}

// KPIs Report Component
function KPIsReport({ kpis, formatCurrency }: any) {
  // ✅ PERFORMANCE: Memoize filtered KPIs
  const plannedKPIs = useMemo(() => {
    return kpis.filter((k: ProcessedKPI) => k.input_type === 'Planned')
  }, [kpis])
  
  const actualKPIs = useMemo(() => {
    return kpis.filter((k: ProcessedKPI) => k.input_type === 'Actual')
  }, [kpis])
  
  // ✅ PERFORMANCE: Memoize totals
  const plannedTotalQuantity = useMemo(() => {
    return plannedKPIs.reduce((sum: number, k: ProcessedKPI) => sum + (k.quantity || 0), 0)
  }, [plannedKPIs])
  
  const actualTotalQuantity = useMemo(() => {
    return actualKPIs.reduce((sum: number, k: ProcessedKPI) => sum + (k.quantity || 0), 0)
  }, [actualKPIs])
  
  // ✅ PERFORMANCE: Memoize displayed KPIs (limit to 100)
  const displayedKPIs = useMemo(() => {
    return kpis.slice(0, 100)
  }, [kpis])
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
        <CardHeader>
            <CardTitle>Planned KPIs</CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-3xl font-bold">{plannedKPIs.length}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Total planned quantity: {plannedTotalQuantity.toLocaleString()}
            </p>
        </CardContent>
      </Card>
        <Card>
        <CardHeader>
            <CardTitle>Actual KPIs</CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-3xl font-bold">{actualKPIs.length}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Total actual quantity: {actualTotalQuantity.toLocaleString()}
            </p>
        </CardContent>
      </Card>
      </div>
      <Card>
          <CardHeader>
          <CardTitle>KPI Records</CardTitle>
          </CardHeader>
          <CardContent>
      <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: '70vh' }}>
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-100 dark:bg-gray-800">
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left bg-gray-100 dark:bg-gray-800">Activity</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left bg-gray-100 dark:bg-gray-800">Project</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left bg-gray-100 dark:bg-gray-800">Type</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right bg-gray-100 dark:bg-gray-800">Quantity</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right bg-gray-100 dark:bg-gray-800">Date</th>
            </tr>
          </thead>
              <tbody>
                {displayedKPIs.map((kpi: ProcessedKPI) => (
              <tr key={kpi.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                      {kpi.activity_name}
                </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                      {kpi.project_full_code || (kpi as any)['Project Full Code'] || 'N/A'}
                </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        kpi.input_type === 'Planned' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                        'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  }`}>
                    {kpi.input_type}
                  </span>
                </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right">
                      {kpi.quantity || 0} {kpi.unit || ''}
                </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right">
                      {kpi.activity_date ? new Date(kpi.activity_date).toLocaleDateString() : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
            </div>
          </CardContent>
        </Card>
    </div>
  )
}

// Financial Report Component
function FinancialReport({ stats, filteredData, formatCurrency }: any) {
  const { filteredProjects } = filteredData
  
  // ✅ PERFORMANCE: Memoize analytics calculation
  const allAnalytics = useMemo(() => {
    return getAllProjectsAnalytics(filteredProjects, filteredData.filteredActivities, filteredData.filteredKPIs)
  }, [filteredProjects, filteredData.filteredActivities, filteredData.filteredKPIs])

  // ✅ PERFORMANCE: Memoize totals
  const totals = useMemo(() => {
    return {
      totalContractValue: allAnalytics.reduce((sum: number, a: any) => sum + (a.totalContractValue || 0), 0),
      totalEarnedValue: allAnalytics.reduce((sum: number, a: any) => sum + (a.totalEarnedValue || 0), 0),
      totalPlannedValue: allAnalytics.reduce((sum: number, a: any) => sum + (a.totalPlannedValue || 0), 0),
      totalRemainingValue: allAnalytics.reduce((sum: number, a: any) => sum + (a.totalRemainingValue || 0), 0)
    }
  }, [allAnalytics])
  
  const { totalContractValue, totalEarnedValue, totalPlannedValue, totalRemainingValue } = totals
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Contract Value</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalContractValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Earned Value</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalEarnedValue)}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {totalContractValue > 0 ? ((totalEarnedValue / totalContractValue) * 100).toFixed(1) : 0}% of contract
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Planned Value</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalPlannedValue)}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {totalContractValue > 0 ? ((totalPlannedValue / totalContractValue) * 100).toFixed(1) : 0}% of contract
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Remaining Value</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalRemainingValue)}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {totalContractValue > 0 ? ((totalRemainingValue / totalContractValue) * 100).toFixed(1) : 0}% of contract
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Financial Summary by Project</CardTitle>
        </CardHeader>
        <CardContent>
      <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: '70vh' }}>
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 border-b-2 border-gray-300 dark:border-gray-600">
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800">Project</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800">Contract Value</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800">Earned Value</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800">Planned Value</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800">Variance</th>
            </tr>
          </thead>
              <tbody>
                {allAnalytics.map((analytics: any) => {
                  const project = analytics.project
              return (
                <tr key={project.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                        {project.project_full_code || `${project.project_code}${project.project_sub_code ? `-${project.project_sub_code}` : ''}`}
                  </td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right">
                        {formatCurrency(analytics.totalContractValue || 0, project.currency)}
                  </td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right">
                        {formatCurrency(analytics.totalEarnedValue || 0, project.currency)}
                  </td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right">
                        {formatCurrency(analytics.totalPlannedValue || 0, project.currency)}
                  </td>
                      <td className={`border border-gray-300 dark:border-gray-600 px-4 py-2 text-right ${analytics.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(analytics.variance || 0, project.currency)}
                  </td>
                </tr>
              )
            })}
          </tbody>
            {allAnalytics.length > 0 && (
              <tfoot className="sticky bottom-0 z-10">
                <tr className="bg-gray-100 dark:bg-gray-800 font-bold border-t-2 border-gray-300 dark:border-gray-600">
                  <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold bg-gray-100 dark:bg-gray-800">Total:</td>
                  <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold bg-gray-100 dark:bg-gray-800">
                    {formatCurrency(
                      allAnalytics.reduce((sum: number, a: any) => sum + (a.totalContractValue || 0), 0),
                      allAnalytics[0]?.project?.currency || 'AED'
                    )}
                  </td>
                  <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold bg-gray-100 dark:bg-gray-800">
                    {formatCurrency(
                      allAnalytics.reduce((sum: number, a: any) => sum + (a.totalEarnedValue || 0), 0),
                      allAnalytics[0]?.project?.currency || 'AED'
                    )}
                  </td>
                  <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold bg-gray-100 dark:bg-gray-800">
                    {formatCurrency(
                      allAnalytics.reduce((sum: number, a: any) => sum + (a.totalPlannedValue || 0), 0),
                      allAnalytics[0]?.project?.currency || 'AED'
                    )}
                  </td>
                  <td className={`border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold bg-gray-100 dark:bg-gray-800 ${
                    allAnalytics.reduce((sum: number, a: any) => sum + (a.variance || 0), 0) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(
                      allAnalytics.reduce((sum: number, a: any) => sum + (a.variance || 0), 0),
                      allAnalytics[0]?.project?.currency || 'AED'
                    )}
                  </td>
                </tr>
              </tfoot>
            )}
        </table>
      </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Performance Report Component
function PerformanceReport({ filteredData, formatCurrency, formatPercentage }: any) {
  // ✅ PERFORMANCE: Memoize analytics calculation
  const allAnalytics = useMemo(() => {
    return getAllProjectsAnalytics(filteredData.filteredProjects, filteredData.filteredActivities, filteredData.filteredKPIs)
  }, [filteredData.filteredProjects, filteredData.filteredActivities, filteredData.filteredKPIs])

  // ✅ PERFORMANCE: Memoize project status counts
  const projectStatusCounts = useMemo(() => {
    return {
      onSchedule: allAnalytics.filter((a: any) => a.projectStatus === 'on_track').length,
      delayed: allAnalytics.filter((a: any) => a.projectStatus === 'delayed').length,
      ahead: allAnalytics.filter((a: any) => a.projectStatus === 'ahead').length
    }
  }, [allAnalytics])
  
  const { onSchedule: onScheduleProjects, delayed: delayedProjects, ahead: aheadProjects } = projectStatusCounts

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>On Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{onScheduleProjects}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Projects</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Delayed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{delayedProjects}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Projects</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Ahead of Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{aheadProjects}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Projects</p>
          </CardContent>
        </Card>
        </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance by Project</CardTitle>
        </CardHeader>
        <CardContent>
      <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: '70vh' }}>
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 border-b-2 border-gray-300 dark:border-gray-600">
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800">Project</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800">Progress</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800">Planned Progress</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800">Variance</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800">Status</th>
            </tr>
          </thead>
              <tbody>
                {allAnalytics.map((analytics: any) => {
                  const project = analytics.project
                  const progress = analytics.actualProgress || 0
                  const plannedProgress = analytics.plannedProgress || 0
                  const variance = progress - plannedProgress
              return (
                <tr key={project.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                        {project.project_full_code || project.project_code}
                </td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right">
                        {formatPercentage(progress)}
                </td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right">
                        {formatPercentage(plannedProgress)}
                </td>
                      <td className={`border border-gray-300 dark:border-gray-600 px-4 py-2 text-right ${variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {variance >= 0 ? '+' : ''}{formatPercentage(variance)}
                </td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          analytics.projectStatus === 'on_track' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          analytics.projectStatus === 'delayed' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                          'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        }`}>
                          {analytics.projectStatus === 'on_track' ? 'On Track' :
                           analytics.projectStatus === 'delayed' ? 'Delayed' : 'Ahead'}
                  </span>
                </td>
              </tr>
              )
            })}
          </tbody>
            {allAnalytics.length > 0 && (
              <tfoot className="sticky bottom-0 z-10">
                <tr className="bg-gray-100 dark:bg-gray-800 font-bold border-t-2 border-gray-300 dark:border-gray-600">
                  <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold bg-gray-100 dark:bg-gray-800">Total:</td>
                  <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold bg-gray-100 dark:bg-gray-800">
                    {allAnalytics.length > 0 ? (
                      formatPercentage(allAnalytics.reduce((sum: number, a: any) => sum + (a.actualProgress || 0), 0) / allAnalytics.length)
                    ) : '0.0%'}
                  </td>
                  <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold bg-gray-100 dark:bg-gray-800">
                    {allAnalytics.length > 0 ? (
                      formatPercentage(allAnalytics.reduce((sum: number, a: any) => sum + (a.plannedProgress || 0), 0) / allAnalytics.length)
                    ) : '0.0%'}
                  </td>
                  <td className={`border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold bg-gray-100 dark:bg-gray-800 ${
                    allAnalytics.reduce((sum: number, a: any) => {
                      const progress = a.actualProgress || 0
                      const plannedProgress = a.plannedProgress || 0
                      return sum + (progress - plannedProgress)
                    }, 0) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {(() => {
                      const totalVariance = allAnalytics.reduce((sum: number, a: any) => {
                        const progress = a.actualProgress || 0
                        const plannedProgress = a.plannedProgress || 0
                        return sum + (progress - plannedProgress)
                      }, 0) / allAnalytics.length
                      return (totalVariance >= 0 ? '+' : '') + formatPercentage(totalVariance)
                    })()}
                  </td>
                  <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left font-semibold bg-gray-100 dark:bg-gray-800">-</td>
                </tr>
              </tfoot>
            )}
        </table>
      </div>
        </CardContent>
      </Card>
    </div>
  )
}

// LookAhead Report Component - Rebuilt from scratch
function LookaheadReportView({ activities, projects, formatCurrency }: any) {
  const [selectedDivision, setSelectedDivision] = useState<string>('')
  const [kpis, setKpis] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
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
  }, [])

  // Get next 3 months (current month + next 2 months)
  const lookAheadMonths = useMemo(() => {
    const months: string[] = []
    const now = new Date()
    for (let i = 0; i < 3; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1)
      months.push(date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }))
    }
    return months
  }, [])
  
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

  // Calculate analytics for all filtered projects
  const allAnalytics = useMemo(() => {
    return getAllProjectsAnalytics(filteredProjects, activities, kpis)
  }, [filteredProjects, activities, kpis])

  // ✅ PERFORMANCE: Memoize getKPIValue
  const getKPIValue = useCallback((kpi: any, relatedActivity: BOQActivity | null): number => {
    const rawKpi = (kpi as any).raw || {}
    const quantity = parseFloat(String(kpi.quantity || rawKpi['Quantity'] || '0').replace(/,/g, '')) || 0
    
    // Try to get rate
    let rate = 0
    
    // Priority 1: Use KPI value directly if available
    if (kpi.value && kpi.value > 0 && quantity > 0) {
      rate = kpi.value / quantity
    } 
    // Priority 2: Use KPI planned_value
    else if (kpi.planned_value && kpi.planned_value > 0 && quantity > 0) {
      rate = kpi.planned_value / quantity
    }
    // Priority 3: Get rate from related activity
    else if (relatedActivity) {
      if (relatedActivity.rate && relatedActivity.rate > 0) {
        rate = relatedActivity.rate
      } else if (relatedActivity.total_value && relatedActivity.planned_units && relatedActivity.planned_units > 0) {
        rate = relatedActivity.total_value / relatedActivity.planned_units
      }
    }
    
    return quantity * rate
  }, [])

  // ✅ PERFORMANCE: Memoize calculateKPIPlannedValuePerMonth
  const calculateKPIPlannedValuePerMonth = useCallback((project: Project, analytics: any): number[] => {
      const projectKPIs = analytics.kpis || []
      
      return lookAheadMonths.map((_, monthIndex) => {
        const monthDate = new Date()
        monthDate.setMonth(monthDate.getMonth() + monthIndex)
        const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
        const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
        monthEnd.setHours(23, 59, 59, 999)

        // Get KPI Planned for this month
        const plannedKPIsInMonth = projectKPIs.filter((kpi: any) => {
          // Check if it's Planned
          const inputType = String(
            kpi.input_type || 
            kpi['Input Type'] || 
            (kpi as any).raw?.['Input Type'] || 
            (kpi as any).raw?.['input_type'] ||
            ''
          ).trim().toLowerCase()
          
          if (inputType !== 'planned') {
            return false
          }
          
          // Check if date is in this month
          const kpiDateStr = kpi.activity_date || kpi.target_date || ''
          if (!kpiDateStr) return false
          
          try {
            const kpiDate = new Date(kpiDateStr)
            return kpiDate >= monthStart && kpiDate <= monthEnd
          } catch {
            return false
          }
        })

        // Calculate value from KPI Planned
        return plannedKPIsInMonth.reduce((sum: number, kpi: any) => {
          // Find related activity for rate calculation
          const relatedActivity = activities.find((a: BOQActivity) => {
            const activityFullCode = (a.project_full_code || '').toString().trim()
            const projectFullCode = (project.project_full_code || '').toString().trim()
            const activityName = (a.activity_name || a.activity || '').toString().trim()
            const kpiActivityName = (kpi.activity_name || '').toString().trim()
            
            return activityFullCode === projectFullCode && 
                   activityName === kpiActivityName
          })
          
          const value = getKPIValue(kpi, relatedActivity)
          return sum + value
        }, 0)
      })
  }, [lookAheadMonths, activities, getKPIValue])

  // Filter projects with Remaining Value > 0
  const projectsWithRemainingValue = useMemo(() => {
    return allAnalytics.filter((analytics: any) => {
      const totalValue = analytics.totalValue || 0
      const earnedValue = analytics.totalEarnedValue || 0
      const remainingValue = totalValue - earnedValue
      return remainingValue > 0
    })
  }, [allAnalytics])

  // Calculate totals
  const totals = useMemo(() => {
    const totalContractValue = projectsWithRemainingValue.reduce((sum: number, a: any) => sum + (a.totalContractValue || 0), 0)
    const totalEarnedValue = projectsWithRemainingValue.reduce((sum: number, a: any) => sum + (a.totalEarnedValue || 0), 0)
    const totalRemainingValue = projectsWithRemainingValue.reduce((sum: number, a: any) => {
      const totalValue = a.totalValue || 0
      const earnedValue = a.totalEarnedValue || 0
      return sum + (totalValue - earnedValue)
    }, 0)

    // Calculate Look Ahead Revenue from KPI Planned per month
    const lookAheadRevenueByMonth = lookAheadMonths.map((_: string, monthIndex: number) => {
      return projectsWithRemainingValue.reduce((sum: number, analytics: any) => {
        const project = analytics.project
        const kpiPlannedValues = calculateKPIPlannedValuePerMonth(project, analytics)
        return sum + kpiPlannedValues[monthIndex]
      }, 0)
    })
    const totalLookAheadRevenue = lookAheadRevenueByMonth.reduce((sum: number, val: number) => sum + val, 0)

    return {
      totalContractValue,
      totalEarnedValue,
      totalRemainingValue,
      lookAheadRevenueByMonth,
      totalLookAheadRevenue
    }
  }, [projectsWithRemainingValue, lookAheadMonths, calculateKPIPlannedValuePerMonth])

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
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">LookAhead Planning Report</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Data Range: {lookAheadMonths[0]} - {lookAheadMonths[lookAheadMonths.length - 1]}
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

      {/* Projects Forecast Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            SUM of Forecast Value - Active Projects (Next 3 Months)
          </CardTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Projects that are on-going or upcoming with remaining value. Values are based on KPI Planned for each month.
          </p>
        </CardHeader>
        <CardContent>
      <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600">
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left font-semibold">Project Full Name</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left font-semibold">Project Status</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold">Contract Value</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold">Earned Value</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold">Remaining Value</th>
                  {lookAheadMonths.map(month => (
                    <th key={month} className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold">{month}</th>
                  ))}
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold">Grand Total</th>
            </tr>
          </thead>
              <tbody>
                {projectsWithRemainingValue.length === 0 ? (
                  <tr>
                    <td colSpan={7 + lookAheadMonths.length} className="border border-gray-300 dark:border-gray-600 px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <AlertTriangle className="h-8 w-8 text-gray-400" />
                        <p>No active projects with remaining value found</p>
                        <p className="text-xs">Projects with Remaining Value = 0 are not displayed</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  projectsWithRemainingValue.map((analytics: any) => {
                    const project = analytics.project
                    // Remaining Value = Total Value - Earned Value (من KPIs)
                    const totalValue = analytics.totalValue || 0
                    const earnedValue = analytics.totalEarnedValue || 0
                    const remainingValue = totalValue - earnedValue
                    const contractValue = analytics.totalContractValue || project.contract_amount || 0
                    
                    // Get KPI Planned values per month
                    const kpiPlannedValues = calculateKPIPlannedValuePerMonth(project, analytics)

              return (
                      <tr key={project.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-3">
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {project.project_full_code || `${project.project_code}${project.project_sub_code ? `-${project.project_sub_code}` : ''}`}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {project.project_name}
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
                        {kpiPlannedValues.map((value: number, index: number) => (
                          <td key={index} className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right">
                            {value > 0 ? (
                              <span className="font-medium text-blue-600 dark:text-blue-400">
                                {formatCurrency(value, project.currency)}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        ))}
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right">
                          <span className="font-bold text-gray-900 dark:text-white">
                            {formatCurrency(remainingValue, project.currency)}
                          </span>
                  </td>
                </tr>
              )
                  })
                )}
          </tbody>
              {projectsWithRemainingValue.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-100 dark:bg-gray-800 font-bold border-t-2 border-gray-300 dark:border-gray-600">
                    <td colSpan={5} className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right">
                      Total:
                    </td>
                    {totals.lookAheadRevenueByMonth.map((value, index) => (
                      <td key={index} className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right">
                        <span className="text-blue-600 dark:text-blue-400">
                          {formatCurrency(value)}
                        </span>
                      </td>
                    ))}
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right">
                      <span className="text-gray-900 dark:text-white">
                        {formatCurrency(totals.totalRemainingValue)}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              )}
        </table>
      </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Monthly Work Revenue Report Component - ما تم تنفيذه حتى الآن
type PeriodType = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'

function MonthlyWorkRevenueReportView({ activities, projects, kpis, formatCurrency }: any) {
  const [selectedDivision, setSelectedDivision] = useState<string>('')
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ 
    start: '', 
    end: '' 
  })
  const [periodType, setPeriodType] = useState<PeriodType>('weekly')
  const [viewPlannedValue, setViewPlannedValue] = useState<boolean>(false)
  const [hideZeroProjects, setHideZeroProjects] = useState<boolean>(false)
  const [hideDivisionsColumn, setHideDivisionsColumn] = useState<boolean>(false)
  const [hideTotalContractColumn, setHideTotalContractColumn] = useState<boolean>(false)
  const [chartType, setChartType] = useState<'line' | 'bar' | 'area' | 'composed'>('line')
  const [showChartExportMenu, setShowChartExportMenu] = useState<boolean>(false)
  const chartRef = useRef<HTMLDivElement>(null)
  const chartExportMenuRef = useRef<HTMLDivElement>(null)

  // ✅ PERFORMANCE: Memoize today's date to avoid recalculating in every period
  const today = useMemo(() => {
    const date = new Date()
    date.setHours(23, 59, 59, 999)
    return date
  }, [])

  const divisions = useMemo(() => {
    return Array.from(new Set(projects.map((p: Project) => p.responsible_division).filter(Boolean))).sort()
  }, [projects])

  const filteredProjects = useMemo(() => {
    let filtered = projects
    if (selectedDivision) {
      filtered = filtered.filter((p: Project) => p.responsible_division === selectedDivision)
    }
    return filtered
  }, [projects, selectedDivision])

  // Calculate Divisions Contract Amount (same logic as ProjectsTableWithCustomization)
  const divisionsDataMap = useMemo(() => {
    const map = new Map<string, { divisionAmounts: Record<string, number>, divisionNames: Record<string, string> }>()
    
    if (activities.length === 0) {
      return map
    }
    
    projects.forEach((project: Project) => {
      // ✅ FIX: Use project_full_code as primary identifier (use existing if available)
      let projectFullCode = (project.project_full_code || '').toString().trim()
      if (!projectFullCode) {
        // Build from project_code + project_sub_code if not available
        const projectCode = (project.project_code || '').toString().trim()
        const projectSubCode = (project.project_sub_code || '').toString().trim()
        if (projectSubCode) {
          if (projectSubCode.toUpperCase().startsWith(projectCode.toUpperCase())) {
            projectFullCode = projectSubCode
          } else if (projectSubCode.startsWith('-')) {
            projectFullCode = `${projectCode}${projectSubCode}`
          } else {
            projectFullCode = `${projectCode}-${projectSubCode}`
          }
        } else {
          projectFullCode = projectCode
        }
      }
      const projectFullCodeUpper = projectFullCode.toUpperCase()
      
      // Build project code variations for backward compatibility
      const projectCode = (project.project_code || '').toString().trim()
      const projectSubCode = (project.project_sub_code || '').toString().trim()
      const projectCodeUpper = projectCode.toUpperCase()
      const projectSubCodeUpper = projectSubCode.toUpperCase()
      
      // Build project code variations (for backward compatibility)
      const projectCodeVariations = new Set<string>()
      projectCodeVariations.add(projectFullCodeUpper) // ✅ Priority: project_full_code first
      projectCodeVariations.add(projectCodeUpper)
      if (projectSubCode) {
        projectCodeVariations.add(projectSubCodeUpper)
        if (projectSubCodeUpper.includes(projectCodeUpper)) {
          projectCodeVariations.add(projectSubCodeUpper)
        } else {
          projectCodeVariations.add(`${projectCodeUpper}${projectSubCodeUpper}`)
          projectCodeVariations.add(`${projectCodeUpper}-${projectSubCodeUpper}`)
        }
      }
      
      // Filter activities for this project using project_full_code primarily
      const projectActivities = activities.filter((activity: BOQActivity) => {
        // ✅ Priority 1: Match by project_full_code (EXACT MATCH ONLY)
        const activityFullCode = (activity.project_full_code || '').toString().trim().toUpperCase()
        if (activityFullCode && activityFullCode === projectFullCodeUpper) {
          return true
        }
        
        // ✅ Priority 2: Match by project_id (EXACT MATCH ONLY)
        if (activity.project_id === project.id) {
          return true
        }
        
        // ❌ REMOVED: Don't use project_code variations to avoid matching wrong projects
        // This was causing activities from other projects (like 5066-1, 5066-2) to be included
        return false
      })
      
      const divisionAmounts: Record<string, number> = {}
      const divisionNames: Record<string, string> = {}
      
      projectActivities.forEach((activity: any) => {
        const rawActivity = (activity as any).raw || {}
        
        // Get division from activity
        const division = activity.activity_division || 
                       activity['Activity Division'] || 
                       rawActivity['Activity Division'] || 
                       rawActivity['activity_division'] || ''
        
        // Skip if no division found
        if (!division || division.trim() === '') {
          return
        }
        
        const divisionKey = division.trim().toLowerCase()
        const divisionName = division.trim()
        
        // Get Total Value directly from BOQ Activity
        let activityValue = 0
        
        // Priority 1: Use Total Value from activity
        const totalValue = activity.total_value || parseFloat(String(rawActivity['Total Value'] || '0').replace(/,/g, '')) || 0
        if (totalValue > 0) {
          activityValue = totalValue
        }
        
        // Priority 2: Calculate from Rate × Total Units if Total Value not available
        if (activityValue === 0) {
          const rate = activity.rate || parseFloat(String(rawActivity['Rate'] || '0').replace(/,/g, '')) || 0
          const totalUnits = activity.total_units || parseFloat(String(rawActivity['Total Units'] || '0').replace(/,/g, '')) || 0
          if (rate > 0 && totalUnits > 0) {
            activityValue = rate * totalUnits
          }
        }
        
        // Priority 3: Use Activity Value if available
        if (activityValue === 0) {
          const activityValueField = activity.activity_value || parseFloat(String(rawActivity['Activity Value'] || '0').replace(/,/g, '')) || 0
          if (activityValueField > 0) {
            activityValue = activityValueField
          }
        }
        
        // Sum values for this division (only if we have a value)
        if (activityValue > 0) {
          if (!divisionNames[divisionKey]) {
            divisionNames[divisionKey] = divisionName
          }
          divisionAmounts[divisionKey] = (divisionAmounts[divisionKey] || 0) + activityValue
        }
      })
      
      // Store in map
      map.set(project.id, { divisionAmounts, divisionNames })
    })
    
    return map
  }, [projects, activities])

  // Get periods in date range - تقسيم المدة حسب النوع المختار (يومي، أسبوعي، شهري، ربع سنوي، سنوي)
  const getPeriodsInRange = useMemo(() => {
    const periods: Array<{ label: string; start: Date; end: Date }> = []
    
    if (!dateRange.start || !dateRange.end) {
      // Default: last 4 periods based on periodType
      const now = new Date()
      const defaultCount = periodType === 'daily' ? 30 : periodType === 'weekly' ? 4 : periodType === 'monthly' ? 6 : periodType === 'quarterly' ? 4 : 2
      
      for (let i = defaultCount - 1; i >= 0; i--) {
        let periodStart = new Date(now)
        let periodEnd = new Date(now)
        
        switch (periodType) {
          case 'daily':
            periodStart.setDate(now.getDate() - i)
            periodStart.setHours(0, 0, 0, 0)
            periodEnd = new Date(periodStart)
            periodEnd.setHours(23, 59, 59, 999)
            periods.push({
              label: periodStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              start: periodStart,
              end: periodEnd
            })
            break
          case 'weekly':
            periodStart.setDate(now.getDate() - (i * 7) - (now.getDay() === 0 ? 6 : now.getDay() - 1))
            periodStart.setHours(0, 0, 0, 0)
            periodEnd = new Date(periodStart)
            periodEnd.setDate(periodStart.getDate() + 6)
            periodEnd.setHours(23, 59, 59, 999)
            periods.push({
              label: `Week ${defaultCount - i}`,
              start: periodStart,
              end: periodEnd
            })
            break
          case 'monthly':
            periodStart.setMonth(now.getMonth() - i)
            periodStart.setDate(1)
            periodStart.setHours(0, 0, 0, 0)
            periodEnd = new Date(periodStart)
            periodEnd.setMonth(periodStart.getMonth() + 1)
            periodEnd.setDate(0)
            periodEnd.setHours(23, 59, 59, 999)
            periods.push({
              label: periodStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
              start: periodStart,
              end: periodEnd
            })
            break
          case 'quarterly':
            const quarterMonth = Math.floor((now.getMonth() - (i * 3)) / 3) * 3
            periodStart.setMonth(quarterMonth)
            periodStart.setDate(1)
            periodStart.setFullYear(now.getFullYear() + Math.floor((now.getMonth() - (i * 3)) / 12))
            periodStart.setHours(0, 0, 0, 0)
            periodEnd = new Date(periodStart)
            periodEnd.setMonth(periodStart.getMonth() + 3)
            periodEnd.setDate(0)
            periodEnd.setHours(23, 59, 59, 999)
            const quarter = Math.floor(periodStart.getMonth() / 3) + 1
            periods.push({
              label: `Q${quarter} ${periodStart.getFullYear()}`,
              start: periodStart,
              end: periodEnd
            })
            break
          case 'yearly':
            periodStart.setFullYear(now.getFullYear() - i)
            periodStart.setMonth(0)
            periodStart.setDate(1)
            periodStart.setHours(0, 0, 0, 0)
            periodEnd = new Date(periodStart)
            periodEnd.setFullYear(periodStart.getFullYear() + 1)
            periodEnd.setMonth(0)
            periodEnd.setDate(0)
            periodEnd.setHours(23, 59, 59, 999)
            periods.push({
              label: periodStart.getFullYear().toString(),
              start: periodStart,
              end: periodEnd
            })
            break
        }
      }
      return periods
    }

    const start = new Date(dateRange.start)
    const end = new Date(dateRange.end)
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)
    
    const current = new Date(start)
    let periodNumber = 1

    switch (periodType) {
      case 'daily':
        while (current <= end) {
          const periodStart = new Date(current)
          periodStart.setHours(0, 0, 0, 0)
          const periodEnd = new Date(periodStart)
          periodEnd.setHours(23, 59, 59, 999)
          periods.push({
            label: periodStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            start: periodStart,
            end: periodEnd
          })
          current.setDate(current.getDate() + 1)
        }
        break
      case 'weekly':
    // Start from the beginning of the week (Monday)
    const dayOfWeek = current.getDay()
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    current.setDate(current.getDate() - diff)
    current.setHours(0, 0, 0, 0)
    while (current <= end) {
          const periodStart = new Date(current)
          const periodEnd = new Date(current)
          periodEnd.setDate(periodStart.getDate() + 6)
          periodEnd.setHours(23, 59, 59, 999)
          if (periodStart <= end && periodEnd >= start) {
            periods.push({
              label: `Week ${periodNumber}`,
              start: periodStart,
              end: periodEnd
            })
            periodNumber++
          }
      current.setDate(current.getDate() + 7)
        }
        break
      case 'monthly':
        current.setDate(1)
        current.setHours(0, 0, 0, 0)
        while (current <= end) {
          const periodStart = new Date(current)
          const periodEnd = new Date(periodStart)
          periodEnd.setMonth(periodStart.getMonth() + 1)
          periodEnd.setDate(0)
          periodEnd.setHours(23, 59, 59, 999)
          if (periodStart <= end && periodEnd >= start) {
            periods.push({
              label: periodStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
              start: periodStart,
              end: periodEnd
            })
          }
          current.setMonth(current.getMonth() + 1)
        }
        break
      case 'quarterly':
        const startQuarter = Math.floor(start.getMonth() / 3)
        current.setMonth(startQuarter * 3)
        current.setDate(1)
        current.setHours(0, 0, 0, 0)
        while (current <= end) {
          const periodStart = new Date(current)
          const periodEnd = new Date(periodStart)
          periodEnd.setMonth(periodStart.getMonth() + 3)
          periodEnd.setDate(0)
          periodEnd.setHours(23, 59, 59, 999)
          if (periodStart <= end && periodEnd >= start) {
            const quarter = Math.floor(periodStart.getMonth() / 3) + 1
            periods.push({
              label: `Q${quarter} ${periodStart.getFullYear()}`,
              start: periodStart,
              end: periodEnd
            })
          }
          current.setMonth(current.getMonth() + 3)
        }
        break
      case 'yearly':
        current.setMonth(0)
        current.setDate(1)
        current.setHours(0, 0, 0, 0)
        while (current <= end) {
          const periodStart = new Date(current)
          const periodEnd = new Date(periodStart)
          periodEnd.setFullYear(periodStart.getFullYear() + 1)
          periodEnd.setMonth(0)
          periodEnd.setDate(0)
          periodEnd.setHours(23, 59, 59, 999)
          if (periodStart <= end && periodEnd >= start) {
            periods.push({
              label: periodStart.getFullYear().toString(),
              start: periodStart,
              end: periodEnd
            })
          }
          current.setFullYear(current.getFullYear() + 1)
        }
        break
    }

    return periods
  }, [dateRange, periodType])

  const periods = getPeriodsInRange
  // Keep 'weeks' alias for backward compatibility
  const weeks = periods

  const getKPIValue = (kpi: any, relatedActivity: BOQActivity | null): number => {
    try {
      const rawKpi = (kpi as any).raw || {}
      
      // Get quantity
      const quantity = parseFloat(String(
        kpi.quantity || 
        rawKpi['Quantity'] || 
        rawKpi['quantity'] || 
        '0'
      ).replace(/,/g, '')) || 0
      
      // Priority 1: Use KPI value directly if available (this is the total value)
      // This is the same logic used in calculateProjectAnalytics
      const kpiValue = parseFloat(String(
        kpi.value || 
        rawKpi['Value'] || 
        rawKpi['value'] || 
        '0'
      ).replace(/,/g, '')) || 0
      
      if (kpiValue > 0) {
        return kpiValue
      }
      
      // Priority 2: Calculate from quantity × rate (same as calculateProjectAnalytics)
      let rate = 0
      
      // Try to get rate from related activity (same logic as calculateProjectAnalytics)
      if (relatedActivity) {
        // Use calculateActivityRate if available, otherwise calculate manually
        const activityRate = parseFloat(String(relatedActivity.rate || '0').replace(/,/g, '')) || 0
        if (activityRate > 0) {
          rate = activityRate
        } else {
          const totalValue = parseFloat(String(relatedActivity.total_value || '0').replace(/,/g, '')) || 0
          const plannedUnits = parseFloat(String(relatedActivity.planned_units || '0').replace(/,/g, '')) || 0
          
          if (totalValue > 0 && plannedUnits > 0) {
            rate = totalValue / plannedUnits
          }
        }
      }
      
      // Calculate value = rate × quantity (same as calculateProjectAnalytics)
      if (rate > 0 && quantity > 0) {
        return quantity * rate
      }
      
      // Last resort: use quantity as value (1:1 ratio)
      if (quantity > 0) {
        return quantity
      }
      
      return 0
    } catch (error) {
      console.error('[Monthly Revenue] Error in getKPIValue:', error, { kpi })
      return 0
    }
  }

  // Helper: Match KPI to project using project_full_code only
  const matchesProject = (kpi: any, project: Project): boolean => {
    // ✅ FIX: Use project_full_code only
    const kpiProjectFullCode = (kpi.project_full_code || (kpi as any)['Project Full Code'] || '').toString().trim()
    const projectFullCode = (project.project_full_code || `${project.project_code}${project.project_sub_code ? `-${project.project_sub_code}` : ''}`).toString().trim()
    
    // Priority 1: Exact match on project_full_code
    if (kpiProjectFullCode && projectFullCode && kpiProjectFullCode.toUpperCase() === projectFullCode.toUpperCase()) {
      return true
    }
    
    // ✅ FIX: If KPI doesn't have project_full_code, try to build it from project_code + project_sub_code
    if (!kpiProjectFullCode) {
      const kpiProjectCode = (kpi.project_code || (kpi as any)['Project Code'] || '').toString().trim()
      const kpiProjectSubCode = (kpi.project_sub_code || (kpi as any)['Project Sub Code'] || '').toString().trim()
      
      if (kpiProjectCode) {
        let kpiFullCode = kpiProjectCode
        if (kpiProjectSubCode) {
          if (kpiProjectSubCode.toUpperCase().startsWith(kpiProjectCode.toUpperCase())) {
            kpiFullCode = kpiProjectSubCode
          } else {
            kpiFullCode = kpiProjectSubCode.startsWith('-') 
              ? `${kpiProjectCode}${kpiProjectSubCode}`
              : `${kpiProjectCode}-${kpiProjectSubCode}`
          }
        }
        if (kpiFullCode.toUpperCase() === projectFullCode.toUpperCase()) {
          return true
        }
      }
    }
    
    return false
  }

  // ✅ PERFORMANCE: Pre-filter KPIs by project to avoid repeated filtering
  const projectKPIsMap = useMemo(() => {
    const map = new Map<string, { planned: any[], actual: any[] }>()
    projects.forEach((project: Project) => {
      const projectId = project.id
      const plannedKPIs: any[] = []
      const actualKPIs: any[] = []
      
      kpis.forEach((kpi: any) => {
        try {
          if (matchesProject(kpi, project)) {
            const inputType = String(
              kpi.input_type || 
              kpi['Input Type'] || 
              (kpi as any).raw?.['Input Type'] || 
              (kpi as any).raw?.['input_type'] ||
              ''
            ).trim().toLowerCase()
            
            if (inputType === 'planned') {
              plannedKPIs.push(kpi)
            } else if (inputType === 'actual') {
              actualKPIs.push(kpi)
            }
          }
        } catch (error) {
          // Skip invalid KPIs
        }
      })
      
      map.set(projectId, { planned: plannedKPIs, actual: actualKPIs })
    })
    
    return map
  }, [kpis, projects])

  // Calculate period earned value per project - حساب القيمة المنجزة لكل فترة
  // Calculate Period Planned Value (same logic as calculatePeriodEarnedValue but for Planned KPIs)
  // ✅ PERFORMANCE: Memoize calculatePeriodPlannedValue to avoid recalculations
  const calculatePeriodPlannedValue = useCallback((project: Project, analytics: any): number[] => {
    // ✅ PERFORMANCE: Use pre-filtered KPIs instead of filtering every time
    const projectKPIs = projectKPIsMap.get(project.id)
    const allProjectKPIs = projectKPIs?.planned || []
    
    // ✅ PERFORMANCE: Use memoized today date
    
    return periods.map((period) => {
      const periodStart = period.start
      const periodEnd = period.end

      // ✅ For current/future periods, use today as the end date instead of periodEnd
      const effectivePeriodEnd = periodEnd > today ? today : periodEnd

      // Get KPI Planned for this period
      const plannedKPIsInPeriod = allProjectKPIs.filter((kpi: any) => {
        const inputType = String(
          kpi.input_type || 
          kpi['Input Type'] || 
          (kpi as any).raw?.['Input Type'] || 
          (kpi as any).raw?.['input_type'] ||
          ''
        ).trim().toLowerCase()
        
        if (inputType !== 'planned') return false
        
        // ✅ Use EXACT SAME LOGIC as Date column in table
        const rawKPIDate = (kpi as any).raw || {}
        
        // Priority 1: Day column (if available and formatted)
        const dayValue = (kpi as any).day || rawKPIDate['Day'] || ''
        
        // Priority 2: Target Date (for Planned KPIs)
        const targetDateValue = kpi.target_date || rawKPIDate['Target Date'] || ''
        
        // Priority 3: Activity Date
        const activityDateValue = kpi.activity_date || rawKPIDate['Activity Date'] || ''
        
        // Determine which date to use based on Input Type
        let kpiDateStr = ''
        if (kpi.input_type === 'Planned' && targetDateValue) {
          kpiDateStr = targetDateValue
        } else if (dayValue) {
          kpiDateStr = activityDateValue || dayValue
        } else {
          kpiDateStr = activityDateValue || targetDateValue
        }
        
        if (!kpiDateStr) return false
        
        try {
          const kpiDate = new Date(kpiDateStr)
          if (isNaN(kpiDate.getTime())) return false
          
          kpiDate.setHours(0, 0, 0, 0) // Normalize to start of day
          
          // Normalize periodStart and effectivePeriodEnd for comparison
          const normalizedPeriodStart = new Date(periodStart)
          normalizedPeriodStart.setHours(0, 0, 0, 0)
          
          const normalizedPeriodEnd = new Date(effectivePeriodEnd)
          normalizedPeriodEnd.setHours(23, 59, 59, 999) // End of day
          
          // Check if KPI date is within range
          const inRange = kpiDate >= normalizedPeriodStart && kpiDate <= normalizedPeriodEnd
          
          return inRange
        } catch {
          return false
        }
      })

      // ✅ PERFORMANCE: Use cached project activities from analytics instead of filtering every time
      const projectActivities = analytics.activities || []

      // Calculate Planned Value using same logic as calculatePeriodEarnedValue
      return plannedKPIsInPeriod.reduce((sum: number, kpi: any) => {
        try {
          const rawKpi = (kpi as any).raw || {}
          const quantity = parseFloat(String(kpi.quantity || rawKpi['Quantity'] || '0').replace(/,/g, '')) || 0
          const quantityValue = quantity || 0
          
          let financialValue = 0
          
          // Find related activity for rate calculation (same logic as calculatePeriodEarnedValue)
          let relatedActivity: BOQActivity | undefined = undefined
          const kpiActivityName = (kpi.activity_name || rawKpi['Activity Name'] || '').toLowerCase().trim()
          const kpiProjectCode = (kpi.project_code || rawKpi['Project Code'] || '').toString().trim().toLowerCase()
          const kpiProjectFullCode = (kpi.project_full_code || rawKpi['Project Full Code'] || '').toString().trim().toLowerCase()
          const kpiZone = (kpi.zone || rawKpi['Zone'] || rawKpi['Zone Number'] || '').toString().toLowerCase().trim()
          
          // Try multiple matching strategies (same as calculateWeeklyEarnedValue)
          if (kpiActivityName && kpiProjectFullCode) {
            relatedActivity = projectActivities.find((a: BOQActivity) => {
              const activityName = (a.activity_name || a.activity || '').toLowerCase().trim()
              const activityFullCode = (a.project_full_code || '').toString().trim().toLowerCase()
              return activityName === kpiActivityName && activityFullCode === kpiProjectFullCode
            })
          }
          
          if (!relatedActivity && kpiActivityName && kpiProjectCode) {
            relatedActivity = projectActivities.find((a: BOQActivity) => {
              const activityName = (a.activity_name || a.activity || '').toLowerCase().trim()
              const activityProjectCode = (a.project_code || '').toString().trim().toLowerCase()
              return activityName === kpiActivityName && activityProjectCode === kpiProjectCode
            })
          }
          
          if (relatedActivity) {
            const rawActivity = (relatedActivity as any).raw || {}
            
            // ✅ PRIORITY 1: Calculate Rate = Total Value / Total Units
            const totalValueFromActivity = relatedActivity.total_value || 
                                         parseFloat(String(rawActivity['Total Value'] || '0').replace(/,/g, '')) || 
                                         0
            
            const totalUnits = relatedActivity.total_units || 
                            relatedActivity.planned_units ||
                            parseFloat(String(rawActivity['Total Units'] || rawActivity['Planned Units'] || '0').replace(/,/g, '')) || 
                            0
            
            let rate = 0
            if (totalUnits > 0 && totalValueFromActivity > 0) {
              rate = totalValueFromActivity / totalUnits
            } else {
              rate = relatedActivity.rate || 
                    parseFloat(String(rawActivity['Rate'] || '0').replace(/,/g, '')) || 
                    0
            }
            
            // Calculate value = rate × quantity
            if (rate > 0 && quantityValue > 0) {
              financialValue = quantityValue * rate
              if (financialValue > 0) {
                return sum + financialValue
              }
            }
          }
          
          // ✅ PRIORITY 2: Use Value directly from KPI
          if (financialValue === 0) {
            let kpiValue = 0
            
            if (rawKpi['Value'] !== undefined && rawKpi['Value'] !== null) {
              const val = rawKpi['Value']
              kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
            }
            
            if (kpiValue === 0 && rawKpi.value !== undefined && rawKpi.value !== null) {
              const val = rawKpi.value
              kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
            }
            
            if (kpiValue === 0 && kpi.value !== undefined && kpi.value !== null) {
              const val = kpi.value
              kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
            }
            
            if (kpiValue > 0) {
              financialValue = kpiValue
              return sum + financialValue
            }
          }
          
          // ✅ PRIORITY 3: Try Planned Value
          if (financialValue === 0) {
            const plannedValue = (kpi.planned_value ?? 
                               parseFloat(String(rawKpi['Planned Value'] || '0').replace(/,/g, ''))) || 
                               0
            
            if (plannedValue > 0) {
              financialValue = plannedValue
              return sum + financialValue
            }
          }
          
          return sum
        } catch (error) {
          console.error('[Monthly Revenue] Error calculating Planned KPI value:', error, { kpi, project })
          return sum
        }
      }, 0)
    })
  }, [kpis, weeks, activities])

  // ✅ PERFORMANCE: Memoize calculatePeriodEarnedValue to avoid recalculations
  const calculatePeriodEarnedValue = useCallback((project: Project, analytics: any): number[] => {
    // ✅ PERFORMANCE: Use pre-filtered KPIs instead of filtering every time
    const projectKPIs = projectKPIsMap.get(project.id)
    const allProjectKPIs = projectKPIs?.actual || []
    
    // ✅ PERFORMANCE: Removed debug logging for production
    // ✅ PERFORMANCE: Use memoized today date
    
    return periods.map((period) => {
      const periodStart = period.start
      const periodEnd = period.end

      // ✅ For current/future periods, use today as the end date instead of periodEnd
      // This ensures we only show KPIs up to today, not future dates
      const effectivePeriodEnd = periodEnd > today ? today : periodEnd

      // Get KPI Actual for this period (ما تم تنفيذه في هذه الفترة حتى تاريخ اليوم)
      const actualKPIsInPeriod = allProjectKPIs.filter((kpi: any) => {
        const inputType = String(
          kpi.input_type || 
          kpi['Input Type'] || 
          (kpi as any).raw?.['Input Type'] || 
          (kpi as any).raw?.['input_type'] ||
          ''
        ).trim().toLowerCase()
        
        if (inputType !== 'actual') return false
        
        // ✅ Use EXACT SAME LOGIC as Date column in table
        const rawKPIDate = (kpi as any).raw || {}
        
        // Priority 1: Day column (if available and formatted)
        const dayValue = (kpi as any).day || rawKPIDate['Day'] || ''
        
        // Priority 2: Actual Date (for Actual KPIs) or Target Date (for Planned KPIs)
        const actualDateValue = (kpi as any).actual_date || rawKPIDate['Actual Date'] || ''
        const targetDateValue = kpi.target_date || rawKPIDate['Target Date'] || ''
        
        // Priority 3: Activity Date
        const activityDateValue = kpi.activity_date || rawKPIDate['Activity Date'] || ''
        
        // Determine which date to use based on Input Type (SAME AS TABLE COLUMN)
        let kpiDateStr = ''
        if (kpi.input_type === 'Actual' && actualDateValue) {
          kpiDateStr = actualDateValue
        } else if (kpi.input_type === 'Planned' && targetDateValue) {
          kpiDateStr = targetDateValue
        } else if (dayValue) {
          // If Day is available, try to use it or fallback to Activity Date
          kpiDateStr = activityDateValue || dayValue
        } else {
          kpiDateStr = activityDateValue || actualDateValue || targetDateValue
        }
        
        if (!kpiDateStr) return false
        
        try {
          const kpiDate = new Date(kpiDateStr)
          if (isNaN(kpiDate.getTime())) return false
          
          kpiDate.setHours(0, 0, 0, 0) // Normalize to start of day (SAME AS KPI PAGE)
          
          // ✅ Use EXACT SAME LOGIC as KPI page date range filter
          // Normalize periodStart and effectivePeriodEnd for comparison
          const normalizedPeriodStart = new Date(periodStart)
          normalizedPeriodStart.setHours(0, 0, 0, 0)
          
          const normalizedPeriodEnd = new Date(effectivePeriodEnd)
          normalizedPeriodEnd.setHours(23, 59, 59, 999) // End of day (SAME AS KPI PAGE)
          
          // Check if KPI date is within range (SAME AS KPI PAGE)
          const inRange = kpiDate >= normalizedPeriodStart && kpiDate <= normalizedPeriodEnd
          
          // ✅ PERFORMANCE: Removed debug logging for production
          
          return inRange
        } catch (error) {
          // ✅ PERFORMANCE: Removed console.warn for production
          if (false) console.warn('[Monthly Revenue] Error parsing KPI date:', kpiDateStr, error)
          return false
        }
      })
      
      // ✅ PERFORMANCE: Removed debug logging for production

      // ✅ FIXED: Calculate value using EXACT SAME LOGIC as KPI page Actual Value
      // Priority: 1) Rate × Quantity (SAME AS TABLE), 2) Value directly from KPI, 3) Actual Value
      // This MUST match the logic in KPITracking.tsx totalActualValue calculation
      return actualKPIsInPeriod.reduce((sum: number, kpi: any) => {
        try {
          const rawKpi = (kpi as any).raw || {}
          
          // Get Quantity
          const quantityValue = parseFloat(String(kpi.quantity || rawKpi['Quantity'] || '0').replace(/,/g, '')) || 0
          
          // ✅ PRIORITY 1: Calculate from Rate × Quantity (SAME AS TABLE COLUMN)
          // This is how Value is calculated in the table: Quantity × Rate
          let financialValue = 0
          
          // ✅ PERFORMANCE: Use cached project activities from analytics (already filtered)
          const projectActivities = analytics.activities || []
          
          const kpiActivityName = (kpi.activity_name || (kpi as any)['Activity Name'] || '').toLowerCase().trim()
          const kpiProjectFullCode = (kpi.project_full_code || kpi.project_code || '').toLowerCase().trim()
          const kpiProjectCode = (kpi.project_code || '').toLowerCase().trim()
          
          // Extract KPI Zone (same logic as KPI page)
          const kpiZoneRaw = (kpi.zone || rawKpi['Zone'] || rawKpi['Zone Number'] || '').toString().trim()
          let kpiZone = kpiZoneRaw.toLowerCase().trim()
          if (kpiZone && kpiProjectCode) {
            const projectCodeUpper = kpiProjectCode.toUpperCase()
            kpiZone = kpiZone.replace(new RegExp(`^${projectCodeUpper}\\s*-\\s*`, 'i'), '').trim()
            kpiZone = kpiZone.replace(new RegExp(`^${projectCodeUpper}\\s+`, 'i'), '').trim()
            kpiZone = kpiZone.replace(new RegExp(`^${projectCodeUpper}-`, 'i'), '').trim()
          }
          if (!kpiZone) kpiZone = kpiZoneRaw.toLowerCase().trim()
          
          // Try multiple matching strategies (with Zone priority) - SAME AS KPI PAGE
          let relatedActivity: BOQActivity | undefined = undefined
          
          // Try 1: activity_name + project_full_code + zone (most precise)
          if (kpiActivityName && kpiProjectFullCode && kpiZone) {
            relatedActivity = projectActivities.find((a: BOQActivity) => {
              const activityName = (a.activity_name || a.activity || '').toLowerCase().trim()
              const activityProjectFullCode = (a.project_full_code || a.project_code || '').toLowerCase().trim()
              const rawActivity = (a as any).raw || {}
              const activityZone = (a.zone_ref || a.zone_number || rawActivity['Zone Ref'] || rawActivity['Zone Number'] || '').toString().toLowerCase().trim()
              return activityName === kpiActivityName && 
                     activityProjectFullCode === kpiProjectFullCode &&
                     (activityZone === kpiZone || activityZone.includes(kpiZone) || kpiZone.includes(activityZone))
            })
          }
          
          // Try 2: activity_name + project_full_code (without zone - fallback)
          if (!relatedActivity && kpiActivityName && kpiProjectFullCode) {
            relatedActivity = projectActivities.find((a: BOQActivity) => {
              const activityName = (a.activity_name || a.activity || '').toLowerCase().trim()
              const activityProjectFullCode = (a.project_full_code || a.project_code || '').toLowerCase().trim()
              return activityName === kpiActivityName && activityProjectFullCode === kpiProjectFullCode
            })
          }
          
          // Try 3: activity_name + project_code + zone (if not found and project_code exists)
          if (!relatedActivity && kpiActivityName && kpiProjectCode && kpiZone) {
            relatedActivity = projectActivities.find((a: BOQActivity) => {
              const activityName = (a.activity_name || a.activity || '').toLowerCase().trim()
              const activityProjectCode = (a.project_code || '').toLowerCase().trim()
              const rawActivity = (a as any).raw || {}
              const activityZone = (a.zone_ref || a.zone_number || rawActivity['Zone Ref'] || rawActivity['Zone Number'] || '').toString().toLowerCase().trim()
              return activityName === kpiActivityName && 
                     activityProjectCode === kpiProjectCode &&
                     (activityZone === kpiZone || activityZone.includes(kpiZone) || kpiZone.includes(activityZone))
            })
          }
          
          // Try 4: activity_name + project_code (without zone - fallback)
          if (!relatedActivity && kpiActivityName && kpiProjectCode) {
            relatedActivity = projectActivities.find((a: BOQActivity) => {
              const activityName = (a.activity_name || a.activity || '').toLowerCase().trim()
              const activityProjectCode = (a.project_code || '').toLowerCase().trim()
              return activityName === kpiActivityName && activityProjectCode === kpiProjectCode
            })
          }
          
          // Try 5: activity_name only (last resort)
          if (!relatedActivity && kpiActivityName) {
            relatedActivity = projectActivities.find((a: BOQActivity) => {
              const activityName = (a.activity_name || a.activity || '').toLowerCase().trim()
              return activityName === kpiActivityName
            })
          }
          
          if (relatedActivity) {
            const rawActivity = (relatedActivity as any).raw || {}
            
            // ✅ PRIORITY 1: Calculate Rate = Total Value / Total Units (SAME AS TABLE)
            const totalValueFromActivity = relatedActivity.total_value || 
                                         parseFloat(String(rawActivity['Total Value'] || '0').replace(/,/g, '')) || 
                                         0
            
            const totalUnits = relatedActivity.total_units || 
                            relatedActivity.planned_units ||
                            parseFloat(String(rawActivity['Total Units'] || rawActivity['Planned Units'] || '0').replace(/,/g, '')) || 
                            0
            
            let rate = 0
            if (totalUnits > 0 && totalValueFromActivity > 0) {
              rate = totalValueFromActivity / totalUnits
            } else {
              // ✅ PRIORITY 2: Use rate directly from activity (fallback)
              rate = relatedActivity.rate || 
                    parseFloat(String(rawActivity['Rate'] || '0').replace(/,/g, '')) || 
                    0
            }
            
            // Calculate value = rate × quantity
            if (rate > 0 && quantityValue > 0) {
              financialValue = quantityValue * rate
              if (financialValue > 0) {
                return sum + financialValue
              }
            }
          }
          
          // ✅ PRIORITY 2: Use Value directly from KPI (fallback if calculated value is 0)
          // Check raw['Value'] first (from database), then k.value
          if (financialValue === 0) {
            let kpiValue = 0
            
            // Try raw['Value'] (from database with capital V) - MOST RELIABLE
            if (rawKpi['Value'] !== undefined && rawKpi['Value'] !== null) {
              const val = rawKpi['Value']
              kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
            }
            
            // Try raw.value (from database with lowercase v)
            if (kpiValue === 0 && rawKpi.value !== undefined && rawKpi.value !== null) {
              const val = rawKpi.value
              kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
            }
            
            // Try k.value (direct property from ProcessedKPI)
            if (kpiValue === 0 && kpi.value !== undefined && kpi.value !== null) {
              const val = kpi.value
              kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
            }
            
            if (kpiValue > 0) {
              financialValue = kpiValue
          return sum + financialValue
            }
          }
          
          // ✅ PRIORITY 3: Try Actual Value (fallback if calculated value and Value are both 0)
          if (financialValue === 0) {
            const actualValue = (kpi.actual_value ?? 
                               parseFloat(String(rawKpi['Actual Value'] || '0').replace(/,/g, ''))) || 
                               0
            
            if (actualValue > 0) {
              financialValue = actualValue
              return sum + financialValue
            }
          }
          
          // ✅ CRITICAL: If no value found and no rate, skip (NEVER use quantity as value!)
          // This KPI will not contribute to period revenue
          return sum
        } catch (error) {
          // ✅ PERFORMANCE: Only log critical errors
          if (process.env.NODE_ENV === 'development') console.error('[Monthly Revenue] Error calculating KPI value:', error, { kpi, project })
          return sum
        }
      }, 0)
    })
  }, [kpis, periods, activities])

  const allAnalytics = useMemo(() => {
    return getAllProjectsAnalytics(filteredProjects, activities, kpis)
  }, [filteredProjects, activities, kpis])

  // ✅ PERFORMANCE: Pre-calculate period values for all projects once
  const periodValuesCache = useMemo(() => {
    const cache = new Map<string, { earned: number[], planned: number[] }>()
    
    allAnalytics.forEach((analytics: any) => {
      const projectId = analytics.project.id
      const earnedValues = calculatePeriodEarnedValue(analytics.project, analytics)
      const plannedValues = viewPlannedValue ? calculatePeriodPlannedValue(analytics.project, analytics) : []
      cache.set(projectId, { earned: earnedValues, planned: plannedValues })
    })
    
    return cache
  }, [allAnalytics, calculatePeriodEarnedValue, calculatePeriodPlannedValue, viewPlannedValue])

  // ✅ FIX: Show ALL projects from allAnalytics, regardless of date range or KPIs
  // The date range filter only affects which weeks show data in the table, not which projects are displayed
  // This ensures projects like P5066-R3 and P5066-R4 always appear, even when date range changes
  const projectsWithWorkInRange = useMemo(() => {
    // Always return ALL projects from allAnalytics
    // The date range is only used for calculating weekly values, not for filtering projects
    let filtered = allAnalytics
    
    // ✅ Filter out projects with Grand Total = 0 if checkbox is checked
    if (hideZeroProjects) {
      filtered = filtered.filter((analytics: any) => {
        const projectId = analytics.project.id
        const cachedValues = periodValuesCache.get(projectId)
        const periodValues = cachedValues?.earned || []
        const grandTotal = periodValues.reduce((sum: number, val: number) => sum + val, 0)
        return grandTotal > 0
      })
    }
    
    return filtered
  }, [allAnalytics, hideZeroProjects, periodValuesCache])

  // ✅ PERFORMANCE: Removed debug logging useEffect for production


  // Close chart export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (chartExportMenuRef.current && !chartExportMenuRef.current.contains(event.target as Node)) {
        setShowChartExportMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Export Chart function
  const handleExportChart = useCallback(async (format: 'png' | 'jpeg' | 'svg' | 'pdf') => {
    if (!chartRef.current) {
      alert('Chart not found')
      return
    }

    setShowChartExportMenu(false)

    try {
      const dateStr = dateRange.start && dateRange.end
        ? `${dateRange.start}_to_${dateRange.end}`
        : new Date().toISOString().split('T')[0]
      
      const baseFilename = `Weekly_Revenue_Chart_${dateStr}`

      if (format === 'svg') {
        // Export as SVG (direct from recharts)
        const svgElement = chartRef.current.querySelector('svg')
        if (!svgElement) {
          alert('SVG element not found')
          return
        }

        const svgData = new XMLSerializer().serializeToString(svgElement)
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
        const svgUrl = URL.createObjectURL(svgBlob)
        const downloadLink = document.createElement('a')
        downloadLink.href = svgUrl
        downloadLink.download = `${baseFilename}.svg`
        document.body.appendChild(downloadLink)
        downloadLink.click()
        document.body.removeChild(downloadLink)
        URL.revokeObjectURL(svgUrl)
        
        console.log(`✅ Downloaded: ${baseFilename}.svg`)
        return
      }

      if (format === 'png' || format === 'jpeg') {
        // Export as PNG/JPEG using html2canvas
        const html2canvas = (await import('html2canvas')).default
        
        const canvas = await html2canvas(chartRef.current, {
          backgroundColor: '#ffffff',
          scale: 2, // Higher quality
          logging: false,
          useCORS: true
        })

        canvas.toBlob((blob) => {
          if (!blob) {
            alert('Failed to create image')
            return
          }

          const url = URL.createObjectURL(blob)
          const downloadLink = document.createElement('a')
          downloadLink.href = url
          downloadLink.download = `${baseFilename}.${format}`
          document.body.appendChild(downloadLink)
          downloadLink.click()
          document.body.removeChild(downloadLink)
          URL.revokeObjectURL(url)
          
          console.log(`✅ Downloaded: ${baseFilename}.${format}`)
        }, `image/${format}`, 0.95)
        return
      }

      if (format === 'pdf') {
        // Export as PDF using jspdf
        const html2canvas = (await import('html2canvas')).default
        const { jsPDF } = await import('jspdf')

        const canvas = await html2canvas(chartRef.current, {
          backgroundColor: '#ffffff',
          scale: 2,
          logging: false,
          useCORS: true
        })

        const imgData = canvas.toDataURL('image/png')
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4'
        })

        const imgWidth = 297 // A4 width in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width

        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
        pdf.save(`${baseFilename}.pdf`)
        
        console.log(`✅ Downloaded: ${baseFilename}.pdf`)
        return
      }
    } catch (error) {
      console.error('Error exporting chart:', error)
      alert('Failed to export chart. Please try again.')
    }
  }, [dateRange])

  // ✅ FIXED: Calculate totals directly from filteredProjects and kpis (same as stats)
  // This prevents double-counting when multiple projects share KPIs
  const totals = useMemo(() => {
    // ✅ Total Contract Value = Sum of contract_amount from all filtered projects
    const totalContractValue = filteredProjects.reduce((sum: number, project: Project) => {
      const contractAmount = parseFloat(String(project.contract_amount || '0').replace(/,/g, '')) || 0
      return sum + contractAmount
    }, 0)
    
    // ✅ Total Earned Value = Sum of Actual Value from ALL Actual KPIs (no date filter)
    // Calculate directly from kpis (same logic as stats)
    let totalEarnedValue = 0
    const actualKPIsList = kpis.filter((k: any) => {
      const inputType = String(
        k.input_type || 
        k['Input Type'] || 
        (k as any).raw?.['Input Type'] || 
        (k as any).raw?.['input_type'] ||
        ''
      ).trim().toLowerCase()
      return inputType === 'actual'
    })
    
    actualKPIsList.forEach((kpi: any) => {
      const rawKPI = (kpi as any).raw || {}
      
      // ✅ PRIORITY 1: Use Actual Value directly from KPI (most accurate)
      const actualValue = kpi.actual_value || parseFloat(String(rawKPI['Actual Value'] || '0').replace(/,/g, '')) || 0
      if (actualValue > 0) {
        totalEarnedValue += actualValue
        return
      }
      
      // ✅ PRIORITY 2: Fallback to Value field if Actual Value is not available
      let kpiValue = 0
      
      // Try raw['Value'] (from database with capital V)
      if (rawKPI['Value'] !== undefined && rawKPI['Value'] !== null) {
        const val = rawKPI['Value']
        kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
      }
      
      // Try raw.value (from database with lowercase v)
      if (kpiValue === 0 && rawKPI.value !== undefined && rawKPI.value !== null) {
        const val = rawKPI.value
        kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
      }
      
      // Try k.value (direct property from ProcessedKPI)
      if (kpiValue === 0 && kpi.value !== undefined && kpi.value !== null) {
        const val = kpi.value
        kpiValue = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '')) || 0
      }
      
      if (kpiValue > 0) {
        totalEarnedValue += kpiValue
      }
    })
    
    // Calculate period earned value totals from cache
    const periodEarnedValueTotals = periods.map((_, periodIndex) => {
      let sum = 0
      projectsWithWorkInRange.forEach((analytics: any) => {
        const cachedValues = periodValuesCache.get(analytics.project.id)
        const periodValues = cachedValues?.earned || []
        sum += periodValues[periodIndex] || 0
      })
      return sum
    })
    
    // Calculate period planned value totals from cache
    const periodPlannedValueTotals = periods.map((_, periodIndex) => {
      let sum = 0
      projectsWithWorkInRange.forEach((analytics: any) => {
        const cachedValues = periodValuesCache.get(analytics.project.id)
        const periodValues = cachedValues?.planned || []
        sum += periodValues[periodIndex] || 0
      })
      return sum
    })
    
    const grandTotalEarnedValue = periodEarnedValueTotals.reduce((sum, val) => sum + val, 0)
    const grandTotalPlannedValue = periodPlannedValueTotals.reduce((sum, val) => sum + val, 0)
    return { 
      totalContractValue, 
      totalEarnedValue, 
      periodEarnedValueTotals, 
      periodPlannedValueTotals,
      grandTotalEarnedValue,
      grandTotalPlannedValue
    }
  }, [filteredProjects, kpis, periods, periodValuesCache])

  // Export to Excel function with advanced formatting
  const handleExportPeriodRevenue = useCallback(async () => {
    if (projectsWithWorkInRange.length === 0) {
      alert('No data to export')
      return
    }

    try {
      // Dynamically import xlsx-js-style for advanced formatting
      const XLSX = await import('xlsx-js-style')
      
      // Prepare data for Excel export
      const exportData: any[] = []

      // Add header row
      const headerRow: any = {
        'Project Full Name': 'Project Full Name',
        'Divisions': 'Divisions',
        'Workmanship?': 'Workmanship?',
        'Total Contract Amount': 'Total Contract Amount',
        'Division Contract Amount': 'Division Contract Amount'
      }
      
      // Add period columns
      const periodHeaders: string[] = []
      periods.forEach((period, index) => {
        const periodLabel = period.label || `${periodType.charAt(0).toUpperCase() + periodType.slice(1)} ${index + 1} (${period.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${period.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})`
        periodHeaders.push(periodLabel)
        headerRow[periodLabel] = period.label || `${periodType.charAt(0).toUpperCase() + periodType.slice(1)} ${index + 1}`
      })
      
      headerRow['Grand Total'] = 'Grand Total'
      exportData.push(headerRow)

      // Add data rows
      projectsWithWorkInRange.forEach((analytics: any) => {
        const project = analytics.project
        
        // Calculate Total Contract Amount
        const contractAmt = analytics.totalContractValue || 
                          parseFloat(String(project.contract_amount || '0').replace(/,/g, '')) || 0
        const variationsAmt = parseFloat(String(
          (project as any).raw?.['Variations Amount'] || 
          (project as any).raw?.['Variations'] || 
          '0'
        ).replace(/,/g, '')) || 0
        const totalContractAmount = contractAmt + variationsAmt
        
        // Get Division Contract Amount data
        const divisionsData = divisionsDataMap.get(project.id)
        const divisionAmounts = divisionsData?.divisionAmounts || {}
        const divisionNames = divisionsData?.divisionNames || {}
        
        // Build divisions list
        const divisionsList = Object.keys(divisionAmounts)
          .map(key => ({
            key: key.toLowerCase().trim(),
            name: divisionNames[key] || key,
            amount: divisionAmounts[key] || 0
          }))
          .sort((a, b) => b.amount - a.amount)
        
        const divisionContractAmount = divisionsList.reduce((sum, div) => sum + div.amount, 0)
        const divisionsText = divisionsList.length > 0 
          ? divisionsList.map(d => `${d.name}: ${formatCurrency(d.amount, project.currency)}`).join('; ')
          : (project.responsible_division || 'N/A')
        
        // Get Workmanship
        const workmanship = project.workmanship_only || 
                          (project as any).raw?.['Workmanship only?'] || 
                          (project as any).raw?.['Workmanship?'] || 
                          'No'
        const isWorkmanship = workmanship === 'Yes' || workmanship === 'TRUE' || workmanship === true
        
        // ✅ PERFORMANCE: Get period values from cache
        const cachedValues = periodValuesCache.get(project.id)
        const periodValues = cachedValues?.earned || []
        const grandTotal = periodValues.reduce((sum: number, val: number) => sum + val, 0)
        
        const projectFullCode = project.project_full_code || `${project.project_code}${project.project_sub_code ? `-${project.project_sub_code}` : ''}`
        const projectDisplayName = `${projectFullCode} - ${project.project_name}`
        
        // Create row object
        const row: any = {
          'Project Full Name': projectDisplayName,
          'Divisions': divisionsText,
          'Workmanship?': isWorkmanship ? 'Yes' : 'No',
          'Total Contract Amount': totalContractAmount,
          'Division Contract Amount': divisionContractAmount
        }
        
        // Add period values
        periodHeaders.forEach((periodLabel, index) => {
          row[periodLabel] = periodValues[index] || 0
        })
        
        row['Grand Total'] = grandTotal
        exportData.push(row)
      })

      // Add totals row (will be replaced with formulas later)
      const totalsRow: any = {
        'Project Full Name': 'TOTAL',
        'Divisions': '',
        'Workmanship?': '',
        'Total Contract Amount': 0, // Will be replaced with formula
        'Division Contract Amount': 0 // Will be replaced with formula
      }
      
      periodHeaders.forEach((periodLabel, index) => {
        totalsRow[periodLabel] = 0 // Will be replaced with formula
      })
      
      totalsRow['Grand Total'] = 0 // Will be replaced with formula
      exportData.push(totalsRow)

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(exportData)
      
      // Calculate row numbers (1-based, row 0 is header, last row is totals)
      const dataStartRow = 2 // Row 2 (after header row 1)
      const dataEndRow = dataStartRow + projectsWithWorkInRange.length - 1
      const totalsRowNum = dataEndRow + 1
      
      // Get column letters (A, B, ..., Z, AA, AB, ...)
      const getColumnLetter = (colIndex: number): string => {
        let result = ''
        let num = colIndex
        while (num >= 0) {
          result = String.fromCharCode(65 + (num % 26)) + result
          num = Math.floor(num / 26) - 1
        }
        return result
      }
      
      // Alternative: Use XLSX utility if available
      const getColLetter = (colIndex: number): string => {
        try {
          return XLSX.utils.encode_col(colIndex)
        } catch {
          return getColumnLetter(colIndex)
        }
      }
      
      // Add formulas to totals row
      // Column 3: Total Contract Amount (D column)
      const totalContractCol = getColLetter(3)
      const totalContractCell = `${totalContractCol}${totalsRowNum}`
      if (ws[totalContractCell]) {
        ws[totalContractCell] = {
          ...ws[totalContractCell],
          f: `SUM(${totalContractCol}${dataStartRow}:${totalContractCol}${dataEndRow})`,
          t: 'n'
        }
      }
      
      // Column 4: Division Contract Amount (E column)
      const divisionContractCol = getColLetter(4)
      const divisionContractCell = `${divisionContractCol}${totalsRowNum}`
      if (ws[divisionContractCell]) {
        ws[divisionContractCell] = {
          ...ws[divisionContractCell],
          f: `SUM(${divisionContractCol}${dataStartRow}:${divisionContractCol}${dataEndRow})`,
          t: 'n'
        }
      }
      
      // Period columns (starting from column 5, F column)
      periodHeaders.forEach((_, periodIndex) => {
        const periodCol = getColLetter(5 + periodIndex)
        const periodCell = `${periodCol}${totalsRowNum}`
        if (ws[periodCell]) {
          ws[periodCell] = {
            ...ws[periodCell],
            f: `SUM(${periodCol}${dataStartRow}:${periodCol}${dataEndRow})`,
            t: 'n'
          }
        }
      })
      
      // Grand Total column (last column)
      const grandTotalCol = getColLetter(5 + periodHeaders.length)
      const grandTotalCell = `${grandTotalCol}${totalsRowNum}`
      if (ws[grandTotalCell]) {
        ws[grandTotalCell] = {
          ...ws[grandTotalCell],
          f: `SUM(${grandTotalCol}${dataStartRow}:${grandTotalCol}${dataEndRow})`,
          t: 'n'
        }
      }
      
      // Also add formulas for Grand Total in each data row
      projectsWithWorkInRange.forEach((_, projectIndex) => {
        const rowNum = dataStartRow + projectIndex
        const grandTotalCellAddr = `${grandTotalCol}${rowNum}`
        
        if (ws[grandTotalCellAddr]) {
          // Build SUM formula for all period columns in this row
          const firstPeriodCol = getColLetter(5)
          const lastPeriodCol = getColLetter(5 + periodHeaders.length - 1)
          
          ws[grandTotalCellAddr] = {
            ...ws[grandTotalCellAddr],
            f: `SUM(${firstPeriodCol}${rowNum}:${lastPeriodCol}${rowNum})`,
            t: 'n'
          }
        }
      })
      
      // Define column widths
      const colWidths = [
        { wch: 35 }, // Project Full Name
        { wch: 30 }, // Divisions
        { wch: 12 }, // Workmanship?
        { wch: 20 }, // Total Contract Amount
        { wch: 25 }, // Division Contract Amount
        ...weeks.map(() => ({ wch: 18 })), // Week columns
        { wch: 18 }  // Grand Total
      ]
      ws['!cols'] = colWidths
      
      // Freeze first row
      ws['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft', state: 'frozen' }
      
      // Define styles
      const headerStyle = {
        font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
        fill: { fgColor: { rgb: '4472C4' } }, // Blue background
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        }
      }
      
      const numberStyle = {
        numFmt: '#,##0.00',
        alignment: { horizontal: 'right', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: 'CCCCCC' } },
          bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
          left: { style: 'thin', color: { rgb: 'CCCCCC' } },
          right: { style: 'thin', color: { rgb: 'CCCCCC' } }
        }
      }
      
      const textStyle = {
        alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
        border: {
          top: { style: 'thin', color: { rgb: 'CCCCCC' } },
          bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
          left: { style: 'thin', color: { rgb: 'CCCCCC' } },
          right: { style: 'thin', color: { rgb: 'CCCCCC' } }
        }
      }
      
      const totalsStyle = {
        font: { bold: true, sz: 11 },
        fill: { fgColor: { rgb: 'D9E1F2' } }, // Light blue background
        alignment: { horizontal: 'right', vertical: 'center' },
        numFmt: '#,##0.00',
        border: {
          top: { style: 'medium', color: { rgb: '000000' } },
          bottom: { style: 'medium', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: 'CCCCCC' } },
          right: { style: 'thin', color: { rgb: 'CCCCCC' } }
        }
      }
      
      const totalsTextStyle = {
        font: { bold: true, sz: 11 },
        fill: { fgColor: { rgb: 'D9E1F2' } },
        alignment: { horizontal: 'left', vertical: 'center' },
        border: {
          top: { style: 'medium', color: { rgb: '000000' } },
          bottom: { style: 'medium', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: 'CCCCCC' } },
          right: { style: 'thin', color: { rgb: 'CCCCCC' } }
        }
      }
      
      // Apply styles to cells
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
      
      // Style header row (row 0)
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
        if (!ws[cellAddress]) continue
        ws[cellAddress].s = headerStyle
      }
      
      // Style data rows
      for (let row = 1; row <= range.e.r; row++) {
        const isTotalsRow = row === range.e.r
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
          if (!ws[cellAddress]) continue
          
          const colIndex = col
          // Columns: 0=Project, 1=Divisions, 2=Workmanship, 3=Total Contract, 4=Division Contract, 5+ = Weeks, last = Grand Total
          const isNumberColumn = colIndex === 3 || colIndex === 4 || (colIndex >= 5 && colIndex < 5 + weeks.length) || colIndex === 5 + weeks.length
          
          if (isTotalsRow) {
            if (colIndex === 0) {
              ws[cellAddress].s = totalsTextStyle
            } else if (isNumberColumn) {
              ws[cellAddress].s = totalsStyle
            } else {
              ws[cellAddress].s = totalsTextStyle
            }
          } else {
            // Alternate row colors
            const evenRowStyle = row % 2 === 0 
              ? { ...textStyle, fill: { fgColor: { rgb: 'F2F2F2' } } }
              : textStyle
            
            if (isNumberColumn) {
              ws[cellAddress].s = row % 2 === 0 
                ? { ...numberStyle, fill: { fgColor: { rgb: 'F2F2F2' } } }
                : numberStyle
            } else {
              ws[cellAddress].s = evenRowStyle
            }
          }
        }
      }
      
      // Create workbook
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Weekly Work Revenue')
      
      // Generate filename with date range
      const dateStr = dateRange.start && dateRange.end
        ? `${dateRange.start}_to_${dateRange.end}`
        : new Date().toISOString().split('T')[0]
      
      // Write file
      XLSX.writeFile(wb, `Weekly_Work_Revenue_${dateStr}.xlsx`)
      
      console.log(`✅ Downloaded formatted Excel: Weekly_Work_Revenue_${dateStr}.xlsx`)
    } catch (error) {
      console.error('Error exporting to Excel:', error)
      alert('Failed to export data. Please try again.')
    }
  }, [projectsWithWorkInRange, periods, totals, divisionsDataMap, dateRange, formatCurrency, kpis, calculatePeriodEarnedValue, calculatePeriodPlannedValue, viewPlannedValue, periodType])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">MONTHLY WORK REVENUE (Excl VAT)</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">ما تم تنفيذه حتى الآن - Weekly Earned Value Report</p>
                    </div>
        <div className="flex items-center gap-4 flex-wrap">
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
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="viewPlannedValue"
              checked={viewPlannedValue}
              onChange={(e) => setViewPlannedValue(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="viewPlannedValue" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
              View Planned Value
            </label>
          </div>
          <select
            value={periodType}
            onChange={(e) => setPeriodType(e.target.value as PeriodType)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
          </select>
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value as 'line' | 'bar' | 'area' | 'composed')}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            title="Chart Type"
          >
            <option value="line">Line Chart</option>
            <option value="bar">Bar Chart</option>
            <option value="area">Area Chart</option>
            <option value="composed">Composed Chart</option>
          </select>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="hideZeroProjects"
              checked={hideZeroProjects}
              onChange={(e) => setHideZeroProjects(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="hideZeroProjects" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
              Hide projects with 0 AED Grand Total
            </label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="hideDivisionsColumn"
              checked={hideDivisionsColumn}
              onChange={(e) => setHideDivisionsColumn(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="hideDivisionsColumn" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
              Hide Divisions Column
            </label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="hideTotalContractColumn"
              checked={hideTotalContractColumn}
              onChange={(e) => setHideTotalContractColumn(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="hideTotalContractColumn" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
              Hide Total Contract Amount Column
            </label>
          </div>
        </div>
      </div>

      {/* Period Revenue Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                {periodType.charAt(0).toUpperCase() + periodType.slice(1)} Revenue Trend
              </CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {viewPlannedValue ? `Earned vs Planned Value per ${periodType.charAt(0).toUpperCase() + periodType.slice(1)}` : `Earned Value per ${periodType.charAt(0).toUpperCase() + periodType.slice(1)}`}
              </p>
            </div>
            <div className="relative" ref={chartExportMenuRef}>
              <Button
                onClick={() => setShowChartExportMenu(!showChartExportMenu)}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export Chart
                <ChevronDown className="h-4 w-4" />
              </Button>
              {showChartExportMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                  <div className="py-1">
                    <button
                      onClick={() => handleExportChart('png')}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      PNG Image
                    </button>
                    <button
                      onClick={() => handleExportChart('jpeg')}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      JPEG Image
                    </button>
                    <button
                      onClick={() => handleExportChart('svg')}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      SVG Image
                    </button>
                    <button
                      onClick={() => handleExportChart('pdf')}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      PDF Document
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div ref={chartRef} className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {(() => {
                // ✅ Generate chart data once
                const chartData = periods.map((period, index) => {
                  let periodShort = period.label
                  if (periodType === 'daily') {
                    periodShort = `D${index + 1}`
                  } else if (periodType === 'weekly') {
                    periodShort = `W${index + 1}`
                  } else if (periodType === 'monthly') {
                    periodShort = period.start.toLocaleDateString('en-US', { month: 'short' })
                  } else if (periodType === 'quarterly') {
                    periodShort = period.label
                  } else if (periodType === 'yearly') {
                    periodShort = period.start.getFullYear().toString()
                  }
                  
                  return {
                    period: period.label,
                    periodShort: periodShort,
                    earned: totals.periodEarnedValueTotals[index] || 0,
                    planned: viewPlannedValue ? (totals.periodPlannedValueTotals[index] || 0) : undefined
                  }
                })

                // ✅ Common chart props
                const commonProps = {
                  data: chartData,
                  margin: { top: 5, right: 30, left: 20, bottom: 5 }
                }

                // ✅ Common axis and tooltip components
                const commonAxis = (
                  <>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-300 dark:stroke-gray-700" />
                    <XAxis 
                      dataKey="periodShort" 
                      className="text-xs"
                      tick={{ fill: 'currentColor' }}
                      angle={periodType === 'daily' ? -45 : 0}
                      textAnchor={periodType === 'daily' ? 'end' : 'middle'}
                      height={periodType === 'daily' ? 80 : 30}
                    />
                    <YAxis 
                      className="text-xs"
                      tick={{ fill: 'currentColor' }}
                      tickFormatter={(value) => {
                        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
                        if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
                        return value.toString()
                      }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '12px'
                      }}
                      formatter={(value: number, name: string) => {
                        const currency = projectsWithWorkInRange.length > 0 
                          ? (projectsWithWorkInRange[0]?.project?.currency || 'AED')
                          : 'AED'
                        return [formatCurrency(value, currency), name === 'earned' ? 'Earned Value' : 'Planned Value']
                      }}
                      labelFormatter={(label) => {
                        if (periodType === 'daily') return `Day: ${label}`
                        if (periodType === 'weekly') return `Week: ${label}`
                        if (periodType === 'monthly') return `Month: ${label}`
                        if (periodType === 'quarterly') return `Quarter: ${label}`
                        if (periodType === 'yearly') return `Year: ${label}`
                        return label
                      }}
                    />
                    <Legend 
                      formatter={(value) => value === 'earned' ? 'Earned Value' : 'Planned Value'}
                    />
                  </>
                )

                // ✅ Render chart based on type
                if (chartType === 'line') {
                  return (
                    <LineChart {...commonProps}>
                      {commonAxis}
                      <Line 
                        type="monotone" 
                        dataKey="earned" 
                        stroke="#10b981" 
                        strokeWidth={3}
                        dot={{ fill: '#10b981', r: 5 }}
                        activeDot={{ r: 7 }}
                        name="earned"
                      />
                      {viewPlannedValue && (
                        <Line 
                          type="monotone" 
                          dataKey="planned" 
                          stroke="#3b82f6" 
                          strokeWidth={3}
                          strokeDasharray="5 5"
                          dot={{ fill: '#3b82f6', r: 5 }}
                          activeDot={{ r: 7 }}
                          name="planned"
                        />
                      )}
                    </LineChart>
                  )
                }

                if (chartType === 'bar') {
                  return (
                    <BarChart {...commonProps}>
                      {commonAxis}
                      <Bar 
                        dataKey="earned" 
                        fill="#10b981" 
                        name="earned"
                        radius={[4, 4, 0, 0]}
                      />
                      {viewPlannedValue && (
                        <Bar 
                          dataKey="planned" 
                          fill="#3b82f6" 
                          name="planned"
                          radius={[4, 4, 0, 0]}
                        />
                      )}
                    </BarChart>
                  )
                }

                if (chartType === 'area') {
                  return (
                    <AreaChart {...commonProps}>
                      {commonAxis}
                      <Area 
                        type="monotone" 
                        dataKey="earned" 
                        stroke="#10b981" 
                        fill="#10b981"
                        fillOpacity={0.6}
                        strokeWidth={3}
                        name="earned"
                      />
                      {viewPlannedValue && (
                        <Area 
                          type="monotone" 
                          dataKey="planned" 
                          stroke="#3b82f6" 
                          fill="#3b82f6"
                          fillOpacity={0.4}
                          strokeWidth={3}
                          strokeDasharray="5 5"
                          name="planned"
                        />
                      )}
                    </AreaChart>
                  )
                }

                if (chartType === 'composed') {
                  return (
                    <ComposedChart {...commonProps}>
                      {commonAxis}
                      <Bar 
                        dataKey="earned" 
                        fill="#10b981" 
                        name="earned"
                        radius={[4, 4, 0, 0]}
                      />
                      {viewPlannedValue && (
                        <Line 
                          type="monotone" 
                          dataKey="planned" 
                          stroke="#3b82f6" 
                          strokeWidth={3}
                          strokeDasharray="5 5"
                          dot={{ fill: '#3b82f6', r: 5 }}
                          activeDot={{ r: 7 }}
                          name="planned"
                        />
                      )}
                    </ComposedChart>
                  )
                }

                // Default to LineChart if unknown type
                return (
                  <LineChart {...commonProps}>
                    {commonAxis}
                    <Line 
                      type="monotone" 
                      dataKey="earned" 
                      stroke="#10b981" 
                      strokeWidth={3}
                      dot={{ fill: '#10b981', r: 5 }}
                      activeDot={{ r: 7 }}
                      name="earned"
                    />
                    {viewPlannedValue && (
                      <Line 
                        type="monotone" 
                        dataKey="planned" 
                        stroke="#3b82f6" 
                        strokeWidth={3}
                        strokeDasharray="5 5"
                        dot={{ fill: '#3b82f6', r: 5 }}
                        activeDot={{ r: 7 }}
                        name="planned"
                      />
                    )}
                  </LineChart>
                )
              })()}
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Contract Value</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(totals.totalContractValue)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{filteredProjects.length} projects</p>
              </div>
              <DollarSign className="h-12 w-12 text-blue-500 dark:text-blue-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
                    <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">Total Earned Value</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(totals.totalEarnedValue)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {totals.totalContractValue > 0 ? ((totals.totalEarnedValue / totals.totalContractValue) * 100).toFixed(1) : 0}% completed
                </p>
                    </div>
              <CheckCircle className="h-12 w-12 text-green-500 dark:text-green-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            Weekly Work Revenue by Project
          </CardTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Revenue earned per week based on KPI Actual values</p>
            </div>
            <Button
              onClick={handleExportPeriodRevenue}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export to Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
      <div className="overflow-x-auto overflow-y-auto print-table-container" style={{ maxHeight: '70vh' }}>
            <table className="border-collapse text-sm print-table" style={{ tableLayout: 'fixed', minWidth: '100%', width: `${200 + (hideDivisionsColumn ? 0 : 180) + 120 + (hideTotalContractColumn ? 0 : 180) + 220 + (periods.length * 140) + 150}px` }}>
              <thead className="sticky top-0 z-20">
                <tr className="bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600">
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left font-semibold sticky left-0 z-30 bg-gray-100 dark:bg-gray-800" style={{ width: '200px' }}>Project Full Name</th>
                  {!hideDivisionsColumn && (
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left font-semibold" style={{ width: '180px' }}>Divisions</th>
                  )}
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center font-semibold" style={{ width: '120px' }}>Workmanship?</th>
                  {!hideTotalContractColumn && (
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold" style={{ width: '180px' }}>Total Contract Amount</th>
                  )}
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold" style={{ width: '220px' }}>Division Contract Amount</th>
                  {periods.map((period, index) => (
                    <th key={index} className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold" style={{ width: '140px' }}>
                      <div>{period.label}</div>
                      <div className="text-xs font-normal text-gray-500 dark:text-gray-400">
                        {period.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {period.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </th>
                  ))}
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold" style={{ width: '150px' }}>Grand Total</th>
            </tr>
          </thead>
              <tbody>
                {projectsWithWorkInRange.length === 0 ? (
                  <tr>
                    <td colSpan={3 + (hideDivisionsColumn ? 0 : 1) + (hideTotalContractColumn ? 0 : 1) + periods.length + 1} className="border border-gray-300 dark:border-gray-600 px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <AlertTriangle className="h-8 w-8 text-gray-400" />
                        <p>No projects with work in the selected date range</p>
                        <p className="text-xs">Please select a different date range or check if there are KPIs Actual for this period</p>
                  </div>
                </td>
                  </tr>
                ) : (
                  projectsWithWorkInRange.map((analytics: any) => {
                    const project = analytics.project
                    
                    // Calculate Total Contract Amount (Contract Amount + Variations)
                    const contractAmt = analytics.totalContractValue || 
                                      parseFloat(String(project.contract_amount || '0').replace(/,/g, '')) || 0
                    const variationsAmt = parseFloat(String(
                      (project as any).raw?.['Variations Amount'] || 
                      (project as any).raw?.['Variations'] || 
                      '0'
                    ).replace(/,/g, '')) || 0
                    const totalContractAmount = contractAmt + variationsAmt
                    
                    // Get Division Contract Amount data (same format as ProjectsTableWithCustomization)
                    const divisionsData = divisionsDataMap.get(project.id)
                    const divisionAmounts = divisionsData?.divisionAmounts || {}
                    const divisionNames = divisionsData?.divisionNames || {}
                    
                    // Build divisions list sorted by amount (descending)
                    const divisionsList = Object.keys(divisionAmounts)
                      .map(key => ({
                        key: key.toLowerCase().trim(),
                        name: divisionNames[key] || key,
                        amount: divisionAmounts[key] || 0
                      }))
                      .sort((a, b) => b.amount - a.amount)
                    
                    // Calculate total
                    const divisionContractAmount = divisionsList.reduce((sum, div) => sum + div.amount, 0)
                    
                    // Get Workmanship
                    const workmanship = project.workmanship_only || 
                                      (project as any).raw?.['Workmanship only?'] || 
                                      (project as any).raw?.['Workmanship?'] || 
                                      'No'
                    const isWorkmanship = workmanship === 'Yes' || workmanship === 'TRUE' || workmanship === true
                    
                    // ✅ PERFORMANCE: Get period values from cache
                    const cachedValues = periodValuesCache.get(project.id)
                    const periodValues = cachedValues?.earned || []
                    const periodPlannedValues = viewPlannedValue ? (cachedValues?.planned || []) : []
                    const grandTotal = periodValues.reduce((sum: number, val: number) => sum + val, 0)
                    const grandTotalPlanned = viewPlannedValue ? periodPlannedValues.reduce((sum: number, val: number) => sum + val, 0) : 0
                    return (
                      <tr key={project.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 sticky left-0 z-10 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800" style={{ width: '200px', overflow: 'hidden' }}>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-white truncate">
                              {project.project_full_code || `${project.project_code}${project.project_sub_code ? `-${project.project_sub_code}` : ''}`}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{project.project_name}</p>
                  </div>
                </td>
                        {!hideDivisionsColumn && (
                          <td className="border border-gray-300 dark:border-gray-600 px-4 py-3" style={{ width: '180px', overflow: 'hidden' }}>
                            {divisionsList.length === 0 ? (
                              <span className="text-sm text-gray-400 dark:text-gray-500 truncate block">{project.responsible_division || 'N/A'}</span>
                            ) : (
                              <div className="space-y-1 min-w-0">
                                {divisionsList.map((division, index) => (
                                  <div 
                                    key={`${project.id}-div-${division.key}-${index}`} 
                                    className="text-xs text-gray-700 dark:text-gray-300 truncate"
                                  >
                                    {division.name}
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        )}
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center" style={{ width: '120px' }}>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            isWorkmanship 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {isWorkmanship ? 'Yes' : 'No'}
                          </span>
                        </td>
                        {!hideTotalContractColumn && (
                          <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right" style={{ width: '180px' }}>
                            <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(totalContractAmount, project.currency)}</span>
                          </td>
                        )}
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-3" style={{ width: '220px', overflow: 'hidden' }}>
                          {divisionsList.length === 0 ? (
                            <span className="text-xs text-gray-400 dark:text-gray-500 italic">No data available</span>
                          ) : (
                            <div className="space-y-1.5">
                              {/* Show all divisions with their amounts */}
                              {divisionsList.map((division, index) => (
                                <div 
                                  key={`${project.id}-${division.key}-${index}`} 
                                  className="flex items-center justify-between text-xs py-0.5"
                                >
                                  <span className="text-gray-600 dark:text-gray-400 truncate flex-1 min-w-0 mr-2">
                                    {division.name}:
                                  </span>
                                  <span className="font-medium text-gray-900 dark:text-white whitespace-nowrap">
                                    {formatCurrency(division.amount, project.currency)}
                                  </span>
                                </div>
                              ))}
                              {/* Show total */}
                              {divisionsList.length > 1 && (
                                <div className="flex items-center justify-between text-xs font-semibold pt-1 border-t border-gray-200 dark:border-gray-700 mt-1">
                                  <span className="text-gray-900 dark:text-white">Total:</span>
                                  <span className="text-gray-900 dark:text-white">
                                    {formatCurrency(divisionContractAmount, project.currency)}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                </td>
                        {periodValues.map((value: number, index: number) => {
                          const plannedValue = viewPlannedValue ? (periodPlannedValues[index] || 0) : 0
                          return (
                            <td key={index} className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right" style={{ width: viewPlannedValue ? '200px' : '140px' }}>
                              {viewPlannedValue ? (
                                <div className="space-y-1">
                            {value > 0 ? (
                                    <div className="font-medium text-green-600 dark:text-green-400">{formatCurrency(value, project.currency)}</div>
                                  ) : (
                                    <div className="text-gray-400">-</div>
                                  )}
                                  {plannedValue > 0 ? (
                                    <div className="text-xs text-blue-600 dark:text-blue-400">{formatCurrency(plannedValue, project.currency)}</div>
                                  ) : (
                                    <div className="text-xs text-gray-400">-</div>
                                  )}
                                </div>
                              ) : (
                                value > 0 ? (
                              <span className="font-medium text-green-600 dark:text-green-400">{formatCurrency(value, project.currency)}</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                                )
                            )}
                </td>
                          )
                        })}
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right" style={{ width: '150px' }}>
                          {viewPlannedValue ? (
                            <div className="space-y-1">
                              <div className="font-bold text-gray-900 dark:text-white">{formatCurrency(grandTotal, project.currency)}</div>
                              {grandTotalPlanned > 0 && (
                                <div className="text-xs text-blue-600 dark:text-blue-400">{formatCurrency(grandTotalPlanned, project.currency)}</div>
                              )}
                            </div>
                          ) : (
                          <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(grandTotal, project.currency)}</span>
                          )}
                </td>
              </tr>
                    )
                  })
                )}
          </tbody>
              {projectsWithWorkInRange.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-100 dark:bg-gray-800 font-bold border-t-2 border-gray-300 dark:border-gray-600">
                    <td colSpan={3 + (hideDivisionsColumn ? 0 : 1) + (hideTotalContractColumn ? 0 : 1)} className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right">Total:</td>
                    {totals.periodEarnedValueTotals.map((value: number, index: number) => {
                      const plannedValue = viewPlannedValue ? (totals.periodPlannedValueTotals[index] || 0) : 0
                      return (
                        <td key={index} className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right" style={{ width: viewPlannedValue ? '200px' : '140px' }}>
                          {viewPlannedValue ? (
                            <div className="space-y-1">
                              <div className="text-green-600 dark:text-green-400 font-bold">{formatCurrency(value)}</div>
                              {plannedValue > 0 && (
                                <div className="text-xs text-blue-600 dark:text-blue-400">{formatCurrency(plannedValue)}</div>
                              )}
                            </div>
                          ) : (
                        <span className="text-green-600 dark:text-green-400">{formatCurrency(value)}</span>
                          )}
                      </td>
                      )
                    })}
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right" style={{ width: '150px' }}>
                      {viewPlannedValue ? (
                        <div className="space-y-1">
                          <div className="text-gray-900 dark:text-white font-bold">{formatCurrency(totals.grandTotalEarnedValue)}</div>
                          {totals.grandTotalPlannedValue > 0 && (
                            <div className="text-xs text-blue-600 dark:text-blue-400">{formatCurrency(totals.grandTotalPlannedValue)}</div>
                          )}
                        </div>
                      ) : (
                      <span className="text-gray-900 dark:text-white">{formatCurrency(totals.grandTotalEarnedValue)}</span>
                      )}
                    </td>
                  </tr>
                </tfoot>
              )}
        </table>
      </div>
        </CardContent>
      </Card>
    </div>
  )
}
