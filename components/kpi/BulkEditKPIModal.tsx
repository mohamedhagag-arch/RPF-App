'use client'

import { useState, useEffect, useMemo } from 'react'
import { ProcessedKPI } from '@/lib/kpiProcessor'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Alert } from '@/components/ui/Alert'
import { ModernCard } from '@/components/ui/ModernCard'
import { X, Save, AlertCircle, CheckCircle, Info, Loader2, Edit, Target, Calendar, Activity, Sparkles } from 'lucide-react'
import { formatDate } from '@/lib/dateHelpers'

interface BulkEditKPIModalProps {
  selectedKPIs: ProcessedKPI[]
  projects: any[]
  activities: any[]
  onUpdate: (ids: string[], data: any) => Promise<{ success: boolean; updated: number; errors: string[] }>
  onCancel: () => void
  isOpen: boolean
}

export function BulkEditKPIModal({ 
  selectedKPIs, 
  projects, 
  activities, 
  onUpdate, 
  onCancel, 
  isOpen 
}: BulkEditKPIModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [updateResult, setUpdateResult] = useState<{ updated: number; errors: string[] } | null>(null)
  
  // Form fields - only fields that can be bulk edited
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('')
  const [activityDate, setActivityDate] = useState('')
  const [zone, setZone] = useState('')
  const [section, setSection] = useState('')
  const [drilledMeters, setDrilledMeters] = useState('')
  const [notes, setNotes] = useState('')
  
  // Track which fields are being edited (only update fields that have values)
  const [fieldsToUpdate, setFieldsToUpdate] = useState<Set<string>>(new Set())
  
  // Load data automatically when modal opens
  useEffect(() => {
    if (isOpen && selectedKPIs.length > 0) {
      // Analyze selected KPIs to get common values
      const plannedKPIs = selectedKPIs.filter(k => k.input_type === 'Planned')
      const actualKPIs = selectedKPIs.filter(k => k.input_type === 'Actual')
      
      // Get unique values
      const uniqueQuantities = Array.from(new Set(selectedKPIs.map(k => k.quantity).filter(q => q !== undefined && q !== null)))
      const uniqueUnits = Array.from(new Set(selectedKPIs.map(k => k.unit).filter(Boolean)))
      // ✅ FIX: Use Zone only, NOT Section
      const uniqueZones = Array.from(new Set(selectedKPIs.map(k => 
        (k as any).zone || 
        (k as any).zone_number || 
        (k as any).raw?.['Zone'] || 
        (k as any).raw?.['Zone Number'] || 
        ''
      ).filter(Boolean)))
      const uniqueSections = Array.from(new Set(selectedKPIs.map(k => k.section || (k as any).raw?.['Section']).filter(Boolean)))
      const uniqueDrilledMeters = Array.from(new Set(selectedKPIs.map(k => k.drilled_meters).filter(dm => dm !== undefined && dm !== null)))
      const uniqueNotes = Array.from(new Set(selectedKPIs.map(k => (k as any).notes).filter(Boolean)))
      
      // Get dates - only Activity Date (unified field)
      const uniqueActivityDates = Array.from(new Set(selectedKPIs.map(k => k.activity_date).filter(Boolean)))
      
      // Format date for input (YYYY-MM-DD)
      const formatDateForInput = (dateStr: string | undefined) => {
        if (!dateStr) return ''
        try {
          const date = new Date(dateStr)
          if (isNaN(date.getTime())) return ''
          return date.toISOString().split('T')[0]
        } catch {
          return ''
        }
      }
      
      // Set common values (if all KPIs have the same value, pre-fill it)
      setQuantity(uniqueQuantities.length === 1 && uniqueQuantities[0] !== undefined ? uniqueQuantities[0].toString() : '')
      setUnit(uniqueUnits.length === 1 && uniqueUnits[0] ? uniqueUnits[0] : '')
      setActivityDate(uniqueActivityDates.length === 1 && uniqueActivityDates[0] ? formatDateForInput(uniqueActivityDates[0]) : '')
      setZone(uniqueZones.length === 1 && uniqueZones[0] ? uniqueZones[0] : '')
      setSection(uniqueSections.length === 1 && uniqueSections[0] ? uniqueSections[0] : '')
      setDrilledMeters(uniqueDrilledMeters.length === 1 && uniqueDrilledMeters[0] !== undefined ? uniqueDrilledMeters[0].toString() : '')
      setNotes(uniqueNotes.length === 1 && uniqueNotes[0] ? uniqueNotes[0] : '')
      
      // Mark fields as "to update" if they have common values
      const newFieldsToUpdate = new Set<string>()
      if (uniqueQuantities.length === 1) newFieldsToUpdate.add('quantity')
      if (uniqueUnits.length === 1) newFieldsToUpdate.add('unit')
      if (uniqueActivityDates.length === 1) newFieldsToUpdate.add('activityDate')
      if (uniqueZones.length === 1) newFieldsToUpdate.add('zone')
      if (uniqueSections.length === 1) newFieldsToUpdate.add('section')
      if (uniqueDrilledMeters.length === 1) newFieldsToUpdate.add('drilledMeters')
      if (uniqueNotes.length === 1) newFieldsToUpdate.add('notes')
      
      setFieldsToUpdate(newFieldsToUpdate)
      setError('')
      setSuccess(false)
      setUpdateResult(null)
    }
  }, [isOpen, selectedKPIs])
  
  if (!isOpen || selectedKPIs.length === 0) {
    return null
  }
  
  // Analyze selected KPIs to show common values
  const analysis = useMemo(() => {
    const plannedKPIs = selectedKPIs.filter(k => k.input_type === 'Planned')
    const actualKPIs = selectedKPIs.filter(k => k.input_type === 'Actual')
    
    // Get unique values
    const uniqueUnits = Array.from(new Set(selectedKPIs.map(k => k.unit).filter(Boolean)))
    // ✅ FIX: Use Zone only, NOT Section
    const uniqueZones = Array.from(new Set(selectedKPIs.map(k => 
      (k as any).zone_number || 
      (k as any).zone || 
      (k as any).raw?.['Zone'] || 
      (k as any).raw?.['Zone Number'] || 
      (k as any).raw?.['Zone Ref']
    ).filter(Boolean)))
    const uniqueSections = Array.from(new Set(selectedKPIs.map(k => k.section || (k as any).raw?.['Section']).filter(Boolean)))
    
    return {
      total: selectedKPIs.length,
      planned: plannedKPIs.length,
      actual: actualKPIs.length,
      hasMixedTypes: plannedKPIs.length > 0 && actualKPIs.length > 0,
      commonUnit: uniqueUnits.length === 1 ? uniqueUnits[0] : null,
      commonZone: uniqueZones.length === 1 ? uniqueZones[0] : null,
      commonSection: uniqueSections.length === 1 ? uniqueSections[0] : null,
      uniqueUnits,
      uniqueZones,
      uniqueSections
    }
  }, [selectedKPIs])
  
  // Helper function to calculate Day from Activity Date (matches format used in other forms)
  const calculateDayFromActivityDate = (dateStr: string): string => {
    if (!dateStr || dateStr.trim() === '') return ''
    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return ''
      const weekday = date.toLocaleDateString('en-US', { weekday: 'long' })
      // Format: "Jan 15, 2025 - Monday" (matches formatDate from lib/dateHelpers.ts)
      const formattedDate = formatDate(dateStr)
      if (formattedDate === 'N/A') return ''
      return `${formattedDate} - ${weekday}`
    } catch {
      return ''
    }
  }

  // Handle field changes - track which fields are being edited
  const handleFieldChange = (field: string, value: string, setter: (val: string) => void) => {
    setter(value)
    const newFields = new Set(fieldsToUpdate)
    if (value.trim()) {
      newFields.add(field)
      // ✅ Auto-calculate Day when Activity Date is updated
      if (field === 'activityDate' && value.trim()) {
        newFields.add('day') // Mark Day as to be updated (auto-calculated)
      }
    } else {
      newFields.delete(field)
      if (field === 'activityDate') {
        newFields.delete('day') // Remove Day if Activity Date is cleared
      }
    }
    setFieldsToUpdate(newFields)
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)
    setUpdateResult(null)
    
    try {
      // Build update data - only include fields that have values
      const updateData: any = {}
      
      if (fieldsToUpdate.has('quantity') && quantity.trim()) {
        const qty = parseFloat(quantity)
        if (isNaN(qty) || qty < 0) {
          setError('Quantity must be a valid positive number')
          setLoading(false)
          return
        }
        updateData.quantity = qty.toString()
      }
      
      if (fieldsToUpdate.has('unit') && unit.trim()) {
        updateData.unit = unit.trim()
      }
      
      // ✅ Activity Date (unified field) - applies to all KPIs (both Planned and Actual)
      if (fieldsToUpdate.has('activityDate') && activityDate.trim()) {
        updateData.activity_date = activityDate.trim()
        // ✅ Auto-calculate Day from Activity Date
        const calculatedDay = calculateDayFromActivityDate(activityDate)
        if (calculatedDay) {
          updateData.day = calculatedDay
        }
      }
      
      if (fieldsToUpdate.has('zone') && zone.trim()) {
        updateData.zone = zone.trim()
        // ✅ Update Zone Number
        updateData.zone_number = zone.trim()
      }
      
      if (fieldsToUpdate.has('section') && section.trim()) {
        updateData.section = section.trim()
      }
      
      if (fieldsToUpdate.has('drilledMeters') && drilledMeters.trim()) {
        const meters = parseFloat(drilledMeters)
        if (isNaN(meters) || meters < 0) {
          setError('Drilled Meters must be a valid positive number')
          setLoading(false)
          return
        }
        updateData.drilled_meters = meters.toString()
      }
      
      if (fieldsToUpdate.has('notes') && notes.trim()) {
        updateData.notes = notes.trim()
      }
      
      // Validate that at least one field is being updated
      if (Object.keys(updateData).length === 0) {
        setError('Please fill in at least one field to update')
        setLoading(false)
        return
      }
      
      // Get IDs of selected KPIs
      const ids = selectedKPIs.map(k => k.id).filter(Boolean) as string[]
      
      if (ids.length === 0) {
        setError('No valid KPI IDs found')
        setLoading(false)
        return
      }
      
      console.log('🔄 Bulk Edit: Updating', ids.length, 'KPIs with data:', updateData)
      
      // Call update handler
      const result = await onUpdate(ids, updateData)
      
      if (result.success) {
        setSuccess(true)
        setUpdateResult(result)
        // Auto-close after 2 seconds if all updates succeeded
        if (result.errors.length === 0) {
          setTimeout(() => {
            onCancel()
          }, 2000)
        }
      } else {
        setError(`Failed to update some KPIs. ${result.errors.length} error(s) occurred.`)
        setUpdateResult(result)
      }
    } catch (err: any) {
      console.error('❌ Bulk Edit Error:', err)
      setError(err.message || 'Failed to update KPIs')
    } finally {
      setLoading(false)
    }
  }
  
  // Get preview of changes
  const getPreview = () => {
    const changes: string[] = []
    if (fieldsToUpdate.has('quantity')) changes.push(`Quantity: ${quantity || '(empty)'}`)
    if (fieldsToUpdate.has('unit')) changes.push(`Unit: ${unit || '(empty)'}`)
    if (fieldsToUpdate.has('activityDate')) {
      changes.push(`Activity Date: ${activityDate || '(empty)'}`)
      // ✅ Show that Day will be auto-calculated
      if (activityDate.trim()) {
        const calculatedDay = calculateDayFromActivityDate(activityDate)
        if (calculatedDay) {
          changes.push(`Day: ${calculatedDay} (auto-calculated)`)
        }
      }
    }
    if (fieldsToUpdate.has('zone')) changes.push(`Zone: ${zone || '(empty)'}`)
    if (fieldsToUpdate.has('section')) changes.push(`Section: ${section || '(empty)'}`)
    if (fieldsToUpdate.has('drilledMeters')) changes.push(`Drilled Meters: ${drilledMeters || '(empty)'}`)
    if (fieldsToUpdate.has('notes')) changes.push(`Notes: ${notes || '(empty)'}`)
    return changes
  }
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-lg shadow-2xl">
        {/* Header - Matching Smart KPI Form Style */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-blue-200 dark:border-blue-700 p-4 sm:p-6 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center shrink-0">
                <Edit className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white truncate">
                  Bulk Edit KPIs
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Editing {selectedKPIs.length} selected KPI{selectedKPIs.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={loading}
              className="text-gray-400 hover:text-gray-600 shrink-0"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Selection Summary - Matching Smart KPI Form Style */}
          <ModernCard className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-blue-200 dark:border-blue-700">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <Info className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Selection Summary</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Total KPIs:</span>
                    <span className="ml-2 font-semibold text-gray-900 dark:text-white">{analysis.total}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Planned:</span>
                    <span className="ml-2 font-semibold text-blue-700 dark:text-blue-300">{analysis.planned}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Actual:</span>
                    <span className="ml-2 font-semibold text-green-700 dark:text-green-300">{analysis.actual}</span>
                  </div>
                </div>
                {analysis.hasMixedTypes && (
                  <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-md">
                    <p className="text-xs text-blue-800 dark:text-blue-200">
                      ℹ️ Mixed types detected - Activity Date will apply to all selected KPIs (both Planned and Actual)
                    </p>
                  </div>
                )}
              </div>
            </div>
          </ModernCard>
          
          {/* Error Message */}
          {error && (
            <Alert variant="error">
              <AlertCircle className="h-4 w-4" />
              <div className="ml-3">
                <p className="font-semibold">Error</p>
                <p className="text-sm">{error}</p>
              </div>
            </Alert>
          )}
          
          {/* Success Message */}
          {success && updateResult && (
            <Alert variant="success">
              <CheckCircle className="h-4 w-4" />
              <div className="ml-3">
                <p className="font-semibold">Update Successful</p>
                <p className="text-sm">
                  Successfully updated {updateResult.updated} out of {selectedKPIs.length} KPI(s)
                </p>
                {updateResult.errors.length > 0 && (
                  <div className="mt-2 text-xs">
                    <p className="font-semibold">Errors:</p>
                    <ul className="list-disc list-inside">
                      {updateResult.errors.slice(0, 5).map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                      {updateResult.errors.length > 5 && (
                        <li>... and {updateResult.errors.length - 5} more</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </Alert>
          )}
          
          {/* Form - Matching Smart KPI Form Style */}
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* Quantity */}
              <div className="space-y-2">
                <Label htmlFor="quantity" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Quantity {fieldsToUpdate.has('quantity') && <span className="text-blue-600">*</span>}
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.01"
                  min="0"
                  value={quantity}
                  onChange={(e) => handleFieldChange('quantity', e.target.value, setQuantity)}
                  placeholder={analysis.total > 0 ? `Current: ${selectedKPIs[0]?.quantity || 'N/A'}` : 'Enter quantity'}
                  disabled={loading}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Leave empty to keep existing values
                </p>
              </div>
              
              {/* Unit */}
              <div className="space-y-2">
                <Label htmlFor="unit" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Unit {fieldsToUpdate.has('unit') && <span className="text-blue-600">*</span>}
                </Label>
                <Input
                  id="unit"
                  type="text"
                  value={unit}
                  onChange={(e) => handleFieldChange('unit', e.target.value, setUnit)}
                  placeholder={analysis.commonUnit || 'Enter unit'}
                  disabled={loading}
                  list="unit-suggestions"
                  className="w-full"
                />
                <datalist id="unit-suggestions">
                  {analysis.uniqueUnits.map((u, idx) => (
                    <option key={idx} value={u} />
                  ))}
                </datalist>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {analysis.commonUnit ? `Common: ${analysis.commonUnit}` : 'Leave empty to keep existing values'}
                </p>
              </div>
              
              {/* Activity Date (unified field for all KPIs) */}
              <div className="space-y-2">
                <Label htmlFor="activityDate" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Activity Date {fieldsToUpdate.has('activityDate') && <span className="text-blue-600">*</span>}
                </Label>
                <Input
                  id="activityDate"
                  type="date"
                  value={activityDate}
                  onChange={(e) => handleFieldChange('activityDate', e.target.value, setActivityDate)}
                  disabled={loading}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Applies to all selected KPIs (both Planned and Actual). Day will be auto-calculated.
                </p>
              </div>
              
              {/* Zone - Updated to match Smart KPI Form */}
              <div className="space-y-2">
                <Label htmlFor="zone" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  <Target className="w-4 h-4 inline mr-1" />
                  Zone {fieldsToUpdate.has('zone') && <span className="text-blue-600">*</span>}
                </Label>
                <Input
                  id="zone"
                  type="text"
                  value={zone}
                  onChange={(e) => handleFieldChange('zone', e.target.value, setZone)}
                  placeholder={analysis.commonZone || 'Enter zone (e.g., P8888-01-1)'}
                  disabled={loading}
                  list="zone-suggestions"
                  className="w-full"
                />
                <datalist id="zone-suggestions">
                  {analysis.uniqueZones.map((z, idx) => (
                    <option key={idx} value={z} />
                  ))}
                </datalist>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {analysis.commonZone ? `Common: ${analysis.commonZone}` : 'Leave empty to keep existing values'}
                </p>
              </div>
              
              {/* Section (Optional) - Separate from Zone */}
              <div className="space-y-2">
                <Label htmlFor="section" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Section (Optional) {fieldsToUpdate.has('section') && <span className="text-blue-600">*</span>}
                </Label>
                <Input
                  id="section"
                  type="text"
                  value={section}
                  onChange={(e) => handleFieldChange('section', e.target.value, setSection)}
                  placeholder={analysis.commonSection || 'Enter section (e.g., -10m, Section A)'}
                  disabled={loading}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {analysis.commonSection ? `Common: ${analysis.commonSection}` : 'Leave empty to keep existing values'}
                </p>
              </div>
              
              {/* Drilled Meters */}
              <div className="space-y-2">
                <Label htmlFor="drilledMeters" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Drilled Meters (Optional) {fieldsToUpdate.has('drilledMeters') && <span className="text-blue-600">*</span>}
                </Label>
                <Input
                  id="drilledMeters"
                  type="number"
                  step="0.01"
                  min="0"
                  value={drilledMeters}
                  onChange={(e) => handleFieldChange('drilledMeters', e.target.value, setDrilledMeters)}
                  placeholder="Enter drilled meters"
                  disabled={loading}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Leave empty to keep existing values
                </p>
              </div>
              
              {/* Notes */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Notes {fieldsToUpdate.has('notes') && <span className="text-blue-600">*</span>}
                </Label>
                <Input
                  id="notes"
                  type="text"
                  value={notes}
                  onChange={(e) => handleFieldChange('notes', e.target.value, setNotes)}
                  placeholder="Enter notes"
                  disabled={loading}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Leave empty to keep existing values
                </p>
              </div>
            </div>
            
            {/* Preview */}
            {fieldsToUpdate.size > 0 && (
              <ModernCard className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border-green-200 dark:border-green-700">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white mb-2">Preview of Changes</p>
                    <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-disc list-inside">
                      {getPreview().map((change, idx) => (
                        <li key={idx}>{change}</li>
                      ))}
                    </ul>
                    <p className="text-xs mt-2 text-gray-600 dark:text-gray-400">
                      These changes will be applied to all {selectedKPIs.length} selected KPI(s)
                    </p>
                  </div>
                </div>
              </ModernCard>
            )}
            
            {/* Action Buttons - Matching Smart KPI Form Style */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={loading}
                className="px-6"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || fieldsToUpdate.size === 0}
                className="min-w-[140px] bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white px-6"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Update {selectedKPIs.length} KPI{selectedKPIs.length !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
