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
  StarOff
} from 'lucide-react'

export function CurrenciesManager() {
  const guard = usePermissionGuard()
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null)
  
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
    </div>
  )
}
