/**
 * Test Script: Permissions Update Verification
 * سكريبت اختبار: التحقق من تحديث الصلاحيات
 */

import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testPermissionsUpdate() {
  console.log('🧪 Testing Permissions Update System...')
  console.log('=====================================')

  try {
    // Step 1: Get a test user
    console.log('📋 Step 1: Finding test user...')
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(5)

    if (usersError) {
      console.error('❌ Error fetching users:', usersError)
      return
    }

    if (!users || users.length === 0) {
      console.error('❌ No users found')
      return
    }

    const testUser = users.find(u => u.email !== 'admin@rabat.com') || users[0]
    console.log('✅ Test user found:', testUser.email)
    console.log('📊 Current permissions:', testUser.permissions?.length || 0)
    console.log('📊 Current role:', testUser.role)
    console.log('📊 Custom enabled:', testUser.custom_permissions_enabled)

    // Step 2: Test permission update
    console.log('\n🔄 Step 2: Testing permission update...')
    
    const originalPermissions = testUser.permissions || []
    const testPermissions = [
      'projects.view',
      'projects.create', 
      'boq.view',
      'boq.create',
      'kpi.view',
      'kpi.create'
    ]

    console.log('📝 Updating permissions to:', testPermissions)
    
    const { data: updateResult, error: updateError } = await supabase
      .from('users')
      .update({
        permissions: testPermissions,
        custom_permissions_enabled: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', testUser.id)
      .select()

    if (updateError) {
      console.error('❌ Error updating permissions:', updateError)
      return
    }

    console.log('✅ Permissions updated successfully')
    console.log('📊 Updated permissions count:', updateResult[0]?.permissions?.length)
    console.log('📊 Updated permissions:', updateResult[0]?.permissions)

    // Step 3: Verify the update
    console.log('\n🔍 Step 3: Verifying the update...')
    
    const { data: verifyResult, error: verifyError } = await supabase
      .from('users')
      .select('*')
      .eq('id', testUser.id)
      .single()

    if (verifyError) {
      console.error('❌ Error verifying update:', verifyError)
      return
    }

    console.log('✅ Verification successful')
    console.log('📊 Verified permissions count:', verifyResult.permissions?.length)
    console.log('📊 Verified permissions:', verifyResult.permissions)
    console.log('📊 Verified custom_enabled:', verifyResult.custom_permissions_enabled)

    // Step 4: Test permission checking
    console.log('\n🔍 Step 4: Testing permission checking...')
    
    const testPermissionChecks = [
      { permission: 'projects.view', expected: true },
      { permission: 'projects.create', expected: true },
      { permission: 'projects.delete', expected: false },
      { permission: 'boq.view', expected: true },
      { permission: 'boq.create', expected: true },
      { permission: 'kpi.view', expected: true },
      { permission: 'kpi.create', expected: true },
      { permission: 'users.manage', expected: false }
    ]

    console.log('🧪 Testing permission checks:')
    let allTestsPassed = true

    for (const test of testPermissionChecks) {
      const hasPermission = verifyResult.permissions?.includes(test.permission) || false
      const testPassed = hasPermission === test.expected
      
      console.log(`${testPassed ? '✅' : '❌'} ${test.permission}: ${hasPermission} (expected: ${test.expected})`)
      
      if (!testPassed) {
        allTestsPassed = false
      }
    }

    // Step 5: Test role-based permissions
    console.log('\n🔄 Step 5: Testing role-based permissions...')
    
    const { data: roleUpdateResult, error: roleUpdateError } = await supabase
      .from('users')
      .update({
        custom_permissions_enabled: false,
        permissions: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', testUser.id)
      .select()

    if (roleUpdateError) {
      console.error('❌ Error updating to role-based:', roleUpdateError)
      return
    }

    console.log('✅ Switched to role-based permissions')
    console.log('📊 Role:', roleUpdateResult[0]?.role)
    console.log('📊 Custom enabled:', roleUpdateResult[0]?.custom_permissions_enabled)
    console.log('📊 Permissions:', roleUpdateResult[0]?.permissions)

    // Step 6: Restore original permissions
    console.log('\n🔄 Step 6: Restoring original permissions...')
    
    const { data: restoreResult, error: restoreError } = await supabase
      .from('users')
      .update({
        permissions: originalPermissions,
        custom_permissions_enabled: testUser.custom_permissions_enabled,
        updated_at: new Date().toISOString()
      })
      .eq('id', testUser.id)
      .select()

    if (restoreError) {
      console.error('❌ Error restoring permissions:', restoreError)
      return
    }

    console.log('✅ Original permissions restored')

    // Final results
    console.log('\n🎉 Test Results:')
    console.log('================')
    console.log(`✅ Permission update: ${updateResult ? 'PASSED' : 'FAILED'}`)
    console.log(`✅ Permission verification: ${verifyResult ? 'PASSED' : 'FAILED'}`)
    console.log(`✅ Permission checking: ${allTestsPassed ? 'PASSED' : 'FAILED'}`)
    console.log(`✅ Role-based switch: ${roleUpdateResult ? 'PASSED' : 'FAILED'}`)
    console.log(`✅ Permission restore: ${restoreResult ? 'PASSED' : 'FAILED'}`)

    if (allTestsPassed && updateResult && verifyResult && roleUpdateResult && restoreResult) {
      console.log('\n🎉 ALL TESTS PASSED! Permissions system is working correctly.')
    } else {
      console.log('\n❌ Some tests failed. Please check the system.')
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error)
  }
}

// Run the test
testPermissionsUpdate().then(() => {
  console.log('\n✅ Test completed')
  process.exit(0)
}).catch((error) => {
  console.error('❌ Test failed:', error)
  process.exit(1)
})
