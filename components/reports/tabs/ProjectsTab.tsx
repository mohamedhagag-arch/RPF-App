'use client'

import { memo, useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Pagination } from '@/components/ui/Pagination'
import { getAllProjectsAnalytics } from '@/lib/projectAnalytics'
import type { FilteredData } from '../types'

interface ProjectsTabProps {
  projects: any[]
  activities: any[]
  kpis: any[]
  allAnalytics?: any[]
  formatCurrency: (amount: number, currencyCode?: string) => string
}

export const ProjectsTab = memo(function ProjectsTab({ projects, activities, kpis, allAnalytics: providedAnalytics, formatCurrency }: ProjectsTabProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(50)
  
  const allAnalytics = useMemo(() => {
    if (providedAnalytics && providedAnalytics.length > 0) {
      return providedAnalytics
    }
    return getAllProjectsAnalytics(projects, activities, kpis)
  }, [providedAnalytics, projects, activities, kpis])

  const paginatedAnalytics = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return allAnalytics.slice(startIndex, endIndex)
  }, [allAnalytics, currentPage, itemsPerPage])

  const totalPages = Math.ceil(allAnalytics.length / itemsPerPage)

  useEffect(() => {
    setCurrentPage(1)
  }, [itemsPerPage])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Projects Report</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 border-b-2 border-gray-300 dark:border-gray-600">
                <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800">Project</th>
                <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800">Status</th>
                <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800">Contract Value</th>
                <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800">Earned Value</th>
                <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800">Progress</th>
                <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800">Variance</th>
              </tr>
            </thead>
            <tbody>
              {paginatedAnalytics.map((analytics: any) => {
                const project = analytics.project
                const progress = analytics.actualProgress || 0
                const variance = analytics.variance || 0
                return (
                  <tr key={project.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                      <div>
                        <p className="font-medium">{project.project_full_code || `${project.project_code}${project.project_sub_code ? `-${project.project_sub_code}` : ''}`}</p>
                        <p className="text-xs text-gray-500">{project.project_name}</p>
                      </div>
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        project.project_status === 'on-going' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        project.project_status === 'completed-duration' || project.project_status === 'contract-completed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}>
                        {project.project_status?.replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'N/A'}
                      </span>
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right">
                      {formatCurrency(project.contract_amount || 0, project.currency)}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right">
                      {formatCurrency(analytics.totalEarnedValue || 0, project.currency)}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold">{progress.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className={`border border-gray-300 dark:border-gray-600 px-4 py-2 text-right ${variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(variance, project.currency)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            {allAnalytics.length > 0 && (
              <tfoot className="sticky bottom-0 z-10">
                <tr className="bg-gray-100 dark:bg-gray-800 font-bold border-t-2 border-gray-300 dark:border-gray-600">
                  <td colSpan={2} className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold bg-gray-100 dark:bg-gray-800">Total:</td>
                  <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold bg-gray-100 dark:bg-gray-800">
                    {formatCurrency(
                      allAnalytics.reduce((sum: number, a: any) => {
                        const contractAmt = a.project?.contract_amount || 0
                        return sum + contractAmt
                      }, 0),
                      allAnalytics[0]?.project?.currency || 'AED'
                    )}
                  </td>
                  <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold bg-gray-100 dark:bg-gray-800">
                    {formatCurrency(
                      allAnalytics.reduce((sum: number, a: any) => sum + (a.totalEarnedValue || 0), 0),
                      allAnalytics[0]?.project?.currency || 'AED'
                    )}
                  </td>
                  <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold bg-gray-100 dark:bg-gray-800">
                    {allAnalytics.length > 0 ? (
                      (allAnalytics.reduce((sum: number, a: any) => sum + (a.actualProgress || 0), 0) / allAnalytics.length).toFixed(1)
                    ) : '0.0'}%
                  </td>
                  <td className={`border border-gray-300 dark:border-gray-600 px-4 py-3 text-right font-semibold bg-gray-100 dark:bg-gray-800 ${
                    allAnalytics.reduce((sum: number, a: any) => sum + (a.variance || 0), 0) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(
                      allAnalytics.reduce((sum: number, a: any) => sum + (a.variance || 0), 0),
                      allAnalytics[0]?.project?.currency || 'AED'
                    )}
                  </td>
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
  )
})


