'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/app/providers'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { PermissionGuard } from '@/components/common/PermissionGuard'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
import { UserGuideViewer } from '@/components/user-guide/UserGuideViewer'
import { UserGuideManager } from '@/components/user-guide/UserGuideManager'
import { useSearchParams, useRouter } from 'next/navigation'
import { createSlug, findGuideBySlug } from '@/lib/slugHelper'
import { BookOpen, Video, FileText, GraduationCap, Search, Filter, Grid, List, Edit, Star, TrendingUp, Clock, Eye, BarChart3, Sparkles, Link2, Check, ExternalLink, Trash2, EyeOff, Eye as EyeIcon } from 'lucide-react'

export default function UserGuidePage() {
  const { user, appUser } = useAuth()
  const guard = usePermissionGuard()
  const canView = guard.hasAccess('user_guide.view')
  const canManage = guard.hasAccess('user_guide.manage')
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const [guides, setGuides] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showManager, setShowManager] = useState(false)
  const [selectedGuide, setSelectedGuide] = useState<any>(null)
  const [guideToEdit, setGuideToEdit] = useState<any>(null)
  const [recentlyViewed, setRecentlyViewed] = useState<any[]>([])
  const [copiedGuideId, setCopiedGuideId] = useState<string | null>(null)
  const [showInactive, setShowInactive] = useState(false)

  const categories = ['all', 'Getting Started', 'KPI Management', 'BOQ', 'Projects', 'Reports', 'Settings', 'Advanced']
  const contentTypes = ['all', 'video', 'article', 'tutorial']

  useEffect(() => {
    loadGuides()
    loadRecentlyViewed()
  }, [user, appUser, showInactive])

  // Check for guide slug in URL
  useEffect(() => {
    const guideSlugFromUrl = searchParams?.get('guide')
    if (guideSlugFromUrl && guides.length > 0) {
      const guide = findGuideBySlug(guides, guideSlugFromUrl)
      if (guide && !selectedGuide) {
        handleGuideClick(guide, undefined, false) // Don't update URL again
      }
    }
  }, [searchParams, guides])

  const loadGuides = async () => {
    setLoading(true)
    try {
      const supabase = getSupabaseClient()
      let query = supabase
        .from('user_guides')
        .select('*')
      
      // If user is admin and wants to see inactive, show all. Otherwise, only active
      if (!canManage || !showInactive) {
        query = query.eq('is_active', true)
      }
      
      const { data, error } = await query
        .order('is_featured', { ascending: false })
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false })

      if (error) throw error
      setGuides(data || [])
    } catch (error: any) {
      console.error('Error loading guides:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadRecentlyViewed = async () => {
    try {
      const supabase = getSupabaseClient()
      const userId = user?.id || appUser?.id
      const userEmail = user?.email || appUser?.email
      
      if (!userId && !userEmail) return
      
      // Build query based on available identifiers
      let query = supabase
        .from('user_guide_views')
        .select('guide_id, viewed_at, user_guides(*)')
        .order('viewed_at', { ascending: false })
        .limit(10)
      
      if (userId) {
        query = query.eq('user_id', userId)
      } else if (userEmail) {
        query = query.eq('user_email', userEmail)
      } else {
        return
      }
      
      const { data: views, error } = await query
      
      if (error) throw error
      
      const viewedGuides = (views || [])
        .map((v: any) => v.user_guides)
        .filter(Boolean)
        .filter((g: any, index: number, self: any[]) => 
          index === self.findIndex((t: any) => t && t.id === g.id)
        )
        .slice(0, 5)
      
      setRecentlyViewed(viewedGuides)
    } catch (error) {
      console.error('Error loading recently viewed:', error)
    }
  }

  const featuredGuides = guides.filter(g => g.is_featured)
  const guidesByCategory = guides.reduce((acc, guide) => {
    const cat = guide.category || 'Uncategorized'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(guide)
    return acc
  }, {} as Record<string, any[]>)

  const filteredGuides = guides.filter(guide => {
    const matchesSearch = !searchQuery || 
      guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guide.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guide.tags?.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesCategory = selectedCategory === 'all' || guide.category === selectedCategory
    const matchesType = selectedType === 'all' || guide.content_type === selectedType

    return matchesSearch && matchesCategory && matchesType
  })

  const stats = {
    total: guides.length,
    featured: featuredGuides.length,
    videos: guides.filter(g => g.content_type === 'video').length,
    articles: guides.filter(g => g.content_type === 'article').length,
    totalViews: guides.reduce((sum, g) => sum + (g.view_count || 0), 0),
    hidden: guides.filter(g => !g.is_active).length
  }

  const getGuideUrl = (guide: any) => {
    if (typeof window === 'undefined') return ''
    const slug = createSlug(guide.title)
    return `${window.location.origin}/user-guide?guide=${slug}`
  }

  const handleCopyLink = async (guide: any, e: React.MouseEvent) => {
    e.stopPropagation()
    const url = getGuideUrl(guide)
    try {
      await navigator.clipboard.writeText(url)
      setCopiedGuideId(guide.id)
      setTimeout(() => setCopiedGuideId(null), 2000)
    } catch (error) {
      console.error('Error copying link:', error)
    }
  }

  const handleGuideClick = async (guide: any, e?: React.MouseEvent, updateUrl: boolean = true) => {
    // Check if user wants to open in new tab (Ctrl+Click, Cmd+Click, or Middle Click)
    const openInNewTab = e && (e.ctrlKey || e.metaKey || e.button === 1)
    
    if (openInNewTab) {
      // Open in new tab
      const slug = createSlug(guide.title)
      const url = `/user-guide?guide=${slug}`
      window.open(url, '_blank')
      return
    }
    
    // Normal click - open in same page
    setSelectedGuide(guide)
    
    // Update URL with slug
    if (updateUrl) {
      const slug = createSlug(guide.title)
      const newUrl = `/user-guide?guide=${slug}`
      router.push(newUrl)
    }
    
    // Track view
    try {
      const supabase = getSupabaseClient()
      await supabase
        .from('user_guide_views')
        .insert({
          guide_id: guide.id,
          user_id: user?.id || appUser?.id || 'anonymous',
          user_email: user?.email || appUser?.email
        } as any)
      
      // Update view count
      const supabaseAny = supabase as any
      await supabaseAny
        .from('user_guides')
        .update({ 
          view_count: (guide.view_count || 0) + 1,
          last_viewed_at: new Date().toISOString()
        })
        .eq('id', guide.id)
    } catch (error) {
      console.error('Error tracking view:', error)
    }
  }

  const handleCloseViewer = () => {
    setSelectedGuide(null)
    router.push('/user-guide') // Remove guide parameter from URL
    loadGuides() // Refresh to update view counts
  }

  const handleDeleteGuide = async (guide: any) => {
    if (!confirm(`Are you sure you want to delete "${guide.title}"?\n\nThis action cannot be undone.`)) {
      return
    }

    try {
      const supabase = getSupabaseClient()
      const supabaseAny = supabase as any
      const { error } = await supabaseAny
        .from('user_guides')
        .delete()
        .eq('id', guide.id)

      if (error) throw error

      // Refresh guides list
      loadGuides()
      alert('Guide deleted successfully!')
    } catch (error: any) {
      console.error('Error deleting guide:', error)
      alert(`Failed to delete guide: ${error.message}`)
    }
  }

  const handleToggleActive = async (guide: any) => {
    try {
      const supabase = getSupabaseClient()
      const supabaseAny = supabase as any
      const newActiveState = !guide.is_active
      
      const { error } = await supabaseAny
        .from('user_guides')
        .update({ 
          is_active: newActiveState,
          updated_at: new Date().toISOString()
        })
        .eq('id', guide.id)

      if (error) throw error

      // Refresh guides list
      loadGuides()
    } catch (error: any) {
      console.error('Error toggling guide active state:', error)
      alert(`Failed to ${guide.is_active ? 'hide' : 'show'} guide: ${error.message}`)
    }
  }

  if (selectedGuide) {
    return (
      <UserGuideViewer
        guide={selectedGuide}
        onClose={handleCloseViewer}
      />
    )
  }

  // Check if user has permission to view
  if (!canView) {
    return (
      <PermissionGuard permission="user_guide.view">
        <div className="p-6">
          <div className="text-center text-gray-600 dark:text-gray-400">
            You don't have permission to view user guides.
          </div>
        </div>
      </PermissionGuard>
    )
  }

  if (showManager && canManage) {
    return (
      <UserGuideManager
        onClose={() => {
          setShowManager(false)
          setGuideToEdit(null)
        }}
        onSave={() => {
          loadGuides()
          setGuideToEdit(null)
        }}
        guideToEdit={guideToEdit}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  User Guide
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Learn how to use the application with our tutorials and guides
                </p>
              </div>
            </div>
            {canManage && (
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                  <input
                    type="checkbox"
                    checked={showInactive}
                    onChange={(e) => {
                      setShowInactive(e.target.checked)
                    }}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Show Hidden Guides</span>
                </label>
                <button
                  onClick={() => setShowManager(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <GraduationCap className="h-4 w-4" />
                  Manage Guides
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className={`grid grid-cols-2 ${canManage ? 'md:grid-cols-6' : 'md:grid-cols-5'} gap-4 mb-6`}>
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-xs font-medium mb-1">Total Guides</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <BookOpen className="h-8 w-8 text-blue-200" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl p-4 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-xs font-medium mb-1">Featured</p>
                <p className="text-2xl font-bold">{stats.featured}</p>
              </div>
              <Star className="h-8 w-8 text-yellow-200" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-xs font-medium mb-1">Videos</p>
                <p className="text-2xl font-bold">{stats.videos}</p>
              </div>
              <Video className="h-8 w-8 text-purple-200" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-xs font-medium mb-1">Articles</p>
                <p className="text-2xl font-bold">{stats.articles}</p>
              </div>
              <FileText className="h-8 w-8 text-green-200" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-4 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-100 text-xs font-medium mb-1">Total Views</p>
                <p className="text-2xl font-bold">{stats.totalViews}</p>
              </div>
              <Eye className="h-8 w-8 text-indigo-200" />
            </div>
          </div>
          {canManage && (
            <div className="bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl p-4 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-100 text-xs font-medium mb-1">Hidden Guides</p>
                  <p className="text-2xl font-bold">{stats.hidden}</p>
                </div>
                <EyeOff className="h-8 w-8 text-gray-200" />
              </div>
            </div>
          )}
        </div>

        {/* Featured Section */}
        {featuredGuides.length > 0 && !searchQuery && selectedCategory === 'all' && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Featured Guides</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredGuides.slice(0, 3).map((guide) => (
                <GuideCard
                  key={guide.id}
                  guide={guide}
                  viewMode="grid"
                  onClick={(e) => handleGuideClick(guide, e)}
                  onEdit={canManage ? () => {
                    setGuideToEdit(guide)
                    setShowManager(true)
                  } : undefined}
                  featured={true}
                />
              ))}
            </div>
          </div>
        )}

        {/* Recently Viewed */}
        {recentlyViewed.length > 0 && !searchQuery && selectedCategory === 'all' && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-blue-500" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recently Viewed</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {recentlyViewed.map((guide) => (
                <GuideCard
                  key={guide.id}
                  guide={guide}
                  viewMode="grid"
                  onClick={(e) => handleGuideClick(guide, e)}
                  onEdit={canManage ? () => {
                    setGuideToEdit(guide)
                    setShowManager(true)
                  } : undefined}
                  compact={true}
                />
              ))}
            </div>
          </div>
        )}

        {/* Category Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-col gap-4">
            {/* Search and Filters Row */}
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search guides..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Type Filter */}
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {contentTypes.map(type => (
                  <option key={type} value={type}>
                    {type === 'all' ? 'All Types' : type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>

              {/* View Mode */}
              <div className="flex gap-2 border border-gray-300 dark:border-gray-600 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400'}`}
                  title="Grid View"
                >
                  <Grid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400'}`}
                  title="List View"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Category Tabs */}
            <div className="flex flex-wrap gap-2 border-t border-gray-200 dark:border-gray-700 pt-4">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {cat === 'all' ? 'All Categories' : cat}
                  {cat !== 'all' && guidesByCategory[cat] && (
                    <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${
                      selectedCategory === cat
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                    }`}>
                      {guidesByCategory[cat].length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* All Guides Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {selectedCategory === 'all' ? 'All Guides' : selectedCategory}
              </h2>
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-sm">
                {filteredGuides.length}
              </span>
            </div>
          </div>

          {/* Guides Grid/List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : filteredGuides.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No guides found</p>
              {searchQuery && (
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                  Try adjusting your search or filters
                </p>
              )}
            </div>
          ) : (
            <div className={viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
              : 'space-y-4'
            }>
              {filteredGuides.map((guide) => (
                <GuideCard
                  key={guide.id}
                  guide={guide}
                  viewMode={viewMode}
                  onClick={(e) => handleGuideClick(guide, e)}
                  onEdit={canManage ? () => {
                    setGuideToEdit(guide)
                    setShowManager(true)
                  } : undefined}
                  onCopyLink={(e) => handleCopyLink(guide, e)}
                  isCopied={copiedGuideId === guide.id}
                  onDelete={canManage ? () => handleDeleteGuide(guide) : undefined}
                  onToggleActive={canManage ? () => handleToggleActive(guide) : undefined}
                  isInactive={!guide.is_active}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function GuideCard({ guide, viewMode, onClick, onEdit, onCopyLink, onDelete, onToggleActive, isCopied, featured = false, compact = false, isInactive = false }: { guide: any; viewMode: 'grid' | 'list'; onClick: (e?: React.MouseEvent) => void; onEdit?: () => void; onCopyLink?: (e: React.MouseEvent) => void; onDelete?: () => void; onToggleActive?: () => void; isCopied?: boolean; featured?: boolean; compact?: boolean; isInactive?: boolean }) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  const closeContextMenu = () => {
    setContextMenu(null)
  }

  const handleOpenInNewTab = () => {
    const slug = createSlug(guide.title)
    const url = `/user-guide?guide=${slug}`
    window.open(url, '_blank')
    closeContextMenu()
  }

  const handleOpen = () => {
    onClick()
    closeContextMenu()
  }

  const handleCopyLinkFromMenu = () => {
    if (onCopyLink) {
      const syntheticEvent = {
        stopPropagation: () => {},
        preventDefault: () => {}
      } as React.MouseEvent
      onCopyLink(syntheticEvent)
    }
    closeContextMenu()
  }

  const handleToggleActiveFromMenu = () => {
    if (onToggleActive) onToggleActive()
    closeContextMenu()
  }

  const handleDeleteFromMenu = () => {
    if (onDelete) onDelete()
    closeContextMenu()
  }

  const handleEditFromMenu = () => {
    if (onEdit) onEdit()
    closeContextMenu()
  }

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu) {
        closeContextMenu()
      }
    }
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [contextMenu])

  const getIcon = () => {
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

  const guideUrl = `/user-guide?guide=${createSlug(guide.title)}`
  
  if (viewMode === 'list') {
    return (
      <>
        <div
          onClick={(e) => onClick(e)}
          onContextMenu={handleContextMenu}
          onMouseDown={(e) => {
            // Handle middle click
            if (e.button === 1) {
              e.preventDefault()
              onClick(e)
            }
          }}
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-lg transition-shadow cursor-pointer flex items-center gap-4 relative"
        >
        {/* Inactive Badge */}
        {isInactive && (
          <div className="absolute top-2 left-2 z-10 px-2 py-1 bg-gray-500 dark:bg-gray-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-lg">
            <EyeOff className="h-3 w-3" />
            Hidden
          </div>
        )}
        <div className="flex-shrink-0 w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-gray-900 dark:text-white">{guide.title}</h3>
                {guide.is_featured && (
                  <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded">
                    Featured
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{guide.description}</p>
              <div className="flex items-center gap-3 mt-2">
                {guide.category && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">{guide.category}</span>
                )}
                {guide.difficulty_level && (
                  <span className={`text-xs px-2 py-0.5 rounded ${getDifficultyColor()}`}>
                    {guide.difficulty_level}
                  </span>
                )}
                {guide.duration_minutes && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {guide.duration_minutes} min
                  </span>
                )}
                {guide.view_count > 0 && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {guide.view_count} views
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 py-2 min-w-[200px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleOpen}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
          >
            <BookOpen className="h-4 w-4" />
            Open
          </button>
          <button
            onClick={handleOpenInNewTab}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Open in New Tab
          </button>
          {onCopyLink && (
            <button
              onClick={handleCopyLinkFromMenu}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
            >
              <Link2 className="h-4 w-4" />
              Copy Link
            </button>
          )}
          {onToggleActive && (
            <>
              <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
              <button
                onClick={handleToggleActiveFromMenu}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
              >
                {isInactive ? (
                  <>
                    <EyeIcon className="h-4 w-4" />
                    Show Guide
                  </>
                ) : (
                  <>
                    <EyeOff className="h-4 w-4" />
                    Hide Guide
                  </>
                )}
              </button>
            </>
          )}
          {onEdit && (
            <button
              onClick={handleEditFromMenu}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
            >
              <Edit className="h-4 w-4" />
              Edit Guide
            </button>
          )}
          {onDelete && (
            <>
              <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
              <button
                onClick={handleDeleteFromMenu}
                className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Delete Guide
              </button>
            </>
          )}
        </div>
      )}
      </>
    )
  }

  return (
    <>
    <div 
      onContextMenu={handleContextMenu}
      className={`bg-white dark:bg-gray-800 rounded-lg border overflow-hidden hover:shadow-lg transition-shadow relative group ${
      featured 
        ? 'border-yellow-300 dark:border-yellow-700 shadow-lg ring-2 ring-yellow-200 dark:ring-yellow-800' 
        : 'border-gray-200 dark:border-gray-700'
    }`}>
      {/* Featured Badge */}
      {featured && (
        <div className="absolute top-2 left-2 z-10 px-2 py-1 bg-yellow-400 dark:bg-yellow-600 text-yellow-900 dark:text-yellow-100 rounded-lg text-xs font-bold flex items-center gap-1 shadow-lg">
          <Star className="h-3 w-3 fill-current" />
          Featured
        </div>
      )}

      {/* Inactive Badge */}
      {isInactive && (
        <div className="absolute top-2 left-2 z-10 px-2 py-1 bg-gray-500 dark:bg-gray-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-lg">
          <EyeOff className="h-3 w-3" />
          Hidden
        </div>
      )}

      {/* Action Buttons (Top Right) */}
      <div className="absolute top-2 right-2 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
        {onCopyLink && (
          <button
            onClick={onCopyLink}
            className="p-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-all shadow-lg"
            title="Copy Link"
          >
            {isCopied ? (
              <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
            ) : (
              <Link2 className="h-4 w-4" />
            )}
          </button>
        )}
        {onToggleActive && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleActive()
            }}
            className="p-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-all shadow-lg"
            title={isInactive ? "Show Guide" : "Hide Guide"}
          >
            {isInactive ? (
              <EyeIcon className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
          </button>
        )}
        {onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
            className="p-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all shadow-lg"
            title="Edit Guide"
          >
            <Edit className="h-4 w-4" />
          </button>
        )}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="p-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all shadow-lg"
            title="Delete Guide"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Thumbnail or Icon */}
      <div 
        onClick={(e) => onClick(e)}
        onMouseDown={(e) => {
          // Handle middle click
          if (e.button === 1) {
            e.preventDefault()
            onClick(e)
          }
        }}
        className="cursor-pointer"
      >
        {guide.video_thumbnail_url ? (
          <div className="aspect-video bg-gray-200 dark:bg-gray-700 relative">
            <img
              src={guide.video_thumbnail_url}
              alt={guide.title}
              className="w-full h-full object-cover"
            />
            {guide.content_type === 'video' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center">
                  <Video className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="aspect-video bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <div className="text-white">
              {getIcon()}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div 
        onClick={(e) => onClick(e)}
        onMouseDown={(e) => {
          // Handle middle click
          if (e.button === 1) {
            e.preventDefault()
            onClick(e)
          }
        }}
        className={`cursor-pointer ${compact ? 'p-3' : 'p-4'}`}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className={`font-semibold text-gray-900 dark:text-white line-clamp-2 flex-1 ${compact ? 'text-sm' : ''}`}>
            {guide.title}
          </h3>
          {!featured && guide.is_featured && (
            <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded flex-shrink-0">
              ⭐
            </span>
          )}
        </div>
        {!compact && (
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
            {guide.description}
          </p>
        )}
        <div className={`flex items-center justify-between flex-wrap gap-2 ${compact ? 'mt-2' : ''}`}>
          <div className="flex items-center gap-2 flex-wrap">
            {!compact && guide.category && (
              <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                {guide.category}
              </span>
            )}
            {guide.difficulty_level && (
              <span className={`text-xs px-2 py-1 rounded ${getDifficultyColor()}`}>
                {guide.difficulty_level}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            {guide.duration_minutes && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {guide.duration_minutes} min
              </span>
            )}
            {guide.view_count > 0 && (
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {guide.view_count}
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 py-2 min-w-[200px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleOpen}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
          >
            <BookOpen className="h-4 w-4" />
            Open
          </button>
          <button
            onClick={handleOpenInNewTab}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Open in New Tab
          </button>
          {onCopyLink && (
            <button
              onClick={handleCopyLinkFromMenu}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
            >
              <Link2 className="h-4 w-4" />
              Copy Link
            </button>
          )}
          {onEdit && (
            <>
              <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
              <button
                onClick={() => {
                  if (onEdit) onEdit()
                  closeContextMenu()
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
              >
                <Edit className="h-4 w-4" />
                Edit Guide
              </button>
            </>
          )}
        </div>
      )}
    </div>
    </>
  )
}

