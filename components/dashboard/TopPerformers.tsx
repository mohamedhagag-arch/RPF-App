'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { TrendingUp, Award, Target, Calendar } from 'lucide-react'

interface Project {
  project_code: string
  project_name: string
  progress: number
  status: string
  contract_amount?: number
  start_date?: string
  end_date?: string
}

interface TopPerformersProps {
  projects: Project[]
}

export function TopPerformers({ projects }: TopPerformersProps) {
  // Sort projects by progress and take top 5
  const topProjects = projects
    .sort((a, b) => (b.progress || 0) - (a.progress || 0))
    .slice(0, 5)

  const getProgressColor = (progress: number) => {
    if (progress >= 90) return 'bg-green-500'
    if (progress >= 70) return 'bg-blue-500'
    if (progress >= 50) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'in progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      case 'on hold': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'delayed': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Award className="h-4 w-4 text-yellow-500" />
      case 2: return <Award className="h-4 w-4 text-gray-400" />
      case 3: return <Award className="h-4 w-4 text-orange-500" />
      default: return <Target className="h-4 w-4 text-gray-400" />
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Top Performing Projects
        </CardTitle>
      </CardHeader>
      <CardContent>
        {topProjects.length > 0 ? (
          <div className="space-y-4">
            {topProjects.map((project, index) => (
              <div key={project.project_code} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex items-center gap-2">
                    {getRankIcon(index + 1)}
                    <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                      #{index + 1}
                    </span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm text-gray-900 dark:text-white truncate">
                      {project.project_name}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {project.project_code}
                    </p>
                    {project.contract_amount && (
                      <p className="text-xs text-gray-600 dark:text-gray-300">
                        ${(project.contract_amount / 1000000).toFixed(1)}M
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                      {project.progress?.toFixed(1) || 0}%
                    </div>
                    <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${getProgressColor(project.progress || 0)} transition-all duration-300`}
                        style={{ width: `${Math.min(project.progress || 0, 100)}%` }}
                      />
                    </div>
                  </div>
                  
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${getStatusColor(project.status || 'unknown')}`}
                  >
                    {project.status || 'Unknown'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No project data available</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">Projects will appear here once data is loaded</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
