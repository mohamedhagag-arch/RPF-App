/**
 * View Mode Optimizer
 * 
 * This utility optimizes the view modes for better performance and user experience
 */

/**
 * View mode configuration
 */
export const VIEW_MODES = {
  CARDS: 'cards',
  SIMPLE: 'simple'
} as const

export type ViewMode = typeof VIEW_MODES[keyof typeof VIEW_MODES]

/**
 * View mode settings
 */
export const VIEW_MODE_SETTINGS = {
  [VIEW_MODES.CARDS]: {
    name: 'Enhanced Cards',
    description: 'Detailed cards with analytics and progress tracking',
    icon: 'BarChart3',
    gridCols: {
      mobile: 1,
      tablet: 2,
      desktop: 3
    },
    loadAnalytics: true,
    showProgress: true,
    showKPIs: true
  },
  [VIEW_MODES.SIMPLE]: {
    name: 'Simple Cards',
    description: 'Clean and minimal project cards',
    icon: 'Folder',
    gridCols: {
      mobile: 1,
      tablet: 2,
      desktop: 4
    },
    loadAnalytics: false,
    showProgress: false,
    showKPIs: false
  }
} as const

/**
 * Get view mode settings
 */
export function getViewModeSettings(mode: ViewMode) {
  return VIEW_MODE_SETTINGS[mode]
}

/**
 * Get grid classes for view mode
 */
export function getGridClasses(mode: ViewMode): string {
  const settings = getViewModeSettings(mode)
  return `grid-cols-${settings.gridCols.mobile} md:grid-cols-${settings.gridCols.tablet} lg:grid-cols-${settings.gridCols.desktop}`
}

/**
 * Check if analytics should be loaded for view mode
 */
export function shouldLoadAnalytics(mode: ViewMode): boolean {
  return getViewModeSettings(mode).loadAnalytics
}

/**
 * Check if progress should be shown for view mode
 */
export function shouldShowProgress(mode: ViewMode): boolean {
  return getViewModeSettings(mode).showProgress
}

/**
 * Check if KPIs should be shown for view mode
 */
export function shouldShowKPIs(mode: ViewMode): boolean {
  return getViewModeSettings(mode).showKPIs
}

/**
 * Get view mode icon
 */
export function getViewModeIcon(mode: ViewMode): string {
  return getViewModeSettings(mode).icon
}

/**
 * Get view mode name
 */
export function getViewModeName(mode: ViewMode): string {
  return getViewModeSettings(mode).name
}

/**
 * Get view mode description
 */
export function getViewModeDescription(mode: ViewMode): string {
  return getViewModeSettings(mode).description
}
