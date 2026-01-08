'use client'

import { useState, useEffect, useRef } from 'react'
import { ContractVariation, VariationStatus } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { X, Save, Loader2 } from 'lucide-react'

interface BulkEditVariationsModalProps {
  selectedVariations: ContractVariation[]
  onUpdate: (ids: string[], data: any) => Promise<void>
  onCancel: () => void
  isOpen: boolean
}

export function BulkEditVariationsModal({ 
  selectedVariations, 
  onUpdate, 
  onCancel, 
  isOpen 
}: BulkEditVariationsModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  
  // Form fields - only fields that can be bulk edited
  const [variationStatus, setVariationStatus] = useState<VariationStatus | ''>('')
  const [quantityChanges, setQuantityChanges] = useState('')
  const [variationAmount, setVariationAmount] = useState('')
  const [dateOfSubmission, setDateOfSubmission] = useState('')
  const [dateOfApproval, setDateOfApproval] = useState('')
  const [remarks, setRemarks] = useState('')
  
  // Track which fields are being updated
  const [fieldsToUpdate, setFieldsToUpdate] = useState<Set<string>>(new Set())
  
  // Track previous isOpen state to only initialize once when modal opens
  const prevIsOpenRef = useRef(false)
  
  // Load common values when modal opens (only once)
  useEffect(() => {
    // Only initialize when modal transitions from closed to open
    if (isOpen && !prevIsOpenRef.current && selectedVariations.length > 0) {
      const uniqueStatuses = Array.from(new Set(selectedVariations.map(v => v.variation_status)))
      const uniqueQuantityChanges = Array.from(new Set(selectedVariations.map(v => v.quantity_changes)))
      const uniqueVariationAmounts = Array.from(new Set(selectedVariations.map(v => v.variation_amount)))
      const uniqueSubmissionDates = Array.from(new Set(selectedVariations.map(v => v.date_of_submission).filter(Boolean)))
      const uniqueApprovalDates = Array.from(new Set(selectedVariations.map(v => v.date_of_approval).filter(Boolean)))
      const uniqueRemarks = Array.from(new Set(selectedVariations.map(v => v.remarks).filter(Boolean)))
      
      setVariationStatus(uniqueStatuses.length === 1 ? uniqueStatuses[0] : '')
      setQuantityChanges(uniqueQuantityChanges.length === 1 ? uniqueQuantityChanges[0].toString() : '')
      setVariationAmount(uniqueVariationAmounts.length === 1 ? uniqueVariationAmounts[0].toString() : '')
      setDateOfSubmission(uniqueSubmissionDates.length === 1 ? uniqueSubmissionDates[0] : '')
      setDateOfApproval(uniqueApprovalDates.length === 1 ? uniqueApprovalDates[0] : '')
      setRemarks(uniqueRemarks.length === 1 ? uniqueRemarks[0] || '' : '')
      
      setFieldsToUpdate(new Set())
    }
    
    // Reset when modal closes
    if (!isOpen && prevIsOpenRef.current) {
      setFieldsToUpdate(new Set())
      setVariationStatus('')
      setQuantityChanges('')
      setVariationAmount('')
      setDateOfSubmission('')
      setDateOfApproval('')
      setRemarks('')
    }
    
    // Update ref
    prevIsOpenRef.current = isOpen
  }, [isOpen, selectedVariations.length])
  
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
      
      if (fieldsToUpdate.has('variation_status') && variationStatus) {
        updateData['Variation Status'] = variationStatus
      }
      if (fieldsToUpdate.has('quantity_changes')) {
        updateData['Quantity Changes'] = quantityChanges === '' ? 0 : (isNaN(parseFloat(quantityChanges)) ? 0 : parseFloat(quantityChanges))
      }
      if (fieldsToUpdate.has('variation_amount')) {
        updateData['Variation Amount'] = variationAmount === '' ? 0 : (isNaN(parseFloat(variationAmount)) ? 0 : parseFloat(variationAmount))
      }
      if (fieldsToUpdate.has('date_of_submission')) {
        updateData['Date of Submission'] = dateOfSubmission || null
      }
      if (fieldsToUpdate.has('date_of_approval')) {
        updateData['Date of Approval'] = dateOfApproval || null
      }
      if (fieldsToUpdate.has('remarks')) {
        updateData['Remarks'] = remarks || null
      }
      
      updateData.updated_at = new Date().toISOString()
      
      const ids = selectedVariations.map(v => v.id)
      await onUpdate(ids, updateData)
      
      setSuccess(true)
      setTimeout(() => {
        onCancel()
      }, 1500)
    } catch (err: any) {
      console.error('Error updating variations:', err)
      setError(err.message || 'Failed to update variations')
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
            <CardTitle>Bulk Edit {selectedVariations.length} Variation(s)</CardTitle>
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
              Variations updated successfully!
            </Alert>
          )}
          
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Select the fields you want to update for all {selectedVariations.length} selected variations.
              Leave fields unchecked to keep their current values.
            </p>
            
            {/* Variation Status */}
            <div className="space-y-2 border border-gray-200 dark:border-gray-700 rounded-lg p-3 transition-all duration-200">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={fieldsToUpdate.has('variation_status')}
                  onChange={() => handleFieldToggle('variation_status')}
                  className="w-4 h-4 cursor-pointer"
                />
                <label className="font-medium cursor-pointer" onClick={() => handleFieldToggle('variation_status')}>
                  Variation Status
                </label>
              </div>
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                fieldsToUpdate.has('variation_status') 
                  ? 'max-h-96 opacity-100 mt-2' 
                  : 'max-h-0 opacity-0'
              }`}>
                <select
                  value={variationStatus}
                  onChange={(e) => setVariationStatus(e.target.value as VariationStatus)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select...</option>
                  {(['Pending', 'Var Notice Sent', 'Submitted', 'Approved', 'Rejected', 'Internal Variation'] as VariationStatus[])
                    .sort((a, b) => a.localeCompare(b))
                    .map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                </select>
              </div>
            </div>
            
            {/* Quantity Changes */}
            <div className="space-y-2 border border-gray-200 dark:border-gray-700 rounded-lg p-3 transition-all duration-200">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={fieldsToUpdate.has('quantity_changes')}
                  onChange={() => handleFieldToggle('quantity_changes')}
                  className="w-4 h-4 cursor-pointer"
                />
                <label className="font-medium cursor-pointer" onClick={() => handleFieldToggle('quantity_changes')}>
                  Quantity Changes
                </label>
              </div>
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                fieldsToUpdate.has('quantity_changes') 
                  ? 'max-h-96 opacity-100 mt-2' 
                  : 'max-h-0 opacity-0'
              }`}>
                <Input
                  type="number"
                  step="0.01"
                  value={quantityChanges}
                  onChange={(e) => setQuantityChanges(e.target.value)}
                  placeholder="Enter quantity changes"
                  className="w-full"
                />
              </div>
            </div>
            
            {/* Variation Amount */}
            <div className="space-y-2 border border-gray-200 dark:border-gray-700 rounded-lg p-3 transition-all duration-200">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={fieldsToUpdate.has('variation_amount')}
                  onChange={() => handleFieldToggle('variation_amount')}
                  className="w-4 h-4 cursor-pointer"
                />
                <label className="font-medium cursor-pointer" onClick={() => handleFieldToggle('variation_amount')}>
                  Variation Amount
                </label>
              </div>
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                fieldsToUpdate.has('variation_amount') 
                  ? 'max-h-96 opacity-100 mt-2' 
                  : 'max-h-0 opacity-0'
              }`}>
                <Input
                  type="number"
                  step="0.01"
                  value={variationAmount}
                  onChange={(e) => setVariationAmount(e.target.value)}
                  placeholder="Enter variation amount"
                  className="w-full"
                />
              </div>
            </div>
            
            {/* Date of Submission */}
            <div className="space-y-2 border border-gray-200 dark:border-gray-700 rounded-lg p-3 transition-all duration-200">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={fieldsToUpdate.has('date_of_submission')}
                  onChange={() => handleFieldToggle('date_of_submission')}
                  className="w-4 h-4 cursor-pointer"
                />
                <label className="font-medium cursor-pointer" onClick={() => handleFieldToggle('date_of_submission')}>
                  Date of Submission
                </label>
              </div>
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                fieldsToUpdate.has('date_of_submission') 
                  ? 'max-h-96 opacity-100 mt-2' 
                  : 'max-h-0 opacity-0'
              }`}>
                <Input
                  type="date"
                  value={dateOfSubmission}
                  onChange={(e) => setDateOfSubmission(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
            
            {/* Date of Approval */}
            <div className="space-y-2 border border-gray-200 dark:border-gray-700 rounded-lg p-3 transition-all duration-200">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={fieldsToUpdate.has('date_of_approval')}
                  onChange={() => handleFieldToggle('date_of_approval')}
                  className="w-4 h-4 cursor-pointer"
                />
                <label className="font-medium cursor-pointer" onClick={() => handleFieldToggle('date_of_approval')}>
                  Date of Approval
                </label>
              </div>
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                fieldsToUpdate.has('date_of_approval') 
                  ? 'max-h-96 opacity-100 mt-2' 
                  : 'max-h-0 opacity-0'
              }`}>
                <Input
                  type="date"
                  value={dateOfApproval}
                  onChange={(e) => setDateOfApproval(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
            
            {/* Remarks */}
            <div className="space-y-2 border border-gray-200 dark:border-gray-700 rounded-lg p-3 transition-all duration-200">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={fieldsToUpdate.has('remarks')}
                  onChange={() => handleFieldToggle('remarks')}
                  className="w-4 h-4 cursor-pointer"
                />
                <label className="font-medium cursor-pointer" onClick={() => handleFieldToggle('remarks')}>
                  Remarks
                </label>
              </div>
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                fieldsToUpdate.has('remarks') 
                  ? 'max-h-96 opacity-100 mt-2' 
                  : 'max-h-0 opacity-0'
              }`}>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter remarks..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>
            </div>
          </div>
          
          {/* Form Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Update Variations
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

