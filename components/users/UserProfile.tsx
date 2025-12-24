'use client'

import { useState, useEffect, useRef } from 'react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
import { useAuth } from '@/app/providers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  UserWithPermissions, 
  getUserPermissions, 
  generatePermissionsReport,
  getRoleDescription 
} from '@/lib/permissionsSystem'
import {
  User,
  Mail,
  Building,
  Shield,
  Calendar,
  Clock,
  Key,
  Edit,
  Save,
  X,
  CheckCircle,
  Lock,
  Eye,
  EyeOff,
  Activity,
  BarChart3,
  FileText,
  Settings,
  Briefcase,
  Phone,
  TrendingUp,
  Award,
  Target,
  Zap,
  Star,
  Globe,
  Download,
  Share2,
  QrCode,
  MessageCircle,
  PhoneCall,
  MapPin,
  ExternalLink,
  ArrowRight,
  Clock3,
  Users,
  FolderOpen,
  Bell,
  BellOff,
  Camera,
  Upload,
  Link as LinkIcon,
  Github,
  Linkedin,
  Twitter,
  Facebook,
  Instagram
} from 'lucide-react'
import { useRouter } from 'next/navigation'

export function UserProfile() {
  const guard = usePermissionGuard()
  const { user: authUser, appUser, refreshUserProfile } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const [activityStats, setActivityStats] = useState<any>(null)
  const [recentActivities, setRecentActivities] = useState<any[]>([])
  const [loadingActivities, setLoadingActivities] = useState(false)
  
  // Departments and Job Titles
  const [departments, setDepartments] = useState<any[]>([])
  const [jobTitles, setJobTitles] = useState<any[]>([])
  
  // Password change
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  
  // Form data
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    full_name: '',
    department_id: '',
    job_title_id: '',
    phone_1: '',
    phone_2: '',
    about: '',
    profile_picture_url: ''
  })

  const supabase = getSupabaseClient()

  useEffect(() => {
    loadUserProfile()
    loadDepartmentsAndJobTitles()
  }, [authUser])

  // Add refresh capability
  useEffect(() => {
    const handleFocus = () => {
      loadUserProfile()
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  const loadDepartmentsAndJobTitles = async () => {
    try {
      const { data: deptData, error: deptError } = await (supabase as any)
        .from('departments')
        .select('*')
        .eq('is_active', true)
        .order('display_order')

      if (deptError) throw deptError
      setDepartments(deptData || [])

      const { data: jobData, error: jobError } = await (supabase as any)
        .from('job_titles')
        .select('*')
        .eq('is_active', true)
        .order('display_order')

      if (jobError) throw jobError
      setJobTitles(jobData || [])
    } catch (error: any) {
      console.error('Error loading departments and job titles:', error)
    }
  }

  const loadUserProfile = async () => {
    try {
      setLoading(true)
      
      if (!authUser?.id) {
        setError('No authenticated user')
        return
      }

      const { data: user, error: userError } = await supabase
        .from('user_profiles_complete')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (userError) throw userError

      setUserData(user)
      setFormData({
        first_name: (user as any).first_name || '',
        last_name: (user as any).last_name || '',
        full_name: (user as any).full_name || '',
        department_id: (user as any).department_id || '',
        job_title_id: (user as any).job_title_id || '',
        phone_1: (user as any).phone_1 || '',
        phone_2: (user as any).phone_2 || '',
        about: (user as any).about || '',
        profile_picture_url: (user as any).profile_picture_url || ''
      })

      await loadActivityStats(authUser.id)
      await loadRecentActivities(authUser.id)
      await refreshUserProfile()
      
    } catch (error: any) {
      console.error('Error loading profile:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const loadActivityStats = async (userId: string) => {
    try {
      const userEmail = userData?.email || appUser?.email
      
      // Get user's created projects
      const { count: projectsCount } = await supabase
        .from('Planning Database - ProjectsList')
        .select('*', { count: 'exact', head: true })
        .eq('Created By User', userEmail)

      // Get user's created activities
      const { count: activitiesCount } = await supabase
        .from('Planning Database - BOQ Rates')
        .select('*', { count: 'exact', head: true })

      // Get user's KPI entries
      const { count: kpisCount } = await supabase
        .from('Planning Database - KPI')
        .select('*', { count: 'exact', head: true })
        .eq('Recorded By', userEmail)

      setActivityStats({
        projectsCreated: projectsCount || 0,
        activitiesCreated: activitiesCount || 0,
        kpisRecorded: kpisCount || 0,
        lastActivity: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error loading activity stats:', error)
    }
  }

  const loadRecentActivities = async (userId: string) => {
    try {
      setLoadingActivities(true)
      const userEmail = userData?.email || appUser?.email
      
      const { data, error } = await (supabase as any)
        .from('user_activities')
        .select('*')
        .eq('user_email', userEmail)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error
      setRecentActivities(data || [])
    } catch (error) {
      console.error('Error loading recent activities:', error)
    } finally {
      setLoadingActivities(false)
    }
  }

  const handleUpdateProfile = async () => {
    try {
      setSaving(true)
      setError('')
      setSuccess('')

      const { error: updateError } = await (supabase as any)
        .rpc('update_user_profile', {
          user_id: authUser?.id,
          p_first_name: formData.first_name,
          p_last_name: formData.last_name,
          p_department_id: formData.department_id || null,
          p_job_title_id: formData.job_title_id || null,
          p_phone_1: formData.phone_1 || null,
          p_phone_2: formData.phone_2 || null,
          p_about: formData.about || null,
          p_profile_picture_url: formData.profile_picture_url || null
        })

      if (updateError) throw updateError

      setSuccess('Profile updated successfully!')
      setEditMode(false)
      await loadUserProfile()
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    try {
      setError('')
      setSuccess('')

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setError('New passwords do not match')
        return
      }

      if (passwordData.newPassword.length < 6) {
        setError('Password must be at least 6 characters')
        return
      }

      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      })

      if (error) throw error

      setSuccess('Password changed successfully!')
      setShowPasswordChange(false)
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      setError(error.message)
    }
  }

  const getInitials = () => {
    if (userData?.first_name && userData?.last_name) {
      return `${userData.first_name[0]}${userData.last_name[0]}`.toUpperCase()
    }
    if (userData?.full_name) {
      const parts = userData.full_name.split(' ')
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      }
      return userData.full_name.substring(0, 2).toUpperCase()
    }
    return 'U'
  }

  const getRoleColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-700'
      case 'manager':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-700'
      case 'engineer':
        return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-700'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-300 border-gray-200 dark:border-gray-700'
    }
  }

  const getActivityIcon = (actionType: string) => {
    switch (actionType?.toLowerCase()) {
      case 'create':
        return <FileText className="h-4 w-4 text-green-600" />
      case 'update':
        return <Edit className="h-4 w-4 text-blue-600" />
      case 'delete':
        return <X className="h-4 w-4 text-red-600" />
      case 'view':
        return <Eye className="h-4 w-4 text-gray-600" />
      default:
        return <Activity className="h-4 w-4 text-purple-600" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!userData) {
    return (
      <Alert variant="error">
        Unable to load user profile
      </Alert>
    )
  }

  const userWithPerms = userData as UserWithPermissions
  const permissions = getUserPermissions(userWithPerms)
  const permissionsReport = generatePermissionsReport(userWithPerms)

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-8">
      {/* Profile Header - Modern & Professional */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 shadow-2xl">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
        
        <div className="relative px-8 py-12">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Avatar Section */}
            <div className="relative group">
              <div className="relative w-32 h-32 bg-gradient-to-br from-white/20 to-white/5 rounded-2xl flex items-center justify-center text-white text-4xl font-bold shadow-2xl ring-4 ring-white/20 backdrop-blur-sm overflow-hidden transition-transform duration-300 group-hover:scale-105">
                {userData.profile_picture_url ? (
                  <img
                    src={userData.profile_picture_url}
                    alt="Profile Picture"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                      const parent = target.parentElement
                      if (parent) {
                        parent.innerHTML = getInitials()
                        parent.className = 'relative w-32 h-32 bg-gradient-to-br from-white/20 to-white/5 rounded-2xl flex items-center justify-center text-white text-4xl font-bold shadow-2xl ring-4 ring-white/20 backdrop-blur-sm overflow-hidden transition-transform duration-300 group-hover:scale-105'
                      }
                    }}
                  />
                ) : (
                  getInitials()
                )}
              </div>
              {/* Online Status */}
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-full border-4 border-white dark:border-gray-900 shadow-lg flex items-center justify-center">
                <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
              </div>
              {/* Role Badge on Avatar */}
              <div className={`absolute -top-2 -right-2 px-3 py-1 rounded-full text-xs font-bold shadow-lg border-2 border-white ${getRoleColor(userData.role)}`}>
                {userData.role?.charAt(0).toUpperCase()}
              </div>
            </div>

            {/* User Info */}
            <div className="flex-1 text-white">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-bold drop-shadow-lg">
                  {userData.full_name || `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 'User'}
                </h1>
                <span className={`px-4 py-1.5 rounded-full text-sm font-semibold shadow-lg border-2 border-white/30 ${getRoleColor(userData.role)}`}>
                  <Shield className="h-4 w-4 inline mr-1.5" />
                  {userData.role?.charAt(0).toUpperCase() + userData.role?.slice(1) || 'User'}
                </span>
              </div>
              
              <div className="flex flex-wrap items-center gap-4 text-white/90 mb-4">
                {userData.job_title_en && (
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    <span className="font-medium">{userData.job_title_en}</span>
                  </div>
                )}
                {userData.department_name_en && (
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    <span>{userData.department_name_en}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>{userData.email}</span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-3 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/qr/${authUser?.id}`)}
                  className="bg-white/10 hover:bg-white/20 border-white/30 text-white backdrop-blur-sm"
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  QR Code
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditMode(true)}
                  className="bg-white/10 hover:bg-white/20 border-white/30 text-white backdrop-blur-sm"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/profile/${authUser?.id}`)}
                  className="bg-white/10 hover:bg-white/20 border-white/30 text-white backdrop-blur-sm"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Public Profile
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Projects Card */}
        <Card className="relative overflow-hidden border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 hover:shadow-xl transition-all duration-300 group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/20 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <FolderOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400 opacity-50" />
            </div>
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              {activityStats?.projectsCreated || 0}
            </h3>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Projects Created</p>
          </CardContent>
        </Card>

        {/* Activities Card */}
        <Card className="relative overflow-hidden border-2 border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/10 hover:shadow-xl transition-all duration-300 group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-400/20 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-500/20 rounded-xl">
                <BarChart3 className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400 opacity-50" />
            </div>
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              {activityStats?.activitiesCreated || 0}
            </h3>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Activities Created</p>
          </CardContent>
        </Card>

        {/* KPI Records Card */}
        <Card className="relative overflow-hidden border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/10 hover:shadow-xl transition-all duration-300 group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-400/20 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-500/20 rounded-xl">
                <Target className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400 opacity-50" />
            </div>
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              {activityStats?.kpisRecorded || 0}
            </h3>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">KPI Records</p>
          </CardContent>
        </Card>

        {/* Permissions Card */}
        <Card className="relative overflow-hidden border-2 border-orange-200 dark:border-orange-800 bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-800/10 hover:shadow-xl transition-all duration-300 group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-400/20 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-500/20 rounded-xl">
                <Shield className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <Award className="h-5 w-5 text-orange-600 dark:text-orange-400 opacity-50" />
            </div>
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              {permissionsReport.totalPermissions}
            </h3>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Permissions</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Profile Info & Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <Card className="border-2 hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  Personal Information
                </CardTitle>
                {!editMode ? (
                  <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => {
                      setEditMode(false)
                      setFormData({
                        first_name: (userData as any).first_name || '',
                        last_name: (userData as any).last_name || '',
                        full_name: userData.full_name || '',
                        department_id: (userData as any).department_id || '',
                        job_title_id: (userData as any).job_title_id || '',
                        phone_1: (userData as any).phone_1 || '',
                        phone_2: (userData as any).phone_2 || '',
                        about: (userData as any).about || '',
                        profile_picture_url: (userData as any).profile_picture_url || ''
                      })
                    }}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleUpdateProfile} disabled={saving}>
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* First Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    First Name
                  </label>
                  {editMode ? (
                    <Input
                      value={formData.first_name}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        first_name: e.target.value,
                        full_name: `${e.target.value} ${formData.last_name}`.trim()
                      }))}
                      placeholder="Enter your first name"
                      className="w-full"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white font-medium text-base py-2">
                      {userData.first_name || userData.full_name?.split(' ')[0] || 'Not specified'}
                    </p>
                  )}
                </div>

                {/* Last Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Last Name
                  </label>
                  {editMode ? (
                    <Input
                      value={formData.last_name}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        last_name: e.target.value,
                        full_name: `${formData.first_name} ${e.target.value}`.trim()
                      }))}
                      placeholder="Enter your last name"
                      className="w-full"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white font-medium text-base py-2">
                      {userData.last_name || userData.full_name?.split(' ').slice(1).join(' ') || 'Not specified'}
                    </p>
                  )}
                </div>

                {/* Email (Read-only) */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Email Address
                  </label>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <Mail className="h-5 w-5 text-gray-400" />
                    <span className="text-gray-900 dark:text-white font-medium">{userData.email}</span>
                    <span className="text-xs text-gray-500 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">Read-only</span>
                  </div>
                </div>

                {/* Department */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Department
                  </label>
                  {editMode ? (
                    <select
                      value={formData.department_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, department_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      <option value="">Select Department</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name_en} / {dept.name_ar}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <Building className="h-5 w-5 text-gray-400" />
                      <span className="text-gray-900 dark:text-white font-medium">
                        {userData.department_name_en || 'Not specified'}
                        {userData.department_name_ar && (
                          <span className="text-gray-500"> / {userData.department_name_ar}</span>
                        )}
                      </span>
                    </div>
                  )}
                </div>

                {/* Job Title */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Job Title
                  </label>
                  {editMode ? (
                    <select
                      value={formData.job_title_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, job_title_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      <option value="">Select Job Title</option>
                      {jobTitles.map((title) => (
                        <option key={title.id} value={title.id}>
                          {title.title_en} / {title.title_ar}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <Briefcase className="h-5 w-5 text-gray-400" />
                      <span className="text-gray-900 dark:text-white font-medium">
                        {userData.job_title_en || 'Not specified'}
                        {userData.job_title_ar && (
                          <span className="text-gray-500"> / {userData.job_title_ar}</span>
                        )}
                      </span>
                    </div>
                  )}
                </div>

                {/* Primary Phone */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Primary Phone
                  </label>
                  {editMode ? (
                    <Input
                      value={formData.phone_1}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone_1: e.target.value }))}
                      placeholder="+966 XXX XXX XXXX"
                      className="w-full"
                    />
                  ) : (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <Phone className="h-5 w-5 text-gray-400" />
                      <span className="text-gray-900 dark:text-white font-medium">{userData.phone_1 || 'Not specified'}</span>
                    </div>
                  )}
                </div>

                {/* Secondary Phone */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Secondary Phone (Optional)
                  </label>
                  {editMode ? (
                    <Input
                      value={formData.phone_2}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone_2: e.target.value }))}
                      placeholder="+966 XXX XXX XXXX"
                      className="w-full"
                    />
                  ) : (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <Phone className="h-5 w-5 text-gray-400" />
                      <span className="text-gray-900 dark:text-white font-medium">{userData.phone_2 || 'Not specified'}</span>
                    </div>
                  )}
                </div>

                {/* Role (Read-only) */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Role & Permissions
                  </label>
                  <div className="flex flex-wrap items-center gap-3 p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-lg border border-gray-200 dark:border-gray-700">
                    <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold shadow-sm ${getRoleColor(userData.role)}`}>
                      <Shield className="h-4 w-4 mr-2" />
                      {userData.role?.charAt(0).toUpperCase() + userData.role?.slice(1) || 'User'}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                      {permissions.length} permissions
                    </span>
                    {userWithPerms.custom_permissions_enabled && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 border border-orange-200 dark:border-orange-700">
                        <Key className="h-3 w-3 mr-1" />
                        Custom Permissions
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 ml-1">
                    {getRoleDescription(userData.role)}
                  </p>
                </div>

                {/* About */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    About Me
                  </label>
                  {editMode ? (
                    <textarea
                      value={formData.about}
                      onChange={(e) => setFormData(prev => ({ ...prev, about: e.target.value }))}
                      placeholder="Tell us about yourself, your experience, and your role..."
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
                    />
                  ) : (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <p className="text-gray-900 dark:text-white whitespace-pre-wrap leading-relaxed">
                        {userData.about || 'No information provided yet.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity Timeline */}
          <Card className="border-2 hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Activity className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  Recent Activity
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/activity-log')}
                >
                  View All
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {loadingActivities ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner size="md" />
                </div>
              ) : recentActivities.length > 0 ? (
                <div className="space-y-4">
                  {recentActivities.map((activity, index) => (
                    <div key={activity.id || index} className="flex gap-4 pb-4 border-b border-gray-200 dark:border-gray-700 last:border-0 last:pb-0">
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/40 dark:to-pink-900/40 flex items-center justify-center border-2 border-purple-200 dark:border-purple-700">
                          {getActivityIcon(activity.action_type)}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {activity.description || activity.page_title || 'Activity'}
                          </p>
                          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            {new Date(activity.created_at).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                          <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded capitalize">
                            {activity.action_type}
                          </span>
                          {activity.entity_type && (
                            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded capitalize">
                              {activity.entity_type}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No recent activities found</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card className="border-2 hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-b">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Lock className="h-6 w-6 text-red-600 dark:text-red-400" />
                Security Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {!showPasswordChange ? (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Keep your account secure by using a strong password. We recommend using a combination of letters, numbers, and special characters.
                  </p>
                  <Button variant="outline" onClick={() => setShowPasswordChange(true)}>
                    <Key className="h-4 w-4 mr-2" />
                    Change Password
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                        placeholder="Enter new password (min 6 characters)"
                        className="w-full pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Confirm New Password
                    </label>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="Confirm new password"
                      className="w-full"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button variant="outline" onClick={() => {
                      setShowPasswordChange(false)
                      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
                    }}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button onClick={handleChangePassword}>
                      <Save className="h-4 w-4 mr-2" />
                      Update Password
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* My Permissions */}
          <Card className="border-2 hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border-b">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Shield className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                My Permissions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {Object.entries(permissionsReport.permissionsByCategory).map(([category, perms]) => (
                  <div key={category} className="border-2 border-gray-200 dark:border-gray-700 rounded-xl p-5 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 hover:shadow-md transition-shadow">
                    <h4 className="font-bold text-gray-900 dark:text-white capitalize mb-4 flex items-center gap-2 text-lg">
                      {category === 'projects' && <FileText className="h-5 w-5 text-blue-600" />}
                      {category === 'boq' && <BarChart3 className="h-5 w-5 text-green-600" />}
                      {category === 'kpi' && <Activity className="h-5 w-5 text-purple-600" />}
                      {category === 'reports' && <FileText className="h-5 w-5 text-orange-600" />}
                      {category === 'users' && <User className="h-5 w-5 text-red-600" />}
                      {category === 'settings' && <Settings className="h-5 w-5 text-indigo-600" />}
                      {category === 'system' && <Lock className="h-5 w-5 text-gray-600" />}
                      {category} <span className="text-sm font-normal text-gray-500">({perms.length})</span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {perms.map(perm => (
                        <div key={perm.id} className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-sm transition-shadow">
                          <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-white text-sm">{perm.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{perm.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {userWithPerms.custom_permissions_enabled && (
                <div className="mt-6 p-5 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 border-2 border-orange-200 dark:border-orange-700 rounded-xl">
                  <div className="flex items-center gap-3 text-orange-800 dark:text-orange-300 mb-2">
                    <Key className="h-5 w-5" />
                    <span className="font-bold text-lg">Custom Permissions Active</span>
                  </div>
                  <p className="text-sm text-orange-700 dark:text-orange-400">
                    Your permissions have been customized by an administrator. Some permissions may differ from the default role permissions.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Stats & Info */}
        <div className="space-y-6">
          {/* Account Information */}
          <Card className="border-2 hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-b">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1 uppercase tracking-wide">Account Created</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {new Date(userData.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>

              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1 uppercase tracking-wide">Last Updated</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {new Date(userData.updated_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>

              {(userData as any).last_login && (
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
                  <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-1 uppercase tracking-wide">Last Login</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    {new Date((userData as any).last_login).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              )}

              <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-lg border-2 border-gray-200 dark:border-gray-700">
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">Account Status</p>
                <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold shadow-sm ${
                  (userData as any).is_active !== false
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-2 border-green-200 dark:border-green-700'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-2 border-red-200 dark:border-red-700'
                }`}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {(userData as any).is_active !== false ? 'Active' : 'Inactive'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Permissions Summary */}
          <Card className="border-2 hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-b">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                Permissions Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="p-5 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl border-2 border-indigo-200 dark:border-indigo-700 text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total Permissions</p>
                  <p className="text-4xl font-bold text-indigo-600 dark:text-indigo-400">
                    {permissionsReport.totalPermissions}
                  </p>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">By Category:</p>
                  {Object.entries(permissionsReport.permissionsByCategory).map(([category, perms]) => (
                    <div key={category} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-sm transition-shadow">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{category}</span>
                      <span className="font-bold text-gray-900 dark:text-white text-lg">{perms.length}</span>
                    </div>
                  ))}
                </div>

                {permissionsReport.customPermissionsEnabled && (
                  <>
                    {permissionsReport.extraFromRole.length > 0 && (
                      <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-700 rounded-xl">
                        <p className="text-xs font-bold text-green-800 dark:text-green-300 mb-1">
                          +{permissionsReport.extraFromRole.length} Extra Permissions
                        </p>
                        <p className="text-xs text-green-700 dark:text-green-400">
                          Beyond your role defaults
                        </p>
                      </div>
                    )}
                    {permissionsReport.missingFromRole.length > 0 && (
                      <div className="mt-3 p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-700 rounded-xl">
                        <p className="text-xs font-bold text-red-800 dark:text-red-300 mb-1">
                          -{permissionsReport.missingFromRole.length} Restricted Permissions
                        </p>
                        <p className="text-xs text-red-700 dark:text-red-400">
                          Removed from your role defaults
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card className="border-2 hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-b">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => router.push('/dashboard')}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => router.push('/activity-log')}
              >
                <Activity className="h-4 w-4 mr-2" />
                Activity Log
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => router.push('/settings')}
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => router.push(`/qr/${authUser?.id}`)}
              >
                <QrCode className="h-4 w-4 mr-2" />
                My QR Code
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// Default export for compatibility
export default UserProfile
