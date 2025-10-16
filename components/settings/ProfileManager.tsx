'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/app/providers'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { QRCodeGenerator } from '@/components/qr/QRCodeGenerator'
import {
  User,
  Mail,
  Phone,
  Briefcase,
  Building2,
  Save,
  RefreshCw,
  CheckCircle,
  XCircle,
  Camera,
  FileText,
  Info,
  QrCode
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

interface ProfileData {
  first_name: string
  last_name: string
  email: string
  department_id: string
  job_title_id: string
  phone_1: string
  phone_2: string
  about: string
  profile_picture_url: string
}

export function ProfileManager() {
  const { appUser } = useAuth()
  const supabase = getSupabaseClient()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const [departments, setDepartments] = useState<Department[]>([])
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([])
  
  const [profileData, setProfileData] = useState<ProfileData>({
    first_name: '',
    last_name: '',
    email: '',
    department_id: '',
    job_title_id: '',
    phone_1: '',
    phone_2: '',
    about: '',
    profile_picture_url: ''
  })

  useEffect(() => {
    loadProfileData()
    loadDepartments()
    loadJobTitles()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadProfileData = async () => {
    if (!appUser?.id) return

    try {
      setLoading(true)
      setError('')

      const { data, error: fetchError } = await (supabase as any)
        .from('users')
        .select(`
          *,
          department:departments(id, name_en, name_ar),
          job_title:job_titles(id, title_en, title_ar)
        `)
        .eq('id', appUser.id)
        .single()

      if (fetchError) throw fetchError

      if (data) {
        setProfileData({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          email: data.email || appUser.email || '',
          department_id: data.department_id || '',
          job_title_id: data.job_title_id || '',
          phone_1: data.phone_1 || '',
          phone_2: data.phone_2 || '',
          about: data.about || '',
          profile_picture_url: data.profile_picture_url || ''
        })
      }
    } catch (error: any) {
      console.error('Error loading profile:', error)
      setError('Failed to load profile data')
    } finally {
      setLoading(false)
    }
  }

  const loadDepartments = async () => {
    try {
      const { data, error: fetchError } = await (supabase as any)
        .from('departments')
        .select('*')
        .eq('is_active', true)
        .order('display_order')

      if (fetchError) throw fetchError
      setDepartments(data || [])
    } catch (error: any) {
      console.error('Error loading departments:', error)
    }
  }

  const loadJobTitles = async () => {
    try {
      const { data, error: fetchError } = await (supabase as any)
        .from('job_titles')
        .select('*')
        .eq('is_active', true)
        .order('display_order')

      if (fetchError) throw fetchError
      setJobTitles(data || [])
    } catch (error: any) {
      console.error('Error loading job titles:', error)
    }
  }

  const handleSave = async () => {
    if (!appUser?.id) return

    try {
      setSaving(true)
      setError('')

      // Validate required fields
      if (!profileData.first_name || !profileData.last_name) {
        setError('First name and last name are required')
        return
      }

      // Update profile using the RPC function
      const { error: updateError } = await (supabase as any)
        .rpc('update_user_profile', {
          user_id: appUser.id,
          p_first_name: profileData.first_name,
          p_last_name: profileData.last_name,
          p_department_id: profileData.department_id || null,
          p_job_title_id: profileData.job_title_id || null,
          p_phone_1: profileData.phone_1 || null,
          p_phone_2: profileData.phone_2 || null,
          p_about: profileData.about || null,
          p_profile_picture_url: profileData.profile_picture_url || null
        })

      if (updateError) throw updateError

      setSuccess('Profile updated successfully')
      setTimeout(() => setSuccess(''), 3000)
      
      // Reload profile data
      await loadProfileData()
    } catch (error: any) {
      console.error('Error saving profile:', error)
      setError('Failed to save profile: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const hasChanges = () => {
    // Check if there are any changes
    return true // Simplified for now
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Profile Settings</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your personal information and contact details
          </p>
        </div>
        <Button
          variant="outline"
          onClick={loadProfileData}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="error">
          <XCircle className="h-4 w-4" />
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert variant="success">
          <CheckCircle className="h-4 w-4" />
          {success}
        </Alert>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Profile Picture */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Camera className="h-5 w-5" />
                <span>Profile Picture</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-6">
                <div className="h-24 w-24 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold relative">
                  {profileData.profile_picture_url ? (
                    <img
                      src={profileData.profile_picture_url}
                      alt="Profile Picture"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to initials if image fails to load
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        const parent = target.parentElement
                        if (parent) {
                          parent.innerHTML = `${profileData.first_name?.[0] || 'U'}${profileData.last_name?.[0] || ''}`
                          parent.className = 'h-24 w-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold'
                        }
                      }}
                    />
                  ) : (
                    `${profileData.first_name?.[0] || 'U'}${profileData.last_name?.[0] || ''}`
                  )}
                </div>
                <div className="flex-1">
                  <Input
                    type="url"
                    placeholder="Profile picture URL"
                    value={profileData.profile_picture_url}
                    onChange={(e) => setProfileData(prev => ({ ...prev, profile_picture_url: e.target.value }))}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter a URL for your profile picture
                  </p>
                  {profileData.profile_picture_url && (
                    <div className="mt-2">
                      <p className="text-xs text-green-600 dark:text-green-400 mb-1">
                        Preview:
                      </p>
                      <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                        <img
                          src={profileData.profile_picture_url}
                          alt="Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* QR Code */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <QrCode className="h-5 w-5" />
                <span>Contact QR Code</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <QRCodeGenerator
                userData={{
                  id: appUser?.id || '',
                  first_name: profileData.first_name,
                  last_name: profileData.last_name,
                  email: profileData.email,
                  phone_1: profileData.phone_1,
                  phone_2: profileData.phone_2,
                  department_name_en: departments.find(d => d.id === profileData.department_id)?.name_en || '',
                  job_title_en: jobTitles.find(j => j.id === profileData.job_title_id)?.title_en || '',
                  about: profileData.about,
                  profile_picture_url: profileData.profile_picture_url
                }}
                size={200}
                showControls={true}
                showVCardInfo={true}
              />
            </CardContent>
          </Card>

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Basic Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* First Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="Enter first name"
                    value={profileData.first_name}
                    onChange={(e) => setProfileData(prev => ({ ...prev, first_name: e.target.value }))}
                    required
                  />
                </div>

                {/* Last Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="Enter last name"
                    value={profileData.last_name}
                    onChange={(e) => setProfileData(prev => ({ ...prev, last_name: e.target.value }))}
                    required
                  />
                </div>

                {/* Email (Read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="email"
                      value={profileData.email}
                      disabled
                      className="pl-10 bg-gray-50 dark:bg-gray-800"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Email cannot be changed
                  </p>
                </div>

                {/* Phone 1 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Primary Phone
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="tel"
                      placeholder="+966 XXX XXX XXXX"
                      value={profileData.phone_1}
                      onChange={(e) => setProfileData(prev => ({ ...prev, phone_1: e.target.value }))}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Phone 2 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Secondary Phone (Optional)
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="tel"
                      placeholder="+966 XXX XXX XXXX"
                      value={profileData.phone_2}
                      onChange={(e) => setProfileData(prev => ({ ...prev, phone_2: e.target.value }))}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Organization Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building2 className="h-5 w-5" />
                <span>Organization Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Department */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Department
                  </label>
                  <select
                    value={profileData.department_id}
                    onChange={(e) => setProfileData(prev => ({ ...prev, department_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name_en} / {dept.name_ar}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Job Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Job Title
                  </label>
                  <select
                    value={profileData.job_title_id}
                    onChange={(e) => setProfileData(prev => ({ ...prev, job_title_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="">Select Job Title</option>
                    {jobTitles.map((title) => (
                      <option key={title.id} value={title.id}>
                        {title.title_en} / {title.title_ar}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* About/Bio */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>About Me</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                placeholder="Tell us about yourself, your experience, and your role..."
                value={profileData.about}
                onChange={(e) => setProfileData(prev => ({ ...prev, about: e.target.value }))}
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                Maximum 500 characters
              </p>
            </CardContent>
          </Card>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                  Department and Job Title Management
                </h3>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Department and job title options are managed by administrators. If you need to add a new department or job title, please contact your system administrator.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              <span className="text-red-500">*</span> Required fields
            </div>
            
            <Button
              onClick={handleSave}
              disabled={saving || !profileData.first_name || !profileData.last_name}
            >
              {saving ? (
                <LoadingSpinner size="sm" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
