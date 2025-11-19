'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/app/providers'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { PermissionGuard } from '@/components/common/PermissionGuard'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
import { UserGuideViewer } from '@/components/user-guide/UserGuideViewer'
import { UserGuideManager } from '@/components/user-guide/UserGuideManager'
import { BookOpen, Video, FileText, GraduationCap, Search, Filter, Grid, List, Edit } from 'lucide-react'

export default function UserGuidePage() {
  const { user, appUser } = useAuth()
  const guard = usePermissionGuard()
  const isAdmin = appUser?.role === 'admin' || guard.hasAccess('admin.access')
  
  const [guides, setGuides] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showManager, setShowManager] = useState(false)
  const [selectedGuide, setSelectedGuide] = useState<any>(null)
  const [guideToEdit, setGuideToEdit] = useState<any>(null)

  const categories = ['all', 'Getting Started', 'KPI Management', 'BOQ', 'Projects', 'Reports', 'Settings', 'Advanced']
  const contentTypes = ['all', 'video', 'article', 'tutorial']

  useEffect(() => {
    loadGuides()
  }, [])

  const loadGuides = async () => {
    setLoading(true)
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from('user_guides')
        .select('*')
        .eq('is_active', true)
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

  const filteredGuides = guides.filter(guide => {
    const matchesSearch = !searchQuery || 
      guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guide.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guide.tags?.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesCategory = selectedCategory === 'all' || guide.category === selectedCategory
    const matchesType = selectedType === 'all' || guide.content_type === selectedType

    return matchesSearch && matchesCategory && matchesType
  })

  const handleGuideClick = async (guide: any) => {
    setSelectedGuide(guide)
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
    loadGuides() // Refresh to update view counts
  }

  if (selectedGuide) {
    return (
      <UserGuideViewer
        guide={selectedGuide}
        onClose={handleCloseViewer}
      />
    )
  }

  if (showManager && isAdmin) {
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
            {isAdmin && (
              <button
                onClick={() => setShowManager(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <GraduationCap className="h-4 w-4" />
                Manage Guides
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
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

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat}
                </option>
              ))}
            </select>

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
                onClick={() => handleGuideClick(guide)}
                onEdit={isAdmin ? () => {
                  setGuideToEdit(guide)
                  setShowManager(true)
                } : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function GuideCard({ guide, viewMode, onClick, onEdit }: { guide: any; viewMode: 'grid' | 'list'; onClick: () => void; onEdit?: () => void }) {
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

  if (viewMode === 'list') {
    return (
      <div
        onClick={onClick}
        className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-lg transition-shadow cursor-pointer flex items-center gap-4"
      >
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
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow relative group">
      {/* Edit Button (Top Right) */}
      {onEdit && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onEdit()
          }}
          className="absolute top-2 right-2 z-10 p-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100 shadow-lg"
          title="Edit Guide"
        >
          <Edit className="h-4 w-4" />
        </button>
      )}

      {/* Thumbnail or Icon */}
      <div onClick={onClick} className="cursor-pointer">
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
      <div onClick={onClick} className="p-4 cursor-pointer">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2 flex-1">
            {guide.title}
          </h3>
          {guide.is_featured && (
            <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded flex-shrink-0">
              ⭐
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
          {guide.description}
        </p>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {guide.category && (
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
              <span>{guide.duration_minutes} min</span>
            )}
            {guide.view_count > 0 && (
              <span>{guide.view_count} views</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

