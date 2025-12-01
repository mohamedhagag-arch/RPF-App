/**
 * Convert a string to a URL-friendly slug
 * @param text - The text to convert to slug
 * @returns A URL-friendly slug
 */
export function createSlug(text: string): string {
  if (!text) return ''
  
  return text
    .toLowerCase()
    .trim()
    // Replace Arabic characters with their transliterations
    .replace(/[أإآ]/g, 'a')
    .replace(/[ىي]/g, 'y')
    .replace(/[ة]/g, 'h')
    .replace(/[ئ]/g, 'e')
    .replace(/[ء]/g, 'a')
    // Remove special characters
    .replace(/[^\w\s-]/g, '')
    // Replace spaces and multiple dashes with single dash
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    // Remove leading/trailing dashes
    .replace(/^-+|-+$/g, '')
    // Limit length
    .substring(0, 100)
}

/**
 * Find a guide by slug
 * @param guides - Array of guides
 * @param slug - The slug to search for
 * @returns The guide matching the slug, or null if not found
 */
export function findGuideBySlug(guides: any[], slug: string): any | null {
  if (!slug || !guides || guides.length === 0) return null
  
  return guides.find(guide => {
    const guideSlug = createSlug(guide.title)
    return guideSlug === slug
  }) || null
}

