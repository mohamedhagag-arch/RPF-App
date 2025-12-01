'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
import { useAuth } from '@/app/providers'
import { usePermissionGuard } from '@/lib/permissionGuard'
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
  QrCode
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
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    totalActivities: 0
  })

  const userId = params.userId as string

  useEffect(() => {
    if (userId) {
      loadUserProfile()
      loadUserProjects()
      loadUserActivities()
    }
  }, [userId])

  const loadUserProfile = async () => {
    try {
      setLoading(true)
      
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles_complete')
        .select('*')
        .eq('id', userId)
        .single()

      if (profileError) throw profileError
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
      // Get projects where user is involved
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select(`
          id,
          project_name,
          project_code,
          project_status,
          project_progress,
          start_date,
          end_date,
          project_manager
        `)
        .or(`project_manager.eq.${userId},assigned_users.cs.{${userId}}`)
        .order('created_at', { ascending: false })

      if (projectsError) throw projectsError
      setCurrentProjects(projects || [])
      
      // Calculate stats
      const total = projects?.length || 0
      const active = projects?.filter(p => (p as any).project_status === 'active').length || 0
      const completed = projects?.filter(p => (p as any).project_status === 'completed').length || 0
      
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
      // Get activities where user is involved
      const { data: activities, error: activitiesError } = await supabase
        .from('boq_activities')
        .select(`
          id,
          activity_name,
          project_name,
          activity_actual_status,
          activity_progress_percentage,
          deadline
        `)
        .or(`assigned_to.eq.${userId},created_by.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(10)

      if (activitiesError) throw activitiesError
      setCurrentActivities(activities || [])
      
      setStats(prev => ({
        ...prev,
        totalActivities: activities?.length || 0
      }))
      
    } catch (error: any) {
      console.error('Error loading user activities:', error)
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
        // Remove any non-digit characters from phone number
        const cleanPhone = userProfile.phone_1?.replace(/\D/g, '')
        if (cleanPhone) {
          // Open WhatsApp with the phone number
          window.open(`https://wa.me/${cleanPhone}`, '_blank')
        }
        break
      case 'message':
        // TODO: Implement messaging system
        alert('Messaging system will be implemented soon!')
        break
    }
  }

  const handleShareProfile = () => {
    if (navigator.share) {
      navigator.share({
        title: `${userProfile?.full_name} - Profile`,
        text: `Check out ${userProfile?.full_name}'s profile`,
        url: window.location.href
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert('Profile link copied to clipboard!')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error || !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="outline" 
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {userProfile.full_name}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {userProfile.job_title_en} / {userProfile.job_title_ar}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {guard.hasAccess('profile.share') && (
                <Button
                  variant="outline"
                  onClick={handleShareProfile}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Profile
                </Button>
              )}
              
              {authUser?.id === userId && guard.hasAccess('profile.edit') && (
                <Button
                  onClick={() => router.push('/profile')}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Profile Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Profile Picture */}
                <div className="text-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4 overflow-hidden relative">
                    {userProfile.profile_picture_url ? (
                      <img
                        src={userProfile.profile_picture_url}
                        alt="Profile Picture"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback to initials if image fails to load
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                          const parent = target.parentElement
                          if (parent) {
                            parent.innerHTML = `${userProfile.first_name?.[0] || 'U'}${userProfile.last_name?.[0] || ''}`
                            parent.className = 'w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4'
                          }
                        }}
                      />
                    ) : (
                      `${userProfile.first_name?.[0] || 'U'}${userProfile.last_name?.[0] || ''}`
                    )}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {userProfile.full_name}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {userProfile.job_title_en}
                  </p>
                </div>

                {/* Contact Information */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                      <p className="text-gray-900 dark:text-white">{userProfile.email}</p>
                    </div>
                  </div>
                  
                  {userProfile.phone_1 && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Primary Phone</p>
                        <p className="text-gray-900 dark:text-white">{userProfile.phone_1}</p>
                      </div>
                    </div>
                  )}
                  
                  {userProfile.phone_2 && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Secondary Phone</p>
                        <p className="text-gray-900 dark:text-white">{userProfile.phone_2}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Department & Role */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Building className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Department</p>
                      <p className="text-gray-900 dark:text-white">
                        {userProfile.department_name_en}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Briefcase className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Job Title</p>
                      <p className="text-gray-900 dark:text-white">
                        {userProfile.job_title_en}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Shield className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Role</p>
                      <p className="text-gray-900 dark:text-white capitalize">
                        {userProfile.role}
                      </p>
                    </div>
                  </div>
                </div>

                {/* About */}
                {userProfile.about && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">About</p>
                    <p className="text-gray-900 dark:text-white text-sm">
                      {userProfile.about}
                    </p>
                  </div>
                )}

                {/* Contact Actions */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="grid grid-cols-1 gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleContact('email')}
                      className="w-full"
                    >
                      <MailIcon className="h-4 w-4 mr-2" />
                      Send Email
                    </Button>
                    
                    {userProfile.phone_1 && (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => handleContact('phone')}
                          className="w-full"
                        >
                          <PhoneCall className="h-4 w-4 mr-2" />
                          Call
                        </Button>
                        
                        <Button
                          variant="outline"
                          onClick={() => handleContact('whatsapp')}
                          className="w-full bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800"
                        >
                          <MessageCircle className="h-4 w-4 mr-2" />
                          WhatsApp
                        </Button>
                      </>
                    )}
                    
                    <Button
                      variant="outline"
                      onClick={() => handleContact('message')}
                      className="w-full"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Message
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {stats.totalProjects}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Total Projects</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {stats.activeProjects}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Active Projects</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {stats.completedProjects}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Completed</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {stats.totalActivities}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Activities</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* QR Code */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  Contact QR Code
                </CardTitle>
              </CardHeader>
              <CardContent>
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
                  size={150}
                  showControls={true}
                  showVCardInfo={false}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Projects & Activities */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Projects */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5" />
                  Current Projects
                </CardTitle>
              </CardHeader>
              <CardContent>
                {currentProjects.length > 0 ? (
                  <div className="space-y-4">
                    {currentProjects.map((project) => (
                      <div key={project.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {project.project_name}
                          </h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            project.project_status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' :
                            project.project_status === 'completed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-300'
                          }`}>
                            {project.project_status}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                          <span className="flex items-center gap-1">
                            <Target className="h-4 w-4" />
                            {project.project_code}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(project.start_date).toLocaleDateString()}
                          </span>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Progress</span>
                            <span>{project.project_progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${project.project_progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No current projects</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activities */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Activities
                </CardTitle>
              </CardHeader>
              <CardContent>
                {currentActivities.length > 0 ? (
                  <div className="space-y-4">
                    {currentActivities.map((activity) => (
                      <div key={activity.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {activity.activity_name}
                          </h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            activity.activity_status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' :
                            activity.activity_status === 'in_progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-300'
                          }`}>
                            {activity.activity_status}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                          <span className="flex items-center gap-1">
                            <FolderOpen className="h-4 w-4" />
                            {activity.project_name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(activity.deadline).toLocaleDateString()}
                          </span>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Progress</span>
                            <span>{(activity as any).activity_progress_percentage}%</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-green-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${(activity as any).activity_progress_percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No recent activities</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
