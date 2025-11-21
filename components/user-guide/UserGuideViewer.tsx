'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Play, Clock, Eye, BookOpen, ExternalLink, Share2, ChevronLeft, ChevronRight, Star, TrendingUp, CheckCircle2, ArrowLeft, Video, FileText, GraduationCap, Tag, Calendar, User, Copy, Check, Printer, Bookmark, BookmarkCheck, Maximize2, Minimize2, ZoomIn, ZoomOut, Search, Menu, Download, MessageSquare, Type, Sun, Moon, Link2 } from 'lucide-react'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
import { useAuth } from '@/app/providers'
import { useRouter } from 'next/navigation'
import { createSlug } from '@/lib/slugHelper'

interface UserGuideViewerProps {
  guide: any
  onClose: () => void
}

interface TableOfContentsItem {
  id: string
  text: string
  level: number
}

export function UserGuideViewer({ guide, onClose }: UserGuideViewerProps) {
  const { user, appUser } = useAuth()
  const router = useRouter()
  const [watchTime, setWatchTime] = useState(0)
  const [isCompleted, setIsCompleted] = useState(false)
  const [relatedGuides, setRelatedGuides] = useState<any[]>([])
  const [loadingRelated, setLoadingRelated] = useState(false)
  const [copied, setCopied] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg' | 'xl'>('base')
  const [showTOC, setShowTOC] = useState(false)
  const [tableOfContents, setTableOfContents] = useState<TableOfContentsItem[]>([])
  const [readingTime, setReadingTime] = useState(0)
  const [activeHeading, setActiveHeading] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const [relatedContextMenu, setRelatedContextMenu] = useState<{ x: number; y: number; guide: any } | null>(null)
  const articleRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // Add highlight styles
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      .highlight-heading {
        background: linear-gradient(90deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.25) 100%) !important;
        border-left: 5px solid rgb(59, 130, 246) !important;
        padding-left: 1.25rem !important;
        padding-right: 1rem !important;
        padding-top: 0.75rem !important;
        padding-bottom: 0.75rem !important;
        border-radius: 0.75rem !important;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2), 0 0 0 1px rgba(59, 130, 246, 0.1) !important;
        animation: highlightPulse 3s ease-in-out !important;
        transition: all 0.3s ease !important;
        transform: scale(1.02) !important;
        margin: 0.5rem 0 !important;
      }
      @keyframes highlightPulse {
        0% {
          background: linear-gradient(90deg, rgba(59, 130, 246, 0.3) 0%, rgba(59, 130, 246, 0.4) 100%);
          box-shadow: 0 6px 20px rgba(59, 130, 246, 0.35), 0 0 0 2px rgba(59, 130, 246, 0.2);
          transform: scale(1.03);
        }
        50% {
          background: linear-gradient(90deg, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.3) 100%);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25), 0 0 0 1px rgba(59, 130, 246, 0.15);
        }
        100% {
          background: linear-gradient(90deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.25) 100%);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2), 0 0 0 1px rgba(59, 130, 246, 0.1);
          transform: scale(1.02);
        }
      }
      .dark .highlight-heading {
        background: linear-gradient(90deg, rgba(96, 165, 250, 0.2) 0%, rgba(96, 165, 250, 0.3) 100%) !important;
        border-left-color: rgb(96, 165, 250) !important;
        box-shadow: 0 4px 12px rgba(96, 165, 250, 0.25), 0 0 0 1px rgba(96, 165, 250, 0.15) !important;
      }
      .dark @keyframes highlightPulse {
        0% {
          background: linear-gradient(90deg, rgba(96, 165, 250, 0.35) 0%, rgba(96, 165, 250, 0.45) 100%);
          box-shadow: 0 6px 20px rgba(96, 165, 250, 0.4), 0 0 0 2px rgba(96, 165, 250, 0.25);
          transform: scale(1.03);
        }
        50% {
          background: linear-gradient(90deg, rgba(96, 165, 250, 0.25) 0%, rgba(96, 165, 250, 0.35) 100%);
          box-shadow: 0 4px 12px rgba(96, 165, 250, 0.3), 0 0 0 1px rgba(96, 165, 250, 0.2);
        }
        100% {
          background: linear-gradient(90deg, rgba(96, 165, 250, 0.2) 0%, rgba(96, 165, 250, 0.3) 100%);
          box-shadow: 0 4px 12px rgba(96, 165, 250, 0.25), 0 0 0 1px rgba(96, 165, 250, 0.15);
          transform: scale(1.02);
        }
      }
    `
    document.head.appendChild(style)
    return () => {
      document.head.removeChild(style)
    }
  }, [])

  // Load related guides
  useEffect(() => {
    loadRelatedGuides()
    checkCompletion()
    checkBookmark()
    loadNotes()
    if (guide.article_content) {
      calculateReadingTime()
      // Extract TOC after DOM is ready
      setTimeout(() => {
        extractTableOfContents()
      }, 200)
    }
  }, [guide])

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Fullscreen toggle
      if (e.key === 'F11') {
        e.preventDefault()
        if (!isFullscreen) {
          document.documentElement.requestFullscreen?.()
        } else {
          document.exitFullscreen?.()
        }
      }
      
      // Escape handling
      if (e.key === 'Escape') {
        if (isFullscreen) {
          document.exitFullscreen?.()
        } else {
          onClose()
        }
      }
      
      // Print shortcut
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault()
        if (guide.content_type === 'article') {
          handlePrint()
        }
      }
      
      // Font size shortcuts (only for articles)
      if (guide.content_type === 'article') {
        if ((e.ctrlKey || e.metaKey) && e.key === '0') {
          e.preventDefault()
          setFontSize('base')
        }
        if ((e.ctrlKey || e.metaKey) && e.key === '-') {
          e.preventDefault()
          if (fontSize === 'lg') setFontSize('base')
          else if (fontSize === 'base') setFontSize('sm')
        }
        if ((e.ctrlKey || e.metaKey) && e.key === '=') {
          e.preventDefault()
          if (fontSize === 'sm') setFontSize('base')
          else if (fontSize === 'base') setFontSize('lg')
        }
        
        // TOC toggle
        if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
          e.preventDefault()
          setShowTOC(!showTOC)
        }
      }
      
      // Bookmark shortcut
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault()
        toggleBookmark()
      }
      
      // Share shortcut
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && e.shiftKey) {
        e.preventDefault()
        handleShare()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isFullscreen, onClose, fontSize, showTOC, guide.content_type])

  // Scroll spy for TOC
  useEffect(() => {
    if (!guide.article_content || tableOfContents.length === 0) return

    const handleScroll = () => {
      const headings = tableOfContents.map(item => {
        const element = document.getElementById(item.id)
        return { id: item.id, element, top: element?.getBoundingClientRect().top || 0 }
      })

      const current = headings
        .filter(h => h.top <= 100)
        .sort((a, b) => b.top - a.top)[0]

      if (current) {
        setActiveHeading(current.id)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [tableOfContents, guide.article_content])

  const extractTableOfContents = () => {
    if (!guide.article_content) return

    const parser = new DOMParser()
    const doc = parser.parseFromString(guide.article_content, 'text/html')
    const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6')
    
    const toc: TableOfContentsItem[] = []
    headings.forEach((heading, index) => {
      const id = `heading-${index}`
      if (!heading.id) {
        heading.id = id
      }
      const level = parseInt(heading.tagName.charAt(1))
      toc.push({
        id: heading.id,
        text: heading.textContent || '',
        level
      })
    })

    setTableOfContents(toc)
    
    // Update article content with IDs after a short delay to ensure DOM is ready
    setTimeout(() => {
      if (articleRef.current) {
        const headingsInDOM = articleRef.current.querySelectorAll('h1, h2, h3, h4, h5, h6')
        headingsInDOM.forEach((heading, index) => {
          if (!heading.id) {
            heading.id = `heading-${index}`
          }
        })
      }
    }, 100)
  }

  const calculateReadingTime = () => {
    if (!guide.article_content) return

    const parser = new DOMParser()
    const doc = parser.parseFromString(guide.article_content, 'text/html')
    const text = doc.body.textContent || ''
    const words = text.split(/\s+/).length
    const wordsPerMinute = 200
    const time = Math.ceil(words / wordsPerMinute)
    setReadingTime(time)
  }

  const loadRelatedGuides = async () => {
    try {
      setLoadingRelated(true)
      const supabase = getSupabaseClient()
      
      const { data, error } = await supabase
        .from('user_guides')
        .select('*')
        .eq('is_active', true)
        .eq('category', guide.category)
        .neq('id', guide.id)
        .order('is_featured', { ascending: false })
        .order('view_count', { ascending: false })
        .limit(4)
      
      if (error) throw error
      setRelatedGuides(data || [])
    } catch (error) {
      console.error('Error loading related guides:', error)
    } finally {
      setLoadingRelated(false)
    }
  }

  const checkCompletion = async () => {
    try {
      const supabase = getSupabaseClient()
      const userId = user?.id || appUser?.id
      const userEmail = user?.email || appUser?.email
      
      if (!userId && !userEmail) return
      
      let query = supabase
        .from('user_guide_views')
        .select('completed, watch_duration_seconds')
        .eq('guide_id', guide.id)
        .limit(1)
      
      if (userId) {
        query = query.eq('user_id', userId)
      } else if (userEmail) {
        query = query.eq('user_email', userEmail)
      } else {
        return
      }
      
      const { data } = await query
      if (data && data.length > 0) {
        const viewData = data[0] as any
        setIsCompleted(viewData.completed || false)
        setWatchTime(viewData.watch_duration_seconds || 0)
        if (guide.duration_minutes) {
          const totalSeconds = guide.duration_minutes * 60
          setProgress(Math.min(100, ((viewData.watch_duration_seconds || 0) / totalSeconds) * 100))
        }
      }
    } catch (error) {
      console.error('Error checking completion:', error)
    }
  }

  const checkBookmark = async () => {
    try {
      const supabase = getSupabaseClient()
      const userId = user?.id || appUser?.id
      const userEmail = user?.email || appUser?.email
      
      if (!userId && !userEmail) return
      
      // Check if bookmarked (using notes field or a separate table)
      // For now, we'll use localStorage
      const bookmarks = JSON.parse(localStorage.getItem('user_guide_bookmarks') || '[]')
      setIsBookmarked(bookmarks.includes(guide.id))
    } catch (error) {
      console.error('Error checking bookmark:', error)
    }
  }

  const loadNotes = async () => {
    try {
      const supabase = getSupabaseClient()
      const userId = user?.id || appUser?.id
      const userEmail = user?.email || appUser?.email
      
      if (!userId && !userEmail) return
      
      // Load notes from localStorage for now
      const notesKey = `guide_notes_${guide.id}`
      const savedNotes = localStorage.getItem(notesKey)
      if (savedNotes) {
        setNotes(savedNotes)
      }
    } catch (error) {
      console.error('Error loading notes:', error)
    }
  }

  const saveNotes = () => {
    const notesKey = `guide_notes_${guide.id}`
    localStorage.setItem(notesKey, notes)
  }

  // Close related context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (relatedContextMenu) {
        setRelatedContextMenu(null)
      }
    }
    if (relatedContextMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [relatedContextMenu])

  const handleRelatedGuideContextMenu = (e: React.MouseEvent, relatedGuide: any) => {
    e.preventDefault()
    e.stopPropagation()
    setRelatedContextMenu({ x: e.clientX, y: e.clientY, guide: relatedGuide })
  }

  const handleRelatedGuideClick = (relatedGuide: any, e?: React.MouseEvent) => {
    // Check if user wants to open in new tab
    const openInNewTab = e && (e.ctrlKey || e.metaKey || e.button === 1)
    
    if (openInNewTab) {
      const slug = createSlug(relatedGuide.title)
      const url = `/user-guide?guide=${slug}`
      window.open(url, '_blank')
      return
    }
    
    // Normal click
    const slug = createSlug(relatedGuide.title)
    router.push(`/user-guide?guide=${slug}`)
  }

  const handleRelatedOpenInNewTab = () => {
    if (relatedContextMenu) {
      const slug = createSlug(relatedContextMenu.guide.title)
      const url = `/user-guide?guide=${slug}`
      window.open(url, '_blank')
      setRelatedContextMenu(null)
    }
  }

  const handleRelatedCopyLink = () => {
    if (relatedContextMenu) {
      const slug = createSlug(relatedContextMenu.guide.title)
      const url = `${window.location.origin}/user-guide?guide=${slug}`
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      setRelatedContextMenu(null)
    }
  }

  const toggleBookmark = () => {
    const bookmarks = JSON.parse(localStorage.getItem('user_guide_bookmarks') || '[]')
    if (isBookmarked) {
      const updated = bookmarks.filter((id: string) => id !== guide.id)
      localStorage.setItem('user_guide_bookmarks', JSON.stringify(updated))
      setIsBookmarked(false)
    } else {
      bookmarks.push(guide.id)
      localStorage.setItem('user_guide_bookmarks', JSON.stringify(bookmarks))
      setIsBookmarked(true)
    }
    // Visual feedback
    const button = document.querySelector('[data-bookmark-button]') as HTMLElement
    if (button) {
      button.style.transform = 'scale(1.2)'
      setTimeout(() => {
        button.style.transform = 'scale(1)'
      }, 200)
    }
  }

  const getEmbedUrl = (url: string) => {
    if (!url) return null
    
    if (url.includes('drive.google.com')) {
      const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/)
      if (match) {
        return `https://drive.google.com/file/d/${match[1]}/preview`
      }
    }
    
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      let videoId = ''
      if (url.includes('youtube.com/watch?v=')) {
        videoId = url.split('v=')[1]?.split('&')[0] || ''
      } else if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0] || ''
      } else if (url.includes('youtube.com/embed/')) {
        videoId = url.split('embed/')[1]?.split('?')[0] || ''
      }
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&autoplay=0`
      }
    }
    
    return url
  }

  const embedUrl = guide.video_url ? getEmbedUrl(guide.video_url) : null

  const handleComplete = async () => {
    setIsCompleted(true)
    setProgress(100)
    try {
      const supabase = getSupabaseClient()
      const userId = user?.id || appUser?.id || 'anonymous'
      const userEmail = user?.email || appUser?.email
      
      const supabaseAny = supabase as any
      const { data: existing } = await supabaseAny
        .from('user_guide_views')
        .select('id')
        .eq('guide_id', guide.id)
        .or(`user_id.eq.${userId},user_email.eq.${userEmail}`)
        .limit(1)
        .single()
      
      if (existing) {
        await supabaseAny
          .from('user_guide_views')
          .update({ 
            completed: true,
            watch_duration_seconds: watchTime || (guide.duration_minutes ? guide.duration_minutes * 60 : 0)
          })
          .eq('id', existing.id)
      } else {
        await supabaseAny
          .from('user_guide_views')
          .insert({
            guide_id: guide.id,
            user_id: userId,
            user_email: userEmail,
            completed: true,
            watch_duration_seconds: watchTime || (guide.duration_minutes ? guide.duration_minutes * 60 : 0)
          })
      }
    } catch (error) {
      console.error('Error updating completion:', error)
    }
  }

  const getGuideUrl = () => {
    if (typeof window === 'undefined') return ''
    const slug = createSlug(guide.title)
    return `${window.location.origin}/user-guide?guide=${slug}`
  }

  const handleShare = async () => {
    const url = getGuideUrl()
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Error copying to clipboard:', error)
    }
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${guide.title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            h1 { color: #1f2937; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
            h2 { color: #374151; margin-top: 30px; }
            h3 { color: #4b5563; }
            p { line-height: 1.6; color: #1f2937; }
            img { max-width: 100%; height: auto; }
            .meta { color: #6b7280; font-size: 14px; margin-bottom: 30px; }
            @media print {
              body { padding: 20px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>${guide.title}</h1>
          <div class="meta">
            ${guide.category ? `<strong>Category:</strong> ${guide.category} | ` : ''}
            ${guide.difficulty_level ? `<strong>Difficulty:</strong> ${guide.difficulty_level} | ` : ''}
            ${guide.duration_minutes ? `<strong>Duration:</strong> ${guide.duration_minutes} min | ` : ''}
            <strong>Views:</strong> ${guide.view_count || 0}
          </div>
          ${guide.description ? `<p><em>${guide.description}</em></p>` : ''}
          ${guide.article_content || ''}
        </body>
      </html>
    `

    printWindow.document.write(content)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }

  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      // Remove previous highlight from all headings
      document.querySelectorAll('.highlight-heading').forEach(el => {
        el.classList.remove('highlight-heading')
      })

      // Set active heading immediately
      setActiveHeading(id)

      // Scroll to element with offset for header - immediate scroll first
      const offset = 120
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - offset

      // Immediate scroll to get close
      window.scrollTo({
        top: offsetPosition,
        behavior: 'auto'
      })

      // Add highlight immediately
      element.classList.add('highlight-heading')

      // Fine-tune scroll position smoothly
      setTimeout(() => {
        const finalPosition = element.getBoundingClientRect().top + window.pageYOffset - offset
        window.scrollTo({
          top: finalPosition,
          behavior: 'smooth'
        })
      }, 10)
      
      // Remove highlight after animation completes (longer duration for better visibility)
      setTimeout(() => {
        element.classList.remove('highlight-heading')
      }, 3000)
    }
  }

  const getDifficultyColor = () => {
    switch (guide.difficulty_level) {
      case 'beginner':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'advanced':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    }
  }

  const getContentIcon = () => {
    switch (guide.content_type) {
      case 'video':
        return <Video className="h-5 w-5" />
      case 'article':
        return <FileText className="h-5 w-5" />
      case 'tutorial':
        return <GraduationCap className="h-5 w-5" />
      default:
        return <BookOpen className="h-5 w-5" />
    }
  }

  const fontSizeClasses = {
    sm: 'prose-sm text-sm',
    base: 'prose-base text-base',
    lg: 'prose-lg text-lg',
    xl: 'prose-xl text-xl'
  }

  // Save font size preference
  useEffect(() => {
    if (guide.content_type === 'article') {
      localStorage.setItem('user_guide_font_size', fontSize)
    }
  }, [fontSize, guide.content_type])

  // Load font size preference
  useEffect(() => {
    if (guide.content_type === 'article') {
      const savedFontSize = localStorage.getItem('user_guide_font_size') as 'sm' | 'base' | 'lg' | 'xl' | null
      if (savedFontSize && ['sm', 'base', 'lg', 'xl'].includes(savedFontSize)) {
        setFontSize(savedFontSize)
      }
    }
  }, [guide.content_type])

  return (
    <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto ${isFullscreen ? 'fullscreen' : ''}`}>
      <div className={`min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-all duration-300 ${isFullscreen ? 'p-0' : ''}`}>
        {/* Enhanced Header */}
        <div className="sticky top-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700 z-10 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            {/* Breadcrumb */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <button
                  onClick={onClose}
                  className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Guides
                </button>
                <span>/</span>
                <span>{guide.category || 'Guide'}</span>
              </div>

              {/* Article Controls */}
              {guide.content_type === 'article' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowTOC(!showTOC)}
                    className={`p-2 rounded-lg transition-all ${
                      showTOC 
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 shadow-md' 
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                    title="Table of Contents (Toggle)"
                  >
                    <Menu className="h-4 w-4" />
                  </button>
                  <div className="flex items-center gap-1 border border-gray-300 dark:border-gray-600 rounded-lg p-1 bg-white dark:bg-gray-800">
                    <button
                      onClick={() => setFontSize('sm')}
                      className={`p-1.5 rounded transition-all ${
                        fontSize === 'sm' 
                          ? 'bg-blue-600 text-white shadow-sm' 
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      title="Small Text (A-)"
                    >
                      <Type className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setFontSize('base')}
                      className={`p-1.5 rounded transition-all ${
                        fontSize === 'base' 
                          ? 'bg-blue-600 text-white shadow-sm' 
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      title="Normal Text (A)"
                    >
                      <Type className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setFontSize('lg')}
                      className={`p-1.5 rounded transition-all ${
                        fontSize === 'lg' 
                          ? 'bg-blue-600 text-white shadow-sm' 
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      title="Large Text (A+)"
                    >
                      <Type className="h-5 w-5" />
                    </button>
                  </div>
                  <button
                    onClick={handlePrint}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all hover:shadow-md"
                    title="Print Article (Ctrl+P)"
                  >
                    <Printer className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    {getContentIcon()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white line-clamp-2">
                      {guide.title}
                    </h1>
                  </div>
                  {guide.is_featured && (
                    <div className="flex-shrink-0 px-3 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-full text-xs font-semibold flex items-center gap-1">
                      <Star className="h-3 w-3 fill-current" />
                      Featured
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4 flex-wrap text-sm text-gray-500 dark:text-gray-400">
                  {guide.category && (
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      {guide.category}
                    </span>
                  )}
                  {guide.difficulty_level && (
                    <span className={`flex items-center gap-1 px-2 py-1 rounded ${getDifficultyColor()}`}>
                      {guide.difficulty_level}
                    </span>
                  )}
                  {guide.duration_minutes && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {guide.duration_minutes} min
                    </span>
                  )}
                  {readingTime > 0 && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {readingTime} min read
                    </span>
                  )}
                  {guide.view_count > 0 && (
                    <span className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      {guide.view_count} views
                    </span>
                  )}
                  {guide.created_at && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(guide.created_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  data-bookmark-button
                  onClick={toggleBookmark}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    isBookmarked 
                      ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 shadow-sm hover:shadow-md' 
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:shadow-sm'
                  }`}
                  title={isBookmarked ? "Remove Bookmark (Ctrl+D)" : "Add Bookmark (Ctrl+D)"}
                >
                  {isBookmarked ? (
                    <BookmarkCheck className="h-5 w-5" />
                  ) : (
                    <Bookmark className="h-5 w-5" />
                  )}
                </button>
                <button
                  onClick={async () => {
                    try {
                      if (!isFullscreen) {
                        await document.documentElement.requestFullscreen?.()
                        setIsFullscreen(true)
                      } else {
                        await document.exitFullscreen?.()
                        setIsFullscreen(false)
                      }
                    } catch (error) {
                      console.error('Fullscreen error:', error)
                      // Fallback: just toggle state
                      setIsFullscreen(!isFullscreen)
                    }
                  }}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    isFullscreen 
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 shadow-md ring-2 ring-blue-300 dark:ring-blue-700 hover:ring-blue-400 dark:hover:ring-blue-600' 
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:shadow-sm'
                  }`}
                  title={isFullscreen ? "Exit Fullscreen (Esc or F11)" : "Enter Fullscreen (F11)"}
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-5 w-5" />
                  ) : (
                    <Maximize2 className="h-5 w-5" />
                  )}
                </button>
                <button
                  onClick={handleShare}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    copied 
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 shadow-sm animate-pulse' 
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:shadow-sm'
                  }`}
                  title={copied ? "Link Copied! (Ctrl+Shift+S)" : "Share Guide (Ctrl+Shift+S)"}
                >
                  {copied ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Share2 className="h-5 w-5" />
                  )}
                </button>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-all duration-200 hover:text-red-600 dark:hover:text-red-400 text-gray-600 dark:text-gray-400 hover:shadow-sm"
                  title="Close Guide (Esc)"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Table of Contents Sidebar (for articles) */}
              {guide.content_type === 'article' && showTOC && tableOfContents.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-lg lg:hidden mb-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Table of Contents</h3>
                  <nav className="space-y-1">
                    {tableOfContents.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => scrollToHeading(item.id)}
                        className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          activeHeading === item.id
                            ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                        style={{ paddingLeft: `${(item.level - 1) * 16 + 12}px` }}
                      >
                        {item.text}
                      </button>
                    ))}
                  </nav>
                </div>
              )}

              {/* Video/Content */}
              {guide.content_type === 'video' && embedUrl ? (
                <div className="bg-black rounded-xl overflow-hidden shadow-2xl relative group">
                  <div className="aspect-video">
                    <iframe
                      src={embedUrl}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title={guide.title}
                    />
                  </div>
                  {guide.duration_minutes && progress > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800">
                      <div 
                        className="h-full bg-blue-600 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}
                </div>
              ) : guide.content_type === 'video' && guide.video_url ? (
                <div className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-xl p-12 text-center shadow-lg">
                  <div className="w-20 h-20 bg-white dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <Play className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Video Not Embeddable
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Click the button below to watch on the original platform
                  </p>
                  <a
                    href={guide.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-lg hover:shadow-xl"
                  >
                    <ExternalLink className="h-5 w-5" />
                    Open Video
                  </a>
                </div>
              ) : guide.article_content ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 shadow-lg">
                  <div 
                    ref={articleRef}
                    className={`prose ${fontSizeClasses[fontSize]} dark:prose-invert max-w-none prose-headings:font-bold prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-strong:text-gray-900 dark:prose-strong:text-white prose-code:text-blue-600 dark:prose-code:text-blue-400 prose-headings:scroll-mt-20 prose-headings:transition-all prose-headings:duration-300`}
                    dangerouslySetInnerHTML={{ __html: guide.article_content }}
                  />
                </div>
              ) : (
                <div className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-xl p-12 text-center shadow-lg">
                  <BookOpen className="h-20 w-20 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Content Not Available
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    This guide doesn't have any content yet.
                  </p>
                </div>
              )}

              {/* Description */}
              {guide.description && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-lg">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    About This Guide
                  </h2>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                    {guide.description}
                  </p>
                </div>
              )}

              {/* Tags */}
              {guide.tags && guide.tags.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-lg">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Tag className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    Tags
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {guide.tags.map((tag: string, index: number) => (
                      <span
                        key={index}
                        className="px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors cursor-pointer"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Related Guides */}
              {relatedGuides.length > 0 && (
                <>
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-lg">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      Related Guides
                    </h2>
                    {loadingRelated ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {relatedGuides.map((relatedGuide) => (
                          <div
                            key={relatedGuide.id}
                            onClick={(e) => handleRelatedGuideClick(relatedGuide, e)}
                            onContextMenu={(e) => handleRelatedGuideContextMenu(e, relatedGuide)}
                            onMouseDown={(e) => {
                              // Handle middle click
                              if (e.button === 1) {
                                e.preventDefault()
                                handleRelatedGuideClick(relatedGuide, e)
                              }
                            }}
                            className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all cursor-pointer group"
                          >
                            <div className="flex items-start gap-3">
                              {relatedGuide.video_thumbnail_url ? (
                                <img
                                  src={relatedGuide.video_thumbnail_url}
                                  alt={relatedGuide.title}
                                  className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                                />
                              ) : (
                                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                  {getContentIcon()}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                  {relatedGuide.title}
                                </h3>
                                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                                  {relatedGuide.duration_minutes && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {relatedGuide.duration_minutes} min
                                    </span>
                                  )}
                                  {relatedGuide.view_count > 0 && (
                                    <span className="flex items-center gap-1">
                                      <Eye className="h-3 w-3" />
                                      {relatedGuide.view_count}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Related Guides Context Menu */}
                  {relatedContextMenu && (
                    <div
                      className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 py-2 min-w-[200px]"
                      style={{ top: relatedContextMenu.y, left: relatedContextMenu.x }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => {
                          if (relatedContextMenu) {
                            const slug = createSlug(relatedContextMenu.guide.title)
                            router.push(`/user-guide?guide=${slug}`)
                            setRelatedContextMenu(null)
                          }
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
                      >
                        <BookOpen className="h-4 w-4" />
                        Open
                      </button>
                      <button
                        onClick={handleRelatedOpenInNewTab}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Open in New Tab
                      </button>
                      <button
                        onClick={handleRelatedCopyLink}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
                      >
                        <Link2 className="h-4 w-4" />
                        Copy Link
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Enhanced Sidebar */}
            <div className="space-y-6">
              {/* Table of Contents (Desktop) */}
              {guide.content_type === 'article' && tableOfContents.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-lg hidden lg:block">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Menu className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    Table of Contents
                  </h3>
                  <nav className="space-y-1 max-h-96 overflow-y-auto">
                    {tableOfContents.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => scrollToHeading(item.id)}
                        className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          activeHeading === item.id
                            ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                        style={{ paddingLeft: `${(item.level - 1) * 16 + 12}px` }}
                      >
                        {item.text}
                      </button>
                    ))}
                  </nav>
                </div>
              )}

              {/* Progress Card */}
              {guide.content_type === 'video' && guide.duration_minutes && (
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-6 text-white shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Progress</h3>
                    <span className="text-2xl font-bold">{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-3 mb-4">
                    <div 
                      className="bg-white rounded-full h-3 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-sm text-blue-100">
                    <span>{Math.round((progress / 100) * guide.duration_minutes)} min</span>
                    <span>{guide.duration_minutes} min</span>
                  </div>
                </div>
              )}

              {/* Completion Card */}
              {guide.content_type === 'video' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-lg">
                  {!isCompleted ? (
                    <>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Mark as Complete
                        </h3>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Mark this guide as completed to track your progress
                      </p>
                      <button
                        onClick={handleComplete}
                        className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg transition-all shadow-lg hover:shadow-xl font-semibold flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="h-5 w-5" />
                        Mark as Completed
                      </button>
                    </>
                  ) : (
                    <div className="text-center">
                      <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Completed!
                      </h3>
                      <p className="text-sm text-green-600 dark:text-green-400">
                        Great job! You've completed this guide.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Notes Card */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    My Notes
                  </h3>
                  <button
                    onClick={() => setShowNotes(!showNotes)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {showNotes ? 'Hide' : 'Show'}
                  </button>
                </div>
                {showNotes && (
                  <div className="space-y-3">
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      onBlur={saveNotes}
                      placeholder="Add your notes here..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={4}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Notes are saved automatically
                    </p>
                  </div>
                )}
              </div>

              {/* Guide Information Card */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  Guide Information
                </h3>
                <div className="space-y-4">
                  {guide.difficulty_level && (
                    <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Difficulty
                      </span>
                      <span className={`text-sm font-medium px-3 py-1 rounded ${getDifficultyColor()}`}>
                        {guide.difficulty_level}
                      </span>
                    </div>
                  )}
                  {guide.content_type && (
                    <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                        {getContentIcon()}
                        Type
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                        {guide.content_type}
                      </span>
                    </div>
                  )}
                  {guide.duration_minutes && (
                    <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Duration
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {guide.duration_minutes} minutes
                      </span>
                    </div>
                  )}
                  {readingTime > 0 && (
                    <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Reading Time
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {readingTime} min
                      </span>
                    </div>
                  )}
                  {guide.view_count > 0 && (
                    <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Views
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {guide.view_count.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {guide.created_at && (
                    <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Created
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {new Date(guide.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {guide.created_by && (
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Author
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[150px]">
                        {guide.created_by}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Quick Actions
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={handleShare}
                    className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Share2 className="h-4 w-4" />
                        Share Guide
                      </>
                    )}
                  </button>
                  {guide.video_url && (
                    <a
                      href={guide.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open Original
                    </a>
                  )}
                  {guide.content_type === 'article' && (
                    <button
                      onClick={handlePrint}
                      className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Printer className="h-4 w-4" />
                      Print Article
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
