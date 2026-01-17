'use client'

import { useEffect, useState, useRef } from 'react'
import { settingsManager } from '@/lib/settingsManager'
import { 
  Wrench, Clock, AlertCircle, RefreshCw, CheckCircle, 
  Loader2, Sparkles, Zap, Rocket, Shield, Code, Server,
  Activity, TrendingUp, Layers, Database, Cloud, Cpu,
  Heart, Coffee, Star, ArrowRight, Mail, Twitter, Github,
  Play, Pause, Volume2, VolumeX, Smile, Target, Award
} from 'lucide-react'

interface MaintenancePageProps {
  message?: string
  estimatedTime?: string
  showProgress?: boolean
}

interface Particle {
  id: number
  x: number
  y: number
  size: number
  speedX: number
  speedY: number
  color: string
  opacity: number
}

export function MaintenancePage({ 
  message, 
  estimatedTime,
  showProgress = true 
}: MaintenancePageProps) {
  const [maintenanceData, setMaintenanceData] = useState({
    message: message || 'We are performing maintenance on the site',
    estimatedTime: estimatedTime || '30 minutes',
    startTime: new Date().toISOString()
  })
  const [progress, setProgress] = useState(0)
  const [dots, setDots] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [particles, setParticles] = useState<Particle[]>([])
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [timeRemaining, setTimeRemaining] = useState({ hours: 0, minutes: 15, seconds: 0 })
  const [isMuted, setIsMuted] = useState(true)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>()

  useEffect(() => {
    // Load maintenance settings
    const loadMaintenanceSettings = async () => {
      try {
        const maintenanceMessage = await settingsManager.getSystemSetting('maintenance_message')
        const maintenanceTime = await settingsManager.getSystemSetting('maintenance_estimated_time')
        
        if (maintenanceMessage) {
          setMaintenanceData(prev => ({
            ...prev,
            message: maintenanceMessage
          }))
        }
        
        if (maintenanceTime) {
          setMaintenanceData(prev => ({
            ...prev,
            estimatedTime: maintenanceTime
          }))
          // Parse estimated time and set countdown
          const timeMatch = maintenanceTime.match(/(\d+)\s*(minute|hour|second)/i)
          if (timeMatch) {
            const value = parseInt(timeMatch[1])
            const unit = timeMatch[2].toLowerCase()
            if (unit.includes('hour')) {
              setTimeRemaining({ hours: value, minutes: 0, seconds: 0 })
            } else if (unit.includes('minute')) {
              setTimeRemaining({ hours: 0, minutes: value, seconds: 0 })
            }
          }
        }
      } catch (error) {
        console.error('Error loading maintenance settings:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadMaintenanceSettings()
  }, [])

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        let { hours, minutes, seconds } = prev
        if (seconds > 0) {
          seconds--
        } else if (minutes > 0) {
          minutes--
          seconds = 59
        } else if (hours > 0) {
          hours--
          minutes = 59
          seconds = 59
        }
        return { hours, minutes, seconds }
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Advanced particle system with canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    const particleCount = 100
    const newParticles: Particle[] = []
    const colors = ['#a855f7', '#3b82f6', '#ec4899', '#f59e0b', '#10b981']

    for (let i = 0; i < particleCount; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 3 + 1,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: Math.random() * 0.5 + 0.2
      })
    }

    setParticles(newParticles)

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      newParticles.forEach(particle => {
        particle.x += particle.speedX
        particle.y += particle.speedY

        // Wrap around edges
        if (particle.x < 0) particle.x = canvas.width
        if (particle.x > canvas.width) particle.x = 0
        if (particle.y < 0) particle.y = canvas.height
        if (particle.y > canvas.height) particle.y = 0

        // Draw particle
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fillStyle = particle.color + Math.floor(particle.opacity * 255).toString(16).padStart(2, '0')
        ctx.fill()

        // Draw connections
        newParticles.forEach(otherParticle => {
          const dx = particle.x - otherParticle.x
          const dy = particle.y - otherParticle.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < 150) {
            ctx.beginPath()
            ctx.moveTo(particle.x, particle.y)
            ctx.lineTo(otherParticle.x, otherParticle.y)
            ctx.strokeStyle = particle.color + Math.floor((1 - distance / 150) * 50).toString(16).padStart(2, '0')
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        })
      })

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  // Mouse tracking for interactive effects
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  // Animated dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev.length >= 3) return ''
        return prev + '.'
      })
    }, 500)
    return () => clearInterval(interval)
  }, [])

  // Realistic progress simulation
  useEffect(() => {
    if (!showProgress) return
    
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) return prev
        const increment = (100 - prev) * 0.015 + Math.random() * 0.3
        return Math.min(prev + increment, 95)
      })
    }, 1200)

    return () => clearInterval(interval)
  }, [showProgress])

  // Auto refresh check
  useEffect(() => {
    const checkMaintenanceStatus = async () => {
      try {
        const enabledRaw = await settingsManager.getSystemSetting('maintenance_mode_enabled')
        
        let isEnabled = false
        if (enabledRaw !== null && enabledRaw !== undefined) {
          if (typeof enabledRaw === 'boolean') {
            isEnabled = enabledRaw
          } else if (typeof enabledRaw === 'string') {
            isEnabled = enabledRaw === 'true' || enabledRaw === 'True' || enabledRaw === 'TRUE'
          } else if (typeof enabledRaw === 'object') {
            if ('bool' in enabledRaw) {
              isEnabled = enabledRaw.bool === true
            } else if ('value' in enabledRaw) {
              isEnabled = enabledRaw.value === true || enabledRaw.value === 'true'
            } else if ('boolean' in enabledRaw) {
              isEnabled = enabledRaw.boolean === true
            } else if (Object.keys(enabledRaw).length === 1) {
              const firstValue = Object.values(enabledRaw)[0]
              isEnabled = firstValue === true || firstValue === 'true' || firstValue === 'True'
            }
          }
        }
        
        if (!isEnabled) {
          window.location.reload()
        }
      } catch (error) {
        console.error('Error checking maintenance status:', error)
      }
    }

    const interval = setInterval(checkMaintenanceStatus, 10000)
    return () => clearInterval(interval)
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-purple-500 rounded-full blur-2xl opacity-50 animate-pulse"></div>
            <Loader2 className="h-16 w-16 text-purple-400 animate-spin mx-auto mb-4 relative z-10" />
          </div>
          <p className="text-gray-300 text-lg">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 via-indigo-900 to-slate-900 p-4 relative overflow-hidden">
      {/* Advanced Canvas Particle System */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ zIndex: 1 }}
      />

      {/* Interactive Mouse Glow Effect */}
      <div 
        className="absolute w-96 h-96 bg-purple-500/20 rounded-full blur-3xl pointer-events-none transition-all duration-300"
        style={{
          left: `${mousePosition.x - 192}px`,
          top: `${mousePosition.y - 192}px`,
          transform: 'translate(-50%, -50%)',
          zIndex: 2
        }}
      />

      {/* Floating Orbs with Animation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 2 }}>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-float-slow"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-float-slow" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 right-1/3 w-72 h-72 bg-pink-500/15 rounded-full blur-3xl animate-float-slow" style={{ animationDelay: '4s' }}></div>
        <div className="absolute bottom-1/3 left-1/3 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl animate-float-slow" style={{ animationDelay: '6s' }}></div>
      </div>

      <div className="max-w-6xl w-full relative z-10">
        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
          {/* Main Card - Takes 8 columns */}
          <div className="md:col-span-8 bg-white/5 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/10 p-8 md:p-12 relative overflow-hidden group">
            {/* Animated Border */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-purple-500/30 via-blue-500/30 via-pink-500/30 to-purple-500/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-gradient-border"></div>
            <div className="absolute inset-[1px] rounded-3xl bg-gradient-to-br from-slate-900/95 via-purple-900/95 to-slate-900/95"></div>

            <div className="relative z-10">
              {/* Icon Section with 3D Effect */}
              <div className="flex justify-center mb-8">
                <div className="relative group/icon">
                  {/* Multiple Glow Rings */}
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      className="absolute inset-0 bg-gradient-to-r from-purple-500 via-blue-500 to-pink-500 rounded-full blur-2xl opacity-30 animate-pulse"
                      style={{ 
                        transform: `scale(${1 + i * 0.3})`,
                        animationDelay: `${i * 0.3}s`
                      }}
                    />
                  ))}
                  
                  {/* Main Icon Container */}
                  <div className="relative bg-gradient-to-br from-purple-600 via-blue-600 to-pink-600 p-10 rounded-full shadow-2xl transform hover:scale-110 transition-all duration-500 group-hover/icon:rotate-12">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent rounded-full"></div>
                    <Wrench className="h-24 w-24 text-white relative z-10 animate-spin-slow" />
                  </div>

                  {/* Floating Icons */}
                  {[
                    { icon: Sparkles, pos: '-top-6 -left-6', color: 'text-yellow-400', delay: '0s' },
                    { icon: Zap, pos: '-top-6 -right-6', color: 'text-blue-400', delay: '0.5s' },
                    { icon: Rocket, pos: '-bottom-6 -left-6', color: 'text-pink-400', delay: '1s' },
                    { icon: Shield, pos: '-bottom-6 -right-6', color: 'text-green-400', delay: '1.5s' },
                    { icon: Star, pos: 'top-0 -left-12', color: 'text-purple-400', delay: '2s' },
                    { icon: Heart, pos: 'top-0 -right-12', color: 'text-red-400', delay: '2.5s' }
                  ].map((item, idx) => (
                    <div key={idx} className={`absolute ${item.pos} animate-float`} style={{ animationDelay: item.delay }}>
                      <item.icon className={`h-8 w-8 ${item.color} drop-shadow-lg`} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Title with Animated Gradient */}
              <h1 className="text-5xl md:text-7xl font-extrabold text-center mb-4 bg-gradient-to-r from-purple-400 via-blue-400 via-pink-400 to-purple-400 bg-clip-text text-transparent animate-gradient bg-[length:200%_200%]">
                Site Under Maintenance
              </h1>

              {/* Subtitle */}
              <p className="text-center text-gray-300 text-xl mb-8 flex items-center justify-center space-x-2">
                <Smile className="h-6 w-6 text-yellow-400 animate-bounce" />
                <span>We're making things better for you!</span>
                <Coffee className="h-6 w-6 text-amber-400 animate-pulse" />
              </p>

              {/* Countdown Timer - Bento Style */}
              <div className="grid grid-cols-3 gap-4 mb-8 max-w-md mx-auto">
                {[
                  { label: 'Hours', value: timeRemaining.hours },
                  { label: 'Minutes', value: timeRemaining.minutes },
                  { label: 'Seconds', value: timeRemaining.seconds }
                ].map((item, idx) => (
                  <div key={idx} className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl p-4 border border-white/10 text-center hover:scale-105 transition-transform duration-300">
                    <div className="text-4xl font-bold text-white mb-1">{String(item.value).padStart(2, '0')}</div>
                    <div className="text-xs text-gray-400 uppercase tracking-wider">{item.label}</div>
                  </div>
                ))}
              </div>

              {/* Message Card */}
              <div className="bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-pink-500/10 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-white/10 relative overflow-hidden group/message">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5 opacity-0 group-hover/message:opacity-100 transition-opacity duration-300"></div>
                <div className="flex items-start space-x-4 relative z-10">
                  <div className="flex-shrink-0">
                    <div className="bg-gradient-to-br from-yellow-400 to-orange-500 p-4 rounded-full shadow-lg animate-pulse">
                      <AlertCircle className="h-7 w-7 text-white" />
                    </div>
                  </div>
                  <p className="text-lg text-gray-200 leading-relaxed flex-1">
                    {maintenanceData.message}
                    <span className="inline-block w-8 text-purple-400 animate-blink">{dots}</span>
                  </p>
                </div>
              </div>

              {/* Enhanced Progress Bar */}
              {showProgress && (
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-400 flex items-center space-x-2">
                      <Activity className="h-4 w-4 animate-pulse" />
                      <span>Work in Progress</span>
                    </span>
                    <span className="text-sm font-bold text-white bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                      {Math.round(progress)}%
                    </span>
                  </div>
                  <div className="relative w-full bg-gray-800/50 rounded-full h-5 overflow-hidden border border-white/10 shadow-inner">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-500 via-blue-500 via-pink-500 to-purple-500 rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
                      style={{ width: `${progress}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer"></div>
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-400/50 to-pink-400/50 blur-md"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Side Cards - Takes 4 columns */}
          <div className="md:col-span-4 space-y-4">
            {/* Status Cards */}
            {[
              { icon: Server, label: 'Servers', status: 'Online', color: 'green', progress: 100 },
              { icon: Database, label: 'Database', status: 'Updating', color: 'blue', progress: 75 },
              { icon: Cloud, label: 'Services', status: 'Updating', color: 'purple', progress: 60 },
              { icon: Cpu, label: 'System', status: 'Optimizing', color: 'pink', progress: 85 }
            ].map((item, index) => (
              <div 
                key={index}
                className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:shadow-lg group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative z-10">
                  <div className={`flex items-center justify-center mb-3 ${
                    item.color === 'green' ? 'bg-green-500/20' :
                    item.color === 'blue' ? 'bg-blue-500/20' :
                    item.color === 'purple' ? 'bg-purple-500/20' :
                    'bg-pink-500/20'
                  } rounded-full p-3 w-12 h-12 mx-auto group-hover:scale-110 transition-transform duration-300`}>
                    <item.icon className={`h-6 w-6 ${
                      item.color === 'green' ? 'text-green-400' :
                      item.color === 'blue' ? 'text-blue-400' :
                      item.color === 'purple' ? 'text-purple-400' :
                      'text-pink-400'
                    } ${item.status === 'Online' ? '' : 'animate-spin'}`} />
                  </div>
                  <p className="text-xs text-gray-400 text-center mb-1">{item.label}</p>
                  <p className={`text-sm font-bold text-center ${
                    item.color === 'green' ? 'text-green-400' :
                    item.color === 'blue' ? 'text-blue-400' :
                    item.color === 'purple' ? 'text-purple-400' :
                    'text-pink-400'
                  }`}>{item.status}</p>
                  <div className="mt-2 w-full bg-gray-800/50 rounded-full h-1 overflow-hidden">
                    <div 
                      className={`h-full bg-gradient-to-r ${
                        item.color === 'green' ? 'from-green-500 to-green-400' :
                        item.color === 'blue' ? 'from-blue-500 to-blue-400' :
                        item.color === 'purple' ? 'from-purple-500 to-purple-400' :
                        'from-pink-500 to-pink-400'
                      } rounded-full transition-all duration-1000`}
                      style={{ width: `${item.progress}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Section - What We're Doing */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {[
            { icon: Code, title: 'Code Updates', desc: 'Enhancing functionality', color: 'purple' },
            { icon: Layers, title: 'Infrastructure', desc: 'Scaling resources', color: 'blue' },
            { icon: TrendingUp, title: 'Performance', desc: 'Optimizing speed', color: 'pink' }
          ].map((item, index) => (
            <div 
              key={index}
              className={`bg-gradient-to-br ${
                item.color === 'purple' ? 'from-purple-500/10 to-blue-500/10' :
                item.color === 'blue' ? 'from-blue-500/10 to-indigo-500/10' :
                'from-pink-500/10 to-purple-500/10'
              } rounded-xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300 group hover:scale-105`}
            >
              <item.icon className={`h-10 w-10 ${
                item.color === 'purple' ? 'text-purple-400' :
                item.color === 'blue' ? 'text-blue-400' :
                'text-pink-400'
              } mb-3 group-hover:scale-110 transition-transform duration-300`} />
              <h3 className="text-white font-semibold mb-2 text-lg">{item.title}</h3>
              <p className="text-gray-400 text-sm">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Auto Refresh Notice */}
        <div className="bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 border border-blue-500/30 rounded-xl p-5 text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="flex items-center justify-center space-x-3 relative z-10">
            <div className="bg-blue-500/30 rounded-full p-2">
              <RefreshCw className="h-5 w-5 text-blue-300 animate-spin" />
            </div>
            <p className="text-sm text-blue-200 font-medium">
              The page will automatically refresh when maintenance is complete
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-gray-400 text-sm flex items-center justify-center space-x-2">
            <span>© {new Date().getFullYear()} AlRabat RPF.</span>
            <span className="text-gray-500">All rights reserved.</span>
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(180deg);
          }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        @keyframes float-slow {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -30px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
        .animate-float-slow {
          animation: float-slow 8s ease-in-out infinite;
        }
        @keyframes gradient {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
        @keyframes gradient-border {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
        .animate-gradient-border {
          background-size: 200% 200%;
          animation: gradient-border 3s linear infinite;
        }
        @keyframes blink {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0;
          }
        }
        .animate-blink {
          animation: blink 1s infinite;
        }
      `}</style>
    </div>
  )
}
