'use client'

import { useState, useEffect, useMemo } from 'react'
import { ProcessedKPI } from '@/lib/kpiProcessor'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Alert } from '@/components/ui/Alert'
import { X, Edit, Save, AlertCircle, CheckCircle, Info, Loader2 } from 'lucide-react'

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
  const [targetDate, setTargetDate] = useState('')
  const [actualDate, setActualDate] = useState('')
  const [activityDate, setActivityDate] = useState('')
  const [zone, setZone] = useState('')
  const [section, setSection] = useState('')
  const [day, setDay] = useState('')
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
      const uniqueZones = Array.from(new Set(selectedKPIs.map(k => k.zone || (k as any).section || (k as any).zone_ref || (k as any).zone_number).filter(Boolean)))
      const uniqueSections = Array.from(new Set(selectedKPIs.map(k => k.section || (k as any).zone_number).filter(Boolean)))
      const uniqueDays = Array.from(new Set(selectedKPIs.map(k => (k as any).day).filter(Boolean)))
      const uniqueDrilledMeters = Array.from(new Set(selectedKPIs.map(k => k.drilled_meters).filter(dm => dm !== undefined && dm !== null)))
      const uniqueNotes = Array.from(new Set(selectedKPIs.map(k => (k as any).notes).filter(Boolean)))
      
      // Get dates
      const uniqueTargetDates = Array.from(new Set(plannedKPIs.map(k => k.target_date).filter(Boolean)))
      const uniqueActualDates = Array.from(new Set(actualKPIs.map(k => k.activity_date || (k as any).actual_date).filter(Boolean)))
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
      setTargetDate(uniqueTargetDates.length === 1 && uniqueTargetDates[0] ? formatDateForInput(uniqueTargetDates[0]) : '')
      setActualDate(uniqueActualDates.length === 1 && uniqueActualDates[0] ? formatDateForInput(uniqueActualDates[0]) : '')
      setActivityDate(uniqueActivityDates.length === 1 && uniqueActivityDates[0] ? formatDateForInput(uniqueActivityDates[0]) : '')
      setZone(uniqueZones.length === 1 && uniqueZones[0] ? uniqueZones[0] : '')
      setSection(uniqueSections.length === 1 && uniqueSections[0] ? uniqueSections[0] : '')
      setDay(uniqueDays.length === 1 && uniqueDays[0] ? uniqueDays[0] : '')
      setDrilledMeters(uniqueDrilledMeters.length === 1 && uniqueDrilledMeters[0] !== undefined ? uniqueDrilledMeters[0].toString() : '')
      setNotes(uniqueNotes.length === 1 && uniqueNotes[0] ? uniqueNotes[0] : '')
      
      // Mark fields as "to update" if they have common values
      const newFieldsToUpdate = new Set<string>()
      if (uniqueQuantities.length === 1) newFieldsToUpdate.add('quantity')
      if (uniqueUnits.length === 1) newFieldsToUpdate.add('unit')
      if (uniqueTargetDates.length === 1) newFieldsToUpdate.add('targetDate')
      if (uniqueActualDates.length === 1) newFieldsToUpdate.add('actualDate')
      if (uniqueActivityDates.length === 1) newFieldsToUpdate.add('activityDate')
      if (uniqueZones.length === 1) newFieldsToUpdate.add('zone')
      if (uniqueSections.length === 1) newFieldsToUpdate.add('section')
      if (uniqueDays.length === 1) newFieldsToUpdate.add('day')
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
    const uniqueZones = Array.from(new Set(selectedKPIs.map(k => k.zone || (k as any).section).filter(Boolean)))
    const uniqueSections = Array.from(new Set(selectedKPIs.map(k => k.section).filter(Boolean)))
    
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
  
  // Handle field changes - track which fields are being edited
  const handleFieldChange = (field: string, value: string, setter: (val: string) => void) => {
    setter(value)
    const newFields = new Set(fieldsToUpdate)
    if (value.trim()) {
      newFields.add(field)
    } else {
      newFields.delete(field)
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
      
      if (fieldsToUpdate.has('targetDate') && targetDate.trim()) {
        updateData.target_date = targetDate.trim()
        // Also update activity_date if it's a Planned KPI
        if (analysis.planned > 0) {
          updateData.activity_date = targetDate.trim()
        }
      }
      
      if (fieldsToUpdate.has('actualDate') && actualDate.trim()) {
        updateData.actual_date = actualDate.trim()
        // Also update activity_date if it's an Actual KPI
        if (analysis.actual > 0) {
          updateData.activity_date = actualDate.trim()
        }
      }
      
      if (fieldsToUpdate.has('activityDate') && activityDate.trim()) {
        updateData.activity_date = activityDate.trim()
      }
      
      if (fieldsToUpdate.has('zone') && zone.trim()) {
        updateData.zone = zone.trim()
      }
      
      if (fieldsToUpdate.has('section') && section.trim()) {
        updateData.section = section.trim()
      }
      
      if (fieldsToUpdate.has('day') && day.trim()) {
        updateData.day = day.trim()
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
    if (fieldsToUpdate.has('targetDate')) changes.push(`Target Date: ${targetDate || '(empty)'}`)
    if (fieldsToUpdate.has('actualDate')) changes.push(`Actual Date: ${actualDate || '(empty)'}`)
    if (fieldsToUpdate.has('activityDate')) changes.push(`Activity Date: ${activityDate || '(empty)'}`)
    if (fieldsToUpdate.has('zone')) changes.push(`Zone Ref: ${zone || '(empty)'}`)
    if (fieldsToUpdate.has('section')) changes.push(`Zone Number: ${section || '(empty)'}`)
    if (fieldsToUpdate.has('day')) changes.push(`Day: ${day || '(empty)'}`)
    if (fieldsToUpdate.has('drilledMeters')) changes.push(`Drilled Meters: ${drilledMeters || '(empty)'}`)
    if (fieldsToUpdate.has('notes')) changes.push(`Notes: ${notes || '(empty)'}`)
    return changes
  }
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4 shadow-2xl">
        <CardHeader className="sticky top-0 bg-white dark:bg-gray-900 z-10 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Edit className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-2xl">Bulk Edit KPIs</CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Editing {selectedKPIs.length} selected KPI{selectedKPIs.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={loading}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-6 space-y-6">
          {/* Analysis Info */}
          <Alert variant="default">
            <Info className="h-4 w-4" />
            <div className="ml-3">
              <p className="font-semibold">Selection Summary</p>
              <ul className="text-sm mt-1 space-y-1">
                <li>• Total KPIs: {analysis.total}</li>
                <li>• Planned: {analysis.planned}</li>
                <li>• Actual: {analysis.actual}</li>
                {analysis.hasMixedTypes && (
                  <li className="text-amber-600 dark:text-amber-400">
                    ⚠️ Mixed types detected - date fields will apply based on type
                  </li>
                )}
              </ul>
            </div>
          </Alert>
          
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
          
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Quantity */}
              <div className="space-y-2">
                <Label htmlFor="quantity">
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
                />
                <p className="text-xs text-gray-500">
                  Leave empty to keep existing values
                </p>
              </div>
              
              {/* Unit */}
              <div className="space-y-2">
                <Label htmlFor="unit">
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
                />
                <datalist id="unit-suggestions">
                  {analysis.uniqueUnits.map((u, idx) => (
                    <option key={idx} value={u} />
                  ))}
                </datalist>
                <p className="text-xs text-gray-500">
                  {analysis.commonUnit ? `Common: ${analysis.commonUnit}` : 'Leave empty to keep existing values'}
                </p>
              </div>
              
              {/* Target Date (for Planned KPIs) */}
              {analysis.planned > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="targetDate">
                    Target Date (Planned) {fieldsToUpdate.has('targetDate') && <span className="text-blue-600">*</span>}
                  </Label>
                  <Input
                    id="targetDate"
                    type="date"
                    value={targetDate}
                    onChange={(e) => handleFieldChange('targetDate', e.target.value, setTargetDate)}
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500">
                    Applies to {analysis.planned} Planned KPI(s)
                  </p>
                </div>
              )}
              
              {/* Actual Date (for Actual KPIs) */}
              {analysis.actual > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="actualDate">
                    Actual Date (Actual) {fieldsToUpdate.has('actualDate') && <span className="text-blue-600">*</span>}
                  </Label>
                  <Input
                    id="actualDate"
                    type="date"
                    value={actualDate}
                    onChange={(e) => handleFieldChange('actualDate', e.target.value, setActualDate)}
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500">
                    Applies to {analysis.actual} Actual KPI(s)
                  </p>
                </div>
              )}
              
              {/* Activity Date (for all) */}
              <div className="space-y-2">
                <Label htmlFor="activityDate">
                  Activity Date {fieldsToUpdate.has('activityDate') && <span className="text-blue-600">*</span>}
                </Label>
                <Input
                  id="activityDate"
                  type="date"
                  value={activityDate}
                  onChange={(e) => handleFieldChange('activityDate', e.target.value, setActivityDate)}
                  disabled={loading}
                />
                <p className="text-xs text-gray-500">
                  Applies to all selected KPIs
                </p>
              </div>
              
              {/* Zone Ref */}
              <div className="space-y-2">
                <Label htmlFor="zone">
                  Zone Ref {fieldsToUpdate.has('zone') && <span className="text-blue-600">*</span>}
                </Label>
                <Input
                  id="zone"
                  type="text"
                  value={zone}
                  onChange={(e) => handleFieldChange('zone', e.target.value, setZone)}
                  placeholder={analysis.commonZone || 'Enter zone ref'}
                  disabled={loading}
                  list="zone-suggestions"
                />
                <datalist id="zone-suggestions">
                  {analysis.uniqueZones.map((z, idx) => (
                    <option key={idx} value={z} />
                  ))}
                </datalist>
                <p className="text-xs text-gray-500">
                  {analysis.commonZone ? `Common: ${analysis.commonZone}` : 'Leave empty to keep existing values'}
                </p>
              </div>
              
              {/* Zone Number */}
              <div className="space-y-2">
                <Label htmlFor="section">
                  Zone Number {fieldsToUpdate.has('section') && <span className="text-blue-600">*</span>}
                </Label>
                <Input
                  id="section"
                  type="text"
                  value={section}
                  onChange={(e) => handleFieldChange('section', e.target.value, setSection)}
                  placeholder={analysis.commonSection || 'Enter zone number'}
                  disabled={loading}
                />
                <p className="text-xs text-gray-500">
                  {analysis.commonSection ? `Common: ${analysis.commonSection}` : 'Leave empty to keep existing values'}
                </p>
              </div>
              
              {/* Day */}
              <div className="space-y-2">
                <Label htmlFor="day">
                  Day {fieldsToUpdate.has('day') && <span className="text-blue-600">*</span>}
                </Label>
                <Input
                  id="day"
                  type="text"
                  value={day}
                  onChange={(e) => handleFieldChange('day', e.target.value, setDay)}
                  placeholder="Enter day"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500">
                  Leave empty to keep existing values
                </p>
              </div>
              
              {/* Drilled Meters */}
              <div className="space-y-2">
                <Label htmlFor="drilledMeters">
                  Drilled Meters {fieldsToUpdate.has('drilledMeters') && <span className="text-blue-600">*</span>}
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
                />
                <p className="text-xs text-gray-500">
                  Leave empty to keep existing values
                </p>
              </div>
              
              {/* Notes */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">
                  Notes {fieldsToUpdate.has('notes') && <span className="text-blue-600">*</span>}
                </Label>
                <Input
                  id="notes"
                  type="text"
                  value={notes}
                  onChange={(e) => handleFieldChange('notes', e.target.value, setNotes)}
                  placeholder="Enter notes"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500">
                  Leave empty to keep existing values
                </p>
              </div>
            </div>
            
            {/* Preview */}
            {fieldsToUpdate.size > 0 && (
              <Alert variant="default">
                <Info className="h-4 w-4" />
                <div className="ml-3">
                  <p className="font-semibold">Preview of Changes</p>
                  <ul className="text-sm mt-1 list-disc list-inside">
                    {getPreview().map((change, idx) => (
                      <li key={idx}>{change}</li>
                    ))}
                  </ul>
                  <p className="text-xs mt-2 text-gray-600">
                    These changes will be applied to all {selectedKPIs.length} selected KPI(s)
                  </p>
                </div>
              </Alert>
            )}
            
            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || fieldsToUpdate.size === 0}
                className="min-w-[120px]"
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
        </CardContent>
      </Card>
    </div>
  )
}

