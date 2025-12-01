/**
 * 🧪 Test Google Drive Backup Locally
 * 
 * Script to test Google Drive backup functionality locally
 * 
 * Usage:
 *   node scripts/test-google-drive-backup.js
 * 
 * Make sure to set environment variables:
 *   GOOGLE_DRIVE_CLIENT_ID
 *   GOOGLE_DRIVE_CLIENT_SECRET
 *   GOOGLE_DRIVE_REFRESH_TOKEN (optional)
 *   GOOGLE_DRIVE_FOLDER_ID (optional)
 */

require('dotenv').config({ path: '.env.local' })

async function runTest() {
  // Dynamic import for ES modules
  const { createFullBackup } = await import('../lib/backupManager.js')
  const { uploadBackupToGoogleDrive, refreshGoogleDriveToken } = await import('../lib/googleDriveBackup.js')

  async function testBackup() {
  console.log('🧪 Starting local Google Drive backup test...\n')

  // Check environment variables
  const requiredVars = ['GOOGLE_DRIVE_CLIENT_ID', 'GOOGLE_DRIVE_CLIENT_SECRET']
  const missingVars = requiredVars.filter(v => !process.env[v])
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:')
    missingVars.forEach(v => console.error(`   - ${v}`))
    console.error('\nPlease set them in .env.local file')
    process.exit(1)
  }

  try {
    // Step 1: Create backup
    console.log('📦 Step 1: Creating database backup...')
    const backupResult = await createFullBackup('Local test backup')
    
    if (!backupResult.success || !backupResult.backup) {
      console.error('❌ Failed to create backup:', backupResult.message)
      process.exit(1)
    }
    
    console.log(`✅ Backup created: ${backupResult.backup.metadata.totalTables} tables, ${backupResult.backup.metadata.totalRows} rows\n`)

    // Step 2: Get/Refresh access token
    console.log('🔑 Step 2: Getting Google Drive access token...')
    let accessToken = process.env.GOOGLE_DRIVE_ACCESS_TOKEN
    
    if (!accessToken && process.env.GOOGLE_DRIVE_REFRESH_TOKEN) {
      console.log('   Refreshing token...')
      const tokenData = await refreshGoogleDriveToken(
        process.env.GOOGLE_DRIVE_REFRESH_TOKEN,
        process.env.GOOGLE_DRIVE_CLIENT_ID,
        process.env.GOOGLE_DRIVE_CLIENT_SECRET
      )
      
      if (!tokenData) {
        console.error('❌ Failed to refresh token')
        console.error('   Please authenticate manually and get a refresh token')
        process.exit(1)
      }
      
      accessToken = tokenData.accessToken
      console.log(`✅ Token refreshed (expires in ${tokenData.expiresIn} seconds)\n`)
    }
    
    if (!accessToken) {
      console.error('❌ No access token available')
      console.error('   Please set GOOGLE_DRIVE_ACCESS_TOKEN or GOOGLE_DRIVE_REFRESH_TOKEN')
      process.exit(1)
    }

    // Step 3: Upload to Google Drive
    console.log('📁 Step 3: Uploading backup to Google Drive...')
    const uploadResult = await uploadBackupToGoogleDrive(backupResult.backup, {
      accessToken: accessToken,
      refreshToken: process.env.GOOGLE_DRIVE_REFRESH_TOKEN,
      folderId: process.env.GOOGLE_DRIVE_FOLDER_ID
    })
    
    if (!uploadResult.success) {
      console.error('❌ Failed to upload backup:', uploadResult.message)
      console.error('   Error:', uploadResult.error)
      process.exit(1)
    }
    
    console.log('✅ Backup uploaded successfully!')
    console.log(`   File ID: ${uploadResult.fileId}`)
    console.log(`   File URL: ${uploadResult.fileUrl}\n`)
    
    console.log('🎉 Test completed successfully!')
    console.log(`\n📋 Summary:`)
    console.log(`   - Tables backed up: ${backupResult.backup.metadata.totalTables}`)
    console.log(`   - Total rows: ${backupResult.backup.metadata.totalRows}`)
    console.log(`   - Google Drive file: ${uploadResult.fileUrl}`)
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

  // Run test
  await testBackup()
}

runTest().catch(console.error)

