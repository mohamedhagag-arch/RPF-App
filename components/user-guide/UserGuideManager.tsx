'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Save, Trash2, Plus, Video, FileText, GraduationCap, Loader2 } from 'lucide-react'
import { useAuth } from '@/app/providers'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'
import { getVideoThumbnail, extractYouTubeVideoId, extractGoogleDriveFileId, getAllYouTubeThumbnails } from '@/lib/videoThumbnailHelper'

interface UserGuideManagerProps {
  onClose: () => void
  onSave: () => void
  guideToEdit?: any
}

export function UserGuideManager({ onClose, onSave, guideToEdit }: UserGuideManagerProps) {
  const { user, appUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content_type: 'video',
    video_url: '',
    video_thumbnail_url: '',
    article_content: '',
    category: '',
    tags: [] as string[],
    difficulty_level: '',
    display_order: 0,
    is_featured: false,
    is_active: true,
    duration_minutes: 0,
    notes: ''
  })

  const [tagInput, setTagInput] = useState('')
  const [loadingThumbnail, setLoadingThumbnail] = useState(false)
  const thumbnailTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (guideToEdit) {
      setFormData({
        title: guideToEdit.title || '',
        description: guideToEdit.description || '',
        content_type: guideToEdit.content_type || 'video',
        video_url: guideToEdit.video_url || '',
        video_thumbnail_url: guideToEdit.video_thumbnail_url || '',
        article_content: guideToEdit.article_content || '',
        category: guideToEdit.category || '',
        tags: guideToEdit.tags || [],
        difficulty_level: guideToEdit.difficulty_level || '',
        display_order: guideToEdit.display_order || 0,
        is_featured: guideToEdit.is_featured || false,
        is_active: guideToEdit.is_active !== false,
        duration_minutes: guideToEdit.duration_minutes || 0,
        notes: guideToEdit.notes || ''
      })
    }
  }, [guideToEdit])

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()]
      })
      setTagInput('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(t => t !== tag)
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = getSupabaseClient()
      const userId = appUser?.email || user?.email || appUser?.id || user?.id || 'admin'

      // Prepare guide data, ensuring difficulty_level is null if empty
      const guideData = {
        ...formData,
        difficulty_level: formData.difficulty_level || null, // Convert empty string to null
        updated_by: userId,
        updated_at: new Date().toISOString()
      }

      const supabaseAny = supabase as any
      if (guideToEdit) {
        const { error } = await supabaseAny
          .from('user_guides')
          .update(guideData)
          .eq('id', guideToEdit.id)

        if (error) throw error
      } else {
        const { error } = await supabaseAny
          .from('user_guides')
          .insert({
            ...guideData,
            created_by: userId
          })

        if (error) throw error
      }

      onSave()
      onClose()
    } catch (error: any) {
      console.error('Error saving guide:', error)
      alert(`Failed to save guide: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!guideToEdit) return
    if (!confirm('Are you sure you want to delete this guide?')) return

    setLoading(true)
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase
        .from('user_guides')
        .delete()
        .eq('id', guideToEdit.id)

      if (error) throw error
      onSave()
      onClose()
    } catch (error: any) {
      console.error('Error deleting guide:', error)
      alert(`Failed to delete guide: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="min-h-screen bg-white dark:bg-gray-900">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {guideToEdit ? 'Edit Guide' : 'Create New Guide'}
              </h1>
              <div className="flex items-center gap-2">
                {guideToEdit && (
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Basic Information
              </h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Content Type *
                  </label>
                  <select
                    required
                    value={formData.content_type}
                    onChange={(e) => setFormData({ ...formData, content_type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="video">Video</option>
                    <option value="article">Article</option>
                    <option value="tutorial">Tutorial</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Category</option>
                    <option value="Getting Started">Getting Started</option>
                    <option value="KPI Management">KPI Management</option>
                    <option value="BOQ">BOQ</option>
                    <option value="Projects">Projects</option>
                    <option value="Reports">Reports</option>
                    <option value="Settings">Settings</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Media Content */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Media Content
              </h2>

              {formData.content_type === 'video' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Video URL (Google Drive or YouTube) *
                    </label>
                    <div className="relative">
                      <input
                        type="url"
                        required
                        value={formData.video_url}
                        onChange={(e) => {
                          const newUrl = e.target.value
                          setFormData({ ...formData, video_url: newUrl })
                          
                          // Clear previous timeout
                          if (thumbnailTimeoutRef.current) {
                            clearTimeout(thumbnailTimeoutRef.current)
                          }
                          
                          // Auto-fetch thumbnail when URL is pasted (debounce)
                          if (newUrl && (newUrl.includes('youtube.com') || newUrl.includes('youtu.be') || newUrl.includes('drive.google.com'))) {
                            // Clear existing thumbnail first
                            setFormData(prev => ({ ...prev, video_thumbnail_url: '' }))
                            
                            // Debounce: wait a bit before fetching
                            thumbnailTimeoutRef.current = setTimeout(async () => {
                              // Check if URL hasn't changed
                              const currentValue = (e.target as HTMLInputElement).value
                              if (currentValue === newUrl && newUrl) {
                                setLoadingThumbnail(true)
                                try {
                                  console.log('🔄 Fetching thumbnail for:', newUrl)
                                  const thumbnail = await getVideoThumbnail(newUrl)
                                  if (thumbnail) {
                                    console.log('✅ Thumbnail fetched successfully:', thumbnail)
                                    setFormData(prev => ({ ...prev, video_thumbnail_url: thumbnail }))
                                  } else {
                                    console.warn('⚠️ No thumbnail found for URL:', newUrl)
                                  }
                                } catch (error) {
                                  console.error('❌ Error fetching thumbnail:', error)
                                } finally {
                                  setLoadingThumbnail(false)
                                }
                              }
                            }, 1000) // Wait 1 second after user stops typing
                          } else {
                            // Clear thumbnail if URL is not valid
                            setFormData(prev => ({ ...prev, video_thumbnail_url: '' }))
                          }
                        }}
                        onBlur={async () => {
                          // Clear timeout on blur
                          if (thumbnailTimeoutRef.current) {
                            clearTimeout(thumbnailTimeoutRef.current)
                            thumbnailTimeoutRef.current = null
                          }
                          
                          // Also try to fetch thumbnail on blur (when user finishes typing)
                          if (formData.video_url && !formData.video_thumbnail_url && 
                              (formData.video_url.includes('youtube.com') || formData.video_url.includes('youtu.be') || formData.video_url.includes('drive.google.com'))) {
                            setLoadingThumbnail(true)
                            try {
                              console.log('🔄 Fetching thumbnail on blur for:', formData.video_url)
                              const thumbnail = await getVideoThumbnail(formData.video_url)
                              if (thumbnail) {
                                console.log('✅ Thumbnail fetched on blur:', thumbnail)
                                setFormData(prev => ({ ...prev, video_thumbnail_url: thumbnail }))
                              } else {
                                console.warn('⚠️ No thumbnail found on blur')
                              }
                            } catch (error) {
                              console.error('❌ Error fetching thumbnail on blur:', error)
                            } finally {
                              setLoadingThumbnail(false)
                            }
                          }
                        }}
                        placeholder="https://drive.google.com/file/d/... or https://www.youtube.com/watch?v=..."
                        className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {loadingThumbnail && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        </div>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Paste your Google Drive or YouTube video link here. Thumbnail will be fetched automatically.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Thumbnail URL (Auto-filled)
                    </label>
                    <div className="space-y-2">
                      <input
                        type="url"
                        value={formData.video_thumbnail_url}
                        onChange={(e) => setFormData({ ...formData, video_thumbnail_url: e.target.value })}
                        placeholder="Will be auto-filled from video URL..."
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {formData.video_thumbnail_url && (
                        <ThumbnailPreview
                          url={formData.video_thumbnail_url}
                          videoUrl={formData.video_url}
                          onRemove={() => setFormData({ ...formData, video_thumbnail_url: '' })}
                        />
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Thumbnail is automatically fetched from the video URL. You can manually override it if needed.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Duration (minutes)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.duration_minutes}
                      onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </>
              )}

              {formData.content_type === 'article' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Article Content (HTML)
                  </label>
                  <textarea
                    value={formData.article_content}
                    onChange={(e) => setFormData({ ...formData, article_content: e.target.value })}
                    rows={10}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  />
                </div>
              )}
            </div>

            {/* Additional Settings */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Additional Settings
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Difficulty Level
                  </label>
                  <select
                    value={formData.difficulty_level}
                    onChange={(e) => setFormData({ ...formData, difficulty_level: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Level</option>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_featured}
                    onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Featured</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tags
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    placeholder="Add a tag..."
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm flex items-center gap-2"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-blue-600 dark:hover:text-blue-400"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Internal Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  placeholder="Internal notes (not visible to users)..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-4">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {loading ? 'Saving...' : guideToEdit ? 'Update Guide' : 'Create Guide'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// Thumbnail Preview Component with automatic fallback
function ThumbnailPreview({ url, videoUrl, onRemove }: { url: string; videoUrl: string; onRemove: () => void }) {
  const [currentUrl, setCurrentUrl] = useState(url)
  const [hasError, setHasError] = useState(false)
  const [triedFallback, setTriedFallback] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    setCurrentUrl(url)
    setHasError(false)
    setTriedFallback(false)
    setRetryCount(0)
  }, [url])

  const handleError = async () => {
    console.log('❌ Thumbnail failed to load:', currentUrl, 'Retry count:', retryCount)
    
    // Limit retries
    if (retryCount >= 3) {
      console.error('❌ Max retries reached, showing error')
      setHasError(true)
      return
    }
    
    setRetryCount(prev => prev + 1)
    
    // Try YouTube fallback
    const videoId = extractYouTubeVideoId(videoUrl)
    if (videoId) {
      // First try: oEmbed API (most reliable)
      if (retryCount === 0 && !triedFallback) {
        try {
          const oEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`
          const response = await fetch(oEmbedUrl)
          if (response.ok) {
            const data = await response.json()
            if (data.thumbnail_url) {
              console.log('✅ Got thumbnail from oEmbed API:', data.thumbnail_url)
              setCurrentUrl(data.thumbnail_url)
              setTriedFallback(true)
              return
            }
          }
        } catch (error) {
          console.log('⚠️ oEmbed API failed:', error)
        }
      }
      
      // Fallback to direct URLs
      const fallbacks = getAllYouTubeThumbnails(videoId)
      
      if (currentUrl.includes('maxresdefault') || retryCount === 0) {
        console.log('🔄 Trying high quality fallback...')
        setCurrentUrl(fallbacks.high)
        setTriedFallback(true)
        return
      }
      
      if (currentUrl.includes('hqdefault') || retryCount === 1) {
        console.log('🔄 Trying medium quality fallback...')
        setCurrentUrl(fallbacks.medium)
        setTriedFallback(true)
        return
      }
      
      if (currentUrl.includes('mqdefault') || retryCount === 2) {
        console.log('🔄 Trying default quality fallback...')
        setCurrentUrl(fallbacks.default)
        setTriedFallback(true)
        return
      }
    }
    
    // All attempts failed
    console.error('❌ All thumbnail attempts failed')
    setHasError(true)
  }

  const handleLoad = () => {
    setHasError(false)
    console.log('✅ Thumbnail loaded successfully:', currentUrl)
  }

  if (hasError) {
    return (
      <div className="relative w-full h-32 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 flex items-center justify-center">
        <div className="text-center p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Thumbnail failed to load</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 break-all">{url.substring(0, 60)}...</p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-2 right-2 p-1 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors z-10"
          title="Remove thumbnail"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    )
  }

  return (
    <div className="relative w-full h-32 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
      <img
        src={currentUrl}
        alt="Thumbnail preview"
        className="w-full h-full object-cover"
        onError={handleError}
        onLoad={handleLoad}
        loading="lazy"
      />
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-2 right-2 p-1 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors z-10"
        title="Remove thumbnail"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}

