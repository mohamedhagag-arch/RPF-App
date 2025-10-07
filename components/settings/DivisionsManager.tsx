'use client'

import { useState, useEffect } from 'react'
import { 
  getAllDivisions, 
  addDivision, 
  updateDivision, 
  deleteDivision,
  initializeDivisionsTable,
  Division
} from '@/lib/divisionsManager'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  Building2, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react'

export function DivisionsManager() {
  const [divisions, setDivisions] = useState<Division[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingDivision, setEditingDivision] = useState<Division | null>(null)
  
  // Form fields
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: ''
  })

  useEffect(() => {
    fetchDivisions()
  }, [])

  const fetchDivisions = async () => {
    try {
      setLoading(true)
      setError('')
      
      // تهيئة الجدول إذا لزم الأمر
      await initializeDivisionsTable()
      
      // جلب الأقسام
      const data = await getAllDivisions()
      setDivisions(data)
    } catch (error: any) {
      setError('Failed to load divisions')
      console.error('Error fetching divisions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!formData.name.trim()) {
      setError('Division name is required')
      return
    }

    try {
      setLoading(true)

      if (editingDivision) {
        // تحديث قسم موجود
        const result = await updateDivision(editingDivision.id!, {
          name: formData.name.trim(),
          code: formData.code.trim(),
          description: formData.description.trim()
        })

        if (result.success) {
          setSuccess('Division updated successfully')
          await fetchDivisions()
          resetForm()
        } else {
          setError(result.error || 'Failed to update division')
        }
      } else {
        // إضافة قسم جديد
        const result = await addDivision({
          name: formData.name.trim(),
          code: formData.code.trim(),
          description: formData.description.trim(),
          is_active: true
        })

        if (result.success) {
          setSuccess('Division added successfully')
          await fetchDivisions()
          resetForm()
        } else {
          setError(result.error || 'Failed to add division')
        }
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (division: Division) => {
    setEditingDivision(division)
    setFormData({
      name: division.name,
      code: division.code || '',
      description: division.description || ''
    })
    setShowForm(true)
    setError('')
    setSuccess('')
  }

  const handleDelete = async (division: Division) => {
    if (!confirm(`Are you sure you want to delete "${division.name}"?`)) {
      return
    }

    try {
      setLoading(true)
      setError('')
      setSuccess('')

      const result = await deleteDivision(division.id!)

      if (result.success) {
        setSuccess('Division deleted successfully')
        await fetchDivisions()
      } else {
        setError(result.error || 'Failed to delete division')
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({ name: '', code: '', description: '' })
    setEditingDivision(null)
    setShowForm(false)
    setError('')
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle>Divisions Management</CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Manage responsible divisions for projects
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchDivisions}
                disabled={loading}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => {
                  resetForm()
                  setShowForm(true)
                }}
                disabled={loading}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Division
              </Button>
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
                  {editingDivision ? 'Edit Division' : 'Add New Division'}
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
                    Division Name *
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Enabling Division"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Code (Optional)
                  </label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g., ENA"
                    maxLength={10}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of the division"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent
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
                    {editingDivision ? 'Update' : 'Add'} Division
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Divisions List */}
          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : divisions.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                No divisions found. Add your first division!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {divisions.map((division) => (
                <div
                  key={division.id}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg
                           hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {division.name}
                        </h4>
                        {division.code && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900 
                                       text-blue-800 dark:text-blue-200 rounded">
                            {division.code}
                          </span>
                        )}
                      </div>
                      {division.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {division.description}
                        </p>
                      )}
                      {division.usage_count !== undefined && division.usage_count > 0 && (
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                          Used in {division.usage_count} project{division.usage_count !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 ml-2">
                      <button
                        onClick={() => handleEdit(division)}
                        className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </button>
                      <button
                        onClick={() => handleDelete(division)}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                      </button>
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

