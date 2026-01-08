'use client'

import { useState, useEffect, useMemo } from 'react'
import { ContractVariation, VariationStatus, TABLES, Project, CommercialBOQItem } from '@/lib/supabase'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
import { buildProjectFullCode } from '@/lib/projectDataFetcher'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { X, Save, Loader2, Plus } from 'lucide-react'
import { useAuth } from '@/app/providers'

interface AddVariationFormProps {
  projects: Project[]
  boqItems: CommercialBOQItem[]
  onSave: () => void
  onCancel: () => void
  isOpen: boolean
}

export function AddVariationForm({ 
  projects, 
  boqItems,
  onSave, 
  onCancel, 
  isOpen 
}: AddVariationFormProps) {
  const { appUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  
  // Form fields
  const [projectFullCode, setProjectFullCode] = useState('')
  const [projectName, setProjectName] = useState('')
  const [variationRefNo, setVariationRefNo] = useState('')
  const [selectedBOQItems, setSelectedBOQItems] = useState<string[]>([''])
  const [quantityChanges, setQuantityChanges] = useState('')
  const [variationAmount, setVariationAmount] = useState('')
  const [dateOfSubmission, setDateOfSubmission] = useState('')
  const [variationStatus, setVariationStatus] = useState<VariationStatus>('Pending')
  const [dateOfApproval, setDateOfApproval] = useState('')
  const [remarks, setRemarks] = useState('')
  
  const supabase = getSupabaseClient()
  
  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setProjectFullCode('')
      setProjectName('')
      setVariationRefNo('')
      setSelectedBOQItems([''])
      setQuantityChanges('')
      setVariationAmount('')
      setDateOfSubmission('')
      setVariationStatus('Pending')
      setDateOfApproval('')
      setRemarks('')
      setError('')
      setSuccess(false)
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
  
  // Handle BOQ item selection change
  const handleBOQItemChange = (index: number, itemId: string) => {
    const newItems = [...selectedBOQItems]
    newItems[index] = itemId
    setSelectedBOQItems(newItems)
  }
  
  // Add new BOQ item field
  const handleAddBOQItem = () => {
    setSelectedBOQItems([...selectedBOQItems, ''])
  }
  
  // Remove BOQ item field
  const handleRemoveBOQItem = (index: number) => {
    const newItems = selectedBOQItems.filter((_, i) => i !== index)
    if (newItems.length === 0) {
      setSelectedBOQItems([''])
    } else {
      setSelectedBOQItems(newItems)
    }
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!projectFullCode || !projectName) {
      setError('Please select a project')
      return
    }
    
    // Filter out empty BOQ item selections
    const validBOQItems = selectedBOQItems.filter(id => id && id.trim() !== '')
    if (validBOQItems.length === 0) {
      setError('Please select at least one BOQ item')
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
        'Variation Ref no.': variationRefNo || null,
        'Item Description': validBOQItems, // Array of UUIDs
        'Quantity Changes': quantityChangesNum,
        'Variation Amount': variationAmountNum,
        'Date of Submission': dateOfSubmission || null,
        'Variation Status': variationStatus,
        'Date of Approval': dateOfApproval || null,
        'Remarks': remarks || null,
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
                <Input
                  value={variationRefNo}
                  onChange={(e) => setVariationRefNo(e.target.value)}
                  disabled={loading}
                  placeholder="Enter variation reference number"
                />
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
                <label className="text-sm font-medium">
                  Variation Amount <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={variationAmount}
                  onChange={(e) => setVariationAmount(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="Enter variation amount"
                />
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
            
            {/* BOQ Items Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                BOQ Items <span className="text-red-500">*</span>
              </label>
              {selectedBOQItems.map((itemId, index) => (
                <div key={index} className="flex items-center gap-2">
                  <select
                    value={itemId}
                    onChange={(e) => handleBOQItemChange(index, e.target.value)}
                    required={index === 0}
                    className="flex-1 px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
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
                  {selectedBOQItems.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveBOQItem(index)}
                      disabled={loading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddBOQItem}
                disabled={loading || !projectFullCode}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add BOQ Item
              </Button>
              {!projectFullCode && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Please select a project first to see available BOQ items
                </p>
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
    </div>
  )
}

