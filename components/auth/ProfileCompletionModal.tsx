'use client'

import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import {
  User,
  Mail,
  Phone,
  Building,
  Briefcase,
  FileText,
  Save,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info
} from 'lucide-react'

interface Department {
  id: string
  name_en: string
  name_ar: string
  is_active: boolean
}

interface JobTitle {
  id: string
  title_en: string
  title_ar: string
  is_active: boolean
}

interface ProfileCompletionModalProps {
  isOpen: boolean
  onComplete: () => void
  userId: string
  userEmail: string
}

export function ProfileCompletionModal({ isOpen, onComplete, userId, userEmail }: ProfileCompletionModalProps) {
  const supabase = getSupabaseClient()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const [departments, setDepartments] = useState<Department[]>([])
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([])
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    department_id: '',
    job_title_id: '',
    phone_1: '',
    phone_2: '',
    about: ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (isOpen) {
      loadDepartmentsAndJobTitles()
      loadUserData()
    }
  }, [isOpen])

  const loadUserData = async () => {
    try {
      // Load user data from public.users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('first_name, last_name, phone_1, department_id, job_title_id, about')
        .eq('id', userId)
        .single()

      if (userError) {
        console.error('Error loading user data:', userError)
        return
      }

      // Update form data with existing user data
      setFormData(prev => ({
        ...prev,
        first_name: (userData as any)?.first_name || '',
        last_name: (userData as any)?.last_name || '',
        phone_1: (userData as any)?.phone_1 || '',
        department_id: (userData as any)?.department_id || '',
        job_title_id: (userData as any)?.job_title_id || '',
        about: (userData as any)?.about || ''
      }))
    } catch (error: any) {
      console.error('Error loading user data:', error)
    }
  }

  const loadDepartmentsAndJobTitles = async () => {
    try {
      setLoading(true)
      
      // Load departments
      const { data: deptData, error: deptError } = await (supabase as any)
        .from('departments')
        .select('*')
        .eq('is_active', true)
        .order('display_order')

      if (deptError) throw deptError
      setDepartments(deptData || [])

      // Load job titles
      const { data: jobData, error: jobError } = await (supabase as any)
        .from('job_titles')
        .select('*')
        .eq('is_active', true)
        .order('display_order')

      if (jobError) throw jobError
      setJobTitles(jobData || [])
    } catch (error: any) {
      console.error('Error loading departments and job titles:', error)
      setError('Failed to load form data')
    } finally {
      setLoading(false)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required'
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required'
    }

    if (!formData.department_id) {
      newErrors.department_id = 'Please select your department'
    }

    if (!formData.job_title_id) {
      newErrors.job_title_id = 'Please select your job title'
    }

    if (!formData.phone_1.trim()) {
      newErrors.phone_1 = 'Primary phone number is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      setSaving(true)
      setError('')

      // Update user profile
      const { error: updateError } = await (supabase as any)
        .rpc('update_user_profile', {
          user_id: userId,
          p_first_name: formData.first_name,
          p_last_name: formData.last_name,
          p_department_id: formData.department_id,
          p_job_title_id: formData.job_title_id,
          p_phone_1: formData.phone_1,
          p_phone_2: formData.phone_2 || null,
          p_about: formData.about || null,
          p_profile_picture_url: null
        })

      if (updateError) throw updateError

      setSuccess('Profile completed successfully!')
      setTimeout(() => {
        onComplete()
      }, 1500)
      
    } catch (error: any) {
      console.error('Error completing profile:', error)
      setError('Failed to complete profile: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-lg">
          <div className="flex items-center space-x-3">
            <div className="bg-white bg-opacity-20 p-2 rounded-lg">
              <User className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Complete Your Profile</h2>
              <p className="text-blue-100 text-sm">Please fill in your information to continue</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Welcome Message */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                  Welcome to AlRabat RPF!
                </h3>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  To provide you with the best experience, please complete your profile information. 
                  This will help us personalize your workspace and connect you with the right team members.
                </p>
              </div>
            </div>
          </div>

          {/* Alerts */}
          {error && (
            <Alert variant="error" className="mb-4">
              <XCircle className="h-4 w-4" />
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert variant="success" className="mb-4">
              <CheckCircle className="h-4 w-4" />
              {success}
            </Alert>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
              <span className="ml-3 text-gray-600 dark:text-gray-400">Loading form...</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* First Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="Enter your first name"
                    value={formData.first_name}
                    onChange={(e) => handleInputChange('first_name', e.target.value)}
                    className={errors.first_name ? 'border-red-500' : ''}
                    required
                  />
                  {errors.first_name && (
                    <p className="text-red-500 text-xs mt-1">{errors.first_name}</p>
                  )}
                </div>

                {/* Last Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="Enter your last name"
                    value={formData.last_name}
                    onChange={(e) => handleInputChange('last_name', e.target.value)}
                    className={errors.last_name ? 'border-red-500' : ''}
                    required
                  />
                  {errors.last_name && (
                    <p className="text-red-500 text-xs mt-1">{errors.last_name}</p>
                  )}
                </div>

                {/* Email (Read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="email"
                      value={userEmail}
                      disabled
                      className="pl-10 bg-gray-50 dark:bg-gray-800"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">This email was used for registration</p>
                </div>

                {/* Primary Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Primary Phone <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="tel"
                      placeholder="+966 XXX XXX XXXX"
                      value={formData.phone_1}
                      onChange={(e) => handleInputChange('phone_1', e.target.value)}
                      className={`pl-10 ${errors.phone_1 ? 'border-red-500' : ''}`}
                      required
                    />
                  </div>
                  {errors.phone_1 && (
                    <p className="text-red-500 text-xs mt-1">{errors.phone_1}</p>
                  )}
                </div>
              </div>

              {/* Organization Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Department */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.department_id}
                    onChange={(e) => handleInputChange('department_id', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                      errors.department_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    required
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name_en} / {dept.name_ar}
                      </option>
                    ))}
                  </select>
                  {errors.department_id && (
                    <p className="text-red-500 text-xs mt-1">{errors.department_id}</p>
                  )}
                </div>

                {/* Job Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Job Title <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.job_title_id}
                    onChange={(e) => handleInputChange('job_title_id', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                      errors.job_title_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    required
                  >
                    <option value="">Select Job Title</option>
                    {jobTitles.map((title) => (
                      <option key={title.id} value={title.id}>
                        {title.title_en} / {title.title_ar}
                      </option>
                    ))}
                  </select>
                  {errors.job_title_id && (
                    <p className="text-red-500 text-xs mt-1">{errors.job_title_id}</p>
                  )}
                </div>
              </div>

              {/* Optional Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Secondary Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Secondary Phone (Optional)
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="tel"
                      placeholder="+966 XXX XXX XXXX"
                      value={formData.phone_2}
                      onChange={(e) => handleInputChange('phone_2', e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              {/* About */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  About Me (Optional)
                </label>
                <textarea
                  placeholder="Tell us about yourself, your experience, and your role..."
                  value={formData.about}
                  onChange={(e) => handleInputChange('about', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This information will be visible to your team members
                </p>
              </div>

              {/* Required Fields Note */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-800 dark:text-yellow-200">
                    <span className="font-medium">Required fields:</span> First Name, Last Name, Department, Job Title, and Primary Phone are required to complete your profile.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {saving ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Complete Profile
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
