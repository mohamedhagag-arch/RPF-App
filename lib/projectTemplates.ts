/**
 * Project Templates and Smart Suggestions
 * Provides intelligent suggestions for project types, divisions, and other project attributes
 */

// Common Project Types in UAE Construction
export const PROJECT_TYPES = [
  'Infrastructure',
  'Infrastructure Project',
  'Roads & Transportation',
  'Building Construction',
  'Residential',
  'Commercial',
  'Industrial',
  'Utilities',
  'Water & Sewerage',
  'Electrical Network',
  'Telecom Network',
  'Landscaping',
  'Bridge Construction',
  'Tunnel Construction',
  'Airport Development',
  'Port Development',
  'Railway Project',
  'Urban Development',
  'Smart City',
  'Renovation & Upgrade',
]

// Common Divisions in UAE Projects
export const DIVISIONS = [
  'Civil',
  'Civil Division',
  'Electrical',
  'Electrical Division',
  'Mechanical',
  'Mechanical Division',
  'Water',
  'Water Division',
  'Sewerage',
  'Sewerage Division',
  'Roads',
  'Roads Division',
  'Infrastructure',
  'Infrastructure Division',
  'Landscaping',
  'Landscaping Division',
  'Telecom',
  'Telecom Division',
  'IT & Smart Systems',
  'Project Management',
  'Quality Control',
]

// Project Status Options - Updated to use unified system
export const PROJECT_STATUSES = [
  { value: 'upcoming', label: 'Upcoming', color: 'gray', description: 'Once the project is awarded' },
  { value: 'site-preparation', label: 'Site Preparation', color: 'orange', description: 'Once any Pre-commencement activities start' },
  { value: 'on-going', label: 'On Going', color: 'blue', description: 'Once any Post-commencement activities start' },
  { value: 'completed-duration', label: 'Completed Duration', color: 'purple', description: 'Once all Post-commencement activities finish' },
  { value: 'contract-completed', label: 'Contract Completed', color: 'emerald', description: 'Once all Post-Completion activities finish' },
  { value: 'on-hold', label: 'On Hold', color: 'yellow', description: 'To be added manually' },
  { value: 'cancelled', label: 'Cancelled', color: 'red', description: 'To be added manually' },
] as const

// Generate Project Sub-Code from Project Code
export function generateProjectSubCode(projectCode: string, suffix: string = '01'): string {
  if (!projectCode) return ''
  
  // Clean the project code
  const cleanCode = projectCode.trim().toUpperCase()
  
  // If it already has a suffix (e.g., P5074-01), extract the base
  const baseParts = cleanCode.split('-')
  const base = baseParts[0]
  
  return `${base}-${suffix}`
}

// Suggest Project Type based on Division
export function suggestProjectType(division: string): string[] {
  const divisionLower = division.toLowerCase()
  
  if (divisionLower.includes('civil') || divisionLower.includes('infrastructure')) {
    return ['Infrastructure', 'Roads & Transportation', 'Bridge Construction']
  }
  
  if (divisionLower.includes('electrical')) {
    return ['Electrical Network', 'Utilities', 'Smart City']
  }
  
  if (divisionLower.includes('water') || divisionLower.includes('sewerage')) {
    return ['Water & Sewerage', 'Utilities', 'Infrastructure']
  }
  
  if (divisionLower.includes('road')) {
    return ['Roads & Transportation', 'Infrastructure', 'Urban Development']
  }
  
  if (divisionLower.includes('landscape')) {
    return ['Landscaping', 'Urban Development', 'Commercial']
  }
  
  if (divisionLower.includes('telecom')) {
    return ['Telecom Network', 'IT & Smart Systems', 'Smart City']
  }
  
  return PROJECT_TYPES
}

// Validate Project Code Format
export function validateProjectCode(code: string): { valid: boolean; message?: string } {
  if (!code) {
    return { valid: false, message: 'Project code is required' }
  }
  
  const cleanCode = code.trim()
  
  if (cleanCode.length < 2) {
    return { valid: false, message: 'Project code is too short' }
  }
  
  if (cleanCode.length > 50) {
    return { valid: false, message: 'Project code is too long' }
  }
  
  // Check for invalid characters
  const validPattern = /^[A-Za-z0-9\-_\.]+$/
  if (!validPattern.test(cleanCode)) {
    return { valid: false, message: 'Project code contains invalid characters' }
  }
  
  return { valid: true }
}

// Estimate typical project duration based on type
export function estimateProjectDuration(projectType: string): number {
  const typeLower = projectType.toLowerCase()
  
  if (typeLower.includes('infrastructure') || typeLower.includes('bridge') || typeLower.includes('tunnel')) {
    return 730 // ~2 years
  }
  
  if (typeLower.includes('road') || typeLower.includes('transport')) {
    return 365 // ~1 year
  }
  
  if (typeLower.includes('building') || typeLower.includes('residential')) {
    return 540 // ~1.5 years
  }
  
  if (typeLower.includes('landscape') || typeLower.includes('renovation')) {
    return 180 // ~6 months
  }
  
  if (typeLower.includes('utilities') || typeLower.includes('network')) {
    return 270 // ~9 months
  }
  
  return 365 // Default: 1 year
}

// Get typical contract amount range for project type (in AED)
export function getTypicalContractRange(projectType: string): { min: number; max: number; typical: number } {
  const typeLower = projectType.toLowerCase()
  
  if (typeLower.includes('infrastructure') || typeLower.includes('airport') || typeLower.includes('port')) {
    return { min: 50_000_000, max: 500_000_000, typical: 100_000_000 }
  }
  
  if (typeLower.includes('bridge') || typeLower.includes('tunnel') || typeLower.includes('railway')) {
    return { min: 30_000_000, max: 300_000_000, typical: 75_000_000 }
  }
  
  if (typeLower.includes('road') || typeLower.includes('transport')) {
    return { min: 10_000_000, max: 100_000_000, typical: 25_000_000 }
  }
  
  if (typeLower.includes('building')) {
    return { min: 5_000_000, max: 50_000_000, typical: 15_000_000 }
  }
  
  if (typeLower.includes('utilities') || typeLower.includes('network')) {
    return { min: 3_000_000, max: 30_000_000, typical: 10_000_000 }
  }
  
  if (typeLower.includes('landscape')) {
    return { min: 500_000, max: 5_000_000, typical: 2_000_000 }
  }
  
  return { min: 1_000_000, max: 50_000_000, typical: 10_000_000 }
}


