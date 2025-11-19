'use client'

import { useState, useEffect } from 'react'
import { X, Play, Clock, Eye, BookOpen, ExternalLink } from 'lucide-react'
import { getSupabaseClient } from '@/lib/simpleConnectionManager'

interface UserGuideViewerProps {
  guide: any
  onClose: () => void
}

export function UserGuideViewer({ guide, onClose }: UserGuideViewerProps) {
  const [watchTime, setWatchTime] = useState(0)
  const [isCompleted, setIsCompleted] = useState(false)

  // Convert Google Drive link to embeddable format
  const getEmbedUrl = (url: string) => {
    if (!url) return null
    
    // Google Drive link
    if (url.includes('drive.google.com')) {
      // Extract file ID
      const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/)
      if (match) {
        return `https://drive.google.com/file/d/${match[1]}/preview`
      }
    }
    
    // YouTube link
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      let videoId = ''
      if (url.includes('youtube.com/watch?v=')) {
        videoId = url.split('v=')[1]?.split('&')[0] || ''
      } else if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0] || ''
      }
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`
      }
    }
    
    return url
  }

  const embedUrl = guide.video_url ? getEmbedUrl(guide.video_url) : null

  const handleComplete = async () => {
    setIsCompleted(true)
    try {
      const supabase = getSupabaseClient()
      const supabaseAny = supabase as any
      await supabaseAny
        .from('user_guide_views')
        .update({ 
          completed: true,
          watch_duration_seconds: watchTime
        })
        .eq('guide_id', guide.id)
    } catch (error) {
      console.error('Error updating completion:', error)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="min-h-screen bg-white dark:bg-gray-900">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    {guide.title}
                  </h1>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {guide.category && (
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-4 w-4" />
                        {guide.category}
                      </span>
                    )}
                    {guide.duration_minutes && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {guide.duration_minutes} minutes
                      </span>
                    )}
                    {guide.view_count > 0 && (
                      <span className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        {guide.view_count} views
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Video/Content */}
              {guide.content_type === 'video' && embedUrl ? (
                <div className="bg-black rounded-lg overflow-hidden aspect-video">
                  <iframe
                    src={embedUrl}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : guide.content_type === 'video' && guide.video_url ? (
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-8 text-center">
                  <Play className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Video link not embeddable
                  </p>
                  <a
                    href={guide.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open Video
                  </a>
                </div>
              ) : guide.article_content ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <div 
                    className="prose dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: guide.article_content }}
                  />
                </div>
              ) : (
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-8 text-center">
                  <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    Content not available
                  </p>
                </div>
              )}

              {/* Description */}
              {guide.description && (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Description
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 whitespace-pre-line">
                    {guide.description}
                  </p>
                </div>
              )}

              {/* Tags */}
              {guide.tags && guide.tags.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Tags
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {guide.tags.map((tag: string, index: number) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Completion */}
              {guide.content_type === 'video' && !isCompleted && (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Mark as Complete
                  </h3>
                  <button
                    onClick={handleComplete}
                    className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    Mark as Completed
                  </button>
                </div>
              )}

              {isCompleted && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-2">
                    <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                    <span className="font-semibold">Completed</span>
                  </div>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    You've completed this guide!
                  </p>
                </div>
              )}

              {/* Info */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Guide Information
                </h3>
                <div className="space-y-3 text-sm">
                  {guide.difficulty_level && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Difficulty:</span>
                      <span className="ml-2 text-gray-900 dark:text-white capitalize">
                        {guide.difficulty_level}
                      </span>
                    </div>
                  )}
                  {guide.content_type && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Type:</span>
                      <span className="ml-2 text-gray-900 dark:text-white capitalize">
                        {guide.content_type}
                      </span>
                    </div>
                  )}
                  {guide.created_at && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Created:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">
                        {new Date(guide.created_at).toLocaleDateString()}
                      </span>
                    </div>
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

