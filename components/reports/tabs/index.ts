// Lazy load all tab components for better performance
import { lazy } from 'react'

export { default as OverviewTab } from './OverviewTab'

// Lazy loaded tabs
export const ProjectsTab = lazy(() => import('./ProjectsTab').then(m => ({ default: m.ProjectsTab })))
export const ActivitiesTab = lazy(() => import('./ActivitiesTab').then(m => ({ default: m.ActivitiesTab })))
export const KPIsTab = lazy(() => import('./KPIsTab').then(m => ({ default: m.KPIsTab })))
export const FinancialTab = lazy(() => import('./FinancialTab').then(m => ({ default: m.FinancialTab })))
export const PerformanceTab = lazy(() => import('./PerformanceTab').then(m => ({ default: m.PerformanceTab })))
export { LookaheadTab } from './LookaheadTab'
export { MonthlyWorkRevenueTab } from './MonthlyWorkRevenueTab'
export { KPICChartTab } from './KPICChartTab'
export { DelayedActivitiesTab } from './DelayedActivitiesTab'
export { ActivityPeriodicalProgressTab } from './ActivityPeriodicalProgressTab'

