import { getSupabaseClient } from './simpleConnectionManager'

export interface ProfileCompletionStatus {
  isComplete: boolean
  missingFields: string[]
  completionPercentage: number
}

/**
 * Check if user profile is complete
 */
export async function checkProfileCompletion(userId: string): Promise<ProfileCompletionStatus> {
  try {
    const supabase = getSupabaseClient()
    
    // Get user profile data
    const { data: user, error } = await supabase
      .from('users')
      .select('first_name, last_name, department_id, job_title_id, phone_1')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error checking profile completion:', error)
      return {
        isComplete: false,
        missingFields: ['all'],
        completionPercentage: 0
      }
    }

    const requiredFields = [
      { key: 'first_name', label: 'First Name' },
      { key: 'last_name', label: 'Last Name' },
      { key: 'department_id', label: 'Department' },
      { key: 'job_title_id', label: 'Job Title' },
      { key: 'phone_1', label: 'Primary Phone' }
    ]

    const missingFields: string[] = []
    
    requiredFields.forEach(field => {
      const value = user[field.key]
      if (!value || (typeof value === 'string' && (value as string).trim() === '')) {
        missingFields.push(field.label)
      }
    })

    const completionPercentage = Math.round(((requiredFields.length - missingFields.length) / requiredFields.length) * 100)
    const isComplete = missingFields.length === 0

    return {
      isComplete,
      missingFields,
      completionPercentage
    }
  } catch (error) {
    console.error('Error in checkProfileCompletion:', error)
    return {
      isComplete: false,
      missingFields: ['all'],
      completionPercentage: 0
    }
  }
}

/**
 * Check if user has departments and job titles available
 */
export async function checkDepartmentsAndJobTitlesAvailability(): Promise<{
  hasDepartments: boolean
  hasJobTitles: boolean
}> {
  try {
    const supabase = getSupabaseClient()
    
    // Check departments
    const { data: deptData, error: deptError } = await supabase
      .from('departments')
      .select('id')
      .eq('is_active', true)
      .limit(1)

    // Check job titles
    const { data: jobData, error: jobError } = await supabase
      .from('job_titles')
      .select('id')
      .eq('is_active', true)
      .limit(1)

    return {
      hasDepartments: !deptError && deptData && deptData.length > 0,
      hasJobTitles: !jobError && jobData && jobData.length > 0
    }
  } catch (error) {
    console.error('Error checking departments and job titles:', error)
    return {
      hasDepartments: false,
      hasJobTitles: false
    }
  }
}

/**
 * Get profile completion statistics for admin dashboard
 */
export async function getProfileCompletionStats(): Promise<{
  totalUsers: number
  completedProfiles: number
  incompleteProfiles: number
  completionRate: number
  missingFieldsStats: Record<string, number>
}> {
  try {
    const supabase = getSupabaseClient()
    
    // Get all users
    const { data: users, error } = await supabase
      .from('users')
      .select('first_name, last_name, department_id, job_title_id, phone_1')
      .not('role', 'eq', 'admin') // Exclude admin users from stats

    if (error) {
      throw error
    }

    const totalUsers = users.length
    let completedProfiles = 0
    const missingFieldsStats: Record<string, number> = {
      'First Name': 0,
      'Last Name': 0,
      'Department': 0,
      'Job Title': 0,
      'Primary Phone': 0
    }

    users.forEach(user => {
      const requiredFields = [
        { key: 'first_name', label: 'First Name' },
        { key: 'last_name', label: 'Last Name' },
        { key: 'department_id', label: 'Department' },
        { key: 'job_title_id', label: 'Job Title' },
        { key: 'phone_1', label: 'Primary Phone' }
      ]

      let isComplete = true
      
      requiredFields.forEach(field => {
        const value = user[field.key]
        if (!value || (typeof value === 'string' && (value as string).trim() === '')) {
          missingFieldsStats[field.label]++
          isComplete = false
        }
      })

      if (isComplete) {
        completedProfiles++
      }
    })

    const incompleteProfiles = totalUsers - completedProfiles
    const completionRate = totalUsers > 0 ? Math.round((completedProfiles / totalUsers) * 100) : 0

    return {
      totalUsers,
      completedProfiles,
      incompleteProfiles,
      completionRate,
      missingFieldsStats
    }
  } catch (error) {
    console.error('Error getting profile completion stats:', error)
    return {
      totalUsers: 0,
      completedProfiles: 0,
      incompleteProfiles: 0,
      completionRate: 0,
      missingFieldsStats: {}
    }
  }
}
