'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { PermissionButton } from '@/components/ui/PermissionButton'
import {
  Package,
  Search,
  Plus,
  Edit,
  Trash2,
  Download,
  Upload,
} from 'lucide-react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { useSmartLoading } from '@/lib/smartLoadingManager'
import { ImportButton } from '@/components/ui/ImportButton'
import { useAuth } from '@/app/providers'

interface Item {
  id: string
  item_description: string
  created_at: string
  updated_at: string
}

export default function ItemsListContent() {
  const guard = usePermissionGuard()
  const { appUser } = useAuth()
  const supabase = createClientComponentClient({} as any)
  const { startSmartLoading, stopSmartLoading } = useSmartLoading('items-list')
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [items, setItems] = useState<Item[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    loadItems()
  }, [])

  const loadItems = async () => {
    try {
      setLoading(true)
      setError('')
      
      const { data, error: fetchError } = await supabase
        .from('procurement_items')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) {
        console.error('Supabase Error:', fetchError)
        if (fetchError.code === 'PGRST116' || fetchError.message.includes('does not exist')) {
          console.log('Procurement items table does not exist yet. Please create it in the database.')
          setError('Table does not exist. Please run the SQL script: Database/create-procurement-items-table.sql')
          setItems([])
          return
        }
        // Check for RLS/permission errors
        if (fetchError.code === '42501' || fetchError.message.includes('permission denied') || fetchError.message.includes('RLS')) {
          console.error('RLS/Permission error:', fetchError)
          setError('Permission denied. Please run: Database/fix-procurement-items-access.sql in Supabase SQL Editor to disable RLS.')
          setItems([])
          return
        }
        throw fetchError
      }

      setItems(data || [])
    } catch (error: any) {
      console.error('Error loading items:', error)
      setError('Failed to load items. Please ensure the procurement_items table exists in the database.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return

    try {
      startSmartLoading(setLoading)
      const { error: deleteError } = await supabase
        .from('procurement_items')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      await loadItems()
    } catch (error: any) {
      console.error('Error deleting item:', error)
      setError('Failed to delete item')
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  const handleSave = async (itemDescription: string) => {
    try {
      startSmartLoading(setLoading)
      setError('')

      if (editingItem) {
        // Update existing item
        const { error: updateError } = await supabase
          .from('procurement_items')
          .update({
            item_description: itemDescription,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingItem.id)

        if (updateError) throw updateError
      } else {
        // Create new item
        const { error: insertError } = await supabase
          .from('procurement_items')
          .insert({
            item_description: itemDescription
          })

        if (insertError) throw insertError
      }

      await loadItems()
      setShowForm(false)
      setEditingItem(null)
    } catch (error: any) {
      console.error('Error saving item:', error)
      setError('Failed to save item')
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  const handleImport = async (data: any[]) => {
    try {
      startSmartLoading(setLoading)
      setError('')
      setSuccess('')

      // Clean data - remove id, created_at, updated_at if present
      const cleanData = data.map(row => {
        const cleanRow: any = {}
        // Support multiple column name variations
        const itemDesc = row.item_description || row['Item Description'] || row['item description'] || row.description || row.name
        if (itemDesc) cleanRow.item_description = itemDesc
        return cleanRow
      }).filter(row => row.item_description) // Only include rows with item_description

      if (cleanData.length === 0) {
        throw new Error('No valid data found. Please ensure the file contains at least an "item_description" or "Item Description" column.')
      }

      // Insert data in batches
      const batchSize = 50
      let imported = 0
      let errors = 0

      for (let i = 0; i < cleanData.length; i += batchSize) {
        const batch = cleanData.slice(i, i + batchSize)
        const { error: insertError } = await supabase
          .from('procurement_items')
          .insert(batch)

        if (insertError) {
          console.error('Error inserting batch:', insertError)
          errors += batch.length
        } else {
          imported += batch.length
        }
      }

      await loadItems()
      setSuccess(`Successfully imported ${imported} item(s)${errors > 0 ? `. ${errors} failed.` : ''}`)
      setTimeout(() => setSuccess(''), 5000)
    } catch (error: any) {
      console.error('Error importing items:', error)
      setError(error.message || 'Failed to import items')
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  const getFilteredItems = () => {
    if (!searchTerm) return items

    const term = searchTerm.toLowerCase()
    return items.filter(item =>
      item.item_description?.toLowerCase().includes(term)
    )
  }

  const filteredItems = getFilteredItems()

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-end">
        <PermissionButton
          permission="procurement.items_list.create"
          onClick={() => {
            setEditingItem(null)
            setShowForm(true)
          }}
          variant="primary"
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Item
        </PermissionButton>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search items by description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Success Message */}
      {success && (
        <Alert variant="success" className="mb-4">
          {success}
        </Alert>
      )}

      {/* Error Message */}
      {error && (
        <div className="relative">
          <Alert variant="error">
            {error}
          </Alert>
          <button
            onClick={() => setError('')}
            className="absolute top-2 right-2 text-red-600 hover:text-red-800"
            aria-label="Close"
          >
            <span className="text-xl">&times;</span>
          </button>
        </div>
      )}

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Items ({filteredItems.length})</span>
            <div className="flex items-center gap-2">
              <PermissionButton
                permission="procurement.items_list.export"
                onClick={() => alert('Export functionality coming soon')}
                variant="ghost"
                size="sm"
              >
                <Download className="h-4 w-4" />
              </PermissionButton>
              {guard.hasAccess('procurement.items_list.import') && (
                <ImportButton
                  onImport={handleImport}
                  requiredColumns={['item_description']}
                  templateName="items_template"
                  templateColumns={['item_description']}
                  label=""
                  variant="outline"
                  className="p-2 border-0"
                  showTemplateButton={false}
                />
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {items.length === 0 ? 'No Items Found' : 'No Items Match Your Search'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {items.length === 0 
                  ? 'Get started by adding your first item. You may need to create the procurement_items table in your database first.'
                  : 'Try adjusting your search terms.'}
              </p>
              {items.length === 0 && (
                <PermissionButton
                  permission="procurement.items_list.create"
                  onClick={() => {
                    setEditingItem(null)
                    setShowForm(true)
                  }}
                  variant="primary"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Item
                </PermissionButton>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Item Description</th>
                    <th className="text-right p-3 font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="p-3">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {item.item_description}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-2">
                          <PermissionButton
                            permission="procurement.items_list.edit"
                            onClick={() => {
                              setEditingItem(item)
                              setShowForm(true)
                            }}
                            variant="ghost"
                            size="sm"
                          >
                            <Edit className="h-4 w-4" />
                          </PermissionButton>
                          <PermissionButton
                            permission="procurement.items_list.delete"
                            onClick={() => handleDelete(item.id)}
                            variant="ghost"
                            size="sm"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </PermissionButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Item Form Modal */}
      {showForm && (
        <ItemFormModal
          item={editingItem}
          onSave={handleSave}
          onClose={() => {
            setShowForm(false)
            setEditingItem(null)
          }}
        />
      )}
    </div>
  )
}

interface ItemFormModalProps {
  item: Item | null
  onSave: (itemDescription: string) => void
  onClose: () => void
}

function ItemFormModal({ item, onSave, onClose }: ItemFormModalProps) {
  const [itemDescription, setItemDescription] = useState(item?.item_description || '')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!itemDescription.trim()) {
      alert('Item description is required')
      return
    }
    setSaving(true)
    await onSave(itemDescription.trim())
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl m-4">
        <CardHeader>
          <CardTitle>
            {item ? 'Edit Item' : 'Add New Item'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Item Description <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                placeholder="Enter item description..."
                required
                className="w-full"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={saving || !itemDescription.trim()}
              >
                {saving ? 'Saving...' : item ? 'Update' : 'Add'} Item
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

