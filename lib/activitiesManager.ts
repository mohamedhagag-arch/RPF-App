import { getSupabaseClient, executeQuery } from './simpleConnectionManager'

export interface Activity {
  id: string
  name: string
  division: string
  unit: string
  category?: string
  description?: string
  typical_duration?: number
  is_active: boolean
  usage_count: number
  created_at: string
  updated_at: string
}

export interface ActivityStats {
  division_name: string
  activities_count: number
  total_usage: number
}

// الحصول على جميع الأنشطة
export async function getAllActivities(): Promise<Activity[]> {
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await executeQuery(async () =>
      supabase
        .from('activities')
        .select('*')
        .eq('is_active', true)
        .order('usage_count', { ascending: false })
    )

    if (error) throw error
    return data as Activity[]
  } catch (error) {
    console.error('Error fetching activities:', error)
    return []
  }
}

// الحصول على الأنشطة حسب القسم
export async function getActivitiesByDivision(division: string): Promise<Activity[]> {
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await executeQuery(async () =>
      supabase
        .from('activities')
        .select('*')
        .eq('division', division)
        .eq('is_active', true)
        .order('usage_count', { ascending: false })
    )

    if (error) throw error
    return data as Activity[]
  } catch (error) {
    console.error('Error fetching activities by division:', error)
    return []
  }
}

// الحصول على الأنشطة حسب الفئة
export async function getActivitiesByCategory(category: string): Promise<Activity[]> {
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await executeQuery(async () =>
      supabase
        .from('activities')
        .select('*')
        .eq('category', category)
        .eq('is_active', true)
        .order('usage_count', { ascending: false })
    )

    if (error) throw error
    return data as Activity[]
  } catch (error) {
    console.error('Error fetching activities by category:', error)
    return []
  }
}

// البحث في الأنشطة
export async function searchActivities(query: string): Promise<Activity[]> {
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await executeQuery(async () =>
      supabase
        .from('activities')
        .select('*')
        .ilike('name', `%${query}%`)
        .eq('is_active', true)
        .order('usage_count', { ascending: false })
        .limit(20)
    )

    if (error) throw error
    return data as Activity[]
  } catch (error) {
    console.error('Error searching activities:', error)
    return []
  }
}

// إضافة نشاط جديد
export async function addActivity(activity: Omit<Activity, 'id' | 'created_at' | 'updated_at' | 'usage_count'>): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient()
    const { error } = await executeQuery(async () =>
      supabase
        .from('activities')
        .insert(activity as any)
    )

    if (error) throw error
    return { success: true }
  } catch (error: any) {
    console.error('Error adding activity:', error)
    return { success: false, error: error.message }
  }
}

// تحديث نشاط
export async function updateActivity(id: string, updates: Partial<Activity>): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient()
    const { error } = await executeQuery(async () => {
      const result = await supabase
        .from('activities')
        // @ts-ignore
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
      return result
    })

    if (error) throw error
    return { success: true }
  } catch (error: any) {
    console.error('Error updating activity:', error)
    return { success: false, error: error.message }
  }
}

// حذف نشاط (تعطيل)
export async function deleteActivity(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient()
    const { error } = await executeQuery(async () => {
      const result = await supabase
        .from('activities')
        // @ts-ignore
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id)
      return result
    })

    if (error) throw error
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting activity:', error)
    return { success: false, error: error.message }
  }
}

// زيادة عداد الاستخدام
export async function incrementActivityUsage(
  activityName: string, 
  projectType?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient()
    // ✅ Use the correct unified function name with both parameters
    // The database function expects: p_activity_name and p_project_type
    const params: any = { 
      p_activity_name: activityName 
    }
    
    // Only include project_type if provided
    if (projectType && projectType.trim() !== '') {
      params.p_project_type = projectType.trim()
    }
    
    const { error } = await executeQuery(async () =>
      supabase.rpc('increment_activity_usage_unified', params)
    )

    if (error) throw error
    return { success: true }
  } catch (error: any) {
    console.error('Error incrementing activity usage:', error)
    return { success: false, error: error.message }
  }
}

// الحصول على إحصائيات الأنشطة
export async function getActivityStats(): Promise<ActivityStats[]> {
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await executeQuery(async () =>
      supabase.rpc('get_activity_stats')
    )

    if (error) throw error
    return (data || []) as ActivityStats[]
  } catch (error) {
    console.error('Error fetching activity stats:', error)
    return []
  }
}

// الحصول على أسماء الأنشطة فقط
export async function getActivityNames(): Promise<string[]> {
  try {
    const activities = await getAllActivities()
    return activities.map(activity => activity.name)
  } catch (error) {
    console.error('Error fetching activity names:', error)
    return []
  }
}

// الحصول على الأنشطة المقترحة حسب نوع المشروع
export async function getSuggestedActivities(projectType: string): Promise<Activity[]> {
  try {
    const allActivities = await getAllActivities()
    
    // فلترة الأنشطة حسب نوع المشروع
    const filteredActivities = allActivities.filter(activity => {
      const activityName = activity.name.toLowerCase()
      const activityCategory = activity.category?.toLowerCase() || ''
      const projectTypeLower = projectType.toLowerCase()
      
      // منطق التطابق
      if (projectTypeLower.includes('infrastructure') || projectTypeLower.includes('infra')) {
        return activityName.includes('infrastructure') || 
               activityName.includes('civil') || 
               activityName.includes('utilities') ||
               activityName.includes('road') ||
               activityName.includes('bridge') ||
               activityName.includes('pipeline') ||
               activityName.includes('drainage') ||
               activityCategory.includes('infrastructure')
      }
      
      if (projectTypeLower.includes('building') || projectTypeLower.includes('construction')) {
        return activityName.includes('building') || 
               activityName.includes('construction') || 
               activityName.includes('structural') ||
               activityName.includes('architectural') ||
               activityName.includes('concrete') ||
               activityName.includes('steel') ||
               activityCategory.includes('building')
      }
      
      if (projectTypeLower.includes('marine')) {
        return activityName.includes('marine') || 
               activityName.includes('waterfront') || 
               activityName.includes('dredging') ||
               activityName.includes('breakwater') ||
               activityName.includes('quay') ||
               activityName.includes('jetty') ||
               activityCategory.includes('marine')
      }
      
      if (projectTypeLower.includes('road')) {
        return activityName.includes('road') || 
               activityName.includes('highway') || 
               activityName.includes('pavement') ||
               activityName.includes('asphalt') ||
               activityName.includes('concrete') ||
               activityCategory.includes('road')
      }
      
      if (projectTypeLower.includes('landscaping')) {
        return activityName.includes('landscaping') || 
               activityName.includes('irrigation') || 
               activityName.includes('planting') ||
               activityName.includes('hardscape') ||
               activityName.includes('garden') ||
               activityCategory.includes('landscaping')
      }
      
      if (projectTypeLower.includes('maintenance')) {
        return activityName.includes('maintenance') || 
               activityName.includes('repair') || 
               activityName.includes('cleaning') ||
               activityName.includes('inspection') ||
               activityCategory.includes('maintenance')
      }
      
      // إذا لم يطابق أي نوع، استخدم جميع الأنشطة
      return true
    })
    
    return filteredActivities
  } catch (error) {
    console.error('Error getting suggested activities:', error)
    return []
  }
}
