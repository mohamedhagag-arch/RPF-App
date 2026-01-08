'use client'

import { useState, useEffect, useRef } from 'react'
import { CommercialBOQItem } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { X, Save, Loader2 } from 'lucide-react'

interface BulkEditBOQItemsModalProps {
  selectedItems: CommercialBOQItem[]
  onUpdate: (ids: string[], data: any) => Promise<void>
  onCancel: () => void
  isOpen: boolean
}

export function BulkEditBOQItemsModal({ 
  selectedItems, 
  onUpdate, 
  onCancel, 
  isOpen 
}: BulkEditBOQItemsModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  
  // Form fields - only fields that can be bulk edited
  const [unit, setUnit] = useState('')
  const [remeasurable, setRemeasurable] = useState<boolean | null>(null)
  const [planningAssignedAmount, setPlanningAssignedAmount] = useState('')
  const [variations, setVariations] = useState('')
  const [quantity, setQuantity] = useState('')
  const [rate, setRate] = useState('')
  
  // Track which fields are being updated
  const [fieldsToUpdate, setFieldsToUpdate] = useState<Set<string>>(new Set())
  
  // Track previous isOpen state to only initialize once when modal opens
  const prevIsOpenRef = useRef(false)
  
  // Load common values when modal opens (only once)
  useEffect(() => {
    // Only initialize when modal transitions from closed to open
    if (isOpen && !prevIsOpenRef.current && selectedItems.length > 0) {
      const uniqueUnits = Array.from(new Set(selectedItems.map(item => item.unit).filter(Boolean)))
      const uniqueRemeasurable = Array.from(new Set(selectedItems.map(item => item.remeasurable)))
      const uniquePlanningAssigned = Array.from(new Set(selectedItems.map(item => item.planning_assigned_amount)))
      const uniqueVariations = Array.from(new Set(selectedItems.map(item => item.variations)))
      const uniqueQuantities = Array.from(new Set(selectedItems.map(item => item.quantity)))
      const uniqueRates = Array.from(new Set(selectedItems.map(item => item.rate)))
      
      setUnit(uniqueUnits.length === 1 && uniqueUnits[0] ? uniqueUnits[0] : '')
      setRemeasurable(uniqueRemeasurable.length === 1 ? uniqueRemeasurable[0] : null)
      setPlanningAssignedAmount(uniquePlanningAssigned.length === 1 ? uniquePlanningAssigned[0].toString() : '')
      setVariations(uniqueVariations.length === 1 ? uniqueVariations[0].toString() : '')
      setQuantity(uniqueQuantities.length === 1 ? uniqueQuantities[0].toString() : '')
      setRate(uniqueRates.length === 1 ? uniqueRates[0].toString() : '')
      
      setFieldsToUpdate(new Set())
    }
    
    // Reset when modal closes
    if (!isOpen && prevIsOpenRef.current) {
      setFieldsToUpdate(new Set())
      setUnit('')
      setRemeasurable(null)
      setPlanningAssignedAmount('')
      setVariations('')
      setQuantity('')
      setRate('')
    }
    
    // Update ref
    prevIsOpenRef.current = isOpen
  }, [isOpen, selectedItems.length]) // Use selectedItems.length instead of selectedItems array
  
  const handleFieldToggle = (field: string) => {
    const newFields = new Set(fieldsToUpdate)
    if (newFields.has(field)) {
      newFields.delete(field)
    } else {
      newFields.add(field)
    }
    setFieldsToUpdate(newFields)
  }
  
  const handleSave = async () => {
    if (fieldsToUpdate.size === 0) {
      setError('Please select at least one field to update')
      return
    }
    
    try {
      setLoading(true)
      setError('')
      setSuccess(false)
      
      const updateData: any = {}
      
      if (fieldsToUpdate.has('unit')) {
        updateData['Unit'] = unit || null
      }
      if (fieldsToUpdate.has('remeasurable') && remeasurable !== null) {
        updateData['Remeasurable?'] = remeasurable
      }
      if (fieldsToUpdate.has('planning_assigned_amount')) {
        updateData['Planning Assigned Amount'] = parseFloat(planningAssignedAmount) || 0
      }
      if (fieldsToUpdate.has('variations')) {
        updateData['Variations'] = parseFloat(variations) || 0
        // Also update total_including_variations if variations is being updated
        // We'll need to recalculate this for each item
      }
      if (fieldsToUpdate.has('quantity')) {
        updateData['Quantity'] = parseFloat(quantity) || 0
        // Total Value will be recalculated for each item based on quantity and rate
      }
      if (fieldsToUpdate.has('rate')) {
        updateData['Rate'] = parseFloat(rate) || 0
        // Total Value will be recalculated for each item based on quantity and rate
      }
      
      // If quantity or rate is being updated, we need to recalculate total_value for each item
      // This is handled in the parent component's handleBulkUpdate function
      if (fieldsToUpdate.has('quantity') || fieldsToUpdate.has('rate')) {
        // The parent component will handle recalculating total_value for each item
        // based on the new quantity and rate values
      }
      
      updateData.updated_at = new Date().toISOString()
      
      const ids = selectedItems.map(item => item.id)
      await onUpdate(ids, updateData)
      
      setSuccess(true)
      setTimeout(() => {
        onCancel()
      }, 1500)
    } catch (err: any) {
      console.error('Error updating items:', err)
      setError(err.message || 'Failed to update items')
    } finally {
      setLoading(false)
    }
  }
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Bulk Edit {selectedItems.length} Item(s)</CardTitle>
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="error">
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert variant="success">
              Items updated successfully!
            </Alert>
          )}
          
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Select the fields you want to update for all {selectedItems.length} selected items.
              Leave fields unchecked to keep their current values.
            </p>
            
            {/* Unit */}
            <div className="space-y-2 border border-gray-200 dark:border-gray-700 rounded-lg p-3 transition-all duration-200">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={fieldsToUpdate.has('unit')}
                  onChange={() => handleFieldToggle('unit')}
                  className="w-4 h-4 cursor-pointer"
                />
                <label className="font-medium cursor-pointer" onClick={() => handleFieldToggle('unit')}>
                  Unit
                </label>
              </div>
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                fieldsToUpdate.has('unit') 
                  ? 'max-h-96 opacity-100 mt-2' 
                  : 'max-h-0 opacity-0'
              }`}>
                <Input
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="Enter unit"
                  className="w-full"
                />
              </div>
            </div>
            
            {/* Remeasurable */}
            <div className="space-y-2 border border-gray-200 dark:border-gray-700 rounded-lg p-3 transition-all duration-200">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={fieldsToUpdate.has('remeasurable')}
                  onChange={() => handleFieldToggle('remeasurable')}
                  className="w-4 h-4 cursor-pointer"
                />
                <label className="font-medium cursor-pointer" onClick={() => handleFieldToggle('remeasurable')}>
                  Remeasurable
                </label>
              </div>
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                fieldsToUpdate.has('remeasurable') 
                  ? 'max-h-96 opacity-100 mt-2' 
                  : 'max-h-0 opacity-0'
              }`}>
                <select
                  value={remeasurable === null ? '' : remeasurable ? 'true' : 'false'}
                  onChange={(e) => setRemeasurable(e.target.value === '' ? null : e.target.value === 'true')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select...</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
            </div>
            
            {/* Planning Assigned Amount */}
            <div className="space-y-2 border border-gray-200 dark:border-gray-700 rounded-lg p-3 transition-all duration-200">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={fieldsToUpdate.has('planning_assigned_amount')}
                  onChange={() => handleFieldToggle('planning_assigned_amount')}
                  className="w-4 h-4 cursor-pointer"
                />
                <label className="font-medium cursor-pointer" onClick={() => handleFieldToggle('planning_assigned_amount')}>
                  Planning Assigned Amount
                </label>
              </div>
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                fieldsToUpdate.has('planning_assigned_amount') 
                  ? 'max-h-96 opacity-100 mt-2' 
                  : 'max-h-0 opacity-0'
              }`}>
                <Input
                  type="number"
                  step="0.01"
                  value={planningAssignedAmount}
                  onChange={(e) => setPlanningAssignedAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full"
                />
              </div>
            </div>
            
            {/* Variations */}
            <div className="space-y-2 border border-gray-200 dark:border-gray-700 rounded-lg p-3 transition-all duration-200">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={fieldsToUpdate.has('variations')}
                  onChange={() => handleFieldToggle('variations')}
                  className="w-4 h-4 cursor-pointer"
                />
                <label className="font-medium cursor-pointer" onClick={() => handleFieldToggle('variations')}>
                  Variations
                </label>
              </div>
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                fieldsToUpdate.has('variations') 
                  ? 'max-h-96 opacity-100 mt-2' 
                  : 'max-h-0 opacity-0'
              }`}>
                <Input
                  type="number"
                  step="0.01"
                  value={variations}
                  onChange={(e) => setVariations(e.target.value)}
                  placeholder="Enter variations amount"
                  className="w-full"
                />
              </div>
            </div>
            
            {/* Quantity */}
            <div className="space-y-2 border border-gray-200 dark:border-gray-700 rounded-lg p-3 transition-all duration-200">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={fieldsToUpdate.has('quantity')}
                  onChange={() => handleFieldToggle('quantity')}
                  className="w-4 h-4 cursor-pointer"
                />
                <label className="font-medium cursor-pointer" onClick={() => handleFieldToggle('quantity')}>
                  Quantity
                </label>
              </div>
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                fieldsToUpdate.has('quantity') 
                  ? 'max-h-96 opacity-100 mt-2' 
                  : 'max-h-0 opacity-0'
              }`}>
                <Input
                  type="number"
                  step="0.01"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Enter quantity"
                  className="w-full"
                />
              </div>
            </div>
            
            {/* Rate */}
            <div className="space-y-2 border border-gray-200 dark:border-gray-700 rounded-lg p-3 transition-all duration-200">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={fieldsToUpdate.has('rate')}
                  onChange={() => handleFieldToggle('rate')}
                  className="w-4 h-4 cursor-pointer"
                />
                <label className="font-medium cursor-pointer" onClick={() => handleFieldToggle('rate')}>
                  Rate
                </label>
              </div>
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                fieldsToUpdate.has('rate') 
                  ? 'max-h-96 opacity-100 mt-2' 
                  : 'max-h-0 opacity-0'
              }`}>
                <Input
                  type="number"
                  step="0.01"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  placeholder="Enter rate"
                  className="w-full"
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading || fieldsToUpdate.size === 0}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Update {selectedItems.length} Item(s)
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

