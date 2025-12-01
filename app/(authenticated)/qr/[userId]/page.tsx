'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
import { useAuth } from '@/app/providers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { QRCodeGenerator } from '@/components/qr/QRCodeGenerator'
import {
  ArrowLeft,
  Download,
  Share2,
  QrCode,
  User,
  Mail,
  Phone,
  Building,
  Briefcase
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

export default function QRCodePage() {
  const params = useParams()
  const router = useRouter()
  const { user: authUser } = useAuth()
  const supabase = getSupabaseClient()
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)

  const userId = params.userId as string

  useEffect(() => {
    if (userId) {
      loadUserProfile()
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
          
          <div className="text-center">
            <div className="inline-flex items-center gap-3 px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full text-sm font-semibold mb-4 shadow-lg">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-blue-600 font-bold text-xs">
                AR
              </div>
              Al Rabat Foundation
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Contact QR Code
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Scan to add {userProfile.full_name} to your contacts
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* QR Code */}
          <div className="space-y-6">
            <Card className="rounded-3xl border-none shadow-2xl">
              <CardHeader className="rounded-t-3xl">
                <CardTitle className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <QrCode className="h-5 w-5" />
                  QR Code
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-900/10 dark:to-purple-900/10 rounded-b-3xl">
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
                  size={350}
                  showControls={true}
                  showVCardInfo={false}
                />
              </CardContent>
            </Card>
          </div>

          {/* Contact Information */}
          <div className="space-y-6">
            <Card className="rounded-3xl border-none shadow-xl">
              <CardHeader className="bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-900/10 dark:to-purple-900/10 rounded-t-3xl">
                <CardTitle className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <User className="h-5 w-5" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Profile Picture */}
                <div className="text-center mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-3 overflow-hidden">
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
                            parent.innerHTML = `${userProfile.first_name?.[0] || 'U'}${userProfile.last_name?.[0] || ''}`
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

                {/* Contact Details */}
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
                  
                  {userProfile.department_name_en && (
                    <div className="flex items-center gap-3">
                      <Building className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Department</p>
                        <p className="text-gray-900 dark:text-white">{userProfile.department_name_en}</p>
                      </div>
                    </div>
                  )}
                  
                  {userProfile.job_title_en && (
                    <div className="flex items-center gap-3">
                      <Briefcase className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Job Title</p>
                        <p className="text-gray-900 dark:text-white">{userProfile.job_title_en}</p>
                      </div>
                    </div>
                  )}
                  
                  {userProfile.about && (
                    <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">About</p>
                      <p className="text-gray-900 dark:text-white text-sm">{userProfile.about}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Instructions */}
            <Card className="rounded-3xl border-none shadow-xl">
              <CardHeader className="bg-gradient-to-r from-green-50/50 to-emerald-50/50 dark:from-green-900/10 dark:to-emerald-900/10 rounded-t-3xl">
                <CardTitle className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <QrCode className="h-5 w-5" />
                  How to Use
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-start gap-4 p-4 rounded-2xl bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-900/10 dark:to-indigo-900/10 border-none shadow-sm">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-md">1</div>
                    <p className="font-medium pt-1">Open your phone's camera app or QR code scanner</p>
                  </div>
                  <div className="flex items-start gap-4 p-4 rounded-2xl bg-gradient-to-r from-purple-50/80 to-pink-50/80 dark:from-purple-900/10 dark:to-pink-900/10 border-none shadow-sm">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-md">2</div>
                    <p className="font-medium pt-1">Point your camera at the QR code above</p>
                  </div>
                  <div className="flex items-start gap-4 p-4 rounded-2xl bg-gradient-to-r from-green-50/80 to-emerald-50/80 dark:from-green-900/10 dark:to-emerald-900/10 border-none shadow-sm">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-md">3</div>
                    <p className="font-medium pt-1">Tap the notification to add this contact to your phone</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
