'use client'

import { Project } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Edit, Trash2, Eye } from 'lucide-react'

interface ProjectCardProps {
  project: Project
  onEdit: (project: Project) => void
  onDelete: (id: string) => void
  onViewDetails?: (project: Project) => void
  getStatusColor: (status: string) => string
  getStatusText: (status: string) => string
}

export function ProjectCard({ 
  project, 
  onEdit, 
  onDelete,
  onViewDetails,
  getStatusColor, 
  getStatusText 
}: ProjectCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US')
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg">{project.project_name}</CardTitle>
            <p className="text-sm text-gray-600 mt-1">Project Code: {project.project_code}</p>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.project_status)}`}>
            {getStatusText(project.project_status)}
          </span>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Project Scope</p>
            <p className="font-medium">{project.project_type || 'Not specified'}</p>
          </div>
          <div>
            <p className="text-gray-500">Responsible Division</p>
            <p className="font-medium">{project.responsible_division || 'Not specified'}</p>
          </div>
          <div>
            <p className="text-gray-500">Plot Number</p>
            <p className="font-medium">{project.plot_number || 'Not specified'}</p>
          </div>
          <div>
            <p className="text-gray-500">Contract Amount</p>
            <p className="font-medium">{formatCurrency(project.contract_amount)}</p>
          </div>
          
          {/* Additional project details */}
          {project.client_name && (
            <div>
              <p className="text-gray-500">Client</p>
              <p className="font-medium">{project.client_name}</p>
            </div>
          )}
          
          {project.consultant_name && (
            <div>
              <p className="text-gray-500">Consultant</p>
              <p className="font-medium">{project.consultant_name}</p>
            </div>
          )}
          
          {project.project_manager_email && (
            <div>
              <p className="text-gray-500">Project Manager</p>
              <a 
                href={`mailto:${project.project_manager_email}`}
                className="font-medium text-blue-600 dark:text-blue-400 text-xs hover:text-blue-800 dark:hover:text-blue-300 hover:underline cursor-pointer"
                title="Click to send email"
              >
                {project.project_manager_email}
              </a>
            </div>
          )}
          
          {project.area_manager_email && (
            <div>
              <p className="text-gray-500">Area Manager</p>
              <a 
                href={`mailto:${project.area_manager_email}`}
                className="font-medium text-blue-600 dark:text-blue-400 text-xs hover:text-blue-800 dark:hover:text-blue-300 hover:underline cursor-pointer"
                title="Click to send email"
              >
                {project.area_manager_email}
              </a>
            </div>
          )}
        </div>

        <div className="text-sm text-gray-500">
          <p>Created Date: {formatDate(project.created_at)}</p>
          {project.kpi_completed && (
            <p className="text-green-600 font-medium mt-1">✓ KPIs Completed</p>
          )}
        </div>

        <div className="flex justify-end space-x-2 pt-3 border-t">
          {onViewDetails && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onViewDetails(project)}
              className="flex items-center space-x-1"
            >
              <Eye className="h-4 w-4" />
              <span>View Details</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(project)}
            className="flex items-center space-x-1"
          >
            <Edit className="h-4 w-4" />
            <span>Edit</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(project.id)}
            className="flex items-center space-x-1 text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
