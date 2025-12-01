/**
 * Activity Templates and Suggestions by Division
 */

export interface ActivityTemplate {
  name: string
  division: string
  defaultUnit: string
  alternativeUnits?: string[]
  typicalDuration?: number // in working days
  category?: string
}

export const ACTIVITY_TEMPLATES: ActivityTemplate[] = [
  // Enabling Division
  { name: 'Design & Shop Drawings', division: 'Enabling Division', defaultUnit: 'Lump Sum', typicalDuration: 10 },
  { name: 'Mobilization', division: 'Enabling Division', defaultUnit: 'Lump Sum', typicalDuration: 5 },
  { name: 'C.Piles 600mm', division: 'Enabling Division', defaultUnit: 'No.', alternativeUnits: ['Meter'], typicalDuration: 15 },
  { name: 'C.Piles 800mm', division: 'Enabling Division', defaultUnit: 'No.', alternativeUnits: ['Meter'], typicalDuration: 20 },
  { name: 'C.Piles 1000mm', division: 'Enabling Division', defaultUnit: 'No.', alternativeUnits: ['Meter'], typicalDuration: 25 },
  { name: 'Integrity Test', division: 'Enabling Division', defaultUnit: 'No.', typicalDuration: 5 },
  { name: 'Sonic Test', division: 'Enabling Division', defaultUnit: 'No.', typicalDuration: 3 },
  { name: 'Static Load Test', division: 'Enabling Division', defaultUnit: 'No.', typicalDuration: 7 },
  { name: 'Soldier Pile (H. Beams)', division: 'Enabling Division', defaultUnit: 'No.', alternativeUnits: ['Meter'], typicalDuration: 15 },
  { name: 'Secant Pile', division: 'Enabling Division', defaultUnit: 'No.', alternativeUnits: ['Meter'], typicalDuration: 20 },
  { name: 'Guide Wall', division: 'Enabling Division', defaultUnit: 'Running Meter', alternativeUnits: ['Meter'], typicalDuration: 10 },
  { name: 'Excavation & Cart Away', division: 'Enabling Division', defaultUnit: 'Cubic Meter', typicalDuration: 12 },
  { name: 'Disposal of pile excavated Material', division: 'Enabling Division', defaultUnit: 'Cubic Meter', typicalDuration: 8 },
  { name: 'Fence /Site Gate', division: 'Enabling Division', defaultUnit: 'Lump Sum', typicalDuration: 3 },
  { name: 'NOC Fees', division: 'Enabling Division', defaultUnit: 'Lump Sum', typicalDuration: 1 },
  { name: 'EV / AC', division: 'Enabling Division', defaultUnit: 'Lump Sum', typicalDuration: 15 },
  
  // Soil Improvement Division
  { name: 'Vibro Compaction', division: 'Soil Improvement Division', defaultUnit: 'No.', alternativeUnits: ['Cubic Meter'], typicalDuration: 20 },
  { name: 'Pre-CPT', division: 'Soil Improvement Division', defaultUnit: 'No.', typicalDuration: 5 },
  { name: 'Post-CPT', division: 'Soil Improvement Division', defaultUnit: 'No.', typicalDuration: 5 },
  { name: 'Mobilization Works -Soil Improvement', division: 'Soil Improvement Division', defaultUnit: 'Lump Sum', typicalDuration: 5 },
  { name: 'Stone Column', division: 'Soil Improvement Division', defaultUnit: 'No.', alternativeUnits: ['Meter'], typicalDuration: 15 },
  { name: 'Dynamic Compaction', division: 'Soil Improvement Division', defaultUnit: 'Square Meter', typicalDuration: 10 },
  
  // Infrastructure Division
  { name: 'Strut Work - First Row - Infra', division: 'Infrastructure Division', defaultUnit: 'No.', alternativeUnits: ['Running Meter'], typicalDuration: 8 },
  { name: 'Strut Work - Second Row - Infra', division: 'Infrastructure Division', defaultUnit: 'No.', alternativeUnits: ['Running Meter'], typicalDuration: 8 },
  { name: 'Guide Wall - Infra', division: 'Infrastructure Division', defaultUnit: 'No.', alternativeUnits: ['Running Meter'], typicalDuration: 10 },
  { name: 'Aggregates - Infra', division: 'Infrastructure Division', defaultUnit: 'No.', alternativeUnits: ['Cubic Meter'], typicalDuration: 5 },
  { name: 'Kerbstone Haunching - Infra', division: 'Infrastructure Division', defaultUnit: 'Running Meter', alternativeUnits: ['Meter'], typicalDuration: 12 },
  
  // Piling Works
  { name: 'Bored Piles', division: 'Enabling Division', defaultUnit: 'No.', alternativeUnits: ['Meter'], category: 'Piling Works', typicalDuration: 20 },
  { name: 'Driven Piles', division: 'Enabling Division', defaultUnit: 'No.', alternativeUnits: ['Meter'], category: 'Piling Works', typicalDuration: 15 },
  { name: 'Micropiles', division: 'Enabling Division', defaultUnit: 'No.', alternativeUnits: ['Meter'], category: 'Piling Works', typicalDuration: 12 },
  
  // Shoring Works
  { name: 'Sheet Piling', division: 'Enabling Division', defaultUnit: 'Square Meter', alternativeUnits: ['Running Meter'], category: 'Shoring Works', typicalDuration: 15 },
  { name: 'Diaphragm Wall', division: 'Enabling Division', defaultUnit: 'Square Meter', alternativeUnits: ['Cubic Meter'], category: 'Shoring Works', typicalDuration: 25 },
  { name: 'Anchors', division: 'Enabling Division', defaultUnit: 'No.', alternativeUnits: ['Meter'], category: 'Shoring Works', typicalDuration: 10 },
]

/**
 * Get activity suggestions by division
 */
export function getActivitiesByDivision(division: string): ActivityTemplate[] {
  return ACTIVITY_TEMPLATES.filter(template => 
    template.division.toLowerCase() === division.toLowerCase()
  )
}

/**
 * Get activity template by name
 */
export function getActivityTemplate(activityName: string): ActivityTemplate | undefined {
  return ACTIVITY_TEMPLATES.find(template => 
    template.name.toLowerCase() === activityName.toLowerCase()
  )
}

/**
 * Get suggested unit for activity
 */
export function getSuggestedUnit(activityName: string): string {
  const template = getActivityTemplate(activityName)
  return template?.defaultUnit || 'No.'
}

/**
 * Get all available units
 */
export function getAllUnits(): string[] {
  const units = new Set<string>()
  
  ACTIVITY_TEMPLATES.forEach(template => {
    units.add(template.defaultUnit)
    template.alternativeUnits?.forEach(unit => units.add(unit))
  })
  
  return Array.from(units).sort()
}

/**
 * Get typical duration for activity
 */
export function getTypicalDuration(activityName: string): number | undefined {
  const template = getActivityTemplate(activityName)
  return template?.typicalDuration
}

/**
 * Search activities by keyword
 */
export function searchActivities(keyword: string): ActivityTemplate[] {
  const lowerKeyword = keyword.toLowerCase()
  return ACTIVITY_TEMPLATES.filter(template =>
    template.name.toLowerCase().includes(lowerKeyword) ||
    template.division.toLowerCase().includes(lowerKeyword) ||
    template.category?.toLowerCase().includes(lowerKeyword)
  )
}

/**
 * Get all divisions
 */
export function getAllDivisions(): string[] {
  const divisions = new Set(ACTIVITY_TEMPLATES.map(t => t.division))
  return Array.from(divisions).sort()
}

/**
 * Get categories
 */
export function getAllCategories(): string[] {
  const categories = new Set(
    ACTIVITY_TEMPLATES
      .map(t => t.category)
      .filter(Boolean) as string[]
  )
  return Array.from(categories).sort()
}


