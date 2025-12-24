'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
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
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const [mounted, setMounted] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  
  // Ensure component is mounted before using portal
  useEffect(() => {
    setMounted(true)
  }, [])

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
    if (showMore) {
      setShowMore(false)
    } else {
      setShowMore(true)
    }
  }
  
  // Calculate dropdown position when it opens
  useEffect(() => {
    if (showMore && buttonRef.current && mounted) {
      const updatePosition = () => {
        const rect = buttonRef.current?.getBoundingClientRect()
        if (!rect) return
        
        const spaceBelow = window.innerHeight - rect.bottom
        const spaceAbove = rect.top
        const dropdownHeight = 280 // Approximate dropdown height
        
        if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
          setDropdownPosition('top')
          setDropdownStyle({
            bottom: `${window.innerHeight - rect.top + 8}px`,
            right: `${window.innerWidth - rect.right}px`,
            position: 'fixed',
            zIndex: 10000
          })
        } else {
          setDropdownPosition('bottom')
          setDropdownStyle({
            top: `${rect.bottom + 8}px`,
            right: `${window.innerWidth - rect.right}px`,
            position: 'fixed',
            zIndex: 10000
          })
        }
      }
      
      updatePosition()
      
      // Update position on scroll or resize
      window.addEventListener('scroll', updatePosition, true)
      window.addEventListener('resize', updatePosition)
      
      return () => {
        window.removeEventListener('scroll', updatePosition, true)
        window.removeEventListener('resize', updatePosition)
      }
    }
  }, [showMore, mounted])

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
      <Card className="group relative overflow-hidden bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-gray-200/50 dark:border-gray-800/50 shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer" onClick={handleViewProfile}>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <CardContent className="p-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300 ring-2 ring-white/50 dark:ring-gray-800/50">
                {getInitials()}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"></div>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                {user.full_name}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                {user.job_title_en || user.role}
              </p>
            </div>
            <span className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-md ${getRoleColor(user.role)} flex-shrink-0 group-hover:scale-105 transition-transform duration-300`}>
              {user.role}
            </span>
          </div>
        </CardContent>
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </Card>
    )
  }

  if (variant === 'detailed') {
    return (
      <Card className="group relative overflow-hidden bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-gray-200/50 dark:border-gray-800/50 shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-[1.01]">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-purple-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-purple-950/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <CardContent className="p-6 relative z-10">
          <div className="flex items-start gap-5">
            {/* Enhanced Profile Picture */}
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 rounded-2xl blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-500"></div>
              <div className="relative w-20 h-20 bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-xl group-hover:shadow-2xl group-hover:scale-110 transition-all duration-500 overflow-hidden ring-2 ring-white/50 dark:ring-gray-800/50">
                {getInitials()}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full border-3 border-white dark:border-gray-900 shadow-lg flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              </div>
            </div>
            
          {/* User Info */}
          <div className="flex-1 min-w-0 space-y-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                    {user.full_name}
                  </h3>
                </div>
                <span className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-md ${getRoleColor(user.role)} flex-shrink-0 group-hover:scale-105 transition-transform duration-300`}>
                  {user.role}
                </span>
              </div>
              
              <div className="space-y-2 text-sm">
                {user.job_title_en && (
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <Briefcase className="h-4 w-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                    <span className="font-medium">{user.job_title_en}</span>
                  </div>
                )}
                {user.department_name_en && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Building className="h-4 w-4 text-purple-500 dark:text-purple-400 flex-shrink-0" />
                    <span>{user.department_name_en}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Mail className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                  <span className="truncate">{user.email}</span>
                </div>
                {user.phone_1 && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Phone className="h-4 w-4 text-green-500 dark:text-green-400 flex-shrink-0" />
                    <span>{user.phone_1}</span>
                  </div>
                )}
              </div>
              
              {user.about && (
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-3 line-clamp-2 bg-gray-50/50 dark:bg-gray-800/50 p-3 rounded-lg">
                  {user.about}
                </p>
              )}
              
              {/* Stats */}
              {stats && (
                <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
                  {stats.totalProjects !== undefined && (
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {stats.totalProjects} projects
                      </span>
                    </div>
                  )}
                  {stats.activeProjects !== undefined && (
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {stats.activeProjects} active
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Enhanced Actions */}
            {showActions && (
              <div className="flex flex-col gap-2 flex-shrink-0">
                <Button
                  size="sm"
                  onClick={handleViewProfile}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Profile
                </Button>
                
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleContact('email')}
                    className="flex-1 h-9 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700 hover:scale-110 transition-all duration-300"
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
                        className="flex-1 h-9 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700 hover:scale-110 transition-all duration-300"
                        title="Call"
                      >
                        <PhoneCall className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleContact('whatsapp')}
                        className="flex-1 h-9 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700 hover:scale-110 transition-all duration-300"
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
                    className="flex-1 h-9 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700 hover:scale-110 transition-all duration-300"
                    title="Message"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      </Card>
    )
  }

  // Default variant - Completely Redesigned
  return (
    <Card className="group relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1" style={{ overflow: 'visible', zIndex: showMore ? 50 : 'auto' }}>
      <CardContent className="!p-5 !pt-5 relative z-10" style={{ overflow: 'visible' }}>
        <div className="flex items-start gap-4">
          {/* Avatar - Smaller */}
          <div className="relative flex-shrink-0 z-0">
            <div className="relative w-14 h-14 bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-300 overflow-hidden z-0">
              {user.profile_picture_url ? (
                <img
                  src={user.profile_picture_url}
                  alt="Profile Picture"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                    const parent = target.parentElement
                    if (parent) {
                      parent.innerHTML = getInitials()
                      parent.className = 'relative w-14 h-14 bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-300 overflow-hidden z-0'
                    }
                  }}
                />
              ) : (
                getInitials()
              )}
            </div>
            
            {/* Online status indicator */}
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-900 shadow-sm z-10"></div>
            
            {/* Role badge on avatar */}
            <div className={`absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold shadow-md ${getRoleColor(user.role)} border border-white dark:border-gray-900 z-10`}>
              {user.role.charAt(0).toUpperCase()}
            </div>
          </div>
          
          {/* User Info - Takes available space */}
          <div className="flex-1 min-w-0 space-y-2 relative z-10 pr-2">
            {/* Name - Full width */}
            <div className="mb-1.5">
              <h4 className="font-bold text-gray-900 dark:text-white text-base group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors break-words">
                {user.full_name || 'No Name'}
              </h4>
            </div>
            
            {/* Role badge - Separate line */}
            <div className="mb-1.5">
              <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm ${getRoleColor(user.role)} group-hover:scale-105 transition-transform`}>
                {user.role}
              </span>
            </div>
            
            {/* Job Title */}
            {user.job_title_en && (
              <div className="flex items-center gap-2 mb-1.5">
                <Briefcase className="h-4 w-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 break-words flex-1 min-w-0">
                  {user.job_title_en}
                </p>
              </div>
            )}
            
            {/* Department */}
            {user.department_name_en && (
              <div className="flex items-center gap-2 mb-1.5">
                <Building className="h-4 w-4 text-purple-500 dark:text-purple-400 flex-shrink-0" />
                <p className="text-sm text-gray-600 dark:text-gray-400 break-words flex-1 min-w-0">
                  {user.department_name_en}
                </p>
              </div>
            )}
            
            {/* Email */}
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
              <p className="text-xs text-gray-500 dark:text-gray-400 flex-1 min-w-0" style={{ 
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {user.email}
              </p>
            </div>
          </div>
          
          {/* Action Buttons */}
          {showActions && (
            <div className="flex items-start gap-2 flex-shrink-0 relative z-20">
              <Button
                size="sm"
                variant="outline"
                onClick={handleViewProfile}
                className="h-9 w-9 p-0 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:scale-110 transition-all duration-200 relative z-20"
                title="View Profile"
              >
                <ExternalLink className="h-4.5 w-4.5" />
              </Button>
              
              <div className="relative z-20">
                <Button
                  ref={buttonRef}
                  id={`more-button-${user.id}`}
                  size="sm"
                  variant="outline"
                  onClick={handleMoreClick}
                  className={`h-9 w-9 p-0 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 relative z-20 hover:scale-110 ${showMore ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
                >
                  <MoreHorizontal className="h-4.5 w-4.5" />
                </Button>
              </div>
              
              {/* Dropdown */}
              {showMore && mounted && typeof window !== 'undefined' && createPortal(
                <>
                  <div 
                    className="fixed inset-0 bg-transparent" 
                    onClick={() => setShowMore(false)}
                    style={{ zIndex: 10000 }}
                  />
                  <div 
                    ref={dropdownRef}
                    className="fixed w-52 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                    style={{ ...dropdownStyle, zIndex: 10001 }}
                  >
                    <div className="py-1">
                      <button
                        onClick={() => {
                          handleContact('email')
                          setShowMore(false)
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-2.5 transition-colors"
                      >
                        <MailIcon className="h-4 w-4 text-blue-500" />
                        <span>Send Email</span>
                      </button>
                      
                      {user.phone_1 && (
                        <>
                          <button
                            onClick={() => {
                              handleContact('phone')
                              setShowMore(false)
                            }}
                            className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center gap-2.5 transition-colors"
                          >
                            <PhoneCall className="h-4 w-4 text-green-500" />
                            <span>Call</span>
                          </button>
                          
                          <button
                            onClick={() => {
                              handleContact('whatsapp')
                              setShowMore(false)
                            }}
                            className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center gap-2.5 transition-colors"
                          >
                            <MessageCircle className="h-4 w-4 text-green-500" />
                            <span>WhatsApp</span>
                          </button>
                        </>
                      )}
                      
                      <button
                        onClick={() => {
                          handleContact('message')
                          setShowMore(false)
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 flex items-center gap-2.5 transition-colors"
                      >
                        <MessageCircle className="h-4 w-4 text-purple-500" />
                        <span>Message</span>
                      </button>
                      
                      <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                      
                      <button
                        onClick={() => {
                          router.push(`/qr/${user.id}`)
                          setShowMore(false)
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-2.5 transition-colors"
                      >
                        <QrCode className="h-4 w-4 text-blue-500" />
                        <span>QR Code</span>
                      </button>
                    </div>
                  </div>
                </>,
                document.body
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
