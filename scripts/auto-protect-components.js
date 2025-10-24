/**
 * Auto-Protect Components with Permissions
 * حماية تلقائية للمكونات بالصلاحيات
 * 
 * This script automatically wraps components with permission checks
 */

const fs = require('fs')
const path = require('path')

// Patterns to detect and protect
const PROTECTION_PATTERNS = [
  {
    // Project management buttons
    pattern: /<button[^>]*onClick[^>]*setShowForm[^>]*>[\s\S]*?Add.*Project[\s\S]*?<\/button>/gi,
    permission: 'projects.create',
    component: 'projects'
  },
  {
    // Edit buttons
    pattern: /<button[^>]*onClick[^>]*onEdit[^>]*>[\s\S]*?Edit[\s\S]*?<\/button>/gi,
    permission: 'projects.edit',
    component: 'projects'
  },
  {
    // Delete buttons
    pattern: /<button[^>]*onClick[^>]*onDelete[^>]*>[\s\S]*?Delete[\s\S]*?<\/button>/gi,
    permission: 'projects.delete',
    component: 'projects'
  },
  {
    // BOQ buttons
    pattern: /<button[^>]*onClick[^>]*BOQ[^>]*>[\s\S]*?<\/button>/gi,
    permission: 'boq.create',
    component: 'boq'
  },
  {
    // KPI buttons
    pattern: /<button[^>]*onClick[^>]*KPI[^>]*>[\s\S]*?<\/button>/gi,
    permission: 'kpi.create',
    component: 'kpi'
  },
  {
    // User management buttons
    pattern: /<button[^>]*onClick[^>]*User[^>]*>[\s\S]*?<\/button>/gi,
    permission: 'users.create',
    component: 'users'
  }
]

// Components to scan
const COMPONENTS_TO_SCAN = [
  'components/projects',
  'components/boq',
  'components/kpi',
  'components/users',
  'components/settings',
  'components/dashboard'
]

/**
 * Find all TypeScript/JavaScript files in a directory
 */
function findComponentFiles(dir) {
  const files = []
  
  function scanDirectory(currentDir) {
    const items = fs.readdirSync(currentDir)
    
    items.forEach(item => {
      const fullPath = path.join(currentDir, item)
      const stat = fs.statSync(fullPath)
      
      if (stat.isDirectory()) {
        scanDirectory(fullPath)
      } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
        files.push(fullPath)
      }
    })
  }
  
  scanDirectory(dir)
  return files
}

/**
 * Apply permission protection to a file
 */
function protectFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8')
    let modified = false
    
    // Skip if already has permission guard
    if (content.includes('usePermissionGuard') || content.includes('PermissionGuard')) {
      return false
    }
    
    // Add imports
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
    
    // Apply protection patterns
    PROTECTION_PATTERNS.forEach(({ pattern, permission, component }) => {
      // Check if this file is related to the component
      if (filePath.includes(component)) {
        content = content.replace(pattern, (match) => {
          // Wrap with permission check
          return `{guard.hasAccess('${permission}') && (${match})}`
        })
        modified = true
      }
    })
    
    if (modified) {
      fs.writeFileSync(filePath, content)
      return true
    }
    
    return false
  } catch (error) {
    console.error(`❌ Error protecting ${filePath}:`, error.message)
    return false
  }
}

/**
 * Protect all components
 */
function protectAllComponents() {
  console.log('🛡️ Starting auto-protection of components...\n')
  
  let totalProtected = 0
  let totalScanned = 0
  
  COMPONENTS_TO_SCAN.forEach(componentDir => {
    const fullDir = path.join(process.cwd(), componentDir)
    
    if (!fs.existsSync(fullDir)) {
      console.log(`⚠️ Directory not found: ${componentDir}`)
      return
    }
    
    console.log(`📁 Scanning ${componentDir}...`)
    const files = findComponentFiles(fullDir)
    
    files.forEach(file => {
      totalScanned++
      const relativePath = path.relative(process.cwd(), file)
      
      if (protectFile(file)) {
        console.log(`✅ Protected: ${relativePath}`)
        totalProtected++
      } else {
        console.log(`ℹ️ Already protected or no changes: ${relativePath}`)
      }
    })
  })
  
  console.log(`\n🎉 Auto-protection completed!`)
  console.log(`📊 Total files scanned: ${totalScanned}`)
  console.log(`📊 Total files protected: ${totalProtected}`)
}

// Run if called directly
if (require.main === module) {
  protectAllComponents()
}

module.exports = { protectAllComponents, protectFile }

