'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Home,
  ArrowLeft,
  Search,
  Rocket,
  Circle,
  Satellite,
  Star,
  Zap,
  Navigation,
  Compass,
  FileSearch,
  Layers,
  RefreshCw,
  ExternalLink,
  ScanSearch,
  Orbit
} from 'lucide-react'
import { SpaceBackground, FloatingSpaceIcons } from './NotFoundAnimations'

const spaceMessages = [
  "Houston, we have a problem! This page has left the digital galaxy!",
  "The page you're seeking has drifted into deep space!",
  "Lost in the digital cosmos! This page is exploring unknown territories!",
  "Mission Control: Target page has vanished into the void!",
  "This page has embarked on an interstellar journey!",
  "Warning: Page coordinates not found in this dimension!",
  "The page has been abducted by digital aliens!",
  "This page is currently orbiting in another galaxy!",
]

const spaceActions = [
  { 
    icon: Home, 
    text: "Return to Base", 
    href: "/dashboard", 
    color: "from-violet-500 to-purple-600",
    description: "Navigate back to mission control"
  },
  { 
    icon: Search, 
    text: "Scan for Targets", 
    href: "/dashboard?search=true", 
    color: "from-blue-500 to-cyan-600",
    description: "Search the digital universe"
  },
  { 
    icon: FileSearch, 
    text: "Explore Projects", 
    href: "/projects", 
    color: "from-emerald-500 to-teal-600",
    description: "Discover project galaxies"
  },
  { 
    icon: Layers, 
    text: "View Reports", 
    href: "/reports", 
    color: "from-orange-500 to-red-600",
    description: "Access mission reports"
  },
]

export function NotFoundPage() {
  const router = useRouter()
  const [currentMessage, setCurrentMessage] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessage((prev) => (prev + 1) % spaceMessages.length)
    }, 3500)
    return () => clearInterval(interval)
  }, [])


  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-900 via-indigo-900 to-purple-900">
      {/* Space Background */}
      <SpaceBackground />
      <FloatingSpaceIcons />

      {/* Nebula Effects */}
      <div className="absolute inset-0 z-10">
        <div className="absolute top-20 left-20 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-fuchsia-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Grid Pattern (Stars) */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:40px_40px] z-10" />

      {/* Main Content */}
      <div className="relative z-20 min-h-screen flex items-center justify-center p-4">
        <div className="max-w-6xl w-full">
          
          {/* Space Rocket Searching Animation */}
          <div className="relative mb-16 text-center">
            <div className="inline-block relative">
              {/* Rocket with trail */}
              <div className="relative">
                <Rocket className="w-24 h-24 md:w-32 md:h-32 text-violet-400 drop-shadow-2xl animate-bounce" />
                {/* Rocket trail */}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-2 h-20 bg-gradient-to-b from-violet-500/50 via-purple-500/30 to-transparent blur-sm animate-pulse" />
              </div>
              
              {/* Scanning beam */}
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 w-64 h-1 bg-gradient-to-r from-transparent via-violet-400/50 to-transparent blur-sm animate-pulse" />
            </div>
          </div>

          {/* 404 Number - Space Theme */}
          <div className="relative mb-12 text-center">
            <div className="relative inline-block">
              {/* Glow layers */}
              <div className="absolute inset-0 text-[15rem] md:text-[22rem] font-black text-violet-500/30 blur-3xl animate-pulse">
                404
              </div>
              <div className="absolute inset-0 text-[15rem] md:text-[22rem] font-black text-purple-500/20 blur-2xl animate-pulse" style={{ animationDelay: '0.5s' }}>
                404
              </div>
              
              {/* Main 404 with space effect */}
              <div 
                className="relative text-[15rem] md:text-[22rem] font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400"
                style={{
                  filter: 'drop-shadow(0 0 40px rgba(139, 92, 246, 0.5))'
                }}
              >
                404
              </div>

              {/* Orbiting planets around 404 */}
              <div className="absolute -top-16 -left-16 animate-spin" style={{ animationDuration: '20s' }}>
                <Circle className="w-12 h-12 text-cyan-400 drop-shadow-lg fill-cyan-400/20" />
              </div>
              <div className="absolute -top-16 -right-16 animate-spin" style={{ animationDuration: '15s', animationDirection: 'reverse' }}>
                <Satellite className="w-10 h-10 text-purple-400 drop-shadow-lg" />
              </div>
              <div className="absolute -bottom-16 -left-16 animate-spin" style={{ animationDuration: '18s' }}>
                <Star className="w-14 h-14 text-yellow-400 drop-shadow-lg" />
              </div>
              <div className="absolute -bottom-16 -right-16 animate-spin" style={{ animationDuration: '22s', animationDirection: 'reverse' }}>
                <Zap className="w-11 h-11 text-pink-400 drop-shadow-lg" />
              </div>
            </div>
          </div>

          {/* Title Section */}
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-3 mb-4">
              <ScanSearch className="w-8 h-8 text-violet-400 animate-pulse" />
              <h1 className="text-5xl md:text-7xl font-black text-white drop-shadow-2xl">
                LOST IN SPACE
              </h1>
              <Orbit className="w-8 h-8 text-purple-400 animate-pulse" />
            </div>
            <div className="h-20 flex items-center justify-center">
              <p 
                key={currentMessage}
                className="text-xl md:text-2xl text-gray-300 animate-fade-in font-medium max-w-3xl mx-auto"
              >
                {spaceMessages[currentMessage]}
              </p>
            </div>
          </div>

          {/* Space Station Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
            {spaceActions.map((action, index) => {
              const Icon = action.icon
              return (
                <Link
                  key={index}
                  href={action.href}
                  className="group relative overflow-hidden rounded-2xl p-6 backdrop-blur-md border-2 border-white/10 hover:border-white/30 transition-all duration-500 hover:scale-105 hover:shadow-2xl"
                  style={{
                    background: `linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(168, 85, 247, 0.15))`,
                    animationDelay: `${index * 0.1}s`
                  }}
                >
                  {/* Hover Gradient */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-25 transition-opacity duration-500`} />
                  
                  {/* Space particles effect */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="absolute top-4 right-4 w-2 h-2 bg-white rounded-full animate-ping" />
                    <div className="absolute bottom-4 left-4 w-1.5 h-1.5 bg-violet-300 rounded-full animate-pulse" />
                  </div>
                  
                  {/* Content */}
                  <div className="relative z-10 flex items-center gap-5">
                    <div className={`p-5 rounded-xl bg-gradient-to-br ${action.color} shadow-xl group-hover:scale-110 group-hover:rotate-12 transition-all duration-500`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-bold text-xl mb-1">{action.text}</p>
                      <p className="text-gray-400 text-sm">{action.description}</p>
                    </div>
                    <ExternalLink className="w-6 h-6 text-gray-400 group-hover:text-white group-hover:translate-x-2 transition-all duration-300" />
                  </div>
                  
                  {/* Shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                </Link>
              )
            })}
          </div>

          {/* Mission Control Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
            <button
              onClick={() => router.back()}
              className="group relative overflow-hidden px-10 py-5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold text-lg shadow-2xl hover:shadow-violet-500/50 transition-all duration-300 hover:scale-110"
            >
              <span className="relative z-10 flex items-center gap-3">
                <ArrowLeft className="w-6 h-6 group-hover:-translate-x-2 transition-transform" />
                Return to Previous Sector
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-violet-700 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </button>

            <Link
              href="/dashboard"
              className="group relative overflow-hidden px-10 py-5 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-bold text-lg shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 hover:scale-110"
            >
              <span className="relative z-10 flex items-center gap-3">
                <Home className="w-6 h-6 group-hover:scale-125 transition-transform" />
                Mission Control
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-purple-700 to-fuchsia-700 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </Link>
          </div>

          {/* Space Station Info */}
          <div className="mt-12 bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 max-w-2xl mx-auto">
            <div className="flex items-center justify-center gap-3 mb-3">
              <Navigation className="w-6 h-6 text-violet-400" />
              <h4 className="text-xl font-bold text-white">Mission Status</h4>
              <Compass className="w-6 h-6 text-purple-400" />
            </div>
            <p className="text-gray-300 text-center">
              Our space probe is scanning the digital universe for the missing page. 
              While we search, use the navigation tools above to return to known territories.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
