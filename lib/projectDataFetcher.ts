/**
 * Project Data Fetcher
 * 
 * Shared utility to fetch project activities and KPIs using the same logic
 * as ProjectDetailsPanel to ensure consistency
 */

import { getSupabaseClient, executeQuery } from './simpleConnectionManager'
import { TABLES } from './supabase'
import { mapBOQFromDB, mapKPIFromDB } from './dataMappers'
import { Project } from './supabase'

/**
 * Build project_full_code from project_code and project_sub_code
 * Uses the same logic as ProjectDetailsPanel
 */
export function buildProjectFullCode(project: Project): string {
  const projectCode = (project.project_code || '').trim()
  const projectSubCode = (project.project_sub_code || '').trim()
  
  let projectFullCode = projectCode
  if (projectSubCode) {
    // Check if sub_code already starts with project_code (case-insensitive)
    if (projectSubCode.toUpperCase().startsWith(projectCode.toUpperCase())) {
      projectFullCode = projectSubCode
    } else {
      if (projectSubCode.startsWith('-')) {
        projectFullCode = `${projectCode}${projectSubCode}`
      } else {
        projectFullCode = `${projectCode}-${projectSubCode}`
      }
    }
  }
  
  return projectFullCode
}

/**
 * Filter activities using the same strict matching logic as ProjectDetailsPanel
 */
export function filterActivitiesByProject(
  activities: any[],
  projectCode: string,
  projectSubCode: string,
  projectFullCode: string
): any[] {
  return activities.filter((item: any) => {
    const itemProjectFullCode = (item['Project Full Code'] || '').toString().trim()
    const itemProjectCode = (item['Project Code'] || '').toString().trim()
    const itemProjectSubCode = (item['Project Sub Code'] || '').toString().trim()
    
    // ✅ PRIORITY 1: Exact match on project_full_code (MOST ACCURATE)
    if (itemProjectFullCode === projectFullCode) {
      return true
    }
    
    // ✅ PRIORITY 2: Build full code from item and match
    if (itemProjectCode && itemProjectSubCode) {
      let itemFullCode = itemProjectCode
      if (itemProjectSubCode) {
        if (itemProjectSubCode.toUpperCase().startsWith(itemProjectCode.toUpperCase())) {
          itemFullCode = itemProjectSubCode
        } else {
          if (itemProjectSubCode.startsWith('-')) {
            itemFullCode = `${itemProjectCode}${itemProjectSubCode}`
          } else {
            itemFullCode = `${itemProjectCode}-${itemProjectSubCode}`
          }
        }
      }
      if (itemFullCode === projectFullCode) {
        return true
      }
    }
    
    // ✅ PRIORITY 3: Match where Project Full Code starts with our project_full_code (for sub-projects)
    if (projectFullCode && itemProjectFullCode.startsWith(projectFullCode)) {
      return true
    }
    
    // ❌ DO NOT match by project_code alone - this would include other projects with same code!
    // Only match if project_full_code is not available (old data fallback)
    if (!itemProjectFullCode && itemProjectCode === projectCode && !projectSubCode) {
      // Only allow this if current project has no sub_code (to avoid mixing projects)
      return true
    }
    
    return false
  })
}

/**
 * Filter KPIs using the same strict matching logic as ProjectDetailsPanel
 */
export function filterKPIsByProject(
  kpis: any[],
  projectCode: string,
  projectSubCode: string,
  projectFullCode: string
): any[] {
  return kpis.filter((kpi: any) => {
    const kpiProjectFullCode = (kpi['Project Full Code'] || '').toString().trim()
    const kpiProjectCode = (kpi['Project Code'] || '').toString().trim()
    const kpiProjectSubCode = (kpi['Project Sub Code'] || '').toString().trim()
    
    // ✅ PRIORITY 1: Exact match on project_full_code
    if (kpiProjectFullCode === projectFullCode) {
      return true
    }
    
    // ✅ PRIORITY 2: Build full code from KPI and match
    if (kpiProjectCode && kpiProjectSubCode) {
      let kpiFullCode = kpiProjectCode
      if (kpiProjectSubCode) {
        if (kpiProjectSubCode.toUpperCase().startsWith(kpiProjectCode.toUpperCase())) {
          kpiFullCode = kpiProjectSubCode
        } else {
          if (kpiProjectSubCode.startsWith('-')) {
            kpiFullCode = `${kpiProjectCode}${kpiProjectSubCode}`
          } else {
            kpiFullCode = `${kpiProjectCode}-${kpiProjectSubCode}`
          }
        }
      }
      if (kpiFullCode === projectFullCode) {
        return true
      }
    }
    
    // ✅ PRIORITY 3: Match where Project Full Code starts with our project_full_code
    if (projectFullCode && kpiProjectFullCode.startsWith(projectFullCode)) {
      return true
    }
    
    // ❌ DO NOT match by project_code alone if project has sub_code
    // Only allow if current project has no sub_code (to avoid mixing projects)
    if (!projectSubCode && !kpiProjectFullCode && kpiProjectCode === projectCode) {
      return true
    }
    
    return false
  })
}

/**
 * Fetch project activities and KPIs using the same comprehensive strategy as ProjectDetailsPanel
 * This ensures consistency between card view and details panel
 */
export async function fetchProjectData(
  project: Project
): Promise<{ activities: any[]; kpis: any[] }> {
  const supabase = getSupabaseClient()
  const projectCode = (project.project_code || '').trim()
  const projectSubCode = (project.project_sub_code || '').trim()
  const projectFullCode = buildProjectFullCode(project)
  
  console.log(`📊 Fetching data for project: ${projectCode} (Sub: ${projectSubCode}, Full: ${projectFullCode})`)
  
  // ✅ Strategy 1: Match by exact Project Full Code (PRIMARY - most accurate)
  const { data: activitiesByFullCodeExact, error: error1 } = await executeQuery(async () =>
    supabase
      .from(TABLES.BOQ_ACTIVITIES)
      .select('*')
      .eq('Project Full Code', projectFullCode)
  )
  
  console.log(`🔍 Strategy 1 (Project Full Code): Found ${activitiesByFullCodeExact?.length || 0} activities`)
  
  // ✅ Strategy 2: If no results by Project Full Code, try Project Code + Project Sub Code
  let activitiesByCodeAndSubCode: any[] = []
  let error4: any = null
  if ((!activitiesByFullCodeExact || (Array.isArray(activitiesByFullCodeExact) && activitiesByFullCodeExact.length === 0)) && projectSubCode) {
    console.log(`🔍 Strategy 2: Trying Project Code (${projectCode}) + Project Sub Code (${projectSubCode})`)
    
    // Extract sub_code suffix (e.g., "P10001-01" -> "01", or "01" -> "01")
    let subCodeSuffix = projectSubCode
    if (projectSubCode.toUpperCase().startsWith(projectCode.toUpperCase())) {
      // Sub code contains project code (e.g., "P10001-01"), extract suffix
      subCodeSuffix = projectSubCode.substring(projectCode.length).replace(/^-+/, '')
    }
    
    console.log(`🔍 Strategy 2: Extracted sub_code suffix: "${subCodeSuffix}"`)
    
    // Try exact match on Project Sub Code (could be "01" or "P10001-01")
    let result = await executeQuery(async () =>
      supabase
        .from(TABLES.BOQ_ACTIVITIES)
        .select('*')
        .eq('Project Code', projectCode)
        .eq('Project Sub Code', projectSubCode)
    )
    activitiesByCodeAndSubCode = result.data || []
    error4 = result.error
    
    // If no results, try with sub_code suffix only (e.g., "01")
    if (activitiesByCodeAndSubCode.length === 0 && subCodeSuffix && subCodeSuffix !== projectSubCode) {
      console.log(`🔍 Strategy 2b: Trying Project Sub Code suffix only (${subCodeSuffix})`)
      result = await executeQuery(async () =>
        supabase
          .from(TABLES.BOQ_ACTIVITIES)
          .select('*')
          .eq('Project Code', projectCode)
          .eq('Project Sub Code', subCodeSuffix)
      )
      if (result.data && Array.isArray(result.data) && result.data.length > 0) {
        activitiesByCodeAndSubCode = result.data
        error4 = result.error
      }
    }
    
    // If no results, try where Project Sub Code contains the full code (e.g., "P10001-01")
    if (activitiesByCodeAndSubCode.length === 0 && projectFullCode && projectFullCode !== projectSubCode) {
      console.log(`🔍 Strategy 2c: Trying Project Sub Code that contains full code (${projectFullCode})`)
      result = await executeQuery(async () =>
        supabase
          .from(TABLES.BOQ_ACTIVITIES)
          .select('*')
          .eq('Project Code', projectCode)
          .eq('Project Sub Code', projectFullCode)
      )
      if (result.data && Array.isArray(result.data) && result.data.length > 0) {
        activitiesByCodeAndSubCode = result.data
        error4 = result.error
      }
    }
    
    console.log(`🔍 Strategy 2 (Project Code + Sub Code): Found ${activitiesByCodeAndSubCode.length} activities`)
  }
  
  // ✅ Strategy 3: Match where Project Full Code starts with our project_full_code (for sub-projects)
  // Only if project has sub_code (to avoid matching other projects)
  const { data: activitiesByFullCodeStart, error: error3 } = projectSubCode ? await executeQuery(async () =>
    supabase
      .from(TABLES.BOQ_ACTIVITIES)
      .select('*')
      .like('Project Full Code', `${projectFullCode}%`)
  ) : { data: null, error: null }
  
  // ✅ Strategy 4: Fallback to Project Code ONLY if project has no sub_code (to avoid mixing projects)
  const { data: activitiesByCode, error: error2 } = !projectSubCode ? await executeQuery(async () =>
    supabase
      .from(TABLES.BOQ_ACTIVITIES)
      .select('*')
      .eq('Project Code', projectCode)
      .or('Project Full Code.is.null,Project Full Code.eq.')
  ) : { data: null, error: null }
  
  // Merge results (only include strategies that were executed)
  const allActivitiesData = [
    ...(Array.isArray(activitiesByFullCodeExact) ? activitiesByFullCodeExact : []),
    ...(Array.isArray(activitiesByCodeAndSubCode) ? activitiesByCodeAndSubCode : []),
    ...(Array.isArray(activitiesByFullCodeStart) ? activitiesByFullCodeStart : []),
    ...(Array.isArray(activitiesByCode) ? activitiesByCode : [])
  ].filter(Boolean) // Remove any null/undefined entries
  
  // Remove duplicates based on id (primary key)
  const uniqueActivitiesData = Array.from(
    new Map(allActivitiesData.map((item: any) => [item.id, item])).values()
  )
  
  if (error1 || error2 || error3 || error4) {
    console.warn('⚠️ Some activity queries had errors:', { error1, error2, error3, error4 })
  }
  
  // ✅ CRITICAL: Map activities FIRST to build project_full_code, THEN filter
  const mappedActivitiesRaw = uniqueActivitiesData.map(mapBOQFromDB)
  
  console.log(`📋 Mapped ${mappedActivitiesRaw.length} activities. Sample (first 3):`, mappedActivitiesRaw.slice(0, 3).map((a: any) => ({
    activityName: a.activity_name,
    projectFullCode: a.project_full_code,
    projectCode: a.project_code,
    projectSubCode: a.project_sub_code
  })))
  
  // ✅ Filter mapped activities using built project_full_code
  const filteredActivities = mappedActivitiesRaw.filter((activity: any) => {
    const activityFullCode = (activity.project_full_code || '').toString().trim()
    const activityProjectCode = (activity.project_code || '').toString().trim()
    const activityProjectSubCode = (activity.project_sub_code || '').toString().trim()
    
    // ✅ Match by exact Project Full Code OR by Project Code if activity has no sub_code
    const selectedFullCodeUpper = projectFullCode.toUpperCase().trim()
    const activityFullCodeUpper = activityFullCode.toUpperCase().trim()
    
    // Priority 1: Exact match on project_full_code
    if (activityFullCodeUpper === selectedFullCodeUpper) {
      return true
    }
    
    // Priority 2: If selected project has sub_code (e.g., "P10001-01") and activity has no sub_code (e.g., "P10001"),
    // match by project_code only (activities might not have sub_code in DB)
    const selectedParts = projectFullCode.split('-')
    const selectedCode = selectedParts[0]?.toUpperCase().trim()
    const selectedSubCode = selectedParts.slice(1).join('-').toUpperCase().trim()
    
    // If selected project has sub_code and activity has no sub_code, match by project_code
    if (selectedSubCode && !activityProjectSubCode && activityProjectCode.toUpperCase() === selectedCode) {
      return true
    }
    
    // Priority 3: If both have sub_codes, build activity full code and match
    if (activityProjectCode && activityProjectSubCode) {
      let builtActivityFullCode = activityProjectCode
      if (activityProjectSubCode.toUpperCase().startsWith(activityProjectCode.toUpperCase())) {
        builtActivityFullCode = activityProjectSubCode
      } else if (activityProjectSubCode.startsWith('-')) {
        builtActivityFullCode = `${activityProjectCode}${activityProjectSubCode}`
      } else {
        builtActivityFullCode = `${activityProjectCode}-${activityProjectSubCode}`
      }
      
      if (builtActivityFullCode.toUpperCase() === selectedFullCodeUpper) {
        return true
      }
    }
    
    return false
  })
  
  console.log(`✅ Filtered ${filteredActivities.length} activities out of ${mappedActivitiesRaw.length} mapped activities`)
  
  // ✅ Fetch KPIs using the same strategy
  // Strategy 1: Exact match on Project Full Code (PRIMARY - most accurate)
  let { data: kpisData, error: kpisError } = await executeQuery(async () =>
    supabase
      .from(TABLES.KPI)
      .select('*')
      .eq('Project Full Code', projectFullCode)
  )
  
  // Strategy 2: If no results by Project Full Code, try Project Code + Project Sub Code
  if ((!kpisData || (Array.isArray(kpisData) && kpisData.length === 0)) && projectSubCode) {
    console.log(`🔍 KPI Strategy 2: Trying Project Code (${projectCode}) + Project Sub Code (${projectSubCode})`)
    
    // Extract sub_code suffix (e.g., "P10001-01" -> "01", or "01" -> "01")
    let subCodeSuffix = projectSubCode
    if (projectSubCode.toUpperCase().startsWith(projectCode.toUpperCase())) {
      // Sub code contains project code (e.g., "P10001-01"), extract suffix
      subCodeSuffix = projectSubCode.substring(projectCode.length).replace(/^-+/, '')
    }
    
    console.log(`🔍 KPI Strategy 2: Extracted sub_code suffix: "${subCodeSuffix}"`)
    
    // Try exact match on Project Sub Code (could be "01" or "P10001-01")
    let result = await executeQuery(async () =>
      supabase
        .from(TABLES.KPI)
        .select('*')
        .eq('Project Code', projectCode)
        .eq('Project Sub Code', projectSubCode)
    )
    if (result.data && Array.isArray(result.data) && result.data.length > 0) {
      kpisData = result.data
      kpisError = result.error
    }
    
    // If no results, try with sub_code suffix only (e.g., "01")
    if ((!kpisData || (Array.isArray(kpisData) && kpisData.length === 0)) && subCodeSuffix && subCodeSuffix !== projectSubCode) {
      console.log(`🔍 KPI Strategy 2b: Trying Project Sub Code suffix only (${subCodeSuffix})`)
      result = await executeQuery(async () =>
        supabase
          .from(TABLES.KPI)
          .select('*')
          .eq('Project Code', projectCode)
          .eq('Project Sub Code', subCodeSuffix)
      )
      if (result.data && Array.isArray(result.data) && result.data.length > 0) {
        kpisData = result.data
        kpisError = result.error
      }
    }
    
    // If no results, try where Project Sub Code contains the full code (e.g., "P10001-01")
    if ((!kpisData || (Array.isArray(kpisData) && kpisData.length === 0)) && projectFullCode && projectFullCode !== projectSubCode) {
      console.log(`🔍 KPI Strategy 2c: Trying Project Sub Code that contains full code (${projectFullCode})`)
      result = await executeQuery(async () =>
        supabase
          .from(TABLES.KPI)
          .select('*')
          .eq('Project Code', projectCode)
          .eq('Project Sub Code', projectFullCode)
      )
      if (result.data && Array.isArray(result.data) && result.data.length > 0) {
        kpisData = result.data
        kpisError = result.error
      }
    }
  }
  
  // Strategy 3: Match where Project Full Code starts with our project_full_code (for sub-projects)
  if (!kpisData || (Array.isArray(kpisData) && kpisData.length === 0)) {
    const result = await executeQuery(async () =>
      supabase
        .from(TABLES.KPI)
        .select('*')
        .like('Project Full Code', `${projectFullCode}%`)
    )
    if (result.data && Array.isArray(result.data) && result.data.length > 0) {
      kpisData = result.data
      kpisError = result.error
    }
  }
  
  // Strategy 4: Fallback to Project Code ONLY if project has no sub_code
  if ((!kpisData || (Array.isArray(kpisData) && kpisData.length === 0)) && !projectSubCode) {
    const result = await executeQuery(async () =>
      supabase
        .from(TABLES.KPI)
        .select('*')
        .eq('Project Code', projectCode)
    )
    if (result.data && Array.isArray(result.data) && result.data.length > 0) {
      kpisData = result.data
      kpisError = result.error
    }
  }
  
  if (kpisError) {
    console.warn('⚠️ KPI query had error:', kpisError)
  }
  
  // ✅ CRITICAL: Map KPIs FIRST to build project_full_code, THEN filter
  const mappedKPIsRaw = (kpisData || []).map(mapKPIFromDB)
  
  console.log(`📋 Mapped ${mappedKPIsRaw.length} KPIs. Sample (first 3):`, mappedKPIsRaw.slice(0, 3).map((k: any) => ({
    activityName: k.activity_name,
    projectFullCode: k.project_full_code,
    projectCode: k.project_code,
    projectSubCode: k.project_sub_code
  })))
  
  // ✅ Filter mapped KPIs using built project_full_code
  const filteredKPIs = mappedKPIsRaw.filter((kpi: any) => {
    const kpiFullCode = (kpi.project_full_code || '').toString().trim()
    const kpiProjectCode = (kpi.project_code || '').toString().trim()
    const kpiProjectSubCode = (kpi.project_sub_code || '').toString().trim()
    
    // ✅ Match by exact Project Full Code OR by Project Code if KPI has no sub_code
    const selectedFullCodeUpper = projectFullCode.toUpperCase().trim()
    const kpiFullCodeUpper = kpiFullCode.toUpperCase().trim()
    
    // Priority 1: Exact match on project_full_code
    if (kpiFullCodeUpper === selectedFullCodeUpper) {
      return true
    }
    
    // Priority 2: If selected project has sub_code (e.g., "P10001-01") and KPI has no sub_code (e.g., "P10001"),
    // match by project_code only (KPIs might not have sub_code in DB)
    const selectedParts = projectFullCode.split('-')
    const selectedCode = selectedParts[0]?.toUpperCase().trim()
    const selectedSubCode = selectedParts.slice(1).join('-').toUpperCase().trim()
    
    // If selected project has sub_code and KPI has no sub_code, match by project_code
    if (selectedSubCode && !kpiProjectSubCode && kpiProjectCode.toUpperCase() === selectedCode) {
      return true
    }
    
    // Priority 3: If both have sub_codes, build KPI full code and match
    if (kpiProjectCode && kpiProjectSubCode) {
      let builtKpiFullCode = kpiProjectCode
      if (kpiProjectSubCode.toUpperCase().startsWith(kpiProjectCode.toUpperCase())) {
        builtKpiFullCode = kpiProjectSubCode
      } else if (kpiProjectSubCode.startsWith('-')) {
        builtKpiFullCode = `${kpiProjectCode}${kpiProjectSubCode}`
      } else {
        builtKpiFullCode = `${kpiProjectCode}-${kpiProjectSubCode}`
      }
      
      if (builtKpiFullCode.toUpperCase() === selectedFullCodeUpper) {
        return true
      }
    }
    
    return false
  })
  
  console.log(`✅ Filtered ${filteredKPIs.length} KPIs out of ${mappedKPIsRaw.length} mapped KPIs`)
  
  // Activities and KPIs are already mapped and filtered
  const activities = filteredActivities
  const kpis = filteredKPIs
  
  console.log(`✅ Final result for ${projectCode} (${projectFullCode}):`, {
    activities: activities.length,
    kpis: kpis.length,
    projectFullCode,
    projectCode,
    projectSubCode
  })
  
  return { activities, kpis }
}

