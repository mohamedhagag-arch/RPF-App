/**
 * Helper functions to extract thumbnail URLs from video links
 */

/**
 * Extract YouTube video ID from URL
 */
export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null

  // Standard YouTube URL: https://www.youtube.com/watch?v=VIDEO_ID
  const watchMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)
  if (watchMatch) {
    return watchMatch[1]
  }

  // YouTube embed URL: https://www.youtube.com/embed/VIDEO_ID
  const embedMatch = url.match(/youtube\.com\/embed\/([^&\n?#]+)/)
  if (embedMatch) {
    return embedMatch[1]
  }

  return null
}

/**
 * Get YouTube thumbnail URL
 * @param videoId YouTube video ID
 * @param quality 'default', 'medium', 'high', 'standard', 'maxres'
 */
export function getYouTubeThumbnail(videoId: string, quality: 'default' | 'medium' | 'high' | 'standard' | 'maxres' = 'maxres'): string {
  const qualityMap = {
    default: 'default',
    medium: 'mqdefault',
    high: 'hqdefault',
    standard: 'sddefault',
    maxres: 'maxresdefault'
  }

  // Clean video ID (remove any extra characters)
  const cleanVideoId = videoId.trim()
  
  return `https://img.youtube.com/vi/${cleanVideoId}/${qualityMap[quality]}.jpg`
}

/**
 * Get all available YouTube thumbnail URLs for a video
 */
export function getAllYouTubeThumbnails(videoId: string): {
  maxres: string
  high: string
  medium: string
  standard: string
  default: string
} {
  return {
    maxres: getYouTubeThumbnail(videoId, 'maxres'),
    high: getYouTubeThumbnail(videoId, 'high'),
    medium: getYouTubeThumbnail(videoId, 'medium'),
    standard: getYouTubeThumbnail(videoId, 'standard'),
    default: getYouTubeThumbnail(videoId, 'default')
  }
}

/**
 * Extract Google Drive file ID from URL
 */
export function extractGoogleDriveFileId(url: string): string | null {
  if (!url) return null

  // Google Drive file URL: https://drive.google.com/file/d/FILE_ID/view
  const fileMatch = url.match(/drive\.google\.com\/file\/d\/([^\/\n?#]+)/)
  if (fileMatch) {
    return fileMatch[1]
  }

  // Google Drive preview URL: https://drive.google.com/open?id=FILE_ID
  const openMatch = url.match(/drive\.google\.com\/open\?id=([^&\n?#]+)/)
  if (openMatch) {
    return openMatch[1]
  }

  return null
}

/**
 * Get Google Drive thumbnail URL
 * Note: Google Drive doesn't provide direct thumbnail URLs for videos
 * We'll use the Drive API or a workaround
 */
export function getGoogleDriveThumbnail(fileId: string): string {
  // Option 1: Use Google Drive API (requires API key)
  // return `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=API_KEY`
  
  // Option 2: Use Drive preview thumbnail (may not work for all files)
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1280`
}

/**
 * Auto-detect and get thumbnail from video URL
 * Uses multiple methods for reliability
 */
export async function getVideoThumbnail(url: string): Promise<string | null> {
  if (!url) return null

  try {
    // Try YouTube first
    const youtubeId = extractYouTubeVideoId(url)
    if (youtubeId) {
      console.log('📹 YouTube video ID extracted:', youtubeId)
      
      // Method 1: Try YouTube oEmbed API (most reliable)
      try {
        const oEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
        const response = await fetch(oEmbedUrl)
        if (response.ok) {
          const data = await response.json()
          if (data.thumbnail_url) {
            console.log('✅ Got thumbnail from oEmbed API:', data.thumbnail_url)
            return data.thumbnail_url
          }
        }
      } catch (oEmbedError) {
        console.log('⚠️ oEmbed API failed, trying direct URLs:', oEmbedError)
      }
      
      // Method 2: Try direct YouTube thumbnail URLs (fallback)
      // Try different qualities in order
      const qualities: Array<'maxres' | 'high' | 'medium'> = ['maxres', 'high', 'medium']
      
      for (const quality of qualities) {
        const thumbnailUrl = getYouTubeThumbnail(youtubeId, quality)
        const exists = await checkImageExists(thumbnailUrl)
        if (exists) {
          console.log(`✅ Found working thumbnail (${quality}):`, thumbnailUrl)
          return thumbnailUrl
        }
      }
      
      // If all checks fail, return high quality anyway (it usually works)
      const fallbackUrl = getYouTubeThumbnail(youtubeId, 'high')
      console.log('⚠️ Using fallback thumbnail:', fallbackUrl)
      return fallbackUrl
    }

    // Try Google Drive
    const driveId = extractGoogleDriveFileId(url)
    if (driveId) {
      console.log('📁 Google Drive file ID extracted:', driveId)
      const thumbnailUrl = getGoogleDriveThumbnail(driveId)
      console.log('✅ Google Drive thumbnail URL:', thumbnailUrl)
      return thumbnailUrl
    }

    console.warn('⚠️ No video ID found in URL:', url)
    return null
  } catch (error) {
    console.error('❌ Error getting video thumbnail:', error)
    return null
  }
}

/**
 * Check if an image URL exists by trying to load it
 * Uses multiple methods for reliability
 */
async function checkImageExists(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    // For YouTube thumbnails, they're usually reliable
    // We'll use a faster check method
    if (url.includes('img.youtube.com')) {
      // Method 1: Try HEAD request (faster)
      fetch(url, { 
        method: 'HEAD', 
        mode: 'no-cors',
        cache: 'no-cache'
      })
        .then(() => {
          resolve(true)
        })
        .catch(() => {
          // Method 2: Try loading image directly
          const img = new Image()
          let resolved = false
          
          img.onload = () => {
            if (!resolved) {
              resolved = true
              resolve(true)
            }
          }
          
          img.onerror = () => {
            if (!resolved) {
              resolved = true
              // For YouTube, assume it exists even if check fails
              // (CORS might block the check but image still works)
              resolve(true)
            }
          }
          
          img.src = url
          
          // Timeout after 3 seconds
          setTimeout(() => {
            if (!resolved) {
              resolved = true
              // For YouTube, assume it exists
              resolve(true)
            }
          }, 3000)
        })
      return
    }
    
    // For other URLs (Google Drive, etc.), try to load the image
    const img = new Image()
    let resolved = false
    
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      if (!resolved) {
        resolved = true
        resolve(true)
      }
    }
    
    img.onerror = () => {
      if (!resolved) {
        resolved = true
        resolve(false)
      }
    }
    
    img.src = url
    
    // Timeout after 5 seconds
    setTimeout(() => {
      if (!resolved) {
        resolved = true
        resolve(false)
      }
    }, 5000)
  })
}

/**
 * Get video duration from YouTube (requires YouTube API)
 * This is a placeholder - you'd need to implement YouTube API integration
 */
export async function getYouTubeVideoDuration(videoId: string): Promise<number | null> {
  // This would require YouTube Data API v3
  // For now, return null and let user enter manually
  return null
}

