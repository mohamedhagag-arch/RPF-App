'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Award, TrendingUp, Activity } from 'lucide-react'

interface TopPerformersProps {
  projects: Array<{
    project_code: string
    project_name: string
    progress: number
    status: string
    totalActivities?: number
    completedActivities?: number
  }>
}

export function TopPerformers({ projects }: TopPerformersProps) {
  const guard = usePermissionGuard()
  if (projects.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            Top Performing Projects
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
            No projects with activities yet
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
          <Award className="w-5 h-5 text-yellow-500" />
          Top Performing Projects
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {projects.map((project, index) => {
            const progressColor = 
              project.progress >= 80 ? 'bg-green-500' :
              project.progress >= 60 ? 'bg-blue-500' :
              project.progress >= 40 ? 'bg-yellow-500' : 'bg-red-500'
            
            const textColor = 
              project.progress >= 80 ? 'text-green-600 dark:text-green-400' :
              project.progress >= 60 ? 'text-blue-600 dark:text-blue-400' :
              project.progress >= 40 ? 'text-yellow-600 dark:text-yellow-400' : 
              'text-red-600 dark:text-red-400'

            return (
              <div 
                key={project.project_code} 
                className="group hover:bg-gray-50 dark:hover:bg-gray-800 p-3 rounded-lg transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-start gap-3 flex-1">
                    {/* Rank Badge */}
                    <div className={`
                      w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm
                      ${index === 0 ? 'bg-yellow-400 text-yellow-900' : 
                        index === 1 ? 'bg-gray-300 text-gray-700' :
                        index === 2 ? 'bg-orange-400 text-orange-900' :
                        'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}
                    `}>
                      {index + 1}
                    </div>
                    
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">
                        {project.project_name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {project.project_code}
                      </p>
                      
                      {/* Activities count */}
                      {project.totalActivities && (
                        <div className="flex items-center gap-2 mt-2 text-xs">
                          <Activity className="w-3 h-3 text-gray-400" />
                          <span className="text-gray-600 dark:text-gray-400">
                            {project.completedActivities}/{project.totalActivities} activities
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Progress Badge */}
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${textColor}`}>
                      {project.progress}%
                    </div>
                    {index === 0 && project.progress >= 80 && (
                      <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                        🏆 Best
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${progressColor}`}
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
        
        {projects.length >= 5 && (
          <div className="mt-4 pt-4 border-t dark:border-gray-700 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Showing top 5 of {projects.length} projects
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

