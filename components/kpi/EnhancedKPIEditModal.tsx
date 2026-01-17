'use client'

import { useState, useEffect } from 'react'
import { ProcessedKPI } from '@/lib/kpiProcessor'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { X, Target, CheckCircle, Calendar, Activity, Building, Hash, Save } from 'lucide-react'

interface EnhancedKPIEditModalProps {
  kpi: ProcessedKPI | null
  projects: any[]
  activities: any[]
  onUpdate: (id: string, data: any) => Promise<void>
  onCancel: () => void
  isOpen: boolean
}

export function EnhancedKPIEditModal({ 
  kpi, 
  projects, 
  activities, 
  onUpdate, 
  onCancel, 
  isOpen 
}: EnhancedKPIEditModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Form fields
  const [projectCode, setProjectCode] = useState('')
  const [activityName, setActivityName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [actualDate, setActualDate] = useState('')
  const [section, setSection] = useState('')
  const [day, setDay] = useState('')
  const [drilledMeters, setDrilledMeters] = useState('')
  
  // Load data when editing
  useEffect(() => {
    if (kpi) {
      console.log('📝 EnhancedKPIEditModal: Loading KPI data for editing:', kpi)
      console.log('📝 EnhancedKPIEditModal: KPI project_full_code:', kpi.project_full_code)
      console.log('📝 EnhancedKPIEditModal: KPI activity_name:', kpi.activity_name)
      console.log('📝 EnhancedKPIEditModal: KPI quantity:', kpi.quantity)
      
      setProjectCode(kpi.project_full_code || '')
      setActivityName(kpi.activity_name || '')
      setQuantity(kpi.quantity?.toString() || '')
      setUnit(kpi.unit || '')
      
      console.log('📝 EnhancedKPIEditModal: Loaded projectCode:', kpi.project_full_code)
      console.log('📝 EnhancedKPIEditModal: Loaded activityName:', kpi.activity_name)
      console.log('📝 EnhancedKPIEditModal: Loaded quantity:', kpi.quantity)
      console.log('📝 EnhancedKPIEditModal: Full KPI object:', kpi)
      
      // Handle date formatting
      const formatDateForInput = (dateStr: string) => {
        if (!dateStr) return ''
        try {
          const date = new Date(dateStr)
          if (isNaN(date.getTime())) return ''
          return date.toISOString().split('T')[0]
        } catch {
          return ''
        }
      }
      
      setTargetDate(formatDateForInput(kpi.target_date || ''))
      setActualDate(formatDateForInput(kpi.activity_date || ''))
      setSection(kpi.section || '')
      setDay((kpi as any).day || '')
      setDrilledMeters(kpi.drilled_meters?.toString() || '')
    }
  }, [kpi])

  if (!isOpen || !kpi) {
    return null
  }

  const isPlanned = kpi.input_type === 'Planned'
  const isActual = kpi.input_type === 'Actual'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validate required fields
    if (!projectCode.trim()) {
      setError('Project Code is required')
      setLoading(false)
      return
    }
    
    if (!activityName.trim()) {
      setError('Activity Name is required')
      setLoading(false)
      return
    }
    
    if (!quantity.trim()) {
      setError('Quantity is required')
      setLoading(false)
      return
    }

    try {
      const formData = {
        project_full_code: projectCode.trim(),
        project_code: projectCode.trim(), // Add project_code for compatibility
        activity_name: activityName.trim(),
        quantity: parseFloat(quantity) || 0,
        unit: unit.trim(),
        target_date: targetDate,
        actual_date: actualDate,
        activity_date: actualDate || targetDate,
        section: section.trim(),
        day: day.trim(),
        drilled_meters: parseFloat(drilledMeters) || 0,
        input_type: kpi.input_type
      }

      console.log('📝 EnhancedKPIEditModal: Sending form data:', formData)
      console.log('📝 EnhancedKPIEditModal: KPI ID:', kpi.id)
      console.log('📝 EnhancedKPIEditModal: Project Full Code:', formData.project_full_code)
      console.log('📝 EnhancedKPIEditModal: Activity Name:', formData.activity_name)
      console.log('📝 EnhancedKPIEditModal: Current projectCode state:', projectCode)
      console.log('📝 EnhancedKPIEditModal: Current activityName state:', activityName)
      
      await onUpdate(kpi.id, formData)
    } catch (error: any) {
      setError(error.message || 'Failed to update KPI')
    } finally {
      setLoading(false)
    }
  }

  const getModalTitle = () => {
    if (isPlanned) {
      return 'Edit Planned KPI Target'
    } else {
      return 'Edit Actual KPI Achievement'
    }
  }

  const getModalIcon = () => {
    if (isPlanned) {
      return <Target className="h-6 w-6 text-blue-600" />
    } else {
      return <CheckCircle className="h-6 w-6 text-green-600" />
    }
  }

  const getModalDescription = () => {
    if (isPlanned) {
      return 'Edit the planned target for this KPI activity'
    } else {
      return 'Edit the actual achievement for this KPI activity'
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <Card className="bg-white dark:bg-gray-900 shadow-2xl border-0">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-750 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getModalIcon()}
                <div>
                  <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
                    {getModalTitle()}
                  </CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {getModalDescription()}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={onCancel}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {/* KPI Information Header */}
            <div className="p-6 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Activity className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Activity</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{kpi.activity_name}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Building className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Project</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{kpi.project_full_code}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Hash className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Quantity</p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {kpi.quantity.toLocaleString()} {kpi.unit || 'units'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Form Content */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Project Code */}
                <div className="space-y-2">
                  <Label htmlFor="projectCode" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Project Code *
                  </Label>
                  <Input
                    id="projectCode"
                    value={projectCode}
                    onChange={(e) => setProjectCode(e.target.value)}
                    required
                    className="w-full"
                  />
                </div>

                {/* Activity Description */}
                <div className="space-y-2">
                  <Label htmlFor="activityName" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Activity Description *
                  </Label>
                  <Input
                    id="activityName"
                    value={activityName}
                    onChange={(e) => setActivityName(e.target.value)}
                    required
                    className="w-full"
                  />
                </div>

                {/* Quantity */}
                <div className="space-y-2">
                  <Label htmlFor="quantity" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Quantity *
                  </Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                    className="w-full"
                    step="0.01"
                  />
                </div>

                {/* Unit */}
                <div className="space-y-2">
                  <Label htmlFor="unit" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Unit *
                  </Label>
                  <Input
                    id="unit"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    required
                    className="w-full"
                  />
                </div>

                {/* Target Date */}
                <div className="space-y-2">
                  <Label htmlFor="targetDate" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Target Date
                  </Label>
                  <Input
                    id="targetDate"
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full"
                  />
                </div>

                {/* Actual Date */}
                <div className="space-y-2">
                  <Label htmlFor="actualDate" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Actual Date
                  </Label>
                  <Input
                    id="actualDate"
                    type="date"
                    value={actualDate}
                    onChange={(e) => setActualDate(e.target.value)}
                    className="w-full"
                  />
                </div>

                {/* Section */}
                <div className="space-y-2">
                  <Label htmlFor="section" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Section
                  </Label>
                  <Input
                    id="section"
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    className="w-full"
                  />
                </div>

                {/* Day */}
                <div className="space-y-2">
                  <Label htmlFor="day" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Day Number
                  </Label>
                  <Input
                    id="day"
                    value={day}
                    onChange={(e) => setDay(e.target.value)}
                    className="w-full"
                  />
                </div>

                {/* Drilled Meters */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="drilledMeters" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Drilled Meters
                  </Label>
                  <Input
                    id="drilledMeters"
                    type="number"
                    value={drilledMeters}
                    onChange={(e) => setDrilledMeters(e.target.value)}
                    className="w-full"
                    step="0.01"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
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
                  className="flex items-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>{loading ? 'Saving...' : 'Save Changes'}</span>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
