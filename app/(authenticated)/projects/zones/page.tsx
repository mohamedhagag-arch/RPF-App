'use client'

import { useState, useEffect, useMemo } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { getSupabaseClient, executeQuery } from '@/lib/simpleConnectionManager'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Save, 
  Edit2, 
  X, 
  Search,
  MapPin,
  Check,
  Filter,
  Tag
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { TABLES } from '@/lib/supabase'

interface ProjectZone {
  id: string
  project_code: string
  zones: string  // Comma-separated zones
  created_at?: string
  updated_at?: string
}

interface Project {
  project_code: string
  project_name: string
}

export default function ProjectZonesPage() {
  const guard = usePermissionGuard()
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [projectZones, setProjectZones] = useState<Record<string, ProjectZone>>({})
  const [editingProjectCode, setEditingProjectCode] = useState<string | null>(null)
  const [zonesInput, setZonesInput] = useState<string>('')
  const [newZoneInput, setNewZoneInput] = useState<string>('') // For adding one zone at a time
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedProject, setSelectedProject] = useState<string>('')
  
  // Search and Filter
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'with-zones' | 'without-zones'>('all')
  const [showProjects, setShowProjects] = useState(false) // Control project list visibility
  const [selectedProjectFromDropdown, setSelectedProjectFromDropdown] = useState<string>('') // Selected project from dropdown

  // Load projects and zones
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')
      
      const supabase = getSupabaseClient()

      // Load all projects
      const { data: projectsData, error: projectsError } = await executeQuery(async () =>
        supabase
          .from(TABLES.PROJECTS)
          .select('"Project Code", "Project Name"')
          .order('"Project Code"')
      )

      if (projectsError) throw projectsError

      const projectsList: Project[] = (projectsData || []).map((p: any) => ({
        project_code: p['Project Code'] || p.project_code || '',
        project_name: p['Project Name'] || p.project_name || ''
      }))

      setProjects(projectsList)

      // Load all project zones
      const { data: zonesData, error: zonesError } = await executeQuery(async () =>
        supabase
          .from('project_zones')
          .select('*')
      )

      if (zonesError) throw zonesError

      const zonesMap: Record<string, ProjectZone> = {}
      zonesData?.forEach((zone: any) => {
        zonesMap[zone.project_code] = {
          id: zone.id,
          project_code: zone.project_code,
          zones: zone.zones || '',
          created_at: zone.created_at,
          updated_at: zone.updated_at
        }
      })

      setProjectZones(zonesMap)
      setLoading(false)
    } catch (err: any) {
      console.error('❌ Error loading data:', err)
      setError(err.message || 'Failed to load data')
      setLoading(false)
    }
  }

  // Filtered projects based on search, filter, and dropdown selection
  const filteredProjects = useMemo(() => {
    // If no search term, no dropdown selection, and showProjects is false, return empty array
    if (!searchTerm.trim() && !selectedProjectFromDropdown && !showProjects) {
      return []
    }
    
    let filtered = projects
    
    // Filter by dropdown selection (highest priority)
    if (selectedProjectFromDropdown) {
      filtered = filtered.filter(p => p.project_code === selectedProjectFromDropdown)
    } else if (searchTerm.trim()) {
      // Search filter - must match search term
      filtered = filtered.filter((project) => {
        const matchesSearch = 
          project.project_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          project.project_name.toLowerCase().includes(searchTerm.toLowerCase())
        return matchesSearch
      })
    }

    // Filter type
    return filtered.filter((project) => {
      const hasZones = !!projectZones[project.project_code]
      if (filterType === 'with-zones') return hasZones
      if (filterType === 'without-zones') return !hasZones
      return true
    })
  }, [projects, projectZones, searchTerm, filterType, showProjects, selectedProjectFromDropdown])

  // Auto-show projects only when there are matching results or dropdown selection
  useEffect(() => {
    if (selectedProjectFromDropdown) {
      // If a project is selected from dropdown, show it
      setShowProjects(true)
    } else if (searchTerm.trim().length > 0) {
      // Check if there are any matching projects
      const hasMatches = projects.some((project) => {
        const matchesSearch = 
          project.project_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          project.project_name.toLowerCase().includes(searchTerm.toLowerCase())
        return matchesSearch
      })
      
      // Only show projects if there are actual matches
      if (hasMatches) {
        setShowProjects(true)
      } else {
        setShowProjects(false)
      }
    } else {
      // If search is cleared and no dropdown selection, hide projects unless manually shown
      setShowProjects(false)
    }
  }, [searchTerm, projects, selectedProjectFromDropdown])
  
  // Clear search when dropdown selection changes
  useEffect(() => {
    if (selectedProjectFromDropdown) {
      setSearchTerm('')
    }
  }, [selectedProjectFromDropdown])

  const handleEdit = (projectCode: string) => {
    const existingZone = projectZones[projectCode]
    setEditingProjectCode(projectCode)
    setZonesInput(existingZone?.zones || '')
    setSelectedProject(projectCode)
    setNewZoneInput('')
  }

  const handleCancel = () => {
    setEditingProjectCode(null)
    setZonesInput('')
    setNewZoneInput('')
    setSelectedProject('')
  }

  // Add a single zone
  const handleAddZone = () => {
    if (!newZoneInput.trim()) return
    
    const zoneTrimmed = newZoneInput.trim()
    const currentZones = getZonesArray(zonesInput)
    
    // Check if zone already exists
    if (currentZones.some(z => z.toLowerCase() === zoneTrimmed.toLowerCase())) {
      setError(`Zone "${zoneTrimmed}" already exists`)
      setTimeout(() => setError(''), 3000)
      return
    }
    
    // Add new zone
    const updatedZones = [...currentZones, zoneTrimmed].sort()
    setZonesInput(updatedZones.join(', '))
    setNewZoneInput('')
    setError('')
    setSuccess(`Zone "${zoneTrimmed}" added successfully!`)
    setTimeout(() => setSuccess(''), 2000)
    
    // Focus back on input for continuous adding
    setTimeout(() => {
      const input = document.getElementById('zone-input') as HTMLInputElement
      if (input) {
        input.focus()
        input.select()
      }
    }, 150)
  }

  // Remove a zone
  const handleRemoveZone = (zoneToRemove: string) => {
    const currentZones = getZonesArray(zonesInput)
    const updatedZones = currentZones.filter(z => z !== zoneToRemove)
    setZonesInput(updatedZones.join(', '))
  }

  const handleSave = async () => {
    if (!selectedProject) {
      setError('Please select a project')
      return
    }

    if (!zonesInput.trim()) {
      setError('Please enter at least one zone')
      return
    }

    try {
      setSaving(true)
      setError('')
      setSuccess('')

      const supabase = getSupabaseClient()

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()

      // Normalize zones: trim and join with comma-space
      const normalizedZones = getZonesArray(zonesInput).join(', ')

      const zoneData = {
        project_code: selectedProject,
        zones: normalizedZones,
        updated_at: new Date().toISOString()
      }

      const existingZone = projectZones[selectedProject]

      if (existingZone) {
        // Update existing zone
        const { error: updateError } = await executeQuery(async () =>
          (supabase as any)
            .from('project_zones')
            .update(zoneData)
            .eq('id', existingZone.id)
        )

        if (updateError) throw updateError

        setProjectZones({
          ...projectZones,
          [selectedProject]: {
            ...existingZone,
            ...zoneData
          }
        })
      } else {
        // Create new zone
        const { data: newZone, error: insertError } = await executeQuery(async () =>
          (supabase as any)
            .from('project_zones')
            .insert({
              ...zoneData,
              created_by: user?.id || null
            } as any)
            .select()
            .single()
        )

        if (insertError) throw insertError

        if (newZone) {
          const zoneRecord = newZone as any
          setProjectZones({
            ...projectZones,
            [selectedProject]: {
              id: zoneRecord.id,
              project_code: selectedProject,
              zones: normalizedZones,
              created_at: zoneRecord.created_at,
              updated_at: zoneRecord.updated_at
            }
          })
        }
      }

      setSuccess('Zones saved successfully!')
      handleCancel()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      console.error('❌ Error saving zones:', err)
      setError(err.message || 'Failed to save zones')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (projectCode: string) => {
    const project = projects.find(p => p.project_code === projectCode)
    const projectName = project ? `${project.project_code} - ${project.project_name}` : projectCode
    
    if (!confirm(`Are you sure you want to delete all zones for project "${projectName}"?`)) return

    try {
      const existingZone = projectZones[projectCode]
      if (!existingZone) return

      const supabase = getSupabaseClient()

      const { error: deleteError } = await executeQuery(async () =>
        supabase
          .from('project_zones')
          .delete()
          .eq('id', existingZone.id)
      )

      if (deleteError) throw deleteError

      const newZones = { ...projectZones }
      delete newZones[projectCode]
      setProjectZones(newZones)

      setSuccess('Zones deleted successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      console.error('❌ Error deleting zones:', err)
      setError(err.message || 'Failed to delete zones')
    }
  }

  const getZonesArray = (zones: string): string[] => {
    if (!zones) return []
    return zones.split(',').map(z => z.trim()).filter(z => z.length > 0)
  }

  const selectedProjectData = projects.find(p => p.project_code === selectedProject)
  const zonesList = editingProjectCode ? getZonesArray(zonesInput) : []
  const projectsWithZones = Object.keys(projectZones).length
  const totalZones = Object.values(projectZones).reduce((sum, pz) => 
    sum + getZonesArray(pz.zones).length, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button
              variant="secondary"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <MapPin className="h-8 w-8 text-blue-600" />
                Project Zones Management
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage zones for each project. Zones will be available when creating BOQ activities.
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Projects</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{projects.length}</p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <MapPin className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Projects with Zones</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{projectsWithZones}</p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Tag className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Zones</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalZones}</p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Check className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <Alert variant="error" className="mb-4">
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="ml-4 text-red-600 hover:text-red-800">
              ✕
            </button>
          </div>
        </Alert>
      )}
      {success && (
        <Alert variant="success" className="mb-4">
          <div className="flex items-center justify-between">
            <span>{success}</span>
            <button onClick={() => setSuccess('')} className="ml-4 text-green-600 hover:text-green-800">
              ✕
            </button>
          </div>
        </Alert>
      )}

      {/* Add/Edit Form */}
      {editingProjectCode && (
        <Card className="mb-6 border-2 border-blue-200 dark:border-blue-700">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-600" />
                {projectZones[selectedProject] ? 'Edit' : 'Add'} Zones for Project
                {selectedProjectData && (
                  <Badge variant="default" className="ml-2">
                    {selectedProjectData.project_code}
                  </Badge>
                )}
              </span>
              <Button variant="secondary" size="sm" onClick={handleCancel}>
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Project <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedProject}
                  onChange={(e) => {
                    setSelectedProject(e.target.value)
                    const existing = projectZones[e.target.value]
                    setZonesInput(existing?.zones || '')
                    setNewZoneInput('')
                  }}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!!projectZones[selectedProject] && editingProjectCode === selectedProject}
                >
                  <option value="">Select Project...</option>
                  {projects.map((project) => (
                    <option key={project.project_code} value={project.project_code}>
                      {project.project_code} - {project.project_name}
                    </option>
                  ))}
                </select>
                {selectedProjectData && (
                  <p className="text-xs text-gray-500 mt-1">
                    📋 {selectedProjectData.project_name}
                  </p>
                )}
              </div>

              {/* Current Zones */}
              {zonesList.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Current Zones ({zonesList.length})
                  </label>
                  <div className="flex flex-wrap gap-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 min-h-[60px]">
                    {zonesList.map((zone, idx) => (
                      <Badge
                        key={idx}
                        variant="default"
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-900/50"
                      >
                        <span>{zone}</span>
                        <button
                          onClick={() => handleRemoveZone(zone)}
                          className="ml-1 hover:text-red-600 dark:hover:text-red-400"
                          type="button"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Add New Zone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Add Zones One by One
                  <span className="text-xs font-normal text-gray-500 ml-2">(Type → Add → Type → Add...)</span>
                </label>
                <div className="flex gap-2">
                  <Input
                    id="zone-input"
                    value={newZoneInput}
                    onChange={(e) => setNewZoneInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && newZoneInput.trim()) {
                        e.preventDefault()
                        handleAddZone()
                      }
                    }}
                    placeholder="Type zone name (e.g., Zone A), then click Add Zone"
                    className="flex-1"
                    autoFocus={true}
                  />
                  <Button
                    variant="primary"
                    onClick={handleAddZone}
                    disabled={!newZoneInput.trim() || saving}
                    className="flex items-center gap-2 min-w-[120px]"
                  >
                    <Plus className="h-4 w-4" />
                    Add Zone
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2 flex items-start gap-2">
                  <span className="text-lg">💡</span>
                  <span className="flex-1">
                    <strong>Workflow:</strong> Type a zone name → Click "Add Zone" (or press Enter) → Zone appears above → Input clears automatically → Type next zone → Repeat. 
                    This allows you to add multiple zones quickly without stopping!
                  </span>
                </p>
              </div>

              {/* Bulk Import */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bulk Import (Optional)
                  <span className="text-xs text-gray-500 ml-2 font-normal">
                    (Comma-separated)
                  </span>
                </label>
                <Input
                  value={zonesInput}
                  onChange={(e) => setZonesInput(e.target.value)}
                  placeholder="Zone A, Zone B, Zone C..."
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 You can also paste multiple zones separated by commas here.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button variant="secondary" onClick={handleCancel} disabled={saving}>
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  onClick={handleSave} 
                  disabled={saving || !selectedProject || zonesList.length === 0}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Zones'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filter */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setSelectedProjectFromDropdown('') // Clear dropdown when typing
                  // Don't auto-show here, let useEffect handle it based on matches
                }}
                onFocus={() => {
                  // Only show if we already have matching results
                  if (searchTerm.trim().length > 0 && filteredProjects.length > 0) {
                    setShowProjects(true)
                  }
                }}
                placeholder="🔍 Search by project code or name (results appear when matched)..."
                className="pl-10"
              />
            </div>
            
            {/* Projects Dropdown */}
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-gray-400" />
              <select
                value={selectedProjectFromDropdown}
                onChange={(e) => {
                  setSelectedProjectFromDropdown(e.target.value)
                  if (e.target.value) {
                    setSearchTerm('') // Clear search when selecting from dropdown
                    setShowProjects(true)
                  } else {
                    setShowProjects(false)
                  }
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
              >
                <option value="">Select Project...</option>
                {projects.map((project) => (
                  <option key={project.project_code} value={project.project_code}>
                    {project.project_code} - {project.project_name.length > 40 
                      ? `${project.project_name.substring(0, 40)}...` 
                      : project.project_name}
                  </option>
                ))}
              </select>
            </div>
            
            {showProjects && (
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-gray-400" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Projects</option>
                  <option value="with-zones">With Zones</option>
                  <option value="without-zones">Without Zones</option>
                </select>
              </div>
            )}
            {!editingProjectCode && (
              <Button
                variant="primary"
                onClick={() => {
                  setEditingProjectCode('new')
                  setSelectedProject('')
                  setZonesInput('')
                  setNewZoneInput('')
                }}
                className="flex items-center gap-2 whitespace-nowrap"
              >
                <Plus className="h-4 w-4" />
                Add Zones
              </Button>
            )}
            {showProjects && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowProjects(false)
                  setSearchTerm('')
                  setSelectedProjectFromDropdown('')
                  setFilterType('all')
                }}
                className="flex items-center gap-2 whitespace-nowrap"
              >
                <X className="h-4 w-4" />
                Hide Projects
              </Button>
            )}
          </div>
          {!showProjects && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
              💡 Type in the search box or select a project from the dropdown to find and manage project zones
            </p>
          )}
        </CardContent>
      </Card>

      {/* Zones List */}
      {showProjects && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Project Zones ({filteredProjects.length} of {projects.length})</span>
              {searchTerm || filterType !== 'all' ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('')
                    setFilterType('all')
                    setShowProjects(false)
                  }}
                >
                  Clear Filters
                </Button>
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredProjects.length === 0 ? (
              <div className="text-center py-12">
                <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">
                  {projects.length === 0 
                    ? 'No projects found. Create a project first.'
                    : searchTerm.trim().length > 0
                    ? `No projects found matching "${searchTerm}"`
                    : 'No projects match your filter criteria.'}
                </p>
                {projects.length > 0 && searchTerm.trim().length > 0 && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    Try a different search term or clear the search to see all projects
                  </p>
                )}
                {projects.length > 0 && (searchTerm || filterType !== 'all') && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSearchTerm('')
                      setFilterType('all')
                      setShowProjects(false)
                    }}
                    className="mt-4"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
            <div className="space-y-4">
              {filteredProjects.map((project) => {
                const zones = projectZones[project.project_code]
                const zonesList = zones ? getZonesArray(zones.zones) : []

                return (
                  <Card 
                    key={project.project_code}
                    className={`transition-all hover:shadow-lg ${
                      zones ? 'border-l-4 border-l-blue-500' : 'border-l-4 border-l-gray-300'
                    }`}
                  >
                    <CardContent className="pt-6">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {project.project_code}
                            </h3>
                            {zones && (
                              <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                {zonesList.length} {zonesList.length === 1 ? 'Zone' : 'Zones'}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            {project.project_name}
                          </p>
                          
                          {/* Zones Display */}
                          {zonesList.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {zonesList.map((zone, idx) => (
                                <Badge
                                  key={idx}
                                  variant="default"
                                  className="px-3 py-1.5 text-sm font-medium bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 dark:from-blue-900/30 dark:to-indigo-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-700"
                                >
                                  <Tag className="h-3 w-3 mr-1 inline" />
                                  {zone}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 italic">
                              <MapPin className="h-4 w-4" />
                              No zones defined
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleEdit(project.project_code)}
                            className="flex items-center gap-2"
                          >
                            <Edit2 className="h-4 w-4" />
                            {zones ? 'Edit' : 'Add Zones'}
                          </Button>
                          {zones && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(project.project_code)}
                              className="flex items-center gap-2"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {!showProjects && !editingProjectCode && (
        <Card>
          <CardContent className="pt-12 pb-12">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 mb-6">
                <Search className="h-10 w-10 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Search for Projects
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                Use the search box above to find projects and manage their zones. 
                Projects will appear as you type.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                <Button
                  variant="primary"
                  onClick={() => {
                    setEditingProjectCode('new')
                    setSelectedProject('')
                    setZonesInput('')
                    setNewZoneInput('')
                  }}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Zones to New Project
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setShowProjects(true)}
                  className="flex items-center gap-2"
                >
                  <Search className="h-4 w-4" />
                  Show All Projects
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
