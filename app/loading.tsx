'use client'

import { useState, useEffect } from 'react'
import { 
  Zap, 
  Rocket, 
  Star, 
  Sparkles,
  Globe,
  Shield,
  Heart
} from 'lucide-react'

export default function Loading() {
  const [dots, setDots] = useState('')
  const [currentMessage, setCurrentMessage] = useState(0)

  const messages = [
    'Redirecting to dashboard...',
    'Loading your workspace...',
    'Preparing your data...',
    'Almost there...',
    'Finalizing setup...'
  ]

  useEffect(() => {
    // تأثير النقاط المتحركة
    const dotsInterval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return ''
        return prev + '.'
      })
    }, 500)

    // تغيير الرسائل
    const messageInterval = setInterval(() => {
      setCurrentMessage(prev => (prev + 1) % messages.length)
    }, 2000)

    return () => {
      clearInterval(dotsInterval)
      clearInterval(messageInterval)
    }
  }, [])

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
        <div className="text-center max-w-md mx-auto">
          {/* شعار التطبيق */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Globe className="w-8 h-8 text-blue-400 animate-pulse" />
              <h1 className="text-2xl font-bold text-white">AlRabat RPF</h1>
              <Shield className="w-8 h-8 text-green-400 animate-pulse" />
            </div>
            <p className="text-gray-400">Masters of Foundation Construction</p>
          </div>

          {/* Loading Spinner */}
          <div className="relative mb-8">
            <div className="w-16 h-16 mx-auto">
              <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
            
            {/* أيقونات متحركة حول الـ spinner */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2 animate-bounce">
                <Rocket className="w-4 h-4 text-blue-400" />
              </div>
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-2 animate-bounce" style={{ animationDelay: '0.5s' }}>
                <Star className="w-4 h-4 text-purple-400" />
              </div>
              <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-2 animate-bounce" style={{ animationDelay: '1s' }}>
                <Zap className="w-4 h-4 text-yellow-400" />
              </div>
              <div className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-2 animate-bounce" style={{ animationDelay: '1.5s' }}>
                <Sparkles className="w-4 h-4 text-pink-400" />
              </div>
            </div>
          </div>

          {/* الرسالة المتحركة */}
          <div className="mb-8">
            <p className="text-xl text-white font-medium animate-fade-in">
              {messages[currentMessage]}{dots}
            </p>
            <p className="text-sm text-gray-400 mt-2">
              Please wait while we prepare your workspace
            </p>
          </div>

          {/* شريط التقدم */}
          <div className="w-full bg-gray-700 rounded-full h-2 mb-8">
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>

          {/* رسالة أخيرة */}
          <div className="flex items-center justify-center gap-2 text-gray-400">
            <Heart className="w-4 h-4 text-red-400 animate-pulse" />
            <span className="text-sm">Made with love by the AlRabat RPF Team</span>
            <Heart className="w-4 h-4 text-red-400 animate-pulse" />
          </div>
        </div>
      </div>

      {/* تأثيرات CSS مخصصة */}
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
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
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

