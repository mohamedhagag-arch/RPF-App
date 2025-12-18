'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { Project, BOQActivity } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Calendar, Download, ZoomIn, ZoomOut, FileText, FileSpreadsheet, Search, ChevronDown } from 'lucide-react'
import { downloadExcel, downloadCSV } from '@/lib/exportImportUtils'
import { formatDate } from '@/lib/dateHelpers'

interface ProjectTimelineViewProps {
  activities: BOQActivity[]
  projects: Project[]
  kpis: any[]
  formatCurrency: (value: number, currency?: string) => string
}

interface TimelineActivity {
  activity: BOQActivity
  plannedStart: Date
  plannedEnd: Date
  actualStart: Date | null
  actualEnd: Date | null
  duration: number
  progress: number
  isDelayed: boolean
  isCompleted: boolean
  isCritical: boolean
}

export function ProjectTimelineView({ 
  activities, 
  projects, 
  kpis, 
  formatCurrency 
}: ProjectTimelineViewProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [viewMode, setViewMode] = useState<'gantt' | 'table'>('gantt')
  const [zoomLevel, setZoomLevel] = useState<number>(1) // 1 = day, 7 = week, 30 = month
  const [zoomScale, setZoomScale] = useState<number>(1)
  const [enableWheelZoom, setEnableWheelZoom] = useState<boolean>(true)
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)
  const [projectSearch, setProjectSearch] = useState('')
  const [showExportMenu, setShowExportMenu] = useState(false)
  const projectDropdownRef = useRef<HTMLDivElement>(null)
  const exportMenuRef = useRef<HTMLDivElement>(null)
  const ganttRef = useRef<HTMLDivElement>(null)

  // Get selected project
  const selectedProject = useMemo(() => {
    if (!selectedProjectId) return null
    return projects.find((p: Project) => p.id === selectedProjectId) || null
  }, [projects, selectedProjectId])

  // Filter projects for search
  const filteredProjectsForDropdown = useMemo(() => {
    if (!projectSearch.trim()) return projects
    
    const searchLower = projectSearch.toLowerCase().trim()
    
    return projects.filter((project: Project) => {
      const projectFullCode = (project.project_full_code || `${project.project_code}${project.project_sub_code ? `-${project.project_sub_code}` : ''}`).toString().toLowerCase()
      const projectName = (project.project_name || '').toString().toLowerCase()
      
      return projectFullCode.includes(searchLower) || projectName.includes(searchLower)
    })
  }, [projects, projectSearch])

  // Get project activities - simple and reliable matching
  const projectActivities = useMemo(() => {
    if (!selectedProject) return []
    
    const projectFullCode = (selectedProject.project_full_code || `${selectedProject.project_code}${selectedProject.project_sub_code ? `-${selectedProject.project_sub_code}` : ''}`).toString().trim().toUpperCase()
    const projectCode = (selectedProject.project_code || '').toString().trim().toUpperCase()
    
    // Debug logging
    console.log('🔍 Project Matching Debug:', {
      selectedProject: {
        id: selectedProject.id,
        project_code: selectedProject.project_code,
        project_sub_code: selectedProject.project_sub_code,
        project_full_code: selectedProject.project_full_code,
        computedFullCode: projectFullCode
      },
      totalActivities: activities.length
    })
    
    const matched = activities.filter((activity: BOQActivity) => {
      // Match by project_id
      if (activity.project_id === selectedProject.id) {
        console.log('✅ Matched by project_id:', activity.activity_name || activity.activity)
        return true
      }
      
      // Match by project_full_code
      const activityFullCode = (activity.project_full_code || '').toString().trim().toUpperCase()
      if (activityFullCode && activityFullCode === projectFullCode) {
        console.log('✅ Matched by project_full_code:', activity.activity_name || activity.activity, activityFullCode)
        return true
      }
      
      // Match from raw data
      const raw = (activity as any).raw || {}
      const rawProjectFullCode = (raw['Project Full Code'] || raw['ProjectFullCode'] || raw['project_full_code'] || '').toString().trim().toUpperCase()
      if (rawProjectFullCode && rawProjectFullCode === projectFullCode) {
        console.log('✅ Matched by raw project_full_code:', activity.activity_name || activity.activity, rawProjectFullCode)
        return true
      }
      
      // Fallback: Match by project_code if no sub-code
      if (!selectedProject.project_sub_code) {
        const activityProjectCode = (activity.project_code || '').toString().trim().toUpperCase()
        if (activityProjectCode && activityProjectCode === projectCode) {
          const activityFullCodeCheck = (activity.project_full_code || '').toString().trim().toUpperCase()
          if (!activityFullCodeCheck || !activityFullCodeCheck.includes('-')) {
            console.log('✅ Matched by project_code (fallback):', activity.activity_name || activity.activity, activityProjectCode)
            return true
          }
        }
      }
      
      return false
    })
    
    console.log(`📊 Matched ${matched.length} activities out of ${activities.length} total`)
    
    return matched
  }, [activities, selectedProject])

  // Parse date helper
  const parseDate = (dateValue: any): Date | null => {
    if (!dateValue) return null
    if (dateValue instanceof Date) {
      if (!isNaN(dateValue.getTime())) {
        const date = new Date(dateValue)
        date.setHours(0, 0, 0, 0)
        return date
      }
      return null
    }
    
    const dateStr = String(dateValue).trim()
    if (!dateStr || dateStr === 'N/A' || dateStr === 'null' || dateStr === '') return null
    
    try {
      const date = new Date(dateStr)
      if (!isNaN(date.getTime())) {
        date.setHours(0, 0, 0, 0)
        return date
      }
    } catch {
      return null
    }
    
    return null
  }

  // Process activities for timeline
  const timelineActivities = useMemo((): TimelineActivity[] => {
    return projectActivities
      .map((activity: BOQActivity) => {
        const raw = (activity as any).raw || {}
        const activityAny = activity as any
        
        // Get planned start date
        const plannedStartDateValue = 
          activity.planned_activity_start_date ||
          activity.activity_planned_start_date ||
          raw['Planned Activity Start Date'] ||
          raw['Planned Start Date'] ||
          activityAny.lookahead_start_date ||
          null
        
        const plannedStart = parseDate(plannedStartDateValue)
        if (!plannedStart) return null
        
        // Get planned end date
        const plannedEndDateValue =
          activity.deadline ||
          activity.activity_planned_completion_date ||
          raw['Deadline'] ||
          raw['Planned Completion Date'] ||
          activityAny.lookahead_activity_completion_date ||
          null
        
        let plannedEnd = parseDate(plannedEndDateValue)
        if (!plannedEnd) {
          if (activity.calendar_duration && activity.calendar_duration > 0) {
            plannedEnd = new Date(plannedStart.getTime() + activity.calendar_duration * 24 * 60 * 60 * 1000)
            plannedEnd.setHours(0, 0, 0, 0)
          } else {
            plannedEnd = new Date(plannedStart.getTime() + 24 * 60 * 60 * 1000)
            plannedEnd.setHours(0, 0, 0, 0)
          }
        }

        // Get actual dates from KPIs
        const activityKPIs = kpis.filter((kpi: any) => {
          const kpiProjectFullCode = (kpi.project_full_code || (kpi as any).raw?.['Project Full Code'] || '').toString().trim().toUpperCase()
          const projectFullCode = (selectedProject?.project_full_code || `${selectedProject?.project_code}${selectedProject?.project_sub_code ? `-${selectedProject.project_sub_code}` : ''}`).toString().trim().toUpperCase()
          
          if (kpiProjectFullCode !== projectFullCode) return false
          
          const kpiActivityName = (kpi.activity_name || (kpi as any).raw?.['Activity Name'] || '').toLowerCase().trim()
          const activityName = (activity.activity_name || activity.activity || '').toLowerCase().trim()
          
          return kpiActivityName === activityName || kpiActivityName.includes(activityName) || activityName.includes(kpiActivityName)
        })

        const actualKPIs = activityKPIs.filter((kpi: any) => {
          const inputType = String(kpi.input_type || (kpi as any).raw?.['Input Type'] || '').trim().toLowerCase()
          return inputType === 'actual'
        })

        let actualStart: Date | null = null
        let actualEnd: Date | null = null

        if (actualKPIs.length > 0) {
          const dates = actualKPIs
            .map((kpi: any) => {
              const kpiRaw = (kpi as any).raw || {}
              const actualDateValue = 
                kpi.actual_date || 
                kpiRaw['Actual Date'] || 
                kpi.activity_date || 
                kpiRaw['Activity Date'] || 
                ''
              
              return parseDate(actualDateValue)
            })
            .filter((d): d is Date => d !== null)
            .sort((a, b) => a.getTime() - b.getTime())

          if (dates.length > 0) {
            actualStart = dates[0]
            actualEnd = dates[dates.length - 1]
          }
        }

        // Calculate duration
        const duration = Math.ceil((plannedEnd.getTime() - plannedStart.getTime()) / (1000 * 60 * 60 * 24))

        // Get progress
        const progress = activity.activity_progress_percentage || activity.planned_progress_percentage || 0

        // Check status
        const isDelayed = activity.activity_delayed || false
        const isCompleted = activity.activity_completed || false
        const isCritical = Boolean(isDelayed || (actualEnd && actualEnd > plannedEnd))

        return {
          activity,
          plannedStart,
          plannedEnd,
          actualStart,
          actualEnd,
          duration,
          progress,
          isDelayed,
          isCompleted,
          isCritical
        }
      })
      .filter((item): item is TimelineActivity => item !== null)
      .sort((a, b) => a.plannedStart.getTime() - b.plannedStart.getTime())
  }, [projectActivities, kpis, selectedProject])

  // Calculate date range for Gantt chart
  const ganttDateRange = useMemo(() => {
    if (timelineActivities.length === 0) {
      const today = new Date()
      return {
        start: new Date(today.getFullYear(), today.getMonth(), 1),
        end: new Date(today.getFullYear(), today.getMonth() + 3, 0)
      }
    }

    let minDate = timelineActivities[0].plannedStart
    let maxDate = timelineActivities[0].plannedEnd

    timelineActivities.forEach((item) => {
      if (item.plannedStart < minDate) minDate = item.plannedStart
      if (item.plannedEnd > maxDate) maxDate = item.plannedEnd
      if (item.actualStart && item.actualStart < minDate) minDate = item.actualStart
      if (item.actualEnd && item.actualEnd > maxDate) maxDate = item.actualEnd
    })

    // Add padding
    minDate = new Date(minDate.getTime() - 7 * 24 * 60 * 60 * 1000)
    maxDate = new Date(maxDate.getTime() + 7 * 24 * 60 * 60 * 1000)

    return { start: minDate, end: maxDate }
  }, [timelineActivities])

  // Generate date columns
  const dateColumns = useMemo(() => {
    const columns: Date[] = []
    const start = ganttDateRange.start
    const end = ganttDateRange.end
    const current = new Date(start)
    
    while (current <= end) {
      columns.push(new Date(current))
      
      if (zoomLevel === 1) {
        current.setDate(current.getDate() + 1)
      } else if (zoomLevel === 7) {
        current.setDate(current.getDate() + 7)
      } else {
        current.setMonth(current.getMonth() + 1)
      }
    }
    
    return columns
  }, [ganttDateRange, zoomLevel])

  // Calculate bar position
  const calculateBarPosition = (startDate: Date, endDate: Date, columnWidth: number) => {
    const start = ganttDateRange.start
    const daysDiff = Math.ceil((startDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    
    return {
      left: daysDiff * columnWidth,
      width: Math.max(duration * columnWidth, 8)
    }
  }

  // Export functions
  const handleExportExcel = async () => {
    if (timelineActivities.length === 0) {
      alert('No data to export')
      return
    }

    const exportData = timelineActivities.map((item) => ({
      'Activity Name': item.activity.activity_name || item.activity.activity || 'Unknown',
      'Project Code': selectedProject?.project_full_code || selectedProject?.project_code || '',
      'Planned Start Date': item.plannedStart.toLocaleDateString('en-US'),
      'Planned End Date': item.plannedEnd.toLocaleDateString('en-US'),
      'Duration (Days)': item.duration,
      'Actual Start Date': item.actualStart ? item.actualStart.toLocaleDateString('en-US') : '',
      'Actual End Date': item.actualEnd ? item.actualEnd.toLocaleDateString('en-US') : '',
      'Progress %': `${item.progress.toFixed(1)}%`,
      'Status': item.isCompleted ? 'Completed' : item.isDelayed ? 'Delayed' : 'On Track',
      'Critical': item.isCritical ? 'Yes' : 'No'
    }))

    const projectCode = selectedProject?.project_full_code || selectedProject?.project_code || 'Project'
    const filename = `Project_Timeline_${projectCode}_${new Date().toISOString().split('T')[0]}`
    
    await downloadExcel(exportData, filename, 'Project Timeline')
    setShowExportMenu(false)
  }

  const handleExportCSV = () => {
    if (timelineActivities.length === 0) {
      alert('No data to export')
      return
    }

    const exportData = timelineActivities.map((item) => ({
      'Activity Name': item.activity.activity_name || item.activity.activity || 'Unknown',
      'Project Code': selectedProject?.project_full_code || selectedProject?.project_code || '',
      'Planned Start Date': item.plannedStart.toLocaleDateString('en-US'),
      'Planned End Date': item.plannedEnd.toLocaleDateString('en-US'),
      'Duration (Days)': item.duration,
      'Actual Start Date': item.actualStart ? item.actualStart.toLocaleDateString('en-US') : '',
      'Actual End Date': item.actualEnd ? item.actualEnd.toLocaleDateString('en-US') : '',
      'Progress %': `${item.progress.toFixed(1)}%`,
      'Status': item.isCompleted ? 'Completed' : item.isDelayed ? 'Delayed' : 'On Track',
      'Critical': item.isCritical ? 'Yes' : 'No'
    }))

    const projectCode = selectedProject?.project_full_code || selectedProject?.project_code || 'Project'
    const filename = `Project_Timeline_${projectCode}_${new Date().toISOString().split('T')[0]}`
    
    downloadCSV(exportData, filename)
    setShowExportMenu(false)
  }

  const handleExportPDF = async () => {
    if (!ganttRef.current || timelineActivities.length === 0) {
      alert('No data to export')
      return
    }

    try {
      const html2canvas = (await import('html2canvas')).default
      const { jsPDF } = await import('jspdf')

      const projectCode = selectedProject?.project_full_code || selectedProject?.project_code || 'Project'
      
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      })

      const pdfWidth = 297
      const pdfHeight = 210
      const margin = 10
      const contentWidth = pdfWidth - (margin * 2)

      pdf.setFontSize(16)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Project Timeline', margin, margin + 10)

      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      pdf.text(`Project: ${projectCode}`, margin, margin + 18)
      pdf.text(`Generated: ${new Date().toLocaleDateString()}`, margin, margin + 24)

      const canvas = await html2canvas(ganttRef.current, {
        backgroundColor: '#ffffff',
        scale: 1.5,
        logging: false,
        useCORS: true
      })

      const imgData = canvas.toDataURL('image/png')
      const imgWidth = contentWidth
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      let yPosition = margin + 30

      if (yPosition + imgHeight > pdfHeight - margin) {
        pdf.addPage()
        yPosition = margin
      }

      pdf.addImage(imgData, 'PNG', margin, yPosition, imgWidth, imgHeight)

      const filename = `Project_Timeline_${projectCode}_${new Date().toISOString().split('T')[0]}.pdf`
      pdf.save(filename)
      setShowExportMenu(false)
    } catch (error) {
      console.error('Error exporting PDF:', error)
      alert('Failed to export PDF')
    }
  }

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
        setShowProjectDropdown(false)
      }
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Column width
  const baseColumnWidth = zoomLevel === 1 ? 4 : zoomLevel === 7 ? 28 : 80
  const columnWidth = baseColumnWidth * zoomScale

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Project Timeline</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gantt Chart and Timeline View - Primavera Style
          </p>
        </div>

        {timelineActivities.length > 0 && (
          <div className="relative" ref={exportMenuRef}>
            <Button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export
              <ChevronDown className="h-4 w-4" />
            </Button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                <div className="py-1">
                  <button
                    onClick={handleExportExcel}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Export as Excel
                  </button>
                  <button
                    onClick={handleExportCSV}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Export as CSV
                  </button>
                  <button
                    onClick={handleExportPDF}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Export as PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Project Selection */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                Project:
              </label>
              <div className="relative" ref={projectDropdownRef}>
                <div className="relative">
                  <input
                    type="text"
                    value={selectedProject 
                      ? `${selectedProject.project_full_code || `${selectedProject.project_code}${selectedProject.project_sub_code ? `-${selectedProject.project_sub_code}` : ''}`} - ${selectedProject.project_name}`
                      : projectSearch || 'Select Project'}
                    onChange={(e) => {
                      if (!selectedProjectId) {
                        setProjectSearch(e.target.value)
                      }
                    }}
                    onFocus={() => {
                      setShowProjectDropdown(true)
                      if (selectedProjectId) {
                        setProjectSearch('')
                      }
                    }}
                    onClick={() => setShowProjectDropdown(true)}
                    readOnly={!!selectedProjectId}
                    placeholder="Search or select project..."
                    className="px-4 py-2 pr-8 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-w-[300px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <ChevronDown 
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none"
                  />
                </div>

                {showProjectDropdown && (
                  <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-auto">
                    <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          value={projectSearch}
                          onChange={(e) => setProjectSearch(e.target.value)}
                          placeholder="Search project..."
                          className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                      </div>
                    </div>

                    <div className="max-h-48 overflow-auto">
                      <button
                        onClick={() => {
                          setSelectedProjectId('')
                          setProjectSearch('')
                          setShowProjectDropdown(false)
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        All Projects
                      </button>

                      {filteredProjectsForDropdown.length === 0 ? (
                        <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 text-center">
                          No projects found
                        </div>
                      ) : (
                        filteredProjectsForDropdown.map((project: Project) => {
                          const projectCode = project.project_full_code || `${project.project_code}${project.project_sub_code ? `-${project.project_sub_code}` : ''}`
                          const isSelected = selectedProjectId === project.id

                          return (
                            <button
                              key={project.id}
                              onClick={() => {
                                setSelectedProjectId(project.id)
                                setProjectSearch('')
                                setShowProjectDropdown(false)
                              }}
                              className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                isSelected 
                                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' 
                                  : 'text-gray-700 dark:text-gray-300'
                              }`}
                            >
                              <div className="font-medium">{projectCode}</div>
                              {project.project_name && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">{project.project_name}</div>
                              )}
                            </button>
                          )
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {selectedProjectId && (
                <Button
                  onClick={() => {
                    setSelectedProjectId('')
                    setProjectSearch('')
                  }}
                  variant="outline"
                  size="sm"
                >
                  Clear
                </Button>
              )}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'gantt' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setViewMode('gantt')}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Gantt Chart
              </Button>
              <Button
                variant={viewMode === 'table' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                <FileText className="h-4 w-4 mr-2" />
                Table
              </Button>
            </div>

            {/* Zoom Controls */}
            {viewMode === 'gantt' && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 border-r border-gray-300 dark:border-gray-600 pr-3">
                  <span className="text-xs text-gray-600 dark:text-gray-400">Scale:</span>
                  <select
                    value={zoomLevel}
                    onChange={(e) => setZoomLevel(Number(e.target.value))}
                    className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value={1}>Day</option>
                    <option value={7}>Week</option>
                    <option value={30}>Month</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setZoomScale(Math.max(0.5, zoomScale - 0.25))}
                    disabled={zoomScale <= 0.5}
                    title="Zoom Out"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-2 min-w-[100px]">
                    <input
                      type="range"
                      min="0.5"
                      max="3"
                      step="0.25"
                      value={zoomScale}
                      onChange={(e) => setZoomScale(Number(e.target.value))}
                      className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 min-w-[45px] text-right">
                      {Math.round(zoomScale * 100)}%
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setZoomScale(Math.min(3, zoomScale + 0.25))}
                    disabled={zoomScale >= 3}
                    title="Zoom In"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setZoomScale(1)}
                    title="Reset Zoom"
                  >
                    Reset
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEnableWheelZoom(!enableWheelZoom)}
                    className={`px-2 py-1 text-xs rounded border transition-colors ${
                      enableWheelZoom
                        ? 'bg-blue-500 text-white border-blue-600'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    {enableWheelZoom ? '🖱️ Zoom ON' : '🖱️ Zoom OFF'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {!selectedProject ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Please select a project to view timeline</p>
            </div>
          </CardContent>
        </Card>
      ) : timelineActivities.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No activities found for this project</p>
            </div>
          </CardContent>
        </Card>
      ) : viewMode === 'gantt' ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Gantt Chart - {selectedProject?.project_full_code || selectedProject?.project_code}</CardTitle>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  <span className="text-gray-700 dark:text-gray-300">Planned</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded border-2 border-green-600"></div>
                  <span className="text-gray-700 dark:text-gray-300">Actual</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                  <span className="text-gray-700 dark:text-gray-300">Critical</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                  <span className="text-gray-700 dark:text-gray-300">Delayed</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div 
              ref={ganttRef}
              className="overflow-x-auto overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg"
              style={{ 
                minHeight: '500px',
                maxHeight: '80vh',
                scrollBehavior: 'smooth'
              }}
              onWheel={(e) => {
                if (e.ctrlKey || e.metaKey || enableWheelZoom) {
                  e.preventDefault()
                  e.stopPropagation()
                  const delta = e.deltaY > 0 ? -0.15 : 0.15
                  setZoomScale(prev => {
                    const newScale = Math.max(0.5, Math.min(3, prev + delta))
                    return Math.round(newScale * 4) / 4
                  })
                }
              }}
            >
              <div className="relative" style={{ minWidth: `${dateColumns.length * columnWidth + 350}px` }}>
                {/* Activity List Sidebar */}
                <div className="sticky left-0 z-10 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-lg" style={{ width: '350px', float: 'left' }}>
                  <div className="border-b border-gray-200 dark:border-gray-700 p-3 font-semibold text-base text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 sticky top-0">
                    Activity Name
                  </div>
                  {timelineActivities.map((item, index) => (
                    <div
                      key={item.activity.id || index}
                      className="border-b border-gray-200 dark:border-gray-700 p-3 text-sm text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      style={{ 
                        minHeight: '50px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center'
                      }}
                    >
                      <div className="font-medium mb-1">
                        {item.activity.activity_name || item.activity.activity || 'Unknown'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                        <span>{item.duration} days</span>
                        {item.isCritical && <span className="text-red-600 dark:text-red-400">● Critical</span>}
                        {item.isDelayed && <span className="text-yellow-600 dark:text-yellow-400">⚠ Delayed</span>}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Timeline Area */}
                <div className="overflow-x-auto" style={{ marginLeft: '350px' }}>
                  {/* Date Header */}
                  <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 sticky top-0 z-10" style={{ minHeight: '70px', display: 'flex' }}>
                    {dateColumns.map((date, index) => (
                      <div
                        key={index}
                        className="border-r border-gray-200 dark:border-gray-700 text-center text-sm text-gray-700 dark:text-gray-300 flex items-center justify-center"
                        style={{ 
                          width: `${columnWidth}px`,
                          minWidth: `${columnWidth}px`,
                          padding: '8px 4px'
                        }}
                      >
                        <div>
                          {zoomLevel === 1 
                            ? (
                              <>
                                <div className="font-semibold">{date.toLocaleDateString('en-US', { day: 'numeric' })}</div>
                                <div className="text-xs">{date.toLocaleDateString('en-US', { month: 'short' })}</div>
                              </>
                            )
                            : zoomLevel === 7
                            ? (
                              <>
                                <div className="font-semibold">Week {Math.ceil((date.getTime() - new Date(date.getFullYear(), 0, 1).getTime()) / (1000 * 60 * 60 * 24 * 7))}</div>
                                <div className="text-xs">{formatDate(date.toISOString())}</div>
                              </>
                            )
                            : (
                              <>
                                <div className="font-semibold">{date.toLocaleDateString('en-US', { month: 'short' })}</div>
                                <div className="text-xs">{date.getFullYear()}</div>
                              </>
                            )
                          }
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Today Line */}
                  {new Date() >= ganttDateRange.start && new Date() <= ganttDateRange.end && (
                    <div
                      className="absolute w-1 bg-red-500 z-20 pointer-events-none shadow-lg"
                      style={{
                        left: `${350 + calculateBarPosition(new Date(), new Date(), columnWidth).left}px`,
                        top: '70px',
                        height: `${timelineActivities.length * 50}px`
                      }}
                    >
                      <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded whitespace-nowrap">
                        Today
                      </div>
                    </div>
                  )}

                  {/* Activity Bars */}
                  {timelineActivities.map((item, index) => {
                    const plannedBar = calculateBarPosition(item.plannedStart, item.plannedEnd, columnWidth)
                    const actualBar = item.actualStart && item.actualEnd 
                      ? calculateBarPosition(item.actualStart, item.actualEnd, columnWidth)
                      : null

                    return (
                      <div
                        key={item.activity.id || index}
                        className="relative border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                        style={{ 
                          minHeight: '50px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        {/* Planned Bar */}
                        <div
                          className="absolute rounded h-8 opacity-90 cursor-pointer hover:opacity-100 hover:shadow-md transition-all"
                          style={{
                            left: `${plannedBar.left}px`,
                            width: `${Math.max(plannedBar.width, 8)}px`,
                            backgroundColor: item.isCritical ? '#ef4444' : item.isDelayed ? '#f59e0b' : '#3b82f6',
                            minWidth: '8px'
                          }}
                          title={`Planned: ${item.plannedStart.toLocaleDateString()} - ${item.plannedEnd.toLocaleDateString()} | Duration: ${item.duration} days`}
                        />

                        {/* Actual Bar */}
                        {actualBar && (
                          <div
                            className="absolute rounded h-8 border-2 border-green-600 cursor-pointer hover:opacity-90 hover:shadow-md transition-all"
                            style={{
                              left: `${actualBar.left}px`,
                              width: `${Math.max(actualBar.width, 8)}px`,
                              backgroundColor: item.isCompleted ? '#10b981' : '#22c55e',
                              minWidth: '8px'
                            }}
                            title={`Actual: ${item.actualStart?.toLocaleDateString()} - ${item.actualEnd?.toLocaleDateString()}`}
                          />
                        )}

                        {/* Progress Indicator */}
                        {item.progress > 0 && (
                          <div
                            className="absolute rounded-l h-8 bg-green-400 opacity-70 pointer-events-none border-r-2 border-green-600"
                            style={{
                              left: `${plannedBar.left}px`,
                              width: `${Math.max((plannedBar.width * item.progress) / 100, 4)}px`,
                              minWidth: '4px'
                            }}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Timeline Table - {selectedProject?.project_full_code || selectedProject?.project_code}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800">
                    <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-left font-semibold text-gray-900 dark:text-white">
                      Activity Name
                    </th>
                    <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center font-semibold text-gray-900 dark:text-white">
                      Zone
                    </th>
                    <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center font-semibold text-gray-900 dark:text-white">
                      Division
                    </th>
                    <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center font-semibold text-gray-900 dark:text-white">
                      Planned Start
                    </th>
                    <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center font-semibold text-gray-900 dark:text-white">
                      Planned End
                    </th>
                    <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center font-semibold text-gray-900 dark:text-white">
                      Duration (Days)
                    </th>
                    <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center font-semibold text-gray-900 dark:text-white">
                      Actual Start
                    </th>
                    <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center font-semibold text-gray-900 dark:text-white">
                      Actual End
                    </th>
                    <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center font-semibold text-gray-900 dark:text-white">
                      Progress %
                    </th>
                    <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center font-semibold text-gray-900 dark:text-white">
                      Status
                    </th>
                    <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center font-semibold text-gray-900 dark:text-white">
                      Critical
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {timelineActivities.map((item, index) => (
                    <tr
                      key={item.activity.id || index}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-white">
                        {item.activity.activity_name || item.activity.activity || 'Unknown Activity'}
                      </td>
                      <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center text-gray-700 dark:text-gray-300">
                        {item.activity.zone_ref || item.activity.zone_number || 'N/A'}
                      </td>
                      <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center text-gray-700 dark:text-gray-300">
                        {item.activity.activity_division || 'N/A'}
                      </td>
                      <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center text-gray-900 dark:text-white font-medium" title={item.plannedStart.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}>
                        <div className="flex flex-col">
                          <span className="text-sm">{item.plannedStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{item.plannedStart.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                        </div>
                      </td>
                      <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center text-gray-900 dark:text-white font-medium" title={item.plannedEnd.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}>
                        <div className="flex flex-col">
                          <span className="text-sm">{item.plannedEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{item.plannedEnd.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                        </div>
                      </td>
                      <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center text-gray-900 dark:text-white font-semibold">
                        {item.duration} {item.duration === 1 ? 'day' : 'days'}
                      </td>
                      <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center" title={item.actualStart ? item.actualStart.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Not started'}>
                        {item.actualStart ? (
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-green-700 dark:text-green-400">{item.actualStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{item.actualStart.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500 italic">-</span>
                        )}
                      </td>
                      <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center" title={item.actualEnd ? item.actualEnd.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Not completed'}>
                        {item.actualEnd ? (
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-green-700 dark:text-green-400">{item.actualEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{item.actualEnd.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500 italic">-</span>
                        )}
                      </td>
                      <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center text-gray-900 dark:text-white">
                        {item.progress.toFixed(1)}%
                      </td>
                      <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          item.isCompleted 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : item.isDelayed
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        }`}>
                          {item.isCompleted ? 'Completed' : item.isDelayed ? 'Delayed' : 'On Track'}
                        </span>
                      </td>
                      <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center">
                        {item.isCritical ? (
                          <span className="text-red-600 dark:text-red-400 font-semibold">●</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
