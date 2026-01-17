'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { ContractVariation, VariationStatus, TABLES, Project, CommercialBOQItem } from '@/lib/supabase'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
import { buildProjectFullCode } from '@/lib/projectDataFetcher'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { X, Save, Loader2, Plus, Calculator, Edit } from 'lucide-react'
import { useAuth } from '@/app/providers'
import { AddBOQItemFormSimplified } from './AddBOQItemFormSimplified'

interface AddVariationFormProps {
  projects: Project[]
  boqItems: CommercialBOQItem[]
  onSave: () => void
  onCancel: () => void
  isOpen: boolean
  onBOQItemsRefresh?: () => void
}

export function AddVariationForm({ 
  projects, 
  boqItems,
  onSave, 
  onCancel, 
  isOpen,
  onBOQItemsRefresh
}: AddVariationFormProps) {
  const { appUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showAddBOQForm, setShowAddBOQForm] = useState(false)
  
  // Form fields
  const [projectFullCode, setProjectFullCode] = useState('')
  const [projectName, setProjectName] = useState('')
  const [variationRefNo, setVariationRefNo] = useState('')
  const [selectedBOQItem, setSelectedBOQItem] = useState<string>('')
  const [quantityChanges, setQuantityChanges] = useState('')
  const [variationAmount, setVariationAmount] = useState('')
  const [dateOfSubmission, setDateOfSubmission] = useState('')
  const [variationStatus, setVariationStatus] = useState<VariationStatus>('Pending')
  const [dateOfApproval, setDateOfApproval] = useState('')
  const [remarks, setRemarks] = useState('')
  const [forceIncludeInBOQCalculation, setForceIncludeInBOQCalculation] = useState(false)
  const [useManualAmount, setUseManualAmount] = useState(false)
  const previousVariationAmountRef = useRef<string>('')
  
  const supabase = getSupabaseClient()
  
  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setProjectFullCode('')
      setProjectName('')
      setVariationRefNo('')
      setSelectedBOQItem('')
      setQuantityChanges('')
      setVariationAmount('')
      setDateOfSubmission('')
      setVariationStatus('Pending')
      setDateOfApproval('')
      setRemarks('')
      setForceIncludeInBOQCalculation(false)
      setError('')
      setSuccess(false)
      setUseManualAmount(false)
    }
  }, [isOpen])
  
  // Auto-fill project name when project code is selected
  const handleProjectCodeChange = (code: string) => {
    setProjectFullCode(code)
    const selectedProject = projects.find(p => {
      const projectSubCode = (p.project_sub_code || '').toString().trim()
      return projectSubCode === code || buildProjectFullCode(p) === code
    })
    if (selectedProject) {
      setProjectName(selectedProject.project_name)
    }
  }
  
  // Get BOQ items for selected project
  const availableBOQItems = useMemo(() => {
    if (!projectFullCode) return []
    return boqItems.filter(item => item.project_full_code === projectFullCode)
  }, [projectFullCode, boqItems])
  
  // Calculate Variation Amount automatically when BOQ item or Quantity Changes changes
  // Only calculate if manual mode is disabled
  useEffect(() => {
    if (!useManualAmount && selectedBOQItem && quantityChanges !== '') {
      const selectedItem = boqItems.find(item => item.id === selectedBOQItem)
      if (selectedItem) {
        const qtyChanges = parseFloat(quantityChanges)
        if (!isNaN(qtyChanges)) {
          const calculatedAmount = qtyChanges * (selectedItem.rate || 0)
          setVariationAmount(calculatedAmount.toString())
        }
      }
    }
  }, [useManualAmount, selectedBOQItem, quantityChanges, boqItems])
  
  // Re-enable auto-calculation when variation amount is explicitly cleared (not when it's 0)
  useEffect(() => {
    // Only re-enable if the field was previously non-empty and is now empty AND we're in manual mode
    // This prevents re-enabling when toggling to manual mode with an already empty field
    if (variationAmount === '' && useManualAmount && previousVariationAmountRef.current !== '') {
      setUseManualAmount(false)
    }
    // Update the ref to track the previous value
    previousVariationAmountRef.current = variationAmount
  }, [variationAmount, useManualAmount])
  
  // Handle BOQ item creation
  const handleBOQItemCreated = async (newItemId: string) => {
    // Refresh BOQ items list
    if (onBOQItemsRefresh) {
      onBOQItemsRefresh()
    }
    
    // Close the BOQ form
    setShowAddBOQForm(false)
    
    // Auto-select the new item
    setSelectedBOQItem(newItemId)
  }
  
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!projectFullCode || !projectName) {
      setError('Please select a project')
      return
    }
    
    // Validate BOQ item selection
    const validBOQItem = (selectedBOQItem || '').trim()
    if (!validBOQItem) {
      setError('Please select a BOQ item')
      return
    }
    
    if (!variationAmount || isNaN(parseFloat(variationAmount))) {
      setError('Please enter a valid variation amount')
      return
    }
    
    try {
      setLoading(true)
      setError('')
      setSuccess(false)
      
      const quantityChangesNum = quantityChanges === '' ? 0 : (isNaN(parseFloat(quantityChanges)) ? 0 : parseFloat(quantityChanges))
      const variationAmountNum = variationAmount === '' ? 0 : (isNaN(parseFloat(variationAmount)) ? 0 : parseFloat(variationAmount))
      
      // Prepare data for Supabase (using exact column names from database)
      const insertData = {
        'Project Full Code': projectFullCode,
        'Project Name': projectName,
        'Variation Ref no.': variationRefNo ? (variationRefNo.startsWith('VAR-') ? variationRefNo : `VAR-${variationRefNo}`) : null,
        'Item Description': validBOQItem, // Single UUID
        'Quantity Changes': quantityChangesNum,
        'Variation Amount': variationAmountNum,
        'Date of Submission': dateOfSubmission || null,
        'Variation Status': variationStatus,
        'Date of Approval': dateOfApproval || null,
        'Remarks': remarks || null,
        'Force Include in BOQ Calculation': forceIncludeInBOQCalculation || false,
        created_by: appUser?.id || null,
      }
      
      console.log('💾 Inserting Variation:', insertData)
      
      const { data, error: insertError } = await supabase
        .from(TABLES.CONTRACT_VARIATIONS)
        .insert([insertData] as any)
        .select()
        .single()
      
      if (insertError) {
        console.error('❌ Database error:', insertError)
        throw insertError
      }
      
      console.log('✅ Variation created successfully:', data)
      
      setSuccess(true)
      
      // Call onSave callback to refresh the list
      // Note: BOQ items variations will be updated by the parent component
      setTimeout(() => {
        onSave()
        onCancel()
      }, 1500)
      
    } catch (err: any) {
      console.error('❌ Error creating variation:', err)
      setError(err.message || 'Failed to create variation')
    } finally {
      setLoading(false)
    }
  }
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Add New Variation</CardTitle>
            <Button variant="ghost" size="sm" onClick={onCancel} disabled={loading}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="error">
                {error}
              </Alert>
            )}
            
            {success && (
              <Alert variant="success">
                Variation created successfully!
              </Alert>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Project Full Code */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Project Full Code <span className="text-red-500">*</span>
                </label>
                <select
                  value={projectFullCode}
                  onChange={(e) => handleProjectCodeChange(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                  disabled={loading}
                >
                  <option value="">Select Project...</option>
                  {[...projects].sort((a, b) => {
                    const aCode = buildProjectFullCode(a).toLowerCase()
                    const bCode = buildProjectFullCode(b).toLowerCase()
                    const codeCompare = aCode.localeCompare(bCode)
                    if (codeCompare !== 0) return codeCompare
                    return (a.project_name || '').toLowerCase().localeCompare((b.project_name || '').toLowerCase())
                  }).map((project) => {
                    const fullCode = buildProjectFullCode(project)
                    return (
                      <option key={project.id} value={project.project_sub_code || fullCode}>
                        {fullCode} - {project.project_name}
                      </option>
                    )
                  })}
                </select>
              </div>
              
              {/* Project Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Project Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="Auto-populated from project selection"
                />
              </div>
              
              {/* Variation Ref No. */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Variation Ref No.
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">
                    VAR-
                  </span>
                  <Input
                    value={variationRefNo}
                    onChange={(e) => {
                      let value = e.target.value;
                      // Remove "VAR-" prefix if user types it (will be added automatically)
                      value = value.replace(/^VAR-+/i, '');
                      setVariationRefNo(value);
                    }}
                    disabled={loading}
                    placeholder="EXT-123"
                    className="pl-12"
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Prefix "VAR-" will be added automatically
                </p>
              </div>
              
              {/* Variation Status */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Variation Status <span className="text-red-500">*</span>
                </label>
                <select
                  value={variationStatus}
                  onChange={(e) => setVariationStatus(e.target.value as VariationStatus)}
                  required
                  className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                  disabled={loading}
                >
                  {(['Pending', 'Var Notice Sent', 'Submitted', 'Approved', 'Rejected', 'Internal Variation'] as VariationStatus[])
                    .sort((a, b) => a.localeCompare(b))
                    .map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                </select>
              </div>
              
              {/* Include in BOQ Calculation */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  FORCE Include in BOQ Calculation
                </label>
                <div className="flex items-center space-x-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={forceIncludeInBOQCalculation}
                      onChange={(e) => setForceIncludeInBOQCalculation(e.target.checked)}
                      disabled={loading}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 dark:peer-checked:bg-blue-600"></div>
                  </label>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {forceIncludeInBOQCalculation ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  When enabled, this variation will be included in BOQ calculations even if status is not Approved
                </p>
              </div>
              
              {/* Quantity Changes */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Quantity Changes
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={quantityChanges}
                  onChange={(e) => setQuantityChanges(e.target.value)}
                  disabled={loading}
                  placeholder="Enter quantity changes"
                />
              </div>
              
              {/* Variation Amount */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    Variation Amount <span className="text-red-500">*</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useManualAmount}
                      onChange={(e) => {
                        setUseManualAmount(e.target.checked)
                        if (!e.target.checked && selectedBOQItem && quantityChanges !== '') {
                          // Re-calculate when switching back to auto
                          const selectedItem = boqItems.find(item => item.id === selectedBOQItem)
                          if (selectedItem) {
                            const qtyChanges = parseFloat(quantityChanges)
                            if (!isNaN(qtyChanges)) {
                              const calculatedAmount = qtyChanges * (selectedItem.rate || 0)
                              setVariationAmount(calculatedAmount.toString())
                            }
                          }
                        }
                      }}
                      disabled={loading || !selectedBOQItem || quantityChanges === ''}
                      className="cursor-pointer"
                    />
                    <span className="text-gray-600 dark:text-gray-400">
                      {useManualAmount ? (
                        <span className="flex items-center gap-1">
                          <Edit className="h-3 w-3" />
                          Manual Entry
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Calculator className="h-3 w-3" />
                          Auto-calculate
                        </span>
                      )}
                    </span>
                  </label>
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    value={variationAmount}
                    onChange={(e) => setVariationAmount(e.target.value)}
                    required
                    disabled={loading}
                    placeholder="Enter variation amount"
                    className={useManualAmount ? "border-blue-500 dark:border-blue-400" : ""}
                  />
                  {useManualAmount && (
                    <Edit className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-500 dark:text-blue-400" />
                  )}
                </div>
              </div>
              
              {/* Date of Submission */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Date of Submission
                </label>
                <Input
                  type="date"
                  value={dateOfSubmission}
                  onChange={(e) => setDateOfSubmission(e.target.value)}
                  disabled={loading}
                />
              </div>
              
              {/* Date of Approval */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Date of Approval
                </label>
                <Input
                  type="date"
                  value={dateOfApproval}
                  onChange={(e) => setDateOfApproval(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
            
            {/* BOQ Item Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                BOQ Item <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedBOQItem}
                onChange={(e) => setSelectedBOQItem(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                disabled={loading || !projectFullCode}
              >
                <option value="">Select BOQ Item...</option>
                {[...availableBOQItems].sort((a, b) => {
                  const aDesc = (a.item_description || '').toLowerCase()
                  const bDesc = (b.item_description || '').toLowerCase()
                  return aDesc.localeCompare(bDesc)
                }).map(item => (
                  <option key={item.id} value={item.id}>
                    {item.item_description} ({item.auto_generated_unique_reference_number})
                  </option>
                ))}
              </select>
              {!projectFullCode && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Please select a project first to see available BOQ items
                </p>
              )}
              {projectFullCode && (
                <div className="mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddBOQForm(true)}
                    disabled={loading}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add New BOQ Item for This Project
                  </Button>
                </div>
              )}
            </div>
            
            {/* Remarks */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Remarks
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                disabled={loading}
                placeholder="Enter remarks..."
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                rows={3}
              />
            </div>
            
            {/* Form Actions */}
            <div className="flex justify-end gap-2 pt-4">
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
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Create Variation
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      
      {/* Simplified BOQ Item Form */}
      <AddBOQItemFormSimplified
        projectFullCode={projectFullCode}
        projectName={projectName}
        onSave={handleBOQItemCreated}
        onCancel={() => setShowAddBOQForm(false)}
        isOpen={showAddBOQForm}
      />
    </div>
  )
}

