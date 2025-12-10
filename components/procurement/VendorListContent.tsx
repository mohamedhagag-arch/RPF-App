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
  Building2,
  Search,
  Plus,
  Edit,
  Trash2,
  Download,
  Upload,
  Phone,
  Mail,
  FileSpreadsheet,
  CheckSquare,
  Square,
  Star,
} from 'lucide-react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { useSmartLoading } from '@/lib/smartLoadingManager'
import { ImportButton } from '@/components/ui/ImportButton'
import { useAuth } from '@/app/providers'
import { downloadTemplate, downloadCSV, downloadExcel } from '@/lib/exportImportUtils'

interface Vendor {
  id: string
  name: string
  code?: string
  contact_person?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  country?: string
  tax_id?: string
  status?: string
  notes?: string
  // New fields from CSV (ratings are 0-5)
  prices_rate?: number | string // Rating 0-5
  delivery?: number | string // Rating 0-5
  quality?: number | string // Rating 0-5
  facility?: number | string // Rating 0-5
  capacity?: number | string // Rating 0-5
  total_rate?: number | string
  category?: string
  date?: string
  created_at: string
  updated_at: string
}

// Star Rating Component
function StarRating({ rating, maxStars = 5, size = 'sm' }: { rating: number | string | null | undefined; maxStars?: number; size?: 'sm' | 'md' | 'lg' }) {
  const numRating = typeof rating === 'string' ? parseFloat(rating) : (rating || 0)
  const validRating = Math.max(0, Math.min(maxStars, numRating))
  const filledStars = Math.floor(validRating)
  const hasHalfStar = validRating % 1 >= 0.5
  
  const starSize = size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-5 w-5'
  
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: maxStars }).map((_, index) => {
        if (index < filledStars) {
          return <Star key={index} className={`${starSize} fill-yellow-400 text-yellow-400`} />
        } else if (index === filledStars && hasHalfStar) {
          return <Star key={index} className={`${starSize} fill-yellow-400/50 text-yellow-400`} />
        } else {
          return <Star key={index} className={`${starSize} text-gray-300 dark:text-gray-600`} />
        }
      })}
      <span className="ml-1 text-xs text-gray-600 dark:text-gray-400">{validRating.toFixed(1)}</span>
    </div>
  )
}

export default function VendorListContent() {
  const guard = usePermissionGuard()
  const { appUser } = useAuth()
  const supabase = createClientComponentClient({} as any)
  const { startSmartLoading, stopSmartLoading } = useSmartLoading('vendor-list')
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [selectedVendors, setSelectedVendors] = useState<Set<string>>(new Set())
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: '',
    tax_id: '',
    status: 'active',
    notes: '',
    prices_rate: '',
    delivery: '',
    quality: '',
    facility: '',
    capacity: '',
    total_rate: '',
    category: '',
    date: ''
  })

  useEffect(() => {
    loadVendors()
  }, [])

  const loadVendors = async () => {
    try {
      setLoading(true)
      setError('')
      
      const { data, error: fetchError } = await supabase
        .from('vendors')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) {
        console.error('Supabase Error:', fetchError)
        if (fetchError.code === 'PGRST116' || fetchError.message.includes('does not exist')) {
          console.log('Vendors table does not exist yet. Please create it in the database.')
          setError('Table does not exist. Please run: Database/create-procurement-tables-complete.sql')
          setVendors([])
          return
        }
        // Check for RLS/permission errors
        if (fetchError.code === '42501' || fetchError.message.includes('permission denied') || fetchError.message.includes('RLS')) {
          console.error('RLS/Permission error:', fetchError)
          setError('Permission denied. Please run: Database/fix-procurement-items-access.sql in Supabase SQL Editor to disable RLS.')
          setVendors([])
          return
        }
        throw fetchError
      }

      setVendors(data || [])
    } catch (error: any) {
      console.error('Error loading vendors:', error)
      setError('Failed to load vendors. Please ensure the vendors table exists in the database.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this vendor?')) return

    try {
      startSmartLoading(setLoading)
      const { error: deleteError } = await supabase
        .from('vendors')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      await loadVendors()
      setSelectedVendors(new Set())
    } catch (error: any) {
      console.error('Error deleting vendor:', error)
      setError('Failed to delete vendor')
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedVendors.size === 0) {
      setError('Please select at least one vendor to delete')
      return
    }

    if (!confirm(`Are you sure you want to delete ${selectedVendors.size} vendor(s)?`)) {
      return
    }

    try {
      startSmartLoading(setLoading)
      setError('')
      setSuccess('')

      const vendorIds = Array.from(selectedVendors)
      const { error: deleteError } = await supabase
        .from('vendors')
        .delete()
        .in('id', vendorIds)

      if (deleteError) throw deleteError

      setSuccess(`Successfully deleted ${selectedVendors.size} vendor(s)`)
      setSelectedVendors(new Set())
      await loadVendors()
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      console.error('Error deleting vendors:', error)
      setError('Failed to delete vendors')
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedVendors(new Set(filteredVendors.map(v => v.id)))
    } else {
      setSelectedVendors(new Set())
    }
  }

  const handleSelectVendor = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedVendors)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedVendors(newSelected)
  }

  const handleDownloadTemplate = async () => {
    try {
      const templateColumns = [
        'Vendor Name',
        'S/N',
        'Prices Rate', // Rating 0-5
        'Delivery', // Rating 0-5
        'Quality', // Rating 0-5
        'Facility', // Rating 0-5
        'Capacity', // Rating 0-5
        'Category',
        'Date',
        'Contact Person',
        'Email',
        'Phone',
        'Address',
        'City',
        'Country',
        'Tax ID',
        'Status',
        'Notes'
      ]
      await downloadTemplate('vendors_template', templateColumns, 'excel')
    } catch (error) {
      console.error('Error downloading template:', error)
      setError('Failed to download template')
    }
  }

  const handleExport = async (format: 'csv' | 'excel' = 'excel') => {
    try {
      if (filteredVendors.length === 0) {
        setError('No vendors to export')
        return
      }

      startSmartLoading(setLoading)
      setError('')
      setSuccess('')

      // Prepare export data with proper column names
      const exportData = filteredVendors.map(vendor => ({
        'S/N': vendor.code || '',
        'Vendor Name': vendor.name || '',
        'Prices Rate': vendor.prices_rate !== null && vendor.prices_rate !== undefined ? (typeof vendor.prices_rate === 'number' ? vendor.prices_rate : parseFloat(vendor.prices_rate.toString())) : '',
        'Delivery': vendor.delivery !== null && vendor.delivery !== undefined ? (typeof vendor.delivery === 'number' ? vendor.delivery : parseFloat(vendor.delivery.toString())) : '',
        'Quality': vendor.quality !== null && vendor.quality !== undefined ? (typeof vendor.quality === 'number' ? vendor.quality : parseFloat(vendor.quality.toString())) : '',
        'Facility': vendor.facility !== null && vendor.facility !== undefined ? (typeof vendor.facility === 'number' ? vendor.facility : parseFloat(vendor.facility.toString())) : '',
        'Capacity': vendor.capacity !== null && vendor.capacity !== undefined ? (typeof vendor.capacity === 'number' ? vendor.capacity : parseFloat(vendor.capacity.toString())) : '',
        'Total Rate': vendor.total_rate !== null && vendor.total_rate !== undefined ? (typeof vendor.total_rate === 'number' ? vendor.total_rate.toFixed(2) : parseFloat(vendor.total_rate.toString()).toFixed(2)) : '',
        'Category': vendor.category || '',
        'Date': vendor.date || '',
        'Contact Person': vendor.contact_person || '',
        'Email': vendor.email || '',
        'Phone': vendor.phone || '',
        'Address': vendor.address || '',
        'City': vendor.city || '',
        'Country': vendor.country || '',
        'Tax ID': vendor.tax_id || '',
        'Status': vendor.status || 'active',
        'Notes': vendor.notes || ''
      }))

      const filename = `vendors_export_${new Date().toISOString().split('T')[0]}`

      if (format === 'csv') {
        downloadCSV(exportData, filename)
      } else {
        await downloadExcel(exportData, filename, 'Vendors')
      }

      setSuccess(`Successfully exported ${exportData.length} vendor(s) as ${format.toUpperCase()}`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      console.error('Error exporting vendors:', error)
      setError('Failed to export vendors')
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  const handleSave = async () => {
    try {
      if (!formData.name.trim()) {
        setError('Vendor name is required')
        return
      }

      startSmartLoading(setLoading)
      setError('')
      setSuccess('')

      // Calculate total_rate as average of all ratings (0-5)
      const pricesRate = formData.prices_rate ? Math.max(0, Math.min(5, parseFloat(formData.prices_rate.toString()))) : 0
      const delivery = formData.delivery ? Math.max(0, Math.min(5, parseFloat(formData.delivery.toString()))) : 0
      const quality = formData.quality ? Math.max(0, Math.min(5, parseFloat(formData.quality.toString()))) : 0
      const facility = formData.facility ? Math.max(0, Math.min(5, parseFloat(formData.facility.toString()))) : 0
      const capacity = formData.capacity ? Math.max(0, Math.min(5, parseFloat(formData.capacity.toString()))) : 0
      
      // Calculate average (sum / 5)
      const sum = pricesRate + delivery + quality + facility + capacity
      const totalRate = sum / 5 // Average rating (0-5)

      const vendorData: any = {
        name: formData.name.trim(),
        code: formData.code || null,
        contact_person: formData.contact_person || null,
        email: formData.email || null,
        phone: formData.phone || null,
        address: formData.address || null,
        city: formData.city || null,
        country: formData.country || null,
        tax_id: formData.tax_id || null,
        status: formData.status || 'active',
        notes: formData.notes || null,
        prices_rate: pricesRate || null,
        delivery: delivery || null,
        quality: quality || null,
        facility: facility || null,
        capacity: capacity || null,
        total_rate: totalRate > 0 ? Math.max(0, Math.min(5, totalRate)) : null,
        category: formData.category || null,
        date: formData.date || null
      }

      if (editingVendor) {
        // Update existing vendor
        const { error: updateError } = await supabase
          .from('vendors')
          .update(vendorData)
          .eq('id', editingVendor.id)

        if (updateError) throw updateError
        setSuccess('Vendor updated successfully')
      } else {
        // Create new vendor
        const { error: insertError } = await supabase
          .from('vendors')
          .insert([vendorData])

        if (insertError) throw insertError
        setSuccess('Vendor added successfully')
      }

      await loadVendors()
      setShowForm(false)
      setEditingVendor(null)
      setFormData({
        name: '',
        code: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        country: '',
        tax_id: '',
        status: 'active',
        notes: '',
        prices_rate: '',
        delivery: '',
        quality: '',
        facility: '',
        capacity: '',
        total_rate: '',
        category: '',
        date: ''
      })
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      console.error('Error saving vendor:', error)
      setError(error.message || 'Failed to save vendor')
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  // Calculate total_rate automatically when ratings change (average of all ratings)
  useEffect(() => {
    if (showForm) {
      const pricesRate = formData.prices_rate ? parseFloat(formData.prices_rate.toString()) || 0 : 0
      const delivery = formData.delivery ? parseFloat(formData.delivery.toString()) || 0 : 0
      const quality = formData.quality ? parseFloat(formData.quality.toString()) || 0 : 0
      const facility = formData.facility ? parseFloat(formData.facility.toString()) || 0 : 0
      const capacity = formData.capacity ? parseFloat(formData.capacity.toString()) || 0 : 0
      
      // Calculate average (sum / 5)
      const sum = pricesRate + delivery + quality + facility + capacity
      const totalRate = sum / 5 // Average rating (0-5)
      
      setFormData(prev => ({
        ...prev,
        total_rate: totalRate > 0 ? Math.max(0, Math.min(5, totalRate)).toFixed(2) : ''
      }))
    }
  }, [formData.prices_rate, formData.delivery, formData.quality, formData.facility, formData.capacity, showForm])

  // Initialize form data when editing
  useEffect(() => {
    if (editingVendor) {
      const pricesRate = editingVendor.prices_rate ? parseFloat(editingVendor.prices_rate.toString()) || 0 : 0
      const delivery = editingVendor.delivery ? parseFloat(editingVendor.delivery.toString()) || 0 : 0
      const quality = editingVendor.quality ? parseFloat(editingVendor.quality.toString()) || 0 : 0
      const facility = editingVendor.facility ? parseFloat(editingVendor.facility.toString()) || 0 : 0
      const capacity = editingVendor.capacity ? parseFloat(editingVendor.capacity.toString()) || 0 : 0
      
      // Calculate average (sum / 5)
      const sum = pricesRate + delivery + quality + facility + capacity
      const totalRate = sum / 5 // Average rating (0-5)

      setFormData({
        name: editingVendor.name || '',
        code: editingVendor.code || '',
        contact_person: editingVendor.contact_person || '',
        email: editingVendor.email || '',
        phone: editingVendor.phone || '',
        address: editingVendor.address || '',
        city: editingVendor.city || '',
        country: editingVendor.country || '',
        tax_id: editingVendor.tax_id || '',
        status: editingVendor.status || 'active',
        notes: editingVendor.notes || '',
        prices_rate: editingVendor.prices_rate?.toString() || '',
        delivery: editingVendor.delivery?.toString() || '',
        quality: editingVendor.quality?.toString() || '',
        facility: editingVendor.facility?.toString() || '',
        capacity: editingVendor.capacity?.toString() || '',
        total_rate: totalRate > 0 ? Math.max(0, Math.min(5, totalRate)).toFixed(2) : '',
        category: editingVendor.category || '',
        date: editingVendor.date || ''
      })
    } else if (showForm) {
      setFormData({
        name: '',
        code: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        country: '',
        tax_id: '',
        status: 'active',
        notes: '',
        prices_rate: '',
        delivery: '',
        quality: '',
        facility: '',
        capacity: '',
        total_rate: '',
        category: '',
        date: ''
      })
    }
  }, [editingVendor, showForm])

  const handleImport = async (data: any[]) => {
    try {
      startSmartLoading(setLoading)
      setError('')
      setSuccess('')

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

      // Clean data - remove id, created_at, updated_at if present
      const cleanData = data.map(row => {
        const cleanRow: any = {}
        
        // Get vendor name (support multiple variations)
        const name = getValue(row, [
          'Vendor Name',
          'vendor name',
          'VENDOR NAME',
          'Vendor_Name',
          'vendor_name',
          'name',
          'Name',
          'NAME'
        ])
        if (name) cleanRow.name = String(name).trim()
        
        // Get other fields
        const code = getValue(row, ['code', 'Code', 'CODE', 'S/N', 'S_N', 'sn'])
        if (code) cleanRow.code = String(code).trim()
        
        const contactPerson = getValue(row, ['Contact Person', 'contact person', 'contact_person', 'Contact_Person'])
        if (contactPerson) cleanRow.contact_person = String(contactPerson).trim()
        
        const email = getValue(row, ['email', 'Email', 'EMAIL'])
        if (email) cleanRow.email = String(email).trim()
        
        const phone = getValue(row, ['phone', 'Phone', 'PHONE', 'telephone', 'Telephone'])
        if (phone) cleanRow.phone = String(phone).trim()
        
        const address = getValue(row, ['address', 'Address', 'ADDRESS'])
        if (address) cleanRow.address = String(address).trim()
        
        const city = getValue(row, ['city', 'City', 'CITY'])
        if (city) cleanRow.city = String(city).trim()
        
        const country = getValue(row, ['country', 'Country', 'COUNTRY'])
        if (country) cleanRow.country = String(country).trim()
        
        const taxId = getValue(row, ['Tax ID', 'tax id', 'tax_id', 'Tax_ID', 'TAX_ID'])
        if (taxId) cleanRow.tax_id = String(taxId).trim()
        
        const status = getValue(row, ['status', 'Status', 'STATUS'])
        if (status) cleanRow.status = String(status).trim()
        
        const notes = getValue(row, ['notes', 'Notes', 'NOTES', 'note', 'Note'])
        if (notes) cleanRow.notes = String(notes).trim()
        
        // Prices Rate (Rating 0-5)
        const pricesRateVal = getValue(row, [
          'Prices Rate',
          'prices rate',
          'PRICES RATE',
          'Prices_Rate',
          'prices_rate',
          'Price Rate',
          'price rate'
        ])
        if (pricesRateVal !== null) {
          const num = typeof pricesRateVal === 'string' 
            ? parseFloat(pricesRateVal.replace(/[^\d.-]/g, '')) 
            : parseFloat(String(pricesRateVal))
          if (!isNaN(num)) {
            cleanRow.prices_rate = Math.max(0, Math.min(5, num)) // Clamp between 0-5
          }
        }
        
        // Delivery (Rating 0-5)
        const deliveryVal = getValue(row, ['Delivery', 'delivery', 'DELIVERY'])
        if (deliveryVal !== null) {
          const num = typeof deliveryVal === 'string' 
            ? parseFloat(deliveryVal.replace(/[^\d.-]/g, '')) 
            : parseFloat(String(deliveryVal))
          if (!isNaN(num)) {
            cleanRow.delivery = Math.max(0, Math.min(5, num)) // Clamp between 0-5
          }
        }
        
        // Quality (Rating 0-5)
        const qualityVal = getValue(row, ['Quality', 'quality', 'QUALITY'])
        if (qualityVal !== null) {
          const num = typeof qualityVal === 'string' 
            ? parseFloat(qualityVal.replace(/[^\d.-]/g, '')) 
            : parseFloat(String(qualityVal))
          if (!isNaN(num)) {
            cleanRow.quality = Math.max(0, Math.min(5, num)) // Clamp between 0-5
          }
        }
        
        // Facility (Rating 0-5)
        const facilityVal = getValue(row, ['Facility', 'facility', 'FACILITY'])
        if (facilityVal !== null) {
          const num = typeof facilityVal === 'string' 
            ? parseFloat(facilityVal.replace(/[^\d.-]/g, '')) 
            : parseFloat(String(facilityVal))
          if (!isNaN(num)) {
            cleanRow.facility = Math.max(0, Math.min(5, num)) // Clamp between 0-5
          }
        }
        
        // Capacity (Rating 0-5)
        const capacityVal = getValue(row, ['Capacity', 'capacity', 'CAPACITY'])
        if (capacityVal !== null) {
          const num = typeof capacityVal === 'string' 
            ? parseFloat(capacityVal.replace(/[^\d.-]/g, '')) 
            : parseFloat(String(capacityVal))
          if (!isNaN(num)) {
            cleanRow.capacity = Math.max(0, Math.min(5, num)) // Clamp between 0-5
          }
        }
        
        // Calculate Total Rate as average of all ratings (0-5)
        const pricesRateNum = cleanRow.prices_rate || 0
        const deliveryNum = cleanRow.delivery || 0
        const qualityNum = cleanRow.quality || 0
        const facilityNum = cleanRow.facility || 0
        const capacityNum = cleanRow.capacity || 0
        
        // Calculate average (sum / 5)
        const sum = pricesRateNum + deliveryNum + qualityNum + facilityNum + capacityNum
        const totalRate = sum / 5 // Average rating (0-5)
        
        if (totalRate > 0) {
          cleanRow.total_rate = Math.max(0, Math.min(5, totalRate))
        }
        
        // Category
        const category = getValue(row, ['Category', 'category', 'CATEGORY'])
        if (category) cleanRow.category = String(category).trim()
        
        // Date
        const date = getValue(row, ['Date', 'date', 'DATE'])
        if (date) cleanRow.date = String(date).trim()
        
        return cleanRow
      }).filter(row => row.name && row.name.trim() !== '') // Only include rows with name

      if (cleanData.length === 0) {
        throw new Error('No valid data found. Please ensure the file contains at least a "name" column.')
      }

      // Insert data in batches
      const batchSize = 50
      let imported = 0
      let errors = 0

      for (let i = 0; i < cleanData.length; i += batchSize) {
        const batch = cleanData.slice(i, i + batchSize)
        const { error: insertError } = await supabase
          .from('vendors')
          .insert(batch)

        if (insertError) {
          console.error('Error inserting batch:', insertError)
          errors += batch.length
        } else {
          imported += batch.length
        }
      }

      await loadVendors()
      setSuccess(`Successfully imported ${imported} vendor(s)${errors > 0 ? `. ${errors} failed.` : ''}`)
      setTimeout(() => setSuccess(''), 5000)
    } catch (error: any) {
      console.error('Error importing vendors:', error)
      setError(error.message || 'Failed to import vendors')
    } finally {
      stopSmartLoading(setLoading)
    }
  }

  const getFilteredVendors = () => {
    if (!searchTerm) return vendors

    const term = searchTerm.toLowerCase()
    return vendors.filter(vendor =>
      vendor.name?.toLowerCase().includes(term) ||
      vendor.code?.toLowerCase().includes(term) ||
      vendor.contact_person?.toLowerCase().includes(term) ||
      vendor.email?.toLowerCase().includes(term) ||
      vendor.phone?.toLowerCase().includes(term) ||
      vendor.city?.toLowerCase().includes(term)
    )
  }

  const filteredVendors = getFilteredVendors()

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-end">
        <PermissionButton
          permission="procurement.vendor_list.create"
          onClick={() => setShowForm(true)}
          variant="primary"
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Vendor
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
                placeholder="Search vendors by name, code, contact, email, phone, or city..."
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

      {/* Bulk Actions Toolbar */}
      {selectedVendors.size > 0 && (
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  {selectedVendors.size} vendor(s) selected
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedVendors(new Set())}
                  className="text-gray-600 dark:text-gray-300"
                >
                  Clear Selection
                </Button>
              </div>
              {guard.hasAccess('procurement.vendor_list.delete') && (
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

      {/* Vendors Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Vendors ({filteredVendors.length})</span>
            <div className="flex items-center gap-2">
              {guard.hasAccess('procurement.vendor_list.import') && (
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
                permission="procurement.vendor_list.export"
                onClick={() => handleExport('excel')}
                variant="ghost"
                size="sm"
                title="Export to Excel"
              >
                <Download className="h-4 w-4" />
              </PermissionButton>
              {guard.hasAccess('procurement.vendor_list.import') && (
                <ImportButton
                  onImport={handleImport}
                  requiredColumns={['name']}
                  templateName="vendors_template"
                  templateColumns={['name', 'code', 'contact_person', 'email', 'phone', 'address', 'city', 'country', 'tax_id', 'status', 'notes', 'prices_rate', 'delivery', 'quality', 'facility', 'capacity', 'total_rate', 'category', 'date']}
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
          ) : filteredVendors.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {vendors.length === 0 ? 'No Vendors Found' : 'No Vendors Match Your Search'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {vendors.length === 0 
                  ? 'Get started by adding your first vendor. You may need to create the vendors table in your database first.'
                  : 'Try adjusting your search terms.'}
              </p>
              {vendors.length === 0 && (
                <PermissionButton
                  permission="procurement.vendor_list.create"
                  onClick={() => setShowForm(true)}
                  variant="primary"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Vendor
                </PermissionButton>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300 w-12">
                      {guard.hasAccess('procurement.vendor_list.delete') && (
                        <button
                          onClick={() => handleSelectAll(selectedVendors.size !== filteredVendors.length)}
                          className="flex items-center justify-center"
                          title={selectedVendors.size === filteredVendors.length ? 'Deselect all' : 'Select all'}
                        >
                          {selectedVendors.size === filteredVendors.length && filteredVendors.length > 0 ? (
                            <CheckSquare className="h-5 w-5 text-blue-600" />
                          ) : (
                            <Square className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                      )}
                    </th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Name</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Code</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Category</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Prices Rate</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Total Rate</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Delivery</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Quality</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Facility</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Capacity</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Contact Person</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Phone</th>
                    <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">Status</th>
                    <th className="text-right p-3 font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVendors.map((vendor) => (
                    <tr
                      key={vendor.id}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="p-3 w-12">
                        {guard.hasAccess('procurement.vendor_list.delete') && (
                          <button
                            onClick={() => handleSelectVendor(vendor.id, !selectedVendors.has(vendor.id))}
                            className="flex items-center justify-center"
                          >
                            {selectedVendors.has(vendor.id) ? (
                              <CheckSquare className="h-5 w-5 text-blue-600" />
                            ) : (
                              <Square className="h-5 w-5 text-gray-400" />
                            )}
                          </button>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {vendor.name}
                        </div>
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {vendor.code || '-'}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {vendor.category || '-'}
                      </td>
                      <td className="p-3">
                        {vendor.prices_rate !== null && vendor.prices_rate !== undefined ? (
                          <StarRating rating={vendor.prices_rate} size="sm" />
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        {vendor.total_rate !== null && vendor.total_rate !== undefined ? (
                          <div className="flex items-center gap-2">
                            <StarRating rating={vendor.total_rate} size="sm" />
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              ({(typeof vendor.total_rate === 'number' ? vendor.total_rate : parseFloat(vendor.total_rate.toString())).toFixed(2)})
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        {vendor.delivery !== null && vendor.delivery !== undefined ? (
                          <StarRating rating={vendor.delivery} size="sm" />
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        {vendor.quality !== null && vendor.quality !== undefined ? (
                          <StarRating rating={vendor.quality} size="sm" />
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        {vendor.facility !== null && vendor.facility !== undefined ? (
                          <StarRating rating={vendor.facility} size="sm" />
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        {vendor.capacity !== null && vendor.capacity !== undefined ? (
                          <StarRating rating={vendor.capacity} size="sm" />
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {vendor.contact_person || '-'}
                      </td>
                      <td className="p-3">
                        {vendor.phone ? (
                          <a
                            href={`tel:${vendor.phone}`}
                            className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                          >
                            <Phone className="h-3 w-3" />
                            {vendor.phone}
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            vendor.status === 'active' || !vendor.status
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                          }`}
                        >
                          {vendor.status || 'active'}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-2">
                          <PermissionButton
                            permission="procurement.vendor_list.edit"
                            onClick={() => {
                              setEditingVendor(vendor)
                              setShowForm(true)
                            }}
                            variant="ghost"
                            size="sm"
                          >
                            <Edit className="h-4 w-4" />
                          </PermissionButton>
                          <PermissionButton
                            permission="procurement.vendor_list.delete"
                            onClick={() => handleDelete(vendor.id)}
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

      {/* Vendor Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
            <CardHeader>
              <CardTitle>
                {editingVendor ? 'Edit Vendor' : 'Add New Vendor'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Basic Information */}
                  <div className="md:col-span-2">
                    <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Basic Information</h3>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Vendor Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter vendor name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Code
                    </label>
                    <Input
                      value={formData.code}
                      onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                      placeholder="Vendor code"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Category
                    </label>
                    <Input
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      placeholder="Category"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  {/* Pricing Information */}
                  <div className="md:col-span-2 mt-4">
                    <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Pricing Information</h3>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Prices Rate (0-5) ⭐
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="5"
                      step="0.1"
                      value={formData.prices_rate}
                      onChange={(e) => {
                        const val = e.target.value
                        if (val === '' || (parseFloat(val) >= 0 && parseFloat(val) <= 5)) {
                          setFormData(prev => ({ ...prev, prices_rate: val }))
                        }
                      }}
                      placeholder="0-5"
                    />
                    {formData.prices_rate && (
                      <div className="mt-2">
                        <StarRating rating={formData.prices_rate} size="sm" />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Total Rate (Auto-calculated)
                    </label>
                    <Input
                      type="text"
                      value={formData.total_rate || '0.0'}
                      readOnly
                      disabled
                      className="bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
                      placeholder="Sum of all ratings"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Average of: (Prices Rate + Delivery + Quality + Facility + Capacity) / 5
                    </p>
                  </div>

                  {/* Quality & Performance */}
                  <div className="md:col-span-2 mt-4">
                    <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Quality & Performance</h3>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Delivery (0-5) ⭐
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="5"
                      step="0.1"
                      value={formData.delivery}
                      onChange={(e) => {
                        const val = e.target.value
                        if (val === '' || (parseFloat(val) >= 0 && parseFloat(val) <= 5)) {
                          setFormData(prev => ({ ...prev, delivery: val }))
                        }
                      }}
                      placeholder="0-5"
                    />
                    {formData.delivery && (
                      <div className="mt-2">
                        <StarRating rating={formData.delivery} size="sm" />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Quality (0-5) ⭐
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="5"
                      step="0.1"
                      value={formData.quality}
                      onChange={(e) => {
                        const val = e.target.value
                        if (val === '' || (parseFloat(val) >= 0 && parseFloat(val) <= 5)) {
                          setFormData(prev => ({ ...prev, quality: val }))
                        }
                      }}
                      placeholder="0-5"
                    />
                    {formData.quality && (
                      <div className="mt-2">
                        <StarRating rating={formData.quality} size="sm" />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Facility (0-5) ⭐
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="5"
                      step="0.1"
                      value={formData.facility}
                      onChange={(e) => {
                        const val = e.target.value
                        if (val === '' || (parseFloat(val) >= 0 && parseFloat(val) <= 5)) {
                          setFormData(prev => ({ ...prev, facility: val }))
                        }
                      }}
                      placeholder="0-5"
                    />
                    {formData.facility && (
                      <div className="mt-2">
                        <StarRating rating={formData.facility} size="sm" />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Capacity (0-5) ⭐
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="5"
                      step="0.1"
                      value={formData.capacity}
                      onChange={(e) => {
                        const val = e.target.value
                        if (val === '' || (parseFloat(val) >= 0 && parseFloat(val) <= 5)) {
                          setFormData(prev => ({ ...prev, capacity: val }))
                        }
                      }}
                      placeholder="0-5"
                    />
                    {formData.capacity && (
                      <div className="mt-2">
                        <StarRating rating={formData.capacity} size="sm" />
                      </div>
                    )}
                  </div>

                  {/* Contact Information */}
                  <div className="md:col-span-2 mt-4">
                    <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Contact Information</h3>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Contact Person
                    </label>
                    <Input
                      value={formData.contact_person}
                      onChange={(e) => setFormData(prev => ({ ...prev, contact_person: e.target.value }))}
                      placeholder="Contact person name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Email
                    </label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="vendor@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Phone
                    </label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Phone number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Date
                    </label>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    />
                  </div>

                  {/* Address Information */}
                  <div className="md:col-span-2 mt-4">
                    <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Address Information</h3>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Address
                    </label>
                    <Input
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Street address"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      City
                    </label>
                    <Input
                      value={formData.city}
                      onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                      placeholder="City"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Country
                    </label>
                    <Input
                      value={formData.country}
                      onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                      placeholder="Country"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Tax ID
                    </label>
                    <Input
                      value={formData.tax_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, tax_id: e.target.value }))}
                      placeholder="Tax identification number"
                    />
                  </div>

                  {/* Notes */}
                  <div className="md:col-span-2 mt-4">
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Additional notes..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowForm(false)
                      setEditingVendor(null)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={loading || !formData.name.trim()}
                  >
                    {loading ? 'Saving...' : editingVendor ? 'Update' : 'Add'} Vendor
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

