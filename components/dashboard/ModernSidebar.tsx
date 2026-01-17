'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { cn } from '@/lib/utils'
import { getCachedCompanySettings, type CompanySettings } from '@/lib/companySettings'
import {
  LayoutDashboard,
  FolderKanban,
  ClipboardList,
  Target,
  BarChart3,
  Settings,
  Users,
  FileDown,
  Search,
  ChevronLeft,
  ChevronRight,
  Menu,
  User,
  Sparkles,
  Zap,
  TrendingUp,
  FileText,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Activity,
  Truck,
  FileEdit,
  FormInput,
  DollarSign,
  UserCheck,
  Calendar,
  Briefcase,
  FileCheck,
  Clock,
  Database,
  ShoppingCart,
  Building2,
  Package,
  HardHat,
  Fuel,
  Cog,
  Wrench,
  Coins,
  Receipt,
  X,
  type LucideIcon
} from 'lucide-react'

interface SidebarSubItem {
  label: string
  tab: string
  icon: LucideIcon
  badgeIcon?: LucideIcon
  badgeColor?: string
}

interface SidebarItem {
  icon: LucideIcon
  label: string
  tab: string
  badgeIcon?: LucideIcon
  badgeColor?: string
  subItems?: SidebarSubItem[]
}

const sidebarItems: SidebarItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', tab: 'dashboard' },
  { icon: FolderKanban, label: 'Projects', tab: 'projects', badgeIcon: Sparkles, badgeColor: 'bg-gradient-to-br from-blue-500 to-cyan-500' },
  { 
    icon: FileText, 
    label: 'Planning', 
    tab: 'planning',
    subItems: [
      { icon: ClipboardList, label: 'Activities', tab: 'activities', badgeIcon: Zap, badgeColor: 'bg-gradient-to-br from-green-500 to-emerald-500' },
      { icon: Target, label: 'KPI', tab: 'kpi', badgeIcon: TrendingUp, badgeColor: 'bg-gradient-to-br from-purple-500 to-pink-500' },
      { icon: BarChart3, label: 'Reports', tab: 'reports' },
    ]
  },
  { 
    icon: Coins, 
    label: 'Commercial', 
    tab: 'commercial',
    badgeIcon: Coins, 
    badgeColor: 'bg-gradient-to-br from-indigo-500 to-blue-500',
    subItems: [
      { icon: ClipboardList, label: 'BOQ Items', tab: 'commercial/boq-items', badgeIcon: ClipboardList, badgeColor: 'bg-gradient-to-br from-green-500 to-emerald-500' },
      { icon: Receipt, label: 'Payments & Invoicing', tab: 'commercial/payments-invoicing', badgeIcon: Receipt, badgeColor: 'bg-gradient-to-br from-blue-500 to-indigo-500' },
      { icon: FileEdit, label: 'Variations', tab: 'commercial/variations', badgeIcon: FileEdit, badgeColor: 'bg-gradient-to-br from-purple-500 to-pink-500' },
    ]
  },
      { 
        icon: DollarSign, 
        label: 'Cost Control', 
        tab: 'cost-control',
        badgeIcon: DollarSign, 
        badgeColor: 'bg-gradient-to-br from-yellow-500 to-orange-500',
        subItems: [
          { icon: UserCheck, label: 'MANPOWER', tab: 'cost-control/manpower', badgeIcon: Users, badgeColor: 'bg-gradient-to-br from-blue-500 to-indigo-500' },
          { icon: Database, label: 'Machine List', tab: 'cost-control/machine-list', badgeIcon: Database, badgeColor: 'bg-gradient-to-br from-cyan-500 to-blue-500' },
          { icon: Package, label: 'Material', tab: 'cost-control/material', badgeIcon: Package, badgeColor: 'bg-gradient-to-br from-orange-500 to-red-500' },
          { icon: HardHat, label: 'Subcontractor', tab: 'cost-control/subcontractor', badgeIcon: HardHat, badgeColor: 'bg-gradient-to-br from-purple-500 to-pink-500' },
          { icon: Fuel, label: 'Diesel', tab: 'cost-control/diesel', badgeIcon: Fuel, badgeColor: 'bg-gradient-to-br from-amber-500 to-yellow-500' },
          { icon: Truck, label: 'Transportation', tab: 'cost-control/transportation', badgeIcon: Truck, badgeColor: 'bg-gradient-to-br from-green-500 to-teal-500' },
          { icon: Wrench, label: 'Rented Equipment', tab: 'cost-control/rented-equipment', badgeIcon: Wrench, badgeColor: 'bg-gradient-to-br from-amber-500 to-orange-500' },
          { icon: DollarSign, label: 'Other Cost', tab: 'cost-control/other-cost', badgeIcon: DollarSign, badgeColor: 'bg-gradient-to-br from-emerald-500 to-teal-500' },
        ]
      },
  { 
    icon: Briefcase, 
    label: 'HR', 
    tab: 'hr',
    badgeIcon: Briefcase, 
    badgeColor: 'bg-gradient-to-br from-pink-500 to-rose-500',
    subItems: [
      { icon: Users, label: 'Manpower', tab: 'hr/manpower', badgeIcon: Users, badgeColor: 'bg-gradient-to-br from-blue-500 to-indigo-500' },
      { icon: Calendar, label: 'Attendance', tab: 'hr/attendance', badgeIcon: Calendar, badgeColor: 'bg-gradient-to-br from-green-500 to-emerald-500' },
      { icon: UserCheck, label: 'Check-In/Out', tab: 'hr/attendance/check-in-out', badgeIcon: UserCheck, badgeColor: 'bg-gradient-to-br from-blue-500 to-indigo-500' },
      { icon: FileCheck, label: 'Review Attendance', tab: 'hr/attendance/review', badgeIcon: FileCheck, badgeColor: 'bg-gradient-to-br from-purple-500 to-pink-500' },
    ]
  },
  { 
    icon: ShoppingCart, 
    label: 'Procurement', 
    tab: 'procurement',
    badgeIcon: ShoppingCart, 
    badgeColor: 'bg-gradient-to-br from-teal-500 to-cyan-500',
    subItems: [
      { icon: Building2, label: 'Vendor List', tab: 'procurement/vendor-list', badgeIcon: Building2, badgeColor: 'bg-gradient-to-br from-indigo-500 to-purple-500' },
    ]
  },
  { 
    icon: FormInput, 
    label: 'Forms', 
    tab: 'forms',
    subItems: [
      { icon: ClipboardList, label: 'Activities Form', tab: 'forms/activities' },
      { icon: Target, label: 'KPI Standard Form', tab: 'forms/kpi-standard' },
      { icon: Zap, label: 'KPI Smart Form', tab: 'forms/kpi-smart' },
      { icon: FileEdit, label: 'Project Form', tab: 'forms/project' },
      { icon: Users, label: 'User Form', tab: 'forms/user' },
    ]
  },
  { icon: BookOpen, label: 'User Guide', tab: 'user-guide' },
  { icon: Settings, label: 'Settings', tab: 'settings' },
]

interface ModernSidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
  userName?: string
  userRole?: string
  userProfilePicture?: string
  onProfileClick?: () => void
  onCollapseChange?: (collapsed: boolean) => void
}

export function ModernSidebar({ activeTab, onTabChange, userName = 'User', userRole = 'Admin', userProfilePicture, onProfileClick, onCollapseChange }: ModernSidebarProps) {
  const guard = usePermissionGuard()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [companyName, setCompanyName] = useState('AlRabat RPF')
  const [companySlogan, setCompanySlogan] = useState('Masters of Foundation Construction')
  const [logoUrl, setLogoUrl] = useState('')

  // Helper function to get the URL for a tab
  const getTabUrl = (tab: string): string => {
    if (tab === 'users') return '/settings?tab=users'
    if (tab === 'directory') return '/directory'
    if (tab === 'search') return '/dashboard?search=true'
    if (tab === 'planning') return '/activities'
    if (tab === 'commercial') return '/commercial/boq-items'
    if (tab === 'forms') return '/activities'
    if (tab === 'activity-log') return '/activity-log'
    if (tab === 'commercial/boq-items') return '/commercial/boq-items'
    if (tab === 'commercial/payments-invoicing') return '/commercial/payments-invoicing'
    if (tab === 'commercial/variations') return '/commercial/variations'
    if (tab === 'forms/activities') return '/activities'
    if (tab === 'forms/kpi-standard') return '/kpi/add'
    if (tab === 'forms/kpi-smart') return '/kpi/smart-form'
    if (tab === 'forms/project') return '/projects'
    if (tab === 'forms/user') return '/settings?tab=users'
    if (tab === 'cost-control') return '/cost-control'
    if (tab === 'cost-control/manpower') return '/cost-control/manpower'
    if (tab === 'cost-control/designation-rates') return '/cost-control/designation-rates'
    if (tab === 'cost-control/machine-list') return '/cost-control/machine-list'
    if (tab === 'cost-control/material') return '/cost-control/material'
    if (tab === 'cost-control/subcontractor') return '/cost-control/subcontractor'
    if (tab === 'cost-control/diesel') return '/cost-control/diesel'
    if (tab === 'cost-control/transportation') return '/cost-control/transportation'
    if (tab === 'cost-control/rented-equipment') return '/cost-control/rented-equipment'
    if (tab === 'cost-control/other-cost') return '/cost-control/other-cost'
    if (tab === 'hr') return '/hr'
    if (tab === 'hr/manpower') return '/hr/manpower'
    if (tab === 'hr/attendance') return '/hr/attendance'
    if (tab === 'hr/attendance/check-in-out') return '/hr/attendance/check-in-out'
    if (tab === 'hr/attendance/review') return '/hr/attendance/review'
    if (tab === 'procurement') return '/procurement'
    if (tab === 'procurement/vendor-list') return '/procurement/vendor-list'
    return `/${tab}`
  }

  // Check if a tab is active (including sub-items)
  const isTabActive = (item: SidebarItem): boolean => {
    if (item.tab === activeTab) return true
    if (item.subItems) {
      return item.subItems.some(subItem => subItem.tab === activeTab)
    }
    return false
  }

  // Toggle submenu expansion
  const toggleSubmenu = (e: React.MouseEvent, tab: string) => {
    e.preventDefault()
    e.stopPropagation()
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(tab)) {
        newSet.delete(tab)
      } else {
        newSet.add(tab)
      }
      return newSet
    })
  }

  // Auto-expand parent items based on active tab
  useEffect(() => {
    if (activeTab === 'boq' || activeTab === 'kpi' || activeTab === 'reports') {
      setExpandedItems(prev => new Set(prev).add('planning'))
    }
    if (activeTab === 'commercial/boq-items' || activeTab === 'commercial/payments-invoicing') {
      setExpandedItems(prev => new Set(prev).add('commercial'))
    }
    if (activeTab === 'forms/activities' || activeTab === 'forms/kpi-standard' || activeTab === 'forms/kpi-smart' || activeTab === 'forms/project' || activeTab === 'forms/user') {
      setExpandedItems(prev => new Set(prev).add('forms'))
    }
    if (activeTab === 'cost-control/manpower' || activeTab === 'cost-control/attendance' || activeTab === 'cost-control/attendance/check-in-out' || activeTab === 'cost-control/material' || activeTab === 'cost-control/subcontractor' || activeTab === 'cost-control/diesel') {
      setExpandedItems(prev => new Set(prev).add('cost-control'))
    }
    if (activeTab === 'hr/manpower' || activeTab === 'hr/attendance' || activeTab === 'hr/attendance/check-in-out' || activeTab === 'hr/attendance/review') {
      setExpandedItems(prev => new Set(prev).add('hr'))
    }
    if (activeTab === 'procurement/vendor-list') {
      setExpandedItems(prev => new Set(prev).add('procurement'))
    }
  }, [activeTab])

  // Load company settings
  useEffect(() => {
    const loadCompanySettings = async () => {
      try {
        const settings = await getCachedCompanySettings()
        setCompanyName(settings?.company_name?.trim() || 'AlRabat RPF')
        setCompanySlogan(settings?.company_slogan?.trim() || 'Masters of Foundation Construction')
        setLogoUrl(settings?.company_logo_url?.trim() || '')
      } catch (error) {
        console.error('Error loading company settings:', error)
        setCompanyName('AlRabat RPF')
        setCompanySlogan('Masters of Foundation Construction')
        setLogoUrl('')
      }
    }
    
    loadCompanySettings()
    
    const handleStorageChange = () => {
      loadCompanySettings()
    }
    
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('companySettingsUpdated', handleStorageChange)
    window.addEventListener('companySettingsCacheCleared', handleStorageChange)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('companySettingsUpdated', handleStorageChange)
      window.removeEventListener('companySettingsCacheCleared', handleStorageChange)
    }
  }, [])

  // Auto-expand parent items based on pathname
  useEffect(() => {
    if (pathname === '/commercial/boq-items' || pathname === '/commercial/payments-invoicing') {
      setExpandedItems(prev => new Set([...Array.from(prev), 'commercial']))
    }
    if (pathname === '/cost-control/manpower' || pathname === '/cost-control/designation-rates' || pathname === '/cost-control/machine-list' ||
        pathname === '/cost-control/material' || pathname === '/cost-control/subcontractor' || pathname === '/cost-control/diesel') {
      setExpandedItems(prev => new Set([...Array.from(prev), 'cost-control']))
    }
    if (pathname === '/hr/manpower' || pathname === '/hr/attendance' || pathname === '/hr/attendance/check-in-out' || pathname === '/hr/attendance/review') {
      setExpandedItems(prev => new Set([...Array.from(prev), 'hr']))
    }
    if (pathname === '/procurement/vendor-list') {
      setExpandedItems(prev => new Set([...Array.from(prev), 'procurement']))
    }
  }, [pathname])

  // Filter items based on permissions
  const visibleItems = sidebarItems.filter((item) => {
    switch (item.tab) {
      case 'dashboard':
        return guard.hasAccess('dashboard.view')
      case 'projects':
        return guard.hasAccess('projects.view')
      case 'cost-control':
        if (item.subItems) {
          return item.subItems.some(subItem => {
            switch (subItem.tab) {
              case 'cost-control/manpower':
                return guard.hasAccess('cost_control.manpower.view')
              case 'cost-control/designation-rates':
                return guard.hasAccess('cost_control.designation_rates.view')
              case 'cost-control/machine-list':
                return guard.hasAccess('cost_control.machine_list.view')
              case 'cost-control/material':
                return guard.hasAccess('cost_control.material.view')
              case 'cost-control/subcontractor':
                return guard.hasAccess('cost_control.subcontractor.view')
              case 'cost-control/diesel':
                return guard.hasAccess('cost_control.diesel.view')
              case 'cost-control/transportation':
                return guard.hasAccess('cost_control.transportation.view')
              case 'cost-control/hired-manpower':
                return guard.hasAccess('cost_control.hired_manpower.view')
              case 'cost-control/rented-equipment':
                return guard.hasAccess('cost_control.rented_equipment.view')
              case 'cost-control/other-cost':
                return guard.hasAccess('cost_control.other_cost.view')
              default:
                return false
            }
          })
        }
        return guard.hasAccess('cost_control.view')
      case 'hr':
        if (item.subItems) {
          return item.subItems.some(subItem => {
            switch (subItem.tab) {
              case 'hr/manpower':
                return guard.hasAccess('hr.manpower.view')
              case 'hr/attendance':
                return guard.hasAccess('hr.attendance.view')
              case 'hr/attendance/check-in-out':
                return guard.hasAccess('hr.attendance.check_in_out')
              case 'hr/attendance/review':
                return guard.hasAccess('hr.attendance.review')
              default:
                return false
            }
          })
        }
        return guard.hasAccess('hr.view')
      case 'planning':
        if (item.subItems) {
          return item.subItems.some(subItem => {
            switch (subItem.tab) {
              case 'activities':
                return guard.hasAccess('activities.view')
              case 'kpi':
                return guard.hasAccess('kpi.view')
              case 'reports':
                return guard.hasAccess('reports.view')
              default:
                return false
            }
          })
        }
        return true
      case 'commercial':
        if (guard.isAdmin()) {
          return true
        }
        if (item.subItems) {
          return item.subItems.some(subItem => {
            switch (subItem.tab) {
              case 'commercial/boq-items':
                return guard.hasAccess('commercial.boq_items.view')
              case 'commercial/payments-invoicing':
                return guard.hasAccess('commercial.payments_invoicing.view')
              case 'commercial/variations':
                return guard.hasAccess('commercial.variations.view')
              default:
                return false
            }
          })
        }
        return guard.hasAccess('commercial.view') || true
      case 'forms':
        if (guard.isAdmin()) {
          return true
        }
        if (item.subItems) {
          const hasAnyFormAccess = item.subItems.some(subItem => {
            switch (subItem.tab) {
              case 'forms/activities':
                return guard.hasAccess('activities.create') || guard.hasAccess('activities.edit')
              case 'forms/kpi-standard':
              case 'forms/kpi-smart':
                return guard.hasAccess('kpi.create')
              case 'forms/project':
                return guard.hasAccess('projects.create') || guard.hasAccess('projects.edit')
              case 'forms/user':
                return guard.hasAccess('users.create') || guard.hasAccess('users.edit')
              default:
                return false
            }
          })
          return hasAnyFormAccess
        }
        return false
      case 'procurement':
        if (item.subItems) {
          return item.subItems.some(subItem => {
            switch (subItem.tab) {
            case 'procurement/vendor-list':
              return guard.hasAccess('procurement.vendor_list.view')
            case 'procurement/material':
              return guard.hasAccess('procurement.material.view')
            default:
              return false
            }
          })
        }
        return guard.hasAccess('procurement.view')
      case 'settings':
        return guard.hasAccess('settings.view')
      default:
        return true
    }
  }).map(item => {
    if (item.subItems) {
      return {
        ...item,
        subItems: item.subItems.filter(subItem => {
          switch (subItem.tab) {
            case 'activities':
              return guard.hasAccess('activities.view')
            case 'kpi':
              return guard.hasAccess('kpi.view')
            case 'reports':
              return guard.hasAccess('reports.view')
            case 'commercial/boq-items':
              return guard.isAdmin() || guard.hasAccess('commercial.boq_items.view')
            case 'commercial/payments-invoicing':
              return guard.isAdmin() || guard.hasAccess('commercial.payments_invoicing.view')
            case 'cost-control/manpower':
              return guard.hasAccess('cost_control.manpower.view')
            case 'cost-control/designation-rates':
              return guard.hasAccess('cost_control.designation_rates.view')
            case 'cost-control/machine-list':
              return guard.hasAccess('cost_control.machine_list.view')
            case 'cost-control/material':
              return guard.hasAccess('cost_control.material.view')
            case 'cost-control/subcontractor':
              return guard.hasAccess('cost_control.subcontractor.view')
            case 'cost-control/diesel':
              return guard.hasAccess('cost_control.diesel.view')
            case 'cost-control/transportation':
              return guard.hasAccess('cost_control.transportation.view')
            case 'cost-control/rented-equipment':
              return guard.hasAccess('cost_control.rented_equipment.view')
            case 'cost-control/other-cost':
              return guard.hasAccess('cost_control.other_cost.view')
            case 'hr/manpower':
              return guard.hasAccess('hr.manpower.view')
            case 'hr/attendance':
              return guard.hasAccess('hr.attendance.view')
            case 'hr/attendance/check-in-out':
              return guard.hasAccess('hr.attendance.check_in_out')
            case 'hr/attendance/review':
              return guard.hasAccess('hr.attendance.review')
            case 'forms/activities':
              return guard.isAdmin() || guard.hasAccess('activities.create') || guard.hasAccess('activities.edit')
            case 'forms/kpi-standard':
            case 'forms/kpi-smart':
              return guard.isAdmin() || guard.hasAccess('kpi.create')
            case 'forms/project':
              return guard.isAdmin() || guard.hasAccess('projects.create') || guard.hasAccess('projects.edit')
            case 'forms/user':
              return guard.isAdmin() || guard.hasAccess('users.create') || guard.hasAccess('users.edit')
            case 'procurement/vendor-list':
              return guard.hasAccess('procurement.vendor_list.view')
            default:
              return true
          }
        })
      }
    }
    return item
  })

  if (visibleItems.length === 0 && !guard.hasAccess('system.search')) {
    return null
  }

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 lg:hidden transition-opacity duration-300"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-[60] lg:hidden p-3 bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Desktop Toggle Button - When Sidebar is Collapsed */}
      {collapsed && (
        <button
          onClick={() => {
            setCollapsed(false)
            onCollapseChange?.(false)
          }}
          className="hidden lg:flex fixed top-4 left-4 z-40 p-3 bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 shadow-2xl border-r-2 border-gray-200/50 dark:border-gray-700/50 transition-all duration-300 z-[80] flex flex-col backdrop-blur-sm',
          collapsed ? 'w-16 lg:w-16' : 'w-72 lg:w-72',
          mobileOpen
            ? 'translate-x-0 opacity-100 pointer-events-auto'
            : '-translate-x-full opacity-0 pointer-events-none lg:opacity-100 lg:pointer-events-auto lg:translate-x-0'
        )}
      >
        {/* Logo Section - Enhanced */}
        {!collapsed && (
          <div className="relative py-5 px-4 border-b-2 border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 overflow-hidden">
            <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent"></div>
            
            <div className="relative flex flex-col items-center z-10">
              {/* Logo Container - Horizontal/Wide */}
              {logoUrl ? (
                <div className="h-16 w-auto max-w-[160px] rounded-xl overflow-hidden bg-white/20 backdrop-blur-sm flex items-center justify-center ring-2 ring-white/20 shadow-xl p-2 mb-3">
                  <img
                    src={logoUrl}
                    alt="Company Logo"
                    className="h-full w-auto object-contain"
                    style={{ maxHeight: '100%', maxWidth: '100%' }}
                  />
                </div>
              ) : (
                <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-white/30 to-white/10 backdrop-blur-sm flex items-center justify-center ring-2 ring-white/20 shadow-xl mb-3">
                  <LayoutDashboard className="h-8 w-8 text-white" />
                </div>
              )}
              
              {/* Company Info - Below Logo */}
              <div className="text-center w-full">
                <h1 className="font-bold text-lg leading-tight text-white drop-shadow-lg">
                  {companyName}
                </h1>
                <p className="text-xs leading-tight mt-1 text-white/90 drop-shadow">
                  {companySlogan}
                </p>
              </div>
            </div>
            
            {/* Toggle Button - Enhanced - Top Right */}
            <button
              onClick={() => {
                const newCollapsed = !collapsed
                setCollapsed(newCollapsed)
                onCollapseChange?.(newCollapsed)
              }}
              className="absolute top-3 right-3 p-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg transition-all duration-300 z-20 hover:scale-110 text-white shadow-lg"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        )}
        
        {/* Toggle Button - When Collapsed - Top of Sidebar */}
        {collapsed && (
          <div className="p-2 border-b-2 border-gray-200/50 dark:border-gray-700/50 bg-white dark:bg-gray-800">
            <button
              onClick={() => {
                const newCollapsed = !collapsed
                setCollapsed(newCollapsed)
                onCollapseChange?.(newCollapsed)
              }}
              className="w-full p-2.5 bg-gradient-to-br from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg transition-all duration-300 text-white shadow-lg hover:shadow-xl flex items-center justify-center"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* User Profile - Enhanced */}
        <div className={cn(
          "border-b-2 border-gray-200/50 dark:border-gray-700/50 bg-white dark:bg-gray-800",
          collapsed ? "p-2" : "p-4"
        )}>
          <button
            onClick={onProfileClick}
            className={cn(
              "w-full bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-all duration-300 cursor-pointer border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md group relative",
              collapsed ? "flex items-center justify-center p-2" : "flex items-center gap-3 p-3 rounded-xl"
            )}
            title={collapsed ? `${userName} - ${userRole}` : "View Profile"}
          >
            <div className="relative bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-md ring-1 ring-gray-200 dark:ring-gray-700 group-hover:scale-105 transition-transform duration-300 overflow-hidden"
              style={collapsed ? { width: '36px', height: '36px', fontSize: '14px', borderRadius: '8px' } : { width: '48px', height: '48px', fontSize: '18px', borderRadius: '10px' }}
            >
              {userProfilePicture ? (
                <img
                  src={userProfilePicture}
                  alt="Profile"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                    const parent = target.parentElement
                    if (parent) {
                      const initial = userName.charAt(0).toUpperCase()
                      parent.innerHTML = `<span style="font-size: ${collapsed ? '14px' : '18px'}; font-weight: bold;">${initial}</span>`
                    }
                  }}
                />
              ) : (
                <span style={{ fontSize: collapsed ? '14px' : '18px' }}>
                  {userName.charAt(0).toUpperCase()}
                </span>
              )}
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800 shadow-sm"></div>
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0 text-left">
                <p className="font-bold text-sm text-gray-900 dark:text-white truncate">
                  {userName}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                  {userRole}
                </p>
              </div>
            )}
            {/* Tooltip for collapsed state */}
            {collapsed && (
              <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 dark:bg-gray-800 text-white text-sm rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-300 whitespace-nowrap z-50">
                <p className="font-bold">{userName}</p>
                <p className="text-xs text-gray-300">{userRole}</p>
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900 dark:bg-gray-800 rotate-45"></div>
              </div>
            )}
          </button>
        </div>

        {/* Navigation - Enhanced */}
        <nav className={cn(
          "flex-1 overflow-y-auto overflow-x-hidden min-h-0 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent",
          collapsed ? "p-2 space-y-1.5" : "p-4 space-y-2"
        )}>
          {visibleItems.map((item) => {
            const Icon = item.icon
            const hasSubItems = item.subItems && item.subItems.length > 0
            const isExpanded = expandedItems.has(item.tab)
            const isActive = isTabActive(item)

            if (hasSubItems) {
              if (collapsed) {
                // Collapsed state - show only icon with tooltip
                return (
                  <div key={item.tab} className="relative group">
                    <button
                      onClick={(e) => toggleSubmenu(e, item.tab)}
                      className={cn(
                        'w-full flex items-center justify-center rounded-lg font-medium text-xs transition-all duration-300 relative overflow-hidden mb-3',
                        isActive 
                          ? 'bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/50 scale-105 ring-2 ring-violet-400/40' 
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gradient-to-br hover:from-violet-50 hover:via-purple-50 hover:to-fuchsia-50 dark:hover:from-violet-900/25 dark:hover:via-purple-900/25 dark:hover:to-fuchsia-900/25 hover:text-violet-700 dark:hover:text-violet-300 hover:shadow-md hover:shadow-violet-200/60 dark:hover:shadow-violet-900/40 hover:scale-110 active:scale-95',
                        'px-2 py-2'
                      )}
                      title={item.label}
                    >
                      <div className={cn(
                        'p-1.5 rounded-lg transition-all duration-300 w-8 h-8 flex items-center justify-center',
                        isActive 
                          ? 'bg-white/30 shadow-inner ring-1 ring-white/20' 
                          : 'bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 group-hover:from-violet-100 group-hover:to-purple-100 dark:group-hover:from-violet-800/40 dark:group-hover:to-purple-800/40 group-hover:shadow-md group-hover:scale-110'
                      )}>
                        <Icon className={cn(
                          'h-4 w-4 transition-all duration-300',
                          isActive 
                            ? 'text-white drop-shadow-sm' 
                            : 'text-gray-600 dark:text-gray-400 group-hover:text-violet-600 dark:group-hover:text-violet-400 group-hover:scale-110'
                        )} />
                      </div>
                    </button>
                    {/* Tooltip */}
                    <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 dark:bg-gray-800 text-white text-sm rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-300 whitespace-nowrap z-50">
                      {item.label}
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900 dark:bg-gray-800 rotate-45"></div>
                    </div>
                  </div>
                )
              }
              
              // Expanded state - show full menu
              return (
                <div key={item.tab} className="space-y-1 mb-3">
                  <button
                    onClick={(e) => toggleSubmenu(e, item.tab)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium text-xs transition-all duration-300 group relative overflow-hidden',
                      isActive 
                        ? 'bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/50 scale-[1.02] ring-2 ring-violet-400/40' 
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-violet-50 hover:via-purple-50 hover:to-fuchsia-50 dark:hover:from-violet-900/25 dark:hover:via-purple-900/25 dark:hover:to-fuchsia-900/25 hover:text-violet-700 dark:hover:text-violet-300 hover:shadow-md hover:shadow-violet-200/60 dark:hover:shadow-violet-900/40 hover:scale-[1.01] hover:-translate-y-0.5 active:scale-[0.98]'
                    )}
                    title={item.label}
                  >
                    <div className={cn(
                      'p-1.5 rounded-lg transition-all duration-300',
                      isActive 
                        ? 'bg-white/30 shadow-inner ring-1 ring-white/20' 
                        : 'bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 group-hover:from-violet-100 group-hover:to-purple-100 dark:group-hover:from-violet-800/40 dark:group-hover:to-purple-800/40 group-hover:shadow-md group-hover:scale-110'
                    )}>
                      <Icon className={cn(
                        'h-4 w-4 transition-all duration-300',
                        isActive 
                          ? 'text-white drop-shadow-sm' 
                          : 'text-gray-600 dark:text-gray-400 group-hover:text-violet-600 dark:group-hover:text-violet-400 group-hover:scale-110'
                      )} />
                    </div>
                    <span className="flex-1 text-left">{item.label}</span>
                    <div className={cn(
                      "transition-all duration-300",
                      isExpanded ? "rotate-180 scale-110" : "rotate-0 scale-100 group-hover:scale-110"
                    )}>
                      <ChevronDown className={cn(
                        "h-3.5 w-3.5 transition-all duration-300",
                        isActive 
                          ? "text-white drop-shadow-sm" 
                          : "text-gray-500 dark:text-gray-400 group-hover:text-violet-600 dark:group-hover:text-violet-400 group-hover:scale-110"
                      )} />
                    </div>
                  </button>
                  
                  {/* Submenu - Enhanced */}
                  <div 
                    className={cn(
                      "ml-6 space-y-1 border-l-2 border-violet-200 dark:border-violet-700 pl-3 transition-all duration-300 ease-in-out mt-1",
                      isExpanded ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0 overflow-hidden"
                    )}
                  >
                    {isExpanded && item.subItems && item.subItems.map((subItem, index) => {
                      const SubIcon = subItem.icon
                      const isSubActive = activeTab === subItem.tab
                      const subUrl = getTabUrl(subItem.tab)

                      return (
                        <Link
                          key={subItem.tab}
                          href={subUrl}
                          onClick={(e) => {
                            if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
                              onTabChange(subItem.tab)
                              setMobileOpen(false)
                            }
                          }}
                          className={cn(
                            'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-300 group mb-2',
                            isSubActive 
                              ? 'bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/50 scale-[1.03] ring-2 ring-violet-400/40 translate-x-1' 
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-violet-50 hover:via-purple-50 hover:to-fuchsia-50 dark:hover:from-violet-900/25 dark:hover:via-purple-900/25 dark:hover:to-fuchsia-900/25 hover:text-violet-700 dark:hover:text-violet-300 hover:shadow-md hover:shadow-violet-200/60 dark:hover:shadow-violet-900/40 hover:translate-x-2 hover:scale-[1.02] active:scale-[0.98] active:translate-x-1'
                          )}
                          title={subItem.label}
                          style={{
                            animationDelay: `${index * 30}ms`,
                          }}
                        >
                          <div className={cn(
                            'p-1 rounded-md transition-all duration-300',
                            isSubActive 
                              ? 'bg-white/30 shadow-inner ring-1 ring-white/20' 
                              : 'bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 group-hover:from-violet-100 group-hover:to-purple-100 dark:group-hover:from-violet-800/40 dark:group-hover:to-purple-800/40 group-hover:shadow-md group-hover:scale-110'
                          )}>
                            <SubIcon className={cn(
                              'h-3.5 w-3.5 transition-all duration-300',
                              isSubActive 
                                ? 'text-white drop-shadow-sm' 
                                : 'text-gray-600 dark:text-gray-400 group-hover:text-violet-600 dark:group-hover:text-violet-400 group-hover:scale-110'
                            )} />
                          </div>
                          <span className="flex-1 text-left">{subItem.label}</span>
                          {subItem.badgeIcon && (
                            <span className={cn(
                              'flex items-center justify-center w-6 h-6 rounded-lg shadow-sm transition-all duration-300',
                              isSubActive 
                                ? 'bg-white/20 text-white'
                                : `${subItem.badgeColor} text-white`
                            )}>
                              {(() => {
                                const BadgeIcon = subItem.badgeIcon!
                                return <BadgeIcon className="h-3.5 w-3.5" />
                              })()}
                            </span>
                          )}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )
            }

            // Regular item without submenu
            const tabUrl = getTabUrl(item.tab)
            return (
              <Link
                key={item.tab}
                href={tabUrl}
                onClick={(e) => {
                  if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
                    onTabChange(item.tab)
                    setMobileOpen(false)
                  }
                }}
                className={cn(
                  'flex items-center rounded-lg font-medium text-xs transition-all duration-300 group relative overflow-hidden mb-3',
                  isActive 
                    ? 'bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/50 scale-[1.02] ring-2 ring-violet-400/40' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-violet-50 hover:via-purple-50 hover:to-fuchsia-50 dark:hover:from-violet-900/25 dark:hover:via-purple-900/25 dark:hover:to-fuchsia-900/25 hover:text-violet-700 dark:hover:text-violet-300 hover:shadow-md hover:shadow-violet-200/60 dark:hover:shadow-violet-900/40 hover:scale-[1.01] hover:-translate-y-0.5 active:scale-[0.98]',
                  collapsed ? 'justify-center px-2 py-2 w-full' : 'gap-2.5 px-3 py-2 rounded-lg'
                )}
                title={item.label}
              >
                <div className={cn(
                  'rounded-lg transition-all duration-300 flex items-center justify-center',
                  isActive 
                    ? 'bg-white/30 shadow-inner ring-1 ring-white/20' 
                    : 'bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 group-hover:from-violet-100 group-hover:to-purple-100 dark:group-hover:from-violet-800/40 dark:group-hover:to-purple-800/40 group-hover:shadow-md group-hover:scale-110',
                  collapsed ? 'p-1.5 w-8 h-8' : 'p-1.5'
                )}>
                  <Icon className={cn(
                    'transition-all duration-300',
                    isActive 
                      ? 'text-white drop-shadow-sm' 
                      : 'text-gray-600 dark:text-gray-400 group-hover:text-violet-600 dark:group-hover:text-violet-400 group-hover:scale-110',
                    collapsed ? 'h-4 w-4' : 'h-4 w-4'
                  )} />
                </div>
                
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.badgeIcon && (
                      <span className={cn(
                        'flex items-center justify-center w-7 h-7 rounded-lg shadow-sm transition-all duration-300',
                        isActive 
                          ? 'bg-white/20 text-white'
                          : `${item.badgeColor} text-white`
                      )}>
                        {(() => {
                          const BadgeIcon = item.badgeIcon!
                          return <BadgeIcon className="h-4 w-4" />
                        })()}
                      </span>
                    )}
                  </>
                )}
                
                {/* Tooltip for collapsed state */}
                {collapsed && (
                  <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-gray-900 dark:bg-gray-800 text-white text-xs font-medium rounded-md shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap z-50">
                    {item.label}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-1.5 h-1.5 bg-gray-900 dark:bg-gray-800 rotate-45"></div>
                  </div>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Search (if not collapsed) */}
        {!collapsed && guard.hasAccess('system.search') && (
          <div className="p-4 border-t-2 border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
            <Link
              href="/dashboard?search=true"
              onClick={(e) => {
                if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
                  onTabChange('search')
                }
              }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium text-xs transition-all duration-300 group bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 hover:from-violet-50 hover:via-purple-50 hover:to-fuchsia-50 dark:hover:from-violet-900/25 dark:hover:via-purple-900/25 dark:hover:to-fuchsia-900/25 text-gray-700 dark:text-gray-300 hover:text-violet-700 dark:hover:text-violet-300 border-2 border-gray-200 dark:border-gray-700 hover:border-violet-400 dark:hover:border-violet-500 hover:shadow-lg hover:shadow-violet-200/60 dark:hover:shadow-violet-900/40 hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 mb-3"
              title="Search"
            >
              <div className="p-1.5 rounded-lg bg-gray-200 dark:bg-gray-600 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-all duration-300">
                <Search className="h-4 w-4 text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
              </div>
              <span className="flex-1 text-left">Search</span>
              <kbd className="px-2.5 py-1 text-xs font-semibold bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">
                ⌘K
              </kbd>
            </Link>
          </div>
        )}
      </aside>
    </>
  )
}
