'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { PermissionPage } from '@/components/ui/PermissionPage'
import { DynamicTitle } from '@/components/ui/DynamicTitle'
import { ModernButton } from '@/components/ui/ModernButton'
import { Building2, Package, CreditCard, FileText } from 'lucide-react'
import { usePermissionGuard } from '@/lib/permissionGuard'
import { useAuth } from '@/app/providers'
import VendorListContent from '@/components/procurement/VendorListContent'
import ItemsListContent from '@/components/procurement/ItemsListContent'
import PaymentTermsListContent from '@/components/procurement/PaymentTermsListContent'
import LPOListContent from '@/components/procurement/LPOListContent'

type ProcurementTab = 'vendors' | 'items' | 'payment-terms' | 'lpo'

export default function VendorListPage() {
  const guard = usePermissionGuard()
  const { appUser } = useAuth()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<ProcurementTab>('vendors')
  
  // Check permissions - Admin has access to everything
  const isAdmin = appUser?.role === 'admin'
  const canViewVendors = isAdmin || guard.hasAccess('procurement.vendor_list.view')
  const canViewItems = isAdmin || guard.hasAccess('procurement.items_list.view')
  const canViewPaymentTerms = isAdmin || guard.hasAccess('procurement.payment_terms.view')
  const canViewLPO = isAdmin || guard.hasAccess('procurement.lpo.view')
  
  // Handle query parameter for tabs
  useEffect(() => {
    const tab = searchParams?.get('tab') as ProcurementTab | null
    if (tab && ['vendors', 'items', 'payment-terms', 'lpo'].includes(tab)) {
      // Check permissions before setting tab
      if (tab === 'vendors' && !canViewVendors) {
        if (canViewItems) {
          setActiveTab('items')
          return
        } else if (canViewPaymentTerms) {
          setActiveTab('payment-terms')
          return
        }
        return
      }
      if (tab === 'items' && !canViewItems) {
        if (canViewVendors) {
          setActiveTab('vendors')
          return
        } else if (canViewPaymentTerms) {
          setActiveTab('payment-terms')
          return
        }
        return
      }
      if (tab === 'payment-terms' && !canViewPaymentTerms) {
        if (canViewVendors) {
          setActiveTab('vendors')
          return
        } else if (canViewItems) {
          setActiveTab('items')
          return
        } else if (canViewLPO) {
          setActiveTab('lpo')
          return
        }
        return
      }
      if (tab === 'lpo' && !canViewLPO) {
        if (canViewVendors) {
          setActiveTab('vendors')
          return
        } else if (canViewItems) {
          setActiveTab('items')
          return
        } else if (canViewPaymentTerms) {
          setActiveTab('payment-terms')
          return
        }
        return
      }
      setActiveTab(tab)
    } else {
      // Default to first available tab
      if (canViewVendors) {
        setActiveTab('vendors')
      } else if (canViewItems) {
        setActiveTab('items')
      } else if (canViewPaymentTerms) {
        setActiveTab('payment-terms')
      } else if (canViewLPO) {
        setActiveTab('lpo')
      }
    }
  }, [searchParams, canViewVendors, canViewItems, canViewPaymentTerms, canViewLPO])

  const tabs = [
    {
      id: 'vendors' as ProcurementTab,
      label: 'Vendor List',
      icon: Building2,
      description: 'Manage and view vendor information',
      requiresPermission: canViewVendors
    },
    {
      id: 'items' as ProcurementTab,
      label: 'List of Items',
      icon: Package,
      description: 'Manage and view items with descriptions',
      requiresPermission: canViewItems
    },
    {
      id: 'payment-terms' as ProcurementTab,
      label: 'List of Payment Terms',
      icon: CreditCard,
      description: 'Manage and view payment terms',
      requiresPermission: canViewPaymentTerms
    },
    {
      id: 'lpo' as ProcurementTab,
      label: 'LPO Database',
      icon: FileText,
      description: 'Manage and view purchase orders',
      requiresPermission: canViewLPO
    }
  ]

  const handleTabChange = (tab: ProcurementTab) => {
    // Check permissions before allowing tab change
    if (tab === 'vendors' && !canViewVendors) {
      return
    }
    if (tab === 'items' && !canViewItems) {
      return
    }
    if (tab === 'payment-terms' && !canViewPaymentTerms) {
      return
    }
    if (tab === 'lpo' && !canViewLPO) {
      return
    }
    
    setActiveTab(tab)
    // Update URL without page reload
    router.push(`/procurement/vendor-list?tab=${tab}`, { scroll: false })
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'vendors':
        return canViewVendors ? <VendorListContent /> : null
      case 'items':
        return canViewItems ? <ItemsListContent /> : null
      case 'payment-terms':
        return canViewPaymentTerms ? <PaymentTermsListContent /> : null
      case 'lpo':
        return canViewLPO ? <LPOListContent /> : null
      default:
        return canViewVendors ? <VendorListContent /> : canViewItems ? <ItemsListContent /> : canViewPaymentTerms ? <PaymentTermsListContent /> : canViewLPO ? <LPOListContent /> : null
    }
  }

  return (
    <PermissionPage 
      permission="procurement.vendor_list.view"
      accessDeniedTitle="Procurement Access Required"
      accessDeniedMessage="You need permission to view procurement. Please contact your administrator."
    >
      <DynamicTitle pageTitle="Procurement" />
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
            <Building2 className="h-8 w-8 text-indigo-500" />
            Procurement
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage vendors and items
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto pb-2">
          {tabs.map((tab) => {
            if (tab.requiresPermission === false) return null
            
            const Icon = tab.icon
            return (
              <ModernButton
                key={tab.id}
                variant={activeTab === tab.id ? 'primary' : 'ghost'}
                onClick={() => handleTabChange(tab.id)}
                size="sm"
                className="flex items-center gap-2"
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </ModernButton>
            )
          })}
        </div>

        {/* Tab Content */}
        <div className="min-h-[600px]">
          {renderTabContent()}
        </div>
      </div>
    </PermissionPage>
  )
}
