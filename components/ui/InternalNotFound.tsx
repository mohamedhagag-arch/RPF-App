'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  Home, 
  ArrowLeft, 
  Search, 
  Zap, 
  Globe, 
  Rocket, 
  Star,
  Sparkles,
  Navigation,
  Compass,
  MapPin,
  Target,
  Lightbulb,
  Shield,
  Heart,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  FileX,
  FolderX
} from 'lucide-react'

interface InternalNotFoundProps {
  title?: string
  message?: string
  resourceType?: 'project' | 'activity' | 'kpi' | 'user' | 'report' | 'page'
  resourceId?: string
  showQuickActions?: boolean
}

export function InternalNotFound({ 
  title,
  message,
  resourceType = 'page',
  resourceId,
  showQuickActions = true
}: InternalNotFoundProps) {
  const [isHovered, setIsHovered] = useState(false)
  const router = useRouter()

  // تحديد العنوان والرسالة حسب نوع المورد
  const getResourceInfo = () => {
    switch (resourceType) {
      case 'project':
        return {
          title: title || 'Project Not Found',
          message: message || `The project ${resourceId ? `"${resourceId}"` : ''} you're looking for doesn't exist or has been removed.`,
          icon: FolderX,
          color: 'from-blue-500 to-cyan-500'
        }
      case 'activity':
        return {
          title: title || 'Activity Not Found',
          message: message || `The activity ${resourceId ? `"${resourceId}"` : ''} you're looking for doesn't exist or has been removed.`,
          icon: FileX,
          color: 'from-purple-500 to-pink-500'
        }
      case 'kpi':
        return {
          title: title || 'KPI Record Not Found',
          message: message || `The KPI record ${resourceId ? `"${resourceId}"` : ''} you're looking for doesn't exist or has been removed.`,
          icon: Target,
          color: 'from-yellow-500 to-orange-500'
        }
      case 'user':
        return {
          title: title || 'User Not Found',
          message: message || `The user ${resourceId ? `"${resourceId}"` : ''} you're looking for doesn't exist or has been removed.`,
          icon: Shield,
          color: 'from-green-500 to-emerald-500'
        }
      case 'report':
        return {
          title: title || 'Report Not Found',
          message: message || `The report ${resourceId ? `"${resourceId}"` : ''} you're looking for doesn't exist or has been removed.`,
          icon: Rocket,
          color: 'from-red-500 to-rose-500'
        }
      default:
        return {
          title: title || 'Page Not Found',
          message: message || `The page ${resourceId ? `"${resourceId}"` : ''} you're looking for doesn't exist or has been removed.`,
          icon: AlertTriangle,
          color: 'from-indigo-500 to-purple-500'
        }
    }
  }

  const resourceInfo = getResourceInfo()
  const ResourceIcon = resourceInfo.icon

  const quickActions = [
    { icon: Home, label: 'Dashboard', href: '/dashboard', color: 'from-blue-500 to-cyan-500' },
    { icon: Search, label: 'Projects', href: '/projects', color: 'from-purple-500 to-pink-500' },
    { icon: Zap, label: 'KPI Tracking', href: '/kpi', color: 'from-yellow-500 to-orange-500' },
    { icon: Globe, label: 'BOQ Management', href: '/boq', color: 'from-green-500 to-emerald-500' },
    { icon: Rocket, label: 'Reports', href: '/reports', color: 'from-red-500 to-rose-500' },
    { icon: Star, label: 'Settings', href: '/settings', color: 'from-indigo-500 to-purple-500' }
  ]

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* خلفية متحركة */}
      <div className="absolute inset-0">
        {/* دوائر متحركة */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-pink-500/20 to-red-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* المحتوى الرئيسي */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="max-w-4xl w-full text-center">
          {/* الرقم 404 مع تأثيرات */}
          <div className="relative mb-8">
            <div className="text-[8rem] md:text-[12rem] font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 animate-pulse">
              404
            </div>
            
            {/* تأثيرات إضافية */}
            <div className="absolute inset-0 text-[8rem] md:text-[12rem] font-black text-white/10 blur-sm animate-pulse" style={{ animationDelay: '0.5s' }}>
              404
            </div>
            
            {/* نجمة متحركة */}
            <div className="absolute top-4 right-4 animate-spin">
              <Sparkles className="w-6 h-6 text-yellow-400" />
            </div>
            
            {/* أيقونات متحركة */}
            <div className="absolute -top-4 -left-4 animate-bounce">
              <Rocket className="w-5 h-5 text-blue-400" />
            </div>
            <div className="absolute -bottom-4 -right-4 animate-bounce" style={{ animationDelay: '1s' }}>
              <Star className="w-5 h-5 text-purple-400" />
            </div>
          </div>

          {/* العنوان الرئيسي */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <ResourceIcon className="w-8 h-8 text-yellow-400 animate-pulse" />
              <h1 className="text-3xl md:text-5xl font-bold text-white animate-fade-in">
                {resourceInfo.title}
              </h1>
              <ResourceIcon className="w-8 h-8 text-yellow-400 animate-pulse" />
            </div>
            
            <div className="flex items-center justify-center gap-2 mb-4">
              <Navigation className="w-5 h-5 text-blue-400 animate-pulse" />
              <p className="text-lg text-gray-300">
                {resourceInfo.message}
              </p>
              <Compass className="w-5 h-5 text-purple-400 animate-pulse" />
            </div>
            
            <p className="text-base text-gray-400 max-w-2xl mx-auto">
              Don't worry, even the best explorers sometimes take a wrong turn. 
              Let's get you back on track with our navigation tools below.
            </p>
          </div>

          {/* أزرار التنقل السريع */}
          {showQuickActions && (
            <div className="mb-12">
              <h3 className="text-xl font-semibold text-white mb-6 flex items-center justify-center gap-2">
                <MapPin className="w-5 h-5 text-blue-400" />
                Quick Navigation
                <Target className="w-5 h-5 text-purple-400" />
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 max-w-4xl mx-auto">
                {quickActions.map((action, index) => (
                  <Link
                    key={action.label}
                    href={action.href}
                    className="group relative overflow-hidden rounded-2xl p-4 bg-white/10 backdrop-blur-sm border border-white/20 hover:border-white/40 transition-all duration-300 hover:scale-105 hover:rotate-1"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-r ${action.color} opacity-0 group-hover:opacity-20 transition-opacity duration-300`} />
                    
                    <div className="relative z-10">
                      <action.icon className="w-6 h-6 mx-auto mb-2 text-white group-hover:scale-110 transition-transform duration-300" />
                      <span className="text-sm font-medium text-white group-hover:text-yellow-200 transition-colors duration-300">
                        {action.label}
                      </span>
                    </div>
                    
                    {/* تأثير اللمعان */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* أزرار الإجراءات الرئيسية */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <button
              onClick={() => router.back()}
              className="group relative overflow-hidden px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-2xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/25"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              <div className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-300" />
                Go Back
              </div>
              
              {/* تأثير اللمعان */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </button>

            <Link
              href="/dashboard"
              className="group relative overflow-hidden px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-2xl hover:from-purple-700 hover:to-pink-700 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/25"
            >
              <div className="flex items-center gap-2">
                <Home className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
                Go to Dashboard
              </div>
              
              {/* تأثير اللمعان */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </Link>

            <button
              onClick={() => window.location.reload()}
              className="group relative overflow-hidden px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-2xl hover:from-green-700 hover:to-emerald-700 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-green-500/25"
            >
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-300" />
                Refresh Page
              </div>
              
              {/* تأثير اللمعان */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </button>
          </div>

          {/* رسالة إضافية */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 max-w-2xl mx-auto">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Lightbulb className="w-5 h-5 text-yellow-400" />
              <h4 className="text-lg font-semibold text-white">Pro Tip</h4>
              <Shield className="w-5 h-5 text-green-400" />
            </div>
            <p className="text-gray-300">
              If you believe this is an error, please check the URL or try refreshing the page. 
              Our system is constantly evolving, and sometimes pages move to new locations.
            </p>
          </div>

          {/* رسالة أخيرة */}
          <div className="mt-8 flex items-center justify-center gap-2 text-gray-400">
            <Heart className="w-4 h-4 text-red-400 animate-pulse" />
            <span className="text-sm">Made with love by the AlRabat RPF Team</span>
            <Heart className="w-4 h-4 text-red-400 animate-pulse" />
          </div>
        </div>
      </div>

      {/* تأثيرات CSS مخصصة */}
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }
        
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        .animate-bounce {
          animation: bounce 2s infinite;
        }
        
        @keyframes bounce {
          0%, 20%, 53%, 80%, 100% {
            transform: translate3d(0,0,0);
          }
          40%, 43% {
            transform: translate3d(0, -8px, 0);
          }
          70% {
            transform: translate3d(0, -4px, 0);
          }
          90% {
            transform: translate3d(0, -2px, 0);
          }
        }
        
        .animate-spin {
          animation: spin 3s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
