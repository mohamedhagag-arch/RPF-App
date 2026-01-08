'use client'

import { useState, useEffect } from 'react'
import { CommercialBOQItem, TABLES } from '@/lib/supabase'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { X, Save, Loader2 } from 'lucide-react'
import { useAuth } from '@/app/providers'

interface AddBOQItemFormSimplifiedProps {
  projectFullCode: string
  projectName: string
  onSave: (newItemId: string) => void
  onCancel: () => void
  isOpen: boolean
}

export function AddBOQItemFormSimplified({ 
  projectFullCode,
  projectName,
  onSave, 
  onCancel, 
  isOpen 
}: AddBOQItemFormSimplifiedProps) {
  const { appUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  
  // Form fields
  const [itemDescription, setItemDescription] = useState('')
  const [remeasurable, setRemeasurable] = useState(false)
  
  const supabase = getSupabaseClient()
  
  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setItemDescription('')
      setRemeasurable(false)
      setError('')
      setSuccess(false)
    }
  }, [isOpen])
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!itemDescription || itemDescription.trim() === '') {
      setError('Please enter an item description')
      return
    }
    
    if (!projectFullCode || !projectName) {
      setError('Project information is missing')
      return
    }
    
    try {
      setLoading(true)
      setError('')
      setSuccess(false)
      
      // Prepare data for Supabase (using exact column names from database)
      const insertData = {
        'Project Full Code': projectFullCode,
        'Project Name': projectName,
        'Item Description': itemDescription.trim(),
        'Remeasurable?': remeasurable,
        'Quantity': 0,
        'Rate': 0,
        'Total Value': 0,
        'Planning Assigned Amount': 0,
        'Variations': 0,
        'Total Including Variations': 0,
        // Auto-generated reference number will be created by trigger
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
      
      // Call onSave callback with the new item ID
      // ✅ FIX: TypeScript fix - ensure data has id property
      const itemId = (data as any)?.id || (data as any)?.['id'] || ''
      if (itemId) {
        setTimeout(() => {
          onSave(itemId)
        }, 500)
      }
      
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
      <Card className="w-full max-w-2xl">
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
              <Alert variant="error">
                {error}
              </Alert>
            )}
            
            {success && (
              <Alert variant="success">
                BOQ Item created successfully!
              </Alert>
            )}
            
            <div className="space-y-4">
              {/* Project Full Code (read-only) */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Project Full Code
                </label>
                <Input
                  value={projectFullCode}
                  disabled
                  className="bg-gray-100 dark:bg-gray-800"
                />
              </div>
              
              {/* Project Name (read-only) */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Project Name
                </label>
                <Input
                  value={projectName}
                  disabled
                  className="bg-gray-100 dark:bg-gray-800"
                />
              </div>
              
              {/* Item Description */}
              <div className="space-y-2">
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
              
              {/* Remeasurable */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={remeasurable}
                    onChange={(e) => setRemeasurable(e.target.checked)}
                    disabled={loading}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  Remeasurable
                </label>
              </div>
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
                    Create BOQ Item
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

