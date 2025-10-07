/**
 * Project Types Manager
 * إدارة أنواع المشاريع (Project Types) في Supabase مع إمكانية الإضافة والتعديل
 */

import { getSupabaseClient, executeQuery } from './simpleConnectionManager'

export interface ProjectType {
  id?: string
  name: string
  code?: string
  description?: string
  is_active: boolean
  created_at?: string
  updated_at?: string
  usage_count?: number
}

// أنواع المشاريع الافتراضية
export const DEFAULT_PROJECT_TYPES: ProjectType[] = [
  {
    name: 'Infrastructure',
    code: 'INF',
    description: 'Infrastructure and utilities projects',
    is_active: true
  },
  {
    name: 'Building Construction',
    code: 'BLD',
    description: 'Building and construction projects',
    is_active: true
  },
  {
    name: 'Road Construction',
    code: 'RD',
    description: 'Road and highway construction',
    is_active: true
  },
  {
    name: 'Marine Works',
    code: 'MAR',
    description: 'Marine and waterfront projects',
    is_active: true
  },
  {
    name: 'Landscaping',
    code: 'LND',
    description: 'Landscaping and beautification',
    is_active: true
  },
  {
    name: 'Maintenance',
    code: 'MNT',
    description: 'Maintenance and repair works',
    is_active: true
  },
  {
    name: 'Enabling Division',
    code: 'ENA',
    description: 'Enabling works and preliminary activities',
    is_active: true
  },
  {
    name: 'Soil Improvement Division',
    code: 'SID',
    description: 'Soil improvement and ground treatment',
    is_active: true
  },
  {
    name: 'Infrastructure Division',
    code: 'IDV',
    description: 'Infrastructure division projects',
    is_active: true
  },
  {
    name: 'Marine Division',
    code: 'MDV',
    description: 'Marine division projects',
    is_active: true
  }
]

/**
 * تهيئة جدول أنواع المشاريع في Supabase
 */
export async function initializeProjectTypesTable(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient()
    
    // تحقق من وجود الجدول
    const { data: existingTypes } = await executeQuery(async () =>
      supabase
        .from('project_types')
        .select('id')
        .limit(1)
    )
    
    // إذا كان الجدول فارغًا، أضف الأنواع الافتراضية
    if (!existingTypes || (existingTypes as any[]).length === 0) {
      const { error } = await executeQuery(async () =>
        (supabase as any)
          .from('project_types')
          .insert(DEFAULT_PROJECT_TYPES)
      )
      
      if (error) {
        console.error('Error initializing project types:', error)
        return { success: false, error: error.message }
      }
      
      console.log('✅ Project types table initialized with default types')
    }
    
    return { success: true }
  } catch (error: any) {
    console.error('Error initializing project types table:', error)
    return { success: false, error: error.message }
  }
}

/**
 * جلب جميع أنواع المشاريع النشطة
 */
export async function getAllProjectTypes(): Promise<ProjectType[]> {
  try {
    const supabase = getSupabaseClient()
    
    const { data, error } = await executeQuery(async () =>
      supabase
        .from('project_types')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true })
    )
    
    if (error) {
      console.error('Error fetching project types:', error)
      // إرجاع الأنواع الافتراضية في حالة الخطأ
      return DEFAULT_PROJECT_TYPES
    }
    
    return (data as ProjectType[]) || DEFAULT_PROJECT_TYPES
  } catch (error) {
    console.error('Error fetching project types:', error)
    return DEFAULT_PROJECT_TYPES
  }
}

/**
 * جلب أسماء أنواع المشاريع فقط (للاستخدام في القوائم المنسدلة)
 */
export async function getProjectTypeNames(): Promise<string[]> {
  try {
    const types = await getAllProjectTypes()
    return types.map(t => t.name)
  } catch (error) {
    console.error('Error fetching project type names:', error)
    return DEFAULT_PROJECT_TYPES.map(t => t.name)
  }
}

/**
 * إضافة نوع مشروع جديد
 */
export async function addProjectType(projectType: Omit<ProjectType, 'id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; error?: string; data?: ProjectType }> {
  try {
    const supabase = getSupabaseClient()
    
    // تحقق من عدم وجود نوع بنفس الاسم
    const { data: existing } = await executeQuery(async () =>
      supabase
        .from('project_types')
        .select('id')
        .eq('name', projectType.name)
        .single()
    )
    
    if (existing) {
      return { success: false, error: 'Project type with this name already exists' }
    }
    
    // أضف النوع الجديد
    const { data, error } = await executeQuery(async () =>
      (supabase as any)
        .from('project_types')
        .insert([{
          ...projectType,
          usage_count: 0
        }])
        .select()
        .single()
    )
    
    if (error) {
      console.error('Error adding project type:', error)
      return { success: false, error: error.message }
    }
    
    console.log('✅ Project type added successfully:', data)
    return { success: true, data: data as unknown as ProjectType }
  } catch (error: any) {
    console.error('Error adding project type:', error)
    return { success: false, error: error.message }
  }
}

/**
 * تحديث نوع مشروع
 */
export async function updateProjectType(id: string, updates: Partial<ProjectType>): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient()
    
    const { error } = await executeQuery(async () =>
      (supabase as any)
        .from('project_types')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
    )
    
    if (error) {
      console.error('Error updating project type:', error)
      return { success: false, error: error.message }
    }
    
    console.log('✅ Project type updated successfully')
    return { success: true }
  } catch (error: any) {
    console.error('Error updating project type:', error)
    return { success: false, error: error.message }
  }
}

/**
 * حذف (تعطيل) نوع مشروع
 */
export async function deleteProjectType(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient()
    
    // تعطيل بدلاً من الحذف للحفاظ على البيانات التاريخية
    const { error } = await executeQuery(async () =>
      (supabase as any)
        .from('project_types')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
    )
    
    if (error) {
      console.error('Error deleting project type:', error)
      return { success: false, error: error.message }
    }
    
    console.log('✅ Project type deactivated successfully')
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting project type:', error)
    return { success: false, error: error.message }
  }
}

/**
 * زيادة عداد الاستخدام عند استخدام النوع في مشروع
 */
export async function incrementProjectTypeUsage(projectTypeName: string): Promise<void> {
  try {
    const supabase = getSupabaseClient()
    
    // جلب النوع الحالي
    const { data: projectType } = await executeQuery(async () =>
      supabase
        .from('project_types')
        .select('id, usage_count')
        .eq('name', projectTypeName)
        .single()
    )
    
    if (projectType) {
      // زيادة العداد
      await executeQuery(async () =>
        (supabase as any)
          .from('project_types')
          .update({ 
            usage_count: ((projectType as any).usage_count || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', (projectType as any).id)
      )
    }
  } catch (error) {
    console.error('Error incrementing project type usage:', error)
  }
}

/**
 * البحث عن أنواع المشاريع
 */
export async function searchProjectTypes(searchTerm: string): Promise<ProjectType[]> {
  try {
    if (!searchTerm) return await getAllProjectTypes()
    
    const supabase = getSupabaseClient()
    
    const { data, error } = await executeQuery(async () =>
      supabase
        .from('project_types')
        .select('*')
        .eq('is_active', true)
        .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .order('name', { ascending: true })
    )
    
    if (error) {
      console.error('Error searching project types:', error)
      return []
    }
    
    return (data as ProjectType[]) || []
  } catch (error) {
    console.error('Error searching project types:', error)
    return []
  }
}

