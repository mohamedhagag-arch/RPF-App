#!/usr/bin/env node

/**
 * Check Database Objects - Verify all required database objects exist
 * التحقق من كائنات قاعدة البيانات
 */

const { createClient } = require('@supabase/supabase-js')

// Production Supabase credentials
const SUPABASE_URL = 'https://qhnoyvdltetyfctphzys.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFobm95dmRsdGV0eWZjdHBoenlzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDE4MDIwNiwiZXhwIjoyMDY1NzU2MjA2fQ.B6tQmZ68D0u1vNZyk2RiI6Cl3qSfprDdfL1vaeP6EGo'

// Required database objects
const REQUIRED_OBJECTS = {
  tables: [
    'users',
    'Planning Database - ProjectsList',
    'Planning Database - BOQ Rates',
    'Planning Database - KPI',
    'company_settings',
    'holidays',
    'divisions',
    'project_types',
    'currencies',
    'activities_database'
  ],
  functions: [
    'update_company_settings',
    'get_company_settings',
    'calculate_workdays',
    'check_user_permission',
    'update_updated_at_column'
  ]
}

async function checkDatabaseObjects() {
  console.clear()
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║                                                            ║')
  console.log('║      🔍 Check Database Objects - فحص كائنات البيانات    ║')
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
    
    // Check tables
    console.log('═══════════════════════════════════════════════════════════')
    console.log('📊 Checking Tables:')
    console.log('═══════════════════════════════════════════════════════════')
    console.log()
    
    const { data: tables, error: tablesError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'public'
          ORDER BY table_name;
        `
      })
      .catch(() => {
        // If RPC doesn't work, try direct query
        return supabase
          .from('information_schema.tables')
          .select('table_name')
          .eq('table_schema', 'public')
      })
    
    let missingTables = []
    let foundTables = []
    
    // Simple check: try to query each table
    for (const tableName of REQUIRED_OBJECTS.tables) {
      try {
        const { error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1)
        
        if (error) {
          if (error.message.includes('does not exist')) {
            missingTables.push(tableName)
            console.log(`   ❌ ${tableName} - NOT FOUND`)
          } else {
            foundTables.push(tableName)
            console.log(`   ✅ ${tableName} - EXISTS`)
          }
        } else {
          foundTables.push(tableName)
          console.log(`   ✅ ${tableName} - EXISTS`)
        }
      } catch (err) {
        missingTables.push(tableName)
        console.log(`   ❌ ${tableName} - NOT FOUND`)
      }
    }
    
    console.log()
    console.log(`   Summary: ${foundTables.length}/${REQUIRED_OBJECTS.tables.length} tables found`)
    console.log()
    
    // Check functions
    console.log('═══════════════════════════════════════════════════════════')
    console.log('⚙️  Checking Functions:')
    console.log('═══════════════════════════════════════════════════════════')
    console.log()
    
    let missingFunctions = []
    let foundFunctions = []
    
    for (const funcName of REQUIRED_OBJECTS.functions) {
      try {
        // Try to call the function (will fail if doesn't exist)
        const { error } = await supabase.rpc(funcName, {}).catch(e => ({ error: e }))
        
        if (error && error.message && error.message.includes('Could not find the function')) {
          missingFunctions.push(funcName)
          console.log(`   ❌ ${funcName}() - NOT FOUND`)
        } else {
          foundFunctions.push(funcName)
          console.log(`   ✅ ${funcName}() - EXISTS`)
        }
      } catch (err) {
        // Function exists but may have failed due to parameters
        // This is actually OK - means function exists
        if (err.message && !err.message.includes('Could not find')) {
          foundFunctions.push(funcName)
          console.log(`   ✅ ${funcName}() - EXISTS`)
        } else {
          missingFunctions.push(funcName)
          console.log(`   ❌ ${funcName}() - NOT FOUND`)
        }
      }
    }
    
    console.log()
    console.log(`   Summary: ${foundFunctions.length}/${REQUIRED_OBJECTS.functions.length} functions found`)
    console.log()
    
    // Final summary
    console.log('═══════════════════════════════════════════════════════════')
    console.log('📋 Final Summary:')
    console.log('═══════════════════════════════════════════════════════════')
    console.log()
    
    if (missingTables.length === 0 && missingFunctions.length === 0) {
      console.log('🎉 All Required Objects Found!')
      console.log('   ✅ All tables exist')
      console.log('   ✅ All functions exist')
      console.log()
      console.log('   Your database is ready to use!')
      console.log()
    } else {
      console.log('⚠️  Missing Objects Detected!')
      console.log()
      
      if (missingTables.length > 0) {
        console.log('❌ Missing Tables:')
        missingTables.forEach(t => console.log(`   - ${t}`))
        console.log()
      }
      
      if (missingFunctions.length > 0) {
        console.log('❌ Missing Functions:')
        missingFunctions.forEach(f => console.log(`   - ${f}()`))
        console.log()
      }
      
      console.log('═══════════════════════════════════════════════════════════')
      console.log('🔧 How to Fix:')
      console.log('═══════════════════════════════════════════════════════════')
      console.log()
      console.log('1. Open Supabase Dashboard:')
      console.log('   https://supabase.com/dashboard')
      console.log()
      console.log('2. Select your project: qhnoyvdltetyfctphzys')
      console.log()
      console.log('3. Go to: SQL Editor → New Query')
      console.log()
      
      if (missingTables.length > 0) {
        console.log('4. First, run this file to create tables:')
        console.log('   Database/PRODUCTION_SCHEMA_COMPLETE.sql')
        console.log()
      }
      
      if (missingFunctions.length > 0) {
        console.log('5. Then, run this file to create functions:')
        console.log('   Database/MISSING_FUNCTIONS_AND_OBJECTS.sql')
        console.log()
      }
      
      console.log('6. Run this script again to verify')
      console.log()
    }
    
  } catch (error) {
    console.log('❌ Fatal error:', error.message)
    console.log()
  }
}

// Run the script
checkDatabaseObjects().catch(error => {
  console.log('❌ Fatal error:', error.message)
  process.exit(1)
})

