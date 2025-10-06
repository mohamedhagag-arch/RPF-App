'use client'

import { Project } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Edit, Trash2, Eye, Calendar, DollarSign, Building, Hash } from 'lucide-react'

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
    <Card className="hover:shadow-lg transition-all duration-300 hover:scale-105 border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 shadow-md">
      <CardHeader className="pb-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-800 rounded-t-lg">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Building className="h-5 w-5 text-blue-600" />
              {project.project_name}
            </CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 flex items-center gap-1">
              <Hash className="h-4 w-4" />
              {project.project_code}
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${getStatusColor(project.project_status)}`}>
            {getStatusText(project.project_status)}
          </span>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 p-6">
        <div className="grid grid-cols-1 gap-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <Building className="h-4 w-4 text-blue-500" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Project Type</p>
              <p className="font-semibold text-gray-900 dark:text-white">{project.project_type || 'Not specified'}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <Hash className="h-4 w-4 text-green-500" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Responsible Division</p>
              <p className="font-semibold text-gray-900 dark:text-white">{project.responsible_division || 'Not specified'}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <Hash className="h-4 w-4 text-purple-500" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Plot Number</p>
              <p className="font-semibold text-gray-900 dark:text-white">{project.plot_number || 'Not specified'}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <DollarSign className="h-4 w-4 text-green-600" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Contract Amount</p>
              <p className="font-bold text-green-700 dark:text-green-400">{formatCurrency(project.contract_amount)}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <Calendar className="h-4 w-4 text-blue-600" />
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Created Date</p>
            <p className="font-semibold text-blue-700 dark:text-blue-400">{formatDate(project.created_at)}</p>
          </div>
          {project.kpi_completed && (
            <div className="ml-auto">
              <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold rounded-full">
                ✓ KPIs Completed
              </span>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200 dark:border-gray-700">
          {onViewDetails && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onViewDetails(project)}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
            >
              <Eye className="h-4 w-4" />
              <span>View Details</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(project)}
            className="flex items-center space-x-2 px-4 py-2 border-2 border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-semibold rounded-lg transition-all duration-200"
          >
            <Edit className="h-4 w-4" />
            <span>Edit</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(project.id)}
            className="flex items-center space-x-2 px-4 py-2 border-2 border-red-200 dark:border-red-800 hover:border-red-500 dark:hover:border-red-400 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-semibold rounded-lg transition-all duration-200"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
