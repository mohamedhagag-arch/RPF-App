'use client'

import { useState, useEffect } from 'react'
import { Project, BOQActivity, TABLES } from '@/lib/supabase'
import { getSupabaseClient, executeQuery } from '@/lib/simpleConnectionManager'
import { mapBOQFromDB } from '@/lib/dataMappers'
import { ModernCard } from '@/components/ui/ModernCard'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { KPIDataMapper } from '@/lib/kpi-data-mapper'
import { KPIConsistencyManager } from '@/lib/kpi-data-consistency-fix'
import { enhancedKPIFetcher } from '@/lib/enhanced-kpi-fetcher'
import { EnhancedQuantitySummary } from '@/components/kpi/EnhancedQuantitySummary'
import { 
  X, 
  Save, 
  Sparkles, 
  Target, 
  Calendar, 
  TrendingUp, 
  Info, 
  CheckCircle2, 
  Hash, 
  Building, 
  Activity,
  Play,
  Pause,
  CheckCircle,
  Clock,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Zap,
  List,
  Eye,
  EyeOff,
  Edit
} from 'lucide-react'

interface EnhancedSmartActualKPIFormProps {
  kpi?: any
  onSubmit: (data: any) => void
  onCancel: () => void
  projects?: Project[]
  activities?: BOQActivity[]
}

interface ActivityWithStatus extends BOQActivity {
  isCompleted: boolean
  hasWorkToday: boolean
  kpiData?: any
}

export function EnhancedSmartActualKPIForm({ 
  kpi, 
  onSubmit, 
  onCancel, 
  projects = [],
  activities = []
}: EnhancedSmartActualKPIFormProps) {
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Main workflow state
  const [currentStep, setCurrentStep] = useState<'project' | 'activities' | 'form'>('project')
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [projectActivities, setProjectActivities] = useState<ActivityWithStatus[]>([])
  const [currentActivityIndex, setCurrentActivityIndex] = useState(0)
  const [completedActivities, setCompletedActivities] = useState<Set<string>>(new Set())
  
  // Form fields for current activity
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('')
  const [section, setSection] = useState('')
  const [actualDate, setActualDate] = useState('')
  const [day, setDay] = useState('')
  const [drilledMeters, setDrilledMeters] = useState('')
  const [hasWorkToday, setHasWorkToday] = useState<boolean | null>(null)
  
  // Global date for all activities
  const [globalDate, setGlobalDate] = useState('')
  
  // Smart form state
  const [selectedActivity, setSelectedActivity] = useState<BOQActivity | null>(null)
  const [dailyRate, setDailyRate] = useState<number>(0)
  const [isAutoCalculated, setIsAutoCalculated] = useState(false)
  
  // ✅ REMOVED: calculatedPlannedUnits - Total now comes directly from BOQ Activity (planned_units or total_units)
  
  // Temporary storage for reported activities
  const [completedActivitiesData, setCompletedActivitiesData] = useState<Map<string, any>>(new Map())
  const [showPreview, setShowPreview] = useState(false)
  
  // Store actual quantities from database
  const [actualQuantities, setActualQuantities] = useState<Map<string, number>>(new Map())
  
  // ✅ Store all KPIs (Planned and Actual) for calculating quantities like BOQ
  const [allKPIs, setAllKPIs] = useState<any[]>([])
  
  // Date editing state
  const [isEditingDate, setIsEditingDate] = useState(false)
  
  // Submit protection state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  
  // Dropdowns
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)
  const [projectSearchTerm, setProjectSearchTerm] = useState('')
  
  // Activity filtering
  const [activitySearchTerm, setActivitySearchTerm] = useState('')
  const [selectedZone, setSelectedZone] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  
  // Zone selection for display
  const [selectedZones, setSelectedZones] = useState<Set<string>>(new Set())
  
  // Initialize with today's date
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    setActualDate(today)
    setGlobalDate(today) // Set global date as well
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showProjectDropdown) {
        const target = event.target as HTMLElement
        if (!target.closest('.project-dropdown-container')) {
          setShowProjectDropdown(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showProjectDropdown])
  
  // Load project activities when project is selected
  // Fetch directly from database to ensure ALL activities (old + new) are loaded
  useEffect(() => {
    const loadProjectActivities = async () => {
      if (!selectedProject) return
      
      const projectCode = selectedProject.project_code
      const projectSubCode = selectedProject.project_sub_code || ''
      // ✅ FIX: Use project_full_code from selected project if available, otherwise build it
      // Try multiple formats: P5066-I1, P5066I1, P5066 I1
      const projectFullCode = selectedProject.project_full_code || 
                             (projectSubCode ? `${projectCode}-${projectSubCode}` : projectCode) ||
                             `${projectCode}${projectSubCode}`.trim()
      
      // Build alternative formats for searching
      const builtFullCode1 = projectSubCode ? `${projectCode}-${projectSubCode}` : projectCode
      const builtFullCode2 = projectSubCode ? `${projectCode}${projectSubCode}` : projectCode
      const builtFullCode3 = projectSubCode ? `${projectCode} ${projectSubCode}` : projectCode
      
      console.log(`🔍 Smart KPI Form: Fetching activities for SPECIFIC project:`, {
        projectCode,
        projectSubCode: projectSubCode || 'none',
        projectFullCode,
        builtFullCode1,
        builtFullCode2,
        builtFullCode3,
        selectedProject: {
          project_code: selectedProject.project_code,
          project_sub_code: selectedProject.project_sub_code,
          project_full_code: selectedProject.project_full_code
        }
      })
      console.log(`📋 IMPORTANT: Each project with different Sub Code is a SEPARATE project - will fetch ONLY activities for this specific project`)
      
      try {
        const supabase = getSupabaseClient()
        
        // ✅ CRITICAL FIX: Strategy 1 - Match by exact Project Code + Sub Code (MOST ACCURATE)
        // Each project with different Sub Code is a separate project - fetch ONLY its activities
        const { data: activitiesByCodeAndSubCode, error: error1 } = await executeQuery(async () => {
          let query = supabase
            .from(TABLES.BOQ_ACTIVITIES)
            .select('*')
            .eq('Project Code', projectCode)
          
          // If sub code exists, MUST match it exactly (different sub code = different project)
          if (projectSubCode) {
            query = query.eq('Project Sub Code', projectSubCode)
          } else {
            // If no sub code, only match activities with no sub code
            query = query.or('Project Sub Code.is.null,Project Sub Code.eq.')
          }
          
          return query
        })
        
        // Strategy 2: Match by exact Project Full Code (from database)
        const { data: activitiesByFullCodeExact, error: error2 } = await executeQuery(async () =>
          supabase
            .from(TABLES.BOQ_ACTIVITIES)
            .select('*')
            .eq('Project Full Code', projectFullCode)
        )
        
        // Strategy 3: Match by Project Full Code with dash format (P5066-I1)
        const { data: activitiesByFullCodeDash, error: error3a } = await executeQuery(async () => {
          if (!projectSubCode || projectFullCode === builtFullCode1) {
            return { data: [], error: null }
          }
          return supabase
            .from(TABLES.BOQ_ACTIVITIES)
            .select('*')
            .eq('Project Full Code', builtFullCode1)
        })
        
        // Strategy 4: Match by Project Full Code without dash (P5066I1)
        const { data: activitiesByFullCodeNoDash, error: error3b } = await executeQuery(async () => {
          if (!projectSubCode || projectFullCode === builtFullCode2 || builtFullCode1 === builtFullCode2) {
            return { data: [], error: null }
          }
          return supabase
            .from(TABLES.BOQ_ACTIVITIES)
            .select('*')
            .eq('Project Full Code', builtFullCode2)
        })
        
        // Strategy 5: Match by Project Full Code with space (P5066 I1)
        const { data: activitiesByFullCodeSpace, error: error3c } = await executeQuery(async () => {
          if (!projectSubCode || projectFullCode === builtFullCode3 || builtFullCode1 === builtFullCode3) {
            return { data: [], error: null }
          }
          return supabase
            .from(TABLES.BOQ_ACTIVITIES)
            .select('*')
            .eq('Project Full Code', builtFullCode3)
        })
        
        // Strategy 6: Match where Project Full Code starts with Project Code (for cases where format differs)
        const { data: activitiesByFullCodeStart, error: error3d } = await executeQuery(async () => {
          if (!projectSubCode) {
            return { data: [], error: null }
          }
          // Search for activities where Project Full Code starts with Project Code
          // and contains the Sub Code (to catch variations)
          return supabase
            .from(TABLES.BOQ_ACTIVITIES)
            .select('*')
            .eq('Project Code', projectCode)
            .like('Project Full Code', `${projectCode}%`)
        })
        
        // Strategy 7: Match by Project Sub Code (optional - for additional verification)
        // Only if sub code exists and matches
        const { data: activitiesBySubCode, error: error4 } = await executeQuery(async () => {
          if (!projectSubCode) {
            return { data: [], error: null }
          }
          // Must also match Project Code to ensure it's the same project
          return supabase
            .from(TABLES.BOQ_ACTIVITIES)
            .select('*')
            .eq('Project Code', projectCode)
            .eq('Project Sub Code', projectSubCode)
        })
        
        // Merge results (all strategies should return activities for the SAME specific project)
        const allActivitiesData = [
          ...(Array.isArray(activitiesByCodeAndSubCode) ? activitiesByCodeAndSubCode : []),
          ...(Array.isArray(activitiesByFullCodeExact) ? activitiesByFullCodeExact : []),
          ...(Array.isArray(activitiesByFullCodeDash) ? activitiesByFullCodeDash : []),
          ...(Array.isArray(activitiesByFullCodeNoDash) ? activitiesByFullCodeNoDash : []),
          ...(Array.isArray(activitiesByFullCodeSpace) ? activitiesByFullCodeSpace : []),
          ...(Array.isArray(activitiesByFullCodeStart) ? activitiesByFullCodeStart : []),
          ...(Array.isArray(activitiesBySubCode) ? activitiesBySubCode : [])
        ]
        
        // Remove duplicates based on id
        const uniqueActivitiesData = Array.from(
          new Map(allActivitiesData.map((item: any) => [item.id, item])).values()
        )
        
        // Additional client-side filtering to ensure all match the SPECIFIC project
        // ✅ CRITICAL FIX: Each project with different Sub Code is a SEPARATE project
        // Only accept activities that match BOTH Project Code AND Project Sub Code
        const filteredActivities = uniqueActivitiesData.filter((item: any) => {
          const itemProjectCode = (item['Project Code'] || '').toString().trim()
          const itemProjectSubCode = (item['Project Sub Code'] || '').toString().trim()
          const itemProjectFullCode = (item['Project Full Code'] || '').toString().trim()
          
          // Normalize sub codes for comparison (handle case differences)
          const normalizedItemSubCode = itemProjectSubCode.toUpperCase()
          const normalizedProjectSubCode = projectSubCode.toUpperCase()
          
          // ✅ CRITICAL: Priority 1 - Exact match on Project Code + Sub Code (MOST IMPORTANT)
          // Different Sub Code = Different Project - must match BOTH
          if (itemProjectCode === projectCode && normalizedItemSubCode === normalizedProjectSubCode) {
            return true
          }
          
          // Priority 2: Exact match on Project Full Code (from database)
          if (itemProjectFullCode === projectFullCode) {
            return true
          }
          
          // Priority 3: Match on built Project Full Code formats (with dash, without dash, with space)
          if (itemProjectFullCode === builtFullCode1 || 
              itemProjectFullCode === builtFullCode2 || 
              itemProjectFullCode === builtFullCode3) {
            return true
          }
          
          // Priority 4: Match where Project Full Code starts with Project Code and contains Sub Code
          // This handles cases where format might differ (e.g., P5066-I1 vs P5066I1)
          if (itemProjectFullCode.startsWith(projectCode) && projectSubCode) {
            // Check if the full code contains the sub code (case-insensitive)
            const fullCodeUpper = itemProjectFullCode.toUpperCase()
            const subCodeUpper = projectSubCode.toUpperCase()
            if (fullCodeUpper.includes(subCodeUpper)) {
              // Also verify Project Code matches
              if (itemProjectCode === projectCode) {
                return true
              }
            }
          }
          
          // Priority 5: For projects without sub code, match by code only
          // Only if selected project also has no sub code
          if (!projectSubCode && !itemProjectSubCode) {
            if (itemProjectCode === projectCode) return true
            if (itemProjectFullCode === projectCode) return true
            if (itemProjectFullCode === projectFullCode) return true
          }
          
          // Priority 6: Match by Project Sub Code (optional - for additional verification)
          // Must also match Project Code to ensure it's the same project
          if (projectSubCode && normalizedItemSubCode === normalizedProjectSubCode) {
            if (itemProjectCode === projectCode) {
              return true
            }
          }
          
          // DO NOT accept activities with different Sub Code - they belong to different projects
          return false
        })
        
        // Map to application format
        const mappedActivities = filteredActivities.map(mapBOQFromDB)
        
        const projectActivities = mappedActivities.map(activity => ({
          ...activity,
          isCompleted: false,
          hasWorkToday: false
        }))
        
        setProjectActivities(projectActivities)
        setCurrentStep('activities')
        
        console.log(`📊 Smart KPI Form: Comprehensive fetch results for SPECIFIC project ${projectCode}${projectSubCode ? `-${projectSubCode}` : ''}:`, {
          byCodeAndSubCode: activitiesByCodeAndSubCode?.length || 0,
          byFullCodeExact: activitiesByFullCodeExact?.length || 0,
          byFullCodeDash: activitiesByFullCodeDash?.length || 0,
          byFullCodeNoDash: activitiesByFullCodeNoDash?.length || 0,
          byFullCodeSpace: activitiesByFullCodeSpace?.length || 0,
          byFullCodeStart: activitiesByFullCodeStart?.length || 0,
          bySubCode: activitiesBySubCode?.length || 0,
          totalBeforeDedup: allActivitiesData.length,
          uniqueAfterDedup: uniqueActivitiesData.length,
          finalAfterFilter: projectActivities.length,
          projectFullCode: projectFullCode,
          builtFullCode1: builtFullCode1,
          builtFullCode2: builtFullCode2,
          builtFullCode3: builtFullCode3,
          projectSubCode: projectSubCode || 'none',
          note: '✅ Each project with different Sub Code is SEPARATE - fetching ONLY activities for this specific project'
        })
        
        // Log sample activities to debug
        if (uniqueActivitiesData.length > 0) {
          console.log(`📋 Sample activities found (before filtering):`, uniqueActivitiesData.slice(0, 3).map((item: any) => ({
            id: item.id,
            activity_name: item['Activity Name'],
            project_code: item['Project Code'],
            project_sub_code: item['Project Sub Code'],
            project_full_code: item['Project Full Code']
          })))
        }
        
        console.log(`✅ Smart KPI Form: Loaded ${projectActivities.length} activities for project ${projectCode}${projectSubCode ? `-${projectSubCode}` : ''}`)
        console.log(`📋 Activities:`, projectActivities.map(a => ({
          name: a.activity_name,
          project_code: a.project_code,
          project_full_code: a.project_full_code
        })))
        
        if (projectActivities.length === 0) {
          console.warn(`⚠️ NO ACTIVITIES FOUND for project ${projectCode} in Smart KPI Form!`)
        }
        
      } catch (error: any) {
        console.error('❌ Error fetching activities in Smart KPI Form:', error)
        
        // Fallback: Try to use activities from props if available
        if (activities.length > 0) {
          console.log('📋 Using fallback: activities from props')
          console.log(`📋 IMPORTANT: Each project with different Sub Code is SEPARATE - fetching ONLY activities for this specific project`)
          const projectActivities = activities
            .filter(a => {
              const aProjectCode = (a.project_code || '').toString().trim()
              const aProjectSubCode = (a.project_sub_code || '').toString().trim()
              const aProjectFullCode = (a.project_full_code || '').toString().trim()
              
              // ✅ CRITICAL FIX: Each project with different Sub Code is a SEPARATE project
              // Only accept activities that match BOTH Project Code AND Project Sub Code
              
              // Priority 1: Exact match on Project Code + Sub Code (MOST IMPORTANT)
              if (aProjectCode === projectCode && aProjectSubCode === projectSubCode) {
                return true
              }
              
              // Priority 2: Exact match on Project Full Code
              if (aProjectFullCode === projectFullCode) {
                return true
              }
              
              // Priority 3: For projects without sub code, match by code only
              if (!projectSubCode && !aProjectSubCode) {
                if (aProjectCode === projectCode || aProjectFullCode === projectCode || aProjectFullCode === projectFullCode) {
                  return true
                }
              }
              
              // Priority 4: Match by Project Sub Code (optional - for additional verification)
              // Must also match Project Code to ensure it's the same project
              if (projectSubCode && aProjectSubCode === projectSubCode) {
                if (aProjectCode === projectCode) {
                  return true
                }
              }
              
              // DO NOT accept activities with different Sub Code - they belong to different projects
              return false
            })
            .map(activity => ({
              ...activity,
              isCompleted: false,
              hasWorkToday: false
            }))
          
          setProjectActivities(projectActivities)
          setCurrentStep('activities')
          console.log(`✅ Fallback: Loaded ${projectActivities.length} activities from props`)
        }
      }
    }
    
    loadProjectActivities()
  }, [selectedProject])
  
  // ============================================
  // ✅ HELPER FUNCTIONS: Zone Normalization
  // Must respect Project Full Code for accurate zone matching
  // ============================================
  
  /**
   * Normalize zone string by removing project code prefix
   * CRITICAL: Must use Project Full Code first (e.g., "P5066-I2 - 1" -> "1")
   * Examples: 
   * - "P5066-I2 - 1" -> "1" (using Project Full Code)
   * - "P5066 - 1" -> "1" (using Project Code only)
   */
  const normalizeZone = (zoneStr: string, projectFullCode: string, projectCode: string): string => {
    if (!zoneStr) return ''
    
    let normalized = zoneStr.trim()
    if (!normalized) return ''
    
    // ✅ FIRST: Try to remove Project Full Code (e.g., "P5066-I2 - 1" -> "1")
    if (projectFullCode) {
      const fullCodeUpper = projectFullCode.toUpperCase()
      const normalizedUpper = normalized.toUpperCase()
      
      // If zone starts with Project Full Code, remove it
      if (normalizedUpper.startsWith(fullCodeUpper)) {
        const afterFullCode = normalized.substring(projectFullCode.length).trim()
        // Remove leading dashes or spaces
        normalized = afterFullCode.replace(/^[\s-]+/, '').trim()
        if (normalized) {
          return normalized.toLowerCase()
        }
      }
    }
    
    // ✅ SECOND: If Project Full Code didn't match, try Project Code only
    if (projectCode) {
      const codeUpper = projectCode.toUpperCase()
      
      // Remove project code prefix in various formats
      normalized = normalized.replace(new RegExp(`^${codeUpper}\\s*-\\s*`, 'i'), '').trim()
      normalized = normalized.replace(new RegExp(`^${codeUpper}\\s+`, 'i'), '').trim()
      normalized = normalized.replace(new RegExp(`^${codeUpper}-`, 'i'), '').trim()
    }
    
    // Clean up any remaining " - " or "- " at the start
    normalized = normalized.replace(/^\s*-\s*/, '').trim()
    
    return normalized.toLowerCase()
  }
  
  /**
   * Extract all numbers from zone string and join them
   * Example: "12 - 1" -> "121", "12 - 2" -> "122"
   * This creates a unique identifier for zones
   */
  const extractZoneNumber = (zoneStr: string): string => {
    if (!zoneStr || zoneStr.trim() === '') return ''
    
    const numbers = zoneStr.match(/\d+/g)
    if (numbers && numbers.length > 0) {
      return numbers.join('') // Join all numbers to create unique identifier
    }
    
    return zoneStr.toLowerCase().trim()
  }
  
  /**
   * Check if two zones match using multiple strategies
   * CRITICAL: Must use Project Full Code for accurate matching
   * ✅ ENHANCED for P5073: "Parking-Side-A" is the FULL zone name - don't split it!
   */
  const zonesMatch = (zone1: string, zone2: string, projectFullCode: string, projectCode: string): boolean => {
    if (!zone1 || !zone2) return false
    
    const z1 = zone1.trim()
    const z2 = zone2.trim()
    
    // Strategy 1: Exact match (case-insensitive) - SIMPLEST and MOST RELIABLE
    if (z1.toLowerCase() === z2.toLowerCase()) {
      console.log(`✅ [zonesMatch] Exact match: "${z1}" === "${z2}"`)
      return true
    }
    
    // ✅ Strategy 2: Extract FULL zone name after removing project code
    // For P5073: "P5073 - Parking-Side-A" -> "Parking-Side-A" (FULL zone name, not split!)
    const extractFullZoneName = (zoneStr: string, projCode: string, projFullCode: string): string => {
      let zone = zoneStr.trim()
      
      // ✅ CRITICAL: Remove project code prefix ONLY, keep the FULL zone name
      // Handle "P5073 - Parking-Side-A" -> "Parking-Side-A" (keep FULL zone name)
      if (projFullCode) {
        // Try "P5073 - " pattern first (most common format)
        const fullCodePattern1 = new RegExp(`^${projFullCode}\\s*-\\s*`, 'i')
        if (fullCodePattern1.test(zone)) {
          const extracted = zone.replace(fullCodePattern1, '').trim()
          console.log(`🔍 [extractFullZoneName] Extracted from "${zone}": "${extracted}" (removed "${projFullCode} - ")`)
          return extracted.toLowerCase().trim()
        }
        // Try "P5073 " pattern
        const fullCodePattern2 = new RegExp(`^${projFullCode}\\s+`, 'i')
        if (fullCodePattern2.test(zone)) {
          const extracted = zone.replace(fullCodePattern2, '').trim()
          console.log(`🔍 [extractFullZoneName] Extracted from "${zone}": "${extracted}" (removed "${projFullCode} ")`)
          return extracted.toLowerCase().trim()
        }
        // Try "P5073-" pattern
        const fullCodePattern3 = new RegExp(`^${projFullCode}-`, 'i')
        if (fullCodePattern3.test(zone)) {
          const extracted = zone.replace(fullCodePattern3, '').trim()
          console.log(`🔍 [extractFullZoneName] Extracted from "${zone}": "${extracted}" (removed "${projFullCode}-")`)
          return extracted.toLowerCase().trim()
        }
      }
      
      // Try with project code only
      if (projCode) {
        const codePattern1 = new RegExp(`^${projCode}\\s*-\\s*`, 'i')
        if (codePattern1.test(zone)) {
          const extracted = zone.replace(codePattern1, '').trim()
          console.log(`🔍 [extractFullZoneName] Extracted from "${zone}": "${extracted}" (removed "${projCode} - ")`)
          return extracted.toLowerCase().trim()
        }
        const codePattern2 = new RegExp(`^${projCode}\\s+`, 'i')
        if (codePattern2.test(zone)) {
          const extracted = zone.replace(codePattern2, '').trim()
          console.log(`🔍 [extractFullZoneName] Extracted from "${zone}": "${extracted}" (removed "${projCode} ")`)
          return extracted.toLowerCase().trim()
        }
        const codePattern3 = new RegExp(`^${projCode}-`, 'i')
        if (codePattern3.test(zone)) {
          const extracted = zone.replace(codePattern3, '').trim()
          console.log(`🔍 [extractFullZoneName] Extracted from "${zone}": "${extracted}" (removed "${projCode}-")`)
          return extracted.toLowerCase().trim()
        }
      }
      
      // If no project code found, return zone as-is (it's already the full zone name)
      console.log(`🔍 [extractFullZoneName] No project code found in "${zone}", using as-is`)
      return zone.toLowerCase().trim()
    }
    
    // ✅ Extract FULL zone names (e.g., "Parking-Side-A" stays as "Parking-Side-A", not split!)
    const fullZoneName1 = extractFullZoneName(z1, projectCode, projectFullCode)
    const fullZoneName2 = extractFullZoneName(z2, projectCode, projectFullCode)
    
    // ✅ Strategy 3: Compare FULL zone names after removing project code
    // This handles "P5073 - Parking-Side-A" vs "Parking-Side-A" -> both become "Parking-Side-A"
    if (fullZoneName1 && fullZoneName2 && fullZoneName1 === fullZoneName2) {
      console.log(`✅ [zonesMatch] Full zone name match: "${fullZoneName1}" === "${fullZoneName2}" (from "${z1}" and "${z2}")`)
      return true
    }
    
    // Strategy 4: Normalize both and compare (using Project Full Code first!)
    const normalized1 = normalizeZone(zone1, projectFullCode, projectCode)
    const normalized2 = normalizeZone(zone2, projectFullCode, projectCode)
    if (normalized1 && normalized2 && normalized1 === normalized2) {
      console.log(`✅ [zonesMatch] Normalized match: "${normalized1}" === "${normalized2}" (from "${z1}" and "${z2}")`)
      return true
    }
    
    console.log(`❌ [zonesMatch] No match: "${z1}" vs "${z2}" (full zone names: "${fullZoneName1}" vs "${fullZoneName2}", normalized: "${normalized1}" vs "${normalized2}")`)
    return false
  }
  
  // ============================================
  // ✅ HELPER FUNCTIONS: For calculating quantities like BOQ
  // ============================================
  
  // Helper: Check if KPI date is until yesterday
  const isKPIUntilYesterday = (kpi: any, inputType: 'planned' | 'actual'): boolean => {
    const rawKPI = (kpi as any).raw || {}
    
    // Calculate yesterday date
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(23, 59, 59, 999) // End of yesterday
    
    // Get date based on input type
    let kpiDateStr = ''
    if (inputType === 'planned') {
      kpiDateStr = rawKPI['Date'] ||
                  kpi.date ||
                  kpi.target_date || 
                  kpi.activity_date || 
                  rawKPI['Target Date'] || 
                  rawKPI['Activity Date'] ||
                  kpi['Target Date'] || 
                  kpi['Activity Date'] ||
                  kpi.created_at ||
                  ''
    } else {
      kpiDateStr = kpi.actual_date || 
                  kpi.activity_date || 
                  kpi['Actual Date'] || 
                  kpi['Activity Date'] || 
                  rawKPI['Actual Date'] || 
                  rawKPI['Activity Date'] ||
                  kpi.created_at ||
                  ''
    }
    
    // If no date, include it (assume valid)
    if (!kpiDateStr) return true
    
    try {
      const kpiDate = new Date(kpiDateStr)
      if (isNaN(kpiDate.getTime())) return true // Include if invalid date
      return kpiDate <= yesterday
    } catch {
      return true // Include if date parsing fails
    }
  }
  
  // Helper: Match KPI to activity (strict matching like BOQ)
  const kpiMatchesActivityStrict = (kpi: any, activity: BOQActivity): boolean => {
    const rawKPI = (kpi as any).raw || {}
    const projectFullCode = (selectedProject?.project_full_code || selectedProject?.project_code || '').toString().trim().toUpperCase()
    const projectCode = (selectedProject?.project_code || '').toString().trim().toUpperCase()
    
    // 1. Project Code Matching
    const kpiProjectCode = (kpi.project_code || kpi['Project Code'] || rawKPI['Project Code'] || '').toString().trim().toUpperCase()
    const kpiProjectFullCode = (kpi.project_full_code || kpi['Project Full Code'] || rawKPI['Project Full Code'] || '').toString().trim().toUpperCase()
    const activityProjectCode = (activity.project_code || '').toString().trim().toUpperCase()
    const activityProjectFullCode = (activity.project_full_code || activity.project_code || '').toString().trim().toUpperCase()
    
    let projectMatch = false
    if (activityProjectFullCode && activityProjectFullCode.includes('-')) {
      // Activity has sub-code - KPI MUST have EXACT Project Full Code match
      if (kpiProjectFullCode && kpiProjectFullCode === activityProjectFullCode) {
        projectMatch = true
      }
    } else {
      // Activity has no sub-code - Match by Project Code or Project Full Code
      projectMatch = (
        (kpiProjectCode && activityProjectCode && kpiProjectCode === activityProjectCode) ||
        (kpiProjectFullCode && activityProjectFullCode && kpiProjectFullCode === activityProjectFullCode) ||
        (kpiProjectCode && activityProjectFullCode && kpiProjectCode === activityProjectFullCode) ||
        (kpiProjectFullCode && activityProjectCode && kpiProjectFullCode === activityProjectCode)
      )
    }
    
    if (!projectMatch) return false
    
    // 2. Activity Name Matching (STRICT - exact match only, case-insensitive)
    const kpiActivityName = (kpi.activity_name || kpi['Activity Name'] || kpi.activity || rawKPI['Activity Name'] || '').toLowerCase().trim()
    const activityName = (activity.activity_name || activity.activity || '').toLowerCase().trim()
    // ✅ CRITICAL FIX: Use EXACT match only (case-insensitive) to prevent matching different activities
    const activityMatch = kpiActivityName && activityName && kpiActivityName === activityName
    if (!activityMatch) {
      console.log(`❌ [kpiMatchesActivityStrict] Activity name mismatch: KPI="${kpiActivityName}" vs Activity="${activityName}"`)
      return false
    }
    
    // 3. Zone Matching (strict) - CRITICAL FIX for P5073 and other projects
    // ✅ CRITICAL: Use Zone column ONLY, NOT Section column!
    // Zone is stored in "Zone" or "Zone Number" columns in database
    // Section is a separate field and should NOT be used for zone matching
    // ✅ IMPORTANT: Check ALL possible zone fields from database
    const kpiZoneRaw = (
      kpi['Zone'] ||           // Primary Zone column
      kpi['Zone Number'] ||    // Zone Number column
      rawKPI['Zone'] ||        // Zone from raw data
      rawKPI['Zone Number'] || // Zone Number from raw data
      kpi.zone ||              // Zone (lowercase field name)
      kpi.zone_number ||       // Zone Number (lowercase field name)
      ''                        // Default to empty
    ).toString().trim()
    
    // ✅ CRITICAL: DO NOT use Section - it's a different field!
    const kpiSection = (kpi['Section'] || kpi.section || rawKPI['Section'] || '').toString().trim()
    
    const activityZoneRaw = (activity.zone_ref || activity.zone_number || '').toString().trim()
    
    // ✅ DEBUG: Log zone values to ensure we're using Zone and not Section
    if (kpiSection && kpiSection !== '' && (!kpiZoneRaw || kpiZoneRaw === '')) {
      console.warn(`⚠️ [kpiMatchesActivityStrict] WARNING: KPI has Section="${kpiSection}" but no Zone! This KPI may be missing zone data.`, {
        kpiId: kpi.id,
        kpiActivityName: kpi['Activity Name'] || kpi.activity_name,
        kpiSection: kpiSection,
        kpiZone: kpiZoneRaw || 'NONE',
        allKpiFields: Object.keys(kpi).filter(k => k.toLowerCase().includes('zone') || k.toLowerCase().includes('section'))
      })
    }
    
    console.log(`🔍 [kpiMatchesActivityStrict] Zone matching:`, {
      kpiId: kpi.id,
      kpiZoneFromZone: kpi['Zone'] || 'NONE',
      kpiZoneFromZoneNumber: kpi['Zone Number'] || 'NONE',
      kpiZoneFromRaw: rawKPI['Zone'] || 'NONE',
      kpiZoneFromRawZoneNumber: rawKPI['Zone Number'] || 'NONE',
      kpiZoneFinal: kpiZoneRaw || 'NONE',
      kpiSection: kpiSection || 'NONE (not used for matching)',
      activityZone: activityZoneRaw || 'NONE',
      activityName: activity.activity_name
    })
    
    // ✅ CRITICAL FIX: Normalize zone values to handle edge cases
    const normalizedActivityZone = activityZoneRaw && activityZoneRaw.trim() !== '' && activityZoneRaw !== '0' && activityZoneRaw !== 'Enabling Division' ? activityZoneRaw.trim() : ''
    const normalizedKpiZone = kpiZoneRaw && kpiZoneRaw.trim() !== '' && kpiZoneRaw !== '0' && kpiZoneRaw !== 'Enabling Division' ? kpiZoneRaw.trim() : ''
    
    // ✅ CRITICAL FIX for P5073: Format activity zone for matching (same format as KPIs)
    // KPIs may have "P5073 - Parking-Side-B" format, so we need to match that
    let activityZoneForMatching = normalizedActivityZone
    if (normalizedActivityZone && projectFullCode) {
      // If activity zone doesn't include project code, format it as "P5073 - Parking-Side-B"
      if (!normalizedActivityZone.includes(projectFullCode) && !normalizedActivityZone.includes(projectCode)) {
        activityZoneForMatching = `${projectFullCode} - ${normalizedActivityZone}`
      } else {
        activityZoneForMatching = normalizedActivityZone
      }
    }
    
    // ✅ CRITICAL: If activity has zone, KPI MUST have zone and they MUST match
    if (normalizedActivityZone) {
      // Activity has zone - KPI MUST have zone and they MUST match
      if (!normalizedKpiZone) {
        // Log for debugging P5073 issue
        console.log(`❌ [kpiMatchesActivityStrict] Zone mismatch: Activity has zone="${normalizedActivityZone}" (formatted: "${activityZoneForMatching}") but KPI has no zone`, {
          activityName: activity.activity_name,
          kpiId: kpi.id,
          kpiActivityName: kpi['Activity Name'] || kpi.activity_name,
          kpiProjectFullCode: kpi['Project Full Code'] || kpi.project_full_code
        })
        return false
      }
      
      // ✅ CRITICAL: Try matching with both formats (original and formatted)
      // This handles cases where activity zone is "Parking-Side-B" and KPI zone is "P5073 - Parking-Side-B"
      const zoneMatch1 = zonesMatch(activityZoneForMatching, normalizedKpiZone, projectFullCode, projectCode)
      const zoneMatch2 = zonesMatch(normalizedActivityZone, normalizedKpiZone, projectFullCode, projectCode)
      const zoneMatch = zoneMatch1 || zoneMatch2
      
      if (!zoneMatch) {
        // Log for debugging P5073 issue
        console.log(`❌ [kpiMatchesActivityStrict] Zone mismatch: Activity zone="${normalizedActivityZone}" (formatted: "${activityZoneForMatching}") vs KPI zone="${normalizedKpiZone}"`, {
          activityName: activity.activity_name,
          kpiId: kpi.id,
          kpiActivityName: kpi['Activity Name'] || kpi.activity_name,
          projectFullCode,
          projectCode,
          match1: zoneMatch1,
          match2: zoneMatch2
        })
      } else {
        console.log(`✅ [kpiMatchesActivityStrict] Zone match: Activity zone="${normalizedActivityZone}" (formatted: "${activityZoneForMatching}") === KPI zone="${normalizedKpiZone}"`)
      }
      return zoneMatch
    }
    
    // ✅ CRITICAL: If activity has no zone but KPI has zone, exclude it
    // This ensures that activities without zone don't match KPIs with specific zones
    // This is important for P5073 where we want zone-specific filtering
    if (normalizedKpiZone) {
      // Activity has no zone but KPI has zone - exclude it (KPI belongs to specific zone, not this activity)
      console.log(`❌ [kpiMatchesActivityStrict] Zone mismatch: Activity has no zone but KPI has zone="${normalizedKpiZone}"`, {
        activityName: activity.activity_name,
        kpiId: kpi.id,
        kpiActivityName: kpi['Activity Name'] || kpi.activity_name
      })
      return false
    }
    
    // ✅ If both have no zone, accept (both are project-level, not zone-specific)
    return true
  }
  
  // Helper: Extract quantity from KPI
  const getKPIQuantity = (kpi: any): number => {
    const raw = (kpi as any).raw || {}
    const quantityStr = String(
      kpi.quantity || 
      kpi['Quantity'] || 
      kpi.Quantity ||
      raw['Quantity'] || 
      raw.Quantity ||
      '0'
    ).replace(/,/g, '').trim()
    return parseFloat(quantityStr) || 0
  }
  
  // ============================================
  // ✅ HELPER FUNCTION: Get Activity Quantities
  // Purpose: Show Done and Total for each activity BEFORE clicking
  // ✅ UPDATED: Now uses same logic as BOQ Quantities column
  // ============================================
  
  /**
   * Get Done and Total quantities for an activity
   * 
   * ✅ UPDATED LOGIC (same as BOQ Quantities column):
   * 
   * Total: From BOQ Activity (total_units or planned_units)
   * Planned: Sum of Planned KPIs until yesterday (with Zone matching) - LIKE BOQ
   * Done (Actual): Sum of Actual KPIs until yesterday (with Zone matching) - LIKE BOQ
   * 
   * Priority for Done:
   *   1. completedActivitiesData (temporary session data)
   *   2. Calculated from Actual KPIs until yesterday (filtered by Project Full Code and Zone)
   *   3. activity.actual_units (from BOQ Activity - fallback)
   * 
   * Priority for Total:
   *   1. activity.total_units (from BOQ Activity)
   *   2. activity.planned_units (fallback if total_units not available)
   * 
   * Priority for Planned (display):
   *   1. Sum of Planned KPIs until yesterday (with Zone matching) - LIKE BOQ
   *   2. activity.planned_units (fallback if no Planned KPIs)
   */
  const getActivityQuantities = (activity: BOQActivity): { done: number; total: number; planned: number; unit: string } => {
    // ✅ Calculate Total - from BOQ Activity (same as BOQ)
    const rawActivityQuantities = (activity as any).raw || {}
    let total = activity.total_units || 
                parseFloat(String(rawActivityQuantities['Total Units'] || '0').replace(/,/g, '')) || 
                activity.planned_units ||
                parseFloat(String(rawActivityQuantities['Planned Units'] || '0').replace(/,/g, '')) || 
                0
    
    // ✅ Calculate Planned: Sum of Planned KPIs until yesterday (with Zone matching) - LIKE BOQ
    let planned = 0
    if (allKPIs.length > 0) {
      const plannedKPIs = allKPIs.filter((kpi: any) => {
        const inputType = (kpi.input_type || kpi['Input Type'] || (kpi as any).raw?.['Input Type'] || '').toLowerCase()
        return inputType === 'planned'
      })
      
      const matchedPlannedKPIs = plannedKPIs.filter((kpi: any) => kpiMatchesActivityStrict(kpi, activity))
      const plannedKPIsUntilYesterday = matchedPlannedKPIs.filter((kpi: any) => isKPIUntilYesterday(kpi, 'planned'))
      planned = plannedKPIsUntilYesterday.reduce((sum: number, kpi: any) => {
        return sum + getKPIQuantity(kpi)
      }, 0)
    }
    
    // If no Planned KPIs, use planned_units from BOQ Activity as fallback
    if (planned === 0) {
      planned = parseFloat(String(activity.planned_units || '0')) || 0
    }
    
    // ✅ Calculate Done (Actual): Sum of Actual KPIs until yesterday (with Zone matching) - LIKE BOQ
    // ✅ FIX: Always calculate from database first, then add temporary session data for current activity only
    let done = 0
    
    // Step 1: Calculate from Actual KPIs in database (until yesterday)
    // ✅ CRITICAL FIX: Always calculate from database first for THIS activity only
    if (allKPIs.length > 0) {
      const actualKPIs = allKPIs.filter((kpi: any) => {
        const inputType = (kpi.input_type || kpi['Input Type'] || (kpi as any).raw?.['Input Type'] || '').toLowerCase()
        return inputType === 'actual'
      })
      
      // ✅ CRITICAL: Filter KPIs to match THIS activity only (strict matching)
      const activityZoneRaw = (activity.zone_ref || activity.zone_number || '').toString().trim()
      const normalizedActivityZone = activityZoneRaw && activityZoneRaw.trim() !== '' && activityZoneRaw !== '0' && activityZoneRaw !== 'Enabling Division' ? activityZoneRaw.trim() : ''
      
      // ✅ CRITICAL FIX for P5073: Format zone for matching (same as EnhancedQuantitySummary)
      const projectFullCode = (selectedProject?.project_full_code || selectedProject?.project_code || '').toString().trim()
      const projectCode = (selectedProject?.project_code || '').toString().trim()
      let zoneForMatching = normalizedActivityZone
      if (normalizedActivityZone && projectFullCode) {
        // Format zone as "P5073 - Parking-Side-B" for matching with KPIs
        if (!normalizedActivityZone.includes(projectFullCode) && !normalizedActivityZone.includes(projectCode)) {
          zoneForMatching = `${projectFullCode} - ${normalizedActivityZone}`
        } else {
          zoneForMatching = normalizedActivityZone
        }
      }
      
      console.log(`🔍 [getActivityQuantities] Filtering KPIs for activity: "${activity.activity_name}"`, {
        activityZone: normalizedActivityZone || 'NONE (project-level)',
        activityZoneRaw: activityZoneRaw || 'NONE',
        zoneForMatching: zoneForMatching || 'NONE',
        totalActualKPIs: actualKPIs.length,
        projectFullCode: selectedProject?.project_full_code || selectedProject?.project_code
      })
      
      const matchedActualKPIs = actualKPIs.filter((kpi: any) => {
        const matches = kpiMatchesActivityStrict(kpi, activity)
        if (!matches) {
          const kpiActivityName = (kpi.activity_name || kpi['Activity Name'] || '').toLowerCase().trim()
          const activityName = (activity.activity_name || activity.activity || '').toLowerCase().trim()
          const kpiZone = (kpi['Zone'] || kpi['Zone Number'] || '').toString().trim()
          console.log(`❌ [getActivityQuantities] KPI excluded:`, {
            kpiId: kpi.id,
            kpiActivity: kpiActivityName,
            targetActivity: activityName,
            kpiZone: kpiZone || 'NONE',
            activityZone: normalizedActivityZone || 'NONE',
            zoneForMatching: zoneForMatching || 'NONE',
            projectFullCode: kpi['Project Full Code'] || kpi.project_full_code
          })
        } else {
          // Log successful matches for debugging
          const kpiZone = (kpi['Zone'] || kpi['Zone Number'] || '').toString().trim()
          console.log(`✅ [getActivityQuantities] KPI matched:`, {
            kpiId: kpi.id,
            kpiActivity: kpi['Activity Name'] || kpi.activity_name,
            kpiZone: kpiZone || 'NONE',
            activityZone: normalizedActivityZone || 'NONE',
            quantity: getKPIQuantity(kpi)
          })
        }
        return matches
      })
      
      console.log(`📊 [getActivityQuantities] Activity: "${activity.activity_name}" (Zone: ${normalizedActivityZone || 'NONE'})`, {
        totalActualKPIs: actualKPIs.length,
        matchedActualKPIs: matchedActualKPIs.length,
        matchedKPIs: matchedActualKPIs.map((kpi: any) => ({
          id: kpi.id,
          activityName: kpi['Activity Name'] || kpi.activity_name,
          quantity: getKPIQuantity(kpi),
          projectFullCode: kpi['Project Full Code'] || kpi.project_full_code,
          zone: kpi['Zone'] || kpi['Zone Number'] || 'NONE'
        }))
      })
      
      const actualKPIsUntilYesterday = matchedActualKPIs.filter((kpi: any) => isKPIUntilYesterday(kpi, 'actual'))
      done = actualKPIsUntilYesterday.reduce((sum: number, kpi: any) => {
        const qty = getKPIQuantity(kpi)
        console.log(`  ✅ [getActivityQuantities] KPI ${kpi.id}: +${qty} (Activity: "${kpi['Activity Name'] || kpi.activity_name}")`)
        return sum + qty
      }, 0)
      
      console.log(`📊 [getActivityQuantities] Activity: "${activity.activity_name}" - Done from DB: ${done} (from ${actualKPIsUntilYesterday.length} KPIs)`)
    } else {
      // Fallback to cached actualQuantities or activity.actual_units
      done = actualQuantities.get(activity.id) ?? 0
      if (done === 0) {
        done = parseFloat(String(activity.actual_units || '0')) || 0
      }
    }
    
    // Step 2: Add temporary session data for THIS activity only (if exists and not yet saved)
    // ✅ CRITICAL FIX: Only add quantity from completedActivitiesData for the current activity
    // This represents a new entry that hasn't been saved to database yet
    const completedData = completedActivitiesData.get(activity.id)
    if (completedData && completedData['Quantity']) {
      const tempQuantity = parseFloat(String(completedData['Quantity'])) || 0
      // ✅ Add tempQuantity to done for preview (this is a new entry for today)
      // The tempQuantity is for the current session and hasn't been saved yet
      if (tempQuantity > 0) {
        const doneBefore = done
        done = done + tempQuantity
        console.log(`📊 [${activity.activity_name}] Adding temp quantity: ${tempQuantity} (${doneBefore} + ${tempQuantity} = ${done})`)
      }
    }
    
    return {
      done,
      total,
      planned,
      unit: activity.unit || ''
    }
  }
  
  // ============================================
  // ✅ CALCULATE ACTUAL UNITS (DONE) FROM DATABASE
  // Total comes directly from BOQ Activity (planned_units or total_units)
  // ============================================
  
  /**
   * Calculate Actual Units (Done) from KPIs in database
   * Falls back to activity.actual_units if no KPIs found
   */
  useEffect(() => {
    const calculateActualUnits = async () => {
      if (!selectedProject || projectActivities.length === 0) {
        setActualQuantities(new Map())
        return
      }
      
      const actualUnitsMap = new Map<string, number>()
      const projectFullCode = (selectedProject.project_full_code || selectedProject.project_code || '').toString().trim().toUpperCase()
      const projectCode = (selectedProject.project_code || '').toString().trim().toUpperCase()
      
      try {
        const { getSupabaseClient, executeQuery } = await import('@/lib/simpleConnectionManager')
        const { TABLES } = await import('@/lib/supabase')
        const supabase = getSupabaseClient()
        
        for (const activity of projectActivities) {
          const activityName = (activity.activity_name || activity.activity || '').toLowerCase().trim()
          const activityZoneRaw = (activity.zone_ref || activity.zone_number || '').toString().trim()
          // ✅ CRITICAL: Use Project Full Code for zone normalization
          const normalizedZone = normalizeZone(activityZoneRaw, projectFullCode, projectCode)
          const zoneNumber = extractZoneNumber(normalizedZone)
          
          // ✅ Fetch Actual KPIs - MUST match Project Full Code exactly
          let query = supabase
            .from(TABLES.KPI)
            .select('id, "Quantity", "Input Type", "Zone", "Zone Number", "Activity Name", "Project Full Code", "Project Code"')
            .eq('Input Type', 'Actual')
          
          // ✅ CRITICAL: Filter by Project Full Code ONLY (exact match required)
          if (projectFullCode) {
            query = query.eq('Project Full Code', projectFullCode)
          }
          
          const result = await executeQuery(async () => query)
          let actualKPIs = result.data || []
          
          // ✅ CRITICAL: Client-side filter to ensure exact Project Full Code match
          // NO fallback to Project Code - each project with different sub-code is SEPARATE
          if (projectFullCode) {
            const targetFullCode = projectFullCode.toString().trim().toUpperCase()
            actualKPIs = actualKPIs.filter((kpi: any) => {
              const kpiFullCode = (kpi['Project Full Code'] || '').toString().trim().toUpperCase()
              // ✅ MUST match Project Full Code exactly - no fallback to Project Code
              return kpiFullCode === targetFullCode
            })
          }
          
          // ✅ CRITICAL FIX: Use EXACT same logic as getActivityQuantities and kpiMatchesActivityStrict
          // Filter by Activity Name (STRICT - exact match only, case-insensitive)
          actualKPIs = actualKPIs.filter((kpi: any) => {
            // 1. Project Match (already filtered by Project Full Code above, but verify)
            const kpiFullCode = (kpi['Project Full Code'] || '').toString().trim().toUpperCase()
            if (kpiFullCode !== projectFullCode) {
              return false
            }
            
            // 2. Activity Name Match (STRICT - exact match only, case-insensitive)
            const kpiActivityName = (kpi['Activity Name'] || kpi.activity_name || '').toLowerCase().trim()
            const activityNameMatch = kpiActivityName && activityName && kpiActivityName === activityName
            if (!activityNameMatch) {
              return false
            }
            
            // 3. Zone Match (STRICT - must match exactly)
            const kpiZoneRaw = (kpi['Zone'] || kpi['Zone Number'] || '').toString().trim()
            const normalizedActivityZone = activityZoneRaw && activityZoneRaw.trim() !== '' && activityZoneRaw !== '0' && activityZoneRaw !== 'Enabling Division' ? activityZoneRaw.trim() : ''
            const normalizedKpiZone = kpiZoneRaw && kpiZoneRaw.trim() !== '' && kpiZoneRaw !== '0' && kpiZoneRaw !== 'Enabling Division' ? kpiZoneRaw.trim() : ''
            
            // ✅ CRITICAL: If activity has zone, KPI MUST have zone and they MUST match
            if (normalizedActivityZone) {
              if (!normalizedKpiZone) {
                // Activity has zone but KPI has no zone - exclude it
                return false
              }
              
              // ✅ Format activity zone for matching (same as getActivityQuantities)
              let activityZoneForMatching = normalizedActivityZone
              if (!normalizedActivityZone.includes(projectFullCode) && !normalizedActivityZone.includes(projectCode)) {
                activityZoneForMatching = `${projectFullCode} - ${normalizedActivityZone}`
              }
              
              // ✅ Try matching with both formats (original and formatted)
              const zoneMatch1 = zonesMatch(activityZoneForMatching, normalizedKpiZone, projectFullCode, projectCode)
              const zoneMatch2 = zonesMatch(normalizedActivityZone, normalizedKpiZone, projectFullCode, projectCode)
              if (!zoneMatch1 && !zoneMatch2) {
                return false
              }
            } else {
              // ✅ If activity has no zone but KPI has zone, exclude it
              if (normalizedKpiZone) {
                return false
              }
            }
            
            return true
          })
          
          // Calculate total actual quantity (Done)
          const totalActual = actualKPIs.reduce((sum: number, kpi: any) => {
            const qty = parseFloat(String(kpi['Quantity'] || '0').replace(/,/g, '')) || 0
            return sum + qty
          }, 0)
          
          actualUnitsMap.set(activity.id, totalActual)
        }
        
        setActualQuantities(actualUnitsMap)
      } catch (err: any) {
        console.error('❌ Error calculating actual units:', err)
      }
    }
    
    calculateActualUnits()
  }, [selectedProject, projectActivities])

  // ✅ Fetch all KPIs (Planned and Actual) for calculating quantities like BOQ
  useEffect(() => {
    const fetchAllKPIs = async () => {
      if (!selectedProject) {
        setAllKPIs([])
        return
      }
      
      const projectFullCode = (selectedProject.project_full_code || selectedProject.project_code || '').toString().trim().toUpperCase()
      
      try {
        const { getSupabaseClient, executeQuery } = await import('@/lib/simpleConnectionManager')
        const { TABLES } = await import('@/lib/supabase')
        const supabase = getSupabaseClient()
        
        // Fetch all KPIs (Planned and Actual) for this project
        let query = supabase
          .from(TABLES.KPI)
          .select('id, "Quantity", "Input Type", "Zone", "Zone Number", "Activity Name", "Project Full Code", "Project Code", "Date", "Target Date", "Activity Date", "Actual Date", created_at, input_type, quantity, date, target_date, activity_date, actual_date, project_code, project_full_code, activity_name')
        
        // Filter by Project Full Code if available
        if (projectFullCode) {
          query = query.eq('Project Full Code', projectFullCode)
        }
        
        const result = await executeQuery(async () => query)
        let allKPIsData = result.data || []
        
        // Client-side filter to ensure exact Project Full Code match
        if (projectFullCode) {
          const targetFullCode = projectFullCode.toString().trim().toUpperCase()
          allKPIsData = allKPIsData.filter((kpi: any) => {
            const kpiFullCode = (kpi['Project Full Code'] || '').toString().trim().toUpperCase()
            return kpiFullCode === targetFullCode
          })
        }
        
        setAllKPIs(allKPIsData)
        console.log(`✅ Fetched ${allKPIsData.length} KPIs for project ${projectFullCode}`)
      } catch (err: any) {
        console.error('❌ Error fetching all KPIs:', err)
        setAllKPIs([])
      }
    }
    
    fetchAllKPIs()
  }, [selectedProject])

  // Auto-fill form when activity is selected
  useEffect(() => {
    if (selectedActivity) {
      console.log('🧠 Smart Form: Activity selected:', selectedActivity.activity_name)
      
      // Auto-fill unit
      if (selectedActivity.unit) {
        setUnit(selectedActivity.unit)
      }
      
      
      // Auto-fill daily rate and calculate quantity
      if (selectedActivity.productivity_daily_rate && selectedActivity.productivity_daily_rate > 0) {
        setDailyRate(selectedActivity.productivity_daily_rate)
        setQuantity(selectedActivity.productivity_daily_rate.toString())
        setIsAutoCalculated(true)
      } else {
        setDailyRate(0)
        setQuantity('')
        setIsAutoCalculated(false)
      }
      
      // Auto-fill drilled meters if available
      if (selectedActivity.total_drilling_meters) {
        setDrilledMeters(selectedActivity.total_drilling_meters.toString())
      }
      
      // Use global date for all activities
      if (globalDate) {
        setActualDate(globalDate)
      }
      
      console.log('✅ Smart Form: Form auto-filled for activity')
    }
  }, [selectedActivity, globalDate])
  
  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project)
    setShowProjectDropdown(false)
    setProjectSearchTerm('')
    console.log('✅ Project selected:', project.project_name)
  }

  const handleActivitySelect = (activity: BOQActivity) => {
    console.log('🔍 handleActivitySelect called with:', activity.activity_name)
    setSelectedActivity(activity)
    setSection('') // ✅ Section is separate from Zone - leave empty for user input
    setUnit(activity.unit || '') // ✅ Auto-fill Unit from activity
    setCurrentStep('form')
    setCurrentActivityIndex(projectActivities.findIndex(a => a.id === activity.id))
    console.log('✅ Activity selected:', activity.activity_name, 'Current step set to:', 'form')
  }

  const handleEditCompletedActivity = (activity: BOQActivity) => {
    console.log('🔧 Editing completed activity:', activity.activity_name)
    setSelectedActivity(activity)
    
    // ✅ Load saved data if available, otherwise use activity defaults
    const savedData = completedActivitiesData.get(activity.id)
    setSection(savedData?.['Section'] || savedData?.section || '') // ✅ Section is separate from Zone
    setUnit(savedData?.['Unit'] || savedData?.unit || activity.unit || '')
    setQuantity(savedData?.['Quantity'] || savedData?.quantity || '')
    setDrilledMeters(savedData?.['Drilled Meters'] || savedData?.drilled_meters || '')
    
    setCurrentStep('form')
    setCurrentActivityIndex(projectActivities.findIndex(a => a.id === activity.id))
    // Remove from completed activities to allow re-editing
    setCompletedActivities(prev => {
      const newSet = new Set(Array.from(prev))
      newSet.delete(activity.id)
      return newSet
    })
  }

  const handleNextActivity = () => {
    const nextIndex = currentActivityIndex + 1
    if (nextIndex < projectActivities.length) {
      const nextActivity = projectActivities[nextIndex]
      setCurrentActivityIndex(nextIndex)
      setSelectedActivity(nextActivity)
      setSection('') // ✅ Section is separate from Zone - leave empty for user input
      setUnit(nextActivity.unit || '') // ✅ Auto-fill Unit from activity
    }
  }

  const getCurrentActivity = () => {
    return projectActivities[currentActivityIndex]
  }

  const getProgressPercentage = () => {
    return Math.round((completedActivities.size / projectActivities.length) * 100)
  }

  const getRemainingActivities = () => {
    return projectActivities.filter(activity => !completedActivities.has(activity.id))
  }

  // Filter activities based on search and filters
  const getFilteredActivities = () => {
    let filtered = projectActivities

    // Search filter
    if (activitySearchTerm) {
      filtered = filtered.filter(activity =>
        activity.activity_name?.toLowerCase().includes(activitySearchTerm.toLowerCase()) ||
        activity.activity?.toLowerCase().includes(activitySearchTerm.toLowerCase()) ||
        activity.activity_division?.toLowerCase().includes(activitySearchTerm.toLowerCase())
      )
    }

    // Zone filter - use selectedZones (Set) to filter by zone_ref
    if (selectedZones.size > 0) {
      filtered = filtered.filter(activity => {
        // Get activity zone - prefer zone_ref, fallback to zone_number or project code
        let activityZone = (activity.zone_ref || '').toString().trim()
        if (!activityZone || activityZone === '0' || activityZone === 'Enabling Division') {
          activityZone = (activity.zone_number || '').toString().trim()
        }
        if (!activityZone || activityZone === '0') {
          // If no zone, create a default zone based on project code
          activityZone = selectedProject ? `${selectedProject.project_code} - 0` : '0'
        }
        
        // Check if activity's zone matches any of the selected zones
        const matches = Array.from(selectedZones).some(selectedZone => {
          const selectedZoneStr = selectedZone.toString().trim()
          
          // Exact match
          if (activityZone === selectedZoneStr) return true
          
          // Contains match (for old data formats like "P5095 - 0")
          if (activityZone.includes(selectedZoneStr)) return true
          if (selectedZoneStr.includes(activityZone)) return true
          
          // Special case: if selected zone is "P5095 - 0" and activity zone is "0", match if project code matches
          if (selectedZoneStr.includes(' - ') && (activityZone === '0' || !activityZone || activityZone === '')) {
            const projectCodeFromZone = selectedZoneStr.split(' - ')[0]
            if (activity.project_code === projectCodeFromZone) return true
          }
          
          // Special case: if activity zone is "P5095 - 0" format and selected is just the zone part
          if (activityZone.includes(' - ') && !selectedZoneStr.includes(' - ')) {
            const zonePart = activityZone.split(' - ')[1]
            if (zonePart === selectedZoneStr || selectedZoneStr === '0') return true
          }
          
          // Special case: if selected zone is "P5095 - 0" and activity has zone_ref matching the format
          if (selectedZoneStr.includes(' - ')) {
            const [projectFromSelected, zoneFromSelected] = selectedZoneStr.split(' - ')
            const activityZoneRef = (activity.zone_ref || '').toString().trim()
            const activityZoneNum = (activity.zone_number || '').toString().trim()
            
            // Match if activity zone_ref equals zone part and project matches
            if (activity.project_code === projectFromSelected) {
              if (activityZoneRef === zoneFromSelected) return true
              if (activityZoneNum === zoneFromSelected) return true
              if ((!activityZoneRef || activityZoneRef === '0') && zoneFromSelected === '0') return true
            }
          }
          
          return false
        })
        
        return matches
      })
      console.log(`🔍 Filtered activities by zones:`, {
        selectedZones: Array.from(selectedZones),
        beforeFilter: projectActivities.length,
        afterFilter: filtered.length,
        sampleActivities: filtered.slice(0, 3).map(a => ({
          name: a.activity_name,
          zone_ref: a.zone_ref,
          zone_number: a.zone_number,
          project_code: a.project_code
        }))
      })
    }

    // Status filter
    if (selectedStatus !== 'all') {
      if (selectedStatus === 'completed') {
        filtered = filtered.filter(activity => completedActivities.has(activity.id))
      } else if (selectedStatus === 'pending') {
        filtered = filtered.filter(activity => !completedActivities.has(activity.id))
      } else if (selectedStatus === 'current') {
        filtered = filtered.filter(activity => projectActivities.findIndex(a => a.id === activity.id) === currentActivityIndex)
      }
    }

    return filtered
  }

  // Get unique zones from activities (filter out Enabling Division and empty values)
  const getUniqueZones = () => {
    if (!selectedProject) return []
    
    // ✅ Use project_full_code for Zone formatting (same as saving)
    const projectFullCode = selectedProject.project_full_code || selectedProject.project_code || ''
    
    const zones = projectActivities
      .map(activity => {
        // Prefer zone_ref, fallback to zone_number if zone_ref is empty or "0"
        const zoneRef = (activity.zone_ref || '').toString().trim()
        const zoneNumber = (activity.zone_number || '').toString().trim()
        
        // ✅ Format Zone as: full code + zone (e.g., "P8888-P-01-0")
        let formattedZone = ''
        
        // If zone_ref exists and is valid, use it
        if (zoneRef && zoneRef !== '0' && zoneRef !== 'Enabling Division') {
          // If zone_ref already contains project code, use it as is
          if (zoneRef.includes(projectFullCode)) {
            formattedZone = zoneRef
          } else if (projectFullCode) {
            // Otherwise, format as: full code + zone
            formattedZone = `${projectFullCode}-${zoneRef}`
          } else {
            formattedZone = zoneRef
          }
        } else if (zoneNumber && zoneNumber !== '0') {
          // If zone_number exists and is valid, combine with project full code
          if (projectFullCode) {
            formattedZone = `${projectFullCode}-${zoneNumber}`
          } else {
            formattedZone = zoneNumber
          }
        } else if (projectFullCode) {
          // If both are empty or "0", create default zone with project full code
          formattedZone = `${projectFullCode}-0`
        }
        
        return formattedZone
      })
      .filter(zone => zone && zone !== 'Enabling Division' && zone !== '0' && zone !== '')
    
    // Remove duplicates and sort
    return Array.from(new Set(zones)).sort()
  }

  const handleWorkTodayQuestion = (activityId: string, hasWork: boolean) => {
    console.log('🔍 handleWorkTodayQuestion called:', { activityId, hasWork })
    
    const activity = projectActivities.find(a => a.id === activityId)
    if (!activity) {
      console.error('❌ Activity not found:', activityId)
      return
    }
    
    // Update the activity status
    setProjectActivities(prev => 
      prev.map(act => 
        act.id === activityId 
          ? { ...act, hasWorkToday: hasWork }
          : act
      )
    )

    if (hasWork) {
      console.log('✅ User said YES - showing form for activity:', activityId)
      // If user says yes, show the form for this activity
      console.log('📝 Found activity, calling handleActivitySelect:', activity.activity_name)
      handleActivitySelect(activity)
    } else {
      console.log('❌ User said NO - marking as completed without data:', activityId)
      
      // Use global date if available
      const finalDate = globalDate || new Date().toISOString().split('T')[0]
      
      // Store "not worked on" data in completedActivitiesData
      const notWorkedData: any = {
        'Project Full Code': selectedProject?.project_full_code || selectedProject?.project_code || '',
        'Project Code': selectedProject?.project_code || '',
        'Project Sub Code': selectedProject?.project_sub_code || '',
        'Activity Name': activity.activity_name || '',
        'Quantity': '0',
        'Unit': activity.unit || '',
        'Input Type': 'Actual',
        'Actual Date': finalDate,
        'Activity Date': finalDate,
        'Target Date': finalDate || '',
        'Drilled Meters': '0',
        'Section': '', // ✅ Section is completely separate from Zone - leave empty
        'Zone': activity.zone_ref || '', // ✅ Zone comes from activity.zone_ref
        'Zone Number': activity.zone_number || '', // ✅ Zone Number comes from activity.zone_number
        'Recorded By': 'Engineer',
        'hasWorked': false, // Flag to indicate this activity was not worked on
        'notWorkedOn': true // Additional flag for clarity
      }
      
      // Store in completedActivitiesData
      setCompletedActivitiesData(prev => {
        const newMap = new Map(prev)
        newMap.set(activityId, notWorkedData)
        return newMap
      })
      
      // Mark as reported (even though no work was done)
      setCompletedActivities(prev => new Set([...Array.from(prev), activityId]))
      
      // Go back to activities list
      setCurrentStep('activities')
    }
  }

  const handleFormSubmit = async (formData: any) => {
    setLoading(true)
    setError('')
    
    try {
      console.log('📝 Saving KPI data temporarily:', formData)
      
      // ✅ VALIDATE: Check quantity before saving
      const quantityValue = parseFloat(formData.quantity || '0')
      if (isNaN(quantityValue) || quantityValue <= 0) {
        throw new Error('Quantity must be greater than 0')
      }
      
      // Use global date if available, otherwise use actualDate
      const finalDate = globalDate || actualDate
      
      // Prepare the final data with the correct date and structure
      // ✅ Calculate Day from Activity Date (same format as Planned KPIs)
      let dayValue = ''
      if (finalDate) {
        try {
          const date = new Date(finalDate)
          if (!isNaN(date.getTime())) {
            const weekday = date.toLocaleDateString('en-US', { weekday: 'long' })
            // For Actual KPIs, we use the date itself as Day reference
            dayValue = `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${weekday}`
          }
        } catch (e) {
          console.warn('⚠️ Could not calculate Day from date:', finalDate)
        }
      }
      
      // ✅ Only include columns that exist in the unified KPI table
      // ✅ MATCH Planned KPIs structure exactly (same columns, same format)
      const finalFormData: any = {
        'Project Full Code': selectedProject?.project_full_code || selectedProject?.project_code || formData.project_code || formData.project_full_code,
        'Project Code': selectedProject?.project_code || formData.project_code,
        'Project Sub Code': selectedProject?.project_sub_code || '',
        'Activity Name': selectedActivity?.activity_name || formData.activity_name,
        'Activity Division': selectedActivity?.activity_division || formData.activity_division || '', // ✅ Division field
        'Activity Timing': selectedActivity?.activity_timing || 'post-commencement', // ✅ Activity Timing field (same as Planned)
        'Quantity': quantityValue.toString(), // Use validated quantity
        'Unit': formData.unit || selectedActivity?.unit || '',
        'Input Type': 'Actual',
        'Actual Date': finalDate,
        'Activity Date': finalDate,
        'Target Date': finalDate || '', // ✅ Include Target Date (same as Planned)
        'Day': dayValue, // ✅ Calculate Day from Activity Date (same format as Planned)
        'Drilled Meters': formData.drilled_meters?.toString() || '0',
        // ✅ Section, Zone, and Zone Number are separate fields
        'Section': section || '', // ✅ Section is user input, completely separate from Zone
        // ✅ Format Zone as: full code + zone (e.g., "P8888-P-01-0")
        'Zone': (() => {
          const projectFullCode = selectedProject?.project_full_code || selectedProject?.project_code || formData.project_code || formData.project_full_code || ''
          const activityZone = selectedActivity?.zone_ref || selectedActivity?.zone_number || ''
          if (activityZone && projectFullCode) {
            // If zone already contains project code, use it as is
            if (activityZone.includes(projectFullCode)) {
              return activityZone
            }
            // Otherwise, format as: full code + zone
            return `${projectFullCode}-${activityZone}`
          }
          return activityZone || ''
        })(),
        'Zone Number': selectedActivity?.zone_number || '', // ✅ Zone Number comes from activity.zone_number
        'Recorded By': formData.recorded_by || '',
        // ✅ Add flags to track if this was worked on
        'hasWorked': true, // This form is only for activities that were worked on
        'notWorkedOn': false
      }
      
      // ✅ Calculate Value from Quantity × Rate if available
      if (selectedActivity) {
        let rate = 0
        if (selectedActivity.rate && selectedActivity.rate > 0) {
          rate = selectedActivity.rate
        } else if (selectedActivity.total_value && selectedActivity.total_units && selectedActivity.total_units > 0) {
          rate = selectedActivity.total_value / selectedActivity.total_units
        }
        
        if (rate > 0) {
          const quantity = parseFloat(formData.quantity || '0')
          const calculatedValue = quantity * rate
          finalFormData['Value'] = calculatedValue.toString()
          console.log(`💰 Calculated Value: ${quantity} × ${rate} = ${calculatedValue}`)
        } else {
          // ✅ If no rate, use quantity as Value (same as Planned KPIs fallback)
          finalFormData['Value'] = quantityValue.toString()
        }
      } else {
        // ✅ If no activity, use quantity as Value (same as Planned KPIs fallback)
        finalFormData['Value'] = quantityValue.toString()
      }
      
      console.log('📅 Using date for all activities:', finalDate)
      
      // Store data temporarily instead of submitting
      setCompletedActivitiesData(prev => {
        const newMap = new Map(prev)
        newMap.set(selectedActivity!.id, finalFormData)
        return newMap
      })
      
      // Mark activity as reported
      setCompletedActivities(prev => new Set([...Array.from(prev), selectedActivity!.id]))
      
      // Check if all activities are reported
      const isLastActivity = currentActivityIndex + 1 >= projectActivities.length
      if (isLastActivity) {
        setSuccess('🎉 All activities reported! Redirecting to preview...')
      } else {
        setSuccess('KPI data saved temporarily!')
      }
      
      // Auto-advance to next activity or show preview
      const nextIndex = currentActivityIndex + 1
      if (nextIndex < projectActivities.length) {
        handleNextActivity()
      } else {
        // All activities reported, show preview automatically
        setTimeout(() => {
          setShowPreview(true)
          setCurrentStep('activities')
        }, 1500) // Wait 1.5 seconds to show success message first
      }
      
    } catch (err) {
      console.error('❌ Error saving KPI data:', err)
      setError('Failed to save KPI data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Update global date
  const handleDateUpdate = (newDate: string) => {
    setGlobalDate(newDate)
    setActualDate(newDate)
    setIsEditingDate(false)
    setSuccess('Date updated successfully!')
  }

  // Submit all completed activities
  const handleSubmitAllActivities = async () => {
    // Prevent duplicate submissions
    if (isSubmitting || hasSubmitted) {
      setError('Please wait, submission is already in progress or completed.')
      return
    }
    
    setIsSubmitting(true)
    setLoading(true)
    setError('')
    
    // Show initial success message
    setSuccess('🚀 Starting to submit all activities to database...')
    
    try {
      const allActivitiesBeforeFilter = Array.from(completedActivitiesData.values())
      console.log('📤 All activities before filtering:', allActivitiesBeforeFilter.length)
      console.log('📤 Raw data:', JSON.stringify(allActivitiesBeforeFilter, null, 2))
      
      // Convert Map to Array and filter out activities that were not worked on
      const allData = allActivitiesBeforeFilter.filter((data: any) => {
        // STRICT FILTERING - Exclude if ANY of these conditions are true
        
        // 1. Check flags first
        const notWorkedOnFlag = data.notWorkedOn === true
        const hasWorkedFalse = data.hasWorked === false
        const isNotWorkedOn = notWorkedOnFlag || hasWorkedFalse
        
        // 2. Get quantity in all possible formats
        const quantityRaw = data['Quantity'] ?? data.quantity ?? '0'
        const quantityStr = String(quantityRaw).trim()
        const quantity = parseFloat(quantityStr)
        
        // 3. Check quantity - be EXTREMELY strict
        const isZero = quantity === 0
        const isZeroString = quantityStr === '0'
        const isEmpty = quantityStr === ''
        const isNaN = Number.isNaN(quantity)
        const isNull = quantityRaw === null || quantity === null
        const isUndefined = quantityRaw === undefined || quantity === undefined
        
        const hasZeroQuantity = isZero || isZeroString || isEmpty || isNaN || isNull || isUndefined
        
        // 4. Final exclusion decision
        const shouldExclude = isNotWorkedOn || hasZeroQuantity
        
        if (shouldExclude) {
          console.log('⏭️ ❌ EXCLUDING activity from submission:', {
            name: data['Activity Name'] || data.activity_name,
            reason: isNotWorkedOn ? 'marked as not worked on' : 'has zero quantity',
            quantity: quantity,
            quantityRaw: quantityRaw,
            quantityStr: quantityStr,
            notWorkedOn: data.notWorkedOn,
            hasWorked: data.hasWorked,
            fullData: data
          })
        } else {
          console.log('✅ INCLUDING activity in submission:', {
            name: data['Activity Name'] || data.activity_name,
            quantity: quantity,
            quantityRaw: quantityRaw,
            quantityStr: quantityStr
          })
        }
        
        return !shouldExclude
      })
      
      if (allData.length === 0) {
        setError('No activities to submit. Please complete some activities first.')
        setIsSubmitting(false)
        return
      }
      
      console.log(`✅ Filtered to ${allData.length} activities to submit (excluding ${Array.from(completedActivitiesData.values()).length - allData.length} not worked on)`)
      
      // Submit all data at once - with final validation before each submit
      for (let i = 0; i < allData.length; i++) {
        const activityData = allData[i]
        
        // Final validation - double check before submitting
        const finalQuantityRaw = activityData['Quantity'] ?? activityData.quantity ?? '0'
        const finalQuantityStr = String(finalQuantityRaw).trim()
        const finalQuantity = parseFloat(finalQuantityStr)
        const isNotWorkedOn = activityData.notWorkedOn === true || activityData.hasWorked === false
        const hasZeroQty = isNaN(finalQuantity) || finalQuantity === 0 || finalQuantityStr === '0' || finalQuantityStr === ''
        
        console.log('🔍 Validating activity before submit:', {
          name: activityData['Activity Name'] || activityData.activity_name,
          quantity: finalQuantity,
          quantityRaw: finalQuantityRaw,
          quantityStr: finalQuantityStr,
          notWorkedOn: activityData.notWorkedOn,
          hasWorked: activityData.hasWorked,
          isNotWorkedOn: isNotWorkedOn,
          hasZeroQty: hasZeroQty,
          fullDataKeys: Object.keys(activityData)
        })
        
        if (isNotWorkedOn || hasZeroQty) {
          console.error('🚫 BLOCKED: Attempted to submit activity that should be excluded:', {
            name: activityData['Activity Name'] || activityData.activity_name,
            quantity: finalQuantity,
            quantityRaw: finalQuantityRaw,
            quantityStr: finalQuantityStr,
            notWorkedOn: isNotWorkedOn,
            hasZeroQty: hasZeroQty,
            fullData: activityData
          })
          // Skip this activity - do NOT submit it
          alert(`⚠️ Skipping activity: ${activityData['Activity Name'] || activityData.activity_name}\nReason: ${isNotWorkedOn ? 'Not worked on' : 'Zero quantity'}`)
          continue
        }
        
        console.log('🚀 ✅ APPROVED: Submitting activity:', {
          name: activityData['Activity Name'] || activityData.activity_name,
          quantity: finalQuantity,
          quantityRaw: finalQuantityRaw,
          quantityStr: finalQuantityStr
        })
        
        await onSubmit(activityData)
        
        // Show progress message
        if (i < allData.length - 1) {
          setSuccess(`📤 Saving activity ${i + 1} of ${allData.length} to database...`)
        }
      }
      
      // Mark as submitted to prevent duplicate submissions
      setHasSubmitted(true)
      
      setSuccess('🎉 All KPI data successfully saved to database! All activities have been recorded and stored permanently.')
      
      // Close the form after showing success message
      setTimeout(() => {
        onCancel()
      }, 4000) // Increased timeout to show success message longer
      
    } catch (err) {
      console.error('❌ Error submitting all activities to database:', err)
      setError('Failed to save activities to database. Please try again.')
      setIsSubmitting(false) // Reset on error to allow retry
    } finally {
      setLoading(false)
    }
  }

  // Project Selection Step
  if (currentStep === 'project') {
    const filteredProjects = projects.filter(project => {
      const searchTerm = projectSearchTerm.toLowerCase().trim()
      if (!searchTerm) return true
      
      // ✅ FIX: Use project_full_code from database if available
      const projectFullCode = project.project_full_code || `${project.project_code || ''}${project.project_sub_code || ''}`.trim()
      const projectCode = (project.project_code || '').toLowerCase().trim()
      const projectSubCode = (project.project_sub_code || '').toLowerCase().trim()
      const projectFullCodeLower = projectFullCode.toLowerCase()
      
      // Search in project name
      const matchesName = project.project_name?.toLowerCase().includes(searchTerm)
      
      // Search in project code (most important - to find all projects with same code)
      const matchesCode = projectCode.includes(searchTerm)
      
      // Search in project sub code
      const matchesSubCode = projectSubCode.includes(searchTerm)
      
      // Search in project full code (from database)
      const matchesFullCode = projectFullCodeLower.includes(searchTerm)
      
      // Search in location (if exists)
      const matchesLocation = (project as any).location?.toLowerCase().includes(searchTerm)
      
      // Also search for combined code (e.g., "P5066-I1" or "P5066 R1")
      const combinedCode1 = projectSubCode ? `${projectCode}-${projectSubCode}` : projectCode
      const combinedCode2 = projectSubCode ? `${projectCode} ${projectSubCode}` : projectCode
      const matchesCombined1 = combinedCode1.includes(searchTerm)
      const matchesCombined2 = combinedCode2.includes(searchTerm)
      
      // ✅ CRITICAL: If searching for just the code (e.g., "5066" or "p5066"), show ALL projects with that code
      // This ensures all variants (P5066-I1, P5066-R1, etc.) are shown
      const isCodeSearch = searchTerm === projectCode || 
                          searchTerm === projectCode.replace('p', '') || 
                          projectCode.includes(searchTerm.replace('p', ''))
      
      return matchesName || matchesCode || matchesSubCode || matchesFullCode || matchesLocation || matchesCombined1 || matchesCombined2 || isCodeSearch
    })

    return (
      <div className="smart-kpi-form w-full max-w-4xl mx-auto px-2 sm:px-4">
        <ModernCard className="w-full">
          <div className="p-4 sm:p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <Building className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Smart KPI Form
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Select a project to start recording KPI data
                  </p>
                </div>
              </div>
              <button
                onClick={onCancel}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Global Date Selection */}
            <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg border border-green-200 dark:border-green-700">
              <div className="flex items-center gap-3 mb-3">
                <Calendar className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Set Date for All Activities
                </h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Choose the date that will be applied to all activities in this session
              </p>
              <div className="flex items-center gap-4">
                <input
                  type="date"
                  value={globalDate}
                  onChange={(e) => setGlobalDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                />
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {globalDate ? new Date(globalDate).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  }) : 'No date selected'}
                </div>
              </div>
            </div>

            {/* Project Selection */}
            <div className="space-y-4">
              <div className="relative project-dropdown-container">
                <Button
                  variant="outline"
                  className="w-full justify-between text-left"
                  onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                >
                  <span className="flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    {selectedProject ? selectedProject.project_name : 'Select a project...'}
                  </span>
                  <span className="text-gray-400">▼</span>
                </Button>

                {showProjectDropdown && (
                  <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                    <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                      <input
                        type="text"
                        placeholder="Search by name, code, or sub code..."
                        value={projectSearchTerm}
                        onChange={(e) => setProjectSearchTerm(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div className="py-2">
                      {filteredProjects.length > 0 ? (
                        filteredProjects.map((project) => (
                          <button
                            key={project.id}
                            onClick={() => handleProjectSelect(project)}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            <div className="font-medium text-gray-900 dark:text-white">
                              {project.project_name}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              <span className="font-medium">{project.project_full_code || project.project_code}</span>
                              {((project as any).location) && (
                                <span className="ml-2 text-gray-500 dark:text-gray-500">
                                  • {(project as any).location}
                                </span>
                              )}
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-gray-500 dark:text-gray-400 text-center">
                          No projects found
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ModernCard>
      </div>
    )
  }
  
  // Activities Step - New Sidebar Design
  if (currentStep === 'activities') {
    const progressPercentage = getProgressPercentage()
    const remainingActivities = getRemainingActivities()
    
    return (
      <div className="smart-kpi-form w-full max-w-6xl mx-auto px-2 sm:px-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:gap-4">
          {/* Sidebar - Activities List */}
          <div className="w-full lg:w-[38%] lg:min-w-[350px]">
            <ModernCard className="w-full h-fit">
              <div className="p-4 sm:p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <Activity className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                        Activities
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {projectActivities.length} activities
                      </p>
                      {selectedProject && (
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          Project: <span className="font-medium">{selectedProject.project_full_code || selectedProject.project_code}</span>
                          {selectedProject.project_name && (
                            <span className="ml-2">• {selectedProject.project_name}</span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={onCancel}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Progress: {completedActivities.size} / {projectActivities.length}
                    </span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {progressPercentage}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Global Date Display */}
                {globalDate && (
                  <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg border border-green-200 dark:border-green-700">
                    {isEditingDate ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <Calendar className="w-5 h-5 text-green-600" />
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                            Edit Work Date
                          </h3>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="date"
                            value={globalDate}
                            onChange={(e) => setGlobalDate(e.target.value)}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                          />
                          <Button
                            onClick={() => handleDateUpdate(globalDate)}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Save
                          </Button>
                          <Button
                            onClick={() => setIsEditingDate(false)}
                            size="sm"
                            variant="outline"
                            className="text-gray-600 hover:text-gray-800"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className="flex items-center gap-3 cursor-pointer hover:bg-green-100 dark:hover:bg-green-800/30 p-2 rounded-md transition-colors"
                        onClick={() => setIsEditingDate(true)}
                      >
                        <Calendar className="w-5 h-5 text-green-600" />
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                            Work Date
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {new Date(globalDate).toLocaleDateString('en-US', { 
                              weekday: 'long', 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </p>
                        </div>
                        <Edit className="w-4 h-4 text-gray-400 ml-auto" />
                      </div>
                    )}
                  </div>
                )}

                {/* Search and Zone Display */}
                <div className="mb-6 space-y-3">
                  {/* Search */}
                  <div>
                    <input
                      type="text"
                      placeholder="Search activities..."
                      value={activitySearchTerm}
                      onChange={(e) => setActivitySearchTerm(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  {/* Zone Display with Multi-Selection */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Available Zones:</span>
                      </div>
                      {selectedZones.size > 0 && (
                        <button
                          onClick={() => setSelectedZones(new Set())}
                          className="text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-100 px-2 py-1 rounded transition-colors"
                        >
                          Clear Selection
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {getUniqueZones().length > 0 ? (
                        getUniqueZones().map(zone => {
                          const isSelected = selectedZones.has(zone)
                          return (
                            <button
                              key={zone}
                              onClick={() => {
                                const newSelectedZones = new Set(selectedZones)
                                if (isSelected) {
                                  newSelectedZones.delete(zone)
                                } else {
                                  newSelectedZones.add(zone)
                                }
                                setSelectedZones(newSelectedZones)
                              }}
                              className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                                isSelected
                                  ? 'bg-blue-600 text-white shadow-md'
                                  : 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-800 dark:text-blue-100 dark:hover:bg-blue-700'
                              }`}
                            >
                              {zone}
                            </button>
                          )
                        })
                      ) : (
                        <span className="text-xs text-gray-500 dark:text-gray-400">No zones available</span>
                      )}
                    </div>
                    {selectedZones.size > 0 && (
                      <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                        Selected: {Array.from(selectedZones).join(', ')}
                      </div>
                    )}
                  </div>

                  {/* Clear Search */}
                  {activitySearchTerm && (
                    <button
                      onClick={() => setActivitySearchTerm('')}
                      className="w-full px-3 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                    >
                      Clear Search
                    </button>
                  )}
                </div>

                {/* Activities List - Compact Design */}
                <div className="space-y-2 max-h-[50vh] sm:max-h-[60vh] overflow-y-auto pr-2">
                  {getFilteredActivities().map((activity, index) => {
                    const isCompleted = completedActivities.has(activity.id)
                    const isCurrent = projectActivities.findIndex(a => a.id === activity.id) === currentActivityIndex
                    
                    // ✅ Get Done and Total quantities (calculated from database or fallback to activity data)
                    // Total should be from BOQ Activity (like BOQ Quantities column)
                    const { done: doneActual, total, planned, unit } = getActivityQuantities(activity)
                    // ✅ Use total (from BOQ Activity) for display, not planned (from Planned KPIs)
                    
                    return (
                      <div
                        key={activity.id}
                        className={`p-2 sm:p-3 rounded-md border-2 transition-all duration-200 cursor-pointer ${
                          isCompleted 
                            ? 'bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-600' 
                            : isCurrent
                            ? 'bg-blue-50 border-blue-300 dark:bg-blue-900/20 dark:border-blue-600'
                            : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                        onClick={() => handleActivitySelect(activity)}
                      >
                        <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
                            {isCompleted ? (
                              <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 flex-shrink-0" />
                            ) : isCurrent ? (
                              <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 flex-shrink-0" />
                            ) : (
                              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1 flex-wrap">
                                <span className={`text-xs font-medium flex-shrink-0 ${
                                  isCompleted ? 'text-green-700' : 
                                  isCurrent ? 'text-blue-700' : 'text-gray-600'
                                }`}>
                                  {isCompleted ? 'Done' : 
                                   isCurrent ? 'Now' : 'Pending'}
                                </span>
                                {activity.zone_ref && activity.zone_ref !== 'Enabling Division' && (
                                  <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 rounded text-xs font-medium truncate max-w-[120px] sm:max-w-none">
                                    {activity.zone_ref}
                                  </span>
                                )}
                              </div>
                              <h3 className="font-semibold text-gray-900 dark:text-white text-xs sm:text-sm truncate" title={activity.activity_name}>
                                {activity.activity_name}
                              </h3>
                              {activity.activity && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate hidden sm:block mt-1" title={activity.activity}>
                                  {activity.activity}
                                </p>
                              )}
                            </div>
                          </div>
                          {/* ✅ Display Done and Total on the right side */}
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <div className="flex flex-col items-end gap-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-gray-500 dark:text-gray-400">Done:</span>
                                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{doneActual.toLocaleString()}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-gray-500 dark:text-gray-400">Total:</span>
                                <span className="text-xs font-bold text-gray-900 dark:text-white">{total.toLocaleString()}</span>
                              </div>
                              {unit && (
                                <span className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{unit}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {!isCompleted && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleWorkTodayQuestion(activity.id, false)
                                }}
                                className="group relative p-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 rounded-lg border border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-700 transition-all duration-200 shadow-sm hover:shadow-md"
                                title="Mark as not worked on (Skip this activity)"
                              >
                                <X className="w-4 h-4 sm:w-5 sm:h-5" />
                                <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 dark:bg-gray-700 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                  Skip Activity
                                </span>
                              </button>
                            )}
                            {isCompleted && (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 hidden sm:block" />
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleEditCompletedActivity(activity)
                                  }}
                                  className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded transition-colors"
                                  title="Edit completed activity"
                                >
                                  <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Summary */}
                <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                  <div className="flex items-center gap-3">
                    <Zap className="w-4 h-4 text-blue-600" />
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                        Quick Summary
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {completedActivities.size} completed, {remainingActivities.length} remaining
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </ModernCard>
          </div>

          {/* Main Content - Activity Details */}
          <div className="flex-1">
            <ModernCard className="w-full">
              <div className="p-6">
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Activity className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Select an Activity
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Click on an activity from the sidebar to start recording KPI data
                  </p>
                  <div className="text-sm text-gray-500 dark:text-gray-500">
                    {remainingActivities.length} activities remaining
                  </div>
                </div>
              </div>
            </ModernCard>
          </div>
        </div>
      </div>
    )
  }
  
  // Form Step - Enhanced with Work Today Question
  if (currentStep === 'form' && selectedActivity) {
    const currentActivity = getCurrentActivity()
    console.log('🔍 Form step - currentActivity:', currentActivity?.activity_name, 'selectedActivity:', selectedActivity?.activity_name)
    
    return (
      <div className="smart-kpi-form w-full max-w-6xl mx-auto px-2 sm:px-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:gap-4">
          {/* Sidebar - Activities List (Always Visible) */}
          <div className="w-full lg:w-[38%] lg:min-w-[350px]">
            <ModernCard className="w-full h-fit">
              <div className="p-4 sm:p-6">
                {/* Header */}
        <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <Activity className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                        Activities
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {projectActivities.length} activities
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onCancel}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="mb-4 sm:mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                      Progress: {completedActivities.size} / {projectActivities.length}
                    </span>
                    <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                      {Math.round((completedActivities.size / projectActivities.length) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.round((completedActivities.size / projectActivities.length) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Search and Zone Display */}
                <div className="mb-6 space-y-3">
                  {/* Search */}
                  <div>
                    <input
                      type="text"
                      placeholder="Search activities..."
                      value={activitySearchTerm}
                      onChange={(e) => setActivitySearchTerm(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  {/* Zone Display with Multi-Selection */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Available Zones:</span>
                      </div>
                      {selectedZones.size > 0 && (
                        <button
                          onClick={() => setSelectedZones(new Set())}
                          className="text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-100 px-2 py-1 rounded transition-colors"
                        >
                          Clear Selection
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {getUniqueZones().length > 0 ? (
                        getUniqueZones().map(zone => {
                          const isSelected = selectedZones.has(zone)
                          return (
                            <button
                              key={zone}
                              onClick={() => {
                                const newSelectedZones = new Set(selectedZones)
                                if (isSelected) {
                                  newSelectedZones.delete(zone)
                                } else {
                                  newSelectedZones.add(zone)
                                }
                                setSelectedZones(newSelectedZones)
                              }}
                              className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                                isSelected
                                  ? 'bg-blue-600 text-white shadow-md'
                                  : 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-800 dark:text-blue-100 dark:hover:bg-blue-700'
                              }`}
                            >
                              {zone}
                            </button>
                          )
                        })
                      ) : (
                        <span className="text-xs text-gray-500 dark:text-gray-400">No zones available</span>
                      )}
                    </div>
                    {selectedZones.size > 0 && (
                      <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                        Selected: {Array.from(selectedZones).join(', ')}
                      </div>
                    )}
                  </div>

                  {/* Clear Search */}
                  {activitySearchTerm && (
                    <button
                      onClick={() => setActivitySearchTerm('')}
                      className="w-full px-3 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                    >
                      Clear Search
                    </button>
                  )}
                </div>

                {/* Activities List - Compact Design */}
                <div className="space-y-2 max-h-[50vh] sm:max-h-[60vh] overflow-y-auto pr-2">
                  {projectActivities.map((activity, index) => {
                    const isCompleted = completedActivities.has(activity.id)
                    const isCurrent = index === currentActivityIndex
                    
                    // ✅ Get Done and Total quantities (calculated from database or fallback to activity data)
                    // Total should be from BOQ Activity (like BOQ Quantities column)
                    const { done: doneActual, total, planned, unit } = getActivityQuantities(activity)
                    // ✅ Use total (from BOQ Activity) for display, not planned (from Planned KPIs)
                    
                    return (
                      <div
                        key={activity.id}
                        className={`p-2 sm:p-3 rounded-md border-2 transition-all duration-200 cursor-pointer ${
                          isCompleted 
                            ? 'bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-600' 
                            : isCurrent
                            ? 'bg-blue-50 border-blue-300 dark:bg-blue-900/20 dark:border-blue-600'
                            : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                        onClick={() => handleActivitySelect(activity)}
                      >
                        <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
                            {isCompleted ? (
                              <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 flex-shrink-0" />
                            ) : isCurrent ? (
                              <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 flex-shrink-0" />
                            ) : (
                              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1 flex-wrap">
                                <span className={`text-xs font-medium flex-shrink-0 ${
                                  isCompleted ? 'text-green-700' : 
                                  isCurrent ? 'text-blue-700' : 'text-gray-600'
                                }`}>
                                  {isCompleted ? 'Done' : 
                                   isCurrent ? 'Now' : 'Pending'}
                                </span>
                                {activity.zone_ref && activity.zone_ref !== 'Enabling Division' && (
                                  <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 rounded text-xs font-medium truncate max-w-[120px] sm:max-w-none">
                                    {activity.zone_ref}
                                  </span>
                                )}
                              </div>
                              <h3 className="font-semibold text-gray-900 dark:text-white text-xs sm:text-sm truncate" title={activity.activity_name}>
                                {activity.activity_name}
                              </h3>
                              {activity.activity && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate hidden sm:block" title={activity.activity}>
                                  {activity.activity}
                                </p>
                              )}
                            </div>
                          </div>
                          {/* ✅ Display Done and Total on the right side */}
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <div className="flex flex-col items-end gap-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-gray-500 dark:text-gray-400">Done:</span>
                                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{doneActual.toLocaleString()}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-gray-500 dark:text-gray-400">Total:</span>
                                <span className="text-xs font-bold text-gray-900 dark:text-white">{total.toLocaleString()}</span>
                              </div>
                              {unit && (
                                <span className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{unit}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {!isCompleted && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleWorkTodayQuestion(activity.id, false)
                                }}
                                className="group relative p-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 rounded-lg border border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-700 transition-all duration-200 shadow-sm hover:shadow-md"
                                title="Mark as not worked on (Skip this activity)"
                              >
                                <X className="w-4 h-4 sm:w-5 sm:h-5" />
                                <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 dark:bg-gray-700 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                                  Skip Activity
                                </span>
                              </button>
                            )}
                            {isCompleted && (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 hidden sm:block" />
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleEditCompletedActivity(activity)
                                  }}
                                  className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded transition-colors"
                                  title="Edit completed activity"
                                >
                                  <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Summary */}
                <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                  <div className="flex items-center gap-3">
                    <Zap className="w-4 h-4 text-blue-600" />
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                        Quick Summary
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {completedActivities.size} reported, {projectActivities.filter(activity => !completedActivities.has(activity.id)).length} remaining
                      </p>
                    </div>
                  </div>
                </div>

                {/* Submit All Button - Show when all activities are reported */}
                {completedActivities.size === projectActivities.length && projectActivities.length > 0 && (
                  <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg border border-green-200 dark:border-green-700">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                        <CheckCircle2 className="w-6 h-6 text-white" />
                      </div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                        All Activities Reported!
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Review your data and submit all activities at once
                      </p>
                      <Button
                        onClick={handleSubmitAllActivities}
                        disabled={loading || isSubmitting || hasSubmitted}
                        className={`w-full text-white ${
                          hasSubmitted 
                            ? 'bg-gray-500 cursor-not-allowed' 
                            : isSubmitting 
                            ? 'bg-yellow-600 hover:bg-yellow-700' 
                            : 'bg-green-600 hover:bg-green-700'
                        }`}
                      >
                        {loading || isSubmitting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                            {hasSubmitted ? 'Already Submitted' : 'Saving to Database...'}
                          </>
                        ) : hasSubmitted ? (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Successfully Saved to Database
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Submit All Activities to Database
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </ModernCard>
          </div>

          {/* Main Content - Form or Preview */}
          <div className="w-full lg:flex-1">
            {completedActivities.size === projectActivities.length && projectActivities.length > 0 ? (
              // Preview Section
              <ModernCard className="w-full">
                <div className="p-6">
              <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      Activities Preview
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      Review all reported activities before submitting
                    </p>
                  </div>

                  {/* Summary Stats */}
                  {(() => {
                    // Calculate actual counts based on activity data
                    let activitiesProgressReported = 0
                    let activitiesNotWorkedOn = 0
                    
                    projectActivities.forEach((activity) => {
                      const hasData = completedActivitiesData.has(activity.id)
                      const data = completedActivitiesData.get(activity.id)
                      const isNotWorkedOn = data?.notWorkedOn === true || data?.hasWorked === false
                      const hasWorked = hasData && !isNotWorkedOn
                      
                      if (hasWorked) {
                        activitiesProgressReported++
                      } else if (isNotWorkedOn) {
                        activitiesNotWorkedOn++
                      }
                    })
                    
                    return (
                      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 p-4 rounded-lg border border-green-200 dark:border-green-700">
                          <div className="flex items-center">
                            <CheckCircle2 className="w-8 h-8 text-green-600 mr-3" />
                            <div>
                              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                {activitiesProgressReported}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                Activities Progress Reported
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-700">
                          <div className="flex items-center">
                            <X className="w-8 h-8 text-orange-600 mr-3" />
                            <div>
                              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                {activitiesNotWorkedOn}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                Activities Not Worked On
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                          <div className="flex items-center">
                            <Calendar className="w-8 h-8 text-blue-600 mr-3" />
                            <div>
                              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                {globalDate ? new Date(globalDate).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric' 
                                }) : 'N/A'}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                Work Date
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })()}

                  {/* All Activities Table */}
                  <div className="mb-6">
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Activity
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Quantity
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Date
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Drilled Meters
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Drilled
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {projectActivities.map((activity) => {
                              const hasData = completedActivitiesData.has(activity.id)
                              const data = completedActivitiesData.get(activity.id)
                              const isNotWorkedOn = data?.notWorkedOn === true || data?.hasWorked === false
                              const hasWorked = hasData && !isNotWorkedOn
                              
                              return (
                                <tr 
                                  key={activity.id} 
                                  className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                                    isNotWorkedOn ? 'bg-orange-50/50 dark:bg-orange-900/20' : 
                                    !hasData ? 'bg-gray-50/30 dark:bg-gray-800/30' : ''
                                  }`}
                                >
                                  <td className="px-4 py-4">
                                    <div className="flex items-center">
                                      {hasWorked ? (
                                        <CheckCircle className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                                      ) : isNotWorkedOn ? (
                                        <X className="w-4 h-4 text-orange-600 mr-2 flex-shrink-0" />
                                      ) : (
                                        <Clock className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                                      )}
                                      <div>
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                          {activity.activity_name}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                          {activity.activity}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-4">
                                    {hasWorked ? (
                                      <div className="text-sm text-gray-900 dark:text-white">
                                        <span className="font-medium">{data['Quantity'] || data.quantity || 0}</span>
                                        <span className="text-gray-500 dark:text-gray-400 ml-1">{data['Unit'] || data.unit || ''}</span>
                                      </div>
                                    ) : isNotWorkedOn ? (
                                      <div className="text-sm text-orange-600 dark:text-orange-400 italic font-medium">
                                        Not Worked On
                                      </div>
                                    ) : (
                                      <div className="text-sm text-gray-400 dark:text-gray-500 italic">
                                        Not Handled
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-4 py-4">
                                    {hasWorked ? (
                                      <div className="text-sm text-gray-900 dark:text-white">
                                        {data['Actual Date'] || data.actual_date ? new Date(data['Actual Date'] || data.actual_date).toLocaleDateString('en-US', {
                                          weekday: 'short',
                                          month: 'short',
                                          day: 'numeric'
                                        }) : 'N/A'}
                                      </div>
                                    ) : isNotWorkedOn ? (
                                      <div className="text-sm text-orange-600 dark:text-orange-400 italic">
                                        -
                                      </div>
                                    ) : (
                                      <div className="text-sm text-gray-400 dark:text-gray-500 italic">
                                        -
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-4 py-4">
                                    {hasWorked ? (
                                      <div className="text-sm text-gray-900 dark:text-white">
                                        {data['Drilled Meters'] || data.drilled_meters ? `${data['Drilled Meters'] || data.drilled_meters}m` : 'N/A'}
                                      </div>
                                    ) : (
                                      <div className={`text-sm italic ${
                                        isNotWorkedOn 
                                          ? 'text-orange-600 dark:text-orange-400' 
                                          : 'text-gray-400 dark:text-gray-500'
                                      }`}>
                                        -
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-4 py-4">
                                    {hasWorked ? (
                                      <div className="text-sm text-gray-900 dark:text-white">
                                        {data['Drilled Meters'] || data.drilled_meters ? `${data['Drilled Meters'] || data.drilled_meters}m` : 'N/A'}
                                      </div>
                                    ) : (
                                      <div className={`text-sm italic ${
                                        isNotWorkedOn 
                                          ? 'text-orange-600 dark:text-orange-400' 
                                          : 'text-gray-400 dark:text-gray-500'
                                      }`}>
                                        -
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-4 py-4">
                                    {hasWorked ? (
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        Progress Reported
                                      </span>
                                    ) : isNotWorkedOn ? (
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                                        <X className="w-3 h-3 mr-1" />
                                        Not Worked On
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                        <Clock className="w-3 h-3 mr-1" />
                                        Pending
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowPreview(false)}
                      className="w-full sm:w-auto justify-center text-gray-600 hover:text-gray-800"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to Activities
                    </Button>
                    <Button
                      onClick={handleSubmitAllActivities}
                      disabled={loading || isSubmitting || hasSubmitted}
                      className={`w-full sm:w-auto justify-center text-white ${
                        hasSubmitted 
                          ? 'bg-gray-500 cursor-not-allowed' 
                          : isSubmitting 
                          ? 'bg-yellow-600 hover:bg-yellow-700' 
                          : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      {loading || isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          {hasSubmitted ? 'Already Submitted' : 'Saving to Database...'}
                        </>
                      ) : hasSubmitted ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Successfully Saved to Database
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Submit All Activities to Database
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </ModernCard>
            ) : (
              // Select Activity Message or Form Section
              <ModernCard className="w-full">
                <div className="p-3 sm:p-4 md:p-6">
                  {!selectedActivity && completedActivities.size < projectActivities.length ? (
                    // Select Activity Message - Only show when not all activities are completed
                    <div className="text-center py-6 sm:py-8 md:py-12">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                        <Activity className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" />
                      </div>
                      <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Select an Activity
                      </h2>
                      {selectedProject && (
                        <div className="mb-3 px-4">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Project: <span className="font-semibold">{selectedProject.project_full_code || selectedProject.project_code}</span>
                          </p>
                          {selectedProject.project_name && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              {selectedProject.project_name}
                            </p>
                          )}
                        </div>
                      )}
                      <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-3 sm:mb-4 px-4">
                        Click on an activity from the sidebar to start recording KPI data
                      </p>
                      <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        {projectActivities.filter(activity => !completedActivities.has(activity.id)).length} activities remaining
                      </div>
                    </div>
                  ) : !selectedActivity && completedActivities.size === projectActivities.length && projectActivities.length > 0 ? (
                    // All Activities Reported - Show Preview Message
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-8 h-8 text-white" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        All Activities Reported!
                      </h2>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        All activities have been reported. You can review and submit your data.
                      </p>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {completedActivities.size} activities reported
                      </div>
                    </div>
                  ) : selectedActivity ? (
                    // Form Section
                    <>
                      {/* Header */}
            <div className="mb-4 sm:mb-6">
              {/* Header with back button */}
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center shrink-0">
                    <Target className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white truncate">
                      Activity Details
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">
                      Project: <span className="font-medium">{selectedProject?.project_full_code || selectedProject?.project_code}</span>
                      {selectedProject?.project_name && (
                        <span className="ml-2">• {selectedProject.project_name}</span>
                      )}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentStep('activities')}
                  className="text-gray-400 hover:text-gray-600 shrink-0"
                >
                  <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
              </div>

              {/* Activity Information Card */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-3 sm:p-4 border border-blue-200 dark:border-blue-700">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                  <div className="flex-1 w-full">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2 break-words">
                      {currentActivity.activity_name}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-3 break-words">
                      {currentActivity.activity}
                    </p>
                    
                    {/* Activity Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Unit:</span>
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                            {currentActivity.unit || 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Division:</span>
                          <span className="text-xs text-gray-700 dark:text-gray-300">
                            {currentActivity.activity_division || 'N/A'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {(() => {
                          // ✅ Format Zone as: full code + zone (e.g., "P8888-P-01-0")
                          const projectFullCode = selectedProject?.project_full_code || selectedProject?.project_code || ''
                          const activityZone = currentActivity.zone_ref || currentActivity.zone_number || ''
                          let formattedZone = activityZone
                          
                          if (activityZone && projectFullCode && activityZone !== 'Enabling Division') {
                            // If zone already contains project code, use it as is
                            if (activityZone.includes(projectFullCode)) {
                              formattedZone = activityZone
                            } else {
                              // Otherwise, format as: full code + zone
                              formattedZone = `${projectFullCode}-${activityZone}`
                            }
                          }
                          
                          return formattedZone && formattedZone !== 'Enabling Division' ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Zone:</span>
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                {formattedZone}
                              </span>
                            </div>
                          ) : null
                        })()}
                        {currentActivity.zone_number && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Zone #:</span>
                            <span className="text-xs text-gray-700 dark:text-gray-300">
                              {currentActivity.zone_number}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Status Badge */}
                  <div className="flex flex-col items-end gap-2">
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                      Active
                    </span>
                    {(() => {
                      // ✅ Get quantities using same logic as BOQ Quantities column
                      const { done, total, planned, unit } = getActivityQuantities(currentActivity)
                      
                      // ✅ Show Total from BOQ Activity (like BOQ Quantities column - Total field)
                      // Total comes from BOQ Activity (total_units or planned_units), not from Planned KPIs
                      const totalToShow = total
                      
                      if (totalToShow > 0) {
                        return (
                          <div className="text-right">
                            <span className="text-xs text-gray-500 dark:text-gray-400">Planned:</span>
                            <span className="text-sm font-semibold text-gray-900 dark:text-white ml-1">
                              {totalToShow.toLocaleString()} {unit || currentActivity.unit || ''}
                            </span>
                            <span className="text-[10px] text-blue-600 dark:text-blue-400 block mt-0.5">
                              (from BOQ Activity - see Quantity Summary below)
                            </span>
                          </div>
                        )
                      }
                      return null
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* Global Date Display in Form */}
            {globalDate && (
              <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg border border-green-200 dark:border-green-700">
                {isEditingDate ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-green-600" />
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                        Edit Work Date
                      </h3>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="date"
                        value={globalDate}
                        onChange={(e) => setGlobalDate(e.target.value)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                      />
                      <Button
                        onClick={() => handleDateUpdate(globalDate)}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Save
                      </Button>
                      <Button
                        onClick={() => setIsEditingDate(false)}
                        size="sm"
                        variant="outline"
                        className="text-gray-600 hover:text-gray-800"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div 
                    className="flex items-center gap-3 cursor-pointer hover:bg-green-100 dark:hover:bg-green-800/30 p-2 rounded-md transition-colors"
                    onClick={() => setIsEditingDate(true)}
                  >
                    <Calendar className="w-5 h-5 text-green-600" />
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                        Work Date
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(globalDate).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                    </div>
                    <Edit className="w-4 h-4 text-gray-400 ml-auto" />
                  </div>
                )}
              </div>
            )}

            {/* Work Today Question */}
            <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
              <div className="text-center">
                <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <Activity className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" />
                </div>
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-2 px-2">
                  Did you work on this activity today?
                </h3>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4 sm:mb-6 px-2 break-words">
                  {currentActivity.activity_name}
                  {(() => {
                    // ✅ Format Zone as: full code + zone (e.g., "P8888-P-01-0")
                    const projectFullCode = selectedProject?.project_full_code || selectedProject?.project_code || ''
                    const activityZone = currentActivity.zone_ref || currentActivity.zone_number || ''
                    let formattedZone = activityZone
                    
                    if (activityZone && projectFullCode && activityZone !== 'Enabling Division') {
                      // If zone already contains project code, use it as is
                      if (activityZone.includes(projectFullCode)) {
                        formattedZone = activityZone
                      } else {
                        // Otherwise, format as: full code + zone
                        formattedZone = `${projectFullCode}-${activityZone}`
                      }
                    }
                    
                    return formattedZone && formattedZone !== 'Enabling Division' ? (
                      <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        Zone: {formattedZone}
                      </span>
                    ) : null
                  })()}
                </p>
                
                {/* Edit Mode Notice */}
                {completedActivities.has(currentActivity.id) && (
                  <div className="mb-4 p-2 sm:p-3 bg-yellow-50 border border-yellow-200 rounded-lg mx-2">
                    <div className="flex items-center gap-2 text-yellow-800">
                      <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                      <span className="text-xs sm:text-sm font-medium">Edit Mode: This activity was previously reported</span>
                    </div>
                  </div>
                )}
                
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-2">
                  <Button
                    onClick={() => handleWorkTodayQuestion(currentActivity.id, true)}
                    className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-6 sm:px-8 py-2.5 sm:py-3 text-sm sm:text-base"
                  >
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    Yes, I worked on it
                  </Button>
                  <Button
                    onClick={() => handleWorkTodayQuestion(currentActivity.id, false)}
                    variant="outline"
                    className="w-full sm:w-auto border-red-300 text-red-600 hover:bg-red-50 px-6 sm:px-8 py-2.5 sm:py-3 text-sm sm:text-base"
                  >
                    <X className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    No, I didn't work on it
                  </Button>
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Quantity
                  </label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Enter quantity"
                  />
                  
                  {/* Quantity Summary */}
                  {selectedActivity && selectedProject && (() => {
                    // ✅ CRITICAL FIX: Use getActivityQuantities to get the SAME values shown in the left panel
                    const { done, total, planned, unit: activityUnit } = getActivityQuantities(selectedActivity)
                    
                    return (
                      <div className="mt-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Target className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Quantity Summary
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                            Live Data
                          </span>
                        </div>
                        <EnhancedQuantitySummary
                          selectedActivity={selectedActivity}
                          selectedProject={selectedProject}
                          newQuantity={parseFloat(quantity) || 0}
                          unit={unit || activityUnit || ''}
                          showDebug={true}
                          allKPIs={allKPIs} // ✅ Pass pre-fetched KPIs to avoid duplicate fetching
                          // ✅ CRITICAL FIX: Pass pre-calculated values to ensure consistency
                          preCalculatedDone={done}
                          preCalculatedTotal={total}
                          preCalculatedPlanned={planned}
                          zone={(() => {
                            // ✅ CRITICAL FIX: Always pass zone from activity to ensure zone-specific filtering
                            // For project P5073 and others, quantities should be calculated per zone, not for entire project
                            const projectFullCode = selectedProject?.project_full_code || selectedProject?.project_code || ''
                            const projectCode = selectedProject?.project_code || ''
                            const activityZone = selectedActivity?.zone_ref || selectedActivity?.zone_number || ''
                            
                            // ✅ If activity has zone, format and pass it (for zone-specific filtering)
                            if (activityZone && activityZone.trim() !== '' && activityZone !== '0' && activityZone !== 'Enabling Division') {
                              // ✅ CRITICAL: For P5073, zones may be stored as "Parking", "Parking-Side-A", etc.
                              // We need to ensure proper matching with KPIs that may have "P5073 - Parking" format
                              
                              // If zone already contains project code or project full code, use it as is
                              if (activityZone.includes(projectFullCode) || activityZone.includes(projectCode)) {
                                console.log(`🔍 [EnhancedQuantitySummary] Using zone as-is: "${activityZone}"`)
                                return activityZone
                              }
                              
                              // ✅ For P5073 format: If zone is like "Parking" or "Parking-Side-A", format as "P5073 - Parking"
                              // This ensures matching with KPIs that have "P5073 - Parking" format
                              const formattedZone = `${projectFullCode} - ${activityZone}`
                              console.log(`🔍 [EnhancedQuantitySummary] Formatted zone: "${activityZone}" -> "${formattedZone}"`)
                              return formattedZone
                            }
                            
                            // ✅ If activity has no zone, pass undefined (will show all zones for project)
                            // This is correct behavior - if activity has no zone, show project totals
                            console.log(`🔍 [EnhancedQuantitySummary] No zone for activity, showing project totals`)
                            return undefined
                          })()} // ✅ Pass Zone from activity (formatted as full code + zone) - CRITICAL for zone-specific filtering
                          projectFullCode={selectedProject?.project_full_code || selectedProject?.project_code || undefined} // ✅ Pass Project Full Code
                          onTotalsChange={(totals) => {
                            // ✅ Note: Total comes from BOQ Activity (planned_units), not from KPIs
                            // EnhancedQuantitySummary calculates Done from Actual KPIs only
                          }}
                        />
                      </div>
                    )
                  })()}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Unit
                    {unit && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        Auto-filled from Activity
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={unit}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white bg-gray-50 cursor-not-allowed"
                    placeholder="Select an activity to auto-fill unit..."
                  />
                  {!unit && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Unit will be automatically filled when you select an activity
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Section
                    <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                      Optional
                    </span>
                  </label>
                  <input
                    type="text"
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="e.g., -10m, Section A"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Enter section information (e.g., -10m, Section A)
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Drilled Meters
                    <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                      Optional
                    </span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={drilledMeters}
                    onChange={(e) => setDrilledMeters(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Enter drilled meters (optional)"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Only for drilling activities - leave empty if not applicable
                  </p>
                </div>
              </div>
            </div>

            {/* Smart Features */}
            {isAutoCalculated && (
              <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg border border-green-200 dark:border-green-700">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-green-600" />
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      Smart Auto-Fill
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Daily rate: {dailyRate} {unit} • Auto-calculated quantity: {quantity}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Error/Success Messages */}
            {error && (
              <Alert variant="error" className="mt-4">
                {error}
              </Alert>
            )}

            {success && (
              <Alert className="mt-4 bg-green-50 border-green-200 text-green-800">
                {success}
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-8">
              <Button
                variant="outline"
                onClick={() => setCurrentStep('activities')}
                className="w-full sm:w-auto justify-center text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Activities
              </Button>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                <Button
                  variant="outline"
                  onClick={onCancel}
                  className="w-full sm:w-auto justify-center text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleFormSubmit({
                    project_code: selectedProject?.project_code,
                    activity_id: selectedActivity.id,
                    quantity: parseFloat(quantity) || 0,
                    unit,
                    actual_date: actualDate,
                    drilled_meters: drilledMeters ? parseFloat(drilledMeters) : null,
                    recorded_by: 'Engineer'
                  })}
                  disabled={loading || !quantity || !unit}
                  className="w-full sm:w-auto justify-center bg-green-600 hover:bg-green-700 text-white"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Report Activity
                    </>
                  )}
                </Button>
              </div>
            </div>
                    </>
                  ) : null}
                </div>
              </ModernCard>
            )}
          </div>
        </div>
      </div>
    )
  }

  return null
}