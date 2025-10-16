'use client'

import { useState, useEffect } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import {
  Building2,
  Briefcase,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  CheckCircle,
  XCircle,
  Shield,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff
} from 'lucide-react'

interface Department {
  id: string
  name_en: string
  name_ar: string
  description: string
  is_active: boolean
  display_order: number
}

interface JobTitle {
  id: string
  title_en: string
  title_ar: string
  description: string
  is_active: boolean
  display_order: number
}

export function DepartmentsJobTitlesManager() {
  const guard = usePermissionGuard()
  const supabase = getSupabaseClient()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeTab, setActiveTab] = useState<'departments' | 'job_titles'>('departments')

  // Departments
  const [departments, setDepartments] = useState<Department[]>([])
  const [editingDept, setEditingDept] = useState<string | null>(null)
  const [newDept, setNewDept] = useState<Partial<Department>>({
    name_en: '',
    name_ar: '',
    description: '',
    is_active: true,
    display_order: 0
  })

  // Job Titles
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([])
  const [editingTitle, setEditingTitle] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState<Partial<JobTitle>>({
    title_en: '',
    title_ar: '',
    description: '',
    is_active: true,
    display_order: 0
  })

  useEffect(() => {
    loadData()
  }, [activeTab])

  const loadData = async () => {
    setLoading(true)
    if (activeTab === 'departments') {
      await loadDepartments()
    } else {
      await loadJobTitles()
    }
    setLoading(false)
  }

  const loadDepartments = async () => {
    try {
      const { data, error: fetchError } = await (supabase as any)
        .from('departments')
        .select('*')
        .order('display_order')

      if (fetchError) throw fetchError
      setDepartments(data || [])
    } catch (error: any) {
      console.error('Error loading departments:', error)
      setError('Failed to load departments')
    }
  }

  const loadJobTitles = async () => {
    try {
      const { data, error: fetchError } = await (supabase as any)
        .from('job_titles')
        .select('*')
        .order('display_order')

      if (fetchError) throw fetchError
      setJobTitles(data || [])
    } catch (error: any) {
      console.error('Error loading job titles:', error)
      setError('Failed to load job titles')
    }
  }

  const handleAddDepartment = async () => {
    if (!newDept.name_en || !newDept.name_ar) {
      setError('Please fill in both English and Arabic names')
      return
    }

    try {
      setSaving(true)
      setError('')

      const { error: insertError } = await (supabase as any)
        .from('departments')
        .insert({
          name_en: newDept.name_en,
          name_ar: newDept.name_ar,
          description: newDept.description,
          is_active: newDept.is_active,
          display_order: departments.length
        })

      if (insertError) throw insertError

      setSuccess('Department added successfully')
      setTimeout(() => setSuccess(''), 3000)
      setNewDept({ name_en: '', name_ar: '', description: '', is_active: true, display_order: 0 })
      await loadDepartments()
    } catch (error: any) {
      setError('Failed to add department: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateDepartment = async (dept: Department) => {
    try {
      setSaving(true)
      setError('')

      const { error: updateError } = await (supabase as any)
        .from('departments')
        .update({
          name_en: dept.name_en,
          name_ar: dept.name_ar,
          description: dept.description,
          is_active: dept.is_active,
          display_order: dept.display_order
        })
        .eq('id', dept.id)

      if (updateError) throw updateError

      setSuccess('Department updated successfully')
      setTimeout(() => setSuccess(''), 3000)
      setEditingDept(null)
      await loadDepartments()
    } catch (error: any) {
      setError('Failed to update department: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteDepartment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this department?')) return

    try {
      setSaving(true)
      setError('')

      const { error: deleteError } = await (supabase as any)
        .from('departments')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      setSuccess('Department deleted successfully')
      setTimeout(() => setSuccess(''), 3000)
      await loadDepartments()
    } catch (error: any) {
      setError('Failed to delete department: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleAddJobTitle = async () => {
    if (!newTitle.title_en) {
      setError('Please fill in the English title')
      return
    }

    try {
      setSaving(true)
      setError('')

      const { error: insertError } = await (supabase as any)
        .from('job_titles')
        .insert({
          title_en: newTitle.title_en,
          title_ar: newTitle.title_ar,
          description: newTitle.description,
          is_active: newTitle.is_active,
          display_order: jobTitles.length
        })

      if (insertError) throw insertError

      setSuccess('Job title added successfully')
      setTimeout(() => setSuccess(''), 3000)
      setNewTitle({ title_en: '', title_ar: '', description: '', is_active: true, display_order: 0 })
      await loadJobTitles()
    } catch (error: any) {
      setError('Failed to add job title: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateJobTitle = async (title: JobTitle) => {
    try {
      setSaving(true)
      setError('')

      const { error: updateError } = await (supabase as any)
        .from('job_titles')
        .update({
          title_en: title.title_en,
          title_ar: title.title_ar,
          description: title.description,
          is_active: title.is_active,
          display_order: title.display_order
        })
        .eq('id', title.id)

      if (updateError) throw updateError

      setSuccess('Job title updated successfully')
      setTimeout(() => setSuccess(''), 3000)
      setEditingTitle(null)
      await loadJobTitles()
    } catch (error: any) {
      setError('Failed to update job title: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteJobTitle = async (id: string) => {
    if (!confirm('Are you sure you want to delete this job title?')) return

    try {
      setSaving(true)
      setError('')

      const { error: deleteError } = await (supabase as any)
        .from('job_titles')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      setSuccess('Job title deleted successfully')
      setTimeout(() => setSuccess(''), 3000)
      await loadJobTitles()
    } catch (error: any) {
      setError('Failed to delete job title: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (type: 'department' | 'job_title', id: string, currentStatus: boolean) => {
    try {
      const table = type === 'department' ? 'departments' : 'job_titles'
      const { error: updateError } = await (supabase as any)
        .from(table)
        .update({ is_active: !currentStatus })
        .eq('id', id)

      if (updateError) throw updateError

      if (type === 'department') {
        await loadDepartments()
      } else {
        await loadJobTitles()
      }
    } catch (error: any) {
      setError('Failed to toggle status')
    }
  }

  if (!guard.hasAccess('settings.divisions')) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-600">
              You don't have permission to manage departments and job titles.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Departments & Job Titles
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage organization structure and job positions
          </p>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="error">
          <XCircle className="h-4 w-4" />
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert variant="success">
          <CheckCircle className="h-4 w-4" />
          {success}
        </Alert>
      )}

      {/* Tabs */}
      <div className="flex space-x-2">
        <Button
          variant={activeTab === 'departments' ? 'primary' : 'outline'}
          onClick={() => setActiveTab('departments')}
          className="flex items-center space-x-2"
        >
          <Building2 className="h-4 w-4" />
          <span>Departments</span>
        </Button>
        <Button
          variant={activeTab === 'job_titles' ? 'primary' : 'outline'}
          onClick={() => setActiveTab('job_titles')}
          className="flex items-center space-x-2"
        >
          <Briefcase className="h-4 w-4" />
          <span>Job Titles</span>
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          {/* Departments Tab */}
          {activeTab === 'departments' && (
            <div className="space-y-6">
              {/* Add New Department */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Plus className="h-5 w-5" />
                    <span>Add New Department</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      placeholder="Department Name (English)"
                      value={newDept.name_en}
                      onChange={(e) => setNewDept(prev => ({ ...prev, name_en: e.target.value }))}
                    />
                    <Input
                      placeholder="اسم القسم (عربي) - اختياري"
                      value={newDept.name_ar}
                      onChange={(e) => setNewDept(prev => ({ ...prev, name_ar: e.target.value }))}
                      dir="rtl"
                    />
                    <div className="md:col-span-2">
                      <Input
                        placeholder="Description (Optional)"
                        value={newDept.description}
                        onChange={(e) => setNewDept(prev => ({ ...prev, description: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end mt-4">
                    <Button onClick={handleAddDepartment} disabled={saving}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Department
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Departments List */}
              <Card>
                <CardHeader>
                  <CardTitle>Departments List ({departments.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {departments.map((dept) => (
                      <div
                        key={dept.id}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                      >
                        {editingDept === dept.id ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <Input
                                value={dept.name_en}
                                onChange={(e) => {
                                  const updated = departments.map(d =>
                                    d.id === dept.id ? { ...d, name_en: e.target.value } : d
                                  )
                                  setDepartments(updated)
                                }}
                              />
                              <Input
                                value={dept.name_ar}
                                onChange={(e) => {
                                  const updated = departments.map(d =>
                                    d.id === dept.id ? { ...d, name_ar: e.target.value } : d
                                  )
                                  setDepartments(updated)
                                }}
                                dir="rtl"
                              />
                              <div className="md:col-span-2">
                                <Input
                                  value={dept.description || ''}
                                  onChange={(e) => {
                                    const updated = departments.map(d =>
                                      d.id === dept.id ? { ...d, description: e.target.value } : d
                                    )
                                    setDepartments(updated)
                                  }}
                                  placeholder="Description"
                                />
                              </div>
                            </div>
                            <div className="flex items-center justify-end space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingDept(null)}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleUpdateDepartment(dept)}
                                disabled={saving}
                              >
                                <Save className="h-4 w-4 mr-1" />
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-900 dark:text-white">
                                {dept.name_en} / {dept.name_ar}
                              </h3>
                              {dept.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  {dept.description}
                                </p>
                              )}
                              <div className="flex items-center space-x-2 mt-2">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  dept.is_active
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {dept.is_active ? 'Active' : 'Inactive'}
                                </span>
                                <span className="text-xs text-gray-500">
                                  Order: {dept.display_order}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => toggleActive('department', dept.id, dept.is_active)}
                              >
                                {dept.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingDept(dept.id)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteDepartment(dept.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Job Titles Tab */}
          {activeTab === 'job_titles' && (
            <div className="space-y-6">
              {/* Add New Job Title */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Plus className="h-5 w-5" />
                    <span>Add New Job Title</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      placeholder="Job Title (English)"
                      value={newTitle.title_en}
                      onChange={(e) => setNewTitle(prev => ({ ...prev, title_en: e.target.value }))}
                    />
                    <Input
                      placeholder="المسمى الوظيفي (عربي) - اختياري"
                      value={newTitle.title_ar}
                      onChange={(e) => setNewTitle(prev => ({ ...prev, title_ar: e.target.value }))}
                      dir="rtl"
                    />
                    <div className="md:col-span-2">
                      <Input
                        placeholder="Description (Optional)"
                        value={newTitle.description}
                        onChange={(e) => setNewTitle(prev => ({ ...prev, description: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end mt-4">
                    <Button onClick={handleAddJobTitle} disabled={saving}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Job Title
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Job Titles List */}
              <Card>
                <CardHeader>
                  <CardTitle>Job Titles List ({jobTitles.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {jobTitles.map((title) => (
                      <div
                        key={title.id}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                      >
                        {editingTitle === title.id ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <Input
                                value={title.title_en}
                                onChange={(e) => {
                                  const updated = jobTitles.map(t =>
                                    t.id === title.id ? { ...t, title_en: e.target.value } : t
                                  )
                                  setJobTitles(updated)
                                }}
                              />
                              <Input
                                value={title.title_ar}
                                onChange={(e) => {
                                  const updated = jobTitles.map(t =>
                                    t.id === title.id ? { ...t, title_ar: e.target.value } : t
                                  )
                                  setJobTitles(updated)
                                }}
                                dir="rtl"
                              />
                              <div className="md:col-span-2">
                                <Input
                                  value={title.description || ''}
                                  onChange={(e) => {
                                    const updated = jobTitles.map(t =>
                                      t.id === title.id ? { ...t, description: e.target.value } : t
                                    )
                                    setJobTitles(updated)
                                  }}
                                  placeholder="Description"
                                />
                              </div>
                            </div>
                            <div className="flex items-center justify-end space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingTitle(null)}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleUpdateJobTitle(title)}
                                disabled={saving}
                              >
                                <Save className="h-4 w-4 mr-1" />
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-900 dark:text-white">
                                {title.title_en} / {title.title_ar}
                              </h3>
                              {title.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  {title.description}
                                </p>
                              )}
                              <div className="flex items-center space-x-2 mt-2">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  title.is_active
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {title.is_active ? 'Active' : 'Inactive'}
                                </span>
                                <span className="text-xs text-gray-500">
                                  Order: {title.display_order}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => toggleActive('job_title', title.id, title.is_active)}
                              >
                                {title.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingTitle(title.id)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteJobTitle(title.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  )
}
