#!/usr/bin/env node

/**
 * Debug User Permissions - تصحيح أخطاء صلاحيات المستخدم
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://qhnoyvdltetyfctphzys.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFobm95dmRsdGV0eWZjdHBoenlzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDE4MDIwNiwiZXhwIjoyMDY1NzU2MjA2fQ.B6tQmZ68D0u1vNZyk2RiI6Cl3qSfprDdfL1vaeP6EGo'

async function debugUserPermissions() {
  console.clear()
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║                                                            ║')
  console.log('║     🔍 Debug User Permissions - فحص صلاحيات المستخدم    ║')
  console.log('║                                                            ║')
  console.log('╚════════════════════════════════════════════════════════════╝')
  console.log()
  
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    
    console.log('🔄 Fetching all users...')
    console.log()
    
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.log('❌ Error fetching users:', error.message)
      return
    }
    
    console.log(`✅ Found ${users.length} users`)
    console.log()
    console.log('═══════════════════════════════════════════════════════════')
    console.log('📊 Users Permissions Summary:')
    console.log('═══════════════════════════════════════════════════════════')
    console.log()
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`)
      console.log(`   Role: ${user.role}`)
      console.log(`   Custom Permissions Enabled: ${user.custom_permissions_enabled}`)
      console.log(`   Permissions Count: ${user.permissions?.length || 0}`)
      console.log(`   Permissions: ${user.permissions ? JSON.stringify(user.permissions.slice(0, 5)) : '[]'}${user.permissions?.length > 5 ? '...' : ''}`)
      console.log(`   Is Active: ${user.is_active}`)
      console.log(`   Updated At: ${user.updated_at}`)
      console.log()
    })
    
    console.log('═══════════════════════════════════════════════════════════')
    console.log('🔍 Analysis:')
    console.log('═══════════════════════════════════════════════════════════')
    console.log()
    
    const customEnabledUsers = users.filter(u => u.custom_permissions_enabled)
    const usersWithPermissions = users.filter(u => u.permissions && u.permissions.length > 0)
    
    console.log(`  Users with custom_permissions_enabled: ${customEnabledUsers.length}`)
    console.log(`  Users with permissions array: ${usersWithPermissions.length}`)
    console.log()
    
    if (customEnabledUsers.length > 0) {
      console.log('👥 Users with Custom Permissions:')
      customEnabledUsers.forEach(user => {
        console.log(`   - ${user.email}: ${user.permissions?.length || 0} permissions`)
      })
      console.log()
    }
    
    console.log('═══════════════════════════════════════════════════════════')
    console.log('💡 How it should work:')
    console.log('═══════════════════════════════════════════════════════════')
    console.log()
    console.log('  ✅ custom_permissions_enabled = false:')
    console.log('     → Use DEFAULT_ROLE_PERMISSIONS[role]')
    console.log()
    console.log('  ✅ custom_permissions_enabled = true:')
    console.log('     → Use ONLY permissions from permissions array')
    console.log('     → Ignore role defaults')
    console.log()
    
  } catch (error) {
    console.log('❌ Fatal error:', error.message)
  }
}

debugUserPermissions().catch(error => {
  console.log('❌ Fatal error:', error.message)
  process.exit(1)
})

