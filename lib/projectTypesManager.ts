/**
 * Project Scopes Manager
 * إدارة نطاقات المشاريع (Project Scopes) في Supabase مع إمكانية الإضافة والتعديل
 */

import { getSupabaseClient, executeQuery } from './simpleConnectionManager'

export interface ProjectScope {
  id?: string
  name: string
  code?: string
  description?: string
  is_active: boolean
  created_at?: string
  updated_at?: string
  usage_count?: number
}

// نطاقات المشاريع الافتراضية
export const DEFAULT_PROJECT_SCOPES: ProjectScope[] = [
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
 * تهيئة جدول نطاقات المشاريع في Supabase
 */
export async function initializeProjectScopesTable(): Promise<{ success: boolean; error?: string }> {
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
          .insert(DEFAULT_PROJECT_SCOPES)
      )
      
      if (error) {
        console.error('Error initializing project scopes:', error)
        return { success: false, error: error.message }
      }
      
      console.log('✅ Project scopes table initialized with default scopes')
    }
    
    return { success: true }
  } catch (error: any) {
    console.error('Error initializing project scopes table:', error)
    return { success: false, error: error.message }
  }
}

/**
 * جلب جميع نطاقات المشاريع النشطة
 */
export async function getAllProjectScopes(): Promise<ProjectScope[]> {
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
      console.error('Error fetching project scopes:', error)
      // إرجاع النطاقات الافتراضية في حالة الخطأ
      return DEFAULT_PROJECT_SCOPES
    }
    
    return (data as ProjectScope[]) || DEFAULT_PROJECT_SCOPES
  } catch (error) {
      console.error('Error fetching project scopes:', error)
      return DEFAULT_PROJECT_SCOPES
  }
}

/**
 * جلب أسماء نطاقات المشاريع فقط (للاستخدام في القوائم المنسدلة)
 */
export async function getProjectScopeNames(): Promise<string[]> {
  try {
    const scopes = await getAllProjectScopes()
    return scopes.map(t => t.name)
  } catch (error) {
    console.error('Error fetching project scope names:', error)
    return DEFAULT_PROJECT_SCOPES.map(t => t.name)
  }
}

/**
 * إضافة نطاق مشروع جديد
 */
export async function addProjectScope(projectScope: Omit<ProjectScope, 'id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; error?: string; data?: ProjectScope }> {
  try {
    const supabase = getSupabaseClient()
    
    // تحقق من عدم وجود نطاق بنفس الاسم
    const { data: existing } = await executeQuery(async () =>
      supabase
        .from('project_types')
        .select('id')
        .eq('name', projectScope.name)
        .single()
    )
    
    if (existing) {
      return { success: false, error: 'Project scope with this name already exists' }
    }
    
    // أضف النطاق الجديد
    const { data, error } = await executeQuery(async () =>
      (supabase as any)
        .from('project_types')
        .insert([{
          ...projectScope,
          usage_count: 0
        }])
        .select()
        .single()
    )
    
    if (error) {
      console.error('Error adding project scope:', error)
      return { success: false, error: error.message }
    }
    
    console.log('✅ Project scope added successfully:', data)
    return { success: true, data: data as unknown as ProjectScope }
  } catch (error: any) {
      console.error('Error adding project scope:', error)
    return { success: false, error: error.message }
  }
}

/**
 * تحديث نطاق مشروع
 */
export async function updateProjectScope(id: string, updates: Partial<ProjectScope>): Promise<{ success: boolean; error?: string }> {
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
      console.error('Error updating project scope:', error)
      return { success: false, error: error.message }
    }
    
    console.log('✅ Project scope updated successfully')
    return { success: true }
  } catch (error: any) {
      console.error('Error updating project scope:', error)
    return { success: false, error: error.message }
  }
}

/**
 * حذف (تعطيل) نطاق مشروع
 */
export async function deleteProjectScope(id: string): Promise<{ success: boolean; error?: string }> {
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
      console.error('Error deleting project scope:', error)
      return { success: false, error: error.message }
    }
    
    console.log('✅ Project scope deactivated successfully')
    return { success: true }
  } catch (error: any) {
      console.error('Error deleting project scope:', error)
    return { success: false, error: error.message }
  }
}

/**
 * زيادة عداد الاستخدام عند استخدام النطاق في مشروع
 */
export async function incrementProjectScopeUsage(projectScopeName: string): Promise<void> {
  try {
    const supabase = getSupabaseClient()
    
    // جلب النطاق الحالي
    const { data: projectType } = await executeQuery(async () =>
      supabase
        .from('project_types')
        .select('id, usage_count')
        .eq('name', projectScopeName)
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
      console.error('Error incrementing project scope usage:', error)
  }
}

/**
 * البحث عن نطاقات المشاريع
 */
export async function searchProjectScopes(searchTerm: string): Promise<ProjectScope[]> {
  try {
    if (!searchTerm) return await getAllProjectScopes()
    
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
      console.error('Error searching project scopes:', error)
      return []
    }
    
    return (data as ProjectScope[]) || []
  } catch (error) {
    console.error('Error searching project scopes:', error)
    return []
  }
}

