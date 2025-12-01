'use client'

import { NotFoundPage } from './NotFoundPage'
import { InternalNotFound } from './InternalNotFound'

// مثال على استخدام NotFoundPage في الصفحات العامة
export function GeneralNotFoundExample() {
  return (
    <NotFoundPage 
      title="Oops! Something went wrong"
      message="We couldn't find what you're looking for"
      showQuickActions={true}
    />
  )
}

// مثال على استخدام InternalNotFound للمشاريع
export function ProjectNotFoundExample() {
  return (
    <InternalNotFound 
      resourceType="project"
      resourceId="P1234"
      title="Project Not Found"
      message="The project you're looking for doesn't exist or has been removed"
    />
  )
}

// مثال على استخدام InternalNotFound للأنشطة
export function ActivityNotFoundExample() {
  return (
    <InternalNotFound 
      resourceType="activity"
      resourceId="Excavation Work"
      title="Activity Not Found"
      message="The activity you're looking for doesn't exist or has been removed"
    />
  )
}

// مثال على استخدام InternalNotFound للـ KPIs
export function KPINotFoundExample() {
  return (
    <InternalNotFound 
      resourceType="kpi"
      resourceId="KPI-001"
      title="KPI Record Not Found"
      message="The KPI record you're looking for doesn't exist or has been removed"
    />
  )
}

// مثال على استخدام InternalNotFound للمستخدمين
export function UserNotFoundExample() {
  return (
    <InternalNotFound 
      resourceType="user"
      resourceId="john.doe@example.com"
      title="User Not Found"
      message="The user you're looking for doesn't exist or has been removed"
    />
  )
}

// مثال على استخدام InternalNotFound للتقارير
export function ReportNotFoundExample() {
  return (
    <InternalNotFound 
      resourceType="report"
      resourceId="Monthly Report - January 2024"
      title="Report Not Found"
      message="The report you're looking for doesn't exist or has been removed"
    />
  )
}

// مثال على استخدام NotFoundPage مع إجراءات مخصصة
export function CustomNotFoundExample() {
  const customActions = [
    { icon: () => <span>🏠</span>, label: 'Home', href: '/', color: 'from-blue-500 to-cyan-500' },
    { icon: () => <span>📊</span>, label: 'Analytics', href: '/analytics', color: 'from-purple-500 to-pink-500' },
    { icon: () => <span>⚙️</span>, label: 'Settings', href: '/settings', color: 'from-yellow-500 to-orange-500' },
    { icon: () => <span>📞</span>, label: 'Contact', href: '/contact', color: 'from-green-500 to-emerald-500' },
    { icon: () => <span>📚</span>, label: 'Help', href: '/help', color: 'from-red-500 to-rose-500' },
    { icon: () => <span>🔍</span>, label: 'Search', href: '/search', color: 'from-indigo-500 to-purple-500' }
  ]

  return (
    <NotFoundPage 
      title="Custom 404 Page"
      message="This is a custom 404 page with custom actions"
      showQuickActions={true}
      customActions={customActions}
    />
  )
}
