'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
import { useAuth } from '@/app/providers'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { getUserUsername } from '@/lib/userUtils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { QRCodeGenerator } from '@/components/qr/QRCodeGenerator'
import {
  User,
  Mail,
  Phone,
  Building,
  Briefcase,
  Calendar,
  MapPin,
  MessageCircle,
  PhoneCall,
  Mail as MailIcon,
  ExternalLink,
  ArrowLeft,
  Star,
  Clock,
  Target,
  TrendingUp,
  Users,
  FolderOpen,
  Activity,
  Award,
  Globe,
  Shield,
  Eye,
  Edit,
  Share2,
  Download,
  MoreHorizontal,
  QrCode,
  Zap,
  CheckCircle,
  X,
  ArrowRight,
  Clock3,
  FileText,
  BarChart3,
  Trophy,
  Sparkles,
  Heart,
  ThumbsUp,
  Download as DownloadIcon,
  Copy,
  Link as LinkIcon
} from 'lucide-react'

interface UserProfile {
  id: string
  email: string
  first_name: string
  last_name: string
  full_name: string
  phone_1: string
  phone_2: string
  about: string
  profile_picture_url: string
  department_name_en: string
  department_name_ar: string
  job_title_en: string
  job_title_ar: string
  role: string
  created_at: string
  updated_at: string
}

interface Project {
  id: string
  project_name: string
  project_code: string
  project_status: string
  project_progress: number
  start_date: string
  end_date: string
  project_manager: string
}

interface Activity {
  id: string
  activity_name: string
  project_name: string
  activity_status: string
  progress: number
  deadline: string
}

export default function UserProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { user: authUser } = useAuth()
  const guard = usePermissionGuard()
  const supabase = getSupabaseClient()
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [currentProjects, setCurrentProjects] = useState<Project[]>([])
  const [currentActivities, setCurrentActivities] = useState<Activity[]>([])
  const [recentActivities, setRecentActivities] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    totalActivities: 0,
    kpisRecorded: 0
  })
  const [copied, setCopied] = useState(false)

  const usernameOrId = params.userId as string

  useEffect(() => {
    if (usernameOrId) {
      loadUserProfile()
    }
  }, [usernameOrId])

  useEffect(() => {
    if (userProfile?.id) {
      loadUserProjects()
      loadUserActivities()
      loadRecentActivities()
      loadUserStats()
    }
  }, [userProfile?.id])

  // Redirect from old ID-based URLs to new username-based URLs
  useEffect(() => {
    if (!userProfile) return
    
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(usernameOrId)
    
    // If current URL uses UUID (old format), redirect to username (new format)
    if (isUUID) {
      const username = getUserUsername(userProfile)
      if (username && username !== usernameOrId) {
        // Replace the URL without page reload
        router.replace(`/profile/${username}`)
      }
    }
  }, [userProfile, usernameOrId, router])

  const loadUserProfile = async () => {
    try {
      setLoading(true)
      
      // Try to find user by username (from email) first
      // Username format: email part before @ converted to slug (e.g., "mohamed-hagag")
      // Or try by ID if it's a UUID format
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(usernameOrId)
      
      let profile: any = null
      let profileError: any = null
      
      if (isUUID) {
        // Search by ID
        const { data, error } = await supabase
          .from('user_profiles_complete')
          .select('*')
          .eq('id', usernameOrId)
          .single()
        profile = data
        profileError = error
      } else {
        // Search by username (email slug or name slug)
        // First, try to find by email prefix match
        // Convert username back to possible email patterns
        const usernameLower = usernameOrId.toLowerCase()
        const emailPattern = usernameLower.replace(/-/g, '.') // Try with dots
        const emailPattern2 = usernameLower.replace(/-/g, '') // Try without separators
        
        // Get all users (we need to filter client-side for email prefix matching)
        const { data: allUsers, error: allUsersError } = await supabase
          .from('user_profiles_complete')
          .select('*')
          .limit(1000) // Reasonable limit
        
        if (allUsersError) throw allUsersError
        
        // Find user whose email username matches
        profile = allUsers?.find((user: any) => {
          if (!user.email) return false
          const emailUsername = user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-')
          return emailUsername === usernameLower
        })
        
        // If not found by email, try by full name
        if (!profile) {
          profile = allUsers?.find((user: any) => {
            if (!user.full_name) return false
            const nameUsername = user.full_name.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-')
            return nameUsername === usernameLower
          })
        }
        
        if (!profile) {
          profileError = { message: 'User not found' }
        }
      }

      if (profileError) throw profileError
      if (!profile) {
        setError('User profile not found')
        return
      }
      
      setUserProfile(profile)
      
    } catch (error: any) {
      console.error('Error loading user profile:', error)
      setError('Failed to load user profile')
    } finally {
      setLoading(false)
    }
  }

  const loadUserProjects = async () => {
    try {
      const userEmail = userProfile?.email
      if (!userEmail) return

      // Try to get projects from Planning Database
      const { data: projects, error: projectsError } = await supabase
        .from('Planning Database - ProjectsList')
        .select('*')
        .eq('Created By User', userEmail)
        .order('created_at', { ascending: false })
        .limit(10)

      if (projectsError) {
        console.warn('Error loading projects from Planning Database:', projectsError)
        // Fallback to projects table
        const { data: fallbackProjects } = await supabase
          .from('projects')
          .select('*')
          .or(`project_manager.eq.${userProfile?.id},assigned_users.cs.{${userProfile?.id}}`)
          .order('created_at', { ascending: false })
          .limit(10)
        
        if (fallbackProjects) {
          setCurrentProjects(fallbackProjects.map((p: any) => ({
            id: p.id,
            project_name: p.project_name || p.name,
            project_code: p.project_code || p.code,
            project_status: p.project_status || p.status,
            project_progress: p.project_progress || p.progress || 0,
            start_date: p.start_date || p.created_at,
            end_date: p.end_date,
            project_manager: p.project_manager
          })))
        }
      } else if (projects) {
        setCurrentProjects(projects.map((p: any) => ({
          id: p.id || p['Project ID'],
          project_name: p['Project Name'] || p.project_name,
          project_code: p['Project Code'] || p.project_code,
          project_status: p['Project Status'] || p.project_status || 'active',
          project_progress: p['Project Progress'] || p.project_progress || 0,
          start_date: p['Start Date'] || p.start_date || p.created_at,
          end_date: p['End Date'] || p.end_date,
          project_manager: p['Project Manager'] || p.project_manager
        })))
      }
      
      // Calculate stats
      const total = projects?.length || currentProjects.length
      const active = (projects || currentProjects)?.filter((p: any) => 
        (p.project_status || p['Project Status'] || '').toLowerCase() === 'active'
      ).length || 0
      const completed = (projects || currentProjects)?.filter((p: any) => 
        (p.project_status || p['Project Status'] || '').toLowerCase() === 'completed'
      ).length || 0
      
      setStats(prev => ({
        ...prev,
        totalProjects: total,
        activeProjects: active,
        completedProjects: completed
      }))
      
    } catch (error: any) {
      console.error('Error loading user projects:', error)
    }
  }

  const loadUserActivities = async () => {
    try {
      const userEmail = userProfile?.email
      if (!userEmail) return

      // Try to get activities from Planning Database
      const { data: activities, error: activitiesError } = await supabase
        .from('Planning Database - BOQ Rates')
        .select('*')
        .eq('Created By User', userEmail)
        .order('created_at', { ascending: false })
        .limit(10)

      if (activitiesError) {
        console.warn('Error loading activities from Planning Database:', activitiesError)
        // Fallback to boq_activities table
        const { data: fallbackActivities } = await supabase
          .from('boq_activities')
          .select('*')
          .or(`assigned_to.eq.${userProfile?.id},created_by.eq.${userProfile?.id}`)
          .order('created_at', { ascending: false })
          .limit(10)
        
        if (fallbackActivities) {
          setCurrentActivities(fallbackActivities.map((a: any) => ({
            id: a.id,
            activity_name: a.activity_name || a.activity,
            project_name: a.project_full_name || a.project_name,
            activity_status: a.activity_actual_status || a.activity_status || 'in_progress',
            progress: a.activity_progress_percentage || a.progress || 0,
            deadline: a.deadline || a.activity_planned_completion_date
          })))
        }
      } else if (activities) {
        setCurrentActivities(activities.map((a: any) => ({
          id: a.id || a['Activity ID'],
          activity_name: a['Activity Name'] || a.activity_name || a.activity,
          project_name: a['Project Name'] || a.project_full_name || a.project_name,
          activity_status: a['Activity Status'] || a.activity_actual_status || 'in_progress',
          progress: a['Progress Percentage'] || a.activity_progress_percentage || 0,
          deadline: a['Deadline'] || a.deadline
        })))
      }
      
      setStats(prev => ({
        ...prev,
        totalActivities: activities?.length || currentActivities.length
      }))
      
    } catch (error: any) {
      console.error('Error loading user activities:', error)
    }
  }

  const loadRecentActivities = async () => {
    try {
      const userEmail = userProfile?.email
      if (!userEmail) return

      const { data, error } = await (supabase as any)
        .from('user_activities')
        .select('*')
        .eq('user_email', userEmail)
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) throw error
      setRecentActivities(data || [])
    } catch (error) {
      console.error('Error loading recent activities:', error)
    }
  }

  const loadUserStats = async () => {
    try {
      const userEmail = userProfile?.email
      if (!userEmail) return

      // Get KPI count
      const { count: kpisCount } = await supabase
        .from('Planning Database - KPI')
        .select('*', { count: 'exact', head: true })
        .eq('Recorded By', userEmail)

      setStats(prev => ({
        ...prev,
        kpisRecorded: kpisCount || 0
      }))
    } catch (error) {
      console.error('Error loading user stats:', error)
    }
  }

  const handleContact = (type: 'email' | 'phone' | 'whatsapp' | 'message') => {
    if (!userProfile) return

    switch (type) {
      case 'email':
        window.open(`mailto:${userProfile.email}`, '_blank')
        break
      case 'phone':
        window.open(`tel:${userProfile.phone_1}`, '_blank')
        break
      case 'whatsapp':
        const cleanPhone = userProfile.phone_1?.replace(/\D/g, '')
        if (cleanPhone) {
          window.open(`https://wa.me/${cleanPhone}`, '_blank')
        }
        break
      case 'message':
        alert('Messaging system will be implemented soon!')
        break
    }
  }

  const handleShareProfile = async () => {
    const url = window.location.href
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${userProfile?.full_name} - Profile`,
          text: `Check out ${userProfile?.full_name}'s profile`,
          url: url
        })
      } catch (err) {
        // User cancelled or error occurred
      }
    } else {
      try {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        alert('Failed to copy link')
      }
    }
  }

  const getInitials = () => {
    if (userProfile?.first_name && userProfile?.last_name) {
      return `${userProfile.first_name[0]}${userProfile.last_name[0]}`.toUpperCase()
    }
    if (userProfile?.full_name) {
      const parts = userProfile.full_name.split(' ')
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      }
      return userProfile.full_name.substring(0, 2).toUpperCase()
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error || !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <Alert variant="error">
            <User className="h-4 w-4" />
            {error || 'User profile not found'}
          </Alert>
          <Button 
            variant="outline" 
            onClick={() => router.back()}
            className="mt-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Button 
          variant="outline" 
          onClick={() => router.back()}
          className="mb-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-800 border-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* Profile Header - Modern & Professional */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 shadow-2xl mb-8">
          <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
          
          <div className="relative px-8 py-12">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
              {/* Avatar Section */}
              <div className="relative group">
                <div className="relative w-36 h-36 bg-gradient-to-br from-white/20 to-white/5 rounded-3xl flex items-center justify-center text-white text-5xl font-bold shadow-2xl ring-4 ring-white/20 backdrop-blur-sm overflow-hidden transition-transform duration-300 group-hover:scale-105">
                  {userProfile.profile_picture_url ? (
                    <img
                      src={userProfile.profile_picture_url}
                      alt="Profile Picture"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        const parent = target.parentElement
                        if (parent) {
                          parent.innerHTML = getInitials()
                          parent.className = 'relative w-36 h-36 bg-gradient-to-br from-white/20 to-white/5 rounded-3xl flex items-center justify-center text-white text-5xl font-bold shadow-2xl ring-4 ring-white/20 backdrop-blur-sm overflow-hidden transition-transform duration-300 group-hover:scale-105'
                        }
                      }}
                    />
                  ) : (
                    getInitials()
                  )}
                </div>
                {/* Online Status */}
                <div className="absolute -bottom-1 -right-1 w-10 h-10 bg-green-500 rounded-full border-4 border-white dark:border-gray-900 shadow-xl flex items-center justify-center">
                  <div className="w-4 h-4 bg-white rounded-full animate-pulse"></div>
                </div>
                {/* Role Badge on Avatar */}
                <div className={`absolute -top-2 -right-2 px-3 py-1.5 rounded-full text-xs font-bold shadow-xl border-2 border-white ${getRoleColor(userProfile.role)}`}>
                  {userProfile.role?.charAt(0).toUpperCase()}
                </div>
              </div>

              {/* User Info */}
              <div className="flex-1 text-white">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <h1 className="text-5xl font-bold drop-shadow-lg">
                    {userProfile.full_name}
                  </h1>
                  <span className={`px-4 py-2 rounded-full text-sm font-semibold shadow-xl border-2 border-white/30 ${getRoleColor(userProfile.role)}`}>
                    <Shield className="h-4 w-4 inline mr-1.5" />
                    {userProfile.role?.charAt(0).toUpperCase() + userProfile.role?.slice(1) || 'User'}
                  </span>
                </div>
                
                <div className="flex flex-wrap items-center gap-4 text-white/90 mb-6">
                  {userProfile.job_title_en && (
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-5 w-5" />
                      <span className="font-semibold text-lg">{userProfile.job_title_en}</span>
                    </div>
                  )}
                  {userProfile.department_name_en && (
                    <div className="flex items-center gap-2">
                      <Building className="h-5 w-5" />
                      <span className="text-lg">{userProfile.department_name_en}</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShareProfile}
                    className="bg-white/10 hover:bg-white/20 border-white/30 text-white backdrop-blur-sm"
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Share2 className="h-4 w-4 mr-2" />
                        Share Profile
                      </>
                    )}
                  </Button>
                  {authUser?.id === userProfile?.id && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push('/profile')}
                      className="bg-white/10 hover:bg-white/20 border-white/30 text-white backdrop-blur-sm"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/qr/${userProfile?.id}`)}
                    className="bg-white/10 hover:bg-white/20 border-white/30 text-white backdrop-blur-sm"
                  >
                    <QrCode className="h-4 w-4 mr-2" />
                    QR Code
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          {/* Total Projects */}
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
                {stats.totalProjects}
              </h3>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Projects</p>
            </CardContent>
          </Card>

          {/* Active Projects */}
          <Card className="relative overflow-hidden border-2 border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/10 hover:shadow-xl transition-all duration-300 group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-400/20 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-500/20 rounded-xl">
                  <Zap className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400 opacity-50" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                {stats.activeProjects}
              </h3>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Projects</p>
            </CardContent>
          </Card>

          {/* Completed Projects */}
          <Card className="relative overflow-hidden border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/10 hover:shadow-xl transition-all duration-300 group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-400/20 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-500/20 rounded-xl">
                  <CheckCircle className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <Trophy className="h-5 w-5 text-purple-600 dark:text-purple-400 opacity-50" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                {stats.completedProjects}
              </h3>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed</p>
            </CardContent>
          </Card>

          {/* Total Activities */}
          <Card className="relative overflow-hidden border-2 border-orange-200 dark:border-orange-800 bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-800/10 hover:shadow-xl transition-all duration-300 group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-400/20 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-orange-500/20 rounded-xl">
                  <Activity className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <TrendingUp className="h-5 w-5 text-orange-600 dark:text-orange-400 opacity-50" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                {stats.totalActivities}
              </h3>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Activities</p>
            </CardContent>
          </Card>

          {/* KPI Records */}
          <Card className="relative overflow-hidden border-2 border-indigo-200 dark:border-indigo-800 bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-900/20 dark:to-indigo-800/10 hover:shadow-xl transition-all duration-300 group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-400/20 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-indigo-500/20 rounded-xl">
                  <Target className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <Award className="h-5 w-5 text-indigo-600 dark:text-indigo-400 opacity-50" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                {stats.kpisRecorded}
              </h3>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">KPI Records</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Profile Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Card */}
            <Card className="border-2 hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-b">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                {/* Contact Information */}
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 rounded-xl border border-blue-200 dark:border-blue-700">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                      <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1 uppercase tracking-wide">Email</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white break-all">{userProfile.email}</p>
                    </div>
                  </div>
                  
                  {userProfile.phone_1 && (
                    <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/10 rounded-xl border border-green-200 dark:border-green-700">
                      <div className="p-2 bg-green-500/20 rounded-lg">
                        <Phone className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1 uppercase tracking-wide">Primary Phone</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{userProfile.phone_1}</p>
                      </div>
                    </div>
                  )}
                  
                  {userProfile.phone_2 && (
                    <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/10 rounded-xl border border-purple-200 dark:border-purple-700">
                      <div className="p-2 bg-purple-500/20 rounded-lg">
                        <Phone className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-1 uppercase tracking-wide">Secondary Phone</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{userProfile.phone_2}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Department & Role */}
                <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl border border-gray-200 dark:border-gray-700">
                    <div className="p-2 bg-gray-500/20 rounded-lg">
                      <Building className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 uppercase tracking-wide">Department</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {userProfile.department_name_en || 'Not specified'}
                        {userProfile.department_name_ar && (
                          <span className="text-gray-500"> / {userProfile.department_name_ar}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl border border-gray-200 dark:border-gray-700">
                    <div className="p-2 bg-gray-500/20 rounded-lg">
                      <Briefcase className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 uppercase tracking-wide">Job Title</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {userProfile.job_title_en || 'Not specified'}
                        {userProfile.job_title_ar && (
                          <span className="text-gray-500"> / {userProfile.job_title_ar}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-indigo-50 to-indigo-100/50 dark:from-indigo-900/20 dark:to-indigo-800/10 rounded-xl border border-indigo-200 dark:border-indigo-700">
                    <div className="p-2 bg-indigo-500/20 rounded-lg">
                      <Shield className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1 uppercase tracking-wide">Role</p>
                      <span className={`inline-block px-3 py-1.5 rounded-full text-sm font-semibold ${getRoleColor(userProfile.role)}`}>
                        {userProfile.role?.charAt(0).toUpperCase() + userProfile.role?.slice(1) || 'User'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* About */}
                {userProfile.about && (
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-3 uppercase tracking-wide">About</p>
                    <div className="p-4 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                      <p className="text-sm text-gray-900 dark:text-white leading-relaxed whitespace-pre-wrap">
                        {userProfile.about}
                      </p>
                    </div>
                  </div>
                )}

                {/* Contact Actions */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-3 uppercase tracking-wide">Contact</p>
                  <div className="grid grid-cols-1 gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleContact('email')}
                      className="w-full justify-start bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300"
                    >
                      <MailIcon className="h-4 w-4 mr-2" />
                      Send Email
                    </Button>
                    
                    {userProfile.phone_1 && (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => handleContact('phone')}
                          className="w-full justify-start bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 border-green-200 dark:border-green-700 text-green-700 dark:text-green-300"
                        >
                          <PhoneCall className="h-4 w-4 mr-2" />
                          Call
                        </Button>
                        
                        <Button
                          variant="outline"
                          onClick={() => handleContact('whatsapp')}
                          className="w-full justify-start bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 border-green-200 dark:border-green-700 text-green-700 dark:text-green-300"
                        >
                          <MessageCircle className="h-4 w-4 mr-2" />
                          WhatsApp
                        </Button>
                      </>
                    )}
                    
                    <Button
                      variant="outline"
                      onClick={() => handleContact('message')}
                      className="w-full justify-start bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/30 border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-300"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Message
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* QR Code */}
            <Card className="border-2 hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-b">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <QrCode className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                  Contact QR Code
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex justify-center">
                  <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 shadow-lg">
                    <QRCodeGenerator
                      userData={{
                        id: userProfile.id,
                        first_name: userProfile.first_name,
                        last_name: userProfile.last_name,
                        email: userProfile.email,
                        phone_1: userProfile.phone_1,
                        phone_2: userProfile.phone_2,
                        department_name_en: userProfile.department_name_en,
                        job_title_en: userProfile.job_title_en,
                        about: userProfile.about,
                        profile_picture_url: userProfile.profile_picture_url
                      }}
                      size={200}
                      showControls={true}
                      showVCardInfo={false}
                    />
                  </div>
                </div>
                <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-4">
                  Scan to save contact information
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Projects & Activities */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Projects */}
            <Card className="border-2 hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <FolderOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    Current Projects
                  </CardTitle>
                  {currentProjects.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push('/projects')}
                    >
                      View All
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {currentProjects.length > 0 ? (
                  <div className="space-y-4">
                    {currentProjects.map((project) => (
                      <div key={project.id} className="group border-2 border-gray-200 dark:border-gray-700 rounded-xl p-5 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-300">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-lg text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {project.project_name}
                            </h4>
                            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                              <span className="flex items-center gap-1">
                                <Target className="h-4 w-4" />
                                {project.project_code}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {new Date(project.start_date).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <span className={`px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm ${
                            project.project_status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-2 border-green-200 dark:border-green-700' :
                            project.project_status === 'completed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-2 border-blue-200 dark:border-blue-700' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-300 border-2 border-gray-200 dark:border-gray-700'
                          }`}>
                            {project.project_status}
                          </span>
                        </div>
                        
                        <div className="space-y-2 mt-4">
                          <div className="flex justify-between items-center text-sm">
                            <span className="font-medium text-gray-700 dark:text-gray-300">Progress</span>
                            <span className="font-bold text-gray-900 dark:text-white">{project.project_progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                            <div 
                              className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 shadow-sm"
                              style={{ width: `${project.project_progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <FolderOpen className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No current projects</p>
                    <p className="text-sm mt-2">This user hasn't been assigned to any projects yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activities */}
            <Card className="border-2 hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Activity className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    Recent Activities
                  </CardTitle>
                  {currentActivities.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push('/activity-log')}
                    >
                      View All
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {currentActivities.length > 0 ? (
                  <div className="space-y-4">
                    {currentActivities.map((activity) => (
                      <div key={activity.id} className="group border-2 border-gray-200 dark:border-gray-700 rounded-xl p-5 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 hover:shadow-lg hover:border-purple-300 dark:hover:border-purple-700 transition-all duration-300">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-lg text-gray-900 dark:text-white mb-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                              {activity.activity_name}
                            </h4>
                            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                              <span className="flex items-center gap-1">
                                <FolderOpen className="h-4 w-4" />
                                {activity.project_name}
                              </span>
                              {activity.deadline && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {new Date(activity.deadline).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className={`px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm ${
                            activity.activity_status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-2 border-green-200 dark:border-green-700' :
                            activity.activity_status === 'in_progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-2 border-blue-200 dark:border-blue-700' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-300 border-2 border-gray-200 dark:border-gray-700'
                          }`}>
                            {activity.activity_status}
                          </span>
                        </div>
                        
                        <div className="space-y-2 mt-4">
                          <div className="flex justify-between items-center text-sm">
                            <span className="font-medium text-gray-700 dark:text-gray-300">Progress</span>
                            <span className="font-bold text-gray-900 dark:text-white">{activity.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                            <div 
                              className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500 shadow-sm"
                              style={{ width: `${activity.progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <Activity className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No recent activities</p>
                    <p className="text-sm mt-2">This user hasn't been assigned to any activities yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Activity Timeline */}
            {recentActivities.length > 0 && (
              <Card className="border-2 hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border-b">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Clock3 className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                      Activity Timeline
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
                  <div className="space-y-4">
                    {recentActivities.map((activity, index) => (
                      <div key={activity.id || index} className="flex gap-4 pb-4 border-b border-gray-200 dark:border-gray-700 last:border-0 last:pb-0">
                        <div className="flex-shrink-0 mt-1">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-blue-100 dark:from-indigo-900/40 dark:to-blue-900/40 flex items-center justify-center border-2 border-indigo-200 dark:border-indigo-700">
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
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
