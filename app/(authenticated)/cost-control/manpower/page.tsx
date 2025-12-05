'use client'

import React, { useState, useEffect } from 'react'
import { PermissionPage } from '@/components/ui/PermissionPage'
import { PermissionButton } from '@/components/ui/PermissionButton'
import { DynamicTitle } from '@/components/ui/DynamicTitle'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Alert } from '@/components/ui/Alert'
import { UserCheck, Download, RefreshCw, Search, X, CheckCircle, AlertCircle, Filter, SlidersHorizontal, Calendar, DollarSign, Clock, Database, ArrowRight, Plus, Save, Edit, Trash2, CheckSquare, Square } from 'lucide-react'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
import { useRouter } from 'next/navigation'
import { TABLES, DesignationRate } from '@/lib/supabase'
import { mapProjectFromDB } from '@/lib/dataMappers'
import { buildProjectFullCode } from '@/lib/projectDataFetcher'
import type { Project } from '@/lib/supabase'
import { exportData, type ExportFormat } from '@/lib/exportImportUtils'
import { usePermissionGuard } from '@/lib/permissionGuard'

interface ManpowerRecord {
  id?: string
  date?: string // ✅ Date column (was "Column 1")
  project_code?: string
  labour_code?: string
  designation?: string
  start?: string
  finish?: string
  overtime?: string
  total_hours?: number
  cost?: number
}

export default function ManpowerPage() {
  const guard = usePermissionGuard()
  const [data, setData] = useState<ManpowerRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [projectCodeSearch, setProjectCodeSearch] = useState('')
  const [hasSearched, setHasSearched] = useState(false)
  const [searchTerm, setSearchTerm] = useState('') // For filtering loaded data
  const [availableProjects, setAvailableProjects] = useState<string[]>([]) // List of unique project codes
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [showProjectDropdown, setShowProjectDropdown] = useState(false) // Show/hide dropdown
  
  // Check permissions
  const canCreate = guard.hasAccess('cost_control.manpower.create')
  const canEdit = guard.hasAccess('cost_control.manpower.edit')
  const canDelete = guard.hasAccess('cost_control.manpower.delete')
  const canExport = guard.hasAccess('cost_control.manpower.export')
  const canManageDatabase = guard.hasAccess('cost_control.database.manage')
  
  // ✅ Enhanced Add Form State with Multiple Records Support
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    date: '',
    projectCode: '',
    labourCode: '',
    designation: '',
    start: '',
    finish: '',
    standardWorkingHours: '8', // Default 8 hours
    overtime: '',
    totalHours: '',
    cost: ''
  })
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [showProjectDropdownForm, setShowProjectDropdownForm] = useState(false)
  
  // ✅ Multiple Records Preview
  const [previewRecords, setPreviewRecords] = useState<Array<{
    id: string
    date: string
    projectCode: string
    labourCode: string
    designation: string
    start: string
    finish: string
    overtime: string
    totalHours: string
    cost: string
  }>>([])
  const [editingPreviewIndex, setEditingPreviewIndex] = useState<number | null>(null)
  
  // ✅ Edit & Delete State
  const [editingRecord, setEditingRecord] = useState<ManpowerRecord | null>(null)
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set())
  const [isSelectMode, setIsSelectMode] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null) // ID of record being deleted
  
  // ✅ Designation Rates State
  const [designationRates, setDesignationRates] = useState<DesignationRate[]>([])
  const [selectedDesignationRate, setSelectedDesignationRate] = useState<DesignationRate | null>(null)
  
  // ✅ Advanced Filters State
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [filters, setFilters] = useState({
    projectCode: '', // ✅ Project Code filter (dropdown)
    date: '', // ✅ Date filter (from "Column 1")
    labourCode: '',
    designation: '',
    startDate: '',
    endDate: '',
    minHours: '',
    maxHours: '',
    minCost: '',
    maxCost: '',
    overtime: '' // 'yes', 'no', or ''
  })
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(50) // عرض 50 صف فقط في كل مرة
  
  const supabase = getSupabaseClient()
  const router = useRouter()

  // ✅ Extract time only from datetime-local or time string
  const extractTimeOnly = (datetimeValue: string): string => {
    if (!datetimeValue) return ''
    
    // Handle 12-hour format with AM/PM (e.g., "6:45 PM", "7:00 AM")
    const time12HourMatch = datetimeValue.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
    if (time12HourMatch) {
      let hours = parseInt(time12HourMatch[1])
      const minutes = time12HourMatch[2]
      const period = time12HourMatch[3].toUpperCase()
      
      if (period === 'PM' && hours !== 12) {
        hours += 12
      } else if (period === 'AM' && hours === 12) {
        hours = 0
      }
      
      return `${hours.toString().padStart(2, '0')}:${minutes}`
    }
    
    // If already in time format (HH:mm)
    if (/^\d{2}:\d{2}$/.test(datetimeValue)) {
      return datetimeValue
    }
    
    // If in datetime-local format (YYYY-MM-DDTHH:mm)
    if (/T\d{2}:\d{2}$/.test(datetimeValue)) {
      return datetimeValue.split('T')[1]
    }
    
    // If in datetime format with seconds (YYYY-MM-DDTHH:mm:ss)
    if (/T\d{2}:\d{2}:\d{2}/.test(datetimeValue)) {
      const timePart = datetimeValue.split('T')[1]
      return timePart.split(':').slice(0, 2).join(':')
    }
    
    // Return as is if format is unknown
    return datetimeValue
  }

  // ✅ Calculate Total Hours from Start and Finish times
  const calculateTotalHours = (start: string, finish: string): number => {
    if (!start || !finish) return 0
    
    try {
      // Parse start time
      let startDate: Date
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(start)) {
        startDate = new Date(start)
      } else if (/^\d{2}:\d{2}$/.test(start)) {
        // If only time, use date from formData.date or today
        const dateStr = formData.date 
          ? (() => {
              if (/^\d{4}-\d{2}-\d{2}$/.test(formData.date)) return formData.date
              // Try to convert other formats
              const formats = [
                /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
                /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
                /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/,
              ]
              for (const format of formats) {
                const matchResult = formData.date.match(format)
                if (matchResult?.[1] && matchResult?.[2] && matchResult?.[3]) {
                  const match = matchResult as RegExpMatchArray
                  let day, month, year
                  if (format === formats[2]) {
                    year = match[1]
                    month = match[2].padStart(2, '0')
                    day = match[3].padStart(2, '0')
                  } else {
                    day = match[1].padStart(2, '0')
                    month = match[2].padStart(2, '0')
                    year = match[3]
                  }
                  if (year && month && day) {
                    return `${year}-${month}-${day}`
                  }
                }
              }
              return ''
            })()
          : new Date().toISOString().split('T')[0]
        startDate = new Date(`${dateStr}T${start}`)
      } else {
        return 0
      }
      
      // Parse finish time
      let finishDate: Date
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(finish)) {
        finishDate = new Date(finish)
      } else if (/^\d{2}:\d{2}$/.test(finish)) {
        // If only time, use date from formData.date or start date
        const dateStr = formData.date 
          ? (() => {
              if (/^\d{4}-\d{2}-\d{2}$/.test(formData.date)) return formData.date
              // Try to convert other formats
              const formats = [
                /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
                /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
                /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/,
              ]
              for (const format of formats) {
                const matchResult = formData.date.match(format)
                if (matchResult?.[1] && matchResult?.[2] && matchResult?.[3]) {
                  const match = matchResult as RegExpMatchArray
                  let day, month, year
                  if (format === formats[2]) {
                    year = match[1]
                    month = match[2].padStart(2, '0')
                    day = match[3].padStart(2, '0')
                  } else {
                    day = match[1].padStart(2, '0')
                    month = match[2].padStart(2, '0')
                    year = match[3]
                  }
                  if (year && month && day) {
                    return `${year}-${month}-${day}`
                  }
                }
              }
              return ''
            })()
          : (start && /^\d{4}-\d{2}-\d{2}T/.test(start))
            ? start.split('T')[0]
            : new Date().toISOString().split('T')[0]
        finishDate = new Date(`${dateStr}T${finish}`)
      } else {
        return 0
      }
      
      if (isNaN(startDate.getTime()) || isNaN(finishDate.getTime())) {
        return 0
      }
      
      // Calculate difference in hours
      const diffMs = finishDate.getTime() - startDate.getTime()
      const diffHours = diffMs / (1000 * 60 * 60)
      
      return Math.max(0, diffHours) // Return 0 if negative
    } catch (error) {
      console.error('Error calculating total hours:', error)
      return 0
    }
  }

  // ✅ Calculate Overtime (Total Hours - Standard Working Hours)
  const calculateOvertime = (totalHours: number, standardWorkingHours: string): number => {
    const standard = parseFloat(standardWorkingHours) || 0
    const overtime = totalHours - standard
    return Math.max(0, overtime) // Return 0 if negative
  }

  // ✅ Calculate Cost based on Designation Rate
  const calculateCost = (
    designation: string,
    standardHours: number,
    overtimeHours: number
  ): number => {
    if (!designation || designationRates.length === 0) return 0

    const rate = designationRates.find(r => 
      r.designation.toLowerCase() === designation.toLowerCase()
    )

    if (!rate) return 0

    const hourlyRate = rate.hourly_rate
    // Use overtime_hourly_rate if it exists (not null and not undefined), otherwise use 1.5 × hourly_rate
    const overtimeRate = (rate.overtime_hourly_rate != null && rate.overtime_hourly_rate !== undefined) 
      ? rate.overtime_hourly_rate 
      : (hourlyRate * 1.5)

    const standardCost = standardHours * hourlyRate
    const overtimeCost = overtimeHours * overtimeRate

    return standardCost + overtimeCost
  }

  // ✅ Auto-calculate Total Hours and Overtime when Start, Finish, or Standard Working Hours change
  useEffect(() => {
    if (formData.start && formData.finish) {
      const totalHours = calculateTotalHours(formData.start, formData.finish)
      const overtime = calculateOvertime(totalHours, formData.standardWorkingHours)
      const standardHours = parseFloat(formData.standardWorkingHours) || 8
      const overtimeHours = Math.max(0, totalHours - standardHours)
      
      // Recalculate cost if designation is selected
      let newCost = formData.cost
      if (formData.designation) {
        const calculatedCost = calculateCost(formData.designation, standardHours, overtimeHours)
        newCost = calculatedCost > 0 ? calculatedCost.toFixed(2) : ''
      }
      
      setFormData((prev) => ({
        ...prev,
        totalHours: totalHours > 0 ? totalHours.toFixed(2) : '',
        overtime: overtime > 0 ? overtime.toFixed(2) : '0',
        cost: newCost
      }))
    } else {
      // Clear if start or finish is empty
      setFormData((prev) => ({
        ...prev,
        totalHours: '',
        overtime: '',
        cost: formData.designation ? prev.cost : '' // Keep cost if designation is set
      }))
    }
  }, [formData.start, formData.finish, formData.standardWorkingHours, formData.date, formData.designation, designationRates])

  // ✅ Load projects from Projects table (same as Projects page)
  const loadAvailableProjects = async () => {
    try {
      setLoadingProjects(true)
      
      console.log('🔍 Loading projects from', TABLES.PROJECTS)
      
      // Fetch all projects from Projects table (same source as Projects page)
      const { data: projectsData, error } = await supabase
        .from(TABLES.PROJECTS)
        .select('*')
        .order('"Project Code"', { ascending: true })
      
      if (error) {
        // If table doesn't exist, return empty array
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          console.log('⚠️ Projects table not found')
          setAvailableProjects([])
          return
        }
        console.error('❌ Error fetching projects:', error)
        throw error
      }
      
      if (!projectsData || projectsData.length === 0) {
        console.log('⚠️ No projects found in database')
        setAvailableProjects([])
        return
      }
      
      // Map projects using the same mapper as Projects page
      const projects: Project[] = (projectsData || []).map(mapProjectFromDB)
      
      // Extract unique project_full_code values
      const projectFullCodes = new Set<string>()
      
      projects.forEach((project: Project) => {
        // Use project_full_code if available, otherwise build it
        const fullCode = project.project_full_code || buildProjectFullCode(project)
        
        if (fullCode && 
            fullCode.trim() !== '' && 
            fullCode.trim().toLowerCase() !== 'null' && 
            fullCode.trim().toLowerCase() !== 'undefined') {
          projectFullCodes.add(fullCode.trim())
        }
      })
      
      const uniqueProjects = Array.from(projectFullCodes).sort()
      
      console.log(`✅ Found ${uniqueProjects.length} unique project full codes from ${projects.length} projects:`, uniqueProjects.slice(0, 10))
      setAvailableProjects(uniqueProjects)
      
    } catch (err: any) {
      console.error('❌ Error loading projects:', err)
      setAvailableProjects([])
    } finally {
      setLoadingProjects(false)
    }
  }

  // ✅ Fetch Designation Rates
  const fetchDesignationRates = async () => {
    try {
      const { data, error } = await supabase
        .from(TABLES.DESIGNATION_RATES)
        // @ts-ignore
        .select('*')
        .order('designation', { ascending: true })

      if (error) {
        console.error('Error fetching designation rates:', error)
        return
      }
      setDesignationRates((data || []) as any)
      console.log('✅ Loaded designation rates:', (data || []).length)
    } catch (err: any) {
      console.error('Error fetching designation rates:', err)
    }
  }

  // ✅ Load projects and designation rates on mount
  useEffect(() => {
    loadAvailableProjects()
    fetchDesignationRates()
  }, [])

  // ✅ Direct search function that accepts project code as parameter
  const searchByProjectCodeDirect = async (projectCode: string) => {
    if (!projectCode || !projectCode.trim()) {
      setError('Please enter a Project Code to search')
      return
    }

    try {
      setLoading(true)
      setError('')
      setHasSearched(true)
      
      const tableName = 'CCD - MANPOWER'
      const searchTerm = projectCode.trim()
      
      console.log('🔍 Searching MANPOWER for:', searchTerm)
      
      // ✅ Smart search: Try multiple matching strategies
      // Strategy 1: Exact match with Full Project Code (e.g., P5082-SI)
      // Strategy 2: Match Project Code only (e.g., P5082)
      // Strategy 3: Match any PROJECT CODE that starts with Project Code (e.g., P5082%)
      
      // Extract base project code (e.g., "P5082" from "P5082-SI")
      const baseProjectCode = searchTerm.includes('-') 
        ? searchTerm.split('-')[0] 
        : searchTerm
      
      console.log('🔍 Search strategies:', {
        fullCode: searchTerm,
        baseCode: baseProjectCode
      })
      
      // ✅ جلب جميع البيانات بدون limit (أو limit كبير جداً)
      // استخدام pagination من Supabase لجلب البيانات على دفعات
      let allRecords: any[] = []
      let from = 0
      const pageSize = 1000 // جلب 1000 صف في كل مرة
      let hasMore = true
      
      while (hasMore) {
        // ✅ Enhanced search: Try multiple strategies with fallback
        // Strategy 1: Exact match (case-insensitive)
        // Strategy 2: Contains match (case-insensitive)
        // Strategy 3: Starts with match (case-insensitive)
        // This handles all variations: P5076, p5076, P5076-SI, p5076-si, etc.
        
        let query = supabase
          .from(tableName)
          .select('*', { count: 'exact' })
        
        // Try multiple search patterns
        // Use ilike for case-insensitive search
        query = query.ilike('"PROJECT CODE"', `%${searchTerm}%`)
        
        const { data: records, error: fetchError, count } = await query
          .order('"PROJECT CODE"', { ascending: true })
          .range(from, from + pageSize - 1)
        
        if (fetchError) {
          // If table doesn't exist yet, show empty state
          if (fetchError.code === '42P01' || fetchError.message.includes('does not exist')) {
            setData([])
            setError('MANPOWER table not found. Data will be available after database setup from Database Manager.')
            console.log('ℹ️ MANPOWER table not found. Data will be available after database setup.')
            return
          } else {
            throw fetchError
          }
        }
        
        if (records && records.length > 0) {
          allRecords = [...allRecords, ...records]
          from += pageSize
          hasMore = records.length === pageSize // إذا كان عدد السجلات = pageSize، قد يكون هناك المزيد
        } else {
          hasMore = false
        }
        
        // ✅ إعطاء المتصفح فرصة للتنفس بين الطلبات
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
      
      // ✅ Enhanced filtering: More flexible matching
      // This handles all variations and formats
      const searchTermUpper = searchTerm.toUpperCase().trim()
      const baseProjectCodeUpper = baseProjectCode.toUpperCase().trim()
      
      // Normalize: Remove spaces, dashes, and convert to uppercase for comparison
      const normalizeCode = (code: string) => {
        return code.toUpperCase().trim().replace(/\s+/g, '').replace(/-/g, '')
      }
      
      const searchTermNormalized = normalizeCode(searchTerm)
      const baseProjectCodeNormalized = normalizeCode(baseProjectCode)
      
      const filteredRecords = (allRecords || []).filter((record: any) => {
        const recordProjectCode = (record['PROJECT CODE'] || record['project_code'] || '').toString().trim()
        const recordProjectCodeUpper = recordProjectCode.toUpperCase()
        const recordProjectCodeNormalized = normalizeCode(recordProjectCode)
        
        // ✅ Multiple matching strategies:
        // 1. Exact match (case-insensitive)
        // 2. Normalized match (without spaces/dashes)
        // 3. Starts with base code
        // 4. Contains search term
        // 5. Normalized contains (handles P5076 vs P5076-SI)
        return recordProjectCodeUpper === searchTermUpper ||
               recordProjectCodeUpper === baseProjectCodeUpper ||
               recordProjectCodeNormalized === searchTermNormalized ||
               recordProjectCodeNormalized === baseProjectCodeNormalized ||
               recordProjectCodeUpper.startsWith(baseProjectCodeUpper) ||
               recordProjectCodeUpper.includes(searchTermUpper) ||
               recordProjectCodeNormalized.includes(searchTermNormalized) ||
               recordProjectCodeNormalized.includes(baseProjectCodeNormalized)
      })
      
      // ✅ Get sample project codes from fetched records for debugging
      const sampleCodes = Array.from(new Set(
        allRecords.slice(0, 20).map((r: any) => r['PROJECT CODE'] || r['project_code'] || '').filter(Boolean)
      ))
      
      console.log(`📊 Search results:`, {
        totalFetched: allRecords.length,
        filtered: filteredRecords.length,
        searchTerm,
        baseCode: baseProjectCode,
        sampleCodesFromDB: sampleCodes.slice(0, 10),
        matchedCodes: filteredRecords.slice(0, 5).map((r: any) => r['PROJECT CODE'] || r['project_code'])
      })
      
      // ✅ تعيين البيانات المجمعة (المفلترة)
      setData(filteredRecords)
      if (filteredRecords && filteredRecords.length === 0) {
        // Show helpful error message with sample codes if available
        if (allRecords.length > 0 && sampleCodes.length > 0) {
          setError(`No records found for "${projectCode}". Found ${allRecords.length} records with different project codes. Sample codes in database: ${sampleCodes.slice(0, 5).join(', ')}. Try searching with one of these codes.`)
        } else if (allRecords.length === 0) {
          setError(`No records found for Project Code: ${projectCode}. The MANPOWER table may be empty or the project code doesn't exist.`)
        } else {
          setError(`No records found for Project Code: ${projectCode}. Try searching with the base code (e.g., ${baseProjectCode})`)
        }
      } else if (filteredRecords && filteredRecords.length > 0) {
        console.log(`✅ Loaded ${filteredRecords.length} records for Project Code: ${projectCode}`)
        setError('') // Clear any previous errors
      }
    } catch (err: any) {
      console.error('Error loading MANPOWER data:', err)
      setError(err.message || 'Failed to load MANPOWER data')
      setData([])
    } finally {
      setLoading(false)
    }
  }

  const searchByProjectCode = async () => {
    // Use the current projectCodeSearch state
    await searchByProjectCodeDirect(projectCodeSearch)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    searchByProjectCode()
  }

  // ✅ Add Record to Preview
  const addToPreview = () => {
    if (!formData.projectCode.trim()) {
      setFormError('Project Code is required')
      return
    }

    const newRecord = {
      id: `preview-${Date.now()}-${Math.random()}`,
      date: formData.date,
      projectCode: formData.projectCode.trim(),
      labourCode: formData.labourCode,
      designation: formData.designation,
      start: formData.start,
      finish: formData.finish,
      overtime: formData.overtime,
      totalHours: formData.totalHours,
      cost: formData.cost
    }

    if (editingPreviewIndex !== null) {
      // Update existing preview record
      const updated = [...previewRecords]
      updated[editingPreviewIndex] = newRecord
      setPreviewRecords(updated)
      setEditingPreviewIndex(null)
    } else {
      // Add new preview record
      setPreviewRecords([...previewRecords, newRecord])
    }

    // Reset form
    setFormData({
      date: '',
      projectCode: '',
      labourCode: '',
      designation: '',
      start: '',
      finish: '',
      standardWorkingHours: '8',
      overtime: '',
      totalHours: '',
      cost: ''
    })
    setFormError('')
  }

  // ✅ Remove from Preview
  const removeFromPreview = (index: number) => {
    setPreviewRecords(previewRecords.filter((_, i) => i !== index))
    if (editingPreviewIndex === index) {
      setEditingPreviewIndex(null)
    } else if (editingPreviewIndex !== null && editingPreviewIndex > index) {
      setEditingPreviewIndex(editingPreviewIndex - 1)
    }
  }

  // ✅ Edit Preview Record
  const editPreviewRecord = (index: number) => {
    const record = previewRecords[index]
    
    // Find matching designation rate if designation exists
    let matchingRate: DesignationRate | null = null
    if (record.designation && designationRates.length > 0) {
      const designationValue = record.designation.trim()
      
      // Try exact match (case-sensitive)
      matchingRate = designationRates.find(r => r.designation === designationValue) || null
      
      // Try case-insensitive match
      if (!matchingRate) {
        matchingRate = designationRates.find(r => 
          r.designation.toLowerCase().trim() === designationValue.toLowerCase().trim()
        ) || null
      }
      
      // Try partial match (contains)
      if (!matchingRate) {
        matchingRate = designationRates.find(r => 
          r.designation.toLowerCase().includes(designationValue.toLowerCase()) ||
          designationValue.toLowerCase().includes(r.designation.toLowerCase())
        ) || null
      }
    }
    
    // Use the matching rate's designation if found, otherwise use the original value
    const finalDesignationValue = matchingRate ? matchingRate.designation : record.designation
    
    setFormData({
      date: record.date,
      projectCode: record.projectCode,
      labourCode: record.labourCode,
      designation: finalDesignationValue, // Use matching rate's designation to ensure dropdown selection works
      start: record.start,
      finish: record.finish,
      standardWorkingHours: '8',
      overtime: record.overtime,
      totalHours: record.totalHours,
      cost: record.cost
    })
    
    // Set selected designation rate for dropdown
    setSelectedDesignationRate(matchingRate)
    
    setEditingPreviewIndex(index)
    setFormError('')
  }

  // ✅ Submit All Records (Bulk Insert)
  const handleBulkSubmit = async () => {
    if (previewRecords.length === 0) {
      setFormError('No records to submit. Please add at least one record.')
      return
    }

    setFormLoading(true)
    setFormError('')
    setFormSuccess('')

    try {
      // Prepare all records for database
      const recordsToInsert = previewRecords.map(record => ({
        'Date': record.date || null,
        'PROJECT CODE': record.projectCode,
        'LABOUR CODE': record.labourCode || null,
        'Designation': record.designation || null,
        'START': record.start ? extractTimeOnly(record.start) : null,
        'FINISH': record.finish ? extractTimeOnly(record.finish) : null,
        'OVERTIME': record.overtime || null,
        'Total Hours': record.totalHours ? parseFloat(record.totalHours) : 0,
        'Cost': record.cost ? parseFloat(record.cost) : 0
      }))

      console.log('📦 Submitting MANPOWER records:', recordsToInsert.length)

      // Bulk insert into database
      const { error: insertError } = await (supabase as any)
        .from('CCD - MANPOWER')
        .insert(recordsToInsert)

      if (insertError) {
        throw insertError
      }

      setFormSuccess(`✅ ${recordsToInsert.length} MANPOWER record(s) added successfully!`)
      
      // Refresh projects list if needed
      const newProjectCodes = previewRecords
        .map(r => r.projectCode)
        .filter(code => !availableProjects.includes(code))
      if (newProjectCodes.length > 0) {
        loadAvailableProjects()
      }

      // Clear preview and form
      setPreviewRecords([])
      setFormData({
        date: '',
        projectCode: '',
        labourCode: '',
        designation: '',
        start: '',
        finish: '',
        standardWorkingHours: '8',
        overtime: '',
        totalHours: '',
        cost: ''
      })

      // Refresh data if searching
      if (hasSearched && projectCodeSearch) {
        await searchByProjectCodeDirect(projectCodeSearch)
      }

      // Close form after 2 seconds
      setTimeout(() => {
        setShowAddForm(false)
        setFormSuccess('')
      }, 2000)

    } catch (err: any) {
      console.error('❌ Error adding MANPOWER records:', err)
      setFormError(err.message || 'Failed to add MANPOWER records')
    } finally {
      setFormLoading(false)
    }
  }

  // ✅ Handle Add Form Submit (Single Record - for backward compatibility)
  const handleAddFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // If there are preview records, submit all
    if (previewRecords.length > 0) {
      await handleBulkSubmit()
      return
    }

    // Otherwise, add to preview first
    addToPreview()
  }

  // ✅ Handle Edit Form Submit
  const handleEditFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingRecord?.id) return

    setFormLoading(true)
    setFormError('')
    setFormSuccess('')

    try {
      // Validate required fields
      if (!formData.projectCode.trim()) {
        throw new Error('Project Code is required')
      }

      // Prepare data for database
      const manpowerData: any = {
        'Date': formData.date || null,
        'PROJECT CODE': formData.projectCode.trim(),
        'LABOUR CODE': formData.labourCode || null,
        'Designation': formData.designation || null,
        'START': formData.start ? extractTimeOnly(formData.start) : null,
        'FINISH': formData.finish ? extractTimeOnly(formData.finish) : null,
        'OVERTIME': formData.overtime || null,
        'Total Hours': formData.totalHours ? parseFloat(formData.totalHours) : 0,
        'Cost': formData.cost ? parseFloat(formData.cost) : 0
      }

      console.log('📦 Updating MANPOWER record:', editingRecord.id, manpowerData)

      // Update in database
      const { error: updateError } = await (supabase as any)
        .from('CCD - MANPOWER')
        .update(manpowerData)
        .eq('id', editingRecord.id)

      if (updateError) {
        throw updateError
      }

      setFormSuccess('✅ MANPOWER record updated successfully!')
      
      // Refresh data
      if (hasSearched && projectCodeSearch) {
        await searchByProjectCodeDirect(projectCodeSearch)
      }

      // Reset form and close
      setTimeout(() => {
        setEditingRecord(null)
        setShowAddForm(false)
        setFormData({
          date: '',
          projectCode: '',
          labourCode: '',
          designation: '',
          start: '',
          finish: '',
          standardWorkingHours: '8',
          overtime: '',
          totalHours: '',
          cost: ''
        })
        setFormSuccess('')
      }, 2000)

    } catch (err: any) {
      console.error('❌ Error updating MANPOWER record:', err)
      setFormError(err.message || 'Failed to update MANPOWER record')
    } finally {
      setFormLoading(false)
    }
  }

  // ✅ Handle Delete Record
  const handleDeleteRecord = async (recordId: string) => {
    if (!confirm('Are you sure you want to delete this record?')) return

    setDeleteLoading(recordId)
    try {
      const { error } = await supabase
        .from('CCD - MANPOWER')
        .delete()
        .eq('id', recordId)

      if (error) throw error

      // Remove from selected records
      const newSelected = new Set(selectedRecords)
      newSelected.delete(recordId)
      setSelectedRecords(newSelected)

      // Refresh data
      if (hasSearched && projectCodeSearch) {
        await searchByProjectCodeDirect(projectCodeSearch)
      } else {
        setData(data.filter(r => ((r as any).id || '') !== recordId))
      }

      setSuccess('✅ Record deleted successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      console.error('❌ Error deleting record:', err)
      setError(err.message || 'Failed to delete record')
    } finally {
      setDeleteLoading(null)
    }
  }

  // ✅ Handle Bulk Delete
  const handleBulkDelete = async () => {
    if (selectedRecords.size === 0) return
    if (!confirm(`Are you sure you want to delete ${selectedRecords.size} record(s)?`)) return

    setDeleteLoading('bulk')
    try {
      const ids = Array.from(selectedRecords)
      const { error } = await supabase
        .from('CCD - MANPOWER')
        .delete()
        .in('id', ids)

      if (error) throw error

      // Refresh data
      if (hasSearched && projectCodeSearch) {
        await searchByProjectCodeDirect(projectCodeSearch)
      } else {
        setData(data.filter(r => !selectedRecords.has(((r as any).id || '').toString())))
      }

      setSelectedRecords(new Set())
      setIsSelectMode(false)
      setSuccess(`✅ ${ids.length} record(s) deleted successfully!`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      console.error('❌ Error deleting records:', err)
      setError(err.message || 'Failed to delete records')
    } finally {
      setDeleteLoading(null)
    }
  }

  // ✅ Handle Edit Record
  const handleEditRecord = (record: ManpowerRecord) => {
    const rawRecord = (record as any).raw || record
    
    // Helper function to convert date to YYYY-MM-DD format
    const convertDateToInputFormat = (dateStr: string): string => {
      if (!dateStr) return ''
      
      // If already in YYYY-MM-DD format
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
      
      // Try to parse common formats: DD/MM/YYYY, MM/DD/YYYY, DD-MM-YYYY
      const formats = [
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // DD/MM/YYYY or MM/DD/YYYY
        /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // DD-MM-YYYY
        /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/, // YYYY/MM/DD
      ]
      
      for (const format of formats) {
        const match = dateStr.match(format)
        if (match && match.length >= 4) {
          let day, month, year
          if (format === formats[2]) {
            // YYYY/MM/DD
            year = match[1] || ''
            month = (match[2] || '').padStart(2, '0')
            day = (match[3] || '').padStart(2, '0')
          } else {
            // DD/MM/YYYY or MM/DD/YYYY - assume DD/MM/YYYY
            day = match[1].padStart(2, '0')
            month = match[2].padStart(2, '0')
            year = match[3]
          }
          return `${year}-${month}-${day}`
        }
      }
      
      return dateStr
    }
    
    setEditingRecord(record)
    const dateValue = (rawRecord['Date'] || rawRecord['date'] || record.date || '').toString()
    const startValue = (rawRecord['START'] || rawRecord['start'] || record.start || '').toString()
    const finishValue = (rawRecord['FINISH'] || rawRecord['finish'] || record.finish || '').toString()
    
    console.log('🔍 Editing record - Raw values:', {
      dateValue,
      startValue,
      finishValue,
      designation: rawRecord['Designation'] || rawRecord['designation'] || record.designation,
      rawRecordKeys: Object.keys(rawRecord)
    })
    
    // Extract time only for form (but keep full datetime for calculations)
    const startTimeOnly = extractTimeOnly(startValue)
    const finishTimeOnly = extractTimeOnly(finishValue)
    
    console.log('⏰ Extracted times:', { startTimeOnly, finishTimeOnly, originalStart: startValue, originalFinish: finishValue })
    
    // Extract designation - normalize the value (trim and handle case variations)
    const designationValue = (rawRecord['Designation'] || rawRecord['designation'] || record.designation || '').toString().trim()
    
    console.log('💼 Designation value:', designationValue, 'Available rates:', designationRates.length)
    
    // Find matching designation rate if designation exists
    // Try exact match first, then case-insensitive, then partial match
    let matchingRate: DesignationRate | null = null
    if (designationValue && designationRates.length > 0) {
      // Try exact match (case-sensitive)
      matchingRate = designationRates.find(r => r.designation === designationValue) || null
      
      // Try case-insensitive match
      if (!matchingRate) {
        matchingRate = designationRates.find(r => 
          r.designation.toLowerCase().trim() === designationValue.toLowerCase().trim()
        ) || null
      }
      
      // Try partial match (contains)
      if (!matchingRate) {
        matchingRate = designationRates.find(r => 
          r.designation.toLowerCase().includes(designationValue.toLowerCase()) ||
          designationValue.toLowerCase().includes(r.designation.toLowerCase())
        ) || null
      }
      
      console.log('✅ Found matching rate:', matchingRate ? matchingRate.designation : 'None', {
        searched: designationValue,
        availableDesignations: designationRates.map(r => r.designation).slice(0, 5)
      })
    }
    
    // Use the matching rate's designation if found, otherwise use the original value
    const finalDesignationValue = matchingRate ? matchingRate.designation : designationValue
    
    setFormData({
      date: convertDateToInputFormat(dateValue),
      projectCode: (rawRecord['PROJECT CODE'] || rawRecord['project_code'] || record.project_code || '').toString(),
      labourCode: (rawRecord['LABOUR CODE'] || rawRecord['labour_code'] || record.labour_code || '').toString(),
      designation: finalDesignationValue, // Use matching rate's designation to ensure dropdown selection works
      start: startTimeOnly, // Store time only in form
      finish: finishTimeOnly, // Store time only in form
      standardWorkingHours: '8',
      overtime: (rawRecord['OVERTIME'] || rawRecord['overtime'] || record.overtime || '').toString(),
      totalHours: (rawRecord['Total Hours'] || rawRecord['total_hours'] || record.total_hours || 0).toString(),
      cost: (rawRecord['Cost'] || rawRecord['cost'] || record.cost || 0).toString()
    })
    
    // Set selected designation rate for dropdown
    setSelectedDesignationRate(matchingRate)
    
    console.log('📝 Form data set:', {
      designation: finalDesignationValue,
      matchingRateFound: !!matchingRate,
      originalDesignation: designationValue
    })
    
    setShowAddForm(true)
    setFormError('')
    setFormSuccess('')
  }

  // ✅ Toggle Select Mode
  const toggleSelectMode = () => {
    setIsSelectMode(!isSelectMode)
    if (isSelectMode) {
      setSelectedRecords(new Set())
    }
  }

  // ✅ Toggle Record Selection
  const toggleRecordSelection = (recordId: string) => {
    const newSelected = new Set(selectedRecords)
    if (newSelected.has(recordId)) {
      newSelected.delete(recordId)
    } else {
      newSelected.add(recordId)
    }
    setSelectedRecords(newSelected)
  }

  // ✅ Toggle Select All
  const toggleSelectAll = () => {
    if (selectedRecords.size === filteredData.length && filteredData.length > 0) {
      setSelectedRecords(new Set())
    } else {
      const allIds = filteredData
        .map(r => {
          const id = (r as any).id
          return id ? id.toString() : null
        })
        .filter((id): id is string => id !== null)
      setSelectedRecords(new Set(allIds))
    }
  }

  const clearSearch = () => {
    setProjectCodeSearch('')
    setData([])
    setError('')
    setHasSearched(false)
    setSearchTerm('')
    clearAllFilters() // ✅ Clear all filters when clearing search
  }

  // ✅ Export Data Function
  const handleExport = async (format: ExportFormat = 'excel') => {
    if (filteredData.length === 0) {
      setError('No data to export')
      return
    }

    try {
      // Prepare data for export
      const dataToExport = filteredData.map((record) => {
        const rawRecord = (record as any).raw || record
        const date = rawRecord['Date'] || rawRecord['date'] || rawRecord['Column 1'] || rawRecord['column_1'] || record.date || ''
        const projectCode = rawRecord['PROJECT CODE'] || rawRecord['project_code'] || record.project_code || ''
        const labourCode = rawRecord['LABOUR CODE'] || rawRecord['labour_code'] || record.labour_code || ''
        const designation = rawRecord['Designation'] || rawRecord['designation'] || record.designation || ''
        const start = extractTimeOnly((rawRecord['START'] || rawRecord['start'] || record.start || '').toString())
        const finish = extractTimeOnly((rawRecord['FINISH'] || rawRecord['finish'] || record.finish || '').toString())
        const overtime = rawRecord['OVERTIME'] || rawRecord['overtime'] || record.overtime || ''
        const totalHours = rawRecord['Total Hours'] || rawRecord['total_hours'] || rawRecord['TotalHours'] || record.total_hours || 0
        const cost = rawRecord['Cost'] || rawRecord['cost'] || record.cost || 0

        return {
          'Date': date,
          'Project Code': projectCode,
          'Labour Code': labourCode,
          'Designation': designation,
          'Start Time': start,
          'Finish Time': finish,
          'Overtime': overtime,
          'Total Hours': totalHours,
          'Cost': cost
        }
      })

      // Generate filename with date
      const today = new Date().toISOString().split('T')[0]
      const filename = `manpower_export_${today}`

      // Export data
      await exportData(dataToExport, filename, format, {
        columns: ['Date', 'Project Code', 'Labour Code', 'Designation', 'Start Time', 'Finish Time', 'Overtime', 'Total Hours', 'Cost'],
        sheetName: 'MANPOWER Data'
      })

      setSuccess(`✅ Successfully exported ${dataToExport.length} record(s) as ${format.toUpperCase()}!`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      console.error('Export error:', error)
      setError('Failed to export data: ' + (error.message || 'Unknown error'))
    }
  }

  // ✅ Advanced Filter Function
  const filteredData = data.filter((record) => {
    const rawRecord = (record as any).raw || record
    
    // 1. General Search Term (searches in all text fields including Date, Overtime, etc.)
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase().trim()
      const searchTerms = searchLower.split(' ').filter(t => t.length > 0) // Support multiple search terms
      
      // Check if all search terms match (AND logic)
      const matchesSearch = searchTerms.every(term => {
        const date = (rawRecord['Date'] || rawRecord['date'] || rawRecord['Column 1'] || rawRecord['column_1'] || record.date || '').toString().toLowerCase()
        const projectCode = (rawRecord['PROJECT CODE'] || rawRecord['project_code'] || record.project_code || '').toString().toLowerCase()
        const labourCode = (rawRecord['LABOUR CODE'] || rawRecord['labour_code'] || record.labour_code || '').toString().toLowerCase()
        const designation = (rawRecord['Designation'] || rawRecord['designation'] || record.designation || '').toString().toLowerCase()
        const start = (rawRecord['START'] || rawRecord['start'] || record.start || '').toString().toLowerCase()
        const finish = (rawRecord['FINISH'] || rawRecord['finish'] || record.finish || '').toString().toLowerCase()
        const overtime = (rawRecord['OVERTIME'] || rawRecord['overtime'] || record.overtime || '').toString().toLowerCase()
        const totalHours = (rawRecord['Total Hours'] || rawRecord['total_hours'] || rawRecord['TotalHours'] || record.total_hours || '').toString().toLowerCase()
        const cost = (rawRecord['Cost'] || rawRecord['cost'] || record.cost || '').toString().toLowerCase()
        
        return (
          date.includes(term) ||
          projectCode.includes(term) ||
          labourCode.includes(term) ||
          designation.includes(term) ||
          start.includes(term) ||
          finish.includes(term) ||
          overtime.includes(term) ||
          totalHours.includes(term) ||
          cost.includes(term)
        )
      })
      
      if (!matchesSearch) return false
    }
    
    // 1.5. Project Code Filter (from dropdown)
    if (filters.projectCode) {
      const projectCode = (rawRecord['PROJECT CODE'] || rawRecord['project_code'] || record.project_code || '').toString()
      if (projectCode !== filters.projectCode) return false
    }
    
    // 1.6. Date Filter (from "Column 1")
    if (filters.date) {
      const date = (rawRecord['Date'] || rawRecord['date'] || rawRecord['Column 1'] || rawRecord['column_1'] || record.date || '').toString().toLowerCase()
      if (!date.includes(filters.date.toLowerCase())) return false
    }
    
    // 2. Labour Code Filter
    if (filters.labourCode) {
      const labourCode = (rawRecord['LABOUR CODE'] || rawRecord['labour_code'] || record.labour_code || '').toString().toLowerCase()
      if (!labourCode.includes(filters.labourCode.toLowerCase())) return false
    }
    
    // 3. Designation Filter
    if (filters.designation) {
      const designation = (rawRecord['Designation'] || rawRecord['designation'] || record.designation || '').toString().toLowerCase()
      if (!designation.includes(filters.designation.toLowerCase())) return false
    }
    
    // 4. Date Range Filter (using Date column and START/FINISH)
    if (filters.startDate || filters.endDate) {
      const recordDate = rawRecord['Date'] || rawRecord['date'] || rawRecord['Column 1'] || rawRecord['column_1'] || record.date || ''
      const startDate = rawRecord['START'] || rawRecord['start'] || record.start || ''
      const finishDate = rawRecord['FINISH'] || rawRecord['finish'] || record.finish || ''
      
      // Check Date column first (most important)
      if (filters.startDate && recordDate && recordDate < filters.startDate) return false
      if (filters.endDate && recordDate && recordDate > filters.endDate) return false
      
      // Also check START/FINISH dates
      if (filters.startDate && startDate && startDate < filters.startDate) return false
      if (filters.endDate && finishDate && finishDate > filters.endDate) return false
    }
    
    // 5. Hours Range Filter
    if (filters.minHours || filters.maxHours) {
      const totalHours = parseFloat(String(
        rawRecord['Total Hours'] || 
        rawRecord['total_hours'] || 
        rawRecord['TotalHours'] ||
        record.total_hours || 
        0
      )) || 0
      
      if (filters.minHours && totalHours < parseFloat(filters.minHours)) return false
      if (filters.maxHours && totalHours > parseFloat(filters.maxHours)) return false
    }
    
    // 6. Cost Range Filter
    if (filters.minCost || filters.maxCost) {
      const cost = parseFloat(String(
        rawRecord['Cost'] || 
        rawRecord['cost'] || 
        record.cost || 
        0
      )) || 0
      
      if (filters.minCost && cost < parseFloat(filters.minCost)) return false
      if (filters.maxCost && cost > parseFloat(filters.maxCost)) return false
    }
    
    // 7. Overtime Filter
    if (filters.overtime) {
      const overtime = (rawRecord['OVERTIME'] || rawRecord['overtime'] || record.overtime || '').toString().toLowerCase()
      if (filters.overtime === 'yes' && (!overtime || overtime === 'no' || overtime === '')) return false
      if (filters.overtime === 'no' && (overtime && overtime !== 'no' && overtime !== '')) return false
    }
    
    return true
  })
  
  // ✅ Count active filters
  const activeFiltersCount = Object.values(filters).filter(v => v && v !== '').length + (searchTerm ? 1 : 0)
  
  // ✅ Clear all filters
  const clearAllFilters = () => {
    setFilters({
      projectCode: '', // ✅ Project Code filter
      date: '', // ✅ Date filter
      labourCode: '',
      designation: '',
      startDate: '',
      endDate: '',
      minHours: '',
      maxHours: '',
      minCost: '',
      maxCost: '',
      overtime: ''
    })
    setSearchTerm('')
    setCurrentPage(1)
  }
  
  // Pagination calculations
  const totalPages = Math.ceil(filteredData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedData = filteredData.slice(startIndex, endIndex)
  
  // Reset to page 1 when search term changes
  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, projectCodeSearch])

  // Calculate totals
  const totals = filteredData.reduce((acc, record) => {
    const rawRecord = (record as any).raw || record
    
    // Get Total Hours from different possible column names
    const totalHours = parseFloat(String(
      rawRecord['Total Hours'] || 
      rawRecord['total_hours'] || 
      rawRecord['TotalHours'] ||
      record.total_hours || 
      0
    )) || 0
    
    // Get Cost from different possible column names
    const cost = parseFloat(String(
      rawRecord['Cost'] || 
      rawRecord['cost'] || 
      record.cost || 
      0
    )) || 0
    
    acc.totalHours += totalHours
    acc.totalCost += cost
    return acc
  }, { totalHours: 0, totalCost: 0 })

  return (
    <PermissionPage 
      permission="cost_control.manpower.view"
      accessDeniedTitle="MANPOWER Access Required"
      accessDeniedMessage="You need permission to view MANPOWER data. Please contact your administrator."
    >
      <DynamicTitle pageTitle="MANPOWER" />
      <div className="p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
                <UserCheck className="h-8 w-8 text-blue-500" />
                MANPOWER
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Manage and track manpower costs across all projects
              </p>
            </div>
            <div className="flex items-center gap-2">
              {data.length > 0 && (
                <Button
                  variant="outline"
                  onClick={clearSearch}
                  disabled={loading}
                >
                  Clear
                </Button>
              )}
              <PermissionButton
                permission="cost_control.manpower.create"
                variant="primary"
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                {showAddForm ? 'Cancel' : 'Add New Record'}
              </PermissionButton>
              <PermissionButton
                permission="cost_control.database.manage"
                variant="primary"
                onClick={() => router.push('/settings?tab=database')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Database className="h-4 w-4 mr-2" />
                Database Manager
                <ArrowRight className="h-4 w-4 ml-2" />
              </PermissionButton>
              {filteredData.length > 0 && (
                <PermissionButton
                  permission="cost_control.manpower.export"
                  variant="outline"
                  onClick={() => handleExport('excel')}
                  disabled={filteredData.length === 0}
                  title="Export data to Excel"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export ({filteredData.length})
                </PermissionButton>
              )}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Records</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{filteredData.length.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  Manpower records
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totals.totalHours.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                <p className="text-xs text-muted-foreground">
                  Hours worked
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">AED {totals.totalCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                <p className="text-xs text-muted-foreground">
                  Total manpower cost
                </p>
              </CardContent>
            </Card>
          </div>

          {/* ✅ Enhanced Add/Edit Form Modal with Multiple Records Support */}
          {showAddForm && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
              <div className="w-full max-w-6xl max-h-[95vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="relative bg-gradient-to-r from-green-600 via-green-700 to-emerald-700 text-white p-6">
                  <div className="absolute inset-0 bg-black/10"></div>
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                        <Plus className="h-6 w-6" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold">
                          {editingRecord ? '✏️ Edit MANPOWER Record' : '✨ Add MANPOWER Records'}
                        </h2>
                        <p className="text-green-100 text-sm mt-1">
                          {editingRecord 
                            ? 'Modify record details' 
                            : 'Add single or multiple records with preview'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowAddForm(false)
                        setEditingRecord(null)
                        setPreviewRecords([])
                        setEditingPreviewIndex(null)
                        setFormData({
                          date: '',
                          projectCode: '',
                          labourCode: '',
                          designation: '',
                          start: '',
                          finish: '',
                          standardWorkingHours: '8',
                          overtime: '',
                          totalHours: '',
                          cost: ''
                        })
                        setFormError('')
                        setFormSuccess('')
                      }}
                      className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                      disabled={formLoading}
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  {formError && (
                    <Alert variant="error" className="mb-4">
                      <AlertCircle className="h-4 w-4" />
                      {formError}
                    </Alert>
                  )}
                  {formSuccess && (
                    <Alert variant="default" className="mb-4 bg-green-50 dark:bg-green-900 border-green-500">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      {formSuccess}
                    </Alert>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Form */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {editingPreviewIndex !== null ? '✏️ Edit Record' : '📝 Add New Record'}
                        </h3>
                        {previewRecords.length > 0 && (
                          <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium">
                            {previewRecords.length} in preview
                          </span>
                        )}
                      </div>

                      <form onSubmit={(e) => { e.preventDefault(); addToPreview(); }} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Date */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              <Calendar className="h-4 w-4 inline mr-1" />
                              Date <span className="text-gray-400">(Optional)</span>
                            </label>
                            <div className="relative">
                              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                              <input
                                type="date"
                                value={(() => {
                                  const dateStr = formData.date
                                  if (!dateStr) return ''
                                  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
                                  const formats = [
                                    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
                                    /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
                                    /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/,
                                  ]
                                  for (const format of formats) {
                                    const match = dateStr.match(format)
                                    if (match && match.length >= 4) {
                                      let day, month, year
                                      if (format === formats[2]) {
                                        year = match[1] || ''
                                        month = (match[2] || '').padStart(2, '0')
                                        day = (match[3] || '').padStart(2, '0')
                                      } else {
                                        day = match[1].padStart(2, '0')
                                        month = match[2].padStart(2, '0')
                                        year = match[3]
                                      }
                                      return `${year}-${month}-${day}`
                                    }
                                  }
                                  return dateStr
                                })()}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                              />
                            </div>
                          </div>

                          {/* Project Code */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Project Code <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                              {availableProjects.length > 0 ? (
                                <>
                                  <input
                                    type="text"
                                    placeholder="🔍 Search and select project code..."
                                    value={formData.projectCode}
                                    onChange={(e) => {
                                      setFormData({ ...formData, projectCode: e.target.value })
                                      setShowProjectDropdownForm(true)
                                    }}
                                    onFocus={() => setShowProjectDropdownForm(true)}
                                    onBlur={() => setTimeout(() => setShowProjectDropdownForm(false), 200)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    required
                                  />
                                  {showProjectDropdownForm && (
                                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-96 overflow-y-auto">
                                      {availableProjects
                                        .filter((projectCode) => {
                                          if (!formData.projectCode.trim()) return true
                                          const searchLower = formData.projectCode.toLowerCase().trim()
                                          return projectCode.toLowerCase().includes(searchLower)
                                        })
                                        .map((projectCode) => (
                                          <button
                                            key={projectCode}
                                            type="button"
                                            onClick={() => {
                                              setFormData({ ...formData, projectCode })
                                              setShowProjectDropdownForm(false)
                                            }}
                                            className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors"
                                          >
                                            <div className="font-medium text-gray-900 dark:text-white">
                                              {projectCode}
                                            </div>
                                          </button>
                                        ))}
                                    </div>
                                  )}
                                </>
                              ) : (
                                <input
                                  type="text"
                                  placeholder="e.g., P4110-P"
                                  value={formData.projectCode}
                                  onChange={(e) => setFormData({ ...formData, projectCode: e.target.value })}
                                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                  required
                                />
                              )}
                            </div>
                          </div>

                          {/* Labour Code */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Labour Code <span className="text-gray-400">(Optional)</span>
                            </label>
                            <input
                              type="text"
                              placeholder="e.g., L001"
                              value={formData.labourCode}
                              onChange={(e) => setFormData({ ...formData, labourCode: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            />
                          </div>

                          {/* Designation */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Designation <span className="text-gray-400">(Optional - Auto-calculates cost)</span>
                            </label>
                            <div className="relative">
                              <select
                                value={formData.designation}
                                onChange={(e) => {
                                  const designation = e.target.value
                                  const rate = designationRates.find(r => 
                                    r.designation.toLowerCase() === designation.toLowerCase()
                                  )
                                  setSelectedDesignationRate(rate || null)
                                  
                                  // Recalculate cost if we have hours
                                  if (formData.totalHours && formData.standardWorkingHours) {
                                    const totalHours = parseFloat(formData.totalHours) || 0
                                    const standardHours = parseFloat(formData.standardWorkingHours) || 8
                                    const overtimeHours = Math.max(0, totalHours - standardHours)
                                    const calculatedCost = calculateCost(designation, standardHours, overtimeHours)
                                    
                                    setFormData(prev => ({
                                      ...prev,
                                      designation,
                                      cost: calculatedCost > 0 ? calculatedCost.toFixed(2) : ''
                                    }))
                                  } else {
                                    setFormData(prev => ({ ...prev, designation }))
                                  }
                                }}
                                className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none cursor-pointer"
                              >
                                <option value="">Select Designation...</option>
                                {designationRates.length > 0 ? (
                                  designationRates.map((rate) => (
                                    <option key={rate.id} value={rate.designation}>
                                      {rate.designation} - ${rate.hourly_rate}/hr
                                      {rate.overtime_hourly_rate ? ` (OT: $${rate.overtime_hourly_rate}/hr)` : ` (OT: $${(rate.hourly_rate * 1.5).toFixed(2)}/hr)`}
                                    </option>
                                  ))
                                ) : (
                                  <option value="" disabled>Loading designations...</option>
                                )}
                              </select>
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none z-10">
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                              {selectedDesignationRate && (() => {
                          const rate = selectedDesignationRate!
                          const hourlyRate = rate.hourly_rate
                          const overtimeHourlyRate = rate.overtime_hourly_rate
                          // Use overtime_hourly_rate if it exists, otherwise use 1.5 × hourly_rate
                          const overtimeRate: number = (overtimeHourlyRate != null && overtimeHourlyRate !== undefined)
                            ? Number(overtimeHourlyRate)
                            : (hourlyRate * 1.5)
                                return (
                                  <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                                    <span className="font-medium">Rate:</span> ${hourlyRate}/hr
                                    {(overtimeHourlyRate != null && overtimeHourlyRate !== undefined) ? (
                                      <span className="ml-2">Overtime: ${overtimeHourlyRate}/hr</span>
                                    ) : (
                                      <span className="ml-2">Overtime: ${overtimeRate.toFixed(2)}/hr (1.5x)</span>
                                    )}
                                  </div>
                                )
                              })()}
                            </div>
                          </div>

                          {/* START */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              <Clock className="h-4 w-4 inline mr-1" />
                              Start Time <span className="text-gray-400">(Optional)</span>
                            </label>
                            <div className="relative">
                              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                              <input
                                type="time"
                                value={(() => {
                                  const startValue = formData.start
                                  if (!startValue) return ''
                                  // Extract time from datetime-local format
                                  if (/T\d{2}:\d{2}$/.test(startValue)) {
                                    return startValue.split('T')[1]
                                  }
                                  // If only time format (HH:mm)
                                  if (/^\d{2}:\d{2}$/.test(startValue)) return startValue
                                  return ''
                                })()}
                                onChange={(e) => {
                                  const timeValue = e.target.value
                                  // Use date from Date field if exists, otherwise use today's date
                                  const dateValue = formData.date 
                                    ? (() => {
                                        const dateStr = formData.date
                                        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
                                        // Try to convert other formats
                                        const formats = [
                                          /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
                                          /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
                                          /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/,
                                        ]
                                        for (const format of formats) {
                                          const matchResult = dateStr.match(format)
                                          if (matchResult?.[1] && matchResult?.[2] && matchResult?.[3]) {
                                            const match = matchResult as RegExpMatchArray
                                            let day, month, year
                                            if (format === formats[2]) {
                                              year = match[1]
                                              month = match[2].padStart(2, '0')
                                              day = match[3].padStart(2, '0')
                                            } else {
                                              day = match[1].padStart(2, '0')
                                              month = match[2].padStart(2, '0')
                                              year = match[3]
                                            }
                                            if (year && month && day) {
                                              return `${year}-${month}-${day}`
                                            }
                                          }
                                        }
                                        return ''
                                      })()
                                    : (() => {
                                        const today = new Date()
                                        return today.toISOString().split('T')[0]
                                      })()
                                  
                                  const newStartValue = dateValue ? `${dateValue}T${timeValue}` : timeValue
                                  setFormData((prev) => {
                                    let finishValue = prev.finish
                                    // Auto-copy date and time to finish if finish is empty
                                    if (newStartValue && !finishValue) {
                                      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(newStartValue)) {
                                        const [datePart, timePart] = newStartValue.split('T')
                                        const [hours, minutes] = timePart.split(':')
                                        const newHours = String((parseInt(hours) + 1) % 24).padStart(2, '0')
                                        finishValue = `${datePart}T${newHours}:${minutes}`
                                      }
                                    }
                                    return { ...prev, start: newStartValue, finish: finishValue }
                                  })
                                }}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                              />
                            </div>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              Select time only (date is taken from Date field above)
                            </p>
                          </div>

                          {/* FINISH */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                <Clock className="h-4 w-4 inline mr-1" />
                                Finish Time <span className="text-gray-400">(Optional)</span>
                              </label>
                              {formData.start && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    // Copy time from start and add 1 hour
                                    const startValue = formData.start
                                    if (startValue) {
                                      let finishValue = ''
                                      // If start is datetime-local, extract date and add 1 hour to time
                                      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(startValue)) {
                                        const [datePart, timePart] = startValue.split('T')
                                        const [hours, minutes] = timePart.split(':')
                                        const newHours = String((parseInt(hours) + 1) % 24).padStart(2, '0')
                                        finishValue = `${datePart}T${newHours}:${minutes}`
                                      } else if (/^\d{2}:\d{2}$/.test(startValue)) {
                                        // If only time, add 1 hour
                                        const [hours, minutes] = startValue.split(':')
                                        const newHours = String((parseInt(hours) + 1) % 24).padStart(2, '0')
                                        finishValue = `${newHours}:${minutes}`
                                      }
                                      if (finishValue) {
                                        setFormData({ ...formData, finish: finishValue })
                                      }
                                    }
                                  }}
                                  className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                                  title="Copy time from Start Time + 1 hour"
                                >
                                  <ArrowRight className="h-3 w-3" />
                                  Copy from Start
                                </button>
                              )}
                            </div>
                            <div className="relative">
                              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                              <input
                                type="time"
                                value={(() => {
                                  const finishValue = formData.finish
                                  if (!finishValue) return ''
                                  // Extract time from datetime-local format
                                  if (/T\d{2}:\d{2}$/.test(finishValue)) {
                                    return finishValue.split('T')[1]
                                  }
                                  // If only time format (HH:mm)
                                  if (/^\d{2}:\d{2}$/.test(finishValue)) return finishValue
                                  return ''
                                })()}
                                onChange={(e) => {
                                  const timeValue = e.target.value
                                  // Use date from Date field if exists, otherwise use start date or today
                                  const dateValue = formData.date 
                                    ? (() => {
                                        const dateStr = formData.date
                                        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
                                        // Try to convert other formats
                                        const formats = [
                                          /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
                                          /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
                                          /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/,
                                        ]
                                        for (const format of formats) {
                                          const matchResult = dateStr.match(format)
                                          if (matchResult?.[1] && matchResult?.[2] && matchResult?.[3]) {
                                            const match = matchResult as RegExpMatchArray
                                            let day, month, year
                                            if (format === formats[2]) {
                                              year = match[1]
                                              month = match[2].padStart(2, '0')
                                              day = match[3].padStart(2, '0')
                                            } else {
                                              day = match[1].padStart(2, '0')
                                              month = match[2].padStart(2, '0')
                                              year = match[3]
                                            }
                                            if (year && month && day) {
                                              return `${year}-${month}-${day}`
                                            }
                                          }
                                        }
                                        return ''
                                      })()
                                    : (formData.start && /^\d{4}-\d{2}-\d{2}T/.test(formData.start))
                                      ? formData.start.split('T')[0]
                                      : (() => {
                                          const today = new Date()
                                          return today.toISOString().split('T')[0]
                                        })()
                                  
                                  const newFinishValue = dateValue ? `${dateValue}T${timeValue}` : timeValue
                                  setFormData({ ...formData, finish: newFinishValue })
                                }}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                              />
                            </div>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              Select time only (date is taken from Date field above)
                            </p>
                          </div>

                          {/* Standard Working Hours */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              <Clock className="h-4 w-4 inline mr-1" />
                              Standard Working Hours <span className="text-gray-400">(Default: 8)</span>
                            </label>
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              placeholder="e.g., 8"
                              value={formData.standardWorkingHours}
                              onChange={(e) => {
                                const value = e.target.value
                                const standardHours = parseFloat(value) || 8
                                
                                // Recalculate overtime and cost when standard hours change
                                if (formData.start && formData.finish) {
                                  const totalHours = calculateTotalHours(formData.start, formData.finish)
                                  const overtime = calculateOvertime(totalHours, value)
                                  const overtimeHours = Math.max(0, totalHours - standardHours)
                                  
                                  // Recalculate cost if designation is selected
                                  let newCost = formData.cost
                                  if (formData.designation) {
                                    const calculatedCost = calculateCost(formData.designation, standardHours, overtimeHours)
                                    newCost = calculatedCost > 0 ? calculatedCost.toFixed(2) : ''
                                  }
                                  
                                  setFormData((prev) => ({
                                    ...prev,
                                    standardWorkingHours: value,
                                    totalHours: totalHours > 0 ? totalHours.toFixed(2) : '',
                                    overtime: overtime > 0 ? overtime.toFixed(2) : '0',
                                    cost: newCost
                                  }))
                                } else {
                                  setFormData({ ...formData, standardWorkingHours: value })
                                }
                              }}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            />
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              Number of standard working hours per day
                            </p>
                          </div>

                          {/* Total Hours */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Total Hours <span className="text-gray-400">(Auto-calculated, Read-only)</span>
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="Auto-calculated from Start & Finish"
                              value={formData.totalHours}
                              readOnly
                              disabled
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed"
                            />
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              Calculated automatically from Start & Finish times
                            </p>
                          </div>

                          {/* OVERTIME */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Overtime <span className="text-gray-400">(Auto-calculated, Read-only)</span>
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="Auto-calculated (Total Hours - Standard Hours)"
                              value={formData.overtime}
                              readOnly
                              disabled
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed"
                            />
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              Calculated automatically as Total Hours - Standard Working Hours
                            </p>
                          </div>

                          {/* Cost */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Cost <span className="text-gray-400">(Optional)</span>
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="e.g., 8000"
                              value={formData.cost}
                              onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            />
                          </div>
                        </div>

                        <div className="flex gap-2 pt-4">
                          <Button
                            type="submit"
                            variant="primary"
                            disabled={!formData.projectCode.trim()}
                            className="bg-green-600 hover:bg-green-700 text-white flex-1"
                          >
                            {editingPreviewIndex !== null ? (
                              <>
                                <Save className="h-4 w-4 mr-2" />
                                Update Preview
                              </>
                            ) : (
                              <>
                                <Plus className="h-4 w-4 mr-2" />
                                Add to Preview
                              </>
                            )}
                          </Button>
                          {editingPreviewIndex !== null && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setEditingPreviewIndex(null)
                                setFormData({
                                  date: '',
                                  projectCode: '',
                                  labourCode: '',
                                  designation: '',
                                  start: '',
                                  finish: '',
                                  standardWorkingHours: '8',
                                  overtime: '',
                                  totalHours: '',
                                  cost: ''
                                })
                              }}
                            >
                              Cancel Edit
                            </Button>
                          )}
                        </div>
                      </form>
                    </div>

                    {/* Right: Preview */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          📋 Preview Records
                        </h3>
                        {previewRecords.length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPreviewRecords([])}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Clear All
                          </Button>
                        )}
                      </div>

                      {previewRecords.length === 0 ? (
                        <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center">
                          <CheckSquare className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-500 dark:text-gray-400">
                            No records in preview yet
                          </p>
                          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                            Fill the form and click "Add to Preview"
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[500px] overflow-y-auto">
                          {previewRecords.map((record, index) => (
                            <div
                              key={record.id}
                              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs font-medium">
                                      #{index + 1}
                                    </span>
                                    <span className="font-semibold text-gray-900 dark:text-white">
                                      {record.projectCode}
                                    </span>
                                  </div>
                                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                    {record.date && <div>📅 Date: {record.date}</div>}
                                    {record.labourCode && <div>👤 Labour: {record.labourCode}</div>}
                                    {record.designation && <div>💼 Designation: {record.designation}</div>}
                                    {record.start && <div>▶️ Start: {extractTimeOnly(record.start)}</div>}
                                    {record.finish && <div>⏹️ Finish: {extractTimeOnly(record.finish)}</div>}
                                    {record.totalHours && <div>⏰ Hours: {record.totalHours}</div>}
                                    {record.cost && <div>💰 Cost: AED {parseFloat(record.cost).toLocaleString()}</div>}
                                  </div>
                                </div>
                                <div className="flex gap-1 ml-2">
                                  <button
                                    type="button"
                                    onClick={() => editPreviewRecord(index)}
                                    className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                    title="Edit"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeFromPreview(index)}
                                    className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                    title="Remove"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {previewRecords.length > 0 ? (
                        <span>
                          <strong>{previewRecords.length}</strong> record(s) ready to submit
                        </span>
                      ) : (
                        <span>Add records to preview before submitting</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowAddForm(false)
                          setEditingRecord(null)
                          setPreviewRecords([])
                          setEditingPreviewIndex(null)
                          setFormData({
                            date: '',
                            projectCode: '',
                            labourCode: '',
                            designation: '',
                            start: '',
                            finish: '',
                            standardWorkingHours: '8',
                            overtime: '',
                            totalHours: '',
                            cost: ''
                          })
                          setFormError('')
                          setFormSuccess('')
                        }}
                        disabled={formLoading}
                      >
                        Cancel
                      </Button>
                      {editingRecord ? (
                        <Button
                          type="button"
                          variant="primary"
                          onClick={handleEditFormSubmit}
                          disabled={formLoading || !formData.projectCode.trim()}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          {formLoading ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Updating...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              Update Record
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="primary"
                          onClick={handleBulkSubmit}
                          disabled={formLoading || previewRecords.length === 0}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          {formLoading ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Submitting...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              Submit {previewRecords.length > 0 ? `(${previewRecords.length})` : ''}
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Old Form (Hidden - keeping for reference) */}
          {false && showAddForm && (
            <Card className={`border-2 ${editingRecord ? 'border-blue-500' : 'border-green-500'}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {editingRecord ? (
                    <>
                      <Edit className="h-5 w-5 text-blue-600" />
                      Edit MANPOWER Record
                    </>
                  ) : (
                    <>
                      <Plus className="h-5 w-5 text-green-600" />
                      Add New MANPOWER Record
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={editingRecord ? handleEditFormSubmit : handleAddFormSubmit} className="space-y-4">
                  {formError && (
                    <Alert variant="error">
                      <AlertCircle className="h-4 w-4" />
                      {formError}
                    </Alert>
                  )}
                  {formSuccess && (
                    <Alert variant="default" className="bg-green-50 dark:bg-green-900 border-green-500">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      {formSuccess}
                    </Alert>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Date */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        <Calendar className="h-4 w-4 inline mr-1" />
                        Date <span className="text-gray-400">(Optional)</span>
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                        <input
                          type="date"
                          value={(() => {
                            // Convert various date formats to YYYY-MM-DD for date input
                            const dateStr = formData.date
                            if (!dateStr) return ''
                            
                            // If already in YYYY-MM-DD format
                            if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
                            
                            // Try to parse common formats: DD/MM/YYYY, MM/DD/YYYY, DD-MM-YYYY
                            const formats = [
                              /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // DD/MM/YYYY or MM/DD/YYYY
                              /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // DD-MM-YYYY
                              /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/, // YYYY/MM/DD
                            ]
                            
                            for (const format of formats) {
                              const matchResult = dateStr.match(format)
                              if (matchResult?.[1] && matchResult?.[2] && matchResult?.[3]) {
                                // TypeScript: matchResult is guaranteed to be non-null here
                                const match = matchResult as RegExpMatchArray
                                let day, month, year
                                if (format === formats[2]) {
                                  // YYYY/MM/DD
                                  year = match[1]
                                  month = match[2].padStart(2, '0')
                                  day = match[3].padStart(2, '0')
                                } else {
                                  // DD/MM/YYYY or MM/DD/YYYY - assume DD/MM/YYYY
                                  day = match[1].padStart(2, '0')
                                  month = match[2].padStart(2, '0')
                                  year = match[3]
                                }
                                if (year && month && day) {
                                  return `${year}-${month}-${day}`
                                }
                              }
                            }
                            
                            return dateStr
                          })()}
                          onChange={(e) => {
                            const dateValue = e.target.value
                            // Store in YYYY-MM-DD format (standard format)
                            setFormData({ ...formData, date: dateValue })
                          }}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Select date or enter in format: DD/MM/YYYY
                      </p>
                    </div>

                    {/* Project Code */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Project Code <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                        {availableProjects.length > 0 ? (
                          <>
                            <input
                              type="text"
                              placeholder="🔍 Search and select project code..."
                              value={formData.projectCode}
                              onChange={(e) => {
                                setFormData({ ...formData, projectCode: e.target.value })
                                setShowProjectDropdownForm(true)
                              }}
                              onFocus={() => setShowProjectDropdownForm(true)}
                              onBlur={() => {
                                setTimeout(() => setShowProjectDropdownForm(false), 200)
                              }}
                              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                              required
                            />
                            {showProjectDropdownForm && (
                              <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-96 overflow-y-auto">
                                {availableProjects
                                  .filter((projectCode) => {
                                    if (!formData.projectCode.trim()) return true
                                    const searchLower = formData.projectCode.toLowerCase().trim()
                                    return projectCode.toLowerCase().includes(searchLower)
                                  })
                                  .map((projectCode) => (
                                    <button
                                      key={projectCode}
                                      type="button"
                                      onClick={() => {
                                        setFormData({ ...formData, projectCode })
                                        setShowProjectDropdownForm(false)
                                      }}
                                      className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors"
                                    >
                                      <div className="font-medium text-gray-900 dark:text-white">
                                        {projectCode}
                                      </div>
                                    </button>
                                  ))}
                              </div>
                            )}
                          </>
                        ) : (
                          <input
                            type="text"
                            placeholder="e.g., P4110-P"
                            value={formData.projectCode}
                            onChange={(e) => setFormData({ ...formData, projectCode: e.target.value })}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            required
                          />
                        )}
                      </div>
                    </div>

                    {/* Labour Code */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Labour Code <span className="text-gray-400">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., L001"
                        value={formData.labourCode}
                        onChange={(e) => setFormData({ ...formData, labourCode: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>

                    {/* Designation */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Designation <span className="text-gray-400">(Optional - Auto-calculates cost)</span>
                      </label>
                      <div className="relative">
                        <select
                          value={formData.designation}
                          onChange={(e) => {
                            const designation = e.target.value
                            const rate = designationRates.find(r => 
                              r.designation.toLowerCase() === designation.toLowerCase()
                            )
                            setSelectedDesignationRate(rate || null)
                            
                            // Recalculate cost if we have hours
                            if (formData.totalHours && formData.standardWorkingHours) {
                              const totalHours = parseFloat(formData.totalHours) || 0
                              const standardHours = parseFloat(formData.standardWorkingHours) || 8
                              const overtimeHours = Math.max(0, totalHours - standardHours)
                              const calculatedCost = calculateCost(designation, standardHours, overtimeHours)
                              
                              setFormData(prev => ({
                                ...prev,
                                designation,
                                cost: calculatedCost > 0 ? calculatedCost.toFixed(2) : ''
                              }))
                            } else {
                              setFormData(prev => ({ ...prev, designation }))
                            }
                          }}
                          className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none cursor-pointer"
                        >
                          <option value="">Select Designation...</option>
                          {designationRates.length > 0 ? (
                            designationRates.map((rate) => (
                              <option key={rate.id} value={rate.designation}>
                                {rate.designation} - ${rate.hourly_rate}/hr
                                {rate.overtime_hourly_rate ? ` (OT: $${rate.overtime_hourly_rate}/hr)` : ` (OT: $${(rate.hourly_rate * 1.5).toFixed(2)}/hr)`}
                              </option>
                            ))
                          ) : (
                            <option value="" disabled>Loading designations...</option>
                          )}
                        </select>
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none z-10">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                        {selectedDesignationRate && (() => {
                          const rate = selectedDesignationRate!
                          const hourlyRate = rate.hourly_rate
                          const overtimeHourlyRate = rate.overtime_hourly_rate
                          // Use overtime_hourly_rate if it exists, otherwise use 1.5 × hourly_rate
                          const overtimeRate: number = (overtimeHourlyRate != null && overtimeHourlyRate !== undefined)
                            ? Number(overtimeHourlyRate)
                            : (hourlyRate * 1.5)
                          return (
                            <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                              <span className="font-medium">Rate:</span> ${hourlyRate}/hr
                              {(overtimeHourlyRate != null && overtimeHourlyRate !== undefined) ? (
                                <span className="ml-2">Overtime: ${overtimeHourlyRate}/hr</span>
                              ) : (
                                <span className="ml-2">Overtime: ${overtimeRate.toFixed(2)}/hr (1.5x)</span>
                              )}
                            </div>
                          )
                        })()}
                      </div>
                    </div>

                    {/* START */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        <Clock className="h-4 w-4 inline mr-1" />
                        Start Time <span className="text-gray-400">(Optional)</span>
                      </label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                        <input
                          type="time"
                          value={(() => {
                            const startValue = formData.start
                            if (!startValue) return ''
                            // Extract time from datetime-local format
                            if (/T\d{2}:\d{2}$/.test(startValue)) {
                              return startValue.split('T')[1]
                            }
                            // If only time format (HH:mm)
                            if (/^\d{2}:\d{2}$/.test(startValue)) return startValue
                            return ''
                          })()}
                          onChange={(e) => {
                            const timeValue = e.target.value
                            // Use date from Date field if exists, otherwise use today's date
                            const dateValue = formData.date 
                              ? (() => {
                                  const dateStr = formData.date
                                  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
                                  // Try to convert other formats
                                  const formats = [
                                    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
                                    /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
                                    /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/,
                                  ]
                                  for (const format of formats) {
                                    const matchResult = dateStr.match(format)
                                    if (matchResult?.[1] && matchResult?.[2] && matchResult?.[3]) {
                                      const match = matchResult as RegExpMatchArray
                                      let day, month, year
                                      if (format === formats[2]) {
                                        year = match[1]
                                        month = match[2].padStart(2, '0')
                                        day = match[3].padStart(2, '0')
                                      } else {
                                        day = match[1].padStart(2, '0')
                                        month = match[2].padStart(2, '0')
                                        year = match[3]
                                      }
                                      if (year && month && day) {
                                        return `${year}-${month}-${day}`
                                      }
                                    }
                                  }
                                  return ''
                                })()
                              : (() => {
                                  const today = new Date()
                                  return today.toISOString().split('T')[0]
                                })()
                            
                            const newStartValue = dateValue ? `${dateValue}T${timeValue}` : timeValue
                            setFormData((prev) => {
                              let finishValue = prev.finish
                              // Auto-copy date and time to finish if finish is empty
                              if (newStartValue && !finishValue) {
                                if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(newStartValue)) {
                                  const [datePart, timePart] = newStartValue.split('T')
                                  const [hours, minutes] = timePart.split(':')
                                  const newHours = String((parseInt(hours) + 1) % 24).padStart(2, '0')
                                  finishValue = `${datePart}T${newHours}:${minutes}`
                                }
                              }
                              return { ...prev, start: newStartValue, finish: finishValue }
                            })
                          }}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Select time only (date is taken from Date field above)
                      </p>
                    </div>

                    {/* FINISH */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          <Clock className="h-4 w-4 inline mr-1" />
                          Finish Time <span className="text-gray-400">(Optional)</span>
                        </label>
                        {formData.start && (
                          <button
                            type="button"
                            onClick={() => {
                              // Copy time from start and add 1 hour
                              const startValue = formData.start
                              if (startValue) {
                                let finishValue = ''
                                // If start is datetime-local, extract date and add 1 hour to time
                                if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(startValue)) {
                                  const [datePart, timePart] = startValue.split('T')
                                  const [hours, minutes] = timePart.split(':')
                                  const newHours = String((parseInt(hours) + 1) % 24).padStart(2, '0')
                                  finishValue = `${datePart}T${newHours}:${minutes}`
                                } else if (/^\d{2}:\d{2}$/.test(startValue)) {
                                  // If only time, add 1 hour
                                  const [hours, minutes] = startValue.split(':')
                                  const newHours = String((parseInt(hours) + 1) % 24).padStart(2, '0')
                                  finishValue = `${newHours}:${minutes}`
                                }
                                if (finishValue) {
                                  setFormData({ ...formData, finish: finishValue })
                                }
                              }
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                            title="Copy time from Start Time + 1 hour"
                          >
                            <ArrowRight className="h-3 w-3" />
                            Copy from Start
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                        <input
                          type="time"
                          value={(() => {
                            const finishValue = formData.finish
                            if (!finishValue) return ''
                            // Extract time from datetime-local format
                            if (/T\d{2}:\d{2}$/.test(finishValue)) {
                              return finishValue.split('T')[1]
                            }
                            // If only time format (HH:mm)
                            if (/^\d{2}:\d{2}$/.test(finishValue)) return finishValue
                            return ''
                          })()}
                          onChange={(e) => {
                            const timeValue = e.target.value
                            // Use date from Date field if exists, otherwise use start date or today
                            const dateValue = formData.date 
                              ? (() => {
                                  const dateStr = formData.date
                                  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
                                  // Try to convert other formats
                                  const formats = [
                                    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
                                    /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
                                    /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/,
                                  ]
                                  for (const format of formats) {
                                    const matchResult = dateStr.match(format)
                                    if (matchResult?.[1] && matchResult?.[2] && matchResult?.[3]) {
                                      const match = matchResult as RegExpMatchArray
                                      let day, month, year
                                      if (format === formats[2]) {
                                        year = match[1]
                                        month = match[2].padStart(2, '0')
                                        day = match[3].padStart(2, '0')
                                      } else {
                                        day = match[1].padStart(2, '0')
                                        month = match[2].padStart(2, '0')
                                        year = match[3]
                                      }
                                      if (year && month && day) {
                                        return `${year}-${month}-${day}`
                                      }
                                    }
                                  }
                                  return ''
                                })()
                              : (formData.start && /^\d{4}-\d{2}-\d{2}T/.test(formData.start))
                                ? formData.start.split('T')[0]
                                : (() => {
                                    const today = new Date()
                                    return today.toISOString().split('T')[0]
                                  })()
                            
                            const newFinishValue = dateValue ? `${dateValue}T${timeValue}` : timeValue
                            setFormData({ ...formData, finish: newFinishValue })
                          }}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Select time only (date is taken from Date field above)
                      </p>
                    </div>

                    {/* Standard Working Hours */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        <Clock className="h-4 w-4 inline mr-1" />
                        Standard Working Hours <span className="text-gray-400">(Default: 8)</span>
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        placeholder="e.g., 8"
                        value={formData.standardWorkingHours}
                        onChange={(e) => {
                          const value = e.target.value
                          const standardHours = parseFloat(value) || 8
                          
                          // Recalculate overtime and cost when standard hours change
                          if (formData.start && formData.finish) {
                            const totalHours = calculateTotalHours(formData.start, formData.finish)
                            const overtime = calculateOvertime(totalHours, value)
                            const overtimeHours = Math.max(0, totalHours - standardHours)
                            
                            // Recalculate cost if designation is selected
                            let newCost = formData.cost
                            if (formData.designation) {
                              const calculatedCost = calculateCost(formData.designation, standardHours, overtimeHours)
                              newCost = calculatedCost > 0 ? calculatedCost.toFixed(2) : ''
                            }
                            
                            setFormData((prev) => ({
                              ...prev,
                              standardWorkingHours: value,
                              totalHours: totalHours > 0 ? totalHours.toFixed(2) : '',
                              overtime: overtime > 0 ? overtime.toFixed(2) : '0',
                              cost: newCost
                            }))
                          } else {
                            setFormData({ ...formData, standardWorkingHours: value })
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Number of standard working hours per day
                      </p>
                    </div>

                    {/* Total Hours */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Total Hours <span className="text-gray-400">(Auto-calculated, Read-only)</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Auto-calculated from Start & Finish"
                        value={formData.totalHours}
                        readOnly
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Calculated automatically from Start & Finish times
                      </p>
                    </div>

                    {/* OVERTIME */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Overtime <span className="text-gray-400">(Auto-calculated, Read-only)</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Auto-calculated (Total Hours - Standard Hours)"
                        value={formData.overtime}
                        readOnly
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Calculated automatically as Total Hours - Standard Working Hours
                      </p>
                    </div>

                    {/* Cost */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        <DollarSign className="h-4 w-4 inline mr-1" />
                        Cost <span className="text-gray-400">
                          {formData.designation ? '(Auto-calculated from Designation Rate)' : '(Optional)'}
                        </span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder={formData.designation ? "Auto-calculated" : "e.g., 8000"}
                        value={formData.cost}
                        onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                        readOnly={!!formData.designation}
                        disabled={!!formData.designation}
                        className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg ${
                          formData.designation 
                            ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed' 
                            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                        } focus:ring-2 focus:ring-green-500 focus:border-transparent`}
                      />
                      {formData.designation && formData.cost && selectedDesignationRate && (() => {
                        const rate = selectedDesignationRate!
                        // Use overtime_hourly_rate if it exists, otherwise use 1.5 × hourly_rate
                        const overtimeRate: number = (rate.overtime_hourly_rate != null && rate.overtime_hourly_rate !== undefined)
                          ? Number(rate.overtime_hourly_rate)
                          : (rate.hourly_rate * 1.5)
                        return (
                          <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                            ✓ Calculated: {formData.standardWorkingHours || 8} standard hours × ${rate.hourly_rate}/hr
                            {parseFloat(formData.overtime || '0') > 0 && (
                              <span className="ml-1">
                                + {formData.overtime} overtime hours × ${overtimeRate.toFixed(2)}/hr
                                {(rate.overtime_hourly_rate == null || rate.overtime_hourly_rate === undefined) && (
                                  <span className="text-gray-500"> (1.5x)</span>
                                )}
                              </span>
                            )}
                          </p>
                        )
                      })()}
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowAddForm(false)
                        setEditingRecord(null)
                        setFormData({
                          date: '',
                          projectCode: '',
                          labourCode: '',
                          designation: '',
                          start: '',
                          finish: '',
                          standardWorkingHours: '8',
                          overtime: '',
                          totalHours: '',
                          cost: ''
                        })
                        setFormError('')
                        setFormSuccess('')
                      }}
                      disabled={formLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={formLoading || !formData.projectCode.trim()}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {formLoading ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Record
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Project Code Search */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search by Project Code
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearchSubmit} className="space-y-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                    {availableProjects.length > 0 ? (
                      <>
                        {/* ✅ Custom Searchable Dropdown */}
                    <input
                      type="text"
                          placeholder="🔍 Search and select project code..."
                          value={projectCodeSearch}
                          onChange={(e) => {
                            setProjectCodeSearch(e.target.value)
                            setShowProjectDropdown(true)
                          }}
                          onFocus={() => setShowProjectDropdown(true)}
                          onBlur={() => {
                            // Delay to allow click on dropdown item
                            setTimeout(() => setShowProjectDropdown(false), 200)
                          }}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          disabled={loading || loadingProjects}
                        />
                        {showProjectDropdown && (
                          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-96 overflow-y-auto">
                            {(() => {
                              const filteredProjects = availableProjects.filter((projectCode) => {
                                if (!projectCodeSearch.trim()) return true
                                const searchLower = projectCodeSearch.toLowerCase().trim()
                                return projectCode.toLowerCase().includes(searchLower)
                              })
                              
                              return (
                                <>
                                  {filteredProjects.length > 0 ? (
                                    filteredProjects.map((projectCode) => (
                                      <button
                                        key={projectCode}
                                        type="button"
                                        onClick={async () => {
                                          setProjectCodeSearch(projectCode)
                                          setShowProjectDropdown(false)
                                          // Auto-search immediately when project is selected
                                          await searchByProjectCodeDirect(projectCode)
                                        }}
                                        className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors"
                                      >
                                        <div className="font-medium text-gray-900 dark:text-white">
                                          {projectCode}
                                        </div>
                                      </button>
                                    ))
                                  ) : (
                                    <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                                      {projectCodeSearch.trim() 
                                        ? `No projects found matching "${projectCodeSearch}"`
                                        : 'No projects available'}
                                    </div>
                                  )}
                                  {filteredProjects.length > 0 && (
                                    <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 text-center border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                                      Showing {filteredProjects.length} of {availableProjects.length} project{availableProjects.length > 1 ? 's' : ''}
                                    </div>
                                  )}
                                </>
                              )
                            })()}
                          </div>
                        )}
                      </>
                    ) : (
                      <input
                        type="text"
                        placeholder="Type project code manually (e.g., P4110-P, P4110)..."
                      value={projectCodeSearch}
                      onChange={(e) => setProjectCodeSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={loading || loadingProjects}
                    />
                    )}
                  </div>
                  <Button
                    type="submit"
                    disabled={loading || !projectCodeSearch.trim()}
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Search
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={loadAvailableProjects}
                    disabled={loadingProjects}
                    title="Refresh Projects List"
                  >
                    <RefreshCw className={`h-4 w-4 ${loadingProjects ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex flex-col gap-1">
                    <p className="text-gray-500 dark:text-gray-400">
                      {loadingProjects 
                        ? '⏳ Loading projects...'
                        : (() => {
                            const filteredCount = projectCodeSearch 
                              ? availableProjects.filter(p => p.toLowerCase().includes(projectCodeSearch.toLowerCase())).length
                              : availableProjects.length
                            const totalCount = availableProjects.length
                            
                            if (availableProjects.length > 0) {
                              if (projectCodeSearch && showProjectDropdown) {
                                return `📋 Showing ${filteredCount} of ${totalCount} project${totalCount > 1 ? 's' : ''}`
                              }
                              return `📋 ${totalCount} project${totalCount > 1 ? 's' : ''} available`
                            }
                            return '⚠️ No projects found. Import data from Database Manager or search manually.'
                          })()}
                    </p>
                    {availableProjects.length === 0 && !loadingProjects && (
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        💡 You can still search manually by typing a project code
                      </p>
                    )}
                    {availableProjects.length > 0 && projectCodeSearch && showProjectDropdown && (
                      <p className="text-xs text-blue-500 dark:text-blue-400">
                        💡 Type to search projects, then click to select
                      </p>
                    )}
                  </div>
                  {loadingProjects && (
                    <span className="text-blue-500 flex items-center gap-1">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      Loading...
                    </span>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Advanced Filters (only shown when data is loaded) */}
          {data.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <SlidersHorizontal className="h-5 w-5" />
                    Filters & Search
                    {activeFiltersCount > 0 && (
                      <span className="ml-2 px-2 py-1 text-xs font-semibold bg-blue-500 text-white rounded-full">
                        {activeFiltersCount}
                      </span>
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {activeFiltersCount > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearAllFilters}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Clear All
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    >
                      <Filter className="h-4 w-4 mr-1" />
                      {showAdvancedFilters ? 'Hide' : 'Show'} Filters
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {/* Quick Search */}
                  <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                        placeholder="🔍 Quick search in all fields (supports multiple words: e.g., 'P4110 engineer')"
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value)
                        setCurrentPage(1) // Reset to first page when searching
                      }}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    </div>
                    {searchTerm && (
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>💡 Tip: You can search multiple terms separated by spaces</span>
                        <button
                          type="button"
                          onClick={() => setSearchTerm('')}
                          className="text-blue-500 hover:text-blue-700 underline"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* Advanced Filters (Collapsible) */}
                  {showAdvancedFilters && (
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Project Code Filter (Dropdown) */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            <Search className="h-4 w-4 inline mr-1" />
                            Project Code
                          </label>
                          <select
                            value={filters.projectCode || ''}
                            onChange={(e) => {
                              setFilters({ ...filters, projectCode: e.target.value })
                              setCurrentPage(1)
                            }}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">All Projects</option>
                            {availableProjects.map((projectCode) => (
                              <option key={projectCode} value={projectCode}>
                                {projectCode}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        {/* Date Filter (from "Column 1") */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            <Calendar className="h-4 w-4 inline mr-1" />
                            Date
                          </label>
                          <input
                            type="text"
                            placeholder="Filter by Date (e.g., 12/1/2024)"
                            value={filters.date}
                            onChange={(e) => {
                              setFilters({ ...filters, date: e.target.value })
                              setCurrentPage(1)
                            }}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        
                        {/* Labour Code Filter */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            <UserCheck className="h-4 w-4 inline mr-1" />
                            Labour Code
                          </label>
                          <input
                            type="text"
                            placeholder="Filter by Labour Code"
                            value={filters.labourCode}
                            onChange={(e) => {
                              setFilters({ ...filters, labourCode: e.target.value })
                              setCurrentPage(1)
                            }}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        
                        {/* Designation Filter */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            <UserCheck className="h-4 w-4 inline mr-1" />
                            Designation
                          </label>
                          <input
                            type="text"
                            placeholder="Filter by Designation"
                            value={filters.designation}
                            onChange={(e) => {
                              setFilters({ ...filters, designation: e.target.value })
                              setCurrentPage(1)
                            }}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        
                        {/* Overtime Filter */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            <Clock className="h-4 w-4 inline mr-1" />
                            Overtime
                          </label>
                          <select
                            value={filters.overtime}
                            onChange={(e) => {
                              setFilters({ ...filters, overtime: e.target.value })
                              setCurrentPage(1)
                            }}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">All</option>
                            <option value="yes">Has Overtime</option>
                            <option value="no">No Overtime</option>
                          </select>
                        </div>
                        
                        {/* Start Date Filter */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            <Calendar className="h-4 w-4 inline mr-1" />
                            Start Date (From)
                          </label>
                          <input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => {
                              setFilters({ ...filters, startDate: e.target.value })
                              setCurrentPage(1)
                            }}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        
                        {/* End Date Filter */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            <Calendar className="h-4 w-4 inline mr-1" />
                            End Date (To)
                          </label>
                          <input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => {
                              setFilters({ ...filters, endDate: e.target.value })
                              setCurrentPage(1)
                            }}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        
                        {/* Min Hours Filter */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            <Clock className="h-4 w-4 inline mr-1" />
                            Min Hours
                          </label>
                          <input
                            type="number"
                            placeholder="Minimum hours"
                            value={filters.minHours}
                            onChange={(e) => {
                              setFilters({ ...filters, minHours: e.target.value })
                              setCurrentPage(1)
                            }}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        
                        {/* Max Hours Filter */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            <Clock className="h-4 w-4 inline mr-1" />
                            Max Hours
                          </label>
                          <input
                            type="number"
                            placeholder="Maximum hours"
                            value={filters.maxHours}
                            onChange={(e) => {
                              setFilters({ ...filters, maxHours: e.target.value })
                              setCurrentPage(1)
                            }}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        
                        {/* Min Cost Filter */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            <DollarSign className="h-4 w-4 inline mr-1" />
                            Min Cost (AED)
                          </label>
                          <input
                            type="number"
                            placeholder="Minimum cost"
                            value={filters.minCost}
                            onChange={(e) => {
                              setFilters({ ...filters, minCost: e.target.value })
                              setCurrentPage(1)
                            }}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        
                        {/* Max Cost Filter */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            <DollarSign className="h-4 w-4 inline mr-1" />
                            Max Cost (AED)
                          </label>
                          <input
                            type="number"
                            placeholder="Maximum cost"
                            value={filters.maxCost}
                            onChange={(e) => {
                              setFilters({ ...filters, maxCost: e.target.value })
                              setCurrentPage(1)
                            }}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                      
                      {/* Filter Summary */}
                      {activeFiltersCount > 0 && (
                        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            📊 Showing <strong>{filteredData.length.toLocaleString()}</strong> of <strong>{data.length.toLocaleString()}</strong> records
                            {activeFiltersCount > 0 && ` (${activeFiltersCount} filter${activeFiltersCount > 1 ? 's' : ''} active)`}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Success Alert */}
          {success && (
            <Alert variant="success">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                <span>{success}</span>
              </div>
            </Alert>
          )}

          {/* Error Alert */}
          {error && (
            <Alert variant="error">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span className="font-semibold">Error:</span>
                <span>{error}</span>
              </div>
            </Alert>
          )}

          {/* Data Table */}
          <Card>
            <CardHeader>
              <CardTitle>MANPOWER Records</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner size="lg" />
                  <p className="ml-4 text-gray-600 dark:text-gray-400">
                    Loading MANPOWER data for project: <strong>{projectCodeSearch}</strong>
                  </p>
                </div>
              ) : !hasSearched ? (
                <div className="text-center py-12">
                  <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 mb-2 font-medium">
                    Search for a Project Code to load MANPOWER data
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    Enter a Project Code in the search box above to load and view MANPOWER records for that project.
                  </p>
                </div>
              ) : filteredData.length === 0 ? (
                <div className="text-center py-12">
                  <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 mb-2">
                    {data.length === 0 
                      ? `No MANPOWER records found for Project Code: ${projectCodeSearch}`
                      : 'No records match your filter criteria.'}
                  </p>
                  {data.length === 0 && (
                    <p className="text-sm text-gray-500 dark:text-gray-500">
                      Try searching with a different Project Code or check if the data has been imported in Database Manager.
                    </p>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        {isSelectMode && (
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-12">
                            <button
                              type="button"
                              onClick={toggleSelectAll}
                              className="flex items-center justify-center"
                            >
                              {selectedRecords.size === filteredData.length && filteredData.length > 0 ? (
                                <CheckSquare className="h-5 w-5 text-blue-600" />
                              ) : (
                                <Square className="h-5 w-5 text-gray-400" />
                              )}
                            </button>
                          </th>
                        )}
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Project Code
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Labour Code
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Designation
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Start
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Finish
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Overtime
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Total Hours
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Cost
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                      {paginatedData.map((record, index) => {
                        const rawRecord = (record as any).raw || record
                        const date = rawRecord['Date'] || rawRecord['date'] || rawRecord['Column 1'] || rawRecord['column_1'] || record.date || '-'
                        const projectCode = rawRecord['PROJECT CODE'] || rawRecord['project_code'] || record.project_code || '-'
                        const labourCode = rawRecord['LABOUR CODE'] || rawRecord['labour_code'] || record.labour_code || '-'
                        const designation = rawRecord['Designation'] || rawRecord['designation'] || record.designation || '-'
                        const start = extractTimeOnly((rawRecord['START'] || rawRecord['start'] || record.start || '-').toString())
                        const finish = extractTimeOnly((rawRecord['FINISH'] || rawRecord['finish'] || record.finish || '-').toString())
                        const overtime = rawRecord['OVERTIME'] || rawRecord['overtime'] || record.overtime || '-'
                        const totalHours = rawRecord['Total Hours'] || rawRecord['total_hours'] || rawRecord['TotalHours'] || record.total_hours || 0
                        const cost = rawRecord['Cost'] || rawRecord['cost'] || record.cost || 0
                        
                        const recordId = (record as any).id || index.toString()
                        const isSelected = selectedRecords.has(recordId)
                        
                        return (
                          <tr
                            key={recordId}
                            className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                          >
                            {isSelectMode && (
                              <td className="px-4 py-3 whitespace-nowrap text-center">
                                <button
                                  type="button"
                                  onClick={() => toggleRecordSelection(recordId)}
                                  className="flex items-center justify-center"
                                >
                                  {isSelected ? (
                                    <CheckSquare className="h-5 w-5 text-blue-600" />
                                  ) : (
                                    <Square className="h-5 w-5 text-gray-400" />
                                  )}
                                </button>
                              </td>
                            )}
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                              {date}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {projectCode}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {labourCode}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {designation}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {start}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {finish}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {overtime}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                              {totalHours ? parseFloat(String(totalHours)).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '-'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900 dark:text-white">
                              {cost ? `AED ${parseFloat(String(cost)).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '-'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              <div className="flex items-center justify-center gap-2">
                                {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => handleEditRecord(record)}
                                  className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                  title="Edit"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                )}
                                {canDelete && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRecord(recordId)}
                                  disabled={deleteLoading === recordId}
                                  className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50"
                                  title="Delete"
                                >
                                  {deleteLoading === recordId ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </button>
                                )}
                                {!canEdit && !canDelete && (
                                  <span className="text-xs text-gray-400">-</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    {filteredData.length > 0 && (
                      <tfoot className="bg-gray-50 dark:bg-gray-800 font-semibold">
                        <tr>
                          <td colSpan={isSelectMode ? 8 : 7} className="px-4 py-3 text-right text-sm text-gray-900 dark:text-white">
                            Totals:
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-900 dark:text-white">
                            {totals.totalHours.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-900 dark:text-white">
                            AED {totals.totalCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                  
                  {/* Pagination Controls */}
                  {filteredData.length > itemsPerPage && (
                    <div className="mt-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          Showing {startIndex + 1} to {Math.min(endIndex, filteredData.length)} of {filteredData.length} records
                        </span>
                        <select
                          value={itemsPerPage}
                          onChange={(e) => {
                            setItemsPerPage(Number(e.target.value))
                            setCurrentPage(1)
                          }}
                          className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        >
                          <option value={25}>25 per page</option>
                          <option value={50}>50 per page</option>
                          <option value={100}>100 per page</option>
                          <option value={200}>200 per page</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(1)}
                          disabled={currentPage === 1}
                        >
                          First
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </Button>
                        <span className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300">
                          Page {currentPage} of {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                        >
                          Next
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(totalPages)}
                          disabled={currentPage === totalPages}
                        >
                          Last
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PermissionPage>
  )
}
