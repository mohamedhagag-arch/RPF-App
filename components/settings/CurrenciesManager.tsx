'use client'

import { useState, useEffect } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { 
  getAllCurrencies, 
  addCurrency, 
  updateCurrency, 
  deleteCurrency,
  initializeCurrenciesTable,
  Currency
} from '@/lib/currenciesManager'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  DollarSign, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Star,
  StarOff,
  Download,
  Upload,
  FileText,
  FileJson,
  FileSpreadsheet,
  Database,
  Eye
} from 'lucide-react'

export function CurrenciesManager() {
  const guard = usePermissionGuard()
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null)
  
  // Export/Import states
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'excel'>('json')
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<any[] | null>(null)
  const [showImportPreview, setShowImportPreview] = useState(false)
  
  // Form fields
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    symbol: '',
    exchange_rate: '1.0',
    is_default: false
  })

  useEffect(() => {
    fetchCurrencies()
  }, [])

  const fetchCurrencies = async () => {
    try {
      setLoading(true)
      setError('')
      
      // تهيئة الجدول إذا لزم الأمر
      await initializeCurrenciesTable()
      
      // جلب العملات
      const data = await getAllCurrencies()
      setCurrencies(data)
    } catch (error: any) {
      setError('Failed to load currencies')
      console.error('Error fetching currencies:', error)
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
      if (currencies.length === 0) {
        setError('No currencies data to export.')
        return
      }

      let blob: Blob
      let fileExtension: string
      let mimeType: string

      if (exportFormat === 'json') {
        blob = new Blob([JSON.stringify(currencies, null, 2)], { type: 'application/json' })
        fileExtension = 'json'
        mimeType = 'application/json'
      } else if (exportFormat === 'csv') {
        const header = Object.keys(currencies[0]).join(',') + '\n'
        const rows = currencies.map(row => Object.values(row).map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n')
        blob = new Blob([header + rows], { type: 'text/csv' })
        fileExtension = 'csv'
        mimeType = 'text/csv'
      } else if (exportFormat === 'excel') {
        const header = Object.keys(currencies[0]).join(',') + '\n'
        const rows = currencies.map(row => Object.values(row).map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n')
        blob = new Blob([header + rows], { type: 'text/csv' })
        fileExtension = 'csv'
        mimeType = 'text/csv'
      } else {
        setError('Unsupported export format.')
        return
      }

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `currencies-${new Date().toISOString().split('T')[0]}.${fileExtension}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      setSuccess(`Successfully exported currencies data as ${exportFormat.toUpperCase()}.`)
      
    } catch (err: any) {
      console.error('Error exporting currencies data:', err)
      setError(`Failed to export currencies data: ${err.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  // Import functions
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImportFile(e.target.files[0])
      setImportPreview(null)
      setShowImportPreview(false)
      setError('')
      setSuccess('')
    }
  }

  const handleImportPreview = async () => {
    if (!importFile) {
      setError('Please select a file to import.')
      return
    }
    
    setLoading(true)
    setError('')
    setSuccess('')
    
    try {
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string
          let parsedData: any[] = []

          if (importFile.type === 'application/json') {
            parsedData = JSON.parse(content)
          } else if (importFile.type === 'text/csv') {
            const lines = content.split('\n').filter(line => line.trim() !== '')
            if (lines.length === 0) {
              setError('CSV file is empty or malformed.')
              return
            }
            const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
            for (let i = 1; i < lines.length; i++) {
              const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
              if (values.length === headers.length) {
                const row: any = {}
                headers.forEach((header, index) => {
                  row[header] = values[index]
                })
                parsedData.push(row)
              }
            }
          } else {
            setError('Unsupported file type. Please upload JSON or CSV.')
            return
          }
          
          setImportPreview(parsedData)
          setShowImportPreview(true)
          setSuccess(`Previewing ${parsedData.length} records for currencies.`)
          
        } catch (e: any) {
          setError(`Failed to parse file: ${e.message || 'Invalid file content'}`)
        } finally {
          setLoading(false)
        }
      }
      reader.onerror = () => setError('Failed to read file')
      reader.readAsText(importFile)
      
    } catch (err: any) {
      console.error('Error parsing import file:', err)
      setError(`Failed to preview import: ${err.message || 'Unknown error'}`)
      setLoading(false)
    }
  }

  const handleImportConfirm = async () => {
    if (!importPreview || importPreview.length === 0) {
      setError('No data to import or preview is empty.')
      return
    }
    
    setLoading(true)
    setError('')
    setSuccess('')
    
    let successful = 0
    let failed = 0
    const errors: string[] = []
    
    try {
      for (const record of importPreview) {
        try {
          await addCurrency({
            code: record.code,
            name: record.name,
            symbol: record.symbol,
            exchange_rate: parseFloat(record.exchange_rate) || 1.0,
            is_default: record.is_default === 'true' || record.is_default === true,
            is_active: record.is_active !== false
          })
          successful++
        } catch (recordError: any) {
          failed++
          errors.push(`Record failed: ${recordError.message}`)
        }
      }
      
      setSuccess(`Import completed: ${successful} successful, ${failed} failed.`)
      setImportFile(null)
      setImportPreview(null)
      setShowImportPreview(false)
      
      // Reload data
      await fetchCurrencies()
      
    } catch (err: any) {
      console.error('Error during import:', err)
      setError(`Failed to complete import: ${err.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!formData.code.trim() || !formData.name.trim() || !formData.symbol.trim()) {
      setError('Currency code, name, and symbol are required')
      return
    }

    if (formData.code.length !== 3) {
      setError('Currency code must be exactly 3 characters')
      return
    }

    const exchangeRate = parseFloat(formData.exchange_rate)
    if (isNaN(exchangeRate) || exchangeRate <= 0) {
      setError('Exchange rate must be a positive number')
      return
    }

    try {
      setLoading(true)

      if (editingCurrency) {
        // تحديث عملة موجودة
        const result = await updateCurrency(editingCurrency.id!, {
          code: formData.code.trim().toUpperCase(),
          name: formData.name.trim(),
          symbol: formData.symbol.trim(),
          exchange_rate: exchangeRate,
          is_default: formData.is_default
        })

        if (result.success) {
          setSuccess('Currency updated successfully')
          await fetchCurrencies()
          resetForm()
        } else {
          setError(result.error || 'Failed to update currency')
        }
      } else {
        // إضافة عملة جديدة
        const result = await addCurrency({
          code: formData.code.trim().toUpperCase(),
          name: formData.name.trim(),
          symbol: formData.symbol.trim(),
          exchange_rate: exchangeRate,
          is_default: formData.is_default,
          is_active: true
        })

        if (result.success) {
          setSuccess('Currency added successfully')
          await fetchCurrencies()
          resetForm()
        } else {
          setError(result.error || 'Failed to add currency')
        }
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (currency: Currency) => {
    setEditingCurrency(currency)
    setFormData({
      code: currency.code,
      name: currency.name,
      symbol: currency.symbol,
      exchange_rate: currency.exchange_rate.toString(),
      is_default: currency.is_default
    })
    setShowForm(true)
    setError('')
    setSuccess('')
  }

  const handleDelete = async (currency: Currency) => {
    if (currency.is_default) {
      setError('Cannot delete default currency')
      return
    }

    if (!confirm(`Are you sure you want to delete "${currency.name}"?`)) {
      return
    }

    try {
      setLoading(true)
      setError('')
      setSuccess('')

      const result = await deleteCurrency(currency.id!)

      if (result.success) {
        setSuccess('Currency deleted successfully')
        await fetchCurrencies()
      } else {
        setError(result.error || 'Failed to delete currency')
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleSetDefault = async (currency: Currency) => {
    try {
      setLoading(true)
      setError('')
      setSuccess('')

      const result = await updateCurrency(currency.id!, { is_default: true })

      if (result.success) {
        setSuccess(`"${currency.name}" set as default currency`)
        await fetchCurrencies()
      } else {
        setError(result.error || 'Failed to set default currency')
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({ code: '', name: '', symbol: '', exchange_rate: '1.0', is_default: false })
    setEditingCurrency(null)
    setShowForm(false)
    setError('')
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-green-600 to-emerald-600 rounded-lg">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle>Currencies Management</CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Manage currencies with automatic AED detection for UAE projects
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchCurrencies}
                disabled={loading}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              {guard.hasAccess('settings.currencies') && (
                <Button
                  onClick={() => {
                    resetForm()
                    setShowForm(true)
                  }}
                  disabled={loading}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Currency
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

          {/* Form */}
          {showForm && (
            <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  {editingCurrency ? 'Edit Currency' : 'Add New Currency'}
                </h3>
                <button
                  onClick={resetForm}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Currency Code *
                    </label>
                    <Input
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="e.g., AED, USD, SAR"
                      maxLength={3}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">3 characters only (ISO 4217)</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Currency Name *
                    </label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., UAE Dirham"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Symbol *
                    </label>
                    <Input
                      value={formData.symbol}
                      onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                      placeholder="e.g., د.إ, $, ر.س"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Exchange Rate (vs AED) *
                    </label>
                    <Input
                      type="number"
                      step="0.000001"
                      value={formData.exchange_rate}
                      onChange={(e) => setFormData({ ...formData, exchange_rate: e.target.value })}
                      placeholder="e.g., 1.0 for AED, 0.27 for USD"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">How many of this currency = 1 AED</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_default"
                    checked={formData.is_default}
                    onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="is_default" className="text-sm font-medium">
                    Set as default currency
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
                    {editingCurrency ? 'Update' : 'Add'} Currency
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Currencies List */}
          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : currencies.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                No currencies found. Add your first currency!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currencies.map((currency) => (
                <div
                  key={currency.id}
                  className={`p-4 border rounded-lg transition-colors ${
                    currency.is_default 
                      ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' 
                      : 'border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-500'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {currency.name}
                        </h4>
                        <span className="px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900 
                                       text-green-800 dark:text-green-200 rounded">
                          {currency.code}
                        </span>
                        {currency.is_default && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 dark:bg-yellow-900 
                                         text-yellow-800 dark:text-yellow-200 rounded flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                        {currency.symbol}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        1 AED = {currency.exchange_rate} {currency.code}
                      </p>
                      {currency.usage_count !== undefined && currency.usage_count > 0 && (
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                          Used in {currency.usage_count} project{currency.usage_count !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 ml-2">
                      {!currency.is_default && guard.hasAccess('settings.currencies') && (
                        <button
                          onClick={() => handleSetDefault(currency)}
                          className="p-2 hover:bg-yellow-50 dark:hover:bg-yellow-900/30 rounded-lg transition-colors"
                          title="Set as Default"
                        >
                          <StarOff className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                        </button>
                      )}
                      {guard.hasAccess('settings.currencies') && (
                        <button
                          onClick={() => handleEdit(currency)}
                          className="p-2 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </button>
                      )}
                      {!currency.is_default && guard.hasAccess('settings.currencies') && (
                        <button
                          onClick={() => handleDelete(currency)}
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
          )}
        </CardContent>
      </Card>

      {/* Export/Import Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-600" />
            Export / Import Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Export Section */}
            <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Download className="w-5 h-5 text-green-600" /> Export Data
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Export your currencies data in various formats
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as 'json' | 'csv' | 'excel')}
                  className="px-3 py-2 border rounded-md dark:bg-gray-700 dark:text-white"
                >
                  <option value="json">JSON</option>
                  <option value="csv">CSV</option>
                  <option value="excel">Excel (CSV)</option>
                </select>
                <Button
                  onClick={handleExport}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Currencies
                </Button>
              </div>
            </div>

            {/* Import Section */}
            <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" /> Import Data
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Import currencies data from JSON or CSV files
              </p>
              <div className="space-y-4">
                <Input
                  type="file"
                  accept=".json,.csv"
                  onChange={handleFileChange}
                  className="flex-grow"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleImportPreview}
                    disabled={loading || !importFile}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Preview Import
                  </Button>
                  {importFile && (
                    <Button
                      onClick={() => {
                        setImportFile(null)
                        setImportPreview(null)
                        setShowImportPreview(false)
                      }}
                      variant="outline"
                      className="text-gray-600 hover:text-gray-800"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Clear
                    </Button>
                  )}
                </div>

                {/* Import Preview */}
                {showImportPreview && importPreview && (
                  <div className="mt-4 p-3 border rounded-lg bg-white dark:bg-gray-700">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Import Preview ({importPreview.length} records)
                    </h4>
                    <div className="max-h-60 overflow-y-auto text-sm text-gray-700 dark:text-gray-300">
                      <pre className="whitespace-pre-wrap break-all p-2 bg-gray-100 dark:bg-gray-800 rounded-md">
                        {JSON.stringify(importPreview.slice(0, 3), null, 2)}
                        {importPreview.length > 3 && '\n... (showing first 3 records)'}
                      </pre>
                    </div>
                    <div className="flex justify-end gap-2 mt-3">
                      <Button
                        variant="outline"
                        onClick={() => setShowImportPreview(false)}
                        className="text-gray-600 hover:text-gray-800"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                      <Button
                        onClick={handleImportConfirm}
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Confirm Import
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
