'use client'

import { useState, useEffect } from 'react'
import { supabase, PLANNING_TABLES } from '@/lib/supabase'
import { mapDBToProjects, mapDBToBOQActivities } from '@/lib/planningSchemaAdapter'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Alert } from '@/components/ui/Alert'

export function PlanningDataTest() {
  const [projectsData, setProjectsData] = useState<any>(null)
  const [boqData, setBOQData] = useState<any>(null)
  const [kpiData, setKPIData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    try {
      setLoading(true)
      setError('')

      // Fetch Projects
      console.log('Fetching from:', PLANNING_TABLES.PROJECTS)
      const { data: projects, error: projectsError, count: projectsCount } = await supabase
        .from(PLANNING_TABLES.PROJECTS)
        .select('*', { count: 'exact' })
        .limit(5)

      if (projectsError) {
        console.error('Projects error:', projectsError)
        throw new Error(`Projects: ${projectsError.message}`)
      }

      // Fetch BOQ Activities
      console.log('Fetching from:', PLANNING_TABLES.BOQ_ACTIVITIES)
      const { data: activities, error: activitiesError, count: activitiesCount } = await supabase
        .from(PLANNING_TABLES.BOQ_ACTIVITIES)
        .select('*', { count: 'exact' })
        .limit(5)

      if (activitiesError) {
        console.error('Activities error:', activitiesError)
        throw new Error(`Activities: ${activitiesError.message}`)
      }

      // Fetch KPIs (using main table)
      console.log('Fetching from:', PLANNING_TABLES.KPI)
      const { data: kpis, error: kpisError, count: kpisCount } = await supabase
        .from(PLANNING_TABLES.KPI) // ✅ Use main KPI table
        .select('*', { count: 'exact' })
        .limit(5)

      if (kpisError) {
        console.error('KPIs error:', kpisError)
        throw new Error(`KPIs: ${kpisError.message}`)
      }

      // Map data to application format
      const mappedProjects = mapDBToProjects(projects || [])
      const mappedActivities = mapDBToBOQActivities(activities || [])

      setProjectsData({
        count: projectsCount,
        sample: projects?.[0],
        mapped: mappedProjects[0],
        columnNames: projects?.[0] ? Object.keys(projects[0]) : []
      })

      setBOQData({
        count: activitiesCount,
        sample: activities?.[0],
        mapped: mappedActivities[0],
        columnNames: activities?.[0] ? Object.keys(activities[0]) : []
      })

      setKPIData({
        count: kpisCount,
        sample: kpis?.[0],
        columnNames: kpis?.[0] ? Object.keys(kpis[0]) : []
      })

      console.log('✅ All data fetched successfully!')
      console.log('Projects:', projectsCount)
      console.log('Activities:', activitiesCount)
      console.log('KPIs:', kpisCount)

    } catch (err: any) {
      console.error('Error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Testing connection to Planning Schema...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="error">
          <h3 className="font-bold mb-2">Connection Error</h3>
          <p>{error}</p>
          <button 
            onClick={fetchAllData}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
        <h2 className="text-xl font-bold">✅ Successfully Connected to Planning Schema!</h2>
        <p className="mt-2">All tables are accessible and data is being mapped correctly.</p>
      </div>

      {/* Projects Data */}
      <Card>
        <CardHeader>
          <CardTitle>📊 Projects - {projectsData?.count} records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Column Names ({projectsData?.columnNames?.length}):</h4>
              <div className="grid grid-cols-3 gap-2 text-sm">
                {projectsData?.columnNames?.map((col: string) => (
                  <div key={col} className="bg-gray-100 px-2 py-1 rounded">{col}</div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Sample Data (Mapped):</h4>
              <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs">
                {JSON.stringify(projectsData?.mapped, null, 2)}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* BOQ Activities Data */}
      <Card>
        <CardHeader>
          <CardTitle>📋 BOQ Activities - {boqData?.count} records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Column Names ({boqData?.columnNames?.length}):</h4>
              <div className="grid grid-cols-3 gap-2 text-sm">
                {boqData?.columnNames?.slice(0, 15).map((col: string) => (
                  <div key={col} className="bg-gray-100 px-2 py-1 rounded">{col}</div>
                ))}
              </div>
              {boqData?.columnNames?.length > 15 && (
                <p className="text-sm text-gray-500 mt-2">
                  ... and {boqData.columnNames.length - 15} more columns
                </p>
              )}
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Sample Data (Mapped):</h4>
              <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs max-h-96">
                {JSON.stringify(boqData?.mapped, null, 2)}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Data */}
      <Card>
        <CardHeader>
          <CardTitle>📈 KPIs - {kpiData?.count} records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Column Names ({kpiData?.columnNames?.length}):</h4>
              <div className="grid grid-cols-3 gap-2 text-sm">
                {kpiData?.columnNames?.map((col: string) => (
                  <div key={col} className="bg-gray-100 px-2 py-1 rounded">{col}</div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Sample Data:</h4>
              <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs">
                {JSON.stringify(kpiData?.sample, null, 2)}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
        <h3 className="font-bold">✅ Next Steps:</h3>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>Data mapping is working correctly</li>
          <li>All tables are accessible</li>
          <li>Ready to update main components</li>
          <li>Check console for detailed logs</li>
        </ul>
      </div>
    </div>
  )
}

