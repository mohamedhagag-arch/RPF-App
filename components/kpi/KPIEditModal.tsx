'use client'

import { useState, useEffect } from 'react'
import { ProcessedKPI } from '@/lib/kpiProcessor'
import { IntelligentKPIForm } from './IntelligentKPIForm'
import { SmartActualKPIForm } from './SmartActualKPIForm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { X, Target, CheckCircle, Calendar, Activity, Building, Hash } from 'lucide-react'

interface KPIEditModalProps {
  kpi: ProcessedKPI | null
  projects: any[]
  activities: any[]
  onUpdate: (id: string, data: any) => Promise<void>
  onCancel: () => void
  isOpen: boolean
}

export function KPIEditModal({ 
  kpi, 
  projects, 
  activities, 
  onUpdate, 
  onCancel, 
  isOpen 
}: KPIEditModalProps) {
  const [editFormType, setEditFormType] = useState<'intelligent' | 'smart-actual'>('intelligent')
  
  useEffect(() => {
    if (kpi) {
      // Determine which form to use based on KPI type
      if (kpi.input_type === 'Actual') {
        setEditFormType('smart-actual')
      } else {
        setEditFormType('intelligent')
      }
    }
  }, [kpi])

  if (!isOpen || !kpi) {
    return null
  }

  console.log('🎯 KPIEditModal: Rendering modal for KPI:', kpi.input_type)
  console.log('🎯 KPIEditModal: Form type:', editFormType)

  const isPlanned = kpi.input_type === 'Planned'
  const isActual = kpi.input_type === 'Actual'

  const handleUpdateKPI = async (data: any) => {
    try {
      console.log('📝 KPIEditModal: Updating KPI with data:', data)
      await onUpdate(kpi.id, data)
      console.log('✅ KPIEditModal: KPI updated successfully')
    } catch (error) {
      console.error('❌ KPIEditModal: Failed to update KPI:', error)
      throw error
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

            {/* Form Content */}
            <div className="p-6">
              {editFormType === 'intelligent' && (
                <IntelligentKPIForm
                  kpi={kpi}
                  projects={projects}
                  activities={activities}
                  onSubmit={handleUpdateKPI}
                  onCancel={onCancel}
                />
              )}
              
              {editFormType === 'smart-actual' && (
                <SmartActualKPIForm
                  kpi={kpi}
                  projects={projects}
                  activities={activities}
                  onSubmit={handleUpdateKPI}
                  onCancel={onCancel}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Compact version for inline editing
export function InlineKPIEdit({ 
  kpi, 
  projects, 
  activities, 
  onUpdate, 
  onCancel 
}: Omit<KPIEditModalProps, 'isOpen'>) {
  const [editFormType, setEditFormType] = useState<'intelligent' | 'smart-actual'>('intelligent')
  
  useEffect(() => {
    if (kpi) {
      if (kpi.input_type === 'Actual') {
        setEditFormType('smart-actual')
      } else {
        setEditFormType('intelligent')
      }
    }
  }, [kpi])

  if (!kpi) {
    return null
  }

  const handleUpdateKPI = async (data: any) => {
    try {
      await onUpdate(kpi.id, data)
    } catch (error) {
      throw error
    }
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
      {editFormType === 'intelligent' && (
        <IntelligentKPIForm
          kpi={kpi}
          projects={projects}
          activities={activities}
          onSubmit={handleUpdateKPI}
          onCancel={onCancel}
        />
      )}
      
      {editFormType === 'smart-actual' && (
        <SmartActualKPIForm
          kpi={kpi}
          projects={projects}
          activities={activities}
          onSubmit={handleUpdateKPI}
          onCancel={onCancel}
        />
      )}
    </div>
  )
}
