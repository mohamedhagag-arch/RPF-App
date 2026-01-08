'use client'

import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { useAuth } from '@/app/providers'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
import { useSmartLoading } from '@/lib/smartLoadingManager'
import { ContractVariation, VariationStatus, TABLES, Project, CommercialBOQItem } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Alert } from '@/components/ui/Alert'
import { Input } from '@/components/ui/Input'
import { Pagination } from '@/components/ui/Pagination'
import { PermissionButton } from '@/components/ui/PermissionButton'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter, 
  X, 
  Save, 
  XCircle,
  FileText,
  DollarSign,
  TrendingUp,
  CheckSquare,
  Square,
  Download,
  Calendar,
  FileEdit
} from 'lucide-react'
import { formatCurrencyByCodeSync } from '@/lib/currenciesManager'
import { buildProjectFullCode } from '@/lib/projectDataFetcher'
import { BulkEditVariationsModal } from './BulkEditVariationsModal'
import { AddVariationForm } from './AddVariationForm'
import { AddBOQItemFormSimplified } from './AddBOQItemFormSimplified'

// Helper function to format date as "Jan 04, 25"
const formatDate = (dateString: string | undefined | null): string => {
  if (!dateString || dateString.trim() === '') return '-'
  try {
    // Handle date strings that might be in format "YYYY-MM-D" or "YYYY-MM-DD"
    let date: Date
    if (dateString.includes('T')) {
      // ISO format with time
      date = new Date(dateString)
    } else {
      // Date only format - ensure proper parsing
      const parts = dateString.split('-')
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10)
        const month = parseInt(parts[1], 10) - 1 // Month is 0-indexed
        const day = parseInt(parts[2], 10)
        date = new Date(year, month, day)
      } else {
        date = new Date(dateString)
      }
    }
    
    if (isNaN(date.getTime())) return dateString // Return original if invalid
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const month = months[date.getMonth()]
    const day = String(date.getDate()).padStart(2, '0')
    const year = String(date.getFullYear()).slice(-2)
    
    return `${month} ${day}, ${year}`
  } catch {
    return dateString
  }
}

interface ContractVariationsManagementProps {
  globalSearchTerm?: string
}

export function ContractVariationsManagement({ globalSearchTerm = '' }: ContractVariationsManagementProps = {}) {
  const guard = usePermissionGuard()
  const { appUser } = useAuth()
  const [variations, setVariations] = useState<ContractVariation[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [boqItems, setBoqItems] = useState<CommercialBOQItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingData, setEditingData] = useState<Partial<ContractVariation>>({})
  
  // Adding new row state
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [newVariationData, setNewVariationData] = useState<Partial<ContractVariation>>({
    project_full_code: '',
    project_name: '',
    variation_ref_no: '',
    item_description: '',
    quantity_changes: 0,
    variation_amount: 0,
    date_of_submission: undefined,
    variation_status: 'Pending',
    date_of_approval: undefined,
    remarks: '',
  })
  
  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isSelectMode, setIsSelectMode] = useState(false)
  
  // Bulk edit state
  const [showBulkEditModal, setShowBulkEditModal] = useState(false)
  
  // Add variation form state
  const [showAddForm, setShowAddForm] = useState(false)
  
  // Simplified BOQ item form state (for inline row creation)
  const [showAddBOQFormInline, setShowAddBOQFormInline] = useState(false)
  
  // Filters state
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    search: globalSearchTerm,
    project: new Set<string>(),
    status: new Set<VariationStatus>(),
    variationRefNo: new Set<string>(),
    createdBy: new Set<string>(),
    updatedBy: new Set<string>(),
    dateSubmissionRange: { min: undefined as string | undefined, max: undefined as string | undefined },
    dateApprovalRange: { min: undefined as string | undefined, max: undefined as string | undefined },
    variationAmountRange: { min: undefined as number | undefined, max: undefined as number | undefined },
  })
  
  // Multiselect dropdown states
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [showVariationRefNoDropdown, setShowVariationRefNoDropdown] = useState(false)
  const [showCreatedByDropdown, setShowCreatedByDropdown] = useState(false)
  const [showUpdatedByDropdown, setShowUpdatedByDropdown] = useState(false)
  
  // Search terms for multiselect filters
  const [projectSearch, setProjectSearch] = useState('')
  const [statusSearch, setStatusSearch] = useState('')
  const [variationRefNoSearch, setVariationRefNoSearch] = useState('')
  const [createdBySearch, setCreatedBySearch] = useState('')
  const [updatedBySearch, setUpdatedBySearch] = useState('')
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(50)
  
  // Sorting
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  
  const supabase = getSupabaseClient()
  const { startSmartLoading, stopSmartLoading } = useSmartLoading('contract-variations')
  
  // Refs to prevent concurrent fetches
  const fetchingVariationsRef = useRef(false)
  const fetchingProjectsRef = useRef(false)
  const fetchingBOQItemsRef = useRef(false)
  
  // Fetch Variations
  const fetchVariations = useCallback(async () => {
    if (fetchingVariationsRef.current) {
      console.log('⏸️ Fetch already in progress, skipping...')
      return
    }
    
    try {
      fetchingVariationsRef.current = true
      setLoading(true)
      setError('')
      startSmartLoading(setLoading)
      
      console.log('🔍 Fetching variations from table:', TABLES.CONTRACT_VARIATIONS)
      
      const { data, error: fetchError } = await supabase
        .from(TABLES.CONTRACT_VARIATIONS)
        .select('*')
        .order('created_at', { ascending: false })
      
      if (fetchError) {
        console.error('❌ Supabase fetch error:', fetchError)
        throw fetchError
      }
      
      console.log('📦 Raw data from Supabase:', data)
      console.log('📦 Number of records:', data?.length || 0)
      
      if (!data || data.length === 0) {
        console.log('⚠️ No data returned from Supabase')
        setVariations([])
        return
      }
      
      // Map database columns to TypeScript interface
      const mappedVariations: ContractVariation[] = (data || []).map((row: any) => {
        const getValue = (possibleNames: string[]): string => {
          for (const name of possibleNames) {
            const value = row[name]
            if (value !== null && value !== undefined && value !== '') {
              return String(value).trim()
            }
          }
          return ''
        }
        
        const getNumericValue = (possibleNames: string[]): number => {
          for (const name of possibleNames) {
            const value = row[name]
            if (value !== null && value !== undefined && value !== '') {
              const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/,/g, ''))
              if (!isNaN(num) && isFinite(num)) {
                return num
              }
            }
          }
          return 0
        }
        
        // Handle single UUID for item_description
        const itemDescValue = row['Item Description'] || row['item_description']
        const itemDescription = itemDescValue ? String(itemDescValue).trim() : ''
        
        const variation: ContractVariation = {
          id: row.id || '',
          auto_generated_unique_reference_number: getValue([
            'Auto Generated Unique Reference Number',
            'auto_generated_unique_reference_number'
          ]) || '',
          project_full_code: getValue([
            'Project Full Code',
            'project_full_code'
          ]) || '',
          project_name: getValue([
            'Project Name',
            'project_name'
          ]) || '',
          variation_ref_no: getValue([
            'Variation Ref no.',
            'variation_ref_no'
          ]) || undefined,
          item_description: itemDescription,
          quantity_changes: Number(getNumericValue(['Quantity Changes', 'quantity_changes'])),
          variation_amount: Number(getNumericValue(['Variation Amount', 'variation_amount'])),
          date_of_submission: getValue([
            'Date of Submission',
            'date_of_submission'
          ]) || undefined,
          variation_status: (getValue([
            'Variation Status',
            'variation_status'
          ]) || 'Pending') as VariationStatus,
          date_of_approval: getValue([
            'Date of Approval',
            'date_of_approval'
          ]) || undefined,
          remarks: getValue(['Remarks', 'remarks']) || undefined,
          created_at: row.created_at || '',
          updated_at: row.updated_at || '',
          created_by: row.created_by || undefined,
          updated_by: row.updated_by || undefined,
        }
        
        return variation
      })
      
      setVariations(mappedVariations)
      console.log('✅ Mapped variations:', mappedVariations.length)
    } catch (err: any) {
      console.error('❌ Error fetching variations:', err)
      setError(err.message || 'Failed to fetch variations')
    } finally {
      fetchingVariationsRef.current = false
      setLoading(false)
      stopSmartLoading(setLoading)
    }
  }, [supabase, startSmartLoading, stopSmartLoading])
  
  // Fetch Projects
  const fetchProjects = useCallback(async () => {
    if (fetchingProjectsRef.current) {
      console.log('⏸️ Projects fetch already in progress, skipping...')
      return
    }
    
    try {
      fetchingProjectsRef.current = true
      const { data, error: fetchError } = await supabase
        .from(TABLES.PROJECTS)
        .select('*')
      
      if (fetchError) throw fetchError
      
      const mappedProjects = (data || []).map((row: any) => {
        const project: Partial<Project> = {
          id: row.id,
          project_code: row['Project Code'] || '',
          project_sub_code: row['Project Sub-Code'] || '',
          project_name: row['Project Name'] || '',
          project_full_code: '',
          project_type: row['Project Type'] || '',
          responsible_division: row['Responsible Division'] || '',
          plot_number: row['Plot Number'] || '',
          kpi_completed: row['KPI Completed'] === 'Yes' || row['KPI Completed'] === true,
          project_status: (row['Project Status'] || 'upcoming') as Project['project_status'],
          contract_amount: parseFloat(String(row['Contract Amount'] || '0').replace(/,/g, '')) || 0,
          created_at: row.created_at || new Date().toISOString(),
          updated_at: row.updated_at || new Date().toISOString(),
          created_by: row.created_by || '',
        }
        project.project_full_code = buildProjectFullCode(project as Project)
        return project as Project
      })
      
      setProjects(mappedProjects)
    } catch (err: any) {
      console.error('Error fetching projects:', err)
    } finally {
      fetchingProjectsRef.current = false
    }
  }, [supabase])
  
  // Fetch BOQ Items
  const fetchBOQItems = useCallback(async () => {
    if (fetchingBOQItemsRef.current) {
      console.log('⏸️ BOQ items fetch already in progress, skipping...')
      return
    }
    
    try {
      fetchingBOQItemsRef.current = true
      const { data, error: fetchError } = await supabase
        .from(TABLES.COMMERCIAL_BOQ_ITEMS)
        .select('*')
        .order('created_at', { ascending: false })
      
      if (fetchError) throw fetchError
      
      const mappedItems: CommercialBOQItem[] = (data || []).map((row: any) => {
        const getValue = (possibleNames: string[]): string => {
          for (const name of possibleNames) {
            const value = row[name]
            if (value !== null && value !== undefined && value !== '') {
              return String(value).trim()
            }
          }
          return ''
        }
        
        const getNumericValue = (possibleNames: string[]): number => {
          for (const name of possibleNames) {
            const value = row[name]
            if (value !== null && value !== undefined && value !== '') {
              const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/,/g, ''))
              if (!isNaN(num) && isFinite(num)) {
                return num
              }
            }
          }
          return 0
        }
        
        const quantity = Number(getNumericValue(['Quantity', 'quantity']))
        const unitsVariation = Number(getNumericValue(['Units Variation', 'units_variation', 'UnitsVariation', 'unitsVariation']))
        const variationsAmount = Number(getNumericValue(['Variations', 'variations', 'Variations Amount', 'variations_amount']))
        const totalValue = Number(getNumericValue(['Total Value', 'total_value', 'TotalValue', 'totalValue']))
        
        const item: CommercialBOQItem = {
          id: row.id || '',
          auto_generated_unique_reference_number: getValue([
            'Auto Generated Unique Reference Number',
            'auto_generated_unique_reference_number'
          ]) || '',
          project_full_code: getValue([
            'Project Full Code',
            'project_full_code'
          ]) || '',
          project_name: getValue([
            'Project Name',
            'project_name'
          ]) || '',
          item_description: getValue([
            'Item Description',
            'item_description'
          ]) || '',
          unit: getValue(['Unit', 'unit']) || '',
          quantity: quantity,
          rate: Number(getNumericValue(['Rate', 'rate'])),
          total_value: totalValue,
          remeasurable: (row['Remeasurable?'] === true || 
                        row['Remeasurable?'] === 'true' ||
                        String(getValue(['Remeasurable?', 'remeasurable'])).toLowerCase() === 'true'),
          planning_assigned_amount: Number(getNumericValue(['Planning Assigned Amount', 'planning_assigned_amount', 'PlanningAssignedAmount', 'planningAssignedAmount'])),
          units_variation: unitsVariation,
          variations_amount: variationsAmount,
          total_units: quantity + unitsVariation, // ✅ Calculated: quantity + units_variation
          total_including_variations: totalValue + variationsAmount, // ✅ Calculated: total_value + variations_amount
          created_at: row.created_at || '',
          updated_at: row.updated_at || '',
        }
        
        return item
      })
      
      setBoqItems(mappedItems)
    } catch (err: any) {
      console.error('Error fetching BOQ items:', err)
    } finally {
      fetchingBOQItemsRef.current = false
    }
  }, [supabase])
  
  // Update BOQ items Variations field based on linked variations
  const updateBOQItemsVariations = useCallback(async () => {
    try {
      // Fetch all variations
      const { data: allVariations, error: variationsError } = await supabase
        .from(TABLES.CONTRACT_VARIATIONS)
        .select('id, "Item Description", "Variation Amount"')
      
      if (variationsError) {
        console.error('Error fetching variations for BOQ update:', variationsError)
        return
      }
      
      // Calculate total variation amount for each BOQ item
      const boqItemTotals: Record<string, number> = {}
      
      if (allVariations) {
        allVariations.forEach((variation: any) => {
          const itemDescription = variation['Item Description'] || variation.item_description || ''
          const variationAmount = parseFloat(variation['Variation Amount'] || variation.variation_amount || 0) || 0
          
          // Add the variation amount to the linked BOQ item
          if (itemDescription && String(itemDescription).trim() !== '') {
            const boqItemId = String(itemDescription).trim()
            if (!boqItemTotals[boqItemId]) {
              boqItemTotals[boqItemId] = 0
            }
            boqItemTotals[boqItemId] += variationAmount
          }
        })
      }
      
      // Update each BOQ item's Variations Amount field
      const updatePromises = Object.entries(boqItemTotals).map(async ([boqItemId, totalVariations]) => {
        const updateData: Record<string, any> = {
          'Variations Amount': totalVariations,
          'variations_amount': totalVariations
        }
        const { error: updateError } = await (supabase
          .from(TABLES.COMMERCIAL_BOQ_ITEMS) as any)
          .update(updateData)
          .eq('id', boqItemId)
        
        if (updateError) {
          console.error(`Error updating BOQ item ${boqItemId}:`, updateError)
        }
      })
      
      // Also update BOQ items that are not in any variation to 0
      const { data: allBOQItems, error: boqError } = await supabase
        .from(TABLES.COMMERCIAL_BOQ_ITEMS)
        .select('id')
      
      if (!boqError && allBOQItems) {
        const boqItemIds = new Set(Object.keys(boqItemTotals))
        const itemsToReset = (allBOQItems as any[])
          .filter((item: any) => !boqItemIds.has(item.id))
          .map((item: any) => item.id)
        
        if (itemsToReset.length > 0) {
          const resetData: Record<string, any> = {
            'Variations Amount': 0,
            'variations_amount': 0
          }
          const { error: resetError } = await (supabase
            .from(TABLES.COMMERCIAL_BOQ_ITEMS) as any)
            .update(resetData)
            .in('id', itemsToReset)
          
          if (resetError) {
            console.error('Error resetting BOQ items variations:', resetError)
          }
        }
      }
      
      await Promise.all(updatePromises)
      
      // Refresh BOQ items list to reflect changes
      await fetchBOQItems()
    } catch (err: any) {
      console.error('Error updating BOQ items variations:', err)
    }
  }, [supabase, fetchBOQItems])
  
  useEffect(() => {
    const loadData = async () => {
      await fetchVariations()
      await new Promise(resolve => setTimeout(resolve, 100))
      await fetchProjects()
      await new Promise(resolve => setTimeout(resolve, 100))
      await fetchBOQItems()
    }
    loadData()
  }, [fetchVariations, fetchProjects, fetchBOQItems])
  
  // Update filters when globalSearchTerm changes
  useEffect(() => {
    if (globalSearchTerm) {
      setFilters(prev => ({ ...prev, search: globalSearchTerm }))
    }
  }, [globalSearchTerm])
  
  // Extract unique values for filters
  const uniqueValues = useMemo(() => {
    const projectsMap = new Map<string, { code: string; name: string }>()
    const statuses = new Set<VariationStatus>()
    const variationRefNos = new Set<string>()
    const createdByUsers = new Set<string>()
    const updatedByUsers = new Set<string>()
    
    let minVariationAmount = Infinity
    let maxVariationAmount = -Infinity
    
    variations.forEach(variation => {
      if (variation.project_full_code || variation.project_name) {
        const key = `${variation.project_full_code || ''}|${variation.project_name || ''}`
        if (!projectsMap.has(key)) {
          projectsMap.set(key, {
            code: variation.project_full_code || '',
            name: variation.project_name || ''
          })
        }
      }
      if (variation.variation_status) statuses.add(variation.variation_status)
      if (variation.variation_ref_no) variationRefNos.add(variation.variation_ref_no)
      if (variation.created_by) createdByUsers.add(variation.created_by)
      if (variation.updated_by) updatedByUsers.add(variation.updated_by)
      
      if (variation.variation_amount !== undefined && !isNaN(variation.variation_amount)) {
        minVariationAmount = Math.min(minVariationAmount, variation.variation_amount)
        maxVariationAmount = Math.max(maxVariationAmount, variation.variation_amount)
      }
    })
    
    const projectsArray = Array.from(projectsMap.entries()).map(([key, value]) => {
      let display = ''
      if (value.code && value.name) {
        display = `${value.code} - ${value.name}`
      } else if (value.code) {
        display = value.code
      } else if (value.name) {
        display = value.name
      }
      
      return {
        key,
        code: value.code,
        name: value.name,
        display: display || 'Unknown Project'
      }
    }).sort((a, b) => {
      const codeCompare = a.code.localeCompare(b.code, undefined, { sensitivity: 'base' })
      if (codeCompare !== 0) return codeCompare
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    })
    
    return {
      projects: projectsArray,
      statuses: Array.from(statuses).sort(),
      variationRefNos: Array.from(variationRefNos).sort(),
      createdByUsers: Array.from(createdByUsers).sort(),
      updatedByUsers: Array.from(updatedByUsers).sort(),
      ranges: {
        variationAmount: { 
          min: isFinite(minVariationAmount) ? minVariationAmount : -1000000, 
          max: isFinite(maxVariationAmount) ? maxVariationAmount : 1000000 
        },
      }
    }
  }, [variations])
  
  // Calculate min/max variation amounts for slider
  const variationAmountRange = useMemo(() => {
    if (variations.length === 0) {
      return { min: 0, max: 1000000 }
    }
    
    let minAmount = Infinity
    let maxAmount = -Infinity
    
    variations.forEach(variation => {
      if (variation.variation_amount !== undefined && !isNaN(variation.variation_amount)) {
        minAmount = Math.min(minAmount, variation.variation_amount)
        maxAmount = Math.max(maxAmount, variation.variation_amount)
      }
    })
    
    return {
      min: isFinite(minAmount) ? minAmount : 0,
      max: isFinite(maxAmount) ? maxAmount : 1000000
    }
  }, [variations])
  
  // Filtered variations
  const filteredVariations = useMemo(() => {
    let filtered = [...variations]
    
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(variation =>
        variation.auto_generated_unique_reference_number.toLowerCase().includes(searchLower) ||
        variation.project_full_code.toLowerCase().includes(searchLower) ||
        variation.project_name.toLowerCase().includes(searchLower) ||
        (variation.variation_ref_no && variation.variation_ref_no.toLowerCase().includes(searchLower)) ||
        (variation.remarks && variation.remarks.toLowerCase().includes(searchLower))
      )
    }
    
    // Column filters
    if (filters.project.size > 0) {
      filtered = filtered.filter(variation => {
        const projectKey = `${variation.project_full_code || ''}|${variation.project_name || ''}`
        return filters.project.has(projectKey)
      })
    }
    
    if (filters.status.size > 0) {
      filtered = filtered.filter(variation => 
        filters.status.has(variation.variation_status)
      )
    }
    
    if (filters.variationRefNo.size > 0) {
      filtered = filtered.filter(variation => 
        variation.variation_ref_no && filters.variationRefNo.has(variation.variation_ref_no)
      )
    }
    
    if (filters.createdBy.size > 0) {
      filtered = filtered.filter(variation => 
        variation.created_by && filters.createdBy.has(variation.created_by)
      )
    }
    
    if (filters.updatedBy.size > 0) {
      filtered = filtered.filter(variation => 
        variation.updated_by && filters.updatedBy.has(variation.updated_by)
      )
    }
    
    // Date range filters
    if (filters.dateSubmissionRange.min) {
      filtered = filtered.filter(variation => {
        if (!variation.date_of_submission) return false
        return variation.date_of_submission >= filters.dateSubmissionRange.min!
      })
    }
    if (filters.dateSubmissionRange.max) {
      filtered = filtered.filter(variation => {
        if (!variation.date_of_submission) return false
        return variation.date_of_submission <= filters.dateSubmissionRange.max!
      })
    }
    
    if (filters.dateApprovalRange.min) {
      filtered = filtered.filter(variation => {
        if (!variation.date_of_approval) return false
        return variation.date_of_approval >= filters.dateApprovalRange.min!
      })
    }
    if (filters.dateApprovalRange.max) {
      filtered = filtered.filter(variation => {
        if (!variation.date_of_approval) return false
        return variation.date_of_approval <= filters.dateApprovalRange.max!
      })
    }
    
    // Amount range filter
    if (filters.variationAmountRange.min !== undefined) {
      filtered = filtered.filter(variation => 
        variation.variation_amount >= filters.variationAmountRange.min!
      )
    }
    if (filters.variationAmountRange.max !== undefined) {
      filtered = filtered.filter(variation => 
        variation.variation_amount <= filters.variationAmountRange.max!
      )
    }
    
    // Sorting
    if (sortColumn) {
      filtered.sort((a, b) => {
        const aVal = (a as any)[sortColumn]
        const bVal = (b as any)[sortColumn]
        let comparison = 0
        if (aVal === null || aVal === undefined) comparison = 1
        else if (bVal === null || bVal === undefined) comparison = -1
        else if (typeof aVal === 'string' && typeof bVal === 'string') {
          comparison = aVal.localeCompare(bVal)
        } else {
          comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0
        }
        return sortDirection === 'asc' ? comparison : -comparison
      })
    }
    
    return filtered
  }, [variations, filters, sortColumn, sortDirection])
  
  // Summary statistics
  const summaryStats = useMemo(() => {
    const totalRecords = filteredVariations.length
    const totalVariationAmount = filteredVariations.reduce((sum, v) => sum + v.variation_amount, 0)
    const statusCounts: Record<VariationStatus, number> = {
      'Pending': 0,
      'Var Notice Sent': 0,
      'Submitted': 0,
      'Approved': 0,
      'Rejected': 0,
      'Internal Variation': 0,
    }
    
    filteredVariations.forEach(v => {
      if (v.variation_status && statusCounts.hasOwnProperty(v.variation_status)) {
        statusCounts[v.variation_status]++
      }
    })
    
    return {
      totalRecords,
      totalVariationAmount,
      statusCounts,
    }
  }, [filteredVariations])
  
  // Pagination
  const totalPages = Math.ceil(filteredVariations.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedVariations = filteredVariations.slice(startIndex, startIndex + itemsPerPage)
  
  // Handle sort
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }
  
  // Handle add new row
  const handleAddNewRow = () => {
    setIsAddingNew(true)
    setNewVariationData({
      project_full_code: '',
      project_name: '',
      variation_ref_no: '',
      item_description: '',
      quantity_changes: 0,
      variation_amount: 0,
      date_of_submission: undefined,
      variation_status: 'Pending',
      date_of_approval: undefined,
      remarks: '',
    })
    // Cancel any ongoing edit
    if (editingId) {
      setEditingId(null)
      setEditingData({})
    }
  }
  
  // Handle cancel add new row
  const handleCancelAddNew = () => {
    setIsAddingNew(false)
    setNewVariationData({
      project_full_code: '',
      project_name: '',
      variation_ref_no: '',
      item_description: '',
      quantity_changes: 0,
      variation_amount: 0,
      date_of_submission: undefined,
      variation_status: 'Pending',
      date_of_approval: undefined,
      remarks: '',
    })
  }
  
  // Handle save new row
  const handleSaveNew = async () => {
    try {
      setError('')
      setSuccess('')
      
      // Validation
      if (!newVariationData.project_full_code || !newVariationData.project_name) {
        setError('Please select a project')
        return
      }
      
      const validBOQItem = (newVariationData.item_description || '').trim()
      if (!validBOQItem) {
        setError('Please select a BOQ item')
        return
      }
      
      if (newVariationData.variation_amount === undefined || newVariationData.variation_amount === null || isNaN(parseFloat(String(newVariationData.variation_amount)))) {
        setError('Please enter a valid variation amount')
        return
      }
      
      const insertData: any = {
        'Project Full Code': newVariationData.project_full_code,
        'Project Name': newVariationData.project_name,
        'Variation Ref no.': newVariationData.variation_ref_no || null,
        'Item Description': validBOQItem,
        'Quantity Changes': newVariationData.quantity_changes !== undefined && newVariationData.quantity_changes !== null ? newVariationData.quantity_changes : 0,
        'Variation Amount': newVariationData.variation_amount !== undefined && newVariationData.variation_amount !== null ? newVariationData.variation_amount : 0,
        'Date of Submission': newVariationData.date_of_submission || null,
        'Variation Status': newVariationData.variation_status || 'Pending',
        'Date of Approval': newVariationData.date_of_approval || null,
        'Remarks': newVariationData.remarks || null,
        created_by: appUser?.id || null,
      }
      
      const { error: insertError } = await (supabase as any)
        .from(TABLES.CONTRACT_VARIATIONS)
        .insert([insertData] as any)
        .select()
        .single()
      
      if (insertError) throw insertError
      
      setSuccess('Variation created successfully')
      setIsAddingNew(false)
      setNewVariationData({
        project_full_code: '',
        project_name: '',
        variation_ref_no: '',
        item_description: '',
        quantity_changes: 0,
        variation_amount: 0,
        date_of_submission: undefined,
        variation_status: 'Pending',
        date_of_approval: undefined,
        remarks: '',
      })
      await fetchVariations()
      
      // Update BOQ items Variations field
      await updateBOQItemsVariations()
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      console.error('Error creating variation:', err)
      setError(err.message || 'Failed to create variation')
    }
  }
  
  // Handle edit
  const handleEdit = (variation: ContractVariation) => {
    setEditingId(variation.id)
    setEditingData({ ...variation })
    // Cancel any ongoing add
    if (isAddingNew) {
      setIsAddingNew(false)
      setNewVariationData({
        project_full_code: '',
        project_name: '',
        variation_ref_no: '',
        item_description: '',
        quantity_changes: 0,
        variation_amount: 0,
        date_of_submission: undefined,
        variation_status: 'Pending',
        date_of_approval: undefined,
        remarks: '',
      })
    }
  }
  
  // Handle save
  const handleSave = async (id: string) => {
    try {
      setError('')
      setSuccess('')
      
      const updateData: any = {
        'Project Full Code': editingData.project_full_code,
        'Project Name': editingData.project_name,
        'Variation Ref no.': editingData.variation_ref_no || null,
        'Item Description': editingData.item_description || null,
        'Quantity Changes': editingData.quantity_changes !== undefined && editingData.quantity_changes !== null ? editingData.quantity_changes : 0,
        'Variation Amount': editingData.variation_amount !== undefined && editingData.variation_amount !== null ? editingData.variation_amount : 0,
        'Date of Submission': editingData.date_of_submission || null,
        'Variation Status': editingData.variation_status || 'Pending',
        'Date of Approval': editingData.date_of_approval || null,
        'Remarks': editingData.remarks || null,
        updated_at: new Date().toISOString(),
        updated_by: appUser?.id || null,
      }
      
      const { error: updateError } = await (supabase as any)
        .from(TABLES.CONTRACT_VARIATIONS)
        .update(updateData)
        .eq('id', id)
      
      if (updateError) throw updateError
      
      setSuccess('Variation updated successfully')
      setEditingId(null)
      setEditingData({})
      await fetchVariations()
      
      // Update BOQ items Variations field
      await updateBOQItemsVariations()
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      console.error('Error updating variation:', err)
      setError(err.message || 'Failed to update variation')
    }
  }
  
  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this variation?')) return
    
    try {
      setError('')
      const { error: deleteError } = await supabase
        .from(TABLES.CONTRACT_VARIATIONS)
        .delete()
        .eq('id', id)
      
      if (deleteError) throw deleteError
      
      setSuccess('Variation deleted successfully')
      await fetchVariations()
      
      // Update BOQ items Variations field
      await updateBOQItemsVariations()
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      console.error('Error deleting variation:', err)
      setError(err.message || 'Failed to delete variation')
    }
  }
  
  // Handle bulk update
  const handleBulkUpdate = async (ids: string[], data: any) => {
    try {
      setError('')
      setSuccess('')
      
      const { error: updateError } = await (supabase as any)
        .from(TABLES.CONTRACT_VARIATIONS)
        .update({
          ...data,
          updated_at: new Date().toISOString(),
          updated_by: appUser?.id || null,
        })
        .in('id', ids)
      
      if (updateError) throw updateError
      
      setSuccess(`Successfully updated ${ids.length} variation(s)`)
      setSelectedIds(new Set())
      setIsSelectMode(false)
      await fetchVariations()
      
      // Update BOQ items Variations field
      await updateBOQItemsVariations()
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      console.error('Error bulk updating variations:', err)
      setError(err.message || 'Failed to update variations')
    }
  }
  
  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} variation(s)?`)) return
    
    try {
      setError('')
      const { error: deleteError } = await supabase
        .from(TABLES.CONTRACT_VARIATIONS)
        .delete()
        .in('id', Array.from(selectedIds))
      
      if (deleteError) throw deleteError
      
      setSuccess(`Successfully deleted ${selectedIds.size} variation(s)`)
      setSelectedIds(new Set())
      setIsSelectMode(false)
      await fetchVariations()
      
      // Update BOQ items Variations field
      await updateBOQItemsVariations()
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      console.error('Error bulk deleting variations:', err)
      setError(err.message || 'Failed to delete variations')
    }
  }
  
  // Handle select
  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedIds(newSelected)
  }
  
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(paginatedVariations.map(v => v.id)))
    } else {
      setSelectedIds(new Set())
    }
  }
  
  // Handle export
  const handleExport = () => {
    const headers = [
      'Reference Number',
      'Project Full Code',
      'Project Name',
      'Variation Ref No.',
      'BOQ Item',
      'Quantity Changes',
      'Variation Amount',
      'Date of Submission',
      'Status',
      'Date of Approval',
      'Remarks',
      'Created At',
      'Updated At'
    ]
    
    const rows = filteredVariations.map(v => [
      v.auto_generated_unique_reference_number,
      v.project_full_code,
      v.project_name,
      v.variation_ref_no || '',
      v.item_description ? getBOQItemDescription(v.item_description) : '',
      v.quantity_changes.toString(),
      v.variation_amount.toString(),
      v.date_of_submission || '',
      v.variation_status,
      v.date_of_approval || '',
      v.remarks || '',
      v.created_at,
      v.updated_at
    ])
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `contract_variations_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
  
  // Toggle filter helper
  const toggleFilter = (filterType: string, value: string | VariationStatus) => {
    setFilters(prev => {
      const newFilters = { ...prev }
      const filterSet = (newFilters as any)[filterType] as Set<any>
      const newSet = new Set(filterSet)
      if (newSet.has(value)) {
        newSet.delete(value)
      } else {
        newSet.add(value)
      }
      return { ...newFilters, [filterType]: newSet }
    })
  }
  
  // Clear all filters
  const clearFilters = () => {
    setFilters({
      search: '',
      project: new Set(),
      status: new Set(),
      variationRefNo: new Set(),
      createdBy: new Set(),
      updatedBy: new Set(),
      dateSubmissionRange: { min: undefined, max: undefined },
      dateApprovalRange: { min: undefined, max: undefined },
      variationAmountRange: { min: undefined, max: undefined },
    })
    setProjectSearch('')
    setStatusSearch('')
    setVariationRefNoSearch('')
    setCreatedBySearch('')
    setUpdatedBySearch('')
  }
  
  // Get BOQ item description by ID
  const getBOQItemDescription = (id: string): string => {
    const item = boqItems.find(i => i.id === id)
    return item ? item.item_description : id
  }
  
  // Get filtered BOQ items for a project (sorted alphabetically)
  const getBOQItemsForProject = (projectFullCode: string): CommercialBOQItem[] => {
    return boqItems
      .filter(item => item.project_full_code === projectFullCode)
      .sort((a, b) => {
        const aDesc = (a.item_description || '').toLowerCase()
        const bDesc = (b.item_description || '').toLowerCase()
        return aDesc.localeCompare(bDesc)
      })
  }
  
  // Get sorted projects (alphabetically by full code, then name)
  const getSortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      const aCode = buildProjectFullCode(a).toLowerCase()
      const bCode = buildProjectFullCode(b).toLowerCase()
      const codeCompare = aCode.localeCompare(bCode)
      if (codeCompare !== 0) return codeCompare
      return (a.project_name || '').toLowerCase().localeCompare((b.project_name || '').toLowerCase())
    })
  }, [projects])
  
  if (loading && variations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <LoadingSpinner />
        <p className="text-gray-500 dark:text-gray-400">Loading variations...</p>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card className="pt-4">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Variations</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{summaryStats.totalRecords}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="pt-4">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Variation Amount</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrencyByCodeSync(summaryStats.totalVariationAmount, 'AED')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="pt-4">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Approved</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {summaryStats.statusCounts['Approved']}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="pt-4">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <FileEdit className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {summaryStats.statusCounts['Pending']}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="pt-4">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                <FileText className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Var Notice Sent</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {summaryStats.statusCounts['Var Notice Sent']}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="pt-4">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-100 dark:bg-teal-900/20 rounded-lg">
                <CheckSquare className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Submitted</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {summaryStats.statusCounts['Submitted']}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Alerts */}
      {success && (
        <Alert variant="success">
          {success}
        </Alert>
      )}
      {error && (
        <Alert variant="error">
          {error}
        </Alert>
      )}
      
      {/* Main Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Contract Variations</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsSelectMode(!isSelectMode)
                  if (isSelectMode) setSelectedIds(new Set())
                }}
              >
                {isSelectMode ? <XCircle className="h-4 w-4 mr-2" /> : <CheckSquare className="h-4 w-4 mr-2" />}
                {isSelectMode ? 'Cancel Select' : 'Select'}
              </Button>
              {selectedIds.size > 0 && (
                <>
                  <PermissionButton
                    permission="commercial.variations.edit"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBulkEditModal(true)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Bulk Edit ({selectedIds.size})
                  </PermissionButton>
                  <PermissionButton
                    permission="commercial.variations.delete"
                    variant="outline"
                    size="sm"
                    onClick={handleBulkDelete}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete ({selectedIds.size})
                  </PermissionButton>
                </>
              )}
              <PermissionButton
                permission="commercial.variations.create"
                onClick={() => setShowAddForm(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Variation
              </PermissionButton>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Filters */}
          {showFilters && (
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Filters</h3>
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              </div>
              
              {/* Search */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Search
                </label>
                <Input
                  type="text"
                  placeholder="Search across all fields..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-full"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Project Filter */}
                <div className="relative">
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                    Project
                  </label>
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Search projects..."
                      value={projectSearch}
                      onChange={(e) => setProjectSearch(e.target.value)}
                      onFocus={() => setShowProjectDropdown(true)}
                      onBlur={() => setTimeout(() => setShowProjectDropdown(false), 200)}
                      className="w-full"
                    />
                    {showProjectDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
                        {uniqueValues.projects
                          .filter(p => 
                            !projectSearch || 
                            p.display.toLowerCase().includes(projectSearch.toLowerCase()) ||
                            p.code.toLowerCase().includes(projectSearch.toLowerCase()) ||
                            p.name.toLowerCase().includes(projectSearch.toLowerCase())
                          )
                          .map(project => (
                            <label key={project.key} className="flex items-center px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={filters.project.has(project.key)}
                                onChange={() => toggleFilter('project', project.key)}
                                className="mr-2"
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">{project.display}</span>
                            </label>
                          ))}
                      </div>
                    )}
                  </div>
                  {filters.project.size > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {Array.from(filters.project).map(key => {
                        const project = uniqueValues.projects.find(p => p.key === key)
                        return project ? (
                          <span key={key} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-md text-sm">
                            {project.display}
                            <button
                              type="button"
                              onClick={() => toggleFilter('project', key)}
                              className="hover:text-blue-600 dark:hover:text-blue-400"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ) : null
                      })}
                    </div>
                  )}
                </div>
                
                {/* Status Filter */}
                <div className="relative">
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                    Status
                  </label>
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Search status..."
                      value={statusSearch}
                      onChange={(e) => setStatusSearch(e.target.value)}
                      onFocus={() => setShowStatusDropdown(true)}
                      onBlur={() => setTimeout(() => setShowStatusDropdown(false), 200)}
                      className="w-full"
                    />
                    {showStatusDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
                        {(['Pending', 'Var Notice Sent', 'Submitted', 'Approved', 'Rejected', 'Internal Variation'] as VariationStatus[])
                          .sort((a, b) => a.localeCompare(b))
                          .filter(status => 
                            !statusSearch || 
                            status.toLowerCase().includes(statusSearch.toLowerCase())
                          )
                          .map(status => (
                            <label key={status} className="flex items-center px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={filters.status.has(status)}
                                onChange={() => toggleFilter('status', status)}
                                className="mr-2"
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">{status}</span>
                            </label>
                          ))}
                      </div>
                    )}
                  </div>
                  {filters.status.size > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {Array.from(filters.status).map(status => (
                        <span key={status} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-md text-sm">
                          {status}
                          <button
                            type="button"
                            onClick={() => toggleFilter('status', status)}
                            className="hover:text-blue-600 dark:hover:text-blue-400"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Variation Amount Range */}
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                    Variation Amount Range
                  </label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={filters.variationAmountRange.min !== undefined ? filters.variationAmountRange.min : ''}
                        onChange={(e) => setFilters({
                          ...filters,
                          variationAmountRange: {
                            ...filters.variationAmountRange,
                            min: e.target.value ? parseFloat(e.target.value) : undefined
                          }
                        })}
                        className="flex-1"
                        min={variationAmountRange.min}
                        max={variationAmountRange.max}
                        step="0.01"
                      />
                      <span className="text-gray-500">-</span>
                      <Input
                        type="number"
                        placeholder="Max"
                        value={filters.variationAmountRange.max !== undefined ? filters.variationAmountRange.max : ''}
                        onChange={(e) => setFilters({
                          ...filters,
                          variationAmountRange: {
                            ...filters.variationAmountRange,
                            max: e.target.value ? parseFloat(e.target.value) : undefined
                          }
                        })}
                        className="flex-1"
                        min={variationAmountRange.min}
                        max={variationAmountRange.max}
                        step="0.01"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={variationAmountRange.min}
                        max={variationAmountRange.max}
                        value={filters.variationAmountRange.min !== undefined ? filters.variationAmountRange.min : variationAmountRange.min}
                        onChange={(e) => setFilters({
                          ...filters,
                          variationAmountRange: {
                            ...filters.variationAmountRange,
                            min: parseFloat(e.target.value)
                          }
                        })}
                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                        step={Math.max(0.01, (variationAmountRange.max - variationAmountRange.min) / 100)}
                      />
                      <input
                        type="range"
                        min={variationAmountRange.min}
                        max={variationAmountRange.max}
                        value={filters.variationAmountRange.max !== undefined ? filters.variationAmountRange.max : variationAmountRange.max}
                        onChange={(e) => setFilters({
                          ...filters,
                          variationAmountRange: {
                            ...filters.variationAmountRange,
                            max: parseFloat(e.target.value)
                          }
                        })}
                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                        step={Math.max(0.01, (variationAmountRange.max - variationAmountRange.min) / 100)}
                      />
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex justify-between">
                      <span>{formatCurrencyByCodeSync(variationAmountRange.min, 'AED')}</span>
                      <span>{formatCurrencyByCodeSync(variationAmountRange.max, 'AED')}</span>
                    </div>
                  </div>
                </div>
                
                {/* Date of Submission Range */}
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                    Date of Submission
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={filters.dateSubmissionRange.min || ''}
                      onChange={(e) => setFilters({
                        ...filters,
                        dateSubmissionRange: {
                          ...filters.dateSubmissionRange,
                          min: e.target.value || undefined
                        }
                      })}
                      className="flex-1"
                    />
                    <span className="text-gray-500">to</span>
                    <Input
                      type="date"
                      value={filters.dateSubmissionRange.max || ''}
                      onChange={(e) => setFilters({
                        ...filters,
                        dateSubmissionRange: {
                          ...filters.dateSubmissionRange,
                          max: e.target.value || undefined
                        }
                      })}
                      className="flex-1"
                    />
                  </div>
                </div>
                
                {/* Date of Approval Range */}
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                    Date of Approval
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={filters.dateApprovalRange.min || ''}
                      onChange={(e) => setFilters({
                        ...filters,
                        dateApprovalRange: {
                          ...filters.dateApprovalRange,
                          min: e.target.value || undefined
                        }
                      })}
                      className="flex-1"
                    />
                    <span className="text-gray-500">to</span>
                    <Input
                      type="date"
                      value={filters.dateApprovalRange.max || ''}
                      onChange={(e) => setFilters({
                        ...filters,
                        dateApprovalRange: {
                          ...filters.dateApprovalRange,
                          max: e.target.value || undefined
                        }
                      })}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Table */}
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-400px)] border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
            {/* Add New Row Button */}
            {!isAddingNew && (
              <div className="p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <PermissionButton
                  permission="commercial.variations.create"
                  variant="outline"
                  size="sm"
                  onClick={handleAddNewRow}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Variation Row
                </PermissionButton>
              </div>
            )}
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-750 sticky top-0 z-10 shadow-sm">
                <tr>
                  {isSelectMode && (
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={paginatedVariations.length > 0 && paginatedVariations.every(v => selectedIds.has(v.id))}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                      />
                    </th>
                  )}
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => handleSort('auto_generated_unique_reference_number')}
                  >
                    Reference Number {sortColumn === 'auto_generated_unique_reference_number' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => handleSort('project_full_code')}
                  >
                    Project {sortColumn === 'project_full_code' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Variation Ref No.
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    BOQ Item
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => handleSort('quantity_changes')}
                  >
                    Quantity Changes {sortColumn === 'quantity_changes' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => handleSort('variation_amount')}
                  >
                    Variation Amount {sortColumn === 'variation_amount' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => handleSort('date_of_submission')}
                  >
                    Date of Submission {sortColumn === 'date_of_submission' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => handleSort('variation_status')}
                  >
                    Status {sortColumn === 'variation_status' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => handleSort('date_of_approval')}
                  >
                    Date of Approval {sortColumn === 'date_of_approval' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Remarks
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {/* Add New Row */}
                {isAddingNew && (
                  <tr className="bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30">
                    {isSelectMode && (
                      <td className="px-4 py-4 whitespace-nowrap"></td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 italic">
                      (New)
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      <select
                        value={newVariationData.project_full_code || ''}
                        onChange={(e) => {
                          const selectedSubCode = e.target.value
                          const matchingProject = projects.find((project) => {
                            const projectSubCode = (project.project_sub_code || '').toString().trim()
                            return projectSubCode === selectedSubCode
                          })
                          
                          setNewVariationData({
                            ...newVariationData,
                            project_full_code: selectedSubCode,
                            project_name: matchingProject?.project_name || ''
                          })
                        }}
                        className="w-full px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                      >
                        <option value="">Select Project...</option>
                        {getSortedProjects.map((project) => {
                          const fullCode = buildProjectFullCode(project)
                          return (
                            <option key={project.id} value={project.project_sub_code || fullCode}>
                              {fullCode} - {project.project_name}
                            </option>
                          )
                        })}
                      </select>
                      {newVariationData.project_name && (
                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {newVariationData.project_name}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      <Input
                        value={newVariationData.variation_ref_no || ''}
                        onChange={(e) => setNewVariationData({ ...newVariationData, variation_ref_no: e.target.value })}
                        className="w-full"
                        placeholder="Variation Ref No."
                      />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                      <div className="space-y-2">
                        {(() => {
                          const projectBOQItems = getBOQItemsForProject(newVariationData.project_full_code || '')
                          return (
                            <>
                              <select
                                value={newVariationData.item_description || ''}
                                onChange={(e) => {
                                  setNewVariationData({ ...newVariationData, item_description: e.target.value })
                                }}
                                className="w-full px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                                disabled={!newVariationData.project_full_code}
                              >
                                <option value="">Select BOQ Item...</option>
                                {projectBOQItems.sort((a, b) => {
                                  const aDesc = (a.item_description || '').toLowerCase()
                                  const bDesc = (b.item_description || '').toLowerCase()
                                  return aDesc.localeCompare(bDesc)
                                }).map(item => (
                                  <option key={item.id} value={item.id}>
                                    {item.item_description} ({item.auto_generated_unique_reference_number})
                                  </option>
                                ))}
                              </select>
                              {newVariationData.project_full_code && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setShowAddBOQFormInline(true)}
                                  className="mt-2 w-full"
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  Add New BOQ Item for This Project
                                </Button>
                              )}
                            </>
                          )
                        })()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      <Input
                        type="number"
                        step="0.01"
                        value={newVariationData.quantity_changes !== undefined && newVariationData.quantity_changes !== null ? newVariationData.quantity_changes : ''}
                        onChange={(e) => {
                          const value = e.target.value === '' ? undefined : parseFloat(e.target.value)
                          setNewVariationData({ ...newVariationData, quantity_changes: isNaN(value as number) ? undefined : value })
                        }}
                        className="w-full"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      <Input
                        type="number"
                        step="0.01"
                        value={newVariationData.variation_amount !== undefined && newVariationData.variation_amount !== null ? newVariationData.variation_amount : ''}
                        onChange={(e) => {
                          const value = e.target.value === '' ? undefined : parseFloat(e.target.value)
                          setNewVariationData({ ...newVariationData, variation_amount: isNaN(value as number) ? undefined : value })
                        }}
                        className="w-full"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      <Input
                        type="date"
                        value={newVariationData.date_of_submission || ''}
                        onChange={(e) => setNewVariationData({ ...newVariationData, date_of_submission: e.target.value || undefined })}
                        className="w-full"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      <select
                        value={newVariationData.variation_status || 'Pending'}
                        onChange={(e) => setNewVariationData({ ...newVariationData, variation_status: e.target.value as VariationStatus })}
                        className="w-full px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                      >
                        {(['Pending', 'Var Notice Sent', 'Submitted', 'Approved', 'Rejected', 'Internal Variation'] as VariationStatus[])
                          .sort((a, b) => a.localeCompare(b))
                          .map(status => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      <Input
                        type="date"
                        value={newVariationData.date_of_approval || ''}
                        onChange={(e) => setNewVariationData({ ...newVariationData, date_of_approval: e.target.value || undefined })}
                        className="w-full"
                      />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                      <Input
                        value={newVariationData.remarks || ''}
                        onChange={(e) => setNewVariationData({ ...newVariationData, remarks: e.target.value })}
                        className="w-full"
                        placeholder="Remarks..."
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSaveNew}
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCancelAddNew}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )}
                {paginatedVariations.length === 0 && !isAddingNew ? (
                  <tr>
                    <td colSpan={isSelectMode ? 13 : 12} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      No variations found
                    </td>
                  </tr>
                ) : (
                  paginatedVariations.map((variation) => {
                    const isEditing = editingId === variation.id
                    const isSelected = selectedIds.has(variation.id)
                    const projectBOQItems = getBOQItemsForProject(variation.project_full_code)
                    
                    return (
                      <tr key={variation.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        {isSelectMode && (
                          <td className="px-4 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => handleSelectOne(variation.id, e.target.checked)}
                              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                            />
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{variation.auto_generated_unique_reference_number}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {isEditing ? (
                            <select
                              value={editingData.project_full_code || ''}
                              onChange={(e) => {
                                const selectedSubCode = e.target.value
                                const matchingProject = projects.find((project) => {
                                  const projectSubCode = (project.project_sub_code || '').toString().trim()
                                  return projectSubCode === selectedSubCode
                                })
                                
                                setEditingData({
                                  ...editingData,
                                  project_full_code: selectedSubCode,
                                  project_name: matchingProject?.project_name || editingData.project_name || ''
                                })
                              }}
                              className="w-full px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                            >
                              <option value="">Select Project...</option>
                              {projects.map((project) => {
                                const fullCode = buildProjectFullCode(project)
                                return (
                                  <option key={project.id} value={project.project_sub_code || fullCode}>
                                    {fullCode} - {project.project_name}
                                  </option>
                                )
                              })}
                            </select>
                          ) : (
                            <div>
                              <div className="font-medium">{variation.project_full_code}</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">{variation.project_name}</div>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {isEditing ? (
                            <Input
                              value={editingData.variation_ref_no || ''}
                              onChange={(e) => setEditingData({ ...editingData, variation_ref_no: e.target.value })}
                              className="w-full"
                            />
                          ) : (
                            variation.variation_ref_no || '-'
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                          {isEditing ? (
                            <select
                              value={editingData.item_description || ''}
                              onChange={(e) => {
                                setEditingData({ ...editingData, item_description: e.target.value })
                              }}
                              className="w-full px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                            >
                              <option value="">Select BOQ Item...</option>
                              {projectBOQItems.sort((a, b) => {
                                const aDesc = (a.item_description || '').toLowerCase()
                                const bDesc = (b.item_description || '').toLowerCase()
                                return aDesc.localeCompare(bDesc)
                              }).map(item => (
                                <option key={item.id} value={item.id}>
                                  {item.item_description} ({item.auto_generated_unique_reference_number})
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="text-sm">
                              {variation.item_description ? (
                                getBOQItemDescription(variation.item_description)
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {isEditing ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={editingData.quantity_changes !== undefined && editingData.quantity_changes !== null ? editingData.quantity_changes : ''}
                              onChange={(e) => {
                                const value = e.target.value === '' ? undefined : parseFloat(e.target.value)
                                setEditingData({ ...editingData, quantity_changes: isNaN(value as number) ? undefined : value })
                              }}
                              className="w-full"
                            />
                          ) : (
                            variation.quantity_changes.toFixed(2)
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {isEditing ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={editingData.variation_amount !== undefined && editingData.variation_amount !== null ? editingData.variation_amount : ''}
                              onChange={(e) => {
                                const value = e.target.value === '' ? undefined : parseFloat(e.target.value)
                                setEditingData({ ...editingData, variation_amount: isNaN(value as number) ? undefined : value })
                              }}
                              className="w-full"
                            />
                          ) : (
                            formatCurrencyByCodeSync(variation.variation_amount, 'AED')
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {isEditing ? (
                            <Input
                              type="date"
                              value={editingData.date_of_submission || ''}
                              onChange={(e) => setEditingData({ ...editingData, date_of_submission: e.target.value || undefined })}
                              className="w-full"
                            />
                          ) : (
                            formatDate(variation.date_of_submission)
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {isEditing ? (
                            <select
                              value={editingData.variation_status || 'Pending'}
                              onChange={(e) => setEditingData({ ...editingData, variation_status: e.target.value as VariationStatus })}
                              className="w-full px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                            >
                              {(['Pending', 'Var Notice Sent', 'Submitted', 'Approved', 'Rejected', 'Internal Variation'] as VariationStatus[])
                                .sort((a, b) => a.localeCompare(b))
                                .map(status => (
                                  <option key={status} value={status}>{status}</option>
                                ))}
                            </select>
                          ) : (
                            <span className={`px-2 py-1 rounded text-xs ${
                              variation.variation_status === 'Approved' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' :
                              variation.variation_status === 'Rejected' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200' :
                              variation.variation_status === 'Pending' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200' :
                              'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                            }`}>
                              {variation.variation_status}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {isEditing ? (
                            <Input
                              type="date"
                              value={editingData.date_of_approval || ''}
                              onChange={(e) => setEditingData({ ...editingData, date_of_approval: e.target.value || undefined })}
                              className="w-full"
                            />
                          ) : (
                            formatDate(variation.date_of_approval)
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                          {isEditing ? (
                            <Input
                              value={editingData.remarks || ''}
                              onChange={(e) => setEditingData({ ...editingData, remarks: e.target.value })}
                              className="w-full"
                              placeholder="Remarks..."
                            />
                          ) : (
                            <span className="text-sm">{variation.remarks || '-'}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSave(variation.id)}
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingId(null)
                                  setEditingData({})
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <PermissionButton
                                permission="commercial.variations.edit"
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(variation)}
                              >
                                <Edit className="h-4 w-4" />
                              </PermissionButton>
                              <PermissionButton
                                permission="commercial.variations.delete"
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(variation.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </PermissionButton>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredVariations.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Bulk Edit Modal */}
      {showBulkEditModal && (
        <BulkEditVariationsModal
          selectedVariations={variations.filter(v => selectedIds.has(v.id))}
          onUpdate={handleBulkUpdate}
          onCancel={() => setShowBulkEditModal(false)}
          isOpen={showBulkEditModal}
        />
      )}
      
      {/* Add Variation Form */}
      {showAddForm && (
        <AddVariationForm
          projects={projects}
          boqItems={boqItems}
          onSave={async () => {
            setShowAddForm(false)
            await fetchVariations()
            // Update BOQ items Variations field
            await updateBOQItemsVariations()
          }}
          onCancel={() => setShowAddForm(false)}
          isOpen={showAddForm}
          onBOQItemsRefresh={async () => {
            await fetchBOQItems()
          }}
        />
      )}
      
      {/* Simplified BOQ Item Form for inline row creation */}
      {showAddBOQFormInline && newVariationData.project_full_code && newVariationData.project_name && (
        <AddBOQItemFormSimplified
          projectFullCode={newVariationData.project_full_code}
          projectName={newVariationData.project_name}
          onSave={async (newItemId: string) => {
            // Refresh BOQ items list
            await fetchBOQItems()
            
            // Close the BOQ form
            setShowAddBOQFormInline(false)
            
            // Auto-select the new item
            setNewVariationData({ ...newVariationData, item_description: newItemId })
          }}
          onCancel={() => setShowAddBOQFormInline(false)}
          isOpen={showAddBOQFormInline}
        />
      )}
    </div>
  )
}

