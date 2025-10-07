'use client'

import { Project } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Edit, Trash2, Eye, Building, Calendar, DollarSign } from 'lucide-react'

interface EnhancedProjectCardProps {
  project: Project
  onEdit: (project: Project) => void
  onDelete: (id: string) => void
  onViewDetails?: (project: Project) => void
  getStatusColor: (status: string) => string
  getStatusText: (status: string) => string
}

export function EnhancedProjectCard({ 
  project, 
  onEdit, 
  onDelete,
  onViewDetails,
  getStatusColor, 
  getStatusText 
}: EnhancedProjectCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  return (
    <Card className="hover:shadow-lg transition-all duration-200 border-l-4 border-blue-500 bg-white dark:bg-gray-800">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              {project.project_name}
            </CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs font-mono">
                {project.project_code}
              </Badge>
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.project_status)}`}>
                {getStatusText(project.project_status)}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Project Details */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Type</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {project.project_type || 'Not specified'}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Division</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {project.responsible_division || 'Not specified'}
            </p>
          </div>
        </div>

        {/* Contract Value */}
        <div className="flex items-center gap-2 text-sm">
          <DollarSign className="h-4 w-4 text-green-600" />
          <span className="text-gray-600 dark:text-gray-400">Contract:</span>
          <span className="font-bold text-green-600 dark:text-green-400">
            {formatCurrency(project.contract_amount || 0)}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-2 pt-3 border-t border-gray-200 dark:border-gray-700">
          {onViewDetails && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onViewDetails(project)}
              className="flex items-center space-x-1"
            >
              <Eye className="h-4 w-4" />
              <span>Details</span>
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
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}