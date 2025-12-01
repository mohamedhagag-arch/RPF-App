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
  FileEdit,
  FormInput,
  DollarSign,
  UserCheck,
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
      { icon: ClipboardList, label: 'BOQ', tab: 'boq', badgeIcon: Zap, badgeColor: 'bg-gradient-to-br from-green-500 to-emerald-500' },
      { icon: Target, label: 'KPI', tab: 'kpi', badgeIcon: TrendingUp, badgeColor: 'bg-gradient-to-br from-purple-500 to-pink-500' },
      { icon: BarChart3, label: 'Reports', tab: 'reports' },
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
    ]
  },
  { 
    icon: FormInput, 
    label: 'Forms', 
    tab: 'forms',
    subItems: [
      { icon: ClipboardList, label: 'BOQ Form', tab: 'forms/boq' },
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
  onProfileClick?: () => void
  onCollapseChange?: (collapsed: boolean) => void
}

export function ModernSidebar({ activeTab, onTabChange, userName = 'User', userRole = 'Admin', onProfileClick, onCollapseChange }: ModernSidebarProps) {
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
    if (tab === 'planning') return '/boq' // Default to BOQ when clicking Planning
    if (tab === 'forms') return '/boq' // Default to BOQ Form when clicking Forms
    if (tab === 'activity-log') return '/activity-log'
    // Forms sub-items - map to actual pages
    if (tab === 'forms/boq') return '/boq'
    if (tab === 'forms/kpi-standard') return '/kpi/add'
    if (tab === 'forms/kpi-smart') return '/kpi/smart-form'
    if (tab === 'forms/project') return '/projects'
    if (tab === 'forms/user') return '/settings?tab=users'
    // Cost Control
    if (tab === 'cost-control') return '/cost-control'
    if (tab === 'cost-control/manpower') return '/cost-control/manpower'
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

  // Auto-expand planning if any sub-item is active
  useEffect(() => {
    if (activeTab === 'boq' || activeTab === 'kpi' || activeTab === 'reports') {
      setExpandedItems(prev => new Set(prev).add('planning'))
    }
    // Auto-expand forms if any form sub-item is active
    if (activeTab === 'forms/boq' || activeTab === 'forms/kpi-standard' || activeTab === 'forms/kpi-smart' || activeTab === 'forms/project' || activeTab === 'forms/user') {
      setExpandedItems(prev => new Set(prev).add('forms'))
    }
    // Auto-expand cost-control if any sub-item is active
    if (activeTab === 'cost-control/manpower') {
      setExpandedItems(prev => new Set(prev).add('cost-control'))
    }
  }, [activeTab])

  // تحميل إعدادات الشركة من قاعدة البيانات
  useEffect(() => {
    const loadCompanySettings = async () => {
      try {
        console.log('🔄 Loading company settings for sidebar...')
        const settings = await getCachedCompanySettings()
        
        setCompanyName(settings.company_name)
        setCompanySlogan(settings.company_slogan)
        setLogoUrl(settings.company_logo_url || '')
        
        console.log('✅ Company settings loaded for sidebar:', settings)
      } catch (error) {
        console.error('❌ Error loading company settings for sidebar:', error)
        // استخدام القيم الافتراضية في حالة الخطأ
        setCompanyName('AlRabat RPF')
        setCompanySlogan('Masters of Foundation Construction')
        setLogoUrl('')
      }
    }
    
    loadCompanySettings()
  }, [])

  // Filter items based on permissions
  const visibleItems = sidebarItems.filter((item) => {
    switch (item.tab) {
      case 'dashboard':
        return guard.hasAccess('dashboard.view')
      case 'projects':
        return guard.hasAccess('projects.view')
      case 'cost-control':
        // Show cost-control if user has access to any sub-item
        if (item.subItems) {
          return item.subItems.some(subItem => {
            switch (subItem.tab) {
              case 'cost-control/manpower':
                return guard.hasAccess('reports.view') // Using reports.view as default permission
              default:
                return false
            }
          })
        }
        return guard.hasAccess('reports.view')
      case 'planning':
        // Show planning if user has access to any sub-item
        if (item.subItems) {
          return item.subItems.some(subItem => {
            switch (subItem.tab) {
              case 'boq':
                return guard.hasAccess('boq.view')
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
      case 'forms':
        // ✅ Show forms only if user has access to at least one form sub-item
        // ✅ Admin always has access
        if (guard.isAdmin()) {
          return true
        }
        if (item.subItems) {
          const hasAnyFormAccess = item.subItems.some(subItem => {
            switch (subItem.tab) {
              case 'forms/boq':
                return guard.hasAccess('boq.create') || guard.hasAccess('boq.edit')
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
      case 'settings':
        return guard.hasAccess('settings.view')
      default:
        return true
    }
  }).map(item => {
    // Filter sub-items based on permissions
    if (item.subItems) {
      return {
        ...item,
        subItems: item.subItems.filter(subItem => {
          switch (subItem.tab) {
            case 'boq':
              return guard.hasAccess('boq.view')
            case 'kpi':
              return guard.hasAccess('kpi.view')
            case 'reports':
              return guard.hasAccess('reports.view')
            case 'cost-control/manpower':
              return guard.hasAccess('reports.view') // Using reports.view as default permission
            case 'forms/boq':
              // ✅ Admin always has access, others need boq.create or boq.edit
              return guard.isAdmin() || guard.hasAccess('boq.create') || guard.hasAccess('boq.edit')
            case 'forms/kpi-standard':
            case 'forms/kpi-smart':
              // ✅ Admin always has access, others need kpi.create
              return guard.isAdmin() || guard.hasAccess('kpi.create')
            case 'forms/project':
              // ✅ Admin always has access, others need projects.create or projects.edit
              return guard.isAdmin() || guard.hasAccess('projects.create') || guard.hasAccess('projects.edit')
            case 'forms/user':
              // ✅ Admin always has access, others need users.create or users.edit
              return guard.isAdmin() || guard.hasAccess('users.create') || guard.hasAccess('users.edit')
            default:
              return true
          }
        })
      }
    }
    return item
  })

  // Hide sidebar completely if user has no permissions
  if (visibleItems.length === 0 && !guard.hasAccess('system.search')) {
    return null
  }

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg"
      >
        <Menu className="h-6 w-6 text-gray-700 dark:text-gray-300" />
      </button>

      {/* Desktop Toggle Button - When Sidebar is Collapsed */}
      {collapsed && (
        <button
          onClick={() => {
            setCollapsed(false)
            onCollapseChange?.(false)
          }}
          className="hidden lg:flex fixed top-4 left-4 z-40 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-screen sidebar-modern transition-all duration-300 z-40',
          collapsed ? 'w-16' : 'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo Section */}
        <div className="py-4 px-4 border-b" style={{ borderColor: 'rgba(0, 0, 0, 0.06)' }}>
          {!collapsed && (
            <div className="flex flex-col items-center gap-3">
              {logoUrl ? (
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-white flex items-center justify-center">
                  <img
                    src={logoUrl}
                    alt="Company Logo"
                    className="w-full h-full object-contain p-2"
                  />
                </div>
              ) : (
                <div className="icon-circle cyan flex items-center justify-center shadow-lg" style={{ width: '80px', height: '80px' }}>
                  <LayoutDashboard className="h-10 w-10 text-white" />
                </div>
              )}
              <div className="text-center">
                <h1 className="font-bold text-lg leading-tight" style={{ color: 'var(--text-primary)' }}>
                  {companyName}
                </h1>
                <p className="text-xs leading-tight mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {companySlogan}
                </p>
              </div>
            </div>
          )}
          
          {/* Toggle Button - Always Visible */}
          <button
            onClick={() => {
              const newCollapsed = !collapsed
              setCollapsed(newCollapsed)
              onCollapseChange?.(newCollapsed)
            }}
            className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors z-10"
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            ) : (
              <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            )}
          </button>
        </div>

        {/* User Profile */}
        {!collapsed && (
          <div className="p-4 border-b" style={{ borderColor: 'rgba(0, 0, 0, 0.06)' }}>
            <button
              onClick={onProfileClick}
              className="w-full flex items-center gap-3 p-3 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-700 rounded-lg hover:from-blue-100 hover:to-purple-100 dark:hover:from-gray-600 dark:hover:to-gray-600 transition-all duration-200 cursor-pointer mb-3"
              title="View Profile"
            >
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                  {userName}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {userRole}
                </p>
              </div>
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {visibleItems.map((item) => {
            const Icon = item.icon
            const hasSubItems = item.subItems && item.subItems.length > 0
            const isExpanded = expandedItems.has(item.tab)
            const isActive = isTabActive(item)

            if (hasSubItems && !collapsed) {
              // Item with submenu
              return (
                <div key={item.tab} className="space-y-1">
                  <button
                    onClick={(e) => toggleSubmenu(e, item.tab)}
                    className={cn(
                      'nav-item w-full transition-all duration-200',
                      isActive ? 'active' : '',
                      'hover:bg-opacity-90'
                    )}
                    title={item.label}
                  >
                    <Icon className={cn(
                      'h-4 w-4 flex-shrink-0',
                      isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'
                    )} />
                    <span className="flex-1 text-left font-medium text-sm">
                      {item.label}
                    </span>
                    <span className={cn(
                      "transition-transform duration-200",
                      isExpanded ? "rotate-0" : "rotate-180"
                    )}>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 flex-shrink-0" />
                      )}
                    </span>
                  </button>
                  
                  {/* Submenu */}
                  <div 
                    className={cn(
                      "ml-4 space-y-1 border-l-2 border-gray-200 dark:border-gray-700 pl-2 overflow-hidden transition-all duration-300 ease-in-out",
                      isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                    )}
                    style={{
                      animation: isExpanded ? 'slideDown 0.3s ease-out' : 'slideUp 0.3s ease-in'
                    }}
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
                            'nav-item text-sm py-2 transition-all duration-200 transform',
                            isSubActive ? 'active scale-[1.02]' : 'opacity-80 hover:opacity-100 hover:scale-[1.01]',
                            'hover:translate-x-1'
                          )}
                          title={subItem.label}
                          style={{
                            animationDelay: `${index * 50}ms`,
                            animation: isExpanded ? 'fadeInSlide 0.3s ease-out forwards' : 'none'
                          }}
                        >
                          <SubIcon className={cn(
                            'h-3.5 w-3.5 flex-shrink-0',
                            isSubActive ? 'text-white' : 'text-gray-500 dark:text-gray-400'
                          )} />
                          <span className="flex-1 text-left font-medium text-xs">
                            {subItem.label}
                          </span>
                          {subItem.badgeIcon && (
                            <span className={cn(
                              'flex items-center justify-center w-5 h-5 rounded-full shadow-sm transition-all duration-200',
                              isSubActive 
                                ? 'bg-white/20 text-white'
                                : `${subItem.badgeColor} text-white`
                            )}>
                              {(() => {
                                const BadgeIcon = subItem.badgeIcon!
                                return <BadgeIcon className="h-3 w-3" />
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
                  'nav-item',
                  isActive ? 'active' : '',
                  collapsed && 'justify-center px-3'
                )}
                title={item.label}
              >
                <Icon className={cn(
                  'h-4 w-4 flex-shrink-0',
                  isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'
                )} />
                
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left font-medium text-sm">
                      {item.label}
                    </span>
                    {item.badgeIcon && (
                      <span className={cn(
                        'flex items-center justify-center w-6 h-6 rounded-full shadow-sm transition-all duration-200',
                        isActive 
                          ? 'bg-white/20 text-white'
                          : `${item.badgeColor} text-white`
                      )}>
                        {(() => {
                          const BadgeIcon = item.badgeIcon!
                          return <BadgeIcon className="h-3.5 w-3.5" />
                        })()}
                      </span>
                    )}
                  </>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Search (if not collapsed) */}

        {/* Search */}
        {!collapsed && guard.hasAccess('system.search') && (
          <div className="p-4">
            <Link
              href="/dashboard?search=true"
              onClick={(e) => {
                if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
                  onTabChange('search')
                }
              }}
              className="nav-item w-full"
              title="Search"
            >
              <Search className="h-4 w-4" />
              <span className="font-medium text-sm">Search</span>
              <kbd className="ml-auto px-2 py-1 text-xs bg-white border border-gray-300 rounded">
                ⌘K
              </kbd>
            </Link>
          </div>
        )}

      </aside>
    </>
  )
}


