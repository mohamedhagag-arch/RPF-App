'use client'

import { useState, useEffect } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { Project } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'

interface ProjectFormProps {
  project: Project | null
  onSubmit: (data: Partial<Project>) => void
  onCancel: () => void
}

export function ProjectForm({ project, onSubmit, onCancel }: ProjectFormProps) {
  const guard = usePermissionGuard()
  const [formData, setFormData] = useState({
    project_code: '',
    project_sub_code: '',
    project_name: '',
    project_type: '',
    responsible_division: '',
    plot_number: '',
    kpi_completed: false,
    project_status: 'upcoming' as 'upcoming' | 'site-preparation' | 'on-going' | 'completed-duration' | 'contract-completed' | 'on-hold' | 'cancelled',
    contract_amount: 0,
  })
  const [error, setError] = useState('')

  useEffect(() => {
    if (project) {
      setFormData({
        project_code: project.project_code,
        project_sub_code: project.project_sub_code || '',
        project_name: project.project_name,
        project_type: project.project_type || '',
        responsible_division: project.responsible_division || '',
        plot_number: project.plot_number || '',
        kpi_completed: project.kpi_completed,
        project_status: project.project_status,
        contract_amount: project.contract_amount,
      })
    }
  }, [project])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.project_code.trim() || !formData.project_name.trim()) {
      setError('Please fill in all required fields')
      return
    }

    onSubmit(formData)
  }

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>
            {project ? 'Edit Project' : 'Add New Project'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="error">
                {error}
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Code *
                </label>
                <Input
                  value={formData.project_code}
                  onChange={(e) => handleChange('project_code', e.target.value)}
                  placeholder="Enter project code"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sub Project Code
                </label>
                <Input
                  value={formData.project_sub_code}
                  onChange={(e) => handleChange('project_sub_code', e.target.value)}
                  placeholder="Enter sub project code"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Name *
              </label>
              <Input
                value={formData.project_name}
                onChange={(e) => handleChange('project_name', e.target.value)}
                placeholder="Enter project name"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Scope
                </label>
                <Input
                  value={formData.project_type}
                  onChange={(e) => handleChange('project_type', e.target.value)}
                  placeholder="Enter project scope"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Responsible Division
                </label>
                <Input
                  value={formData.responsible_division}
                  onChange={(e) => handleChange('responsible_division', e.target.value)}
                  placeholder="Enter responsible division"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Plot Number
                </label>
                <Input
                  value={formData.plot_number}
                  onChange={(e) => handleChange('plot_number', e.target.value)}
                  placeholder="Enter plot number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contract Amount
                </label>
                <Input
                  type="number"
                  value={formData.contract_amount}
                  onChange={(e) => handleChange('contract_amount', parseFloat(e.target.value) || 0)}
                  placeholder="Enter contract amount"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Status
                </label>
                <select
                  value={formData.project_status}
                  onChange={(e) => handleChange('project_status', e.target.value)}
                  className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="site-preparation">Site Preparation</option>
                  <option value="on-going">On Going</option>
                  <option value="completed">Completed</option>
                  <option value="completed-duration">Completed Duration</option>
                  <option value="contract-duration">Contract Duration</option>
                  <option value="on-hold">On Hold</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="flex items-center space-x-2 ">
                <input
                  type="checkbox"
                  id="kpi_completed"
                  checked={formData.kpi_completed}
                  onChange={(e) => handleChange('kpi_completed', e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="kpi_completed" className="text-sm font-medium text-gray-700">
                  KPIs Completed
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3  pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
              >
                Cancel
              </Button>
              <Button type="submit">
                {project ? 'Save Changes' : 'Add Project'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
