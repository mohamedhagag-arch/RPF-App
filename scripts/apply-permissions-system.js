/**
 * Apply Comprehensive Permissions System
 * تطبيق نظام الصلاحيات الشامل
 * 
 * This script will automatically apply permission checks to all components
 * across the application.
 */

const fs = require('fs')
const path = require('path')

// Components that need permission protection
const COMPONENTS_TO_PROTECT = [
  // Project components
  {
    path: 'components/projects/ProjectsList.tsx',
    protections: [
      {
        selector: 'button[onClick*="setShowForm"]',
        permission: 'projects.create',
        type: 'button'
      },
      {
        selector: 'button[onClick*="onEdit"]',
        permission: 'projects.edit',
        type: 'button'
      },
      {
        selector: 'button[onClick*="onDelete"]',
        permission: 'projects.delete',
        type: 'button'
      }
    ]
  },
  {
    path: 'components/projects/ModernProjectCard.tsx',
    protections: [
      {
        selector: 'button[onClick*="onEdit"]',
        permission: 'projects.edit',
        type: 'button'
      },
      {
        selector: 'button[onClick*="onDelete"]',
        permission: 'projects.delete',
        type: 'button'
      }
    ]
  },
  {
    path: 'components/projects/EnhancedProjectCard.tsx',
    protections: [
      {
        selector: 'Button[onClick*="onEdit"]',
        permission: 'projects.edit',
        type: 'button'
      },
      {
        selector: 'Button[onClick*="onDelete"]',
        permission: 'projects.delete',
        type: 'button'
      }
    ]
  },
  
  // BOQ components
  {
    path: 'components/boq/BOQManagement.tsx',
    protections: [
      {
        selector: 'button[onClick*="setShowForm"]',
        permission: 'boq.create',
        type: 'button'
      },
      {
        selector: 'button[onClick*="onEdit"]',
        permission: 'boq.edit',
        type: 'button'
      },
      {
        selector: 'button[onClick*="onDelete"]',
        permission: 'boq.delete',
        type: 'button'
      }
    ]
  },
  
  // KPI components
  {
    path: 'components/kpi/KPITracking.tsx',
    protections: [
      {
        selector: 'button[onClick*="setShowForm"]',
        permission: 'kpi.create',
        type: 'button'
      },
      {
        selector: 'button[onClick*="onEdit"]',
        permission: 'kpi.edit',
        type: 'button'
      },
      {
        selector: 'button[onClick*="onDelete"]',
        permission: 'kpi.delete',
        type: 'button'
      }
    ]
  },
  
  // User Management components
  {
    path: 'components/users/UserManagement.tsx',
    protections: [
      {
        selector: 'button[onClick*="setShowForm"]',
        permission: 'users.create',
        type: 'button'
      },
      {
        selector: 'button[onClick*="onEdit"]',
        permission: 'users.edit',
        type: 'button'
      },
      {
        selector: 'button[onClick*="onDelete"]',
        permission: 'users.delete',
        type: 'button'
      }
    ]
  },
  
  // Settings components
  {
    path: 'components/settings/DatabaseManagement.tsx',
    protections: [
      {
        selector: 'button[onClick*="handleCreateBackup"]',
        permission: 'database.backup',
        type: 'button'
      },
      {
        selector: 'button[onClick*="handleRestore"]',
        permission: 'database.restore',
        type: 'button'
      },
      {
        selector: 'button[onClick*="handleClearData"]',
        permission: 'database.clear',
        type: 'button'
      }
    ]
  }
]

// Sidebar menu items that need protection
const SIDEBAR_PROTECTIONS = [
  {
    path: 'components/dashboard/EnhancedSidebar.tsx',
    menuItems: [
      { name: 'Projects', permission: 'projects.view' },
      { name: 'BOQ', permission: 'boq.view' },
      { name: 'KPI', permission: 'kpi.view' },
      { name: 'Reports', permission: 'reports.view' },
      { name: 'Users', permission: 'users.view' },
      { name: 'Settings', permission: 'settings.view' }
    ]
  }
]

// Permission mappings for different UI elements
const PERMISSION_MAPPINGS = {
  // Button permissions
  buttons: {
    'create': {
      projects: 'projects.create',
      boq: 'boq.create',
      kpi: 'kpi.create',
      users: 'users.create'
    },
    'edit': {
      projects: 'projects.edit',
      boq: 'boq.edit',
      kpi: 'kpi.edit',
      users: 'users.edit'
    },
    'delete': {
      projects: 'projects.delete',
      boq: 'boq.delete',
      kpi: 'kpi.delete',
      users: 'users.delete'
    },
    'export': {
      projects: 'projects.export',
      boq: 'boq.export',
      kpi: 'kpi.export',
      reports: 'reports.export'
    }
  },
  
  // Menu permissions
  menus: {
    'projects': 'projects.view',
    'boq': 'boq.view',
    'kpi': 'kpi.view',
    'reports': 'reports.view',
    'users': 'users.view',
    'settings': 'settings.view',
    'database': 'database.view'
  },
  
  // Page permissions
  pages: {
    '/projects': 'projects.view',
    '/boq': 'boq.view',
    '/kpi': 'kpi.view',
    '/reports': 'reports.view',
    '/users': 'users.view',
    '/settings': 'settings.view',
    '/settings/database': 'database.manage'
  }
}

/**
 * Apply permission protection to a component
 */
function applyComponentProtection(componentPath, protections) {
  try {
    const fullPath = path.join(process.cwd(), componentPath)
    
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️ Component not found: ${componentPath}`)
      return false
    }
    
    let content = fs.readFileSync(fullPath, 'utf8')
    let modified = false
    
    // Add imports if not present
    if (!content.includes('usePermissionGuard')) {
      const importMatch = content.match(/import.*from.*['"]react['"]/)
      if (importMatch) {
        content = content.replace(
          importMatch[0],
          `${importMatch[0]}\nimport { usePermissionGuard } from '@/lib/permissionGuard'`
        )
        modified = true
      }
    }
    
    // Add permission guard hook
    if (!content.includes('const guard = usePermissionGuard()')) {
      const componentMatch = content.match(/export function \w+\([^)]*\)\s*\{/)
      if (componentMatch) {
        content = content.replace(
          componentMatch[0],
          `${componentMatch[0]}\n  const guard = usePermissionGuard()`
        )
        modified = true
      }
    }
    
    // Apply protections
    protections.forEach(protection => {
      const { selector, permission, type } = protection
      
      if (type === 'button') {
        // Wrap buttons with permission checks
        const buttonRegex = new RegExp(`(${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'g')
        const replacement = `{guard.hasAccess('${permission}') && ($1)}`
        
        if (content.match(buttonRegex)) {
          content = content.replace(buttonRegex, replacement)
          modified = true
        }
      }
    })
    
    if (modified) {
      fs.writeFileSync(fullPath, content)
      console.log(`✅ Applied permissions to: ${componentPath}`)
      return true
    } else {
      console.log(`ℹ️ No changes needed for: ${componentPath}`)
      return false
    }
    
  } catch (error) {
    console.error(`❌ Error applying permissions to ${componentPath}:`, error.message)
    return false
  }
}

/**
 * Apply sidebar menu protections
 */
function applySidebarProtections(sidebarPath, menuItems) {
  try {
    const fullPath = path.join(process.cwd(), sidebarPath)
    
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️ Sidebar not found: ${sidebarPath}`)
      return false
    }
    
    let content = fs.readFileSync(fullPath, 'utf8')
    let modified = false
    
    // Add imports if not present
    if (!content.includes('usePermissionGuard')) {
      const importMatch = content.match(/import.*from.*['"]react['"]/)
      if (importMatch) {
        content = content.replace(
          importMatch[0],
          `${importMatch[0]}\nimport { usePermissionGuard } from '@/lib/permissionGuard'`
        )
        modified = true
      }
    }
    
    // Add permission guard hook
    if (!content.includes('const guard = usePermissionGuard()')) {
      const componentMatch = content.match(/export function \w+\([^)]*\)\s*\{/)
      if (componentMatch) {
        content = content.replace(
          componentMatch[0],
          `${componentMatch[0]}\n  const guard = usePermissionGuard()`
        )
        modified = true
      }
    }
    
    // Apply menu item protections
    menuItems.forEach(item => {
      const { name, permission } = item
      
      // Find menu item and wrap with permission check
      const menuItemRegex = new RegExp(`(.*${name}.*)`, 'g')
      const replacement = `{guard.hasAccess('${permission}') && ($1)}`
      
      if (content.match(menuItemRegex)) {
        content = content.replace(menuItemRegex, replacement)
        modified = true
      }
    })
    
    if (modified) {
      fs.writeFileSync(fullPath, content)
      console.log(`✅ Applied sidebar protections to: ${sidebarPath}`)
      return true
    } else {
      console.log(`ℹ️ No sidebar changes needed for: ${sidebarPath}`)
      return false
    }
    
  } catch (error) {
    console.error(`❌ Error applying sidebar protections to ${sidebarPath}:`, error.message)
    return false
  }
}

/**
 * Main function to apply all permissions
 */
function applyAllPermissions() {
  console.log('🚀 Starting comprehensive permissions system application...\n')
  
  let totalModified = 0
  
  // Apply component protections
  console.log('📦 Applying component protections...')
  COMPONENTS_TO_PROTECT.forEach(component => {
    if (applyComponentProtection(component.path, component.protections)) {
      totalModified++
    }
  })
  
  console.log('\n📋 Applying sidebar protections...')
  SIDEBAR_PROTECTIONS.forEach(sidebar => {
    if (applySidebarProtections(sidebar.path, sidebar.menuItems)) {
      totalModified++
    }
  })
  
  console.log(`\n🎉 Permissions system applied successfully!`)
  console.log(`📊 Total components modified: ${totalModified}`)
  console.log(`\n📝 Next steps:`)
  console.log(`1. Test the application with different user roles`)
  console.log(`2. Verify permission checks in browser console`)
  console.log(`3. Update any remaining components manually if needed`)
}

// Run the script
if (require.main === module) {
  applyAllPermissions()
}

module.exports = {
  applyAllPermissions,
  applyComponentProtection,
  applySidebarProtections,
  COMPONENTS_TO_PROTECT,
  SIDEBAR_PROTECTIONS,
  PERMISSION_MAPPINGS
}

