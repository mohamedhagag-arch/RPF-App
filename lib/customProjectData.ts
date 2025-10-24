/**
 * Custom Project Data Manager
 * Manages custom project types, divisions, and other custom data in localStorage
 */

const STORAGE_KEYS = {
  PROJECT_TYPES: 'custom_project_types',
  DIVISIONS: 'custom_divisions',
  PROJECT_METADATA: 'project_metadata'
}

export interface CustomProjectType {
  name: string
  addedAt: string
  usageCount: number
}

export interface CustomDivision {
  name: string
  addedAt: string
  usageCount: number
}

export interface ProjectMetadata {
  totalProjects: number
  lastProjectCode: string
  suggestedNextCode: string
}

// ============ Custom Project Types ============

export function saveCustomProjectType(typeName: string): void {
  try {
    const existing = getCustomProjectTypes()
    const found = existing.find(t => t.name.toLowerCase() === typeName.toLowerCase())
    
    if (found) {
      found.usageCount++
    } else {
      existing.push({
        name: typeName,
        addedAt: new Date().toISOString(),
        usageCount: 1
      })
    }
    
    localStorage.setItem(STORAGE_KEYS.PROJECT_TYPES, JSON.stringify(existing))
  } catch (error) {
    console.error('Error saving custom project type:', error)
  }
}

export function getCustomProjectTypes(): CustomProjectType[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.PROJECT_TYPES)
    if (!stored) return []
    return JSON.parse(stored)
  } catch (error) {
    console.error('Error loading custom project types:', error)
    return []
  }
}

export function deleteCustomProjectType(typeName: string): void {
  try {
    const existing = getCustomProjectTypes()
    const filtered = existing.filter(t => t.name !== typeName)
    localStorage.setItem(STORAGE_KEYS.PROJECT_TYPES, JSON.stringify(filtered))
  } catch (error) {
    console.error('Error deleting custom project type:', error)
  }
}

export function getAllProjectTypes(): string[] {
  const custom = getCustomProjectTypes()
  return custom.map(t => t.name).sort()
}

// ============ Custom Divisions ============

export function saveCustomDivision(divisionName: string): void {
  try {
    const existing = getCustomDivisions()
    const found = existing.find(d => d.name.toLowerCase() === divisionName.toLowerCase())
    
    if (found) {
      found.usageCount++
    } else {
      existing.push({
        name: divisionName,
        addedAt: new Date().toISOString(),
        usageCount: 1
      })
    }
    
    localStorage.setItem(STORAGE_KEYS.DIVISIONS, JSON.stringify(existing))
  } catch (error) {
    console.error('Error saving custom division:', error)
  }
}

export function getCustomDivisions(): CustomDivision[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.DIVISIONS)
    if (!stored) return []
    return JSON.parse(stored)
  } catch (error) {
    console.error('Error loading custom divisions:', error)
    return []
  }
}

export function deleteCustomDivision(divisionName: string): void {
  try {
    const existing = getCustomDivisions()
    const filtered = existing.filter(d => d.name !== divisionName)
    localStorage.setItem(STORAGE_KEYS.DIVISIONS, JSON.stringify(filtered))
  } catch (error) {
    console.error('Error deleting custom division:', error)
  }
}

export function getAllDivisions(): string[] {
  const custom = getCustomDivisions()
  return custom.map(d => d.name).sort()
}

// ============ Project Metadata ============

export function updateProjectMetadata(projectCode: string): void {
  try {
    const metadata = getProjectMetadata()
    metadata.totalProjects++
    metadata.lastProjectCode = projectCode
    metadata.suggestedNextCode = generateNextProjectCode(projectCode)
    
    localStorage.setItem(STORAGE_KEYS.PROJECT_METADATA, JSON.stringify(metadata))
  } catch (error) {
    console.error('Error updating project metadata:', error)
  }
}

export function getProjectMetadata(): ProjectMetadata {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.PROJECT_METADATA)
    if (!stored) {
      return {
        totalProjects: 0,
        lastProjectCode: '',
        suggestedNextCode: 'P0001'
      }
    }
    return JSON.parse(stored)
  } catch (error) {
    console.error('Error loading project metadata:', error)
    return {
      totalProjects: 0,
      lastProjectCode: '',
      suggestedNextCode: 'P0001'
    }
  }
}

function generateNextProjectCode(lastCode: string): string {
  if (!lastCode) return 'P0001'
  
  // Extract numbers from the last code
  const match = lastCode.match(/\d+/)
  if (!match) return 'P0001'
  
  const lastNumber = parseInt(match[0], 10)
  const nextNumber = lastNumber + 1
  
  // Get the prefix (letters before the number)
  const prefix = lastCode.substring(0, match.index)
  
  // Pad with zeros to match original length
  const paddedNumber = nextNumber.toString().padStart(match[0].length, '0')
  
  return `${prefix}${paddedNumber}`
}

// ============ Export/Import ============

export function exportCustomProjectData(): string {
  const data = {
    projectTypes: getCustomProjectTypes(),
    divisions: getCustomDivisions(),
    metadata: getProjectMetadata(),
    exportedAt: new Date().toISOString()
  }
  
  return JSON.stringify(data, null, 2)
}

export function importCustomProjectData(jsonData: string): { success: boolean; message: string } {
  try {
    const data = JSON.parse(jsonData)
    
    if (data.projectTypes) {
      localStorage.setItem(STORAGE_KEYS.PROJECT_TYPES, JSON.stringify(data.projectTypes))
    }
    
    if (data.divisions) {
      localStorage.setItem(STORAGE_KEYS.DIVISIONS, JSON.stringify(data.divisions))
    }
    
    if (data.metadata) {
      localStorage.setItem(STORAGE_KEYS.PROJECT_METADATA, JSON.stringify(data.metadata))
    }
    
    return { success: true, message: 'Custom project data imported successfully' }
  } catch (error) {
    return { success: false, message: 'Failed to import data: Invalid format' }
  }
}

// ============ Clear All ============

export function clearAllCustomProjectData(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.PROJECT_TYPES)
    localStorage.removeItem(STORAGE_KEYS.DIVISIONS)
    localStorage.removeItem(STORAGE_KEYS.PROJECT_METADATA)
  } catch (error) {
    console.error('Error clearing custom project data:', error)
  }
}


