'use client'

import { memo, useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Pagination } from '@/components/ui/Pagination'
import { getAllProjectsAnalytics } from '@/lib/projectAnalytics'
import type { FilteredData } from '../types'

interface PerformanceTabProps {
  filteredData: FilteredData
  allAnalytics?: any[]
  formatCurrency: (amount: number, currencyCode?: string) => string
  formatPercentage: (num: number) => string
}

export const PerformanceTab = memo(function PerformanceTab({ filteredData, allAnalytics: providedAnalytics, formatCurrency, formatPercentage }: PerformanceTabProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(50)
  
  useEffect(() => {
    setCurrentPage(1)
  }, [itemsPerPage])
  
  const allAnalytics = useMemo(() => {
    if (providedAnalytics && providedAnalytics.length > 0) {
      return providedAnalytics
    }
    return getAllProjectsAnalytics(filteredData.filteredProjects, filteredData.filteredActivities, filteredData.filteredKPIs)
  }, [providedAnalytics, filteredData.filteredProjects, filteredData.filteredActivities, filteredData.filteredKPIs])
  
  const paginatedAnalytics = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return allAnalytics.slice(startIndex, endIndex)
  }, [allAnalytics, currentPage, itemsPerPage])
  
  const totalPages = Math.ceil(allAnalytics.length / itemsPerPage)

  const projectStatusCounts = useMemo(() => {
    return {
      onSchedule: allAnalytics.filter((a: any) => a.projectStatus === 'on_track').length,
      delayed: allAnalytics.filter((a: any) => a.projectStatus === 'delayed').length,
      ahead: allAnalytics.filter((a: any) => a.projectStatus === 'ahead').length
    }
  }, [allAnalytics])
  
  const { onSchedule: onScheduleProjects, delayed: delayedProjects, ahead: aheadProjects } = projectStatusCounts

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>On Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{onScheduleProjects}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Projects</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Delayed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{delayedProjects}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Projects</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Ahead of Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{aheadProjects}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Projects</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance by Project</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: '70vh' }}>
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 border-b-2 border-gray-300 dark:border-gray-600">
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800">Project</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800">Progress</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800">Planned Progress</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800">Variance</th>
                  <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800">Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAnalytics.map((analytics: any) => {
                  const project = analytics.project
                  const progress = analytics.actualProgress || 0
                  const plannedProgress = analytics.plannedProgress || 0
                  const variance = progress - plannedProgress
                  return (
                    <tr key={project.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                        {project.project_full_code || project.project_code}
                      </td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right">
                        {formatPercentage(progress)}
                      </td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right">
                        {formatPercentage(plannedProgress)}
                      </td>
                      <td className={`border border-gray-300 dark:border-gray-600 px-4 py-2 text-right ${variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {variance >= 0 ? '+' : ''}{formatPercentage(variance)}
                      </td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          analytics.projectStatus === 'on_track' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          analytics.projectStatus === 'delayed' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                          'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        }`}>
                          {analytics.projectStatus === 'on_track' ? 'On Track' :
                           analytics.projectStatus === 'delayed' ? 'Delayed' : 'Ahead'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {allAnalytics.length > 0 && (
                <tfoot className="sticky bottom-0 z-10">
                  <tr className="bg-gray-100 dark:bg-gray-800 font-bold border-t-2 border-gray-300 dark:border-gray-600">
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold bg-gray-100 dark:bg-gray-800">Total:</td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold bg-gray-100 dark:bg-gray-800">
                      {allAnalytics.length > 0 ? (
                        formatPercentage(allAnalytics.reduce((sum: number, a: any) => sum + (a.actualProgress || 0), 0) / allAnalytics.length)
                      ) : '0.0%'}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold bg-gray-100 dark:bg-gray-800">
                      {allAnalytics.length > 0 ? (
                        formatPercentage(allAnalytics.reduce((sum: number, a: any) => sum + (a.plannedProgress || 0), 0) / allAnalytics.length)
                      ) : '0.0%'}
                    </td>
                    <td className={`border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold bg-gray-100 dark:bg-gray-800 ${
                      allAnalytics.reduce((sum: number, a: any) => {
                        const progress = a.actualProgress || 0
                        const plannedProgress = a.plannedProgress || 0
                        return sum + (progress - plannedProgress)
                      }, 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {(() => {
                        const totalVariance = allAnalytics.reduce((sum: number, a: any) => {
                          const progress = a.actualProgress || 0
                          const plannedProgress = a.plannedProgress || 0
                          return sum + (progress - plannedProgress)
                        }, 0) / allAnalytics.length
                        return (totalVariance >= 0 ? '+' : '') + formatPercentage(totalVariance)
                      })()}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left font-semibold bg-gray-100 dark:bg-gray-800">-</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          {allAnalytics.length > itemsPerPage && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              totalItems={allAnalytics.length}
              onItemsPerPageChange={setItemsPerPage}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
})


