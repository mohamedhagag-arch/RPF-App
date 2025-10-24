#!/usr/bin/env node

/**
 * Sync All Auth Users to Database
 * مزامنة جميع مستخدمي Auth مع جدول users
 */

const { createClient } = require('@supabase/supabase-js')

// Production Supabase credentials
const SUPABASE_URL = 'https://qhnoyvdltetyfctphzys.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFobm95dmRsdGV0eWZjdHBoenlzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDE4MDIwNiwiZXhwIjoyMDY1NzU2MjA2fQ.B6tQmZ68D0u1vNZyk2RiI6Cl3qSfprDdfL1vaeP6EGo'

async function syncAllAuthUsers() {
  console.clear()
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║                                                            ║')
  console.log('║    🔄 Sync All Auth Users - مزامنة جميع المستخدمين     ║')
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
    
    console.log('🔄 Step 1: Fetching Auth users...')
    console.log()
    
    // Get all auth users
    const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.log('❌ Error fetching auth users:', authError.message)
      return
    }
    
    console.log(`✅ Found ${authUsers.length} users in Auth`)
    console.log()
    
    console.log('🔄 Step 2: Fetching users from public.users table...')
    console.log()
    
    // Get all users from public.users
    const { data: publicUsers, error: publicError } = await supabase
      .from('users')
      .select('id, email')
    
    if (publicError) {
      console.log('❌ Error fetching public users:', publicError.message)
      return
    }
    
    console.log(`✅ Found ${publicUsers?.length || 0} users in public.users`)
    console.log()
    
    // Find missing users
    const publicUserIds = new Set((publicUsers || []).map(u => u.id))
    const missingUsers = authUsers.filter(au => !publicUserIds.has(au.id))
    
    console.log('═══════════════════════════════════════════════════════════')
    console.log('📊 Analysis:')
    console.log('═══════════════════════════════════════════════════════════')
    console.log()
    console.log(`  Auth Users: ${authUsers.length}`)
    console.log(`  Public Users: ${publicUsers?.length || 0}`)
    console.log(`  Missing Users: ${missingUsers.length}`)
    console.log()
    
    if (missingUsers.length === 0) {
      console.log('✅ All Auth users are already in public.users!')
      console.log('   No sync needed.')
      console.log()
      return
    }
    
    console.log('⚠️  Missing Users Found:')
    console.log()
    missingUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.email} (Created: ${new Date(user.created_at).toLocaleDateString()})`)
    })
    console.log()
    
    console.log('🔄 Step 3: Syncing missing users...')
    console.log()
    
    let syncedCount = 0
    let failedCount = 0
    
    for (const authUser of missingUsers) {
      try {
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: authUser.id,
            email: authUser.email,
            full_name: authUser.user_metadata?.full_name || authUser.email,
            role: 'viewer',
            is_active: true,
            custom_permissions_enabled: false,
            permissions: [],
            created_at: authUser.created_at,
            updated_at: new Date().toISOString()
          })
        
        if (insertError) {
          console.log(`  ❌ Failed: ${authUser.email} - ${insertError.message}`)
          failedCount++
        } else {
          console.log(`  ✅ Synced: ${authUser.email}`)
          syncedCount++
        }
      } catch (error) {
        console.log(`  ❌ Exception: ${authUser.email} - ${error.message}`)
        failedCount++
      }
    }
    
    console.log()
    console.log('═══════════════════════════════════════════════════════════')
    console.log('🎉 Sync Complete!')
    console.log('═══════════════════════════════════════════════════════════')
    console.log()
    console.log(`  ✅ Synced: ${syncedCount}`)
    console.log(`  ❌ Failed: ${failedCount}`)
    console.log(`  📊 Total: ${missingUsers.length}`)
    console.log()
    
    if (syncedCount > 0) {
      console.log('✅ Users are now available in User Management!')
      console.log()
    }
    
    // Final verification
    console.log('🔄 Step 4: Final verification...')
    console.log()
    
    const { data: finalUsers } = await supabase
      .from('users')
      .select('id, email, role')
      .order('created_at', { ascending: false })
      .limit(10)
    
    console.log('📋 Latest users in database:')
    console.log()
    finalUsers?.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.email} (${user.role})`)
    })
    console.log()
    
  } catch (error) {
    console.log('❌ Fatal error:', error.message)
    console.log()
  }
}

// Run the script
syncAllAuthUsers().catch(error => {
  console.log('❌ Fatal error:', error.message)
  process.exit(1)
})

