'use client'

import { useState, useEffect, useMemo } from 'react'
import { CommercialBOQItem, Project, TABLES } from '@/lib/supabase'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
import { buildProjectFullCode } from '@/lib/projectDataFetcher'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { X, Save, Loader2 } from 'lucide-react'
import { formatCurrencyByCodeSync } from '@/lib/currenciesManager'

interface AddBOQItemFormProps {
  projects: Project[]
  onSave: () => void
  onCancel: () => void
  isOpen: boolean
}

export function AddBOQItemForm({ 
  projects, 
  onSave, 
  onCancel, 
  isOpen 
}: AddBOQItemFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  
  // Form fields
  const [projectFullCode, setProjectFullCode] = useState('')
  const [projectName, setProjectName] = useState('')
  const [itemDescription, setItemDescription] = useState('')
  const [unit, setUnit] = useState('')
  const [quantity, setQuantity] = useState('')
  const [rate, setRate] = useState('')
  const [remeasurable, setRemeasurable] = useState(false)
  const [planningAssignedAmount, setPlanningAssignedAmount] = useState('')
  const [variations, setVariations] = useState('')
  
  const supabase = getSupabaseClient()
  
  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setProjectFullCode('')
      setProjectName('')
      setItemDescription('')
      setUnit('')
      setQuantity('')
      setRate('')
      setRemeasurable(false)
      setPlanningAssignedAmount('')
      setVariations('')
      setError('')
      setSuccess(false)
    }
  }, [isOpen])
  
  // Auto-fill project name when project code is selected
  const handleProjectCodeChange = (code: string) => {
    // Use the code directly as it's already the correct full code from the dropdown
    setProjectFullCode(code)
    // Find the project by matching the full code (always use buildProjectFullCode for comparison)
    const selectedProject = projects.find(p => {
      const projectFullCode = p.project_full_code || buildProjectFullCode(p)
      return projectFullCode === code
    })
    if (selectedProject) {
      setProjectName(selectedProject.project_name)
    }
  }
  
  // Calculate totals
  const calculatedTotalValue = useMemo(() => {
    const qty = parseFloat(quantity) || 0
    const rt = parseFloat(rate) || 0
    return qty * rt
  }, [quantity, rate])
  
  const calculatedTotalIncludingVariations = useMemo(() => {
    const vars = parseFloat(variations) || 0
    return calculatedTotalValue + vars
  }, [calculatedTotalValue, variations])
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!projectFullCode || !projectName || !itemDescription) {
      setError('Please fill in all required fields (Project Full Code, Project Name, Item Description)')
      return
    }
    
    if (!quantity || parseFloat(quantity) <= 0) {
      setError('Please enter a valid quantity')
      return
    }
    
    if (!rate || parseFloat(rate) < 0) {
      setError('Please enter a valid rate')
      return
    }
    
    try {
      setLoading(true)
      setError('')
      setSuccess(false)
      
      const quantityNum = parseFloat(quantity)
      const rateNum = parseFloat(rate)
      const totalValue = quantityNum * rateNum
      const variationsNum = parseFloat(variations) || 0
      const totalIncludingVariations = totalValue + variationsNum
      const planningAssignedNum = parseFloat(planningAssignedAmount) || 0
      
      // Prepare data for Supabase (using exact column names from database)
      const insertData = {
        'Project Full Code': projectFullCode,
        'Project Name': projectName,
        'Item Description': itemDescription,
        'Unit': unit || null,
        'Quantity': quantityNum,
        'Rate': rateNum,
        'Total Value': totalValue,
        'Remeasurable?': remeasurable,
        'Planning Assigned Amount': planningAssignedNum,
        'Variations': variationsNum,
        'Total Including Variations': totalIncludingVariations,
      }
      
      console.log('💾 Inserting BOQ Item:', insertData)
      
      const { data, error: insertError } = await supabase
        .from(TABLES.COMMERCIAL_BOQ_ITEMS)
        .insert([insertData] as any)
        .select()
        .single()
      
      if (insertError) {
        console.error('❌ Database error:', insertError)
        throw insertError
      }
      
      console.log('✅ BOQ Item created successfully:', data)
      
      setSuccess(true)
      
      // Reset form
      setProjectFullCode('')
      setProjectName('')
      setItemDescription('')
      setUnit('')
      setQuantity('')
      setRate('')
      setRemeasurable(false)
      setPlanningAssignedAmount('')
      setVariations('')
      
      // Call onSave callback to refresh the list
      setTimeout(() => {
        onSave()
        onCancel()
      }, 1500)
      
    } catch (err: any) {
      console.error('❌ Error creating BOQ item:', err)
      setError(err.message || 'Failed to create BOQ item')
    } finally {
      setLoading(false)
    }
  }
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Add New BOQ Item</CardTitle>
            <Button variant="ghost" size="sm" onClick={onCancel} disabled={loading}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive" onClose={() => setError('')}>
                {error}
              </Alert>
            )}
            
            {success && (
              <Alert variant="success">
                BOQ Item created successfully!
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
                  {projects.map((project) => {
                    // Always use buildProjectFullCode to ensure consistent formatting
                    // This prevents duplication issues when project_full_code might be incorrectly set
                    const fullCode = buildProjectFullCode(project)
                    return (
                      <option key={project.id} value={fullCode}>
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
                  placeholder="Enter project name"
                />
              </div>
              
              {/* Item Description */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">
                  Item Description <span className="text-red-500">*</span>
                </label>
                <Input
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="Enter item description"
                />
              </div>
              
              {/* Unit */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Unit</label>
                <Input
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  disabled={loading}
                  placeholder="e.g., m², m³, kg"
                />
              </div>
              
              {/* Quantity */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="Enter quantity"
                  min="0"
                />
              </div>
              
              {/* Rate */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Rate (Currency) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="Enter rate"
                  min="0"
                />
              </div>
              
              {/* Total Value (Calculated) */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Total Value (Auto-calculated)</label>
                <div className="px-3 py-2 border rounded-md bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                  {formatCurrencyByCodeSync('AED', calculatedTotalValue)}
                </div>
              </div>
              
              {/* Remeasurable */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Remeasurable?</label>
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    checked={remeasurable}
                    onChange={(e) => setRemeasurable(e.target.checked)}
                    disabled={loading}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Yes</span>
                </div>
              </div>
              
              {/* Planning Assigned Amount */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Planning Assigned Amount</label>
                <Input
                  type="number"
                  step="0.01"
                  value={planningAssignedAmount}
                  onChange={(e) => setPlanningAssignedAmount(e.target.value)}
                  disabled={loading}
                  placeholder="Enter planning assigned amount"
                  min="0"
                />
              </div>
              
              {/* Variations */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Variations</label>
                <Input
                  type="number"
                  step="0.01"
                  value={variations}
                  onChange={(e) => setVariations(e.target.value)}
                  disabled={loading}
                  placeholder="Enter variations amount"
                />
              </div>
              
              {/* Total Including Variations (Calculated) */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Total Including Variations (Auto-calculated)</label>
                <div className="px-3 py-2 border rounded-md bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                  {formatCurrencyByCodeSync('AED', calculatedTotalIncludingVariations)}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-4 border-t">
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
                    Create Item
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

