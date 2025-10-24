'use client'

import { useState, useEffect } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { ModernCard } from '@/components/ui/ModernCard'
import { ModernButton } from '@/components/ui/ModernButton'
import { ModernBadge } from '@/components/ui/ModernBadge'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import {
  getActivitiesByProjectType,
  getAllActivities,
  getProjectTypesWithActivities,
  addActivity,
  updateActivity,
  deleteActivity,
  restoreActivity,
  copyActivities,
  getActivityStats,
  type ProjectTypeActivity,
  type ProjectTypeActivityFormData,
  type ActivityStats
} from '@/lib/projectTypeActivitiesManager'
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Copy,
  BarChart3,
  Package,
  AlertCircle,
  CheckCircle,
  Search,
  Filter,
  ArrowUpDown,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react'

export function ProjectTypeActivitiesManager() {
  const guard = usePermissionGuard()
  
  // State
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activities, setActivities] = useState<Record<string, ProjectTypeActivity[]>>({})
  const [projectTypes, setProjectTypes] = useState<string[]>([])
  const [selectedProjectType, setSelectedProjectType] = useState<string>('')
  const [stats, setStats] = useState<ActivityStats | null>(null)
  
  // Form state
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingActivity, setEditingActivity] = useState<ProjectTypeActivity | null>(null)
  const [formData, setFormData] = useState<ProjectTypeActivityFormData>({
    project_type: '',
    activity_name: '',
    activity_name_ar: '',
    description: '',
    default_unit: '',
    estimated_rate: 0,
    category: '',
    display_order: 0
  })
  
  // Filter & Search
  const [searchTerm, setSearchTerm] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [filterCategory, setFilterCategory] = useState<string>('')
  
  // Messages
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Check permissions
  const canManage = guard.hasAccess('settings.activities')
  const canView = guard.hasAccess('settings.view')

  useEffect(() => {
    loadData()
  }, [showInactive])

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')
      
      console.log('🔍 Loading project type activities...')
      
      const [allActivitiesData, typesData, statsData] = await Promise.all([
        getAllActivities(showInactive),
        getProjectTypesWithActivities(),
        getActivityStats()
      ])
      
      console.log('📊 Loaded data:', {
        activities: Object.keys(allActivitiesData).length,
        types: typesData.length,
        stats: statsData
      })
      
      setActivities(allActivitiesData)
      setProjectTypes(typesData)
      setStats(statsData)
      
      // Auto-select first project type if none selected
      if (!selectedProjectType && typesData.length > 0) {
        setSelectedProjectType(typesData[0])
      }
      
      // If no data loaded, show message
      if (typesData.length === 0) {
        console.log('⚠️ No project types found. Check database setup.')
        setError('No project types found. Please run the SQL script in Supabase.')
      }
      
    } catch (error: any) {
      console.error('❌ Error loading activities:', error)
      setError('Failed to load activities: ' + error.message)
      
      // Fallback: Set empty data to prevent UI crash
      setActivities({})
      setProjectTypes([])
      setStats({
        totalActivities: 0,
        activeActivities: 0,
        inactiveActivities: 0,
        defaultActivities: 0,
        customActivities: 0,
        activitiesByProjectType: {},
        activitiesByCategory: {}
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddActivity = () => {
    setFormData({
      project_type: selectedProjectType || '',
      activity_name: '',
      activity_name_ar: '',
      description: '',
      default_unit: '',
      estimated_rate: 0,
      category: '',
      display_order: currentActivities.length
    })
    setEditingActivity(null)
    setShowAddForm(true)
  }

  const handleEditActivity = (activity: ProjectTypeActivity) => {
    setFormData({
      project_type: activity.project_type,
      activity_name: activity.activity_name,
      activity_name_ar: activity.activity_name_ar || '',
      description: activity.description || '',
      default_unit: activity.default_unit || '',
      estimated_rate: activity.estimated_rate || 0,
      category: activity.category || '',
      display_order: activity.display_order
    })
    setEditingActivity(activity)
    setShowAddForm(true)
  }

  const handleSaveActivity = async () => {
    try {
      setSaving(true)
      setError('')
      setSuccess('')
      
      if (!formData.activity_name.trim()) {
        setError('Activity name is required')
        return
      }
      
      if (!formData.project_type.trim()) {
        setError('Project type is required')
        return
      }
      
      let result
      if (editingActivity) {
        // Update existing
        result = await updateActivity(editingActivity.id, formData)
      } else {
        // Add new
        result = await addActivity(formData)
      }
      
      if (result.success) {
        setSuccess(editingActivity ? 'Activity updated successfully!' : 'Activity added successfully!')
        setShowAddForm(false)
        setEditingActivity(null)
        await loadData()
      } else {
        setError(result.error || 'Failed to save activity')
      }
      
    } catch (error: any) {
      setError('Error saving activity: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteActivity = async (activityId: string, activityName: string) => {
    if (!confirm(`Are you sure you want to delete "${activityName}"?\nThis will mark it as inactive.`)) {
      return
    }
    
    try {
      setSaving(true)
      setError('')
      setSuccess('')
      
      const result = await deleteActivity(activityId, false)
      
      if (result.success) {
        setSuccess('Activity deleted successfully!')
        await loadData()
      } else {
        setError(result.error || 'Failed to delete activity')
      }
      
    } catch (error: any) {
      setError('Error deleting activity: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleRestoreActivity = async (activityId: string, activityName: string) => {
    try {
      setSaving(true)
      setError('')
      setSuccess('')
      
      const result = await restoreActivity(activityId)
      
      if (result.success) {
        setSuccess(`Activity "${activityName}" restored successfully!`)
        await loadData()
      } else {
        setError(result.error || 'Failed to restore activity')
      }
      
    } catch (error: any) {
      setError('Error restoring activity: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleCopyActivities = async () => {
    const toProjectType = prompt('Enter target project type name:')
    if (!toProjectType?.trim()) return
    
    try {
      setSaving(true)
      setError('')
      setSuccess('')
      
      const result = await copyActivities(selectedProjectType, toProjectType.trim())
      
      if (result.success) {
        setSuccess(`${result.copied} activities copied to "${toProjectType}" successfully!`)
        await loadData()
      } else {
        setError(result.error || 'Failed to copy activities')
      }
      
    } catch (error: any) {
      setError('Error copying activities: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  // Get current activities for selected project type
  const currentActivities = selectedProjectType ? (activities[selectedProjectType] || []) : []
  
  // Filter activities
  const filteredActivities = currentActivities.filter(activity => {
    const matchesSearch = !searchTerm || 
      activity.activity_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.activity_name_ar?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.category?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = !filterCategory || activity.category === filterCategory
    
    return matchesSearch && matchesCategory
  })

  // Get unique categories
  const categoryList = currentActivities.map(a => a.category).filter(Boolean)
  const categories = Array.from(new Set(categoryList)) as string[]

  // Common units
  const commonUnits = [
    'No.', 'Meter', 'Lump Sum', 'm²', 'm³', 'Ton', 'Day', 'Week', 'Month',
    'Linear Meter', 'Square Meter', 'Cubic Meter', 'Kilogram', 'Set'
  ]

  if (!canView) {
    return (
      <div className="p-6">
        <Alert variant="error">
          <AlertCircle className="h-5 w-5" />
          <span>You do not have permission to view activities management.</span>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Project Type Activities
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage activities for each project type
          </p>
        </div>
        
        {canManage && (
          <div className="flex gap-2">
            <ModernButton
              variant="outline"
              onClick={() => setShowInactive(!showInactive)}
              icon={showInactive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            >
              {showInactive ? 'Show Active Only' : 'Show All'}
            </ModernButton>
            
            <ModernButton
              variant="outline"
              onClick={loadData}
              icon={<RefreshCw className="h-4 w-4" />}
              disabled={loading}
            >
              Refresh
            </ModernButton>
          </div>
        )}
      </div>

      {/* Statistics */}
      {stats && stats.totalActivities > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <ModernCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Activities</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {stats.totalActivities}
                </p>
              </div>
            </div>
          </ModernCard>

          <ModernCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {stats.activeActivities}
                </p>
              </div>
            </div>
          </ModernCard>

          <ModernCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 dark:bg-gray-900/20 rounded-lg">
                <EyeOff className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Inactive</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {stats.inactiveActivities}
                </p>
              </div>
            </div>
          </ModernCard>

          <ModernCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Default</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {stats.defaultActivities}
                </p>
              </div>
            </div>
          </ModernCard>

          <ModernCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <Package className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Custom</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {stats.customActivities}
                </p>
              </div>
            </div>
          </ModernCard>
        </div>
      ) : stats && stats.totalActivities === 0 ? (
        <div className="text-center py-8">
          <AlertCircle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            No activities found
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            Run SQL script in Supabase to create default activities
          </p>
        </div>
      ) : null}

      {/* Messages */}
      {error && (
        <Alert variant="error">
          <div className="flex items-center justify-between w-full">
            <div>
              <span>{error}</span>
              {error.includes('No project types found') && (
                <div className="mt-2 text-sm">
                  <p>🔧 <strong>Solution:</strong></p>
                  <ol className="list-decimal list-inside mt-1 space-y-1">
                    <li>Go to Supabase Dashboard → SQL Editor</li>
                    <li>Copy and paste the content from <code>Database/project_type_activities_table.sql</code></li>
                    <li>Click RUN to execute the script</li>
                    <li>Click the Refresh button above</li>
                  </ol>
                </div>
              )}
            </div>
            <button onClick={() => setError('')} className="text-red-600 hover:text-red-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        </Alert>
      )}
      
      {success && (
        <Alert variant="success">
          <div className="flex items-center justify-between w-full">
            <span>{success}</span>
            <button onClick={() => setSuccess('')} className="text-green-600 hover:text-green-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        </Alert>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Project Types List */}
        <ModernCard className="p-4 lg:col-span-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Project Types
          </h3>
          
          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : projectTypes.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                No project types found
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                Run SQL script in Supabase
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {projectTypes.map(type => (
                <button
                  key={type}
                  onClick={() => setSelectedProjectType(type)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                    selectedProjectType === type
                      ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium'
                      : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{type}</span>
                    <ModernBadge variant="info">
                      {activities[type]?.length || 0}
                    </ModernBadge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ModernCard>

        {/* Activities List */}
        <ModernCard className="p-6 lg:col-span-3">
          <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search activities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {categories.length > 0 && (
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              )}

              {canManage && selectedProjectType && (
                <div className="flex gap-2">
                  <ModernButton
                    variant="outline"
                    onClick={handleCopyActivities}
                    icon={<Copy className="h-4 w-4" />}
                    disabled={currentActivities.length === 0}
                  >
                    Copy
                  </ModernButton>
                  
                  <ModernButton
                    variant="primary"
                    onClick={handleAddActivity}
                    icon={<Plus className="h-4 w-4" />}
                  >
                    Add Activity
                  </ModernButton>
                </div>
              )}
            </div>

            {/* Activities Table */}
            {!selectedProjectType ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  {projectTypes.length === 0 
                    ? 'No project types found. Please run the SQL script in Supabase.'
                    : 'Select a project type to view its activities'
                  }
                </p>
                {projectTypes.length === 0 && (
                  <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      <strong>Setup Required:</strong> Run the SQL script to create project type activities.
                    </p>
                  </div>
                )}
              </div>
            ) : filteredActivities.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  {searchTerm || filterCategory ? 'No activities match your filters' : 'No activities found for this project type'}
                </p>
                {canManage && !searchTerm && !filterCategory && (
                  <ModernButton
                    variant="primary"
                    onClick={handleAddActivity}
                    icon={<Plus className="h-4 w-4" />}
                    className="mt-4"
                  >
                    Add First Activity
                  </ModernButton>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Activity Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Unit
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Rate
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      {canManage && (
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredActivities.map(activity => (
                      <tr key={activity.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {activity.activity_name}
                            </p>
                            {activity.activity_name_ar && (
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {activity.activity_name_ar}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                          {activity.category || '-'}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                          {activity.default_unit || '-'}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                          {activity.estimated_rate ? `${activity.estimated_rate.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex gap-2">
                            <ModernBadge variant={activity.is_active ? 'success' : 'error'}>
                              {activity.is_active ? 'Active' : 'Inactive'}
                            </ModernBadge>
                            {activity.is_default && (
                              <ModernBadge variant="info">Default</ModernBadge>
                            )}
                          </div>
                        </td>
                        {canManage && (
                          <td className="px-4 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleEditActivity(activity)}
                                className="p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                title="Edit"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              
                              {activity.is_active ? (
                                <button
                                  onClick={() => handleDeleteActivity(activity.id, activity.activity_name)}
                                  className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleRestoreActivity(activity.id, activity.activity_name)}
                                  className="p-2 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                                  title="Restore"
                                >
                                  <RefreshCw className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </ModernCard>
      </div>

      {/* Add/Edit Form Modal */}
      {showAddForm && canManage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <ModernCard className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {editingActivity ? 'Edit Activity' : 'Add New Activity'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Project Type *
                </label>
                <Input
                  value={formData.project_type}
                  onChange={(e) => setFormData({ ...formData, project_type: e.target.value })}
                  placeholder="e.g., Piling, Shoring, Infrastructure"
                  disabled={!!editingActivity}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Activity Name (English) *
                  </label>
                  <Input
                    value={formData.activity_name}
                    onChange={(e) => setFormData({ ...formData, activity_name: e.target.value })}
                    placeholder="e.g., C.Piles 800mm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Activity Name (Arabic)
                  </label>
                  <Input
                    value={formData.activity_name_ar}
                    onChange={(e) => setFormData({ ...formData, activity_name_ar: e.target.value })}
                    placeholder="Example: 800mm Continuous Piles"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the activity..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Default Unit
                  </label>
                  <select
                    value={formData.default_unit}
                    onChange={(e) => setFormData({ ...formData, default_unit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Select unit...</option>
                    {commonUnits.map(unit => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Estimated Rate
                  </label>
                  <Input
                    type="number"
                    value={formData.estimated_rate}
                    onChange={(e) => setFormData({ ...formData, estimated_rate: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Category
                  </label>
                  <Input
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g., Piling, Excavation"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <ModernButton
                  variant="outline"
                  onClick={() => {
                    setShowAddForm(false)
                    setEditingActivity(null)
                  }}
                  icon={<X className="h-4 w-4" />}
                  disabled={saving}
                >
                  Cancel
                </ModernButton>
                
                <ModernButton
                  variant="primary"
                  onClick={handleSaveActivity}
                  icon={<Save className="h-4 w-4" />}
                  disabled={saving}
                  loading={saving}
                >
                  {editingActivity ? 'Update' : 'Add'} Activity
                </ModernButton>
              </div>
            </div>
          </ModernCard>
        </div>
      )}
    </div>
  )
}

