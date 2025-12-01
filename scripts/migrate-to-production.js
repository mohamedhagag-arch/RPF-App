#!/usr/bin/env node

/**
 * Migration Script to Production Supabase
 * This script helps you migrate from test to production Supabase
 */

const readline = require('readline')
const { createClient } = require('@supabase/supabase-js')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(query) {
  return new Promise(resolve => rl.question(query, resolve))
}

function log(message, type = 'info') {
  const icons = {
    info: 'ℹ️',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    question: '❓'
  }
  console.log(`${icons[type]} ${message}`)
}

async function main() {
  console.clear()
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║                                                            ║')
  console.log('║       🚀 AlRabat RPF - Production Migration Script       ║')
  console.log('║                                                            ║')
  console.log('╚════════════════════════════════════════════════════════════╝')
  console.log()
  
  log('Welcome to the production migration wizard!', 'success')
  console.log()
  
  // Step 1: Get new Supabase credentials
  log('Step 1: Enter your NEW Production Supabase credentials', 'info')
  console.log()
  
  const supabaseUrl = await question('📍 New Supabase URL (https://xxxxx.supabase.co): ')
  if (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('supabase.co')) {
    log('Invalid Supabase URL format!', 'error')
    rl.close()
    return
  }
  
  const supabaseAnonKey = await question('🔑 New Supabase Anon Key: ')
  if (supabaseAnonKey.length < 100) {
    log('Anon key seems too short. Make sure you copied it correctly.', 'warning')
  }
  
  const supabaseServiceKey = await question('🔐 New Supabase Service Role Key: ')
  if (supabaseServiceKey.length < 100) {
    log('Service role key seems too short. Make sure you copied it correctly.', 'warning')
  }
  
  console.log()
  log('Testing connection to new Supabase...', 'info')
  
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    
    // Test connection
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1)
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = table doesn't exist yet
      throw error
    }
    
    log('Connection successful!', 'success')
  } catch (error) {
    log(`Connection failed: ${error.message}`, 'error')
    log('Please check your credentials and try again.', 'warning')
    rl.close()
    return
  }
  
  console.log()
  log('Step 2: Create Admin User', 'info')
  console.log()
  
  const createAdmin = await question('Do you want to create an admin user now? (y/n): ')
  
  if (createAdmin.toLowerCase() === 'y') {
    const adminEmail = await question('📧 Admin Email: ')
    const adminPassword = await question('🔒 Admin Password (min 8 characters): ')
    const adminName = await question('👤 Admin Full Name: ')
    
    if (adminPassword.length < 8) {
      log('Password must be at least 8 characters long!', 'error')
      rl.close()
      return
    }
    
    console.log()
    log('Creating admin user...', 'info')
    
    try {
      const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })
      
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
        user_metadata: {
          full_name: adminName
        }
      })
      
      if (authError) throw authError
      
      log('Auth user created successfully!', 'success')
      
      // Create user record
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: adminEmail,
          full_name: adminName,
          role: 'admin',
          is_active: true,
          custom_permissions_enabled: false
        })
        .select()
        .single()
      
      if (userError) throw userError
      
      log('User record created successfully!', 'success')
      console.log()
      console.log('═══════════════════════════════════════')
      console.log('Admin User Created:')
      console.log(`  Email: ${adminEmail}`)
      console.log(`  Name: ${adminName}`)
      console.log(`  Role: admin`)
      console.log('═══════════════════════════════════════')
      
    } catch (error) {
      log(`Failed to create admin user: ${error.message}`, 'error')
      rl.close()
      return
    }
  }
  
  console.log()
  log('Step 3: Update Environment Variables', 'info')
  console.log()
  console.log('Add these to your .env.local file:')
  console.log()
  console.log('═══════════════════════════════════════')
  console.log('NEXT_PUBLIC_SUPABASE_URL=' + supabaseUrl)
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY=' + supabaseAnonKey)
  console.log('SUPABASE_SERVICE_ROLE_KEY=' + supabaseServiceKey)
  console.log('NEXT_PUBLIC_APP_URL=http://localhost:3000')
  console.log('═══════════════════════════════════════')
  console.log()
  
  log('Step 4: Update Vercel Environment Variables', 'info')
  console.log()
  console.log('Go to: https://vercel.com/dashboard')
  console.log('Navigate to: Your Project → Settings → Environment Variables')
  console.log('Update the same variables as above')
  console.log('Set Environment to: Production')
  console.log()
  
  log('Step 5: Test Locally', 'info')
  console.log()
  console.log('1. Update .env.local with the values above')
  console.log('2. Run: npm run dev')
  console.log('3. Open: http://localhost:3000')
  console.log('4. Login with your admin credentials')
  console.log('5. Test all features')
  console.log()
  
  log('Step 6: Deploy to Production', 'info')
  console.log()
  console.log('1. Commit changes: git add . && git commit -m "Migrate to production"')
  console.log('2. Push to GitHub: git push origin main')
  console.log('3. Vercel will auto-deploy')
  console.log('4. Or manually redeploy from Vercel Dashboard')
  console.log()
  
  log('Migration preparation complete!', 'success')
  console.log()
  console.log('═══════════════════════════════════════════════════════════')
  console.log('Next Steps:')
  console.log('1. ✅ Run the SQL schema script in Supabase SQL Editor')
  console.log('2. ✅ Update .env.local')
  console.log('3. ✅ Test locally')
  console.log('4. ✅ Import data (Settings → Database Management → Restore)')
  console.log('5. ✅ Update Vercel environment variables')
  console.log('6. ✅ Deploy to production')
  console.log('═══════════════════════════════════════════════════════════')
  console.log()
  
  log('For detailed instructions, see: MIGRATION_TO_PRODUCTION_SUPABASE.md', 'info')
  console.log()
  
  rl.close()
}

main().catch(error => {
  log(`Error: ${error.message}`, 'error')
  rl.close()
  process.exit(1)
})

