#!/usr/bin/env node

/**
 * Fix Users RLS - Temporarily disable RLS for users table
 * إصلاح سياسات الأمان لجدول users
 */

const { createClient } = require('@supabase/supabase-js')

// Production Supabase credentials
const SUPABASE_URL = 'https://qhnoyvdltetyfctphzys.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFobm95dmRsdGV0eWZjdHBoenlzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDE4MDIwNiwiZXhwIjoyMDY1NzU2MjA2fQ.B6tQmZ68D0u1vNZyk2RiI6Cl3qSfprDdfL1vaeP6EGo'

async function fixUsersRLS() {
  console.clear()
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║                                                            ║')
  console.log('║         🔧 Fix Users RLS - إصلاح سياسات الأمان          ║')
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
    
    console.log('🔄 Connecting to Supabase...')
    console.log()
    
    // Test query to see if we can read users table
    console.log('🔍 Testing users table access...')
    const { data: users, error: testError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'mohamed.hagag@rabatpfc.com')
    
    if (testError) {
      console.log('❌ Error reading users table:', testError.message)
      console.log()
      console.log('═══════════════════════════════════════════════════════════')
      console.log('🚨 RLS Policy Issue Detected!')
      console.log('═══════════════════════════════════════════════════════════')
      console.log()
      console.log('Solution: Run this SQL in Supabase SQL Editor:')
      console.log()
      console.log('ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;')
      console.log()
      console.log('Steps:')
      console.log('1. Go to: https://supabase.com/dashboard')
      console.log('2. Select your project: qhnoyvdltetyfctphzys')
      console.log('3. SQL Editor → New Query')
      console.log('4. Copy and paste the SQL above')
      console.log('5. Click Run (F5)')
      console.log('6. Then try logging in again')
      console.log()
      return
    }
    
    if (!users || users.length === 0) {
      console.log('❌ User not found in users table!')
      console.log('   Email: mohamed.hagag@rabatpfc.com')
      console.log()
      console.log('   Run: node scripts/sync-auth-user-to-database.js')
      return
    }
    
    console.log('✅ Users table is accessible!')
    console.log()
    console.log('User Details:')
    const user = users[0]
    console.log(`   🆔 ID: ${user.id}`)
    console.log(`   📧 Email: ${user.email}`)
    console.log(`   👤 Name: ${user.full_name}`)
    console.log(`   🔑 Role: ${user.role}`)
    console.log(`   ✅ Active: ${user.is_active}`)
    console.log()
    console.log('═══════════════════════════════════════════════════════════')
    console.log('🎉 All Good! Users table is working properly.')
    console.log('═══════════════════════════════════════════════════════════')
    console.log()
    console.log('If you still see "Current role: Unknown", try:')
    console.log()
    console.log('1. Log out from the app')
    console.log('2. Clear browser cache (Ctrl+Shift+R)')
    console.log('3. Log in again')
    console.log('4. If still not working, open browser console (F12)')
    console.log('   and check for errors')
    console.log()
    
  } catch (error) {
    console.log('❌ Fatal error:', error.message)
    console.log()
  }
}

// Run the script
fixUsersRLS().catch(error => {
  console.log('❌ Fatal error:', error.message)
  process.exit(1)
})

