'use client'

import { useState, useEffect } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { getSupabaseClient, executeQuery } from '@/lib/simpleConnectionManager'
import { ModernCard } from '@/components/ui/ModernCard'
import { ModernButton } from '@/components/ui/ModernButton'
import { ModernBadge } from '@/components/ui/ModernBadge'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import {
  FolderTree,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Search,
  ChevronDown,
  ChevronRight,
  Activity,
  Settings,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Copy,
  ArrowUpDown,
  BarChart3,
  List
} from 'lucide-react'

interface ProjectType {
  id: string
  name: string
  code?: string
  description?: string
  is_active: boolean
  usage_count: number
  created_at?: string
  updated_at?: string
}

interface ProjectActivity {
  id: string
  project_type: string
  activity_name: string
  activity_name_ar?: string
  description?: string
  default_unit?: string
  estimated_rate?: number
  category?: string
  typical_duration?: number
  division?: string
  usage_count: number
  is_active: boolean
  is_default: boolean
  display_order: number
  created_at?: string
  updated_at?: string
}

export function UnifiedProjectTypesManager() {
  const guard = usePermissionGuard()
  const supabase = getSupabaseClient()
  
  // State
  const [projectTypes, setProjectTypes] = useState<ProjectType[]>([])
  const [activities, setActivities] = useState<Record<string, ProjectActivity[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  
  // UI State
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set())
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [showTypeForm, setShowTypeForm] = useState(false)
  const [showActivityForm, setShowActivityForm] = useState(false)
  const [editingType, setEditingType] = useState<ProjectType | null>(null)
  const [editingActivity, setEditingActivity] = useState<ProjectActivity | null>(null)
  
  // Form State - Project Type
  const [typeFormData, setTypeFormData] = useState({
    name: '',
    code: '',
    description: ''
  })
  
  // Form State - Activity
  const [activityFormData, setActivityFormData] = useState({
    project_type: '',
    activity_name: '',
    activity_name_ar: '',
    description: '',
    default_unit: '',
    estimated_rate: '',
    category: '',
    typical_duration: '',
    division: '',
    display_order: '0'
  })

  // Load Data
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')
      
      // Load project types
      const { data: typesData, error: typesError } = await executeQuery(async () =>
        supabase
          .from('project_types')
          .select('*')
          .order('name', { ascending: true })
      )
      
      if (typesError) throw typesError
      setProjectTypes(typesData || [])
      
      // Load all activities
      const { data: activitiesData, error: activitiesError } = await executeQuery(async () =>
        supabase
          .from('project_type_activities')
          .select('*')
          .order('display_order', { ascending: true })
      )
      
      if (activitiesError) throw activitiesError
      
      // Group activities by project type
      const groupedActivities: Record<string, ProjectActivity[]> = {}
      activitiesData?.forEach((activity: any) => {
        if (!groupedActivities[activity.project_type]) {
          groupedActivities[activity.project_type] = []
        }
        groupedActivities[activity.project_type].push(activity)
      })
      
      setActivities(groupedActivities)
      
    } catch (err: any) {
      setError('Failed to load data: ' + err.message)
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Project Type Functions
  const handleAddType = () => {
    setEditingType(null)
    setTypeFormData({ name: '', code: '', description: '' })
    setShowTypeForm(true)
    setShowActivityForm(false)
  }

  const handleEditType = (type: ProjectType) => {
    setEditingType(type)
    setTypeFormData({
      name: type.name,
      code: type.code || '',
      description: type.description || ''
    })
    setShowTypeForm(true)
    setShowActivityForm(false)
  }

  const handleSaveType = async () => {
    try {
      setLoading(true)
      setError('')
      
      if (!typeFormData.name.trim()) {
        setError('Project type name is required')
        return
      }
      
      if (editingType) {
        // Update
        const { error } = await executeQuery(async () =>
          (supabase as any)
            .from('project_types')
            .update({
              name: typeFormData.name.trim(),
              code: typeFormData.code.trim(),
              description: typeFormData.description.trim(),
              updated_at: new Date().toISOString()
            })
            .eq('id', editingType.id)
        )
        
        if (error) throw error
        setSuccess('Project type updated successfully')
      } else {
        // Create
        const { error } = await executeQuery(async () =>
          (supabase as any)
            .from('project_types')
            .insert({
              name: typeFormData.name.trim(),
              code: typeFormData.code.trim(),
              description: typeFormData.description.trim(),
              is_active: true,
              usage_count: 0
            })
        )
        
        if (error) throw error
        setSuccess('Project type added successfully')
      }
      
      setShowTypeForm(false)
      await loadData()
      
    } catch (err: any) {
      setError(err.message || 'Failed to save project type')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteType = async (type: ProjectType) => {
    if (!confirm(`Are you sure you want to delete "${type.name}"? This will ${type.usage_count > 0 ? 'disable' : 'delete'} the type.`)) {
      return
    }
    
    try {
      setLoading(true)
      setError('')
      
      // Use safe delete function
      const { data, error } = await executeQuery(async () =>
        (supabase as any).rpc('safe_delete_project_type', {
          p_project_type_name: type.name
        })
      )
      
      if (error) throw error
      
      if ((data as any)?.action === 'disabled') {
        setSuccess(`Disabled "${type.name}" and ${(data as any).activities_affected} activities`)
      } else {
        setSuccess(`Deleted "${type.name}"`)
      }
      
      await loadData()
      
    } catch (err: any) {
      setError(err.message || 'Failed to delete project type')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleTypeActive = async (type: ProjectType) => {
    try {
      setLoading(true)
      setError('')
      
      if (!type.is_active) {
        // Re-enable
        const { error } = await executeQuery(async () =>
          (supabase as any).rpc('enable_project_type', {
            p_project_type_name: type.name
          })
        )
        
        if (error) throw error
        setSuccess(`Re-enabled "${type.name}"`)
      } else {
        // Disable
        const { error } = await executeQuery(async () =>
          (supabase as any)
            .from('project_types')
            .update({
              is_active: false,
              updated_at: new Date().toISOString()
            })
            .eq('id', type.id)
        )
        
        if (error) throw error
        setSuccess(`Disabled "${type.name}"`)
      }
      
      await loadData()
      
    } catch (err: any) {
      setError(err.message || 'Failed to toggle project type')
    } finally {
      setLoading(false)
    }
  }

  // Activity Functions
  const handleAddActivity = (projectType: string) => {
    setEditingActivity(null)
    setActivityFormData({
      project_type: projectType,
      activity_name: '',
      activity_name_ar: '',
      description: '',
      default_unit: '',
      estimated_rate: '',
      category: '',
      typical_duration: '',
      division: '',
      display_order: '0'
    })
    setSelectedType(projectType)
    setShowActivityForm(true)
    setShowTypeForm(false)
  }

  const handleEditActivity = (activity: ProjectActivity) => {
    setEditingActivity(activity)
    setActivityFormData({
      project_type: activity.project_type,
      activity_name: activity.activity_name,
      activity_name_ar: activity.activity_name_ar || '',
      description: activity.description || '',
      default_unit: activity.default_unit || '',
      estimated_rate: activity.estimated_rate?.toString() || '',
      category: activity.category || '',
      typical_duration: activity.typical_duration?.toString() || '',
      division: activity.division || '',
      display_order: activity.display_order?.toString() || '0'
    })
    setSelectedType(activity.project_type)
    setShowActivityForm(true)
    setShowTypeForm(false)
  }

  const handleSaveActivity = async () => {
    try {
      setLoading(true)
      setError('')
      
      if (!activityFormData.activity_name.trim()) {
        setError('Activity name is required')
        return
      }
      
      const activityData = {
        project_type: activityFormData.project_type,
        activity_name: activityFormData.activity_name.trim(),
        activity_name_ar: activityFormData.activity_name_ar.trim() || null,
        description: activityFormData.description.trim() || null,
        default_unit: activityFormData.default_unit.trim() || null,
        estimated_rate: activityFormData.estimated_rate ? parseFloat(activityFormData.estimated_rate) : null,
        category: activityFormData.category.trim() || null,
        typical_duration: activityFormData.typical_duration ? parseInt(activityFormData.typical_duration) : null,
        division: activityFormData.division.trim() || null,
        display_order: parseInt(activityFormData.display_order) || 0,
        is_active: true,
        updated_at: new Date().toISOString()
      }
      
      if (editingActivity) {
        // Update
        const { error } = await executeQuery(async () =>
          (supabase as any)
            .from('project_type_activities')
            .update(activityData)
            .eq('id', editingActivity.id)
        )
        
        if (error) throw error
        setSuccess('Activity updated successfully')
      } else {
        // Create
        const { error } = await executeQuery(async () =>
          (supabase as any)
            .from('project_type_activities')
            .insert({
              ...activityData,
              is_default: false,
              usage_count: 0
            })
        )
        
        if (error) throw error
        setSuccess('Activity added successfully')
      }
      
      setShowActivityForm(false)
      await loadData()
      
    } catch (err: any) {
      setError(err.message || 'Failed to save activity')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteActivity = async (activity: ProjectActivity) => {
    if (!confirm(`Are you sure you want to delete "${activity.activity_name}"?`)) {
      return
    }
    
    try {
      setLoading(true)
      setError('')
      
      const { error } = await executeQuery(async () =>
        supabase
          .from('project_type_activities')
          .delete()
          .eq('id', activity.id)
      )
      
      if (error) throw error
      setSuccess('Activity deleted successfully')
      await loadData()
      
    } catch (err: any) {
      setError(err.message || 'Failed to delete activity')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActivityActive = async (activity: ProjectActivity) => {
    try {
      setLoading(true)
      setError('')
      
      const { error } = await executeQuery(async () =>
        (supabase as any)
          .from('project_type_activities')
          .update({
            is_active: !activity.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', activity.id)
      )
      
      if (error) throw error
      setSuccess(`Activity ${!activity.is_active ? 'enabled' : 'disabled'}`)
      await loadData()
      
    } catch (err: any) {
      setError(err.message || 'Failed to toggle activity')
    } finally {
      setLoading(false)
    }
  }

  // UI Functions
  const toggleExpanded = (typeName: string) => {
    const newExpanded = new Set(expandedTypes)
    if (newExpanded.has(typeName)) {
      newExpanded.delete(typeName)
    } else {
      newExpanded.add(typeName)
    }
    setExpandedTypes(newExpanded)
  }

  const expandAll = () => {
    setExpandedTypes(new Set(projectTypes.map(t => t.name)))
  }

  const collapseAll = () => {
    setExpandedTypes(new Set())
  }

  // Filter
  const filteredTypes = projectTypes.filter(type =>
    type.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    type.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    type.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading && projectTypes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading project types and activities...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FolderTree className="h-7 w-7 text-blue-600" />
            Project Types & Activities Management
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Unified management for project types and their activities
          </p>
        </div>
        
        <ModernButton
          onClick={handleAddType}
          variant="primary"
          size="md"
          icon={<Plus className="h-4 w-4" />}
        >
          Add Project Type
        </ModernButton>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="error">
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="ml-2">
              <X className="h-4 w-4" />
            </button>
          </div>
        </Alert>
      )}
      
      {success && (
        <Alert variant="success">
          <div className="flex items-center justify-between">
            <span>{success}</span>
            <button onClick={() => setSuccess('')} className="ml-2">
              <X className="h-4 w-4" />
            </button>
          </div>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <ModernCard>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FolderTree className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Project Types</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {projectTypes.filter(t => t.is_active).length}
              </p>
            </div>
          </div>
        </ModernCard>

        <ModernCard>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Activity className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Activities</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {Object.values(activities).flat().filter(a => a.is_active).length}
              </p>
            </div>
          </div>
        </ModernCard>

        <ModernCard>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <List className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Categories</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {new Set(Object.values(activities).flat().map(a => a.category).filter(Boolean)).size}
              </p>
            </div>
          </div>
        </ModernCard>

        <ModernCard>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <BarChart3 className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg per Type</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {projectTypes.length > 0 
                  ? Math.round(Object.values(activities).flat().length / projectTypes.length)
                  : 0}
              </p>
            </div>
          </div>
        </ModernCard>
      </div>

      {/* Search and Controls */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search project types..."
            className="pl-10"
          />
        </div>
        
        <ModernButton
          onClick={expandAll}
          variant="outline"
          size="sm"
        >
          Expand All
        </ModernButton>
        
        <ModernButton
          onClick={collapseAll}
          variant="outline"
          size="sm"
        >
          Collapse All
        </ModernButton>
      </div>

      {/* Project Types List */}
      <div className="space-y-4">
        {filteredTypes.map((type) => {
          const typeActivities = activities[type.name] || []
          const isExpanded = expandedTypes.has(type.name)
          const activeActivities = typeActivities.filter(a => a.is_active).length
          
          return (
            <ModernCard key={type.id} className={!type.is_active ? 'opacity-60' : ''}>
              {/* Project Type Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-4 flex-1">
                  <button
                    onClick={() => toggleExpanded(type.name)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-gray-600" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-600" />
                    )}
                  </button>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {type.name}
                      </h3>
                      {type.code && (
                        <ModernBadge variant="info" size="sm">
                          {type.code}
                        </ModernBadge>
                      )}
                      {!type.is_active && (
                        <ModernBadge variant="gray" size="sm">
                          <EyeOff className="h-3 w-3 mr-1" />
                          Disabled
                        </ModernBadge>
                      )}
                    </div>
                    {type.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {type.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span>{activeActivities} activities</span>
                      <span>•</span>
                      <span>{type.usage_count} uses</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <ModernButton
                    onClick={() => handleAddActivity(type.name)}
                    variant="outline"
                    size="sm"
                    icon={<Plus className="h-4 w-4" />}
                  >
                    Add Activity
                  </ModernButton>
                  
                  <ModernButton
                    onClick={() => handleEditType(type)}
                    variant="outline"
                    size="sm"
                    icon={<Edit2 className="h-4 w-4" />}
                  >
                    Edit
                  </ModernButton>
                  
                  <ModernButton
                    onClick={() => handleToggleTypeActive(type)}
                    variant="outline"
                    size="sm"
                    icon={type.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  >
                    {type.is_active ? 'Disable' : 'Enable'}
                  </ModernButton>
                  
                  <ModernButton
                    onClick={() => handleDeleteType(type)}
                    variant="danger"
                    size="sm"
                    icon={<Trash2 className="h-4 w-4" />}
                  >
                    Delete
                  </ModernButton>
                </div>
              </div>

              {/* Activities List */}
              {isExpanded && (
                <div className="p-4">
                  {typeActivities.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Activity className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>No activities yet</p>
                      <ModernButton
                        onClick={() => handleAddActivity(type.name)}
                        variant="outline"
                        size="sm"
                        className="mt-3"
                      >
                        Add First Activity
                      </ModernButton>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {typeActivities.map((activity) => (
                        <div
                          key={activity.id}
                          className={`flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg ${
                            !activity.is_active ? 'opacity-50' : ''
                          }`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900 dark:text-white">
                                {activity.activity_name}
                              </span>
                              {activity.category && (
                                <ModernBadge variant="purple" size="sm">
                                  {activity.category}
                                </ModernBadge>
                              )}
                              {!activity.is_active && (
                                <ModernBadge variant="gray" size="sm">
                                  Disabled
                                </ModernBadge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                              {activity.default_unit && <span>Unit: {activity.default_unit}</span>}
                              {activity.typical_duration && (
                                <>
                                  <span>•</span>
                                  <span>{activity.typical_duration} days</span>
                                </>
                              )}
                              {activity.usage_count > 0 && (
                                <>
                                  <span>•</span>
                                  <span>{activity.usage_count} uses</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <ModernButton
                              onClick={() => handleEditActivity(activity)}
                              variant="outline"
                              size="sm"
                              icon={<Edit2 className="h-3 w-3" />}
                            >
                              Edit
                            </ModernButton>
                            
                            <ModernButton
                              onClick={() => handleToggleActivityActive(activity)}
                              variant="outline"
                              size="sm"
                              icon={activity.is_active ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            >
                              {activity.is_active ? 'Disable' : 'Enable'}
                            </ModernButton>
                            
                            <ModernButton
                              onClick={() => handleDeleteActivity(activity)}
                              variant="danger"
                              size="sm"
                              icon={<Trash2 className="h-3 w-3" />}
                            >
                              Delete
                            </ModernButton>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </ModernCard>
          )
        })}
      </div>

      {/* Project Type Form Modal */}
      {showTypeForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <ModernCard className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {editingType ? 'Edit Project Type' : 'Add Project Type'}
              </h3>
              <button
                onClick={() => setShowTypeForm(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={typeFormData.name}
                  onChange={(e) => setTypeFormData({ ...typeFormData, name: e.target.value })}
                  placeholder="e.g., Infrastructure"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Code
                </label>
                <Input
                  value={typeFormData.code}
                  onChange={(e) => setTypeFormData({ ...typeFormData, code: e.target.value })}
                  placeholder="e.g., INF"
                  maxLength={10}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={typeFormData.description}
                  onChange={(e) => setTypeFormData({ ...typeFormData, description: e.target.value })}
                  placeholder="Brief description of this project type"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <ModernButton
                  onClick={() => setShowTypeForm(false)}
                  variant="outline"
                  size="md"
                >
                  Cancel
                </ModernButton>
                <ModernButton
                  onClick={handleSaveType}
                  variant="primary"
                  size="md"
                  icon={<Save className="h-4 w-4" />}
                  disabled={loading}
                >
                  {editingType ? 'Update' : 'Create'}
                </ModernButton>
              </div>
            </div>
          </ModernCard>
        </div>
      )}

      {/* Activity Form Modal */}
      {showActivityForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <ModernCard className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {editingActivity ? 'Edit Activity' : 'Add Activity'}
              </h3>
              <button
                onClick={() => setShowActivityForm(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Activity Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={activityFormData.activity_name}
                    onChange={(e) => setActivityFormData({ ...activityFormData, activity_name: e.target.value })}
                    placeholder="e.g., Bored Piling"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Arabic Name
                  </label>
                  <Input
                    value={activityFormData.activity_name_ar}
                    onChange={(e) => setActivityFormData({ ...activityFormData, activity_name_ar: e.target.value })}
                    placeholder="الاسم بالعربي"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category
                  </label>
                  <Input
                    value={activityFormData.category}
                    onChange={(e) => setActivityFormData({ ...activityFormData, category: e.target.value })}
                    placeholder="e.g., Piling"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Default Unit
                  </label>
                  <Input
                    value={activityFormData.default_unit}
                    onChange={(e) => setActivityFormData({ ...activityFormData, default_unit: e.target.value })}
                    placeholder="e.g., Meter"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Estimated Rate
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={activityFormData.estimated_rate}
                    onChange={(e) => setActivityFormData({ ...activityFormData, estimated_rate: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Typical Duration (days)
                  </label>
                  <Input
                    type="number"
                    value={activityFormData.typical_duration}
                    onChange={(e) => setActivityFormData({ ...activityFormData, typical_duration: e.target.value })}
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Division
                  </label>
                  <Input
                    value={activityFormData.division}
                    onChange={(e) => setActivityFormData({ ...activityFormData, division: e.target.value })}
                    placeholder="e.g., Civil Division"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Display Order
                  </label>
                  <Input
                    type="number"
                    value={activityFormData.display_order}
                    onChange={(e) => setActivityFormData({ ...activityFormData, display_order: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={activityFormData.description}
                  onChange={(e) => setActivityFormData({ ...activityFormData, description: e.target.value })}
                  placeholder="Brief description of this activity"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <ModernButton
                  onClick={() => setShowActivityForm(false)}
                  variant="outline"
                  size="md"
                >
                  Cancel
                </ModernButton>
                <ModernButton
                  onClick={handleSaveActivity}
                  variant="primary"
                  size="md"
                  icon={<Save className="h-4 w-4" />}
                  disabled={loading}
                >
                  {editingActivity ? 'Update' : 'Create'}
                </ModernButton>
              </div>
            </div>
          </ModernCard>
        </div>
      )}
    </div>
  )
}
