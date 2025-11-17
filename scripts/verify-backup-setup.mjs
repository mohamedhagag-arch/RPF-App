/**
 * ✅ Verify Backup Setup
 * 
 * Script to verify that all backup settings are configured correctly
 * 
 * Usage:
 *   node scripts/verify-backup-setup.mjs
 */

import dotenv from 'dotenv'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

// Load .env.local explicitly
dotenv.config({ path: '.env.local' })

console.log('🔍 Verifying Backup Setup...\n')

let allGood = true
const errors = []
const warnings = []

// Check .env.local file
console.log('📁 Checking .env.local file...')
const envPath = join(process.cwd(), '.env.local')
if (!existsSync(envPath)) {
  errors.push('❌ .env.local file not found')
  allGood = false
} else {
  console.log('   ✅ .env.local file exists')
  
  // Read and check variables
  const envContent = readFileSync(envPath, 'utf-8')
  
  // Required variables
  const requiredVars = [
    'GOOGLE_DRIVE_CLIENT_ID',
    'GOOGLE_DRIVE_CLIENT_SECRET'
  ]
  
  const optionalVars = [
    'GOOGLE_DRIVE_REFRESH_TOKEN',
    'GOOGLE_DRIVE_FOLDER_ID',
    'CRON_SECRET'
  ]
  
  console.log('\n📋 Checking required environment variables...')
  requiredVars.forEach(varName => {
    if (process.env[varName]) {
      const value = process.env[varName]
      const masked = value.length > 20 
        ? value.substring(0, 10) + '...' + value.substring(value.length - 5)
        : '***'
      console.log(`   ✅ ${varName}: ${masked}`)
    } else {
      errors.push(`❌ Missing required variable: ${varName}`)
      allGood = false
    }
  })
  
  console.log('\n📋 Checking optional environment variables...')
  optionalVars.forEach(varName => {
    if (process.env[varName]) {
      const value = process.env[varName]
      const masked = value.length > 20 
        ? value.substring(0, 10) + '...' + value.substring(value.length - 5)
        : '***'
      console.log(`   ✅ ${varName}: ${masked}`)
    } else {
      warnings.push(`⚠️  Optional variable not set: ${varName}`)
    }
  })
}

// Check if packages are installed
console.log('\n📦 Checking required packages...')
try {
  const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'))
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies }
  
  const requiredPackages = ['form-data']
  requiredPackages.forEach(pkg => {
    if (deps[pkg]) {
      console.log(`   ✅ ${pkg}: ${deps[pkg]}`)
    } else {
      errors.push(`❌ Missing package: ${pkg}`)
      allGood = false
    }
  })
} catch (error) {
  warnings.push(`⚠️  Could not check packages: ${error.message}`)
}

// Check API routes
console.log('\n🔌 Checking API routes...')
const apiRoutes = [
  'app/api/backup/google-drive/route.ts',
  'app/api/cron/daily-backup/route.ts',
  'app/api/test-backup/route.ts'
]

apiRoutes.forEach(route => {
  const routePath = join(process.cwd(), route)
  if (existsSync(routePath)) {
    console.log(`   ✅ ${route}`)
  } else {
    errors.push(`❌ Missing API route: ${route}`)
    allGood = false
  }
})

// Check library files
console.log('\n📚 Checking library files...')
const libFiles = [
  'lib/googleDriveBackup.ts',
  'lib/backupManager.ts'
]

libFiles.forEach(file => {
  const filePath = join(process.cwd(), file)
  if (existsSync(filePath)) {
    console.log(`   ✅ ${file}`)
  } else {
    errors.push(`❌ Missing library file: ${file}`)
    allGood = false
  }
})

// Check vercel.json
console.log('\n⚙️  Checking Vercel configuration...')
const vercelPath = join(process.cwd(), 'vercel.json')
if (existsSync(vercelPath)) {
  try {
    const vercelConfig = JSON.parse(readFileSync(vercelPath, 'utf-8'))
    if (vercelConfig.crons && vercelConfig.crons.length > 0) {
      console.log(`   ✅ Cron jobs configured: ${vercelConfig.crons.length}`)
      vercelConfig.crons.forEach(cron => {
        console.log(`      - ${cron.path} (${cron.schedule})`)
      })
    } else {
      warnings.push('⚠️  No cron jobs configured in vercel.json')
    }
  } catch (error) {
    warnings.push(`⚠️  Could not parse vercel.json: ${error.message}`)
  }
} else {
  warnings.push('⚠️  vercel.json not found')
}

// Test Google Drive connection (if refresh token exists)
if (process.env.GOOGLE_DRIVE_REFRESH_TOKEN && 
    process.env.GOOGLE_DRIVE_CLIENT_ID && 
    process.env.GOOGLE_DRIVE_CLIENT_SECRET) {
  console.log('\n🔐 Testing Google Drive authentication...')
  try {
    // Use fetch to test token refresh instead of importing TypeScript file
    const tokenUrl = 'https://oauth2.googleapis.com/token'
    const tokenParams = new URLSearchParams({
      client_id: process.env.GOOGLE_DRIVE_CLIENT_ID,
      client_secret: process.env.GOOGLE_DRIVE_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN,
      grant_type: 'refresh_token'
    })
    
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: tokenParams.toString()
    })
    
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      errors.push(`❌ Failed to refresh Google Drive token: ${errorData}`)
      allGood = false
    } else {
      const tokenData = await tokenResponse.json()
      if (tokenData && tokenData.access_token) {
        console.log('   ✅ Google Drive authentication successful!')
        console.log(`      Token expires in: ${tokenData.expires_in} seconds`)
      } else {
        errors.push('❌ Failed to refresh Google Drive token (no access token in response)')
        allGood = false
      }
    }
  } catch (error) {
    errors.push(`❌ Google Drive authentication error: ${error.message}`)
    allGood = false
  }
} else {
  warnings.push('⚠️  Cannot test Google Drive authentication (missing refresh token)')
}

// Summary
console.log('\n' + '='.repeat(60))
console.log('📊 VERIFICATION SUMMARY')
console.log('='.repeat(60))

if (errors.length > 0) {
  console.log('\n❌ ERRORS:')
  errors.forEach(error => console.log(`   ${error}`))
}

if (warnings.length > 0) {
  console.log('\n⚠️  WARNINGS:')
  warnings.forEach(warning => console.log(`   ${warning}`))
}

if (allGood && errors.length === 0) {
  console.log('\n✅ All checks passed! Your backup setup is ready.')
  console.log('\n📝 Next steps:')
  console.log('   1. Test backup locally: npm run test:backup')
  console.log('   2. Or use API endpoint: POST http://localhost:3000/api/test-backup')
  console.log('   3. Or use UI: Settings → Database Management → Auto Backup')
  console.log('   4. After testing, deploy to Vercel and add environment variables')
} else {
  console.log('\n❌ Some checks failed. Please fix the errors above.')
  process.exit(1)
}

