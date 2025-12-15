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
  FileText,
  Search,
  Plus,
  Edit,
  Trash2,
  Download,
  FileSpreadsheet,
  Filter,
  X,
  Building2,
  Package,
  CreditCard,
} from 'lucide-react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { useSmartLoading } from '@/lib/smartLoadingManager'
import { ImportButton } from '@/components/ui/ImportButton'
import { useAuth } from '@/app/providers'
import { downloadTemplate, downloadCSV, downloadExcel } from '@/lib/exportImportUtils'
import { Pagination } from '@/components/ui/Pagination'

interface LPO {
  id: string
  lpo_no?: string
  vendor?: string
  lpo_date?: string
  project_code?: string
  project_name?: string
  lpo_category?: string
  item_description?: string
  unit?: string
  item_quantity?: number
  unit_rate?: number
  total_amount?: number
  currency?: string
  status?: string
  delivery_date?: string
  payment_terms?: string
  price_before_negotiation?: number
  saving_amount_aed?: number
  saving_percentage?: number
  column_21?: string
  created_at: string
  updated_at: string
}

export default function LPOListContent() {
  const guard = usePermissionGuard()
  const { appUser } = useAuth()
  const supabase = createClientComponentClient({} as any)
  const { startSmartLoading, stopSmartLoading } = useSmartLoading('lpo-list')
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [lpos, setLpos] = useState<LPO[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [editingLPO, setEditingLPO] = useState<LPO | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [selectedLPOs, setSelectedLPOs] = useState<Set<string>>(new Set())
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, percentage: 0 })
  const [importing, setImporting] = useState(false)
  
  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterVendor, setFilterVendor] = useState<string>('')
  const [filterProject, setFilterProject] = useState<string>('')
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(50)

  useEffect(() => {
    loadLPOs()
  }, [])
  
  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterStatus, filterVendor, filterProject, filterCategory])

  const loadLPOs = async () => {
    try {
      setLoading(true)
      setError('')
      
      // Fetch all records with pagination (Supabase default limit is 1000)
      let allData: LPO[] = []
      let offset = 0
      const chunkSize = 1000
      let hasMore = true
      
      while (hasMore) {
        const { data, error: fetchError } = await supabase
          .from('lpo_database')
          .select('*')
          .order('lpo_date', { ascending: false })
          .order('created_at', { ascending: false })
          .range(offset, offset + chunkSize - 1)

        if (fetchError) {
          console.error('Supabase Error:', fetchError)
          if (fetchError.code === 'PGRST116' || fetchError.message.includes('does not exist')) {
            console.log('LPO database table does not exist yet. Please create it in the database.')
            setError('Table does not exist. Please run the SQL script: Database/create-lpo-database-table.sql')
            setLpos([])
            return
          }
          if (fetchError.code === '42501' || fetchError.message.includes('permission denied') || fetchError.message.includes('RLS')) {
            console.error('RLS/Permission error:', fetchError)
            setError('Permission denied. Please run: Database/create-lpo-database-table.sql in Supabase SQL Editor to fix RLS policies.')
            setLpos([])
            return
          }
          setError(fetchError.message || 'Failed to load LPO records')
          setLpos([])
          return
        }

        if (!data || data.length === 0) {
          hasMore = false
          break
        }

        allData = [...allData, ...data]
        console.log(`📥 Fetched LPO chunk: ${data.length} records (total so far: ${allData.length})`)

        if (data.length < chunkSize) {
          hasMore = false
        } else {
          offset += chunkSize
        }
      }

      console.log(`✅ Total LPO records fetched: ${allData.length}`)
      setLpos(allData)
      setSuccess('')
    } catch (error: any) {
      console.error('Error loading LPOs:', error)
      setError(error.message || 'Failed to load LPO records')
      setLpos([])
    } finally {
      setLoading(false)
      stopSmartLoading(setLoading)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this LPO record?')) return

    if (!id || id.trim() === '') {
      setError('Invalid LPO ID')
      return
    }

    try {
      startSmartLoading(setLoading)
      setError('')
      
      console.log('🗑️ Attempting to delete LPO:', id)
      const { error: deleteError, data } = await supabase
        .from('lpo_database')
        .delete()
        .eq('id', id.trim())
        .select()

      if (deleteError) {
        console.error('❌ Delete error:', deleteError)
        console.error('Error code:', deleteError.code)
        console.error('Error message:', deleteError.message)
        console.error('Error details:', deleteError.details)
        console.error('Error hint:', deleteError.hint)
        throw deleteError
      }

      console.log('✅ Successfully deleted LPO:', data?.[0]?.lpo_no || id)
      await loadLPOs()
      setSelectedLPOs(new Set())
      setSuccess('LPO record deleted successfully')
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      console.error('❌ Error deleting LPO:', error)
      const errorMessage = error?.message || error?.details || 'Failed to delete LPO record'
      setError(`Failed to delete LPO record: ${errorMessage}`)
      if (error?.hint) {
        console.error('💡 Hint:', error.hint)
        setError(`Failed to delete LPO record: ${errorMessage}. Hint: ${error.hint}`)
      }
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedLPOs.size === 0) {
      setError('Please select at least one LPO record to delete')
      return
    }

    if (!confirm(`Are you sure you want to delete ${selectedLPOs.size} LPO record(s)?`)) {
      return
    }

    try {
      startSmartLoading(setLoading)
      setError('')
      setSuccess('')

      const lpoIds = Array.from(selectedLPOs).filter(id => id && id.trim() !== '')
      
      if (lpoIds.length === 0) {
        setError('No valid LPO IDs selected')
        return
      }

      console.log('🗑️ Attempting to delete LPOs:', lpoIds.length, 'records')
      console.log('📋 LPO IDs:', lpoIds.slice(0, 5), lpoIds.length > 5 ? '...' : '')
      
      // Delete in batches if too many (Supabase has limits)
      const batchSize = 100
      let deletedCount = 0
      let errors = 0
      
      for (let i = 0; i < lpoIds.length; i += batchSize) {
        const batch = lpoIds.slice(i, i + batchSize)
        const batchNumber = Math.floor(i / batchSize) + 1
        
        console.log(`🗑️ Deleting batch ${batchNumber}: ${batch.length} records`)
        
        const { error: deleteError, data } = await supabase
          .from('lpo_database')
          .delete()
          .in('id', batch)
          .select()

        if (deleteError) {
          console.error(`❌ Delete error for batch ${batchNumber}:`, deleteError)
          console.error('Error code:', deleteError.code)
          console.error('Error message:', deleteError.message)
          console.error('Error details:', deleteError.details)
          console.error('Error hint:', deleteError.hint)
          errors += batch.length
        } else {
          deletedCount += data?.length || batch.length
          console.log(`✅ Batch ${batchNumber}: Deleted ${data?.length || batch.length} records`)
        }
      }

      if (errors > 0 && deletedCount === 0) {
        throw new Error(`Failed to delete all ${lpoIds.length} records`)
      }

      console.log(`✅ Successfully deleted ${deletedCount} LPO record(s)`)
      setSuccess(`Successfully deleted ${deletedCount} LPO record(s)${errors > 0 ? ` (${errors} failed)` : ''}`)
      setSelectedLPOs(new Set())
      await loadLPOs()
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      console.error('❌ Error deleting LPOs:', error)
      const errorMessage = error?.message || error?.details || 'Failed to delete LPO records'
      setError(`Failed to delete LPO records: ${errorMessage}`)
      if (error?.hint) {
        console.error('💡 Hint:', error.hint)
      }
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLPOs(new Set(filteredLPOs.map(l => l.id)))
    } else {
      setSelectedLPOs(new Set())
    }
  }

  const handleSelectLPO = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedLPOs)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedLPOs(newSelected)
  }

  const handleSave = async (lpoData: Partial<LPO>) => {
    try {
      startSmartLoading(setLoading)
      setError('')
      setSuccess('')

      // Calculate total_amount if quantity and unit_rate are provided
      if (lpoData.item_quantity && lpoData.unit_rate) {
        lpoData.total_amount = parseFloat(lpoData.item_quantity.toString()) * parseFloat(lpoData.unit_rate.toString())
      }

      // Calculate saving_amount_aed and saving_percentage if price_before_negotiation is provided
      if (lpoData.price_before_negotiation && lpoData.total_amount) {
        const priceBefore = parseFloat(lpoData.price_before_negotiation.toString())
        const totalAmount = parseFloat(lpoData.total_amount.toString())
        lpoData.saving_amount_aed = priceBefore - totalAmount
        if (priceBefore > 0) {
          lpoData.saving_percentage = ((lpoData.saving_amount_aed / priceBefore) * 100)
        }
      }

      if (editingLPO) {
        // Update existing LPO
        const { error: updateError } = await supabase
          .from('lpo_database')
          .update({
            ...lpoData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingLPO.id)

        if (updateError) throw updateError
        setSuccess('LPO record updated successfully')
      } else {
        // Create new LPO
        const { error: insertError } = await supabase
          .from('lpo_database')
          .insert([lpoData])

        if (insertError) throw insertError
        setSuccess('LPO record added successfully')
      }

      await loadLPOs()
      setShowForm(false)
      setEditingLPO(null)
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      console.error('Error saving LPO:', error)
      setError(error.message || 'Failed to save LPO record')
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  const handleImport = async (data: any[]) => {
    try {
      setImporting(true)
      setError('')
      setSuccess('')
      setImportProgress({ current: 0, total: 0, percentage: 0 })

      // Helper function to get value by exact column name match only
      // يجب أن يتطابق اسم العمود تماماً مع الاسم المطلوب (بدون partial matching)
      const getValue = (row: any, possibleNames: string[]): any => {
        // First try exact match (case-sensitive) - الأكثر دقة
        for (const name of possibleNames) {
          if (row.hasOwnProperty(name) && row[name] !== undefined && row[name] !== null && row[name] !== '') {
            return row[name]
          }
        }
        // Then try case-insensitive exact match (trimmed) - تطابق كامل فقط
        for (const name of possibleNames) {
          const normalizedName = name.toLowerCase().trim().replace(/\s+/g, ' ')
          for (const key in row) {
            const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, ' ')
            // Exact match only - تطابق كامل فقط بدون partial matching
            if (normalizedKey === normalizedName && row[key] !== undefined && row[key] !== null && row[key] !== '') {
              return row[key]
            }
          }
        }
        return null
      }

      // Helper function to parse number (handles commas and currency symbols)
      const parseNumber = (value: any): number | null => {
        if (!value) return null
        const str = String(value).replace(/,/g, '').replace(/[^\d.-]/g, '')
        const num = parseFloat(str)
        return isNaN(num) ? null : num
      }

      // Helper function to parse date
      const parseDate = (value: any): string | null => {
        if (!value) return null
        const str = String(value).trim()
        if (!str) return null
        
        // Skip if it looks like currency code (3 uppercase letters)
        if (str.match(/^[A-Z]{2,3}$/)) return null
        
        // Skip if it's just numbers less than 4 digits (likely not a date)
        if (str.match(/^\d{1,3}$/)) return null
        
        // Skip common non-date strings
        const nonDateStrings = ['AED', 'USD', 'EUR', 'Issued', 'Pending', 'Completed', 'Cancelled']
        if (nonDateStrings.includes(str.toUpperCase())) return null
        
        // Try to parse various date formats
        try {
          const date = new Date(str)
          if (!isNaN(date.getTime())) {
            // Check if the date is reasonable (not year 1900 or 1970 which might be default)
            const year = date.getFullYear()
            if (year >= 1900 && year <= 2100) {
              return date.toISOString().split('T')[0]
            }
          }
        } catch (e) {
          // Ignore
        }
        return null // Return null if can't parse as valid date
      }

      setImportProgress({ current: 0, total: data.length, percentage: 10 })
      
      // Clean data and log first few rows for debugging
      console.log('📥 Starting import of', data.length, 'rows')
      if (data.length > 0) {
        console.log('📋 First raw row sample:', data[0])
        console.log('📋 First raw row keys:', Object.keys(data[0] || {}))
        // Log column mapping for debugging - show what we're reading
        const firstRow = data[0]
        console.log('📋 Column mapping check:')
        console.log('  - LPO no. found:', getValue(firstRow, ['LPO no.', 'LPO No.', 'LPO No', 'lpo_no', 'LPO_NO', 'LPO Number']))
        console.log('  - Vendor found:', getValue(firstRow, ['Vendor', 'vendor', 'VENDOR', 'Supplier', 'supplier']))
        console.log('  - Currency found:', getValue(firstRow, ['Currency', 'currency', 'CURRENCY']))
        console.log('  - Status found:', getValue(firstRow, ['Status', 'status', 'STATUS']))
        console.log('  - Delivery Date found:', getValue(firstRow, ['Delivery Date', 'delivery_date', 'DELIVERY_DATE']))
        console.log('  - Payment Terms found:', getValue(firstRow, ['Payment Terms', 'payment_terms', 'PAYMENT_TERMS']))
        console.log('  - Item Description found:', getValue(firstRow, ['Item Description', 'item_description', 'ITEM_DESCRIPTION']))
        // Show all available columns
        console.log('📋 All available columns in file:', Object.keys(firstRow))
      }
      
      // Clean data
      const cleanData = data.map((row, index) => {
        if (index % 100 === 0) {
          setImportProgress({ 
            current: index, 
            total: data.length, 
            percentage: Math.min(30, 10 + (index / data.length) * 20) 
          })
        }
        
        const cleanRow: any = {}
        
        // Map all columns - EXACT match only with export column names
        // يجب أن يتطابق اسم العمود تماماً مع أسماء الأعمدة في التصدير
        
        // LPO no. is critical (required field) - exact match only
        const lpoNoValue = getValue(row, ['LPO no.'])
        if (!lpoNoValue || String(lpoNoValue).trim() === '') {
          // Skip rows without LPO no.
          return null
        }
        cleanRow.lpo_no = String(lpoNoValue).trim()
        
        // Map all other columns with exact match to export column names
        cleanRow.vendor = getValue(row, ['Vendor']) || null
        cleanRow.lpo_date = parseDate(getValue(row, ['LPO Date']))
        cleanRow.project_code = getValue(row, ['Project Code']) || null
        cleanRow.project_name = getValue(row, ['Project Name']) || null
        cleanRow.lpo_category = getValue(row, ['LPO Category']) || null
        cleanRow.item_description = getValue(row, ['Item Description']) || null
        cleanRow.unit = getValue(row, ['Unit']) || null
        cleanRow.item_quantity = parseNumber(getValue(row, ['Item Quantity']))
        cleanRow.unit_rate = parseNumber(getValue(row, ['Unit Rate']))
        cleanRow.total_amount = parseNumber(getValue(row, ['Total Amount']))
        // Validate currency - exact match to export column name
        const currencyValue = getValue(row, ['Currency'])
        if (currencyValue && typeof currencyValue === 'string' && !currencyValue.match(/^\d+$/)) {
          const currencyStr = String(currencyValue).trim()
          if (currencyStr.length <= 10 && !currencyStr.match(/^\d+$/)) {
            cleanRow.currency = currencyStr
          } else {
            cleanRow.currency = 'AED' // Default if invalid
          }
        } else {
          cleanRow.currency = 'AED' // Default
        }
        
        // Validate status - exact match to export column name
        const statusValue = getValue(row, ['Status'])
        if (statusValue && typeof statusValue === 'string' && !statusValue.match(/^\d+$/)) {
          const statusStr = String(statusValue).trim()
          if (statusStr.length <= 50 && !statusStr.match(/^\d+$/)) {
            cleanRow.status = statusStr
          } else {
            cleanRow.status = 'Issued' // Default if invalid
          }
        } else {
          cleanRow.status = 'Issued' // Default
        }
        
        // Validate delivery_date - exact match to export column name
        const deliveryDateValue = getValue(row, ['Delivery Date'])
        cleanRow.delivery_date = parseDate(deliveryDateValue)
        
        // Validate payment_terms - exact match to export column name
        const paymentTermsValue = getValue(row, ['Payment Terms'])
        if (paymentTermsValue && typeof paymentTermsValue === 'string') {
          const paymentStr = String(paymentTermsValue).trim()
          // Skip if it looks like a status value
          if (!paymentStr.match(/^(Issued|Pending|Completed|Cancelled)$/i)) {
            cleanRow.payment_terms = paymentStr
          } else {
            cleanRow.payment_terms = null
          }
        } else {
          cleanRow.payment_terms = null
        }
        // Exact match to export column names
        cleanRow.price_before_negotiation = parseNumber(getValue(row, ['Price Before Negotiation']))
        cleanRow.saving_amount_aed = parseNumber(getValue(row, ['Saving Amount AED']))
        const savingPercentageRaw = parseNumber(getValue(row, ['Saving %']))
        // Clamp saving_percentage to NUMERIC(5,2) range: -999.99 to 999.99
        if (savingPercentageRaw !== null) {
          cleanRow.saving_percentage = Math.max(-999.99, Math.min(999.99, savingPercentageRaw))
        } else {
          cleanRow.saving_percentage = null
        }
        cleanRow.column_21 = getValue(row, ['Column 21']) || null

        // Calculate total_amount if not provided but quantity and rate are
        if (!cleanRow.total_amount && cleanRow.item_quantity && cleanRow.unit_rate) {
          cleanRow.total_amount = cleanRow.item_quantity * cleanRow.unit_rate
        }

        // Calculate saving if not provided
        if (!cleanRow.saving_amount_aed && cleanRow.price_before_negotiation && cleanRow.total_amount) {
          cleanRow.saving_amount_aed = cleanRow.price_before_negotiation - cleanRow.total_amount
          if (cleanRow.price_before_negotiation > 0) {
            const percentage = (cleanRow.saving_amount_aed / cleanRow.price_before_negotiation) * 100
            // Clamp to valid range for NUMERIC(5,2): -999.99 to 999.99
            cleanRow.saving_percentage = Math.max(-999.99, Math.min(999.99, percentage))
          }
        }
        
        // Validate saving_percentage if provided
        if (cleanRow.saving_percentage !== null && cleanRow.saving_percentage !== undefined) {
          // Clamp to valid range for NUMERIC(5,2): -999.99 to 999.99
          cleanRow.saving_percentage = Math.max(-999.99, Math.min(999.99, cleanRow.saving_percentage))
        }

        return cleanRow
      }).filter((row): row is NonNullable<typeof row> => 
        row !== null && 
        row !== undefined && 
        row.lpo_no !== undefined && 
        row.lpo_no !== null && 
        String(row.lpo_no).trim() !== ''
      ) // LPO no. is required (Purchase Order Number from Vendor is required)

      if (cleanData.length === 0) {
        throw new Error('No valid data found. Please ensure the file contains LPO data with "LPO no." column (Purchase Order Number from Vendor - Very Important).')
      }

      console.log(`📊 Prepared ${cleanData.length} LPO records for import`)
      setImportProgress({ current: cleanData.length, total: cleanData.length, percentage: 30 })

      // Import all data at once using insert (faster)
      const batchSize = 2000 // Larger batches for faster import
      let imported = 0
      let skipped = 0
      let errors = 0
      const errorDetails: string[] = []
      const totalBatches = Math.ceil(cleanData.length / batchSize)

      for (let i = 0; i < cleanData.length; i += batchSize) {
        const batch = cleanData.slice(i, i + batchSize)
        const batchNumber = Math.floor(i / batchSize) + 1
        
        const progressPercentage = 30 + (batchNumber / totalBatches) * 60
        setImportProgress({ 
          current: Math.min(i + batch.length, cleanData.length), 
          total: cleanData.length, 
          percentage: Math.min(90, progressPercentage) 
        })
        
        try {
          // Clean batch: ensure lpo_no exists and remove invalid fields
          const cleanBatch = batch
            .map(item => {
              // Skip null/undefined items
              if (!item) return null
              
              // First check: lpo_no is required
              if (!item.lpo_no || String(item.lpo_no).trim() === '') {
                return null
              }
              
              const clean: any = {
                lpo_no: String(item.lpo_no).trim() // Required field
              }
              
              // Only include valid database columns
              const validColumns = [
                'vendor', 'lpo_date', 'project_code', 'project_name', 'lpo_category',
                'item_description', 'unit', 'item_quantity', 'unit_rate', 'total_amount',
                'currency', 'status', 'delivery_date', 'payment_terms',
                'price_before_negotiation', 'saving_amount_aed', 'saving_percentage', 'column_21'
              ]
              
              validColumns.forEach(col => {
                const value = item[col]
                if (value !== null && value !== undefined && value !== '') {
                  // Validate date fields - don't accept non-date strings
                  if (col === 'lpo_date' || col === 'delivery_date') {
                    const dateStr = String(value).trim()
                    // Skip if it looks like currency code (3 uppercase letters)
                    if (dateStr.match(/^[A-Z]{2,3}$/)) return
                    // Skip if it's just numbers less than 4 digits
                    if (dateStr.match(/^\d{1,3}$/)) return
                    // Skip common non-date strings
                    const nonDateStrings = ['AED', 'USD', 'EUR', 'Issued', 'Pending', 'Completed', 'Cancelled']
                    if (nonDateStrings.includes(dateStr.toUpperCase())) return
                    // Try to parse as date
                    try {
                      const date = new Date(dateStr)
                      if (!isNaN(date.getTime())) {
                        const year = date.getFullYear()
                        if (year >= 1900 && year <= 2100) {
                          clean[col] = date.toISOString().split('T')[0]
                        }
                      }
                    } catch (e) {
                      // Invalid date, skip it
                    }
                  } else {
                    clean[col] = value
                  }
                }
              })
              
              return clean
            })
            .filter((item): item is NonNullable<typeof item> => 
              item !== null && 
              item !== undefined && 
              item.lpo_no !== undefined && 
              item.lpo_no !== null && 
              String(item.lpo_no).trim() !== ''
            )

          if (cleanBatch.length === 0) {
            console.warn(`Batch ${batchNumber}: All rows filtered out (missing lpo_no)`)
            console.warn(`Original batch sample:`, batch[0])
            errors += batch.length
            continue
          }

          // Log sample data for debugging (first batch only)
          if (batchNumber === 1 && cleanBatch.length > 0 && cleanBatch[0]) {
            console.log('📋 Sample cleaned batch data (first row):', {
              lpo_no: cleanBatch[0]?.lpo_no,
              vendor: cleanBatch[0]?.vendor,
              lpo_date: cleanBatch[0]?.lpo_date,
              item_description: cleanBatch[0]?.item_description?.substring(0, 50),
              keys: Object.keys(cleanBatch[0] || {}),
              fullRow: cleanBatch[0]
            })
          }

          // Use insert (lpo_no doesn't have unique constraint, so we can have duplicates)
          const { error: upsertError, data: insertedData } = await supabase
            .from('lpo_database')
            .insert(cleanBatch)
            .select()

          if (upsertError) {
            console.error(`❌ Error inserting batch ${batchNumber}:`, upsertError)
            console.error('📋 Error code:', upsertError.code)
            console.error('📋 Error message:', upsertError.message)
            console.error('📋 Error details:', upsertError.details)
            console.error('📋 Error hint:', upsertError.hint)
            
            // Try inserting one by one for first batch to identify the issue
            if (batchNumber === 1 && cleanBatch.length > 0) {
              console.log('🔍 Attempting individual inserts for first 5 rows to identify issue...')
              let successCount = 0
              let failCount = 0
              
              for (let idx = 0; idx < Math.min(5, cleanBatch.length); idx++) {
                const item = cleanBatch[idx]
                if (!item || !item.lpo_no) {
                  console.error(`❌ Row ${idx + 1}: Invalid item (null or missing lpo_no)`)
                  failCount++
                  continue
                }
                
                const { error: singleError, data: singleData } = await supabase
                  .from('lpo_database')
                  .insert(item)
                  .select()
                
                if (singleError) {
                  failCount++
                  console.error(`❌ Failed row ${idx + 1}:`, {
                    lpo_no: item.lpo_no,
                    error: singleError.message,
                    code: singleError.code,
                    details: singleError.details,
                    hint: singleError.hint
                  })
                  if (idx === 0) {
                    console.error('📋 First row full data:', JSON.stringify(item, null, 2))
                  }
                } else {
                  successCount++
                  console.log(`✅ Success row ${idx + 1}:`, {
                    lpo_no: item.lpo_no,
                    inserted: singleData?.[0]?.id
                  })
                }
              }
              
              console.log(`📊 First 5 rows test: ${successCount} succeeded, ${failCount} failed`)
            }
            
            errors += cleanBatch.length
            errorDetails.push(`Batch ${batchNumber}: ${upsertError.message}`)
          } else {
            imported += cleanBatch.length
            // Log progress every 5 batches or first batch
            if (batchNumber === 1 || batchNumber % 5 === 0) {
              console.log(`✅ Batch ${batchNumber}/${totalBatches}: ${cleanBatch.length} rows imported (Total: ${imported})`)
            }
          }
        } catch (error: any) {
          console.error('Exception during batch import:', error)
          errors += batch.length
          errorDetails.push(`Batch ${batchNumber}: ${error.message}`)
          // Log first few rows for debugging
          if (errorDetails.length <= 3) {
            console.error('Sample batch data:', batch.slice(0, 2))
          }
        }
      }

      skipped = cleanData.length - imported - errors
      setImportProgress({ current: cleanData.length, total: cleanData.length, percentage: 95 })
      
      await loadLPOs()
      
      setImportProgress({ current: cleanData.length, total: cleanData.length, percentage: 100 })
      
      let successMsg = `Successfully imported ${imported} LPO record(s)`
      if (skipped > 0) {
        successMsg += `. ${skipped} duplicate(s) skipped.`
      }
      if (errors > 0) {
        successMsg += ` ${errors} failed.`
      }
      
      setSuccess(successMsg)
      setTimeout(() => {
        setImportProgress({ current: 0, total: 0, percentage: 0 })
        setImporting(false)
      }, 2000)
      setTimeout(() => setSuccess(''), 5000)
    } catch (error: any) {
      console.error('Error importing LPOs:', error)
      setError(error.message || 'Failed to import LPO records')
      setImportProgress({ current: 0, total: 0, percentage: 0 })
      setImporting(false)
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  const handleExport = async (format: 'csv' | 'excel' = 'excel') => {
    try {
      if (filteredLPOs.length === 0) {
        setError('No LPO records to export')
        return
      }

      startSmartLoading(setLoading)
      setError('')
      setSuccess('')

      // Export data with exact column names matching the import template
      // Helper functions for formatting
      const formatDate = (dateStr: string | null | undefined): string => {
        if (!dateStr) return ''
        try {
          const date = new Date(dateStr)
          if (!isNaN(date.getTime())) {
            // Format as MM/DD/YYYY for Excel compatibility
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const day = String(date.getDate()).padStart(2, '0')
            const year = date.getFullYear()
            return `${month}/${day}/${year}`
          }
        } catch (e) {
          // If parsing fails, return as is
        }
        return String(dateStr || '')
      }

      const formatNumber = (num: number | null | undefined): string => {
        if (num === null || num === undefined) return ''
        if (typeof num === 'number') {
          // If it's a whole number, return without decimals
          if (Number.isInteger(num)) {
            return String(num)
          }
          // Otherwise, return with 2 decimal places
          return num.toFixed(2)
        }
        return String(num)
      }

      // Export data with EXACT column names matching the import template
      // ترتيب الأعمدة يجب أن يطابق تماماً templateColumns
      const exportData = filteredLPOs.map(lpo => {
        // Ensure all values are properly formatted
        return {
          'LPO no.': String(lpo.lpo_no || '').trim(),
          'Vendor': String(lpo.vendor || '').trim(),
          'LPO Date': formatDate(lpo.lpo_date),
          'Project Code': String(lpo.project_code || '').trim(),
          'Project Name': String(lpo.project_name || '').trim(),
          'LPO Category': String(lpo.lpo_category || '').trim(),
          'Item Description': String(lpo.item_description || '').trim(),
          'Unit': String(lpo.unit || '').trim(),
          'Item Quantity': formatNumber(lpo.item_quantity),
          'Unit Rate': formatNumber(lpo.unit_rate),
          'Total Amount': formatNumber(lpo.total_amount),
          'Currency': String(lpo.currency || 'AED').trim(),
          'Status': String(lpo.status || 'Issued').trim(),
          'Delivery Date': formatDate(lpo.delivery_date),
          'Payment Terms': String(lpo.payment_terms || '').trim(),
          'Price Before Negotiation': formatNumber(lpo.price_before_negotiation),
          'Saving Amount AED': formatNumber(lpo.saving_amount_aed),
          'Saving %': formatNumber(lpo.saving_percentage),
          'Column 21': String(lpo.column_21 || '').trim()
        }
      })

      const filename = `lpo_database_export_${new Date().toISOString().split('T')[0]}`

      if (format === 'csv') {
        downloadCSV(exportData, filename)
      } else {
        await downloadExcel(exportData, filename, 'LPO Database')
      }

      setSuccess(`Successfully exported ${exportData.length} LPO record(s) as ${format.toUpperCase()}`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      console.error('Error exporting LPOs:', error)
      setError('Failed to export LPO records')
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const templateColumns = [
        'LPO no.',
        'Vendor',
        'LPO Date',
        'Project Code',
        'Project Name',
        'LPO Category',
        'Item Description',
        'Unit',
        'Item Quantity',
        'Unit Rate',
        'Total Amount',
        'Currency',
        'Status',
        'Delivery Date',
        'Payment Terms',
        'Price Before Negotiation',
        'Saving Amount AED',
        'Saving %',
        'Column 21'
      ]
      await downloadTemplate('lpo_database_template', templateColumns, 'excel')
    } catch (error) {
      console.error('Error downloading template:', error)
      setError('Failed to download template')
    }
  }

  // Get unique values for filters
  const uniqueVendors = Array.from(new Set(lpos.map(l => l.vendor).filter(Boolean))).sort()
  const uniqueProjects = Array.from(new Set(lpos.map(l => l.project_code).filter(Boolean))).sort()
  const uniqueCategories = Array.from(new Set(lpos.map(l => l.lpo_category).filter(Boolean))).sort()
  const uniqueStatuses = Array.from(new Set(lpos.map(l => l.status).filter(Boolean))).sort()

  const getFilteredLPOs = () => {
    let filtered = lpos

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(lpo =>
        lpo.lpo_no?.toLowerCase().includes(term) ||
        lpo.vendor?.toLowerCase().includes(term) ||
        lpo.project_code?.toLowerCase().includes(term) ||
        lpo.project_name?.toLowerCase().includes(term) ||
        lpo.item_description?.toLowerCase().includes(term) ||
        lpo.lpo_category?.toLowerCase().includes(term)
      )
    }

    if (filterStatus) {
      filtered = filtered.filter(lpo => lpo.status === filterStatus)
    }

    if (filterVendor) {
      filtered = filtered.filter(lpo => lpo.vendor === filterVendor)
    }

    if (filterProject) {
      filtered = filtered.filter(lpo => lpo.project_code === filterProject)
    }

    if (filterCategory) {
      filtered = filtered.filter(lpo => lpo.lpo_category === filterCategory)
    }

    return filtered
  }

  const filteredLPOs = getFilteredLPOs()
  
  // Pagination calculations
  const totalPages = Math.ceil(filteredLPOs.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedLPOs = filteredLPOs.slice(startIndex, endIndex)

  const clearFilters = () => {
    setFilterStatus('')
    setFilterVendor('')
    setFilterProject('')
    setFilterCategory('')
    setSearchTerm('')
  }

  const hasActiveFilters = filterStatus || filterVendor || filterProject || filterCategory || searchTerm

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1 px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                {[filterStatus, filterVendor, filterProject, filterCategory, searchTerm].filter(Boolean).length}
              </span>
            )}
          </Button>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Clear
            </Button>
          )}
        </div>
        <PermissionButton
          permission="procurement.lpo.create"
          onClick={() => {
            setEditingLPO(null)
            setShowForm(true)
          }}
          variant="primary"
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add LPO Record
        </PermissionButton>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">All Statuses</option>
                  {uniqueStatuses.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Vendor
                </label>
                <select
                  value={filterVendor}
                  onChange={(e) => setFilterVendor(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">All Vendors</option>
                  {uniqueVendors.map(vendor => (
                    <option key={vendor} value={vendor}>{vendor}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Project
                </label>
                <select
                  value={filterProject}
                  onChange={(e) => setFilterProject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">All Projects</option>
                  {uniqueProjects.map(project => (
                    <option key={project} value={project}>{project}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category
                </label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">All Categories</option>
                  {uniqueCategories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* Import Progress Bar */}
      {importing && importProgress.total > 0 && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-blue-900 dark:text-blue-100">
                  Importing LPO records...
                </span>
                <span className="font-semibold text-blue-700 dark:text-blue-300">
                  {Math.round(importProgress.percentage)}%
                </span>
              </div>
              <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500 h-full rounded-full transition-all duration-300 ease-out shadow-sm"
                  style={{ width: `${Math.min(importProgress.percentage, 100)}%` }}
                />
              </div>
              <div className="text-xs text-blue-700 dark:text-blue-300 text-center">
                {importProgress.current} of {importProgress.total} LPO records processed
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Actions Toolbar */}
      {selectedLPOs.size > 0 && (
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  {selectedLPOs.size} LPO record(s) selected
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedLPOs(new Set())}
                  className="text-gray-600 dark:text-gray-300"
                >
                  Clear Selection
                </Button>
              </div>
              {guard.hasAccess('procurement.lpo.delete') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkDelete}
                  className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Selected
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* LPO Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>LPO Database ({filteredLPOs.length} {filteredLPOs.length !== lpos.length ? 'filtered' : 'total'})</span>
            <div className="flex items-center gap-2">
              {guard.hasAccess('procurement.lpo.import') && (
                <Button
                  onClick={handleDownloadTemplate}
                  variant="ghost"
                  size="sm"
                  title="Download Excel Template"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                </Button>
              )}
              <PermissionButton
                permission="procurement.lpo.export"
                onClick={() => handleExport('excel')}
                variant="ghost"
                size="sm"
                title="Export to Excel"
              >
                <Download className="h-4 w-4" />
              </PermissionButton>
              {guard.hasAccess('procurement.lpo.import') && (
                <ImportButton
                  onImport={handleImport}
                  requiredColumns={['LPO no.']} // LPO no. is required (Purchase Order Number from Vendor is required)
                  templateName="lpo_database_template"
                  templateColumns={[
                    'LPO no.',
                    'Vendor',
                    'LPO Date',
                    'Project Code',
                    'Project Name',
                    'LPO Category',
                    'Item Description',
                    'Unit',
                    'Item Quantity',
                    'Unit Rate',
                    'Total Amount',
                    'Currency',
                    'Status',
                    'Delivery Date',
                    'Payment Terms',
                    'Price Before Negotiation',
                    'Saving Amount AED',
                    'Saving %',
                    'Column 21'
                  ]}
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
          ) : filteredLPOs.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {lpos.length === 0 ? 'No LPO Records Found' : 'No LPO Records Match Your Filters'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {lpos.length === 0 
                  ? 'Get started by adding your first LPO record or importing data from a file.'
                  : 'Try adjusting your search or filters.'}
              </p>
              {lpos.length === 0 && (
                <PermissionButton
                  permission="procurement.lpo.create"
                  onClick={() => setShowForm(true)}
                  variant="primary"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First LPO Record
                </PermissionButton>
              )}
            </div>
          ) : (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 350px)' }}>
                <table className="w-full border-collapse bg-white dark:bg-gray-900">
                  <thead className="sticky top-0 z-20 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850 border-b-2 border-gray-300 dark:border-gray-600 shadow-sm">
                    <tr>
                      <th className="text-left px-4 py-3 font-bold text-xs text-gray-700 dark:text-gray-200 uppercase tracking-wider w-12 sticky left-0 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850 z-30 border-r border-gray-300 dark:border-gray-600">
                        {guard.hasAccess('procurement.lpo.delete') && (
                          <button
                            onClick={() => handleSelectAll(selectedLPOs.size !== filteredLPOs.length)}
                            className="flex items-center justify-center w-5 h-5 rounded border-2 border-gray-300 dark:border-gray-600 hover:border-blue-500 transition-colors"
                            title={selectedLPOs.size === filteredLPOs.length ? 'Deselect all' : 'Select all'}
                          >
                            {selectedLPOs.size === filteredLPOs.length && filteredLPOs.length > 0 ? (
                              <span className="text-blue-600 dark:text-blue-400 text-sm">✓</span>
                            ) : null}
                          </button>
                        )}
                      </th>
                      <th className="text-left px-4 py-3 font-bold text-xs text-gray-700 dark:text-gray-200 uppercase tracking-wider sticky left-12 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850 z-30 border-r border-gray-300 dark:border-gray-600 min-w-[140px]">
                        LPO No.
                      </th>
                      <th className="text-left px-4 py-3 font-bold text-xs text-gray-700 dark:text-gray-200 uppercase tracking-wider min-w-[150px]">
                        Vendor
                      </th>
                      <th className="text-left px-4 py-3 font-bold text-xs text-gray-700 dark:text-gray-200 uppercase tracking-wider min-w-[110px]">
                        Date
                      </th>
                      <th className="text-left px-4 py-3 font-bold text-xs text-gray-700 dark:text-gray-200 uppercase tracking-wider min-w-[150px]">
                        Project
                      </th>
                      <th className="text-left px-4 py-3 font-bold text-xs text-gray-700 dark:text-gray-200 uppercase tracking-wider min-w-[120px]">
                        Category
                      </th>
                      <th className="text-left px-4 py-3 font-bold text-xs text-gray-700 dark:text-gray-200 uppercase tracking-wider min-w-[250px]">
                        Item Description
                      </th>
                      <th className="text-right px-4 py-3 font-bold text-xs text-gray-700 dark:text-gray-200 uppercase tracking-wider min-w-[110px]">
                        Quantity
                      </th>
                      <th className="text-right px-4 py-3 font-bold text-xs text-gray-700 dark:text-gray-200 uppercase tracking-wider min-w-[130px]">
                        Unit Rate
                      </th>
                      <th className="text-right px-4 py-3 font-bold text-xs text-gray-700 dark:text-gray-200 uppercase tracking-wider min-w-[130px]">
                        Total Amount
                      </th>
                      <th className="text-left px-4 py-3 font-bold text-xs text-gray-700 dark:text-gray-200 uppercase tracking-wider min-w-[110px]">
                        Status
                      </th>
                      <th className="text-right px-4 py-3 font-bold text-xs text-gray-700 dark:text-gray-200 uppercase tracking-wider min-w-[100px] sticky right-0 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850 z-30 border-l border-gray-300 dark:border-gray-600">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {paginatedLPOs.map((lpo, index) => (
                      <tr
                        key={lpo.id}
                        className={`transition-all duration-150 ${
                          selectedLPOs.has(lpo.id)
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                        } ${index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/50 dark:bg-gray-850/50'}`}
                      >
                        <td className={`px-4 py-3 text-sm sticky left-0 z-10 border-r border-gray-200 dark:border-gray-700 ${
                          index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-850'
                        } ${selectedLPOs.has(lpo.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                          {guard.hasAccess('procurement.lpo.delete') && (
                            <button
                              onClick={() => handleSelectLPO(lpo.id, !selectedLPOs.has(lpo.id))}
                              className={`flex items-center justify-center w-5 h-5 rounded border-2 transition-all ${
                                selectedLPOs.has(lpo.id)
                                  ? 'border-blue-500 bg-blue-500 text-white'
                                  : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
                              }`}
                            >
                              {selectedLPOs.has(lpo.id) && (
                                <span className="text-white text-xs">✓</span>
                              )}
                            </button>
                          )}
                        </td>
                        <td className={`px-4 py-3 text-sm sticky left-12 z-10 border-r border-gray-200 dark:border-gray-700 ${
                          index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-850'
                        } ${selectedLPOs.has(lpo.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                          <div className="font-semibold text-blue-600 dark:text-blue-400">
                            {lpo.lpo_no || <span className="text-red-500 italic text-xs">Required</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="text-gray-900 dark:text-white truncate max-w-[150px]" title={lpo.vendor || ''}>
                            {lpo.vendor || <span className="text-gray-400">-</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="text-gray-600 dark:text-gray-400">
                            {lpo.lpo_date ? new Date(lpo.lpo_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : <span className="text-gray-400">-</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="text-gray-900 dark:text-white">
                            <div className="font-medium truncate max-w-[150px]" title={lpo.project_code || ''}>
                              {lpo.project_code || <span className="text-gray-400">-</span>}
                            </div>
                            {lpo.project_name && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[150px]" title={lpo.project_name}>
                                {lpo.project_name}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="text-gray-600 dark:text-gray-400 truncate max-w-[120px]" title={lpo.lpo_category || ''}>
                            {lpo.lpo_category || <span className="text-gray-400">-</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="text-gray-900 dark:text-white truncate max-w-[250px]" title={lpo.item_description || ''}>
                            {lpo.item_description || <span className="text-gray-400">-</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          <div className="text-gray-900 dark:text-white font-medium">
                            {lpo.item_quantity ? `${lpo.item_quantity} ${lpo.unit || ''}` : <span className="text-gray-400">-</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          <div className="text-gray-900 dark:text-white">
                            {lpo.unit_rate ? `${lpo.currency || 'AED'} ${lpo.unit_rate.toLocaleString()}` : <span className="text-gray-400">-</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          <div className="font-bold text-gray-900 dark:text-white">
                            {lpo.total_amount ? `${lpo.currency || 'AED'} ${lpo.total_amount.toLocaleString()}` : <span className="text-gray-400">-</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                            lpo.status === 'Issued' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                            lpo.status === 'Pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                            lpo.status === 'Completed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                            lpo.status === 'Cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                          }`}>
                            {lpo.status || 'Issued'}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-sm sticky right-0 z-10 border-l border-gray-200 dark:border-gray-700 ${
                          index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-850'
                        } ${selectedLPOs.has(lpo.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                          <div className="flex items-center justify-end gap-2">
                            <PermissionButton
                              permission="procurement.lpo.edit"
                              onClick={() => {
                                setEditingLPO(lpo)
                                setShowForm(true)
                              }}
                              variant="ghost"
                              size="sm"
                              className="h-10 w-10 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-md"
                            >
                              <Edit className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </PermissionButton>
                            <PermissionButton
                              permission="procurement.lpo.delete"
                              onClick={() => handleDelete(lpo.id)}
                              variant="ghost"
                              size="sm"
                              className="h-10 w-10 p-0 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-md"
                            >
                              <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
                            </PermissionButton>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination Controls */}
              {filteredLPOs.length > itemsPerPage && (
                <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Showing {startIndex + 1} to {Math.min(endIndex, filteredLPOs.length)} of {filteredLPOs.length} records
                    </span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value))
                        setCurrentPage(1)
                      }}
                      className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value={25}>25 per page</option>
                      <option value={50}>50 per page</option>
                      <option value={100}>100 per page</option>
                      <option value={200}>200 per page</option>
                      <option value={500}>500 per page</option>
                    </select>
                  </div>
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={filteredLPOs.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={(page) => {
                      setCurrentPage(page)
                      // Scroll to top of table
                      const tableContainer = document.querySelector('.overflow-x-auto')
                      if (tableContainer) {
                        tableContainer.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }
                    }}
                    loading={loading}
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* LPO Form Modal */}
      {showForm && (
        <LPOFormModal
          lpo={editingLPO}
          onSave={handleSave}
          onClose={() => {
            setShowForm(false)
            setEditingLPO(null)
          }}
        />
      )}
    </div>
  )
}

interface LPOFormModalProps {
  lpo: LPO | null
  onSave: (lpoData: Partial<LPO>) => void
  onClose: () => void
}

function LPOFormModal({ lpo, onSave, onClose }: LPOFormModalProps) {
  const supabase = createClientComponentClient({} as any)
  const [formData, setFormData] = useState({
    lpo_no: lpo?.lpo_no || '',
    vendor: lpo?.vendor || '',
    lpo_date: lpo?.lpo_date ? lpo.lpo_date.split('T')[0] : '',
    project_code: lpo?.project_code || '',
    project_name: lpo?.project_name || '',
    lpo_category: lpo?.lpo_category || '',
    item_description: lpo?.item_description || '',
    unit: lpo?.unit || '',
    item_quantity: lpo?.item_quantity?.toString() || '',
    unit_rate: lpo?.unit_rate?.toString() || '',
    total_amount: lpo?.total_amount?.toString() || '',
    currency: lpo?.currency || 'AED',
    status: lpo?.status || 'Issued',
    delivery_date: lpo?.delivery_date ? lpo.delivery_date.split('T')[0] : '',
    payment_terms: lpo?.payment_terms || '',
    price_before_negotiation: lpo?.price_before_negotiation?.toString() || '',
    saving_amount_aed: lpo?.saving_amount_aed?.toString() || '',
    saving_percentage: lpo?.saving_percentage?.toString() || '',
    column_21: lpo?.column_21 || ''
  })
  const [saving, setSaving] = useState(false)
  const [vendors, setVendors] = useState<{ name: string }[]>([])
  const [items, setItems] = useState<{ item_description: string }[]>([])
  const [paymentTerms, setPaymentTerms] = useState<{ payment_term: string }[]>([])
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [loadingData, setLoadingData] = useState(false)
  
  // Search states for dropdowns
  const [vendorSearch, setVendorSearch] = useState('')
  const [itemSearch, setItemSearch] = useState('')
  const [paymentTermSearch, setPaymentTermSearch] = useState('')
  const [categorySearch, setCategorySearch] = useState('')
  const [showVendorDropdown, setShowVendorDropdown] = useState(false)
  const [showItemDropdown, setShowItemDropdown] = useState(false)
  const [showPaymentTermDropdown, setShowPaymentTermDropdown] = useState(false)
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)

  // Load vendors, items, and payment terms for dropdowns
  useEffect(() => {
    const loadDropdownData = async () => {
      setLoadingData(true)
      try {
        // Load vendors
        const { data: vendorsData } = await supabase
          .from('vendors')
          .select('name')
          .order('name')
        if (vendorsData) setVendors(vendorsData)

        // Load items
        const { data: itemsData } = await supabase
          .from('procurement_items')
          .select('item_description')
          .order('item_description')
        if (itemsData) setItems(itemsData)

        // Load payment terms
        const { data: termsData } = await supabase
          .from('payment_terms')
          .select('payment_term')
          .order('payment_term')
        if (termsData) setPaymentTerms(termsData)

        // Load categories
        const { data: categoriesData } = await supabase
          .from('vendor_categories')
          .select('id, name')
          .eq('is_active', true)
          .order('name', { ascending: true })
        if (categoriesData) setCategories(categoriesData)
      } catch (error) {
        console.error('Error loading dropdown data:', error)
      } finally {
        setLoadingData(false)
      }
    }
    loadDropdownData()
  }, [])

  // Auto-fill vendor data when vendor is selected
  useEffect(() => {
    const loadVendorData = async () => {
      if (!formData.vendor) return
      
      try {
        const { data: vendorData } = await supabase
          .from('vendors')
          .select('*')
          .eq('name', formData.vendor)
          .single()

        if (vendorData) {
          // Auto-fill payment terms if vendor has preferred payment terms
          // You can add more auto-fill logic here based on vendor data
          if (vendorData.payment_terms && !formData.payment_terms) {
            setFormData(prev => ({ ...prev, payment_terms: vendorData.payment_terms }))
          }
        }
      } catch (error) {
        // Vendor not found or error - ignore
      }
    }
    loadVendorData()
  }, [formData.vendor])

  // Auto-fill item data when item is selected
  useEffect(() => {
    const loadItemData = async () => {
      if (!formData.item_description) return
      
      try {
        const { data: itemData } = await supabase
          .from('procurement_items')
          .select('*')
          .eq('item_description', formData.item_description)
          .single()

        if (itemData) {
          // Auto-fill unit if available (you may need to add unit to items table)
          // For now, we'll just ensure the item description is set
        }
      } catch (error) {
        // Item not found or error - ignore
      }
    }
    loadItemData()
  }, [formData.item_description])

  // Calculate total_amount when quantity or rate changes
  useEffect(() => {
    if (formData.item_quantity && formData.unit_rate) {
      const qty = parseFloat(formData.item_quantity) || 0
      const rate = parseFloat(formData.unit_rate) || 0
      const total = qty * rate
      setFormData(prev => ({ ...prev, total_amount: total.toString() }))
    }
  }, [formData.item_quantity, formData.unit_rate])

  // Calculate saving when price_before_negotiation or total_amount changes
  useEffect(() => {
    if (formData.price_before_negotiation && formData.total_amount) {
      const before = parseFloat(formData.price_before_negotiation) || 0
      const total = parseFloat(formData.total_amount) || 0
      const saving = before - total
      const percentage = before > 0 ? (saving / before) * 100 : 0
      setFormData(prev => ({
        ...prev,
        saving_amount_aed: saving.toString(),
        saving_percentage: percentage.toFixed(2)
      }))
    }
  }, [formData.price_before_negotiation, formData.total_amount])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    
    const lpoData: Partial<LPO> = {
      lpo_no: formData.lpo_no || undefined,
      vendor: formData.vendor || undefined,
      lpo_date: formData.lpo_date || undefined,
      project_code: formData.project_code || undefined,
      project_name: formData.project_name || undefined,
      lpo_category: formData.lpo_category || undefined,
      item_description: formData.item_description || undefined,
      unit: formData.unit || undefined,
      item_quantity: formData.item_quantity ? parseFloat(formData.item_quantity) : undefined,
      unit_rate: formData.unit_rate ? parseFloat(formData.unit_rate) : undefined,
      total_amount: formData.total_amount ? parseFloat(formData.total_amount) : undefined,
      currency: formData.currency || 'AED',
      status: formData.status || 'Issued',
      delivery_date: formData.delivery_date || undefined,
      payment_terms: formData.payment_terms || undefined,
      price_before_negotiation: formData.price_before_negotiation ? parseFloat(formData.price_before_negotiation) : undefined,
      saving_amount_aed: formData.saving_amount_aed ? parseFloat(formData.saving_amount_aed) : undefined,
      saving_percentage: formData.saving_percentage ? parseFloat(formData.saving_percentage) : undefined,
      column_21: formData.column_21 || undefined
    }

    await onSave(lpoData)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-4xl m-4 max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>
            {lpo ? 'Edit LPO Record' : 'Add New LPO Record'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  LPO No. (Purchase Order Number from Vendor) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={formData.lpo_no}
                  onChange={(e) => setFormData({ ...formData, lpo_no: e.target.value })}
                  placeholder="Enter purchase order number from vendor"
                  required
                  className="font-medium"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Purchase Order Number from Vendor - Very Important
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Vendor <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    value={formData.vendor}
                    onChange={(e) => {
                      setFormData({ ...formData, vendor: e.target.value })
                      setVendorSearch(e.target.value)
                      setShowVendorDropdown(true)
                    }}
                    onFocus={() => setShowVendorDropdown(true)}
                    onBlur={() => setTimeout(() => setShowVendorDropdown(false), 200)}
                    placeholder="Search or enter vendor name..."
                    required
                    className="w-full"
                  />
                  {showVendorDropdown && vendors.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {vendors
                        .filter(v => !vendorSearch || v.name.toLowerCase().includes(vendorSearch.toLowerCase()))
                        .slice(0, 20)
                        .map((v, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, vendor: v.name })
                              setVendorSearch('')
                              setShowVendorDropdown(false)
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                          >
                            {v.name}
                          </button>
                        ))}
                      {vendorSearch && !vendors.find(v => v.name.toLowerCase() === vendorSearch.toLowerCase()) && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, vendor: vendorSearch })
                            setVendorSearch('')
                            setShowVendorDropdown(false)
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium"
                        >
                          + Add "{vendorSearch}"
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  LPO Date
                </label>
                <Input
                  type="date"
                  value={formData.lpo_date}
                  onChange={(e) => setFormData({ ...formData, lpo_date: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Project Code
                </label>
                <Input
                  type="text"
                  value={formData.project_code}
                  onChange={(e) => setFormData({ ...formData, project_code: e.target.value })}
                  placeholder="Enter project code"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Project Name
                </label>
                <Input
                  type="text"
                  value={formData.project_name}
                  onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                  placeholder="Enter project name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  LPO Category
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    value={formData.lpo_category}
                    onChange={(e) => {
                      setFormData({ ...formData, lpo_category: e.target.value })
                      setCategorySearch(e.target.value)
                      setShowCategoryDropdown(true)
                    }}
                    onFocus={() => setShowCategoryDropdown(true)}
                    onBlur={() => setTimeout(() => setShowCategoryDropdown(false), 200)}
                    placeholder="Search or enter category..."
                    className="w-full"
                  />
                  {showCategoryDropdown && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {categories
                        .filter(cat => !categorySearch || cat.name.toLowerCase().includes(categorySearch.toLowerCase()))
                        .slice(0, 20)
                        .map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, lpo_category: cat.name })
                              setCategorySearch('')
                              setShowCategoryDropdown(false)
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                          >
                            {cat.name}
                          </button>
                        ))}
                      {categorySearch && !categories.find(cat => cat.name.toLowerCase() === categorySearch.toLowerCase()) && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (!categorySearch.trim()) return
                            
                            try {
                              // Check if category already exists
                              const { data: existing } = await supabase
                                .from('vendor_categories')
                                .select('id, name')
                                .eq('name', categorySearch.trim())
                                .single()

                              if (existing) {
                                setFormData({ ...formData, lpo_category: existing.name })
                                setCategorySearch('')
                                setShowCategoryDropdown(false)
                                return
                              }

                              // Add new category
                              const { data: newCategory, error: insertError } = await supabase
                                .from('vendor_categories')
                                .insert([{ name: categorySearch.trim(), is_active: true }])
                                .select('id, name')
                                .single()

                              if (insertError) {
                                // If table doesn't exist, just use the text value
                                if (insertError.code === 'PGRST116' || insertError.message.includes('does not exist')) {
                                  setFormData({ ...formData, lpo_category: categorySearch.trim() })
                                  setCategorySearch('')
                                  setShowCategoryDropdown(false)
                                  return
                                }
                                throw insertError
                              }

                              // Reload categories
                              const { data: categoriesData } = await supabase
                                .from('vendor_categories')
                                .select('id, name')
                                .eq('is_active', true)
                                .order('name', { ascending: true })
                              if (categoriesData) setCategories(categoriesData)

                              // Set the newly added category
                              setFormData({ ...formData, lpo_category: newCategory.name })
                              setCategorySearch('')
                              setShowCategoryDropdown(false)
                            } catch (error: any) {
                              console.error('Error adding category:', error)
                              // If error, just use the text value directly
                              setFormData({ ...formData, lpo_category: categorySearch.trim() })
                              setCategorySearch('')
                              setShowCategoryDropdown(false)
                            }
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium"
                        >
                          + Add "{categorySearch}"
                        </button>
                      )}
                      {categories.length === 0 && (
                        <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                          No categories found. Type a name and click "+ Add" to create one.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Item Description
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    value={formData.item_description}
                    onChange={(e) => {
                      setFormData({ ...formData, item_description: e.target.value })
                      setItemSearch(e.target.value)
                      setShowItemDropdown(true)
                    }}
                    onFocus={() => setShowItemDropdown(true)}
                    onBlur={() => setTimeout(() => setShowItemDropdown(false), 200)}
                    placeholder="Search or enter item description..."
                    className="w-full"
                  />
                  {showItemDropdown && items.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {items
                        .filter(item => !itemSearch || item.item_description.toLowerCase().includes(itemSearch.toLowerCase()))
                        .slice(0, 20)
                        .map((item, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, item_description: item.item_description })
                              setItemSearch('')
                              setShowItemDropdown(false)
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                          >
                            {item.item_description}
                          </button>
                        ))}
                      {itemSearch && !items.find(i => i.item_description.toLowerCase() === itemSearch.toLowerCase()) && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, item_description: itemSearch })
                            setItemSearch('')
                            setShowItemDropdown(false)
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium"
                        >
                          + Add "{itemSearch}"
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Unit
                </label>
                <Input
                  type="text"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="e.g., L.M, nos, L.S"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Item Quantity
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.item_quantity}
                  onChange={(e) => setFormData({ ...formData, item_quantity: e.target.value })}
                  placeholder="Enter quantity"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Unit Rate
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.unit_rate}
                  onChange={(e) => setFormData({ ...formData, unit_rate: e.target.value })}
                  placeholder="Enter unit rate"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Total Amount
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.total_amount}
                  onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                  placeholder="Auto-calculated"
                  readOnly
                  className="bg-gray-50 dark:bg-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Currency
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="AED">AED</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="Issued">Issued</option>
                  <option value="Pending">Pending</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Delivery Date
                </label>
                <Input
                  type="date"
                  value={formData.delivery_date}
                  onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Payment Terms
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    value={formData.payment_terms}
                    onChange={(e) => {
                      setFormData({ ...formData, payment_terms: e.target.value })
                      setPaymentTermSearch(e.target.value)
                      setShowPaymentTermDropdown(true)
                    }}
                    onFocus={() => setShowPaymentTermDropdown(true)}
                    onBlur={() => setTimeout(() => setShowPaymentTermDropdown(false), 200)}
                    placeholder="Search or enter payment terms..."
                    className="w-full"
                  />
                  {showPaymentTermDropdown && paymentTerms.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {paymentTerms
                        .filter(term => !paymentTermSearch || term.payment_term.toLowerCase().includes(paymentTermSearch.toLowerCase()))
                        .slice(0, 20)
                        .map((term, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, payment_terms: term.payment_term })
                              setPaymentTermSearch('')
                              setShowPaymentTermDropdown(false)
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                          >
                            {term.payment_term}
                          </button>
                        ))}
                      {paymentTermSearch && !paymentTerms.find(t => t.payment_term.toLowerCase() === paymentTermSearch.toLowerCase()) && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, payment_terms: paymentTermSearch })
                            setPaymentTermSearch('')
                            setShowPaymentTermDropdown(false)
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium"
                        >
                          + Add "{paymentTermSearch}"
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Price Before Negotiation
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.price_before_negotiation}
                  onChange={(e) => setFormData({ ...formData, price_before_negotiation: e.target.value })}
                  placeholder="Enter price before negotiation"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Saving Amount (AED)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.saving_amount_aed}
                  onChange={(e) => setFormData({ ...formData, saving_amount_aed: e.target.value })}
                  placeholder="Auto-calculated"
                  readOnly
                  className="bg-gray-50 dark:bg-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Saving %
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.saving_percentage}
                  onChange={(e) => setFormData({ ...formData, saving_percentage: e.target.value })}
                  placeholder="Auto-calculated"
                  readOnly
                  className="bg-gray-50 dark:bg-gray-800"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Column 21
                </label>
                <Input
                  type="text"
                  value={formData.column_21}
                  onChange={(e) => setFormData({ ...formData, column_21: e.target.value })}
                  placeholder="Additional information"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
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
                disabled={saving || !formData.lpo_no || !formData.vendor}
              >
                {saving ? 'Saving...' : lpo ? 'Update' : 'Add'} LPO Record
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

