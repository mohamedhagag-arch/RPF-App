#!/usr/bin/env node

/**
 * Sync Auth User to Database - Sync Supabase Auth user to users table
 * مزامنة مستخدم Auth مع جدول users
 */

const { createClient } = require('@supabase/supabase-js')

// Production Supabase credentials
const SUPABASE_URL = 'https://qhnoyvdltetyfctphzys.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFobm95dmRsdGV0eWZjdHBoenlzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDE4MDIwNiwiZXhwIjoyMDY1NzU2MjA2fQ.B6tQmZ68D0u1vNZyk2RiI6Cl3qSfprDdfL1vaeP6EGo'

async function syncAuthUserToDatabase() {
  console.clear()
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║                                                            ║')
  console.log('║    🔄 Sync Auth User to Database - مزامنة المستخدم      ║')
  console.log('║                                                            ║')
  console.log('╚════════════════════════════════════════════════════════════╝')
  console.log()
  
  try {
    // Create Supabase client with service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    
    console.log('🔄 Step 1: Connecting to Supabase...')
    console.log()
    
    // Get all auth users
    const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.log('❌ Error fetching auth users:', authError.message)
      return
    }
    
    console.log(`✅ Found ${authUsers.length} auth users`)
    console.log()
    
    // Find Mohamed's user
    const mohamedEmail = 'mohamed.hagag@rabatpfc.com'
    const mohamedAuthUser = authUsers.find(u => u.email === mohamedEmail)
    
    if (!mohamedAuthUser) {
      console.log(`❌ Auth user not found: ${mohamedEmail}`)
      console.log('   Please create the user in Supabase Auth first.')
      return
    }
    
    console.log('✅ Auth User Found:')
    console.log(`   📧 Email: ${mohamedAuthUser.email}`)
    console.log(`   🆔 ID: ${mohamedAuthUser.id}`)
    console.log(`   📅 Created: ${mohamedAuthUser.created_at}`)
    console.log()
    
    console.log('🔄 Step 2: Checking users table...')
    console.log()
    
    // Check if user exists in users table
    const { data: existingUsers, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('email', mohamedEmail)
    
    if (checkError) {
      console.log('❌ Error checking users table:', checkError.message)
      console.log()
      console.log('⚠️  Possible issue: users table might not exist!')
      console.log('   Solution: Run Database/PRODUCTION_SCHEMA_COMPLETE.sql first')
      return
    }
    
    if (existingUsers && existingUsers.length > 0) {
      console.log('✅ User already exists in users table:')
      const user = existingUsers[0]
      console.log(`   📧 Email: ${user.email}`)
      console.log(`   👤 Name: ${user.full_name}`)
      console.log(`   🔑 Role: ${user.role}`)
      console.log(`   ✅ Active: ${user.is_active}`)
      console.log()
      
      if (user.role !== 'admin') {
        console.log('🔄 Updating role to admin...')
        const { data: updated, error: updateError } = await supabase
          .from('users')
          .update({
            role: 'admin',
            is_active: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id)
          .select()
          .single()
        
        if (updateError) {
          console.log('❌ Error updating role:', updateError.message)
        } else {
          console.log('✅ Role updated to admin!')
        }
      } else {
        console.log('✅ User is already admin!')
      }
      console.log()
      console.log('═══════════════════════════════════════════════════════════')
      console.log('🎉 All Done! User is synced and ready.')
      console.log('═══════════════════════════════════════════════════════════')
      return
    }
    
    console.log('⚠️  User NOT found in users table')
    console.log('   Creating user now...')
    console.log()
    
    console.log('🔄 Step 3: Creating user in users table...')
    console.log()
    
    // Create user in users table
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        id: mohamedAuthUser.id,  // Use the Auth user ID
        email: mohamedEmail,
        full_name: 'Mohamed Ahmed',
        role: 'admin',
        division: 'Technical Office',
        is_active: true,
        custom_permissions_enabled: false,
        permissions: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (insertError) {
      console.log('❌ Error creating user:', insertError.message)
      console.log()
      console.log('Possible solutions:')
      console.log('1. Make sure users table exists')
      console.log('2. Run Database/PRODUCTION_SCHEMA_COMPLETE.sql')
      console.log('3. Check RLS policies')
      return
    }
    
    console.log('═══════════════════════════════════════════════════════════')
    console.log('🎉 SUCCESS! User Created in Database!')
    console.log('═══════════════════════════════════════════════════════════')
    console.log()
    console.log('Created User Details:')
    console.log(`   🆔 ID: ${newUser.id}`)
    console.log(`   📧 Email: ${newUser.email}`)
    console.log(`   👤 Name: ${newUser.full_name}`)
    console.log(`   🔑 Role: ${newUser.role}`)
    console.log(`   📂 Division: ${newUser.division}`)
    console.log(`   ✅ Active: ${newUser.is_active}`)
    console.log()
    console.log('═══════════════════════════════════════════════════════════')
    console.log()
    console.log('Next Steps:')
    console.log('1. Go to: http://localhost:3000')
    console.log('2. Log in with:')
    console.log('   📧 mohamed.hagag@rabatpfc.com')
    console.log('   🔒 654321.0')
    console.log('3. You should now see the Dashboard!')
    console.log('4. Go to Settings → You should see all admin features!')
    console.log()
    
  } catch (error) {
    console.log('❌ Fatal error:', error.message)
    console.log()
  }
}

// Run the script
syncAuthUserToDatabase().catch(error => {
  console.log('❌ Fatal error:', error.message)
  process.exit(1)
})

