#!/usr/bin/env node

/**
 * Fix Custom Permissions Flag - إصلاح علامة الصلاحيات المخصصة
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://qhnoyvdltetyfctphzys.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFobm95dmRsdGV0eWZjdHBoenlzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDE4MDIwNiwiZXhwIjoyMDY1NzU2MjA2fQ.B6tQmZ68D0u1vNZyk2RiI6Cl3qSfprDdfL1vaeP6EGo'

async function fixCustomPermissionsFlag() {
  console.clear()
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║                                                            ║')
  console.log('║   🔧 Fix Custom Permissions Flag - إصلاح علامة الصلاحيات║')
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
    
    console.log('🔄 Step 1: Finding users with permissions but custom mode OFF...')
    console.log()
    
    const { data: usersToFix, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .not('permissions', 'is', null)
    
    if (fetchError) {
      console.log('❌ Error fetching users:', fetchError.message)
      return
    }
    
    // Filter users who have permissions but custom_permissions_enabled is false
    const problematicUsers = (usersToFix || []).filter(u => 
      u.permissions && 
      u.permissions.length > 0 && 
      !u.custom_permissions_enabled
    )
    
    console.log(`✅ Found ${usersToFix?.length || 0} users with permissions array`)
    console.log(`⚠️  Found ${problematicUsers.length} users with permissions but custom mode OFF`)
    console.log()
    
    if (problematicUsers.length === 0) {
      console.log('✅ No users need fixing!')
      console.log('   All users with permissions have custom_permissions_enabled = true')
      console.log()
      return
    }
    
    console.log('⚠️  Users that need fixing:')
    console.log()
    problematicUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`)
      console.log(`   Role: ${user.role}`)
      console.log(`   Permissions Count: ${user.permissions.length}`)
      console.log(`   Custom Enabled: ${user.custom_permissions_enabled} ← Should be TRUE!`)
      console.log()
    })
    
    console.log('🔄 Step 2: Fixing users...')
    console.log()
    
    let fixedCount = 0
    let failedCount = 0
    
    for (const user of problematicUsers) {
      try {
        const { error: updateError } = await supabase
          .from('users')
          .update({
            custom_permissions_enabled: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id)
        
        if (updateError) {
          console.log(`  ❌ Failed: ${user.email} - ${updateError.message}`)
          failedCount++
        } else {
          console.log(`  ✅ Fixed: ${user.email}`)
          fixedCount++
        }
      } catch (error) {
        console.log(`  ❌ Exception: ${user.email} - ${error.message}`)
        failedCount++
      }
    }
    
    console.log()
    console.log('═══════════════════════════════════════════════════════════')
    console.log('🎉 Fix Complete!')
    console.log('═══════════════════════════════════════════════════════════')
    console.log()
    console.log(`  ✅ Fixed: ${fixedCount}`)
    console.log(`  ❌ Failed: ${failedCount}`)
    console.log(`  📊 Total: ${problematicUsers.length}`)
    console.log()
    
    if (fixedCount > 0) {
      console.log('═══════════════════════════════════════════════════════════')
      console.log('📋 Next Steps:')
      console.log('═══════════════════════════════════════════════════════════')
      console.log()
      console.log('1. سجل خروج من جميع المستخدمين')
      console.log('2. سجل دخول مرة أخرى')
      console.log('3. الصلاحيات المخصصة يجب أن تطبق الآن! ✅')
      console.log()
    }
    
    // Final verification
    console.log('🔄 Step 3: Final verification...')
    console.log()
    
    const { data: allUsers } = await supabase
      .from('users')
      .select('email, role, custom_permissions_enabled, permissions')
      .order('email')
    
    console.log('📊 All Users Status:')
    console.log()
    allUsers?.forEach((user, index) => {
      const mode = user.custom_permissions_enabled ? 'CUSTOM' : 'ROLE DEFAULT'
      const permsCount = user.permissions?.length || 0
      console.log(`${index + 1}. ${user.email}`)
      console.log(`   Role: ${user.role}`)
      console.log(`   Mode: ${mode}`)
      console.log(`   Permissions: ${permsCount}`)
      console.log()
    })
    
  } catch (error) {
    console.log('❌ Fatal error:', error.message)
  }
}

fixCustomPermissionsFlag().catch(error => {
  console.log('❌ Fatal error:', error.message)
  process.exit(1)
})

