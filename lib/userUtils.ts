/**
 * Utility functions for user-related operations
 */

/**
 * Converts email to username slug
 * Example: "mohamed.hagag@example.com" -> "mohamed-hagag"
 * Example: "john.doe@company.com" -> "john-doe"
 */
export function emailToUsername(email: string): string {
  if (!email) return ''
  
  // Extract the part before @
  const localPart = email.split('@')[0]
  
  // Replace dots and special characters with hyphens
  let username = localPart
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
  
  return username
}

/**
 * Converts full name to username slug
 * Example: "Mohamed Hagag" -> "mohamed-hagag"
 * Example: "John Doe" -> "john-doe"
 */
export function nameToUsername(fullName: string): string {
  if (!fullName) return ''
  
  return fullName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
}

/**
 * Gets username from user (prefers email, falls back to name)
 */
export function getUserUsername(user: { email?: string; full_name?: string; first_name?: string; last_name?: string }): string {
  if (user.email) {
    return emailToUsername(user.email)
  }
  
  if (user.full_name) {
    return nameToUsername(user.full_name)
  }
  
  if (user.first_name && user.last_name) {
    return nameToUsername(`${user.first_name} ${user.last_name}`)
  }
  
  return ''
}

/**
 * Gets profile URL for a user
 */
export function getProfileUrl(user: { id?: string; email?: string; full_name?: string; first_name?: string; last_name?: string }): string {
  const username = getUserUsername(user)
  if (username) {
    return `/profile/${username}`
  }
  
  // Fallback to ID if no username available
  if (user.id) {
    return `/profile/${user.id}`
  }
  
  return '/profile'
}


