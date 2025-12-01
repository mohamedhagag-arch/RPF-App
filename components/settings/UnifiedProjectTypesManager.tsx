'use client'

import { useState, useEffect } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { getSupabaseClient, executeQuery } from '@/lib/simpleConnectionManager'
import { getDivisionNames } from '@/lib/divisionsManager'
import { ModernCard } from '@/components/ui/ModernCard'
import { ModernButton } from '@/components/ui/ModernButton'
import { ModernBadge } from '@/components/ui/ModernBadge'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import {
  FolderTree,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Search,
  ChevronDown,
  ChevronRight,
  Activity,
  Settings,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Copy,
  ArrowUpDown,
  BarChart3,
  List,
  Download,
  Upload,
  FileText,
  Archive,
  FileSpreadsheet,
  Table,
  MoreVertical,
  Trash,
  AlertTriangle,
  Loader2
} from 'lucide-react'

interface ProjectScope {
  id: string
  name: string
  code?: string
  description?: string
  is_active: boolean
  usage_count: number
  created_at?: string
  updated_at?: string
}

interface ProjectActivity {
  id: string
  project_type: string
  activity_name: string
  activity_name_ar?: string
  description?: string
  default_unit?: string
  estimated_rate?: number
  category?: string
  typical_duration?: number
  division?: string
  usage_count: number
  is_active: boolean
  is_default: boolean
  display_order: number
  created_at?: string
  updated_at?: string
}

interface ImportActivityData {
  project_type: string
  activity_name: string
  activity_name_ar?: string
  description?: string
  default_unit: string
  estimated_rate: number
  category: string
  typical_duration: number
  division: string
  display_order: number
  is_active: boolean
}

interface Unit {
  id: string
  name: string
  code?: string
  description?: string
  is_active: boolean
  usage_count: number
  created_at?: string
  updated_at?: string
}

export function UnifiedProjectTypesManager() {
  const guard = usePermissionGuard()
  const supabase = getSupabaseClient()
  
  // State
  const [projectScopes, setProjectScopes] = useState<ProjectScope[]>([])
  const [activities, setActivities] = useState<Record<string, ProjectActivity[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [activitySearchTerm, setActivitySearchTerm] = useState('')
  
  // UI State
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set())
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [showScopeForm, setShowScopeForm] = useState(false)
  const [showActivityForm, setShowActivityForm] = useState(false)
  const [editingScope, setEditingScope] = useState<ProjectScope | null>(null)
  const [editingActivity, setEditingActivity] = useState<ProjectActivity | null>(null)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showImportMenu, setShowImportMenu] = useState(false)
  
  // Units and Divisions for dropdowns
  const [availableUnits, setAvailableUnits] = useState<string[]>([])
  const [availableDivisions, setAvailableDivisions] = useState<string[]>([])
  const [showCreateUnitModal, setShowCreateUnitModal] = useState(false)
  const [newUnitName, setNewUnitName] = useState('')
  const [newUnitCode, setNewUnitCode] = useState('')
  const [newUnitDescription, setNewUnitDescription] = useState('')
  
  // Units Management State
  const [activeTab, setActiveTab] = useState<'project-types' | 'units'>('project-types')
  const [units, setUnits] = useState<Unit[]>([])
  const [unitSearchTerm, setUnitSearchTerm] = useState('')
  const [showUnitForm, setShowUnitForm] = useState(false)
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null)
  const [selectedUnits, setSelectedUnits] = useState<Set<string>>(new Set())
  const [unitFormData, setUnitFormData] = useState({
    name: '',
    code: '',
    description: ''
  })
  
  // Form State - Project Scope
  const [scopeFormData, setScopeFormData] = useState({
    name: '',
    code: '',
    description: ''
  })
  
  // Form State - Activity
  const [activityFormData, setActivityFormData] = useState({
    project_type: '',
    activity_name: '',
    activity_name_ar: '',
    description: '',
    default_unit: '',
    estimated_rate: '',
    category: '',
    typical_duration: '',
    division: '',
    display_order: '0'
  })

  // Load Data
  useEffect(() => {
    loadData()
  }, [])
  
  // Load Divisions for dropdown
  useEffect(() => {
    const loadDivisions = async () => {
      try {
        const divisions = await getDivisionNames()
        setAvailableDivisions(divisions)
      } catch (error) {
        console.error('Error loading divisions:', error)
        // Fallback to default divisions
        setAvailableDivisions(['Enabling Division', 'Soil Improvement Division', 'Infrastructure Division', 'Marine Division'])
      }
    }
    loadDivisions()
  }, [])

  // Load Units from database
  useEffect(() => {
    const loadUnits = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('units')
          .select('name')
          .eq('is_active', true)
          .order('name', { ascending: true })
        
        if (error) throw error
        
        if (data && data.length > 0) {
          setAvailableUnits(data.map((u: any) => u.name))
        } else {
          // Fallback to default units if database is empty
          setAvailableUnits([
            'No.', 'Meter', 'Running Meter', 'Square Meter', 'Cubic Meter', 
            'm²', 'm³', 'Lump Sum', 'Ton', 'Kilogram', 'Day', 'Week', 'Month', 'Set', 'Linear Meter'
          ])
        }
      } catch (error) {
        console.error('Error loading units:', error)
        // Fallback to default units
        setAvailableUnits([
          'No.', 'Meter', 'Running Meter', 'Square Meter', 'Cubic Meter', 
          'm²', 'm³', 'Lump Sum', 'Ton', 'Kilogram', 'Day', 'Week', 'Month', 'Set', 'Linear Meter'
        ])
      }
    }
    loadUnits()
  }, [supabase, showCreateUnitModal]) // Reload when modal closes

  // Load all units for management
  useEffect(() => {
    if (activeTab === 'units') {
      loadUnitsData()
    }
  }, [activeTab])

  const loadUnitsData = async () => {
    try {
      setLoading(true)
      const { data, error } = await (supabase as any)
        .from('units')
        .select('*')
        .order('name', { ascending: true })
      
      if (error) throw error
      setUnits(data || [])
    } catch (err: any) {
      setError('Failed to load units: ' + err.message)
      console.error('Error loading units:', err)
    } finally {
      setLoading(false)
    }
  }

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.dropdown-menu')) {
        setShowExportMenu(false)
        setShowImportMenu(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowExportMenu(false)
        setShowImportMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')
      
      // Load project types
      const { data: typesData, error: typesError } = await executeQuery(async () =>
        supabase
          .from('project_types')
          .select('*')
          .order('name', { ascending: true })
      )
      
      if (typesError) throw typesError
      setProjectScopes(typesData || [])
      
      // Load all activities
      const { data: activitiesData, error: activitiesError } = await executeQuery(async () =>
        supabase
          .from('project_type_activities')
          .select('*')
          .order('display_order', { ascending: true })
      )
      
      if (activitiesError) throw activitiesError
      
      // Group activities by project type
      const groupedActivities: Record<string, ProjectActivity[]> = {}
      activitiesData?.forEach((activity: any) => {
        if (!groupedActivities[activity.project_type]) {
          groupedActivities[activity.project_type] = []
        }
        groupedActivities[activity.project_type].push(activity)
      })
      
      setActivities(groupedActivities)
      
    } catch (err: any) {
      setError('Failed to load data: ' + err.message)
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Project Scope Functions
  const handleAddScope = () => {
    setEditingScope(null)
    setScopeFormData({ name: '', code: '', description: '' })
    setShowScopeForm(true)
    setShowActivityForm(false)
  }

  const handleEditScope = (scope: ProjectScope) => {
    setEditingScope(scope)
    setScopeFormData({
      name: scope.name,
      code: scope.code || '',
      description: scope.description || ''
    })
    setShowScopeForm(true)
    setShowActivityForm(false)
  }

  const handleSaveScope = async () => {
    try {
      setLoading(true)
      setError('')
      
      if (!scopeFormData.name.trim()) {
        setError('Project scope name is required')
        return
      }
      
      if (editingScope) {
        // Update
        const { error } = await executeQuery(async () =>
          (supabase as any)
            .from('project_types')
            .update({
              name: scopeFormData.name.trim(),
              code: scopeFormData.code.trim(),
              description: scopeFormData.description.trim(),
              updated_at: new Date().toISOString()
            })
            .eq('id', editingScope.id)
        )
        
        if (error) throw error
        setSuccess('Project scope updated successfully')
      } else {
        // Create
        const { error } = await executeQuery(async () =>
          (supabase as any)
            .from('project_types')
            .insert({
              name: scopeFormData.name.trim(),
              code: scopeFormData.code.trim(),
              description: scopeFormData.description.trim(),
              is_active: true,
              usage_count: 0
            })
        )
        
        if (error) throw error
        setSuccess('Project scope added successfully')
      }
      
      setShowScopeForm(false)
      await loadData()
      
    } catch (err: any) {
      setError(err.message || 'Failed to save project scope')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteScope = async (scope: ProjectScope) => {
    if (!confirm(`Are you sure you want to delete "${scope.name}"? This will ${scope.usage_count > 0 ? 'disable' : 'delete'} the scope.`)) {
      return
    }
    
    try {
      setLoading(true)
      setError('')
      
      // Use safe delete function
      const { data, error } = await executeQuery(async () =>
        (supabase as any).rpc('safe_delete_project_type', {
          p_project_type_name: scope.name
        })
      )
      
      if (error) throw error
      
      if ((data as any)?.action === 'disabled') {
        setSuccess(`Disabled "${scope.name}" and ${(data as any).activities_affected} activities`)
      } else {
        setSuccess(`Deleted "${scope.name}"`)
      }
      
      await loadData()
      
    } catch (err: any) {
      setError(err.message || 'Failed to delete project type')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleScopeActive = async (scope: ProjectScope) => {
    try {
      setLoading(true)
      setError('')
      
      if (!scope.is_active) {
        // Re-enable
        const { error } = await executeQuery(async () =>
          (supabase as any).rpc('enable_project_type', {
            p_project_type_name: scope.name
          })
        )
        
        if (error) throw error
        setSuccess(`Re-enabled "${scope.name}"`)
      } else {
        // Disable
        const { error } = await executeQuery(async () =>
          (supabase as any)
            .from('project_types')
            .update({
              is_active: false,
              updated_at: new Date().toISOString()
            })
            .eq('id', scope.id)
        )
        
        if (error) throw error
        setSuccess(`Disabled "${scope.name}"`)
      }
      
      await loadData()
      
    } catch (err: any) {
      setError(err.message || 'Failed to toggle project scope')
    } finally {
      setLoading(false)
    }
  }

  // Activity Functions
  const handleAddActivity = (projectScope: string) => {
    setEditingActivity(null)
    setActivityFormData({
      project_type: projectScope,
      activity_name: '',
      activity_name_ar: '',
      description: '',
      default_unit: '',
      estimated_rate: '',
      category: '',
      typical_duration: '',
      division: '',
      display_order: '0'
    })
    setSelectedType(projectScope)
    setShowActivityForm(true)
    setShowScopeForm(false)
  }

  const handleEditActivity = (activity: ProjectActivity) => {
    setEditingActivity(activity)
    setActivityFormData({
      project_type: activity.project_type,
      activity_name: activity.activity_name,
      activity_name_ar: activity.activity_name_ar || '',
      description: activity.description || '',
      default_unit: activity.default_unit || '',
      estimated_rate: activity.estimated_rate?.toString() || '',
      category: activity.category || '',
      typical_duration: activity.typical_duration?.toString() || '',
      division: activity.division || '',
      display_order: activity.display_order?.toString() || '0'
    })
    setSelectedType(activity.project_type)
    setShowActivityForm(true)
    setShowScopeForm(false)
  }

  const handleSaveActivity = async () => {
    try {
      setLoading(true)
      setError('')
      
      if (!activityFormData.activity_name.trim()) {
        setError('Activity name is required')
        return
      }
      
      const activityData = {
        project_type: activityFormData.project_type,
        activity_name: activityFormData.activity_name.trim(),
        activity_name_ar: activityFormData.activity_name_ar.trim() || null,
        description: activityFormData.description.trim() || null,
        default_unit: activityFormData.default_unit.trim() || null,
        estimated_rate: activityFormData.estimated_rate ? parseFloat(activityFormData.estimated_rate) : null,
        category: activityFormData.category.trim() || null,
        typical_duration: activityFormData.typical_duration ? parseInt(activityFormData.typical_duration) : null,
        division: activityFormData.division.trim() || null,
        display_order: parseInt(activityFormData.display_order) || 0,
        is_active: true,
        updated_at: new Date().toISOString()
      }
      
      if (editingActivity) {
        // Update
        const { error } = await executeQuery(async () =>
          (supabase as any)
            .from('project_type_activities')
            .update(activityData)
            .eq('id', editingActivity.id)
        )
        
        if (error) throw error
        setSuccess('Activity updated successfully')
      } else {
        // Create
        const { error } = await executeQuery(async () =>
          (supabase as any)
            .from('project_type_activities')
            .insert({
              ...activityData,
              is_default: false,
              usage_count: 0
            })
        )
        
        if (error) throw error
        setSuccess('Activity added successfully')
      }
      
      setShowActivityForm(false)
      await loadData()
      
    } catch (err: any) {
      setError(err.message || 'Failed to save activity')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteActivity = async (activity: ProjectActivity) => {
    if (!confirm(`Are you sure you want to delete "${activity.activity_name}"?`)) {
      return
    }
    
    try {
      setLoading(true)
      setError('')
      
      const { error } = await executeQuery(async () =>
        supabase
          .from('project_type_activities')
          .delete()
          .eq('id', activity.id)
      )
      
      if (error) throw error
      setSuccess('Activity deleted successfully')
      await loadData()
      
    } catch (err: any) {
      setError(err.message || 'Failed to delete activity')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActivityActive = async (activity: ProjectActivity) => {
    try {
      setLoading(true)
      setError('')
      
      const { error } = await executeQuery(async () =>
        (supabase as any)
          .from('project_type_activities')
          .update({
            is_active: !activity.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', activity.id)
      )
      
      if (error) throw error
      setSuccess(`Activity ${!activity.is_active ? 'enabled' : 'disabled'}`)
      await loadData()
      
    } catch (err: any) {
      setError(err.message || 'Failed to toggle activity')
    } finally {
      setLoading(false)
    }
  }

  // Template Management Functions
  const handleExportTemplate = async () => {
    try {
      setLoading(true)
      setError('')
      
      // Prepare template data
      const templateData = {
        project_types: projectScopes.map(scope => ({
          name: scope.name,
          code: scope.code,
          description: scope.description,
          is_active: scope.is_active
        })),
        activities: Object.values(activities).flat().map(activity => ({
          project_type: activity.project_type,
          activity_name: activity.activity_name,
          activity_name_ar: activity.activity_name_ar,
          description: activity.description,
          default_unit: activity.default_unit,
          estimated_rate: activity.estimated_rate,
          category: activity.category,
          typical_duration: activity.typical_duration,
          division: activity.division,
          display_order: activity.display_order,
          is_active: activity.is_active
        })),
        metadata: {
          exported_at: new Date().toISOString(),
          version: '1.0',
          total_types: projectScopes.length,
          total_activities: Object.values(activities).flat().length
        }
      }
      
      // Create and download file
      const dataStr = JSON.stringify(templateData, null, 2)
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
      
      const exportFileDefaultName = `project-types-template-${new Date().toISOString().split('T')[0]}.json`
      
      const linkElement = document.createElement('a')
      linkElement.setAttribute('href', dataUri)
      linkElement.setAttribute('download', exportFileDefaultName)
      linkElement.click()
      
      setSuccess('Template exported successfully')
      setTimeout(() => setSuccess(''), 3000)
      
    } catch (err: any) {
      setError(err.message || 'Failed to export template')
    } finally {
      setLoading(false)
    }
  }

  const handleImportTemplate = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setLoading(true)
      setError('')
      
      const text = await file.text()
      const templateData = JSON.parse(text)

      if (!templateData.project_types || !templateData.activities) {
        throw new Error('Invalid template file format')
      }

      // Import project types
      if (templateData.project_types.length > 0) {
        const { error: typesError } = await executeQuery(async () =>
          (supabase as any)
            .from('project_types')
            .upsert(templateData.project_types, { onConflict: 'name' })
        )
        
        if (typesError) throw typesError
      }

      // Import activities
      if (templateData.activities.length > 0) {
        const { error: activitiesError } = await executeQuery(async () =>
          (supabase as any)
            .from('project_type_activities')
            .upsert(templateData.activities, { onConflict: 'project_type,activity_name' })
        )
        
        if (activitiesError) throw activitiesError
      }

      setSuccess(`Template imported successfully: ${templateData.project_types.length} types, ${templateData.activities.length} activities`)
      setTimeout(() => setSuccess(''), 5000)
      
      // Reload data
      await loadData()
      
    } catch (err: any) {
      setError('Failed to import template: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleExportSpecificScope = async (scope: ProjectScope) => {
    try {
      setLoading(true)
      setError('')
      
      const scopeActivities = activities[scope.name] || []
      
      // Create CSV content for Excel
      const headers = [
        'Project Scope',
        'Project Scope Code', 
        'Project Scope Description',
        'Activity Name',
        'Activity Name (Arabic)',
        'Activity Description',
        'Default Unit',
        'Estimated Rate',
        'Category',
        'Typical Duration (Days)',
        'Division',
        'Display Order',
        'Is Active'
      ]
      
      const rows = scopeActivities.map(activity => [
        scope.name,
        scope.code || '',
        scope.description || '',
        activity.activity_name,
        activity.activity_name_ar || '',
        activity.description || '',
        activity.default_unit,
        activity.estimated_rate,
        activity.category || '',
        activity.typical_duration || 0,
        activity.division || '',
        activity.display_order || 0,
        activity.is_active ? 'Yes' : 'No'
      ])
      
      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n')
      
      // Add BOM for UTF-8 support
      const bom = '\uFEFF'
      const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' })
      
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${scope.name.replace(/[^a-zA-Z0-9]/g, '_')}_activities.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      setSuccess(`Exported ${scopeActivities.length} activities for "${scope.name}" as CSV/Excel`)
      setTimeout(() => setSuccess(''), 3000)
      
    } catch (err: any) {
      setError(err.message || 'Failed to export template')
    } finally {
      setLoading(false)
    }
  }

  const handleImportToSpecificScope = async (event: React.ChangeEvent<HTMLInputElement>, projectScopeName: string) => {
    console.log('🔄 Import triggered for:', projectScopeName)
    const file = event.target.files?.[0]
    if (!file) {
      console.log('❌ No file selected')
      return
    }
    
    console.log('📁 File selected:', file.name, 'Size:', file.size)

    try {
      setLoading(true)
      setError('')
      
      const fileExtension = file.name.split('.').pop()?.toLowerCase()
      
      if (fileExtension === 'json') {
        // Handle JSON import
        const text = await file.text()
        const data = JSON.parse(text)
        
        if (data.project_type !== projectScopeName) {
          setError(`This template is for "${data.project_type}", not "${projectScopeName}"`)
          return
        }
        
        const activitiesData = data.activities.map((activity: any) => ({
          project_type: projectScopeName,
          activity_name: activity.activity_name,
          activity_name_ar: activity.activity_name_ar || '',
          description: activity.description || '',
          default_unit: activity.default_unit,
          estimated_rate: activity.estimated_rate || 0,
          category: activity.category || '',
          typical_duration: activity.typical_duration || 0,
          division: activity.division || '',
          display_order: activity.display_order || 0,
          is_active: activity.is_active !== false
        }))
        
        const { error } = await executeQuery(async () =>
          (supabase as any)
            .from('project_type_activities')
            .upsert(activitiesData, { onConflict: 'project_type,activity_name' })
        )
        
        if (error) throw error
        
        setSuccess(`Imported ${activitiesData.length} activities to "${projectScopeName}"`)
        
      } else if (['csv', 'xlsx', 'xls'].includes(fileExtension || '')) {
        // Handle CSV/Excel import
        const text = await file.text()
        const lines = text.split('\n').filter(line => line.trim())
        const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim())
        
        const activitiesData: any[] = []
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim())
          const row: any = {}
          
          headers.forEach((header, index) => {
            row[header] = values[index] || ''
          })
          
          if (row['Project Type'] === projectScopeName) {
            activitiesData.push({
              project_type: projectScopeName,
              activity_name: row['Activity Name'],
              activity_name_ar: row['Activity Name (Arabic)'] || '',
              description: row['Activity Description'] || '',
              default_unit: row['Default Unit'],
              estimated_rate: parseFloat(row['Estimated Rate']) || 0,
              category: row['Category'] || '',
              typical_duration: parseInt(row['Typical Duration (Days)']) || 0,
              division: row['Division'] || '',
              display_order: parseInt(row['Display Order']) || 0,
              is_active: row['Is Active']?.toLowerCase() === 'yes' || row['Is Active']?.toLowerCase() === 'true'
            })
          }
        }
        
        if (activitiesData.length === 0) {
          setError(`No activities found for "${projectScopeName}" in this file`)
          return
        }
        
        const { error } = await executeQuery(async () =>
          (supabase as any)
            .from('project_type_activities')
            .upsert(activitiesData, { onConflict: 'project_type,activity_name' })
        )
        
        if (error) throw error
        
        setSuccess(`Imported ${activitiesData.length} activities to "${projectScopeName}"`)
      } else {
        setError('Unsupported file format. Please use CSV, XLSX, XLS, or JSON files.')
        return
      }
      
      // Reload data
      await loadData()
      setTimeout(() => setSuccess(''), 5000)
      
    } catch (err: any) {
      setError('Failed to import activities: ' + err.message)
    } finally {
      setLoading(false)
      // Reset file input
      event.target.value = ''
    }
  }

  // Excel/CSV Export Functions
  const handleExportToExcel = async () => {
    try {
      setLoading(true)
      setError('')
      
      // Prepare data for Excel
      const allActivities = Object.values(activities).flat()
      
      // Create CSV content
      const csvContent = [
        // Headers
        [
          'Project Type',
          'Project Type Code',
          'Project Type Description',
          'Activity Name',
          'Activity Name (Arabic)',
          'Activity Description',
          'Default Unit',
          'Estimated Rate',
          'Category',
          'Typical Duration (Days)',
          'Division',
          'Display Order',
          'Is Active'
        ],
        // Data rows
        ...allActivities.map(activity => {
          const projectScope = projectScopes.find(pt => pt.name === activity.project_type)
          return [
            activity.project_type,
            projectScope?.code || '',
            projectScope?.description || '',
            activity.activity_name,
            activity.activity_name_ar || '',
            activity.description || '',
            activity.default_unit || '',
            activity.estimated_rate || '',
            activity.category || '',
            activity.typical_duration || '',
            activity.division || '',
            activity.display_order || '',
            activity.is_active ? 'Yes' : 'No'
          ]
        })
      ]
      
      // Convert to CSV string
      const csvString = csvContent.map(row => 
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ).join('\n')
      
      // Add BOM for UTF-8 support
      const BOM = '\uFEFF'
      const csvWithBOM = BOM + csvString
      
      // Create and download file
      const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      
      const exportFileDefaultName = `project-types-activities-${new Date().toISOString().split('T')[0]}.csv`
      
      const linkElement = document.createElement('a')
      linkElement.setAttribute('href', url)
      linkElement.setAttribute('download', exportFileDefaultName)
      linkElement.click()
      
      URL.revokeObjectURL(url)
      
      setSuccess('Excel/CSV template exported successfully')
      setTimeout(() => setSuccess(''), 3000)
      
    } catch (err: any) {
      setError(err.message || 'Failed to export Excel template')
    } finally {
      setLoading(false)
    }
  }

  const handleImportFromExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setLoading(true)
      setError('')
      
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      
      if (lines.length < 2) {
        throw new Error('CSV file must have at least a header row and one data row')
      }
      
      // Parse CSV
      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim())
      const dataRows = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.replace(/"/g, '').trim())
        const row: any = {}
        headers.forEach((header, index) => {
          row[header] = values[index] || ''
        })
        return row
      })
      
      // Validate headers
      const requiredHeaders = [
        'Project Type',
        'Activity Name',
        'Default Unit',
        'Estimated Rate',
        'Category',
        'Typical Duration (Days)',
        'Division',
        'Display Order',
        'Is Active'
      ]
      
      const missingHeaders = requiredHeaders.filter(header => !headers.includes(header))
      if (missingHeaders.length > 0) {
        throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`)
      }
      
      // Process data
      const projectTypesMap = new Map()
      const activitiesData: ImportActivityData[] = []
      
      // Remove duplicate rows from source data
      const uniqueRows = dataRows.filter((row, index, self) => 
        index === self.findIndex(r => 
          r['Project Type'] === row['Project Type'] && 
          r['Activity Name'] === row['Activity Name']
        )
      )
      
      console.log(`Processing ${uniqueRows.length} unique rows from ${dataRows.length} total rows`)
      
      uniqueRows.forEach(row => {
        const projectTypeName = row['Project Type']
        if (!projectTypesMap.has(projectTypeName)) {
          projectTypesMap.set(projectTypeName, {
            name: projectTypeName,
            code: row['Project Type Code'] || '',
            description: row['Project Type Description'] || '',
            is_active: true
          })
        }
        
        activitiesData.push({
          project_type: projectTypeName,
          activity_name: row['Activity Name'],
          activity_name_ar: row['Activity Name (Arabic)'] || '',
          description: row['Activity Description'] || '',
          default_unit: row['Default Unit'],
          estimated_rate: parseFloat(row['Estimated Rate']) || 0,
          category: row['Category'],
          typical_duration: parseInt(row['Typical Duration (Days)']) || 0,
          division: row['Division'],
          display_order: parseInt(row['Display Order']) || 0,
          is_active: row['Is Active']?.toLowerCase() === 'yes' || row['Is Active']?.toLowerCase() === 'true'
        })
      })
      
      // Import project types (remove duplicates first)
      const projectTypesArray = Array.from(projectTypesMap.values())
      if (projectTypesArray.length > 0) {
        // Remove duplicates based on name
        const uniqueProjectTypes = projectTypesArray.filter((type, index, self) => 
          index === self.findIndex(t => t.name === type.name)
        )
        
        const { error: typesError } = await executeQuery(async () =>
          (supabase as any)
            .from('project_types')
            .upsert(uniqueProjectTypes, { onConflict: 'name' })
        )
        
        if (typesError) throw typesError
      }
      
      // Import activities (remove duplicates first)
      if (activitiesData.length > 0) {
        // Remove duplicates based on project_type + activity_name
        const uniqueActivities = activitiesData.filter((activity, index, self) => 
          index === self.findIndex(a => 
            a.project_type === activity.project_type && 
            a.activity_name === activity.activity_name
          )
        )
        
        const { error: activitiesError } = await executeQuery(async () =>
          (supabase as any)
            .from('project_type_activities')
            .upsert(uniqueActivities, { onConflict: 'project_type,activity_name' })
        )
        
        if (activitiesError) throw activitiesError
      }
      
      setSuccess(`Excel/CSV template imported successfully: ${projectTypesArray.length} types, ${activitiesData.length} activities`)
      setTimeout(() => setSuccess(''), 5000)
      
      // Reload data
      await loadData()
      
    } catch (err: any) {
      console.error('Import error details:', err)
      setError(`Failed to import Excel template: ${err.message}\n\nPlease check:\n1. File format is correct CSV\n2. No duplicate rows in the file\n3. All required headers are present\n4. Data values are valid`)
    } finally {
      setLoading(false)
    }
  }

  // Dropdown Menu Functions
  const handleExportJSON = () => {
    setShowExportMenu(false)
    handleExportTemplate()
  }

  const handleExportCSV = () => {
    setShowExportMenu(false)
    handleExportToExcel()
  }

  const handleImportJSON = () => {
    setShowImportMenu(false)
    document.getElementById('import-template')?.click()
  }

  const handleImportCSV = () => {
    setShowImportMenu(false)
    document.getElementById('import-excel')?.click()
  }

  // Clear All Data Function
  const handleClearAllData = async () => {
    if (!confirm('⚠️ WARNING: This will delete ALL project types and activities!\n\nThis action cannot be undone.\n\nAre you absolutely sure?')) {
      return
    }

    if (!confirm('🚨 FINAL CONFIRMATION 🚨\n\nYou are about to delete:\n• All project types\n• All activities\n• All associated data\n\nClick OK to proceed or Cancel to abort.')) {
      return
    }

    try {
      setLoading(true)
      setError('')
      
      // Delete all activities first
      const { error: activitiesError } = await executeQuery(async () =>
        supabase
          .from('project_type_activities')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all
      )
      
      if (activitiesError) throw activitiesError
      
      // Delete all project types
      const { error: typesError } = await executeQuery(async () =>
        supabase
          .from('project_types')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all
      )
      
      if (typesError) throw typesError
      
      setSuccess('✅ All data cleared successfully! All project types and activities have been deleted.')
      setTimeout(() => setSuccess(''), 5000)
      
      // Reload data
      await loadData()
      
    } catch (err: any) {
      setError('Failed to clear all data: ' + err.message)
      console.error('Error clearing all data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Units Management Functions
  const handleAddUnit = () => {
    setEditingUnit(null)
    setUnitFormData({ name: '', code: '', description: '' })
    setShowUnitForm(true)
  }

  const handleEditUnit = (unit: Unit) => {
    setEditingUnit(unit)
    setUnitFormData({
      name: unit.name,
      code: unit.code || '',
      description: unit.description || ''
    })
    setShowUnitForm(true)
  }

  const handleSaveUnit = async () => {
    try {
      setLoading(true)
      setError('')
      
      if (!unitFormData.name.trim()) {
        setError('Unit name is required')
        return
      }
      
      if (editingUnit) {
        // Update
        const { error } = await executeQuery(async () =>
          (supabase as any)
            .from('units')
            .update({
              name: unitFormData.name.trim(),
              code: unitFormData.code.trim() || null,
              description: unitFormData.description.trim() || null,
              updated_at: new Date().toISOString()
            })
            .eq('id', editingUnit.id)
        )
        
        if (error) throw error
        setSuccess('Unit updated successfully')
      } else {
        // Create
        const { error } = await executeQuery(async () =>
          (supabase as any)
            .from('units')
            .insert({
              name: unitFormData.name.trim(),
              code: unitFormData.code.trim() || null,
              description: unitFormData.description.trim() || null,
              is_active: true,
              usage_count: 0
            })
        )
        
        if (error) throw error
        setSuccess('Unit created successfully')
      }
      
      setShowUnitForm(false)
      await loadUnitsData()
      // Reload available units for dropdown
      const { data } = await (supabase as any)
        .from('units')
        .select('name')
        .eq('is_active', true)
        .order('name', { ascending: true })
      if (data) setAvailableUnits(data.map((u: any) => u.name))
      
    } catch (err: any) {
      setError(err.message || 'Failed to save unit')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUnit = async (unit: Unit) => {
    if (!confirm(`Are you sure you want to delete "${unit.name}"?`)) {
      return
    }
    
    try {
      setLoading(true)
      setError('')
      
      const { error } = await executeQuery(async () =>
        supabase
          .from('units')
          .delete()
          .eq('id', unit.id)
      )
      
      if (error) throw error
      setSuccess('Unit deleted successfully')
      await loadUnitsData()
      // Reload available units for dropdown
      const { data } = await (supabase as any)
        .from('units')
        .select('name')
        .eq('is_active', true)
        .order('name', { ascending: true })
      if (data) setAvailableUnits(data.map((u: any) => u.name))
      
    } catch (err: any) {
      setError(err.message || 'Failed to delete unit')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleUnitActive = async (unit: Unit) => {
    try {
      setLoading(true)
      setError('')
      
      const { error } = await executeQuery(async () =>
        (supabase as any)
          .from('units')
          .update({
            is_active: !unit.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', unit.id)
      )
      
      if (error) throw error
      setSuccess(`Unit ${!unit.is_active ? 'enabled' : 'disabled'}`)
      await loadUnitsData()
      // Reload available units for dropdown
      const { data } = await (supabase as any)
        .from('units')
        .select('name')
        .eq('is_active', true)
        .order('name', { ascending: true })
      if (data) setAvailableUnits(data.map((u: any) => u.name))
      
    } catch (err: any) {
      setError(err.message || 'Failed to toggle unit')
    } finally {
      setLoading(false)
    }
  }

  // Units Selection Functions
  const handleSelectUnit = (unitId: string) => {
    const newSelected = new Set(selectedUnits)
    if (newSelected.has(unitId)) {
      newSelected.delete(unitId)
    } else {
      newSelected.add(unitId)
    }
    setSelectedUnits(newSelected)
  }

  const handleSelectAllUnits = () => {
    if (selectedUnits.size === filteredUnits.length) {
      setSelectedUnits(new Set())
    } else {
      setSelectedUnits(new Set(filteredUnits.map(u => u.id)))
    }
  }

  // Units Export Functions
  const handleExportUnitsJSON = async () => {
    try {
      setLoading(true)
      setError('')
      
      const unitsToExport = selectedUnits.size > 0
        ? units.filter(u => selectedUnits.has(u.id))
        : units
      
      const exportData = {
        units: unitsToExport.map(unit => ({
          name: unit.name,
          code: unit.code || '',
          description: unit.description || '',
          is_active: unit.is_active
        })),
        metadata: {
          exported_at: new Date().toISOString(),
          version: '1.0',
          total_units: unitsToExport.length,
          selected_units: selectedUnits.size
        }
      }
      
      const dataStr = JSON.stringify(exportData, null, 2)
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
      
      const exportFileDefaultName = `units-export-${new Date().toISOString().split('T')[0]}.json`
      
      const linkElement = document.createElement('a')
      linkElement.setAttribute('href', dataUri)
      linkElement.setAttribute('download', exportFileDefaultName)
      linkElement.click()
      
      setSuccess(`Exported ${unitsToExport.length} unit(s) as JSON`)
      setTimeout(() => setSuccess(''), 3000)
      
    } catch (err: any) {
      setError(err.message || 'Failed to export units')
    } finally {
      setLoading(false)
    }
  }

  const handleExportUnitsCSV = async () => {
    try {
      setLoading(true)
      setError('')
      
      const unitsToExport = selectedUnits.size > 0
        ? units.filter(u => selectedUnits.has(u.id))
        : units
      
      const headers = ['Name', 'Code', 'Description', 'Is Active', 'Usage Count', 'Created At']
      
      const rows = unitsToExport.map(unit => [
        unit.name,
        unit.code || '',
        unit.description || '',
        unit.is_active ? 'Yes' : 'No',
        unit.usage_count || 0,
        unit.created_at ? new Date(unit.created_at).toLocaleDateString() : ''
      ])
      
      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n')
      
      // Add BOM for UTF-8 support
      const bom = '\uFEFF'
      const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' })
      
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `units-export-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      setSuccess(`Exported ${unitsToExport.length} unit(s) as CSV`)
      setTimeout(() => setSuccess(''), 3000)
      
    } catch (err: any) {
      setError(err.message || 'Failed to export units')
    } finally {
      setLoading(false)
    }
  }

  // Units Import Functions
  const handleImportUnitsJSON = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setLoading(true)
      setError('')
      
      const text = await file.text()
      const importData = JSON.parse(text)

      if (!importData.units || !Array.isArray(importData.units)) {
        throw new Error('Invalid JSON file format. Expected an object with a "units" array.')
      }

      const unitsToImport = importData.units.map((unit: any) => ({
        name: unit.name?.trim(),
        code: unit.code?.trim() || null,
        description: unit.description?.trim() || null,
        is_active: unit.is_active !== false
      })).filter((unit: any) => unit.name) // Filter out units without names

      if (unitsToImport.length === 0) {
        throw new Error('No valid units found in the file')
      }

      // Remove duplicates based on name
      const uniqueUnits = unitsToImport.filter((unit: any, index: number, self: any[]) => 
        index === self.findIndex((u: any) => u.name.toLowerCase() === unit.name.toLowerCase())
      )

      const { error } = await executeQuery(async () =>
        (supabase as any)
          .from('units')
          .upsert(uniqueUnits, { onConflict: 'name' })
      )
      
      if (error) throw error
      
      setSuccess(`Imported ${uniqueUnits.length} unit(s) successfully`)
      setTimeout(() => setSuccess(''), 5000)
      
      // Reload data
      await loadUnitsData()
      const { data } = await (supabase as any)
        .from('units')
        .select('name')
        .eq('is_active', true)
        .order('name', { ascending: true })
      if (data) setAvailableUnits(data.map((u: any) => u.name))
      
    } catch (err: any) {
      setError('Failed to import units: ' + err.message)
    } finally {
      setLoading(false)
      // Reset file input
      event.target.value = ''
    }
  }

  const handleImportUnitsCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setLoading(true)
      setError('')
      
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      
      if (lines.length < 2) {
        throw new Error('CSV file must have at least a header row and one data row')
      }
      
      // Parse CSV
      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim())
      const dataRows = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.replace(/"/g, '').trim())
        const row: any = {}
        headers.forEach((header, index) => {
          row[header] = values[index] || ''
        })
        return row
      })
      
      // Validate headers
      if (!headers.includes('Name')) {
        throw new Error('CSV file must have a "Name" column')
      }
      
      const unitsToImport = dataRows
        .map((row: any) => ({
          name: row['Name']?.trim(),
          code: row['Code']?.trim() || null,
          description: row['Description']?.trim() || null,
          is_active: row['Is Active']?.toLowerCase() === 'yes' || row['Is Active']?.toLowerCase() === 'true' || row['Is Active'] === ''
        }))
        .filter((unit: any) => unit.name) // Filter out units without names
      
      if (unitsToImport.length === 0) {
        throw new Error('No valid units found in the CSV file')
      }

      // Remove duplicates based on name
      const uniqueUnits = unitsToImport.filter((unit: any, index: number, self: any[]) => 
        index === self.findIndex((u: any) => u.name.toLowerCase() === unit.name.toLowerCase())
      )

      const { error } = await executeQuery(async () =>
        (supabase as any)
          .from('units')
          .upsert(uniqueUnits, { onConflict: 'name' })
      )
      
      if (error) throw error
      
      setSuccess(`Imported ${uniqueUnits.length} unit(s) successfully`)
      setTimeout(() => setSuccess(''), 5000)
      
      // Reload data
      await loadUnitsData()
      const { data } = await (supabase as any)
        .from('units')
        .select('name')
        .eq('is_active', true)
        .order('name', { ascending: true })
      if (data) setAvailableUnits(data.map((u: any) => u.name))
      
    } catch (err: any) {
      setError('Failed to import units: ' + err.message)
    } finally {
      setLoading(false)
      // Reset file input
      event.target.value = ''
    }
  }

  // Bulk Actions for Units
  const handleBulkDeleteUnits = async () => {
    if (selectedUnits.size === 0) {
      setError('Please select at least one unit to delete')
      return
    }

    if (!confirm(`Are you sure you want to delete ${selectedUnits.size} unit(s)?`)) {
      return
    }
    
    try {
      setLoading(true)
      setError('')
      
      const unitIds = Array.from(selectedUnits)
      const { error } = await executeQuery(async () =>
        supabase
          .from('units')
          .delete()
          .in('id', unitIds)
      )
      
      if (error) throw error
      setSuccess(`Deleted ${selectedUnits.size} unit(s) successfully`)
      setSelectedUnits(new Set())
      await loadUnitsData()
      // Reload available units for dropdown
      const { data } = await (supabase as any)
        .from('units')
        .select('name')
        .eq('is_active', true)
        .order('name', { ascending: true })
      if (data) setAvailableUnits(data.map((u: any) => u.name))
      
    } catch (err: any) {
      setError(err.message || 'Failed to delete units')
    } finally {
      setLoading(false)
    }
  }

  const handleBulkToggleUnitsActive = async (activate: boolean) => {
    if (selectedUnits.size === 0) {
      setError(`Please select at least one unit to ${activate ? 'activate' : 'deactivate'}`)
      return
    }
    
    try {
      setLoading(true)
      setError('')
      
      const unitIds = Array.from(selectedUnits)
      const { error } = await executeQuery(async () =>
        (supabase as any)
          .from('units')
          .update({
            is_active: activate,
            updated_at: new Date().toISOString()
          })
          .in('id', unitIds)
      )
      
      if (error) throw error
      setSuccess(`${activate ? 'Activated' : 'Deactivated'} ${selectedUnits.size} unit(s) successfully`)
      setSelectedUnits(new Set())
      await loadUnitsData()
      // Reload available units for dropdown
      const { data } = await (supabase as any)
        .from('units')
        .select('name')
        .eq('is_active', true)
        .order('name', { ascending: true })
      if (data) setAvailableUnits(data.map((u: any) => u.name))
      
    } catch (err: any) {
      setError(err.message || `Failed to ${activate ? 'activate' : 'deactivate'} units`)
    } finally {
      setLoading(false)
    }
  }

  // UI Functions
  const toggleExpanded = (typeName: string) => {
    const newExpanded = new Set(expandedTypes)
    if (newExpanded.has(typeName)) {
      newExpanded.delete(typeName)
    } else {
      newExpanded.add(typeName)
    }
    setExpandedTypes(newExpanded)
  }

  const expandAll = () => {
    setExpandedTypes(new Set(projectScopes.map(t => t.name)))
  }

  const collapseAll = () => {
    setExpandedTypes(new Set())
  }

  // Filter
  const filteredScopes = projectScopes.filter(scope =>
    scope.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    scope.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    scope.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )
  
  // Filter activities by search term
  const filterActivities = (activitiesList: ProjectActivity[]) => {
    if (!activitySearchTerm.trim()) return activitiesList
    
    const searchLower = activitySearchTerm.toLowerCase()
    return activitiesList.filter(activity =>
      activity.activity_name.toLowerCase().includes(searchLower) ||
      activity.activity_name_ar?.toLowerCase().includes(searchLower) ||
      activity.description?.toLowerCase().includes(searchLower) ||
      activity.category?.toLowerCase().includes(searchLower) ||
      activity.default_unit?.toLowerCase().includes(searchLower) ||
      activity.division?.toLowerCase().includes(searchLower)
    )
  }

  // Filter units by search term
  const filteredUnits = units.filter(unit =>
    unit.name.toLowerCase().includes(unitSearchTerm.toLowerCase()) ||
    unit.code?.toLowerCase().includes(unitSearchTerm.toLowerCase()) ||
    unit.description?.toLowerCase().includes(unitSearchTerm.toLowerCase())
  )

  if (loading && projectScopes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading project scopes and activities...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FolderTree className="h-7 w-7 text-blue-600" />
            Project Types & Activities Management
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Unified management for project types, activities, and units
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {activeTab === 'project-types' && (
            <>
              <ModernButton
                onClick={handleClearAllData}
                variant="danger"
                size="md"
                icon={<Trash className="h-4 w-4" />}
                disabled={loading}
                title="Clear all project types and activities (DANGEROUS!)"
              >
                Clear All Data
              </ModernButton>
              
              <ModernButton
                onClick={handleAddScope}
                variant="primary"
                size="md"
                icon={<Plus className="h-4 w-4" />}
              >
                Add Project Scope
              </ModernButton>
            </>
          )}
          {activeTab === 'units' && (
            <ModernButton
              onClick={handleAddUnit}
              variant="primary"
              size="md"
              icon={<Plus className="h-4 w-4" />}
            >
              Add Unit
            </ModernButton>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('project-types')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'project-types'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <FolderTree className="h-4 w-4" />
              Project Types & Activities
            </div>
          </button>
          <button
            onClick={() => setActiveTab('units')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'units'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Units Management
            </div>
          </button>
        </nav>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="error">
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="ml-2">
              <X className="h-4 w-4" />
            </button>
          </div>
        </Alert>
      )}
      
      {success && (
        <Alert variant="success">
          <div className="flex items-center justify-between">
            <span>{success}</span>
            <button onClick={() => setSuccess('')} className="ml-2">
              <X className="h-4 w-4" />
            </button>
          </div>
        </Alert>
      )}

      {/* Project Types & Activities Tab */}
      {activeTab === 'project-types' && (
        <>
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <ModernCard>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FolderTree className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Project Scopes</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {projectScopes.filter(t => t.is_active).length}
              </p>
            </div>
          </div>
        </ModernCard>

        <ModernCard>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Activity className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Activities</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {Object.values(activities).flat().filter(a => a.is_active).length}
              </p>
            </div>
          </div>
        </ModernCard>

        <ModernCard>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <List className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Categories</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {new Set(Object.values(activities).flat().map(a => a.category).filter(Boolean)).size}
              </p>
            </div>
          </div>
        </ModernCard>

        <ModernCard>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <BarChart3 className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg per Scope</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {projectScopes.length > 0 
                  ? Math.round(Object.values(activities).flat().length / projectScopes.length)
                  : 0}
              </p>
            </div>
          </div>
        </ModernCard>
      </div>

      {/* Template Management Card */}
      <ModernCard className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-200 dark:border-indigo-800">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
            <Archive className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Template Management
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Export and import project types and activities as templates
            </p>
          </div>
        </div>
        
        {/* Clear All Data Warning */}
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h4 className="font-medium text-red-800 dark:text-red-200">Dangerous Operations</h4>
          </div>
          <p className="text-sm text-red-700 dark:text-red-300 mb-3">
            Use the "Clear All Data" button above to completely remove all project types and activities. This action cannot be undone! You will be asked to confirm twice.
          </p>
          <div className="flex items-center gap-2">
            <ModernButton
              onClick={handleClearAllData}
              variant="danger"
              size="sm"
              icon={<Trash className="h-4 w-4" />}
              disabled={loading}
            >
              Clear All Data
            </ModernButton>
            <span className="text-xs text-red-600 dark:text-red-400">
              ⚠️ This will delete everything!
            </span>
          </div>
        </div>

        {/* Template Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Export Section */}
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-3">
              <Download className="h-5 w-5 text-blue-600" />
              <h4 className="font-medium text-gray-900 dark:text-white">Export Templates</h4>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Download your project types and activities as templates
            </p>
            <div className="flex gap-2">
              <ModernButton
                onClick={handleExportJSON}
                variant="outline"
                size="sm"
                icon={<FileText className="h-4 w-4" />}
                disabled={loading}
                className="flex-1"
              >
                Export JSON
              </ModernButton>
              <ModernButton
                onClick={handleExportCSV}
                variant="outline"
                size="sm"
                icon={<FileSpreadsheet className="h-4 w-4" />}
                disabled={loading}
                className="flex-1"
              >
                Export CSV
              </ModernButton>
            </div>
          </div>
          
          {/* Import Section */}
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-3">
              <Upload className="h-5 w-5 text-green-600" />
              <h4 className="font-medium text-gray-900 dark:text-white">Import Templates</h4>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Upload template files to import project types and activities
            </p>
            <div className="flex gap-2">
              <ModernButton
                onClick={() => {
                  const input = document.getElementById('import-template') as HTMLInputElement
                  if (input) {
                    input.click()
                  }
                }}
                variant="outline"
                size="sm"
                icon={<FileText className="h-4 w-4" />}
                disabled={loading}
                className="flex-1 cursor-pointer"
              >
                Import JSON
              </ModernButton>
              
              <ModernButton
                onClick={() => {
                  const input = document.getElementById('import-excel') as HTMLInputElement
                  if (input) {
                    input.click()
                  }
                }}
                variant="outline"
                size="sm"
                icon={<FileSpreadsheet className="h-4 w-4" />}
                disabled={loading}
                className="flex-1 cursor-pointer"
              >
                Import CSV
              </ModernButton>
              
              <input
                type="file"
                accept=".json"
                onChange={handleImportTemplate}
                className="hidden"
                id="import-template"
              />
              
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleImportFromExcel}
                className="hidden"
                id="import-excel"
              />
            </div>
          </div>
        </div>
        
        {/* Statistics */}
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-indigo-200 dark:border-indigo-700">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">Current Data</h4>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Last updated: {new Date().toLocaleDateString()}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{projectScopes.length}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Project Scopes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{Object.values(activities).flat().length}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Activities</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{new Set(Object.values(activities).flat().map(a => a.category).filter(Boolean)).size}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Categories</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {projectScopes.length > 0 ? Math.round(Object.values(activities).flat().length / projectScopes.length) : 0}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Avg per Scope</div>
            </div>
          </div>
        </div>
      </ModernCard>

      {/* Search and Controls */}
      <div className="space-y-3">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search project types..."
              className="pl-10"
            />
          </div>
          
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              value={activitySearchTerm}
              onChange={(e) => setActivitySearchTerm(e.target.value)}
              placeholder="Search activities..."
              className="pl-10"
            />
          </div>
          
          <ModernButton
            onClick={expandAll}
            variant="outline"
            size="sm"
          >
            Expand All
          </ModernButton>
          
          <ModernButton
            onClick={collapseAll}
            variant="outline"
            size="sm"
          >
            Collapse All
          </ModernButton>
        </div>
        
        {activitySearchTerm && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Search className="h-4 w-4" />
            <span>
              Searching activities: "{activitySearchTerm}" - Found {
                Object.values(activities)
                  .flat()
                  .filter(a => 
                    a.activity_name.toLowerCase().includes(activitySearchTerm.toLowerCase()) ||
                    a.activity_name_ar?.toLowerCase().includes(activitySearchTerm.toLowerCase()) ||
                    a.description?.toLowerCase().includes(activitySearchTerm.toLowerCase()) ||
                    a.category?.toLowerCase().includes(activitySearchTerm.toLowerCase()) ||
                    a.default_unit?.toLowerCase().includes(activitySearchTerm.toLowerCase()) ||
                    a.division?.toLowerCase().includes(activitySearchTerm.toLowerCase())
                  ).length
              } results
            </span>
            <button
              onClick={() => setActivitySearchTerm('')}
              className="ml-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Project Scopes List */}
      <div className="space-y-4">
        {filteredScopes.map((scope) => {
          const scopeActivities = activities[scope.name] || []
          const filteredActivities = filterActivities(scopeActivities)
          const isExpanded = expandedTypes.has(scope.name)
          const activeActivities = scopeActivities.filter(a => a.is_active).length
          
          return (
            <ModernCard key={scope.id} className={!scope.is_active ? 'opacity-60' : ''}>
              {/* Project Scope Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-4 flex-1">
                  <button
                    onClick={() => toggleExpanded(scope.name)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-gray-600" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-600" />
                    )}
                  </button>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {scope.name}
                      </h3>
                      {scope.code && (
                        <ModernBadge variant="info" size="sm">
                          {scope.code}
                        </ModernBadge>
                      )}
                      {!scope.is_active && (
                        <ModernBadge variant="gray" size="sm">
                          <EyeOff className="h-3 w-3 mr-1" />
                          Disabled
                        </ModernBadge>
                      )}
                    </div>
                    {scope.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {scope.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span>{activeActivities} activities</span>
                      <span>•</span>
                      <span>{scope.usage_count} uses</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <ModernButton
                    onClick={() => handleAddActivity(scope.name)}
                    variant="outline"
                    size="sm"
                    icon={<Plus className="h-4 w-4" />}
                  >
                    Add Activity
                  </ModernButton>
                  
                  <ModernButton
                    onClick={() => handleExportSpecificScope(scope)}
                    variant="outline"
                    size="sm"
                    icon={<Download className="h-4 w-4" />}
                    disabled={loading}
                    title="Export this project scope as template"
                  >
                    Export
                  </ModernButton>
                  
                  <ModernButton
                    onClick={() => {
                      const input = document.getElementById(`import-${scope.name.replace(/[^a-zA-Z0-9]/g, '_')}`) as HTMLInputElement
                      if (input) {
                        input.click()
                      }
                    }}
                    variant="outline"
                    size="sm"
                    icon={<Upload className="h-4 w-4" />}
                    disabled={loading}
                    title="Import activities to this project scope"
                    className="cursor-pointer"
                  >
                    Import
                  </ModernButton>
                  
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls,.json"
                    onChange={(e) => handleImportToSpecificScope(e, scope.name)}
                    className="hidden"
                    id={`import-${scope.name.replace(/[^a-zA-Z0-9]/g, '_')}`}
                  />
                  
                  <ModernButton
                    onClick={() => handleEditScope(scope)}
                    variant="outline"
                    size="sm"
                    icon={<Edit2 className="h-4 w-4" />}
                  >
                    Edit
                  </ModernButton>
                  
                  <ModernButton
                    onClick={() => handleToggleScopeActive(scope)}
                    variant="outline"
                    size="sm"
                    icon={scope.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  >
                    {scope.is_active ? 'Disable' : 'Enable'}
                  </ModernButton>
                  
                  <ModernButton
                    onClick={() => handleDeleteScope(scope)}
                    variant="danger"
                    size="sm"
                    icon={<Trash2 className="h-4 w-4" />}
                  >
                    Delete
                  </ModernButton>
                </div>
              </div>

              {/* Activities List */}
              {isExpanded && (
                <div className="p-4">
                  {filteredActivities.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Activity className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      {scopeActivities.length === 0 ? (
                        <>
                          <p>No activities yet</p>
                          <ModernButton
                            onClick={() => handleAddActivity(scope.name)}
                            variant="outline"
                            size="sm"
                            className="mt-3"
                          >
                            Add First Activity
                          </ModernButton>
                        </>
                      ) : (
                        <>
                          <p>No activities found matching "{activitySearchTerm}"</p>
                          <ModernButton
                            onClick={() => setActivitySearchTerm('')}
                            variant="outline"
                            size="sm"
                            className="mt-3"
                          >
                            Clear Search
                          </ModernButton>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredActivities.map((activity) => (
                        <div
                          key={activity.id}
                          className={`flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg ${
                            !activity.is_active ? 'opacity-50' : ''
                          }`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900 dark:text-white">
                                {activity.activity_name}
                              </span>
                              {activity.category && (
                                <ModernBadge variant="purple" size="sm">
                                  {activity.category}
                                </ModernBadge>
                              )}
                              {!activity.is_active && (
                                <ModernBadge variant="gray" size="sm">
                                  Disabled
                                </ModernBadge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                              {activity.default_unit && <span>Unit: {activity.default_unit}</span>}
                              {activity.typical_duration && (
                                <>
                                  <span>•</span>
                                  <span>{activity.typical_duration} days</span>
                                </>
                              )}
                              {activity.usage_count > 0 && (
                                <>
                                  <span>•</span>
                                  <span>{activity.usage_count} uses</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <ModernButton
                              onClick={() => handleEditActivity(activity)}
                              variant="outline"
                              size="sm"
                              icon={<Edit2 className="h-3 w-3" />}
                            >
                              Edit
                            </ModernButton>
                            
                            <ModernButton
                              onClick={() => handleToggleActivityActive(activity)}
                              variant="outline"
                              size="sm"
                              icon={activity.is_active ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            >
                              {activity.is_active ? 'Disable' : 'Enable'}
                            </ModernButton>
                            
                            <ModernButton
                              onClick={() => handleDeleteActivity(activity)}
                              variant="danger"
                              size="sm"
                              icon={<Trash2 className="h-3 w-3" />}
                            >
                              Delete
                            </ModernButton>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </ModernCard>
          )
        })}
      </div>
        </>
      )}

      {/* Units Management Tab */}
      {activeTab === 'units' && (
        <div className="space-y-6">
          {/* Export/Import Card */}
          <ModernCard className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-200 dark:border-indigo-800">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                <Archive className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Import & Export Units
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Export and import units as JSON or CSV files
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Export Section */}
              <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-3">
                  <Download className="h-5 w-5 text-blue-600" />
                  <h4 className="font-medium text-gray-900 dark:text-white">Export Units</h4>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {selectedUnits.size > 0 
                    ? `Export ${selectedUnits.size} selected unit(s)`
                    : 'Export all units'}
                </p>
                <div className="flex gap-2">
                  <ModernButton
                    onClick={handleExportUnitsJSON}
                    variant="outline"
                    size="sm"
                    icon={<FileText className="h-4 w-4" />}
                    disabled={loading}
                    className="flex-1"
                  >
                    Export JSON
                  </ModernButton>
                  <ModernButton
                    onClick={handleExportUnitsCSV}
                    variant="outline"
                    size="sm"
                    icon={<FileSpreadsheet className="h-4 w-4" />}
                    disabled={loading}
                    className="flex-1"
                  >
                    Export CSV
                  </ModernButton>
                </div>
              </div>
              
              {/* Import Section */}
              <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-3">
                  <Upload className="h-5 w-5 text-green-600" />
                  <h4 className="font-medium text-gray-900 dark:text-white">Import Units</h4>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Upload template files to import units
                </p>
                <div className="flex gap-2">
                  <ModernButton
                    onClick={() => {
                      const input = document.getElementById('import-units-json') as HTMLInputElement
                      if (input) input.click()
                    }}
                    variant="outline"
                    size="sm"
                    icon={<FileText className="h-4 w-4" />}
                    disabled={loading}
                    className="flex-1 cursor-pointer"
                  >
                    Import JSON
                  </ModernButton>
                  
                  <ModernButton
                    onClick={() => {
                      const input = document.getElementById('import-units-csv') as HTMLInputElement
                      if (input) input.click()
                    }}
                    variant="outline"
                    size="sm"
                    icon={<FileSpreadsheet className="h-4 w-4" />}
                    disabled={loading}
                    className="flex-1 cursor-pointer"
                  >
                    Import CSV
                  </ModernButton>
                  
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportUnitsJSON}
                    className="hidden"
                    id="import-units-json"
                  />
                  
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleImportUnitsCSV}
                    className="hidden"
                    id="import-units-csv"
                  />
                </div>
              </div>
            </div>
          </ModernCard>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ModernCard>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Settings className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Units</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {units.length}
                  </p>
                </div>
              </div>
            </ModernCard>

            <ModernCard>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Active Units</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {units.filter(u => u.is_active).length}
                  </p>
                </div>
              </div>
            </ModernCard>

            <ModernCard>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Usage</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {units.reduce((sum, u) => sum + (u.usage_count || 0), 0)}
                  </p>
                </div>
              </div>
            </ModernCard>
          </div>

          {/* Search and Selection Controls */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                value={unitSearchTerm}
                onChange={(e) => setUnitSearchTerm(e.target.value)}
                placeholder="Search units..."
                className="pl-10"
              />
            </div>
            
            {filteredUnits.length > 0 && (
              <>
                <ModernButton
                  onClick={handleSelectAllUnits}
                  variant="outline"
                  size="sm"
                  icon={<CheckCircle className="h-4 w-4" />}
                >
                  {selectedUnits.size === filteredUnits.length ? 'Deselect All' : 'Select All'}
                </ModernButton>
                
                {selectedUnits.size > 0 && (
                  <>
                    <ModernButton
                      onClick={() => handleBulkToggleUnitsActive(true)}
                      variant="outline"
                      size="sm"
                      icon={<Eye className="h-4 w-4" />}
                      disabled={loading}
                    >
                      Enable ({selectedUnits.size})
                    </ModernButton>
                    
                    <ModernButton
                      onClick={() => handleBulkToggleUnitsActive(false)}
                      variant="outline"
                      size="sm"
                      icon={<EyeOff className="h-4 w-4" />}
                      disabled={loading}
                    >
                      Disable ({selectedUnits.size})
                    </ModernButton>
                    
                    <ModernButton
                      onClick={handleBulkDeleteUnits}
                      variant="danger"
                      size="sm"
                      icon={<Trash2 className="h-4 w-4" />}
                      disabled={loading}
                    >
                      Delete ({selectedUnits.size})
                    </ModernButton>
                  </>
                )}
              </>
            )}
          </div>
          
          {selectedUnits.size > 0 && (
            <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
              <CheckCircle className="h-4 w-4" />
              <span>{selectedUnits.size} unit(s) selected</span>
              <button
                onClick={() => setSelectedUnits(new Set())}
                className="ml-auto text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Clear Selection
              </button>
            </div>
          )}

          {/* Units List */}
          <div className="space-y-4">
            {filteredUnits.length === 0 ? (
              <ModernCard>
                <div className="text-center py-12 text-gray-500">
                  <Settings className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  {units.length === 0 ? (
                    <>
                      <p>No units yet</p>
                      <ModernButton
                        onClick={handleAddUnit}
                        variant="outline"
                        size="sm"
                        className="mt-3"
                      >
                        Add First Unit
                      </ModernButton>
                    </>
                  ) : (
                    <>
                      <p>No units found matching "{unitSearchTerm}"</p>
                      <button
                        onClick={() => setUnitSearchTerm('')}
                        className="mt-3 text-blue-600 hover:text-blue-700 dark:text-blue-400"
                      >
                        Clear Search
                      </button>
                    </>
                  )}
                </div>
              </ModernCard>
            ) : (
              filteredUnits.map((unit) => (
                <ModernCard key={unit.id} className={!unit.is_active ? 'opacity-60' : ''}>
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3 flex-1">
                      <input
                        type="checkbox"
                        checked={selectedUnits.has(unit.id)}
                        onChange={() => handleSelectUnit(unit.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {unit.name}
                          </h3>
                          {unit.code && (
                            <ModernBadge variant="info" size="sm">
                              {unit.code}
                            </ModernBadge>
                          )}
                          {!unit.is_active && (
                            <ModernBadge variant="gray" size="sm">
                              <EyeOff className="h-3 w-3 mr-1" />
                              Disabled
                            </ModernBadge>
                          )}
                        </div>
                        {unit.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {unit.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <span>{unit.usage_count || 0} uses</span>
                          {unit.created_at && (
                            <>
                              <span>•</span>
                              <span>Created: {new Date(unit.created_at).toLocaleDateString()}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <ModernButton
                        onClick={() => handleEditUnit(unit)}
                        variant="outline"
                        size="sm"
                        icon={<Edit2 className="h-4 w-4" />}
                      >
                        Edit
                      </ModernButton>
                      
                      <ModernButton
                        onClick={() => handleToggleUnitActive(unit)}
                        variant="outline"
                        size="sm"
                        icon={unit.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      >
                        {unit.is_active ? 'Disable' : 'Enable'}
                      </ModernButton>
                      
                      <ModernButton
                        onClick={() => handleDeleteUnit(unit)}
                        variant="danger"
                        size="sm"
                        icon={<Trash2 className="h-4 w-4" />}
                      >
                        Delete
                      </ModernButton>
                    </div>
                  </div>
                </ModernCard>
              ))
            )}
          </div>
        </div>
      )}


      {/* Unit Form Modal */}
      {showUnitForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <ModernCard className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {editingUnit ? 'Edit Unit' : 'Add Unit'}
              </h3>
              <button
                onClick={() => setShowUnitForm(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Unit Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={unitFormData.name}
                  onChange={(e) => setUnitFormData({ ...unitFormData, name: e.target.value })}
                  placeholder="e.g., Meter, Kilogram, Day"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Unit Code
                </label>
                <Input
                  value={unitFormData.code}
                  onChange={(e) => setUnitFormData({ ...unitFormData, code: e.target.value })}
                  placeholder="e.g., m, kg, d"
                  maxLength={10}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={unitFormData.description}
                  onChange={(e) => setUnitFormData({ ...unitFormData, description: e.target.value })}
                  placeholder="Brief description of the unit"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <ModernButton
                  onClick={() => setShowUnitForm(false)}
                  variant="outline"
                  size="md"
                >
                  Cancel
                </ModernButton>
                <ModernButton
                  onClick={handleSaveUnit}
                  variant="primary"
                  size="md"
                  icon={<Save className="h-4 w-4" />}
                  disabled={loading}
                >
                  {editingUnit ? 'Update' : 'Create'}
                </ModernButton>
              </div>
            </div>
          </ModernCard>
        </div>
      )}

      {/* Project Scope Form Modal */}
      {showScopeForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <ModernCard className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {editingScope ? 'Edit Project Scope' : 'Add Project Scope'}
              </h3>
              <button
                onClick={() => setShowScopeForm(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={scopeFormData.name}
                  onChange={(e) => setScopeFormData({ ...scopeFormData, name: e.target.value })}
                  placeholder="e.g., Infrastructure"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Code
                </label>
                <Input
                  value={scopeFormData.code}
                  onChange={(e) => setScopeFormData({ ...scopeFormData, code: e.target.value })}
                  placeholder="e.g., INF"
                  maxLength={10}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={scopeFormData.description}
                  onChange={(e) => setScopeFormData({ ...scopeFormData, description: e.target.value })}
                  placeholder="Brief description of this project scope"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <ModernButton
                  onClick={() => setShowScopeForm(false)}
                  variant="outline"
                  size="md"
                >
                  Cancel
                </ModernButton>
                <ModernButton
                  onClick={handleSaveScope}
                  variant="primary"
                  size="md"
                  icon={<Save className="h-4 w-4" />}
                  disabled={loading}
                >
                  {editingScope ? 'Update' : 'Create'}
                </ModernButton>
              </div>
            </div>
          </ModernCard>
        </div>
      )}

      {/* Activity Form Modal */}
      {showActivityForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <ModernCard className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {editingActivity ? 'Edit Activity' : 'Add Activity'}
              </h3>
              <button
                onClick={() => setShowActivityForm(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Activity Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={activityFormData.activity_name}
                    onChange={(e) => setActivityFormData({ ...activityFormData, activity_name: e.target.value })}
                    placeholder="e.g., Bored Piling"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Arabic Name
                  </label>
                  <Input
                    value={activityFormData.activity_name_ar}
                    onChange={(e) => setActivityFormData({ ...activityFormData, activity_name_ar: e.target.value })}
                    placeholder="الاسم بالعربي"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Default Unit
                  </label>
                  <select
                    value={activityFormData.default_unit}
                    onChange={(e) => {
                      if (e.target.value === '__create_new__') {
                        setShowCreateUnitModal(true)
                      } else {
                        setActivityFormData({ ...activityFormData, default_unit: e.target.value })
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select Unit...</option>
                    {availableUnits.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                    <option value="__create_new__" className="font-semibold text-blue-600">
                      + Create New Unit
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Estimated Rate
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={activityFormData.estimated_rate}
                    onChange={(e) => setActivityFormData({ ...activityFormData, estimated_rate: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Typical Duration (days)
                  </label>
                  <Input
                    type="number"
                    value={activityFormData.typical_duration}
                    onChange={(e) => setActivityFormData({ ...activityFormData, typical_duration: e.target.value })}
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Division
                  </label>
                  <select
                    value={activityFormData.division}
                    onChange={(e) => setActivityFormData({ ...activityFormData, division: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select Division...</option>
                    {availableDivisions.map((division) => (
                      <option key={division} value={division}>
                        {division}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Display Order
                  </label>
                  <Input
                    type="number"
                    value={activityFormData.display_order}
                    onChange={(e) => setActivityFormData({ ...activityFormData, display_order: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={activityFormData.description}
                  onChange={(e) => setActivityFormData({ ...activityFormData, description: e.target.value })}
                  placeholder="Brief description of this activity"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <ModernButton
                  onClick={() => setShowActivityForm(false)}
                  variant="outline"
                  size="md"
                >
                  Cancel
                </ModernButton>
                <ModernButton
                  onClick={handleSaveActivity}
                  variant="primary"
                  size="md"
                  icon={<Save className="h-4 w-4" />}
                  disabled={loading}
                >
                  {editingActivity ? 'Update' : 'Create'}
                </ModernButton>
              </div>
            </div>
          </ModernCard>
        </div>
      )}

      {/* Create New Unit Modal */}
      {showCreateUnitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <ModernCard className="w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Create New Unit</h3>
              <button
                onClick={() => {
                  setShowCreateUnitModal(false)
                  setNewUnitName('')
                  setNewUnitCode('')
                  setNewUnitDescription('')
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {error && (
                <Alert variant="error" className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </Alert>
              )}

              {success && (
                <Alert variant="success" className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>{success}</span>
                </Alert>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Unit Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={newUnitName}
                  onChange={(e) => {
                    setNewUnitName(e.target.value)
                    setError('') // Clear error when user types
                  }}
                  placeholder="e.g., Meter, Kilogram, Day"
                  required
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newUnitName.trim()) {
                      e.preventDefault()
                      // Trigger create button click
                      const createButton = document.querySelector('[data-create-unit-btn]') as HTMLButtonElement
                      if (createButton) createButton.click()
                    }
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Unit Code (Optional)
                </label>
                <Input
                  value={newUnitCode}
                  onChange={(e) => setNewUnitCode(e.target.value)}
                  placeholder="e.g., m, kg, d"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={newUnitDescription}
                  onChange={(e) => setNewUnitDescription(e.target.value)}
                  placeholder="Brief description of the unit"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <ModernButton
                  onClick={() => {
                    setShowCreateUnitModal(false)
                    setNewUnitName('')
                    setNewUnitCode('')
                    setNewUnitDescription('')
                  }}
                  variant="outline"
                  size="md"
                >
                  Cancel
                </ModernButton>
                <ModernButton
                  data-create-unit-btn
                  onClick={async () => {
                    if (!newUnitName.trim()) {
                      setError('Unit name is required')
                      return
                    }

                    // Check if unit already exists
                    const unitExists = availableUnits.some(
                      u => u.toLowerCase().trim() === newUnitName.toLowerCase().trim()
                    )
                    if (unitExists) {
                      setError(`Unit "${newUnitName.trim()}" already exists`)
                      return
                    }

                    try {
                      setLoading(true)
                      setError('')
                      setSuccess('')
                      
                      const { data, error: createError } = await (supabase as any)
                        .from('units')
                        .insert({
                          name: newUnitName.trim(),
                          code: newUnitCode.trim() || null,
                          description: newUnitDescription.trim() || null,
                          is_active: true,
                          usage_count: 0
                        })
                        .select()
                        .single()
                      
                      if (createError) {
                        // Handle duplicate key error
                        if (createError.code === '23505' || createError.message.includes('duplicate')) {
                          throw new Error(`Unit "${newUnitName.trim()}" already exists in the database`)
                        }
                        throw createError
                      }
                      
                      setSuccess('Unit created successfully!')
                      
                      // Update activity form with new unit
                      setActivityFormData({ ...activityFormData, default_unit: newUnitName.trim() })
                      
                      // Reload units from database
                      const { data: unitsData, error: unitsError } = await (supabase as any)
                        .from('units')
                        .select('name')
                        .eq('is_active', true)
                        .order('name', { ascending: true })
                      
                      if (unitsError) {
                        console.error('Error reloading units:', unitsError)
                      } else if (unitsData && unitsData.length > 0) {
                        setAvailableUnits(unitsData.map((u: any) => u.name))
                      }
                      
                      // Close modal after short delay
                      setTimeout(() => {
                        setShowCreateUnitModal(false)
                        setNewUnitName('')
                        setNewUnitCode('')
                        setNewUnitDescription('')
                        setSuccess('')
                      }, 1500)
                    } catch (err: any) {
                      console.error('Error creating unit:', err)
                      setError(err.message || 'Failed to create unit. Please try again.')
                    } finally {
                      setLoading(false)
                    }
                  }}
                  variant="primary"
                  size="md"
                  icon={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  disabled={loading || !newUnitName.trim()}
                >
                  {loading ? 'Creating...' : 'Create Unit'}
                </ModernButton>
              </div>
            </div>
          </ModernCard>
        </div>
      )}
    </div>
  )
}
