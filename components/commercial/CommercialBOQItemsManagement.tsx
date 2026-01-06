'use client'

import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { useAuth } from '@/app/providers'
import { getSupabaseClient, executeQuery } from '@/lib/simpleConnectionManager'
import { useSmartLoading } from '@/lib/smartLoadingManager'
import { CommercialBOQItem, TABLES, Project } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Alert } from '@/components/ui/Alert'
import { Input } from '@/components/ui/Input'
import { Pagination } from '@/components/ui/Pagination'
import { PermissionButton } from '@/components/ui/PermissionButton'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter, 
  X, 
  Save, 
  XCircle,
  ClipboardList,
  DollarSign,
  TrendingUp,
  FileText,
  CheckSquare,
  Square
} from 'lucide-react'
import { formatCurrencyByCodeSync } from '@/lib/currenciesManager'
import { BulkEditBOQItemsModal } from './BulkEditBOQItemsModal'
import { AddBOQItemForm } from './AddBOQItemForm'

interface CommercialBOQItemsManagementProps {
  globalSearchTerm?: string
}

export function CommercialBOQItemsManagement({ globalSearchTerm = '' }: CommercialBOQItemsManagementProps = {}) {
  const guard = usePermissionGuard()
  const { appUser } = useAuth()
  const [items, setItems] = useState<CommercialBOQItem[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingData, setEditingData] = useState<Partial<CommercialBOQItem>>({})
  
  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isSelectMode, setIsSelectMode] = useState(false)
  
  // Bulk edit state
  const [showBulkEditModal, setShowBulkEditModal] = useState(false)
  
  // Add item form state
  const [showAddForm, setShowAddForm] = useState(false)
  
  // Filters state
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    search: '',
    projectFullCode: '',
    projectName: '',
    itemDescription: '',
    unit: '',
    remeasurable: '' as '' | 'true' | 'false',
    minQuantity: '',
    maxQuantity: '',
    minRate: '',
    maxRate: '',
    minTotalValue: '',
    maxTotalValue: '',
    minVariations: '',
    maxVariations: '',
  })
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(50)
  
  // Sorting
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  
  const supabase = getSupabaseClient()
  const { startSmartLoading, stopSmartLoading } = useSmartLoading('commercial-boq-items')
  
  // Fetch BOQ Items
  const fetchItems = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      startSmartLoading(setLoading)
      
      console.log('🔍 Fetching BOQ items from table:', TABLES.COMMERCIAL_BOQ_ITEMS)
      
      const { data, error: fetchError } = await supabase
        .from(TABLES.COMMERCIAL_BOQ_ITEMS)
        .select('*')
        .order('created_at', { ascending: false })
      
      if (fetchError) {
        console.error('❌ Supabase fetch error:', fetchError)
        throw fetchError
      }
      
      console.log('📦 Raw data from Supabase:', data)
      console.log('📦 Number of records:', data?.length || 0)
      
      if (!data || data.length === 0) {
        console.log('⚠️ No data returned from Supabase')
        setItems([])
        return
      }
      
      // Log first row to see column names and values
      if (data.length > 0) {
        const firstRow = data[0]
        console.log('📋 First row keys:', Object.keys(firstRow))
        console.log('📋 First row full object:', JSON.stringify(firstRow, null, 2))
        
        // Try all possible column name variations for currency fields
        console.log('💰 Rate values:', {
          'Rate': firstRow['Rate'],
          'rate': firstRow['rate'],
          'Rate (dot)': (firstRow as any).Rate,
          'rate (dot)': (firstRow as any).rate,
        })
        console.log('💰 Total Value values:', {
          'Total Value': firstRow['Total Value'],
          'total_value': firstRow['total_value'],
          'TotalValue': firstRow['TotalValue'],
          'totalValue': firstRow['totalValue'],
        })
        console.log('💰 Variations values:', {
          'Variations': firstRow['Variations'],
          'variations': firstRow['variations'],
        })
        console.log('💰 Planning Assigned Amount values:', {
          'Planning Assigned Amount': firstRow['Planning Assigned Amount'],
          'planning_assigned_amount': firstRow['planning_assigned_amount'],
        })
        console.log('💰 Total Including Variations values:', {
          'Total Including Variations': firstRow['Total Including Variations'],
          'total_including_variations': firstRow['total_including_variations'],
        })
      }
      
      // Helper function to safely parse numeric values (defined outside map for reuse)
      const parseNumeric = (value: any, defaultValue: number = 0): number => {
        if (value === null || value === undefined) {
          return defaultValue
        }
        // Handle empty string
        if (value === '' || (typeof value === 'string' && value.trim() === '')) {
          return defaultValue
        }
        // If it's already a number, return it
        if (typeof value === 'number') {
          return isNaN(value) || !isFinite(value) ? defaultValue : value
        }
        // Try to parse as string - Supabase NUMERIC values are often returned as strings
        const str = String(value).replace(/,/g, '').replace(/\s+/g, '').trim()
        if (str === '' || str === 'null' || str === 'undefined') {
          return defaultValue
        }
        const parsed = parseFloat(str)
        // Check if parsing was successful
        if (isNaN(parsed) || !isFinite(parsed)) {
          console.warn(`⚠️ Failed to parse numeric value: "${value}" (type: ${typeof value})`)
          return defaultValue
        }
        return parsed
      }
      
      // Get all actual column names from first row for better matching
      const actualColumnNames = data.length > 0 ? Object.keys(data[0]) : []
      console.log('📋 All actual column names from database:', actualColumnNames)
      
      // Map database columns to interface - try multiple column name formats
      const mappedItems: CommercialBOQItem[] = (data || []).map((row: any, index: number) => {
        // Helper function to get value with multiple fallbacks - now includes exact column name matching
        const getValue = (keys: string[]) => {
          // First try exact matches from the keys array
          for (const key of keys) {
            if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
              return row[key]
            }
          }
          // Then try to find a case-insensitive match from actual column names
          for (const actualKey of actualColumnNames) {
            for (const key of keys) {
              if (actualKey.toLowerCase() === key.toLowerCase() && 
                  row[actualKey] !== undefined && row[actualKey] !== null && row[actualKey] !== '') {
                return row[actualKey]
              }
            }
          }
          return null
        }
        
        // Helper to get numeric value trying all possible column name variations
        // Enhanced to also try case-insensitive matching with actual column names
        const getNumericValue = (possibleNames: string[]): number => {
          for (const name of possibleNames) {
            // Try bracket notation first (works with spaces in column names)
            let rawValue = row[name]
            if (rawValue !== undefined && rawValue !== null) {
              // Handle empty string explicitly
              if (rawValue === '' || (typeof rawValue === 'string' && rawValue.trim() === '')) {
                continue // Try next name variation
              }
              // If it's already a number, return it (including 0)
              if (typeof rawValue === 'number') {
                const numValue = isNaN(rawValue) || !isFinite(rawValue) ? NaN : rawValue
                if (!isNaN(numValue)) {
                  return numValue
                }
              }
              // If it's a string, try to parse it (Supabase NUMERIC values are often strings)
              if (typeof rawValue === 'string') {
                const parsed = parseNumeric(rawValue, NaN)
                if (!isNaN(parsed) && isFinite(parsed)) {
                  return parsed
                }
              }
            }
            // Try case-insensitive match from actual column names
            for (const actualKey of actualColumnNames) {
              if (actualKey.toLowerCase() === name.toLowerCase()) {
                rawValue = row[actualKey]
                if (rawValue !== undefined && rawValue !== null) {
                  // Handle empty string explicitly
                  if (rawValue === '' || (typeof rawValue === 'string' && rawValue.trim() === '')) {
                    continue
                  }
                  if (typeof rawValue === 'number') {
                    const numValue = isNaN(rawValue) || !isFinite(rawValue) ? NaN : rawValue
                    if (!isNaN(numValue)) {
                      return numValue
                    }
                  }
                  if (typeof rawValue === 'string') {
                    const parsed = parseNumeric(rawValue, NaN)
                    if (!isNaN(parsed) && isFinite(parsed)) {
                      return parsed
                    }
                  }
                }
              }
            }
            // Try dot notation as fallback
            const dotValue = (row as any)[name]
            if (dotValue !== undefined && dotValue !== null) {
              // Handle empty string explicitly
              if (dotValue === '' || (typeof dotValue === 'string' && dotValue.trim() === '')) {
                continue
              }
              if (typeof dotValue === 'number') {
                const numValue = isNaN(dotValue) || !isFinite(dotValue) ? NaN : dotValue
                if (!isNaN(numValue)) {
                  return numValue
                }
              }
              if (typeof dotValue === 'string') {
                const parsed = parseNumeric(dotValue, NaN)
                if (!isNaN(parsed) && isFinite(parsed)) {
                  return parsed
                }
              }
            }
          }
          return 0
        }
        
        // Direct access to row properties - Supabase returns column names exactly as in DB
        const item: CommercialBOQItem = {
          id: row.id || '',
          auto_generated_unique_reference_number: getValue([
            'Auto Generated Unique Reference Number',
            'auto_generated_unique_reference_number'
          ]) || '',
          project_full_code: getValue([
            'Project Full Code',
            'project_full_code'
          ]) || '',
          project_name: getValue([
            'Project Name',
            'project_name'
          ]) || '',
          item_description: getValue([
            'Item Description',
            'item_description'
          ]) || '',
          unit: getValue(['Unit', 'unit']) || '',
          // Use enhanced getNumericValue with multiple column name variations
          // Explicitly convert to Number to ensure proper type
          quantity: Number(getNumericValue(['Quantity', 'quantity'])),
          rate: Number(getNumericValue(['Rate', 'rate'])),
          total_value: Number(getNumericValue(['Total Value', 'total_value', 'TotalValue', 'totalValue'])),
          remeasurable: (row['Remeasurable?'] === true || 
                        row['Remeasurable?'] === 'true' ||
                        String(getValue(['Remeasurable?', 'remeasurable'])).toLowerCase() === 'true'),
          planning_assigned_amount: Number(getNumericValue(['Planning Assigned Amount', 'planning_assigned_amount', 'PlanningAssignedAmount', 'planningAssignedAmount'])),
          variations: Number(getNumericValue(['Variations', 'variations'])),
          total_including_variations: Number(getNumericValue(['Total Including Variations', 'total_including_variations', 'TotalIncludingVariations', 'totalIncludingVariations'])),
          created_at: row.created_at || '',
          updated_at: row.updated_at || '',
        }
        
        // Debug log for first item to verify values
        if (index === 0) {
          console.log('🔍 First item mapping debug:', {
            rawRow: row,
            rawRate: row['Rate'],
            rawRateType: typeof row['Rate'],
            rawTotalValue: row['Total Value'],
            rawTotalValueType: typeof row['Total Value'],
            rawVariations: row['Variations'],
            rawVariationsType: typeof row['Variations'],
            rawPlanningAmount: row['Planning Assigned Amount'],
            rawPlanningAmountType: typeof row['Planning Assigned Amount'],
            rawTotalIncludingVariations: row['Total Including Variations'],
            rawTotalIncludingVariationsType: typeof row['Total Including Variations'],
            allRowKeys: Object.keys(row),
            mappedRate: item.rate,
            mappedRateType: typeof item.rate,
            mappedTotalValue: item.total_value,
            mappedTotalValueType: typeof item.total_value,
            mappedVariations: item.variations,
            mappedVariationsType: typeof item.variations,
            mappedPlanningAmount: item.planning_assigned_amount,
            mappedPlanningAmountType: typeof item.planning_assigned_amount,
            mappedTotalIncludingVariations: item.total_including_variations,
            mappedTotalIncludingVariationsType: typeof item.total_including_variations,
            finalItem: item,
          })
        }
        
        return item
      })
      
      console.log('✅ Mapped items:', mappedItems)
      console.log('✅ Mapped items count:', mappedItems.length)
      
      // Debug: Check for NaN values in mapped items
      if (mappedItems.length > 0) {
        const firstItem = mappedItems[0]
        console.log('🔍 First item numeric values after mapping:', {
          quantity: firstItem.quantity,
          rate: firstItem.rate,
          total_value: firstItem.total_value,
          planning_assigned_amount: firstItem.planning_assigned_amount,
          variations: firstItem.variations,
          total_including_variations: firstItem.total_including_variations,
          isNaN_rate: isNaN(firstItem.rate),
          isNaN_total_value: isNaN(firstItem.total_value),
          typeOf_rate: typeof firstItem.rate,
          typeOf_total_value: typeof firstItem.total_value,
        })
        console.log('🔍 First item full object:', JSON.stringify(firstItem, null, 2))
      }
      
      setItems(mappedItems)
    } catch (err: any) {
      console.error('❌ Error fetching BOQ items:', err)
      setError(err.message || 'Failed to load BOQ items. Please check the browser console for details.')
    } finally {
      stopSmartLoading(setLoading)
    }
  }, [supabase, startSmartLoading, stopSmartLoading])
  
  // Fetch Projects for dropdown
  const fetchProjects = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from(TABLES.PROJECTS)
        .select('*')
      
      if (fetchError) throw fetchError
      
      const mappedProjects = (data || []).map((row: any) => ({
        id: row.id,
        project_code: row['Project Code'] || '',
        project_sub_code: row['Project Sub-Code'] || '',
        project_name: row['Project Name'] || '',
        project_full_code: `${row['Project Code'] || ''}${row['Project Sub-Code'] ? '-' + row['Project Sub-Code'] : ''}`,
      } as Project))
      
      setProjects(mappedProjects)
    } catch (err: any) {
      console.error('Error fetching projects:', err)
    }
  }, [supabase])
  
  useEffect(() => {
    fetchItems()
    fetchProjects()
  }, [fetchItems, fetchProjects])
  
  // Filtered items
  const filteredItems = useMemo(() => {
    let filtered = [...items]
    
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(item =>
        item.auto_generated_unique_reference_number.toLowerCase().includes(searchLower) ||
        item.project_full_code.toLowerCase().includes(searchLower) ||
        item.project_name.toLowerCase().includes(searchLower) ||
        item.item_description.toLowerCase().includes(searchLower) ||
        (item.unit && item.unit.toLowerCase().includes(searchLower))
      )
    }
    
    // Column filters
    if (filters.projectFullCode) {
      filtered = filtered.filter(item => 
        item.project_full_code.toLowerCase().includes(filters.projectFullCode.toLowerCase())
      )
    }
    
    if (filters.projectName) {
      filtered = filtered.filter(item => 
        item.project_name.toLowerCase().includes(filters.projectName.toLowerCase())
      )
    }
    
    if (filters.itemDescription) {
      filtered = filtered.filter(item => 
        item.item_description.toLowerCase().includes(filters.itemDescription.toLowerCase())
      )
    }
    
    if (filters.unit) {
      filtered = filtered.filter(item => 
        item.unit?.toLowerCase().includes(filters.unit.toLowerCase())
      )
    }
    
    if (filters.remeasurable !== '') {
      filtered = filtered.filter(item => 
        filters.remeasurable === 'true' ? item.remeasurable : !item.remeasurable
      )
    }
    
    // Numeric filters
    if (filters.minQuantity) {
      filtered = filtered.filter(item => item.quantity >= parseFloat(filters.minQuantity))
    }
    if (filters.maxQuantity) {
      filtered = filtered.filter(item => item.quantity <= parseFloat(filters.maxQuantity))
    }
    if (filters.minRate) {
      filtered = filtered.filter(item => item.rate >= parseFloat(filters.minRate))
    }
    if (filters.maxRate) {
      filtered = filtered.filter(item => item.rate <= parseFloat(filters.maxRate))
    }
    if (filters.minTotalValue) {
      filtered = filtered.filter(item => item.total_value >= parseFloat(filters.minTotalValue))
    }
    if (filters.maxTotalValue) {
      filtered = filtered.filter(item => item.total_value <= parseFloat(filters.maxTotalValue))
    }
    if (filters.minVariations) {
      filtered = filtered.filter(item => item.variations >= parseFloat(filters.minVariations))
    }
    if (filters.maxVariations) {
      filtered = filtered.filter(item => item.variations <= parseFloat(filters.maxVariations))
    }
    
    // Sorting
    if (sortColumn) {
      filtered.sort((a, b) => {
        const aVal = (a as any)[sortColumn]
        const bVal = (b as any)[sortColumn]
        const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0
        return sortDirection === 'asc' ? comparison : -comparison
      })
    }
    
    return filtered
  }, [items, filters, sortColumn, sortDirection])
  
  // Summary statistics
  const summaryStats = useMemo(() => {
    const totalRecords = filteredItems.length
    const totalValue = filteredItems.reduce((sum, item) => sum + item.total_value, 0)
    const totalVariations = filteredItems.reduce((sum, item) => sum + item.variations, 0)
    const totalIncludingVariations = filteredItems.reduce((sum, item) => sum + item.total_including_variations, 0)
    const totalPlanningAssigned = filteredItems.reduce((sum, item) => sum + item.planning_assigned_amount, 0)
    const remeasurableCount = filteredItems.filter(item => item.remeasurable).length
    
    return {
      totalRecords,
      totalValue,
      totalVariations,
      totalIncludingVariations,
      totalPlanningAssigned,
      remeasurableCount,
    }
  }, [filteredItems])
  
  // Pagination
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedItems = filteredItems.slice(startIndex, startIndex + itemsPerPage)
  
  // Helper function to safely get numeric value for display
  const getDisplayValue = (value: any): number => {
    if (value === null || value === undefined) return 0
    if (typeof value === 'number') {
      return isNaN(value) || !isFinite(value) ? 0 : value
    }
    if (typeof value === 'string') {
      const parsed = parseFloat(value.replace(/,/g, '').trim())
      return isNaN(parsed) || !isFinite(parsed) ? 0 : parsed
    }
    return 0
  }
  
  // Handle edit
  const handleEdit = (item: CommercialBOQItem) => {
    setEditingId(item.id)
    setEditingData({ ...item })
  }
  
  // Handle save
  const handleSave = async (id: string) => {
    try {
      setError('')
      setSuccess('')
      
      // Calculate total_value and total_including_variations
      const quantity = parseFloat(String(editingData.quantity || 0))
      const rate = parseFloat(String(editingData.rate || 0))
      const variations = parseFloat(String(editingData.variations || 0))
      const totalValue = quantity * rate
      const totalIncludingVariations = totalValue + variations
      
      const updateData = {
        'Project Full Code': editingData.project_full_code,
        'Project Name': editingData.project_name,
        'Item Description': editingData.item_description,
        'Unit': editingData.unit || null,
        'Quantity': quantity,
        'Rate': rate,
        'Total Value': totalValue,
        'Remeasurable?': editingData.remeasurable || false,
        'Planning Assigned Amount': parseFloat(String(editingData.planning_assigned_amount || 0)),
        'Variations': variations,
        'Total Including Variations': totalIncludingVariations,
        updated_at: new Date().toISOString(),
      }
      
      const { error: updateError } = await supabase
        .from(TABLES.COMMERCIAL_BOQ_ITEMS)
        .update(updateData)
        .eq('id', id)
      
      if (updateError) throw updateError
      
      setSuccess('Item updated successfully')
      setEditingId(null)
      setEditingData({})
      await fetchItems()
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      console.error('Error updating item:', err)
      setError(err.message || 'Failed to update item')
    }
  }
  
  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return
    
    try {
      setError('')
      const { error: deleteError } = await supabase
        .from(TABLES.COMMERCIAL_BOQ_ITEMS)
        .delete()
        .eq('id', id)
      
      if (deleteError) throw deleteError
      
      setSuccess('Item deleted successfully')
      await fetchItems()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      console.error('Error deleting item:', err)
      setError(err.message || 'Failed to delete item')
    }
  }
  
  // Handle bulk update
  const handleBulkUpdate = async (ids: string[], data: any) => {
    try {
      setError('')
      setSuccess('')
      
      // If variations is being updated, we need to recalculate total_including_variations for each item
      if (data['Variations'] !== undefined) {
        // Update each item individually to recalculate total_including_variations
        const itemsToUpdate = items.filter(item => ids.includes(item.id))
        const newVariations = data['Variations']
        
        for (const item of itemsToUpdate) {
          const newTotalIncludingVariations = item.total_value + newVariations
          const updateData = {
            ...data,
            'Total Including Variations': newTotalIncludingVariations
          }
          
          const { error: updateError } = await supabase
            .from(TABLES.COMMERCIAL_BOQ_ITEMS)
            .update(updateData)
            .eq('id', item.id)
          
          if (updateError) throw updateError
        }
      } else {
        // No variations update, can do bulk update
        const { error: updateError } = await supabase
          .from(TABLES.COMMERCIAL_BOQ_ITEMS)
          .update(data)
          .in('id', ids)
        
        if (updateError) throw updateError
      }
      
      setSuccess(`${ids.length} item(s) updated successfully`)
      setSelectedIds(new Set())
      setIsSelectMode(false)
      setShowBulkEditModal(false)
      await fetchItems()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      console.error('Error updating items:', err)
      setError(err.message || 'Failed to update items')
      throw err
    }
  }
  
  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} item(s)?`)) return
    
    try {
      setError('')
      const idsArray = Array.from(selectedIds)
      const { error: deleteError } = await supabase
        .from(TABLES.COMMERCIAL_BOQ_ITEMS)
        .delete()
        .in('id', idsArray)
      
      if (deleteError) throw deleteError
      
      setSuccess(`${idsArray.length} item(s) deleted successfully`)
      setSelectedIds(new Set())
      setIsSelectMode(false)
      await fetchItems()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      console.error('Error deleting items:', err)
      setError(err.message || 'Failed to delete items')
    }
  }
  
  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(paginatedItems.map(item => item.id)))
    } else {
      setSelectedIds(new Set())
    }
  }
  
  // Handle select one
  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedIds(newSelected)
  }
  
  // Handle sort
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }
  
  // Clear filters
  const clearFilters = () => {
    setFilters({
      search: '',
      projectFullCode: '',
      projectName: '',
      itemDescription: '',
      unit: '',
      remeasurable: '',
      minQuantity: '',
      maxQuantity: '',
      minRate: '',
      maxRate: '',
      minTotalValue: '',
      maxTotalValue: '',
      minVariations: '',
      maxVariations: '',
    })
  }
  
  if (loading && items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <LoadingSpinner />
        <p className="text-gray-500 dark:text-gray-400">Loading BOQ items...</p>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Records</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{summaryStats.totalRecords}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Value</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrencyByCodeSync(summaryStats.totalValue, 'AED')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Variations</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrencyByCodeSync(summaryStats.totalVariations, 'AED')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
                <ClipboardList className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Including Variations</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrencyByCodeSync(summaryStats.totalIncludingVariations, 'AED')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Alerts - Only show success, hide error during loading */}
      {success && (
        <Alert variant="success" onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}
      
      {/* Main Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>BOQ Items</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsSelectMode(!isSelectMode)
                  if (isSelectMode) setSelectedIds(new Set())
                }}
              >
                {isSelectMode ? <XCircle className="h-4 w-4 mr-2" /> : <CheckSquare className="h-4 w-4 mr-2" />}
                {isSelectMode ? 'Cancel Select' : 'Select'}
              </Button>
              {selectedIds.size > 0 && (
                <>
                  <PermissionButton
                    permission="commercial.boq_items.edit"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBulkEditModal(true)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Bulk Edit ({selectedIds.size})
                  </PermissionButton>
                  <PermissionButton
                    permission="commercial.boq_items.delete"
                    variant="outline"
                    size="sm"
                    onClick={handleBulkDelete}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete ({selectedIds.size})
                  </PermissionButton>
                </>
              )}
              <PermissionButton
                permission="commercial.boq_items.create"
                onClick={() => setShowAddForm(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </PermissionButton>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Filters */}
          {showFilters && (
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Filters</h3>
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Input
                  placeholder="Search..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-full"
                />
                
                <Input
                  placeholder="Project Full Code"
                  value={filters.projectFullCode}
                  onChange={(e) => setFilters({ ...filters, projectFullCode: e.target.value })}
                />
                
                <Input
                  placeholder="Project Name"
                  value={filters.projectName}
                  onChange={(e) => setFilters({ ...filters, projectName: e.target.value })}
                />
                
                <Input
                  placeholder="Item Description"
                  value={filters.itemDescription}
                  onChange={(e) => setFilters({ ...filters, itemDescription: e.target.value })}
                />
                
                <Input
                  placeholder="Unit"
                  value={filters.unit}
                  onChange={(e) => setFilters({ ...filters, unit: e.target.value })}
                />
                
                <select
                  value={filters.remeasurable}
                  onChange={(e) => setFilters({ ...filters, remeasurable: e.target.value as '' | 'true' | 'false' })}
                  className="px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="">All Remeasurable</option>
                  <option value="true">Remeasurable</option>
                  <option value="false">Not Remeasurable</option>
                </select>
                
                <Input
                  type="number"
                  placeholder="Min Quantity"
                  value={filters.minQuantity}
                  onChange={(e) => setFilters({ ...filters, minQuantity: e.target.value })}
                />
                
                <Input
                  type="number"
                  placeholder="Max Quantity"
                  value={filters.maxQuantity}
                  onChange={(e) => setFilters({ ...filters, maxQuantity: e.target.value })}
                />
                
                <Input
                  type="number"
                  placeholder="Min Rate"
                  value={filters.minRate}
                  onChange={(e) => setFilters({ ...filters, minRate: e.target.value })}
                />
                
                <Input
                  type="number"
                  placeholder="Max Rate"
                  value={filters.maxRate}
                  onChange={(e) => setFilters({ ...filters, maxRate: e.target.value })}
                />
                
                <Input
                  type="number"
                  placeholder="Min Total Value"
                  value={filters.minTotalValue}
                  onChange={(e) => setFilters({ ...filters, minTotalValue: e.target.value })}
                />
                
                <Input
                  type="number"
                  placeholder="Max Total Value"
                  value={filters.maxTotalValue}
                  onChange={(e) => setFilters({ ...filters, maxTotalValue: e.target.value })}
                />
                
                <Input
                  type="number"
                  placeholder="Min Variations"
                  value={filters.minVariations}
                  onChange={(e) => setFilters({ ...filters, minVariations: e.target.value })}
                />
                
                <Input
                  type="number"
                  placeholder="Max Variations"
                  value={filters.maxVariations}
                  onChange={(e) => setFilters({ ...filters, maxVariations: e.target.value })}
                />
              </div>
            </div>
          )}
          
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  {isSelectMode && (
                    <th className="p-2 text-left">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === paginatedItems.length && paginatedItems.length > 0}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                      />
                    </th>
                  )}
                  <th 
                    className="p-2 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => handleSort('auto_generated_unique_reference_number')}
                  >
                    Ref Number {sortColumn === 'auto_generated_unique_reference_number' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="p-2 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => handleSort('project_full_code')}
                  >
                    Project Full Code {sortColumn === 'project_full_code' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="p-2 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => handleSort('project_name')}
                  >
                    Project Name {sortColumn === 'project_name' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="p-2 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => handleSort('item_description')}
                  >
                    Item Description {sortColumn === 'item_description' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="p-2 text-left">Unit</th>
                  <th 
                    className="p-2 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => handleSort('quantity')}
                  >
                    Quantity {sortColumn === 'quantity' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="p-2 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => handleSort('rate')}
                  >
                    Rate {sortColumn === 'rate' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="p-2 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => handleSort('total_value')}
                  >
                    Total Value {sortColumn === 'total_value' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="p-2 text-left">Remeasurable</th>
                  <th className="p-2 text-left">Planning Assigned</th>
                  <th 
                    className="p-2 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => handleSort('variations')}
                  >
                    Variations {sortColumn === 'variations' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="p-2 text-left">Total Inc. Variations</th>
                  <th className="p-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((item, index) => {
                  const isEditing = editingId === item.id
                  const isSelected = selectedIds.has(item.id)
                  
                  // Debug: Log values for first item on first render
                  if (index === 0) {
                    const displayRate = getDisplayValue(item.rate)
                    const displayTotalValue = getDisplayValue(item.total_value)
                    console.log('🎨 Render debug - First item values:', {
                      itemId: item.id,
                      rawRate: item.rate,
                      rawRateType: typeof item.rate,
                      displayRate: displayRate,
                      formattedRate: formatCurrencyByCodeSync(displayRate, 'AED'),
                      rawTotalValue: item.total_value,
                      rawTotalValueType: typeof item.total_value,
                      displayTotalValue: displayTotalValue,
                      formattedTotalValue: formatCurrencyByCodeSync(displayTotalValue, 'AED'),
                      rawVariations: item.variations,
                      rawVariationsType: typeof item.variations,
                      displayVariations: getDisplayValue(item.variations),
                      rawPlanningAmount: item.planning_assigned_amount,
                      rawPlanningAmountType: typeof item.planning_assigned_amount,
                      displayPlanningAmount: getDisplayValue(item.planning_assigned_amount),
                    })
                  }
                  
                  return (
                    <tr key={item.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                      {isSelectMode && (
                        <td className="p-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleSelectOne(item.id, e.target.checked)}
                          />
                        </td>
                      )}
                      <td className="p-2">{item.auto_generated_unique_reference_number}</td>
                      <td className="p-2">
                        {isEditing ? (
                          <Input
                            value={editingData.project_full_code || ''}
                            onChange={(e) => setEditingData({ ...editingData, project_full_code: e.target.value })}
                            className="w-full"
                          />
                        ) : (
                          item.project_full_code
                        )}
                      </td>
                      <td className="p-2">
                        {isEditing ? (
                          <Input
                            value={editingData.project_name || ''}
                            onChange={(e) => setEditingData({ ...editingData, project_name: e.target.value })}
                            className="w-full"
                          />
                        ) : (
                          item.project_name
                        )}
                      </td>
                      <td className="p-2">
                        {isEditing ? (
                          <Input
                            value={editingData.item_description || ''}
                            onChange={(e) => setEditingData({ ...editingData, item_description: e.target.value })}
                            className="w-full"
                          />
                        ) : (
                          item.item_description
                        )}
                      </td>
                      <td className="p-2">
                        {isEditing ? (
                          <Input
                            value={editingData.unit || ''}
                            onChange={(e) => setEditingData({ ...editingData, unit: e.target.value })}
                            className="w-full"
                          />
                        ) : (
                          item.unit || '-'
                        )}
                      </td>
                      <td className="p-2">
                        {isEditing ? (
                          <Input
                            type="number"
                            value={editingData.quantity || ''}
                            onChange={(e) => setEditingData({ ...editingData, quantity: parseFloat(e.target.value) || 0 })}
                            className="w-full"
                          />
                        ) : (
                          item.quantity
                        )}
                      </td>
                      <td className="p-2">
                        {isEditing ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={editingData.rate || ''}
                            onChange={(e) => setEditingData({ ...editingData, rate: parseFloat(e.target.value) || 0 })}
                            className="w-full"
                          />
                        ) : (
                          formatCurrencyByCodeSync(getDisplayValue(item.rate), 'AED')
                        )}
                      </td>
                      <td className="p-2">
                        {isEditing ? (
                          <span className="text-gray-500">
                            {formatCurrencyByCodeSync((editingData.quantity || 0) * (editingData.rate || 0), 'AED')}
                          </span>
                        ) : (
                          formatCurrencyByCodeSync(getDisplayValue(item.total_value), 'AED')
                        )}
                      </td>
                      <td className="p-2">
                        {isEditing ? (
                          <input
                            type="checkbox"
                            checked={editingData.remeasurable || false}
                            onChange={(e) => setEditingData({ ...editingData, remeasurable: e.target.checked })}
                          />
                        ) : (
                          item.remeasurable ? 'Yes' : 'No'
                        )}
                      </td>
                      <td className="p-2">
                        {isEditing ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={editingData.planning_assigned_amount || ''}
                            onChange={(e) => setEditingData({ ...editingData, planning_assigned_amount: parseFloat(e.target.value) || 0 })}
                            className="w-full"
                          />
                        ) : (
                          formatCurrencyByCodeSync(getDisplayValue(item.planning_assigned_amount), 'AED')
                        )}
                      </td>
                      <td className="p-2">
                        {isEditing ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={editingData.variations || ''}
                            onChange={(e) => setEditingData({ ...editingData, variations: parseFloat(e.target.value) || 0 })}
                            className="w-full"
                          />
                        ) : (
                          formatCurrencyByCodeSync(getDisplayValue(item.variations), 'AED')
                        )}
                      </td>
                      <td className="p-2">
                        {isEditing ? (
                          <span className="text-gray-500">
                            {formatCurrencyByCodeSync(
                              ((editingData.quantity || 0) * (editingData.rate || 0)) + (editingData.variations || 0),
                              'AED'
                            )}
                          </span>
                        ) : (
                          formatCurrencyByCodeSync(getDisplayValue(item.total_including_variations), 'AED')
                        )}
                      </td>
                      <td className="p-2">
                        {isEditing ? (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleSave(item.id)}
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingId(null)
                                setEditingData({})
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <PermissionButton
                              permission="commercial.boq_items.edit"
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(item)}
                            >
                              <Edit className="h-4 w-4" />
                            </PermissionButton>
                            <PermissionButton
                              permission="commercial.boq_items.delete"
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </PermissionButton>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            
            {paginatedItems.length === 0 && !loading && (
              <div className="text-center py-8">
                {filteredItems.length === 0 && items.length === 0 ? (
                  <div className="space-y-2">
                    <p className="text-gray-500 dark:text-gray-400">No BOQ items found in the database.</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                      Click "Add Item" to create your first BOQ item.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-gray-500 dark:text-gray-400">No items match your current filters.</p>
                    <Button variant="outline" size="sm" onClick={clearFilters}>
                      Clear Filters
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredItems.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              loading={loading}
            />
          )}
        </CardContent>
      </Card>
      
      {/* Bulk Edit Modal */}
      {showBulkEditModal && (
        <BulkEditBOQItemsModal
          selectedItems={paginatedItems.filter(item => selectedIds.has(item.id))}
          onUpdate={handleBulkUpdate}
          onCancel={() => {
            setShowBulkEditModal(false)
            setSelectedIds(new Set())
            setIsSelectMode(false)
          }}
          isOpen={showBulkEditModal}
        />
      )}
      
      {/* Add Item Form Modal */}
      {showAddForm && (
        <AddBOQItemForm
          projects={projects}
          onSave={fetchItems}
          onCancel={() => setShowAddForm(false)}
          isOpen={showAddForm}
        />
      )}
    </div>
  )
}

