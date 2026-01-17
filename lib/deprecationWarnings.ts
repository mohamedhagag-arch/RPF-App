/**
 * Deprecation Warnings for Date Field Migration
 * 
 * This file provides utilities to warn about deprecated field usage
 * during the migration from Actual Date/Target Date to Activity Date
 */

/**
 * Warn when accessing deprecated actual_date field
 */
export function warnActualDateDeprecated(context?: string) {
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      '⚠️ [DEPRECATED] "actual_date" field is deprecated. Use "activity_date" with Input Type filter instead.',
      context ? `Context: ${context}` : ''
    )
  }
}

/**
 * Warn when accessing deprecated target_date field
 */
export function warnTargetDateDeprecated(context?: string) {
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      '⚠️ [DEPRECATED] "target_date" field is deprecated. Use "activity_date" with Input Type filter instead.',
      context ? `Context: ${context}` : ''
    )
  }
}

/**
 * Warn when accessing deprecated "Actual Date" column
 */
export function warnActualDateColumnDeprecated(context?: string) {
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      '⚠️ [DEPRECATED] "Actual Date" column is deprecated. Use "Activity Date" with Input Type filter instead.',
      context ? `Context: ${context}` : ''
    )
  }
}

/**
 * Warn when accessing deprecated "Target Date" column
 */
export function warnTargetDateColumnDeprecated(context?: string) {
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      '⚠️ [DEPRECATED] "Target Date" column is deprecated. Use "Activity Date" with Input Type filter instead.',
      context ? `Context: ${context}` : ''
    )
  }
}

/**
 * Helper to get Activity Date with deprecation warning fallback
 */
export function getActivityDate(
  kpi: any,
  options?: {
    warnOnDeprecated?: boolean
    context?: string
  }
): string {
  const { warnOnDeprecated = true, context } = options || {}
  
  // Try Activity Date first (preferred)
  if (kpi.activity_date || kpi['Activity Date']) {
    return kpi.activity_date || kpi['Activity Date'] || ''
  }
  
  // Fallback to deprecated fields with warning
  if (warnOnDeprecated) {
    if (kpi.actual_date || kpi['Actual Date']) {
      warnActualDateDeprecated(context)
      return kpi.actual_date || kpi['Actual Date'] || ''
    }
    if (kpi.target_date || kpi['Target Date']) {
      warnTargetDateDeprecated(context)
      return kpi.target_date || kpi['Target Date'] || ''
    }
  }
  
  return ''
}
