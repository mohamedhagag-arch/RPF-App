#!/usr/bin/env node

/**
 * Fix Admin Role - Update user role to admin
 * يصلح دور المستخدم ويجعله admin
 */

const { createClient } = require('@supabase/supabase-js')

// Production Supabase credentials
const SUPABASE_URL = 'https://qhnoyvdltetyfctphzys.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFobm95dmRsdGV0eWZjdHBoenlzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDE4MDIwNiwiZXhwIjoyMDY1NzU2MjA2fQ.B6tQmZ68D0u1vNZyk2RiI6Cl3qSfprDdfL1vaeP6EGo'

async function fixAdminRole() {
  console.clear()
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║                                                            ║')
  console.log('║           🔧 Fix Admin Role - تصحيح دور المدير          ║')
  console.log('║                                                            ║')
  console.log('╚════════════════════════════════════════════════════════════╝')
  console.log()
  
  try {
    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    
    console.log('🔄 Connecting to Supabase...')
    
    // Find the user (Mohamed Ahmed)
    const userEmail = 'mohamed.hagag@rabatpfc.com'
    
    console.log(`🔍 Looking for user: ${userEmail}`)
    console.log()
    
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('email', userEmail)
    
    if (fetchError) {
      console.log('❌ Error fetching user:', fetchError.message)
      return
    }
    
    if (!users || users.length === 0) {
      console.log('❌ User not found!')
      console.log('   Please check the email address.')
      return
    }
    
    const user = users[0]
    
    console.log('✅ User found!')
    console.log('   Current Details:')
    console.log(`   - Email: ${user.email}`)
    console.log(`   - Name: ${user.full_name}`)
    console.log(`   - Role: ${user.role}`)
    console.log(`   - Active: ${user.is_active}`)
    console.log()
    
    if (user.role === 'admin') {
      console.log('✅ User is already an admin!')
      console.log('   No changes needed.')
      return
    }
    
    console.log('🔧 Updating role to admin...')
    console.log()
    
    // Update role to admin
    const { data: updated, error: updateError } = await supabase
      .from('users')
      .update({
        role: 'admin',
        is_active: true,
        custom_permissions_enabled: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single()
    
    if (updateError) {
      console.log('❌ Error updating role:', updateError.message)
      console.log()
      console.log('⚠️ Possible solutions:')
      console.log('   1. Make sure the users table has role column')
      console.log('   2. Check RLS policies allow updates')
      console.log('   3. Verify service role key is correct')
      return
    }
    
    console.log('═══════════════════════════════════════════════════════════')
    console.log('🎉 Successfully Updated to Admin!')
    console.log('═══════════════════════════════════════════════════════════')
    console.log()
    console.log('Updated User Details:')
    console.log(`   📧 Email: ${updated.email}`)
    console.log(`   👤 Name: ${updated.full_name}`)
    console.log(`   🔑 Role: ${updated.role}`)
    console.log(`   ✅ Active: ${updated.is_active}`)
    console.log()
    console.log('═══════════════════════════════════════════════════════════')
    console.log()
    console.log('Next Steps:')
    console.log('1. Log out from the application')
    console.log('2. Log back in')
    console.log('3. You should now have admin access!')
    console.log()
    
  } catch (error) {
    console.log('❌ Error:', error.message)
    console.log()
  }
}

// Run the script
fixAdminRole().catch(error => {
  console.log('❌ Fatal error:', error.message)
  process.exit(1)
})

