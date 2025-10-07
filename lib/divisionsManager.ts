/**
 * Divisions Manager
 * إدارة الأقسام (Divisions) في Supabase مع إمكانية الإضافة والتعديل
 */

import { getSupabaseClient, executeQuery } from './simpleConnectionManager'

export interface Division {
  id?: string
  name: string
  code?: string
  description?: string
  is_active: boolean
  created_at?: string
  updated_at?: string
  usage_count?: number
}

// الأقسام الافتراضية
export const DEFAULT_DIVISIONS: Division[] = [
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
    code: 'INF',
    description: 'Infrastructure and utilities',
    is_active: true
  },
  {
    name: 'Marine Division',
    code: 'MAR',
    description: 'Marine and waterfront works',
    is_active: true
  }
]

/**
 * تهيئة جدول الأقسام في Supabase
 */
export async function initializeDivisionsTable(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient()
    
    // تحقق من وجود الجدول
    const { data: existingDivisions } = await executeQuery(async () =>
      supabase
        .from('divisions')
        .select('id')
        .limit(1)
    )
    
    // إذا كان الجدول فارغًا، أضف الأقسام الافتراضية
    if (!existingDivisions || (existingDivisions as any[]).length === 0) {
      const { error } = await executeQuery(async () =>
        supabase
          .from('divisions')
          .insert(DEFAULT_DIVISIONS as any)
      )
      
      if (error) {
        console.error('Error initializing divisions:', error)
        return { success: false, error: error.message }
      }
      
      console.log('✅ Divisions table initialized with default divisions')
    }
    
    return { success: true }
  } catch (error: any) {
    console.error('Error initializing divisions table:', error)
    return { success: false, error: error.message }
  }
}

/**
 * جلب جميع الأقسام النشطة
 */
export async function getAllDivisions(): Promise<Division[]> {
  try {
    const supabase = getSupabaseClient()
    
    const { data, error } = await executeQuery(async () =>
      supabase
        .from('divisions')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true })
    )
    
    if (error) {
      console.error('Error fetching divisions:', error)
      // إرجاع الأقسام الافتراضية في حالة الخطأ
      return DEFAULT_DIVISIONS
    }
    
    return (data as Division[]) || DEFAULT_DIVISIONS
  } catch (error) {
    console.error('Error fetching divisions:', error)
    return DEFAULT_DIVISIONS
  }
}

/**
 * جلب أسماء الأقسام فقط (للاستخدام في القوائم المنسدلة)
 */
export async function getDivisionNames(): Promise<string[]> {
  try {
    const divisions = await getAllDivisions()
    return divisions.map(d => d.name)
  } catch (error) {
    console.error('Error fetching division names:', error)
    return DEFAULT_DIVISIONS.map(d => d.name)
  }
}

/**
 * إضافة قسم جديد
 */
export async function addDivision(division: Omit<Division, 'id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; error?: string; data?: Division }> {
  try {
    const supabase = getSupabaseClient()
    
    // تحقق من عدم وجود قسم بنفس الاسم
    const { data: existing } = await executeQuery(async () =>
      supabase
        .from('divisions')
        .select('id')
        .eq('name', division.name)
        .single()
    )
    
    if (existing) {
      return { success: false, error: 'Division with this name already exists' }
    }
    
    // أضف القسم الجديد
    const { data, error } = await executeQuery(async () =>
      (supabase as any)
        .from('divisions')
        .insert([{
          ...division,
          usage_count: 0
        }])
        .select()
        .single()
    )
    
    if (error) {
      console.error('Error adding division:', error)
      return { success: false, error: error.message }
    }
    
    console.log('✅ Division added successfully:', data)
    return { success: true, data: data as unknown as Division }
  } catch (error: any) {
    console.error('Error adding division:', error)
    return { success: false, error: error.message }
  }
}

/**
 * تحديث قسم
 */
export async function updateDivision(id: string, updates: Partial<Division>): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient()
    
    const { error } = await executeQuery(async () =>
      (supabase as any)
        .from('divisions')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
    )
    
    if (error) {
      console.error('Error updating division:', error)
      return { success: false, error: error.message }
    }
    
    console.log('✅ Division updated successfully')
    return { success: true }
  } catch (error: any) {
    console.error('Error updating division:', error)
    return { success: false, error: error.message }
  }
}

/**
 * حذف (تعطيل) قسم
 */
export async function deleteDivision(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient()
    
    // تعطيل بدلاً من الحذف للحفاظ على البيانات التاريخية
    const { error } = await executeQuery(async () =>
      (supabase as any)
        .from('divisions')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
    )
    
    if (error) {
      console.error('Error deleting division:', error)
      return { success: false, error: error.message }
    }
    
    console.log('✅ Division deactivated successfully')
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting division:', error)
    return { success: false, error: error.message }
  }
}

/**
 * زيادة عداد الاستخدام عند استخدام القسم في مشروع
 */
export async function incrementDivisionUsage(divisionName: string): Promise<void> {
  try {
    const supabase = getSupabaseClient()
    
    // جلب القسم الحالي
    const { data: division } = await executeQuery(async () =>
      supabase
        .from('divisions')
        .select('id, usage_count')
        .eq('name', divisionName)
        .single()
    )
    
    if (division) {
      // زيادة العداد
      await executeQuery(async () =>
        (supabase as any)
          .from('divisions')
          .update({ 
            usage_count: ((division as any).usage_count || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', (division as any).id)
      )
    }
  } catch (error) {
    console.error('Error incrementing division usage:', error)
  }
}

/**
 * البحث عن الأقسام
 */
export async function searchDivisions(searchTerm: string): Promise<Division[]> {
  try {
    if (!searchTerm) return await getAllDivisions()
    
    const supabase = getSupabaseClient()
    
    const { data, error } = await executeQuery(async () =>
      supabase
        .from('divisions')
        .select('*')
        .eq('is_active', true)
        .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .order('name', { ascending: true })
    )
    
    if (error) {
      console.error('Error searching divisions:', error)
      return []
    }
    
    return (data as Division[]) || []
  } catch (error) {
    console.error('Error searching divisions:', error)
    return []
  }
}

