'use client'

import { useEffect, useRef, useState } from 'react'
import { Sparkles, Rocket, Star, Zap, Flame, Circle, Satellite } from 'lucide-react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  life: number
  maxLife: number
  twinkle: number
}

interface StarField {
  x: number
  y: number
  size: number
  speed: number
  opacity: number
}

interface Planet {
  x: number
  y: number
  size: number
  color: string
  speed: number
  rotation: number
}

export function SpaceBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const starsRef = useRef<StarField[]>([])
  const planetsRef = useRef<Planet[]>([])
  const animationFrameRef = useRef<number>()

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

    // Initialize stars
    const initStars = () => {
      starsRef.current = []
      for (let i = 0; i < 200; i++) {
        starsRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 2 + 0.5,
          speed: Math.random() * 0.5 + 0.1,
          opacity: Math.random() * 0.8 + 0.2
        })
      }
    }

    // Initialize planets
    const initPlanets = () => {
      planetsRef.current = []
      const colors = [
        'rgba(139, 92, 246, 0.3)', // Violet
        'rgba(168, 85, 247, 0.3)', // Purple
        'rgba(236, 72, 153, 0.3)', // Pink
        'rgba(59, 130, 246, 0.3)', // Blue
        'rgba(34, 197, 94, 0.3)',  // Green
      ]
      for (let i = 0; i < 5; i++) {
        planetsRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 80 + 40,
          color: colors[i],
          speed: Math.random() * 0.02 + 0.01,
          rotation: Math.random() * Math.PI * 2
        })
      }
    }

    // Initialize particles
    const initParticles = () => {
      particlesRef.current = []
      for (let i = 0; i < 150; i++) {
        particlesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          size: Math.random() * 3 + 1,
          color: `hsl(${Math.random() * 60 + 250}, 80%, ${Math.random() * 30 + 60}%)`,
          life: Math.random() * 100,
          maxLife: 100,
          twinkle: Math.random() * Math.PI * 2
        })
      }
    }

    initStars()
    initPlanets()
    initParticles()


    const animate = () => {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.1)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw stars
      starsRef.current.forEach(star => {
        star.y += star.speed
        if (star.y > canvas.height) {
          star.y = 0
          star.x = Math.random() * canvas.width
        }
        
        ctx.globalAlpha = star.opacity
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2)
        ctx.fill()
      })

      // Draw planets
      planetsRef.current.forEach(planet => {
        planet.rotation += planet.speed
        
        ctx.save()
        ctx.translate(planet.x, planet.y)
        ctx.rotate(planet.rotation)
        
        // Planet glow
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, planet.size)
        gradient.addColorStop(0, planet.color)
        gradient.addColorStop(1, 'transparent')
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(0, 0, planet.size, 0, Math.PI * 2)
        ctx.fill()
        
        // Planet ring
        ctx.strokeStyle = planet.color.replace('0.3', '0.5')
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.ellipse(0, 0, planet.size * 1.2, planet.size * 0.3, 0, 0, Math.PI * 2)
        ctx.stroke()
        
        ctx.restore()
      })

      // Update and draw particles
      particlesRef.current = particlesRef.current.filter(particle => {
        particle.x += particle.vx
        particle.y += particle.vy
        particle.life -= 0.8
        particle.twinkle += 0.1


        // Boundary wrap
        if (particle.x < 0) particle.x = canvas.width
        if (particle.x > canvas.width) particle.x = 0
        if (particle.y < 0) particle.y = canvas.height
        if (particle.y > canvas.height) particle.y = 0

        if (particle.life > 0) {
          const alpha = (particle.life / particle.maxLife) * (0.5 + Math.sin(particle.twinkle) * 0.5)
          ctx.globalAlpha = alpha
          ctx.fillStyle = particle.color
          ctx.shadowBlur = 15
          ctx.shadowColor = particle.color
          ctx.beginPath()
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
          ctx.fill()
          ctx.shadowBlur = 0
        }

        return particle.life > 0
      })


      ctx.globalAlpha = 1
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

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)' }}
    />
  )
}

// Floating Space Icons
export function FloatingSpaceIcons() {
  const [icons, setIcons] = useState<Array<{ id: number; x: number; y: number; icon: string; delay: number; size: number }>>([])

  useEffect(() => {
    const iconTypes = ['sparkles', 'rocket', 'star', 'zap', 'flame', 'circle', 'satellite']
    const newIcons = Array.from({ length: 25 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      icon: iconTypes[Math.floor(Math.random() * iconTypes.length)],
      delay: Math.random() * 5,
      size: Math.random() * 8 + 12
    }))
    setIcons(newIcons)
  }, [])

  const getIcon = (type: string, size: number) => {
    const className = `text-violet-400/20 animate-pulse`
    const style = { width: size, height: size }
    switch (type) {
      case 'sparkles': return <Sparkles className={className} style={style} />
      case 'rocket': return <Rocket className={className} style={style} />
      case 'star': return <Star className={className} style={style} />
      case 'zap': return <Zap className={className} style={style} />
      case 'flame': return <Flame className={className} style={style} />
      case 'circle': return <Circle className={className} style={style} fill="currentColor" />
      case 'satellite': return <Satellite className={className} style={style} />
      default: return <Sparkles className={className} style={style} />
    }
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {icons.map((icon) => (
        <div
          key={icon.id}
          className="absolute animate-float"
          style={{
            left: `${icon.x}%`,
            top: `${icon.y}%`,
            animationDelay: `${icon.delay}s`,
            animationDuration: `${8 + Math.random() * 4}s`
          }}
        >
          {getIcon(icon.icon, icon.size)}
        </div>
      ))}
    </div>
  )
}
