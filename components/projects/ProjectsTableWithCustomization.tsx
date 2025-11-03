'use client'

import { useState, useEffect } from 'react'
import { Project } from '@/lib/supabase'
import { ColumnCustomizer, ColumnConfig } from '@/components/ui/ColumnCustomizer'
import { useColumnCustomization } from '@/lib/useColumnCustomization'
import { Button } from '@/components/ui/Button'
import { CheckCircle, Clock, AlertCircle, Calendar, Building, Activity, TrendingUp, Target, Info, Filter, X, RotateCcw } from 'lucide-react'

interface ProjectsTableWithCustomizationProps {
  projects: Project[]
  onEdit: (project: Project) => void
  onDelete: (id: string) => void
  onBulkDelete?: (ids: string[]) => void
  allKPIs?: any[]
  allActivities?: any[]
}

// Default column configuration for Projects
const defaultProjectsColumns: ColumnConfig[] = [
  { id: 'select', label: 'Select', visible: true, order: 0, fixed: true },
  { id: 'project_info_merged', label: 'Project Info', visible: true, order: 1 },
  { id: 'responsible_divisions', label: 'Responsible Divisions', visible: true, order: 2 },
  { id: 'scope_of_works', label: 'Scope of Works', visible: true, order: 3 },
  { id: 'kpi_added', label: 'KPI Added?', visible: true, order: 4 },
  { id: 'project_status', label: 'Project Status', visible: true, order: 5 },
  { id: 'contract_durations', label: 'Contract Durations', visible: true, order: 6 },
  { id: 'planned_dates', label: 'Planned Dates', visible: true, order: 7 },
  { id: 'actual_dates', label: 'Actual Dates', visible: true, order: 8 },
  { id: 'progress_summary', label: 'Progress Summary', visible: true, order: 9 },
  { id: 'work_value_status', label: 'Work Value Status', visible: true, order: 10 },
  { id: 'contract_amount', label: 'Contract Amount', visible: true, order: 11 },
  { id: 'divisions_contract_amount', label: 'Divisions Contract Amount', visible: true, order: 12 },
  { id: 'temporary_material', label: 'Temporary Material', visible: true, order: 13 },
  { id: 'project_location', label: 'Project Location', visible: true, order: 14 },
  { id: 'project_parties', label: 'Project Parties', visible: true, order: 15 },
  { id: 'project_staff', label: 'Project Staff', visible: true, order: 16 },
  { id: 'project_award_date', label: 'Project Award Date', visible: true, order: 17 },
  { id: 'workmanship', label: 'Workmanship', visible: true, order: 18 },
  { id: 'actions', label: 'Actions', visible: true, order: 19, fixed: true }
]

export function ProjectsTableWithCustomization({ 
  projects, 
  onEdit, 
  onDelete, 
  onBulkDelete,
  allKPIs = [],
  allActivities = []
}: ProjectsTableWithCustomizationProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showCustomizer, setShowCustomizer] = useState(false)
  
  const { 
    columns, 
    saveConfiguration, 
    resetToDefault 
  } = useColumnCustomization({ 
    defaultColumns: defaultProjectsColumns, 
    storageKey: 'projects' 
  })

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id])
    } else {
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(projects.map(project => project.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleBulkDelete = () => {
    if (onBulkDelete && selectedIds.length > 0) {
      onBulkDelete(selectedIds)
      setSelectedIds([])
    }
  }

  // Enhanced Analysis Functions with Advanced Calculations
  const getProjectStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'green'
      case 'on-going': return 'blue'
      case 'on-hold': return 'yellow'
      case 'cancelled': return 'red'
      case 'upcoming': return 'gray'
      default: return 'gray'
    }
  }

  const getProjectStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'on-going': return <Activity className="h-4 w-4 text-blue-500" />
      case 'on-hold': return <Clock className="h-4 w-4 text-yellow-500" />
      case 'cancelled': return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'upcoming': return <Calendar className="h-4 w-4 text-gray-500" />
      default: return <Building className="h-4 w-4 text-gray-500" />
    }
  }

  // Calculate Advanced Performance Score with Multiple Factors
  const calculateAdvancedPerformanceScore = (project: Project) => {
    let score = 0
    let factors = 0
    
    // Status Factor (30%)
    switch (project.project_status) {
      case 'completed': score += 30; break
      case 'on-going': score += 25; break
      case 'on-hold': score += 15; break
      case 'cancelled': score += 5; break
      case 'upcoming': score += 20; break
      default: score += 10; break
    }
    factors += 30
    
    // Financial Factor (25%)
    if (project.contract_amount && project.contract_amount > 0) {
      if (project.contract_amount >= 10000000) score += 25 // Large project
      else if (project.contract_amount >= 1000000) score += 20 // Medium project
      else if (project.contract_amount >= 100000) score += 15 // Small project
      else score += 10 // Very small project
      factors += 25
    }
    
    // Timeline Factor (25%)
    if (project.date_project_awarded) {
      const awardDate = new Date(project.date_project_awarded)
      const today = new Date()
      const daysSinceAward = Math.ceil((today.getTime() - awardDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysSinceAward <= 30) score += 25 // Recent award
      else if (daysSinceAward <= 90) score += 20 // Within 3 months
      else if (daysSinceAward <= 365) score += 15 // Within 1 year
      else if (daysSinceAward <= 730) score += 10 // Within 2 years
      else score += 5 // Very old project
      factors += 25
    }
    
    // Quality Factor (20%)
    if (project.kpi_completed) {
      score += 20 // KPI completed
    } else {
      score += 10 // KPI not completed
    }
    factors += 20
    
    return factors > 0 ? Math.min(100, Math.max(0, (score / factors) * 100)) : 0
  }

  // Calculate Efficiency with Advanced Metrics
  const calculateAdvancedEfficiency = (project: Project) => {
    let efficiency = 0
    let metrics = 0
    
    // Status Efficiency (40%)
    switch (project.project_status) {
      case 'completed': efficiency += 40; break
      case 'on-going': efficiency += 35; break
      case 'on-hold': efficiency += 20; break
      case 'cancelled': efficiency += 5; break
      case 'upcoming': efficiency += 30; break
      default: efficiency += 15; break
    }
    metrics += 40
    
    // Financial Efficiency (35%)
    if (project.contract_amount && project.contract_amount > 0) {
      if (project.contract_amount >= 10000000) efficiency += 35 // Large project
      else if (project.contract_amount >= 1000000) efficiency += 30 // Medium project
      else if (project.contract_amount >= 100000) efficiency += 25 // Small project
      else efficiency += 20 // Very small project
      metrics += 35
    }
    
    // Timeline Efficiency (25%)
    if (project.date_project_awarded) {
      const awardDate = new Date(project.date_project_awarded)
      const today = new Date()
      const daysSinceAward = Math.ceil((today.getTime() - awardDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysSinceAward <= 30) efficiency += 25 // Recent award
      else if (daysSinceAward <= 90) efficiency += 20 // Within 3 months
      else if (daysSinceAward <= 365) efficiency += 15 // Within 1 year
      else if (daysSinceAward <= 730) efficiency += 10 // Within 2 years
      else efficiency += 5 // Very old project
      metrics += 25
    }
    
    return metrics > 0 ? Math.min(100, Math.max(0, (efficiency / metrics) * 100)) : 0
  }

  // Calculate Risk Level with Advanced Assessment
  const calculateAdvancedRiskLevel = (project: Project) => {
    let riskScore = 0
    let riskFactors = 0
    
    // Status Risk (30%)
    switch (project.project_status) {
      case 'cancelled': riskScore += 30; break
      case 'on-hold': riskScore += 25; break
      case 'on-going': riskScore += 10; break
      case 'completed': riskScore += 5; break
      case 'upcoming': riskScore += 15; break
      default: riskScore += 20; break
    }
    riskFactors += 30
    
    // Financial Risk (25%)
    if (project.contract_amount && project.contract_amount > 0) {
      if (project.contract_amount >= 10000000) riskScore += 25 // Large project risk
      else if (project.contract_amount >= 1000000) riskScore += 20 // Medium project risk
      else if (project.contract_amount >= 100000) riskScore += 15 // Small project risk
      else riskScore += 10 // Very small project risk
      riskFactors += 25
    }
    
    // Timeline Risk (25%)
    if (project.date_project_awarded) {
      const awardDate = new Date(project.date_project_awarded)
      const today = new Date()
      const daysSinceAward = Math.ceil((today.getTime() - awardDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysSinceAward > 730) riskScore += 25 // Very old project
      else if (daysSinceAward > 365) riskScore += 20 // Old project
      else if (daysSinceAward > 90) riskScore += 15 // Medium age project
      else if (daysSinceAward > 30) riskScore += 10 // Recent project
      else riskScore += 5 // Very recent project
      riskFactors += 25
    }
    
    // Quality Risk (20%)
    if (project.kpi_completed) {
      riskScore += 5 // KPI completed
    } else {
      riskScore += 20 // KPI not completed
    }
    riskFactors += 20
    
    const riskPercentage = riskFactors > 0 ? (riskScore / riskFactors) * 100 : 0
    
    if (riskPercentage >= 70) return { level: 'high', score: riskPercentage, color: 'red' }
    if (riskPercentage >= 40) return { level: 'medium', score: riskPercentage, color: 'yellow' }
    if (riskPercentage >= 20) return { level: 'low', score: riskPercentage, color: 'green' }
    return { level: 'minimal', score: riskPercentage, color: 'blue' }
  }

  // Calculate Smart Insights with Advanced Logic
  const getSmartInsights = (project: Project) => {
    const insights = []
    
    // Status Insights
    switch (project.project_status) {
      case 'completed':
        insights.push({ type: 'success', message: 'Project completed successfully', icon: '🎉' })
        break
      case 'on-going':
        insights.push({ type: 'info', message: 'Project in progress', icon: '⚡' })
        break
      case 'on-hold':
        insights.push({ type: 'warning', message: 'Project on hold', icon: '⏸️' })
        break
      case 'cancelled':
        insights.push({ type: 'error', message: 'Project cancelled', icon: '❌' })
        break
      case 'upcoming':
        insights.push({ type: 'info', message: 'Project upcoming', icon: '📅' })
        break
      default:
        insights.push({ type: 'info', message: 'Project status unknown', icon: '❓' })
        break
    }
    
    // Financial Insights
    if (project.contract_amount && project.contract_amount > 0) {
      if (project.contract_amount >= 10000000) {
        insights.push({ type: 'info', message: 'Large project', icon: '💰' })
      } else if (project.contract_amount >= 1000000) {
        insights.push({ type: 'info', message: 'Medium project', icon: '💵' })
      } else if (project.contract_amount >= 100000) {
        insights.push({ type: 'info', message: 'Small project', icon: '💸' })
      } else {
        insights.push({ type: 'info', message: 'Very small project', icon: '💳' })
      }
    }
    
    // Timeline Insights
    if (project.date_project_awarded) {
      const awardDate = new Date(project.date_project_awarded)
      const today = new Date()
      const daysSinceAward = Math.ceil((today.getTime() - awardDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysSinceAward > 730) {
        insights.push({ type: 'warning', message: 'Very old project', icon: '⏰' })
      } else if (daysSinceAward > 365) {
        insights.push({ type: 'info', message: 'Old project', icon: '📅' })
      } else if (daysSinceAward > 90) {
        insights.push({ type: 'info', message: 'Medium age project', icon: '📆' })
      } else if (daysSinceAward > 30) {
        insights.push({ type: 'info', message: 'Recent project', icon: '🆕' })
      } else {
        insights.push({ type: 'info', message: 'Very recent project', icon: '✨' })
      }
    }
    
    // KPI Insights
    if (project.kpi_completed) {
      insights.push({ type: 'success', message: 'KPI completed', icon: '✅' })
    } else {
      insights.push({ type: 'warning', message: 'KPI not completed', icon: '⚠️' })
    }
    
    return insights.length > 0 ? insights : [{ type: 'info', message: 'Insufficient data for analysis', icon: '📊' }]
  }

  // Calculate Smart Recommendations with Advanced Logic
  const getSmartRecommendations = (project: Project) => {
    const recommendations = []
    
    // Status-based Recommendations
    switch (project.project_status) {
      case 'on-hold':
        recommendations.push({ type: 'action', message: 'Resume project activities', icon: '🚀' })
        recommendations.push({ type: 'action', message: 'Review hold reasons', icon: '📋' })
        break
      case 'on-going':
        recommendations.push({ type: 'action', message: 'Monitor progress closely', icon: '👀' })
        recommendations.push({ type: 'action', message: 'Ensure quality standards', icon: '⭐' })
        break
      case 'upcoming':
        recommendations.push({ type: 'action', message: 'Prepare project resources', icon: '🛠️' })
        recommendations.push({ type: 'action', message: 'Finalize project plan', icon: '📝' })
        break
      case 'cancelled':
        recommendations.push({ type: 'action', message: 'Analyze cancellation reasons', icon: '🔍' })
        recommendations.push({ type: 'action', message: 'Learn from experience', icon: '📚' })
        break
    }
    
    // Financial Recommendations
    if (project.contract_amount && project.contract_amount >= 10000000) {
      recommendations.push({ type: 'action', message: 'Implement strict monitoring', icon: '📊' })
      recommendations.push({ type: 'action', message: 'Regular financial reviews', icon: '💰' })
    }
    
    // Timeline Recommendations
    if (project.date_project_awarded) {
      const awardDate = new Date(project.date_project_awarded)
      const today = new Date()
      const daysSinceAward = Math.ceil((today.getTime() - awardDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysSinceAward > 365) {
        recommendations.push({ type: 'action', message: 'Review project timeline', icon: '⏰' })
        recommendations.push({ type: 'action', message: 'Assess project viability', icon: '🔍' })
      }
    }
    
    // KPI Recommendations
    if (!project.kpi_completed) {
      recommendations.push({ type: 'action', message: 'Complete KPI setup', icon: '📈' })
      recommendations.push({ type: 'action', message: 'Implement tracking system', icon: '📊' })
    }
    
    return recommendations.length > 0 ? recommendations : [{ type: 'info', message: 'Everything is going well', icon: '✅' }]
  }

  // Format date helper
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    try {
      return new Date(dateString).toLocaleDateString('en-US')
    } catch {
      return 'Invalid Date'
    }
  }

  // Access raw project data from database row if available
  const getProjectField = (project: Project, fieldName: string): any => {
    const raw = (project as any).raw || project
    return raw[fieldName] || raw[fieldName.replace(/\s+/g, ' ')] || (project as any)[fieldName] || ''
  }

  // Helper function to match project codes more comprehensively
  const matchesProject = (item: any, project: Project): boolean => {
    if (!project.project_code) return false
    
    const projectCode = String(project.project_code || '').trim().toUpperCase()
    const projectSubCode = String(project.project_sub_code || '').trim().toUpperCase()
    const projectFullCode = projectSubCode ? `${projectCode}${projectSubCode}` : projectCode
    
    // Get item project codes (try all possible field names and variations)
    // Check both mapped and raw data
    const rawItem = (item as any).raw || {}
    const itemProjectCode = String(
      item['Project Code'] || 
      item.project_code || 
      item['project_code'] || 
      rawItem['Project Code'] ||
      rawItem.project_code ||
      ''
    ).trim().toUpperCase()
    
    const itemProjectFullCode = String(
      item['Project Full Code'] || 
      item.project_full_code || 
      item['project_full_code'] || 
      rawItem['Project Full Code'] ||
      rawItem.project_full_code ||
      ''
    ).trim().toUpperCase()
    
    const itemProjectSubCode = String(
      item['Project Sub Code'] || 
      item.project_sub_code || 
      item['project_sub_code'] ||
      rawItem['Project Sub Code'] ||
      rawItem.project_sub_code ||
      ''
    ).trim().toUpperCase()
    
    // Combine all possible project code values from item
    const allItemCodes = [
      itemProjectCode,
      itemProjectFullCode,
      itemProjectSubCode ? `${itemProjectCode}${itemProjectSubCode}` : '',
      itemProjectFullCode.split('-')[0],
      itemProjectFullCode.split('_')[0],
      itemProjectFullCode.split(' ')[0],
      itemProjectCode.split('-')[0],
      itemProjectCode.split('_')[0],
      itemProjectCode.split(' ')[0]
    ].filter(code => code && code.length > 0)
    
    // Remove duplicates
    const uniqueItemCodes = Array.from(new Set(allItemCodes))
    
    // Try multiple matching strategies (order by most specific first)
    // 1. Exact match on project_code
    if (uniqueItemCodes.includes(projectCode)) return true
    
    // 2. Exact match on project_full_code
    if (uniqueItemCodes.includes(projectFullCode)) return true
    
    // 3. Item project_code starts with project's project_code (e.g., P5067-01 starts with P5067)
    if (uniqueItemCodes.some(code => {
      return code === projectCode || 
             code.startsWith(projectCode) || 
             code.startsWith(`${projectCode}-`) ||
             code.startsWith(`${projectCode}_`)
    })) return true
    
    // 4. Project's project_code starts with item's project_code
    if (uniqueItemCodes.some(code => {
      return projectCode === code ||
             projectCode.startsWith(code) || 
             projectCode.startsWith(`${code}-`) ||
             projectCode.startsWith(`${code}_`)
    })) return true
    
    // 5. Extract numeric part and match (e.g., P5095 matches any item with 5095)
    const projectNumMatch = projectCode.match(/(\d+)/)
    if (projectNumMatch) {
      const projectNum = projectNumMatch[1]
      if (uniqueItemCodes.some(code => {
        const codeNumMatch = code.match(/(\d+)/)
        return codeNumMatch && codeNumMatch[1] === projectNum
      })) return true
    }
    
    // 6. Match by sub-code combination
    if (itemProjectSubCode && projectSubCode) {
      const combinedItemCode = `${itemProjectCode}${itemProjectSubCode}`
      if (combinedItemCode === projectFullCode || combinedItemCode === projectCode) return true
    }
    
    // 7. Very loose match - if project code is contained anywhere or contains item code
    if (uniqueItemCodes.some(code => {
      // Remove all non-alphanumeric characters for comparison
      const cleanCode = code.replace(/[^A-Z0-9]/g, '')
      const cleanProjectCode = projectCode.replace(/[^A-Z0-9]/g, '')
      return cleanCode === cleanProjectCode ||
             cleanCode.includes(cleanProjectCode) || 
             cleanProjectCode.includes(cleanCode)
    })) return true
    
    return false
  }

  // Helper function to parse date string (handles "DD-Mon-YY" format)
  const parseDateString = (dateStr: string | null | undefined): Date | null => {
    if (!dateStr) return null
    
    try {
      // Try parsing as-is first (ISO format, etc.)
      const date = new Date(dateStr)
      if (!isNaN(date.getTime())) return date
      
      // Try parsing "DD-Mon-YY" format (e.g., "23-Feb-24")
      const dateMatch = String(dateStr).trim().match(/(\d+)-([A-Za-z]+)-(\d+)/)
      if (dateMatch) {
        const day = parseInt(dateMatch[1], 10)
        const monthName = dateMatch[2]
        const year = parseInt(dateMatch[3], 10)
        
        const monthMap: { [key: string]: number } = {
          'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
          'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
        }
        
        const month = monthMap[monthName.substring(0, 3)]
        if (month !== undefined) {
          // Convert 2-digit year to 4-digit (assume 20xx for years < 100)
          const fullYear = year < 100 ? 2000 + year : year
          const parsedDate = new Date(fullYear, month, day)
          if (!isNaN(parsedDate.getTime())) return parsedDate
        }
      }
    } catch (e) {
      // Ignore parsing errors
    }
    
    return null
  }

  // Calculate Planned Dates from KPIs - فقط تاريخ أول Planned KPI
  const getPlannedDatesFromKPIs = (project: Project) => {
    const projectCode = project.project_code
    if (!projectCode) return { start: null, completion: null }

    // Debug: Log all KPIs and project code
    if (allKPIs.length > 0 && projectCode === 'P5011') {
      console.log(`🔍 [${projectCode}] Searching for Planned KPIs. Total KPIs: ${allKPIs.length}`)
      console.log(`🔍 [${projectCode}] Sample KPI project codes:`, allKPIs.slice(0, 5).map((k: any) => ({
        code: k.project_code || k['Project Code'],
        fullCode: k.project_full_code || k['Project Full Code'],
        inputType: k.input_type || k['Input Type'],
        day: k.day || k['Day']
      })))
    }

    // Filter KPIs for this project with Input Type = 'Planned' فقط
    const projectKPIs = allKPIs.filter((kpi: any) => {
      const matches = matchesProject(kpi, project)
      const inputType = String(kpi['Input Type'] || kpi.input_type || '').trim()
      const isPlanned = inputType === 'Planned'
      
      if (projectCode === 'P5011' && matches && allKPIs.length > 0) {
        console.log(`🔍 [${projectCode}] KPI matches:`, {
          matches,
          inputType,
          isPlanned,
          kpiProjectCode: kpi.project_code || kpi['Project Code'],
          kpiFullCode: kpi.project_full_code || kpi['Project Full Code'],
          day: kpi.day || kpi['Day']
        })
      }
      
      return matches && isPlanned
    })

    if (projectKPIs.length === 0) {
      if (projectCode === 'P5011') {
        console.log(`⚠️ [${projectCode}] No Planned KPIs found. Total KPIs: ${allKPIs.length}`)
      }
      return { start: null, completion: null }
    }

    // Get dates from KPI records (try multiple field names)
    const kpisWithDates = projectKPIs.map((kpi: any) => {
      // Try all possible date field names (check raw data too)
      const rawKpi = (kpi as any).raw || {}
      
      // ✅ PRIORITY: Use 'Day' column from database (primary date field)
      // For Planned KPIs, prefer Day, then Target Date or Activity Date
      const dateStr = kpi.day ||
                     kpi['Day'] ||
                     rawKpi['Day'] ||
                     rawKpi.day ||
                     kpi.target_date ||
                     kpi.activity_date || 
                     kpi.date ||
                     kpi['Target Date'] ||
                     kpi['Activity Date'] ||
                     kpi['Date'] ||
                     rawKpi['Target Date'] ||
                     rawKpi['Activity Date'] ||
                     rawKpi['Date'] ||
                     rawKpi.target_date ||
                     rawKpi.activity_date ||
                     rawKpi.date ||
                     kpi.created_at || // Fallback to creation date if no specific date
                     null
      
      const parsedDate = parseDateString(dateStr)
      
      // 🔍 Enhanced logging for all projects (limit to first 3 KPIs to avoid spam)
      if (!parsedDate && projectKPIs.length > 0 && projectKPIs.indexOf(kpi) < 3) {
        console.log(`📅 [${projectCode}] Planned KPI date search:`, {
          day: kpi.day || kpi['Day'] || 'NOT FOUND',
          rawDay: rawKpi['Day'] || 'NOT FOUND',
          dateStr: dateStr || 'NULL',
          parsed: parsedDate ? 'SUCCESS' : 'FAILED',
          inputType: kpi.input_type || kpi['Input Type'],
          projectCode: kpi.project_code || kpi['Project Code']
        })
      }
      
      return parsedDate ? { kpi, date: parsedDate.toISOString(), dateObj: parsedDate } : null
    }).filter((item): item is { kpi: any, date: string, dateObj: Date } => item !== null)

    if (kpisWithDates.length === 0) return { start: null, completion: null }

    // Sort by date (ascending) - ترتيب حسب التاريخ
    const sortedKPIs = kpisWithDates.sort((a: any, b: any) => {
      return a.dateObj.getTime() - b.dateObj.getTime()
    })

    // فقط تاريخ أول Planned KPI
    const firstKPI = sortedKPIs[0]
    const lastKPI = sortedKPIs[sortedKPIs.length - 1]

    return {
      start: firstKPI.date || null,
      completion: lastKPI.date || null
    }
  }

  // Calculate Actual Dates from Actual KPIs - فقط تاريخ أول Actual KPI
  const getActualDatesFromActivities = (project: Project) => {
    const projectCode = project.project_code
    if (!projectCode) return { start: null, completion: null }

    // فقط Actual KPIs - بدون البحث في الأنشطة
    const actualKPIs = allKPIs.filter((kpi: any) => {
      const matches = matchesProject(kpi, project)
      const inputType = String(kpi['Input Type'] || kpi.input_type || '').trim()
      const isActual = inputType === 'Actual'
      return matches && isActual
    })

    if (actualKPIs.length === 0) {
      if (projectCode === 'P5011') {
        console.log(`⚠️ [${projectCode}] No Actual KPIs found. Total KPIs: ${allKPIs.length}`)
      }
      return { start: null, completion: null }
    }

    // Get dates from KPI records (try multiple field names)
    const kpisWithDates = actualKPIs.map((kpi: any) => {
      // Try all possible date field names (check raw data too)
      const rawKpi = (kpi as any).raw || {}
      
      // ✅ PRIORITY: Use 'Day' column from database (primary date field)
      // For Actual KPIs, prefer Day, then Actual Date or Activity Date
      const dateStr = kpi.day ||
                     kpi['Day'] ||
                     rawKpi['Day'] ||
                     rawKpi.day ||
                     kpi.actual_date ||
                     kpi.activity_date || 
                     kpi.date ||
                     kpi['Actual Date'] ||
                     kpi['Activity Date'] ||
                     kpi['Date'] ||
                     rawKpi['Actual Date'] ||
                     rawKpi['Activity Date'] ||
                     rawKpi['Date'] ||
                     rawKpi.actual_date ||
                     rawKpi.activity_date ||
                     rawKpi.date ||
                     kpi.created_at || // Fallback to creation date if no specific date
                     null
      
      const parsedDate = parseDateString(dateStr)
      
      // 🔍 Enhanced logging for all projects (limit to first 3 KPIs to avoid spam)
      if (!parsedDate && actualKPIs.length > 0 && actualKPIs.indexOf(kpi) < 3) {
        console.log(`📅 [${projectCode}] Actual KPI date search:`, {
          day: kpi.day || kpi['Day'] || 'NOT FOUND',
          rawDay: rawKpi['Day'] || 'NOT FOUND',
          dateStr: dateStr || 'NULL',
          parsed: parsedDate ? 'SUCCESS' : 'FAILED',
          inputType: kpi.input_type || kpi['Input Type'],
          projectCode: kpi.project_code || kpi['Project Code']
        })
      }
      
      return parsedDate ? { kpi, date: parsedDate.toISOString(), dateObj: parsedDate } : null
    }).filter((item): item is { kpi: any, date: string, dateObj: Date } => item !== null)

    if (kpisWithDates.length === 0) return { start: null, completion: null }

    // Sort by date (ascending) - ترتيب حسب التاريخ
    const sortedKPIs = kpisWithDates.sort((a: any, b: any) => {
      return a.dateObj.getTime() - b.dateObj.getTime()
    })

    // فقط تاريخ أول Actual KPI
    const firstKPI = sortedKPIs[0]
    const lastKPI = sortedKPIs[sortedKPIs.length - 1]

    return {
      start: firstKPI.date || null,
      completion: lastKPI.date || null
    }
  }

  // Render cell content based on column
  const renderCell = (project: Project, column: ColumnConfig) => {
    const rawProject = (project as any).raw || project
    
    switch (column.id) {
      case 'select':
        return (
          <input
            type="checkbox"
            checked={selectedIds.includes(project.id)}
            onChange={(e) => handleSelectOne(project.id, e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        )
      
      case 'project_info_merged':
        const projectFullCode = getProjectField(project, 'Project Full Code') || project.project_sub_code || ''
        const projectDescription = getProjectField(project, 'Project Description') || getProjectField(project, 'Description') || ''
        return (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="font-semibold text-gray-900 dark:text-white text-sm">
                {project.project_code || 'N/A'}
            </div>
              {projectFullCode && (
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  ({projectFullCode})
            </div>
              )}
              {project.plot_number && project.plot_number !== 'N/A' && (
                <div className="px-2 py-0.5 text-xs font-medium rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                  Plot: {project.plot_number}
            </div>
              )}
            </div>
            <div className="font-medium text-gray-900 dark:text-white text-sm">
              {project.project_name || 'N/A'}
            </div>
            {projectDescription && projectDescription !== 'N/A' && (
            <div className="text-xs text-gray-600 dark:text-gray-400">
                {projectDescription}
            </div>
            )}
          </div>
        )
      
      case 'responsible_divisions':
        const divisionsRaw = project.responsible_division || 'N/A'
        // Split by comma and trim each division
        const divisionsList = divisionsRaw !== 'N/A' 
          ? divisionsRaw.split(',').map(d => d.trim()).filter(d => d.length > 0)
          : ['N/A']
        
        // Generate color based on division name for consistent tagging
        const divisionColors: { [key: string]: string } = {
          'Enabling Division': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
          'Infrastructure Division': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
          'Soil Improvement Division': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
          'Marine Division': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
        }
        
        return (
          <div className="flex flex-wrap gap-1.5">
            {divisionsList.map((division, index) => {
              const divisionColor = divisionColors[division] || 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300'
              return (
                <span key={index} className={`px-2.5 py-1 text-xs font-medium rounded-full ${divisionColor}`}>
                  {division}
              </span>
              )
            })}
            </div>
        )
      
      case 'scope_of_works':
        const scopeRaw = project.project_type || 'N/A'
        // Split by comma and trim each scope item
        const scopeList = scopeRaw !== 'N/A' 
          ? scopeRaw.split(',').map(s => s.trim()).filter(s => s.length > 0)
          : ['N/A']
        
        // Generate color based on scope keywords for consistent tagging
        const getScopeColor = (scope: string): string => {
          const scopeLower = scope.toLowerCase()
          if (scopeLower.includes('infrastructure') || scopeLower.includes('enabling')) {
            return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
          }
          if (scopeLower.includes('construction') || scopeLower.includes('excavation')) {
            return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
          }
          if (scopeLower.includes('development') || scopeLower.includes('piling')) {
            return 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300'
          }
          if (scopeLower.includes('testing') || scopeLower.includes('testing')) {
            return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
          }
          if (scopeLower.includes('landscaping') || scopeLower.includes('interlock')) {
            return 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300'
          }
          if (scopeLower.includes('financial') || scopeLower.includes('finanical')) {
            return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
          }
          return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300'
        }
        
        return (
          <div className="flex flex-wrap gap-1.5">
            {scopeList.map((scope, index) => {
              const scopeColor = getScopeColor(scope)
              return (
                <span key={index} className={`px-2.5 py-1 text-xs font-medium rounded-full ${scopeColor}`}>
                  {scope}
              </span>
              )
            })}
          </div>
        )
      
      case 'kpi_added':
        return (
            <div className="flex items-center gap-2">
            {project.kpi_completed ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-500" />
            )}
            <span className="text-sm text-gray-900 dark:text-white">
              {project.kpi_completed ? 'Yes' : 'No'}
              </span>
          </div>
        )
      
      case 'project_status':
        const status = project.project_status?.replace('-', ' ') || 'Unknown'
        const statusColorMap: { [key: string]: string } = {
          'completed': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
          'on going': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
          'on-going': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
          'on hold': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
          'on-hold': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
          'upcoming': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
          'cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
        }
        const statusColor = statusColorMap[status.toLowerCase()] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
        return (
            <div className="flex items-center gap-2">
              {getProjectStatusIcon(project.project_status)}
            <span className={`px-2.5 py-1 text-xs font-medium rounded-full capitalize ${statusColor}`}>
              {status}
              </span>
            </div>
        )
      
      case 'contract_durations':
        // Calculate Contract Duration from Planned Dates
        const contractPlannedDates = getPlannedDatesFromKPIs(project)
        const contractPlannedStart = contractPlannedDates.start || getProjectField(project, 'Planned Start Date') || getProjectField(project, 'Planned Start') || ''
        const contractPlannedCompletion = contractPlannedDates.completion || getProjectField(project, 'Planned Completion Date') || getProjectField(project, 'Planned Completion') || ''
        
        // Calculate actual duration from Actual Dates
        const contractActualDates = getActualDatesFromActivities(project)
        const contractActualStart = contractActualDates.start || getProjectField(project, 'Actual Start Date') || getProjectField(project, 'Actual Start') || ''
        const contractActualCompletion = contractActualDates.completion || getProjectField(project, 'Actual Completion Date') || getProjectField(project, 'Actual Completion') || ''
        
        // Calculate contract duration in days
        let contractDuration = 0
        if (contractPlannedStart && contractPlannedCompletion) {
          const startDate = new Date(contractPlannedStart)
          const endDate = new Date(contractPlannedCompletion)
          if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
            contractDuration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
          }
        }
        
        // Fallback to project field if calculation fails
        if (contractDuration <= 0) {
          contractDuration = parseFloat(String(getProjectField(project, 'Contract Duration') || '0').replace(/,/g, '')) || 0
        }
        
        // Get extension duration from project field
        const extensionDuration = parseFloat(String(getProjectField(project, 'Extension of Time Duration') || getProjectField(project, 'Extension Duration') || '0').replace(/,/g, '')) || 0
        
        // Calculate actual total duration from actual dates
        let actualTotalDuration = 0
        if (contractActualStart && contractActualCompletion) {
          const actualStartDate = new Date(contractActualStart)
          const actualEndDate = new Date(contractActualCompletion)
          if (!isNaN(actualStartDate.getTime()) && !isNaN(actualEndDate.getTime())) {
            actualTotalDuration = Math.ceil((actualEndDate.getTime() - actualStartDate.getTime()) / (1000 * 60 * 60 * 24))
          }
        }
        
        const totalDuration = contractDuration + extensionDuration
        
        return (
          <div className="space-y-1">
            <div className="text-xs text-gray-600 dark:text-gray-400">Contract: {contractDuration > 0 ? contractDuration : 'N/A'} days</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Extension: {extensionDuration > 0 ? extensionDuration : '0'} days</div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">Total: {totalDuration > 0 ? totalDuration : 'N/A'} days</div>
            {actualTotalDuration > 0 && (
              <div className="text-xs text-blue-600 dark:text-blue-400">Actual: {actualTotalDuration} days</div>
            )}
            </div>
        )
      
      case 'planned_dates':
        // Get planned dates from KPIs (first and last Planned KPI dates)
        const plannedDates = getPlannedDatesFromKPIs(project)
        
        // Debug for specific project
        if (project.project_code === 'P5011') {
          console.log(`🔍 [${project.project_code}] Planned Dates result:`, {
            fromKPIs: plannedDates,
            fromFields: {
              start: getProjectField(project, 'Planned Start Date') || getProjectField(project, 'Planned Start'),
              completion: getProjectField(project, 'Planned Completion Date') || getProjectField(project, 'Planned Completion')
            },
            allKPIsCount: allKPIs.length
          })
        }
        
        // Fallback to project fields if KPI data not available
        const plannedStart = plannedDates.start || 
                            getProjectField(project, 'Planned Start Date') || 
                            getProjectField(project, 'Planned Start') || 
                            getProjectField(project, 'Project Start Date') ||
                            ''
        const plannedCompletion = plannedDates.completion || 
                                  getProjectField(project, 'Planned Completion Date') || 
                                  getProjectField(project, 'Planned Completion') ||
                                  getProjectField(project, 'Project End Date') ||
                                  ''
        return (
          <div className="space-y-1">
            <div className="text-xs text-gray-600 dark:text-gray-400">Start: {plannedStart ? formatDate(plannedStart) : 'N/A'}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Completion: {plannedCompletion ? formatDate(plannedCompletion) : 'N/A'}</div>
            </div>
        )
      
      case 'actual_dates':
        // Get actual dates from Actual KPIs (first and last Actual KPI dates)
        const actualDates = getActualDatesFromActivities(project)
        
        // Debug for specific project
        if (project.project_code === 'P5011') {
          console.log(`🔍 [${project.project_code}] Actual Dates result:`, {
            fromKPIs: actualDates,
            fromFields: {
              start: getProjectField(project, 'Actual Start Date') || getProjectField(project, 'Actual Start'),
              completion: getProjectField(project, 'Actual Completion Date') || getProjectField(project, 'Actual Completion')
            },
            allKPIsCount: allKPIs.length
          })
        }
        
        // Fallback to project fields if KPI data not available
        const actualStart = actualDates.start || 
                           getProjectField(project, 'Actual Start Date') || 
                           getProjectField(project, 'Actual Start') ||
                           getProjectField(project, 'Project Actual Start Date') ||
                           ''
        const actualCompletion = actualDates.completion || 
                                getProjectField(project, 'Actual Completion Date') || 
                                getProjectField(project, 'Actual Completion') ||
                                getProjectField(project, 'Project Actual End Date') ||
                                ''
        return (
          <div className="space-y-1">
            <div className="text-xs text-gray-600 dark:text-gray-400">Start: {actualStart ? formatDate(actualStart) : 'N/A'}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Completion: {actualCompletion ? formatDate(actualCompletion) : 'N/A'}</div>
          </div>
        )
      
      case 'progress_summary':
        // Calculate progress from actual KPIs and BOQ activities
        const projectCode = project.project_code
        let plannedProgress = 0
        let actualProgress = 0
        
        if (projectCode) {
          // Filter KPIs and activities for this project
          const projectKPIs = allKPIs.filter((kpi: any) => {
            return matchesProject(kpi, project)
          })
          
          const projectActivities = allActivities.filter((activity: any) => {
            return matchesProject(activity, project)
          })
          
          // Calculate planned values
          let totalPlannedUnits = 0
          let totalPlannedValue = 0
          let totalActualUnits = 0
          let totalActualValue = 0
          
          // From BOQ Activities (planned)
          projectActivities.forEach((activity: any) => {
            const plannedUnits = parseFloat(String(activity['Planned Units'] || activity.planned_units || '0').replace(/,/g, '')) || 0
            const actualUnits = parseFloat(String(activity['Actual Units'] || activity.actual_units || '0').replace(/,/g, '')) || 0
            const rate = parseFloat(String(activity['Rate'] || activity.rate || '0').replace(/,/g, '')) || 0
            
            totalPlannedUnits += plannedUnits
            totalActualUnits += actualUnits
            
            if (rate > 0) {
              totalPlannedValue += plannedUnits * rate
              totalActualValue += actualUnits * rate
            } else {
              const plannedValue = parseFloat(String(activity['Planned Value'] || activity.planned_value || '0').replace(/,/g, '')) || 0
              const actualValue = parseFloat(String(activity['Earned Value'] || activity.earned_value || '0').replace(/,/g, '')) || 0
              totalPlannedValue += plannedValue
              totalActualValue += actualValue
            }
          })
          
          // From KPIs (to get more accurate progress)
          projectKPIs.forEach((kpi: any) => {
            const quantity = parseFloat(String(kpi.quantity || kpi['Quantity'] || '0').replace(/,/g, '')) || 0
            const inputType = kpi['Input Type'] || kpi.input_type
            
            // Find related activity for rate
            const relatedActivity = projectActivities.find((a: any) => {
              return a.activity_name === (kpi.activity_name || kpi['Activity Name'])
            })
            
            const rate = relatedActivity ? 
              (parseFloat(String(relatedActivity['Rate'] || relatedActivity.rate || '0').replace(/,/g, '')) || 0) :
              (parseFloat(String(kpi['Rate'] || kpi.rate || '0').replace(/,/g, '')) || 0)
            
            const value = rate > 0 ? quantity * rate : (parseFloat(String(kpi.value || kpi['Value'] || '0').replace(/,/g, '')) || 0)
            
            if (inputType === 'Planned') {
              totalPlannedUnits += quantity
              totalPlannedValue += value
            } else if (inputType === 'Actual') {
              totalActualUnits += quantity
              totalActualValue += value
            }
          })
          
          // Calculate progress percentages
          if (totalPlannedUnits > 0) {
            actualProgress = (totalActualUnits / totalPlannedUnits) * 100
          } else if (totalPlannedValue > 0) {
            actualProgress = (totalActualValue / totalPlannedValue) * 100
          } else {
            // Fallback to project field
            actualProgress = parseFloat(String(getProjectField(project, 'Actual Progress') || '0').replace(/,/g, '')) || 0
          }
          
          // Planned progress should be based on time elapsed vs total planned duration
          const plannedDatesCalc = getPlannedDatesFromKPIs(project)
          const plannedStartCalc = plannedDatesCalc.start || getProjectField(project, 'Planned Start Date') || getProjectField(project, 'Planned Start') || ''
          const plannedCompletionCalc = plannedDatesCalc.completion || getProjectField(project, 'Planned Completion Date') || getProjectField(project, 'Planned Completion') || ''
          
          if (plannedStartCalc && plannedCompletionCalc) {
            const startDate = new Date(plannedStartCalc)
            const endDate = new Date(plannedCompletionCalc)
            const today = new Date()
            
            if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
              const totalDuration = endDate.getTime() - startDate.getTime()
              const elapsedDuration = today.getTime() - startDate.getTime()
              
              if (totalDuration > 0) {
                plannedProgress = Math.min(100, Math.max(0, (elapsedDuration / totalDuration) * 100))
              }
            }
          } else {
            // Fallback to project field
            plannedProgress = parseFloat(String(getProjectField(project, 'Planned Progress') || getProjectField(project, 'Progress') || '0').replace(/,/g, '')) || 0
          }
        } else {
          // Fallback to project fields
          plannedProgress = parseFloat(String(getProjectField(project, 'Planned Progress') || getProjectField(project, 'Progress') || '0').replace(/,/g, '')) || 0
          actualProgress = parseFloat(String(getProjectField(project, 'Actual Progress') || '0').replace(/,/g, '')) || 0
        }
        
        const varianceValue = actualProgress - plannedProgress
        
        return (
          <div className="space-y-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">Planned</span>
                <span className="font-medium">{plannedProgress.toFixed(1)}%</span>
            </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${Math.min(100, Math.max(0, plannedProgress))}%` }}></div>
            </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">Actual</span>
                <span className="font-medium">{actualProgress.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div className={`h-1.5 rounded-full transition-all ${actualProgress >= plannedProgress ? 'bg-green-500' : 'bg-orange-500'}`} style={{ width: `${Math.min(100, Math.max(0, actualProgress))}%` }}></div>
              </div>
            </div>
            <div className={`text-xs font-medium ${varianceValue >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              Variance: {varianceValue >= 0 ? '+' : ''}{varianceValue.toFixed(1)}%
            </div>
          </div>
        )
      
      case 'work_value_status':
        // Calculate Work Value Status from actual KPIs and BOQ activities
        const workProjectCode = project.project_code
        let plannedWorkValueNum = 0
        let workDoneValueNum = 0
        
        if (workProjectCode) {
          // Filter KPIs and activities for this project
          const workProjectKPIs = allKPIs.filter((kpi: any) => {
            return matchesProject(kpi, project)
          })
          
          const workProjectActivities = allActivities.filter((activity: any) => {
            return matchesProject(activity, project)
          })
          
          // Calculate from BOQ Activities
          workProjectActivities.forEach((activity: any) => {
            const plannedUnits = parseFloat(String(activity['Planned Units'] || activity.planned_units || '0').replace(/,/g, '')) || 0
            const actualUnits = parseFloat(String(activity['Actual Units'] || activity.actual_units || '0').replace(/,/g, '')) || 0
            const totalUnits = parseFloat(String(activity['Total Units'] || activity.total_units || '0').replace(/,/g, '')) || 0
            const totalValue = parseFloat(String(activity['Total Value'] || activity.total_value || '0').replace(/,/g, '')) || 0
            
            // Calculate rate
            let rate = 0
            if (plannedUnits > 0 && totalValue > 0) {
              rate = totalValue / plannedUnits
            } else if (totalUnits > 0 && totalValue > 0) {
              rate = totalValue / totalUnits
            } else {
              rate = parseFloat(String(activity['Rate'] || activity.rate || '0').replace(/,/g, '')) || 0
            }
            
            // Calculate planned and earned values
            const plannedValue = rate > 0 ? (plannedUnits * rate) : (parseFloat(String(activity['Planned Value'] || activity.planned_value || '0').replace(/,/g, '')) || 0)
            const earnedValue = rate > 0 ? (actualUnits * rate) : (parseFloat(String(activity['Earned Value'] || activity.earned_value || '0').replace(/,/g, '')) || 0)
            
            plannedWorkValueNum += plannedValue
            workDoneValueNum += earnedValue
          })
          
          // Add values from KPIs (to get more accurate calculations)
          workProjectKPIs.forEach((kpi: any) => {
            const quantity = parseFloat(String(kpi.quantity || kpi['Quantity'] || '0').replace(/,/g, '')) || 0
            const inputType = kpi['Input Type'] || kpi.input_type
            
            // Find related activity for rate
            const relatedActivity = workProjectActivities.find((a: any) => {
              return a.activity_name === (kpi.activity_name || kpi['Activity Name'])
            })
            
            let rate = 0
            if (relatedActivity) {
              const plannedUnits = parseFloat(String(relatedActivity['Planned Units'] || relatedActivity.planned_units || '0').replace(/,/g, '')) || 0
              const totalValue = parseFloat(String(relatedActivity['Total Value'] || relatedActivity.total_value || '0').replace(/,/g, '')) || 0
              if (plannedUnits > 0 && totalValue > 0) {
                rate = totalValue / plannedUnits
              } else {
                rate = parseFloat(String(relatedActivity['Rate'] || relatedActivity.rate || '0').replace(/,/g, '')) || 0
              }
            } else {
              rate = parseFloat(String(kpi['Rate'] || kpi.rate || '0').replace(/,/g, '')) || 0
            }
            
            const value = rate > 0 ? (quantity * rate) : (parseFloat(String(kpi.value || kpi['Value'] || '0').replace(/,/g, '')) || 0)
            
            if (inputType === 'Planned') {
              plannedWorkValueNum += value
            } else if (inputType === 'Actual') {
              workDoneValueNum += value
            }
          })
        }
        
        // Fallback to project fields if calculations didn't work
        if (plannedWorkValueNum === 0 && workDoneValueNum === 0) {
          const plannedWorkValue = getProjectField(project, 'Planned Work Value') || getProjectField(project, 'Value of Planned Work') || '0'
          const workDoneValue = getProjectField(project, 'Work Done Value') || getProjectField(project, 'Value of Work Done') || '0'
          plannedWorkValueNum = parseFloat(String(plannedWorkValue).replace(/,/g, '')) || 0
          workDoneValueNum = parseFloat(String(workDoneValue).replace(/,/g, '')) || 0
        }
        
        const varianceWorkValue = workDoneValueNum - plannedWorkValueNum
        
        return (
          <div className="space-y-1">
            <div className="text-xs text-gray-600 dark:text-gray-400">Planned: ${plannedWorkValueNum.toLocaleString()}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Done: ${workDoneValueNum.toLocaleString()}</div>
            <div className={`text-sm font-medium ${varianceWorkValue >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              Variance: ${varianceWorkValue >= 0 ? '+' : ''}${varianceWorkValue.toLocaleString()}
            </div>
            </div>
        )
      
      case 'contract_amount':
        // Get contract amount from project field
        const contractAmt = parseFloat(String(project.contract_amount || getProjectField(project, 'Contract Amount') || '0').replace(/,/g, '')) || 0
        const variationsAmt = parseFloat(String(getProjectField(project, 'Variations Amount') || getProjectField(project, 'Variations') || getProjectField(project, 'Variation Amount') || '0').replace(/,/g, '')) || 0
        
        // Calculate actual work value from activities/KPIs as additional info
        const contractProjectCode = project.project_code
        let actualWorkValue = 0
        
        if (contractProjectCode && contractAmt > 0) {
          const contractProjectActivities = allActivities.filter((activity: any) => {
            return matchesProject(activity, project)
          })
          
          contractProjectActivities.forEach((activity: any) => {
            const earnedValue = parseFloat(String(activity['Earned Value'] || activity.earned_value || '0').replace(/,/g, '')) || 0
            if (earnedValue > 0) {
              actualWorkValue += earnedValue
            } else {
              // Calculate from actual units × rate
              const actualUnits = parseFloat(String(activity['Actual Units'] || activity.actual_units || '0').replace(/,/g, '')) || 0
              const rate = parseFloat(String(activity['Rate'] || activity.rate || '0').replace(/,/g, '')) || 0
              if (rate > 0 && actualUnits > 0) {
                actualWorkValue += actualUnits * rate
              }
            }
          })
        }
        
        const totalContractAmt = contractAmt + variationsAmt
        
        return (
          <div className="space-y-1">
            <div className="text-xs text-gray-600 dark:text-gray-400">Contract: ${contractAmt.toLocaleString()}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Variations: ${variationsAmt.toLocaleString()}</div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">Total: ${totalContractAmt.toLocaleString()}</div>
            {actualWorkValue > 0 && (
              <div className="text-xs text-blue-600 dark:text-blue-400">Work Done: ${actualWorkValue.toLocaleString()}</div>
            )}
          </div>
        )
      
      case 'divisions_contract_amount':
        // Get from project fields first (try multiple field name variations)
        let enablingDiv = parseFloat(String(
          getProjectField(project, 'Enabling Division T. Contract Value') || 
          getProjectField(project, 'Enabling Division Contract Value') || 
          getProjectField(project, 'Enabling Division Total Contract Value') ||
          getProjectField(project, 'Enabling Division Contract Amount') ||
          '0'
        ).replace(/,/g, '')) || 0
        
        let soilImprovementDiv = parseFloat(String(
          getProjectField(project, 'Soil Improvement Division T. Contract Value') || 
          getProjectField(project, 'Soil Improvement Division Contract Value') || 
          getProjectField(project, 'Soil Improvement Division Total Contract Value') ||
          getProjectField(project, 'Soil Improvement Division Contract Amount') ||
          '0'
        ).replace(/,/g, '')) || 0
        
        let marineDiv = parseFloat(String(
          getProjectField(project, 'Marine Division T. Contract Value') || 
          getProjectField(project, 'Marine Division Contract Value') || 
          getProjectField(project, 'Marine Division Total Contract Value') ||
          getProjectField(project, 'Marine Division Contract Amount') ||
          '0'
        ).replace(/,/g, '')) || 0
        
        // Calculate from activities if project fields are empty/zero
        const divisionsProjectCode = project.project_code
        if (divisionsProjectCode) {
          const divisionsProjectActivities = allActivities.filter((activity: any) => {
            return matchesProject(activity, project)
          })
          
          let enablingValue = 0
          let soilImprovementValue = 0
          let marineValue = 0
          let otherValue = 0
          
          // Also check responsible division from project
          const responsibleDivision = (project.responsible_division || getProjectField(project, 'Responsible Division') || '').toLowerCase()
          
          divisionsProjectActivities.forEach((activity: any) => {
            const activityDivision = (activity['Activity Division'] || activity.activity_division || '').toLowerCase()
            const totalValue = parseFloat(String(activity['Total Value'] || activity.total_value || '0').replace(/,/g, '')) || 0
            
            // Match division names more accurately
            if (activityDivision.includes('enabling') || 
                activityDivision.includes('infrastructure') || 
                activityDivision.includes('enabling division')) {
              enablingValue += totalValue
            } else if (activityDivision.includes('soil') && activityDivision.includes('improvement')) {
              soilImprovementValue += totalValue
            } else if (activityDivision.includes('marine') || activityDivision.includes('marine division')) {
              marineValue += totalValue
            } else {
              // If no division match in activity, check project's responsible division
              if (responsibleDivision.includes('enabling') || responsibleDivision.includes('infrastructure')) {
                enablingValue += totalValue
              } else if (responsibleDivision.includes('soil') || responsibleDivision.includes('improvement')) {
                soilImprovementValue += totalValue
              } else if (responsibleDivision.includes('marine')) {
                marineValue += totalValue
              } else {
                otherValue += totalValue
              }
            }
          })
          
          // Only use calculated values if project fields are zero or very small
          if (enablingDiv < 1000 && enablingValue > 0) enablingDiv = enablingValue
          if (soilImprovementDiv < 1000 && soilImprovementValue > 0) soilImprovementDiv = soilImprovementValue
          if (marineDiv < 1000 && marineValue > 0) marineDiv = marineValue
          
          // Add other values to the largest division if project fields are all zero
          if (enablingDiv === 0 && soilImprovementDiv === 0 && marineDiv === 0 && otherValue > 0) {
            if (enablingValue >= soilImprovementValue && enablingValue >= marineValue) {
              enablingDiv = otherValue
            } else if (soilImprovementValue >= marineValue) {
              soilImprovementDiv = otherValue
            } else {
              marineDiv = otherValue
            }
          }
        }
        
        const divisionsTotal = enablingDiv + soilImprovementDiv + marineDiv
        
        return (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600 dark:text-gray-400">Enabling:</span>
              <span className="font-medium text-gray-900 dark:text-white">${enablingDiv.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600 dark:text-gray-400">Soil Improvement:</span>
              <span className="font-medium text-gray-900 dark:text-white">${soilImprovementDiv.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600 dark:text-gray-400">Marine:</span>
              <span className="font-medium text-gray-900 dark:text-white">${marineDiv.toLocaleString()}</span>
            </div>
            {divisionsTotal > 0 && (
              <div className="pt-1 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between text-sm font-semibold text-gray-900 dark:text-white">
                  <span>Total:</span>
                  <span>${divisionsTotal.toLocaleString()}</span>
                </div>
              </div>
            )}
            {divisionsTotal === 0 && (
              <div className="text-xs text-gray-500 dark:text-gray-400 italic">No data available</div>
            )}
          </div>
        )
      
      case 'temporary_material':
        // Get temporary material information from project fields
        const hasTempMaterial = getProjectField(project, 'Project has Temporary Materials?') || 
                               getProjectField(project, 'Temporary Materials') || 
                               getProjectField(project, 'Has Temporary Materials') ||
                               'No'
        
        const tempMaterialDuration = getProjectField(project, 'Temporary Material Rental Duration') || 
                                    getProjectField(project, 'Temporary Material Duration') || 
                                    getProjectField(project, 'Temporary Material Rental Period') ||
                                    '0'
        
        // Parse duration to number for better display
        const durationNum = parseFloat(String(tempMaterialDuration).replace(/[^0-9.]/g, '')) || 0
        
        // Check if material exists (handle various formats)
        const hasMaterial = hasTempMaterial === 'Yes' || 
                           hasTempMaterial === 'TRUE' || 
                           hasTempMaterial === true ||
                           hasTempMaterial === 'true' ||
                           String(hasTempMaterial).toLowerCase() === 'yes'
        
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {hasMaterial ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <X className="h-4 w-4 text-gray-400" />
              )}
              <span className={`text-sm font-medium ${hasMaterial ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                {hasMaterial ? 'Yes' : 'No'}
              </span>
            </div>
            {hasMaterial && durationNum > 0 && (
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Duration: {durationNum} {durationNum === 1 ? 'day' : 'days'}
            </div>
            )}
            {hasMaterial && durationNum === 0 && (
              <div className="text-xs text-orange-600 dark:text-orange-400">
                Duration: Not specified
            </div>
            )}
            </div>
        )
      
      case 'project_location':
        const latitude = project.latitude || getProjectField(project, 'Latitude') || ''
        const longitude = project.longitude || getProjectField(project, 'Longitude') || ''
        const locationLink = latitude && longitude 
          ? `https://www.google.com/maps?q=${latitude},${longitude}`
          : ''
        return (
          <div>
            {locationLink ? (
              <a 
                href={locationLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
              >
                {latitude}, {longitude}
              </a>
            ) : (
              <span className="text-gray-500 dark:text-gray-400 text-sm">N/A</span>
            )}
          </div>
        )
      
      case 'project_parties':
        return (
          <div className="space-y-1">
            <div className="text-xs text-gray-600 dark:text-gray-400">First Party: {project.first_party_name || 'N/A'}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Client: {project.client_name || 'N/A'}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Consultant: {project.consultant_name || 'N/A'}</div>
              </div>
        )
      
      case 'project_staff':
        const areaManager = project.area_manager_email || getProjectField(project, 'Area Manager') || 'N/A'
        const projectManager = project.project_manager_email || getProjectField(project, 'Project Manager') || 'N/A'
        const divisionHead = getProjectField(project, 'Division Head') || getProjectField(project, 'Division Head Email') || 'N/A'
        return (
          <div className="space-y-1">
            <div className="text-xs text-gray-600 dark:text-gray-400">Area Manager: {areaManager}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Project Manager: {projectManager}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Division Head: {divisionHead}</div>
          </div>
        )
      
      case 'project_award_date':
        return (
          <div className="text-sm text-gray-900 dark:text-white">
            {project.date_project_awarded ? formatDate(project.date_project_awarded) : 'N/A'}
              </div>
        )
      
      case 'workmanship':
        const hasWorkmanship = project.workmanship_only || getProjectField(project, 'Workmanship?') || 'No'
        const virtualMaterialPercent = project.virtual_material_value || getProjectField(project, 'Virtual Material %') || getProjectField(project, 'Virtual Material Value') || '0'
        return (
          <div className="space-y-1">
            <div className="text-sm text-gray-900 dark:text-white">
              {hasWorkmanship === 'Yes' || hasWorkmanship === 'TRUE' || hasWorkmanship === true ? 'Yes' : 'No'}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Virtual Material: {virtualMaterialPercent}%
            </div>
          </div>
        )
      
      case 'actions':
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(project)}
              className="text-blue-600 hover:text-blue-700"
            >
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(project.id)}
              className="text-red-600 hover:text-red-700"
            >
              Delete
            </Button>
          </div>
        )
      
      default:
        return (
          <span className="text-gray-500 dark:text-gray-400 text-sm">
            N/A
          </span>
        )
    }
  }

  const visibleColumns = columns.filter(col => col.visible).sort((a, b) => a.order - b.order)

  return (
    <div className="space-y-4">
      {/* Header with Customization Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Projects ({projects.length})
          </h3>
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {selectedIds.length} selected
              </span>
              {onBulkDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkDelete}
                  className="text-red-600 hover:text-red-700"
                >
                  Delete Selected
                </Button>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCustomizer(true)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Customize Columns
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              resetToDefault()
              // Refresh page to apply changes
              setTimeout(() => window.location.reload(), 100)
            }}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            title="Reset to default columns"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              {visibleColumns.map((column) => (
                <th
                  key={column.id}
                  className="px-6 py-4 text-left text-base font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 min-w-[120px]"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr
                key={project.id}
                className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                {visibleColumns.map((column) => (
                  <td
                    key={column.id}
                    className="px-6 py-4 text-base"
                  >
                    {renderCell(project, column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Column Customizer Modal */}
      {showCustomizer && (
        <ColumnCustomizer
          columns={columns}
          onColumnsChange={saveConfiguration}
          onClose={() => setShowCustomizer(false)}
          title="Customize Projects Table Columns"
          storageKey="projects"
        />
      )}
    </div>
  )
}