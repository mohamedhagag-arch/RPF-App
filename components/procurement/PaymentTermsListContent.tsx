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
  CreditCard,
  Search,
  Plus,
  Edit,
  Trash2,
  Download,
  Upload,
  FileSpreadsheet,
} from 'lucide-react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { useSmartLoading } from '@/lib/smartLoadingManager'
import { ImportButton } from '@/components/ui/ImportButton'
import { useAuth } from '@/app/providers'
import { downloadTemplate, downloadCSV, downloadExcel } from '@/lib/exportImportUtils'

interface PaymentTerm {
  id: string
  payment_term: string
  created_at: string
  updated_at: string
}

export default function PaymentTermsListContent() {
  const guard = usePermissionGuard()
  const { appUser } = useAuth()
  const supabase = createClientComponentClient({} as any)
  const { startSmartLoading, stopSmartLoading } = useSmartLoading('payment-terms-list')
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [editingTerm, setEditingTerm] = useState<PaymentTerm | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [selectedTerms, setSelectedTerms] = useState<Set<string>>(new Set())
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, percentage: 0 })
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    loadPaymentTerms()
  }, [])

  const loadPaymentTerms = async () => {
    try {
      setLoading(true)
      setError('')
      
      const { data, error: fetchError } = await supabase
        .from('payment_terms')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) {
        console.error('Supabase Error:', fetchError)
        if (fetchError.code === 'PGRST116' || fetchError.message.includes('does not exist')) {
          console.log('Payment terms table does not exist yet. Please create it in the database.')
          setError('Table does not exist. Please run the SQL script: Database/create-payment-terms-table.sql')
          setPaymentTerms([])
          return
        }
        // Check for RLS/permission errors
        if (fetchError.code === '42501' || fetchError.message.includes('permission denied') || fetchError.message.includes('RLS')) {
          console.error('RLS/Permission error:', fetchError)
          setError('Permission denied. Please run: Database/create-payment-terms-table.sql in Supabase SQL Editor to fix RLS policies.')
          setPaymentTerms([])
          return
        }
        throw fetchError
      }

      setPaymentTerms(data || [])
    } catch (error: any) {
      console.error('Error loading payment terms:', error)
      setError('Failed to load payment terms. Please ensure the payment_terms table exists in the database.')
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payment term?')) return

    try {
      startSmartLoading(setLoading)
      const { error: deleteError } = await supabase
        .from('payment_terms')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      await loadPaymentTerms()
      setSelectedTerms(new Set())
    } catch (error: any) {
      console.error('Error deleting payment term:', error)
      setError('Failed to delete payment term')
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedTerms.size === 0) {
      setError('Please select at least one payment term to delete')
      return
    }

    if (!confirm(`Are you sure you want to delete ${selectedTerms.size} payment term(s)?`)) {
      return
    }

    try {
      startSmartLoading(setLoading)
      setError('')
      setSuccess('')

      const termIds = Array.from(selectedTerms)
      const { error: deleteError } = await supabase
        .from('payment_terms')
        .delete()
        .in('id', termIds)

      if (deleteError) throw deleteError

      setSuccess(`Successfully deleted ${selectedTerms.size} payment term(s)`)
      setSelectedTerms(new Set())
      await loadPaymentTerms()
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      console.error('Error deleting payment terms:', error)
      setError('Failed to delete payment terms')
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTerms(new Set(filteredTerms.map(t => t.id)))
    } else {
      setSelectedTerms(new Set())
    }
  }

  const handleSelectTerm = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedTerms)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedTerms(newSelected)
  }

  const handleSave = async (term: string) => {
    try {
      if (!term.trim()) {
        setError('Payment term is required')
        return
      }

      startSmartLoading(setLoading)
      setError('')
      setSuccess('')

      if (editingTerm) {
        // Update existing term
        const { error: updateError } = await supabase
          .from('payment_terms')
          .update({
            payment_term: term.trim(),
            updated_at: new Date().toISOString()
          })
          .eq('id', editingTerm.id)

        if (updateError) throw updateError
        setSuccess('Payment term updated successfully')
      } else {
        // Create new term
        const { error: insertError } = await supabase
          .from('payment_terms')
          .insert([{
            payment_term: term.trim()
          }])

        if (insertError) throw insertError
        setSuccess('Payment term added successfully')
      }

      await loadPaymentTerms()
      setShowForm(false)
      setEditingTerm(null)
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      console.error('Error saving payment term:', error)
      setError(error.message || 'Failed to save payment term')
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

      // Helper function to get value by multiple possible column names (case-insensitive)
      const getValue = (row: any, possibleNames: string[]): any => {
        for (const name of possibleNames) {
          // Try exact match first
          if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
            return row[name]
          }
          // Try case-insensitive match
          const lowerName = name.toLowerCase()
          for (const key in row) {
            if (key.toLowerCase() === lowerName && row[key] !== undefined && row[key] !== null && row[key] !== '') {
              return row[key]
            }
          }
        }
        return null
      }

      // Clean data
      setImportProgress({ current: 0, total: data.length, percentage: 10 })
      
      const cleanData = data.map((row, index) => {
        // Update progress during cleaning
        if (index % 100 === 0) {
          setImportProgress({ 
            current: index, 
            total: data.length, 
            percentage: Math.min(30, 10 + (index / data.length) * 20) 
          })
        }
        
        const cleanRow: any = {}
        
        // Get payment term (support multiple variations)
        let term = getValue(row, [
          'Payment Terms',
          'payment terms',
          'PAYMENT TERMS',
          'Payment_Terms',
          'payment_terms',
          'Payment Term',
          'payment term',
          'PAYMENT TERM',
          'term',
          'Term',
          'TERM'
        ])
        
        // If no term found, check if the row itself is a string or has a single value
        if (!term) {
          // Check if row is an object with only one key (single column CSV)
          const keys = Object.keys(row)
          if (keys.length === 1) {
            term = row[keys[0]]
          } else if (keys.length === 0) {
            // Empty row, skip
            return null
          } else {
            // Multiple keys, try to find any value that looks like a payment term
            for (const key of keys) {
              const value = row[key]
              if (value && String(value).trim() !== '' && String(value).trim().toLowerCase() !== 'payment terms') {
                term = value
                break
              }
            }
          }
        }
        
        if (term) {
          const termStr = String(term).trim()
          // Skip header row if it matches common header names
          if (termStr.toLowerCase() === 'payment terms' || termStr.toLowerCase() === 'payment term') {
            return null
          }
          cleanRow.payment_term = termStr
        }
        
        return cleanRow
      }).filter(row => row && row.payment_term && row.payment_term.trim() !== '')

      if (cleanData.length === 0) {
        throw new Error('No valid data found. Please ensure the file contains at least a "Payment Terms" column.')
      }

      console.log(`📊 Prepared ${cleanData.length} payment terms for import`)
      setImportProgress({ current: cleanData.length, total: cleanData.length, percentage: 30 })

      // Remove duplicates from cleanData before import (based on payment_term)
      const uniqueDataMap = new Map<string, any>()
      for (const item of cleanData) {
        const term = item.payment_term.toLowerCase().trim()
        if (!uniqueDataMap.has(term)) {
          uniqueDataMap.set(term, item)
        }
      }
      const uniqueData = Array.from(uniqueDataMap.values())
      
      console.log(`📊 After removing duplicates: ${uniqueData.length} unique payment terms`)
      setImportProgress({ current: uniqueData.length, total: uniqueData.length, percentage: 40 })

      // Import all data at once using upsert to handle duplicates automatically
      // Split into large batches (1000 rows) if needed for very large files
      const batchSize = 1000
      let imported = 0
      let skipped = 0
      let errors = 0
      const errorDetails: string[] = []
      const totalBatches = Math.ceil(uniqueData.length / batchSize)

      for (let i = 0; i < uniqueData.length; i += batchSize) {
        const batch = uniqueData.slice(i, i + batchSize)
        const batchNumber = Math.floor(i / batchSize) + 1
        
        // Update progress
        const progressPercentage = 40 + (batchNumber / totalBatches) * 50
        setImportProgress({ 
          current: Math.min(i + batch.length, uniqueData.length), 
          total: uniqueData.length, 
          percentage: Math.min(90, progressPercentage) 
        })
        
        try {
          // Use upsert with onConflict to skip duplicates automatically
          const { data: insertedData, error: upsertError } = await supabase
            .from('payment_terms')
            .upsert(batch, {
              onConflict: 'payment_term',
              ignoreDuplicates: false // Update existing if any
            })
            .select()

          if (upsertError) {
            console.error('Error upserting batch:', upsertError)
            errors += batch.length
            errorDetails.push(`Batch ${batchNumber}: ${upsertError.message}`)
          } else {
            imported += batch.length
            console.log(`✅ Imported batch ${batchNumber}: ${batch.length} payment terms`)
          }
        } catch (error: any) {
          console.error('Exception during batch import:', error)
          errors += batch.length
          errorDetails.push(`Batch ${batchNumber}: ${error.message}`)
        }
      }

      // Calculate skipped (duplicates that were already in database)
      skipped = uniqueData.length - imported - errors

      setImportProgress({ current: uniqueData.length, total: uniqueData.length, percentage: 95 })
      
      await loadPaymentTerms()
      
      setImportProgress({ current: uniqueData.length, total: uniqueData.length, percentage: 100 })
      
      let successMsg = `Successfully imported ${imported} payment term(s)`
      if (skipped > 0) {
        successMsg += `. ${skipped} duplicate(s) skipped.`
      }
      if (errors > 0) {
        successMsg += ` ${errors} failed.`
        if (errorDetails.length > 0 && errorDetails.length <= 3) {
          successMsg += ` Errors: ${errorDetails.join('; ')}`
        }
      }
      
      setSuccess(successMsg)
      if (errors > 0) {
        console.warn('Import errors:', errorDetails)
      }
      
      // Reset progress after 2 seconds
      setTimeout(() => {
        setImportProgress({ current: 0, total: 0, percentage: 0 })
        setImporting(false)
      }, 2000)
      setTimeout(() => setSuccess(''), 5000)
    } catch (error: any) {
      console.error('Error importing payment terms:', error)
      setError(error.message || 'Failed to import payment terms')
      setImportProgress({ current: 0, total: 0, percentage: 0 })
      setImporting(false)
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  const handleExport = async (format: 'csv' | 'excel' = 'excel') => {
    try {
      if (filteredTerms.length === 0) {
        setError('No payment terms to export')
        return
      }

      startSmartLoading(setLoading)
      setError('')
      setSuccess('')

      const exportData = filteredTerms.map(term => ({
        'Payment Terms': term.payment_term || ''
      }))

      const filename = `payment_terms_export_${new Date().toISOString().split('T')[0]}`

      if (format === 'csv') {
        downloadCSV(exportData, filename)
      } else {
        await downloadExcel(exportData, filename, 'Payment Terms')
      }

      setSuccess(`Successfully exported ${exportData.length} payment term(s) as ${format.toUpperCase()}`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      console.error('Error exporting payment terms:', error)
      setError('Failed to export payment terms')
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const templateColumns = ['Payment Terms']
      await downloadTemplate('payment_terms_template', templateColumns, 'excel')
    } catch (error) {
      console.error('Error downloading template:', error)
      setError('Failed to download template')
    }
  }

  const getFilteredTerms = () => {
    if (!searchTerm) return paymentTerms

    const term = searchTerm.toLowerCase()
    return paymentTerms.filter(paymentTerm =>
      paymentTerm.payment_term?.toLowerCase().includes(term)
    )
  }

  const filteredTerms = getFilteredTerms()

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-end">
        <PermissionButton
          permission="procurement.payment_terms.create"
          onClick={() => {
            setEditingTerm(null)
            setShowForm(true)
          }}
          variant="primary"
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Payment Term
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
                placeholder="Search payment terms..."
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

      {/* Import Progress Bar */}
      {importing && importProgress.total > 0 && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-blue-900 dark:text-blue-100">
                  Importing payment terms...
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
                {importProgress.current} of {importProgress.total} payment terms processed
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Actions Toolbar */}
      {selectedTerms.size > 0 && (
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  {selectedTerms.size} payment term(s) selected
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTerms(new Set())}
                  className="text-gray-600 dark:text-gray-300"
                >
                  Clear Selection
                </Button>
              </div>
              {guard.hasAccess('procurement.payment_terms.delete') && (
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

      {/* Payment Terms Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Payment Terms ({filteredTerms.length})</span>
            <div className="flex items-center gap-2">
              {guard.hasAccess('procurement.payment_terms.import') && (
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
                permission="procurement.payment_terms.export"
                onClick={() => handleExport('excel')}
                variant="ghost"
                size="sm"
                title="Export to Excel"
              >
                <Download className="h-4 w-4" />
              </PermissionButton>
              {guard.hasAccess('procurement.payment_terms.import') && (
                <ImportButton
                  onImport={handleImport}
                  requiredColumns={['Payment Terms']}
                  templateName="payment_terms_template"
                  templateColumns={['Payment Terms']}
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
          ) : filteredTerms.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {paymentTerms.length === 0 ? 'No Payment Terms Found' : 'No Payment Terms Match Your Search'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {paymentTerms.length === 0 
                  ? 'Get started by adding your first payment term. You may need to create the payment_terms table in your database first.'
                  : 'Try adjusting your search terms.'}
              </p>
              {paymentTerms.length === 0 && (
                <PermissionButton
                  permission="procurement.payment_terms.create"
                  onClick={() => setShowForm(true)}
                  variant="primary"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Payment Term
                </PermissionButton>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300 w-12">
                      {guard.hasAccess('procurement.payment_terms.delete') && (
                        <button
                          onClick={() => handleSelectAll(selectedTerms.size !== filteredTerms.length)}
                          className="flex items-center justify-center"
                          title={selectedTerms.size === filteredTerms.length ? 'Deselect all' : 'Select all'}
                        >
                          {selectedTerms.size === filteredTerms.length && filteredTerms.length > 0 ? (
                            <span className="text-blue-600">✓</span>
                          ) : (
                            <span className="text-gray-400">□</span>
                          )}
                        </button>
                      )}
                    </th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Payment Term</th>
                    <th className="text-right p-3 font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTerms.map((term) => (
                    <tr
                      key={term.id}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="p-3 w-12">
                        {guard.hasAccess('procurement.payment_terms.delete') && (
                          <button
                            onClick={() => handleSelectTerm(term.id, !selectedTerms.has(term.id))}
                            className="flex items-center justify-center"
                          >
                            {selectedTerms.has(term.id) ? (
                              <span className="text-blue-600">✓</span>
                            ) : (
                              <span className="text-gray-400">□</span>
                            )}
                          </button>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {term.payment_term}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-2">
                          <PermissionButton
                            permission="procurement.payment_terms.edit"
                            onClick={() => {
                              setEditingTerm(term)
                              setShowForm(true)
                            }}
                            variant="ghost"
                            size="sm"
                          >
                            <Edit className="h-4 w-4" />
                          </PermissionButton>
                          <PermissionButton
                            permission="procurement.payment_terms.delete"
                            onClick={() => handleDelete(term.id)}
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

      {/* Payment Term Form Modal */}
      {showForm && (
        <PaymentTermFormModal
          term={editingTerm}
          onSave={handleSave}
          onClose={() => {
            setShowForm(false)
            setEditingTerm(null)
          }}
        />
      )}
    </div>
  )
}

interface PaymentTermFormModalProps {
  term: PaymentTerm | null
  onSave: (term: string) => void
  onClose: () => void
}

function PaymentTermFormModal({ term, onSave, onClose }: PaymentTermFormModalProps) {
  const [paymentTerm, setPaymentTerm] = useState(term?.payment_term || '')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!paymentTerm.trim()) {
      alert('Payment term is required')
      return
    }
    setSaving(true)
    await onSave(paymentTerm.trim())
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl m-4">
        <CardHeader>
          <CardTitle>
            {term ? 'Edit Payment Term' : 'Add New Payment Term'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Payment Term <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={paymentTerm}
                onChange={(e) => setPaymentTerm(e.target.value)}
                placeholder="Enter payment term (e.g., PDC 30 Days, Cash, etc.)"
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
                disabled={saving || !paymentTerm.trim()}
              >
                {saving ? 'Saving...' : term ? 'Update' : 'Add'} Payment Term
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

