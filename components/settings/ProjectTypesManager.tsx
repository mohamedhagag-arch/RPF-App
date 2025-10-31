'use client'

import { useState, useEffect } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { 
  getAllProjectScopes, 
  addProjectScope, 
  updateProjectScope, 
  deleteProjectScope,
  initializeProjectScopesTable,
  ProjectScope
} from '@/lib/projectTypesManager'
import { getActivityStats } from '@/lib/projectTypeActivitiesManager'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  Briefcase, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react'

export function ProjectTypesManager() {
  const guard = usePermissionGuard()
  const [projectScopes, setProjectScopes] = useState<ProjectScope[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingScope, setEditingScope] = useState<ProjectScope | null>(null)
  const [activityStats, setActivityStats] = useState<Record<string, number>>({})
  
  // Form fields
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: ''
  })

  useEffect(() => {
    fetchProjectScopes()
  }, [])

  const fetchProjectScopes = async () => {
    try {
      setLoading(true)
      setError('')
      
      // Initialize table if needed
      await initializeProjectScopesTable()
      
      // Fetch project scopes
      const data = await getAllProjectScopes()
      setProjectScopes(data)
      
      // Fetch activity statistics
      await fetchActivityStats()
    } catch (error: any) {
      setError('Failed to load project scopes')
      console.error('Error fetching project scopes:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchActivityStats = async () => {
    try {
      const stats = await getActivityStats()
      setActivityStats(stats.activitiesByProjectType || {})
    } catch (statsError) {
      console.warn('Could not fetch activity stats:', statsError)
      setActivityStats({})
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!formData.name.trim()) {
      setError('Project scope name is required')
      return
    }

    try {
      setLoading(true)

      if (editingScope) {
        // تحديث نطاق موجود
        const result = await updateProjectScope(editingScope.id!, {
          name: formData.name.trim(),
          code: formData.code.trim(),
          description: formData.description.trim()
        })

        if (result.success) {
          setSuccess('Project scope updated successfully')
          await fetchProjectScopes()
          await fetchActivityStats()
          resetForm()
        } else {
          setError(result.error || 'Failed to update project scope')
        }
      } else {
        // إضافة نطاق جديد
        const result = await addProjectScope({
          name: formData.name.trim(),
          code: formData.code.trim(),
          description: formData.description.trim(),
          is_active: true
        })

        if (result.success) {
          setSuccess('Project scope added successfully')
          await fetchProjectScopes()
          await fetchActivityStats()
          resetForm()
        } else {
          setError(result.error || 'Failed to add project scope')
        }
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (projectScope: ProjectScope) => {
    setEditingScope(projectScope)
    setFormData({
      name: projectScope.name,
      code: projectScope.code || '',
      description: projectScope.description || ''
    })
    setShowForm(true)
    setError('')
    setSuccess('')
  }

  const handleDelete = async (projectScope: ProjectScope) => {
    if (!confirm(`Are you sure you want to delete "${projectScope.name}" project scope?`)) {
      return
    }

    try {
      setLoading(true)
      setError('')
      setSuccess('')

      const result = await deleteProjectScope(projectScope.id!)

      if (result.success) {
        setSuccess('Project scope deleted successfully')
        await fetchProjectScopes()
        await fetchActivityStats()
      } else {
      setError(result.error || 'Failed to delete project scope')
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({ name: '', code: '', description: '' })
    setEditingScope(null)
    setShowForm(false)
    setError('')
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg">
                <Briefcase className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle>Project Scope Management</CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Manage project scopes and categories
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchProjectScopes}
                disabled={loading}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              {guard.hasAccess('settings.project_types') && (
                <Button
                  onClick={() => {
                    resetForm()
                    setShowForm(true)
                  }}
                  disabled={loading}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Project Scope
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Alerts */}
          {error && (
            <Alert variant="error" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              {error}
            </Alert>
          )}

          {success && (
            <Alert variant="success" className="mb-4">
              <CheckCircle className="h-4 w-4" />
              {success}
            </Alert>
          )}

          {/* Form */}
          {showForm && (
            <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  {editingScope ? 'Edit Project Scope' : 'Add New Project Scope'}
                </h3>
                <button
                  onClick={resetForm}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Project Scope Name *
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Infrastructure"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Scope Code (Optional)
                  </label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g., INF"
                    maxLength={10}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Scope Description (Optional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of the project scope"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                             focus:ring-2 focus:ring-purple-500 focus:border-transparent
                             resize-none"
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    <Save className="h-4 w-4 mr-2" />
                    {editingScope ? 'Update' : 'Add'} Project Scope
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Project Scope List */}
          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : projectScopes.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                No project scopes found. Add your first project scope!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projectScopes.map((projectScope) => (
                <div
                  key={projectScope.id}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg
                           hover:border-purple-500 dark:hover:border-purple-500 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {projectScope.name}
                        </h4>
                        {projectScope.code && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 dark:bg-purple-900 
                                       text-purple-800 dark:text-purple-200 rounded">
                            {projectScope.code}
                          </span>
                        )}
                      </div>
                      {projectScope.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {projectScope.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2">
                        {projectScope.usage_count !== undefined && projectScope.usage_count > 0 && (
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            Used in {projectScope.usage_count} project{projectScope.usage_count !== 1 ? 's' : ''}
                          </p>
                        )}
                        {activityStats[projectScope.name] !== undefined && (
                          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                            {activityStats[projectScope.name]} activities linked
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 ml-2">
                      {guard.hasAccess('settings.project_types') && (
                        <button
                          onClick={() => handleEdit(projectScope)}
                          className="p-2 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        </button>
                      )}
                      {guard.hasAccess('settings.project_types') && (
                        <button
                          onClick={() => handleDelete(projectScope)}
                          className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
