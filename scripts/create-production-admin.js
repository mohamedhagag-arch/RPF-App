#!/usr/bin/env node

/**
 * Create Admin User for Production Supabase
 * Quick script to create the first admin user
 */

const { createClient } = require('@supabase/supabase-js')
const readline = require('readline')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(query) {
  return new Promise(resolve => rl.question(query, resolve))
}

// Production Supabase credentials
const SUPABASE_URL = 'https://qhnoyvdltetyfctphzys.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFobm95dmRsdGV0eWZjdHBoenlzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDE4MDIwNiwiZXhwIjoyMDY1NzU2MjA2fQ.B6tQmZ68D0u1vNZyk2RiI6Cl3qSfprDdfL1vaeP6EGo'

async function createAdminUser() {
  console.clear()
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║                                                            ║')
  console.log('║       🎯 Create Admin User - Production Supabase         ║')
  console.log('║                                                            ║')
  console.log('╚════════════════════════════════════════════════════════════╝')
  console.log()
  
  console.log('📍 Supabase URL:', SUPABASE_URL)
  console.log()
  
  try {
    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    
    console.log('✅ Connected to Supabase!')
    console.log()
    
    // Get admin details
    const email = await question('📧 Admin Email: ')
    if (!email || !email.includes('@')) {
      console.log('❌ Invalid email address!')
      rl.close()
      return
    }
    
    const password = await question('🔒 Admin Password (min 8 characters): ')
    if (password.length < 8) {
      console.log('❌ Password must be at least 8 characters!')
      rl.close()
      return
    }
    
    const fullName = await question('👤 Admin Full Name: ')
    if (!fullName) {
      console.log('❌ Full name is required!')
      rl.close()
      return
    }
    
    console.log()
    console.log('🔄 Creating admin user...')
    console.log()
    
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName
      }
    })
    
    if (authError) {
      console.log('❌ Error creating auth user:', authError.message)
      rl.close()
      return
    }
    
    console.log('✅ Auth user created successfully!')
    console.log('   User ID:', authData.user.id)
    console.log()
    
    // Create user record in public.users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: email,
        full_name: fullName,
        role: 'admin',
        is_active: true,
        custom_permissions_enabled: false
      })
      .select()
      .single()
    
    if (userError) {
      console.log('⚠️ Warning: Could not create user record:', userError.message)
      console.log('   The auth user was created, but the profile record failed.')
      console.log('   You may need to create it manually in the database.')
      console.log()
    } else {
      console.log('✅ User profile created successfully!')
      console.log()
    }
    
    console.log('═══════════════════════════════════════════════════════════')
    console.log('🎉 Admin User Created Successfully!')
    console.log('═══════════════════════════════════════════════════════════')
    console.log()
    console.log('Login Credentials:')
    console.log(`  📧 Email: ${email}`)
    console.log(`  🔒 Password: ${password}`)
    console.log(`  👤 Name: ${fullName}`)
    console.log(`  🔑 Role: admin`)
    console.log()
    console.log('═══════════════════════════════════════════════════════════')
    console.log()
    console.log('⚠️ IMPORTANT: Save these credentials securely!')
    console.log()
    console.log('Next Steps:')
    console.log('1. Update .env.local with production credentials')
    console.log('2. Restart dev server: npm run dev')
    console.log('3. Login with the credentials above')
    console.log('4. Import data from backup (Settings → Database Management)')
    console.log()
    
  } catch (error) {
    console.log('❌ Error:', error.message)
    console.log()
    console.log('Please check:')
    console.log('- Supabase project is active')
    console.log('- Service role key is correct')
    console.log('- Database tables are created')
    console.log()
  }
  
  rl.close()
}

// Run the script
createAdminUser().catch(error => {
  console.log('❌ Fatal error:', error.message)
  rl.close()
  process.exit(1)
})

