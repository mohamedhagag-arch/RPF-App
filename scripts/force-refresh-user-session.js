#!/usr/bin/env node

/**
 * Force Refresh User Session - Force update user data
 * إجبار تحديث جلسة المستخدم
 */

const { createClient } = require('@supabase/supabase-js')

// Production Supabase credentials
const SUPABASE_URL = 'https://qhnoyvdltetyfctphzys.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFobm95dmRsdGV0eWZjdHBoenlzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDE4MDIwNiwiZXhwIjoyMDY1NzU2MjA2fQ.B6tQmZ68D0u1vNZyk2RiI6Cl3qSfprDdfL1vaeP6EGo'

async function forceRefreshUserSession() {
  console.clear()
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║                                                            ║')
  console.log('║        🔄 Force Refresh User Session - تحديث الجلسة     ║')
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
    
    // Get user details
    const userEmail = 'mohamed.hagag@rabatpfc.com'
    
    console.log(`🔍 Checking user: ${userEmail}`)
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
      return
    }
    
    const user = users[0]
    
    console.log('✅ User Details:')
    console.log(`   📧 Email: ${user.email}`)
    console.log(`   👤 Name: ${user.full_name}`)
    console.log(`   🔑 Role: ${user.role}`)
    console.log(`   ✅ Active: ${user.is_active}`)
    console.log()
    
    if (user.role !== 'admin') {
      console.log('❌ User is not admin!')
      console.log('   Current role:', user.role)
      console.log('   Please run the fix-admin-role script first.')
      return
    }
    
    console.log('✅ User is confirmed as admin!')
    console.log()
    console.log('═══════════════════════════════════════════════════════════')
    console.log('🎯 SOLUTION: Force Browser Refresh')
    console.log('═══════════════════════════════════════════════════════════')
    console.log()
    console.log('The user role is correct in database, but the app cache needs refresh.')
    console.log('Follow these steps:')
    console.log()
    console.log('1. 🚪 LOG OUT from the application')
    console.log('   - Go to: http://localhost:3000')
    console.log('   - Click "Sign Out" button')
    console.log()
    console.log('2. 🧹 CLEAR BROWSER CACHE')
    console.log('   - Press Ctrl+Shift+R (hard refresh)')
    console.log('   - Or press F12 → Network tab → "Disable cache"')
    console.log()
    console.log('3. 🔄 LOG IN AGAIN')
    console.log('   - Email: mohamed.hagag@rabatpfc.com')
    console.log('   - Password: 654321.0')
    console.log()
    console.log('4. ✅ CHECK ADMIN FEATURES')
    console.log('   - Go to Settings')
    console.log('   - You should see "User Management" and "Database Management"')
    console.log()
    console.log('═══════════════════════════════════════════════════════════')
    console.log()
    console.log('If still not working, try:')
    console.log('• Close browser completely and reopen')
    console.log('• Try incognito/private mode')
    console.log('• Check browser console for errors (F12)')
    console.log()
    
  } catch (error) {
    console.log('❌ Error:', error.message)
    console.log()
  }
}

// Run the script
forceRefreshUserSession().catch(error => {
  console.log('❌ Fatal error:', error.message)
  process.exit(1)
})
