'use client'

import React, { useState, useEffect } from 'react'
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Upload, 
  Download,
  Calculator,
  CheckCircle,
  XCircle,
  Loader2,
  FileSpreadsheet,
  History,
  Clock
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { PermissionButton } from '@/components/ui/PermissionButton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { supabase, TABLES, DesignationRate, DesignationDailyRateHistory } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useAuth } from '@/app/providers'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
import { usePermissionGuard } from '@/lib/permissionGuard'

export default function DesignationRates() {
  const { user, appUser } = useAuth()
  const guard = usePermissionGuard()
  const [rates, setRates] = useState<DesignationRate[]>([])
  const [dailyRateHistory, setDailyRateHistory] = useState<Map<string, DesignationDailyRateHistory[]>>(new Map())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAuthority, setSelectedAuthority] = useState<string>('all')
  
  // Daily Rate Modal state
  const [showDailyRateModal, setShowDailyRateModal] = useState(false)
  const [selectedRate, setSelectedRate] = useState<DesignationRate | null>(null)
  const [editingDailyRate, setEditingDailyRate] = useState<DesignationDailyRateHistory | null>(null)
  const [dailyRateFormData, setDailyRateFormData] = useState({
    hourly_rate: '',
    name: '',
    start_date: '',
    end_date: '',
    is_active: true
  })
  
  // Check permissions
  const canCreate = guard.hasAccess('cost_control.designation_rates.create')
  const canEdit = guard.hasAccess('cost_control.designation_rates.edit')
  const canDelete = guard.hasAccess('cost_control.designation_rates.delete')
  
  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingRate, setEditingRate] = useState<DesignationRate | null>(null)
  const [formData, setFormData] = useState({
    designation: '',
    hourly_rate: '',
    overtime_hourly_rate: '',
    off_day_hourly_rate: '',
    overhead_hourly_rate: '5.3', // Default value 5.3
    authority: 'General Authority'
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false)
  const [showDailyRateSection, setShowDailyRateSection] = useState(false)
  const [useCustomOvertime, setUseCustomOvertime] = useState(false)
  const [useCustomOffDay, setUseCustomOffDay] = useState(false)
  const [useCustomOverhead, setUseCustomOverhead] = useState(false)
  const [newRateDailyRateFormData, setNewRateDailyRateFormData] = useState({
    name: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    is_active: true
  })

  useEffect(() => {
    fetchRates()
    fetchDailyRateHistory()
  }, [])

  const fetchDailyRateHistory = async () => {
    try {
      const supabaseClient = getSupabaseClient()
      const { data, error } = await supabaseClient
        .from(TABLES.DESIGNATION_DAILY_RATE_HISTORY)
        // @ts-ignore
        .select('*')
        .order('start_date', { ascending: false })

      if (error) {
        // If table doesn't exist, just log and continue (table will be created by SQL script)
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('Daily rate history table does not exist yet. Please run the SQL script first.')
          setDailyRateHistory(new Map())
          return
        }
        console.error('Error fetching daily rate history:', error)
        return
      }

      // Group by designation_id
      const historyMap = new Map<string, DesignationDailyRateHistory[]>()
      if (data) {
        data.forEach((item: any) => {
          const designationId = item.designation_id
          if (!historyMap.has(designationId)) {
            historyMap.set(designationId, [])
          }
          historyMap.get(designationId)!.push(item as DesignationDailyRateHistory)
        })
      }
      setDailyRateHistory(historyMap)
    } catch (err: any) {
      console.error('Error fetching daily rate history:', err)
      // Don't show error to user if table doesn't exist yet
      if (err?.code !== '42P01' && !err?.message?.includes('does not exist')) {
        console.error('Unexpected error:', err)
      }
    }
  }

  const fetchRates = async () => {
    try {
      setLoading(true)
      setError('')
      
      const supabaseClient = getSupabaseClient()
      const { data, error } = await supabaseClient
        .from(TABLES.DESIGNATION_RATES)
        // @ts-ignore
        .select('*')
        .order('designation', { ascending: true })

      if (error) {
        // Provide more specific error messages
        if (error.code === '42501' || error.message.includes('permission denied')) {
          throw new Error('Permission denied. Please ensure the SQL script has been run in Supabase.')
        } else if (error.code === 'PGRST116') {
          throw new Error('Table not found. Please run the schema SQL script first.')
        }
        throw error
      }
      const ratesData = (data || []) as any[]
      
      // Update old records that have null overtime_hourly_rate, off_day_hourly_rate, or overhead_hourly_rate
      const ratesToUpdate = ratesData.filter(rate => 
        (rate.overtime_hourly_rate === null || rate.overtime_hourly_rate === undefined) ||
        (rate.off_day_hourly_rate === null || rate.off_day_hourly_rate === undefined) ||
        (rate.overhead_hourly_rate === null || rate.overhead_hourly_rate === undefined)
      )
      
      if (ratesToUpdate.length > 0) {
        console.log(`🔄 Found ${ratesToUpdate.length} rates with null values. Updating automatically...`)
        
        const supabaseClient = getSupabaseClient()
        const currentUserId = user?.id || appUser?.id
        
        // Update all rates in batch
        for (const rate of ratesToUpdate) {
          try {
            const updateData: any = {
              updated_by: currentUserId || null
            }
            
            // Update overtime_hourly_rate if null
            if (rate.overtime_hourly_rate === null || rate.overtime_hourly_rate === undefined) {
              updateData.overtime_hourly_rate = rate.hourly_rate
            }
            
            // Update off_day_hourly_rate if null (default is hourly_rate * 2)
            if (rate.off_day_hourly_rate === null || rate.off_day_hourly_rate === undefined) {
              updateData.off_day_hourly_rate = rate.hourly_rate * 2
            }
            
            // Update overhead_hourly_rate if null (default is 5.3)
            if (rate.overhead_hourly_rate === null || rate.overhead_hourly_rate === undefined) {
              updateData.overhead_hourly_rate = 5.3
            }
            
            const { error: updateError } = await supabaseClient
              .from(TABLES.DESIGNATION_RATES)
              // @ts-ignore
              .update(updateData)
              .eq('id', rate.id)
            
            if (updateError) {
              console.error(`Failed to update rate ${rate.id}:`, updateError)
            } else {
              // Update the local data
              if (rate.overtime_hourly_rate === null || rate.overtime_hourly_rate === undefined) {
                rate.overtime_hourly_rate = rate.hourly_rate
              }
              if (rate.off_day_hourly_rate === null || rate.off_day_hourly_rate === undefined) {
                rate.off_day_hourly_rate = rate.hourly_rate * 2
              }
              if (rate.overhead_hourly_rate === null || rate.overhead_hourly_rate === undefined) {
                rate.overhead_hourly_rate = 5.3
              }
              console.log(`✅ Updated rate ${rate.designation}: overtime=${rate.overtime_hourly_rate}, off_day=${rate.off_day_hourly_rate}, overhead=${rate.overhead_hourly_rate}`)
            }
          } catch (err) {
            console.error(`Error updating rate ${rate.id}:`, err)
          }
        }
        
        console.log('✅ Finished auto-updating rates')
      }
      
      setRates(ratesData)
      // Fetch daily rate history after rates are loaded
      await fetchDailyRateHistory()
    } catch (err: any) {
      console.error('Error fetching rates:', err)
      setError('Failed to load designation rates: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingRate(null)
    setFormData({
      designation: '',
      hourly_rate: '',
      overtime_hourly_rate: '',
      off_day_hourly_rate: '',
      overhead_hourly_rate: '5.3', // Default value 5.3
      authority: 'General Authority'
    })
    setFormErrors({})
    setAutoSaveEnabled(false)
    setShowDailyRateSection(false)
    setUseCustomOvertime(false)
    setUseCustomOffDay(false)
    setUseCustomOverhead(false)
    setNewRateDailyRateFormData({
      name: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      is_active: true
    })
    setShowModal(true)
  }

  // Validate form fields in real-time
  const validateField = (name: string, value: string) => {
    const errors: Record<string, string> = { ...formErrors }
    
    switch (name) {
      case 'designation':
        if (!value.trim()) {
          errors.designation = 'Designation is required'
        } else if (rates.some(r => r.designation.toLowerCase() === value.trim().toLowerCase() && r.id !== editingRate?.id)) {
          errors.designation = 'This designation already exists'
        } else {
          delete errors.designation
        }
        break
      case 'hourly_rate':
        if (!value || parseFloat(value) < 0) {
          errors.hourly_rate = 'Please enter a valid hourly rate (≥ 0)'
        } else {
          delete errors.hourly_rate
        }
        break
      case 'overtime_hourly_rate':
        if (value && parseFloat(value) < 0) {
          errors.overtime_hourly_rate = 'Overtime rate must be ≥ 0'
        } else {
          delete errors.overtime_hourly_rate
        }
        break
      case 'off_day_hourly_rate':
        if (value && parseFloat(value) < 0) {
          errors.off_day_hourly_rate = 'Off-day rate must be ≥ 0'
        } else {
          delete errors.off_day_hourly_rate
        }
        break
      case 'overhead_hourly_rate':
        if (value && parseFloat(value) < 0) {
          errors.overhead_hourly_rate = 'Overhead rate must be ≥ 0'
        } else {
          delete errors.overhead_hourly_rate
        }
        break
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleEdit = (rate: DesignationRate) => {
    setEditingRate(rate)
    // If overtime_hourly_rate is null or empty, use hourly_rate as default
    const overtimeRate = rate.overtime_hourly_rate?.toString() || rate.hourly_rate.toString()
    // If off_day_hourly_rate is null or empty, use hourly_rate * 2 as default
    const offDayRate = rate.off_day_hourly_rate?.toString() || (rate.hourly_rate * 2).toString()
    // If overhead_hourly_rate is null or empty, use default 5.3
    const overheadRate = rate.overhead_hourly_rate?.toString() || '5.3'
    
    // Check if overhead_hourly_rate is custom (not equal to default 5.3)
    const isOverheadCustom = rate.overhead_hourly_rate != null && rate.overhead_hourly_rate !== 5.3
    
    setFormData({
      designation: rate.designation,
      hourly_rate: rate.hourly_rate.toString(),
      overtime_hourly_rate: overtimeRate,
      off_day_hourly_rate: offDayRate,
      overhead_hourly_rate: overheadRate,
      authority: rate.authority || 'General Authority'
    })
    
    // Set custom flags based on whether values differ from defaults
    setUseCustomOvertime(rate.overtime_hourly_rate != null && rate.overtime_hourly_rate !== rate.hourly_rate)
    setUseCustomOffDay(rate.off_day_hourly_rate != null && rate.off_day_hourly_rate !== (rate.hourly_rate * 2))
    setUseCustomOverhead(isOverheadCustom)
    
    setShowModal(true)
  }

  const handleSave = async (saveDailyRateHistory: boolean = false) => {
    try {
      setError('')
      setSuccess('')
      setLoading(true)

      // Validate all fields
      const isDesignationValid = validateField('designation', formData.designation)
      const isHourlyRateValid = validateField('hourly_rate', formData.hourly_rate)
      const isOvertimeValid = validateField('overtime_hourly_rate', formData.overtime_hourly_rate)
      const isOffDayValid = validateField('off_day_hourly_rate', formData.off_day_hourly_rate)
      const isOverheadValid = validateField('overhead_hourly_rate', formData.overhead_hourly_rate)

      if (!isDesignationValid || !isHourlyRateValid || !isOvertimeValid || !isOffDayValid || !isOverheadValid) {
        setError('Please fix the errors in the form')
        setLoading(false)
        return
      }

      const currentUserId = user?.id || appUser?.id

      // Calculate overtime_hourly_rate based on custom setting
      // If not using custom, use hourly_rate (default)
      const overtimeRateValue = useCustomOvertime && formData.overtime_hourly_rate && formData.overtime_hourly_rate.trim() !== ''
        ? parseFloat(formData.overtime_hourly_rate)
        : parseFloat(formData.hourly_rate)

      // Calculate off_day_hourly_rate based on custom setting
      // If not using custom, use hourly_rate * 2 (default)
      const offDayRateValue = useCustomOffDay && formData.off_day_hourly_rate && formData.off_day_hourly_rate.trim() !== ''
        ? parseFloat(formData.off_day_hourly_rate)
        : parseFloat(formData.hourly_rate) * 2

      // Get overhead_hourly_rate based on custom setting
      // If not using custom, use default 5.3
      const overheadRateValue = useCustomOverhead && formData.overhead_hourly_rate && formData.overhead_hourly_rate.trim() !== ''
        ? parseFloat(formData.overhead_hourly_rate)
        : 5.3

      console.log('💾 Saving rates:', {
        hourly_rate: formData.hourly_rate,
        overtime_hourly_rate: overtimeRateValue,
        off_day_hourly_rate: offDayRateValue,
        overhead_hourly_rate: overheadRateValue
      })

      const rateData: any = {
        designation: formData.designation.trim(),
        hourly_rate: parseFloat(formData.hourly_rate),
        overtime_hourly_rate: overtimeRateValue, // Always save a value (never null)
        off_day_hourly_rate: offDayRateValue, // Always save a value (never null) - default is hourly_rate * 2
        overhead_hourly_rate: overheadRateValue, // Default: 5.3
        authority: formData.authority || 'General Authority'
      }

      console.log('💾 Rate data to save:', rateData)

      const supabaseClient = getSupabaseClient()
      let savedRateId: string | null = null
      
      if (editingRate) {
        rateData.updated_by = currentUserId || null
        const { data, error } = await supabaseClient
          .from(TABLES.DESIGNATION_RATES)
          // @ts-ignore
          .update(rateData)
          .eq('id', editingRate.id)
          .select()
          .single()

        if (error) throw error
        savedRateId = editingRate.id
        setSuccess('Designation rate updated successfully!')
      } else {
        rateData.created_by = currentUserId || null
        const { data, error } = await supabaseClient
          .from(TABLES.DESIGNATION_RATES)
          // @ts-ignore
          .insert([rateData])
          .select()
          .single()

        if (error) throw error
        savedRateId = (data as any)?.id || null
        setSuccess('Designation rate added successfully!')
      }

      // If user wants to save daily rate history, do it now
      if (saveDailyRateHistory && savedRateId && newRateDailyRateFormData.name.trim()) {
        const dailyRateData: any = {
          designation_id: savedRateId,
          name: newRateDailyRateFormData.name.trim(),
          hourly_rate: parseFloat(formData.hourly_rate),
          start_date: newRateDailyRateFormData.start_date,
          end_date: newRateDailyRateFormData.end_date || null,
          is_active: newRateDailyRateFormData.is_active,
          created_by: currentUserId || null
        }

        const { error: dailyRateError } = await supabaseClient
          .from(TABLES.DESIGNATION_DAILY_RATE_HISTORY)
          // @ts-ignore
          .insert([dailyRateData])
          .select()

        if (dailyRateError) {
          console.error('Failed to save daily rate history:', dailyRateError)
          // Don't fail the whole operation, just log it
        } else {
          setSuccess('Designation rate and daily rate history saved successfully!')
        }
      }

      setShowModal(false)
      await fetchRates()
      await fetchDailyRateHistory()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError('Failed to save rate: ' + (err?.message || 'Unknown error'))
      console.error('Error saving rate:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this designation rate?')) {
      return
    }

    try {
      setError('')
      setSuccess('')
      setLoading(true)

      const supabaseClient = getSupabaseClient()
      const { error } = await supabaseClient
        .from(TABLES.DESIGNATION_RATES)
        // @ts-ignore
        .delete()
        .eq('id', id)

      if (error) throw error

      setSuccess('Designation rate deleted successfully!')
      await fetchRates()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError('Failed to delete rate: ' + err.message)
      console.error('Error deleting rate:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setLoading(true)
      setError('')
      setSuccess('')

      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())

      const designationIndex = headers.findIndex(h => h.includes('designation'))
      const hourlyRateIndex = headers.findIndex(h => h.includes('hourly') && h.includes('rate') && !h.includes('overtime') && !h.includes('off'))
      const overtimeIndex = headers.findIndex(h => h.includes('overtime'))
      const offDayIndex = headers.findIndex(h => h.includes('off') && h.includes('day'))

      if (designationIndex === -1 || hourlyRateIndex === -1) {
        throw new Error('Invalid CSV format. Required columns: Designation, hourly Rate')
      }

      const currentUserId = user?.id || appUser?.id
      if (!currentUserId) {
        throw new Error('User not authenticated')
      }

      const ratesToImport: any[] = []
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim())
        const designation = values[designationIndex]
        const hourlyRate = parseFloat(values[hourlyRateIndex])

        if (!designation || isNaN(hourlyRate)) continue

        ratesToImport.push({
          designation,
          hourly_rate: hourlyRate,
          overtime_hourly_rate: overtimeIndex !== -1 && values[overtimeIndex] ? parseFloat(values[overtimeIndex]) : null,
          off_day_hourly_rate: offDayIndex !== -1 && values[offDayIndex] ? parseFloat(values[offDayIndex]) : null,
          authority: 'General Authority',
          created_by: currentUserId
        })
      }

      if (ratesToImport.length === 0) {
        throw new Error('No valid data found in CSV file')
      }

      const supabaseClient = getSupabaseClient()
      const { error } = await supabaseClient
        .from(TABLES.DESIGNATION_RATES)
        // @ts-ignore
        .upsert(ratesToImport, { onConflict: 'designation' })

      if (error) throw error

      setSuccess(`Successfully imported ${ratesToImport.length} designation rate(s)!`)
      await fetchRates()
      setTimeout(() => setSuccess(''), 5000)
    } catch (err: any) {
      setError('Failed to import: ' + err.message)
      console.error('Error importing:', err)
    } finally {
      setLoading(false)
      // Reset file input
      event.target.value = ''
    }
  }

  const handleExport = () => {
    const headers = ['Designation', 'hourly Rate', 'Overtime Hourly Rate', 'Off day hourly working rate', 'Authority']
    const csvContent = [
      headers.join(','),
      ...rates.map(rate => [
        rate.designation,
        rate.hourly_rate,
        (rate.overtime_hourly_rate || rate.hourly_rate).toString(),
        (rate.off_day_hourly_rate || rate.hourly_rate * 2).toString(),
        rate.authority || 'General Authority'
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `designation_rates_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  // Calculate daily rate (8 hours)
  const calculateDailyRate = (hourlyRate: number) => {
    return (hourlyRate * 8).toFixed(2)
  }

  // Get active daily rate for a designation
  const getActiveDailyRate = (designationId: string): DesignationDailyRateHistory | null => {
    const history = dailyRateHistory.get(designationId) || []
    return history.find(rate => rate.is_active) || null
  }

  // Handle manage daily rate
  const handleManageDailyRate = (rate: DesignationRate) => {
    setSelectedRate(rate)
    setEditingDailyRate(null)
    setDailyRateFormData({
      hourly_rate: rate.hourly_rate.toString(),
      name: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      is_active: true
    })
    setShowDailyRateModal(true)
  }

  // Handle edit daily rate
  const handleEditDailyRate = (dailyRate: DesignationDailyRateHistory) => {
    setEditingDailyRate(dailyRate)
    setDailyRateFormData({
      hourly_rate: dailyRate.hourly_rate.toString(),
      name: dailyRate.name,
      start_date: dailyRate.start_date,
      end_date: dailyRate.end_date || '',
      is_active: dailyRate.is_active
    })
    setShowDailyRateModal(true)
  }

  // Handle save daily rate
  const handleSaveDailyRate = async () => {
    try {
      setError('')
      setSuccess('')
      setLoading(true)

      if (!dailyRateFormData.hourly_rate || parseFloat(dailyRateFormData.hourly_rate) < 0) {
        setError('Please enter a valid hourly rate')
        setLoading(false)
        return
      }

      if (!dailyRateFormData.name.trim()) {
        setError('Please enter a name for this rate period')
        setLoading(false)
        return
      }

      if (!dailyRateFormData.start_date) {
        setError('Please enter a start date')
        setLoading(false)
        return
      }

      if (dailyRateFormData.end_date && new Date(dailyRateFormData.end_date) < new Date(dailyRateFormData.start_date)) {
        setError('End date must be after start date')
        setLoading(false)
        return
      }

      const currentUserId = user?.id || appUser?.id
      
      if (!selectedRate) {
        setError('No designation selected')
        setLoading(false)
        return
      }

      // Validate designation_id exists
      if (!selectedRate.id) {
        setError('Invalid designation ID. Please refresh the page and try again.')
        setLoading(false)
        return
      }

      // Save to history table (daily_rate will be auto-calculated from hourly_rate * 8)
      const rateData: any = {
        designation_id: selectedRate.id,
        name: dailyRateFormData.name.trim(),
        hourly_rate: parseFloat(dailyRateFormData.hourly_rate),
        start_date: dailyRateFormData.start_date,
        end_date: dailyRateFormData.end_date || null,
        is_active: dailyRateFormData.is_active
      }

      // Only add created_by/updated_by if user is authenticated (these fields are nullable)
      if (currentUserId) {
        if (editingDailyRate) {
          rateData.updated_by = currentUserId
        } else {
          rateData.created_by = currentUserId
        }
      }

      console.log('📦 Preparing to save daily rate:', {
        rateData,
        designationId: selectedRate.id,
        designationName: selectedRate.designation,
        currentUserId: currentUserId || 'null (will be set to null in DB)',
        editingDailyRate: editingDailyRate ? editingDailyRate.id : 'new record'
      })

      const supabaseClient = getSupabaseClient()
      
      if (editingDailyRate) {
        rateData.updated_by = currentUserId
        console.log('🔄 Updating daily rate:', editingDailyRate.id)
        
        const { data, error } = await supabaseClient
          .from(TABLES.DESIGNATION_DAILY_RATE_HISTORY)
          // @ts-ignore
          .update(rateData)
          .eq('id', editingDailyRate.id)
          .select()

        if (error) {
          console.error('❌ Update error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
            fullError: JSON.stringify(error, null, 2)
          })
          
          // Provide helpful error messages
          if (error.code === '42P01' || error.message?.includes('does not exist')) {
            throw new Error('Table does not exist. Please run the SQL script: Database/designation-daily-rate-history-complete.sql')
          } else if (error.code === '42501' || error.message?.includes('permission denied')) {
            throw new Error('Permission denied. Please check RLS policies in Supabase.')
          } else if (error.code === '23503' || error.message?.includes('foreign key')) {
            throw new Error('Invalid designation. Please refresh the page and try again.')
          }
          
          throw new Error(error.message || error.details || 'Failed to update daily rate')
        }
        
        console.log('✅ Daily rate updated successfully:', data)
        setSuccess('Daily rate updated successfully!')
      } else {
        console.log('➕ Inserting new daily rate')
        console.log('📤 Data being sent:', JSON.stringify(rateData, null, 2))
        
        const { data, error } = await supabaseClient
          .from(TABLES.DESIGNATION_DAILY_RATE_HISTORY)
          // @ts-ignore
          .insert([rateData])
          .select()

        if (error) {
          console.error('❌ Insert error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
            fullError: JSON.stringify(error, null, 2),
            rateData
          })
          
          // Provide helpful error messages
          if (error.code === '42P01' || error.message?.includes('does not exist')) {
            throw new Error('Table does not exist. Please run the SQL script: Database/designation-daily-rate-history-complete.sql')
          } else if (error.code === '42501' || error.message?.includes('permission denied')) {
            throw new Error('Permission denied. Please check RLS policies in Supabase.')
          } else if (error.code === '23503' || error.message?.includes('foreign key')) {
            throw new Error('Invalid designation. Please refresh the page and try again.')
          } else if (error.code === '23505' || error.message?.includes('unique constraint')) {
            throw new Error('A rate with this name already exists for this designation.')
          }
          
          throw new Error(error.message || error.details || 'Failed to insert daily rate')
        }
        
        console.log('✅ Daily rate inserted successfully:', data)
        setSuccess('Daily rate added successfully!')
      }

      // If this is the active rate, update all rates in designation_rates table
      if (dailyRateFormData.is_active && selectedRate) {
        console.log('🔄 Updating rates in designation_rates table (active rate)...')
        const newHourlyRate = parseFloat(dailyRateFormData.hourly_rate)
        const updateData: any = {
          hourly_rate: newHourlyRate,
          // Update overtime_hourly_rate to match hourly_rate (default behavior)
          overtime_hourly_rate: newHourlyRate,
          // Update off_day_hourly_rate to hourly_rate * 2 (default behavior)
          off_day_hourly_rate: newHourlyRate * 2,
          updated_by: currentUserId || null
        }

        const { error: updateError } = await supabaseClient
          .from(TABLES.DESIGNATION_RATES)
          // @ts-ignore
          .update(updateData)
          .eq('id', selectedRate.id)

        if (updateError) {
          console.error('⚠️ Failed to update rates in designation_rates:', updateError)
          // Don't throw error, just log it - the history was saved successfully
        } else {
          console.log('✅ Updated all rates in designation_rates table:', updateData)
        }
      }

      setShowDailyRateModal(false)
      setEditingDailyRate(null)
      
      // Always refresh both tables to show updated data
      console.log('🔄 Refreshing tables...')
      await fetchRates() // Refresh rates to show updated hourly_rate and all columns
      await fetchDailyRateHistory() // Refresh history
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      const errorMessage = err?.message || err?.error?.message || 'Unknown error occurred'
      setError('Failed to save daily rate: ' + errorMessage)
      console.error('Error saving daily rate:', err)
    } finally {
      setLoading(false)
    }
  }

  // Handle delete daily rate
  const handleDeleteDailyRate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this daily rate?')) {
      return
    }

    try {
      setError('')
      setSuccess('')
      setLoading(true)

      const supabaseClient = getSupabaseClient()
      const { error } = await supabaseClient
        .from(TABLES.DESIGNATION_DAILY_RATE_HISTORY)
        // @ts-ignore
        .delete()
        .eq('id', id)

      if (error) throw error

      setSuccess('Daily rate deleted successfully!')
      await fetchDailyRateHistory()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError('Failed to delete daily rate: ' + err.message)
      console.error('Error deleting daily rate:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filter rates
  const filteredRates = rates.filter(rate => {
    const matchesSearch = !searchTerm || 
      rate.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rate.authority && rate.authority.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesAuthority = selectedAuthority === 'all' || rate.authority === selectedAuthority
    
    return matchesSearch && matchesAuthority
  })

  // Get unique authorities
  const authorities = Array.from(new Set(rates.map(r => r.authority).filter(Boolean))) as string[]

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Designation Rates</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage hourly rates for different job designations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept=".csv"
            onChange={handleImport}
            className="hidden"
            id="import-csv-input"
          />
          <PermissionButton
            permission="cost_control.designation_rates.create"
            variant="outline" 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => document.getElementById('import-csv-input')?.click()}
            type="button"
          >
            <Upload className="h-4 w-4" />
            Import CSV
          </PermissionButton>
          <PermissionButton
            permission="cost_control.designation_rates.export"
            variant="outline" 
            onClick={handleExport} 
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </PermissionButton>
          <PermissionButton
            permission="cost_control.designation_rates.create"
            onClick={handleAdd} 
            className="flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Add Rate
          </PermissionButton>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="error" className="animate-in slide-in-from-top-5">
          <XCircle className="h-4 w-4" />
          {error}
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 border-green-200 text-green-800 animate-in slide-in-from-top-5">
          <CheckCircle className="h-4 w-4" />
          {success}
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by designation..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Authority</label>
              <select
                value={selectedAuthority}
                onChange={(e) => setSelectedAuthority(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Authorities</option>
                {authorities.map((auth) => (
                  <option key={auth} value={auth}>
                    {auth}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Total: <span className="font-semibold">{filteredRates.length}</span> designation(s)
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rates Table */}
      <Card>
        <CardHeader>
          <CardTitle>Designation Rates ({filteredRates.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingSpinner />
          ) : filteredRates.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No designation rates found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-3 font-semibold">Designation</th>
                    <th className="text-left p-3 font-semibold">hourly Rate</th>
                    <th className="text-left p-3 font-semibold">Daily Rate (8h)</th>
                    <th className="text-left p-3 font-semibold">Daily Rate Name</th>
                    <th className="text-left p-3 font-semibold">Period (From - To)</th>
                    <th className="text-left p-3 font-semibold">Overtime Hourly Rate</th>
                    <th className="text-left p-3 font-semibold">Off day hourly working rate</th>
                    <th className="text-left p-3 font-semibold">Overhead Hourly Rate</th>
                    <th className="text-left p-3 font-semibold">Total Hourly Rate</th>
                    <th className="text-left p-3 font-semibold">Authority</th>
                    <th className="text-left p-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRates.map((rate) => (
                    <tr 
                      key={rate.id} 
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="p-3">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {rate.designation}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-gray-900 dark:text-white font-semibold">
                          {rate.hourly_rate.toFixed(2)}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <Calculator className="h-4 w-4 text-indigo-500" />
                          <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                            {rate.daily_rate 
                              ? rate.daily_rate.toFixed(2) 
                              : calculateDailyRate((rate.total_hourly_rate) || (rate.hourly_rate + (rate.overhead_hourly_rate || 5.3)))}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        {(() => {
                          const activeRate = getActiveDailyRate(rate.id)
                          return activeRate ? (
                            <div className="flex items-center gap-1">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {activeRate.name}
                              </span>
                              {activeRate.is_active && (
                                <span className="px-2 py-0.5 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200 rounded text-xs">
                                  Active
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )
                        })()}
                      </td>
                      <td className="p-3">
                        {(() => {
                          const activeRate = getActiveDailyRate(rate.id)
                          return activeRate ? (
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{new Date(activeRate.start_date).toLocaleDateString()}</span>
                              </div>
                              {activeRate.end_date && (
                                <div className="flex items-center gap-1 mt-1">
                                  <span className="text-gray-400">-</span>
                                  <span>{new Date(activeRate.end_date).toLocaleDateString()}</span>
                                </div>
                              )}
                              {!activeRate.end_date && (
                                <div className="text-xs text-gray-400 mt-1">Ongoing</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )
                        })()}
                      </td>
                      <td className="p-3">
                        <span className="text-gray-600 dark:text-gray-400">
                          {(rate.overtime_hourly_rate || rate.hourly_rate).toFixed(2)}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-gray-600 dark:text-gray-400">
                          {(rate.off_day_hourly_rate || rate.hourly_rate * 2).toFixed(2)}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-gray-600 dark:text-gray-400">
                          {(rate.overhead_hourly_rate || 5.3).toFixed(2)}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-gray-900 dark:text-white font-semibold">
                          {((rate.total_hourly_rate) || (rate.hourly_rate + (rate.overhead_hourly_rate || 5.3))).toFixed(2)}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {rate.authority || 'General Authority'}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <PermissionButton
                            permission="cost_control.designation_rates.create"
                            variant="outline"
                            size="sm"
                            onClick={() => handleManageDailyRate(rate)}
                            className="h-10 w-10 p-0 flex items-center justify-center text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            title="Manage Daily Rate"
                          >
                            <History className="h-5 w-5" />
                          </PermissionButton>
                          <PermissionButton
                            permission="cost_control.designation_rates.edit"
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(rate)}
                            className="h-10 w-10 p-0 flex items-center justify-center"
                            title="Edit Rate"
                          >
                            <Edit className="h-5 w-5" />
                          </PermissionButton>
                          <PermissionButton
                            permission="cost_control.designation_rates.delete"
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(rate.id)}
                            className="h-10 w-10 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center"
                            title="Delete Rate"
                          >
                            <Trash2 className="h-5 w-5" />
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

      {/* Edit/Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {editingRate ? 'Edit Designation Rate' : 'Add Designation Rate'}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowModal(false)}
                  className="rounded-full"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Designation *
                    {formErrors.designation && (
                      <span className="text-red-500 text-xs ml-2">({formErrors.designation})</span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={formData.designation}
                    onChange={(e) => {
                      setFormData({ ...formData, designation: e.target.value })
                      validateField('designation', e.target.value)
                    }}
                    onBlur={(e) => validateField('designation', e.target.value)}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                      formErrors.designation ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g., Project Manager"
                    required
                  />
                  {formErrors.designation && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.designation}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Hourly Rate *
                    {formErrors.hourly_rate && (
                      <span className="text-red-500 text-xs ml-2">({formErrors.hourly_rate})</span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                    value={formData.hourly_rate}
                    onChange={(e) => {
                      const newHourlyRate = e.target.value
                      const oldHourlyRate = formData.hourly_rate
                      
                      // Update hourly_rate first
                      const updatedFormData = { ...formData, hourly_rate: newHourlyRate }
                      
                      if (!newHourlyRate || isNaN(parseFloat(newHourlyRate))) {
                        setFormData(updatedFormData)
                        validateField('hourly_rate', newHourlyRate)
                        return
                      }
                      
                      const oldHourlyRateValue = parseFloat(oldHourlyRate) || 0
                      const newHourlyRateValue = parseFloat(newHourlyRate)
                      
                      // Get current displayed values (what user sees in the form)
                      const displayedOvertime = formData.overtime_hourly_rate || oldHourlyRate
                      const displayedOffDay = formData.off_day_hourly_rate || (oldHourlyRateValue * 2).toString()
                      
                      const displayedOvertimeValue = parseFloat(displayedOvertime)
                      const displayedOffDayValue = parseFloat(displayedOffDay)
                      
                      // Check if displayed values are at default (equal to old hourly_rate or old hourly_rate * 2)
                      // This means user hasn't manually changed them
                      const isOvertimeAtDefault = !formData.overtime_hourly_rate || 
                        formData.overtime_hourly_rate.trim() === '' ||
                        (oldHourlyRateValue > 0 && Math.abs(displayedOvertimeValue - oldHourlyRateValue) < 0.01)
                      
                      const isOffDayAtDefault = !formData.off_day_hourly_rate || 
                        formData.off_day_hourly_rate.trim() === '' ||
                        (oldHourlyRateValue > 0 && Math.abs(displayedOffDayValue - (oldHourlyRateValue * 2)) < 0.01)
                      
                      // Update values based on custom settings
                      // If not using custom, always update to default (locked mode)
                      if (!useCustomOvertime) {
                        // Use default (same as hourly_rate) - locked mode
                        updatedFormData.overtime_hourly_rate = newHourlyRate
                      } else {
                        // Keep the manually set custom value (only update if at default)
                        if (isOvertimeAtDefault) {
                          updatedFormData.overtime_hourly_rate = newHourlyRate
                        } else {
                          updatedFormData.overtime_hourly_rate = formData.overtime_hourly_rate
                        }
                      }
                      
                      if (!useCustomOffDay) {
                        // Use default (hourly_rate * 2) - locked mode
                        updatedFormData.off_day_hourly_rate = (newHourlyRateValue * 2).toString()
                      } else {
                        // Keep the manually set custom value (only update if at default)
                        if (isOffDayAtDefault) {
                          updatedFormData.off_day_hourly_rate = (newHourlyRateValue * 2).toString()
                        } else {
                          updatedFormData.off_day_hourly_rate = formData.off_day_hourly_rate
                        }
                      }
                      
                      console.log('🔄 Updating hourly_rate:', {
                        old: oldHourlyRate,
                        new: newHourlyRate,
                        currentOvertime: formData.overtime_hourly_rate,
                        currentOffDay: formData.off_day_hourly_rate,
                        isOvertimeAtDefault,
                        isOffDayAtDefault,
                        newOvertime: updatedFormData.overtime_hourly_rate,
                        newOffDay: updatedFormData.off_day_hourly_rate
                      })
                      
                      // Update all form data at once
                      setFormData(updatedFormData)
                      
                      validateField('hourly_rate', newHourlyRate)
                      if (isOvertimeAtDefault) {
                        validateField('overtime_hourly_rate', updatedFormData.overtime_hourly_rate)
                      }
                      if (isOffDayAtDefault) {
                        validateField('off_day_hourly_rate', updatedFormData.off_day_hourly_rate)
                      }
                    }}
                    onBlur={(e) => {
                      validateField('hourly_rate', e.target.value)
                      const hourlyValue = parseFloat(e.target.value)
                      // Ensure overtime_hourly_rate has a value
                      if (!formData.overtime_hourly_rate || formData.overtime_hourly_rate.trim() === '') {
                        setFormData({ ...formData, overtime_hourly_rate: e.target.value })
                      }
                      // Ensure off_day_hourly_rate has a value (hourly_rate * 2)
                      if (!formData.off_day_hourly_rate || formData.off_day_hourly_rate.trim() === '') {
                        setFormData({ ...formData, off_day_hourly_rate: (hourlyValue * 2).toString() })
                      }
                    }}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                      formErrors.hourly_rate ? 'border-red-500' : 'border-gray-300'
                    }`}
                      placeholder="e.g., 31.25"
                      required
                    />
                    <span className="absolute right-3 top-2.5 text-gray-500 text-sm">/hour</span>
                  </div>
                  {formErrors.hourly_rate && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.hourly_rate}</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium">
                      Overtime Hourly Rate
                      {formErrors.overtime_hourly_rate && (
                        <span className="text-red-500 text-xs ml-2">({formErrors.overtime_hourly_rate})</span>
                      )}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="use_custom_overtime"
                        checked={useCustomOvertime}
                        onChange={(e) => {
                          setUseCustomOvertime(e.target.checked)
                          if (!e.target.checked) {
                            // Reset to default (hourly_rate)
                            setFormData({ ...formData, overtime_hourly_rate: formData.hourly_rate })
                          }
                        }}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <label htmlFor="use_custom_overtime" className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                        Use Custom
                      </label>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={useCustomOvertime ? (formData.overtime_hourly_rate || formData.hourly_rate) : formData.hourly_rate}
                      onChange={(e) => {
                        if (useCustomOvertime) {
                          const newValue = e.target.value || formData.hourly_rate
                          setFormData({ ...formData, overtime_hourly_rate: newValue })
                          validateField('overtime_hourly_rate', newValue)
                        }
                      }}
                      onBlur={(e) => {
                        if (useCustomOvertime) {
                          const finalValue = e.target.value || formData.hourly_rate
                          if (e.target.value !== finalValue) {
                            setFormData({ ...formData, overtime_hourly_rate: finalValue })
                          }
                          validateField('overtime_hourly_rate', finalValue)
                        }
                      }}
                      disabled={!useCustomOvertime}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                        formErrors.overtime_hourly_rate ? 'border-red-500' : 'border-gray-300'
                      } ${!useCustomOvertime ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed opacity-60' : 'bg-white dark:bg-gray-800'}`}
                      placeholder={formData.hourly_rate || "Same as Hourly Rate"}
                    />
                    <span className="absolute right-3 top-2.5 text-gray-500 text-sm">/hour</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {useCustomOvertime ? 'Enter custom overtime rate' : 'Defaults to Hourly Rate (locked)'}
                  </p>
                  {formErrors.overtime_hourly_rate && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.overtime_hourly_rate}</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium">
                      Off Day Hourly Working Rate
                      {formErrors.off_day_hourly_rate && (
                        <span className="text-red-500 text-xs ml-2">({formErrors.off_day_hourly_rate})</span>
                      )}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="use_custom_off_day"
                        checked={useCustomOffDay}
                        onChange={(e) => {
                          setUseCustomOffDay(e.target.checked)
                          if (!e.target.checked) {
                            // Reset to default (hourly_rate * 2)
                            const defaultOffDay = (parseFloat(formData.hourly_rate) * 2).toString()
                            setFormData({ ...formData, off_day_hourly_rate: defaultOffDay })
                          }
                        }}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <label htmlFor="use_custom_off_day" className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                        Use Custom
                      </label>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={useCustomOffDay ? (formData.off_day_hourly_rate || (parseFloat(formData.hourly_rate) * 2).toString()) : (parseFloat(formData.hourly_rate) * 2).toString()}
                      onChange={(e) => {
                        if (useCustomOffDay) {
                          const newValue = e.target.value || (parseFloat(formData.hourly_rate) * 2).toString()
                          setFormData({ ...formData, off_day_hourly_rate: newValue })
                          validateField('off_day_hourly_rate', newValue)
                        }
                      }}
                      onBlur={(e) => {
                        if (useCustomOffDay) {
                          const finalValue = e.target.value || (parseFloat(formData.hourly_rate) * 2).toString()
                          if (e.target.value !== finalValue) {
                            setFormData({ ...formData, off_day_hourly_rate: finalValue })
                          }
                          validateField('off_day_hourly_rate', finalValue)
                        }
                      }}
                      disabled={!useCustomOffDay}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                        formErrors.off_day_hourly_rate ? 'border-red-500' : 'border-gray-300'
                      } ${!useCustomOffDay ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed opacity-60' : 'bg-white dark:bg-gray-800'}`}
                      placeholder={(parseFloat(formData.hourly_rate) * 2).toString() || "Hourly Rate × 2"}
                    />
                    <span className="absolute right-3 top-2.5 text-gray-500 text-sm">/hour</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {useCustomOffDay ? 'Enter custom off-day rate' : 'Defaults to Hourly Rate × 2 (locked)'}
                  </p>
                  {formErrors.off_day_hourly_rate && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.off_day_hourly_rate}</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium">
                      Overhead Hourly Rate
                      {formErrors.overhead_hourly_rate && (
                        <span className="text-red-500 text-xs ml-2">({formErrors.overhead_hourly_rate})</span>
                      )}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="use_custom_overhead"
                        checked={useCustomOverhead}
                        onChange={(e) => {
                          setUseCustomOverhead(e.target.checked)
                          if (!e.target.checked) {
                            // Reset to default (5.3)
                            setFormData({ ...formData, overhead_hourly_rate: '5.3' })
                          }
                        }}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <label htmlFor="use_custom_overhead" className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                        Use Custom
                      </label>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={useCustomOverhead ? (formData.overhead_hourly_rate || '5.3') : '5.3'}
                      onChange={(e) => {
                        if (useCustomOverhead) {
                          const newValue = e.target.value || '5.3'
                          setFormData({ ...formData, overhead_hourly_rate: newValue })
                          validateField('overhead_hourly_rate', newValue)
                        }
                      }}
                      onBlur={(e) => {
                        if (useCustomOverhead) {
                          const finalValue = e.target.value || '5.3'
                          if (e.target.value !== finalValue) {
                            setFormData({ ...formData, overhead_hourly_rate: finalValue })
                          }
                          validateField('overhead_hourly_rate', finalValue)
                        }
                      }}
                      disabled={!useCustomOverhead}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                        formErrors.overhead_hourly_rate ? 'border-red-500' : 'border-gray-300'
                      } ${!useCustomOverhead ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed opacity-60' : 'bg-white dark:bg-gray-800'}`}
                      placeholder="5.3"
                    />
                    <span className="absolute right-3 top-2.5 text-gray-500 text-sm">/hour</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {useCustomOverhead ? 'Enter custom overhead rate' : 'Defaults to 5.3 (locked)'}
                  </p>
                  {formErrors.overhead_hourly_rate && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.overhead_hourly_rate}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Authority</label>
                  <input
                    type="text"
                    value={formData.authority}
                    onChange={(e) => setFormData({ ...formData, authority: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., General Authority"
                  />
                </div>

                {formData.hourly_rate && !isNaN(parseFloat(formData.hourly_rate)) && (
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Calculator className="h-5 w-5 text-indigo-600" />
                        <span className="text-gray-700 dark:text-gray-300">
                          <strong>Daily Rate (8 hours):</strong> <span className="font-bold text-indigo-600 text-lg">
                            {((parseFloat(formData.hourly_rate) + (useCustomOverhead ? parseFloat(formData.overhead_hourly_rate || '5.3') : 5.3)) * 8).toFixed(2)}
                          </span>
                          <span className="text-xs text-gray-500 ml-2">
                            (Total Hourly: {(parseFloat(formData.hourly_rate) + (useCustomOverhead ? parseFloat(formData.overhead_hourly_rate || '5.3') : 5.3)).toFixed(2)} × 8 hours)
                          </span>
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDailyRateSection(!showDailyRateSection)}
                        className="text-indigo-600 hover:text-indigo-700"
                      >
                        {showDailyRateSection ? 'Hide' : 'Add'} Daily Rate History
                      </Button>
                    </div>
                    <div className="mt-3 pt-3 border-t border-indigo-200 dark:border-indigo-700">
                      <div className="flex items-center gap-2 text-sm">
                        <Calculator className="h-5 w-5 text-green-600" />
                        <span className="text-gray-700 dark:text-gray-300">
                          <strong>Total Hourly Rate:</strong> <span className="font-bold text-green-600 text-lg">
                            {(parseFloat(formData.hourly_rate) + (useCustomOverhead ? parseFloat(formData.overhead_hourly_rate || '5.3') : 5.3)).toFixed(2)}
                          </span>
                          <span className="text-xs text-gray-500 ml-2">
                            (Hourly: {parseFloat(formData.hourly_rate).toFixed(2)} + Overhead: {(useCustomOverhead ? parseFloat(formData.overhead_hourly_rate || '5.3') : 5.3).toFixed(2)})
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Daily Rate History Section */}
                {showDailyRateSection && (
                  <div className="border-t pt-4 mt-4 space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Daily Rate History (Optional)
                    </h3>
                    <div>
                      <label className="block text-sm font-medium mb-2">Rate Period Name *</label>
                      <input
                        type="text"
                        value={newRateDailyRateFormData.name}
                        onChange={(e) => setNewRateDailyRateFormData({ ...newRateDailyRateFormData, name: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="e.g., Q1 2025 Rate, Initial Rate"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Start Date *</label>
                        <input
                          type="date"
                          value={newRateDailyRateFormData.start_date}
                          onChange={(e) => setNewRateDailyRateFormData({ ...newRateDailyRateFormData, start_date: e.target.value })}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">End Date (Optional)</label>
                        <input
                          type="date"
                          value={newRateDailyRateFormData.end_date}
                          onChange={(e) => setNewRateDailyRateFormData({ ...newRateDailyRateFormData, end_date: e.target.value })}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="is_active_daily"
                        checked={newRateDailyRateFormData.is_active}
                        onChange={(e) => setNewRateDailyRateFormData({ ...newRateDailyRateFormData, is_active: e.target.checked })}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <label htmlFor="is_active_daily" className="text-sm font-medium">
                        Set as Active Rate
                      </label>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="auto_save"
                      checked={autoSaveEnabled}
                      onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="auto_save" className="text-sm text-gray-600 dark:text-gray-400">
                      Auto-save on change
                    </label>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowModal(false)
                        setFormErrors({})
                        setShowDailyRateSection(false)
                      }}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => handleSave(showDailyRateSection && newRateDailyRateFormData.name.trim() !== '')}
                      disabled={loading || Object.keys(formErrors).length > 0}
                      className="flex items-center gap-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          {editingRate ? 'Update' : 'Add'} Rate
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Daily Rate Modal */}
      {showDailyRateModal && selectedRate && (() => {
        const history = dailyRateHistory.get(selectedRate.id) || []
        const sortedHistory = [...history].sort((a, b) => 
          new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
        )

        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {editingDailyRate ? 'Edit Daily Rate' : 'Add Daily Rate'}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Designation: <span className="font-medium">{selectedRate.designation}</span>
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowDailyRateModal(false)
                      setEditingDailyRate(null)
                    }}
                    className="rounded-full"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Form */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {editingDailyRate ? 'Edit Rate Period' : 'New Rate Period'}
                    </h3>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Hourly Rate *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={dailyRateFormData.hourly_rate}
                        onChange={(e) => setDailyRateFormData({ ...dailyRateFormData, hourly_rate: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="e.g., 31.25"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Enter the hourly rate for this period
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Rate Period Name *</label>
                      <input
                        type="text"
                        value={dailyRateFormData.name}
                        onChange={(e) => setDailyRateFormData({ ...dailyRateFormData, name: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="e.g., Q1 2025 Rate, Mid-Year Update"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Enter a name to identify this rate period
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Start Date *</label>
                      <input
                        type="date"
                        value={dailyRateFormData.start_date}
                        onChange={(e) => setDailyRateFormData({ ...dailyRateFormData, start_date: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">End Date (Optional)</label>
                      <input
                        type="date"
                        value={dailyRateFormData.end_date}
                        onChange={(e) => setDailyRateFormData({ ...dailyRateFormData, end_date: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Leave empty if this is the current ongoing rate period
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="is_active"
                        checked={dailyRateFormData.is_active}
                        onChange={(e) => setDailyRateFormData({ ...dailyRateFormData, is_active: e.target.checked })}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <label htmlFor="is_active" className="text-sm font-medium">
                        Set as Active Rate
                      </label>
                    </div>

                    {dailyRateFormData.hourly_rate && !isNaN(parseFloat(dailyRateFormData.hourly_rate)) && (
                      <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Calculator className="h-4 w-4 text-indigo-600" />
                          <span className="text-gray-700 dark:text-gray-300">
                            <strong>Daily Rate:</strong> <span className="font-semibold text-indigo-600">
                              {calculateDailyRate(parseFloat(dailyRateFormData.hourly_rate))}
                            </span> (Auto-calculated from Hourly Rate: {parseFloat(dailyRateFormData.hourly_rate).toFixed(2)} × 8 hours)
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowDailyRateModal(false)
                          setEditingDailyRate(null)
                        }}
                        disabled={loading}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSaveDailyRate}
                        disabled={loading}
                        className="flex items-center gap-2"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            {editingDailyRate ? 'Update' : 'Add'} Rate
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* History */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Rate History
                    </h3>
                    {sortedHistory.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No rate history yet</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[500px] overflow-y-auto">
                        {sortedHistory.map((rate) => (
                          <div
                            key={rate.id}
                            className={`p-4 border rounded-lg ${
                              rate.is_active
                                ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800'
                                : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-gray-900 dark:text-white">
                                    {rate.name}
                                  </span>
                                  {rate.is_active && (
                                    <span className="px-2 py-0.5 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200 rounded text-xs">
                                      Active
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    <span>
                                      {new Date(rate.start_date).toLocaleDateString()}
                                      {rate.end_date ? ` - ${new Date(rate.end_date).toLocaleDateString()}` : ' - Ongoing'}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                  Hourly: <span className="font-medium">{rate.hourly_rate.toFixed(2)}</span>
                                </div>
                                <div className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">
                                  Daily: {rate.daily_rate.toFixed(2)}
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditDailyRate(rate)}
                                  className="h-8 w-8 p-0"
                                  title="Edit"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteDailyRate(rate.id)}
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

