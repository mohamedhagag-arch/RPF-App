'use client'

import { useState, useMemo, useEffect, useRef, memo } from 'react'
import { Project, BOQActivity } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { AlertTriangle, ChevronDown, Search } from 'lucide-react'

interface DelayedActivitiesTabProps {
  activities: BOQActivity[]
  projects: Project[]
  formatCurrency: (value: number, currency?: string) => string
}

export const DelayedActivitiesTab = memo(function DelayedActivitiesTab({ activities, projects, formatCurrency }: DelayedActivitiesTabProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)
  const [projectSearch, setProjectSearch] = useState('')
  const projectDropdownRef = useRef<HTMLDivElement>(null)
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
        setShowProjectDropdown(false)
      }
    }
    
    if (showProjectDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showProjectDropdown])
  
  // Get projects with delayed activities
  const projectsWithDelayedActivities = useMemo(() => {
    const now = Date.now()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Group activities by project (using both project_id and project_code matching)
    const projectActivitiesMap = new Map<string, BOQActivity[]>()
    const projectCodeMap = new Map<string, string>() // Map project_code to project_id
    
    // First, build project code map
    projects.forEach((project: Project) => {
      const projectCode = (project.project_full_code || `${project.project_code}${project.project_sub_code ? `-${project.project_sub_code}` : ''}`).toString().trim().toUpperCase()
      projectCodeMap.set(projectCode, project.id)
    })
    
    // Group activities by project
    activities.forEach((activity: BOQActivity) => {
      let projectId = activity.project_id
      
      // If no project_id, try to match by project_code
      if (!projectId) {
        const activityProjectCode = (activity.project_full_code || activity.project_code || '').toString().trim().toUpperCase()
        projectId = projectCodeMap.get(activityProjectCode) || ''
      }
      
      if (!projectId) return
      
      if (!projectActivitiesMap.has(projectId)) {
        projectActivitiesMap.set(projectId, [])
      }
      projectActivitiesMap.get(projectId)!.push(activity)
    })
    
    // Filter projects that have delayed activities
    const projectsWithDelayed: Array<{
      project: Project
      delayedActivities: BOQActivity[]
      totalDelayed: number
    }> = []
    
    projects.forEach((project: Project) => {
      const projectActivities = projectActivitiesMap.get(project.id) || []
      
      // Find delayed activities (ONLY non-completed activities that are actually delayed)
      const delayedActivities = projectActivities.filter((activity: BOQActivity) => {
        const rawActivity = (activity as any).raw || {}
        
        // Get progress percentage
        const progressPercentage = activity.activity_progress_percentage || 
                                  parseFloat(String(rawActivity['Activity Progress Percentage'] || rawActivity['activity_progress_percentage'] || '0')) || 
                                  0
        
        // CRITICAL: Skip completed activities (progress >= 100%)
        if (progressPercentage >= 100) {
          return false
        }
        
        // Check if activity is marked as completed
        const isCompleted = activity.activity_completed || 
                          rawActivity['Activity Completed'] ||
                          rawActivity['activity_completed'] ||
                          false
        
        if (isCompleted === true || isCompleted === 'true' || isCompleted === 'TRUE' || isCompleted === 1) {
          return false
        }
        
        // Check actual completion date - if exists and in the past, activity is completed
        const actualCompletionDateStr = (activity as any).activity_actual_completion_date ||
                                       (activity as any).actual_completion_date ||
                                       rawActivity['Activity Actual Completion Date'] ||
                                       rawActivity['activity_actual_completion_date'] ||
                                       rawActivity['Actual Completion Date'] ||
                                       rawActivity['actual_completion_date'] ||
                                       ''
        
        if (actualCompletionDateStr) {
          try {
            const actualCompletionDate = new Date(actualCompletionDateStr)
            if (!isNaN(actualCompletionDate.getTime()) && actualCompletionDate <= today) {
              return false // Activity is completed
            }
          } catch (e) {
            // Invalid date, continue checking
          }
        }
        
        // Check if deadline has passed and activity is not completed
        const deadlineStr = activity.deadline || 
                          activity.activity_planned_completion_date ||
                          rawActivity['Deadline'] ||
                          rawActivity['Activity Planned Completion Date'] ||
                          rawActivity['activity_planned_completion_date'] ||
                          rawActivity['Planned Completion Date'] ||
                          ''
        
        if (deadlineStr) {
          try {
            const deadline = new Date(deadlineStr)
            deadline.setHours(0, 0, 0, 0)
            
            // Activity is delayed if deadline has passed and not completed
            if (!isNaN(deadline.getTime()) && deadline < today && progressPercentage < 100) {
              return true
            }
          } catch (e) {
            // Invalid date, skip
          }
        }
        
        // Check planned start date - if activity hasn't started and start date has passed
        const plannedStartDateStr = activity.planned_activity_start_date ||
                                   activity.activity_planned_start_date ||
                                   rawActivity['Planned Activity Start Date'] ||
                                   rawActivity['planned_activity_start_date'] ||
                                   rawActivity['Activity Planned Start Date'] ||
                                   ''
        
        if (plannedStartDateStr) {
          try {
            const plannedStartDate = new Date(plannedStartDateStr)
            plannedStartDate.setHours(0, 0, 0, 0)
            
            // Check if activity has actually started
            const actualStartDateStr = (activity as any).activity_actual_start_date ||
                                     (activity as any).actual_start_date ||
                                     rawActivity['Activity Actual Start Date'] ||
                                     rawActivity['activity_actual_start_date'] ||
                                     rawActivity['Actual Start Date'] ||
                                     rawActivity['actual_start_date'] ||
                                     ''
            
            const hasStarted = actualStartDateStr || progressPercentage > 0
            
            // If planned start date has passed but activity hasn't started, it's delayed
            if (!isNaN(plannedStartDate.getTime()) && plannedStartDate < today && !hasStarted) {
              return true
            }
          } catch (e) {
            // Invalid date, skip
          }
        }
        
        // Check if activity is explicitly marked as delayed (but still not completed)
        const isDelayed = activity.activity_delayed || 
                         rawActivity['Activity Delayed'] || 
                         rawActivity['activity_delayed'] ||
                         false
        
        if ((isDelayed === true || isDelayed === 'true' || isDelayed === 'TRUE' || isDelayed === 1) && progressPercentage < 100) {
          return true
        }
        
        // Check delay_percentage (but only if not completed)
        const delayPercentage = activity.delay_percentage || 
                               parseFloat(String(rawActivity['Delay Percentage'] || rawActivity['delay_percentage'] || '0').replace(/,/g, '')) || 
                               0
        
        if (delayPercentage > 0 && progressPercentage < 100) {
          return true
        }
        
        return false
      })
      
      if (delayedActivities.length > 0) {
        projectsWithDelayed.push({
          project,
          delayedActivities,
          totalDelayed: delayedActivities.length
        })
      }
    })
    
    // Sort by number of delayed activities (descending)
    const result = projectsWithDelayed.sort((a, b) => b.totalDelayed - a.totalDelayed)
    
    // Debug logging (remove in production)
    if (process.env.NODE_ENV === 'development' && result.length === 0 && activities.length > 0) {
      console.log('🔍 Delayed Activities Debug:', {
        totalActivities: activities.length,
        totalProjects: projects.length,
        activitiesWithProjectId: activities.filter(a => a.project_id).length,
        activitiesWithDelayedFlag: activities.filter(a => a.activity_delayed).length,
        activitiesWithDeadline: activities.filter(a => a.deadline).length,
        sampleActivity: activities[0] ? {
          id: activities[0].id,
          project_id: activities[0].project_id,
          project_code: activities[0].project_code,
          activity_delayed: activities[0].activity_delayed,
          deadline: activities[0].deadline,
          progress: activities[0].activity_progress_percentage,
          raw: (activities[0] as any).raw
        } : null
      })
    }
    
    return result
  }, [activities, projects])
  
  const toggleProjectExpansion = (projectId: string) => {
    const newExpanded = new Set(expandedProjects)
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId)
    } else {
      newExpanded.add(projectId)
    }
    setExpandedProjects(newExpanded)
  }
  
  const filteredProjects = useMemo(() => {
    if (!selectedProjectId) return projectsWithDelayedActivities
    
    return projectsWithDelayedActivities.filter(
      (item) => item.project.id === selectedProjectId
    )
  }, [projectsWithDelayedActivities, selectedProjectId])
  
  // Filter projects for search dropdown
  const filteredProjectsForDropdown = useMemo(() => {
    if (!projectSearch.trim()) return projects
    
    const searchLower = projectSearch.toLowerCase().trim()
    return projects.filter((project: Project) => {
      const projectCode = (project.project_full_code || `${project.project_code}${project.project_sub_code ? `-${project.project_sub_code}` : ''}`).toLowerCase()
      const projectName = (project.project_name || '').toLowerCase()
      return projectCode.includes(searchLower) || projectName.includes(searchLower)
    })
  }, [projects, projectSearch])
  
  // Calculate totals
  const totals = useMemo(() => {
    let totalProjects = 0
    let totalDelayedActivities = 0
    
    filteredProjects.forEach((item) => {
      totalProjects++
      totalDelayedActivities += item.totalDelayed
    })
    
    return { totalProjects, totalDelayedActivities }
  }, [filteredProjects])
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Delayed Activities List</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Projects with delayed activities
          </p>
        </div>
        
        {/* Summary Cards */}
        <div className="flex items-center gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{totals.totalProjects}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Projects</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{totals.totalDelayedActivities}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Delayed Activities</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 relative">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                Filter by Project:
              </label>
              <div className="relative min-w-[250px]" ref={projectDropdownRef}>
                <div className="relative">
                  <input
                    type="text"
                    value={showProjectDropdown ? projectSearch : (selectedProjectId ? (() => {
                      const selectedProject = projects.find((p: Project) => p.id === selectedProjectId)
                      if (selectedProject) {
                        const projectCode = selectedProject.project_full_code || `${selectedProject.project_code}${selectedProject.project_sub_code ? `-${selectedProject.project_sub_code}` : ''}`
                        return `${projectCode} - ${selectedProject.project_name}`
                      }
                      return ''
                    })() : '')}
                    onClick={() => {
                      setShowProjectDropdown(true)
                      if (!selectedProjectId) {
                        setProjectSearch('')
                      }
                    }}
                    onChange={(e) => {
                      setProjectSearch(e.target.value)
                      setShowProjectDropdown(true)
                      setSelectedProjectId('') // Clear selection when typing
                    }}
                    onFocus={() => {
                      setShowProjectDropdown(true)
                      if (!selectedProjectId) {
                        setProjectSearch('')
                      }
                    }}
                    placeholder="Search or select project..."
                    className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
                
                {showProjectDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    <div className="p-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProjectId('')
                          setProjectSearch('')
                          setShowProjectDropdown(false)
                        }}
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded ${
                          !selectedProjectId ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'
                        }`}
                      >
                        All Projects
                      </button>
                      {filteredProjectsForDropdown.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 text-center">
                          No projects found
                        </div>
                      ) : (
                        filteredProjectsForDropdown.map((project: Project) => {
                          const projectCode = project.project_full_code || `${project.project_code}${project.project_sub_code ? `-${project.project_sub_code}` : ''}`
                          const displayText = `${projectCode} - ${project.project_name}`
                          const isSelected = selectedProjectId === project.id
                          
                          return (
                            <button
                              key={project.id}
                              type="button"
                              onClick={() => {
                                setSelectedProjectId(project.id)
                                setProjectSearch('')
                                setShowProjectDropdown(false)
                              }}
                              className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded ${
                                isSelected ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'
                              }`}
                            >
                              {displayText}
                            </button>
                          )
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {selectedProjectId && (
              <Button
                onClick={() => {
                  setSelectedProjectId('')
                  setProjectSearch('')
                  setShowProjectDropdown(false)
                }}
                variant="outline"
                size="sm"
              >
                Clear Filter
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Projects List */}
      {filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No projects with delayed activities found</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredProjects.map((item) => {
            const { project, delayedActivities, totalDelayed } = item
            const isExpanded = expandedProjects.has(project.id)
            const projectCode = project.project_full_code || `${project.project_code}${project.project_sub_code ? `-${project.project_sub_code}` : ''}`
            
            return (
              <Card key={project.id} className="border-l-4 border-l-red-500">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleProjectExpansion(project.id)}
                        className="p-1"
                      >
                        <ChevronDown
                          className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        />
                      </Button>
                      <div className="flex-1">
                        <CardTitle className="text-lg">
                          {projectCode}
                        </CardTitle>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {project.project_name}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-gray-500 dark:text-gray-400">Delayed Activities</p>
                          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                            {totalDelayed}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded text-xs font-medium ${
                          project.project_status === 'on-going' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          project.project_status === 'upcoming' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                          project.project_status === 'site-preparation' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                        }`}>
                          {project.project_status?.replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                {isExpanded && (
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-gray-800">
                            <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">
                              Activity Name
                            </th>
                            <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">
                              Zone
                            </th>
                            <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                              Progress
                            </th>
                            <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                              Deadline
                            </th>
                            <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                              Days Overdue
                            </th>
                            <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                              Total Value
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {delayedActivities.map((activity: BOQActivity, index: number) => {
                            const deadline = activity.deadline ? new Date(activity.deadline) : null
                            const now = new Date()
                            now.setHours(0, 0, 0, 0)
                            
                            let daysOverdue = 0
                            if (deadline) {
                              deadline.setHours(0, 0, 0, 0)
                              const diffTime = now.getTime() - deadline.getTime()
                              daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                            }
                            
                            const zone = (activity.zone_ref || activity.zone_number || '').toString().trim()
                            
                            return (
                              <tr
                                key={activity.id || index}
                                className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                              >
                                <td className="border border-gray-300 dark:border-gray-600 px-4 py-3">
                                  <div>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                      {activity.activity_name || activity.activity || 'Unknown Activity'}
                                    </p>
                                    {activity.activity_division && (
                                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        {activity.activity_division}
                                      </p>
                                    )}
                                  </div>
                                </td>
                                <td className="border border-gray-300 dark:border-gray-600 px-4 py-3">
                                  {zone ? (
                                    <span className="text-sm text-gray-700 dark:text-gray-300">{zone}</span>
                                  ) : (
                                    <span className="text-sm text-gray-400 dark:text-gray-500">N/A</span>
                                  )}
                                </td>
                                <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                      <div
                                        className="bg-red-600 h-2 rounded-full"
                                        style={{ width: `${Math.min(activity.activity_progress_percentage || 0, 100)}%` }}
                                      />
                                    </div>
                                    <span className="text-sm font-medium text-gray-900 dark:text-white min-w-[3rem] text-right">
                                      {activity.activity_progress_percentage?.toFixed(1) || '0.0'}%
                                    </span>
                                  </div>
                                </td>
                                <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right">
                                  {deadline ? (
                                    <span className="text-sm text-gray-900 dark:text-white">
                                      {deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                  ) : (
                                    <span className="text-sm text-gray-400 dark:text-gray-500">N/A</span>
                                  )}
                                </td>
                                <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right">
                                  {daysOverdue > 0 ? (
                                    <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                                      {daysOverdue} day{daysOverdue !== 1 ? 's' : ''}
                                    </span>
                                  ) : (
                                    <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                                  )}
                                </td>
                                <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right">
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                                    {formatCurrency(activity.total_value || 0, project.currency)}
                                  </span>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
})

