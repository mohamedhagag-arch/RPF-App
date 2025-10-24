/**
 * Card View Optimizer
 * 
 * This utility optimizes card views for better performance and user experience
 */

/**
 * Card view configuration
 */
export const CARD_VIEW_CONFIG = {
  ENHANCED: {
    name: 'Enhanced Cards',
    description: 'Detailed cards with analytics and progress tracking',
    features: [
      'Real-time analytics',
      'Progress tracking',
      'KPI visualization',
      'Financial metrics',
      'Activity status'
    ],
    performance: {
      loadAnalytics: true,
      loadKPIs: true,
      loadActivities: true,
      cacheData: true
    },
    layout: {
      gridCols: {
        mobile: 1,
        tablet: 2,
        desktop: 3
      },
      cardHeight: 'auto',
      showAnimations: true
    }
  },
} as const

/**
 * Get card view configuration
 */
export function getCardViewConfig(mode: 'cards') {
  return CARD_VIEW_CONFIG.ENHANCED
}

/**
 * Get grid classes for card view
 */
export function getCardGridClasses(mode: 'cards'): string {
  const config = getCardViewConfig(mode)
  const { gridCols } = config.layout
  return `grid-cols-${gridCols.mobile} md:grid-cols-${gridCols.tablet} lg:grid-cols-${gridCols.desktop}`
}

/**
 * Check if analytics should be loaded
 */
export function shouldLoadCardAnalytics(mode: 'cards'): boolean {
  return getCardViewConfig(mode).performance.loadAnalytics
}

/**
 * Check if KPIs should be loaded
 */
export function shouldLoadCardKPIs(mode: 'cards'): boolean {
  return getCardViewConfig(mode).performance.loadKPIs
}

/**
 * Check if activities should be loaded
 */
export function shouldLoadCardActivities(mode: 'cards'): boolean {
  return getCardViewConfig(mode).performance.loadActivities
}

/**
 * Check if data should be cached
 */
export function shouldCacheCardData(mode: 'cards'): boolean {
  return getCardViewConfig(mode).performance.cacheData
}

/**
 * Get card height class
 */
export function getCardHeightClass(mode: 'cards'): string {
  return 'h-auto'
}

/**
 * Check if animations should be shown
 */
export function shouldShowCardAnimations(mode: 'cards'): boolean {
  return getCardViewConfig(mode).layout.showAnimations
}

/**
 * Get card view features
 */
export function getCardViewFeatures(mode: 'cards'): readonly string[] {
  return getCardViewConfig(mode).features
}

/**
 * Get card view description
 */
export function getCardViewDescription(mode: 'cards'): string {
  return getCardViewConfig(mode).description
}

/**
 * Get card view name
 */
export function getCardViewName(mode: 'cards'): string {
  return getCardViewConfig(mode).name
}
