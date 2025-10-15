'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { QRCodeGenerator } from '@/components/qr/QRCodeGenerator'
import {
  User,
  Mail,
  Phone,
  Building,
  Briefcase,
  MessageCircle,
  PhoneCall,
  Mail as MailIcon,
  ExternalLink,
  MoreHorizontal,
  Star,
  Clock,
  Target,
  TrendingUp,
  QrCode
} from 'lucide-react'

interface UserCardProps {
  user: {
    id: string
    email: string
    first_name: string
    last_name: string
    full_name: string
    phone_1?: string
    phone_2?: string
    about?: string
    profile_picture_url?: string
    department_name_en?: string
    department_name_ar?: string
    job_title_en?: string
    job_title_ar?: string
    role: string
    created_at: string
    updated_at: string
  }
  showActions?: boolean
  variant?: 'default' | 'compact' | 'detailed'
  stats?: {
    totalProjects?: number
    activeProjects?: number
    completedProjects?: number
  }
}

export function UserCard({ 
  user, 
  showActions = true, 
  variant = 'default',
  stats 
}: UserCardProps) {
  const router = useRouter()
  const [showMore, setShowMore] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowMore(false)
      }
    }

    if (showMore) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMore])

  const handleContact = (type: 'email' | 'phone' | 'whatsapp' | 'message') => {
    switch (type) {
      case 'email':
        window.open(`mailto:${user.email}`, '_blank')
        break
      case 'phone':
        if (user.phone_1) {
          window.open(`tel:${user.phone_1}`, '_blank')
        }
        break
      case 'whatsapp':
        if (user.phone_1) {
          const cleanPhone = user.phone_1.replace(/\D/g, '')
          window.open(`https://wa.me/${cleanPhone}`, '_blank')
        }
        break
      case 'message':
        // TODO: Implement messaging system
        alert('Messaging system will be implemented soon!')
        break
    }
  }

  const handleViewProfile = () => {
    router.push(`/profile/${user.id}`)
  }

  const handleMoreClick = () => {
    setShowMore(!showMore)
    
    // Check if dropdown should appear above or below
    if (showMore) {
      // Closing dropdown
      setShowMore(false)
    } else {
      // Opening dropdown - check position
      const rect = document.getElementById(`more-button-${user.id}`)?.getBoundingClientRect()
      if (rect) {
        const spaceBelow = window.innerHeight - rect.bottom
        const spaceAbove = rect.top
        const dropdownHeight = 200 // Approximate dropdown height
        
        if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
          setDropdownPosition('top')
        } else {
          setDropdownPosition('bottom')
        }
      }
      setShowMore(true)
    }
  }

  const getInitials = () => {
    return `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase()
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
      case 'manager':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
      case 'engineer':
        return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-300'
    }
  }

  if (variant === 'compact') {
    return (
      <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleViewProfile}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
              {getInitials()}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                {user.full_name}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                {user.job_title_en || user.role}
              </p>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
              {user.role}
            </span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (variant === 'detailed') {
    return (
      <Card className="hover:shadow-lg transition-all duration-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            {/* Profile Picture */}
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
              {getInitials()}
            </div>
            
            {/* User Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {user.full_name}
                </h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                  {user.role}
                </span>
              </div>
              
              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                {user.job_title_en && (
                  <p className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    {user.job_title_en}
                  </p>
                )}
                {user.department_name_en && (
                  <p className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    {user.department_name_en}
                  </p>
                )}
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {user.email}
                </p>
                {user.phone_1 && (
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {user.phone_1}
                  </p>
                )}
              </div>
              
              {user.about && (
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-3 line-clamp-2">
                  {user.about}
                </p>
              )}
              
              {/* Stats */}
              {stats && (
                <div className="flex items-center gap-4 mt-4 text-sm">
                  {stats.totalProjects !== undefined && (
                    <div className="flex items-center gap-1">
                      <Target className="h-4 w-4 text-blue-500" />
                      <span className="text-gray-600 dark:text-gray-400">
                        {stats.totalProjects} projects
                      </span>
                    </div>
                  )}
                  {stats.activeProjects !== undefined && (
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span className="text-gray-600 dark:text-gray-400">
                        {stats.activeProjects} active
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Actions */}
            {showActions && (
              <div className="flex flex-col gap-2">
                <Button
                  size="sm"
                  onClick={handleViewProfile}
                  className="w-full"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Profile
                </Button>
                
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleContact('email')}
                    className="flex-1"
                    title="Send Email"
                  >
                    <MailIcon className="h-4 w-4" />
                  </Button>
                  
                  {user.phone_1 && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleContact('phone')}
                        className="flex-1"
                        title="Call"
                      >
                        <PhoneCall className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleContact('whatsapp')}
                        className="flex-1 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800"
                        title="WhatsApp"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleContact('message')}
                    className="flex-1"
                    title="Message"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Default variant
  return (
    <Card className="hover:shadow-xl hover:shadow-blue-500/10 dark:hover:shadow-blue-400/10 transition-all duration-300 border-gray-200/50 dark:border-gray-700/50 bg-white/80 backdrop-blur-sm dark:bg-gray-800/80 group relative overflow-visible">
      <CardContent className="p-6 overflow-visible">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all duration-300 overflow-hidden">
              {user.profile_picture_url ? (
                <img
                  src={user.profile_picture_url}
                  alt="Profile Picture"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to initials if image fails to load
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                    const parent = target.parentElement
                    if (parent) {
                      parent.innerHTML = getInitials()
                      parent.className = 'w-14 h-14 bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all duration-300'
                    }
                  }}
                />
              ) : (
                getInitials()
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-gray-900 dark:text-white truncate text-lg">
                {user.full_name}
              </h4>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${getRoleColor(user.role)}`}>
                {user.role}
              </span>
            </div>
            
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate mb-1">
              {user.job_title_en || user.email}
            </p>
            
            {user.department_name_en && (
              <div className="flex items-center gap-1">
                <Building className="h-3 w-3 text-gray-400" />
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user.department_name_en}
                </p>
              </div>
            )}
          </div>
          
          {showActions && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleViewProfile}
                className="h-9 w-9 p-0 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:scale-105 transition-all duration-200"
                title="View Profile"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
              
              <div className="relative">
                <Button
                  id={`more-button-${user.id}`}
                  size="sm"
                  variant="outline"
                  onClick={handleMoreClick}
                  className="h-9 w-9 p-0 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
                
                {showMore && (
                  <div ref={dropdownRef}>
                    {/* Backdrop to close dropdown when clicking outside */}
                    <div 
                      className="fixed inset-0 z-[9998] bg-transparent" 
                      onClick={() => setShowMore(false)}
                    />
                    <div 
                      className={`absolute right-0 w-52 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 z-[9999] overflow-visible ${
                        dropdownPosition === 'top' 
                          ? 'bottom-full mb-2' 
                          : 'top-full mt-2'
                      }`}
                    >
                      <div className="py-2">
                      <button
                        onClick={() => {
                          handleContact('email')
                          setShowMore(false)
                        }}
                        className="w-full px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-3 transition-colors duration-200"
                      >
                        <MailIcon className="h-4 w-4 text-blue-500" />
                        Send Email
                      </button>
                      
                      {user.phone_1 && (
                        <>
                          <button
                            onClick={() => {
                              handleContact('phone')
                              setShowMore(false)
                            }}
                            className="w-full px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center gap-3 transition-colors duration-200"
                          >
                            <PhoneCall className="h-4 w-4 text-green-500" />
                            Call
                          </button>
                          
                          <button
                            onClick={() => {
                              handleContact('whatsapp')
                              setShowMore(false)
                            }}
                            className="w-full px-4 py-3 text-left text-sm font-medium text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center gap-3 transition-colors duration-200"
                          >
                            <MessageCircle className="h-4 w-4 text-green-500" />
                            WhatsApp
                          </button>
                        </>
                      )}
                      
                      <button
                        onClick={() => {
                          handleContact('message')
                          setShowMore(false)
                        }}
                        className="w-full px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 flex items-center gap-3 transition-colors duration-200"
                      >
                        <MessageCircle className="h-4 w-4 text-purple-500" />
                        Message
                      </button>
                      
                      <button
                        onClick={() => {
                          router.push(`/qr/${user.id}`)
                          setShowMore(false)
                        }}
                        className="w-full px-4 py-3 text-left text-sm font-medium text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-3 transition-colors duration-200"
                      >
                        <QrCode className="h-4 w-4 text-blue-500" />
                        QR Code
                      </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
