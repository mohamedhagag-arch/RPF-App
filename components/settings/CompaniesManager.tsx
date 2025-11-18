'use client'

import { useState, useEffect } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { 
  getAllCompanies, 
  getCompaniesByType,
  addCompany, 
  updateCompany, 
  deleteCompany,
  initializeCompaniesTable,
  Company
} from '@/lib/companiesManager'
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
  RefreshCw,
  Download,
  Upload,
  FileText,
  FileJson,
  FileSpreadsheet,
  Database,
  Eye,
  Search,
  Filter,
  CheckSquare,
  Square
} from 'lucide-react'

export function CompaniesManager() {
  const guard = usePermissionGuard()
  const [companies, setCompanies] = useState<Company[]>([])
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<Company['company_type'] | 'All'>('All')
  
  // Export/Import states
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'excel'>('json')
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<any[] | null>(null)
  const [showImportPreview, setShowImportPreview] = useState(false)
  
  // Form fields
  const [formData, setFormData] = useState({
    company_name: '',
    company_type: 'Client' as Company['company_type']
  })
  
  // Selection state
  const [selectedCompanies, setSelectedCompanies] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchCompanies()
  }, [])

  useEffect(() => {
    filterCompanies()
  }, [companies, searchQuery, filterType])

  const fetchCompanies = async () => {
    try {
      setLoading(true)
      setError('')
      
      // Initialize table if needed
      await initializeCompaniesTable()
      
      // Fetch companies
      const data = await getAllCompanies()
      setCompanies(data)
    } catch (error: any) {
      let errorMessage = 'Failed to load companies: ' + (error.message || 'Unknown error')
      
      // Provide helpful guidance for permission errors
      if (error.message?.includes('permission denied') || error.code === '42501') {
        errorMessage = 'Permission denied. Please run the SQL script in Supabase: Database/fix-companies-rls-complete.sql'
      }
      
      setError(errorMessage)
      console.error('Error fetching companies:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterCompanies = () => {
    let filtered = companies

    // Filter by type
    if (filterType !== 'All') {
      filtered = filtered.filter(c => c.company_type === filterType)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(c => 
        c.company_name.toLowerCase().includes(query) ||
        c.company_type.toLowerCase().includes(query)
      )
    }

    setFilteredCompanies(filtered)
  }

  const handleAdd = () => {
    console.log('➕ Add Company button clicked')
    setEditingCompany(null)
    setFormData({
      company_name: '',
      company_type: 'Client'
    })
    setError('')
    setSuccess('')
    setShowForm(true)
    console.log('✅ Form should now be visible, showForm:', true)
  }

  const handleEdit = (company: Company) => {
    console.log('✏️ Edit Company button clicked for:', company.company_name)
    setEditingCompany(company)
    setFormData({
      company_name: company.company_name,
      company_type: company.company_type
    })
    setError('')
    setSuccess('')
    setShowForm(true)
    console.log('✅ Form should now be visible for editing, showForm:', true)
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingCompany(null)
    setFormData({
      company_name: '',
      company_type: 'Client'
    })
    setError('')
    setSuccess('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.company_name.trim()) {
      setError('Company name is required')
      return
    }

    try {
      setLoading(true)
      setError('')
      setSuccess('')

      if (editingCompany) {
        await updateCompany(editingCompany.id, formData)
        setSuccess('Company updated successfully!')
      } else {
        await addCompany(formData)
        setSuccess('Company added successfully!')
      }

      await fetchCompanies()
      setShowForm(false)
      setEditingCompany(null)
      setFormData({
        company_name: '',
        company_type: 'Client'
      })
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      setError(error.message || 'Failed to save company')
      console.error('Error saving company:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    console.log('🗑️ Delete Company button clicked for:', name)
    const confirmed = window.confirm(`Are you sure you want to delete "${name}"?`)
    if (!confirmed) {
      console.log('❌ Delete cancelled by user')
      return
    }

    try {
      setLoading(true)
      setError('')
      setSuccess('')

      console.log('🔄 Deleting company:', id)
      await deleteCompany(id)
      setSuccess('Company deleted successfully!')
      await fetchCompanies()
      
      setTimeout(() => setSuccess(''), 3000)
      console.log('✅ Company deleted successfully')
    } catch (error: any) {
      setError(error.message || 'Failed to delete company')
      console.error('❌ Error deleting company:', error)
    } finally {
      setLoading(false)
    }
  }

  // Export functions
  const handleExport = async () => {
    setLoading(true)
    setError('')
    setSuccess('')
    
    try {
      if (filteredCompanies.length === 0) {
        setError('No companies data to export.')
        return
      }

      let blob: Blob
      let fileExtension: string
      let mimeType: string

      if (exportFormat === 'json') {
        blob = new Blob([JSON.stringify(filteredCompanies, null, 2)], { type: 'application/json' })
        fileExtension = 'json'
        mimeType = 'application/json'
      } else if (exportFormat === 'csv') {
        const headers = ['Company Name', 'Company Type']
        const csvRows = [
          headers.join(','),
          ...filteredCompanies.map(c => 
            `"${c.company_name.replace(/"/g, '""')}","${c.company_type}"`
          )
        ]
        blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
        fileExtension = 'csv'
        mimeType = 'text/csv'
      } else {
        // Excel format (CSV with BOM for Excel compatibility)
        const headers = ['Company Name', 'Company Type']
        const csvRows = [
          '\uFEFF' + headers.join(','),
          ...filteredCompanies.map(c => 
            `"${c.company_name.replace(/"/g, '""')}","${c.company_type}"`
          )
        ]
        blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
        fileExtension = 'xlsx'
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `companies_${new Date().toISOString().split('T')[0]}.${fileExtension}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setSuccess(`Companies exported successfully as ${exportFormat.toUpperCase()}!`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      setError('Failed to export companies: ' + (error.message || 'Unknown error'))
      console.error('Error exporting companies:', error)
    } finally {
      setLoading(false)
    }
  }

  // Import functions
  const handleImportFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImportFile(file)
    setError('')
    setSuccess('')

    try {
      const text = await file.text()
      let parsed: any[] = []

      if (file.name.endsWith('.json')) {
        parsed = JSON.parse(text)
      } else if (file.name.endsWith('.csv') || file.name.endsWith('.xlsx')) {
        const lines = text.split('\n').filter(line => line.trim())
        const headers = lines[0].replace(/\uFEFF/g, '').split(',').map(h => h.trim().replace(/"/g, ''))
        parsed = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
          const obj: any = {}
          headers.forEach((header, index) => {
            obj[header] = values[index] || ''
          })
          return obj
        })
      }

      // Normalize data
      const normalized = parsed.map((item: any) => ({
        company_name: item['Company Name'] || item.company_name || item.name || '',
        company_type: (item['Company Type'] || item.company_type || item.type || 'Client') as Company['company_type']
      })).filter(item => item.company_name)

      setImportPreview(normalized)
      setShowImportPreview(true)
    } catch (error: any) {
      setError('Failed to parse import file: ' + (error.message || 'Unknown error'))
      console.error('Error parsing import file:', error)
    }
  }

  const handleImportConfirm = async () => {
    if (!importPreview || importPreview.length === 0) return

    try {
      setLoading(true)
      setError('')
      setSuccess('')

      const { importCompanies } = await import('@/lib/companiesManager')
      const result = await importCompanies(importPreview as Array<{ company_name: string; company_type: Company['company_type'] }>)

      setSuccess(`Imported ${result.success} companies successfully! ${result.errors > 0 ? `${result.errors} failed.` : ''}`)
      setShowImportPreview(false)
      setImportPreview(null)
      setImportFile(null)
      await fetchCompanies()
      
      setTimeout(() => setSuccess(''), 5000)
    } catch (error: any) {
      setError('Failed to import companies: ' + (error.message || 'Unknown error'))
      console.error('Error importing companies:', error)
    } finally {
      setLoading(false)
    }
  }

  // Selection handlers
  const handleSelectCompany = (id: string) => {
    setSelectedCompanies(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }
  
  const handleSelectAllCompanies = () => {
    if (selectedCompanies.size === filteredCompanies.length) {
      setSelectedCompanies(new Set())
    } else {
      setSelectedCompanies(new Set(filteredCompanies.map(c => c.id)))
    }
  }
  
  // Bulk operations
  const handleBulkDeleteCompanies = async () => {
    if (selectedCompanies.size === 0) {
      setError('Please select at least one company to delete')
      return
    }
    
    if (!confirm(`Are you sure you want to delete ${selectedCompanies.size} company/companies?`)) return
    
    try {
      setLoading(true)
      setError('')
      setSuccess('')
      
      const ids = Array.from(selectedCompanies)
      let deleted = 0
      let failed = 0
      
      for (const id of ids) {
        try {
          await deleteCompany(id)
          deleted++
        } catch (error: any) {
          console.error(`Failed to delete company ${id}:`, error)
          failed++
        }
      }
      
      if (deleted > 0) {
        setSuccess(`Successfully deleted ${deleted} company/companies${failed > 0 ? `. ${failed} failed.` : ''}`)
      } else {
        setError(`Failed to delete companies. ${failed} failed.`)
      }
      
      setSelectedCompanies(new Set())
      await fetchCompanies()
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      setError('Failed to delete companies: ' + error.message)
    } finally {
      setLoading(false)
    }
  }
  
  // Clear selection when filter/search changes
  useEffect(() => {
    setSelectedCompanies(new Set())
  }, [searchQuery, filterType])
  
  const companyTypes: Company['company_type'][] = ['Client', 'Consultant', 'Contractor', 'First Party', 'Individual']

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Companies Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Error/Success Messages */}
          {error && (
            <Alert variant="error" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              {error}
            </Alert>
          )}
          {success && (
            <Alert className="mb-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              {success}
            </Alert>
          )}

          {/* Search and Filter */}
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search companies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as Company['company_type'] | 'All')}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm"
              >
                <option value="All">All Types</option>
                {companyTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Actions Bar */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                console.log('Button clicked, loading:', loading, 'hasAccess:', guard.hasAccess('settings.manage'))
                handleAdd()
              }}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Company
            </Button>
            
            <Button
              onClick={fetchCompanies}
              disabled={loading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            {selectedCompanies.size > 0 && (
              <>
                <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-2" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedCompanies.size} selected
                </span>
                <Button
                  onClick={handleBulkDeleteCompanies}
                  disabled={loading}
                  variant="outline"
                  className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Selected
                </Button>
              </>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as 'json' | 'csv' | 'excel')}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm"
              >
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
                <option value="excel">Excel</option>
              </select>
              <Button
                onClick={handleExport}
                disabled={loading || filteredCompanies.length === 0}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
              <label className="cursor-pointer">
                <span className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed">
                  <Upload className="h-4 w-4" />
                  Import
                </span>
                <input
                  type="file"
                  accept=".json,.csv,.xlsx"
                  onChange={handleImportFileSelect}
                  className="hidden"
                  disabled={loading}
                />
              </label>
            </div>
          </div>

          {/* Form Modal */}
          {showForm ? (
            <Card className="mb-4 border-2 border-blue-500 animate-in fade-in slide-in-from-top-2">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{editingCompany ? 'Edit Company' : 'Add New Company'}</span>
                  <Button
                    onClick={handleCancel}
                    variant="ghost"
                    size="sm"
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Company Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      placeholder="Enter company name..."
                      required
                      disabled={loading}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Company Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.company_type}
                      onChange={(e) => setFormData({ ...formData, company_type: e.target.value as Company['company_type'] })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                      required
                      disabled={loading}
                    >
                      {companyTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={loading}
                      className="flex items-center gap-2"
                    >
                      <Save className="h-4 w-4" />
                      {editingCompany ? 'Update' : 'Add'} Company
                    </Button>
                    <Button
                      type="button"
                      onClick={handleCancel}
                      variant="outline"
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : null}

          {/* Import Preview */}
          {showImportPreview && importPreview && (
            <Card className="mb-4 border-2 border-yellow-500">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Import Preview ({importPreview.length} companies)</span>
                  <Button
                    onClick={() => {
                      setShowImportPreview(false)
                      setImportPreview(null)
                    }}
                    variant="ghost"
                    size="sm"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-60 overflow-y-auto mb-4">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800">
                      <tr>
                        <th className="px-2 py-1 text-left">Company Name</th>
                        <th className="px-2 py-1 text-left">Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.slice(0, 20).map((item, index) => (
                        <tr key={index} className="border-t">
                          <td className="px-2 py-1">{item.company_name}</td>
                          <td className="px-2 py-1">{item.company_type}</td>
                        </tr>
                      ))}
                      {importPreview.length > 20 && (
                        <tr>
                          <td colSpan={2} className="px-2 py-1 text-center text-gray-500">
                            ... and {importPreview.length - 20} more
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleImportConfirm}
                    disabled={loading}
                    className="flex items-center gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Confirm Import
                  </Button>
                  <Button
                    onClick={() => {
                      setShowImportPreview(false)
                      setImportPreview(null)
                    }}
                    variant="outline"
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Companies Table */}
          {loading && companies.length === 0 ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchQuery || filterType !== 'All' 
                ? 'No companies found matching your criteria.'
                : 'No companies found. Add your first company!'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              {filteredCompanies.length > 0 && (
                <div className="mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                  <button
                    onClick={handleSelectAllCompanies}
                    className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  >
                    {selectedCompanies.size === filteredCompanies.length ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                    <span>Select All ({selectedCompanies.size}/{filteredCompanies.length})</span>
                  </button>
                </div>
              )}
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-gray-50 dark:bg-gray-800">
                    <th className="px-4 py-3 text-left text-sm font-semibold w-12">
                      <button
                        onClick={handleSelectAllCompanies}
                        className="flex items-center"
                        title="Select All"
                      >
                        {selectedCompanies.size === filteredCompanies.length && filteredCompanies.length > 0 ? (
                          <CheckSquare className="h-4 w-4 text-blue-600" />
                        ) : (
                          <Square className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Company Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Type</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCompanies.map((company) => (
                    <tr 
                      key={company.id} 
                      className={`border-b hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                        selectedCompanies.has(company.id)
                          ? 'bg-blue-50 dark:bg-blue-900/20'
                          : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleSelectCompany(company.id)}
                          className="flex items-center"
                          title={selectedCompanies.has(company.id) ? 'Deselect' : 'Select'}
                        >
                          {selectedCompanies.has(company.id) ? (
                            <CheckSquare className="h-4 w-4 text-blue-600" />
                          ) : (
                            <Square className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3">{company.company_name}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                          {company.company_type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              console.log('Edit button clicked for:', company.company_name)
                              handleEdit(company)
                            }}
                            variant="ghost"
                            size="sm"
                            disabled={loading}
                            type="button"
                            className="flex items-center gap-1 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            title="Edit Company"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              console.log('Delete button clicked for:', company.company_name)
                              handleDelete(company.id, company.company_name)
                            }}
                            variant="ghost"
                            size="sm"
                            disabled={loading}
                            type="button"
                            className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            title="Delete Company"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 text-sm text-gray-500 text-center">
                Showing {filteredCompanies.length} of {companies.length} companies
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

