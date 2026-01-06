'use client'

import { useState, useEffect } from 'react'
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
  
  // Track which fields are being updated
  const [fieldsToUpdate, setFieldsToUpdate] = useState<Set<string>>(new Set())
  
  // Load common values when modal opens
  useEffect(() => {
    if (isOpen && selectedItems.length > 0) {
      const uniqueUnits = Array.from(new Set(selectedItems.map(item => item.unit).filter(Boolean)))
      const uniqueRemeasurable = Array.from(new Set(selectedItems.map(item => item.remeasurable)))
      const uniquePlanningAssigned = Array.from(new Set(selectedItems.map(item => item.planning_assigned_amount)))
      const uniqueVariations = Array.from(new Set(selectedItems.map(item => item.variations)))
      
      setUnit(uniqueUnits.length === 1 && uniqueUnits[0] ? uniqueUnits[0] : '')
      setRemeasurable(uniqueRemeasurable.length === 1 ? uniqueRemeasurable[0] : null)
      setPlanningAssignedAmount(uniquePlanningAssigned.length === 1 ? uniquePlanningAssigned[0].toString() : '')
      setVariations(uniqueVariations.length === 1 ? uniqueVariations[0].toString() : '')
      
      setFieldsToUpdate(new Set())
    }
  }, [isOpen, selectedItems])
  
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
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={fieldsToUpdate.has('unit')}
                  onChange={() => handleFieldToggle('unit')}
                />
                <label className="font-medium">Unit</label>
              </div>
              {fieldsToUpdate.has('unit') && (
                <Input
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="Enter unit"
                />
              )}
            </div>
            
            {/* Remeasurable */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={fieldsToUpdate.has('remeasurable')}
                  onChange={() => handleFieldToggle('remeasurable')}
                />
                <label className="font-medium">Remeasurable</label>
              </div>
              {fieldsToUpdate.has('remeasurable') && (
                <select
                  value={remeasurable === null ? '' : remeasurable ? 'true' : 'false'}
                  onChange={(e) => setRemeasurable(e.target.value === '' ? null : e.target.value === 'true')}
                  className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="">Select...</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              )}
            </div>
            
            {/* Planning Assigned Amount */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={fieldsToUpdate.has('planning_assigned_amount')}
                  onChange={() => handleFieldToggle('planning_assigned_amount')}
                />
                <label className="font-medium">Planning Assigned Amount</label>
              </div>
              {fieldsToUpdate.has('planning_assigned_amount') && (
                <Input
                  type="number"
                  step="0.01"
                  value={planningAssignedAmount}
                  onChange={(e) => setPlanningAssignedAmount(e.target.value)}
                  placeholder="Enter amount"
                />
              )}
            </div>
            
            {/* Variations */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={fieldsToUpdate.has('variations')}
                  onChange={() => handleFieldToggle('variations')}
                />
                <label className="font-medium">Variations</label>
              </div>
              {fieldsToUpdate.has('variations') && (
                <Input
                  type="number"
                  step="0.01"
                  value={variations}
                  onChange={(e) => setVariations(e.target.value)}
                  placeholder="Enter variations amount"
                />
              )}
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

