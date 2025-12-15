'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  Tag, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Search,
  Building2,
  Grid,
  List,
  CheckSquare,
  Square
} from 'lucide-react'

interface VendorCategory {
  id: string
  name: string
  description?: string
  is_active: boolean
  usage_count?: number
  created_at: string
  updated_at: string
}

export function VendorCategoriesManager() {
  const guard = usePermissionGuard()
  const supabase = createClientComponentClient({} as any)
  const [categories, setCategories] = useState<VendorCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<VendorCategory | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  
  // Form fields
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true
  })

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      setLoading(true)
      setError('')
      
      const { data, error: fetchError } = await supabase
        .from('vendor_categories')
        .select('*')
        .order('name', { ascending: true })

      if (fetchError) {
        if (fetchError.code === 'PGRST116' || fetchError.message.includes('does not exist')) {
          setError('Vendor categories table does not exist. Please run: Database/create-vendor-categories-table.sql')
          setCategories([])
          return
        }
        // If 403 error (permission denied), suggest running fix script
        if (fetchError.code === '42501' || fetchError.message.includes('permission denied') || fetchError.message.includes('RLS') || (fetchError as any).status === 403) {
          setError('Permission denied (403). Please run: Database/fix-vendor-categories-rls.sql in Supabase SQL Editor to fix permissions.')
          setCategories([])
          return
        }
        throw fetchError
      }

      setCategories(data || [])
      // Clear selection when data is refreshed
      setSelectedCategories(new Set())
    } catch (error: any) {
      console.error('Error fetching categories:', error)
      setError('Failed to load categories')
      setCategories([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!formData.name.trim()) {
      setError('Category name is required')
      return
    }

    try {
      setLoading(true)

      if (editingCategory) {
        // Update existing category
        const { error: updateError } = await supabase
          .from('vendor_categories')
          .update({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            is_active: formData.is_active
          })
          .eq('id', editingCategory.id)

        if (updateError) throw updateError

        setSuccess('Category updated successfully')
        await fetchCategories()
        resetForm()
      } else {
        // Add new category
        const { error: insertError } = await supabase
          .from('vendor_categories')
          .insert([{
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            is_active: formData.is_active
          }])

        if (insertError) {
          if (insertError.code === '23505') {
            setError('Category name already exists')
            return
          }
          throw insertError
        }

        setSuccess('Category added successfully')
        await fetchCategories()
        resetForm()
      }
    } catch (error: any) {
      console.error('Error saving category:', error)
      setError(error.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (category: VendorCategory) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      description: category.description || '',
      is_active: category.is_active
    })
    setShowForm(true)
    setError('')
    setSuccess('')
  }

  const handleDelete = async (category: VendorCategory) => {
    if (!confirm(`Are you sure you want to delete "${category.name}"? This will remove the category from all vendors using it.`)) {
      return
    }

    try {
      setLoading(true)
      setError('')
      setSuccess('')

      // First, check if category is being used
      const { data: vendorsUsingCategory } = await supabase
        .from('vendors')
        .select('id, name')
        .eq('category', category.name)
        .limit(5)

      if (vendorsUsingCategory && vendorsUsingCategory.length > 0) {
        const vendorNames = vendorsUsingCategory.map(v => v.name).join(', ')
        setError(`Cannot delete category. It is being used by ${vendorsUsingCategory.length} vendor(s): ${vendorNames}. Please update vendors first.`)
        return
      }

      // Delete category
      const { error: deleteError } = await supabase
        .from('vendor_categories')
        .delete()
        .eq('id', category.id)

      if (deleteError) throw deleteError

      setSuccess('Category deleted successfully')
      await fetchCategories()
    } catch (error: any) {
      console.error('Error deleting category:', error)
      setError(error.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async (category: VendorCategory) => {
    try {
      setLoading(true)
      setError('')
      setSuccess('')

      const { error: updateError } = await supabase
        .from('vendor_categories')
        .update({ is_active: !category.is_active })
        .eq('id', category.id)

      if (updateError) throw updateError

      setSuccess(`Category ${!category.is_active ? 'activated' : 'deactivated'} successfully`)
      await fetchCategories()
    } catch (error: any) {
      console.error('Error toggling category status:', error)
      setError(error.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCategories(new Set(filteredCategories.map(c => c.id)))
    } else {
      setSelectedCategories(new Set())
    }
  }

  const handleSelectCategory = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedCategories)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedCategories(newSelected)
  }

  const handleBulkDelete = async () => {
    if (selectedCategories.size === 0) {
      setError('Please select at least one category to delete')
      return
    }

    if (!confirm(`Are you sure you want to delete ${selectedCategories.size} category(ies)? This will remove the categories from all vendors using them.`)) {
      return
    }

    try {
      setLoading(true)
      setError('')
      setSuccess('')

      const categoryIds = Array.from(selectedCategories)
      
      // Check if any categories are being used
      const categoriesToDelete = filteredCategories.filter(c => categoryIds.includes(c.id))
      const usedCategories: string[] = []

      for (const category of categoriesToDelete) {
        const { data: vendorsUsingCategory } = await supabase
          .from('vendors')
          .select('id')
          .eq('category', category.name)
          .limit(1)

        if (vendorsUsingCategory && vendorsUsingCategory.length > 0) {
          usedCategories.push(category.name)
        }
      }

      if (usedCategories.length > 0) {
        setError(`Cannot delete categories. The following categories are being used: ${usedCategories.join(', ')}. Please update vendors first.`)
        return
      }

      // Delete categories
      const { error: deleteError } = await supabase
        .from('vendor_categories')
        .delete()
        .in('id', categoryIds)

      if (deleteError) throw deleteError

      setSuccess(`Successfully deleted ${selectedCategories.size} category(ies)`)
      setSelectedCategories(new Set())
      await fetchCategories()
    } catch (error: any) {
      console.error('Error deleting categories:', error)
      setError(error.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleBulkActivate = async () => {
    if (selectedCategories.size === 0) {
      setError('Please select at least one category to activate')
      return
    }

    try {
      setLoading(true)
      setError('')
      setSuccess('')

      const categoryIds = Array.from(selectedCategories)
      const { error: updateError } = await supabase
        .from('vendor_categories')
        .update({ is_active: true })
        .in('id', categoryIds)

      if (updateError) throw updateError

      setSuccess(`Successfully activated ${selectedCategories.size} category(ies)`)
      setSelectedCategories(new Set())
      await fetchCategories()
    } catch (error: any) {
      console.error('Error activating categories:', error)
      setError(error.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleBulkDeactivate = async () => {
    if (selectedCategories.size === 0) {
      setError('Please select at least one category to deactivate')
      return
    }

    try {
      setLoading(true)
      setError('')
      setSuccess('')

      const categoryIds = Array.from(selectedCategories)
      const { error: updateError } = await supabase
        .from('vendor_categories')
        .update({ is_active: false })
        .in('id', categoryIds)

      if (updateError) throw updateError

      setSuccess(`Successfully deactivated ${selectedCategories.size} category(ies)`)
      setSelectedCategories(new Set())
      await fetchCategories()
    } catch (error: any) {
      console.error('Error deactivating categories:', error)
      setError(error.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({ name: '', description: '', is_active: true })
    setEditingCategory(null)
    setShowForm(false)
    setError('')
  }

  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (cat.description && cat.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg">
                <Tag className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle>Vendor Categories Management</CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Manage vendor categories - Add, edit, and organize vendor categories
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchCategories}
                disabled={loading}
                title="Refresh Categories"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="ml-2 hidden sm:inline">Refresh</span>
              </Button>
              {guard.hasAccess('procurement.vendor_list.create') && (
                <Button
                  onClick={() => {
                    resetForm()
                    setShowForm(true)
                  }}
                  disabled={loading}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Category
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

          {/* Bulk Actions Toolbar */}
          {selectedCategories.size > 0 && (
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    {selectedCategories.size} category(ies) selected
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedCategories(new Set())}
                    className="text-gray-600 dark:text-gray-300"
                  >
                    Clear Selection
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  {guard.hasAccess('procurement.vendor_list.edit') && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBulkActivate}
                        disabled={loading}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Activate
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBulkDeactivate}
                        disabled={loading}
                        className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Deactivate
                      </Button>
                    </>
                  )}
                  {guard.hasAccess('procurement.vendor_list.delete') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBulkDelete}
                      disabled={loading}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Selected
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Search and View Mode Toggle */}
          <div className="mb-4 flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                title="Grid View"
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded transition-colors ${
                  viewMode === 'table' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                title="Table View"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Form */}
          {showForm && (
            <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  {editingCategory ? 'Edit Category' : 'Add New Category'}
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
                    Category Name *
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Construction Materials, Equipment Rental"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional description for this category"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium">
                    Active (visible in dropdown)
                  </label>
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
                    {editingCategory ? 'Update' : 'Add'} Category
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Categories List */}
          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="text-center py-12">
              <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                {searchTerm ? 'No categories match your search.' : 'No categories found. Add your first category!'}
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCategories.map((category) => (
                <div
                  key={category.id}
                  className={`p-4 border rounded-lg transition-colors ${
                    !category.is_active 
                      ? 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800/50 opacity-60' 
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500'
                  } ${selectedCategories.has(category.id) ? 'ring-2 ring-blue-500' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2 flex-1">
                      {guard.hasAccess('procurement.vendor_list.delete') && (
                        <button
                          onClick={() => handleSelectCategory(category.id, !selectedCategories.has(category.id))}
                          className="mt-1"
                        >
                          {selectedCategories.has(category.id) ? (
                            <CheckSquare className="h-5 w-5 text-blue-600" />
                          ) : (
                            <Square className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                      )}
                      <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {category.name}
                        </h4>
                        {!category.is_active && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 dark:bg-gray-700 
                                         text-gray-600 dark:text-gray-400 rounded">
                            Inactive
                          </span>
                        )}
                      </div>
                      {category.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {category.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                        {category.usage_count !== undefined && category.usage_count > 0 && (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            Used by {category.usage_count} vendor{category.usage_count !== 1 ? 's' : ''}
                          </span>
                        )}
                        <span>
                          Created: {new Date(category.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    </div>
                    <div className="flex flex-col gap-1 ml-2">
                      {guard.hasAccess('procurement.vendor_list.edit') && (
                        <button
                          onClick={() => handleToggleActive(category)}
                          className={`p-2 rounded-lg transition-colors ${
                            category.is_active
                              ? 'hover:bg-yellow-50 dark:hover:bg-yellow-900/30'
                              : 'hover:bg-green-50 dark:hover:bg-green-900/30'
                          }`}
                          title={category.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {category.is_active ? (
                            <X className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                          ) : (
                            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                          )}
                        </button>
                      )}
                      {guard.hasAccess('procurement.vendor_list.edit') && (
                        <button
                          onClick={() => handleEdit(category)}
                          className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </button>
                      )}
                      {guard.hasAccess('procurement.vendor_list.delete') && (
                        <button
                          onClick={() => handleDelete(category)}
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
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    {guard.hasAccess('procurement.vendor_list.delete') && (
                      <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300 w-12">
                        <button
                          onClick={() => handleSelectAll(selectedCategories.size !== filteredCategories.length)}
                          className="flex items-center justify-center"
                          title={selectedCategories.size === filteredCategories.length ? 'Deselect all' : 'Select all'}
                        >
                          {selectedCategories.size === filteredCategories.length && filteredCategories.length > 0 ? (
                            <CheckSquare className="h-5 w-5 text-blue-600" />
                          ) : (
                            <Square className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                      </th>
                    )}
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Name</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Description</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Status</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Usage</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Created</th>
                    <th className="text-right p-3 font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCategories.map((category) => (
                    <tr
                      key={category.id}
                      className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                        !category.is_active ? 'opacity-60' : ''
                      } ${selectedCategories.has(category.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                    >
                      {guard.hasAccess('procurement.vendor_list.delete') && (
                        <td className="p-3 w-12">
                          <button
                            onClick={() => handleSelectCategory(category.id, !selectedCategories.has(category.id))}
                            className="flex items-center justify-center"
                          >
                            {selectedCategories.has(category.id) ? (
                              <CheckSquare className="h-5 w-5 text-blue-600" />
                            ) : (
                              <Square className="h-5 w-5 text-gray-400" />
                            )}
                          </button>
                        </td>
                      )}
                      <td className="p-3">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {category.name}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
                          {category.description || '-'}
                        </div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            category.is_active
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                          }`}
                        >
                          {category.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="p-3">
                        {category.usage_count !== undefined && category.usage_count > 0 ? (
                          <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                            <Building2 className="h-4 w-4" />
                            {category.usage_count} vendor{category.usage_count !== 1 ? 's' : ''}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="p-3 text-sm text-gray-600 dark:text-gray-400">
                        {new Date(category.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-2">
                          {guard.hasAccess('procurement.vendor_list.edit') && (
                            <button
                              onClick={() => handleToggleActive(category)}
                              className={`p-2 rounded-lg transition-colors ${
                                category.is_active
                                  ? 'hover:bg-yellow-50 dark:hover:bg-yellow-900/30'
                                  : 'hover:bg-green-50 dark:hover:bg-green-900/30'
                              }`}
                              title={category.is_active ? 'Deactivate' : 'Activate'}
                            >
                              {category.is_active ? (
                                <X className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                              ) : (
                                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                              )}
                            </button>
                          )}
                          {guard.hasAccess('procurement.vendor_list.edit') && (
                            <button
                              onClick={() => handleEdit(category)}
                              className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </button>
                          )}
                          {guard.hasAccess('procurement.vendor_list.delete') && (
                            <button
                              onClick={() => handleDelete(category)}
                              className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Statistics */}
          {categories.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {categories.length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Total Categories
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {categories.filter(c => c.is_active).length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Active
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                    {categories.filter(c => !c.is_active).length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Inactive
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {categories.reduce((sum, c) => sum + (c.usage_count || 0), 0)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Total Usage
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

