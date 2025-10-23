'use client'

import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import {
  Trash2,
  Edit,
  Save,
  X,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Archive,
  Eye,
  EyeOff,
  Plus,
  Minus,
  Settings,
  Database,
  Users,
  Briefcase
} from 'lucide-react'

interface BulkOperation {
  id: string
  type: 'department' | 'job_title'
  action: 'delete' | 'activate' | 'deactivate' | 'update'
  data: any
}

interface BulkResult {
  success: boolean
  total_processed: number
  successful: number
  failed: number
  errors: string[]
}

export function BulkOperationsManager() {
  const supabase = getSupabaseClient()
  const [loading, setLoading] = useState(false)
  const [departments, setDepartments] = useState<any[]>([])
  const [jobTitles, setJobTitles] = useState<any[]>([])
  const [selectedDepartments, setSelectedDepartments] = useState<Set<string>>(new Set())
  const [selectedJobTitles, setSelectedJobTitles] = useState<Set<string>>(new Set())
  const [bulkOperations, setBulkOperations] = useState<BulkOperation[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null)
  const [showBulkForm, setShowBulkForm] = useState(false)
  const [bulkAction, setBulkAction] = useState<'delete' | 'activate' | 'deactivate' | 'update'>('delete')
  const [bulkData, setBulkData] = useState<any>({})

  // Load data
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Load departments
      const { data: deptData, error: deptError } = await supabase
        .from('departments')
        .select('*')
        .order('display_order', { ascending: true })

      if (deptError) throw deptError

      // Load job titles
      const { data: jobData, error: jobError } = await supabase
        .from('job_titles')
        .select('*')
        .order('display_order', { ascending: true })

      if (jobError) throw jobError

      setDepartments(deptData || [])
      setJobTitles(jobData || [])
    } catch (err: any) {
      setError(`Failed to load data: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Selection handlers
  const handleDepartmentSelect = (id: string, selected: boolean) => {
    const newSelected = new Set(selectedDepartments)
    if (selected) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedDepartments(newSelected)
  }

  const handleJobTitleSelect = (id: string, selected: boolean) => {
    const newSelected = new Set(selectedJobTitles)
    if (selected) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedJobTitles(newSelected)
  }

  const handleSelectAll = (type: 'departments' | 'job_titles') => {
    if (type === 'departments') {
      setSelectedDepartments(new Set(departments.map(d => d.id)))
    } else {
      setSelectedJobTitles(new Set(jobTitles.map(j => j.id)))
    }
  }

  const handleDeselectAll = (type: 'departments' | 'job_titles') => {
    if (type === 'departments') {
      setSelectedDepartments(new Set())
    } else {
      setSelectedJobTitles(new Set())
    }
  }

  // Bulk operations
  const handleBulkOperation = async () => {
    if (selectedDepartments.size === 0 && selectedJobTitles.size === 0) {
      setError('Please select items to perform bulk operation')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const result: BulkResult = {
        success: true,
        total_processed: 0,
        successful: 0,
        failed: 0,
        errors: []
      }

      // Process departments
      for (const deptId of Array.from(selectedDepartments)) {
        const dept = departments.find(d => d.id === deptId)
        if (!dept) continue

        result.total_processed++

        try {
          let error = null

          switch (bulkAction) {
            case 'delete':
              const { error: deleteError } = await supabase
                .from('departments')
                .delete()
                .eq('id', deptId)
              error = deleteError
              break

            case 'activate':
              const { error: activateError } = await (supabase as any)
                .from('departments')
                .update({ is_active: true })
                .eq('id', deptId)
              error = activateError
              break

            case 'deactivate':
              const { error: deactivateError } = await (supabase as any)
                .from('departments')
                .update({ is_active: false })
                .eq('id', deptId)
              error = deactivateError
              break

            case 'update':
              const { error: updateError } = await (supabase as any)
                .from('departments')
                .update(bulkData)
                .eq('id', deptId)
              error = updateError
              break
          }

          if (error) {
            result.failed++
            result.errors.push(`Department ${dept.name_en}: ${error.message}`)
          } else {
            result.successful++
          }
        } catch (err: any) {
          result.failed++
          result.errors.push(`Department ${dept.name_en}: ${err.message}`)
        }
      }

      // Process job titles
      for (const jobId of Array.from(selectedJobTitles)) {
        const job = jobTitles.find(j => j.id === jobId)
        if (!job) continue

        result.total_processed++

        try {
          let error = null

          switch (bulkAction) {
            case 'delete':
              const { error: deleteError } = await supabase
                .from('job_titles')
                .delete()
                .eq('id', jobId)
              error = deleteError
              break

            case 'activate':
              const { error: activateError } = await (supabase as any)
                .from('job_titles')
                .update({ is_active: true })
                .eq('id', jobId)
              error = activateError
              break

            case 'deactivate':
              const { error: deactivateError } = await (supabase as any)
                .from('job_titles')
                .update({ is_active: false })
                .eq('id', jobId)
              error = deactivateError
              break

            case 'update':
              const { error: updateError } = await (supabase as any)
                .from('job_titles')
                .update(bulkData)
                .eq('id', jobId)
              error = updateError
              break
          }

          if (error) {
            result.failed++
            result.errors.push(`Job Title ${job.title_en}: ${error.message}`)
          } else {
            result.successful++
          }
        } catch (err: any) {
          result.failed++
          result.errors.push(`Job Title ${job.title_en}: ${err.message}`)
        }
      }

      setBulkResult(result)
      
      if (result.failed === 0) {
        setSuccess(`✅ Bulk operation completed successfully! ${result.successful} items processed.`)
      } else {
        setSuccess(`⚠️ Bulk operation completed with ${result.failed} errors. ${result.successful} items processed successfully.`)
      }

      // Clear selections and reload data
      setSelectedDepartments(new Set())
      setSelectedJobTitles(new Set())
      await loadData()

    } catch (err: any) {
      setError(`Bulk operation failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const openBulkForm = (action: 'delete' | 'activate' | 'deactivate' | 'update') => {
    setBulkAction(action)
    setBulkData({})
    setShowBulkForm(true)
  }

  const closeBulkForm = () => {
    setShowBulkForm(false)
    setBulkData({})
  }

  return (
    <div className="space-y-6">
      {/* Bulk Operations Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            Bulk Operations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Perform bulk operations on selected departments and job titles.
          </p>
          
          <div className="flex gap-3 flex-wrap">
            <Button
              onClick={() => openBulkForm('delete')}
              disabled={selectedDepartments.size === 0 && selectedJobTitles.size === 0}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Selected
            </Button>
            
            <Button
              onClick={() => openBulkForm('activate')}
              disabled={selectedDepartments.size === 0 && selectedJobTitles.size === 0}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Activate Selected
            </Button>
            
            <Button
              onClick={() => openBulkForm('deactivate')}
              disabled={selectedDepartments.size === 0 && selectedJobTitles.size === 0}
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Deactivate Selected
            </Button>
            
            <Button
              onClick={() => openBulkForm('update')}
              disabled={selectedDepartments.size === 0 && selectedJobTitles.size === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Edit className="w-4 h-4 mr-2" />
              Update Selected
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Departments Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Departments ({departments.length})
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => handleSelectAll('departments')}
                size="sm"
                variant="outline"
                className="text-green-600 hover:text-green-800"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Select All
              </Button>
              <Button
                onClick={() => handleDeselectAll('departments')}
                size="sm"
                variant="outline"
                className="text-red-600 hover:text-red-800"
              >
                <XCircle className="w-4 h-4 mr-1" />
                Deselect All
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {departments.map((dept) => (
                <div
                  key={dept.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    selectedDepartments.has(dept.id)
                      ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700'
                      : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedDepartments.has(dept.id)}
                    onChange={(e) => handleDepartmentSelect(dept.id, e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {dept.name_en}
                    </div>
                    {dept.name_ar && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {dept.name_ar}
                      </div>
                    )}
                    {dept.description && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {dept.description}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      dept.is_active
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                    }`}>
                      {dept.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Order: {dept.display_order}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Job Titles Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-purple-600" />
              Job Titles ({jobTitles.length})
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => handleSelectAll('job_titles')}
                size="sm"
                variant="outline"
                className="text-green-600 hover:text-green-800"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Select All
              </Button>
              <Button
                onClick={() => handleDeselectAll('job_titles')}
                size="sm"
                variant="outline"
                className="text-red-600 hover:text-red-800"
              >
                <XCircle className="w-4 h-4 mr-1" />
                Deselect All
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {jobTitles.map((job) => (
                <div
                  key={job.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    selectedJobTitles.has(job.id)
                      ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700'
                      : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedJobTitles.has(job.id)}
                    onChange={(e) => handleJobTitleSelect(job.id, e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {job.title_en}
                    </div>
                    {job.title_ar && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {job.title_ar}
                      </div>
                    )}
                    {job.description && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {job.description}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      job.is_active
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                    }`}>
                      {job.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Order: {job.display_order}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Form Modal */}
      {showBulkForm && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              <AlertTriangle className="w-5 h-5" />
              Confirm Bulk Operation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Operation: {bulkAction.toUpperCase()}
              </h4>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <div>Selected Departments: {selectedDepartments.size}</div>
                <div>Selected Job Titles: {selectedJobTitles.size}</div>
                <div>Total Items: {selectedDepartments.size + selectedJobTitles.size}</div>
              </div>
            </div>

            {bulkAction === 'update' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <Input
                    value={bulkData.description || ''}
                    onChange={(e) => setBulkData({ ...bulkData, description: e.target.value })}
                    placeholder="New description for all selected items"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Display Order
                  </label>
                  <Input
                    type="number"
                    value={bulkData.display_order || ''}
                    onChange={(e) => setBulkData({ ...bulkData, display_order: parseInt(e.target.value) || 0 })}
                    placeholder="New display order"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleBulkOperation}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {loading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Confirm {bulkAction.toUpperCase()}
              </Button>
              
              <Button
                onClick={closeBulkForm}
                variant="outline"
                className="text-gray-600 hover:text-gray-800"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Results */}
      {bulkResult && (
        <Card className={bulkResult.success ? "border-green-200 bg-green-50 dark:bg-green-900/20" : "border-red-200 bg-red-50 dark:bg-red-900/20"}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {bulkResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              Bulk Operation Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {bulkResult.total_processed}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Total Processed
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">
                  {bulkResult.successful}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Successful
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-red-600">
                  {bulkResult.failed}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Failed
                </div>
              </div>
            </div>
            
            {bulkResult.errors.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2">
                  Errors ({bulkResult.errors.length})
                </h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {bulkResult.errors.map((error, index) => (
                    <div key={index} className="text-sm text-red-600 dark:text-red-400">
                      {error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Messages */}
      {error && (
        <Alert variant="error">
          {error}
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 border-green-200 text-green-800">
          {success}
        </Alert>
      )}
    </div>
  )
}
