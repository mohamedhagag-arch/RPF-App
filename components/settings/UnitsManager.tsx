'use client'

import { useState, useEffect } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
import { createClient } from '@supabase/supabase-js'
import { useSmartLoading } from '@/lib/smartLoadingManager'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Plus, Edit, Trash2, Search, Save, X, CheckCircle, AlertCircle } from 'lucide-react'

interface Unit {
  id: string
  name: string
  code?: string
  description?: string
  is_active: boolean
  usage_count: number
  created_at: string
  updated_at: string
}

export function UnitsManager() {
  const guard = usePermissionGuard()
  const defaultSupabase = getSupabaseClient()
  // ✅ Create a dedicated Supabase client for 'public' schema
  const supabase = typeof window !== 'undefined' ? (createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: {
        schema: 'public'
      }
    }
  ) as any) : defaultSupabase
  const { startSmartLoading, stopSmartLoading } = useSmartLoading('units')
  
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: ''
  })

  const canManage = guard.hasAccess('settings.manage')

  useEffect(() => {
    loadUnits()
  }, [])

  const loadUnits = async () => {
    try {
      startSmartLoading(setLoading)
      setError('')
      
      // Try to load units from database
      // ✅ Using dedicated Supabase client configured for 'public' schema
      const { data, error: fetchError } = await (supabase as any)
        .from('units')
        .select('*')
        .order('name', { ascending: true })
      
      if (fetchError) {
        console.error('Error loading units:', fetchError)
        
        // Check if it's a permission or table not found error
        const errorMessage = fetchError.message || fetchError.toString() || ''
        const isPermissionError = errorMessage.toLowerCase().includes('permission') || 
                                  errorMessage.toLowerCase().includes('denied') ||
                                  errorMessage.toLowerCase().includes('does not exist') ||
                                  errorMessage.toLowerCase().includes('relation') ||
                                  errorMessage.toLowerCase().includes('table')
        
        if (isPermissionError) {
          setError('Permission denied (403). Please run the SQL script "Database/fix-units-rls-final.sql" in Supabase SQL Editor to fix RLS policies.')
          // Set empty array to show empty state
          setUnits([])
        } else {
          setError('Failed to load units: ' + errorMessage)
          setUnits([])
        }
        return
      }
      
      // Success - set units data
      setUnits(data || [])
      
      // Clear any previous errors
      if (data && data.length > 0) {
        setError('')
      }
    } catch (err: any) {
      console.error('Error loading units:', err)
      const errorMessage = err.message || err.toString() || 'Unknown error'
      
      const isPermissionError = errorMessage.toLowerCase().includes('permission') || 
                                errorMessage.toLowerCase().includes('denied') ||
                                errorMessage.toLowerCase().includes('does not exist') ||
                                errorMessage.toLowerCase().includes('relation') ||
                                errorMessage.toLowerCase().includes('table')
      
      if (isPermissionError) {
        setError('Permission denied (403). Please run the SQL script "Database/fix-units-rls-final.sql" in Supabase SQL Editor to fix RLS policies.')
      } else {
        setError('Failed to load units: ' + errorMessage)
      }
      setUnits([])
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  const handleCreateUnit = async () => {
    try {
      if (!formData.name.trim()) {
        setError('Unit name is required')
        return
      }

      startSmartLoading(setLoading)
      setError('')
      
      const { data, error: createError } = await supabase
        .from('units')
        .insert({
          name: formData.name.trim(),
          code: formData.code.trim() || null,
          description: formData.description.trim() || null,
          is_active: true,
          usage_count: 0
        })
        .select()
        .single()
      
      if (createError) throw createError
      
      setSuccess('Unit created successfully')
      setShowForm(false)
      setFormData({ name: '', code: '', description: '' })
      await loadUnits()
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      console.error('Error creating unit:', err)
      setError('Failed to create unit: ' + err.message)
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  const handleUpdateUnit = async () => {
    if (!editingUnit) return
    
    try {
      if (!formData.name.trim()) {
        setError('Unit name is required')
        return
      }

      startSmartLoading(setLoading)
      setError('')
      
      const { error: updateError } = await supabase
        .from('units')
        .update({
          name: formData.name.trim(),
          code: formData.code.trim() || null,
          description: formData.description.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingUnit.id)
      
      if (updateError) throw updateError
      
      setSuccess('Unit updated successfully')
      setEditingUnit(null)
      setShowForm(false)
      setFormData({ name: '', code: '', description: '' })
      await loadUnits()
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      console.error('Error updating unit:', err)
      setError('Failed to update unit: ' + err.message)
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  const handleDeleteUnit = async (unit: Unit) => {
    if (!confirm(`Are you sure you want to delete "${unit.name}"? This action cannot be undone.`)) {
      return
    }

    try {
      startSmartLoading(setLoading)
      setError('')
      
      const { error: deleteError } = await supabase
        .from('units')
        .delete()
        .eq('id', unit.id)
      
      if (deleteError) throw deleteError
      
      setSuccess('Unit deleted successfully')
      await loadUnits()
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      console.error('Error deleting unit:', err)
      setError('Failed to delete unit: ' + err.message)
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  const handleToggleActive = async (unit: Unit) => {
    try {
      startSmartLoading(setLoading)
      setError('')
      
      const { error: updateError } = await supabase
        .from('units')
        .update({
          is_active: !unit.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', unit.id)
      
      if (updateError) throw updateError
      
      await loadUnits()
    } catch (err: any) {
      console.error('Error toggling unit status:', err)
      setError('Failed to update unit status: ' + err.message)
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  const handleEdit = (unit: Unit) => {
    setEditingUnit(unit)
    setFormData({
      name: unit.name,
      code: unit.code || '',
      description: unit.description || ''
    })
    setShowForm(true)
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingUnit(null)
    setFormData({ name: '', code: '', description: '' })
  }

  const filteredUnits = units.filter(unit =>
    unit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (unit.code && unit.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (unit.description && unit.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (loading && units.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Units Management</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage measurement units used in activities and KPIs
          </p>
        </div>
        {canManage && (
          <Button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add New Unit
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="error">
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => setError('')}
              className="ml-4 text-red-600 hover:text-red-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </Alert>
      )}

      {success && (
        <Alert variant="success">
          <div className="flex items-center justify-between">
            <span>{success}</span>
            <button
              onClick={() => setSuccess('')}
              className="ml-4 text-green-600 hover:text-green-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </Alert>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <Input
          type="text"
          placeholder="Search units..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingUnit ? 'Edit Unit' : 'Add New Unit'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Unit Name *
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Meter, Kilogram, Day"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Unit Code (Optional)
              </label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g., m, kg, d"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the unit"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outline"
                onClick={handleCancel}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={editingUnit ? handleUpdateUnit : handleCreateUnit}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {editingUnit ? 'Update' : 'Create'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Units List */}
      <Card>
        <CardHeader>
          <CardTitle>Units ({filteredUnits.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredUnits.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              {searchTerm ? 'No units found matching your search' : 'No units found. Create your first unit!'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredUnits.map((unit) => (
                <div
                  key={unit.id}
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {unit.name}
                      </h3>
                      {unit.code && (
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          ({unit.code})
                        </span>
                      )}
                      {!unit.is_active && (
                        <span className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    {unit.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {unit.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>Used: {unit.usage_count} times</span>
                      <span>Created: {new Date(unit.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  {canManage && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleActive(unit)}
                        title={unit.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {unit.is_active ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(unit)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteUnit(unit)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

